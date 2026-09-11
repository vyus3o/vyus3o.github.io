/* NEXUS SURVIVAL build 0.25 runtime verification */
(function(){
'use strict';
const prev=window.NEXUS_RUN_QA;
function qa25(){
 let base={ok:true,checks:{}};
 try{if(typeof prev==='function')base=prev()||base}catch(e){base={ok:false,checks:{baseQaException:false},failed:['baseQaException']};console.error('[NEXUS 0.25] base QA exception',e)}
 const bc=window.NEXUS_BUILDCRAFT_V25||{},ex=window.NEXUS_EXPANSION_V24||{},bt=window.NEXUS_BOSS_TIERS_V24||{};
 const adv=window.NEXUS_ADV||{};
 const baseCounts=Object.values(SK||{}).map(s=>Object.keys(s||{}).length);
 const advCounts=Object.values(adv).map(a=>Object.keys(a.skills||{}).length);
 const baseMaxOk=Object.values(SK||{}).every(s=>Object.values(s||{}).every(d=>d.max===10));
 const advMaxOk=Object.values(adv).every(a=>Object.values(a.skills||{}).every(d=>d.max===10));
 const checks={
  ...(base.checks||{}),baseQa:base.ok!==false,
  buildcraftBuild:bc.build==='0.25',
  sevenBaseClasses:ex.baseClasses===7&&baseCounts.length>=7,
  baseSkills105:bc.baseSkills>=105&&baseCounts.every(n=>n>=15),
  fourteenAdvancements:ex.advancements===14&&advCounts.length>=14,
  advancedSkills168:bc.advancedSkills>=168&&advCounts.every(n=>n>=12),
  baseMax10:bc.baseMax===10&&baseMaxOk,
  advMax10:bc.advMax===10&&advMaxOk,
  advSlots3:bc.advSlots===3,
  synergyVolume:bc.synergies>=150,
  everySkillCombo:bc.allSkillsHaveCombo===true,
  arrowRainCombos:bc.arrowRainCombos>=4,
  fivePlayer:ex.maxPlayers===5,
  bossAdds:ex.bossAdds===true,
  midBosses:Array.isArray(bt.midStages)&&bt.midStages.length===5,
  majorBosses:Array.isArray(bt.majorStages)&&bt.majorStages.length===5,
  levelChoiceFn:typeof makeChoices==='function'&&typeof showLevelChoices==='function'&&typeof applyChoice==='function'
 };
 const failed=Object.entries(checks).filter(([,v])=>!v).map(([k])=>k);
 const report={build:'0.25',ok:failed.length===0,checks,failed,baseSkills:bc.baseSkills||0,advancedSkills:bc.advancedSkills||0,synergies:bc.synergies||0,at:Date.now()};
 window.NEXUS_RUNTIME_CHECK=report;
 if(report.ok)console.info('[NEXUS 0.25] QA PASS',report);else console.error('[NEXUS 0.25] QA FAIL',report);
 return report;
}
window.NEXUS_RUN_QA=qa25;
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',qa25,{once:true});else qa25();
})();