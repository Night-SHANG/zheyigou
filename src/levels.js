'use strict';
const item=(id,x,y,type,name,slots,value,quest=false)=>({id,x,y,type,name,slots,value,quest,collected:false});
const base={width:390,height:1100,start:{x:195,y:130},dock:{x:150,y:65,w:90,h:100}};
const LEVELS=[
 {...base,id:'nameplate',title:'01 / 沉船的名字',brief:'找到旧船名牌，带回船上。',walls:[{id:'reef-a',x:28,y:345,w:112,h:65},{id:'reef-b',x:270,y:680,w:92,h:80}],hazards:[],nets:[],items:[item('plate',195,550,'plate','旧船名牌',1,120,true),item('bottle',300,295,'bottle','漂流瓶',1,40),item('medal',90,650,'medal','铜纪念章',1,70),item('chest',190,850,'chest','沉木箱',2,150)]},
 {...base,id:'shipbell',title:'02 / 船钟还在响',brief:'左边绕远但安全，右边更近却有暗礁。先留足返航电量。',walls:[{id:'wreck',x:120,y:335,w:155,h:300},{id:'reef',x:20,y:790,w:95,h:70}],hazards:[{id:'urchins',x:300,y:410,w:50,h:140}],nets:[],items:[item('bell',230,735,'bell','沉船铜钟',2,240,true),item('bottle',65,490,'bottle','蓝色玻璃瓶',1,55),item('medal',325,660,'medal','船长徽章',1,100),item('sextant',230,940,'sextant','旧六分仪',2,190)]},
 {...base,id:'lastcut',title:'03 / 最后一剪',brief:'只有一剪。剪开捷径省电，还是留给网中的宝箱？',walls:[{id:'wreck',x:115,y:335,w:165,h:280}],hazards:[{id:'sharp-reef',x:22,y:680,w:60,h:100}],nets:[{id:'shortcut',x:280,y:380,w:90,h:25,opened:false},{id:'treasure-net',x:260,y:820,w:90,h:95,opened:false}],items:[item('bell',195,720,'bell','失落的船钟',2,260,true),item('medal',70,490,'medal','航海纪念章',1,65),item('chest',305,866,'chest','网中的宝箱',2,300),item('bottle',115,900,'bottle','密封漂流瓶',1,80)]}
];
module.exports={LEVELS};
