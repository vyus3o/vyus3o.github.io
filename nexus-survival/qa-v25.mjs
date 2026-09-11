import puppeteer from 'puppeteer-core';
const base=process.env.NEXUS_QA_URL||'http://127.0.0.1:4173/';
const chrome=process.env.CHROME_BIN||'/usr/bin/google-chrome';
const browser=await puppeteer.launch({headless:true,executablePath:chrome,protocolTimeout:30000,args:['--no-sandbox','--disable-dev-shm-usage','--disable-background-timer-throttling','--disable-renderer-backgrounding']});
const fail=(m,d='')=>{throw new Error(`${m}${d?' :: '+d:''}`)},mark=s=>console.log('V25 QA :: '+s);
async function open(){const p=await browser.newPage(),errors=[];p.on('pageerror',e=>errors.push('pageerror: '+e.message));p.on('console',m=>{if(m.type()==='error'&&!m.text().includes('Failed to load resource'))errors.push('console: '+m.text())});await p.setViewport({width:1280,height:720});await p.goto(base,{waitUntil:'domcontentloaded',timeout:30000});await p.waitForFunction(()=>window.NEXUS_RUNTIME_CHECK?.build==='0.25',{timeout:15000});const qa=await p.evaluate(()=>window.NEXUS_RUNTIME_CHECK);if(!qa.ok)fail('runtime QA',JSON.stringify(qa.failed));return{p,errors}}
try{
 const pack=await open(),p=pack.p;
 const defs=await p.evaluate(()=>({bc:window.NEXUS_BUILDCRAFT_V25,base:Object.fromEntries(Object.entries(SK).map(([k,v])=>[k,Object.keys(v).length])),adv:Object.fromEntries(Object.entries(window.NEXUS_ADV).map(([k,v])=>[k,Object.keys(v.skills||{}).length])),baseMax:Object.values(SK).every(x=>Object.values(x).every(d=>d.max===10)),advMax:Object.values(window.NEXUS_ADV).every(x=>Object.values(x.skills||{}).every(d=>d.max===10))}));
 if(defs.bc.baseSkills<105||defs.bc.advancedSkills<168||defs.bc.synergies<150||!defs.baseMax||!defs.advMax||Object.values(defs.base).some(n=>n<15)||Object.values(defs.adv).some(n=>n<12))fail('skill pool definitions',JSON.stringify(defs));mark(`273+ skill pool PASS base=${defs.bc.baseSkills} adv=${defs.bc.advancedSkills} combos=${defs.bc.synergies}`);

 await p.evaluate(()=>{cls='archer';NET.mode='solo';NET.localId='p1';startRun()});await p.waitForFunction(()=>eval("state==='play'&&localPlayer()?.cls==='archer'"),{timeout:4000});
 const lv10=await p.evaluate(()=>eval(`(()=>{const q=localPlayer();q.skills={A03:0};for(let i=0;i<10;i++)applyChoice(q,{type:'skill',id:'A03'});const baseLv=q.skills.A03;q.subclass='ranger';q.advSkills={RN06:0};for(let i=0;i<10;i++)applyChoice(q,{type:'adv',id:'RN06'});return {baseLv,advLv:q.advSkills.RN06,baseMax:SK.archer.A03.max,advMax:NEXUS_ADV.ranger.skills.RN06.max,nextBase:skillNextText(q,'A03'),nextAdv:skillNextText(q,'RN06')}})()`));
 if(lv10.baseLv!==10||lv10.advLv!==10||lv10.baseMax!==10||lv10.advMax!==10||!lv10.nextBase.includes('MAX')||!lv10.nextAdv.includes('MAX'))fail('level 10 cap',JSON.stringify(lv10));mark('base + advancement Lv.10 PASS');

 const card=await p.evaluate(()=>eval(`(()=>{const q=localPlayer();q.subclass=null;q.skills={A03:1,A07:1};showLevelChoices(q,[{type:'skill',id:'A03'},{type:'skill',id:'A07'},{type:'endless',id:'E01'}]);return document.getElementById('choices').textContent})()`));
 if(!card.includes('폭발 화살비')||!card.includes('ACTIVE'))fail('synergy card text',card);await p.evaluate(()=>document.getElementById('levelModal').classList.add('hidden'));mark('level-up synergy description PASS');

 const rain=await p.evaluate(()=>eval(`(()=>{const q=localPlayer();state='play';q.skills={A03:5,A04:1,A07:1,A08:1,A15:1};q.cd={A03:-1,A15:999};g.e=[];g.zones=[];g.fx=[];g.q=[];g.t=5;spawn(false);const e=g.e.find(x=>!x.boss);e.x=q.x+120;e.y=q.y;const hp=e.hp;runSkills(q,.016);const z=g.zones.find(x=>x.type==='arrowrain');if(!z)return {missing:true};z._v25ComboTick=-1;updateZones(.016);return {flags:[z._v25Explosive,z._v25Poison,z._v25Frost,z._v25Storm],poison:e.poisonUntil>g.t,slow:e.slow<1,hpBefore:hp,hpAfter:e.hp,fx:g.fx.length}})()`));
 if(rain.missing||rain.flags.some(x=>!x)||!rain.poison||!rain.slow||rain.hpAfter>=rain.hpBefore)fail('arrow rain four-way synergy',JSON.stringify(rain));mark('arrow rain explosive/toxic/frost/storm real effects PASS');

 const cross=await p.evaluate(()=>eval(`(()=>{const q=localPlayer();state='play';const result={};const cases=[['warrior',{W01:1,W06:1},'warrior-blood-cyclone'],['mage',{M01:1,M02:1},'mage-plasma'],['priest',{P03:1,P09:1},'priest-blessed-sanctuary'],['necromancer',{N03:1,N04:1},'necro-corpse-legion'],['rogue',{R02:1,R08:1},'rogue-venom-blood'],['gunslinger',{GS03:1,GS04:1},'gun-explosive-ricochet']];for(const [c,skills,id] of cases){q.cls=c;q.skills=skills;q.advSkills={};q.subclass=null;q.cd={};q._v25SynergyCd={[id]:-1};g.e=[];g.zones=[];g.fx=[];g.q=[];spawn(false);const e=g.e.find(x=>!x.boss);e.x=q.x+90;e.y=q.y;const hp=e.hp,sh=q.shield||0;runSkills(q,.016);result[c]={damage:e.hp<hp,fx:g.fx.length,z:g.zones.length,q:g.q.length,shield:(q.shield||0)>sh,summon:(q._v25SummonUntil||0)>g.t}}return result})()`));
 for(const [c,v] of Object.entries(cross))if(!(v.damage||v.fx||v.z||v.q||v.shield||v.summon))fail('cross-class combo '+c,JSON.stringify(v));mark('warrior/mage/priest/necro/rogue/gunslinger combo effects PASS');

 const adv=await p.evaluate(()=>eval(`(()=>{const q=localPlayer();q.cls='mage';q.subclass='warlock';q.skills={};q.advSkills={AW06:10,AW07:10,AW08:10};q.cd={AW06:-1,AW07:-1,AW08:-1};state='play';g.e=[];g.zones=[];g.fx=[];g.q=[];spawn(false);const before={z:g.zones.length,fx:g.fx.length,q:g.q.length,shield:q.shield||0};runSkills(q,.016);return {skills:Object.keys(NEXUS_ADV.warlock.skills).length,z:g.zones.length-before.z,fx:g.fx.length-before.fx,q:g.q.length-before.q,shield:(q.shield||0)-before.shield}})()`));
 if(adv.skills<12||!(adv.z>0||adv.fx>0||adv.q>0||adv.shield>0))fail('new advanced skill combat',JSON.stringify(adv));mark('12-skill advancement combat PASS');

 const choices=await p.evaluate(()=>eval(`(()=>{const q=localPlayer();q.cls='archer';q.subclass='ranger';q.skills={A03:1,A07:1};q.advSkills={RN01:1,RN02:1,RN03:1};const c=makeChoices(q);return {choices:c,advOwned:Object.values(q.advSkills).filter(v=>v>0).length,marker:NEXUS_BUILDCRAFT_V25}})()`));
 if(choices.advOwned!==3||choices.marker.advSlots!==3||choices.choices.length!==3)fail('3 advanced slots / choices',JSON.stringify(choices));mark('3 advanced skill slots + weighted choices PASS');

 if(pack.errors.length)fail('browser errors',pack.errors.join(' | '));
 console.log('PASS v25: Lv10 / 273 skills / 150+ synergies / real combo effects / 3 advancement slots');
 console.log('6/6 focused v25 groups passed');
 await p.close();
}finally{await browser.close().catch(()=>{})}