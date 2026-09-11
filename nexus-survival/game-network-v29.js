/* NEXUS SURVIVAL multiplayer stability + TURN transport hotfix build 0.29 */
(function(){
'use strict';
const MAX_PLAYERS=5;
const ICE_SERVERS=[
 {urls:'stun:stun.l.google.com:19302'},
 {urls:'stun:stun1.l.google.com:19302'},
 {urls:'stun:stun.relay.metered.ca:80'},
 {urls:'turn:openrelay.metered.ca:80',username:'openrelayproject',credential:'openrelayproject'},
 {urls:'turn:openrelay.metered.ca:443',username:'openrelayproject',credential:'openrelayproject'},
 {urls:'turn:openrelay.metered.ca:443?transport=tcp',username:'openrelayproject',credential:'openrelayproject'}
];
const PEER_OPTIONS={debug:1,config:{iceServers:ICE_SERVERS,iceTransportPolicy:'all',iceCandidatePoolSize:6,sdpSemantics:'unified-plan'}};
let sessionGeneration=0,joinTimer=0,choiceEpoch=0;
const stateIntervals=new Set(),processedChoices=new Set();
const setText=(id,text)=>{const el=document.getElementById(id);if(el)el.textContent=text};
const stopJoinTimer=()=>{if(joinTimer){clearTimeout(joinTimer);joinTimer=0}};
const clearStateIntervals=()=>{for(const id of stateIntervals)clearInterval(id);stateIntervals.clear()};
const activeLobbyIds=()=>new Set(Object.keys(NET.lobby||{}));
const lobbyCount=()=>Object.keys(NET.lobby||{}).length;
const choiceKey=(pid,p,msg)=>`${sessionGeneration}:${pid}:${p?.l||0}:${msg?.choiceToken||'level'}`;
function disableLevelInputs(){
 const modal=document.getElementById('levelModal');if(!modal)return;
 modal.querySelectorAll('button').forEach(b=>b.disabled=true);
}
function unlockLevelInputs(){
 const modal=document.getElementById('levelModal');if(!modal)return;
 modal.dataset.choiceLocked='0';modal.querySelectorAll('button').forEach(b=>b.disabled=false);
}
function lockChoice(){
 const modal=document.getElementById('levelModal');
 if(!modal||modal.dataset.choiceLocked==='1')return false;
 modal.dataset.choiceLocked='1';disableLevelInputs();return true;
}
function clearDisconnectedPending(){
 if(!g?.players)return;
 const lobby=activeLobbyIds();
 for(const [pid,p] of Object.entries(g.players)){
  if(pid!=='p1'&&NET.mode==='host'&&!lobby.has(pid)){
   p.pendingLevel=false;delete g.players[pid];delete NET.inputs?.[pid];
  }
 }
}
function pendingConnected(){
 if(!g?.players)return [];
 const lobby=activeLobbyIds();
 return Object.values(g.players).filter(p=>p?.alive!==false&&p.pendingLevel&&(p.id==='p1'||NET.mode!=='host'||lobby.has(p.id)));
}
function forceResumeIfReady(reason='sync'){
 if(!g||NET.mode!=='host')return false;
 clearDisconnectedPending();
 if(state!=='partyLevel')return false;
 const pending=pendingConnected();if(pending.length)return false;
 const modal=document.getElementById('levelModal');modal?.classList.add('hidden');modal?.classList.remove('partyPause28');
 document.getElementById('partyLevelStatus28')?.classList.add('hidden');
 state='play';
 for(const p of Object.values(g.players||{}))p.pendingLevel=false;
 const snap=typeof makeNetState==='function'?makeNetState():null;
 try{netBroadcast({t:'v28LevelResume',state:snap,reason,build:'0.29'})}catch{}
 if(typeof toast==='function')toast('PARTY READY // 전투 재개');
 return true;
}
function hardSessionCleanup(){
 sessionGeneration++;stopJoinTimer();clearStateIntervals();processedChoices.clear();choiceEpoch=0;
 const modal=document.getElementById('levelModal');if(modal){modal.dataset.choiceLocked='0';modal.classList.add('hidden');modal.classList.remove('partyPause28')}
 document.getElementById('partyLevelStatus28')?.classList.add('hidden');
 if(g?.players)for(const p of Object.values(g.players))p.pendingLevel=false;
}

/* Every new lobby/run invalidates stale retries, choice ids and pause state. */
const oldNetClose29=netClose;
netClose=function(){hardSessionCleanup();return oldNetClose29()};

function newPeer(id){return id?new Peer(id,PEER_OPTIONS):new Peer(PEER_OPTIONS)}
async function routeOf(conn){
 try{
  const pc=conn?.peerConnection;if(!pc?.getStats)return 'P2P';
  const stats=await pc.getStats();let pair=null;
  stats.forEach(r=>{if(r.type==='transport'&&r.selectedCandidatePairId)pair=stats.get(r.selectedCandidatePairId);if(r.type==='candidate-pair'&&r.state==='succeeded'&&r.nominated)pair=r});
  const local=pair?.localCandidateId?stats.get(pair.localCandidateId):null;
  return local?.candidateType==='relay'?'TURN RELAY':'DIRECT P2P';
 }catch{return 'P2P'}
}
async function testTurnCandidate29(timeoutMs=15000){
 return await new Promise(async resolve=>{
  let done=false,pc;const finish=(ok,detail='')=>{if(done)return;done=true;clearTimeout(timer);try{pc?.close()}catch{};resolve({ok,detail})};
  pc=new RTCPeerConnection({iceServers:ICE_SERVERS,iceTransportPolicy:'relay'});
  const timer=setTimeout(()=>finish(false,'relay candidate timeout'),timeoutMs);
  pc.createDataChannel('turn-probe');
  pc.onicecandidate=e=>{const c=e.candidate?.candidate||'';if(c.includes(' typ relay '))finish(true,c);else if(!e.candidate)finish(false,'ICE gathering completed without relay candidate')};
  try{const offer=await pc.createOffer();await pc.setLocalDescription(offer)}catch(err){finish(false,String(err?.message||err))}
 });
}

/* Native 5-player acceptance + disconnect cleanup. */
netAccept=function(conn){
 if(!conn)return;
 for(const [key,c] of [...NET.conns.entries()])if(!c||c.open===false){try{c?.close?.()}catch{}NET.conns.delete(key)}
 if(NET.conns.size>=MAX_PLAYERS-1){conn.on('open',()=>{try{conn.send({t:'full'})}catch{}});return}
 const old=NET.conns.get(conn.peer);if(old&&old!==conn){try{old.close()}catch{}NET.conns.delete(conn.peer)}
 let cleaned=false;
 const cleanup=()=>{
  if(cleaned)return;cleaned=true;const pid=conn.playerId;
  if(pid){delete NET.lobby[pid];delete NET.inputs[pid];if(g?.players?.[pid]){g.players[pid].pendingLevel=false;delete g.players[pid]}}
  if(NET.conns.get(conn.peer)===conn)NET.conns.delete(conn.peer);
  try{netBroadcastLobby()}catch{}
  forceResumeIfReady('disconnect');
 };
 conn.on('data',msg=>netHostMessage(conn,msg));conn.on('close',cleanup);conn.on('error',cleanup);
 NET.conns.set(conn.peer,conn);
};

/* One authoritative level choice per player level, even on duplicate taps/packets. */
const oldHostMessage29=netHostMessage;
netHostMessage=function(conn,msg){
 if(msg?.t==='choice'&&conn?.playerId){
  const p=g?.players?.[conn.playerId];
  if(!p||!p.pendingLevel)return;
  const key=choiceKey(conn.playerId,p,msg);if(processedChoices.has(key))return;processedChoices.add(key);
 }
 const out=oldHostMessage29(conn,msg);
 if(msg?.t==='choice')forceResumeIfReady('choice');
 return out;
};
const oldNetSendChoice29=netSendChoice;
netSendChoice=function(choice){
 if(NET.mode!=='client'||!NET.hostConn?.open)return;
 const p=typeof localPlayer==='function'?localPlayer():null;
 const token=p?`${p.id}:${p.l}:${p._choiceEpoch29||0}`:`client:${choiceEpoch}`;
 try{NET.hostConn.send({t:'choice',choice,choiceToken:token,build:'0.29'})}catch{oldNetSendChoice29(choice)}
};

/* Reset the input lock for each new level, then make every selection single-shot. */
const oldShowLevelChoices29=showLevelChoices;
showLevelChoices=function(p,choices){
 choiceEpoch++;if(p)p._choiceEpoch29=choiceEpoch;
 const out=oldShowLevelChoices29(p,choices);unlockLevelInputs();return out;
};
const oldSelectChoice29=selectChoice;
selectChoice=function(o){if(!lockChoice())return;return oldSelectChoice29(o)};
const nexusBtn29=document.getElementById('nexusBtn');
if(nexusBtn29){
 const oldNexus29=nexusBtn29.onclick;
 nexusBtn29.onclick=function(ev){if(!g||!localPlayer()?.pendingLevel||!lockChoice())return;return typeof oldNexus29==='function'?oldNexus29.call(this,ev):undefined};
}

/* Host watchdog repairs the known party-pause deadlock caused by stale/disconnected pending players. */
const pauseWatch=setInterval(()=>{
 if(!g||NET.mode!=='host')return;
 clearDisconnectedPending();
 if(state==='partyLevel')forceResumeIfReady('watchdog');
},500);stateIntervals.add(pauseWatch);

netCreateHost=function(){
 if(typeof Peer==='undefined'){setText('hostStatus','PeerJS 로드 실패');return}
 const create=(attempt=0)=>{
  const code=netCode(),peer=newPeer(netPeerId(code));NET.peer=peer;NET.roomCode=code;
  peer.on('open',()=>{
   NET.ready=true;NET.lobby={p1:{id:'p1',cls:typeof cls!=='undefined'?cls:'warrior',name:'HOST'}};
   setText('roomCode',code);setText('hostStatus',`방 생성 완료 · 1/${MAX_PLAYERS} · DIRECT/TURN 대기`);
   const start=document.getElementById('start');if(start){start.disabled=false;start.textContent='START MULTI RUN // 방 시작'}netRenderLobby();
  });
  peer.on('connection',conn=>netAccept(conn));
  peer.on('disconnected',()=>{try{peer.reconnect()}catch{}});
  peer.on('error',err=>{if(err?.type==='unavailable-id'&&attempt<4){try{peer.destroy()}catch{};create(attempt+1);return}setText('hostStatus','네트워크 오류 · '+(err?.type||'unknown'))});
 };
 create();
};
netJoin=function(code){
 code=String(code||'').trim().toUpperCase();if(!code)return;
 netClose();NET.mode='client';NET.roomCode=code;const generation=sessionGeneration;stopJoinTimer();
 setText('joinStatus','연결 준비 중 · DIRECT/TURN 자동 선택');
 if(typeof Peer==='undefined'){setText('joinStatus','PeerJS 로드 실패');return}
 const peer=newPeer();NET.peer=peer;let welcomed=false,retrying=false;
 const retry=(attempt,why)=>{
  if(welcomed||generation!==sessionGeneration||retrying)return;retrying=true;stopJoinTimer();try{NET.hostConn?.close()}catch{}
  if(attempt>=4){setText('joinStatus',`${why||'연결 실패'} · 네트워크 경로 확보 실패`);return}
  setTimeout(()=>{if(generation!==sessionGeneration)return;retrying=false;connect(attempt+1)},700);
 };
 const connect=(attempt=0)=>{
  if(welcomed||generation!==sessionGeneration)return;stopJoinTimer();setText('joinStatus',`연결 중 ${attempt+1}/5 · DIRECT/TURN 협상`);
  let conn;try{conn=peer.connect(netPeerId(code),{reliable:true,serialization:'json'})}catch{return retry(attempt,'연결 생성 실패')}
  NET.hostConn=conn;let opened=false;
  const tick=setInterval(()=>{const pc=conn?.peerConnection,s=pc?.iceConnectionState,c=pc?.connectionState;if(!welcomed&&(s||c))setText('joinStatus',`연결 중 ${attempt+1}/5 · ICE ${(s||'-').toUpperCase()} · ${(c||'-').toUpperCase()}`)},700);stateIntervals.add(tick);
  const clearTick=()=>{clearInterval(tick);stateIntervals.delete(tick)};
  conn.on('open',()=>{opened=true;NET.ready=true;setText('joinStatus','방장 승인 대기 · 데이터채널 연결됨');try{conn.send({t:'join',cls:typeof cls!=='undefined'?cls:'warrior',build:'0.29'})}catch{}});
  conn.on('data',msg=>{
   if(msg?.t==='welcome'){welcomed=true;stopJoinTimer();clearTick();netClientMessage(msg);setTimeout(async()=>{if(generation===sessionGeneration)setText('joinStatus',`접속 완료 · ${await routeOf(conn)} · 방장 시작 대기`)},250);return}
   if(msg?.t==='full'){welcomed=true;stopJoinTimer();clearTick();netClientMessage(msg);return}netClientMessage(msg);
  });
  conn.on('error',()=>{clearTick();retry(attempt,'ICE 연결 오류')});
  conn.on('close',()=>{clearTick();if(welcomed){setText('joinStatus','방과 연결이 끊겼습니다');if(typeof endGame==='function'&&g)endGame('호스트와 연결이 끊겼습니다',false)}else retry(attempt,'DIRECT/TURN 연결 종료')});
  joinTimer=setTimeout(()=>{clearTick();retry(attempt,opened?'방장 응답 시간 초과':'DIRECT/TURN 연결 시간 초과')},14000);
 };
 peer.on('open',()=>connect(0));peer.on('disconnected',()=>{try{peer.reconnect()}catch{}});peer.on('error',err=>{if(!welcomed&&err?.type!=='peer-unavailable')setText('joinStatus','접속 오류 · '+(err?.type||'unknown'))});
};

/* Return-to-menu must also invalidate every old session timer and pending choice. */
const returnBtn29=document.getElementById('returnMenuBtn');
if(returnBtn29){const oldReturn29=returnBtn29.onclick;returnBtn29.onclick=function(ev){hardSessionCleanup();return typeof oldReturn29==='function'?oldReturn29.call(this,ev):undefined}};

window.NEXUS_TEST_TURN29=testTurnCandidate29;
window.NEXUS_RECONCILE_PARTY29=forceResumeIfReady;
window.NEXUS_SESSION_CLEANUP29=hardSessionCleanup;
window.NEXUS_STABILITY_V29={build:'0.29',singleChoice:true,nexusLock:true,duplicateChoiceGuard:true,disconnectPauseRecovery:true,pauseWatchdog:true,multiReplayCleanup:true,sessionGeneration:true};
window.NEXUS_NETWORK_V29={build:'0.29',maxPlayers:5,turnFallback:true,turnUrls:3,stunUrls:3,iceTransportPolicy:'all',joinAttempts:5,timeoutMs:14000,routeDetection:true,relayProbe:true,provider:'Open Relay public credential'};
})();
