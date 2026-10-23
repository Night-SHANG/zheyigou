const modules={"src/levels.js":function(require,module,exports){
'use strict';
const item=(id,x,y,type,name,slots,value,quest=false)=>({id,x,y,type,name,slots,value,quest,collected:false});
const base={width:390,height:1100,start:{x:195,y:130},dock:{x:150,y:65,w:90,h:100}};
const LEVELS=[
 {...base,id:'nameplate',title:'01 / 沉船的名字',brief:'找到旧船名牌，带回船上。',walls:[{id:'reef-a',x:28,y:345,w:112,h:65},{id:'reef-b',x:270,y:680,w:92,h:80}],hazards:[],nets:[],items:[item('plate',195,550,'plate','旧船名牌',1,120,true),item('bottle',300,295,'bottle','漂流瓶',1,40),item('medal',90,650,'medal','铜纪念章',1,70),item('chest',190,850,'chest','沉木箱',2,150)]},
 {...base,id:'shipbell',title:'02 / 船钟还在响',brief:'左边绕远但安全，右边更近却有暗礁。先留足返航电量。',walls:[{id:'wreck',x:120,y:335,w:155,h:300},{id:'reef',x:20,y:790,w:95,h:70}],hazards:[{id:'urchins',x:300,y:410,w:50,h:140}],nets:[],items:[item('bell',230,735,'bell','沉船铜钟',2,240,true),item('bottle',65,490,'bottle','蓝色玻璃瓶',1,55),item('medal',325,660,'medal','船长徽章',1,100),item('sextant',230,940,'sextant','旧六分仪',2,190)]},
 {...base,id:'lastcut',title:'03 / 最后一剪',brief:'只有一剪。剪开捷径省电，还是留给网中的宝箱？',walls:[{id:'wreck',x:115,y:335,w:165,h:280}],hazards:[{id:'sharp-reef',x:22,y:680,w:60,h:100}],nets:[{id:'shortcut',x:280,y:380,w:90,h:25,opened:false},{id:'treasure-net',x:260,y:820,w:90,h:95,opened:false}],items:[item('bell',195,720,'bell','失落的船钟',2,260,true),item('medal',70,490,'medal','航海纪念章',1,65),item('chest',305,866,'chest','网中的宝箱',2,300),item('bottle',115,900,'bottle','密封漂流瓶',1,80)]}
];
module.exports={LEVELS};

},
"src/core.js":function(require,module,exports){
'use strict';
const {LEVELS}=require('./levels');
const clone=value=>JSON.parse(JSON.stringify(value));
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const slots=s=>s.cargo.reduce((sum,i)=>sum+i.slots,0);
const intersects=(x,y,r,b)=>x+r>b.x&&x-r<b.x+b.w&&y+r>b.y&&y-r<b.y+b.h;
const nearRect=(s,b,reach=30)=>intersects(s.hook.x,s.hook.y,s.hook.r+reach,b);
const blocked=(s,x,y)=>s.level.walls.concat(s.nets.filter(n=>!n.opened)).some(b=>intersects(x,y,s.hook.r,b));
function say(s,message){s.message=message;s.messageTime=3;}
function createGame(levelIndex=0){
 const index=Number.isInteger(levelIndex)?clamp(levelIndex,0,LEVELS.length-1):0;
 const level=clone(LEVELS[index]);
 return {version:1,levelIndex:index,phase:'playing',time:0,hook:{...level.start,r:14},battery:100,hp:3,maxCargo:4,cargo:[],cuts:1,message:level.brief,messageTime:6,level,items:clone(level.items),nets:clone(level.nets),trail:[{...level.start}],result:null,hazardCooldown:0};
}
function step(s,input={},dtSeconds=0){
 if(!s||s.phase!=='playing')return;
 const dt=Number.isFinite(dtSeconds)?clamp(dtSeconds,0,.05):0;
 s.time+=dt;s.messageTime=Math.max(0,s.messageTime-dt);s.hazardCooldown=Math.max(0,s.hazardCooldown-dt);
 let x=Number.isFinite(input.x)?clamp(input.x,-1,1):0,y=Number.isFinite(input.y)?clamp(input.y,-1,1):0;
 const length=Math.hypot(x,y);if(length>1){x/=length;y/=length;}
 const speed=145/(1+slots(s)*.055),dx=x*speed*dt,dy=y*speed*dt;
 const before={x:s.hook.x,y:s.hook.y};
 // Small substeps prevent tunneling through the thinnest net, including slow frame recovery.
 const steps=Math.max(1,Math.ceil(Math.max(Math.abs(dx),Math.abs(dy))/4));
 for(let i=0;i<steps;i++){
  const nx=clamp(s.hook.x+dx/steps,s.hook.r,s.level.width-s.hook.r);
  if(!blocked(s,nx,s.hook.y))s.hook.x=nx;
  const ny=clamp(s.hook.y+dy/steps,110,s.level.height-s.hook.r);
  if(!blocked(s,s.hook.x,ny))s.hook.y=ny;
 }
 const distance=Math.hypot(s.hook.x-before.x,s.hook.y-before.y);
 s.battery=Math.max(0,s.battery-distance*.032*(1+slots(s)*.12));
 const last=s.trail[s.trail.length-1];if(distance>0&&(!last||Math.hypot(last.x-s.hook.x,last.y-s.hook.y)>12)){s.trail.push({x:s.hook.x,y:s.hook.y});if(s.trail.length>220)s.trail.shift();}
 if(s.hazardCooldown===0&&s.level.hazards.some(h=>nearRect(s,h,0))){s.hp--;s.hazardCooldown=1.5;say(s,'碰到危险暗礁！避开红色区域。');}
 if(s.battery<=0||s.hp<=0){s.phase='failed';s.result=null;say(s,s.hp<=0?'打捞钩损坏，本次收获未带回。':'电量耗尽，本次收获未带回。');}
}
function clearReach(s,item){
 const dx=item.x-s.hook.x,dy=item.y-s.hook.y,steps=Math.ceil(Math.hypot(dx,dy)/3);
 const barriers=s.level.walls.concat(s.nets.filter(n=>!n.opened));
 for(let k=1;k<=steps;k++)if(barriers.some(b=>intersects(s.hook.x+dx*k/steps,s.hook.y+dy*k/steps,0,b)))return false;
 return true;
}
function getContextAction(s){
 if(!s||s.phase!=='playing')return null;
 if(s.cargo.length&&nearRect(s,s.level.dock,0))return {kind:'dock',label:'交付收获',targetId:'dock'};
 const target=s.items.filter(i=>!i.collected&&Math.hypot(i.x-s.hook.x,i.y-s.hook.y)<=47&&clearReach(s,i)).sort((a,b)=>Math.hypot(a.x-s.hook.x,a.y-s.hook.y)-Math.hypot(b.x-s.hook.x,b.y-s.hook.y))[0];
 if(target){const net=s.nets.find(n=>!n.opened&&intersects(target.x,target.y,0,n));if(!net)return {kind:'grab',label:'抓取'+target.name,targetId:target.id};}
 const net=s.nets.find(n=>!n.opened&&nearRect(s,n,24));
 if(net)return {kind:'cut',label:s.cuts?'剪开渔网（仅一剪）':'剪刀已用完',targetId:net.id};
 return null;
}
function act(s){
 if(!s||s.phase!=='playing')return;
 const action=getContextAction(s);if(!action){say(s,'靠近物品再抓取，带回水面才算收获。');return;}
 if(action.kind==='dock'){s.phase='success';s.result={questComplete:s.cargo.some(i=>i.quest),score:s.cargo.reduce((sum,i)=>sum+i.value,0),items:clone(s.cargo)};say(s,'收获已安全带回！');return;}
 if(action.kind==='cut'){if(!s.cuts){say(s,'唯一的一剪已经用完，试试绕路。');return;}s.nets.find(n=>n.id===action.targetId).opened=true;s.cuts--;say(s,'渔网已剪开。接下来要靠绕路了。');return;}
 const item=s.items.find(i=>i.id===action.targetId);
 if(slots(s)+item.slots>s.maxCargo){say(s,'货舱放不下了。先带收获返回水面。');return;}
 item.collected=true;s.cargo.push(clone(item));say(s,'捞到了'+item.name+'！记得留电返航。');
}
function togglePause(s,paused){if(s.phase==='playing'&&paused)s.phase='paused';else if(s.phase==='paused'&&!paused)s.phase='playing';}
function snapshot(s){return clone(s);}
function restore(data){
 try{
  if(!data||data.version!==1||!Number.isInteger(data.levelIndex)||data.levelIndex<0||data.levelIndex>=LEVELS.length)return null;
  const s=createGame(data.levelIndex);
  if(!['playing','paused','success','failed'].includes(data.phase))return null;
  const bounded=(n,min,max)=>Number.isFinite(n)&&n>=min&&n<=max;
  if(!data.hook||!bounded(data.hook.x,14,376)||!bounded(data.hook.y,110,1086)||data.hook.r!==14||!bounded(data.battery,0,100)||!Number.isInteger(data.hp)||!bounded(data.hp,0,3)||!Number.isInteger(data.cuts)||!bounded(data.cuts,0,1)||!bounded(data.time,0,1e9)||!bounded(data.hazardCooldown,0,1.5)||!bounded(data.messageTime,0,6))return null;
  if(!Array.isArray(data.cargo)||!Array.isArray(data.items)||!Array.isArray(data.nets)||!Array.isArray(data.trail))return null;
  if(data.items.length!==s.items.length||data.nets.length!==s.nets.length||data.trail.length>220)return null;
  if(data.items.some((i,k)=>i.id!==s.items[k].id||typeof i.collected!=='boolean')||data.nets.some((n,k)=>n.id!==s.nets[k].id||typeof n.opened!=='boolean'))return null;
  const ids=data.cargo.map(i=>i.id);if(new Set(ids).size!==ids.length||ids.some(id=>!s.items.some(i=>i.id===id)))return null;
  s.items.forEach((i,k)=>i.collected=data.items[k].collected);s.nets.forEach((n,k)=>n.opened=data.nets[k].opened);s.cargo=ids.map(id=>clone(s.items.find(i=>i.id===id)));
  if(slots(s)>4||s.items.some(i=>i.collected!==ids.includes(i.id))||s.nets.filter(n=>n.opened).length!==1-data.cuts)return null;
  if(data.trail.some(p=>!p||!bounded(p.x,14,376)||!bounded(p.y,110,1086)))return null;
  for(const key of ['phase','time','battery','hp','cuts','hazardCooldown','messageTime'])s[key]=data[key];
  s.hook=clone(data.hook);s.trail=clone(data.trail);s.message=typeof data.message==='string'?data.message.slice(0,300):'';
  if(blocked(s,s.hook.x,s.hook.y))return null;
  const exhausted=s.battery<=0||s.hp<=0;
  if((s.phase==='failed')!==exhausted)return null;
  if(s.phase==='success'&&!nearRect(s,s.level.dock,0))return null;
  if(s.phase==='success'){if(!s.cargo.length)return null;s.result={questComplete:s.cargo.some(i=>i.quest),score:s.cargo.reduce((sum,i)=>sum+i.value,0),items:clone(s.cargo)};}
  return s;
 }catch(_){return null;}
}
module.exports={createGame,step,act,togglePause,getContextAction,snapshot,restore};

},
"src/render.js":function(require,module,exports){
'use strict';
const TAU=Math.PI*2;
function path(ctx,pts,fill,stroke='#103e43',lw=2){ctx.beginPath();pts.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.closePath();if(fill){ctx.fillStyle=fill;ctx.fill()}if(stroke){ctx.lineWidth=lw;ctx.strokeStyle=stroke;ctx.stroke()}}
function round(ctx,x,y,w,h,r,fill,stroke,lw=1){ctx.beginPath();r=Math.max(0,Math.min(r,w/2,h/2));ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.quadraticCurveTo(x+w,y,x+w,y+r);ctx.lineTo(x+w,y+h-r);ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);ctx.lineTo(x+r,y+h);ctx.quadraticCurveTo(x,y+h,x,y+h-r);ctx.lineTo(x,y+r);ctx.quadraticCurveTo(x,y,x+r,y);ctx.closePath();if(fill){ctx.fillStyle=fill;ctx.fill()}if(stroke){ctx.lineWidth=lw;ctx.strokeStyle=stroke;ctx.stroke()}}
function text(ctx,s,x,y,size=14,color='#fff',align='left',weight=600){ctx.fillStyle=color;ctx.font=`${weight} ${size}px "Harbor Sans","PingFang SC","Microsoft YaHei","Noto Sans CJK SC",sans-serif`;ctx.textAlign=align;ctx.textBaseline='middle';ctx.fillText(s,x,y)}
function line(ctx,x1,y1,x2,y2,col,width=2){ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.strokeStyle=col;ctx.lineWidth=width;ctx.stroke()}
function circle(ctx,x,y,r,fill,stroke,lw=2){ctx.beginPath();ctx.arc(x,y,r,0,TAU);if(fill){ctx.fillStyle=fill;ctx.fill()}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=lw;ctx.stroke()}}
function button(ctx,b){const primary=b.primary;const g=ctx.createLinearGradient(0,b.y,0,b.y+b.h);g.addColorStop(0,primary?'#ffe58a':'#25677a');g.addColorStop(1,primary?'#f2ae33':'#104257');round(ctx,b.x,b.y+4,b.w,b.h,13,primary?'#805122':'#042d40');round(ctx,b.x,b.y,b.w,b.h,13,g,primary?'#ffd88b':'#5293a0',1.5);text(ctx,b.label,b.x+b.w/2,b.y+b.h/2,b.size||17,primary?'#493018':'#e6f5ed','center',800);}
function treasure(ctx,type,x,y,scale=1){ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);ctx.shadowColor='#001f2d';ctx.shadowBlur=4;ctx.shadowOffsetY=3;
 if(type==='bell'){circle(ctx,0,-18,5,'#b88c40','#4e3b23',2);path(ctx,[[-7,-15],[7,-15],[10,6],[17,13],[-17,13]],'#d2a553','#755329',2);line(ctx,-12,7,12,7,'#f7dfa1',3);round(ctx,-19,12,38,6,3,'#d2a553','#604529');circle(ctx,0,20,4,'#b78c42');line(ctx,-4,-10,-7,4,'#fae8a7',3)}
 else if(type==='bottle'){path(ctx,[[-4,-21],[4,-21],[4,-10],[10,-5],[10,19],[-10,19],[-10,-5],[-4,-10]],'#51bda0','#194a43',2);round(ctx,-5,-24,10,6,1,'#b38c53');line(ctx,-4,-3,-4,11,'#b3f1c9',3)}
 else if(type==='chest'){path(ctx,[[-19,-10],[12,-15],[23,-7],[23,15],[-13,21],[-19,14]],'#866044','#342f2a',2);path(ctx,[[-19,-10],[12,-15],[23,-7],[-12,-2]],'#b28a59','#342f2a',2);line(ctx,-12,-2,-13,21,'#b7c1b7',4);line(ctx,12,-10,12,17,'#b7c1b7',4);round(ctx,2,4,7,9,1,'#e7c26a','#51442d')}
 else if(type==='sextant'){ctx.strokeStyle='#d4ae5b';ctx.lineWidth=4;ctx.beginPath();ctx.arc(0,-12,28,.25,Math.PI-.25);ctx.stroke();line(ctx,0,-12,-24,13,'#e7c373',4);line(ctx,0,-12,24,13,'#e7c373',4);line(ctx,0,-12,0,18,'#c49b4d',4);circle(ctx,0,-12,5,'#eed18c','#7f6030')}
 else if(type==='medal'){circle(ctx,0,0,15,'#c9a45b','#77542a',3);circle(ctx,0,0,10,null,'#e7c67d',1);text(ctx,'✦',0,1,19,'#f3db9a','center')}
 else{round(ctx,-25,-14,50,28,4,'#c4ae7d','#67583c',2);circle(ctx,-19,-8,2,'#514635');circle(ctx,19,8,2,'#514635');text(ctx,'海燕号',0,1,11,'#38514a','center',800)}ctx.restore();}
