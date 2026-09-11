/* NEXUS SURVIVAL expansion interaction fixes build 0.24 */
(function(){
'use strict';
const NEW=new Set(['necromancer','rogue','gunslinger']);
/* New class formulas already prepare damage from p.dmg. Core damageEnemy owns atkBuff,
   so remove the duplicate pre-multiplier exactly once before entering the expansion chain. */
const prevDamage24Fix=damageEnemy;
damageEnemy=function(e,amount,ownerId,o={}){const p=playerById(ownerId);if(p&&NEW.has(p.cls)&&(p.atkBuffUntil||0)>(g?.t||0)&&(p.atkBuff||1)>1)amount/=p.atkBuff;return prevDamage24Fix(e,amount,ownerId,o)};

/* New temporary summons/buffs must not leak across the stage clock reset. */
const prevAdvance24Fix=advanceStage;
advanceStage=function(){const out=prevAdvance24Fix();if(g)for(const p of Object.values(g.players||{})){for(const k of ['_skelUntil','_wraithUntil','_armyUntil','_golemUntil','_summonBuffUntil','_immortalArmyUntil','_shadowCloneUntil','_vanishUntil','_rogueHasteUntil','_quickdrawUntil','_bulletStormUntil','_turretUntil','_highNoonUntil','_shadowUltUntil'])p[k]=0;for(const k of ['_skelTick','_wraithTick','_armyTick','_golemTick','_shadowCloneTick','_bulletStormTick','_turretTick'])p[k]=0;p._summonBuff=1;p._skelCount=0;p._shadowCloneCount=0}return out};
window.NEXUS_EXPANSION_FIX_V24={build:'0.24',singleBuffScaling:true,stageCleanup:true};
})();