/* NEXUS SURVIVAL authenticated TURN fallback build 0.30 */
(function(){
'use strict';
const MAX_PLAYERS=5;
const TURN_HOST='staticauth.openrelay.metered.ca';
const TURN_SECRET='openrelayprojectsecret';
const STUN=[
 {urls:'stun:stun.l.google.com:19302'},
 {urls:'stun:stun1.l.google.com:19302'},
 {urls:'stun:stun.relay.metered.ca:80'}
];
let joinGeneration30=0;
let joinTimer30=0;
const setText=(id,text)=>{const el=document.getElementById(id);if(el)el.textContent=text};
const stopTimer=()=>{if(joinTimer30){clearTimeout(joinTimer30);joinTimer30=0}};

async function hmacSha1Base64(secret,message){
 const enc=new TextEncoder();
 const key=await crypto.subtle.importKey('raw',enc.encode(secret),{name:'HMAC',hash:'SHA-1'},false,['sign']);
 const sig=new Uint8Array(await crypto.subtle.sign('HMAC',key,enc.encode(message)));
 let bin='';for(const b of sig)bin+=String.fromCharCode(b);return btoa(bin);
}
async function buildIceServers30(){
 const expiry=Math.floor(Date.now()/1000)+6*60*60;
 const uid=(crypto.randomUUID?.()||Math.random().toString(36).slice(2)).replace(/-/g,'').slice(0,12);
 const username=`${expiry}:nexus-${uid}`;
 const credential=await hmacSha1Base64(TURN_SECRET,username);
 const auth={username,credential};
 return [
  ...STUN,
  {urls:`turn:${TURN_HOST}:80`,...auth},
  {urls:`turn:${TURN_HOST}:80?transport=tcp`,...auth},
  {urls:`turn:${TURN_HOST}:443`,...auth},
  {urls:`turns:${TURN_HOST}:443?transport=tcp`,...auth}
 ];
}
async function makePeer30(id){
 const iceServers=await buildIceServers30();
 const opts={debug:1,config:{iceServers,iceTransportPolicy:'all',iceCandidatePoolSize:6,sdpSemantics:'unified-plan'}};
 return id?new Peer(id,opts):new Peer(opts);
}
async function routeOf30(conn){
 try{
  const pc=conn?.peerConnection;if(!pc?.getStats)return 'P2P';
  const stats=await pc.getStats();let pair=null;
  stats.forEach(r=>{if(r.type==='transport'&&r.selectedCandidatePairId)pair=stats.get(r.selectedCandidatePairId);if(r.type==='candidate-pair'&&r.state==='succeeded'&&r.nominated)pair=r});
  const local=pair?.localCandidateId?stats.get(pair.localCandidateId):null;
  return local?.candidateType==='relay'?'TURN RELAY':'DIRECT P2P';
 }catch{return 'P2P'}
}
async function testTurnCandidate30(timeoutMs=12000){
 const iceServers=await buildIceServers30();
 return await new Promise(async resolve=>{
  let done=false;const finish=(ok,detail='')=>{if(done)return;done=true;clearTimeout(timer);try{pc.close()}catch{};resolve({ok,detail})};
  const pc=new RTCPeerConnection({iceServers,iceTransportPolicy:'relay'});
  const timer=setTimeout(()=>finish(false,'relay candidate timeout'),timeoutMs);
  pc.createDataChannel('turn-probe');
  pc.onicecandidate=e=>{
   const c=e.candidate?.candidate||'';
   if(c.includes(' typ relay '))finish(true,c);
   else if(!e.candidate)finish(false,'ICE gathering completed without relay candidate');
  };
  try{const offer=await pc.createOffer();await pc.setLocalDescription(offer)}catch(err){finish(false,String(err?.message||err))}
 });
}

netCreateHost=async function(){
 if(typeof Peer==='undefined'){setText('hostStatus','PeerJS 로드 실패');return}
 setText('hostStatus','TURN 인증 준비 중...');
 const create=async(attempt=0)=>{
  let peer;try{const code=netCode();peer=await makePeer30(netPeerId(code));NET.peer=peer;NET.roomCode=code}
  catch(err){setText('hostStatus','TURN 인증 실패 · 새로고침 후 다시 시도');return}
  const code=NET.roomCode;
  peer.on('open',()=>{
   NET.ready=true;NET.lobby={p1:{id:'p1',cls:typeof cls!=='undefined'?cls:'warrior',name:'HOST'}};
   setText('roomCode',code);setText('hostStatus',`방 생성 완료 · 1/${MAX_PLAYERS} · DIRECT/TURN 대기`);
   const start=document.getElementById('start');if(start){start.disabled=false;start.textContent='START MULTI RUN // 방 시작'}
   netRenderLobby();
  });
  peer.on('connection',conn=>{netAccept(conn);conn.on('open',()=>setText('hostStatus',`참가자 연결 중 · ${Object.keys(NET.lobby||{}).length}/${MAX_PLAYERS}`))});
  peer.on('disconnected',()=>{try{peer.reconnect()}catch{}});
  peer.on('error',err=>{
   if(err?.type==='unavailable-id'&&attempt<4){try{peer.destroy()}catch{};create(attempt+1);return}
   setText('hostStatus','네트워크 오류 · '+(err?.type||'unknown'));
  });
 };
 await create();
};

netJoin=async function(code){
 code=String(code||'').trim().toUpperCase();if(!code)return;
 netClose();NET.mode='client';NET.roomCode=code;const generation=++joinGeneration30;stopTimer();
 setText('joinStatus','TURN 인증 준비 중...');
 if(typeof Peer==='undefined'){setText('joinStatus','PeerJS 로드 실패');return}
 let peer;try{peer=await makePeer30();NET.peer=peer}catch(err){setText('joinStatus','TURN 인증 생성 실패 · 새로고침 후 다시 시도');return}
 let welcomed=false,retrying=false;
 const retry=(attempt,why)=>{
  if(welcomed||generation!==joinGeneration30||retrying)return;retrying=true;stopTimer();
  try{NET.hostConn?.close()}catch{}
  if(attempt>=4){setText('joinStatus',`${why||'연결 실패'} · 네트워크 경로 확보 실패`);return}
  setTimeout(()=>{retrying=false;connect(attempt+1)},700);
 };
 const connect=(attempt=0)=>{
  if(welcomed||generation!==joinGeneration30)return;stopTimer();
  setText('joinStatus',`연결 중 ${attempt+1}/5 · DIRECT/TURN 협상`);
  let conn;try{conn=peer.connect(netPeerId(code),{reliable:true,serialization:'json'})}catch{return retry(attempt,'연결 생성 실패')}
  NET.hostConn=conn;let opened=false;
  const pc=()=>conn?.peerConnection;
  const stateTick=setInterval(()=>{const s=pc()?.iceConnectionState;if(!welcomed&&s)setText('joinStatus',`연결 중 ${attempt+1}/5 · ICE ${s.toUpperCase()}`)},700);
  const clearState=()=>clearInterval(stateTick);
  conn.on('open',()=>{opened=true;NET.ready=true;setText('joinStatus','방장 승인 대기 · 데이터채널 연결됨');try{conn.send({t:'join',cls:typeof cls!=='undefined'?cls:'warrior',build:'0.30',turnAuth:true})}catch{}});
  conn.on('data',msg=>{
   if(msg?.t==='welcome'){
    welcomed=true;stopTimer();clearState();netClientMessage(msg);
    setTimeout(async()=>setText('joinStatus',`접속 완료 · ${await routeOf30(conn)} · 방장 시작 대기`),250);return;
   }
   if(msg?.t==='full'){welcomed=true;stopTimer();clearState();netClientMessage(msg);return}
   netClientMessage(msg);
  });
  conn.on('error',()=>{clearState();retry(attempt,'ICE 연결 오류')});
  conn.on('close',()=>{clearState();if(welcomed){setText('joinStatus','방과 연결이 끊겼습니다');if(typeof endGame==='function'&&g)endGame('호스트와 연결이 끊겼습니다',false)}else retry(attempt,'DIRECT/TURN 연결 종료')});
  joinTimer30=setTimeout(()=>{clearState();retry(attempt,opened?'방장 응답 시간 초과':'DIRECT/TURN 연결 시간 초과')},14000);
 };
 peer.on('open',()=>connect(0));
 peer.on('disconnected',()=>{try{peer.reconnect()}catch{}});
 peer.on('error',err=>{if(!welcomed&&err?.type!=='peer-unavailable')setText('joinStatus','접속 오류 · '+(err?.type||'unknown'))});
};

window.NEXUS_BUILD_ICE30=buildIceServers30;
window.NEXUS_TEST_TURN30=testTurnCandidate30;
window.NEXUS_NETWORK_V30={build:'0.30',maxPlayers:5,turnFallback:true,authenticatedTurn:true,timeLimitedCredentials:true,turnHost:TURN_HOST,turnUrls:4,stunUrls:3,joinAttempts:5,timeoutMs:14000,relayProbe:true};
})();
