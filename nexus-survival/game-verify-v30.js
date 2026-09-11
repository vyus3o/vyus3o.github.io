/* NEXUS SURVIVAL runtime verification build 0.30 */
(function(){
'use strict';
function qa30(){
 const n=window.NEXUS_NETWORK_V30||{},n29=window.NEXUS_NETWORK_V29||{},s29=window.NEXUS_STABILITY_V29||{},sync29=window.NEXUS_SYNC_STABILITY29||{},p=window.NEXUS_PARTY_V28||{},m=window.NEXUS_MOTION_V27||{},bc=window.NEXUS_BUILDCRAFT_V25||{},ex=window.NEXUS_EXPANSION_V24||{};
 const checks={
  compact30:n.build==='0.30'&&n.compactSnapshots===true&&n.interestManagement===true&&n.latestStateWins===true,
  smooth30:n.snapshotBackpressure===true&&n.clientExtrapolation===true&&n.separateVisualStream===true,
  payloadCaps:n.directEnemyCap>=100&&n.relayEnemyCap>=60&&n.relayEnemyCap<n.directEnemyCap&&n.bufferHard>n.bufferSoft,
  fallback29:n29.p2pPrimary===true&&n29.webRelayFallback===true&&n29.maxPlayers===5,
  stability29:s29.singleChoice===true&&s29.nexusLock===true&&s29.disconnectPauseRecovery===true&&sync29.staleStateRecovery===true,
  fivePlayer:n.maxPlayers===5&&p.maxPlayers===5&&ex.maxPlayers===5,
  partyPause:p.globalLevelPause===true&&p.waitForAllLevelChoices===true,
  motion:m.build==='0.27'&&m.playerMotion===true&&m.enemyGait===true,
  buildcraft:bc.build==='0.25'&&bc.baseSkills===105&&bc.advancedSkills===168,
  fiftyStages:Array.isArray(ST)&&ST.length===50&&window.NEXUS_MAX_STAGE===50
 };
 const failed=Object.entries(checks).filter(([,v])=>!v).map(([k])=>k);
 const report={build:'0.30',ok:failed.length===0,checks,failed,at:Date.now()};
 window.NEXUS_RUNTIME_CHECK=report;
 if(report.ok)console.info('[NEXUS 0.30] QA PASS',report);else console.error('[NEXUS 0.30] QA FAIL',report);
 return report;
}
window.NEXUS_RUN_QA=qa30;
qa30();
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',qa30,{once:true});else setTimeout(qa30,0);
})();
