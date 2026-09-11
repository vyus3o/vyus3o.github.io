/* NEXUS SURVIVAL unified multiplayer transport build 0.31
 * Replaces the stacked v29/v30 network wrappers with one transport layer.
 * P2P is primary; WebSocket relay is fallback. Control packets stay immediate.
 * Combat state uses compact snapshots + client interpolation/backpressure.
 */
(function(){
'use strict';

const BUILD='0.31';
const MAX_PLAYERS=5;
const PLAYER_IDS=['p2','p3','p4','p5'];
const ICE_SERVERS=[
  {urls:'stun:stun.l.google.com:19302'},
  {urls:'stun:stun1.l.google.com:19302'},
  {urls:'stun:stun.cloudflare.com:3478'}
];
const PEER_OPTS={debug:1,config:{iceServers:ICE_SERVERS,iceTransportPolicy:'all',iceCandidatePoolSize:4}};
const MQTT_CDN='https://unpkg.com/mqtt/dist/mqtt.min.js';
const MQTT_BROKERS=['wss://broker.emqx.io:8084/mqtt','wss://test.mosquitto.org:8081/mqtt'];
const DIRECT_ENEMY_CAP=132;
const DIRECT_ENEMY_CAP_4P=108;
const RELAY_ENEMY_CAP=78;
const RELAY_ENEMY_CAP_4P=68;
const DIRECT_VISUAL_CAP={q:76,gem:100,zones:22};
const RELAY_VISUAL_CAP={q:48,gem:64,zones:16};
const DIRECT_VISUAL_GAP=.25;
const RELAY_FAST_GAP=.18;
const RELAY_VISUAL_GAP=.38;
const BUFFER_SOFT=128*1024;
const BUFFER_HARD=320*1024;
const INTEREST_RADIUS=1050;
const MAX_PREDICT_MS=220;
const RECONNECT_GRACE=9000;

let sessionGen=0,clientChoiceEpoch=0,fastSeq=0,visualSeq=0,lastClientFast=0,lastClientVisual=0;
let hostRelay=null,clientRelay=null,p2pClientConn=null,reconnectDeadline=0;
const timers=new Set(),intervals=new Set(),identities=new Map(),removeTimers=new Map(),processedChoices=new Set();
const relayProxies=new Map(),relayFastAt=new WeakMap(),visualAt=new WeakMap();
const stats={fastSent:0,visualSent:0,bufferDrops:0,relaySkips:0,staleDrops:0,reconnects:0,maxFastBytes:0,maxVisualBytes:0};
const GRADE=['common','uncommon','rare','epic','legendary'];
const ROLE=['swift','brute','hunter'];
const TIER=['normal','mid','major'];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const setText=(id,s)=>{const e=document.getElementById(id);if(e)e.textContent=s};
const wall=()=>performance.now();
const round=v=>Number.isFinite(v)?Math.round(v):0;
const r1=v=>Number.isFinite(v)?Math.round(v*10)/10:0;
const safeSize=v=>{try{return JSON.stringify(v).length}catch{return 0}};
const relayConn=c=>c?.transport==='webrelay'||String(c?.peer||'').startsWith('relay:');
const dcOf=c=>c?.dataChannel||c?._dc||c?._channel||null;
const buffered=c=>Number(dcOf(c)?.bufferedAmount||0);
const roomRoot=code=>`nexus-survival-v31/${String(code||'').toLowerCase()}`;
const parse=s=>{try{return JSON.parse(String(s))}catch{return null}};
const qosFor=p=>{const t=p?.t||p?.payload?.t;return(t==='v31s'||t==='v31v'||t==='input')?0:1};
const addTimer=(fn,ms)=>{const id=setTimeout(()=>{timers.delete(id);fn()},ms);timers.add(id);return id};
const addInterval=(fn,ms)=>{const id=setInterval(fn,ms);intervals.add(id);return id};
function clearAsync(){for(const x of timers)clearTimeout(x);for(const x of intervals)clearInterval(x);timers.clear();intervals.clear()}
function closeMqtt(c){try{c?.end?.(true)}catch{}}
function partyN(){return Math.max(1,Object.keys(NET?.lobby||{}).length)}
function clientKey(){let k=sessionStorage.getItem('nexus-client-key-v31');if(!k){k=`c-${Math.random().toString(36).slice(2,10)}-${Date.now().toString(36)}`;sessionStorage.setItem('nexus-client-key-v31',k)}return k}
function newPeer(id){return id?new Peer(id,PEER_OPTS):new Peer(PEER_OPTS)}
function routeLabel(){return NET.transport||'P2P'}
function disableChoices(){const m=document.getElementById('levelModal');if(!m)return;m.dataset.choiceLocked31='1';m.querySelectorAll('button').forEach(b=>b.disabled=true)}
function enableChoices(){const m=document.getElementById('levelModal');if(!m)return;m.dataset.choiceLocked31='0';m.querySelectorAll('button').forEach(b=>b.disabled=false)}
function lockChoice(){const m=document.getElementById('levelModal');if(!m||m.dataset.choiceLocked31==='1')return false;disableChoices();return true}
function hidePauseUi(){
  document.getElementById('levelModal')?.classList.add('hidden');
  document.getElementById('chestModal')?.classList.add('hidden');
  document.getElementById('advancementModal')?.classList.add('hidden');
  document.getElementById('levelModal')?.classList.remove('partyPause28');
  document.getElementById('partyLevelStatus28')?.classList.add('hidden');
  window.__nexusV19ClientChest=false;
  if(g?.players)for(const p of Object.values(g.players))p.pendingLevel=false;
}
function resumeIfNoPending(reason='disconnect'){
  if(NET.mode!=='host'||!g||state!=='partyLevel')return false;
  const active=new Set(Object.keys(NET.lobby||{}));
  const pending=Object.values(g.players||{}).filter(p=>p?.pendingLevel&&(p.id==='p1'||active.has(p.id)));
  if(pending.length)return false;
  hidePauseUi();state='play';
  try{netBroadcast({t:'v28LevelResume',state:makeNetState(),reason,build:BUILD})}catch{}
  return true;
}
function cleanupSession(){
  sessionGen++;clearAsync();processedChoices.clear();clientChoiceEpoch=0;fastSeq=visualSeq=lastClientFast=lastClientVisual=0;
  for(const t of removeTimers.values())clearTimeout(t);removeTimers.clear();identities.clear();
  closeMqtt(hostRelay);closeMqtt(clientRelay);hostRelay=clientRelay=null;
  for(const p of relayProxies.values())p.open=false;relayProxies.clear();p2pClientConn=null;reconnectDeadline=0;
  NET.transport='';NET.ping=0;
  const m=document.getElementById('levelModal');if(m)m.dataset.choiceLocked31='0';
}

const prevNetClose31=netClose;
netClose=function(){cleanupSession();return prevNetClose31()};

function loadMqtt(){
  if(window.mqtt?.connect)return Promise.resolve(window.mqtt);
  if(window.__NEXUS_MQTT31)return window.__NEXUS_MQTT31;
  window.__NEXUS_MQTT31=new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=MQTT_CDN;s.async=true;s.onload=()=>window.mqtt?.connect?resolve(window.mqtt):reject(new Error('mqtt load failed'));s.onerror=()=>reject(new Error('mqtt cdn failed'));document.head.appendChild(s)});
  return window.__NEXUS_MQTT31;
}
async function connectMqtt(id){
  const lib=await loadMqtt();let last;
  for(const url of MQTT_BROKERS){
    try{
      const c=lib.connect(url,{clientId:id,clean:true,keepalive:20,connectTimeout:5500,reconnectPeriod:1200,resubscribe:true,protocolVersion:4});
      await new Promise((resolve,reject)=>{let done=false;const tm=setTimeout(()=>{if(done)return;done=true;reject(new Error('mqtt timeout'))},6000);c.once('connect',()=>{if(done)return;done=true;clearTimeout(tm);resolve()});c.once('error',e=>{if(done)return;done=true;clearTimeout(tm);reject(e)})});
      c.__broker=url;return c;
    }catch(e){last=e}
  }
  throw last||new Error('no relay broker');
}
function publish(c,topic,payload){if(!c?.connected)return false;try{c.publish(topic,JSON.stringify(payload),{qos:qosFor(payload),retain:false});return true}catch{return false}}

