/* NEXUS SURVIVAL runtime verification + client sync recovery build 0.29 */
(function(){
'use strict';

/*
 * Late-stage multiplayer freeze recovery.
 *
 * The host is authoritative, but clients historically depended on one-shot
 * v13Resume / v28LevelResume packets to leave chest/partyLevel states. If one
 * reliable message was delayed or lost while snapshots were congested, the
 * client could keep receiving target coordinates while updateClient() refused
 * to run because state !== 'play'. The result looked exactly like a frozen
 * client while the host continued the stage.
 *
 * This layer makes stage/resume epochs part of every authoritative snapshot,
 * replays critical resume controls, snaps immediately on stage changes, adds
 * snapshot backpressure, and lets a stalled client request a full resync.
 */
let syncGeneration=0;
let hostSeq=0,hostStageEpoch=0,hostResumeEpoch=0;
let clientStageEpoch=0,clientResumeEpoch=0,lastClientRxAt=performance.now(),lastClientSnapAt=0,lastProbeAt=0;
const snapshotTimes=new WeakMap();
const syncStats={snapSent:0,snapSkippedRate:0,snapSkippedBuffer:0,controlReplays:0,recoveries:0,fullResyncs:0,probes:0};
const RESUME_TYPES=new Set(['v13Resume','v28LevelResume']);
const RECOVERABLE_STATES=new Set(['chest','partyLevel','advancement','awakening']);
const nowMs=()=>performance.now();

function resetSyncState(){
 syncGeneration++;hostSeq=0;hostStageEpoch=0;hostResumeEpoch=0;clientStageEpoch=0;clientResumeEpoch=0;
 lastClientRxAt=nowMs();lastClientSnapAt=0;lastProbeAt=0;
}
function syncMeta(phase){return{build:'0.29',seq:hostSeq,stageEpoch:hostStageEpoch,resumeEpoch:hostResumeEpoch,phase:phase||state,stage:g?.stage??0,at:Date.now()}}
function messageMeta(msg){return msg?.sync29||msg?.state?.sync29||null}
function hideBlockingUi(){
 document.getElementById('levelModal')?.classList.add('hidden');
 document.getElementById('chestModal')?.classList.add('hidden');
 document.getElementById('advancementModal')?.classList.add('hidden');
 document.getElementById('levelModal')?.classList.remove('partyPause28');
 document.getElementById('partyLevelStatus28')?.classList.add('hidden');
 window.__nexusV19ClientChest=false;
 if(g?.players)for(const p of Object.values(g.players))p.pendingLevel=false;
}
function recoverClient(reason='snapshot',s=null){
 if(NET.mode!=='client'||!g)return false;
 if(s&&typeof applyNetSnapshot==='function')applyNetSnapshot(s,true);
 hideBlockingUi();state='play';syncStats.recoveries++;
 if(typeof toast==='function')toast('SYNC RECOVERED // 전투 재개');
 try{const el=document.getElementById('netData');if(el)el.textContent=`CLIENT · ${typeof partyCount==='function'?partyCount():'?'}P · SYNC OK`}catch{}
 return true;
}

if(typeof netClose==='function'){
 const prevNetCloseSync29=netClose;
 netClose=function(){resetSyncState();return prevNetCloseSync29()};
}

if(typeof advanceStage==='function'){
 const prevAdvanceSync29=advanceStage;
 advanceStage=function(){const before=g?.stage;const out=prevAdvanceSync29();if(NET.mode==='host'&&g&&g.stage!==before)hostStageEpoch++;return out};
}

if(typeof makeNetState==='function'){
 const prevMakeSync29=makeNetState;
 makeNetState=function(){
  const s=prevMakeSync29();
  if(NET.mode==='host'&&s){hostSeq++;s.sync29=syncMeta(state)}
  return s;
 };
}

if(typeof applyNetSnapshot==='function'){
 const prevApplySync29=applyNetSnapshot;
 applyNetSnapshot=function(s,initial=false){const stageChanged=!!(g&&s&&Number.isFinite(s.stage)&&s.stage!==g.stage);return prevApplySync29(s,initial||stageChanged)};
}

function dataChannelOf(conn){return conn?.dataChannel||conn?._dc||conn?._channel||null}
function isWebRelay(conn){return conn?.transport==='webrelay'||String(conn?.peer||'').startsWith('ws:')}
function compactRelaySnapshot(data){
 const s=data?.state;if(!s)return data;
 return{...data,state:{...s,q:Array.isArray(s.q)?s.q.slice(0,100):s.q,gem:Array.isArray(s.gem)?s.gem.slice(0,140):s.gem,zones:Array.isArray(s.zones)?s.zones.slice(0,24):s.zones}};
}

/*
 * Do not let ordered/reliable snapshot packets build an ever-growing queue.
 * Direct P2P keeps the original cadence and only drops when its DataChannel is
 * truly backed up. WebRelay is capped near 4 Hz because the public WSS path is
 * much more sensitive to large late-stage snapshots.
 */
if(typeof netBroadcast==='function'){
 const prevBroadcastSync29=netBroadcast;
 netBroadcast=function(data){
  if(NET.mode==='host'&&data?.t==='snap'){
   const now=nowMs();
   for(const conn of NET.conns?.values?.()||[]){
    if(!conn?.open)continue;
    const relay=isWebRelay(conn),minGap=relay?220:0,last=snapshotTimes.get(conn)||0;
    if(minGap>0&&now-last<minGap){syncStats.snapSkippedRate++;continue}
    const dc=dataChannelOf(conn),buffered=Number(dc?.bufferedAmount||0);
    if(buffered>512*1024){syncStats.snapSkippedBuffer++;continue}
    snapshotTimes.set(conn,now);
    try{conn.send(relay?compactRelaySnapshot(data):data);syncStats.snapSent++}catch{}
   }
   return;
  }
  if(NET.mode==='host'&&RESUME_TYPES.has(data?.t)){
   hostResumeEpoch++;
   const meta=syncMeta('play'),payload={...data,sync29:meta};
   if(payload.state)payload.state={...payload.state,sync29:meta};
   const generation=syncGeneration,out=prevBroadcastSync29(payload);
   for(const delay of [120,360,820])setTimeout(()=>{if(generation!==syncGeneration||NET.mode!=='host')return;syncStats.controlReplays++;prevBroadcastSync29(payload)},delay);
   return out;
  }
  return prevBroadcastSync29(data);
 };
}

if(typeof netHostMessage==='function'){
 const prevHostSync29=netHostMessage;
 netHostMessage=function(conn,msg){
  if(msg?.t==='v29SyncProbe'&&NET.mode==='host'&&g&&conn?.open){
   const s=typeof makeNetState==='function'?makeNetState():null;
   try{conn.send({t:'v29SyncFull',state:s,sync29:s?.sync29,probeAt:msg.at||0})}catch{}
   return;
  }
  return prevHostSync29(conn,msg);
 };
}

if(typeof netClientMessage==='function'){
 const prevClientSync29=netClientMessage;
 netClientMessage=function(msg){
  if(!msg||typeof msg!=='object')return prevClientSync29(msg);
  lastClientRxAt=nowMs();
  const meta=messageMeta(msg),advancedStage=!!(meta&&meta.stageEpoch>clientStageEpoch),advancedResume=!!(meta&&meta.resumeEpoch>clientResumeEpoch);
  if(RESUME_TYPES.has(msg.t)&&meta&&meta.resumeEpoch<=clientResumeEpoch)return;

  if(msg.t==='v29SyncFull'&&msg.state){
   syncStats.fullResyncs++;lastClientSnapAt=nowMs();
   if(meta){clientStageEpoch=Math.max(clientStageEpoch,meta.stageEpoch||0);clientResumeEpoch=Math.max(clientResumeEpoch,meta.resumeEpoch||0)}
   if(meta?.phase==='play'||RECOVERABLE_STATES.has(state))recoverClient('full-resync',msg.state);else if(typeof applyNetSnapshot==='function')applyNetSnapshot(msg.state,true);
   return;
  }

  const out=prevClientSync29(msg);
  if(msg.t==='start'||msg.t==='snap'||RESUME_TYPES.has(msg.t)){
   if(msg.t==='start'||msg.t==='snap')lastClientSnapAt=nowMs();
   if(meta){
    const shouldRecover=NET.mode==='client'&&RECOVERABLE_STATES.has(state)&&(advancedStage||advancedResume)&&meta.phase==='play';
    clientStageEpoch=Math.max(clientStageEpoch,meta.stageEpoch||0);clientResumeEpoch=Math.max(clientResumeEpoch,meta.resumeEpoch||0);
    if(shouldRecover)recoverClient('epoch-advance',msg.state||null);
   }
  }
  return out;
 };
}

if(!window.__NEXUS_CLIENT_SYNC_GUARD29){
 window.__NEXUS_CLIENT_SYNC_GUARD29=setInterval(()=>{
  try{
   if(NET.mode!=='client'||!g||state==='menu'||state==='ended'||!NET.hostConn?.open)return;
   const now=nowMs(),age=lastClientSnapAt?now-lastClientSnapAt:0;
   if(age>2600&&now-lastProbeAt>1200){lastProbeAt=now;syncStats.probes++;try{NET.hostConn.send({t:'v29SyncProbe',at:Date.now(),stage:g.stage,state})}catch{}}
   if(age>4500){const el=document.getElementById('netData');if(el)el.textContent=`CLIENT · SYNC RECOVERY ${Math.round(age/1000)}s`}
  }catch{}
 },500);
}

window.NEXUS_SYNC_STABILITY29={build:'0.29',resumeEpoch:true,stageEpoch:true,controlReplay:true,snapshotBackpressure:true,webRelayRateLimit:true,fullSyncProbe:true,staleStateRecovery:true,stats:syncStats};

function qa29(){
 const n=window.NEXUS_NETWORK_V29||{},s=window.NEXUS_STABILITY_V29||{},sync=window.NEXUS_SYNC_STABILITY29||{},p=window.NEXUS_PARTY_V28||{},m=window.NEXUS_MOTION_V27||{},polish=window.NEXUS_POLISH_V26||{},bc=window.NEXUS_BUILDCRAFT_V25||{};
 const checks={
  network29:n.build==='0.29'&&n.p2pPrimary===true&&n.webRelayFallback===true&&n.webRelayBrokers>=2&&n.stunUrls>=3&&n.relayProbe===true,
  fivePlayer:n.maxPlayers===5&&p.maxPlayers===5,
  retries:n.joinAttempts>=5&&n.timeoutMs>=7000,
  routeDetection:n.routeDetection===true,
  stability:s.build==='0.29'&&s.singleChoice===true&&s.nexusLock===true&&s.duplicateChoiceGuard===true&&s.disconnectPauseRecovery===true&&s.multiReplayCleanup===true&&s.pauseWatchdog===true,
  clientSync:sync.build==='0.29'&&sync.resumeEpoch===true&&sync.stageEpoch===true&&sync.controlReplay===true&&sync.snapshotBackpressure===true&&sync.fullSyncProbe===true&&sync.staleStateRecovery===true,
  partyPause:p.globalLevelPause===true&&p.waitForAllLevelChoices===true,
  motion27:m.build==='0.27'&&m.playerMotion===true&&m.enemyGait===true&&m.bossPhaseMotion===true,
  polish26:polish.build==='0.26',
  buildcraft25:bc.build==='0.25'&&bc.baseSkills===105&&bc.advancedSkills===168,
  sevenClasses:typeof C==='object'&&['warrior','archer','mage','priest','necromancer','rogue','gunslinger'].every(k=>!!C[k]),
  fiftyStages:Array.isArray(ST)&&ST.length===50&&window.NEXUS_MAX_STAGE===50
 };
 const failed=Object.entries(checks).filter(([,v])=>!v).map(([k])=>k);
 const report={build:'0.29',ok:failed.length===0,checks,failed,at:Date.now()};
 window.NEXUS_RUNTIME_CHECK=report;
 if(report.ok)console.info('[NEXUS 0.29] QA PASS',report);else console.error('[NEXUS 0.29] QA FAIL',report);
 return report;
}
window.NEXUS_RUN_QA=qa29;qa29();
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',qa29,{once:true});else setTimeout(qa29,0);
})();
