const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'), entries=['src/levels.js','src/core.js','src/render.js','src/app.js','web.js'];
const modules=entries.map(f=>JSON.stringify(f)+':function(require,module,exports){\n'+fs.readFileSync(path.join(root,f),'utf8')+'\n}').join(',\n');
fs.mkdirSync(path.join(root,'dist'),{recursive:true});
fs.writeFileSync(path.join(root,'dist/game.js'),`(()=>{const modules={${modules}};const cache={};function load(id){if(cache[id])return cache[id].exports;const m={exports:{}};cache[id]=m;const req=(p)=>{const parts=id.split('/');parts.pop();for(const s of p.split('/')){if(s==='..')parts.pop();else if(s!=='.')parts.push(s);}let key=parts.join('/');if(!key.endsWith('.js'))key+='.js';return load(key);};modules[id](req,m,m.exports);return m.exports;}load('web.js');})();`);
console.log('Built dist/game.js');

const wxEntries=entries.filter(x=>x!=='web.js');
const wxModules=wxEntries.map(f=>JSON.stringify(f)+':function(require,module,exports){\n'+fs.readFileSync(path.join(root,f),'utf8')+'\n}').join(',\n');
fs.writeFileSync(path.join(root,'wechat/app.js'),`const modules={${wxModules}};const cache={};function load(id){if(cache[id])return cache[id].exports;const m={exports:{}};cache[id]=m;const req=(p)=>{const parts=id.split('/');parts.pop();for(const s of p.split('/')){if(s==='..')parts.pop();else if(s!=='.')parts.push(s);}let key=parts.join('/');if(!key.endsWith('.js'))key+='.js';return load(key);};modules[id](req,m,m.exports);return m.exports;}module.exports=load('src/app.js');`);
fs.cpSync(path.join(root,'assets'),path.join(root,'wechat/assets'),{recursive:true});
console.log('Built WeChat app bundle');