function cancelRemoval(pid){const t=removeTimers.get(pid);if(t){clearTimeout(t);removeTimers.delete(pid)}}
function scheduleRemoval(conn){
  const pid=conn?.playerId,key=conn?.clientKey;if(!pid||conn?._replaced)return;
  const rec=key?identities.get(key):null;if(rec?.conn&&rec.conn!==conn&&rec.conn.open)return;
  const lp=NET.lobby?.[pid];if(lp)lp.connected=false;
  if(g?.players?.[pid])g.players[pid].pendingLevel=false;
  try{netBroadcastLobby()}catch{};resumeIfNoPending('disconnect');
  cancelRemoval(pid);
  const tm=setTimeout(()=>{
    removeTimers.delete(pid);const cur=key?identities.get(key):null;if(cur?.conn?.open)return;
    delete NET.lobby?.[pid];delete NET.inputs?.[pid];if(g?.players?.[pid])delete g.players[pid];if(key)identities.delete(key);
    try{netBroadcastLobby()}catch{};
  },RECONNECT_GRACE);removeTimers.set(pid,tm);
}
function attachHostConn(conn){
  if(!conn)return;let cleaned=false;
  const cleanup=()=>{if(cleaned)return;cleaned=true;if(NET.conns.get(conn.peer)===conn)NET.conns.delete(conn.peer);scheduleRemoval(conn)};
  conn.on?.('data',m=>netHostMessage(conn,m));conn.on?.('close',cleanup);conn.on?.('error',cleanup);NET.conns.set(conn.peer,conn);
}
netAccept=function(conn){attachHostConn(conn)};

