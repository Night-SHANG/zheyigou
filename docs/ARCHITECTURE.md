# Shared runtime architecture

No dependencies, CommonJS modules so both browser bundle and WeChat require work. World 390 units wide, 1100 units high, surface dock y=120; mobile display 390x780 logical units; renderer camera follows hook below surface. Drawing and all input remain outside simulation.

## Core module API (src/core.js)
exports = { createGame, step, act, togglePause, getContextAction, snapshot, restore }
createGame(levelIndex=0) -> state. step(state, {x,y}, dtSeconds) mutates state, caps dt; x/y normalized -1..1. act(state) performs currently available interaction once, never proximity-auto-pickup. togglePause(state, paused) explicit boolean. getContextAction(state) -> null or {kind:'grab'|'cut'|'dock',label,targetId}. snapshot(state) -> serializable plain data. restore(data) -> validated state or null.

## State shape
{ version:1, levelIndex, phase:'playing'|'paused'|'success'|'failed', time, hook:{x,y,r:14}, battery:100, hp:3, maxCargo:4, cargo:[], cuts:1, message:'', messageTime:0, level, items, nets, trail:[], result:null }
level = { id,title,brief,width:390,height:1100,start:{x:195,y:130}, dock:{x:150,y:65,w:90,h:100}, walls:[{id,x,y,w,h}], hazards:[{id,x,y,w,h}], items:[...], nets:[...] }
item = {id,x,y,type:'plate'|'bell'|'bottle'|'medal'|'chest'|'sextant',name,slots:1|2,value,quest:boolean,collected:boolean}. Cargo carries same item objects or serializable clones. Net = {id,x,y,w,h,opened:boolean}. Trail point={x,y}; safe history for return-line drawing, no true rope physics. result={questComplete,score,items:[...]} only once after dock, success means a safely finished haul, questComplete can be false. Failed keeps no haul reward.

## Important behavior
Up/down/left/right, stop when released; wall blocks/slides without damage; hazards have cooldown; step pause freezes all clocks/resources. Battery charges actual movement (heavier cargo costs more), not waiting. Full cargo rejects pickup. A single cut opens a blocking net or releases a specific optional item. Net collision must disappear when opened. End triggers only dock with cargo or failure, not mere full cargo. Retry fixed layout. At least one complete route per level. Show helper message when action fails. No currency persistence, accounts, purchases, ads, generated audio or long-term progression.

## Runtime / adapter contract
src/app.js exports createApp(platform) -> {pause,resume,destroy}; platform={canvas,width,height,dpr,requestFrame,cancelFrame,onPointer(handler),onLifecycle(handler),loadImage(src),storage:{get,set}}. Pointer event normalized {type:'down'|'move'|'up'|'cancel',x,y,id} in logical screen coordinates. onPointer/onLifecycle return unsubscribe; lifecycle receives 'hide' or 'show'. app uses canvas.getContext('2d'); no DOM or window globals. Renderer exports render(ctx,state,ui,width,height,assets). App owns menu, input, camera and per-session level switching.
