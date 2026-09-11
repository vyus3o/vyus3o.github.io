/* NEXUS SURVIVAL build 0.19 multiplayer runtime verification */
(function(){
'use strict';
const prevQa=window.NEXUS_RUN_QA;
function qa19(){
  let base={ok:true,checks:{}};
  try{if(typeof prevQa==='function')base=prevQa()||base}catch(e){base={ok:false,checks:{baseQaException:false},failed:['baseQaException']};console.error('[NEXUS 0.19] base QA exception',e)}
  const mf=window.NEXUS_MULTI_FIX||{};
  const checks={
    ...(base.checks||{}),
    baseQa:base.ok!==false,
    multiplayerRewardFix:mf.build==='0.19'&&mf.partyBossRewards===true,
    dashClockSync:mf.build==='0.19'&&mf.dashClockSync===true,
    spawnFix:window.NEXUS_SPAWN_FIX?.build==='0.18'&&window.NEXUS_SPAWN_FIX?.watchdog===true,
    multiplayer:typeof netBroadcast==='function'&&typeof netHostMessage==='function'&&typeof netClientMessage==='function',
    networkState:typeof makeNetState==='function'&&typeof applyNetSnapshot==='function'
  };
  const failed=Object.entries(checks).filter(([,v])=>!v).map(([k])=>k);
  const report={build:'0.19',ok:failed.length===0,checks,failed,stages:Array.isArray(ST)?ST.length:0,at:Date.now()};
  window.NEXUS_RUNTIME_CHECK=report;
  if(report.ok)console.info('[NEXUS 0.19] QA PASS',report);else console.error('[NEXUS 0.19] QA FAIL',report);
  return report;
}
window.NEXUS_RUN_QA=qa19;
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',qa19,{once:true});else qa19();
})();
