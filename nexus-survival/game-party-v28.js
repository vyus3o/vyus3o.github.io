/* NEXUS SURVIVAL party pause + robust 5P link build 0.28 */
(function(){
'use strict';
const MAX_PLAYERS=5;
const PLAYER_IDS=['p2','p3','p4','p5'];
const PEER_OPTS={debug:1,config:{iceServers:[
 {urls:'stun:stun.l.google.com:19302'},
 {urls:'stun:stun1.l.google.com:19302'},
 {urls:'stun:stun.cloudflare.com:3478'}
]}};
let partyPaused=false;
let joinSerial=0;
let joinTimer=0;

function clearJoinTimer(){if(joinTimer){clearTimeout(joinTimer);joinTimer=0}}
function newPeer(id){return id?new Peer(id,PEER_OPTS):new Peer(PEER_OPTS)}
function setText(id,text){const el=document.getElementById(id);if(el)el.textContent=text}
function pendingPlayers(){return g?Object.values(g.players||{}).filter(p=>p.pendingLevel):[]}
function partySize(){return g?Object.values(g.players||{}).filter(p=>p.alive!==false).length:Object.keys(NET.lobby||{}).length}
function playerName(p){return NET.lobby?.[p.id]?.name||p.name||p.id.toUpperCase()}

/* ---------- detailed party level-up pause UI ---------- */
function installPartyUi(){
 if(document.getElementById('partyPauseStyle28'))return;
 const st=document.createElement('style');st.id='partyPauseStyle28';st.textContent=`
 #partyLevelStatus28{margin:12px 0 2px;padding:12px 14px;border:1px solid #8ea66a66;background:linear-gradient(180deg,#132018ee,#0b130fee);box-shadow:inset 0 0 18px #91d35c12,0 8px 28px #0007}
 #partyLevelStatus28 .ppHead{display:flex;justify-content:space-between;align-items:center;gap:12px;font:800 11px/1.2 monospace;letter-spacing:1.4px;color:#d9f6a7}
 #partyLevelStatus28 .ppSub{margin-top:5px;font:600 10px/1.4 monospace;color:#a9b7aa}
 #partyLevelStatus28 .ppPlayers{display:flex;flex-wrap:wrap;gap:6px;margin-top:9px}
 #partyLevelStatus28 .ppChip{display:flex;align-items:center;gap:6px;padding:5px 8px;border:1px solid #546259;background:#111a16;color:#9eaaa2;font:800 9px/1 monospace;letter-spacing:.5px}
 #partyLevelStatus28 .ppChip:before{content:'';width:6px;height:6px;border-radius:50%;background:#607067;box-shadow:0 0 0 0 #8fd25f00}
 #partyLevelStatus28 .ppChip.pending{border-color:#d5b76888;color:#f1dda0;background:#201b10}
 #partyLevelStatus28 .ppChip.pending:before{background:#e5bd55;animation:ppPulse28 .9s infinite}
 #partyLevelStatus28 .ppChip.ready{border-color:#78b66d88;color:#bce8a7;background:#101d10}
 #partyLevelStatus28 .ppChip.ready:before{background:#82d572}
 @keyframes ppPulse28{50%{box-shadow:0 0 0 5px #e5bd5520;transform:scale(.8)}}
 .partyPause28 .modalbox{box-shadow:0 0 0 1px #a4c17844,0 22px 80px #000b,inset 0 0 45px #97c7610a}
 .partyPause28 .modalTitle:after{content:'  // PARTY PAUSED';font-size:.34em;color:#d7c875;vertical-align:middle;letter-spacing:1px}
 `;document.head.appendChild(st);
 const modal=document.querySelector('#levelModal .modalbox');if(modal&&!document.getElementById('partyLevelStatus28')){
   const d=document.createElement('div');d.id='partyLevelStatus28';d.className='hidden';d.innerHTML='<div class="ppHead"><span>PARTY LEVEL SYNC</span><span id="partyLevelCount28">0 / 0 READY</span></div><div class="ppSub" id="partyLevelSub28">모든 플레이어가 선택을 완료하면 전투가 자동으로 재개됩니다.</div><div class="ppPlayers" id="partyLevelPlayers28"></div>';
   const choices=document.getElementById('choices');modal.insertBefore(d,choices||null);
 }
}
function renderPartyWait(forceOpen=false){
 installPartyUi();if(!g)return;
 const modal=document.getElementById('levelModal'),box=document.getElementById('partyLevelStatus28'),list=document.getElementById('partyLevelPlayers28');
 if(!box||!list)return;
 const players=Object.values(g.players||{}).filter(p=>p.alive!==false),pending=players.filter(p=>p.pendingLevel),ready=players.length-pending.length;
 box.classList.remove('hidden');modal?.classList.add('partyPause28');
 setText('partyLevelCount28',`${ready} / ${players.length} READY`);
 setText('partyLevelSub28',pending.length?`선택 대기: ${pending.map(playerName).join(' · ')}`:'모든 선택 완료 · 전투 재개 동기화 중');
 list.innerHTML='';for(const p of players){const d=document.createElement('div');d.className='ppChip '+(p.pendingLevel?'pending':'ready');d.textContent=`${playerName(p)} · ${p.pendingLevel?'SELECTING':'READY'}`;list.appendChild(d)}
 if(forceOpen&&modal){modal.classList.remove('hidden');const choices=document.getElementById('choices');if(choices&&!localPlayer()?.pendingLevel)choices.innerHTML='<div style="grid-column:1/-1;padding:24px;text-align:center;color:#aeb9b0;font:800 12px monospace">선택을 완료한 파티원을 기다리는 중...</div>'}
}
function hidePartyWait(){const m=document.getElementById('levelModal'),b=document.getElementById('partyLevelStatus28');m?.classList.remove('partyPause28');b?.classList.add('hidden')}

/* ---------- native robust 5-player host acceptance ---------- */
const prevHostMessage28=netHostMessage;
netAccept=function(conn){
 if(!conn)return;
 for(const [key,c] of [...NET.conns.entries()])if(!c||c.open===false){try{c?.close?.()}catch{}NET.conns.delete(key)}
 if(NET.conns.size>=MAX_PLAYERS-1){conn.on('open',()=>{try{conn.send({t:'full'})}catch{}});return}
 const old=NET.conns.get(conn.peer);if(old&&old!==conn){try{old.close()}catch{}NET.conns.delete(conn.peer)}
 let cleaned=false;const cleanup=()=>{if(cleaned)return;cleaned=true;const pid=conn.playerId;if(pid){delete NET.lobby[pid];delete NET.inputs[pid]}if(NET.conns.get(conn.peer)===conn)NET.conns.delete(conn.peer);netBroadcastLobby()};
 conn.on('data',msg=>netHostMessage(conn,msg));
 conn.on('close',cleanup);
 conn.on('error',cleanup);
 conn.on('open',()=>{try{conn.send({t:'v28HostReady',slots:MAX_PLAYERS-Object.keys(NET.lobby||{}).length})}catch{}});
 NET.conns.set(conn.peer,conn);
};
netHostMessage=function(conn,msg){
 if(msg?.t==='join'&&!conn?.playerId){
   const used=new Set(Object.keys(NET.lobby||{})),pid=PLAYER_IDS.find(x=>!used.has(x));
   if(!pid){try{conn.send({t:'full'})}catch{};return}
   conn.playerId=pid;NET.lobby[pid]={id:pid,cls:msg.cls||'warrior',name:'PLAYER '+pid.slice(1)};NET.inputs[pid]={};
   try{conn.send({t:'welcome',id:pid,room:NET.roomCode,lobby:NET.lobby,diff:typeof diff!=='undefined'?diff:'NORMAL',build:'0.28'})}catch{}
   netBroadcastLobby();setText('hostStatus',`방 생성 완료 · ${Object.keys(NET.lobby).length}/${MAX_PLAYERS} 연결됨`);return;
 }
 return prevHostMessage28(conn,msg);
};

/* Host and clients use explicit ICE servers and reconnect cleanly. */
netCreateHost=function(){
 if(typeof Peer==='undefined'){setText('hostStatus','PeerJS 로드 실패');return}
 const tryCreate=(attempt=0)=>{const code=netCode(),peer=newPeer(netPeerId(code));NET.peer=peer;NET.roomCode=code;
  peer.on('open',()=>{NET.ready=true;NET.lobby={p1:{id:'p1',cls:typeof cls!=='undefined'?cls:'warrior',name:'HOST'}};setText('roomCode',code);setText('hostStatus',`방 생성 완료 · 1/${MAX_PLAYERS} 연결됨`);const start=document.getElementById('start');if(start){start.disabled=false;start.textContent='START MULTI RUN // 방 시작'}netRenderLobby()});
  peer.on('connection',conn=>netAccept(conn));
  peer.on('disconnected',()=>{try{peer.reconnect()}catch{}});
  peer.on('error',err=>{if(err?.type==='unavailable-id'&&attempt<4){try{peer.destroy()}catch{};tryCreate(attempt+1)}else setText('hostStatus','네트워크 오류 · '+(err?.type||'unknown'))});
 };tryCreate();
};
netJoin=function(code){
 code=String(code||'').trim().toUpperCase();if(!code)return;netClose();NET.mode='client';NET.roomCode=code;const serial=++joinSerial;setText('joinStatus','연결 준비 중...');if(typeof Peer==='undefined'){setText('joinStatus','PeerJS 로드 실패');return}
 const peer=newPeer();NET.peer=peer;let welcomed=false;
 const connectAttempt=(attempt=0)=>{if(serial!==joinSerial||welcomed)return;clearJoinTimer();setText('joinStatus',`연결 중... ${attempt+1}/4`);let conn;
  try{conn=peer.connect(netPeerId(code),{reliable:true,serialization:'json'})}catch{if(attempt<3)return setTimeout(()=>connectAttempt(attempt+1),650);setText('joinStatus','연결 생성 실패');return}
  NET.hostConn=conn;let opened=false;
  conn.on('open',()=>{opened=true;NET.ready=true;setText('joinStatus','방장 응답 대기 중');try{conn.send({t:'join',cls:typeof cls!=='undefined'?cls:'warrior',build:'0.28'})}catch{}});
  conn.on('data',msg=>{if(msg?.t==='welcome'){welcomed=true;clearJoinTimer()}if(msg?.t==='full'){welcomed=true;clearJoinTimer()}netClientMessage(msg)});
  conn.on('error',()=>{if(!welcomed&&attempt<3){try{conn.close()}catch{};setTimeout(()=>connectAttempt(attempt+1),650)}else if(!welcomed)setText('joinStatus','연결 오류 · 다시 참가해 주세요')});
  conn.on('close',()=>{if(welcomed){setText('joinStatus','방과 연결이 끊겼습니다');if(typeof endGame==='function'&&g)endGame('호스트와 연결이 끊겼습니다',false)}else if(attempt<3)setTimeout(()=>connectAttempt(attempt+1),650)});
  joinTimer=setTimeout(()=>{if(welcomed||serial!==joinSerial)return;try{conn.close()}catch{};if(attempt<3)connectAttempt(attempt+1);else setText('joinStatus',opened?'방장 응답 시간 초과 · 다시 참가해 주세요':'P2P 연결 시간 초과 · 다시 참가해 주세요')},7500);
 };
 peer.on('open',()=>connectAttempt(0));peer.on('disconnected',()=>{try{peer.reconnect()}catch{}});peer.on('error',err=>{if(!welcomed)setText('joinStatus','접속 오류 · '+(err?.type||'unknown'))});
};

/* ---------- global level-up pause: host freezes the whole simulation ---------- */
function broadcastPause(){if(NET.mode!=='host'||!g)return;partyPaused=true;state='partyLevel';const pending=pendingPlayers().map(p=>p.id);netBroadcast({t:'v28LevelPause',pending,total:partySize()});renderPartyWait(true)}
function maybeResume(){
 if(NET.mode!=='host'||!partyPaused||!g)return false;
 const pending=pendingPlayers();if(pending.length){broadcastPause();return false}
 partyPaused=false;hidePartyWait();document.getElementById('levelModal')?.classList.add('hidden');state='play';
 const snap=typeof makeNetState==='function'?makeNetState():null;netBroadcast({t:'v28LevelResume',state:snap});if(typeof toast==='function')toast('PARTY READY // 전투 재개');return true;
}
const prevRequestLevel28=requestLevel;
requestLevel=function(p){const out=prevRequestLevel28(p);if(NET.mode==='host')broadcastPause();return out};

const prevSelectChoice28=selectChoice;
selectChoice=function(o){const wasClient=NET.mode==='client',out=prevSelectChoice28(o);if(wasClient&&state==='partyLevel')renderPartyWait(true);else if(NET.mode==='host')maybeResume();return out};

const prevRemoteChoice28=netApplyRemoteChoice;
netApplyRemoteChoice=function(pid,o){const out=prevRemoteChoice28(pid,o);if(NET.mode==='host')maybeResume();return out};

const nexusBtn=document.getElementById('nexusBtn');if(nexusBtn&&!nexusBtn.dataset.v28){nexusBtn.dataset.v28='1';const old=nexusBtn.onclick;nexusBtn.onclick=function(ev){const out=typeof old==='function'?old.call(this,ev):undefined;if(NET.mode==='client'&&state==='partyLevel')renderPartyWait(true);else if(NET.mode==='host')maybeResume();return out}};

const prevClientMessage28=netClientMessage;
netClientMessage=function(msg){
 if(msg?.t==='v28HostReady')return;
 if(msg?.t==='v28LevelPause'&&g){partyPaused=true;state='partyLevel';if(Array.isArray(msg.pending))for(const p of Object.values(g.players||{}))p.pendingLevel=msg.pending.includes(p.id);renderPartyWait(!localPlayer()?.pendingLevel);return}
 if(msg?.t==='level'){partyPaused=true;state='partyLevel';const out=prevClientMessage28(msg);renderPartyWait(false);return out}
 if(msg?.t==='v28LevelResume'&&g){partyPaused=false;hidePartyWait();document.getElementById('levelModal')?.classList.add('hidden');if(msg.state&&typeof applyNetSnapshot==='function')applyNetSnapshot(msg.state,true);for(const p of Object.values(g.players||{}))p.pendingLevel=false;state='play';if(typeof toast==='function')toast('PARTY READY // 전투 재개');return}
 return prevClientMessage28(msg)
};

installPartyUi();
window.NEXUS_PARTY_V28={build:'0.28',maxPlayers:5,nativeSlots:true,joinRetry:true,iceFallback:true,globalLevelPause:true,waitForAllLevelChoices:true,freezeTimers:true,partyLevelUi:true};
})();
