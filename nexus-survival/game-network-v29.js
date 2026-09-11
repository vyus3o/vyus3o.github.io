/* NEXUS SURVIVAL TURN-backed multiplayer transport build 0.29 */
(function(){
'use strict';
const MAX_PLAYERS=5;
const ICE_SERVERS=[
 {urls:'stun:stun.l.google.com:19302'},
 {urls:'stun:stun1.l.google.com:19302'},
 {urls:'stun:stun.cloudflare.com:3478'},
 {urls:'turn:openrelay.metered.ca:80',username:'openrelayproject',credential:'openrelayproject'},
 {urls:'turn:openrelay.metered.ca:443',username:'openrelayproject',credential:'openrelayproject'},
 {urls:'turn:openrelay.metered.ca:443?transport=tcp',username:'openrelayproject',credential:'openrelayproject'}
];
const PEER_OPTIONS={debug:1,config:{iceServers:ICE_SERVERS,iceTransportPolicy:'all',iceCandidatePoolSize:4}};
let joinGeneration=0;
let joinTimer=0;
const setText=(id,text)=>{const el=document.getElementById(id);if(el)el.textContent=text};
const stopTimer=()=>{if(joinTimer){clearTimeout(joinTimer);joinTimer=0}};
const makePeer=id=>id?new Peer(id,PEER_OPTIONS):new Peer(PEER_OPTIONS);
async function routeOf(conn){
 try{
  const pc=conn?.peerConnection;if(!pc?.getStats)return 'P2P';
  const stats=await pc.getStats();let pair=null;
  stats.forEach(r=>{if(r.type==='transport'&&r.selectedCandidatePairId)pair=stats.get(r.selectedCandidatePairId);if(r.type==='candidate-pair'&&r.state==='succeeded'&&r.nominated)pair=r});
  const local=pair?.localCandidateId?stats.get(pair.localCandidateId):null;
  return local?.candidateType==='relay'?'TURN RELAY':'DIRECT P2P';
 }catch{return 'P2P'}
}
function connectionCount(){return Object.keys(NET.lobby||{}).length}

/* Re-create host with TURN-capable RTCConfiguration. game-party-v28 keeps slot admission. */
netCreateHost=function(){
 if(typeof Peer==='undefined'){setText('hostStatus','PeerJS 로드 실패');return}
 const create=(attempt=0)=>{
  const code=netCode(),peer=makePeer(netPeerId(code));NET.peer=peer;NET.roomCode=code;
  peer.on('open',()=>{
   NET.ready=true;NET.lobby={p1:{id:'p1',cls:typeof cls!=='undefined'?cls:'warrior',name:'HOST'}};
   setText('roomCode',code);setText('hostStatus',`방 생성 완료 · 1/${MAX_PLAYERS} · TURN 대기`);
   const start=document.getElementById('start');if(start){start.disabled=false;start.textContent='START MULTI RUN // 방 시작'}
   netRenderLobby();
  });
  peer.on('connection',conn=>{
   netAccept(conn);
   conn.on('open',()=>setText('hostStatus',`참가자 연결 중 · ${connectionCount()}/${MAX_PLAYERS}`));
  });
  peer.on('disconnected',()=>{try{peer.reconnect()}catch{}});
  peer.on('error',err=>{
   if(err?.type==='unavailable-id'&&attempt<4){try{peer.destroy()}catch{};create(attempt+1);return}
   setText('hostStatus','네트워크 오류 · '+(err?.type||'unknown'));
  });
 };
 create();
};

/* TURN is available from the first attempt, so restricted NATs can relay instead of timing out. */
netJoin=function(code){
 code=String(code||'').trim().toUpperCase();if(!code)return;
 netClose();NET.mode='client';NET.roomCode=code;const generation=++joinGeneration;stopTimer();
 setText('joinStatus','연결 준비 중 · DIRECT/TURN 자동 선택');
 if(typeof Peer==='undefined'){setText('joinStatus','PeerJS 로드 실패');return}
 let peer=makePeer();NET.peer=peer,welcome=false,retrying=false;
 const retry=(attempt,why)=>{
  if(welcome||generation!==joinGeneration||retrying)return;retrying=true;stopTimer();
  try{NET.hostConn?.close()}catch{};
  if(attempt>=4){setText('joinStatus',`${why||'연결 실패'} · 방장/참가자 모두 새로고침 후 다시 시도`);return}
  setTimeout(()=>{retrying=false;connect(attempt+1)},700);
 };
 const connect=(attempt=0)=>{
  if(welcome||generation!==joinGeneration)return;stopTimer();
  setText('joinStatus',`연결 중 ${attempt+1}/5 · TURN fallback 활성`);
  let conn;
  try{conn=peer.connect(netPeerId(code),{reliable:true,serialization:'json'})}catch{return retry(attempt,'연결 생성 실패')}
  NET.hostConn=conn;let opened=false;
  conn.on('open',()=>{opened=true;NET.ready=true;setText('joinStatus','방장 승인 대기 · ICE 경로 협상 중');try{conn.send({t:'join',cls:typeof cls!=='undefined'?cls:'warrior',build:'0.29',turn:true})}catch{}});
  conn.on('data',msg=>{
   if(msg?.t==='welcome'){
    welcome=true;stopTimer();netClientMessage(msg);
    setTimeout(async()=>setText('joinStatus',`접속 완료 · ${await routeOf(conn)} · 방장 시작 대기`),250);
    return;
   }
   if(msg?.t==='full'){welcome=true;stopTimer();netClientMessage(msg);return}
   netClientMessage(msg);
  });
  conn.on('error',()=>retry(attempt,'ICE 연결 오류'));
  conn.on('close',()=>{if(welcome){setText('joinStatus','방과 연결이 끊겼습니다');if(typeof endGame==='function'&&g)endGame('호스트와 연결이 끊겼습니다',false)}else retry(attempt,'P2P/TURN 연결 종료')});
  joinTimer=setTimeout(()=>retry(attempt,opened?'방장 응답 시간 초과':'DIRECT/TURN 연결 시간 초과'),12000);
 };
 peer.on('open',()=>connect(0));
 peer.on('disconnected',()=>{try{peer.reconnect()}catch{}});
 peer.on('error',err=>{if(!welcome&&err?.type!=='peer-unavailable')setText('joinStatus','접속 오류 · '+(err?.type||'unknown'))});
};

/* Improve host status after lobby broadcasts without changing gameplay/network authority. */
const prevLobby29=netBroadcastLobby;
netBroadcastLobby=function(){const out=prevLobby29();if(NET.mode==='host'&&NET.ready)setText('hostStatus',`방 생성 완료 · ${connectionCount()}/${MAX_PLAYERS} 연결됨 · TURN fallback`);return out};

window.NEXUS_NETWORK_V29={build:'0.29',maxPlayers:5,turnFallback:true,turnUrls:3,stunUrls:3,iceTransportPolicy:'all',joinAttempts:5,timeoutMs:12000,routeDetection:true,provider:'Open Relay / Metered'};
})();
