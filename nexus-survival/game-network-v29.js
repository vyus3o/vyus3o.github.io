/* NEXUS SURVIVAL multiplayer stability + P2P/WebSocket relay build 0.29 */
(function(){
'use strict';
const MAX_PLAYERS=5;
const ICE_SERVERS=[
 {urls:'stun:stun.l.google.com:19302'},
 {urls:'stun:stun1.l.google.com:19302'},
 {urls:'stun:stun.relay.metered.ca:80'}
];
const PEER_OPTIONS={debug:1,config:{iceServers:ICE_SERVERS,iceTransportPolicy:'all',iceCandidatePoolSize:6,sdpSemantics:'unified-plan'}};
const MQTT_CDN='https://unpkg.com/mqtt/dist/mqtt.min.js';
const MQTT_BROKERS=['wss://broker.emqx.io:8084/mqtt','wss://test.mosquitto.org:8081/mqtt'];
let sessionGeneration=0,joinTimer=0,choiceEpoch=0,hostRelayClient=null,clientRelayClient=null;
const stateIntervals=new Set(),stateTimeouts=new Set(),processedChoices=new Set(),clientIdentity=new Map(),wsHostProxies=new Map();
const setText=(id,text)=>{const el=document.getElementById(id);if(el)el.textContent=text};
const stopJoinTimer=()=>{if(joinTimer){clearTimeout(joinTimer);joinTimer=0}};
const addTimeout=(fn,ms)=>{const id=setTimeout(()=>{stateTimeouts.delete(id);fn()},ms);stateTimeouts.add(id);return id};
const clearAsync=()=>{for(const id of stateIntervals)clearInterval(id);for(const id of stateTimeouts)clearTimeout(id);stateIntervals.clear();stateTimeouts.clear()};
const activeLobbyIds=()=>new Set(Object.keys(NET.lobby||{}));
const choiceKey=(pid,p,msg)=>`${sessionGeneration}:${pid}:${p?.l||0}:${msg?.choiceToken||'level'}`;
const roomRoot=code=>`nexus-survival-v29/${String(code||'').toLowerCase()}`;
const jsonParse=s=>{try{return JSON.parse(String(s))}catch{return null}};
function disableLevelInputs(){document.getElementById('levelModal')?.querySelectorAll('button').forEach(b=>b.disabled=true)}
function unlockLevelInputs(){const m=document.getElementById('levelModal');if(!m)return;m.dataset.choiceLocked='0';m.querySelectorAll('button').forEach(b=>b.disabled=false)}
function lockChoice(){const m=document.getElementById('levelModal');if(!m||m.dataset.choiceLocked==='1')return false;m.dataset.choiceLocked='1';disableLevelInputs();return true}
function clearDisconnectedPending(){
 if(!g?.players)return;const lobby=activeLobbyIds();
 for(const [pid,p] of Object.entries(g.players))if(pid!=='p1'&&NET.mode==='host'&&!lobby.has(pid)){p.pendingLevel=false;delete g.players[pid];delete NET.inputs?.[pid]}
}
function pendingConnected(){if(!g?.players)return[];const lobby=activeLobbyIds();return Object.values(g.players).filter(p=>p?.alive!==false&&p.pendingLevel&&(p.id==='p1'||NET.mode!=='host'||lobby.has(p.id)))}
function forceResumeIfReady(reason='sync'){
 if(!g||NET.mode!=='host')return false;clearDisconnectedPending();if(state!=='partyLevel')return false;if(pendingConnected().length)return false;
 const m=document.getElementById('levelModal');m?.classList.add('hidden');m?.classList.remove('partyPause28');document.getElementById('partyLevelStatus28')?.classList.add('hidden');
 for(const p of Object.values(g.players||{}))p.pendingLevel=false;state='play';const snap=typeof makeNetState==='function'?makeNetState():null;
 try{netBroadcast({t:'v28LevelResume',state:snap,reason,build:'0.29'})}catch{};if(typeof toast==='function')toast('PARTY READY // 전투 재개');return true;
}
function closeMqtt(c){try{c?.end?.(true)}catch{}}
function hardSessionCleanup(){
 sessionGeneration++;stopJoinTimer();clearAsync();processedChoices.clear();clientIdentity.clear();choiceEpoch=0;
 closeMqtt(hostRelayClient);closeMqtt(clientRelayClient);hostRelayClient=null;clientRelayClient=null;
 for(const p of wsHostProxies.values())p.open=false;wsHostProxies.clear();
 const m=document.getElementById('levelModal');if(m){m.dataset.choiceLocked='0';m.classList.add('hidden');m.classList.remove('partyPause28')}document.getElementById('partyLevelStatus28')?.classList.add('hidden');
 if(g?.players)for(const p of Object.values(g.players))p.pendingLevel=false;
}
const oldNetClose29=netClose;netClose=function(){hardSessionCleanup();return oldNetClose29()};
function newPeer(id){return id?new Peer(id,PEER_OPTIONS):new Peer(PEER_OPTIONS)}
async function routeOf(conn){
 try{const pc=conn?.peerConnection;if(!pc?.getStats)return'P2P';const stats=await pc.getStats();let pair=null;stats.forEach(r=>{if(r.type==='transport'&&r.selectedCandidatePairId)pair=stats.get(r.selectedCandidatePairId);if(r.type==='candidate-pair'&&r.state==='succeeded'&&r.nominated)pair=r});const local=pair?.localCandidateId?stats.get(pair.localCandidateId):null;return local?.candidateType==='relay'?'TURN RELAY':'DIRECT P2P'}catch{return'P2P'}
}
function loadMqtt29(){
 if(window.mqtt?.connect)return Promise.resolve(window.mqtt);if(window.__NEXUS_MQTT_LOAD29)return window.__NEXUS_MQTT_LOAD29;
 window.__NEXUS_MQTT_LOAD29=new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=MQTT_CDN;s.async=true;s.onload=()=>window.mqtt?.connect?resolve(window.mqtt):reject(new Error('MQTT load failed'));s.onerror=()=>reject(new Error('MQTT CDN failed'));document.head.appendChild(s)});return window.__NEXUS_MQTT_LOAD29;
}
async function connectMqtt29(clientId){
 const lib=await loadMqtt29();let lastErr;
 for(const url of MQTT_BROKERS){
  try{
   const c=lib.connect(url,{clientId,clean:true,keepalive:20,connectTimeout:6000,reconnectPeriod:0,protocolVersion:4,resubscribe:true});
   await new Promise((resolve,reject)=>{let done=false;const timer=setTimeout(()=>{if(done)return;done=true;reject(new Error('mqtt timeout'))},6500);c.once('connect',()=>{if(done)return;done=true;clearTimeout(timer);resolve()});c.once('error',e=>{if(done)return;done=true;clearTimeout(timer);reject(e)})});
   c.options.reconnectPeriod=1500;c.__nexusBroker=url;return c;
  }catch(e){lastErr=e}
 }
 throw lastErr||new Error('no mqtt broker');
}
function publishJson(c,topic,payload){if(!c?.connected)return false;try{c.publish(topic,JSON.stringify(payload),{qos:0,retain:false});return true}catch{return false}}
function removeHostProxy(key,reason='relay-close'){
 const proxy=wsHostProxies.get(key);if(!proxy)return;wsHostProxies.delete(key);proxy.open=false;const pid=proxy.playerId;
 if(pid){delete NET.lobby[pid];delete NET.inputs[pid];if(g?.players?.[pid]){g.players[pid].pendingLevel=false;delete g.players[pid]}}
 if(NET.conns.get(proxy.peer)===proxy)NET.conns.delete(proxy.peer);clientIdentity.delete(key);try{netBroadcastLobby()}catch{};forceResumeIfReady(reason);
}
async function startHostWebRelay(code,generation){
 try{
  const c=await connectMqtt29(`nexus-host-${String(code).toLowerCase()}-${Math.random().toString(36).slice(2,8)}`);if(generation!==sessionGeneration||NET.mode!=='host'){closeMqtt(c);return}
  hostRelayClient=c;const root=roomRoot(code),up=`${root}/up/+`;
  c.subscribe(up,{qos:0});
  c.on('message',(topic,buf)=>{
   if(generation!==sessionGeneration)return;const key=topic.slice(topic.lastIndexOf('/')+1),msg=jsonParse(buf);if(!msg||msg.room!==code)return;
   if(msg.payload?.t==='__relayClose'){removeHostProxy(key,'relay-close');return}
   let proxy=wsHostProxies.get(key);
   if(!proxy){
    let lastSnap=0;proxy={peer:`ws:${key}`,open:true,playerId:null,transport:'webrelay',send(payload){if(!this.open)return;if(payload?.t==='snap'){const now=Date.now();if(now-lastSnap<100)return;lastSnap=now}publishJson(c,`${root}/down/${key}`,{room:code,payload})},close(){this.open=false;publishJson(c,`${root}/down/${key}`,{room:code,payload:{t:'__relayClose'}})}};
    wsHostProxies.set(key,proxy);NET.conns.set(proxy.peer,proxy);
   }
   netHostMessage(proxy,msg.payload);
  });
  setText('hostStatus',`방 생성 완료 · ${Object.keys(NET.lobby||{}).length}/${MAX_PLAYERS} · P2P/WEB RELAY 대기`);
 }catch{if(generation===sessionGeneration&&NET.mode==='host')setText('hostStatus',`방 생성 완료 · ${Object.keys(NET.lobby||{}).length}/${MAX_PLAYERS} · P2P 사용`)}
}
async function startClientWebRelay(code,key,generation,onWelcome){
 if(clientRelayClient||generation!==sessionGeneration)return;
 try{
  const c=await connectMqtt29(`nexus-client-${key}-${Math.random().toString(36).slice(2,8)}`);if(generation!==sessionGeneration){closeMqtt(c);return}clientRelayClient=c;const root=roomRoot(code),down=`${root}/down/${key}`,up=`${root}/up/${key}`;
  const proxy={peer:`ws-host:${code}`,open:true,transport:'webrelay',send(payload){return publishJson(c,up,{room:code,payload})},close(){this.open=false;publishJson(c,up,{room:code,payload:{t:'__relayClose'}});closeMqtt(c)}};
  c.subscribe(down,{qos:0},()=>{});
  c.on('message',(topic,buf)=>{const msg=jsonParse(buf);const payload=msg?.room===code?msg.payload:null;if(!payload)return;if(payload.t==='welcome'||payload.t==='full'){onWelcome(payload,proxy,c);return}netClientMessage(payload)});
  let tries=0;const sendJoin=()=>{if(generation!==sessionGeneration||!proxy.open)return;tries++;proxy.send({t:'join',cls:typeof cls!=='undefined'?cls:'warrior',build:'0.29',clientKey:key,transport:'webrelay'});if(tries<10){const t=setTimeout(sendJoin,1200);stateTimeouts.add(t)}};sendJoin();
  setText('joinStatus','직접 연결 지연 · WEB RELAY 참가 시도 중');
 }catch{if(generation===sessionGeneration)setText('joinStatus','P2P 연결 계속 시도 중 · WEB RELAY 준비 실패')}
}
async function testWsRelay29(timeoutMs=12000){
 const tag=`qa-${Date.now()}-${Math.random().toString(36).slice(2,9)}`;let a,b;
 try{
  a=await connectMqtt29(`nexus-qa-a-${tag}`);b=await connectMqtt29(`nexus-qa-b-${tag}`);const topic=`nexus-survival-v29-qa/${tag}`;
  return await new Promise(resolve=>{let done=false;const finish=(ok,detail='')=>{if(done)return;done=true;clearTimeout(timer);resolve({ok,detail,brokerA:a.__nexusBroker,brokerB:b.__nexusBroker})};const timer=setTimeout(()=>finish(false,'web relay roundtrip timeout'),timeoutMs);a.subscribe(topic,{qos:0},err=>{if(err)return finish(false,String(err));a.on('message',(t,buf)=>{if(t===topic&&String(buf)==='ping')finish(true,'mqtt websocket roundtrip')});setTimeout(()=>b.publish(topic,'ping',{qos:0,retain:false}),150)})});
 }catch(e){return{ok:false,detail:String(e?.message||e)}}finally{closeMqtt(a);closeMqtt(b)}
}

