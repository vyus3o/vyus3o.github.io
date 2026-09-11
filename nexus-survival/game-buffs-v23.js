/* NEXUS SURVIVAL synchronized buff tracker build 0.23
 * Right-side active buff HUD + host-clock multiplayer synchronization.
 */
(function(){
'use strict';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const TIMED_FIELDS=[
 'atkBuff','atkBuffUntil','speedBuff','speedBuffUntil','shield',
 '_seraphWingUntil','_seraphWingSpeed','_seraphWingReduce',
 '_blessUntil','_blessCrit','_guardianUltUntil','_berserkUltUntil',
 '_bloodlustUntil','_bloodlustRatio','_rangerUltUntil','_elementalUntil',
 '_elemUltUntil','_seraphSanctuaryUntil','_seraphSanctuaryReduce',
 '_tauntAuraUntil','_dashBoostUntil','_hawkUntil'
];

/* Carry transient buffs with the authoritative host clock. */
const oldMakeNetState23=makeNetState;
makeNetState=function(){
  const s=oldMakeNetState23();
  if(!g||!Array.isArray(s?.players))return s;
  const map=new Map(Object.values(g.players||{}).map(p=>[p.id,p]));
  for(const d of s.players){
    const p=map.get(d.id);if(!p)continue;
    for(const k of TIMED_FIELDS){
      const v=p[k];
      if(v!==undefined&&v!==null&&(typeof v==='number'||typeof v==='boolean'||typeof v==='string'))d[k]=v;
    }
  }
  return s;
};
const oldApplySnapshot23=applyNetSnapshot;
applyNetSnapshot=function(s,initial=false){
  oldApplySnapshot23(s,initial);
  if(!g||!Array.isArray(s?.players))return;
  const map=new Map(s.players.map(p=>[p.id,p]));
  for(const p of Object.values(g.players||{})){
    const d=map.get(p.id);if(!d)continue;
    for(const k of TIMED_FIELDS)if(d[k]!==undefined)p[k]=d[k];
  }
};

const css=document.createElement('style');
css.id='buffTrackerStyle23';
css.textContent=`
#buffTracker{position:absolute;right:12px;top:82px;width:190px;z-index:4;display:flex;flex-direction:column;gap:5px;pointer-events:none}
#buffTracker.hidden{display:none!important}.buffHead{font-size:8px;letter-spacing:1.7px;color:#91a098;text-align:right;margin-bottom:1px;text-shadow:0 1px 3px #000}.buffRow{--bc:#d8ff65;position:relative;min-height:35px;padding:5px 7px 6px 35px;border:1px solid color-mix(in srgb,var(--bc) 52%,#344038);background:#07100eea;box-shadow:0 4px 14px #0008,inset 2px 0 0 var(--bc);overflow:hidden}.buffIcon{position:absolute;left:7px;top:7px;width:21px;height:21px;display:grid;place-items:center;border:1px solid color-mix(in srgb,var(--bc) 55%,#42504b);background:color-mix(in srgb,var(--bc) 14%,#0c1411);color:var(--bc);font-size:11px;font-weight:900}.buffTop{display:flex;align-items:center;justify-content:space-between;gap:5px;line-height:12px}.buffName{font-size:9px;font-weight:900;color:#eef3ee;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.buffTime{font-size:9px;font-weight:900;color:var(--bc);font-variant-numeric:tabular-nums}.buffMeta{font-size:7px;color:#93a098;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.buffBar{position:absolute;left:0;bottom:0;height:2px;background:var(--bc);opacity:.9;transition:width .08s linear}.buffShield .buffBar{opacity:.45}
@media(pointer:coarse){#buffTracker{right:8px;top:108px;width:138px;gap:3px;max-height:31vh;overflow:hidden}.buffHead{font-size:6px;letter-spacing:1px}.buffRow{min-height:28px;padding:3px 5px 4px 28px;background:#06100de8}.buffIcon{left:5px;top:4px;width:18px;height:18px;font-size:9px}.buffName,.buffTime{font-size:7px;line-height:9px}.buffMeta{font-size:6px;line-height:8px}}
`;
document.head.appendChild(css);

const holder=document.createElement('div');holder.id='buffTracker';holder.className='hidden';
holder.innerHTML='<div class="buffHead">ACTIVE BUFFS</div><div id="buffRows"></div>';
(document.getElementById('hud')||document.getElementById('wrap')||document.body).appendChild(holder);
const rows=holder.querySelector('#buffRows');
const seenMax=new Map();

function rem(p,k){return Math.max(0,(Number(p?.[k])||0)-(Number(g?.t)||0))}
function fmtTime(v){if(v>=10)return Math.ceil(v)+'s';return Math.max(.1,Math.ceil(v*10)/10).toFixed(1)+'s'}
function pct(k,r){const prev=seenMax.get(k)||0,max=Math.max(prev,r,.1);seenMax.set(k,max);return clamp(r/max*100,0,100)}
function partyAffected(k){if(!g)return 0;return Object.values(g.players||{}).filter(x=>x.alive&&rem(x,k)>.02).length}
function addTimed(list,p,id,k,name,icon,col,meta='',party=false,priority=50){
  const r=rem(p,k);if(r<=.02)return;
  let m=meta;
  if(party){const n=partyAffected(k);if(n>1)m+=(m?' · ':'')+`PARTY ${n}P`}
  list.push({id,k,name,icon,col,meta:m,rem:r,pct:pct(id,r),priority});
}
function collect(p){
  const a=[];if(!p||!g)return a;
  if(rem(p,'atkBuffUntil')>.02&&(p.atkBuff||1)>1)addTimed(a,p,'atk','atkBuffUntil','공격력 강화','⚔','#f2cb68',`ATK +${Math.round(((p.atkBuff||1)-1)*100)}%`,true,90);
  if(rem(p,'speedBuffUntil')>.02&&(p.speedBuff||1)>1)addTimed(a,p,'speed','speedBuffUntil','기동력 강화','➤','#7fd8ca',`MOVE +${Math.round(((p.speedBuff||1)-1)*100)}%`,true,70);
  addTimed(a,p,'wing','_seraphWingUntil','천사의 날개','✦','#f6e9a6',p._seraphWingReduce?`DMG -${Math.round(p._seraphWingReduce*100)}%`:'' ,true,88);
  addTimed(a,p,'bless','_blessUntil','세라핌 축복','✚','#ffe88b',p._blessCrit?`CRIT +${Math.round(p._blessCrit*100)}%`:'' ,true,92);
  addTimed(a,p,'guardult','_guardianUltUntil','절대 성벽','⬡','#8fc7b0','PARTY DEFENSE',true,100);
  addTimed(a,p,'berserkult','_berserkUltUntil','라그나로크','✹','#ef725c','AWAKENING',false,100);
  addTimed(a,p,'bloodlust','_bloodlustUntil','피의 갈증','◆','#e56858',p._bloodlustRatio?`LIFESTEAL ${Math.round(p._bloodlustRatio*100)}%`:'',false,84);
  addTimed(a,p,'rangerult','_rangerUltUntil','천공의 폭풍','➳','#9ee57a','AWAKENING',false,100);
  addTimed(a,p,'elemental','_elementalUntil','대정령 소환','✦','#81d6e8','ELEMENTAL',false,66);
  addTimed(a,p,'elemult','_elemUltUntil','원소 대재앙','✧','#aa9cff','AWAKENING',false,100);
  addTimed(a,p,'sanctuary','_seraphSanctuaryUntil','천상의 성역','✚','#f4e29a',p._seraphSanctuaryReduce?`DMG -${Math.round(p._seraphSanctuaryReduce*100)}%`:'',false,82);
  addTimed(a,p,'taunt','_tauntAuraUntil','도발의 오라','⬢','#8eb39e','GUARD',false,72);
  addTimed(a,p,'dashboost','_dashBoostUntil','윈드 워커','➤','#93df73','DASH BOOST',false,58);
  addTimed(a,p,'hawk','_hawkUntil','매 떼','➳','#a4dc7d','SUMMON',false,55);
  if((p.shield||0)>1)a.push({id:'shield',k:'shield',name:'보호막',icon:'⬡',col:'#9ad9ef',meta:`SHIELD ${Math.round(p.shield)}`,rem:999,pct:100,priority:78,shield:true});
  a.sort((x,y)=>y.priority-x.priority||x.rem-y.rem);
  return a.slice(0,8);
}
function renderBuffs(){
  if(!g||!['play','chest'].includes(state)){holder.classList.add('hidden');return}
  const p=typeof localPlayer==='function'?localPlayer():null,arr=collect(p);
  if(!arr.length){holder.classList.add('hidden');rows.innerHTML='';return}
  holder.classList.remove('hidden');
  rows.innerHTML=arr.map(b=>`<div class="buffRow${b.shield?' buffShield':''}" style="--bc:${b.col}"><div class="buffIcon">${b.icon}</div><div class="buffTop"><span class="buffName">${b.name}</span><span class="buffTime">${b.shield?'ACTIVE':fmtTime(b.rem)}</span></div><div class="buffMeta">${b.meta||'BUFF ACTIVE'}</div><div class="buffBar" style="width:${b.pct.toFixed(1)}%"></div></div>`).join('');
}

const oldHud23=hud;
hud=function(){oldHud23();renderBuffs()};

window.NEXUS_BUFFS_V23={build:'0.23',rightHud:true,hostClockSync:true,trackedFields:TIMED_FIELDS.length,partyIndicators:true};
})();
