import puppeteer from 'puppeteer-core';
const base=process.env.NEXUS_QA_URL||'http://127.0.0.1:4173/';
const chrome=process.env.CHROME_BIN||'/usr/bin/google-chrome';
const browser=await puppeteer.launch({headless:true,executablePath:chrome,args:['--no-sandbox','--disable-dev-shm-usage','--disable-background-timer-throttling','--disable-renderer-backgrounding']});
const page=await browser.newPage();
await page.setViewport({width:1280,height:720,deviceScaleFactor:1});
const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&!m.text().includes('Failed to load resource'))errors.push(m.text())});
const fail=(m,d='')=>{throw new Error(`${m}${d?` :: ${d}`:''}`)};
try{
 await page.goto(base,{waitUntil:'domcontentloaded',timeout:30000});
 await page.waitForFunction(()=>window.NEXUS_RUNTIME_CHECK?.build==='0.26',{timeout:12000});
 const runtime=await page.evaluate(()=>window.NEXUS_RUNTIME_CHECK);if(!runtime.ok)fail('runtime QA',JSON.stringify(runtime.failed));
 const dps=await page.evaluate(()=>eval(`(()=>{const classes=['warrior','archer','mage','priest','necromancer','rogue','gunslinger'],out={};for(const c of classes){cls=c;diff='NORMAL';g=createRunFromLobby();state='play';g.stage=0;const p=localPlayer();p.skills={};p.advSkills={};p.crit=0;p.x=1200;p.y=900;const e={id:999,x:1280,y:900,r:18,hp:99999,max:99999,spd:0,dmg:0,boss:false,dead:false,cd:99,type:0,anim:0,slow:1,slowUntil:0,dotTick:99,markedUntil:0,poison:0,poisonUntil:0,burn:0,burnUntil:0,targetPlayer:null};g.e=[e];g.q=[];g.fx=[];g.text=[];const h=e.hp;doBasicAttack(p,e);for(let i=0;i<30;i++)updateProjectiles(1/60);out[c]={dealt:h-e.hp,rate:p.at,dps:(h-e.hp)/Math.max(.01,p.at),fx:g.fx.map(x=>x.type)};}return out})()`));
 const vals=Object.values(dps).map(x=>x.dps),min=Math.min(...vals),max=Math.max(...vals);if(min<68||max/min>1.42)fail('class opening DPS spread',JSON.stringify(dps));
 if(!dps.rogue.fx.includes('rogueslash26'))fail('rogue slash VFX missing',JSON.stringify(dps.rogue));
 console.log('PASS v26:opening-dps',JSON.stringify(dps));
 const diffCheck=await page.evaluate(()=>eval(`(()=>{cls='mage';g=createRunFromLobby();state='play';g.stage=0;const p=localPlayer();p.skills={};p.crit=0;p.x=1200;p.y=900;function hit(d){diff=d;const e={id:1001,x:1280,y:900,r:18,hp:99999,max:99999,spd:0,dmg:0,boss:false,dead:false,cd:99,type:0,anim:0,slow:1,slowUntil:0,dotTick:99,markedUntil:0,poison:0,poisonUntil:0,burn:0,burnUntil:0};g.e=[e];g.q=[];const h=e.hp;doBasicAttack(p,e);for(let i=0;i<30;i++)updateProjectiles(1/60);return h-e.hp}return {easy:hit('EASY'),normal:hit('NORMAL'),hard:hit('HARD'),nightmare:hit('NIGHTMARE'),hell:hit('HELL')}})()`));
 if(!(diffCheck.normal>diffCheck.easy*1.14&&diffCheck.hard>diffCheck.normal&&diffCheck.nightmare>diffCheck.hard&&diffCheck.hell>diffCheck.nightmare))fail('difficulty opening assist',JSON.stringify(diffCheck));
 console.log('PASS v26:difficulty-assist',JSON.stringify(diffCheck));
 await page.evaluate(()=>eval(`(()=>{cls='priest';diff='NORMAL';g=createRunFromLobby();state='play';document.getElementById('menu').classList.add('hidden');document.getElementById('hud').classList.remove('hidden');const p=localPlayer();p.atkBuff=1.2;p.atkBuffUntil=g.t+5;p.shield=25;hud();render()})()`));
 const layout=await page.evaluate(()=>{const b=document.getElementById('buffTracker').getBoundingClientRect(),r=document.querySelector('.hudbox.right').getBoundingClientRect(),c=document.getElementById('c').getBoundingClientRect(),mini={left:c.left+c.width*(1078/1280),top:c.top+c.height*(112/720),right:c.left+c.width*(1268/1280),bottom:c.top+c.height*(244/720)};const overlap=(a,z)=>Math.max(0,Math.min(a.right,z.right)-Math.max(a.left,z.left))*Math.max(0,Math.min(a.bottom,z.bottom)-Math.max(a.top,z.top));return {buff:{left:b.left,top:b.top,right:b.right,bottom:b.bottom},right:{left:r.left,top:r.top,right:r.right,bottom:r.bottom},mini,br:overlap(b,r),bm:overlap(b,mini)};});
 if(layout.br>0||layout.bm>0)fail('right HUD overlap',JSON.stringify(layout));
 console.log('PASS v26:hud-layout',JSON.stringify(layout));
 if(errors.length)fail('browser errors',errors.join(' | '));
 console.log('3/3 build 0.26 focused checks passed');
}finally{await browser.close()}
