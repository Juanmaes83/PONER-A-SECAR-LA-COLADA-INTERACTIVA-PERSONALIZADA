import { chromium } from 'playwright';
import { zipSync, strToU8 } from 'fflate';
import fs from 'node:fs/promises';

await fs.mkdir('artifacts',{recursive:true});

const pos=new Float32Array([-.7,-.5,0,.7,-.5,0,0,.7,0]);
const idx=new Uint16Array([0,1,2]);
const bin=new Uint8Array(pos.byteLength+idx.byteLength);
bin.set(new Uint8Array(pos.buffer),0);bin.set(new Uint8Array(idx.buffer),pos.byteLength);
const gltf={asset:{version:'2.0'},scene:0,scenes:[{nodes:[0]}],nodes:[{mesh:0}],meshes:[{primitives:[{attributes:{POSITION:0},indices:1,material:0}]}],materials:[{pbrMetallicRoughness:{baseColorFactor:[.9,.35,.2,1],metallicFactor:0,roughnessFactor:.7}}],buffers:[{uri:'mesh.bin',byteLength:bin.byteLength}],bufferViews:[{buffer:0,byteOffset:0,byteLength:pos.byteLength,target:34962},{buffer:0,byteOffset:pos.byteLength,byteLength:idx.byteLength,target:34963}],accessors:[{bufferView:0,componentType:5126,count:3,type:'VEC3',min:[-.7,-.5,0],max:[.7,.7,0]},{bufferView:1,componentType:5123,count:3,type:'SCALAR',min:[0],max:[2]}]};
const gltfZip=zipSync({'fixture.gltf':strToU8(JSON.stringify(gltf)),'mesh.bin':bin});
await fs.writeFile('artifacts/fixture-gltf.zip',gltfZip);

const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2nxoAAAAASUVORK5CYII=','base64');
const obj='mtllib fixture.mtl\no tri\nv -0.7 -0.5 0\nv 0.7 -0.5 0\nv 0 0.7 0\nvt 0 0\nvt 1 0\nvt 0.5 1\nusemtl m1\nf 1/1 2/2 3/3\n';
const mtl='newmtl m1\nKd 1.0 1.0 1.0\nmap_Kd texture.png\n';
const objZip=zipSync({'fixture.obj':strToU8(obj),'fixture.mtl':strToU8(mtl),'texture.png':new Uint8Array(png)});
await fs.writeFile('artifacts/fixture-obj.zip',objZip);

const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1440,height:900}});
const consoleErrors=[];const pageErrors=[];
page.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text())});
page.on('pageerror',e=>pageErrors.push(String(e)));
await page.goto('http://127.0.0.1:4174/',{waitUntil:'networkidle'});
await page.waitForSelector('#v5-1-glb');
await page.waitForFunction(()=>typeof window.HangingMediaV51External?.loadFiles==='function'&&typeof window.HangingMediaV51Character?.mountExternal==='function');

await page.setInputFiles('#v5-1-glb','artifacts/fixture-gltf.zip');
await page.waitForFunction(()=>window.HangingMediaV51External?.lastReport?.meshes>=1,null,{timeout:5000});
const gltfReport=await page.evaluate(()=>({report:window.HangingMediaV51External.lastReport,status:document.querySelector('#v5-1-glb-status')?.textContent||'',template:document.querySelector('#v5-1-template')?.value}));
if(!gltfReport.status.includes('saved locally'))throw new Error(`glTF package did not persist: ${JSON.stringify(gltfReport)}`);
if(gltfReport.template!=='custom')throw new Error(`glTF package did not activate custom mode: ${JSON.stringify(gltfReport)}`);

await page.reload({waitUntil:'networkidle'});
await page.waitForFunction(()=>window.HangingMediaV51External?.lastReport?.name?.includes('fixture-gltf.zip'),null,{timeout:6000});
const restored=await page.evaluate(()=>({report:window.HangingMediaV51External.lastReport,status:document.querySelector('#v5-1-glb-status')?.textContent||''}));

await page.setInputFiles('#v5-1-glb','artifacts/fixture-obj.zip');
await page.waitForFunction(()=>window.HangingMediaV51External?.lastReport?.name?.includes('fixture-obj.zip'),null,{timeout:5000});
const objReport=await page.evaluate(()=>({report:window.HangingMediaV51External.lastReport,status:document.querySelector('#v5-1-glb-status')?.textContent||''}));
if(objReport.report.meshes<1)throw new Error(`OBJ package did not load: ${JSON.stringify(objReport)}`);

const report={gltfReport,restored,objReport,consoleErrors,pageErrors};
await fs.writeFile('artifacts/runtime-report-v5-1-external.json',JSON.stringify(report,null,2));
await page.screenshot({path:'artifacts/hanging-media-v5-1-external.png',fullPage:true});
if(pageErrors.length)throw new Error(`Page errors: ${pageErrors.join(' | ')}`);
const relevantConsole=consoleErrors.filter(x=>!x.includes('favicon'));
if(relevantConsole.length)throw new Error(`Console errors: ${relevantConsole.join(' | ')}`);
console.log(JSON.stringify(report,null,2));
await browser.close();
