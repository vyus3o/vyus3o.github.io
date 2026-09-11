import puppeteer from 'puppeteer-core';
const base=process.env.NEXUS_QA_URL||'http://127.0.0.1:4173/';
const expected=process.env.NEXUS_EXPECTED_BUILD||'0.29';
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
 const flags=await page.evaluate(()=>window.NEXUS_NETWORK_V29);
 if(!flags?.turnFallback||flags.turnUrls<3||flags.stunUrls<3||flags.maxPlayers!==5||flags.joinAttempts<5)fail('network flags',JSON.stringify(flags));
 console.log('PASS v29:turn-flags',JSON.stringify(flags));
 const capture=await page.evaluate(async()=>{
   const RealPeer=window.Peer,captured=[];
   class FakeConn{
     constructor(){this.open=false;this.peer='fake-host';this.handlers={};this.peerConnection={getStats:async()=>new Map()}}
     on(k,fn){this.handlers[k]=fn;return this}
     send(msg){if(msg?.t==='join'){setTimeout(()=>this.handlers.data?.({t:'welcome',id:'p2',room:'ABC123',lobby:{p1:{id:'p1',cls:'warrior',name:'HOST'},p2:{id:'p2',cls:'mage',name:'PLAYER 2'}},diff:'NORMAL'}),0)}}
     close(){this.open=false}
   }
   class FakePeer{
     constructor(a,b){const opts=typeof a==='string'?b:a;captured.push(opts);this.handlers={};setTimeout(()=>this.handlers.open?.('fake-client'),0)}
     on(k,fn){this.handlers[k]=fn;return this}
     connect(){const c=new FakeConn();setTimeout(()=>{c.open=true;c.handlers.open?.()},0);return c}
     destroy(){} reconnect(){}
   }
   window.Peer=FakePeer;
   try{netJoin('ABC123');await new Promise(r=>setTimeout(r,80));}
   finally{try{NET.peer?.destroy?.()}catch{}window.Peer=RealPeer;NET.mode='solo'}
   const cfg=captured[0]?.config||{},ice=cfg.iceServers||[];
   return {count:ice.length,turn:ice.filter(x=>String(x.urls).startsWith('turn:')).length,stun:ice.filter(x=>String(x.urls).startsWith('stun:')).length,policy:cfg.iceTransportPolicy,pool:cfg.iceCandidatePoolSize,status:document.getElementById('joinStatus')?.textContent||''};
 });
 if(capture.turn<3||capture.stun<3||capture.policy!=='all'||capture.pool<1)fail('peer rtc config',JSON.stringify(capture));
 console.log('PASS v29:peer-config',JSON.stringify(capture));
 if(errors.length)fail('browser errors',errors.join(' | '));
 console.log('2/2 build 0.29 TURN transport checks passed');
}finally{await browser.close()}
