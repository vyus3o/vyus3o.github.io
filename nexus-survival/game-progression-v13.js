/* NEXUS SURVIVAL 50-stage progression, balance, advancement and R ult input build 0.13 */
(function(){
'use strict';
const TAU=Math.PI*2;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const shuffle=a=>{a=[...a];for(let i=a.length-1;i>0;i--){const j=(Math.random()*(i+1))|0;[a[i],a[j]]=[a[j],a[i]]}return a};
const ADV=window.NEXUS_ADV||{};
const ADV_OPTIONS={warrior:['berserker','guardian'],archer:['ranger','sniper'],mage:['elementalist','warlock'],priest:['seraph','inquisitor']};
const TRANSFORM={
 berserker:['회전베기에 출혈 성능 추가','출혈 칼날의 지속 피해 강화','광폭화와 처형 계열 시너지 강화'],
 guardian:['방패 돌진과 보호막 계열 강화','철벽·수호진의 파티 보호 성능 강화','넥서스 근처에서 추가 피해 감소'],
 ranger:['다중 사격·도탄 계열 강화','이동 중 공격속도 증가','구르기 직후 2초간 추가 가속'],
 sniper:['저격·관통 계열 보스 화력 강화','거리 300/500 이상에서 피해 보너스','정지 집중으로 치명타 강화'],
 elementalist:['화염·냉기 동시 적중 시 열충격','화염·번개 조합 시 플라즈마 폭발','원소 스킬 상태이상 연계 강화'],
 warlock:['모든 마법 적중으로 비전 스택 축적','20스택에서 다음 전직 스킬 45% 강화','블랙홀·시간·광선 계열 시너지'],
 seraph:['초과 회복량 50%를 보호막으로 변환','치유·보호막·성역 계열 강화','파티 유지력과 넥서스 회복 특화'],
 inquisitor:['낙인 대상 추가 피해','천벌·신성창·심판 계열 강화','보스 낙인 대상에게 추가 피해']
};

/* ---------- 50 stages: 10 stages per biome ---------- */
const THEMES=ST.slice(0,5).map(s=>({...s,enemy:[...s.enemy]}));
const ZONE_NAMES=['붕괴한 평원','저주받은 늪','얼어붙은 폐허','지옥의 요새','공허의 균열'];
const BOSS=[
 ['오우거 대장','쌍도끼 트롤','붉은갈기 전쟁광','고블린 공성대장','바위등 거수','황야의 학살자','강철엄니 오우거','평원의 파괴자','폭군 그로막','대군주 크라그'],
 ['역병의 마녀','늪지 포식자','독안개 주술사','부패 골렘','거대 독거미','시체술사 베라','썩은뿌리 거수','독혈의 기사','역병 군주','늪의 여왕 모르가'],
 ['빙결의 거인','서리 해골왕','설원의 맹수','얼음 골렘왕','빙결 마녀','백야의 망령','서리용의 화신','눈보라 군주','빙하 수호자','영원의 빙하왕'],
 ['화염 군주','지옥 사냥개왕','용암 거수','악마 장군','불꽃 마녀','지옥문 수호자','화염의 집행자','용암 폭군','파멸의 대공','지옥 황제 아그니르'],
 ['심연의 군주','공허 추적왕','차원 포식자','심연의 눈','공허 기사단장','균열의 마녀','무형의 거수','공허 대공','심연왕 벨카르','공허신 네라투스']
];
for(let i=0;i<50;i++){
 const zone=Math.min(4,Math.floor(i/10)),within=i%10,base=THEMES[zone];
 ST[i]={...base,enemy:[...base.enemy],name:`${ZONE_NAMES[zone]} · ${within+1}/10`,boss:BOSS[zone][within]};
}
window.NEXUS_MAX_STAGE=50;

if(typeof drawBossLocal==='function'){
 const oldBossDraw13=drawBossLocal;
 drawBossLocal=function(stage,b){return oldBossDraw13(Math.min(4,Math.floor((stage||0)/10)),b)};
}

function ensureP(p){
 if(!p)return p;window.nexusEnsureAdvPlayer?.(p);
 if(!p.commonLevels)p.commonLevels={};if(!p.advSkills)p.advSkills={};if(p.awakened==null)p.awakened=false;if(p.ultReadyAt==null)p.ultReadyAt=0;return p;
}
const oldMakePlayer13=makePlayer;
makePlayer=function(id,c,x,y){return ensureP(oldMakePlayer13(id,c,x,y))};
const oldCreateRun13=createRunFromLobby;
createRunFromLobby=function(){const r=oldCreateRun13();r.maxStage=50;r.balanceVersion=13;r.pendingChestRewards={};r.raidSerial=r.raidSerial||1;for(const p of Object.values(r.players))ensureP(p);return r};

/* ---------- level-up choice limits ---------- */
const oldSkillNext13=skillNextText;
function commonDesc(id){const d={C01:'공격력 +8%',C02:'공격속도 +7%',C03:'공격 사거리 +8%',C04:'최대 체력 +8%',C05:'이동속도 +6%',C06:'치명타 확률 +4.5%',C07:'획득 범위 +16%',C08:'초당 최대 체력 0.25% 재생'};return d[id]||COMMON[id]?.desc||''}
function baseOwnedCount(p){return Object.keys(p.skills||{}).filter(id=>SK[p.cls]?.[id]&&(p.skills[id]||0)>0).length}
function commonOwnedCount(p){return Object.values(p.commonLevels||{}).filter(v=>v>0).length}
function advOwnedCount(p){return Object.values(p.advSkills||{}).filter(v=>v>0).length}
function pickWeighted(list,p,kind){return [...list].sort((a,b)=>{const la=kind==='skill'?(p.skills[a.id]||0):kind==='adv'?(p.advSkills[a.id]||0):(p.commonLevels[a.id]||0),lb=kind==='skill'?(p.skills[b.id]||0):kind==='adv'?(p.advSkills[b.id]||0):(p.commonLevels[b.id]||0);return (Math.random()+lb*.11)-(Math.random()+la*.11)})[0]}
makeChoices=function(p){
 ensureP(p);const out=[];
 const bc=baseOwnedCount(p),cc=commonOwnedCount(p),ac=advOwnedCount(p);
 const base=Object.keys(SK[p.cls]||{}).filter(id=>(p.skills[id]||0)<5&&((p.skills[id]||0)>0||bc<6)).map(id=>({type:'skill',id}));
 const adv=p.subclass?Object.keys(ADV[p.subclass]?.skills||{}).filter(id=>(p.advSkills[id]||0)<3&&((p.advSkills[id]||0)>0||ac<2)).map(id=>({type:'adv',id})):[];
 const common=Object.keys(COMMON).filter(id=>(p.commonLevels[id]||0)<5&&((p.commonLevels[id]||0)>0||cc<6)).map(id=>({type:'common',id}));
 let combat=[...base,...adv];
 if(adv.length&&ac<2&&Math.random()<.58){const a=pickWeighted(adv,p,'adv');if(a)out.push(a);combat=combat.filter(x=>x.id!==a?.id)}
 while(out.length<2&&combat.length){const c=shuffle(combat)[0];out.push(c);combat=combat.filter(x=>x.id!==c.id)}
 if(common.length){const c=pickWeighted(common,p,'common');if(c&&!out.some(x=>x.id===c.id))out.push(c)}
 const refill=shuffle([...base,...adv,...common].filter(c=>!out.some(x=>x.id===c.id)));while(out.length<3&&refill.length)out.push(refill.shift());
 if(!out.length)return shuffle([{type:'endless',id:'E01'},{type:'endless',id:'E02'},{type:'endless',id:'E03'}]);
 if(out.length<3){for(const e of shuffle([{type:'endless',id:'E01'},{type:'endless',id:'E02'},{type:'endless',id:'E03'}])){if(out.length>=3)break;out.push(e)}}
 return shuffle(out).slice(0,3);
};
skillNextText=function(p,id){if(p?.subclass&&ADV[p.subclass]?.skills?.[id]){const d=ADV[p.subclass].skills[id],lv=p.advSkills[id]||0;return lv>=3?'MAX LEVEL':`Lv.${lv+1} → ${d.lv[lv]}`};return oldSkillNext13(p,id)};
showLevelChoices=function(p,choices){
 ensureP(p);choiceOwner=p.id;if(NET.mode==='solo')state='level';$('levelModal').classList.remove('hidden');const box=$('choices');box.innerHTML='';
 for(const o of choices){const b=document.createElement('button');b.className='choice';
  if(o.type==='skill'){const d=skillDef(p.cls,o.id),lv=p.skills[o.id]||0;b.innerHTML=`<small>CLASS SKILL · ${baseOwnedCount(p)}/6 SLOTS</small><h3>${d.n}</h3><div class="lv">CURRENT LV.${lv}</div><p>${d.desc}</p><div class="next">${oldSkillNext13(p,o.id)}</div>`}
  else if(o.type==='adv'){const d=ADV[p.subclass].skills[o.id],lv=p.advSkills[o.id]||0;b.classList.add('advChoice');b.innerHTML=`<small>${ADV[p.subclass].name.toUpperCase()} SKILL · ${advOwnedCount(p)}/2 SLOTS</small><h3>${d.n}</h3><div class="lv">CURRENT LV.${lv} / 3</div><p>${d.desc}</p><div class="next">${lv>=3?'MAX LEVEL':`Lv.${lv+1} → ${d.lv[lv]}`}</div>`}
  else if(o.type==='common'){const d=COMMON[o.id],lv=p.commonLevels[o.id]||0;b.innerHTML=`<small>COMMON · ${commonOwnedCount(p)}/6 SLOTS</small><h3>${d.n}</h3><div class="lv">CURRENT LV.${lv} / 5</div><p>${commonDesc(o.id)}</p><div class="next">선택 즉시 능력치에 적용</div>`}
  else{const m={E01:['전투 숙련','공격력 +3%'],E02:['생명력 증폭','최대 체력 +3% · 즉시 3% 회복'],E03:['넥서스 공명','NEXUS CORE +60']}[o.id];b.innerHTML=`<small>ENDLESS GROWTH</small><h3>${m[0]}</h3><div class="lv">MAX BUILD BONUS</div><p>${m[1]}</p><div class="next">모든 일반 성장 요소가 MAX일 때 반복 선택 가능</div>`}
  b.onclick=()=>selectChoice(o);box.appendChild(b)
 }
};
applyChoice=function(p,o){
 ensureP(p);if(!o)return;
 if(o.type==='skill'){if((p.skills[o.id]||0)<5)p.skills[o.id]=(p.skills[o.id]||0)+1;toast('UPGRADE // '+skillDef(p.cls,o.id).n);return}
 if(o.type==='adv'){const d=ADV[p.subclass]?.skills?.[o.id];if(d&&(p.advSkills[o.id]||0)<3)p.advSkills[o.id]=(p.advSkills[o.id]||0)+1;toast('ADVANCED // '+(d?.n||o.id));return}
 if(o.type==='common'){
  const lv=p.commonLevels[o.id]||0;if(lv>=5)return;p.commonLevels[o.id]=lv+1;
  if(o.id==='C01')p.dmg*=1.08;else if(o.id==='C02')p.rate*=.93;else if(o.id==='C03')p.rng*=1.08;else if(o.id==='C04'){const old=p.max;p.max*=1.08;p.hp=Math.min(p.max,p.hp+(p.max-old))}else if(o.id==='C05')p.spd*=1.06;else if(o.id==='C06')p.crit=Math.min(.55,p.crit+.045);else if(o.id==='C07')p.pickup*=1.16;else if(o.id==='C08')p.regen=Math.min(.02,p.regen+.0025);toast('COMMON // '+COMMON[o.id].n);return
 }
 if(o.type==='endless'){if(o.id==='E01')p.dmg*=1.03;else if(o.id==='E02'){const old=p.max;p.max*=1.03;p.hp=Math.min(p.max,p.hp+(p.max-old)+p.max*.03)}else if(o.id==='E03'){g.n.core+=60}toast('ENDLESS GROWTH');}
};

/* ---------- balanced Nexus growth ---------- */
investNexus=function(){
 const n=g.n;n.resonance=n.resonance||0;
 if(n.lv>=20){n.next=250;n.core+=100;if(n.core>=n.next&&n.resonance<20){n.core-=n.next;n.resonance++;n.max*=1.01;n.hp=Math.min(n.max,n.hp+n.max*.04);for(const p of Object.values(g.players))p.dmg*=1.008;toast('NEXUS RESONANCE '+n.resonance+' // 미세 강화')}else toast('NEXUS CORE +100');return}
 n.core+=100;if(n.core<n.next){toast('NEXUS CORE +100');return}n.core-=n.next;n.lv++;n.next=Math.round((100+(n.lv-1)*55)*({1:1,2:1.45,3:1.85,4:2.15}[partyCount()]||2.15));
 let pool=['wall','turret','regen'];if((n.turret||0)>=8)pool=pool.filter(x=>x!=='turret');if((n.regen||0)>=.012)pool=pool.filter(x=>x!=='regen');const r=pool[(Math.random()*pool.length)|0]||'wall';
 if(r==='wall'){n.max*=1.09;n.hp=Math.min(n.max,n.hp+n.max*.18);toast('NEXUS LV.'+n.lv+' // 외벽 +9%')}else if(r==='turret'){n.turret++;toast('NEXUS LV.'+n.lv+' // 포탑 '+n.turret)}else{n.regen+=.0012;toast('NEXUS LV.'+n.lv+' // 복구 강화')}
};

/* ---------- stage & enemy balance ---------- */
const HP_DIFF={EASY:.78,NORMAL:1,HARD:1.18,NIGHTMARE:1.42,HELL:1.70};
const DMG_DIFF={EASY:.78,NORMAL:1,HARD:1.15,NIGHTMARE:1.32,HELL:1.50};
const PARTY_HP={1:1,2:1.42,3:1.75,4:2.05},PARTY_BOSS={1:1,2:1.48,3:2.02,4:2.55};
const oldSpawn13=spawn;
spawn=function(b=false){
 const before=g?.e?.length||0;oldSpawn13(b);if(!g||g.e.length<=before)return;const e=g.e[g.e.length-1],s=g.stage+1,pc=partyCount();
 if(b||e.boss){let hp=4200*Math.pow(1.068,s-1)*(HP_DIFF[diff]||1)*(PARTY_BOSS[pc]||2.55);const major=s%10===0;if(major)hp*=1.30;if(s===50)hp*=1.25;e.max=hp;e.hp=hp;e.dmg=(24+2.0*(s-1))*(DMG_DIFF[diff]||1)*(major?1.08:1);e.spd=58+Math.min(28,s*.45);e.r=major?54:48;return}
 const type=e.type||0;let hp=(50+type*13+Math.random()*24)*Math.pow(1.038,s-1)*(HP_DIFF[diff]||1)*(PARTY_HP[pc]||2.05);let dmg=(6.5+type*1.25)*(1+.034*(s-1))*(DMG_DIFF[diff]||1);let spd=(72+Math.random()*42)*(1+Math.min(.22,(s-1)*.004));
 if(e.elite){const tier=e.eliteTier||3;hp*=2.65+.22*tier;dmg*=1.38+.07*tier;spd*=.94}
 e.max=hp;e.hp=hp;e.dmg=dmg;e.spd=spd;
};
function stageDuration(){const s=g.stage+1;return 46+Math.floor((s-1)/10)*2+(s%10===0?4:0)}
function spawnFloor(){const s=g.stage+1,base=.62-Math.min(.22,(s-1)*.0045),dm={EASY:1.14,NORMAL:1,HARD:.91,NIGHTMARE:.82,HELL:.74}[diff]||1,pm={1:1,2:.91,3:.83,4:.76}[partyCount()]||.76;return Math.max(.19,base*dm*pm)}

/* ---------- raid patterns mapped to all 50 stages ---------- */
function phaseOf(b){const q=b.hp/Math.max(1,b.max);return q<=.35?3:q<=.70?2:1}
function nearestAlive(b){let best=null,bd=1e9;for(const p of Object.values(g.players)){if(!p.alive||p.pendingLevel||p.levelSafe)continue;const d=Math.hypot(p.x-b.x,p.y-b.y);if(d<bd){bd=d;best=p}}return best}
function addTg(b,t){g.raidTelegraphs=g.raidTelegraphs||[];g.raidSerial=g.raidSerial||1;const tg={id:g.raidSerial++,type:t.type||'circle',x:t.x,y:t.y,angle:t.angle||0,r:t.r||100,inner:t.inner||0,len:t.len||0,width:t.width||0,half:t.half||.45,life:t.delay||1,max:t.delay||1,damage:t.damage||b.dmg, col:t.col||'#ff6655',name:t.name||'DANGER',bossId:b.id,knock:t.knock||55,moveBoss:!!t.moveBoss,endX:t.endX||0,endY:t.endY||0,stage:g.stage};g.raidTelegraphs.push(tg);if(NET.mode==='host')netEmitEvent({k:'raidTelegraph',tg:{...tg}})}
function callout(name,phase){const el=document.getElementById('raidBossCallout');if(el){el.textContent=`PHASE ${phase} // ${name}`;el.classList.add('show');clearTimeout(el._v13t);el._v13t=setTimeout(()=>el.classList.remove('show'),950)}if(NET.mode==='host')netEmitEvent({k:'raidCallout',name,phase})}
function line(b,a,len,width,delay,m,name,col,move=false){addTg(b,{type:'line',x:b.x,y:b.y,angle:a,len,width,delay,damage:b.dmg*m,name,col,knock:72,moveBoss:move,endX:clamp(b.x+Math.cos(a)*len,45,WORLD.w-45),endY:clamp(b.y+Math.sin(a)*len,45,WORLD.h-45)})}
function circle(b,x,y,r,delay,m,name,col){addTg(b,{type:'circle',x,y,r,delay,damage:b.dmg*m,name,col,knock:58})}
function cone(b,a,len,half,delay,m,name,col){addTg(b,{type:'cone',x:b.x,y:b.y,angle:a,len,half,delay,damage:b.dmg*m,name,col,knock:65})}
function donut(b,inner,r,delay,m,name,col){addTg(b,{type:'donut',x:b.x,y:b.y,inner,r,delay,damage:b.dmg*m,name,col,knock:62})}
function castBalancedPattern(b){
 const p=nearestAlive(b);if(!p)return;const phase=phaseOf(b),zone=Math.min(4,Math.floor(g.stage/10)),major=(g.stage+1)%10===0,n=b._v13CastNo||0;b._v13CastNo=n+1;const a=Math.atan2(p.y-b.y,p.x-b.x),delay=Math.max(.78,1.18-zone*.045-(phase-1)*.08-(major?.06:0));
 if(zone===0){if(n%3===0){callout('대지 분쇄',phase);circle(b,b.x,b.y,190+phase*24,delay,1.18,'대지 분쇄','#ff7657')}else if(n%3===1){callout('황야 돌진',phase);line(b,a,570+phase*70,105+phase*10,delay,1.28,'황야 돌진','#ff624c',true)}else{callout('연속 강타',phase);const count=phase+1;for(let i=0;i<count;i++)circle(b,clamp(p.x+(i-(count-1)/2)*135,80,WORLD.w-80),p.y,95,delay+i*.13,1.0,'연속 강타','#ff8b58')}}
 else if(zone===1){if(n%3===0){callout('역병 개화',phase);for(const q of Object.values(g.players).filter(x=>x.alive))circle(b,q.x,q.y,95+phase*8,delay,1.0,'역병 개화','#b9dc52')}else if(n%3===1){callout('부패의 숨결',phase);cone(b,a,500+phase*55,.43+phase*.045,delay,1.18,'부패의 숨결','#b4da4d')}else{callout('죽음의 고리',phase);donut(b,125-phase*10,320+phase*30,delay,1.18,'죽음의 고리','#c7df59')}}
 else if(zone===2){if(n%3===0){callout('빙하 십자',phase);const count=phase===3?6:4;for(let i=0;i<count;i++)line(b,a+i*TAU/count,560+phase*45,72+phase*5,delay,1.08,'빙하 십자','#8eddf5')}else if(n%3===1){callout('빙결 감옥',phase);for(const q of Object.values(g.players).filter(x=>x.alive))circle(b,q.x,q.y,98+phase*5,delay,1.08,'빙결 감옥','#91dff5')}else{callout('절대영도 고리',phase);donut(b,130-phase*12,335+phase*28,delay,1.20,'절대영도 고리','#8eddf5')}}
 else if(zone===3){if(n%3===0){callout('지옥불 운석',phase);const count=3+phase;for(let i=0;i<count;i++)circle(b,clamp(p.x+(Math.random()-.5)*420,75,WORLD.w-75),clamp(p.y+(Math.random()-.5)*420,75,WORLD.h-75),82,delay+i*.09,1.02,'지옥불 운석','#ff7042')}else if(n%3===1){callout('화염 참격',phase);cone(b,a,525+phase*55,.44+phase*.05,delay,1.23,'화염 참격','#ff6840')}else{callout('불타는 전선',phase);for(let i=-1;i<=1;i++){const side=a-Math.PI/2;line(b,a,610,68+phase*5,delay,1.12,'불타는 전선','#ff7b43');if(i!==0){const tg=g.raidTelegraphs[g.raidTelegraphs.length-1];tg.x=b.x+Math.cos(side)*i*140;tg.y=b.y+Math.sin(side)*i*140}}}}
 else{if(n%3===0){callout('공허 부채꼴',phase);const count=phase===3?5:3;for(let i=0;i<count;i++)cone(b,a+i*TAU/count,540+phase*45,.25+phase*.025,delay,1.14,'공허 부채꼴','#b27aff')}else if(n%3===1){callout('심연의 격자',phase);const count=4+phase;for(let i=0;i<count;i++)line(b,i*TAU/count+g.t*.18,590+phase*45,58+phase*5,delay,1.10,'심연의 격자','#a86eff')}else{callout((g.stage===49?'최종 차원 붕괴':'차원 붕괴'),phase);donut(b,105,340+phase*30,delay,1.20,'차원 붕괴','#b371ff');circle(b,p.x,p.y,96+phase*8,delay+.25,1.12,'붕괴 핵','#d084ff');if(g.stage===49&&phase===3){for(let i=0;i<4;i++)line(b,i*Math.PI/2+Math.PI/4,690,66,delay+.42,1.08,'종말의 균열','#d084ff')}}}
 b._v13RaidCd=Math.max(2.85,5.15-phase*.52-zone*.10-(major?.30:0));
}
function raidTick(dt){const b=g?.e?.find(e=>e.boss&&!e.dead);if(!b)return;b._v13RaidCd=(b._v13RaidCd??2.0)-dt;const casting=(g.raidTelegraphs||[]).some(t=>t.bossId===b.id);if(b._v13RaidCd<=0&&!casting)castBalancedPattern(b)}

/* ---------- advancement / awakening UI ---------- */
function modal(){let m=document.getElementById('advancementModal');if(m)return m;m=document.createElement('div');m.id='advancementModal';m.className='modal hidden';m.innerHTML='<div class="modalbox advanceBox"><div class="eyebrow" id="advEyebrow">CLASS ADVANCEMENT</div><div class="modalTitle" id="advTitle">전직 선택</div><div class="modalSub" id="advSub"></div><div id="advCards" class="advanceCards"></div><button id="advContinue" class="rewardBtn hidden">CONTINUE</button><div id="advWait" class="advWait hidden">다른 플레이어의 선택을 기다리는 중...</div></div>';document.getElementById('wrap').appendChild(m);return m}
function applyAdv(p,id){ensureP(p);const a=ADV[id];if(!a||a.base!==p.cls||p.subclass)return false;p.subclass=id;p.advSkills={};p.awakened=false;p.ultReadyAt=0;
 if(id==='berserker'){p.dmg*=1.04;p.max*=.97;p.hp=Math.min(p.hp,p.max)}else if(id==='guardian'){p.max*=1.10;p.hp+=p.max*.10;p.dmg*=.96}else if(id==='ranger')p.spd*=1.05;else if(id==='sniper'){p.dmg*=1.07;p.rate*=1.06}else if(id==='warlock')p.rng*=1.06;else if(id==='seraph'){p.max*=1.05;p.hp=p.max;p.dmg*=.96}else if(id==='inquisitor')p.dmg*=1.04;
 addFx('holyburst',p.x,p.y,{r:110,col:a.col,life:.75,ownerId:p.id});return true}
function showAdvPrompt(p,client=false){ensureP(p);const m=modal(),opts=ADV_OPTIONS[p.cls]||[];m.classList.remove('hidden');$('levelModal').classList.add('hidden');$('chestModal').classList.add('hidden');document.getElementById('advEyebrow').textContent='STAGE 10 // CLASS ADVANCEMENT';document.getElementById('advTitle').textContent='전직을 선택하세요';document.getElementById('advSub').textContent='전직은 되돌릴 수 없습니다. 전용 스킬 슬롯 2개가 해금됩니다.';const cards=document.getElementById('advCards');cards.innerHTML='';document.getElementById('advContinue').classList.add('hidden');document.getElementById('advWait').classList.add('hidden');
 for(const id of opts){const a=ADV[id],b=document.createElement('button');b.className='advanceCard';b.style.setProperty('--adv-col',a.col);b.innerHTML=`<small>${C[p.cls].n} ADVANCEMENT</small><h2>${a.name}</h2><p class="advPassive"><b>고유 패시브</b><br>${a.passive}</p><p><b>전용 스킬</b><br>${Object.values(a.skills).map(s=>s.n).join(' · ')}</p><div class="transformList">${(TRANSFORM[id]||[]).map(x=>`<span>${x}</span>`).join('')}</div><strong>STAGE 30 → ${a.awaken} / R ${a.ult}</strong>`;b.onclick=()=>chooseAdv(id,client);cards.appendChild(b)}
}
function chooseAdv(id,client){const p=localPlayer();if(!p)return;if(client||NET.mode==='client'){if(NET.hostConn?.open)NET.hostConn.send({t:'v13AdvChoice',id});const cards=document.getElementById('advCards');if(cards)cards.innerHTML='';document.getElementById('advWait').classList.remove('hidden');return}if(!applyAdv(p,id))return;p._advPending=false;if(NET.mode==='solo')finishMilestone();else checkAdvDone()}
function checkAdvDone(){if(!g)return;const pending=Object.values(g.players).some(p=>p._advPending);if(!pending)finishMilestone();else{const m=modal();m.classList.remove('hidden');document.getElementById('advCards').innerHTML='';document.getElementById('advWait').classList.remove('hidden')}}
function beginAdvancement(){state='advancement';for(const p of Object.values(g.players)){ensureP(p);p._advPending=!p.subclass;if(p.id===g.localId&&!p.subclass)showAdvPrompt(p,false);else if(p._advPending&&NET.mode==='host'){const conn=[...NET.conns.values()].find(c=>c.playerId===p.id);if(conn?.open)conn.send({t:'v13AdvPrompt'})}}if(!Object.values(g.players).some(p=>p._advPending))finishMilestone()}
function awakenParty(){for(const p of Object.values(g.players)){ensureP(p);if(p.subclass){p.awakened=true;p.ultReadyAt=g.t;p.hp=p.max;p.shield=Math.max(p.shield||0,p.max*.12);addFx('holyburst',p.x,p.y,{r:135,col:ADV[p.subclass].col,life:.9,ownerId:p.id})}}}
function showAwaken(client=false){const p=localPlayer(),a=p?.subclass?ADV[p.subclass]:null,m=modal();m.classList.remove('hidden');document.getElementById('advEyebrow').textContent='STAGE 30 // AWAKENING';document.getElementById('advTitle').textContent=a?`${a.name} → ${a.awaken}`:'CLASS AWAKENING';document.getElementById('advSub').textContent=a?`각성기 해금: R · ${a.ult} / 모바일 ULT 버튼`:'각성기가 해금되었습니다.';const cards=document.getElementById('advCards');cards.innerHTML=a?`<div class="awakenCard" style="--adv-col:${a.col}"><small>ULTIMATE UNLOCKED</small><h2>${a.ult}</h2><p>${a.passive}</p><strong>R 키로 원하는 타이밍에 사용 · 전투 중 시간은 멈추지 않음</strong></div>`:'';const btn=document.getElementById('advContinue');btn.classList.remove('hidden');btn.textContent=client?'READY // 방장 대기':'AWAKEN // STAGE 31 진입';btn.onclick=()=>{if(client){m.classList.add('hidden');document.getElementById('advWait').classList.remove('hidden')}else finishMilestone()};document.getElementById('advWait').classList.add('hidden')}
function beginAwakening(){state='awakening';awakenParty();showAwaken(false);if(NET.mode==='host')netBroadcast({t:'v13AwakenPrompt'})}
function finishMilestone(){modal().classList.add('hidden');advanceStage();state='play';if(NET.mode==='host')netBroadcast({t:'v13Resume',state:makeNetState()})}

/* ---------- boss treasure and stage completion ---------- */
function chestReward(p){ensureP(p);const base=Object.keys(p.skills||{}).filter(id=>SK[p.cls]?.[id]&&(p.skills[id]||0)>0&&(p.skills[id]||0)<5).map(id=>({type:'skill',id}));const adv=Object.keys(p.advSkills||{}).filter(id=>(p.advSkills[id]||0)>0&&(p.advSkills[id]||0)<3).map(id=>({type:'adv',id}));const pool=[...base,...adv];return pool.length?shuffle(pool)[0]:{type:'endless',id:'E01'}}
openChest=function(){
 if(NET.mode==='client')return;const s=g.stage+1;if(s===10){beginAdvancement();return}if(s===30){beginAwakening();return}if(s===50){endGame('STAGE 50 · 공허신 네라투스를 쓰러뜨리고 NEXUS를 지켜냈습니다',true);return}
 state=NET.mode==='solo'?'chest':'play';g.pendingChestRewards={};for(const p of Object.values(g.players))g.pendingChestRewards[p.id]=chestReward(p);const lp=localPlayer(),r=g.pendingChestRewards[lp.id];let title='전투 숙련';if(r.type==='skill')title=skillDef(lp.cls,r.id).n+' 강화';else if(r.type==='adv')title=ADV[lp.subclass].skills[r.id].n+' 강화';$('chestModal').classList.remove('hidden');$('reward').innerHTML=`<b>${s%10===0?'MAJOR BOSS TREASURE':'BOSS TREASURE'}</b><br>${title}<br><small>멀티에서는 각 플레이어가 자신의 빌드에 맞는 보상을 받습니다.</small>`;$('rewardBtn').textContent=s%10===0?'CLAIM MAJOR REWARD // 다음 구역':'CLAIM // 다음 스테이지'
};
$('rewardBtn').onclick=()=>{if(!g)return;$('chestModal').classList.add('hidden');for(const [pid,r] of Object.entries(g.pendingChestRewards||{})){const p=playerById(pid);if(p)applyChoice(p,r)}const s=g.stage+1;if(s===20||s===40)g.n.hp=Math.min(g.n.max,g.n.hp+g.n.max*.08);g.pendingChestRewards={};advanceStage();if(NET.mode==='solo')state='play';if(NET.mode==='host')netBroadcast({t:'v13Resume',state:makeNetState()})};
const oldAdvance13=advanceStage;
advanceStage=function(){oldAdvance13();if(!g)return;g.pendingChestRewards={};g.raidTelegraphs=[];g.raidBossPhase=0;for(const p of Object.values(g.players)){ensureP(p);p._v13StageStart=g.stage;if((g.stage+1)%10===1&&g.stage>0){p.hp=Math.min(p.max,p.hp+p.max*.12)}}};

/* ---------- network state / advancement / ult ---------- */
const oldMakeNet13=makeNetState;
makeNetState=function(){const s=oldMakeNet13();const map=new Map(Object.values(g.players).map(p=>[p.id,p]));for(const d of s.players){const p=map.get(d.id);if(!p)continue;d.subclass=p.subclass||null;d.advSkills={...(p.advSkills||{})};d.commonLevels={...(p.commonLevels||{})};d.awakened=!!p.awakened;d.ultReadyAt=p.ultReadyAt||0;d.arcaneStacks=p.arcaneStacks||0}if(s.n){s.n.resonance=g.n.resonance||0;s.n.next=g.n.next}s.maxStage=50;return s};
const oldApplySnap13=applyNetSnapshot;
applyNetSnapshot=function(s,initial=false){const out=oldApplySnap13(s,initial);if(g)for(const p of Object.values(g.players))ensureP(p);return out};

const oldNetHost13=netHostMessage;
netHostMessage=function(conn,msg){
 if(msg?.t==='v13AdvChoice'&&conn?.playerId&&g&&state==='advancement'){const p=playerById(conn.playerId);if(p&&p._advPending&&applyAdv(p,msg.id)){p._advPending=false;conn.send({t:'v13AdvAccepted',id:msg.id});checkAdvDone()}return}
 if(msg?.t==='v13Ult'&&conn?.playerId&&g&&state==='play'){const p=playerById(conn.playerId);window.nexusUseUlt?.(p,false);return}
 return oldNetHost13(conn,msg)
};
const oldNetClient13=netClientMessage;
netClientMessage=function(msg){
 if(msg?.t==='v13AdvPrompt'){state='advancement';showAdvPrompt(localPlayer(),true);return}
 if(msg?.t==='v13AdvAccepted'){const p=localPlayer();if(p&&!p.subclass)applyAdv(p,msg.id);const cards=document.getElementById('advCards');if(cards)cards.innerHTML='';document.getElementById('advWait')?.classList.remove('hidden');return}
 if(msg?.t==='v13AwakenPrompt'){state='awakening';const p=localPlayer();if(p){ensureP(p);p.awakened=true;p.ultReadyAt=g.t}showAwaken(true);return}
 if(msg?.t==='v13Resume'){modal().classList.add('hidden');$('chestModal').classList.add('hidden');applyNetSnapshot(msg.state,true);state='play';toast('NEXT STAGE // 전투 재개');return}
 return oldNetClient13(msg)
};

function localUlt(){const p=localPlayer();if(!p||!p.awakened||state!=='play')return;if(NET.mode==='client'){if(!window.nexusUltReady?.(p))return;if(window.nexusUseUlt?.(p,true)&&NET.hostConn?.open)NET.hostConn.send({t:'v13Ult'})}else window.nexusUseUlt?.(p,false)}
window.addEventListener('keydown',e=>{if(e.code==='KeyR'&&state==='play'){e.preventDefault();if(!e.repeat)localUlt()}},{passive:false});

/* ---------- HUD / mobile ULT ---------- */
function installUltUi(){if(document.getElementById('ultBtn'))return;const wrap=document.getElementById('wrap');const hud=document.createElement('div');hud.id='ultHud';hud.className='hidden';wrap.appendChild(hud);const btn=document.createElement('button');btn.id='ultBtn';btn.type='button';btn.textContent='ULT';btn.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();localUlt()},{passive:false});wrap.appendChild(btn)}
const oldHud13=hud;
hud=function(){const out=oldHud13();if(!g)return out;installUltUi();const p=localPlayer();if(!p)return out;ensureP(p);if(p.subclass){const a=ADV[p.subclass];$('pname').textContent=(p.awakened?a.awaken:a.name).toUpperCase();const h=document.getElementById('ultHud'),b=document.getElementById('ultBtn');if(p.awakened){const left=Math.max(0,(p.ultReadyAt||0)-g.t);h.classList.remove('hidden');h.textContent=`[R] ${a.ult} · ${left<=0?'READY':left.toFixed(1)+'s'}`;b.classList.add('show');b.style.setProperty('--ult-col',a.col);b.textContent=left<=0?`ULT\n${a.ult}`:`ULT\n${left.toFixed(1)}`;b.disabled=left>0}else{h.classList.add('hidden');b.classList.remove('show')}}else{document.getElementById('ultHud')?.classList.add('hidden');document.getElementById('ultBtn')?.classList.remove('show')}const info=$('enemyInfo');if(info&&!/\/50/.test(info.textContent))info.textContent+=` · STAGE ${g.stage+1}/50`;return out};

/* ---------- update loop: stage duration, spawn cap, class passives, raid ---------- */
const oldUpdateHost13=updateHost;
updateHost=function(dt){
 if(g&&state==='play'){
  const b=g.e?.find(e=>e.boss&&!e.dead);if(b?.raid)b.raid.cd=999;
  if(!g.boss&&g.t>=stageDuration())spawn(true);
 }
 const out=oldUpdateHost13(dt);
 if(g&&state==='play'){
  const b=g.e?.find(e=>e.boss&&!e.dead);if(b?.raid)b.raid.cd=999;
  if(!g.boss)g.spawn=Math.max(g.spawn,spawnFloor());
  window.nexusAdvTick?.(dt);raidTick(dt);
  if(g.e.length>260)g.e.splice(0,g.e.length-260);
 }
 return out
};

installUltUi();
})();