/* Native 5-player acceptance and identity de-duplication across P2P/WebRelay. */
netAccept=function(conn){
 if(!conn)return;for(const [k,c] of [...NET.conns.entries()])if(!c||c.open===false){try{c?.close?.()}catch{}NET.conns.delete(k)}
 if(NET.conns.size>=MAX_PLAYERS-1){conn.on?.('open',()=>{try{conn.send({t:'full'})}catch{}});return}
 const old=NET.conns.get(conn.peer);if(old&&old!==conn){try{old.close()}catch{}NET.conns.delete(conn.peer)}
 let cleaned=false;const cleanup=()=>{if(cleaned)return;cleaned=true;const pid=conn.playerId;if(pid){delete NET.lobby[pid];delete NET.inputs[pid];if(g?.players?.[pid]){g.players[pid].pendingLevel=false;delete g.players[pid]}}if(NET.conns.get(conn.peer)===conn)NET.conns.delete(conn.peer);for(const [key,v] of clientIdentity)if(v.conn===conn)clientIdentity.delete(key);try{netBroadcastLobby()}catch{};forceResumeIfReady('disconnect')};
 conn.on('data',msg=>netHostMessage(conn,msg));conn.on('close',cleanup);conn.on('error',cleanup);NET.conns.set(conn.peer,conn);
};
const oldHostMessage29=netHostMessage;
netHostMessage=function(conn,msg){
 if(msg?.t==='join'&&msg.clientKey){
  const known=clientIdentity.get(msg.clientKey);
  if(known?.pid&&NET.lobby?.[known.pid]){
   try{conn.send({t:'welcome',id:known.pid,room:NET.roomCode,lobby:NET.lobby,diff:typeof diff!=='undefined'?diff:'NORMAL',build:'0.29',transport:known.transport})}catch{}
   if(conn!==known.conn){if(NET.conns.get(conn.peer)===conn)NET.conns.delete(conn.peer);if(String(conn.peer).startsWith('ws:'))wsHostProxies.delete(msg.clientKey)}return;
  }
  const out=oldHostMessage29(conn,msg);if(conn.playerId)clientIdentity.set(msg.clientKey,{pid:conn.playerId,conn,transport:msg.transport||'p2p'});return out;
 }
 if(msg?.t==='choice'&&conn?.playerId){const p=g?.players?.[conn.playerId];if(!p||!p.pendingLevel)return;const key=choiceKey(conn.playerId,p,msg);if(processedChoices.has(key))return;processedChoices.add(key)}
 const out=oldHostMessage29(conn,msg);if(msg?.t==='choice')forceResumeIfReady('choice');return out;
};
const oldNetSendChoice29=netSendChoice;
netSendChoice=function(choice){if(NET.mode!=='client'||!NET.hostConn?.open)return;const p=typeof localPlayer==='function'?localPlayer():null,token=p?`${p.id}:${p.l}:${p._choiceEpoch29||0}`:`client:${choiceEpoch}`;try{NET.hostConn.send({t:'choice',choice,choiceToken:token,build:'0.29'})}catch{oldNetSendChoice29(choice)}};
const oldShowLevelChoices29=showLevelChoices;showLevelChoices=function(p,choices){choiceEpoch++;if(p)p._choiceEpoch29=choiceEpoch;const out=oldShowLevelChoices29(p,choices);unlockLevelInputs();return out};
const oldSelectChoice29=selectChoice;selectChoice=function(o){if(!lockChoice())return;return oldSelectChoice29(o)};
const nexusBtn29=document.getElementById('nexusBtn');if(nexusBtn29){const old=nexusBtn29.onclick;nexusBtn29.onclick=function(ev){if(!g||!localPlayer()?.pendingLevel||!lockChoice())return;return typeof old==='function'?old.call(this,ev):undefined}};

