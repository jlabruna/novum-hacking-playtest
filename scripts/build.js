import {cpSync,mkdirSync,rmSync,readFileSync,writeFileSync} from 'node:fs';
rmSync('dist',{recursive:true,force:true});mkdirSync('dist/src',{recursive:true});cpSync('src','dist/src',{recursive:true});cpSync('public','dist',{recursive:true});cpSync('style.css','dist/style.css');let html=readFileSync('index.html','utf8');writeFileSync('dist/index.html',html);console.log('Built dist/ static PWA');
