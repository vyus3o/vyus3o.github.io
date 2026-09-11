/* NEXUS SURVIVAL build 0.25 runtime verification */
(function(){
'use strict';
function qa25(){
 const bc=window.NEXUS_BUILDCRAFT_V25||{},bf=window.NEXUS_BUILDCRAFT_FIX_V25||{},ex=window.NEXUS_EXPANSION_V24||{},bt=window.NEXUS_BOSS_TIERS_V24||{};
 const adv=window.NEXUS_ADV||{};
 const baseCounts=Object.values(SK||{}).map(s=>Object.keys(s||{}).length);
 const advCounts=Object.values(adv).map(a=>Object.keys(a.skills||{}).length);
 const baseMaxOk=Object.values(SK||{}).every(s=>Object.values(s||{}).every(d=>d.max===10));
 const advMaxOk=Object.values(adv).every(a=>Object.values(a.skills||{}).every(d=>d.max===10));
 const checks={
  buildcraftBuild:bc.build==='0.25',
  buildcraftRuntimeFix:bf.build==='0.25'&&bf.zoneMetadata===true&&bf.arrowRainRuntime===true,
  sevenBaseClasses:ex.baseClasses===7&&baseCounts.length===7,
  baseSkills105:bc.baseSkills===105&&baseCounts.every(n=>n===15),
  fourteenAdvancements:ex.advancements===14&&advCounts.length===14,
  advancedSkills168:bc.advancedSkills===168&&advCounts.every(n=>n===12),
  totalSkills273:(bc.baseSkills||0)+(bc.advancedSkills||0)===273,
  baseMax10:bc.baseMax===10&&baseMaxOk,
  advMax10:bc.advMax===10&&advMaxOk,
  advSlots3:bc.advSlots===3,
  synergyVolume:bc.synergies>=150,
  everySkillCombo:bc.allSkillsHaveCombo===true,
  arrowRainCombos:bc.arrowRainCombos>=4,
  fivePlayer:ex.maxPlayers===5,
  bossAdds:ex.bossAdds===true,
  midBosses:Array.isArray(bt.midStages)&&bt.midStages.join(',')==='5,15,25,35,45',
  majorBosses:Array.isArray(bt.majorStages)&&bt.majorStages.join(',')==='10,20,30,40,50',
  fiftyStages:Array.isArray(ST)&&ST.length===50&&window.NEXUS_MAX_STAGE===50,
  levelChoiceFn:typeof makeChoices==='function'&&typeof showLevelChoices==='function'&&typeof applyChoice==='function',
  multiplayerFns:typeof makeNetState==='function'&&typeof applyNetSnapshot==='function'&&typeof netHostMessage==='function'&&typeof netClientMessage==='function',
  combatFns:typeof runSkills==='function'&&typeof damageEnemy==='function'&&typeof spawn==='function'&&typeof updateHost==='function',
  portraitMeta:document.querySelector('meta[name="screen-orientation"]')?.content==='portrait'
 };
 const failed=Object.entries(checks).filter(([,v])=>!v).map(([k])=>k);
 const report={build:'0.25',ok:failed.length===0,checks,failed,baseSkills:bc.baseSkills||0,advancedSkills:bc.advancedSkills||0,totalSkills:(bc.baseSkills||0)+(bc.advancedSkills||0),synergies:bc.synergies||0,at:Date.now()};
 window.NEXUS_RUNTIME_CHECK=report;
 if(report.ok)console.info('[NEXUS 0.25] QA PASS',report);else console.error('[NEXUS 0.25] QA FAIL',report);
 return report;
}
window.NEXUS_RUN_QA=qa25;
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',qa25,{once:true});else qa25();
})();
