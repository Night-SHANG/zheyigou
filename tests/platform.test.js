'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const adapterPath=path.join(__dirname,'../wechat/platform.js');
function host(){
 const listeners={}; const off=[];
 const wx={getWindowInfo:()=>({windowWidth:360,windowHeight:720,pixelRatio:2}),getStorageSync:k=>k==='throw'?(()=>{throw Error('blocked')})():({score:3}),setStorageSync:()=>{throw Error('quota');}};
 for(const key of ['TouchStart','TouchMove','TouchEnd','TouchCancel','Hide','Show']) {wx['on'+key]=cb=>listeners[key]=cb;wx['off'+key]=cb=>{if(listeners[key]===cb)delete listeners[key];off.push(key);};}
 const canvas={}; wx.createImage=()=>({}); const frames={requestAnimationFrame:fn=>7,cancelAnimationFrame:id=>{canvas.cancelled=id;}};
 return {wx,canvas,listeners,off,frames};
}
function make(){assert.ok(fs.existsSync(adapterPath),'WeChat platform adapter must exist');return require(adapterPath).createWechatPlatform;}
test('wx adapter translates touch pixels into logical world view and unsubscribes',()=>{
 const h=host(),p=make()(h.wx,h.canvas,h.frames);const got=[];const unsub=p.onPointer(e=>got.push(e));
 h.listeners.TouchStart({changedTouches:[{identifier:4,clientX:180,clientY:360}]});
 assert.deepEqual(got,[{type:'down',id:4,x:195,y:390}]);
 h.listeners.TouchCancel({changedTouches:[{identifier:4,clientX:180,clientY:360}]});assert.equal(got[1].type,'cancel');
 assert.equal(p.width,390);assert.equal(p.height,780);assert.equal(p.dpr,720/390);unsub();assert.equal(h.listeners.TouchStart,undefined);
});
test('wx adapter forwards lifecycle and canvas RAF without browser globals',()=>{
 const h=host(),p=make()(h.wx,h.canvas,h.frames),got=[];const unsub=p.onLifecycle(e=>got.push(e));
 h.listeners.Hide();h.listeners.Show();assert.deepEqual(got,['hide','show']);
 assert.equal(p.requestFrame(()=>{}),7);p.cancelFrame(7);assert.equal(h.canvas.cancelled,7);unsub();assert.equal(h.listeners.Hide,undefined);
});
test('storage errors remain observable and image failure rejects',async()=>{
 const h=host(),p=make()(h.wx,h.canvas,h.frames);assert.deepEqual(p.storage.get('score'),{score:3});assert.throws(()=>p.storage.get('throw'),/blocked/);assert.throws(()=>p.storage.set('x',{}),/quota/);
 let image;h.wx.createImage=()=>image={};const pending=p.loadImage('assets/test.png');assert.equal(image.src,'assets/test.png');image.onerror({errMsg:'missing'});await assert.rejects(pending,/missing/);
 const loaded=p.loadImage('assets/ok.png');image.onload();assert.equal(await loaded,image);
});
test('wx supports legacy window info and x/y touch fields without DPR leaking into input',()=>{
 const h=host();h.wx.getSystemInfoSync=h.wx.getWindowInfo;delete h.wx.getWindowInfo;
 const p=make()(h.wx,h.canvas,h.frames),got=[];p.onPointer(e=>got.push(e));
 h.listeners.TouchMove({changedTouches:[{identifier:0,x:0,y:0},{identifier:9,x:360,y:720}]});
 assert.deepEqual(got,[{type:'move',id:0,x:0,y:0},{type:'move',id:9,x:390,y:780}]);assert.equal(h.canvas.width,720);assert.equal(h.canvas.height,1440);
});
test('wechat project uses real game entry and keeps unassigned AppID empty',()=>{
 const root=path.join(__dirname,'../wechat');const config=JSON.parse(fs.readFileSync(path.join(root,'project.config.json')));
 assert.equal(config.compileType,'game');assert.equal(config.appid,'');assert.equal(config.miniprogramRoot,'./');
 assert.equal(JSON.parse(fs.readFileSync(path.join(root,'game.json'))).deviceOrientation,'portrait');
 const entry=fs.readFileSync(path.join(root,'game.js'),'utf8');assert.match(entry,/wx\.createCanvas\(\)/);assert.match(entry,/createApp\(createWechatPlatform/);
 assert.doesNotMatch(fs.readFileSync(adapterPath,'utf8'),/\b(?:document|window)\./);
});

// Production entry smoke: no browser globals, no modern-browser-only roundRect.
// These are native host contract checks, not device/visual acceptance.
function productionHost(initialStorage){
 const vm=require('node:vm');const root=path.join(__dirname,'../wechat');
 assert.ok(fs.existsSync(path.join(root,'app.js')),'Build must create the production WeChat app.js before the full test run');
 const draws=[],pendingFrames=new Map(),handlers={};let nextFrame=1;
 const ctx={};
 for(const name of ['beginPath','closePath','moveTo','lineTo','quadraticCurveTo','bezierCurveTo','arc','rect','fill','stroke','fillRect','strokeRect','clearRect','save','restore','translate','scale','rotate','setTransform','clip','drawImage','setLineDash'])ctx[name]=(...args)=>draws.push({name,args});
 ctx.fillText=(...args)=>draws.push({name:'fillText',args});
 ctx.measureText=s=>({width:String(s).length*12});
 ctx.createLinearGradient=ctx.createRadialGradient=()=>({addColorStop(){}});
 const canvas={getContext:type=>{assert.equal(type,'2d');return ctx;}};
 const storage=new Map(initialStorage);
 const wx={createCanvas:()=>canvas,getWindowInfo:()=>({windowWidth:390,windowHeight:780,pixelRatio:2}),createImage:()=>{const img={width:1024,height:1536};Object.defineProperty(img,'src',{set(value){assert.ok(fs.existsSync(path.join(root,value)),'Packaged image exists: '+value);queueMicrotask(()=>img.onload&&img.onload());}});return img;},getStorageSync:key=>storage.get(key),setStorageSync:(key,value)=>storage.set(key,value)};
 for(const name of ['TouchStart','TouchMove','TouchEnd','TouchCancel','Hide','Show']){wx['on'+name]=cb=>handlers[name]=cb;wx['off'+name]=cb=>{if(handlers[name]===cb)delete handlers[name];};}
 const context=vm.createContext({wx,console,requestAnimationFrame:cb=>{const id=nextFrame++;pendingFrames.set(id,cb);return id;},cancelAnimationFrame:id=>pendingFrames.delete(id)});
 const cache={};
 function load(name){const filename=path.join(root,name.endsWith('.js')?name:name+'.js');if(cache[filename])return cache[filename].exports;const module={exports:{}};cache[filename]=module;const wrapper=vm.runInContext('(function(require,module,exports){'+fs.readFileSync(filename,'utf8')+'\n})',context,{filename});wrapper(p=>load(path.relative(root,path.resolve(path.dirname(filename),p))),module,module.exports);return module.exports;}
 load('game.js');let now=0;
 const frame=(count=1)=>{for(let k=0;k<count;k++){now+=16.6667;const scheduled=[...pendingFrames.values()];pendingFrames.clear();for(const callback of scheduled)callback(now);}};
 const touch=(name,x,y,id=1)=>handlers[name]({changedTouches:[{identifier:id,clientX:x,clientY:y}]});
 return {draws,handlers,storage,frame,touch,clear:()=>{draws.length=0;},texts:()=>draws.filter(d=>d.name==='fillText').map(d=>d.args)};
}
test('production wx entry renders menu, accepts native touches, moves and cancels across hide/show',async()=>{
 const h=productionHost();await new Promise(resolve=>setImmediate(resolve));h.frame();
 assert.ok(h.texts().some(t=>t[0]==='开始打捞  →'));
 h.touch('TouchStart',195,630);h.touch('TouchEnd',195,630);h.clear();h.frame();assert.ok(h.texts().some(t=>t[0]==='下水，开始探索'));
 h.touch('TouchStart',195,515);h.touch('TouchEnd',195,515);h.frame(2);
 h.touch('TouchStart',100,400);h.touch('TouchMove',100,450);h.frame(30);h.handlers.Hide();
 const saved=JSON.parse(h.storage.get('zheyigou-experiment-v1'));assert.equal(saved.phase,'paused');assert.ok(saved.hook.y>150,'actual native input advances production simulation');assert.ok(saved.battery<100);
 h.handlers.Show();h.clear();h.frame(5);assert.ok(h.texts().some(t=>t[0]==='继续打捞'),'show stays paused');
 h.touch('TouchStart',195,440);h.touch('TouchEnd',195,440);h.touch('TouchMove',100,500);h.frame(30);h.handlers.Hide();
 const after=JSON.parse(h.storage.get('zheyigou-experiment-v1'));assert.deepEqual(after.hook,saved.hook,'old pointer cannot resume movement');assert.equal(after.battery,saved.battery);assert.ok(h.draws.some(d=>d.name==='arc'),'real game render executes');
});
test('production wx first haul reaches result and retries through touch input only',async()=>{
 const h=productionHost();await new Promise(resolve=>setImmediate(resolve));h.frame();
 const tap=(x,y)=>{h.touch('TouchStart',x,y);h.touch('TouchEnd',x,y);h.frame();};tap(195,630);tap(195,515);h.frame(2);
 h.touch('TouchStart',100,400);h.touch('TouchMove',100,450);h.frame(170);h.touch('TouchEnd',100,450);tap(290,665);
 let saved=JSON.parse(h.storage.get('zheyigou-experiment-v1'));assert.equal(saved.cargo.length,1);assert.equal(saved.cargo[0].id,'plate');
 h.clear();h.touch('TouchStart',100,400);h.touch('TouchMove',100,350);h.frame(190);h.touch('TouchEnd',100,350);tap(290,665);h.clear();h.frame();
 saved=JSON.parse(h.storage.get('zheyigou-experiment-v1'));assert.equal(saved.phase,'success');assert.equal(saved.result.questComplete,true);
 assert.ok(h.texts().some(t=>t[0]==='这一钩，带回来了！'),'successful docking must expose the result screen');
 tap(100,500);h.clear();h.frame();assert.ok(h.texts().some(t=>t[0]==='下水，开始探索'),'retry returns to a fresh briefing');
});
test('production wx reload restores a saved haul paused and never silently resumes it',async()=>{
 const h=productionHost();await new Promise(resolve=>setImmediate(resolve));h.frame();
 const tap=(host,x,y)=>{host.touch('TouchStart',x,y);host.touch('TouchEnd',x,y);host.frame();};tap(h,195,630);tap(h,195,515);h.frame(2);
 h.touch('TouchStart',100,400);h.touch('TouchMove',100,450);h.frame(40);h.handlers.Hide();const before=JSON.parse(h.storage.get('zheyigou-experiment-v1'));
 const fresh=productionHost(h.storage);await new Promise(resolve=>setImmediate(resolve));fresh.frame();assert.ok(fresh.texts().some(t=>t[0]==='继续上次打捞'));
 tap(fresh,195,690);fresh.clear();fresh.frame(30);assert.ok(fresh.texts().some(t=>t[0]==='继续打捞'));
 fresh.handlers.Hide();const restored=JSON.parse(fresh.storage.get('zheyigou-experiment-v1'));assert.equal(restored.phase,'paused');assert.deepEqual(restored.hook,before.hook);assert.equal(restored.battery,before.battery);
});
test('wx sound pool is bounded, gesture-driven, muted and stopped on hide',()=>{
 const h=host(),voices=[];h.wx.createInnerAudioContext=()=>{const a={plays:0,stops:0,destroyed:false,play(){this.plays++},stop(){this.stops++},destroy(){this.destroyed=true},onError(cb){this.error=cb}};voices.push(a);return a;};
 const p=make()(h.wx,h.canvas,h.frames);assert.equal(typeof p.playSound,'function');assert.equal(voices.length,0);p.playSound('ui-click');p.playSound('ui-click');p.playSound('pickup');p.playSound('net-cut');p.playSound('unknown');assert.equal(voices.length,3);assert.equal(voices[0].src,'assets/audio/ui-click.wav');assert.equal(voices[0].plays,2);
 const unsub=p.onLifecycle(()=>{});h.listeners.Hide();assert.ok(voices.every(v=>v.stops>0));p.setMuted(true);p.playSound('pickup');assert.equal(voices[1].plays,1);p.setMuted(false);p.playSound('pickup');assert.equal(voices[1].plays,2);voices[1].play=()=>{throw Error('audio device unavailable')};assert.doesNotThrow(()=>p.playSound('pickup'));p.destroyAudio();assert.ok(voices.every(v=>v.destroyed));unsub();
});
test('production wx same-session pause to home can continue the latest saved position',async()=>{
 const h=productionHost();await new Promise(resolve=>setImmediate(resolve));h.frame();
 const tap=(x,y)=>{h.touch('TouchStart',x,y);h.touch('TouchEnd',x,y);h.frame();};tap(195,630);tap(195,515);h.frame(2);
 h.touch('TouchStart',100,400);h.touch('TouchMove',100,450);h.frame(40);h.touch('TouchEnd',100,450);h.handlers.Hide();const before=JSON.parse(h.storage.get('zheyigou-experiment-v1'));
 tap(260,500);h.clear();h.frame();assert.ok(h.texts().some(t=>t[0]==='继续上次打捞'));assert.ok(!h.texts().some(t=>t[0]==='靠岸歇一会儿'),'home menu must not retain pause overlay');tap(195,690);h.clear();h.frame();assert.ok(h.texts().some(t=>t[0]==='继续打捞'));h.handlers.Hide();const resumed=JSON.parse(h.storage.get('zheyigou-experiment-v1'));assert.deepEqual(resumed.hook,before.hook);assert.equal(resumed.battery,before.battery);
});
