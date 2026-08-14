import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { MTLLoader } from 'three/addons/loaders/MTLLoader.js';
import { unzipSync, strFromU8 } from 'fflate';

const $=(s,r=document)=>r.querySelector(s);
const DB_NAME='hanging-media-v5-1-assets';
const STORE='packages';
const CURRENT='current-external-3d';
const DRACO_PATH='https://www.gstatic.com/draco/versioned/decoders/1.5.7/';
let busy=false;

function status(text,kind='info'){const el=$('#v5-1-glb-status');if(el){el.textContent=text;el.dataset.kind=kind}}
function toast(text){const el=$('#toast');if(!el)return;el.textContent=text;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),1800)}
function ext(name=''){const i=name.lastIndexOf('.');return i<0?'':name.slice(i+1).toLowerCase()}
function baseName(path=''){return path.replaceAll('\\','/').split('/').pop()||path}
function normalized(path=''){return path.replaceAll('\\','/').replace(/^\.\//,'').replace(/^\//,'')}
function mimeFor(name=''){const e=ext(name);return ({png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp',gif:'image/gif',bin:'application/octet-stream',glb:'model/gltf-binary',gltf:'model/gltf+json',obj:'text/plain',mtl:'text/plain'})[e]||'application/octet-stream'}
function sleep(ms){return new Promise(r=>setTimeout(r,ms))}
async function waitRuntime(timeout=5000){const start=performance.now();while(performance.now()-start<timeout){if(window.HangingMediaV51Character?.mountExternal&&$('#v5-1-character-canvas'))return;await sleep(50)}throw new Error('V5.1 character runtime did not become ready')}

function openDB(){return new Promise((resolve,reject)=>{const req=indexedDB.open(DB_NAME,1);req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains(STORE))db.createObjectStore(STORE)};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)})}
async function persistFiles(files){const payload=[];for(const f of files)payload.push({name:f.name,type:f.type||mimeFor(f.name),lastModified:f.lastModified||Date.now(),buffer:await f.arrayBuffer()});const db=await openDB();await new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).put(payload,CURRENT);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)});db.close()}
async function restoreFiles(){const db=await openDB();const payload=await new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readonly');const r=tx.objectStore(STORE).get(CURRENT);r.onsuccess=()=>resolve(r.result||null);r.onerror=()=>reject(r.error)});db.close();return payload?.map(x=>new File([x.buffer],x.name,{type:x.type,lastModified:x.lastModified}))||[]}
async function clearStored(){const db=await openDB();await new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).delete(CURRENT);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)});db.close()}

function makeManager(resources){const manager=new THREE.LoadingManager();const urls=[];const exact=new Map();const byBase=new Map();for(const [name,blob] of resources){const url=URL.createObjectURL(blob);urls.push(url);exact.set(normalized(name),url);byBase.set(baseName(name),url)}manager.setURLModifier(url=>{if(/^blob:|^data:|^https?:/i.test(url))return url;let clean;try{clean=normalized(decodeURIComponent(String(url).split('?')[0].split('#')[0]))}catch{clean=normalized(String(url).split('?')[0].split('#')[0])}return exact.get(clean)||byBase.get(baseName(clean))||url});return {manager,revoke:()=>urls.forEach(URL.revokeObjectURL)}}
function configureGLTF(manager){const loader=new GLTFLoader(manager);const draco=new DRACOLoader(manager);draco.setDecoderPath(DRACO_PATH);draco.setDecoderConfig({type:'js'});loader.setDRACOLoader(draco);return {loader,draco}}
function parseGLTF(loader,data,path=''){return new Promise((resolve,reject)=>loader.parse(data,path,resolve,reject))}
function inspect(root,animations=[]){let meshes=0,skinned=0,bones=0,triangles=0;root.traverse(o=>{if(o.isMesh){meshes++;if(o.isSkinnedMesh)skinned++;const p=o.geometry?.index?o.geometry.index.count:(o.geometry?.attributes?.position?.count||0);triangles+=Math.floor(p/3)}if(o.isBone)bones++});return {meshes,skinned,bones,triangles,animations:animations.length,rigged:skinned>0||bones>0,animated:animations.length>0}}
async function mount(root,animations,name){await waitRuntime();const report=inspect(root,animations);window.HangingMediaV51Character.mountExternal(root,animations,name,report);const mode=report.rigged&&report.animated?'rigged + animated':report.rigged?'rigged, no clips':'static preview';status(`${name} · ${report.meshes} mesh(es) · ${report.triangles.toLocaleString()} tris · ${report.animations} clip(s) · ${mode}`,'ok');toast(`3D asset loaded · ${mode}`);window.HangingMediaV51External.lastReport={name,...report};return report}

