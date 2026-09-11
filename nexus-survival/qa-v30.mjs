import puppeteer from 'puppeteer-core';
const base=process.env.NEXUS_QA_URL||'http://127.0.0.1:4173/';
const expected=process.env.NEXUS_EXPECTED_BUILD||'0.30';
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
 const flags=await page.evaluate(()=>window.NEXUS_NETWORK_V30);
 if(!flags?.authenticatedTurn||!flags.timeLimitedCredentials||flags.turnUrls<4||flags.maxPlayers!==5)fail('v30 flags',JSON.stringify(flags));
 console.log('PASS v30:auth-turn-flags',JSON.stringify(flags));
 const config=await page.evaluate(async()=>{
   const ice=await window.NEXUS_BUILD_ICE30();
   const turn=ice.filter(x=>String(x.urls).startsWith('turn'));
   const user=turn[0]?.username||'',cred=turn[0]?.credential||'';
   return {count:ice.length,turn:turn.length,stun:ice.filter(x=>String(x.urls).startsWith('stun:')).length,user,credLen:cred.length,expiry:Number(user.split(':')[0]||0),urls:turn.map(x=>x.urls)};
 });
 if(config.turn<4||config.stun<3||config.credLen<20||config.expiry<Math.floor(Date.now()/1000)+3000||!config.urls.some(x=>String(x).startsWith('turns:')))fail('generated TURN credentials',JSON.stringify(config));
 console.log('PASS v30:time-limited-credentials',JSON.stringify({...config,credLen:config.credLen}));
 const relay=await page.evaluate(()=>window.NEXUS_TEST_TURN30(15000));
 if(!relay?.ok)fail('real relay candidate',JSON.stringify(relay));
 console.log('PASS v30:real-relay-candidate',relay.detail);
 if(errors.length)fail('browser errors',errors.join(' | '));
 console.log('3/3 build 0.30 authenticated TURN checks passed');
}finally{await browser.close()}
