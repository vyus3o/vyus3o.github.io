/* NEXUS SURVIVAL 4-5P smooth-state hotfix for build 0.31
 * Keeps the v31 unified transport/control path, but moves high-volume combat
 * snapshots onto a second best-effort P2P DataConnection whenever possible.
 * This removes reliable-channel head-of-line blocking: level/chest/control/input
 * packets no longer wait behind stale combat snapshots.
 */
(function(){
'use strict';

const HOTFIX='0.31-smooth.2';
const STATE_LABEL='nexus-state-v31-smooth';
const STATE_META='state31smooth';
const STATE_BUFFER_DROP=64*1024;
const FALLBACK_BUFFER_DROP=112*1024;
const INTEREST_RADIUS=940;
const RELAY_FAST_GAP=.16;
const DIRECT_VISUAL_GAP=.34;
const RELAY_VISUAL_GAP=.46;
const EXTRA_PREDICT_MS=480;

let session=0;
let clientStateConn=null;
let clientStateTimer=0;
let fastSeq=1500000000 + (Date.now()%100000000);
let visualSeq=1700000000 + (Date.now()%100000000);
let lastFastRx=0;
let rxWindow=[];
const hostStateByPid=new Map();
const fastAt=new WeakMap();
const visualAt=new WeakMap();
const stats={
 stateChannelsOpened:0,stateChannelsClosed:0,statePackets:0,visualPackets:0,
 fallbackPackets:0,droppedBuffered:0,maxFastBytes:0,maxVisualBytes:0
};

const GRADE=['common','uncommon','rare','epic','legendary'];
const ROLE=['swift','brute','hunter'];
const TIER=['normal','mid','major'];
const round=v=>Number.isFinite(v)?Math.round(v):0;
const r1=v=>Number.isFinite(v)?Math.round(v*10)/10:0;
const sizeOf=v=>{try{return JSON.stringify(v).length}catch{return 0}};
const partyN=()=>Math.max(1,Object.keys(NET?.lobby||{}).length);
const relayConn=c=>c?.transport==='webrelay'||String(c?.peer||'').startsWith('relay:');
const dcOf=c=>c?.dataChannel||c?._dc||c?._channel||null;
const buffered=c=>Number(dcOf(c)?.bufferedAmount||c?.bufferSize||0);
const safeSend=(c,p)=>{try{c.send(p);return true}catch{return false}};
const codeOf=(a,v)=>Math.max(0,a.indexOf(v));
const now=()=>performance.now();

function playerCap(){
 const n=partyN();
 return n>=5?88:n>=4?96:n>=3?112:132;
}
function relayCap(){
 const n=partyN();
 return n>=5?54:n>=4?60:n>=3?68:78;
}
function visualCaps(relay){
 const n=partyN();
 if(relay)return n>=4?{q:30,gem:38,zones:10}:{q:40,gem:52,zones:12};
 return n>=4?{q:42,gem:56,zones:14}:{q:58,gem:78,zones:18};
}
function anchor(state,conn){
 return (state?.players||[]).find(p=>p.id===conn?.playerId)||state?.n||{x:WORLD.w/2,y:WORLD.h/2};
}
function chooseEnemies(state,conn){
 const a=anchor(state,conn),relay=relayConn(conn),cap=relay?relayCap():playerCap(),rr=INTEREST_RADIUS*INTEREST_RADIUS;
 const near=[],far=[];
 for(const e of state?.e||[]){
  const dx=(e.x||0)-a.x,dy=(e.y||0)-a.y,d2=dx*dx+dy*dy;
  (e.boss||d2<=rr?near:far).push([e.boss?-1:d2,e]);
 }
 near.sort((x,y)=>x[0]-y[0]);
 if(near.length<cap){
  far.sort((x,y)=>x[0]-y[0]);
  for(const row of far){if(near.length>=cap)break;near.push(row)}
 }
 return near.slice(0,cap).map(x=>x[1]);
}
function packEnemy(e){
 return [e.id,round(e.x),round(e.y),round(e.r),round(e.hp),round(e.max),e.type||0,e.boss?1:0,r1(e.anim),
  codeOf(GRADE,e.grade),codeOf(ROLE,e.variantRole),e.visualVariant||0,codeOf(TIER,e.bossTier),e.elite?1:0];
}
function packQ(q){return[round(q.x),round(q.y),r1(q.vx),r1(q.vy),r1(q.life),q.col||'',q.size||0,q.source||'',q.ownerId||'',q.skill||'']}
function packGem(z){return[round(z.x),round(z.y),z.v||0,r1(z.spin)]}
function packZone(z){return[z.type||'',round(z.x),round(z.y),round(z.r),r1(z.life),r1(z.max),z.col||'']}

function fastPacket(s,controlConn){
 return {
  t:'v31s',seq:++fastSeq,ht:r1(s?.t),st:s?.stage||0,k:s?.kills||0,b:!!s?.boss,d:s?.diff||diff,
  phase:state,n:s?.n,p:s?.players||[],e:chooseEnemies(s,controlConn).map(packEnemy),te:(s?.e||[]).length
 };
}
function visualPacket(s,controlConn){
 const a=anchor(s,controlConn),relay=relayConn(controlConn),cap=visualCaps(relay),rr=INTEREST_RADIUS*INTEREST_RADIUS;
 const near=o=>{const dx=(o.x||0)-a.x,dy=(o.y||0)-a.y;return dx*dx+dy*dy<=rr};
 return {
  t:'v31v',seq:++visualSeq,st:s?.stage||0,
  q:(s?.q||[]).filter(near).slice(0,cap.q).map(packQ),
  g:(s?.gem||[]).filter(near).slice(0,cap.gem).map(packGem),
  z:(s?.zones||[]).filter(near).slice(0,cap.zones).map(packZone)
 };
}

function closeClientState(){
 if(clientStateTimer){clearInterval(clientStateTimer);clientStateTimer=0}
 if(clientStateConn){try{clientStateConn.close()}catch{}}
 clientStateConn=null;
}
function registerHostState(conn){
 const pid=String(conn?.metadata?.pid||'');
 if(!/^p[2-5]$/.test(pid)){try{conn.close?.()}catch{};return}
 conn.playerId=pid;conn.transport='state-p2p';conn._nexusStateSmooth=true;
 const open=()=>{
  const prev=hostStateByPid.get(pid);
  if(prev&&prev!==conn){try{prev.close?.()}catch{}}
  hostStateByPid.set(pid,conn);stats.stateChannelsOpened++;
 };
 const close=()=>{
  if(hostStateByPid.get(pid)===conn)hostStateByPid.delete(pid);
  stats.stateChannelsClosed++;
 };
 if(conn.open)open();else conn.on?.('open',open);
 conn.on?.('close',close);conn.on?.('error',close);
}
function startClientStateChannel(code,token){
 if(token!==session||NET.mode!=='client'||NET.transport!=='P2P'||!NET.peer||!NET.hostConn?.open||NET.localId==='p1')return;
 if(clientStateConn?.open)return;
 let c;
 try{
  c=NET.peer.connect(netPeerId(code),{
   label:STATE_LABEL,reliable:false,serialization:'binary',
   metadata:{nexusChannel:STATE_META,pid:NET.localId,room:code}
  });
 }catch{return}
 clientStateConn=c;
 c.on('open',()=>{if(token!==session){try{c.close()}catch{};return}stats.stateChannelsOpened++;try{c.send({t:'stateReady',pid:NET.localId})}catch{}});
 c.on('data',m=>{
  if(token!==session||!m||typeof m!=='object')return;
  if(m.t==='v31s'){
   lastFastRx=now();rxWindow.push(lastFastRx);while(rxWindow.length&&lastFastRx-rxWindow[0]>2000)rxWindow.shift();
  }
  netClientMessage(m);
 });
 const closed=()=>{if(clientStateConn===c){clientStateConn=null;stats.stateChannelsClosed++}};
 c.on('close',closed);c.on('error',closed);
}

const prevNetAccept=netAccept;
netAccept=function(conn){
 if(conn?.metadata?.nexusChannel===STATE_META){registerHostState(conn);return}
 return prevNetAccept(conn);
};

const prevNetClose=netClose;
netClose=function(){
 session++;
 closeClientState();
 for(const c of hostStateByPid.values())try{c.close?.()}catch{}
 hostStateByPid.clear();rxWindow=[];lastFastRx=0;
 return prevNetClose();
};

const prevNetJoin=netJoin;
netJoin=function(code){
 const out=prevNetJoin(code);
 const token=session,room=String(code||'').trim().toUpperCase();
 if(clientStateTimer)clearInterval(clientStateTimer);
 clientStateTimer=setInterval(()=>{
  if(token!==session){clearInterval(clientStateTimer);clientStateTimer=0;return}
  if(NET.mode!=='client')return;
  if(NET.transport==='P2P'&&NET.hostConn?.open)startClientStateChannel(room,token);
  if(NET.transport==='WEB RELAY'&&clientStateConn)closeClientState();
 },350);
 return out;
};

function routeFor(control){
 if(relayConn(control))return control;
 const stateConn=hostStateByPid.get(control?.playerId);
 return stateConn?.open?stateConn:control;
}
const prevBroadcast=netBroadcast;
netBroadcast=function(data){
 if(NET.mode!=='host'||data?.t!=='snap'||!data.state)return prevBroadcast(data);
 const s=data.state,hostT=Number(s.t)||0;
 for(const control of NET.conns?.values?.()||[]){
  if(!control?.open||control?._nexusStateSmooth)continue;
  const relay=relayConn(control),route=routeFor(control),routeIsState=route!==control;
  const limit=routeIsState?STATE_BUFFER_DROP:FALLBACK_BUFFER_DROP;
  if(!relay&&buffered(route)>limit){stats.droppedBuffered++;continue}

  /* Direct P2P snapshots are already called at the host's 8 Hz game cadence.
     Do not add a second clock gate here: urgent same-tick snapshots (buffs,
     rewards, resume/state changes) must be delivered immediately. Only the
     relay path is rate-limited because it is broker-backed. */
  const last=fastAt.get(control);
  if(!relay||last==null||hostT<last||hostT-last>=RELAY_FAST_GAP-.0001){
   const p=fastPacket(s,control),bytes=sizeOf(p);
   if(safeSend(route,p)){
    fastAt.set(control,hostT);stats.statePackets++;if(!routeIsState)stats.fallbackPackets++;
    stats.maxFastBytes=Math.max(stats.maxFastBytes,bytes);
   }
  }
  const vg=relay?RELAY_VISUAL_GAP:DIRECT_VISUAL_GAP,lv=visualAt.get(control);
  if((lv==null||hostT<lv||hostT-lv>=vg-.0001)&&buffered(route)<limit*.65){
   const p=visualPacket(s,control),bytes=sizeOf(p);
   if(safeSend(route,p)){visualAt.set(control,hostT);stats.visualPackets++;stats.maxVisualBytes=Math.max(stats.maxVisualBytes,bytes)}
  }
 }
};

/* If one best-effort packet is lost, continue motion briefly instead of visibly freezing. */
const prevUpdateClient=updateClient;
updateClient=function(dt){
 const out=prevUpdateClient(dt);
 if(g&&NET.mode==='client'&&state==='play'){
  const t=now();
  for(const p of Object.values(g.players||{})){
   if(p.id===NET.localId||!p._rx31)continue;
   const ms=t-p._rx31;if(ms<=220||ms>EXTRA_PREDICT_MS)continue;
   const age=ms/1000,px=(p._bx31??p.x)+(p._vx31||0)*age*.42,py=(p._by31??p.y)+(p._vy31||0)*age*.42;
   p.x+=(px-p.x)*Math.min(1,dt*4.5);p.y+=(py-p.y)*Math.min(1,dt*4.5);
  }
  for(const e of g.e||[]){
   if(!e._rx31)continue;
   const ms=t-e._rx31;if(ms<=220||ms>EXTRA_PREDICT_MS)continue;
   const age=ms/1000,px=(e._bx31??e.x)+(e._vx31||0)*age*.34,py=(e._by31??e.y)+(e._vy31||0)*age*.34;
   e.x+=(px-e.x)*Math.min(1,dt*4);e.y+=(py-e.y)*Math.min(1,dt*4);
  }
 }
 return out;
};

const prevHud=hud;
hud=function(){
 const out=prevHud();
 if(NET.mode==='client'){
  NET.stateHz=rxWindow.length>1?Math.round((rxWindow.length-1)*10000/Math.max(1,rxWindow.at(-1)-rxWindow[0]))/10:0;
  NET.stateAge=lastFastRx?Math.round(now()-lastFastRx):0;
 }
 const e=document.getElementById('netData');
 if(e&&NET.mode!=='solo'){
  const side=NET.mode==='client'&&NET.transport==='P2P'?(clientStateConn?.open?' · LOW-LAG':' · FALLBACK'):'';
  const hz=NET.mode==='client'&&NET.stateHz?` · ${NET.stateHz}Hz`:'';
  e.textContent+=side+hz;
 }
 return out;
};

window.NEXUS_NETWORK_SMOOTH_V31={
 build:HOTFIX,dualP2PChannels:true,bestEffortState:true,reliableControl:true,headOfLineIsolation:true,
 adaptiveInterest:true,maxPredictMs:EXTRA_PREDICT_MS,stateBufferDrop:STATE_BUFFER_DROP,stats,
 hostStateByPid, get clientStateOpen(){return !!clientStateConn?.open}
};
})();
