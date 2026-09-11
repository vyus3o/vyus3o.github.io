/* NEXUS SURVIVAL 4-5P network hotfix for build 0.30
 * Throttles only high-volume combat snapshots. Control packets remain immediate.
 * Uses host game-time rather than wall-clock so pause/resume and QA remain deterministic.
 */
(function(){
'use strict';
if(typeof netBroadcast!=='function'||!window.NEXUS_NETWORK_V30)return;
const prev=netBroadcast;
const lastSnapAt=new WeakMap();
const stats={snapCalls:0,snapSent:0,snapSkippedCadence:0,snapSkippedBuffer:0,highPressure:0};
const partyN=()=>Math.max(1,Object.keys(NET?.lobby||{}).length);
const isRelay=c=>c?.transport==='webrelay'||String(c?.peer||'').startsWith('ws:');
const dcOf=c=>c?.dataChannel||c?._dc||c?._channel||null;
function buffered(c){return Number(dcOf(c)?.bufferedAmount||0)}
function intervalSec(conn,state){
 const n=partyN(),relay=isRelay(conn),total=(state?.e||[]).length,buf=buffered(conn);
 let gap=n>=5 ? .145 : n>=4 ? .13 : n>=3 ? .105 : .085;
 if(relay)gap=Math.max(gap,n>=4 ? .16 : .13);
 if(total>150)gap+=.02;
 if(total>220)gap+=.025;
 if(buf>64*1024){gap+=.04;stats.highPressure++}
 if(buf>128*1024){gap+=.05;stats.highPressure++}
 return Math.min(.26,gap);
}
netBroadcast=function(data){
 if(NET?.mode!=='host'||data?.t!=='snap'||!data.state)return prev(data);
 stats.snapCalls++;
 const hostT=Number(data.state.t)||0,original=NET.conns,due=new Map();
 for(const [key,conn] of original?.entries?.()||[]){
  if(!conn?.open)continue;
  const buf=buffered(conn);
  if(!isRelay(conn)&&buf>420*1024){stats.snapSkippedBuffer++;continue}
  const gap=intervalSec(conn,data.state),last=lastSnapAt.get(conn);
  if(last==null||hostT-last>=gap){due.set(key,conn);lastSnapAt.set(conn,hostT)}
 }
 if(!due.size){stats.snapSkippedCadence++;return}
 stats.snapSent++;
 try{NET.conns=due;return prev(data)}finally{NET.conns=original}
};
window.NEXUS_NET_HOTFIX_30={build:'0.30-hf4',adaptive4p:true,hostGameTimeThrottle:true,bufferAware:true,perClientThrottle:true,controlImmediate:true,stats};
})();
