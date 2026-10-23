const {createApp}=require('./src/app');
function boot(){
const canvas=document.getElementById('game');
const h=Math.min(innerHeight,900),w=Math.min(innerWidth,h*390/780);const height=h*390/w;const dpr=Math.min(devicePixelRatio||1,2);
canvas.width=Math.round(390*dpr);canvas.height=Math.round(height*dpr);canvas.style.width=w+'px';canvas.style.height=h+'px';
const voices={};let muted=false;function playSound(name){if(muted)return;const a=voices[name]||(voices[name]=new Audio('assets/audio/'+name+'.wav'));a.currentTime=0;a.play().catch(()=>{});}const pointerListeners=new Set();const keys=new Set();
const app=createApp({canvas,width:390,height,dpr,requestFrame:requestAnimationFrame.bind(window),cancelFrame:cancelAnimationFrame.bind(window),
 playSound,setMuted(v){muted=v;if(v)Object.values(voices).forEach(a=>a.pause())},destroyAudio(){Object.values(voices).forEach(a=>{a.pause();a.src=''})},onPointer(handler){pointerListeners.add(handler);return()=>pointerListeners.delete(handler)},onLifecycle(handler){const f=()=>{if(document.hidden)Object.values(voices).forEach(a=>a.pause());handler(document.hidden?'hide':'show')};document.addEventListener('visibilitychange',f);window.addEventListener('blur',()=>handler('hide'));return()=>document.removeEventListener('visibilitychange',f)},
 loadImage(src){return new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=reject;i.src=src})},storage:{get:k=>{try{return localStorage.getItem(k)}catch{return null}},set:(k,v)=>{try{localStorage.setItem(k,v)}catch{}}}});
for(const type of ['pointerdown','pointermove','pointerup','pointercancel'])canvas.addEventListener(type,e=>{e.preventDefault();if(type==='pointerdown')canvas.setPointerCapture(e.pointerId);const r=canvas.getBoundingClientRect();for(const f of pointerListeners)f({type:type.replace('pointer','').replace('down','down'),x:(e.clientX-r.left)*390/r.width,y:(e.clientY-r.top)*height/r.height,id:e.pointerId})});
window.addEventListener('keydown',e=>{if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' ','w','a','s','d','p','P'].includes(e.key)){e.preventDefault();if(!e.repeat)app.key(e.key,true)}});
window.addEventListener('keyup',e=>app.key(e.key,false));window.addEventListener('blur',()=>app.clearKeys());
window.addEventListener('error',e=>{const el=document.getElementById('error');el.style.display='block';el.textContent='启动遇到问题：'+e.message});
window.__salvageApp=app;

}
if(typeof FontFace==='function'){new FontFace('Harbor Sans','url(assets/fonts/harbor-sans.woff)').load().then(font=>document.fonts.add(font)).catch(()=>{}).finally(boot);}else boot();
