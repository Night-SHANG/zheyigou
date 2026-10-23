'use strict';
/** Thin native Mini Game adapter; no DOM emulation or browser globals. */
function createWechatPlatform(wx, canvas, frames) {
  const info=typeof wx.getWindowInfo==='function'?wx.getWindowInfo():wx.getSystemInfoSync();
  const windowWidth=info.windowWidth, windowHeight=info.windowHeight;
  if(!(windowWidth>0&&windowHeight>0))throw new Error('微信窗口尺寸不可用');
  const width=390, height=windowHeight/windowWidth*width;
  const pixelRatio=Math.max(1,Math.min(3,Number(info.pixelRatio)||1));
  canvas.width=Math.round(windowWidth*pixelRatio);
  canvas.height=Math.round(windowHeight*pixelRatio);
  let muted=false, audioDestroyed=false;
  const voices=new Map();
  const soundNames=new Set(['ui-click','pickup','net-cut']);
  function stopAudio(){for(const voice of voices.values())try{voice.stop();}catch(_){}}
  function playSound(name){
    if(muted||audioDestroyed||!soundNames.has(name)||typeof wx.createInnerAudioContext!=='function')return;
    try{
      let voice=voices.get(name);
      if(!voice){voice=wx.createInnerAudioContext();voices.set(name,voice);voice.autoplay=false;voice.loop=false;voice.volume=1;voice.src='assets/audio/'+name+'.wav';if(typeof voice.onError==='function')voice.onError(()=>{});}
      voice.stop();voice.play();
    }catch(_){/* Optional sound cannot interrupt the game. */}
  }
  function setMuted(value){muted=!!value;if(muted)stopAudio();}
  function destroyAudio(){audioDestroyed=true;stopAudio();for(const voice of voices.values())try{voice.destroy();}catch(_){}voices.clear();}
  function subscribe(pairs,handler){
    const subscriptions=pairs.map(([event,translate])=>{
      const callback=value=>translate(value,handler);
      wx['on'+event](callback);return [event,callback];
    });
    return ()=>subscriptions.forEach(([event,callback])=>{
      if(typeof wx['off'+event]==='function')wx['off'+event](callback);
    });
  }
  return {
    canvas,width,height,dpr:canvas.width/width,playSound,setMuted,destroyAudio,
    requestFrame:callback=>frames.requestAnimationFrame(callback),
    cancelFrame:id=>frames.cancelAnimationFrame(id),
    onPointer:handler=>subscribe(['Start','Move','End','Cancel'].map((suffix,i)=>[
      'Touch'+suffix,(event,send)=>{
        for(const touch of event.changedTouches||[]) {
          const x=touch.clientX==null?touch.x:touch.clientX;
          const y=touch.clientY==null?touch.y:touch.clientY;
          if(Number.isFinite(x)&&Number.isFinite(y))send({type:['down','move','up','cancel'][i],id:touch.identifier,x:x/windowWidth*width,y:y/windowHeight*height});
        }
      }
    ]),handler),
    onLifecycle:handler=>subscribe([['Hide',(_,send)=>{stopAudio();send('hide');}],['Show',(_,send)=>send('show')]],handler),
    loadImage:src=>new Promise((resolve,reject)=>{
      const image=wx.createImage();
      image.onload=()=>{image.onload=null;image.onerror=null;resolve(image);};
      image.onerror=error=>{image.onload=null;image.onerror=null;reject(new Error(error&&error.errMsg||'图片加载失败：'+src));};
      image.src=src;
    }),
    storage:{get:key=>wx.getStorageSync(key),set:(key,value)=>wx.setStorageSync(key,value)}
  };
}
module.exports={createWechatPlatform};
