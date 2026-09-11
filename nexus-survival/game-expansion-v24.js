/* NEXUS SURVIVAL class + 5P + boss-add expansion build 0.24 */
(function(){
'use strict';
const ADV=window.NEXUS_ADV||{};
const TAU=Math.PI*2;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const pick=a=>a&&a.length?a[(Math.random()*a.length)|0]:null;
const isNewClass=c=>['necromancer','rogue','gunslinger'].includes(c);
const alive=()=>g?Object.values(g.players||{}).filter(p=>p.alive):[];

/* ---------- 3 new base classes ---------- */
C.necromancer={n:'네크로맨서',d:'소환 · 저주 · 지속피해',hp:130,spd:226,dmg:28,rate:.56,rng:405,col:'#8f79ba',icon:'☠'};
C.rogue={n:'도적',d:'근접 · 기동 · 치명타',hp:128,spd:292,dmg:30,rate:.34,rng:145,col:'#77b994',icon:'◆'};
C.gunslinger={n:'총잡이',d:'속사 · 도탄 · 폭발',hp:142,spd:252,dmg:24,rate:.25,rng:520,col:'#d8a76b',icon:'✦'};

SK.necromancer={
 N01:sd('뼈 창','관통하는 뼈 창을 발사합니다.'),N02:sd('부패의 저주','기본 공격이 적에게 지속 피해를 남깁니다.','passive'),N03:sd('해골 소환','해골 병사를 잠시 소환해 자동 공격하게 합니다.'),N04:sd('시체 폭발','강한 적 주변의 사기를 폭발시켜 광역 피해를 줍니다.'),N05:sd('영혼 흡수','적의 영혼을 흡수해 피해를 주고 체력을 회복합니다.'),N06:sd('뼈 갑옷','뼈 갑옷으로 보호막을 얻습니다.'),N07:sd('무덤의 냉기','기본 공격이 적을 둔화합니다.','passive'),N08:sd('망령의 손','여러 적에게 망령 사슬을 뻗습니다.'),N09:sd('어둠의 의식','일정 시간 공격력과 공격속도가 증가합니다.'),N10:sd('역병','저주 지속 피해가 강화됩니다.','passive'),N11:sd('망령 소환','망령이 일정 시간 주기적으로 적을 공격합니다.'),N12:sd('뼈 감옥','적을 느리게 만드는 무덤 영역을 생성합니다.'),N13:sd('영혼 수확','적 처치 시 일정 확률로 체력을 회복합니다.','passive'),N14:sd('죽음의 낙인','강한 적이 받는 피해를 증가시킵니다.'),N15:sd('망자의 군세','짧은 시간 다수의 소환수가 연속 공격합니다.')
};
SK.rogue={
 R01:sd('칼날 부채','주변으로 단검을 뿌려 광역 피해를 줍니다.'),R02:sd('독 바르기','기본 공격이 중독을 부여합니다.','passive'),R03:sd('연막탄','연막 속에서 받는 피해가 감소합니다.'),R04:sd('돌진 베기','적 방향으로 빠르게 파고들며 경로를 베어냅니다.'),R05:sd('기습','일정 횟수마다 기본 공격이 강력한 기습으로 변합니다.','passive'),R06:sd('투척 단검','관통하는 단검을 던집니다.'),R07:sd('회피 본능','받는 피해를 일정 확률로 완전히 회피합니다.','passive'),R08:sd('출혈','기본 공격이 출혈 지속 피해를 남깁니다.','passive'),R09:sd('그림자 이동','강한 적에게 순간이동해 큰 피해를 줍니다.'),R10:sd('칼날 춤','주변 적을 빠르게 연속 베기합니다.'),R11:sd('사냥감 표시','강한 적에게 약점을 표시합니다.'),R12:sd('아드레날린','잠시 이동속도와 공격속도가 증가합니다.'),R13:sd('쇠못 덫','적을 느리게 하고 피해를 주는 덫 영역을 설치합니다.'),R14:sd('처형','체력이 낮은 적에게 추가 피해를 주는 강력한 공격입니다.'),R15:sd('그림자 폭풍','주변을 빠르게 휩쓸며 연속 광역 피해를 줍니다.')
};
SK.gunslinger={
 GS01:sd('더블 탭','기본 사격에 추가 탄환이 따라갑니다.','passive'),GS02:sd('벅샷','전방에 산탄을 넓게 발사합니다.'),GS03:sd('도탄탄','기본 탄환이 주변 적에게 튕깁니다.','passive'),GS04:sd('폭발탄','기본 탄환이 작은 폭발을 일으킵니다.','passive'),GS05:sd('퀵드로','잠시 공격속도가 크게 증가합니다.'),GS06:sd('철갑탄','기본 탄환이 적을 관통합니다.','passive'),GS07:sd('수류탄','목표 지점에 수류탄을 던져 광역 피해를 줍니다.'),GS08:sd('냉각탄','기본 탄환이 적을 둔화합니다.','passive'),GS09:sd('소이탄','주기적으로 화염 폭발탄을 발사합니다.'),GS10:sd('자동 포탑','일정 시간 보조 포탑이 자동 사격합니다.'),GS11:sd('패닝','전방에 연속으로 탄환을 난사합니다.'),GS12:sd('재장전 숙련','기본 공격속도가 증가합니다.','passive'),GS13:sd('대구경 탄환','일정 횟수마다 강력한 탄환을 발사합니다.','passive'),GS14:sd('집속 수류탄','넓은 범위에 연속 폭발을 일으킵니다.'),GS15:sd('불릿 스톰','잠시 자동 사격 빈도가 크게 증가합니다.')
};

/* ---------- 6 new advancements / 30 advanced skills ---------- */
Object.assign(ADV,{
 lich:{base:'necromancer',name:'리치',awaken:'이터널 리치',col:'#a78be3',passive:'저주와 영혼 마법의 피해가 강화되고 보스에게 누적 저주를 남깁니다.',ult:'죽음의 일식',ultCd:78,skills:{
  LI01:{n:'서리 무덤',kind:'active',cd:8,max:3,desc:'냉기와 사령 마법을 폭발시킵니다.',lv:['170% · 둔화','220% · 강한 둔화','275% · 넓은 범위']},LI02:{n:'영혼 사슬',kind:'active',cd:7,max:3,desc:'영혼 사슬이 여러 적을 연쇄 타격합니다.',lv:['4대상 ×90%','6대상 ×100%','8대상 ×115%']},LI03:{n:'죽음의 오라',kind:'active',cd:14,max:3,desc:'주변에 지속 피해를 주는 죽음의 영역을 만듭니다.',lv:['6초','7초 · 범위 증가','8초 · 피해 증가']},LI04:{n:'필락테리',kind:'active',cd:22,max:3,desc:'보호막을 얻고 치명적인 피해를 버틸 힘을 얻습니다.',lv:['보호막 12%','17%','22% + 회복']},LI05:{n:'사령 광선',kind:'active',cd:13,max:3,desc:'긴 직선으로 강력한 사령 광선을 발사합니다.',lv:['420%','560%','720%']}
 }},
 necrolord:{base:'necromancer',name:'네크로 로드',awaken:'그레이브 오버로드',col:'#7fb080',passive:'소환수가 많을수록 화력이 증가하며 해골 군세 유지시간이 길어집니다.',ult:'망자의 대군세',ultCd:82,skills:{
  NL01:{n:'해골 군단',kind:'active',cd:13,max:3,desc:'추가 해골 병사를 소환합니다.',lv:['3체 · 8초','4체 · 9초','5체 · 10초']},NL02:{n:'뼈 골렘',kind:'active',cd:16,max:3,desc:'거대한 뼈 골렘이 강한 적을 공격합니다.',lv:['6초','8초 · 강타 강화','10초 · 광역 강타']},NL03:{n:'어둠의 명령',kind:'active',cd:15,max:3,desc:'소환수 공격속도와 피해를 강화합니다.',lv:['6초 +15%','7초 +22%','8초 +30%']},NL04:{n:'무덤의 파도',kind:'active',cd:10,max:3,desc:'지면에서 뼈 파도가 퍼져나갑니다.',lv:['180%','235%','300%']},NL05:{n:'불멸 군세',kind:'active',cd:22,max:3,desc:'모든 소환이 강화되어 집중 공격합니다.',lv:['8초','10초','12초 · 공격 빈도 증가']}
 }},
 assassin:{base:'rogue',name:'어쌔신',awaken:'나이트 어쌔신',col:'#79c5a0',passive:'치명타와 단일 대상 처형에 특화되며 보스에게 추가 피해를 줍니다.',ult:'절명',ultCd:72,skills:{
  AS01:{n:'그림자 찌르기',kind:'active',cd:5.5,max:3,desc:'강한 적에게 순간 접근해 찌릅니다.',lv:['210%','270%','340%']},AS02:{n:'맹독',kind:'passive',cd:0,max:3,desc:'독 피해와 지속시간이 강화됩니다.',lv:['독 +20%','독 +35%','독 +55%']},AS03:{n:'사망 표식',kind:'active',cd:10,max:3,desc:'목표가 받는 피해를 증가시킵니다.',lv:['5초 +10%','6초 +14%','7초 +18%']},AS04:{n:'그림자 분신',kind:'active',cd:15,max:3,desc:'분신이 일정 시간 기본 공격을 보조합니다.',lv:['6초','8초','10초 · 2연타']},AS05:{n:'집행',kind:'active',cd:12,max:3,desc:'체력이 낮은 적에게 치명적인 피해를 줍니다.',lv:['350%','450%','580% · 저체력 1.5배']}
 }},
 shadowdancer:{base:'rogue',name:'섀도우 댄서',awaken:'문라이트 댄서',col:'#8e9ee8',passive:'이동과 회피 후 공격속도가 증가하고 광역 연속 베기에 특화됩니다.',ult:'그림자 난무',ultCd:68,skills:{
  SD01:{n:'칼날 폭풍',kind:'active',cd:7,max:3,desc:'주변을 회전하며 연속 베기합니다.',lv:['95%×3','110%×4','125%×5']},SD02:{n:'그림자 복제',kind:'active',cd:14,max:3,desc:'그림자 분신이 적을 추적 공격합니다.',lv:['6초','8초','10초']},SD03:{n:'은신',kind:'active',cd:16,max:3,desc:'짧은 시간 피해를 크게 줄이고 이동속도가 증가합니다.',lv:['4초','5초','6초']},SD04:{n:'월광 베기',kind:'active',cd:8,max:3,desc:'긴 초승달 검기를 발사합니다.',lv:['200%','260%','330%']},SD05:{n:'밤의 춤',kind:'active',cd:15,max:3,desc:'근처 적들을 연속해서 베어냅니다.',lv:['4회','6회','8회']}
 }},
 desperado:{base:'gunslinger',name:'데스페라도',awaken:'하이 눈',col:'#e5b76f',passive:'공격속도와 이동사격에 특화되며 연속 사격할수록 화력이 안정적으로 상승합니다.',ult:'하이 눈',ultCd:66,skills:{
  DP01:{n:'쌍권총 난사',kind:'active',cd:6,max:3,desc:'목표 방향으로 탄환을 연속 발사합니다.',lv:['6발','8발','10발']},DP02:{n:'퀵 리로드',kind:'active',cd:13,max:3,desc:'잠시 공격속도를 크게 증가시킵니다.',lv:['5초 +18%','6초 +24%','7초 +30%']},DP03:{n:'도탄 광란',kind:'passive',cd:0,max:3,desc:'추가 도탄 횟수를 얻습니다.',lv:['+1','+2','+3']},DP04:{n:'이동 사격',kind:'passive',cd:0,max:3,desc:'이동 중 기본 공격 피해가 증가합니다.',lv:['+8%','+13%','+18%']},DP05:{n:'납탄 폭풍',kind:'active',cd:14,max:3,desc:'전방 넓은 범위에 탄환을 퍼붓습니다.',lv:['12발','16발','20발']}
 }},
 artillerist:{base:'gunslinger',name:'아틸러리스트',awaken:'워머신',col:'#e18461',passive:'폭발·관통 화력에 특화되며 공격속도 대신 한 발의 파괴력을 높입니다.',ult:'전면 포격',ultCd:80,skills:{
  AT01:{n:'중산탄',kind:'active',cd:7,max:3,desc:'강력한 산탄을 전방에 발사합니다.',lv:['7발','9발','11발']},AT02:{n:'로켓탄',kind:'active',cd:9,max:3,desc:'목표 지점에 대형 폭발을 일으킵니다.',lv:['230%','300%','390%']},AT03:{n:'지뢰 지대',kind:'active',cd:13,max:3,desc:'주변에 폭발 지뢰 영역을 설치합니다.',lv:['5초','6초','7초']},AT04:{n:'초중량 철갑탄',kind:'passive',cd:0,max:3,desc:'관통과 보스 피해가 증가합니다.',lv:['보스 +8%','+13%','+20%']},AT05:{n:'집중 포격',kind:'active',cd:16,max:3,desc:'목표 주변에 연속 폭격을 가합니다.',lv:['4회','6회','8회']}
 }});

const ADV_OPTIONS24={warrior:['berserker','guardian'],archer:['ranger','sniper'],mage:['elementalist','warlock'],priest:['seraph','inquisitor'],necromancer:['lich','necrolord'],rogue:['assassin','shadowdancer'],gunslinger:['desperado','artillerist']};
const TRANS24={
 lich:['저주와 지속 피해 강화','보스 대상 영혼 마법 강화','사령 광역 제어 특화'],necrolord:['소환수 유지시간 증가','소환 집중 화력 강화','해골·골렘 군세 특화'],
 assassin:['치명타·처형 피해 강화','보스 단일 화력 강화','그림자 접근 후 폭딜'],shadowdancer:['이동·회피 연계 강화','광역 연속 베기 특화','은신 중 생존력 증가'],
 desperado:['공격속도·도탄 강화','이동사격 화력 강화','연속 사격 유지 특화'],artillerist:['폭발 범위·관통 강화','보스 중화기 피해 강화','느리지만 강력한 한 발']
};

/* ---------- new class combat ---------- */
function advCd(p,id,base,dt){p.cd[id]=(p.cd[id]??Math.random()*base)-dt;if(p.cd[id]<=0){const lv=p.advSkills?.[id]||1;p.cd[id]=Math.max(.35,base*(1-.035*lv));return true}return false}
function nearest(p,r=720){return nearestEnemy(p,r)}
function dmg(p,m=1){return p.dmg*m*((p.atkBuffUntil||0)>g.t?(p.atkBuff||1):1)}
function markWeak(e,mul,life){if(!e)return;e._weakUntil=Math.max(e._weakUntil||0,g.t+life);e._weakMul=Math.max(e._weakMul||0,mul)}

const oldBasic24=doBasicAttack;
doBasicAttack=function(p,t){
 if(!isNewClass(p?.cls))return oldBasic24(p,t);
 if(!p||!t)return;
 let rate=p.rate,base=dmg(p,1),s=p.skills||{};
 if(p.cls==='necromancer'){
  const poison=s.N02?base*(.055+.018*s.N02)*(s.N10?1+.16*s.N10:1):0,slow=s.N07?Math.min(4,s.N07):0;
  proj(p,t.x,t.y,base,{size:6,pierce:0,poison:poison?1+s.N02:0,slow,col:C.necromancer.col,skill:'N-BASIC'});
  if(poison){t.poison=Math.max(t.poison,poison);t.poisonUntil=g.t+3.5+.4*s.N02}
 }else if(p.cls==='rogue'){
  let mult=1;p._rogueHits=(p._rogueHits||0)+1;if(s.R05&&p._rogueHits>=Math.max(3,7-s.R05)){p._rogueHits=0;mult*=1.55+.12*s.R05}
  damageEnemy(t,base*mult,p.id);addFx('slash',p.x,p.y,{r:p.rng+12,col:'#a7d9bc',angle:Math.atan2(t.y-p.y,t.x-p.x)});
  if(s.R02){t.poison=Math.max(t.poison,base*(.04+.015*s.R02));t.poisonUntil=g.t+3.2+.5*s.R02}
  if(s.R08){t.burn=Math.max(t.burn,base*(.045+.015*s.R08));t.burnUntil=g.t+3.4+.45*s.R08}
 }else{
  if(s.GS12)rate*=Math.max(.70,1-.045*s.GS12);
  if((p._quickdrawUntil||0)>g.t||(p._highNoonUntil||0)>g.t)rate*=.68;
  p._gunShots=(p._gunShots||0)+1;let shot=base;if(s.GS13&&p._gunShots%Math.max(3,7-s.GS13)===0)shot*=1.7+.15*s.GS13;
  const extra=s.GS01?1:0,ric=(s.GS03||0)+(p.subclass==='desperado'?(p.advSkills?.DP03||0):0),pierce=s.GS06||0,explode=s.GS04||0,slow=s.GS08||0;
  for(let i=0;i<1+extra;i++)proj(p,t.x,t.y+(i?10:-3),shot*(i?.66:1),{size:i?4:5,pierce:Math.min(3,pierce),ricochet:Math.min(4,ric),explode:Math.min(3,explode),slow:Math.min(3,slow),col:C.gunslinger.col,speed:760,skill:'GS-BASIC'});
 }
 p.at=rate;
};

function runBase24(p,dt){
 if(!p.alive||!isNewClass(p.cls))return;const s=p.skills||{},t=nearest(p,720);let lv;
 if(p.cls==='necromancer'){
  if((lv=s.N01)&&t&&cdReady(p,'N01',3.0,dt))proj(p,t.x,t.y,dmg(p,1+.18*lv),{size:8,pierce:1+lv,col:'#c3b2e8',speed:610,skill:'N01'});
  if((lv=s.N03)&&cdReady(p,'N03',13,dt)){p._skelUntil=g.t+5+lv*1.5;p._skelCount=1+lv;p._skelTick=0;addFx('holyburst',p.x,p.y,{r:80,col:'#8f79ba'})}
  if((lv=s.N04)&&t&&cdReady(p,'N04',7.5,dt))areaDamage(t.x,t.y,75+13*lv,dmg(p,1.35+.28*lv),p.id,{fx:'explosion',col:'#8a6a9f',crit:false});
  if((lv=s.N05)&&t&&cdReady(p,'N05',8,dt)){const dealt=damageEnemy(t,dmg(p,1.25+.22*lv),p.id,{crit:false});healPlayer(p,Math.min(p.max*(.03+.008*lv),dealt*.12));addFx('beam',p.x,p.y,{r:Math.hypot(t.x-p.x,t.y-p.y),r2:5,angle:Math.atan2(t.y-p.y,t.x-p.x),col:'#a58ad0'})}
  if((lv=s.N06)&&cdReady(p,'N06',14,dt)){p.shield=(p.shield||0)+p.max*(.06+.025*lv);addFx('shield',p.x,p.y,{r:48,col:'#b9a6da'})}
  if((lv=s.N08)&&t&&cdReady(p,'N08',8,dt)){let q=t;for(let i=0;i<2+lv&&q;i++){damageEnemy(q,dmg(p,.65+.10*lv),p.id,{crit:false});q=pick(enemiesIn(q.x,q.y,180).filter(e=>e!==q&&!e.dead))}addFx('chain',p.x,p.y,{r:170,col:'#a78ada'})}
  if((lv=s.N09)&&cdReady(p,'N09',16,dt)){p.atkBuff=Math.max(p.atkBuff||1,1+.06+.025*lv);p.atkBuffUntil=g.t+5+lv;p.speedBuff=Math.max(p.speedBuff||1,1.04);p.speedBuffUntil=g.t+5+lv;}
  if((lv=s.N11)&&cdReady(p,'N11',15,dt)){p._wraithUntil=g.t+6+lv;p._wraithTick=0}
  if((lv=s.N12)&&t&&cdReady(p,'N12',12,dt))addZone('time',t.x,t.y,105+15*lv,4+lv*.6,p.id,dmg(p,.13+.025*lv),{col:'#75658e',slow:lv+1});
  if((lv=s.N14)&&t&&cdReady(p,'N14',10,dt)){markWeak(t,.07+.025*lv,5+lv*.5);addFx('judgemark',t.x,t.y,{r:45,col:'#b69ce1'})}
  if((lv=s.N15)&&cdReady(p,'N15',18,dt)){p._armyUntil=g.t+5+lv;p._armyTick=0;addFx('holyburst',p.x,p.y,{r:125,col:'#8068a8'})}
 }else if(p.cls==='rogue'){
  if((lv=s.R01)&&cdReady(p,'R01',5.5,dt)){for(let i=0;i<5+lv*2;i++){const a=i*TAU/(5+lv*2);proj(p,p.x+Math.cos(a)*500,p.y+Math.sin(a)*500,dmg(p,.58+.06*lv),{pierce:1,col:'#8fd0ad',size:4,speed:680,skill:'R01'})}}
  if((lv=s.R03)&&cdReady(p,'R03',14,dt)){p._smokeUntil=g.t+3.5+.6*lv;p.speedBuff=Math.max(p.speedBuff||1,1.08+.02*lv);p.speedBuffUntil=p._smokeUntil;addZone('time',p.x,p.y,115+10*lv,3.5+.6*lv,p.id,0,{col:'#586a63',slow:1})}
  if((lv=s.R04)&&t&&cdReady(p,'R04',7,dt)){const ox=p.x,oy=p.y,a=Math.atan2(t.y-p.y,t.x-p.x),d=100+18*lv;p.x=clamp(p.x+Math.cos(a)*d,25,WORLD.w-25);p.y=clamp(p.y+Math.sin(a)*d,25,WORLD.h-25);lineDamage(ox,oy,p.x,p.y,28,dmg(p,1.1+.22*lv),p.id,{fx:'charge',col:'#83c6a2'})}
  if((lv=s.R06)&&t&&cdReady(p,'R06',3.2,dt))proj(p,t.x,t.y,dmg(p,.95+.17*lv),{pierce:1+Math.floor(lv/2),col:'#b6d8c3',size:5,speed:760,skill:'R06'});
  if((lv=s.R09)&&t&&cdReady(p,'R09',9,dt)){const a=Math.atan2(t.y-p.y,t.x-p.x);p.x=clamp(t.x-Math.cos(a)*45,25,WORLD.w-25);p.y=clamp(t.y-Math.sin(a)*45,25,WORLD.h-25);damageEnemy(t,dmg(p,1.8+.35*lv),p.id);addFx('slash360',t.x,t.y,{r:55,col:'#718fa6'})}
  if((lv=s.R10)&&cdReady(p,'R10',8.5,dt))areaDamage(p.x,p.y,100+10*lv,dmg(p,(.75+.10*lv)*(2+lv)),p.id,{fx:'slash360',col:'#8cc6a7',crit:false});
  if((lv=s.R11)&&t&&cdReady(p,'R11',10,dt)){markWeak(t,.06+.02*lv,5+lv*.5);addFx('mark',t.x,t.y,{r:42,col:'#9ad3af'})}
  if((lv=s.R12)&&cdReady(p,'R12',15,dt)){p.speedBuff=Math.max(p.speedBuff||1,1.12+.025*lv);p.speedBuffUntil=g.t+5+lv;p._rogueHasteUntil=g.t+5+lv}
  if((lv=s.R13)&&cdReady(p,'R13',11,dt))addZone('trap',p.x,p.y,95+10*lv,6,p.id,dmg(p,.40+.08*lv),{col:'#829d89',slow:lv+1,trigger:false});
  if((lv=s.R14)&&t&&cdReady(p,'R14',10,dt)){let m=2.0+.35*lv;if(t.hp/t.max<.28+.02*lv)m*=1.45;damageEnemy(t,dmg(p,m),p.id,{crit:true});addFx('target',t.x,t.y,{r:48,col:'#d9e7dc'})}
  if((lv=s.R15)&&cdReady(p,'R15',15,dt)){for(let i=0;i<3+lv;i++)areaDamage(p.x,p.y,125+8*lv,dmg(p,.52+.06*lv),p.id,{fx:'slash360',col:'#7e9fbd',crit:false})}
 }else{
  if((lv=s.GS02)&&t&&cdReady(p,'GS02',6.5,dt)){const base=Math.atan2(t.y-p.y,t.x-p.x),n=5+lv*2;for(let i=0;i<n;i++){const a=base+(i-(n-1)/2)*.09;proj(p,p.x+Math.cos(a)*600,p.y+Math.sin(a)*600,dmg(p,.40+.045*lv),{pierce:0,col:'#e1b174',size:4,speed:720,skill:'GS02'})}}
  if((lv=s.GS05)&&cdReady(p,'GS05',14,dt)){p._quickdrawUntil=g.t+4+lv;p.atkBuff=Math.max(p.atkBuff||1,1.04+.02*lv);p.atkBuffUntil=g.t+4+lv}
  if((lv=s.GS07)&&t&&cdReady(p,'GS07',8,dt))areaDamage(t.x,t.y,80+12*lv,dmg(p,1.45+.28*lv),p.id,{fx:'explosion',col:'#df8c55',crit:false});
  if((lv=s.GS09)&&t&&cdReady(p,'GS09',7,dt))areaDamage(t.x,t.y,65+8*lv,dmg(p,1.05+.18*lv),p.id,{fx:'explosion',col:'#e77b48',burn:lv});
  if((lv=s.GS10)&&cdReady(p,'GS10',16,dt)){p._turretUntil=g.t+6+lv;p._turretTick=0}
  if((lv=s.GS11)&&t&&cdReady(p,'GS11',8,dt)){const base=Math.atan2(t.y-p.y,t.x-p.x),n=5+lv*2;for(let i=0;i<n;i++){const a=base+(Math.random()-.5)*.15;proj(p,p.x+Math.cos(a)*650,p.y+Math.sin(a)*650,dmg(p,.46+.04*lv),{ricochet:1,col:'#e8bc7a',size:4,speed:800,skill:'GS11'})}}
  if((lv=s.GS14)&&t&&cdReady(p,'GS14',13,dt)){for(let i=0;i<2+lv;i++){const a=i*TAU/(2+lv),x=t.x+Math.cos(a)*50,y=t.y+Math.sin(a)*50;areaDamage(x,y,55+5*lv,dmg(p,.72+.10*lv),p.id,{fx:'explosion',col:'#e28c56',crit:false})}}
  if((lv=s.GS15)&&cdReady(p,'GS15',18,dt)){p._bulletStormUntil=g.t+5+lv;p._bulletStormTick=0;}
 }
}

function runAdv24(p,dt){
 const s=p.advSkills||{},t=nearest(p,900);let lv;
 if(p.subclass==='lich'){
  if((lv=s.LI01)&&advCd(p,'LI01',8,dt))areaDamage(p.x,p.y,120+14*lv,dmg(p,[0,1.7,2.2,2.75][lv]),p.id,{fx:'iceburst',col:'#a9c8e9',slow:lv+1,crit:false});
  if((lv=s.LI02)&&t&&advCd(p,'LI02',7,dt)){let q=t;for(let i=0;i<[0,4,6,8][lv]&&q;i++){damageEnemy(q,dmg(p,[0,.9,1,1.15][lv]),p.id,{crit:false});q=pick(enemiesIn(q.x,q.y,200).filter(e=>e!==q&&!e.dead))}}
  if((lv=s.LI03)&&t&&advCd(p,'LI03',14,dt))addZone('blackhole',t.x,t.y,120+12*lv,5+lv,p.id,dmg(p,[0,.14,.17,.21][lv]),{col:'#785b9c',pull:35,slow:1});
  if((lv=s.LI04)&&advCd(p,'LI04',22,dt)){p.shield=(p.shield||0)+p.max*[0,.12,.17,.22][lv];if(lv===3)healPlayer(p,p.max*.10)}
  if((lv=s.LI05)&&t&&advCd(p,'LI05',13,dt)){const a=Math.atan2(t.y-p.y,t.x-p.x);lineDamage(p.x,p.y,p.x+Math.cos(a)*850,p.y+Math.sin(a)*850,24,dmg(p,[0,4.2,5.6,7.2][lv]),p.id,{fx:'beam',col:'#b99de8',crit:false})}
 }else if(p.subclass==='necrolord'){
  if((lv=s.NL01)&&advCd(p,'NL01',13,dt)){p._skelUntil=g.t+[0,8,9,10][lv];p._skelCount=Math.max(p._skelCount||0,[0,3,4,5][lv]);p._skelTick=0}
  if((lv=s.NL02)&&advCd(p,'NL02',16,dt)){p._golemUntil=g.t+[0,6,8,10][lv];p._golemTick=0;p._golemLv=lv}
  if((lv=s.NL03)&&advCd(p,'NL03',15,dt)){p._summonBuffUntil=g.t+[0,6,7,8][lv];p._summonBuff=[0,1.15,1.22,1.30][lv]}
  if((lv=s.NL04)&&advCd(p,'NL04',10,dt))areaDamage(p.x,p.y,155+15*lv,dmg(p,[0,1.8,2.35,3.0][lv]),p.id,{fx:'quake',col:'#7fa17c',crit:false,slow:lv});
  if((lv=s.NL05)&&advCd(p,'NL05',22,dt)){p._immortalArmyUntil=g.t+[0,8,10,12][lv];p._skelUntil=Math.max(p._skelUntil||0,p._immortalArmyUntil);p._skelCount=Math.max(p._skelCount||0,3+lv)}
 }else if(p.subclass==='assassin'){
  if((lv=s.AS01)&&t&&advCd(p,'AS01',5.5,dt)){const a=Math.atan2(t.y-p.y,t.x-p.x);p.x=clamp(t.x-Math.cos(a)*38,25,WORLD.w-25);p.y=clamp(t.y-Math.sin(a)*38,25,WORLD.h-25);damageEnemy(t,dmg(p,[0,2.1,2.7,3.4][lv]),p.id,{crit:true})}
  if((lv=s.AS03)&&t&&advCd(p,'AS03',10,dt)){markWeak(t,[0,.10,.14,.18][lv],[0,5,6,7][lv]);addFx('target',t.x,t.y,{r:52,col:'#7fd0a3'})}
  if((lv=s.AS04)&&advCd(p,'AS04',15,dt)){p._shadowCloneUntil=g.t+[0,6,8,10][lv];p._shadowCloneTick=0;p._shadowCloneCount=lv===3?2:1}
  if((lv=s.AS05)&&t&&advCd(p,'AS05',12,dt)){let m=[0,3.5,4.5,5.8][lv];if(t.hp/t.max<.30)m*=1.5;damageEnemy(t,dmg(p,m),p.id,{crit:true})}
 }else if(p.subclass==='shadowdancer'){
  if((lv=s.SD01)&&advCd(p,'SD01',7,dt))areaDamage(p.x,p.y,120+12*lv,dmg(p,[0,.95*3,1.10*4,1.25*5][lv]),p.id,{fx:'slash360',col:'#8e9ee8',crit:false});
  if((lv=s.SD02)&&advCd(p,'SD02',14,dt)){p._shadowCloneUntil=g.t+[0,6,8,10][lv];p._shadowCloneTick=0;p._shadowCloneCount=1}
  if((lv=s.SD03)&&advCd(p,'SD03',16,dt)){p._vanishUntil=g.t+[0,4,5,6][lv];p.speedBuff=Math.max(p.speedBuff||1,1.18+.04*lv);p.speedBuffUntil=p._vanishUntil}
  if((lv=s.SD04)&&t&&advCd(p,'SD04',8,dt))proj(p,t.x,t.y,dmg(p,[0,2.0,2.6,3.3][lv]),{size:10,pierce:3,col:'#a8b3f2',speed:720,skill:'SD04'});
  if((lv=s.SD05)&&advCd(p,'SD05',15,dt)){const es=[...g.e].filter(e=>!e.dead).sort((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y)).slice(0,[0,4,6,8][lv]);for(const e of es)damageEnemy(e,dmg(p,.95+.12*lv),p.id,{crit:true});addFx('slash360',p.x,p.y,{r:170,col:'#8999e0'})}
 }else if(p.subclass==='desperado'){
  if((lv=s.DP01)&&t&&advCd(p,'DP01',6,dt)){const n=[0,6,8,10][lv];for(let i=0;i<n;i++)proj(p,t.x+(Math.random()-.5)*45,t.y+(Math.random()-.5)*45,dmg(p,.48+.04*lv),{ricochet:1,col:'#e5b76f',size:4,speed:850,skill:'DP01'})}
  if((lv=s.DP02)&&advCd(p,'DP02',13,dt)){p._quickdrawUntil=g.t+[0,5,6,7][lv];p.atkBuff=Math.max(p.atkBuff||1,1.04+.02*lv);p.atkBuffUntil=p._quickdrawUntil}
  if((lv=s.DP05)&&t&&advCd(p,'DP05',14,dt)){const n=[0,12,16,20][lv],base=Math.atan2(t.y-p.y,t.x-p.x);for(let i=0;i<n;i++){const a=base+(Math.random()-.5)*.42;proj(p,p.x+Math.cos(a)*700,p.y+Math.sin(a)*700,dmg(p,.30+.025*lv),{ricochet:1,col:'#f0c47c',size:3,speed:850,skill:'DP05'})}}
 }else if(p.subclass==='artillerist'){
  if((lv=s.AT01)&&t&&advCd(p,'AT01',7,dt)){const n=[0,7,9,11][lv],base=Math.atan2(t.y-p.y,t.x-p.x);for(let i=0;i<n;i++){const a=base+(i-(n-1)/2)*.08;proj(p,p.x+Math.cos(a)*570,p.y+Math.sin(a)*570,dmg(p,.45+.04*lv),{col:'#e18a62',size:5,speed:700,skill:'AT01'})}}
  if((lv=s.AT02)&&t&&advCd(p,'AT02',9,dt))areaDamage(t.x,t.y,90+12*lv,dmg(p,[0,2.3,3.0,3.9][lv]),p.id,{fx:'meteor',col:'#df7d50',crit:false});
  if((lv=s.AT03)&&advCd(p,'AT03',13,dt))addZone('mine',p.x,p.y,115+10*lv,[0,5,6,7][lv],p.id,dmg(p,.60+.08*lv),{col:'#c97655',trigger:false});
  if((lv=s.AT05)&&t&&advCd(p,'AT05',16,dt)){const n=[0,4,6,8][lv];for(let i=0;i<n;i++){const a=i*TAU/n,r=35+Math.random()*70;areaDamage(t.x+Math.cos(a)*r,t.y+Math.sin(a)*r,58,dmg(p,.72+.06*lv),p.id,{fx:'explosion',col:'#e18461',crit:false})}}
 }
}

const oldRunSkills24=runSkills;
runSkills=function(p,dt){oldRunSkills24(p,dt);runBase24(p,dt);runAdv24(p,dt)};

/* summon/temporary effect tick */
const oldAdvTick24=window.nexusAdvTick;
window.nexusAdvTick=function(dt){oldAdvTick24?.(dt);if(!g||state!=='play')return;for(const p of Object.values(g.players||{})){
 if(!p.alive||!isNewClass(p.cls))continue;
 const summonMul=(p._summonBuffUntil||0)>g.t?(p._summonBuff||1):1;
 if((p._skelUntil||0)>g.t){p._skelTick=(p._skelTick||0)-dt;if(p._skelTick<=0){p._skelTick=(p._immortalArmyUntil||0)>g.t?.38:.58;const count=Math.max(1,p._skelCount||1);for(let i=0;i<count;i++){const t=nearest(p,700);if(!t)break;const a=(g.t*2+i*TAU/count);proj({...p,x:p.x+Math.cos(a)*30,y:p.y+Math.sin(a)*22},t.x,t.y,dmg(p,.33*sumonSafe(summonMul)),{homing:1,col:'#9e91bd',size:4,speed:600,skill:'SUMMON'})}}}
 if((p._wraithUntil||0)>g.t){p._wraithTick=(p._wraithTick||0)-dt;if(p._wraithTick<=0){p._wraithTick=.50;const t=nearest(p,760);if(t)proj(p,t.x,t.y,dmg(p,.55),{homing:1,pierce:1,col:'#b5a2d6',size:5,speed:640,skill:'WRAITH'})}}
 if((p._armyUntil||0)>g.t){p._armyTick=(p._armyTick||0)-dt;if(p._armyTick<=0){p._armyTick=.34;for(let i=0;i<2;i++){const t=pick(g.e.filter(e=>!e.dead));if(t)proj(p,t.x,t.y,dmg(p,.42),{homing:1,col:'#8c76ad',size:4,speed:650,skill:'ARMY'})}}}
 if((p._golemUntil||0)>g.t){p._golemTick=(p._golemTick||0)-dt;if(p._golemTick<=0){p._golemTick=1.05;const t=strongestEnemy(800,p);if(t)areaDamage(t.x,t.y,68,dmg(p,(1.25+.25*(p._golemLv||1))*sumonSafe(summonMul)),p.id,{fx:'quake',col:'#82957b',crit:false})}}
 if((p._shadowCloneUntil||0)>g.t){p._shadowCloneTick=(p._shadowCloneTick||0)-dt;if(p._shadowCloneTick<=0){p._shadowCloneTick=.46;const t=nearest(p,650);if(t)for(let i=0;i<(p._shadowCloneCount||1);i++)damageEnemy(t,dmg(p,.38),p.id,{crit:true})}}
 if((p._turretUntil||0)>g.t){p._turretTick=(p._turretTick||0)-dt;if(p._turretTick<=0){p._turretTick=.36;const t=nearest(p,780);if(t)proj(p,t.x,t.y,dmg(p,.42),{col:'#e4ad67',size:4,speed:820,skill:'TURRET'})}}
 if((p._bulletStormUntil||0)>g.t){p._bulletStormTick=(p._bulletStormTick||0)-dt;if(p._bulletStormTick<=0){p._bulletStormTick=.18;const t=nearest(p,800);if(t)proj(p,t.x+(Math.random()-.5)*60,t.y+(Math.random()-.5)*60,dmg(p,.33),{ricochet:1,col:'#efc174',size:3,speed:900,skill:'BULLETSTORM'})}}
 }};
function sumonSafe(v){return Number.isFinite(v)?v:1}

/* new defensive passives */
const oldDamagePlayer24=damagePlayer;
damagePlayer=function(p,amount){if(p?.cls==='rogue'){const lv=p.skills?.R07||0;if(lv&&Math.random()<.03+.025*lv){addFx('ring',p.x,p.y,{r:32,col:'#90c9a8'});return 0}if((p._smokeUntil||0)>g.t)amount*=.72;if((p._vanishUntil||0)>g.t)amount*=.55}return oldDamagePlayer24(p,amount)};

/* kill sustain for necromancer */
const oldKillEnemy24=killEnemy;
killEnemy=function(e,ownerId){const p=playerById(ownerId);const wasAlive=e&&!e.dead;const out=oldKillEnemy24(e,ownerId);if(wasAlive&&e?.dead&&p?.cls==='necromancer'&&(p.skills?.N13||0)>0&&Math.random()<.10+.03*p.skills.N13)healPlayer(p,p.max*(.008+.003*p.skills.N13));return out};

/* advanced class damage identities */
const oldDamageEnemy24=damageEnemy;
damageEnemy=function(e,amount,ownerId,o={}){const p=playerById(ownerId);if(p?.subclass==='assassin'&&e?.boss)amount*=1.08;if(p?.subclass==='desperado'&&(p._highNoonUntil||0)>g.t)amount*=1.20;if(p?.subclass==='artillerist'&&e?.boss)amount*=1+[0,.08,.13,.20][p.advSkills?.AT04||0];if(p?.subclass==='lich'&&e?.boss)amount*=1.06;return oldDamageEnemy24(e,amount,ownerId,o)};

/* ---------- 14 advancement choices, including multiplayer ---------- */
function advModal24(){let m=document.getElementById('advancementModal');if(m)return m;m=document.createElement('div');m.id='advancementModal';m.className='modal hidden';m.innerHTML='<div class="modalbox advanceBox"><div class="eyebrow" id="advEyebrow">CLASS ADVANCEMENT</div><div class="modalTitle" id="advTitle">전직 선택</div><div class="modalSub" id="advSub"></div><div id="advCards" class="advanceCards"></div><button id="advContinue" class="rewardBtn hidden">CONTINUE</button><div id="advWait" class="advWait hidden">다른 플레이어의 선택을 기다리는 중...</div></div>';document.getElementById('wrap').appendChild(m);return m}
function applyAdv24(p,id){const a=ADV[id];if(!p||!a||a.base!==p.cls||p.subclass)return false;window.nexusEnsureAdvPlayer?.(p);p.subclass=id;p.advSkills={};p.awakened=false;p.ultReadyAt=0;
 if(id==='berserker'){p.dmg*=1.04;p.max*=.97;p.hp=Math.min(p.hp,p.max)}else if(id==='guardian'){p.max*=1.10;p.hp=Math.min(p.max,p.hp+p.max*.10);p.dmg*=.96}else if(id==='ranger')p.spd*=1.05;else if(id==='sniper'){p.dmg*=1.07;p.rate*=1.06}else if(id==='warlock')p.rng*=1.06;else if(id==='seraph'){p.max*=1.05;p.hp=p.max;p.dmg*=.96}else if(id==='inquisitor')p.dmg*=1.04;
 else if(id==='lich'){p.dmg*=1.05;p.max*=.95;p.hp=Math.min(p.hp,p.max);p.rng*=1.05}else if(id==='necrolord'){p.max*=1.06;p.hp=Math.min(p.max,p.hp+p.max*.08);p.dmg*=.98}else if(id==='assassin'){p.dmg*=1.06;p.crit=Math.min(.55,p.crit+.07);p.max*=.96;p.hp=Math.min(p.hp,p.max)}else if(id==='shadowdancer'){p.spd*=1.06;p.rate*=.95}else if(id==='desperado'){p.rate*=.91;p.dmg*=.98}else if(id==='artillerist'){p.dmg*=1.08;p.rate*=1.08;p.rng*=1.04}
 addFx('holyburst',p.x,p.y,{r:110,col:a.col,life:.75,ownerId:p.id});return true}
function showAdv24(p,client=false){const m=advModal24(),opts=ADV_OPTIONS24[p.cls]||[];m.classList.remove('hidden');$('levelModal').classList.add('hidden');$('chestModal').classList.add('hidden');$('advEyebrow').textContent='STAGE 10 // CLASS ADVANCEMENT';$('advTitle').textContent='전직을 선택하세요';$('advSub').textContent='전직은 되돌릴 수 없습니다. 전용 스킬 슬롯 2개가 해금됩니다.';const cards=$('advCards');cards.innerHTML='';$('advContinue').classList.add('hidden');$('advWait').classList.add('hidden');for(const id of opts){const a=ADV[id],b=document.createElement('button');b.className='advanceCard';b.style.setProperty('--adv-col',a.col);b.innerHTML=`<small>${C[p.cls].n} ADVANCEMENT</small><h2>${a.name}</h2><p class="advPassive"><b>고유 패시브</b><br>${a.passive}</p><p><b>전용 스킬</b><br>${Object.values(a.skills).map(s=>s.n).join(' · ')}</p><div class="transformList">${(TRANS24[id]||[]).map(x=>`<span>${x}</span>`).join('')}</div><strong>STAGE 30 → ${a.awaken} / R ${a.ult}</strong>`;b.onclick=()=>chooseAdv24(id,client);cards.appendChild(b)}}
function chooseAdv24(id,client){const p=localPlayer();if(!p)return;if(client||NET.mode==='client'){NET.hostConn?.open&&NET.hostConn.send({t:'v24AdvChoice',id});$('advCards').innerHTML='';$('advWait').classList.remove('hidden');return}if(!applyAdv24(p,id))return;p._adv24Pending=false;if(NET.mode==='solo')finishAdv24();else checkAdv24()}
function checkAdv24(){const pending=Object.values(g.players).some(p=>p._adv24Pending);if(!pending)finishAdv24();else{const host=localPlayer();if(host&&!host._adv24Pending){$('advCards').innerHTML='';$('advWait').classList.remove('hidden')}}}
function finishAdv24(){advModal24().classList.add('hidden');advanceStage();state='play';if(NET.mode==='host')netBroadcast({t:'v13Resume',state:makeNetState()})}
function beginAdv24(){state='advancement';for(const p of Object.values(g.players)){p._adv24Pending=!p.subclass;if(p.id===g.localId&&!p.subclass)showAdv24(p,false);else if(p._adv24Pending&&NET.mode==='host'){const c=[...NET.conns.values()].find(c=>c.playerId===p.id);if(c?.open)c.send({t:'v24AdvPrompt'})}}if(!Object.values(g.players).some(p=>p._adv24Pending))finishAdv24()}
const oldOpenChest24=openChest;
openChest=function(){if(g&&g.stage+1===10){beginAdv24();return}return oldOpenChest24()};

const oldHostMessage24=netHostMessage;
netHostMessage=function(conn,msg){if(msg?.t==='v24AdvChoice'&&conn?.playerId&&g&&state==='advancement'){const p=playerById(conn.playerId);if(p&&p._adv24Pending&&applyAdv24(p,msg.id)){p._adv24Pending=false;try{conn.send({t:'v24AdvAccepted',id:msg.id})}catch{}checkAdv24()}return}return oldHostMessage24(conn,msg)};
const oldClientMessage24=netClientMessage;
netClientMessage=function(msg){if(msg?.t==='v24AdvPrompt'&&g){state='advancement';showAdv24(localPlayer(),true);return}if(msg?.t==='v24AdvAccepted'){const p=localPlayer();if(p&&!p.subclass)applyAdv24(p,msg.id);return}return oldClientMessage24(msg)};

/* ---------- new ultimates ---------- */
const oldUseUlt24=window.nexusUseUlt;
window.nexusUseUlt=function(p,predicted=false){if(!p||!['lich','necrolord','assassin','shadowdancer','desperado','artillerist'].includes(p.subclass))return oldUseUlt24?.(p,predicted);if(!p.awakened||!g||state!=='play'||(p.ultReadyAt||0)>g.t)return false;const a=ADV[p.subclass];p.ultReadyAt=g.t+a.ultCd;addFx('holyburst',p.x,p.y,{r:predicted?80:135,col:a.col,life:.6,ownerId:p.id,net:!predicted});if(predicted)return true;
 if(p.subclass==='lich'){for(const e of [...g.e])if(!e.dead&&Math.hypot(e.x-p.x,e.y-p.y)<360)damageEnemy(e,dmg(p,e.boss?5.5:7.2),p.id,{crit:false});addZone('blackhole',p.x,p.y,300,7,p.id,dmg(p,.28),{col:'#8d6bc5',pull:80,slow:3})}
 else if(p.subclass==='necrolord'){p._immortalArmyUntil=g.t+10;p._skelUntil=g.t+10;p._skelCount=7;p._skelTick=0;p._golemUntil=g.t+10;p._golemLv=3;p._golemTick=0}
 else if(p.subclass==='assassin'){const t=strongestEnemy(1300,p);if(t){let m=t.boss?12:16;if(t.hp/t.max<.25)m*=1.35;damageEnemy(t,dmg(p,m),p.id,{crit:true});addFx('target',t.x,t.y,{r:90,col:'#8be0b2'})}}
 else if(p.subclass==='shadowdancer'){p._shadowUltUntil=g.t+7;p._vanishUntil=g.t+7;p._shadowCloneUntil=g.t+7;p._shadowCloneCount=3;p._shadowCloneTick=0;for(const e of enemiesIn(p.x,p.y,280))damageEnemy(e,dmg(p,4.2),p.id,{crit:true})}
 else if(p.subclass==='desperado'){p._highNoonUntil=g.t+8;p._quickdrawUntil=g.t+8;p.atkBuff=Math.max(p.atkBuff||1,1.20);p.atkBuffUntil=g.t+8}
 else if(p.subclass==='artillerist'){const targets=[...g.e].filter(e=>!e.dead).slice(0,12);for(let i=0;i<12;i++){const t=targets[i%Math.max(1,targets.length)]||{x:p.x+(Math.random()-.5)*500,y:p.y+(Math.random()-.5)*400};const a=i*TAU/12,r=45+Math.random()*100;areaDamage(t.x+Math.cos(a)*r,t.y+Math.sin(a)*r,75,dmg(p,.85),p.id,{fx:'meteor',col:'#e18461',crit:false})}}
 return true};

/* ---------- 5-player networking ---------- */
PARTY[5]=[2.55,1.88,3.25];
const oldAccept24=netAccept;
netAccept=function(conn){if(NET.conns.size>=4){conn.on('open',()=>conn.send({t:'full'}));return}conn.on('data',msg=>netHostMessage(conn,msg));conn.on('close',()=>{const pid=conn.playerId;if(pid){delete NET.lobby[pid];delete NET.inputs[pid]}NET.conns.delete(conn.peer);netBroadcastLobby()});conn.on('error',()=>{});NET.conns.set(conn.peer,conn)};
const joinHost24=netHostMessage;
netHostMessage=function(conn,msg){if(msg?.t==='join'&&!conn?.playerId){const used=new Set(Object.keys(NET.lobby));const pid=['p2','p3','p4','p5'].find(x=>!used.has(x));if(!pid){conn.send({t:'full'});return}conn.playerId=pid;NET.lobby[pid]={id:pid,cls:msg.cls||'warrior',name:'PLAYER '+pid.slice(1)};NET.inputs[pid]={};conn.send({t:'welcome',id:pid,room:NET.roomCode,lobby:NET.lobby,diff:typeof diff!=='undefined'?diff:'NORMAL'});netBroadcastLobby();return}return joinHost24(conn,msg)};
const oldRing24=playerRingColor;
playerRingColor=function(id){if(id==='p5')return '#74f0c4';return oldRing24(id)};

/* 5P enemy health and boss health are above 4P, but sublinear to avoid runaway TTK. */
const oldSpawn24=spawn;
spawn=function(b=false){const before=g?.e?.length||0,out=oldSpawn24(b);if(!g||partyCount()!==5||g.e.length<=before)return out;for(let i=before;i<g.e.length;i++){const e=g.e[i];if(!e||e._v24FiveScaled)continue;e._v24FiveScaled=true;const m=e.boss?1.18:1.12;e.max*=m;e.hp*=m;e.dmg*=e.boss?1.02:1.01}return out};
const oldInvest24=investNexus;
investNexus=function(){if(!g||partyCount()!==5)return oldInvest24();const lv=g.n.lv,out=oldInvest24();if(g.n.lv>lv)g.n.next=Math.round(g.n.next*(2.42/2.15));return out};

/* ---------- boss stays accompanied by continuously spawning minions ---------- */
const oldUpdateHost24=updateHost;
updateHost=function(dt){const beforeId=g?.nextEnemyId||0,out=oldUpdateHost24(dt);if(!g||state!=='play')return out;
 if(partyCount()===5&&g.nextEnemyId>beforeId&&!g.boss)g.spawn*=.92;
 if(g.boss){
  g._bossAddCd=(g._bossAddCd??1.25)-dt;
  const adds=g.e.filter(e=>!e.dead&&!e.boss).length,pc=partyCount(),zone=Math.floor((g.stage||0)/10),cap=12+pc*2+zone*2;
  const dmul={EASY:1.18,NORMAL:1,HARD:.92,NIGHTMARE:.84,HELL:.77}[diff]||1;
  const interval=Math.max(.62,(1.55-zone*.08-(pc-1)*.055)*dmul);
  if(g._bossAddCd<=0&&adds<cap){spawn(false);g._bossAddCd=interval}
 }else g._bossAddCd=1.25;
 return out};

/* ---------- new player silhouettes ---------- */
const oldDrawPlayer24=drawPlayer;
drawPlayer=function(p,isLocal=false){if(!isNewClass(p?.cls))return oldDrawPlayer24(p,isLocal);shadow(p.x,p.y,38);ctx.save();ctx.translate(Math.round(p.x),Math.round(p.y));ctx.scale(p.face||1,1);const b=Math.sin(p.walk||0)*1.5;
 if(p.cls==='necromancer'){rect(-11,-6+b,22,28,'#3f3853');rect(-9,-19+b,18,13,'#b9aa91');rect(-14,-22+b,28,7,'#261f34');rect(-9,-34+b,18,14,'#342a47');rect(12,-8+b,3,31,'#725d49');ctx.fillStyle='#a58ad0';ctx.beginPath();ctx.arc(14,-17+b,6,0,TAU);ctx.fill();rect(-4,-4+b,8,4,'#75639a')}
 else if(p.cls==='rogue'){rect(-10,-7+b,20,27,'#263a31');rect(-9,-19+b,18,13,'#9f8874');polyR24([[-13,-17+b],[0,-29+b],[13,-17+b],[9,-6+b],[-9,-6+b]],'#1e3129');rect(-14,4+b,7,16,'#1d2924');rect(7,4+b,7,16,'#1d2924');rect(10,-5+b,3,24,'#b8c7c0');rect(-13,-3+b,3,21,'#b8c7c0')}
 else{rect(-11,-7+b,22,28,'#574536');rect(-9,-20+b,18,14,'#b39372');rect(-14,-23+b,28,6,'#332920');rect(-14,5+b,7,16,'#3a332d');rect(7,5+b,7,16,'#3a332d');rect(10,-4+b,15,4,'#c8c0ad');rect(-25,-2+b,15,4,'#c8c0ad');rect(20,-6+b,5,8,'#6a4c35');rect(-25,-4+b,5,8,'#6a4c35')}
 ctx.restore();ctx.strokeStyle=playerRingColor(p.id);ctx.lineWidth=isLocal?2:1;ctx.globalAlpha=isLocal?1:.75;ctx.beginPath();ctx.arc(p.x,p.y+9,isLocal?25:22,0,TAU);ctx.stroke();ctx.globalAlpha=1;if(p.shield>0){ctx.strokeStyle='#c6efff99';ctx.beginPath();ctx.arc(p.x,p.y-2,31,0,TAU);ctx.stroke()}ctx.font='10px sans-serif';ctx.textAlign='center';ctx.fillStyle='#ffffffcc';ctx.fillText(`${C[p.cls]?.n||p.cls} Lv.${p.l||1}`,p.x,p.y-35)};
function polyR24(points,c){ctx.fillStyle=c;ctx.beginPath();points.forEach((q,i)=>i?ctx.lineTo(q[0],q[1]):ctx.moveTo(q[0],q[1]));ctx.closePath();ctx.fill()}

/* refresh class menu after extending C/SK */
if(state==='menu')menu();
window.NEXUS_EXPANSION_V24={build:'0.24',baseClasses:7,advancements:14,newBaseClasses:['necromancer','rogue','gunslinger'],newAdvancements:['lich','necrolord','assassin','shadowdancer','desperado','artillerist'],maxPlayers:5,bossAdds:true,bossAddCap:'12 + party*2 + biome*2'};
})();
