import {existsSync,readFileSync} from 'node:fs';
const files=['index.html','style.css','src/app.js','src/engine.js','src/profile.js','src/view.js','src/game-ui.js','src/setup-ui.js','src/report.js','src/audio.js','src/modifiers.js','src/modifier-ui.js','src/report-format.js','src/storage.js','sw.js','manifest.webmanifest','icon.svg','icon-180.png','icon-192.png','icon-512.png'];
for(const f of files)if(!existsSync(`dist/${f}`))throw Error(`Missing built asset: ${f}`);
const html=readFileSync('dist/index.html','utf8');for(const ref of ['./style.css?v=0.1.3-2','./src/app.js?v=0.1.3-2','./manifest.webmanifest','./icon-180.png'])if(!html.includes(ref))throw Error(`Missing HTML reference: ${ref}`);
const source=readFileSync('dist/sw.js','utf8');for(const f of files.filter(x=>x!=='sw.js'))if(!source.includes(`./${f}`)&&f!=='index.html')throw Error(`Not precached: ${f}`);
console.log(`Verified ${files.length} static assets and HTML/offline references`);

for(const f of ['style.css','src/app.js','src/engine.js','src/profile.js','src/view.js','src/game-ui.js','src/setup-ui.js','src/storage.js','src/report.js','src/audio.js','src/modifiers.js','src/modifier-ui.js','src/report-format.js'])if(!source.includes('./'+f+'?v=0.1.3-2'))throw Error('Not versioned in offline cache: '+f);
