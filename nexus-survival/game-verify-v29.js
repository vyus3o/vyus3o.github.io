/* NEXUS SURVIVAL runtime verification build 0.29 */
(function(){
'use strict';
function qa29(){
 const n=window.NEXUS_NETWORK_V29||{},s=window.NEXUS_STABILITY_V29||{},p=window.NEXUS_PARTY_V28||{},m=window.NEXUS_MOTION_V27||{},polish=window.NEXUS_POLISH_V26||{},bc=window.NEXUS_BUILDCRAFT_V25||{};
 const checks={
  network29:n.build==='0.29'&&n.p2pPrimary===true&&n.webRelayFallback===true&&n.webRelayBrokers>=2&&n.stunUrls>=3&&n.relayProbe===true,
  fivePlayer:n.maxPlayers===5&&p.maxPlayers===5,
  retries:n.joinAttempts>=5&&n.timeoutMs>=7000,
  routeDetection:n.routeDetection===true,
  stability:s.build==='0.29'&&s.singleChoice===true&&s.nexusLock===true&&s.duplicateChoiceGuard===true&&s.disconnectPauseRecovery===true&&s.multiReplayCleanup===true&&s.pauseWatchdog===true,
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
