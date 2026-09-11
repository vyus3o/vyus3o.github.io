/* NEXUS SURVIVAL buildcraft zone metadata fix build 0.25 */
(function(){
'use strict';
if(typeof addZone!=='function')return;
const prevAddZone25Fix=addZone;
addZone=function(type,x,y,r,life,ownerId,dmg=0,o={}){
 const before=g?.zones?.length||0;
 const out=prevAddZone25Fix(type,x,y,r,life,ownerId,dmg,o);
 if(!g||g.zones.length<=before)return out;
 const z=g.zones[g.zones.length-1],p=typeof playerById==='function'?playerById(ownerId):null;
 if(!z||!p)return out??z;
 if(type==='arrowrain'){
  z._v25Explosive=(p.skills?.A07||0)>0;
  z._v25Poison=(p.skills?.A04||0)>0;
  z._v25Frost=(p.skills?.A08||0)>0;
  z._v25Storm=(p.skills?.A15||0)>0;
  z._v25ComboTick=0;
 }
 if(type==='trap'&&p.subclass==='assassin'&&(p.advSkills?.AS06||0)>0){z._v25Poison=true;z._v25ComboTick=0}
 return out??z;
};
window.NEXUS_BUILDCRAFT_FIX_V25={build:'0.25',zoneMetadata:true,arrowRainRuntime:true};
})();