import puppeteer from 'puppeteer-core';
const base=process.env.NEXUS_QA_URL||'http://127.0.0.1:4173/';
const expected=process.env.NEXUS_EXPECTED_BUILD||'0.28';
const chrome=process.env.CHROME_BIN||'/usr/bin/google-chrome';
const browser=await puppeteer.launch({headless:true,executablePath:chrome,args:['--no-sandbox','--disable-dev-shm-usage','--disable-background-timer-throttling','--disable-renderer-backgrounding']});
const page=await browser.newPage();await page.setViewport({width:1280,height:720,deviceScaleFactor:1});
const errors=[];page.on('pageerror',e=>errors.push('pageerror: '+e.message));page.on('console',m=>{if(m.type()==='error'&&!m.text().includes('Failed to load resource'))errors.push('console: '+m.text())});
const fail=(m,d='')=>{throw new Error(`${m}${d?' :: '+d:''}`)};
try{
 await page.goto(base,{waitUntil:'domcontentloaded',timeout:30000});
 await page.waitForFunction(b=>window.NEXUS_RUNTIME_CHECK?.build===b,{timeout:15000},expected);
 const runtime=await page.evaluate(()=>window.NEXUS_RUNTIME_CHECK);if(!runtime.ok)fail('runtime',JSON.stringify(runtime.failed));
 const result=await page.evaluate(()=>eval(`(()=>{
   function fake(peer){const ev={},sent=[];return {peer,open:true,playerId:null,sent,on:(n,f)=>ev[n]=f,send:m=>sent.push(m),close:()=>{this.open=false},ev}}
   netClose();NET.mode='host';NET.localId='p1';NET.roomCode='QA28';NET.lobby={p1:{id:'p1',cls:'warrior',name:'HOST'}};NET.conns.clear();NET.inputs={};
   const conns=['qa2','qa3','qa4','qa5'].map(fake);for(const c of conns){netAccept(c);netHostMessage(c,{t:'join',cls:'warrior'})}
   const lobby=Object.keys(NET.lobby).sort(),ids=conns.map(c=>c.playerId);
   diff='NORMAL';cls='warrior';g=createRunFromLobby();state='play';g.localId='p1';NET.localId='p1';
   for(const p of Object.values(g.players)){p.pendingLevel=false;p.xp=0}
   const before=g.t;for(const p of Object.values(g.players))requestLevel(p);const pausedState=state,pendingBefore=Object.values(g.players).filter(p=>p.pendingLevel).map(p=>p.id).sort();updateHost(.5);const frozen=g.t===before;
   selectChoice({type:'endless',id:'E01'});for(const id of ['p2','p3','p4','p5'])netApplyRemoteChoice(id,{type:'endless',id:'E01'});
   const after={state,pending:Object.values(g.players).filter(p=>p.pendingLevel).map(p=>p.id),resume:conns.some(c=>c.sent.some(m=>m?.t==='v28LevelResume')),pause:conns.some(c=>c.sent.some(m=>m?.t==='v28LevelPause')),ui:!!document.getElementById('partyLevelStatus28')};
   return {lobby,ids,pausedState,pendingBefore,frozen,after,flags:window.NEXUS_PARTY_V28};
 })()`));
 if(result.lobby.join(',')!=='p1,p2,p3,p4,p5'||result.ids.join(',')!=='p2,p3,p4,p5')fail('5-player assignment',JSON.stringify(result));
 if(result.pausedState!=='partyLevel'||result.pendingBefore.length!==5||!result.frozen)fail('global level pause/freeze',JSON.stringify(result));
 if(result.after.state!=='play'||result.after.pending.length||!result.after.resume||!result.after.pause||!result.after.ui)fail('wait-all resume',JSON.stringify(result));
 console.log('PASS v28:5p-native-slots',JSON.stringify({lobby:result.lobby,ids:result.ids}));
 console.log('PASS v28:party-level-pause',JSON.stringify({pending:result.pendingBefore,frozen:result.frozen,resume:result.after.resume}));
 if(errors.length)fail('browser errors',errors.join(' | '));console.log('2/2 build 0.28 party/link checks passed');
}finally{await browser.close()}