netCreateHost=function(){
 if(typeof Peer==='undefined'){setText('hostStatus','PeerJS 로드 실패');return}const generation=sessionGeneration;
 const create=(attempt=0)=>{const code=netCode(),peer=newPeer(netPeerId(code));NET.peer=peer;NET.roomCode=code;peer.on('open',()=>{if(generation!==sessionGeneration)return;NET.ready=true;NET.lobby={p1:{id:'p1',cls:typeof cls!=='undefined'?cls:'warrior',name:'HOST'}};setText('roomCode',code);setText('hostStatus',`방 생성 완료 · 1/${MAX_PLAYERS} · P2P/WEB RELAY 준비`);const start=document.getElementById('start');if(start){start.disabled=false;start.textContent='START MULTI RUN // 방 시작'}netRenderLobby();startHostWebRelay(code,generation)});peer.on('connection',conn=>netAccept(conn));peer.on('disconnected',()=>{try{peer.reconnect()}catch{}});peer.on('error',err=>{if(err?.type==='unavailable-id'&&attempt<4){try{peer.destroy()}catch{};create(attempt+1);return}setText('hostStatus','네트워크 오류 · '+(err?.type||'unknown'))})};create();
};
netJoin=function(code){
 code=String(code||'').trim().toUpperCase();if(!code)return;netClose();NET.mode='client';NET.roomCode=code;const generation=sessionGeneration,clientKey=`c${Math.random().toString(36).slice(2,11)}`;stopJoinTimer();setText('joinStatus','연결 준비 중 · P2P 우선');if(typeof Peer==='undefined'){setText('joinStatus','PeerJS 로드 실패');return}
 const peer=newPeer();NET.peer=peer;let welcomed=false,retrying=false,relayStarted=false,directConn=null;
 const finish=(msg,transport,conn,mqttClient)=>{if(welcomed||generation!==sessionGeneration)return;welcomed=true;stopJoinTimer();if(transport==='webrelay'){try{directConn?.close()}catch{}NET.hostConn=conn;NET.ready=true;clientRelayClient=mqttClient;netClientMessage(msg);setText('joinStatus','접속 완료 · WEB RELAY · 방장 시작 대기')}else{if(clientRelayClient){closeMqtt(clientRelayClient);clientRelayClient=null}NET.hostConn=conn;NET.ready=true;netClientMessage(msg);setTimeout(async()=>setText('joinStatus',`접속 완료 · ${await routeOf(conn)} · 방장 시작 대기`),200)}};
 const startRelay=()=>{if(relayStarted||welcomed||generation!==sessionGeneration)return;relayStarted=true;startClientWebRelay(code,clientKey,generation,(msg,proxy,c)=>{if(msg.t==='full'){welcomed=true;netClientMessage(msg);return}finish(msg,'webrelay',proxy,c)})};
 addTimeout(startRelay,2500);
 const retry=(attempt,why)=>{if(welcomed||generation!==sessionGeneration||retrying)return;retrying=true;stopJoinTimer();try{directConn?.close()}catch{};if(attempt>=4){startRelay();setText('joinStatus',`${why||'직접 연결 실패'} · WEB RELAY 대기 중`);return}addTimeout(()=>{if(generation!==sessionGeneration)return;retrying=false;connect(attempt+1)},650)};
 const connect=(attempt=0)=>{if(welcomed||generation!==sessionGeneration)return;stopJoinTimer();setText('joinStatus',`연결 중 ${attempt+1}/5 · P2P 협상`);let conn;try{conn=peer.connect(netPeerId(code),{reliable:true,serialization:'json'})}catch{return retry(attempt,'연결 생성 실패')}directConn=conn;NET.hostConn=conn;let opened=false;const tick=setInterval(()=>{const s=conn?.peerConnection?.iceConnectionState;if(!welcomed&&s)setText('joinStatus',`연결 중 ${attempt+1}/5 · ICE ${s.toUpperCase()}${relayStarted?' · WEB RELAY 병행':''}`)},700);stateIntervals.add(tick);const clearTick=()=>{clearInterval(tick);stateIntervals.delete(tick)};conn.on('open',()=>{opened=true;try{conn.send({t:'join',cls:typeof cls!=='undefined'?cls:'warrior',build:'0.29',clientKey,transport:'p2p'})}catch{}});conn.on('data',msg=>{if(msg?.t==='welcome'){clearTick();finish(msg,'p2p',conn);return}if(msg?.t==='full'){welcomed=true;clearTick();netClientMessage(msg);return}if(!welcomed)netClientMessage(msg)});conn.on('error',()=>{clearTick();retry(attempt,'P2P 연결 오류')});conn.on('close',()=>{clearTick();if(welcomed&&NET.hostConn===conn){setText('joinStatus','방과 연결이 끊겼습니다');if(typeof endGame==='function'&&g)endGame('호스트와 연결이 끊겼습니다',false)}else if(!welcomed)retry(attempt,'P2P 연결 종료')});joinTimer=setTimeout(()=>{clearTick();startRelay();retry(attempt,opened?'방장 응답 시간 초과':'P2P 연결 시간 초과')},7000)};
 peer.on('open',()=>connect(0));peer.on('disconnected',()=>{try{peer.reconnect()}catch{}});peer.on('error',err=>{if(!welcomed&&err?.type!=='peer-unavailable'){startRelay();setText('joinStatus','P2P 오류 · WEB RELAY 전환 중')}});
};

