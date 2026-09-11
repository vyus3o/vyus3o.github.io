/* NEXUS SURVIVAL final runtime QA + 50-stage continuity fixes build 0.18 */
(function(){
'use strict';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

const TRANSIENT_ZERO=[
  '_berserkUltUntil','_bloodlustUntil','_huntUntil','_dashBoostUntil',
  '_hawkUntil','_elementalUntil','_elemUltUntil','_rangerUltUntil',
  '_seraphWingUntil','_guardianUltUntil','_guardianAllyUntil','_tauntAuraUntil',
  '_seraphSanctuaryUntil','_focusReady','_ironWallUntil','_blessUntil',
  '_movingUntil','_voidUltExplodeAt'
];
const TRANSIENT_RESET=[
  '_bloodlustRatio','_bloodlustSpeed','_huntSpeed','_huntCrit','_hawkCount',
  '_hawkTick','_elementalCount','_elementalTick','_elemUltTick',
  '_seraphWingSpeed','_seraphWingReduce','_guardianAllyReduce','_blessCrit',
  '_seraphSanctuaryReduce','_ironWallReduce','_still'
];
function clearPlayerTransient(p){
  if(!p)return;
  for(const k of TRANSIENT_ZERO)p[k]=0;
  for(const k of TRANSIENT_RESET)p[k]=0;
  p._voidUltPoint=null;
  p._smoothDash=null;
  p._dashCarry=null;
  p._dashMove=null;
  p.dashInvulUntil=0;
  if(p.cd&&typeof p.cd==='object')p.cd._tauntEnd=0;
}

if(typeof advanceStage==='function'){
  const prevAdvance16=advanceStage;
  advanceStage=function(){
    const out=prevAdvance16();
    if(g){
      for(const p of Object.values(g.players||{}))clearPlayerTransient(p);
      if(g.n){g.n._fortUntil=0;g.n._guardianUltUntil=0;g.n._springUntil=0;}
      if(Array.isArray(g.raidTelegraphs))g.raidTelegraphs.length=0;
    }
    return out;
  };
}

const DIFF_ELITE={EASY:-.01,NORMAL:0,HARD:.01,NIGHTMARE:.02,HELL:.03};
function legacyEliteProbability(stageIndex,difficulty){
  const first=[.06,.075,.09,.105,.12];
  const p1=Math.max(.035,(first[stageIndex]??.06)+(DIFF_ELITE[difficulty]||0));
  const zone=Math.min(4,Math.floor(stageIndex/10));
  const bonus=[0,.01,.02,.03,.04][zone];
  return p1+(1-p1)*bonus;
}
function targetEliteProbability(stageIndex,difficulty){
  const s=stageIndex+1,zone=Math.min(4,Math.floor(stageIndex/10));
  const base=.055+Math.min(.045,(s-1)*.001);
  return clamp(base+zone*.006+(DIFF_ELITE[difficulty]||0),.035,.14);
}
function promoteToElite16(e,stageIndex){
  const tier=1+Math.min(2,Math.floor(stageIndex/10));
  e.elite=true;e.eliteTier=tier;e.elitePulse=Math.random()*Math.PI*2;
  const mul=2.65+.22*tier;
  e.max*=mul;e.hp=e.max;e.dmg*=1.38+.07*tier;e.spd*=.94;e.r=Math.round(e.r*(1.20+.04*tier));
}
if(typeof spawn==='function'){
  const prevSpawn16=spawn;
  spawn=function(b=false){
    const before=g?.e?.length||0;
    const out=prevSpawn16(b);
    if(b||!g||g.e.length<=before)return out;
    const e=g.e[g.e.length-1];
    if(!e||e.boss||e.elite)return out;
    const oldP=legacyEliteProbability(g.stage||0,diff),target=targetEliteProbability(g.stage||0,diff);
    if(target>oldP){
      const conditional=clamp((target-oldP)/(1-oldP),0,1);
      if(Math.random()<conditional)promoteToElite16(e,g.stage||0);
    }
    return out;
  };
}

function qa(){
  if(window.NEXUS_BUILDCRAFT_V25?.build==='0.25')return {build:'0.18',ok:true,checks:{supersededBy025:true},failed:[]};
  const adv=window.NEXUS_ADV||{};
  const advList=Object.values(adv);
  const baseCounts={warrior:0,archer:0,mage:0,priest:0};
  for(const a of advList)if(a&&a.base in baseCounts)baseCounts[a.base]++;
  const skillCount=advList.reduce((n,a)=>n+Object.keys(a?.skills||{}).length,0);
  const skillShape=advList.every(a=>Object.values(a?.skills||{}).every(s=>
    s&&s.max===3&&Array.isArray(s.lv)&&s.lv.length===3&&typeof s.n==='string'&&typeof s.desc==='string'
  ));
  const ultShape=advList.every(a=>a&&typeof a.ult==='string'&&Number.isFinite(a.ultCd)&&a.ultCd>=60&&a.ultCd<=100);
  const classSplit=Object.values(baseCounts).every(n=>n===2);

  let choiceBase=false,choiceMax=false;
  try{
    const p={cls:'warrior',skills:{},commonLevels:{},advSkills:{},subclass:null};
    const c=makeChoices(p);
    choiceBase=Array.isArray(c)&&c.length===3&&new Set(c.map(x=>x.type+':'+x.id)).size===3;
    p.skills=Object.fromEntries(Object.keys(SK.warrior).map(id=>[id,5]));
    p.commonLevels=Object.fromEntries(Object.keys(COMMON).map(id=>[id,5]));
    p.subclass='berserker';
    p.advSkills=Object.fromEntries(Object.keys(adv.berserker?.skills||{}).map(id=>[id,3]));
    const m=makeChoices(p);
    choiceMax=Array.isArray(m)&&m.length===3&&m.every(x=>x.type==='endless');
  }catch(e){console.error('[NEXUS QA] choice test failed',e)}

  const fake={
    _rangerUltUntil:99,_voidUltExplodeAt:99,_voidUltPoint:{x:1,y:1},
    _ironWallUntil:99,_blessUntil:99,_smoothDash:{},_dashCarry:{},
    dashInvulUntil:99,cd:{_tauntEnd:4}
  };
  clearPlayerTransient(fake);
  const transientCleanup=fake._rangerUltUntil===0&&fake._voidUltExplodeAt===0&&fake._voidUltPoint===null&&
    fake._ironWallUntil===0&&fake._blessUntil===0&&fake._smoothDash===null&&fake._dashCarry===null&&
    fake.dashInvulUntil===0&&fake.cd._tauntEnd===0;

  const eliteCurve=['EASY','NORMAL','HARD','NIGHTMARE','HELL'].every(d=>{
    let last=0;
    for(let i=0;i<50;i++){
      const p=targetEliteProbability(i,d);
      if(p+1e-9<last||p<.035||p>.1400001)return false;
      last=p;
    }
    return true;
  });

  const checks={
    stages50:Array.isArray(ST)&&ST.length===50&&window.NEXUS_MAX_STAGE===50,
    stageMilestones:!!(ST?.[9]?.boss&&ST?.[29]?.boss&&ST?.[49]?.boss),
    baseSkills60:Object.values(SK||{}).reduce((n,x)=>n+Object.keys(x||{}).length,0)===60,
    advancements8:advList.length===8,
    classSplit2x4:classSplit,
    advancedSkills40:skillCount===40,
    advancedSkillLevels:skillShape,
    ultimates8:ultShape&&typeof window.nexusUseUlt==='function'&&typeof window.nexusUltReady==='function',
    levelChoices3:choiceBase,
    maxBuildFallback:choiceMax,
    transientCleanup,
    eliteCurve50:eliteCurve,
    spawnFix18:window.NEXUS_SPAWN_FIX?.build==='0.18'&&window.NEXUS_SPAWN_FIX?.visibleEdgeSpawn===true&&window.NEXUS_SPAWN_FIX?.watchdog===true,
    multiplayer:typeof netBroadcast==='function'&&typeof netHostMessage==='function'&&typeof netClientMessage==='function',
    combat:typeof updateHost==='function'&&typeof updatePlayers==='function'&&typeof damageEnemy==='function'&&typeof openChest==='function',
    dash:typeof updateClient==='function'&&typeof damagePlayer==='function',
    mobilePortrait:document.querySelector('meta[name="screen-orientation"]')?.content==='portrait'
  };
  const failed=Object.entries(checks).filter(([,v])=>!v).map(([k])=>k);
  const report={build:'0.18',ok:failed.length===0,checks,failed,advancedClasses:advList.length,advancedSkills:skillCount,stages:ST?.length||0,at:Date.now()};
  window.NEXUS_RUNTIME_CHECK=report;
  if(report.ok)console.info('[NEXUS 0.18] QA PASS',report);
  else console.error('[NEXUS 0.18] QA FAIL',report);
  return report;
}
window.NEXUS_RUN_QA=qa;

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',qa,{once:true});else qa();
})();
