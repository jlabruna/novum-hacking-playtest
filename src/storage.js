const DB='novum-intrusion',VERSION=1;
export function openDB(){return new Promise((resolve,reject)=>{const req=indexedDB.open(DB,VERSION);req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains('state'))db.createObjectStore('state')};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)})}
export async function get(key){let db=await openDB();return new Promise((res,rej)=>{let tx=db.transaction('state','readonly'),q=tx.objectStore('state').get(key);q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error);tx.oncomplete=()=>db.close()})}
export async function put(key,value){let db=await openDB();return new Promise((res,rej)=>{let tx=db.transaction('state','readwrite');tx.objectStore('state').put(value,key);tx.oncomplete=()=>{db.close();res()};tx.onerror=()=>rej(tx.error)})}
export async function clearCompletedRuns(){await put('runs',[])}
export async function backup(){return {format:'novum-intrusion-backup',schema:1,exported:new Date().toISOString(),settings:await get('settings'),hacker:await get('hacker'),active:await get('active'),runs:await get('runs')||[]}}
export async function restore(data){if(data?.format!=='novum-intrusion-backup'||data.schema!==1||!Array.isArray(data.runs))throw Error('Unsupported backup');for(let key of ['settings','hacker','active','runs'])await put(key,data[key]??(key==='runs'?[]:null))}