const prevHostMessage31=netHostMessage;
netHostMessage=function(conn,msg){
  if(!msg||typeof msg!=='object')return;
  if(msg.t==='join'){
    const key=String(msg.clientKey||conn.peer||Math.random()),old=identities.get(key);
    if(old?.pid&&NET.lobby?.[old.pid]){
      const preferNew=!relayConn(conn)&&relayConn(old.conn);
      if(preferNew||!old.conn?.open){
        if(old.conn&&old.conn!==conn){old.conn._replaced=true;try{old.conn.close?.()}catch{}}
        conn.playerId=old.pid;conn.clientKey=key;old.conn=conn;old.transport=msg.transport||'p2p';NET.lobby[old.pid].connected=true;cancelRemoval(old.pid);
      }else if(old.conn!==conn){
        conn.playerId=old.pid;conn.clientKey=key;
      }
      try{conn.send({t:'welcome',id:old.pid,room:NET.roomCode,lobby:NET.lobby,diff:typeof diff!=='undefined'?diff:'NORMAL',build:BUILD,transport:old.transport||'p2p'})}catch{}
      try{netBroadcastLobby()}catch{};return;
    }
    const used=new Set(Object.keys(NET.lobby||{})),pid=PLAYER_IDS.find(x=>!used.has(x));
    if(!pid){try{conn.send({t:'full'})}catch{};return}
    conn.playerId=pid;conn.clientKey=key;NET.lobby[pid]={id:pid,cls:msg.cls||'warrior',name:'PLAYER '+pid.slice(1),connected:true};NET.inputs[pid]={};identities.set(key,{pid,conn,transport:msg.transport||'p2p'});
    try{conn.send({t:'welcome',id:pid,room:NET.roomCode,lobby:NET.lobby,diff:typeof diff!=='undefined'?diff:'NORMAL',build:BUILD,transport:msg.transport||'p2p'})}catch{}
    netBroadcastLobby();setText('hostStatus',`방 생성 완료 · ${Object.keys(NET.lobby).length}/${MAX_PLAYERS} 연결됨`);return;
  }
  if(msg.t==='choice'&&conn?.playerId){const p=g?.players?.[conn.playerId];if(!p?.pendingLevel)return;const key=`${sessionGen}:${conn.playerId}:${p.l||0}:${msg.choiceToken||'choice'}`;if(processedChoices.has(key))return;processedChoices.add(key)}
  const out=prevHostMessage31(conn,msg);if(msg.t==='choice')resumeIfNoPending('choice');return out;
};

