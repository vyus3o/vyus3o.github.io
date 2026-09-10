/* NEXUS SURVIVAL advancement classes + 40 skills + 8 ultimates build 0.13 */
(function(){
'use strict';
const TAU=Math.PI*2;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const arr=v=>Array.isArray(v)?v:[v];
const pick=a=>a&&a.length?a[(Math.random()*a.length)|0]:null;
const alivePlayers=()=>g?Object.values(g.players).filter(p=>p.alive):[];

const ADV={
 berserker:{base:'warrior',name:'버서커',awaken:'블러드 버서커',col:'#e66c55',passive:'잃은 체력에 비례해 공격력과 공격속도가 증가합니다.',ult:'라그나로크',ultCd:70,skills:{
  BZ01:{n:'피의 회오리',kind:'active',cd:7,max:3,desc:'주변을 연속 베어 광역 피해를 줍니다.',lv:['범위 160 · 105%×3','범위 180 · 120%×3','범위 200 · 130%×4 + 출혈']},
  BZ02:{n:'광전사의 도약',kind:'active',cd:8.5,max:3,desc:'강한 적에게 뛰어들어 착지 충격파를 일으킵니다.',lv:['190% 광역','235% 광역','280% 광역 + 적중당 체력 회복']},
  BZ03:{n:'학살',kind:'active',cd:6.5,max:3,desc:'전방을 여러 번 빠르게 베어냅니다.',lv:['70%×3','78%×4','86%×5 + 마무리 160%']},
  BZ04:{n:'피의 갈증',kind:'active',cd:14,max:3,desc:'잠시 공격속도와 흡혈을 얻습니다.',lv:['5초 · 흡혈 5% · 공속 12%','6초 · 흡혈 7% · 공속 16%','7초 · 흡혈 9% · 공속 20%']},
  BZ05:{n:'처형 연쇄',kind:'active',cd:10,max:3,desc:'약해진 적을 처형하고 다음 적에게 연쇄합니다.',lv:['HP 25% 이하 300%','HP 30% 이하 340% · 1회 연쇄','HP 35% 이하 390% · 최대 2회 연쇄']}
 }},
 guardian:{base:'warrior',name:'가디언',awaken:'이터널 가디언',col:'#8fb5a0',passive:'받는 피해가 감소하고 넥서스 근처에서는 추가로 단단해집니다.',ult:'절대 성벽',ultCd:75,skills:{
  GD01:{n:'방패 폭발',kind:'active',cd:7,max:3,desc:'방패 에너지를 폭발시켜 주변 적을 밀어냅니다.',lv:['150% + 넉백','180% + 강한 넉백','220% + 1.2초 강한 둔화']},
  GD02:{n:'철벽 진형',kind:'active',cd:14,max:3,desc:'잠시 자신과 아군의 피해를 줄입니다.',lv:['5초 · 자신 18% 감소','6초 · 자신 23% 감소','7초 · 자신 28% · 파티 12% 감소']},
  GD03:{n:'수호의 맹세',kind:'active',cd:11,max:3,desc:'가장 위험한 아군에게 보호막을 부여합니다.',lv:['최대 체력 10% 보호막','14% 보호막','18% 보호막 + 자신에게 절반']},
  GD04:{n:'도발의 오라',kind:'active',cd:13,max:3,desc:'주변 적의 시선을 끌고 자신이 받는 피해를 줄입니다.',lv:['5초 · 범위 230','6초 · 범위 270','7초 · 범위 310 · 추가 피해감소 10%']},
  GD05:{n:'최후의 보루',kind:'active',cd:28,max:3,desc:'넥서스를 즉시 수리하고 잠시 보호합니다.',lv:['넥서스 8% 회복','넥서스 11% 회복','넥서스 14% 회복 + 6초 피해 45% 감소']}
 }},
 ranger:{base:'archer',name:'레인저',awaken:'윈드 워커',col:'#8fd36a',passive:'이동 중 공격속도가 증가하며 구르기 직후 추가 가속을 얻습니다.',ult:'천공의 폭풍',ultCd:65,skills:{
  RN01:{n:'폭풍 사격',kind:'active',cd:6.5,max:3,desc:'전방에 다수의 화살을 부채꼴로 발사합니다.',lv:['7발 ×45%','9발 ×50%','11발 ×55% + 관통 1']},
  RN02:{n:'분열 화살',kind:'passive',cd:0,max:3,desc:'기본 공격에 추가 분열 화살이 따라붙습니다.',lv:['추가 화살 1발','추가 화살 2발','추가 화살 3발']},
  RN03:{n:'매 떼',kind:'active',cd:15,max:3,desc:'매를 불러 일정 시간 적을 자동 공격합니다.',lv:['8초 · 매 2마리','9초 · 매 3마리','10초 · 매 4마리']},
  RN04:{n:'사냥의 영역',kind:'active',cd:16,max:3,desc:'잠시 공격속도와 치명타 확률이 증가합니다.',lv:['7초 · 공속 16%','8초 · 공속 22% · 치명 5%','9초 · 공속 28% · 치명 8%']},
  RN05:{n:'끝없는 화살비',kind:'active',cd:13,max:3,desc:'넓은 지역에 장시간 화살비를 퍼붓습니다.',lv:['4초 · 범위 150','5초 · 범위 175','6초 · 범위 205']}
 }},
 sniper:{base:'archer',name:'스나이퍼',awaken:'데드아이',col:'#e0c279',passive:'거리가 멀수록 피해가 증가합니다.',ult:'종말의 한 발',ultCd:80,skills:{
  SN01:{n:'차지 샷',kind:'active',cd:7,max:3,desc:'강력한 관통 사격을 발사합니다.',lv:['260% 관통','330% 관통','410% 관통 · 보스 추가 피해']},
  SN02:{n:'약점 노출',kind:'active',cd:10,max:3,desc:'강한 적의 약점을 드러내 받는 피해를 늘립니다.',lv:['5초 · +12%','6초 · +16%','7초 · +20%']},
  SN03:{n:'관통 저격',kind:'active',cd:8,max:3,desc:'화면을 가르는 장거리 저격을 사용합니다.',lv:['220%','290%','370%']},
  SN04:{n:'집중',kind:'passive',cd:0,max:3,desc:'잠시 움직이지 않으면 치명타와 피해가 증가합니다.',lv:['치명 +12% · 피해 +8%','치명 +18% · 피해 +13%','치명 +25% · 피해 +20%']},
  SN05:{n:'데드아이',kind:'active',cd:14,max:3,desc:'가장 강한 적을 정밀 조준해 큰 피해를 줍니다.',lv:['380%','480%','620% · HP 25% 이하 1.5배']}
 }},
 elementalist:{base:'mage',name:'엘리멘탈리스트',awaken:'아크메이지',col:'#78cfe7',passive:'화염·냉기·번개가 겹치면 원소 반응이 발생합니다.',ult:'원소 대재앙',ultCd:75,skills:{
  EL01:{n:'화염 폭풍',kind:'active',cd:11,max:3,desc:'화염 폭풍을 만들어 지속 피해를 줍니다.',lv:['5초 · 초당 약 70%','6초 · 초당 약 80%','7초 · 초당 약 95% + 화상']},
  EL02:{n:'빙하 폭발',kind:'active',cd:8,max:3,desc:'주변을 얼려 강한 피해와 둔화를 줍니다.',lv:['160% · 둔화','200% · 강한 둔화','245% · 1초 강한 감속']},
  EL03:{n:'천둥장',kind:'active',cd:9,max:3,desc:'주변 적에게 연속 낙뢰를 떨어뜨립니다.',lv:['6회 ×90%','8회 ×95%','10회 ×105%']},
  EL04:{n:'원소 융합',kind:'active',cd:13.5,max:3,desc:'화염·냉기·번개를 한 지점에서 폭발시킵니다.',lv:['250%','310% + 상태이상','380% + 강한 원소 반응']},
  EL05:{n:'대정령 소환',kind:'active',cd:22,max:3,desc:'대정령을 불러 자동으로 원소탄을 발사합니다.',lv:['10초 · 1체','12초 · 1체 · 공속 증가','14초 · 2체']}
 }},
 warlock:{base:'mage',name:'아케인 워록',awaken:'보이드 로드',col:'#a485ee',passive:'마법 적중으로 비전 스택을 쌓고 20스택에서 다음 전직 스킬을 강화합니다.',ult:'사건의 지평선',ultCd:80,skills:{
  AW01:{n:'공허창',kind:'active',cd:6,max:3,desc:'공간을 찢는 공허창을 여러 개 발사합니다.',lv:['190% ×2','220% ×3','260% ×4']},
  AW02:{n:'중력 붕괴',kind:'active',cd:10,max:3,desc:'적을 끌어당기는 중력장을 생성합니다.',lv:['범위 125 · 지속 피해','범위 150 · 흡입 강화','범위 175 · 흡입 강화 + 둔화']},
  AW03:{n:'비전 분열',kind:'active',cd:7,max:3,desc:'추적하는 비전 파편을 다수 발사합니다.',lv:['5개 ×60%','7개 ×65%','9개 ×72%']},
  AW04:{n:'시간 균열',kind:'active',cd:14,max:3,desc:'시간을 늦추는 영역을 생성합니다.',lv:['5초 · 둔화','6초 · 강한 둔화','7초 · 매우 강한 둔화']},
  AW05:{n:'소멸 광선',kind:'active',cd:13,max:3,desc:'거대한 비전 광선으로 직선상의 적을 지웁니다.',lv:['총 480%','총 650%','총 820%']}
 }},
 seraph:{base:'priest',name:'세라핌',awaken:'아크 세라핌',col:'#f0e39a',passive:'초과 회복량 일부를 보호막으로 전환합니다.',ult:'기적',ultCd:90,skills:{
  SE01:{n:'천사의 날개',kind:'active',cd:14,max:3,desc:'파티의 기동성과 생존력을 높입니다.',lv:['6초 · 이동속도 +18%','7초 · +23%','8초 · +28% + 피해감소 10%']},
  SE02:{n:'생명의 샘',kind:'active',cd:18,max:3,desc:'아군을 회복하는 생명의 영역을 생성합니다.',lv:['8초 · 초당 약 1.8%','9초 · 약 2.2%','10초 · 약 2.6% + 넥서스 회복']},
  SE03:{n:'축복',kind:'active',cd:16,max:3,desc:'파티의 공격력과 치명타를 올립니다.',lv:['7초 · 피해 +10%','8초 · 피해 +14%','9초 · 피해 +18% · 치명 +8%']},
  SE04:{n:'대천사의 보호',kind:'active',cd:20,max:3,desc:'파티 전체에 강력한 보호막을 씌웁니다.',lv:['최대 체력 14%','18%','22%']},
  SE05:{n:'천상의 성역',kind:'active',cd:22,max:3,desc:'넓은 성역으로 회복과 피해 감소를 제공합니다.',lv:['8초 · 피해감소 18%','9초 · 22%','10초 · 26%']}
 }},
 inquisitor:{base:'priest',name:'인퀴지터',awaken:'하이 인퀴지터',col:'#f4c85d',passive:'심판의 낙인이 찍힌 적에게 추가 피해를 줍니다.',ult:'최후의 심판',ultCd:75,skills:{
  IQ01:{n:'심판의 검',kind:'active',cd:6,max:3,desc:'전방에 거대한 빛의 검을 내려칩니다.',lv:['200%','255%','320% + 낙인']},
  IQ02:{n:'신성 화형',kind:'active',cd:10,max:3,desc:'신성한 불꽃으로 적을 태웁니다.',lv:['5초 지속','6초 · 피해 증가','7초 · 강한 화상']},
  IQ03:{n:'이단 심문',kind:'active',cd:9,max:3,desc:'강한 적을 구속하고 받는 피해를 늘립니다.',lv:['230% + 5초 약화','290% + 6초 약화','360% + 7초 약화']},
  IQ04:{n:'천벌 연쇄',kind:'active',cd:8,max:3,desc:'여러 적에게 신성한 낙뢰를 연쇄시킵니다.',lv:['4대상 ×105%','6대상 ×115%','8대상 ×130%']},
  IQ05:{n:'최후의 심판',kind:'active',cd:15,max:3,desc:'낙인이 찍힌 모든 적에게 즉시 심판을 내립니다.',lv:['300%','390%','500% · 보스 추가 피해']}
 }}
};
window.NEXUS_ADV=ADV;

function advDef(p,id){return p?.subclass&&ADV[p.subclass]?.skills?.[id]||null}
function ensureAdvPlayer(p){
 if(!p)return p;
 if(!p.advSkills)p.advSkills={};
 if(!p.commonLevels)p.commonLevels={};
 if(!p.arcaneStacks)p.arcaneStacks=0;
 if(p.awakened==null)p.awakened=false;
 if(p.ultReadyAt==null)p.ultReadyAt=0;
 return p;
}
window.nexusEnsureAdvPlayer=ensureAdvPlayer;
function advIds(p){return p?.subclass?Object.keys(ADV[p.subclass]?.skills||{}):[]}
function advCount(p){return Object.values(p?.advSkills||{}).filter(v=>v>0).length}
function advCdReady(p,id,base,dt){p.cd[id]=(p.cd[id]??Math.random()*base)-dt;if(p.cd[id]<=0){const lv=p.advSkills[id]||1;p.cd[id]=Math.max(.5,base*(1-.025*(lv-1)));return true}return false}
function strongest(range=9999,p=localPlayer()){return strongestEnemy(range,p)}
function nearestAt(x,y,range=9999){let best=null,bd=range*range;for(const e of g.e){if(e.dead)continue;const d=(e.x-x)**2+(e.y-y)**2;if(d<bd){bd=d;best=e}}return best}
function advPower(p){if(p.subclass==='warlock'&&p.arcaneStacks>=20){p.arcaneStacks=0;return 1.45}return 1}
function facingPoint(p,len=600){const t=nearestEnemy(p,len);if(t)return{x:t.x,y:t.y};return{x:p.x+(p.face||1)*len,y:p.y}}

const oldDamageEnemy13=damageEnemy;
damageEnemy=function(e,amount,ownerId,o={}){
 const p=playerById(ownerId)||localPlayer();
 if(p)ensureAdvPlayer(p);
 let mul=1,critBonus=0;
 if(p?.subclass==='berserker')mul*=1+Math.min(.28,Math.max(0,1-p.hp/Math.max(1,p.max))*.28);
 if(p?.subclass==='sniper'&&e){const d=Math.hypot(e.x-p.x,e.y-p.y);if(d>=500)mul*=1.22;else if(d>=300)mul*=1.12;if((p.advSkills.SN04||0)>0&&(p._focusReady||0)>g.t)mul*=1+[0,.08,.13,.20][p.advSkills.SN04]}
 if(p?.subclass==='inquisitor'&&e?.markedUntil>g.t)mul*=e.boss?1.15:1.10;
 if(p?.subclass==='berserker'&&(p._berserkUltUntil||0)>g.t)mul*=1.30;
 if(p?._blessUntil>g.t)critBonus=p._blessCrit||0;
 const oldCrit=p?.crit;
 if(p&&critBonus)p.crit=Math.min(.65,p.crit+critBonus);
 const dealt=oldDamageEnemy13(e,amount*mul,ownerId,o);
 if(p&&critBonus)p.crit=oldCrit;
 if(p?.subclass==='warlock'&&dealt>0)p.arcaneStacks=Math.min(20,(p.arcaneStacks||0)+1);
 if(p?.subclass==='berserker'&&(p._bloodlustUntil||0)>g.t&&dealt>0){const ratio=p._bloodlustRatio||.05;healPlayer(p,Math.min(dealt*ratio,p.max*.035))}
 if(p?.subclass==='elementalist'&&e&&!e.dead){
   if(e.burnUntil>g.t&&e.slowUntil>g.t&&(e._thermalReadyAt||0)<=g.t){e._thermalReadyAt=g.t+3;const splash=(p.dmg||20)*.65;for(const q of enemiesIn(e.x,e.y,62))if(q!==e)oldDamageEnemy13(q,splash,p.id,{crit:false});addFx('explosion',e.x,e.y,{r:58,col:'#d9e7ff',life:.28,ownerId:p.id})}
   if((e._advShockUntil||0)>g.t&&e.burnUntil>g.t&&(e._plasmaReadyAt||0)<=g.t){e._plasmaReadyAt=g.t+3.5;for(const q of enemiesIn(e.x,e.y,74))if(q!==e)oldDamageEnemy13(q,(p.dmg||20)*.72,p.id,{crit:false});addFx('lightningStrike',e.x,e.y,{r:50,col:'#ffd079',life:.3,ownerId:p.id})}
 }
 return dealt;
};

const oldDamagePlayer13=damagePlayer;
damagePlayer=function(p,amount){
 if(!p)return oldDamagePlayer13(p,amount);
 ensureAdvPlayer(p);let m=1;
 if(p.subclass==='guardian'){m*=.90;if(g&&Math.hypot(p.x-g.n.x,p.y-g.n.y)<350)m*=.93}
 if((p._ironWallUntil||0)>g.t)m*=1-(p._ironWallReduce||0);
 if((p._guardianAllyUntil||0)>g.t)m*=1-(p._guardianAllyReduce||0);
 if((p._tauntAuraUntil||0)>g.t)m*=.90;
 if((p._seraphWingUntil||0)>g.t)m*=1-(p._seraphWingReduce||0);
 if((p._guardianUltUntil||0)>g.t)m*=.40;
 const before=p.hp;const out=oldDamagePlayer13(p,amount*m);
 if(p.subclass==='berserker'&&(p._berserkUltUntil||0)>g.t&&before>0&&p.hp<=0){p.hp=1;p.alive=true}
 return out;
};

const oldDamageNexus13=damageNexus;
damageNexus=function(amount){
 if(!g)return oldDamageNexus13(amount);let m=1;
 const guardians=alivePlayers().filter(p=>p.subclass==='guardian'&&Math.hypot(p.x-g.n.x,p.y-g.n.y)<380).length;
 if(guardians)m*=1-Math.min(.10,guardians*.05);
 if((g.n._fortUntil||0)>g.t)m*=.55;
 if((g.n._guardianUltUntil||0)>g.t)m*=.30;
 return oldDamageNexus13(amount*m);
};

const oldHeal13=healPlayer;
healPlayer=function(p,amount){
 if(!p)return;const before=p.hp,overflow=Math.max(0,before+amount-p.max);const out=oldHeal13(p,amount);
 if(overflow>0&&g){const seraph=alivePlayers().find(s=>s.subclass==='seraph'&&Math.hypot(s.x-p.x,s.y-p.y)<520);if(seraph)p.shield=Math.min(p.max*.35,(p.shield||0)+overflow*.5)}
 return out;
};

const oldBasic13=doBasicAttack;
doBasicAttack=function(p,t){
 ensureAdvPlayer(p);const rate0=p.rate,crit0=p.crit,dmg0=p.dmg;
 if(p.subclass==='berserker'){const miss=Math.max(0,1-p.hp/Math.max(1,p.max));p.rate*=1-Math.min(.20,miss*.20);if((p._berserkUltUntil||0)>g.t)p.rate*=.68}
 if(p.subclass==='ranger'){if((p._movingUntil||0)>g.t)p.rate*=.88;if((p._dashBoostUntil||0)>g.t)p.rate*=.86;if((p._huntUntil||0)>g.t)p.rate*=1-(p._huntSpeed||0);if((p._rangerUltUntil||0)>g.t)p.rate*=.72}
 if(p.subclass==='sniper'&&(p.advSkills.SN04||0)>0&&(p._focusReady||0)>g.t)p.crit=Math.min(.65,p.crit+[0,.12,.18,.25][p.advSkills.SN04]);
 oldBasic13(p,t);
 if(p.subclass==='ranger'&&(p.advSkills.RN02||0)>0&&t){const n=p.advSkills.RN02,base=Math.atan2(t.y-p.y,t.x-p.x);for(let i=0;i<n;i++){const off=(i-(n-1)/2)*.11+.16*(i%2?1:-1);proj(p,p.x+Math.cos(base+off)*520,p.y+Math.sin(base+off)*520,p.dmg*.34,{pierce:n>=3?1:0,col:'#a9dc7b',size:4,speed:660,skill:'RN02'})}}
 if(p.subclass==='ranger'&&(p._rangerUltUntil||0)>g.t&&t){for(const off of [-.13,.13])proj(p,t.x+Math.cos(Math.atan2(t.y-p.y,t.x-p.x)+off)*20,t.y,p.dmg*.38,{pierce:1,col:'#c8f09b',size:4,speed:720,skill:'RNULT'})}
 if(p.subclass==='berserker'&&p.skills.W06&&t&&t.burnUntil>g.t)t.burn*=1.18;
 p.rate=rate0;p.crit=crit0;p.dmg=dmg0;
};

function runAdvSkills(p,dt){
 ensureAdvPlayer(p);if(!p.alive||!p.subclass)return;const s=p.advSkills,t=nearestEnemy(p,720);let lv,boost;
 if(p.subclass==='berserker'){
  if((lv=s.BZ01)&&advCdReady(p,'BZ01',7,dt)){const r=[0,160,180,200][lv],hits=lv===3?4:3,per=[0,1.05,1.20,1.30][lv],b=advPower(p);addFx('slash360',p.x,p.y,{r,col:'#e66c55',life:.45,ownerId:p.id});for(const e of enemiesIn(p.x,p.y,r)){damageEnemy(e,p.dmg*per*hits*b,p.id,{crit:false});if(lv===3){e.burn=Math.max(e.burn,p.dmg*.12);e.burnUntil=g.t+4}}}
  if((lv=s.BZ02)&&t&&advCdReady(p,'BZ02',8.5,dt)){const b=advPower(p),a=Math.atan2(t.y-p.y,t.x-p.x),d=Math.min(150,Math.max(50,Math.hypot(t.x-p.x,t.y-p.y)-40));p.x=clamp(p.x+Math.cos(a)*d,30,WORLD.w-30);p.y=clamp(p.y+Math.sin(a)*d,30,WORLD.h-30);p.tx=p.x;p.ty=p.y;const hit=enemiesIn(p.x,p.y,105);addFx('quake',p.x,p.y,{r:105,col:'#e56c55',life:.4,ownerId:p.id});for(const e of hit)damageEnemy(e,p.dmg*[0,1.9,2.35,2.8][lv]*b,p.id,{crit:false});if(lv===3)healPlayer(p,p.max*.01*Math.min(5,hit.length))}
  if((lv=s.BZ03)&&t&&advCdReady(p,'BZ03',6.5,dt)){const a=Math.atan2(t.y-p.y,t.x-p.x),hits=[0,3,4,5][lv],per=[0,.70,.78,.86][lv],b=advPower(p);for(let i=0;i<hits;i++)lineDamage(p.x,p.y,p.x+Math.cos(a+(i-hits/2)*.08)*210,p.y+Math.sin(a+(i-hits/2)*.08)*210,22,p.dmg*per*b,p.id,{fx:'slash',col:'#ef9a72',crit:false});if(lv===3)lineDamage(p.x,p.y,p.x+Math.cos(a)*245,p.y+Math.sin(a)*245,31,p.dmg*1.6*b,p.id,{fx:'beam',col:'#ffd0a0',crit:false})}
  if((lv=s.BZ04)&&advCdReady(p,'BZ04',14,dt)){p._bloodlustUntil=g.t+[0,5,6,7][lv];p._bloodlustRatio=[0,.05,.07,.09][lv];p._bloodlustSpeed=[0,.12,.16,.20][lv];addFx('warcry',p.x,p.y,{r:90,col:'#d9504e',life:.55,ownerId:p.id})}
  if((lv=s.BZ05)&&t&&advCdReady(p,'BZ05',10,dt)){const threshold=[0,.25,.30,.35][lv],b=advPower(p);let cur=t,chains=lv===1?0:lv===2?1:2;for(let i=0;i<=chains&&cur;i++){const m=cur.hp/cur.max<=threshold?[0,3,3.4,3.9][lv]:[0,1.75,2.0,2.25][lv];damageEnemy(cur,p.dmg*m*b,p.id,{crit:true});addFx('execute',cur.x,cur.y,{r:55,col:'#ff6655',life:.3,ownerId:p.id});cur=cur.dead?nearestAt(cur.x,cur.y,260):null}}
 }
 if(p.subclass==='guardian'){
  if((lv=s.GD01)&&advCdReady(p,'GD01',7,dt)){const hit=enemiesIn(p.x,p.y,150+lv*10);for(const e of hit){damageEnemy(e,p.dmg*[0,1.5,1.8,2.2][lv],p.id,{crit:false});const a=Math.atan2(e.y-p.y,e.x-p.x);e.x+=Math.cos(a)*(35+lv*12);e.y+=Math.sin(a)*(35+lv*12);if(lv===3){e.slow=.42;e.slowUntil=g.t+1.2}}addFx('holyburst',p.x,p.y,{r:170,col:'#9bb7a7',life:.45,ownerId:p.id})}
  if((lv=s.GD02)&&advCdReady(p,'GD02',14,dt)){p._ironWallUntil=g.t+[0,5,6,7][lv];p._ironWallReduce=[0,.18,.23,.28][lv];if(lv===3)for(const a of alivePlayers()){a._guardianAllyUntil=g.t+7;a._guardianAllyReduce=Math.max(a._guardianAllyReduce||0,.12)}addFx('shield',p.x,p.y,{r:150,col:'#a7c5b5',life:.6,ownerId:p.id})}
  if((lv=s.GD03)&&advCdReady(p,'GD03',11,dt)){const target=[...alivePlayers()].sort((a,b)=>a.hp/a.max-b.hp/b.max)[0]||p;target.shield=(target.shield||0)+target.max*[0,.10,.14,.18][lv];if(lv===3&&target!==p)p.shield=(p.shield||0)+p.max*.09;addFx('shield',target.x,target.y,{r:55,col:'#a9c8b6',life:.5,ownerId:p.id})}
  if((lv=s.GD04)&&advCdReady(p,'GD04',13,dt)){const dur=[0,5,6,7][lv],range=[0,230,270,310][lv];p._tauntAuraUntil=g.t+dur;for(const e of enemiesIn(p.x,p.y,range)){e.targetPlayer=p.id;e._advTauntUntil=g.t+dur;e._advTaunter=p.id}addFx('taunt',p.x,p.y,{r:range,col:'#d77d65',life:.55,ownerId:p.id})}
  if((lv=s.GD05)&&advCdReady(p,'GD05',28,dt)){const amt=g.n.max*[0,.08,.11,.14][lv];g.n.hp=Math.min(g.n.max,g.n.hp+amt);addText(g.n.x,g.n.y-65,amt,'heal',false);if(lv===3)g.n._fortUntil=g.t+6;addFx('shield',g.n.x,g.n.y,{r:115,col:'#b7cfb8',life:.65,ownerId:p.id})}
 }
 if(p.subclass==='ranger'){
  if((lv=s.RN01)&&t&&advCdReady(p,'RN01',6.5,dt)){const count=[0,7,9,11][lv],base=Math.atan2(t.y-p.y,t.x-p.x);for(let i=0;i<count;i++){const a=base+(i-(count-1)/2)*.055;proj(p,p.x+Math.cos(a)*650,p.y+Math.sin(a)*650,p.dmg*[0,.45,.50,.55][lv],{pierce:lv===3?1:0,col:'#a9dd78',size:5,speed:720,skill:'RN01'})}addFx('rapid',p.x,p.y,{r:80,col:'#bde990',life:.32,ownerId:p.id})}
  if((lv=s.RN03)&&advCdReady(p,'RN03',15,dt)){p._hawkUntil=g.t+[0,8,9,10][lv];p._hawkCount=[0,2,3,4][lv];p._hawkTick=0;addFx('falcon',p.x,p.y-45,{r:38,col:'#9bd56e',life:.55,ownerId:p.id})}
  if((lv=s.RN04)&&advCdReady(p,'RN04',16,dt)){p._huntUntil=g.t+[0,7,8,9][lv];p._huntSpeed=[0,.16,.22,.28][lv];p._huntCrit=[0,0,.05,.08][lv];addFx('warcry',p.x,p.y,{r:105,col:'#9bd36f',life:.5,ownerId:p.id})}
  if((lv=s.RN05)&&t&&advCdReady(p,'RN05',13,dt))addZone('arrowrain',t.x,t.y,[0,150,175,205][lv],[0,4,5,6][lv],p.id,p.dmg*[0,.24,.27,.31][lv],{col:'#badd84'});
 }
 if(p.subclass==='sniper'){
  if((lv=s.SN01)&&t&&advCdReady(p,'SN01',7,dt)){const a=Math.atan2(t.y-p.y,t.x-p.x),b=advPower(p);lineDamage(p.x,p.y,p.x+Math.cos(a)*850,p.y+Math.sin(a)*850,14+lv*2,p.dmg*[0,2.6,3.3,4.1][lv]*b,p.id,{fx:'beam',col:'#f2d27b',crit:true});if(lv===3&&t.boss&&!t.dead)damageEnemy(t,p.dmg*.65,p.id,{crit:false})}
  if((lv=s.SN02)&&t&&advCdReady(p,'SN02',10,dt)){t.markedUntil=Math.max(t.markedUntil||0,g.t+[0,5,6,7][lv]);t._weakUntil=g.t+[0,5,6,7][lv];t._weakMul=[0,.12,.16,.20][lv];addFx('mark',t.x,t.y,{r:46,col:'#ffcf65',life:.6,ownerId:p.id})}
  if((lv=s.SN03)&&t&&advCdReady(p,'SN03',8,dt)){const a=Math.atan2(t.y-p.y,t.x-p.x);lineDamage(p.x,p.y,p.x+Math.cos(a)*980,p.y+Math.sin(a)*980,10,p.dmg*[0,2.2,2.9,3.7][lv],p.id,{fx:'beam',col:'#fff0a0',crit:false})}
  if((lv=s.SN05)&&t&&advCdReady(p,'SN05',14,dt)){let m=[0,3.8,4.8,6.2][lv];if(lv===3&&t.hp/t.max<.25)m*=1.5;damageEnemy(t,p.dmg*m,p.id,{crit:true});addFx('target',t.x,t.y,{r:62,col:'#ffcb58',life:.42,ownerId:p.id})}
 }
 if(p.subclass==='elementalist'){
  if((lv=s.EL01)&&t&&advCdReady(p,'EL01',11,dt))addZone('firewall',t.x,t.y,125+lv*15,[0,5,6,7][lv],p.id,p.dmg*[0,.27,.31,.36][lv],{col:'#ef7043'});
  if((lv=s.EL02)&&advCdReady(p,'EL02',8,dt))areaDamage(p.x,p.y,120+lv*14,p.dmg*[0,1.6,2.0,2.45][lv],p.id,{fx:'iceburst',col:'#9edff0',slow:lv+1,crit:false});
  if((lv=s.EL03)&&t&&advCdReady(p,'EL03',9,dt)){const count=[0,6,8,10][lv];for(let i=0;i<count;i++){const e=pick(g.e.filter(x=>!x.dead));if(!e)break;e._advShockUntil=g.t+3;g.delayed.push({type:'lightning',x:e.x,y:e.y,time:.10*i,ownerId:p.id,dmg:p.dmg*[0,.9,.95,1.05][lv],r:34,lv})}}
  if((lv=s.EL04)&&t&&advCdReady(p,'EL04',13.5,dt)){const m=[0,2.5,3.1,3.8][lv];areaDamage(t.x,t.y,95+lv*12,p.dmg*m,p.id,{fx:'meteor',col:'#f0a05f',burn:lv,slow:lv,crit:false});for(const e of enemiesIn(t.x,t.y,105+lv*12))e._advShockUntil=g.t+3}
  if((lv=s.EL05)&&advCdReady(p,'EL05',22,dt)){p._elementalUntil=g.t+[0,10,12,14][lv];p._elementalCount=lv===3?2:1;p._elementalTick=0;addFx('elemental',p.x,p.y-40,{r:55,col:'#a7d9ff',life:.7,ownerId:p.id})}
 }
 if(p.subclass==='warlock'){
  if((lv=s.AW01)&&t&&advCdReady(p,'AW01',6,dt)){boost=advPower(p);const count=[0,2,3,4][lv];for(let i=0;i<count;i++)proj(p,t.x+(i-(count-1)/2)*30,t.y,p.dmg*[0,1.9,2.2,2.6][lv]*boost,{pierce:2,col:'#a98aff',size:8,speed:610,skill:'AW01'})}
  if((lv=s.AW02)&&t&&advCdReady(p,'AW02',10,dt)){boost=advPower(p);addZone('blackhole',t.x,t.y,[0,125,150,175][lv],4.5+lv*.4,p.id,p.dmg*[0,.22,.26,.30][lv]*boost,{col:'#9d78d8',pull:95+lv*30,slow:lv})}
  if((lv=s.AW03)&&t&&advCdReady(p,'AW03',7,dt)){boost=advPower(p);const count=[0,5,7,9][lv];for(let i=0;i<count;i++)proj(p,t.x+(Math.random()-.5)*180,t.y+(Math.random()-.5)*180,p.dmg*[0,.60,.65,.72][lv]*boost,{homing:1,col:'#b39aff',size:5,speed:560,skill:'AW03'})}
  if((lv=s.AW04)&&advCdReady(p,'AW04',14,dt)){boost=advPower(p);addZone('time',p.x,p.y,150+lv*16,[0,5,6,7][lv],p.id,0,{col:'#839ee8',slow:lv+2});if(boost>1)addFx('blackhole',p.x,p.y,{r:180,col:'#b186ff',life:.5,ownerId:p.id})}
  if((lv=s.AW05)&&t&&advCdReady(p,'AW05',13,dt)){boost=advPower(p);const a=Math.atan2(t.y-p.y,t.x-p.x);lineDamage(p.x,p.y,p.x+Math.cos(a)*860,p.y+Math.sin(a)*860,26+lv*4,p.dmg*[0,4.8,6.5,8.2][lv]*boost,p.id,{fx:'beam',col:'#c1a8ff',crit:false})}
 }
 if(p.subclass==='seraph'){
  if((lv=s.SE01)&&advCdReady(p,'SE01',14,dt)){for(const a of alivePlayers()){a._seraphWingUntil=g.t+[0,6,7,8][lv];a._seraphWingSpeed=[0,.18,.23,.28][lv];a._seraphWingReduce=lv===3?.10:0}addFx('prayer',p.x,p.y,{r:230,col:'#f4e49a',life:.7,ownerId:p.id})}
  if((lv=s.SE02)&&advCdReady(p,'SE02',18,dt)){addZone('sanctuary',p.x,p.y,145+lv*12,[0,8,9,10][lv],p.id,0,{col:'#e8e1a0',heal:[0,.007,.0085,.010][lv]});if(lv===3)g.n._springUntil=g.t+10}
  if((lv=s.SE03)&&advCdReady(p,'SE03',16,dt)){for(const a of alivePlayers()){a.atkBuff=Math.max(a.atkBuff||1,[0,1.10,1.14,1.18][lv]);a.atkBuffUntil=Math.max(a.atkBuffUntil||0,g.t+[0,7,8,9][lv]);a._blessUntil=g.t+[0,7,8,9][lv];a._blessCrit=lv===3?.08:0}addFx('prayer',p.x,p.y,{r:250,col:'#fff0a3',life:.6,ownerId:p.id})}
  if((lv=s.SE04)&&advCdReady(p,'SE04',20,dt)){for(const a of alivePlayers()){a.shield=(a.shield||0)+a.max*[0,.14,.18,.22][lv];addFx('shield',a.x,a.y,{r:48,col:'#fff0aa',life:.45,ownerId:p.id})}}
  if((lv=s.SE05)&&advCdReady(p,'SE05',22,dt)){const z=addZone('sanctuary',p.x,p.y,190+lv*15,[0,8,9,10][lv],p.id,0,{col:'#f2e7a5',heal:[0,.006,.007,.008][lv]});p._seraphSanctuaryUntil=g.t+[0,8,9,10][lv];p._seraphSanctuaryReduce=[0,.18,.22,.26][lv]}
 }
 if(p.subclass==='inquisitor'){
  if((lv=s.IQ01)&&t&&advCdReady(p,'IQ01',6,dt)){const a=Math.atan2(t.y-p.y,t.x-p.x);lineDamage(p.x,p.y,p.x+Math.cos(a)*300,p.y+Math.sin(a)*300,42,p.dmg*[0,2.0,2.55,3.2][lv],p.id,{fx:'beam',col:'#ffe78a',crit:false});if(lv===3){t.markedUntil=Math.max(t.markedUntil||0,g.t+6);addFx('judgemark',t.x,t.y,{r:42,col:'#ffd75e',life:.5,ownerId:p.id})}}
  if((lv=s.IQ02)&&t&&advCdReady(p,'IQ02',10,dt))addZone('firewall',t.x,t.y,100+lv*10,[0,5,6,7][lv],p.id,p.dmg*[0,.26,.31,.37][lv],{col:'#f1c55c'});
  if((lv=s.IQ03)&&t&&advCdReady(p,'IQ03',9,dt)){damageEnemy(t,p.dmg*[0,2.3,2.9,3.6][lv],p.id,{crit:false});t.markedUntil=Math.max(t.markedUntil||0,g.t+[0,5,6,7][lv]);t._weakUntil=g.t+[0,5,6,7][lv];t._weakMul=[0,.08,.12,.16][lv];addFx('chain',p.x,p.y,{r:Math.hypot(t.x-p.x,t.y-p.y),angle:Math.atan2(t.y-p.y,t.x-p.x),col:'#f3dd8a',life:.35,ownerId:p.id})}
  if((lv=s.IQ04)&&t&&advCdReady(p,'IQ04',8,dt))chainDamage(t,[0,4,6,8][lv],p.dmg*[0,1.05,1.15,1.30][lv],p.id,{col:'#f6df86'});
  if((lv=s.IQ05)&&advCdReady(p,'IQ05',15,dt)){const marked=g.e.filter(e=>!e.dead&&e.markedUntil>g.t);for(const e of marked)damageEnemy(e,p.dmg*[0,3.0,3.9,e.boss?5.75:5.0][lv],p.id,{crit:false});if(marked.length)addFx('judgment',p.x,p.y,{r:220,col:'#ffe674',life:.6,ownerId:p.id})}
 }
}

const oldRunSkills13=runSkills;
runSkills=function(p,dt){ensureAdvPlayer(p);oldRunSkills13(p,dt);runAdvSkills(p,dt)};

function advTickPlayer(p,dt){
 ensureAdvPlayer(p);if(!p.alive)return;
 const moved=Math.hypot(p.x-(p._advLastX??p.x),p.y-(p._advLastY??p.y));
 if(moved>1.2)p._movingUntil=g.t+.16;
 if(moved>45&&p.subclass==='ranger')p._dashBoostUntil=g.t+2;
 if(p.subclass==='sniper'&&(p.advSkills.SN04||0)>0){if(moved<.7){p._still=(p._still||0)+dt;if(p._still>=1.1)p._focusReady=g.t+.15}else{p._still=0;p._focusReady=0}}
 if((p._hawkUntil||0)>g.t){p._hawkTick=(p._hawkTick||0)-dt;if(p._hawkTick<=0){p._hawkTick=.52;for(let i=0;i<(p._hawkCount||1);i++){const t=nearestEnemy(p,620);if(t)proj({...p,x:p.x+(i%2?24:-24),y:p.y-42},t.x,t.y,p.dmg*.42,{col:'#a5dd78',size:4,speed:700,skill:'RN03'})}}}
 if((p._elementalUntil||0)>g.t){p._elementalTick=(p._elementalTick||0)-dt;if(p._elementalTick<=0){p._elementalTick=.72;for(let i=0;i<(p._elementalCount||1);i++){const t=pick(g.e.filter(e=>!e.dead));if(t){const cols=['#ef7a4d','#9bdff1','#c0b0ff'],col=cols[((g.t*5+i)|0)%3];proj({...p,x:p.x-28+i*56,y:p.y-36},t.x,t.y,p.dmg*.72,{homing:1,col,size:6,speed:590,skill:'EL05'})}}}}
 if((p._elemUltUntil||0)>g.t){p._elemUltTick=(p._elemUltTick||0)-dt;if(p._elemUltTick<=0){p._elemUltTick=.58;const t=pick(g.e.filter(e=>!e.dead));if(t){const n=((g.t*7)|0)%3,cols=['#ef7449','#9edff2','#b8a4ff'];areaDamage(t.x,t.y,90,p.dmg*1.15,p.id,{fx:n===0?'meteor':n===1?'iceburst':'lightningStrike',col:cols[n],burn:n===0?2:0,slow:n===1?3:0,crit:false});if(n===2)t._advShockUntil=g.t+3}}}}
 if(p._voidUltExplodeAt&&g.t>=p._voidUltExplodeAt){const t=p._voidUltPoint;delete p._voidUltExplodeAt;delete p._voidUltPoint;if(t)areaDamage(t.x,t.y,330,p.dmg*7.0,p.id,{fx:'holyburst',col:'#b083ff',crit:false})}
 if((g.n._springUntil||0)>g.t)g.n.hp=Math.min(g.n.max,g.n.hp+g.n.max*.0007*dt);
 if((p._seraphWingUntil||0)>g.t)p.x=clamp(p.x,25,WORLD.w-25);
 if((p._tauntAuraUntil||0)<=g.t){for(const e of g.e)if(e._advTaunter===p.id&&(e._advTauntUntil||0)<=g.t){e.targetPlayer=null;delete e._advTaunter}}
 p._advLastX=p.x;p._advLastY=p.y;
}
window.nexusAdvTick=function(dt){if(!g||state!=='play')return;for(const p of Object.values(g.players))advTickPlayer(p,dt)};

function ultReady(p){return !!(p&&p.awakened&&p.alive&&g&&state==='play'&&(p.ultReadyAt||0)<=g.t)}
function useUlt(p,predicted=false){
 ensureAdvPlayer(p);if(!ultReady(p)||!p.subclass)return false;const a=ADV[p.subclass];p.ultReadyAt=g.t+a.ultCd;
 if(predicted){addFx('holyburst',p.x,p.y,{r:75,col:a.col,life:.4,ownerId:p.id,net:false});return true}
 addFx('holyburst',p.x,p.y,{r:120,col:a.col,life:.65,ownerId:p.id});
 if(p.subclass==='berserker'){p._berserkUltUntil=g.t+8;p._bloodlustUntil=Math.max(p._bloodlustUntil||0,g.t+8);p._bloodlustRatio=Math.max(p._bloodlustRatio||0,.12)}
 else if(p.subclass==='guardian'){for(const q of alivePlayers()){q._guardianUltUntil=g.t+8;q.shield=(q.shield||0)+q.max*.20}g.n._guardianUltUntil=g.t+8}
 else if(p.subclass==='ranger'){p._rangerUltUntil=g.t+7;addZone('arrowrain',p.x,p.y,620,7,p.id,p.dmg*.20,{col:'#b9e887'})}
 else if(p.subclass==='sniper'){const t=strongest(1400,p);if(t){const pct=t.boss?Math.min(t.hp*.02,p.dmg*5):0;damageEnemy(t,p.dmg*14+pct,p.id,{crit:true});addFx('target',t.x,t.y,{r:95,col:'#ffd466',life:.75,ownerId:p.id})}}
 else if(p.subclass==='elementalist'){p._elemUltUntil=g.t+8;p._elemUltTick=0}
 else if(p.subclass==='warlock'){const t=strongest(1200,p)||{x:p.x,y:p.y};p._voidUltPoint={x:t.x,y:t.y};p._voidUltExplodeAt=g.t+6;addZone('blackhole',t.x,t.y,300,6,p.id,p.dmg*.25,{col:'#a178e0',pull:210,slow:4})}
 else if(p.subclass==='seraph'){for(const q of Object.values(g.players)){if(!q.alive){q.alive=true;q.hp=q.max*.35;q.x=p.x+(Math.random()-.5)*100;q.y=p.y+(Math.random()-.5)*100;q.tx=q.x;q.ty=q.y}else q.hp=q.max;q.shield=(q.shield||0)+q.max*.25;addFx('holy',q.x,q.y,{r:65,col:'#fff0aa',life:.6,ownerId:p.id})}g.n.hp=Math.min(g.n.max,g.n.hp+g.n.max*.15)}
 else if(p.subclass==='inquisitor'){for(const e of g.e){if(e.dead)continue;e.markedUntil=Math.max(e.markedUntil||0,g.t+5);damageEnemy(e,p.dmg*(e.boss?4.5:6.0),p.id,{crit:false})}addFx('judgment',p.x,p.y,{r:520,col:'#ffe274',life:.8,ownerId:p.id})}
 toast('ULTIMATE // '+a.ult);return true;
}
window.nexusUseUlt=useUlt;
window.nexusUltReady=ultReady;

const oldDrawPlayer13=drawPlayer;
drawPlayer=function(p,isLocal=false){oldDrawPlayer13(p,isLocal);if(!p?.subclass)return;const a=ADV[p.subclass];ctx.save();ctx.textAlign='center';ctx.font='900 9px Arial';ctx.strokeStyle='#000';ctx.lineWidth=3;const name=p.awakened?a.awaken:a.name;ctx.strokeText(name,p.x,p.y-48);ctx.fillStyle=a.col;ctx.fillText(name,p.x,p.y-48);ctx.restore()};

const oldDrawFx13=drawFx;
drawFx=function(f){if(f.type!=='advAura')return oldDrawFx13(f);const a=Math.max(0,f.life/f.max);ctx.save();ctx.globalAlpha=a;ctx.strokeStyle=f.col;ctx.lineWidth=3;ctx.beginPath();ctx.arc(f.x,f.y,f.r*(1.25-.25*a),0,TAU);ctx.stroke();ctx.restore()};
})();
