/* NEXUS SURVIVAL runtime verification fixes build 0.14 */
(function(){
'use strict';

/*
 * Seraph SE02 Lv.3 stores the Nexus spring timer globally, while the
 * advancement tick runs once per living player. Without this guard the
 * Nexus regeneration is applied once per player. Normalize it to exactly
 * one spring tick regardless of party size.
 */
if(typeof window.nexusAdvTick==='function'){
  const prevAdvTick=window.nexusAdvTick;
  window.nexusAdvTick=function(dt){
    if(!g||!g.n)return prevAdvTick(dt);
    const springActive=(g.n._springUntil||0)>g.t;
    const before=g.n.hp;
    const max=g.n.max;
    const out=prevAdvTick(dt);
    if(springActive){
      g.n.hp=Math.min(max,before+max*.0007*dt);
    }
    return out;
  };
}

/* Runtime structural smoke checks. Non-blocking: records failures for debugging. */
const checks={
  stages:Array.isArray(ST)&&ST.length>=50,
  advancement:!!(window.NEXUS_ADV&&Object.keys(window.NEXUS_ADV).length===8),
  advTick:typeof window.nexusAdvTick==='function',
  ultimate:typeof window.nexusUseUlt==='function'&&typeof window.nexusUltReady==='function',
  multiplayer:typeof netBroadcast==='function'&&typeof netHostMessage==='function'&&typeof netClientMessage==='function',
  combat:typeof updateHost==='function'&&typeof updatePlayers==='function'&&typeof damageEnemy==='function',
  dash:typeof updateClient==='function'&&typeof damagePlayer==='function'
};
window.NEXUS_RUNTIME_CHECK={build:'0.15',checks,ok:Object.values(checks).every(Boolean),at:Date.now()};
if(!window.NEXUS_RUNTIME_CHECK.ok)console.error('[NEXUS 0.15] runtime check failed',checks);
else console.info('[NEXUS 0.15] runtime check passed',checks);
})();