async function startHostRelay(code,gen){
  try{
    const c=await connectMqtt(`nxs-h-${String(code).toLowerCase()}-${Math.random().toString(36).slice(2,7)}`);if(gen!==sessionGen||NET.mode!=='host'){closeMqtt(c);return}hostRelay=c;
    const root=roomRoot(code),up=`${root}/up/+`;c.subscribe(up,{qos:1});
    c.on('message',(topic,buf)=>{
      if(gen!==sessionGen)return;const key=topic.slice(topic.lastIndexOf('/')+1),wrap=parse(buf),payload=wrap?.room===code?wrap.payload:null;if(!payload)return;
      if(payload.t==='__close'){const p=relayProxies.get(key);if(p){p.open=false;scheduleRemoval(p);relayProxies.delete(key);if(NET.conns.get(p.peer)===p)NET.conns.delete(p.peer)}return}
      let proxy=relayProxies.get(key);
      if(!proxy){proxy={peer:`relay:${key}`,open:true,transport:'webrelay',playerId:null,clientKey:key,send(p){return publish(c,`${root}/down/${key}`,{room:code,payload:p})},close(){this.open=false;publish(c,`${root}/down/${key}`,{room:code,payload:{t:'__close'}})}};relayProxies.set(key,proxy);attachHostConn(proxy)}
      netHostMessage(proxy,payload);
    });
  }catch{}
}

function selectClientRoute(conn,transport){
  if(NET.hostConn?.open&&NET.hostConn!==conn){if(transport==='P2P'&&NET.transport==='WEB RELAY'){try{NET.hostConn.close?.()}catch{};closeMqtt(clientRelay);clientRelay=null}else return false;}
  NET.hostConn=conn;NET.ready=true;NET.transport=transport;stats.reconnects+=reconnectDeadline?1:0;reconnectDeadline=0;
  if(transport==='P2P'){closeMqtt(clientRelay);clientRelay=null}
  setText('joinStatus',`접속 완료 · ${transport} · 방장 시작 대기`);return true;
}
function handleClientPayload(msg,conn,transport){
  if(!msg||typeof msg!=='object')return;
  if(msg.t==='welcome')selectClientRoute(conn,transport);
  if(NET.hostConn&&NET.hostConn!==conn&&msg.t!=='full')return;
  netClientMessage(msg);
}
async function startClientRelay(code,key,gen,reconnecting=false){
  if(clientRelay||gen!==sessionGen)return;
  try{
    const c=await connectMqtt(`nxs-c-${key}-${Math.random().toString(36).slice(2,7)}`);if(gen!==sessionGen||NET.hostConn?.open){closeMqtt(c);return}clientRelay=c;
    const root=roomRoot(code),down=`${root}/down/${key}`,up=`${root}/up/${key}`;
    const proxy={peer:`relay-host:${code}`,open:true,transport:'webrelay',send(p){return publish(c,up,{room:code,payload:p})},close(){this.open=false;publish(c,up,{room:code,payload:{t:'__close'}});closeMqtt(c)}};
    c.subscribe(down,{qos:1});c.on('message',(topic,buf)=>{const w=parse(buf),p=w?.room===code?w.payload:null;if(!p)return;handleClientPayload(p,proxy,'WEB RELAY')});
    let n=0;const join=()=>{if(gen!==sessionGen||NET.hostConn?.open||!proxy.open)return;n++;proxy.send({t:'join',cls:typeof cls!=='undefined'?cls:'warrior',build:BUILD,clientKey:key,transport:'webrelay'});if(n<12)addTimer(join,900)};join();
    setText('joinStatus',reconnecting?'연결 복구 중 · WEB RELAY 시도':'직접 연결 지연 · WEB RELAY 시도 중');
  }catch{if(!NET.hostConn?.open)setText('joinStatus',reconnecting?'재연결 계속 시도 중':'P2P 연결 계속 시도 중')}
}
function beginReconnect(code,key,gen){
  if(gen!==sessionGen||NET.mode!=='client'||reconnectDeadline)return;reconnectDeadline=Date.now()+12000;NET.ready=false;NET.hostConn=null;setText('joinStatus','연결 복구 중...');
  startClientRelay(code,key,gen,true);
  const poll=addInterval(()=>{if(gen!==sessionGen||NET.hostConn?.open){clearInterval(poll);intervals.delete(poll);return}if(Date.now()>reconnectDeadline){clearInterval(poll);intervals.delete(poll);reconnectDeadline=0;setText('joinStatus','연결 복구 실패 · 다시 참가해 주세요')}} ,500);
}

