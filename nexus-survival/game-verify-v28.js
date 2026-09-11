/* NEXUS SURVIVAL runtime verification build 0.28 */
(function(){
'use strict';
function qa28(){
 const v=window.NEXUS_PARTY_V28||{},m=window.NEXUS_MOTION_V27||{},bc=window.NEXUS_BUILDCRAFT_V25||{},ex=window.NEXUS_EXPANSION_V24||{};
 const checks={
  party28:v.build==='0.28'&&v.globalLevelPause===true&&v.waitForAllLevelChoices===true,
  freeze:v.freezeTimers===true&&v.partyLevelUi===true,
  fivePlayerLink:v.maxPlayers===5&&v.nativeSlots===true&&v.joinRetry===true&&v.iceFallback===true,
  motion27:m.build==='0.27'&&m.playerMotion===true&&m.enemyGait===true&&m.bossPhaseMotion===true,
  buildcraft25:bc.build==='0.25'&&bc.baseSkills===105&&bc.advancedSkills===168,
  sevenClasses:typeof C==='object'&&['warrior','archer','mage','priest','necromancer','rogue','gunslinger'].every(k=>!!C[k]),
  fivePlayerExpansion:ex.maxPlayers===5,
  fiftyStages:Array.isArray(ST)&&ST.length===50&&window.NEXUS_MAX_STAGE===50
 };
 const failed=Object.entries(checks).filter(([,v])=>!v).map(([k])=>k),report={build:'0.28',ok:failed.length===0,checks,failed,at:Date.now()};
 window.NEXUS_RUNTIME_CHECK=report;
 if(report.ok)console.info('[NEXUS 0.28] QA PASS',report);else console.error('[NEXUS 0.28] QA FAIL',report);
 return report;
}
window.NEXUS_RUN_QA=qa28;qa28();if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',qa28,{once:true});else setTimeout(qa28,0);
})();
