/* NEXUS SURVIVAL runtime verification build 0.30 */
(function(){
'use strict';
function qa30(){
 const n=window.NEXUS_NETWORK_V30||{},p=window.NEXUS_PARTY_V28||{},m=window.NEXUS_MOTION_V27||{},bc=window.NEXUS_BUILDCRAFT_V25||{},ex=window.NEXUS_EXPANSION_V24||{};
 const checks={
  network30:n.build==='0.30'&&n.authenticatedTurn===true&&n.timeLimitedCredentials===true&&n.relayProbe===true,
  turnHost:n.turnHost==='staticauth.openrelay.metered.ca'&&n.turnUrls>=4,
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
