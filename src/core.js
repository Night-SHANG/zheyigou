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
