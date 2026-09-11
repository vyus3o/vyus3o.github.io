import puppeteer from 'puppeteer-core';
const base=process.env.NEXUS_QA_URL||'http://127.0.0.1:4173/';
const expected=process.env.NEXUS_EXPECTED_BUILD||'0.27';
const chrome=process.env.CHROME_BIN||'/usr/bin/google-chrome';
const browser=await puppeteer.launch({headless:true,executablePath:chrome,args:['--no-sandbox','--disable-dev-shm-usage','--disable-background-timer-throttling','--disable-renderer-backgrounding']});
const page=await browser.newPage();
await page.setViewport({width:1280,height:720,deviceScaleFactor:1});
const errors=[];page.on('pageerror',e=>errors.push('pageerror: '+e.message));page.on('console',m=>{if(m.type()==='error'&&!m.text().includes('Failed to load resource'))errors.push('console: '+m.text())});
const fail=(m,d='')=>{throw new Error(`${m}${d?' :: '+d:''}`)};
try{
 await page.goto(base,{waitUntil:'domcontentloaded',timeout:30000});
 await page.waitForFunction(b=>window.NEXUS_RUNTIME_CHECK?.build===b,{timeout:15000},expected);
 const runtime=await page.evaluate(()=>window.NEXUS_RUNTIME_CHECK);if(!runtime.ok)fail('runtime',JSON.stringify(runtime.failed));
 const flags=await page.evaluate(()=>({m:window.NEXUS_MOTION_V27,style:!!document.getElementById('motionDetailV27')}));
 if(!flags.style||!flags.m?.playerMotion||!flags.m?.enemyGait||!flags.m?.bossPhaseMotion||!flags.m?.biomeAmbience)fail('motion flags',JSON.stringify(flags));
 console.log('PASS v27:motion-flags');
 const motion=await page.evaluate(()=>eval(`(()=>{cls='rogue';diff='NORMAL';NET.mode='solo';NET.localId='p1';startRun();state='play';const p=localPlayer();p.skills={};p.x=1200;p.y=900;g.stage=0;g.e=[];spawn(false);const e=g.e.find(x=>!x.boss);e.x=1280;e.y=900;const before={px:p.x,py:p.y,ex:e.x,ey:e.y,hp:e.hp};render();p.x+=12;p.walk=(p.walk||0)+1;render();doBasicAttack(p,e);render();const after={px:p.x,py:p.y,ex:e.x,ey:e.y,hp:e.hp,attack:p._v27AttackUntil>g.t};return {before,after}})()`));
 if(!motion.after.attack||motion.after.px!==motion.before.px+12||motion.after.ex!==motion.before.ex||motion.after.ey!==motion.before.ey)fail('render motion mutated gameplay state',JSON.stringify(motion));
 console.log('PASS v27:player-enemy-motion');
 const boss=await page.evaluate(()=>eval(`(()=>{g.stage=9;g.e=[];g.q=[];g.fx=[];g.raidTelegraphs=[];g.boss=false;spawn(true);const b=g.e.find(e=>e.boss);render();const max=b.max;b.hp=max*.28;render();return {tier:b.bossTier||'normal',hp:b.hp,max,alive:!b.dead}})()`));
 if(!boss.alive||!(boss.hp<boss.max*.33))fail('boss phase setup',JSON.stringify(boss));
 console.log('PASS v27:boss-phase-motion');
 if(errors.length)fail('browser errors',errors.join(' | '));
 console.log('3/3 build 0.27 motion/detail checks passed');
}finally{await browser.close()}