netCreateHost=function(){
  if(typeof Peer==='undefined'){setText('hostStatus','PeerJS 로드 실패');return}const gen=sessionGen;
  const create=(attempt=0)=>{const code=netCode(),peer=newPeer(netPeerId(code));NET.peer=peer;NET.roomCode=code;
    peer.on('open',()=>{if(gen!==sessionGen)return;NET.ready=true;NET.transport='HOST';NET.lobby={p1:{id:'p1',cls:typeof cls!=='undefined'?cls:'warrior',name:'HOST',connected:true}};setText('roomCode',code);setText('hostStatus',`방 생성 완료 · 1/${MAX_PLAYERS} · P2P 우선`);const start=document.getElementById('start');if(start){start.disabled=false;start.textContent='START MULTI RUN // 방 시작'}netRenderLobby();startHostRelay(code,gen)});
    peer.on('connection',netAccept);peer.on('disconnected',()=>{try{peer.reconnect()}catch{}});peer.on('error',e=>{if(e?.type==='unavailable-id'&&attempt<4){try{peer.destroy()}catch{};create(attempt+1)}else setText('hostStatus','네트워크 오류 · '+(e?.type||'unknown'))});
  };create();
};
netJoin=function(code){
  code=String(code||'').trim().toUpperCase();if(!code)return;netClose();NET.mode='client';NET.roomCode=code;const gen=sessionGen,key=clientKey();setText('joinStatus','P2P 연결 중...');if(typeof Peer==='undefined'){setText('joinStatus','PeerJS 로드 실패');return}
  const peer=newPeer();NET.peer=peer;
  peer.on('open',()=>{
    if(gen!==sessionGen)return;let conn;
    try{conn=peer.connect(netPeerId(code),{reliable:true,serialization:'json'})}catch{return startClientRelay(code,key,gen)}
    p2pClientConn=conn;NET.hostConn=null;
    conn.on('open',()=>{try{conn.send({t:'join',cls:typeof cls!=='undefined'?cls:'warrior',build:BUILD,clientKey:key,transport:'p2p'})}catch{};setText('joinStatus','방장 응답 대기 중')});
    conn.on('data',m=>handleClientPayload(m,conn,'P2P'));
    conn.on('close',()=>{if(NET.hostConn===conn)beginReconnect(code,key,gen)});
    conn.on('error',()=>{if(NET.hostConn===conn)beginReconnect(code,key,gen)});
    addTimer(()=>{if(gen===sessionGen&&!NET.hostConn?.open)startClientRelay(code,key,gen)},3200);
    addTimer(()=>{if(gen===sessionGen&&!NET.hostConn?.open)setText('joinStatus','연결 재시도 중 · P2P/WEB RELAY')},6500);
  });
  peer.on('disconnected',()=>{try{peer.reconnect()}catch{}});peer.on('error',()=>{if(!NET.hostConn?.open)startClientRelay(code,key,gen)});
};

