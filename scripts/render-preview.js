// Executes the production renderer using an installed native Canvas host.
// This is pixel inspection, not a browser or WeChat-device playtest.
const {createCanvas,loadImage,GlobalFonts}=require('@napi-rs/canvas');const fs=require('fs'),path=require('path');const root=path.resolve(__dirname,'..');
GlobalFonts.registerFromPath('/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc','Noto Sans CJK SC');
const {render}=require('../src/render'),{createGame}=require('../src/core');
(async()=>{const c=createCanvas(390,780),ctx=c.getContext('2d'),s=createGame(1);s.hook={x:70,y:520,r:14};s.messageTime=0;render(ctx,s,{screen:'play',camera:270,buttons:[{x:344,y:83,w:33,h:32,label:'Ⅱ'},{x:225,y:645,w:147,h:45,label:'靠近宝物抓取',size:12}],hint:'剪网 1 次 · 带回船上才算收获'},390,780);fs.writeFileSync(path.join(root,'qa/play.png'),c.toBuffer('image/png'));render(ctx,null,{screen:'menu',buttons:[{x:48,y:605,w:294,h:52,label:'开始打捞 →',primary:true},{x:48,y:672,w:294,h:40,label:'挑战沉船'},{x:305,y:8,w:76,h:29,label:'声音 开'}]},390,780,{harbor:await loadImage(path.join(root,'assets/harbor-reference.png'))});fs.writeFileSync(path.join(root,'qa/menu.png'),c.toBuffer('image/png'));})();
