/* NEXUS SURVIVAL reliable party level-up round sync build 0.32
 * Fixes clients entering PARTY LEVEL pause without ever receiving their choices.
 * The host owns each level round, stores exact choices per player, repeats the
 * round over the reliable control path, and answers explicit resync requests.
 */
(function(){
'use strict';
const BUILD='0.32';
const HEARTBEAT_MS=600;
let seq=0,hostRound=null,clientRound=null,heartbeat=0;
const submitted=new Set();
const acked=new Map();
const clone=v=>JSON.parse(JSON.stringify(v));
const modal=()=>document.getElementById('levelModal');
const nexus=()=>document.getElementById('nexusBtn');
const local=()=>typeof localPlayer==='function'?localPlayer():null;
const playerName=p=>NET?.lobby?.[p?.id]?.name||p?.name||p?.id||'PLAYER';
function connectedHostIds(){
 const lobby=NET?.lobby||{};
 return new Set(Object.values(lobby).filter(x=>x&&x.connected!==false).map(x=>x.id));
}
function pendingHostPlayers(){
 if(!g?.players)return[];const ids=connectedHostIds();
 return Object.values(g.players).filter(p=>p&&p.alive!==false&&p.pendingLevel&&(p.id==='p1'||ids.has(p.id)));
}
function clearHeartbeat(){if(heartbeat){clearInterval(heartbeat);heartbeat=0}}
function clearUi(){
 const m=modal();if(m){m.classList.add('hidden');m.classList.remove('partyPause28');delete m.dataset.v32Round;delete m.dataset.v32Owner;m.dataset.choiceLocked31='0'}
 document.getElementById('partyLevelStatus28')?.classList.add('hidden');
 const n=nexus();if(n)n.disabled=false;
}
function ensureStatusBox(){
 let box=document.getElementById('partyLevelStatus28');
 if(box)return box;
 const mb=document.querySelector('#levelModal .modalbox');if(!mb)return null;
 box=document.createElement('div');box.id='partyLevelStatus28';box.className='hidden';
 box.innerHTML='<div class="ppHead"><span>PARTY LEVEL SYNC</span><span id="partyLevelCount28"></span></div><div class="ppSub" id="partyLevelSub28"></div><div class="ppPlayers" id="partyLevelPlayers28"></div>';
 mb.insertBefore(box,document.getElementById('choices')||null);return box;
}
function renderStatus(pendingIds,roundId,message=''){
 const m=modal(),box=ensureStatusBox(),list=document.getElementById('partyLevelPlayers28');if(!m||!box||!list||!g)return;
 const active=Object.values(g.players||{}).filter(p=>p?.alive!==false),pending=new Set(pendingIds||[]),ready=active.filter(p=>!pending.has(p.id)).length;
 m.classList.add('partyPause28');box.classList.remove('hidden');
 const count=document.getElementById('partyLevelCount28');if(count)count.textContent=`${ready} / ${active.length} READY`;
 const sub=document.getElementById('partyLevelSub28');if(sub)sub.textContent=message||(pending.size?`선택 대기: ${active.filter(p=>pending.has(p.id)).map(playerName).join(' · ')}`:'모든 선택 완료 · 전투 재개 동기화 중');
 list.innerHTML='';for(const p of active){const d=document.createElement('div'),wait=pending.has(p.id);d.className='ppChip '+(wait?'pending':'ready');d.textContent=`${playerName(p)} · ${wait?'SELECTING':'READY'}`;list.appendChild(d)}
 m.dataset.v32Round=String(roundId||'');
}
function waitingScreen(text){
 const m=modal(),box=document.getElementById('choices');if(!m||!box)return;m.classList.remove('hidden');
 box.innerHTML=`<div style="grid-column:1/-1;padding:28px 16px;text-align:center;color:#c4d2c7;font:800 12px/1.7 monospace;letter-spacing:.5px">${text}</div>`;
 const n=nexus();if(n)n.disabled=true;
}
function roundPacket(){
 if(!hostRound||!g)return null;
 const pending=pendingHostPlayers().map(p=>p.id);
 const choices={};for(const id of pending)if(hostRound.choices[id])choices[id]=clone(hostRound.choices[id]);
 return {t:'v32LevelRound',round:hostRound.id,pending,choices,levels:Object.fromEntries(Object.values(g.players||{}).map(p=>[p.id,p.l||1])),stage:g.stage||0,total:Object.values(g.players||{}).filter(p=>p?.alive!==false).length,build:BUILD};
}
function sendRound(conn=null){const pkt=roundPacket();if(!pkt)return false;try{if(conn?.open)conn.send(pkt);else netBroadcast(pkt);return true}catch{return false}}
function beginHostRound(){
 if(hostRound)return hostRound;
 hostRound={id:`${g?.stage||0}-${Date.now().toString(36)}-${++seq}`,choices:{},started:performance.now()};
 state='partyLevel';clearHeartbeat();heartbeat=setInterval(()=>{
  if(NET.mode!=='host'||!g||!hostRound){clearHeartbeat();return}
  const pending=pendingHostPlayers();if(!pending.length){resumeHost('heartbeat-ready');return}
  sendRound();renderStatus(pending.map(p=>p.id),hostRound.id);
 },HEARTBEAT_MS);
 return hostRound;
}
function resumeHost(reason='all-ready'){
 if(NET.mode!=='host'||!hostRound||!g)return false;
 if(pendingHostPlayers().length)return false;
 const rid=hostRound.id;hostRound=null;clearHeartbeat();for(const p of Object.values(g.players||{}))p.pendingLevel=false;clearUi();state='play';
 const snap=typeof makeNetState==='function'?makeNetState():null;
 const legacy={t:'v28LevelResume',state:snap,reason:`v32-${reason}`,build:BUILD};
 const pkt={t:'v32LevelResume',round:rid,state:snap,reason,build:BUILD};
 const sendResume=()=>{try{netBroadcast(legacy);netBroadcast(pkt)}catch{}};
 sendResume();setTimeout(()=>{if(NET.mode==='host')sendResume()},120);setTimeout(()=>{if(NET.mode==='host')sendResume()},420);
 if(typeof toast==='function')toast('PARTY READY // 전투 재개');return true;
}
function requestMissing(round){
 if(NET.mode!=='client'||!NET.hostConn?.open)return;try{NET.hostConn.send({t:'v32LevelSyncReq',round,playerId:NET.localId,build:BUILD})}catch{}
}
function applyClientRound(msg){
 if(!g||NET.mode!=='client'||!msg?.round)return;
 clientRound={id:String(msg.round),pending:new Set(msg.pending||[]),choices:msg.choices||{},stage:msg.stage};state='partyLevel';
 for(const p of Object.values(g.players||{}))p.pendingLevel=clientRound.pending.has(p.id);
 const p=local(),isPending=!!p&&clientRound.pending.has(p.id),choices=isPending?clientRound.choices?.[p.id]:null,m=modal();
 renderStatus([...clientRound.pending],clientRound.id);
 if(!isPending){waitingScreen('PARTY PAUSED<br>다른 플레이어의 레벨업 선택을 기다리는 중...');return}
 if(submitted.has(clientRound.id)){waitingScreen('선택 완료<br>다른 플레이어의 선택을 기다리는 중...');return}
 if(Array.isArray(choices)&&choices.length){
  const already=m?.dataset.v32Round===clientRound.id&&m?.dataset.v32Owner===p.id&&!m.classList.contains('hidden')&&document.querySelector('#choices .choice');
  if(!already){showLevelChoices(p,clone(choices));if(m){m.dataset.v32Round=clientRound.id;m.dataset.v32Owner=p.id}renderStatus([...clientRound.pending],clientRound.id)}
  const n=nexus();if(n)n.disabled=false;
  try{NET.hostConn?.send({t:'v32LevelUiAck',round:clientRound.id,playerId:p.id,build:BUILD})}catch{}
 }else{
  waitingScreen('LEVEL DATA SYNC<br>선택지를 다시 받는 중...');requestMissing(clientRound.id);
 }
}

/* Canonical level request for multiplayer. Exact choices are stored by the host. */
const prevRequestLevel32=requestLevel;
requestLevel=function(p){
 if(!p)return prevRequestLevel32(p);
 if(NET.mode==='solo')return prevRequestLevel32(p);
 if(NET.mode!=='host')return prevRequestLevel32(p);
 p.pendingLevel=true;const r=beginHostRound(),choices=makeChoices(p);r.choices[p.id]=clone(choices);
 if(p.id===g.localId){showLevelChoices(p,clone(choices));const m=modal();if(m){m.dataset.v32Round=r.id;m.dataset.v32Owner=p.id}const n=nexus();if(n)n.disabled=false}
 const conn=[...NET.conns.values()].find(c=>c?.playerId===p.id&&c.open);if(conn)try{conn.send({t:'v32LevelOffer',round:r.id,playerId:p.id,choices:clone(choices),build:BUILD})}catch{}
 sendRound();renderStatus(pendingHostPlayers().map(x=>x.id),r.id);return true;
};

const prevClientMessage32=netClientMessage;
netClientMessage=function(msg){
 if(msg?.t==='v32LevelOffer'&&NET.mode==='client'){
  const rid=String(msg.round||'');if(!rid)return;const pending=clientRound?.id===rid?[...clientRound.pending]:[NET.localId];const choices={...(clientRound?.id===rid?clientRound.choices:{}),[NET.localId]:msg.choices||[]};applyClientRound({t:'v32LevelRound',round:rid,pending,choices,stage:g?.stage||0});return;
 }
 if(msg?.t==='v32LevelRound'){applyClientRound(msg);return}
 if(msg?.t==='v32LevelResume'&&g){
  if(clientRound&&msg.round&&String(msg.round)!==clientRound.id)return;
  if(msg.state&&typeof applyNetSnapshot==='function')try{applyNetSnapshot(msg.state,true)}catch{}
  for(const p of Object.values(g.players||{}))p.pendingLevel=false;clientRound=null;submitted.clear();clearUi();state='play';if(typeof toast==='function')toast('PARTY READY // 전투 재개');return;
 }
 return prevClientMessage32(msg);
};

const prevHostMessage32=netHostMessage;
netHostMessage=function(conn,msg){
 if(msg?.t==='v32LevelSyncReq'&&NET.mode==='host'){if(hostRound)sendRound(conn);return}
 if(msg?.t==='v32LevelUiAck'&&NET.mode==='host'){if(hostRound&&String(msg.round)===hostRound.id&&conn?.playerId)acked.set(conn.playerId,hostRound.id);return}
 const out=prevHostMessage32(conn,msg);
 if(msg?.t==='choice'&&NET.mode==='host'&&hostRound){sendRound();resumeHost('choice')}
 return out;
};

/* Keep direct internal choice paths compatible with the newer reliable round. */
const prevApplyRemoteChoice32=netApplyRemoteChoice;
netApplyRemoteChoice=function(pid,o){
 const out=prevApplyRemoteChoice32(pid,o);
 if(NET.mode==='host'&&hostRound){sendRound();resumeHost('remote-choice')}
 return out;
};

const prevSendChoice32=netSendChoice;
netSendChoice=function(choice){
 if(NET.mode==='client'&&clientRound&&NET.hostConn?.open){const p=local(),token=`v32:${clientRound.id}:${NET.localId}:${p?.l||0}`;try{NET.hostConn.send({t:'choice',choice,choiceToken:token,levelRound:clientRound.id,build:BUILD});return}catch{}}
 return prevSendChoice32(choice);
};
const prevSelectChoice32=selectChoice;
selectChoice=function(o){const rid=NET.mode==='client'?clientRound?.id:hostRound?.id;if(NET.mode==='client'&&rid)submitted.add(rid);const out=prevSelectChoice32(o);if(NET.mode==='host'&&hostRound){sendRound();resumeHost('host-choice')}else if(NET.mode==='client'&&rid){const p=local();if(p)p.pendingLevel=false;waitingScreen('선택 완료<br>다른 플레이어의 선택을 기다리는 중...');renderStatus(clientRound?[...clientRound.pending]:[],rid)}return out};

const nx=nexus();if(nx&&!nx.dataset.v32){nx.dataset.v32='1';const old=nx.onclick;nx.onclick=function(ev){const p=local();if(!p?.pendingLevel)return;const rid=NET.mode==='client'?clientRound?.id:hostRound?.id;if(NET.mode==='client'&&rid)submitted.add(rid);const out=typeof old==='function'?old.call(this,ev):undefined;if(NET.mode==='host'&&hostRound){sendRound();resumeHost('host-nexus')}else if(NET.mode==='client'&&rid){waitingScreen('선택 완료<br>다른 플레이어의 선택을 기다리는 중...');renderStatus(clientRound?[...clientRound.pending]:[],rid)}return out}};

const prevNetClose32=netClose;
netClose=function(){clearHeartbeat();hostRound=clientRound=null;submitted.clear();acked.clear();clearUi();return prevNetClose32()};

window.NEXUS_PARTY_SYNC_V32={build:BUILD,reliableLevelRounds:true,repeatedChoiceDelivery:true,missingChoiceResync:true,allPlayerPause:true,duplicateSafe:true,legacyResumeCompatibility:true,get hostRound(){return hostRound},get clientRound(){return clientRound},forceRoundSync:()=>sendRound(),resumeHost};
})();