function enemyCode(arr,v){const i=arr.indexOf(v);return i<0?0:i}
function packEnemy(e){return[e.id,round(e.x),round(e.y),round(e.r),round(e.hp),round(e.max),e.type||0,e.boss?1:0,r1(e.anim),enemyCode(GRADE,e.grade),enemyCode(ROLE,e.variantRole),e.visualVariant||0,enemyCode(TIER,e.bossTier),e.elite?1:0]}
function unpackEnemy(a){return{id:a[0],x:a[1],y:a[2],r:a[3],hp:a[4],max:a[5],type:a[6],boss:!!a[7],anim:a[8],grade:GRADE[a[9]]||'common',variantRole:ROLE[a[10]]||'hunter',visualVariant:a[11]||0,bossTier:TIER[a[12]]||'normal',elite:!!a[13]}}
function anchor(state,conn){return (state?.players||[]).find(p=>p.id===conn?.playerId)||state?.n||{x:WORLD.w/2,y:WORLD.h/2}}
function chooseEnemies(state,conn){
  const a=anchor(state,conn),relay=relayConn(conn),large=partyN()>=4,cap=relay?(large?RELAY_ENEMY_CAP_4P:RELAY_ENEMY_CAP):(large?DIRECT_ENEMY_CAP_4P:DIRECT_ENEMY_CAP),rr=INTEREST_RADIUS*INTEREST_RADIUS;
  const scored=[];for(const e of state?.e||[]){const dx=(e.x||0)-a.x,dy=(e.y||0)-a.y,d2=dx*dx+dy*dy;if(e.boss||d2<=rr)scored.push([e.boss?-1:d2,e])}scored.sort((x,y)=>x[0]-y[0]);return scored.slice(0,cap).map(x=>x[1]);
}
function packQ(q){return[round(q.x),round(q.y),r1(q.vx),r1(q.vy),r1(q.life),q.col||'',q.size||0,q.source||'',q.ownerId||'',q.skill||'']}
function unpackQ(a){return{x:a[0],y:a[1],vx:a[2],vy:a[3],life:a[4],col:a[5],size:a[6],source:a[7],ownerId:a[8],skill:a[9]}}
function packGem(z){return[round(z.x),round(z.y),z.v||0,r1(z.spin)]}
function unpackGem(a){return{x:a[0],y:a[1],v:a[2],spin:a[3]}}
function packZone(z){return[z.type||'',round(z.x),round(z.y),round(z.r),r1(z.life),r1(z.max),z.col||'']}
function unpackZone(a){return{type:a[0],x:a[1],y:a[2],r:a[3],life:a[4],max:a[5],col:a[6]}}
function fastPacket(s,conn){return{t:'v31s',seq:++fastSeq,ht:r1(s?.t),st:s?.stage||0,k:s?.kills||0,b:!!s?.boss,d:s?.diff||diff,phase:state,n:s?.n,p:s?.players||[],e:chooseEnemies(s,conn).map(packEnemy),te:(s?.e||[]).length}}
function visualPacket(s,conn){
  const a=anchor(s,conn),relay=relayConn(conn),cap=relay?RELAY_VISUAL_CAP:DIRECT_VISUAL_CAP,rr=INTEREST_RADIUS*INTEREST_RADIUS,near=o=>{const dx=(o.x||0)-a.x,dy=(o.y||0)-a.y;return dx*dx+dy*dy<=rr};
  return{t:'v31v',seq:++visualSeq,st:s?.stage||0,q:(s?.q||[]).filter(near).slice(0,cap.q).map(packQ),g:(s?.gem||[]).filter(near).slice(0,cap.gem).map(packGem),z:(s?.zones||[]).filter(near).slice(0,cap.zones).map(packZone)};
}
function safeSend(c,p){try{c.send(p);return true}catch{return false}}
const prevBroadcast31=netBroadcast;
netBroadcast=function(data){
  if(NET.mode!=='host'||data?.t!=='snap'||!data.state)return prevBroadcast31(data);
  const s=data.state,hostT=Number(s.t)||0;
  for(const c of NET.conns?.values?.()||[]){
    if(!c?.open)continue;const relay=relayConn(c),buf=buffered(c);if(!relay&&buf>BUFFER_HARD){stats.bufferDrops++;continue}
    const last=relayFastAt.get(c);if(!relay||last==null||hostT<last||hostT-last>=RELAY_FAST_GAP){const p=fastPacket(s,c),bytes=safeSize(p);if(safeSend(c,p)){relayFastAt.set(c,hostT);stats.fastSent++;stats.maxFastBytes=Math.max(stats.maxFastBytes,bytes)}}else stats.relaySkips++;
    const gap=relay?RELAY_VISUAL_GAP:DIRECT_VISUAL_GAP,lv=visualAt.get(c);if((lv==null||hostT<lv||hostT-lv>=gap)&&(relay||buf<BUFFER_SOFT)){const p=visualPacket(s,c),bytes=safeSize(p);if(safeSend(c,p)){visualAt.set(c,hostT);stats.visualSent++;stats.maxVisualBytes=Math.max(stats.maxVisualBytes,bytes)}}
  }
};

