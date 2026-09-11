/* NEXUS SURVIVAL swarm pace + monster grades build 0.21
 * 2x normal spawn batches, grade-based XP/stats/colors, 3 combat variants.
 * Host-authoritative: grade/variant metadata is synchronized in snapshots.
 */
(function(){
'use strict';
const TAU=Math.PI*2;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const GRADE={
 common:{name:'COMMON',col:'#c9cec7',hp:.80,dmg:.72,spd:1.08,r:.96,xp:.85},
 uncommon:{name:'UNCOMMON',col:'#7ed36e',hp:.90,dmg:.78,spd:1.10,r:1.00,xp:1.15},
 rare:{name:'RARE',col:'#62b9ff',hp:1.05,dmg:.88,spd:1.12,r:1.04,xp:1.55},
 epic:{name:'EPIC',col:'#c47cff',hp:1.20,dmg:.96,spd:1.13,r:1.08,xp:2.10},
 legendary:{name:'LEGENDARY',col:'#ffbd55',hp:1.42,dmg:1.05,spd:1.15,r:1.12,xp:3.00}
};
const ROLE={
 swift:{name:'SWIFT',hp:.86,dmg:.92,spd:1.18,r:.92,xp:.95},
 brute:{name:'BRUTE',hp:1.20,dmg:1.10,spd:.90,r:1.10,xp:1.15},
 hunter:{name:'HUNTER',hp:1.00,dmg:1.03,spd:1.04,r:1.00,xp:1.05}
};
const ROLE_KEYS=['swift','brute','hunter'];

function gradeRoll(stage,elite=false){
  if(elite)return Math.random()<.28?'legendary':'epic';
  const s=clamp(stage||0,0,49)/49;
  const legendary=.001+.039*s;
  const epic=.009+.091*s;
  const rare=.05+.16*s;
  const uncommon=.22+.08*s;
  const r=Math.random();
  if(r<legendary)return 'legendary';
  if(r<legendary+epic)return 'epic';
  if(r<legendary+epic+rare)return 'rare';
  if(r<legendary+epic+rare+uncommon)return 'uncommon';
  return 'common';
}
function roleRoll(e){
  const n=((Number(e?.id)||0)+(e?.type||0)*7+(g?.stage||0)*11)%3;
  return ROLE_KEYS[n];
}
function applyTier(e){
  if(!e||e.boss||e._v21Tiered)return e;
  e._v21Tiered=true;
  e.grade=gradeRoll(g?.stage||0,!!e.elite);
  e.gradeColor=GRADE[e.grade].col;
  e.variantRole=roleRoll(e);
  e.visualVariant=((Number(e.id)||0)+(e.type||0)+(g?.stage||0))%3;
  const gr=GRADE[e.grade],ro=ROLE[e.variantRole];
  /* existing ELITE already has its own large HP/damage modifier; don't stack another wall of HP */
  const hpMul=(e.elite?1:gr.hp)*ro.hp;
  const dmgMul=(e.elite?1:gr.dmg)*ro.dmg;
  e.max*=hpMul;e.hp=e.max;
  e.dmg*=dmgMul;
  e.spd*=gr.spd*ro.spd;
  e.r=Math.max(10,Math.round(e.r*(e.elite?1:gr.r)*ro.r));
  e.gradeXp=gr.xp*ro.xp*(e.elite?1.18:1);
  return e;
}

/* Faster entry: still outside the view, but much closer to the combat edge. */
randEdgeSpawn=function(){
  const n=g?.n||{x:WORLD.w/2,y:WORLD.h/2};
  const side=(Math.random()*4)|0;
  const mx=26+Math.random()*42,my=22+Math.random()*38;
  const halfW=W/2+mx,halfH=H/2+my;
  let x=n.x,y=n.y;
  if(side===0){x=n.x-halfW;y=n.y+(Math.random()*2-1)*(H*.49)}
  else if(side===1){x=n.x+halfW;y=n.y+(Math.random()*2-1)*(H*.49)}
  else if(side===2){x=n.x+(Math.random()*2-1)*(W*.49);y=n.y-halfH}
  else{x=n.x+(Math.random()*2-1)*(W*.49);y=n.y+halfH}
  return{x:clamp(x,30,WORLD.w-30),y:clamp(y,30,WORLD.h-30)};
};

/* Every normal spawn pulse emits two enemies. Boss spawning remains exactly one. */
const oldSpawn21=spawn;
spawn=function(b=false){
  if(b)return oldSpawn21(true);
  let first=null;
  for(let i=0;i<2;i++){
    const before=g?.e?.length||0;
    oldSpawn21(false);
    if(g?.e?.length>before){
      const e=g.e[g.e.length-1];applyTier(e);if(!first)first=e;
    }
  }
  return first;
};

/* Grade multiplies all XP gems created by that enemy, including elite bonus XP. */
const oldKill21=killEnemy;
killEnemy=function(e,ownerId){
  if(!e||e.dead)return oldKill21(e,ownerId);
  const grade=e.grade||'common',mult=e.boss?1:(e.gradeXp||GRADE[grade]?.xp||1),before=g?.gem?.length||0;
  const x=e.x,y=e.y,col=e.gradeColor||GRADE[grade]?.col||'#c9cec7';
  const out=oldKill21(e,ownerId);
  if(!e.boss&&g?.gem){
    for(let i=before;i<g.gem.length;i++)g.gem[i].v=Math.max(1,Math.round((g.gem[i].v||1)*mult));
    if(grade!=='common')addFx('ring',x,y,{r:grade==='legendary'?54:grade==='epic'?44:34,col,life:.32,ownerId,net:true});
  }
  return out;
};

/* Network metadata for grade colors/XP/visual variants. */
const oldNetState21=makeNetState;
makeNetState=function(){
  const s=oldNetState21();
  if(!g||!Array.isArray(s.e))return s;
  const m=new Map((g.e||[]).map(e=>[e.id,e]));
  for(const d of s.e){const e=m.get(d.id);if(!e)continue;d.grade=e.grade;d.gradeColor=e.gradeColor;d.gradeXp=e.gradeXp;d.variantRole=e.variantRole;d.visualVariant=e.visualVariant;}
  return s;
};
const oldApplySnap21=applyNetSnapshot;
applyNetSnapshot=function(s,initial=false){
  oldApplySnap21(s,initial);if(!g)return;
  const m=new Map((s.e||[]).map(e=>[e.id,e]));
  for(const e of g.e){const d=m.get(e.id);if(!d)continue;e.grade=d.grade||e.grade||'common';e.gradeColor=d.gradeColor||GRADE[e.grade]?.col;e.gradeXp=d.gradeXp||e.gradeXp||1;e.variantRole=d.variantRole||e.variantRole||'hunter';e.visualVariant=d.visualVariant??e.visualVariant??0;e._v21Tiered=true;}
};

/* Grade/variant visual language layered on top of build 0.20 silhouettes. */
const oldDrawEnemy21=drawEnemy;
drawEnemy=function(e){
  oldDrawEnemy21(e);if(!e||e.boss)return;
  const grade=e.grade||'common',gr=GRADE[grade]||GRADE.common,role=e.variantRole||'hunter',v=e.visualVariant||0,t=g?.t||0,pulse=.5+.5*Math.sin(t*5+(Number(e.id)||0));
  ctx.save();
  /* feet ring: grade is readable without recoloring the biome art */
  ctx.globalAlpha=grade==='common'?.20:.38+.12*pulse;ctx.strokeStyle=gr.col;ctx.lineWidth=grade==='legendary'?3:grade==='epic'?2.5:1.5;
  ctx.beginPath();ctx.ellipse(e.x,e.y+13,e.r*1.05,6+e.r*.08,0,0,TAU);ctx.stroke();
  if(grade==='rare'||grade==='epic'||grade==='legendary'){
    ctx.globalAlpha=grade==='legendary'?.14:.08;ctx.fillStyle=gr.col;ctx.beginPath();ctx.arc(e.x,e.y,e.r+8+2*pulse,0,TAU);ctx.fill();
  }
  /* role accessories create three recognizable variants per base monster */
  ctx.globalAlpha=.95;ctx.fillStyle=gr.col;ctx.strokeStyle=gr.col;ctx.lineWidth=2;
  if(role==='swift'){
    for(let i=0;i<2;i++){ctx.beginPath();ctx.moveTo(e.x-e.r-4-i*7,e.y-8+i*10);ctx.lineTo(e.x-e.r-15-i*8,e.y-8+i*10);ctx.stroke()}
  }else if(role==='brute'){
    ctx.fillRect(Math.round(e.x-e.r*.78),Math.round(e.y-e.r*.65),Math.max(3,e.r*.32),5);ctx.fillRect(Math.round(e.x+e.r*.46),Math.round(e.y-e.r*.65),Math.max(3,e.r*.32),5);
  }else{
    const a=t*1.8+(Number(e.id)||0);for(let i=0;i<2;i++){const q=a+i*Math.PI;ctx.fillRect(Math.round(e.x+Math.cos(q)*(e.r+7)-2),Math.round(e.y+Math.sin(q)*(e.r*.65)-2),4,4)}
  }
  /* biome-specific mutation details add 3x visual variety within every silhouette */
  const biome=Math.min(4,Math.floor((g?.stage||0)/10));ctx.globalAlpha=.8;
  if(biome===0&&v===1){ctx.fillStyle='#d3b77a';ctx.fillRect(e.x-2,e.y-e.r-7,4,7)}
  else if(biome===1){ctx.fillStyle=v===0?'#9acb6b':v===1?'#b18a66':'#77b85c';ctx.beginPath();ctx.arc(e.x+(v-1)*6,e.y-e.r*.55,3+v,0,TAU);ctx.fill()}
  else if(biome===2){ctx.fillStyle='#c8f4ff';ctx.beginPath();ctx.moveTo(e.x-5,e.y-e.r*.7);ctx.lineTo(e.x,e.y-e.r-10-v*2);ctx.lineTo(e.x+4,e.y-e.r*.7);ctx.fill()}
  else if(biome===3){ctx.fillStyle='#ff9a48';ctx.beginPath();ctx.moveTo(e.x-5,e.y-e.r*.55);ctx.lineTo(e.x,e.y-e.r-7-3*pulse);ctx.lineTo(e.x+5,e.y-e.r*.55);ctx.fill()}
  else if(biome===4){ctx.strokeStyle='#bc83ec';ctx.globalAlpha=.65;ctx.beginPath();ctx.arc(e.x,e.y-e.r*.15,e.r+6+v*2,-1.1,.15);ctx.stroke()}
  if(grade==='epic'||grade==='legendary'){
    ctx.globalAlpha=.95;ctx.font='900 7px Arial';ctx.textAlign='center';ctx.fillStyle=gr.col;ctx.fillText(gr.name,e.x,e.y-e.r-16);
  }else if(grade==='rare'){
    ctx.globalAlpha=.9;ctx.fillStyle=gr.col;ctx.fillRect(Math.round(e.x-2),Math.round(e.y-e.r-12),4,4);
  }
  ctx.restore();
};

/* HUD gives a quick sense of the faster field density. */
const oldHud21=hud;
hud=function(){oldHud21();if(!g)return;const el=$('enemyInfo');if(!el)return;const live=g.e.filter(e=>!e.dead&&!e.boss),high=live.filter(e=>['rare','epic','legendary'].includes(e.grade)).length;el.textContent+=` · HORDE ${live.length} · R+ ${high}`;};

window.NEXUS_SWARM_V21={build:'0.21',spawnMultiplier:2,grades:Object.keys(GRADE),roles:Object.keys(ROLE),gradeXp:true,networkGradeSync:true};
})();
