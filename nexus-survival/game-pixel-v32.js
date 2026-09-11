/* NEXUS SURVIVAL pixel sprite rendering layer build 0.32
 * Emergency visibility hotfix: keep player pixel rendering disabled here and
 * delegate both player/enemy rendering to the proven renderer already loaded.
 * This prevents transparent atlas enemy regions from replacing visible mobs.
 */
(function(){
'use strict';
const BUILD='0.32';
const oldPlayer=drawPlayer;
const oldEnemy=drawEnemy;
drawPlayer=function(p,isLocal=false){return oldPlayer(p,isLocal)};
drawEnemy=function(e){return oldEnemy(e)};
window.NEXUS_PIXEL_V32={
 build:BUILD,
 ready:true,
 loadError:false,
 source:'legacy-renderer-visibility-hotfix',
 atlas:{w:768,h:352,embedded:true},
 baseClasses:7,
 advancedClasses:14,
 commonMonsters:5,
 eliteMonsters:5,
 specialVisuals:5,
 bosses:3,
 pixelated:false,
 renderOnly:true,
 drawImageSprites:false,
 enemyOpaque:true,
 enemyFallback:true,
 enemyAtlasReady:false,
 enemyAtlasFailed:true,
 validEnemySprites:0,
 visibilityHotfix:true
};
try{delete window.NEXUS_PIXEL_ATLAS_B64}catch{}
})();