function vel(ox,oy,nx,ny,dt,cap){if(!(dt>.02&&dt<1))return[0,0];let vx=(nx-ox)/dt,vy=(ny-oy)/dt,l=Math.hypot(vx,vy);if(l>cap){vx*=cap/l;vy*=cap/l}return[vx,vy]}
function applyPlayers(rows,hostT,stageChanged){
  const map=g.players||{};for(const d of rows||[]){let p=map[d.id],fresh=!p;if(!p)p=makePlayer(d.id,d.cls,d.x,d.y);const ox=p.x,oy=p.y,px=Number.isFinite(p._bx31)?p._bx31:(p.tx??p.x),py=Number.isFinite(p._by31)?p._by31:(p.ty??p.y),pt=p._ht31,dt=Number.isFinite(pt)?hostT-pt:0,[vx,vy]=vel(px,py,d.x,d.y,dt,480);Object.assign(p,d);p.tx=d.x;p.ty=d.y;p._bx31=d.x;p._by31=d.y;p._vx31=vx;p._vy31=vy;p._rx31=wall();p._ht31=hostT;if(!fresh&&!stageChanged){p.x=ox;p.y=oy}map[d.id]=p}
  for(const id of Object.keys(map))if(!(rows||[]).some(p=>p.id===id))delete map[id];g.players=map;
}
function applyEnemies(rows,hostT,stageChanged){
  const old=new Map((g.e||[]).map(e=>[e.id,e])),arr=[];for(const raw of rows||[]){const d=unpackEnemy(raw);let e=old.get(d.id),fresh=!e;if(!e)e={...d,x:d.x,y:d.y,tx:d.x,ty:d.y,dead:false};const ox=e.x,oy=e.y,px=Number.isFinite(e._bx31)?e._bx31:(e.tx??e.x),py=Number.isFinite(e._by31)?e._by31:(e.ty??e.y),pt=e._ht31,dt=Number.isFinite(pt)?hostT-pt:0,[vx,vy]=vel(px,py,d.x,d.y,dt,e.boss?320:520);Object.assign(e,d);e.tx=d.x;e.ty=d.y;e._bx31=d.x;e._by31=d.y;e._vx31=vx;e._vy31=vy;e._rx31=wall();e._ht31=hostT;e._v21Tiered=true;if(!fresh&&!stageChanged){e.x=ox;e.y=oy}arr.push(e)}g.e=arr;
}
function recoverPhase(hostPhase){if(hostPhase==='play'&&['chest','partyLevel','advancement','awakening','level'].includes(state)){hidePauseUi();state='play'}}
function applyFast(m){
  if(!g||m.seq<=lastClientFast){stats.staleDrops++;return}lastClientFast=m.seq;const stageChanged=m.st!==g.stage,hostT=Number(m.ht)||0;if(m.d)diff=m.d;
  g.t=hostT;
  g.stage=m.st;g.kills=m.k;g.boss=!!m.b;if(m.n)Object.assign(g.n,m.n);g._netTotalEnemies31=m.te||0;applyPlayers(m.p,hostT,stageChanged);applyEnemies(m.e,hostT,stageChanged);recoverPhase(m.phase);
  const bh=document.getElementById('bosshud');bh?.classList.toggle('hidden',!g.boss);if(g.boss){const bn=document.getElementById('bname');if(bn)bn.textContent=ST[g.stage]?.boss||'BOSS'}
}
function applyVisual(m){if(!g||m.seq<=lastClientVisual){stats.staleDrops++;return}lastClientVisual=m.seq;if(m.st!==g.stage)return;g.q=(m.q||[]).map(unpackQ);g.gem=(m.g||[]).map(unpackGem);g.zones=(m.z||[]).map(unpackZone)}
const prevClientMessage31=netClientMessage;
netClientMessage=function(msg){
  if(msg?.t==='v31s'){applyFast(msg);return}
  if(msg?.t==='v31v'){applyVisual(msg);return}
  if(msg?.t==='pong'&&Number.isFinite(msg.at)){NET.ping=Math.max(0,Math.round(wall()-msg.at));return prevClientMessage31(msg)}
  if(msg?.t==='level')clientChoiceEpoch++;
  return prevClientMessage31(msg);
};
const prevUpdateClient31=updateClient;
updateClient=function(dt){
  if(g&&NET.mode==='client'&&state==='play'){
    const t=wall(),lp=localPlayer();for(const p of Object.values(g.players||{})){if(p===lp||!p._rx31)continue;const age=Math.min(MAX_PREDICT_MS,Math.max(0,t-p._rx31))/1000;p.tx=(p._bx31??p.x)+(p._vx31||0)*age*.55;p.ty=(p._by31??p.y)+(p._vy31||0)*age*.55}
    for(const e of g.e||[]){if(!e._rx31)continue;const age=Math.min(MAX_PREDICT_MS,Math.max(0,t-e._rx31))/1000;e.tx=(e._bx31??e.x)+(e._vx31||0)*age*.45;e.ty=(e._by31??e.y)+(e._vy31||0)*age*.45}
  }
  return prevUpdateClient31(dt);
};

