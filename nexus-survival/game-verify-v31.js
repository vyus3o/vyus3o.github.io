/* NEXUS SURVIVAL runtime verification build 0.31 */
(function(){
'use strict';
function qa31(){
 const n=window.NEXUS_NETWORK_V31||{},p=window.NEXUS_PARTY_V28||{},m=window.NEXUS_MOTION_V27||{},bc=window.NEXUS_BUILDCRAFT_V25||{},ex=window.NEXUS_EXPANSION_V24||{};
 const checks={
  network31:n.build==='0.31'&&n.unifiedTransport===true,
  fivePlayer:n.maxPlayers===5&&n.p2pPrimary===true&&n.webRelayFallback===true,
  compact:n.compactSnapshots===true&&n.interestManagement===true&&n.clientInterpolation===true&&n.backpressure===true,
  reconnect:n.reconnectGrace===true,
  choiceGuard:n.singleChoice===true&&n.duplicateChoiceGuard===true,
  partyPause:p.globalLevelPause===true&&p.waitForAllLevelChoices===true,
  motion:m.playerMotion===true&&m.enemyGait===true&&m.bossPhaseMotion===true,
  buildcraft:bc.baseSkills===105&&bc.advancedSkills===168,
  classes:typeof C==='object'&&['warrior','archer','mage','priest','necromancer','rogue','gunslinger'].every(k=>!!C[k]),
  expansion:ex.maxPlayers===5,
  stages:Array.isArray(ST)&&ST.length===50&&window.NEXUS_MAX_STAGE===50
 };
 const failed=Object.entries(checks).filter(([,v])=>!v).map(([k])=>k),report={build:'0.31',ok:failed.length===0,checks,failed,at:Date.now()};
 window.NEXUS_RUNTIME_CHECK=report;window.NEXUS_RUN_QA=qa31;
 if(report.ok)console.info('[NEXUS 0.31] QA PASS',report);else console.error('[NEXUS 0.31] QA FAIL',report);
 return report;
}
qa31();if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',qa31,{once:true});else setTimeout(qa31,0);
})();