/* NEXUS SURVIVAL compact multiplayer state transport build 0.30
 * Goal: keep 4-5 player clients smooth under late-stage load.
 * Control messages stay on the existing reliable channel. Combat snapshots use
 * compact interest-managed packets, stale snapshots are dropped, and clients
 * extrapolate short gaps between authoritative updates.
 */
(function(){
'use strict';

const BUILD='0.30';
const DIRECT_ENEMY_CAP=150;
const DIRECT_ENEMY_CAP_4P=120;
const RELAY_ENEMY_CAP=88;
const RELAY_ENEMY_CAP_4P=72;
const DIRECT_VISUAL_CAP={q:110,gem:140,zones:26};
const RELAY_VISUAL_CAP={q:64,gem:90,zones:20};
const DIRECT_FAST_GAP=80;
const RELAY_FAST_GAP=115;
const DIRECT_VISUAL_GAP=260;
const RELAY_VISUAL_GAP=420;
const BUFFER_SOFT=160*1024;
const BUFFER_HARD=320*1024;
const INTEREST_RADIUS=1080;
const MAX_EXTRAPOLATE_MS=260;
const FAST_HEARTBEAT_MS=900;

const fastAt=new WeakMap(),visualAt=new WeakMap();
let fastSeq=0,visualSeq=0,lastClientFastSeq=0,lastClientVisualSeq=0,lastSyntheticSnap=0;
let lastStageEpoch30=0,lastResumeEpoch30=0;
const stats={fastSent:0,visualSent:0,bufferDrops:0,rateDrops:0,staleDrops:0,fastBytes:0,visualBytes:0,recoveries:0};
const GRADE=['common','uncommon','rare','epic','legendary'];
const ROLE=['swift','brute','hunter'];
const BOSS_TIER=['normal','mid','major'];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const now=()=>performance.now();
const r0=v=>Number.isFinite(v)?Math.round(v):0;
const r1=v=>Number.isFinite(v)?Math.round(v*10)/10:0;
const codeOf=(arr,v)=>Math.max(0,arr.indexOf(v));
const isRelay=c=>c?.transport==='webrelay'||String(c?.peer||'').startsWith('ws:');
const dcOf=c=>c?.dataChannel||c?._dc||c?._channel||null;
const partyN=()=>Math.max(1,Object.keys(NET?.lobby||{}).length);

function safeSize(v){try{return JSON.stringify(v).length}catch{return 0}}
function playerAnchor(conn){
 const id=conn?.playerId;
 return g?.players?.[id]||g?.n||{x:WORLD.w/2,y:WORLD.h/2};
}
function enemyCap(conn){
 const relay=isRelay(conn),large=partyN()>=4;
 return relay?(large?RELAY_ENEMY_CAP_4P:RELAY_ENEMY_CAP):(large?DIRECT_ENEMY_CAP_4P:DIRECT_ENEMY_CAP);
}
function chooseEnemies(list,conn){
 const a=playerAnchor(conn),cap=enemyCap(conn),rr=INTEREST_RADIUS*INTEREST_RADIUS;
 const scored=[];
 for(const e of list||[]){
  const dx=(e.x||0)-a.x,dy=(e.y||0)-a.y,d2=dx*dx+dy*dy;
  if(e.boss||d2<=rr)scored.push([e.boss?-1:d2,e]);
 }
 scored.sort((x,y)=>x[0]-y[0]);
 if(scored.length<Math.min(cap,(list||[]).length)){
  const used=new Set(scored.map(x=>x[1].id));
  const extra=[];
  for(const e of list||[]){if(used.has(e.id))continue;const dx=(e.x||0)-a.x,dy=(e.y||0)-a.y;extra.push([dx*dx+dy*dy,e])}
  extra.sort((x,y)=>x[0]-y[0]);
  for(const x of extra){if(scored.length>=cap)break;scored.push(x)}
 }
 return scored.slice(0,cap).map(x=>x[1]);
}
function packEnemy(e){
 return [e.id,r0(e.x),r0(e.y),r0(e.r),r0(e.hp),r0(e.max),e.type||0,e.boss?1:0,r1(e.anim),codeOf(GRADE,e.grade),codeOf(ROLE,e.variantRole),e.visualVariant||0,codeOf(BOSS_TIER,e.bossTier),e.elite?1:0];
}
function unpackEnemy(a){
 return{id:a[0],x:a[1],y:a[2],r:a[3],hp:a[4],max:a[5],type:a[6],boss:!!a[7],anim:a[8],grade:GRADE[a[9]]||'common',variantRole:ROLE[a[10]]||'hunter',visualVariant:a[11]||0,bossTier:BOSS_TIER[a[12]]||'normal',elite:!!a[13]};
}
function packQ(q){return[r0(q.x),r0(q.y),r1(q.vx),r1(q.vy),r1(q.life),q.col||'',q.size||0,q.source||'']}
function packGem(z){return[r0(z.x),r0(z.y),z.v||0,r1(z.spin)]}
function packZone(z){return[z.type||'',r0(z.x),r0(z.y),r0(z.r),r1(z.life),r1(z.max),z.col||'']}
function unpackQ(a){return{x:a[0],y:a[1],vx:a[2],vy:a[3],life:a[4],col:a[5],size:a[6],source:a[7]}}
function unpackGem(a){return{x:a[0],y:a[1],v:a[2],spin:a[3]}}
function unpackZone(a){return{type:a[0],x:a[1],y:a[2],r:a[3],life:a[4],max:a[5],col:a[6]}}

function fastPacket(state,conn){
 const es=chooseEnemies(state?.e||[],conn);
 return{t:'v30f',s:++fastSeq,ht:r1(state?.t),st:state?.stage||0,k:state?.kills||0,b:!!state?.boss,d:state?.diff||diff,n:state?.n,p:state?.players||[],e:es.map(packEnemy),te:(state?.e||[]).length,sy:state?.sync29||null};
}
function visualPacket(state,conn){
 const relay=isRelay(conn),cap=relay?RELAY_VISUAL_CAP:DIRECT_VISUAL_CAP,a=playerAnchor(conn),rr=INTEREST_RADIUS*INTEREST_RADIUS;
 const near=x=>{const dx=(x.x||0)-a.x,dy=(x.y||0)-a.y;return dx*dx+dy*dy<=rr};
 const q=(state?.q||[]).filter(near).slice(0,cap.q).map(packQ);
 const gem=(state?.gem||[]).filter(near).slice(0,cap.gem).map(packGem);
 const z=(state?.zones||[]).filter(near).slice(0,cap.zones).map(packZone);
 return{t:'v30v',s:++visualSeq,st:state?.stage||0,q,g:gem,z};
}

function sendCompact(conn,data){
 try{conn.send(data);return true}catch{return false}
}
function shouldDropForBuffer(conn){
 if(isRelay(conn))return false;
 const buffered=Number(dcOf(conn)?.bufferedAmount||0);
 if(buffered>BUFFER_HARD){stats.bufferDrops++;return true}
 return false;
}

/* v29 already owns control/recovery. Only replace the high-volume snap path. */
const prevBroadcast30=netBroadcast;
netBroadcast=function(data){
 if(NET.mode!=='host'||data?.t!=='snap'||!data.state)return prevBroadcast30(data);
 const t=now();
 for(const conn of NET.conns?.values?.()||[]){
  if(!conn?.open||shouldDropForBuffer(conn))continue;
  const relay=isRelay(conn),fg=relay?RELAY_FAST_GAP:DIRECT_FAST_GAP,vg=relay?RELAY_VISUAL_GAP:DIRECT_VISUAL_GAP;
  const lf=fastAt.get(conn)||0;
  if(t-lf>=fg){
   const packet=fastPacket(data.state,conn),bytes=safeSize(packet);
   if(sendCompact(conn,packet)){fastAt.set(conn,t);stats.fastSent++;stats.fastBytes+=bytes}
  }else stats.rateDrops++;
  const lv=visualAt.get(conn)||0;
  const buffered=Number(dcOf(conn)?.bufferedAmount||0);
  if(t-lv>=vg&&buffered<BUFFER_SOFT){
   const packet=visualPacket(data.state,conn),bytes=safeSize(packet);
   if(sendCompact(conn,packet)){visualAt.set(conn,t);stats.visualSent++;stats.visualBytes+=bytes}
  }
 }
};

function hidePauseUi30(){
 document.getElementById('levelModal')?.classList.add('hidden');
 document.getElementById('chestModal')?.classList.add('hidden');
 document.getElementById('advancementModal')?.classList.add('hidden');
 document.getElementById('levelModal')?.classList.remove('partyPause28');
 document.getElementById('partyLevelStatus28')?.classList.add('hidden');
 window.__nexusV19ClientChest=false;
 if(g?.players)for(const p of Object.values(g.players))p.pendingLevel=false;
}
function maybeRecoverFromMeta(meta,stageChanged){
 if(!meta||meta.phase!=='play'||NET.mode!=='client')return;
 const resume=(meta.resumeEpoch||0)>lastResumeEpoch30,stage=(meta.stageEpoch||0)>lastStageEpoch30||stageChanged;
 lastResumeEpoch30=Math.max(lastResumeEpoch30,meta.resumeEpoch||0);lastStageEpoch30=Math.max(lastStageEpoch30,meta.stageEpoch||0);
 if((resume||stage)&&['chest','partyLevel','advancement','awakening'].includes(state)){
  hidePauseUi30();state='play';stats.recoveries++;
 }
}
function velocity(oldX,oldY,newX,newY,dt,cap){
 if(!(dt>.015&&dt<1.2))return[0,0];let vx=(newX-oldX)/dt,vy=(newY-oldY)/dt,l=Math.hypot(vx,vy);if(l>cap){vx*=cap/l;vy*=cap/l}return[vx,vy];
}
function applyPlayers30(rows,hostT,stageChanged){
 const existing=g.players||{};
 for(const d of rows||[]){
  let p=existing[d.id]||makePlayer(d.id,d.cls,d.x,d.y),ox=p.x,oy=p.y,prevX=Number.isFinite(p._netBaseX30)?p._netBaseX30:(p.tx??p.x),prevY=Number.isFinite(p._netBaseY30)?p._netBaseY30:(p.ty??p.y),prevT=p._netHostT30;
  const dt=Number.isFinite(prevT)?hostT-prevT:0,[vx,vy]=velocity(prevX,prevY,d.x,d.y,dt,460);
  Object.assign(p,d);p.tx=d.x;p.ty=d.y;p._netBaseX30=d.x;p._netBaseY30=d.y;p._netVx30=vx;p._netVy30=vy;p._netHostT30=hostT;p._netRx30=now();
  if(stageChanged||!Number.isFinite(ox)){p.x=d.x;p.y=d.y}else{p.x=ox;p.y=oy}
  existing[d.id]=p;
 }
 for(const id of Object.keys(existing))if(!(rows||[]).some(p=>p.id===id))delete existing[id];
 g.players=existing;
}
function applyEnemies30(rows,hostT,stageChanged){
 const old=new Map((g.e||[]).map(e=>[e.id,e])),arr=[];
 for(const raw of rows||[]){
  const d=unpackEnemy(raw);let e=old.get(d.id)||{...d,x:d.x,y:d.y,tx:d.x,ty:d.y,dead:false};
  const ox=e.x,oy=e.y,prevX=Number.isFinite(e._netBaseX30)?e._netBaseX30:(e.tx??e.x),prevY=Number.isFinite(e._netBaseY30)?e._netBaseY30:(e.ty??e.y),prevT=e._netHostT30;
  const dt=Number.isFinite(prevT)?hostT-prevT:0,[vx,vy]=velocity(prevX,prevY,d.x,d.y,dt,e.boss?330:520);
  Object.assign(e,d);e.tx=d.x;e.ty=d.y;e._netBaseX30=d.x;e._netBaseY30=d.y;e._netVx30=vx;e._netVy30=vy;e._netHostT30=hostT;e._netRx30=now();e._v21Tiered=true;
  if(stageChanged){e.x=d.x;e.y=d.y}else{e.x=ox;e.y=oy}
  arr.push(e);
 }
 g.e=arr;
}
function applyFast30(m){
 if(!g||m.s<=lastClientFastSeq){stats.staleDrops++;return}lastClientFastSeq=m.s;
 const oldStage=g.stage,stageChanged=m.st!==oldStage,hostT=Number(m.ht)||0;
 if(m.d)diff=m.d;g.t=hostT;g.stage=m.st;g.kills=m.k;g.boss=!!m.b;if(m.n)Object.assign(g.n,m.n);g._netTotalEnemies30=m.te||0;
 applyPlayers30(m.p,hostT,stageChanged);applyEnemies30(m.e,hostT,stageChanged);maybeRecoverFromMeta(m.sy,stageChanged);
 const bh=document.getElementById('bosshud');bh?.classList.toggle('hidden',!g.boss);if(g.boss){const bn=document.getElementById('bname');if(bn)bn.textContent=ST[g.stage]?.boss||'BOSS'}

 /* Keep v29's independent stall watchdog fed without sending another network packet. */
 const t=now();
 if(t-lastSyntheticSnap>FAST_HEARTBEAT_MS){
  lastSyntheticSnap=t;
  try{
   const synthetic={t:'snap',state:{t:g.t,stage:g.stage,kills:g.kills,boss:g.boss,diff,n:{...g.n},players:(m.p||[]),e:(g.e||[]).map(e=>({id:e.id,x:e.tx??e.x,y:e.ty??e.y,r:e.r,hp:e.hp,max:e.max,type:e.type,boss:e.boss,anim:e.anim,grade:e.grade,variantRole:e.variantRole,visualVariant:e.visualVariant,bossTier:e.bossTier,elite:e.elite})),q:g.q||[],gem:g.gem||[],zones:g.zones||[],sync29:m.sy||null}};
   prevClientMessage30(synthetic);
  }catch{}
 }
}
function applyVisual30(m){
 if(!g||m.s<=lastClientVisualSeq){stats.staleDrops++;return}lastClientVisualSeq=m.s;if(m.st!==g.stage)return;
 g.q=(m.q||[]).map(unpackQ);g.gem=(m.g||[]).map(unpackGem);g.zones=(m.z||[]).map(unpackZone);
}

const prevClientMessage30=netClientMessage;
netClientMessage=function(msg){
 if(msg?.t==='v30f'){applyFast30(msg);return}
 if(msg?.t==='v30v'){applyVisual30(msg);return}
 return prevClientMessage30(msg);
};

/* Short extrapolation hides 100-250 ms network gaps without changing authority. */
const prevUpdateClient30=updateClient;
updateClient=function(dt){
 if(g&&NET.mode==='client'&&state==='play'){
  const t=now(),lp=typeof localPlayer==='function'?localPlayer():null;
  for(const p of Object.values(g.players||{})){
   if(p===lp||!Number.isFinite(p._netBaseX30))continue;const age=clamp(t-(p._netRx30||t),0,MAX_EXTRAPOLATE_MS)/1000;p.tx=p._netBaseX30+(p._netVx30||0)*age;p.ty=p._netBaseY30+(p._netVy30||0)*age;
  }
  for(const e of g.e||[]){if(!Number.isFinite(e._netBaseX30))continue;const age=clamp(t-(e._netRx30||t),0,MAX_EXTRAPOLATE_MS)/1000;e.tx=e._netBaseX30+(e._netVx30||0)*age;e.ty=e._netBaseY30+(e._netVy30||0)*age}
 }
 return prevUpdateClient30(dt);
};

/* Session boundaries must discard sequence history from the previous room. */
const prevClose30=netClose;
netClose=function(){lastClientFastSeq=0;lastClientVisualSeq=0;lastSyntheticSnap=0;lastStageEpoch30=0;lastResumeEpoch30=0;return prevClose30()};

/* Helpers used by focused QA. */
window.NEXUS_PACK_FAST30=(state,conn)=>fastPacket(state,conn);
window.NEXUS_PACK_VISUAL30=(state,conn)=>visualPacket(state,conn);
window.NEXUS_APPLY_FAST30=applyFast30;
window.NEXUS_APPLY_VISUAL30=applyVisual30;
window.NEXUS_NETWORK_V30={build:BUILD,maxPlayers:5,compactSnapshots:true,interestManagement:true,latestStateWins:true,snapshotBackpressure:true,clientExtrapolation:true,separateVisualStream:true,directEnemyCap:DIRECT_ENEMY_CAP,relayEnemyCap:RELAY_ENEMY_CAP,interestRadius:INTEREST_RADIUS,bufferSoft:BUFFER_SOFT,bufferHard:BUFFER_HARD,stats};
})();
