/* NEXUS SURVIVAL runtime verification build 0.26 */
(function(){
'use strict';
function qa26(){
 const checks={
  polish26:window.NEXUS_POLISH_V26?.build==='0.26',
  sevenClasses:typeof C==='object'&&['warrior','archer','mage','priest','necromancer','rogue','gunslinger'].every(k=>!!C[k]),
  buildcraft:window.NEXUS_BUILDCRAFT_V25?.build==='0.25',
  fivePlayer:window.NEXUS_EXPANSION_V24?.maxPlayers===5||window.NEXUS_EXPANSION_V24?.build==='0.24',
  buffHud:!!document.getElementById('buffTracker'),
  markerCleanup:window.NEXUS_POLISH_V26?.playerMarker==='cornerTicks',
  rogueFx:window.NEXUS_POLISH_V26?.rogueFxFixed===true,
  openingBalance:window.NEXUS_POLISH_V26?.openingBalance===true,
  hudLayout:window.NEXUS_POLISH_V26?.hudNoOverlap===true
 };
 const failed=Object.entries(checks).filter(([,v])=>!v).map(([k])=>k);
 const report={build:'0.26',ok:failed.length===0,checks,failed,at:Date.now()};
 window.NEXUS_RUNTIME_CHECK=report;
 if(failed.length)console.error('NEXUS QA 0.26 FAIL',failed);else console.info('NEXUS QA 0.26 PASS',checks);
 return report;
}
window.NEXUS_RUN_QA_26=qa26;
/* v25 also waits for DOMContentLoaded. Register v26 after it so the newest QA stays authoritative. */
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',qa26,{once:true});else qa26();
})();
