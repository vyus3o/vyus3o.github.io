/* NEXUS SURVIVAL build 0.24 runtime verification */
(function(){
'use strict';
const prevQa=window.NEXUS_RUN_QA;
function qa24(){
 if(window.NEXUS_BUILDCRAFT_V25?.build==='0.25')return {build:'0.24',ok:true,checks:{supersededBy025:true},failed:[]};
 let base={ok:true,checks:{}};try{if(typeof prevQa==='function')base=prevQa()||base}catch(e){base={ok:false,checks:{baseQaException:false},failed:['baseQaException']};console.error('[NEXUS 0.24] base QA exception',e)}
 const mf=window.NEXUS_MULTI_FIX||{},vf=window.NEXUS_VISUAL_V20||{},sf=window.NEXUS_SWARM_V21||{},pf=window.NEXUS_POWER_V22||{},bf=window.NEXUS_BUFFS_V23||{},ex=window.NEXUS_EXPANSION_V24||{},xf=window.NEXUS_EXPANSION_FIX_V24||{},bt=window.NEXUS_BOSS_TIERS_V24||{},dh=window.NEXUS_DASH_V24||{};
 const checks={...(base.checks||{}),baseQa:base.ok!==false,multiplayerRewardFix:mf.partyBossRewards===true,dashClockSync:mf.dashClockSync===true,spawnFix:window.NEXUS_SPAWN_FIX?.watchdog===true,visualBuild:vf.build==='0.20',doubleSpawn:sf.spawnMultiplier===2,powerCurve:pf.build==='0.22',buffHud:bf.rightHud===true&&bf.hostClockSync===true,newClassBuffs:bf.newClassBuffs===true,expansionBuild:ex.build==='0.24',expansionFix:xf.build==='0.24'&&xf.singleBuffScaling===true&&xf.stageCleanup===true,sevenBaseClasses:ex.baseClasses===7&&Object.keys(C||{}).length>=7,fourteenAdvancements:ex.advancements===14&&Object.keys(window.NEXUS_ADV||{}).length>=14,maxPlayers5:ex.maxPlayers===5,bossAdds:ex.bossAdds===true,bossTierBuild:bt.build==='0.24',midBosses:Array.isArray(bt.midStages)&&bt.midStages.join(',')==='5,15,25,35,45',majorBosses:Array.isArray(bt.majorStages)&&bt.majorStages.join(',')==='10,20,30,40,50',bossExtraPatterns:bt.midPatterns>=4&&bt.majorPatterns>=5,bossAddsContinue:bt.addsContinue===true,dashSevenClasses:Array.isArray(dh.classes)&&dh.classes.length>=7,multiplayer:typeof netBroadcast==='function'&&typeof netHostMessage==='function'&&typeof netClientMessage==='function',networkState:typeof makeNetState==='function'&&typeof applyNetSnapshot==='function'};
 const failed=Object.entries(checks).filter(([,v])=>!v).map(([k])=>k),report={build:'0.24',ok:failed.length===0,checks,failed,stages:Array.isArray(ST)?ST.length:0,at:Date.now()};window.NEXUS_RUNTIME_CHECK=report;if(report.ok)console.info('[NEXUS 0.24] QA PASS',report);else console.error('[NEXUS 0.24] QA FAIL',report);return report
}
window.NEXUS_RUN_QA=qa24;if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',qa24,{once:true});else qa24();
})();
