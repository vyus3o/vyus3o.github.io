/* NEXUS SURVIVAL runtime verification build 0.26 */
(function(){
'use strict';
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
window.NEXUS_RUNTIME_CHECK={build:'0.26',ok:failed.length===0,checks,failed};
if(failed.length)console.error('NEXUS QA 0.26 FAIL',failed);else console.log('NEXUS QA 0.26 PASS',checks);
})();
