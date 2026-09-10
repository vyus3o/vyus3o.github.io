import puppeteer from 'puppeteer-core';

const base=process.env.NEXUS_QA_URL||'http://127.0.0.1:4173/';
const chrome=process.env.CHROME_BIN||'/usr/bin/google-chrome';
const browser=await puppeteer.launch({headless:true,executablePath:chrome,args:['--no-sandbox','--disable-dev-shm-usage']});

const fail=(msg,detail='')=>{throw new Error(`${msg}${detail?` :: ${detail}`:''}`)};
async function openPage(mobile=false){
  const page=await browser.newPage();
  const errors=[];
  page.on('pageerror',e=>errors.push(`pageerror: ${e.message}`));
  page.on('console',m=>{
    if(m.type()!=='error')return;
    const text=m.text();
    if(text.includes('Failed to load resource'))return;
    errors.push(`console: ${text}`);
  });
  page.on('response',r=>{
    if(r.status()<400)return;
    try{
      const u=new URL(r.url());
      if(u.pathname.endsWith('/favicon.ico'))return;
    }catch{}
    errors.push(`http ${r.status()}: ${r.url()}`);
  });
  if(mobile){
    await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1');
    await page.setViewport({width:390,height:844,isMobile:true,hasTouch:true,deviceScaleFactor:2});
  }else await page.setViewport({width:1280,height:720,deviceScaleFactor:1});
  await page.goto(base,{waitUntil:'domcontentloaded',timeout:30000});
  await page.waitForFunction(()=>window.NEXUS_RUNTIME_CHECK?.build==='0.16',{timeout:10000});
  const qa=await page.evaluate(()=>window.NEXUS_RUNTIME_CHECK);
  if(!qa.ok)fail('runtime QA failed',JSON.stringify(qa.failed));
  return {page,errors};
}

try{
  const desktop=await openPage(false);
  const page=desktop.page;
  const menu=await page.evaluate(()=>({classes:document.querySelectorAll('#classes .classCard').length,diffs:document.querySelectorAll('#diffs .diffBtn').length,build:document.querySelector('.brandCorner')?.textContent||''}));
  if(menu.classes!==4)fail('class menu count',String(menu.classes));
  if(menu.diffs!==5)fail('difficulty menu count',String(menu.diffs));
  if(!menu.build.includes('0.16'))fail('wrong build label',menu.build);

  await page.click('#start');
  await page.waitForFunction(()=>eval("state==='play'&&!!g&&!!localPlayer()"),{timeout:5000});
  const started=await page.evaluate(()=>eval("({stage:g.stage,players:Object.keys(g.players).length,alive:localPlayer().alive})"));
  if(started.stage!==0||started.players<1||!started.alive)fail('solo start failed',JSON.stringify(started));

  // Stage 10 advancement: force only the milestone entry, not 9 stages of combat.
  await page.evaluate(()=>eval("g.stage=9;g.t=10;g.e=[];g.boss=false;state='play';openChest();"));
  await page.waitForSelector('#advancementModal:not(.hidden) .advanceCard',{timeout:3000});
  const advCards=await page.$$eval('#advancementModal .advanceCard',els=>els.length);
  if(advCards!==2)fail('advancement card count',String(advCards));
  await page.click('#advancementModal .advanceCard');
  await page.waitForFunction(()=>eval("state==='play'&&g.stage===10&&!!localPlayer().subclass"),{timeout:3000});
  const afterAdv=await page.evaluate(()=>eval("({stage:g.stage,subclass:localPlayer().subclass,awakened:localPlayer().awakened})"));
  if(afterAdv.awakened)fail('awakening happened too early');

  // Stage 30 awakening and manual R ultimate.
  await page.evaluate(()=>eval("g.stage=29;g.t=10;g.e=[];g.boss=false;state='play';openChest();"));
  await page.waitForSelector('#advancementModal:not(.hidden) #advContinue:not(.hidden)',{timeout:3000});
  await page.click('#advContinue');
  await page.waitForFunction(()=>eval("state==='play'&&g.stage===30&&localPlayer().awakened===true"),{timeout:3000});
  const ult=await page.evaluate(()=>eval("(()=>{const p=localPlayer();const before=p.ultReadyAt;const ok=window.nexusUseUlt(p,false);return {ok,before,after:p.ultReadyAt,t:g.t}})()"));
  if(!ult.ok||!(ult.after>ult.t))fail('R ultimate activation failed',JSON.stringify(ult));

  // Stage 50 must end the run as victory, not advance to an invalid stage 51.
  await page.evaluate(()=>eval("g.stage=49;g.t=10;g.e=[];g.boss=false;state='play';openChest();"));
  await page.waitForFunction(()=>eval("state==='ended'"),{timeout:3000});
  const ending=await page.evaluate(()=>({title:document.getElementById('endTitle')?.textContent,text:document.getElementById('endText')?.textContent}));
  if(ending.title!=='VICTORY'||!ending.text?.includes('STAGE 50'))fail('stage 50 victory failed',JSON.stringify(ending));
  if(desktop.errors.length)fail('desktop browser errors',desktop.errors.join(' | '));
  await page.close();

  const mobile=await openPage(true);
  const mp=mobile.page;
  await mp.click('#start');
  await mp.waitForFunction(()=>eval("state==='play'&&!!g"),{timeout:5000});
  await mp.waitForSelector('#joystick',{timeout:3000});
  const mobileUi=await mp.evaluate(()=>{
    const j=document.getElementById('joystick'),d=document.getElementById('raidDashBtn');
    const r=j?.getBoundingClientRect();
    return {mobile:document.documentElement.classList.contains('mobile-build'),joystick:!!j&&r.width>0&&r.height>0,dash:!!d,orientation:document.querySelector('meta[name="screen-orientation"]')?.content};
  });
  if(!mobileUi.mobile||!mobileUi.joystick||!mobileUi.dash||mobileUi.orientation!=='portrait')fail('mobile portrait controls failed',JSON.stringify(mobileUi));
  if(mobile.errors.length)fail('mobile browser errors',mobile.errors.join(' | '));
  await mp.close();

  console.log('PASS browser:runtime-qa');
  console.log('PASS browser:solo-start');
  console.log(`PASS browser:stage10-advancement · ${afterAdv.subclass}`);
  console.log('PASS browser:stage30-awakening-and-R');
  console.log('PASS browser:stage50-victory');
  console.log('PASS browser:mobile-portrait-controls');
  console.log('6/6 browser smoke checks passed');
} finally {
  await browser.close();
}