async function loadGLB(buffer,name){const {manager,revoke}=makeManager([]);const {loader,draco}=configureGLTF(manager);try{const gltf=await parseGLTF(loader,buffer,'');return await mount(gltf.scene,gltf.animations||[],name)}finally{draco.dispose();revoke()}}
async function loadGLTFText(text,resources,name){const {manager,revoke}=makeManager(resources);const {loader,draco}=configureGLTF(manager);try{const gltf=await parseGLTF(loader,text,'');return await mount(gltf.scene,gltf.animations||[],name)}finally{draco.dispose();revoke()}}
async function loadOBJText(objText,mtlText,resources,name){const {manager,revoke}=makeManager(resources);try{const objLoader=new OBJLoader(manager);if(mtlText){const mats=new MTLLoader(manager).parse(mtlText,'');mats.preload();objLoader.setMaterials(mats)}const root=objLoader.parse(objText);return await mount(root,[],name)}finally{revoke()}}

async function loadZip(file){const raw=unzipSync(new Uint8Array(await file.arrayBuffer()));const names=Object.keys(raw).filter(n=>!n.endsWith('/'));const resources=new Map(names.map(n=>[n,new Blob([raw[n]],{type:mimeFor(n)})]));const glb=names.find(n=>ext(n)==='glb');if(glb)return loadGLB(raw[glb].buffer.slice(raw[glb].byteOffset,raw[glb].byteOffset+raw[glb].byteLength),`${file.name} / ${baseName(glb)}`);const gltf=names.find(n=>ext(n)==='gltf');if(gltf)return loadGLTFText(strFromU8(raw[gltf]),resources,`${file.name} / ${baseName(gltf)}`);const obj=names.find(n=>ext(n)==='obj');if(obj){const mtl=names.find(n=>ext(n)==='mtl');return loadOBJText(strFromU8(raw[obj]),mtl?strFromU8(raw[mtl]):'',resources,`${file.name} / ${baseName(obj)}`)}throw new Error('ZIP does not contain .glb, .gltf or .obj')}
async function loadLoose(files){const primary=files.find(f=>['glb','gltf','obj'].includes(ext(f.name)));if(!primary)throw new Error('Select a .glb, .gltf, .obj or a supported .zip package');const e=ext(primary.name);if(e==='glb')return loadGLB(await primary.arrayBuffer(),primary.name);const resources=new Map(files.map(f=>[f.name,f]));if(e==='gltf')return loadGLTFText(await primary.text(),resources,primary.name);const mtl=files.find(f=>ext(f.name)==='mtl');return loadOBJText(await primary.text(),mtl?await mtl.text():'',resources,primary.name)}
async function loadFiles(fileList,{persist=true}={}){if(busy)return;const files=[...fileList];if(!files.length)return;busy=true;status('Loading external 3D package…');try{const first=files[0];const report=ext(first.name)==='zip'?await loadZip(first):await loadLoose(files);if(persist){try{await persistFiles(files);status(`${$('#v5-1-glb-status')?.textContent||'3D asset loaded'} · saved locally`,'ok')}catch(err){console.warn('3D asset loaded but could not be persisted',err);status(`${$('#v5-1-glb-status')?.textContent||'3D asset loaded'} · persistence unavailable`,'warn')}}return report}catch(err){console.error('V5.1 external 3D load failed',err);status(`Load failed · ${err.message}`,'error');toast('3D load failed — see status');throw err}finally{busy=false}}

function enhanceUI(){const input=$('#v5-1-glb');if(!input)return setTimeout(enhanceUI,60);input.accept='.glb,.gltf,.zip,.obj,.mtl,.bin,image/png,image/jpeg,image/webp,image/gif';input.multiple=true;const label=document.querySelector('label[for="v5-1-glb"]');if(label)label.textContent='+ 3D asset / ZIP';input.addEventListener('change',async e=>{e.stopImmediatePropagation();const files=[...(e.target.files||[])];if(files.length)await loadFiles(files);e.target.value=''},true);const box=$('#v5-1-glb-status');if(box)box.textContent='Supports GLB (including Draco), GLTF packages, ZIP glTF/OBJ, and loose OBJ/MTL/resources. External assets persist locally.';const clear=document.createElement('button');clear.type='button';clear.className='secondary-button';clear.textContent='Clear saved 3D asset';clear.onclick=async()=>{await clearStored();window.HangingMediaV51Character?.clearExternal?.();status('Saved external 3D asset cleared')};box?.after(clear)}
async function restore(){try{const files=await restoreFiles();if(files.length){status(`Restoring ${files[0].name}…`);await loadFiles(files,{persist:false})}}catch(err){console.warn('Could not restore saved 3D asset',err);status(`Saved 3D restore failed · ${err.message}`,'warn')}}

window.HangingMediaV51External={loadFiles,clearStored,lastReport:null};
function boot(){enhanceUI();setTimeout(restore,300)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
