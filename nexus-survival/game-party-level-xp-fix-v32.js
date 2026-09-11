/* NEXUS SURVIVAL multiplayer shared XP/level round fix 0.32.3 */
(function(){
'use strict';
const oldGainPartyXp=gainPartyXp;
function activePlayers(){return g?Object.values(g.players||{}).filter(p=>p&&p.alive!==false):[]}
function syncFromLeader(ps,leader){for(const p of ps){p.xp=leader.xp;p.l=leader.l;p.nxp=leader.nxp}}
gainPartyXp=function(v){
 if(!g||NET.mode==='solo')return oldGainPartyXp(v);
 if(NET.mode==='client')return;
 const ps=activePlayers();if(!ps.length)return;
 const leader=g.players?.p1||ps[0];
 if(ps.some(p=>p.pendingLevel)||window.NEXUS_PARTY_SYNC_V32?.hostRound)return;
 leader.xp=(Number(leader.xp)||0)+(Number(v)||0);
 syncFromLeader(ps,leader);
 if(leader.xp<leader.nxp)return;
 leader.xp-=leader.nxp;
 leader.l=(leader.l||1)+1;
 leader.nxp=Math.floor(35*Math.pow(leader.l,1.18));
 syncFromLeader(ps,leader);
 // One canonical request opens exactly one party-wide round. The v32.2
 // party-sync layer creates a separate choice set for every connected player.
 requestLevel(leader);
};
window.NEXUS_PARTY_LEVEL_XP_FIX_V32={build:'0.32.3',sharedXp:true,singleCanonicalRound:true,allPlayersSameLevel:true};
})();