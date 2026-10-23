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
