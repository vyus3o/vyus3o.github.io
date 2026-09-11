/* NEXUS SURVIVAL pixel atlas ready-state race hotfix 0.32.2 */
(function(){
'use strict';
const mark=window.NEXUS_PIXEL_V32;
if(!mark||mark.ready)return;
const finish=ok=>{
 mark.ready=!!ok;
 mark.loadError=!ok;
 if(ok){try{delete window.NEXUS_PIXEL_ATLAS_B64}catch{}}
};
const data=window.NEXUS_PIXEL_ATLAS_B64;
if(!data){
 // The primary loader deletes the atlas only after a successful load. If it
 // already disappeared, treat the renderer as ready; otherwise flag failure.
 queueMicrotask(()=>{if(window.NEXUS_PIXEL_V32&&!window.NEXUS_PIXEL_V32.loadError)window.NEXUS_PIXEL_V32.ready=true});
 return;
}
const probe=new Image();
probe.decoding='async';
probe.onload=()=>finish(true);
probe.onerror=()=>finish(false);
probe.src='data:image/png;base64,'+data;
window.NEXUS_PIXEL_READY_FIX_V32={build:'0.32.2',probe:true};
})();