function boat(ctx,x,y){ctx.save();ctx.translate(x,y);path(ctx,[[-56,-6],[48,-6],[35,20],[-39,20]],'#bd6d32','#263f41',3);path(ctx,[[-55,-6],[48,-6],[43,4],[-47,4]],'#e5d9a8',null);round(ctx,-35,-39,48,32,4,'#efdfb1','#40585b',2);round(ctx,-28,-33,14,13,2,'#70b7cb','#426675');round(ctx,-9,-33,14,13,2,'#70b7cb','#426675');line(ctx,-13,-39,-13,-66,'#614f37',4);path(ctx,[[-13,-64],[12,-56],[-13,-49]],'#d47842',null);line(ctx,16,-10,43,-54,'#b59a54',7);line(ctx,43,-54,65,-34,'#d0b46b',6);circle(ctx,65,-34,5,'#604c32');circle(ctx,-30,14,6,'#345362','#d5bf83',3);circle(ctx,24,14,6,'#345362','#d5bf83',3);ctx.restore()}
function claw(ctx,x,y,t){ctx.save();ctx.translate(x,y);ctx.shadowColor='#5ef4e3';ctx.shadowBlur=16;circle(ctx,0,0,13,'#d3ac64','#f2dfac',2);ctx.shadowBlur=0;round(ctx,-9,-17,18,16,5,'#758f8c','#324e50',2);round(ctx,-6,-15,12,5,2,'#5ae9cb');path(ctx,[[-10,2],[-22,14],[-19,30],[-10,35],[-14,21],[-8,12]],'#b4c8bd','#355a5c',2);path(ctx,[[10,2],[22,14],[19,30],[10,35],[14,21],[8,12]],'#b4c8bd','#355a5c',2);circle(ctx,-11,5,3,'#f1cb78');circle(ctx,11,5,3,'#f1cb78');line(ctx,-18,-6,-28,-3,'#74efd5',3);line(ctx,18,-6,28,-3,'#74efd5',3);ctx.restore()}
function sea(ctx,w,h,camera,time){const g=ctx.createLinearGradient(0,-camera,0,1100-camera);g.addColorStop(0,'#238ca4');g.addColorStop(.24,'#09647c');g.addColorStop(.7,'#063c52');g.addColorStop(1,'#032d40');ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
 ctx.save();ctx.globalAlpha=.09;for(let i=0;i<5;i++){path(ctx,[[i*112-80,-camera],[i*112-10,-camera],[i*170+180,900-camera],[i*170+90,900-camera]],'#bdfff4',null)}ctx.restore();
 for(let school=0;school<3;school++){for(let j=0;j<5;j++){const fx=((time*7+school*130+j*23)%470)-40,fy=310+school*260+j%2*14-camera;ctx.save();ctx.globalAlpha=.22;path(ctx,[[fx-6,fy],[fx+6,fy-4],[fx+8,fy],[fx+6,fy+4]],'#aad8bd',null);path(ctx,[[fx-6,fy],[fx-11,fy-5],[fx-11,fy+5]],'#aad8bd',null);ctx.restore()}}
 for(let i=0;i<28;i++){const yy=((i*83+1100-time*(7+i%3*3))%1100)-camera;const xx=(i*137%390)+Math.sin(time*.5+i)*7;circle(ctx,xx,yy,1+i%3,null,'#73d4d62c',1)}
 // Hand-painted silhouettes of the harbor and sea floor.
 if(camera<140){ctx.fillStyle='#91d8de';ctx.fillRect(0,-camera,w,118);for(let i=0;i<8;i++){const x=i*58;round(ctx,x,44+(i%3)*9-camera,43,65,0,['#d6cba4','#e0d8bc','#94b4ad'][i%3]);path(ctx,[[x-5,44+(i%3)*9-camera],[x+22,27+(i%3)*9-camera],[x+48,44+(i%3)*9-camera]],'#b57e58',null)}ctx.fillStyle='#269cb0';ctx.fillRect(0,115-camera,w,10);line(ctx,0,120-camera,w,120-camera,'#b1f4e0',2);boat(ctx,154,100-camera)}
 for(let i=0;i<12;i++){const x=i*37-10;const yy=1080-camera;ctx.beginPath();ctx.moveTo(x,yy+30);ctx.bezierCurveTo(x-20,yy-20,x+22,yy-40,x+7,yy-75-i%3*17);ctx.strokeStyle=i%2?'#1c8170':'#426d57';ctx.lineWidth=4+i%3;ctx.stroke()}
}
function wall(ctx,o){const {x,y,w,h}=o;const g=ctx.createLinearGradient(x,y,x+w,y+h);g.addColorStop(0,'#5e776c');g.addColorStop(.35,'#3d5c5b');g.addColorStop(1,'#183b44');round(ctx,x,y,w,h,8,g,'#91a38b',2);ctx.save();ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();for(let j=12;j<h;j+=24){line(ctx,x+4,y+j,x+w-4,y+j,'#172f3c',3);line(ctx,x+4,y+j+3,x+w-4,y+j+3,'#718a6c55',1)}for(let k=10;k<w;k+=48){line(ctx,x+k,y+2,x+k,y+h-2,'#102e38',2);circle(ctx,x+k,y+9,2,'#a2a482');circle(ctx,x+k,y+h-9,2,'#a2a482')}ctx.restore();for(let i=0;i<w;i+=18){line(ctx,x+i,y+2,x+i-3,y+7+(i%11),'#4b9676',3)}if(w>90&&h>120){for(let py=y+54;py<y+h-20;py+=100){circle(ctx,x+w/2,py,22,'#142f3a','#b0a274',5);circle(ctx,x+w/2,py,16,'#173e48','#708978',2);line(ctx,x+w/2-9,py-6,x+w/2+7,py+10,'#77ad9b44',3);for(let k=0;k<4;k++)circle(ctx,x+w/2+Math.cos(k*Math.PI/2)*22,py+Math.sin(k*Math.PI/2)*22,2,'#4a5347')}}for(let k=0;k<w;k+=29){const xx=x+k;ctx.beginPath();ctx.moveTo(xx,y+h);ctx.bezierCurveTo(xx+10,y+h-15,xx-9,y+h-28,xx+3,y+h-40-k%22);ctx.strokeStyle='#3a896d';ctx.lineWidth=3;ctx.stroke()}}
function net(ctx,n){if(n.opened)return;ctx.save();ctx.beginPath();ctx.rect(n.x,n.y,n.w,n.h);ctx.clip();for(let i=-n.h;i<n.w+n.h;i+=12){line(ctx,n.x+i,n.y,n.x+i+n.h,n.y+n.h,'#c3c6a8',1.5);line(ctx,n.x+i,n.y+n.h,n.x+i+n.h,n.y,'#c3c6a8',1.5)}ctx.restore();round(ctx,n.x,n.y,n.w,n.h,2,null,'#e0d7a6',2);}
function gameplay(ctx,s,ui,w,h){const cam=ui.camera||0,playBottom=h-176;ctx.save();ctx.beginPath();ctx.rect(0,82,w,playBottom-82);ctx.clip();sea(ctx,w,playBottom,cam,s.time||0);ctx.translate(0,-cam);
 for(const o of s.level.walls)wall(ctx,o);
 for(const o of s.level.hazards){const pts=[[o.x+o.w,o.y],[o.x+o.w,o.y+o.h]];for(let j=o.h;j>=0;j-=22)pts.push([o.x+(Math.floor((o.h-j)/22)%2?o.w*.52:0),o.y+j]);path(ctx,pts,'#645044','#e69a71',2);for(let j=18;j<o.h;j+=35)line(ctx,o.x+o.w*.65,o.y+j,o.x+o.w-5,o.y+j-8,'#a27658',2)}
 for(const n of s.nets)net(ctx,n);
 // Breadcrumb tether follows travelled water rather than cutting through hulls.
 const tr=s.trail||[];ctx.beginPath();if(tr.length){ctx.moveTo(tr[0].x,tr[0].y);for(const p of tr)ctx.lineTo(p.x,p.y)}else ctx.moveTo(s.level.start.x,s.level.start.y);ctx.lineTo(s.hook.x,s.hook.y);ctx.strokeStyle='#092e39';ctx.lineWidth=5;ctx.stroke();ctx.strokeStyle='#e4c381';ctx.lineWidth=2;ctx.stroke();
 for(const it of s.items){if(it.collected)continue;ctx.save();if(it.quest){const g=ctx.createRadialGradient(it.x,it.y,0,it.x,it.y,43);g.addColorStop(0,'#fbdc6d55');g.addColorStop(1,'#fbdc6d00');ctx.fillStyle=g;ctx.fillRect(it.x-43,it.y-43,86,86)}treasure(ctx,it.type,it.x,it.y,.85);round(ctx,it.x-41,it.y+27,82,19,4,'#092e3edd');text(ctx,it.name,it.x,it.y+37,11,it.quest?'#ffe7a0':'#cae8de','center');if(it.quest)text(ctx,'委托',it.x,it.y-33,10,'#ffe6a1','center');ctx.restore()}
 const d=s.level.dock;round(ctx,d.x,d.y,d.w,d.h,14,'#9cf4ce14','#9ce4c155',1);text(ctx,'↑ 带回船上',d.x+d.w/2,d.y+d.h/2,12,'#d5efc6','center');claw(ctx,s.hook.x,s.hook.y,s.time);
 // Depth markers.
 for(let y=200;y<1100;y+=100){line(ctx,0,y,9,y,'#94c5bf77',1);text(ctx,Math.round((y-120)/4)+'m',13,y,10,'#a7cfce', 'left',400)}
 ctx.restore();
 // HUD above moving sea.
 round(ctx,9,9,w-18,66,14,'#073244ee','#789f9555');text(ctx,s.level.title,23,29,16,'#f3e8c7');text(ctx,'●'.repeat(Math.max(0,s.hp))+'○'.repeat(Math.max(0,3-s.hp)),w-55,29,15,'#ef8b72','center');round(ctx,23,48,165,10,5,'#031d2c');round(ctx,23,48,165*Math.max(0,s.battery)/100,10,5,s.battery<25?'#e6a85b':'#6ad5b0');text(ctx,Math.round(s.battery)+'% 电量',198,53,11,'#bfe5d4');
 // Panel takes input and keeps screen unobscured.
 const py=h-174;round(ctx,0,py,w,184,20,'#082b3c','#4b777c',1);text(ctx,'本次装载',18,py+21,12,'#b5d4ce');const used=s.cargo.reduce((v,x)=>v+x.slots,0);text(ctx,`${used} / ${s.maxCargo} 格`,w-20,py+21,12,'#e8cc87','right');for(let i=0;i<4;i++)round(ctx,18+i*48,py+37,42,40,7,'#133b4b','#44717a');s.cargo.forEach((it,i)=>treasure(ctx,it.type,39+i*48,py+57,.46));
 if(ui.joystick){circle(ctx,ui.joystick.x,ui.joystick.y,40,'#7bb8b51c','#aeddd655',1);circle(ctx,ui.joystick.x+ui.joystick.dx*29,ui.joystick.y+ui.joystick.dy*29,17,'#a4d7c455','#d2eadb99',1)}else if(s.time<12){text(ctx,'拖动空白区域移动',w/2,py+144,12,'#80aaa9','center',400)}
 if(s.message&&s.messageTime>0){round(ctx,20,90,w-40,36,9,'#f4e6c9ed','#bb9561');text(ctx,s.message,w/2,108,12,'#493d2d','center')}
 if(ui.hint){round(ctx,25,playBottom-36,w-50,27,7,'#082b3cd9');text(ctx,ui.hint,w/2,playBottom-22,11,'#cfe9d5','center',500)}
}
function render(ctx,s,ui,w,h,assets={}){ctx.clearRect(0,0,w,h);ctx.lineJoin='round';
 if(ui.screen==='menu'){
  if(assets.harbor){ctx.drawImage(assets.harbor,150,0,680,900,0,0,w,h*.57);}else sea(ctx,w,h,0,0);ctx.fillStyle='#042c3e';ctx.fillRect(0,h*.55,w,h*.45);round(ctx,w-93,h*.164,93,h*.12,9,'#e8ddbd','#b0a27c',1);text(ctx,'浅水码头',w-45,h*.221,13,'#36535a','center');text(ctx,'晴 · 微风',w-45,h*.254,11,'#77704d','center');
  const g=ctx.createLinearGradient(0,h*.35,0,h*.8);g.addColorStop(0,'#042c3e00');g.addColorStop(.5,'#042c3ed9');g.addColorStop(1,'#042c3e');ctx.fillStyle=g;ctx.fillRect(0,h*.35,w,h*.65);
  round(ctx,24,h-295,w-48,252,20,'#082f40f5','#b3b59a66');text(ctx,'准备出海',w/2,h-264,24,'#ffe5a0','center',800);text(ctx,'绕开残骸 · 带回宝物 · 留点电返航',w/2,h-230,12,'#afcfc7','center',500);text(ctx,'玩法实验  v0.1',w/2,h-27,10,'#6e9c9b','center',400);
 }else if(s){gameplay(ctx,s,ui,w,h);}
 if(ui.screen==='brief'&&s){ctx.fillStyle='#021b2acc';ctx.fillRect(0,0,w,h);round(ctx,24,h/2-173,w-48,345,18,'#eee0bc','#b08b50',3);text(ctx,'打 捞 委 托',w/2,h/2-133,13,'#8c6d3f','center');text(ctx,s.level.title,w/2,h/2-96,23,'#26474b','center',800);treasure(ctx,s.levelIndex===0?'plate':'bell',w/2,h/2-38,1.3);const lines=ui.briefLines||[];lines.forEach((v,i)=>text(ctx,v,w/2,h/2+25+i*24,13,'#5a604d','center',500));}
 if(s&&((s.phase==='paused'&&ui.screen==='play')||ui.screen==='result')){ctx.fillStyle='#021b2acc';ctx.fillRect(0,0,w,h);const result=ui.screen==='result';round(ctx,27,h/2-172,w-54,344,18,'#eee0bc','#b08b50',3);text(ctx,result?(s.phase==='failed'?'设备已紧急回收':'这一钩，带回来了！'):'靠岸歇一会儿',w/2,h/2-128,23,'#254750','center',800);text(ctx,result?(s.phase==='failed'?'本次收获未带回，再试一条路线。':(s.result&&s.result.questComplete?'委托完成 · 宝物已上船':'已安全回收 · 委托物还在海底')):'移动与电量已经暂停',w/2,h/2-91,12,'#746343','center',500);if(result&&s.phase!=='failed'){s.cargo.forEach((it,i)=>treasure(ctx,it.type,w/2+(i-(s.cargo.length-1)/2)*65,h/2-35,.95));text(ctx,'回收价值  '+(s.result?s.result.score:0),w/2,h/2+7,16,'#926a31','center')}else if(result){text(ctx,'不扣历史收益，也不需要维修费。',w/2,h/2-32,12,'#726751','center')}}
 for(const b of ui.buttons||[])button(ctx,b);
}
module.exports={render};

},
"src/app.js":function(require,module,exports){
'use strict';
const core=require('./core');const {render}=require('./render');
const SAVE_KEY='zheyigou-experiment-v1';
function createApp(p){
 const {canvas,width:w,height:h}=p,ctx=canvas.getContext('2d');const assets={};let state=null,screen='menu',camera=0,joystick=null,keys={},activePointer=null,last=0,frame=null,dead=false;let buttons=[];
 function save(){if(!state||!p.storage)return;try{saved=core.snapshot(state);p.storage.set(SAVE_KEY,JSON.stringify(saved))}catch{}}
 let saved=null;try{const raw=p.storage&&p.storage.get(SAVE_KEY);saved=raw?core.restore(JSON.parse(raw)):null;}catch{}
 function start(index){state=core.createGame(index);screen='brief';camera=0;joystick=null;keys={};save()}
 function resume(){if(!state)return;core.togglePause(state,false);screen='play';last=0;joystick=null;keys={}}
 function pause(){keys={};joystick=null;activePointer=null;if(state&&state.phase==='playing'&&screen==='play'){core.togglePause(state,true);save()}}
 function menu(){save();screen='menu';joystick=null;keys={}}
 const box=(id,label,x,y,bw,bh,primary=false)=>({id,label,x,y,w:bw,h:bh,primary});
 function interfaceState(){buttons=[];let hint='';
  if(screen==='menu'){buttons=[box('start','开始打捞  →',48,h-175,w-96,52,true),box(saved&&['playing','paused'].includes(saved.phase)?'continue':'select',saved&&['playing','paused'].includes(saved.phase)?'继续上次打捞':'挑战沉船',48,h-108,w-96,40)];}
  else if(screen==='brief'){buttons=[box('launch','下水，开始探索',56,h/2+104,w-112,46,true)];}
  else if(state.phase==='paused'){buttons=[box('resume','继续打捞',58,h/2+28,w-116,47,true),box('retry','重新出发',58,h/2+89,130,42),box('home','回到港口',200,h/2+89,130,42)];}
  else if(screen==='result'){buttons=[box('retry','再捞一次',51,h/2+89,138,45),box(state.levelIndex<2&&state.phase!=='failed'?'next':'home',state.levelIndex<2&&state.phase!=='failed'?'下一段海域':'回到港口',201,h/2+89,138,45,true)];}
  else {const action=core.getContextAction(state);buttons=[box('pause','Ⅱ',w-46,83,33,32),box('action',action?action.label:'靠近宝物抓取',225,h-135,147,45,!!action)];buttons[0].size=14;buttons[1].size=action?16:12;hint=state.levelIndex===0?'拖动控制方向，靠近船名牌后点「抓取」':`剪网 ${state.cuts} 次 · 带回船上才算收获`;if(state.battery<30)hint='电量不多了，沿来路返回船上';}
  if(screen==='menu')buttons.push(box('mute',muted?'声音 关':'声音 开',w-85,8,76,29));
  return {screen,camera,joystick,buttons,hint,briefLines:state?brief(state.levelIndex):[]};
 }
 function brief(i){return i===0?['先找到海床上的船名牌。','松手停住观察，靠近后主动抓取。','最后沿路返回船上，把收获带回来。']:i===1?['船钟在残骸的另一侧。','左边宽而远，右边近却有锐利残骸。','电量按路程消耗，不会因为观察流失。']:['只有一次剪网机会。','剪右边的网可以开近路，','或绕远，把工具留给额外宝箱。'];}
 function hit(x,y){return buttons.find(b=>x>=b.x&&x<=b.x+b.w&&y>=b.y&&y<=b.y+b.h)}
 let muted=false;function sound(name){if(!muted&&p.playSound){try{p.playSound(name)}catch{}}}
 function click(id){if(id==='mute'){muted=!muted;if(p.setMuted)p.setMuted(muted);interfaceState();return;}sound('ui-click');if(id==='continue'){state=saved;screen='play';core.togglePause(state,true);last=0;}else if(id==='start')start(0);else if(id==='select')start(1);else if(id==='launch')resume();else if(id==='pause')pause();else if(id==='resume')resume();else if(id==='retry')start(state.levelIndex);else if(id==='next')start(state.levelIndex+1);else if(id==='home')menu();else if(id==='action'&&screen==='play'){const beforeCargo=state.cargo.length,beforeCuts=state.cuts;core.act(state);if(state.cargo.length>beforeCargo)sound('pickup');else if(state.cuts<beforeCuts)sound('net-cut');if(state.phase==='success'||state.phase==='failed'){screen='result';joystick=null;}save();}interfaceState();}
 const unsubPointer=p.onPointer(e=>{interfaceState();if(e.type==='down'){const b=hit(e.x,e.y);if(b){click(b.id);return}if(screen==='play'&&state.phase==='playing'){activePointer=e.id;joystick={x:e.x,y:e.y,dx:0,dy:0};}}
 else if(e.type==='move'&&joystick&&e.id===activePointer){const dx=e.x-joystick.x,dy=e.y-joystick.y,len=Math.max(38,Math.hypot(dx,dy));joystick.dx=dx/len;joystick.dy=dy/len;}
 else if(e.type==='up'||e.type==='cancel'){if(activePointer===e.id){joystick=null;activePointer=null}}});
 const unsubLife=p.onLifecycle? p.onLifecycle(()=>pause()):()=>{};
 if(p.loadImage)p.loadImage('assets/harbor-reference.png').then(im=>{assets.harbor=im}).catch(()=>{});
 function draw(t){if(dead)return;const dt=last?Math.min((t-last)/1000,.05):0;last=t;
 if(state&&screen==='play'&&state.phase==='playing'){let x=joystick?joystick.dx:0,y=joystick?joystick.dy:0;x+=(keys.ArrowRight||keys.d?1:0)-(keys.ArrowLeft||keys.a?1:0);y+=(keys.ArrowDown||keys.s?1:0)-(keys.ArrowUp||keys.w?1:0);const len=Math.max(1,Math.hypot(x,y));core.step(state,{x:x/len,y:y/len},dt);if(state.phase==='success'||state.phase==='failed'){screen='result';joystick=null;save()}}
 if(state){const viewport=h-174;const desired=Math.max(0,Math.min(state.level.height-viewport,state.hook.y-viewport*.47));camera+=(desired-camera)*Math.min(1,dt*7);}
 ctx.setTransform(canvas.width/w,0,0,canvas.height/h,0,0);render(ctx,state,interfaceState(),w,h,assets);frame=p.requestFrame(draw);}
 frame=p.requestFrame(draw);
 return {pause,resume,destroy(){dead=true;p.cancelFrame(frame);unsubPointer();unsubLife();if(p.destroyAudio)p.destroyAudio();save()},key(k,on){keys[k]=on;if(on&&k===' '&&screen==='play')click('action');if(on&&(k==='p'||k==='P'))state&&state.phase==='paused'?resume():pause()},clearKeys(){keys={};pause()}};
}
module.exports={createApp};

}};const cache={};function load(id){if(cache[id])return cache[id].exports;const m={exports:{}};cache[id]=m;const req=(p)=>{const parts=id.split('/');parts.pop();for(const s of p.split('/')){if(s==='..')parts.pop();else if(s!=='.')parts.push(s);}let key=parts.join('/');if(!key.endsWith('.js'))key+='.js';return load(key);};modules[id](req,m,m.exports);return m.exports;}module.exports=load('src/app.js');