const returnBtn29=document.getElementById('returnMenuBtn');if(returnBtn29){const old=returnBtn29.onclick;returnBtn29.onclick=function(ev){hardSessionCleanup();return typeof old==='function'?old.call(this,ev):undefined}};
const lifetimeGuard=setInterval(()=>{try{if(g&&NET.mode==='host'&&state==='partyLevel')forceResumeIfReady('watchdog')}catch{}},500);
window.NEXUS_TEST_WS_RELAY29=testWsRelay29;window.NEXUS_RECONCILE_PARTY29=forceResumeIfReady;window.NEXUS_SESSION_CLEANUP29=hardSessionCleanup;
window.NEXUS_STABILITY_V29={build:'0.29',singleChoice:true,nexusLock:true,duplicateChoiceGuard:true,disconnectPauseRecovery:true,pauseWatchdog:true,multiReplayCleanup:true,sessionGeneration:true};
window.NEXUS_NETWORK_V29={build:'0.29',maxPlayers:5,p2pPrimary:true,webRelayFallback:true,webRelayBrokers:MQTT_BROKERS.length,stunUrls:ICE_SERVERS.length,joinAttempts:5,timeoutMs:7000,routeDetection:true,relayProbe:true,provider:'EMQX/Mosquitto public MQTT prototype relay'};
})();