const prevSendChoice31=netSendChoice;
netSendChoice=function(choice){if(NET.mode!=='client'||!NET.hostConn?.open)return;const p=localPlayer(),token=`${sessionGen}:${NET.localId}:${p?.l||0}:${clientChoiceEpoch}`;try{NET.hostConn.send({t:'choice',choice,choiceToken:token,build:BUILD})}catch{return prevSendChoice31(choice)}};
const prevShowChoices31=showLevelChoices;
showLevelChoices=function(p,choices){const out=prevShowChoices31(p,choices);enableChoices();return out};
const prevSelectChoice31=selectChoice;
selectChoice=function(o){if(!lockChoice())return;return prevSelectChoice31(o)};
const nexus31=document.getElementById('nexusBtn');if(nexus31&&!nexus31.dataset.v31){nexus31.dataset.v31='1';const old=nexus31.onclick;nexus31.onclick=function(ev){if(!lockChoice())return;return typeof old==='function'?old.call(this,ev):undefined}};

const prevHud31=hud;
hud=function(){const out=prevHud31();const e=document.getElementById('netData');if(e&&NET.mode!=='solo'){const p=NET.ping?` · ${NET.ping}ms`:'';e.textContent=`${NET.mode==='host'?'HOST':'CLIENT'} · ${partyN()}P · ${routeLabel()}${p}`}return out};
setInterval(()=>{if(NET.mode==='client'&&NET.hostConn?.open)try{NET.hostConn.send({t:'ping',at:wall()})}catch{}},2000);

window.NEXUS_NETWORK_V31={build:BUILD,maxPlayers:5,unifiedTransport:true,p2pPrimary:true,webRelayFallback:true,compactSnapshots:true,interestManagement:true,clientInterpolation:true,backpressure:true,reconnectGrace:true,singleChoice:true,duplicateChoiceGuard:true,stats};
})();