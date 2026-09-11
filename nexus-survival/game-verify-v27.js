/* NEXUS SURVIVAL runtime verification build 0.27 */
(function(){
'use strict';
function qa27(){
 const m=window.NEXUS_MOTION_V27||{},p=window.NEXUS_POLISH_V26||{},bc=window.NEXUS_BUILDCRAFT_V25||{},ex=window.NEXUS_EXPANSION_V24||{};
 const checks={
  motion27:m.build==='0.27'&&m.renderingOnly===true,
  playerMotion:m.playerMotion===true&&m.classAttackMotion===true,
  enemyMotion:m.enemyGait===true&&m.hitReactions===true,
  bossMotion:m.bossEntrance===true&&m.bossPhaseMotion===true,
  worldMotion:m.biomeAmbience===true&&m.nexusMotion===true&&m.projectileTrails===true,
  uiMotion:m.uiMicroMotion===true&&!!document.getElementById('motionDetailV27'),
  mobileAdaptive:m.mobileAdaptiveFx===true,
  polish26:p.build==='0.26',
  buildcraft25:bc.build==='0.25'&&bc.baseSkills===105&&bc.advancedSkills===168,
  sevenClasses:typeof C==='object'&&['warrior','archer','mage','priest','necromancer','rogue','gunslinger'].every(k=>!!C[k]),
  fivePlayer:ex.maxPlayers===5,
  fiftyStages:Array.isArray(ST)&&ST.length===50&&window.NEXUS_MAX_STAGE===50
 };
 const failed=Object.entries(checks).filter(([,v])=>!v).map(([k])=>k);
 const report={build:'0.27',ok:failed.length===0,checks,failed,at:Date.now()};
 window.NEXUS_RUNTIME_CHECK=report;
 if(report.ok)console.info('[NEXUS 0.27] QA PASS',report);else console.error('[NEXUS 0.27] QA FAIL',report);
 return report;
}
window.NEXUS_RUN_QA=qa27;
qa27();
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',qa27,{once:true});else setTimeout(qa27,0);
})();
