/* NEXUS SURVIVAL runtime verifier build 0.32 */
(function(){
'use strict';
function run32(){
 const checks={
  partySync:!!window.NEXUS_PARTY_SYNC_V32?.reliableLevelRounds&&!!window.NEXUS_PARTY_SYNC_V32?.repeatedChoiceDelivery&&!!window.NEXUS_PARTY_SYNC_V32?.missingChoiceResync,
  pixelLayer:!!window.NEXUS_PIXEL_V32?.drawImageSprites&&window.NEXUS_PIXEL_V32?.baseClasses===7&&window.NEXUS_PIXEL_V32?.advancedClasses===14&&window.NEXUS_PIXEL_V32?.bosses===3,
  network31:!!window.NEXUS_NETWORK_V31?.unifiedTransport,
  smooth31:!!window.NEXUS_NETWORK_SMOOTH_V31?.dualP2PChannels,
  classes:typeof C==='object'&&['warrior','archer','mage','priest','necromancer','rogue','gunslinger'].every(k=>!!C[k]),
  fivePlayer:window.NEXUS_EXPANSION_V24?.maxPlayers===5,
  buildcraft:!!window.NEXUS_BUILDCRAFT_V25,
  partyPause:window.NEXUS_PARTY_V28?.globalLevelPause===true
 };
 const failed=Object.entries(checks).filter(([,ok])=>!ok).map(([k])=>k);
 window.NEXUS_RUNTIME_CHECK={build:'0.32',ok:failed.length===0,checks,failed};
 return window.NEXUS_RUNTIME_CHECK;
}
window.NEXUS_VERIFY_V32={build:'0.32',run:run32};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(run32,0));else setTimeout(run32,0);
})();