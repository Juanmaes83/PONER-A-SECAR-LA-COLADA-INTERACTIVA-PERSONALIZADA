import { chromium } from 'playwright';
import { zipSync, strToU8 } from 'fflate';
import fs from 'node:fs/promises';

await fs.mkdir('artifacts',{recursive:true});
function fixture(name,color){const pos=new Float32Array([-.7,-.5,0,.7,-.5,0,0,.7,0]);const idx=new Uint16Array([0,1,2]);const bin=new Uint8Array(pos.byteLength+idx.byteLength);bin.set(new Uint8Array(pos.buffer),0);bin.set(new Uint8Array(idx.buffer),pos.byteLength);const gltf={asset:{version:'2.0'},scene:0,scenes:[{nodes:[0]}],nodes:[{name,mesh:0}],meshes:[{primitives:[{attributes:{POSITION:0},indices:1,material:0}]}],materials:[{pbrMetallicRoughness:{baseColorFactor:color,metallicFactor:0,roughnessFactor:.7}}],buffers:[{uri:'mesh.bin',byteLength:bin.byteLength}],bufferViews:[{buffer:0,byteOffset:0,byteLength:pos.byteLength,target:34962},{buffer:0,byteOffset:pos.byteLength,byteLength:idx.byteLength,target:34963}],accessors:[{bufferView:0,componentType:5126,count:3,type:'VEC3',min:[-.7,-.5,0],max:[.7,.7,0]},{bufferView:1,componentType:5123,count:3,type:'SCALAR',min:[0],max:[2]}]};return zipSync({[`${name}.gltf`]:strToU8(JSON.stringify(gltf)),'mesh.bin':bin})}
await fs.writeFile('artifacts/library-red.zip',fixture('red-product',[.9,.15,.1,1]));
await fs.writeFile('artifacts/library-blue.zip',fixture('blue-product',[.1,.3,.95,1]));

const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1500,height:1000}});const consoleErrors=[],pageErrors=[];page.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text())});page.on('pageerror',e=>pageErrors.push(String(e)));
await page.goto('http://127.0.0.1:4174/',{waitUntil:'networkidle'});
await page.waitForSelector('#v51al-upload',{state:'attached'});
await page.waitForTimeout(1800);
const bootDiag=await page.evaluate(()=>({library:!!window.HangingMediaV51AssetLibrary,ready:window.__V51_ASSET_LIBRARY__?.ready||false,character:!!window.HangingMediaV51Character,getSceneContext:typeof window.HangingMediaV51Character?.getSceneContext,panel:!!document.querySelector('#v5-1-asset-library'),status:document.querySelector('#v51al-status')?.textContent||'',charCanvas:!!document.querySelector('#v5-1-character-canvas')}));
await fs.writeFile('artifacts/asset-library-boot-diagnostic.json',JSON.stringify({bootDiag,consoleErrors,pageErrors},null,2));
if(!bootDiag.ready)throw new Error(`Asset Library boot failed: ${JSON.stringify({bootDiag,consoleErrors,pageErrors})}`);
await page.setInputFiles('#v51al-upload',['artifacts/library-red.zip','artifacts/library-blue.zip']);
await page.waitForFunction(()=>window.__V51_ASSET_LIBRARY__?.assets?.length===2,null,{timeout:8000});
const imported=await page.evaluate(()=>window.__V51_ASSET_LIBRARY__.assets);
if(imported.length!==2)throw new Error(`Expected 2 assets, got ${imported.length}`);
await page.evaluate(async()=>{const api=window.HangingMediaV51AssetLibrary,assets=api.getAssets();await api.addInstance(assets[0].id);await api.addInstance(assets[1].id);const first=api.getInstances()[0];await api.duplicateInstance(first.id)});
await page.waitForFunction(()=>window.__V51_ASSET_LIBRARY__?.instances?.length===3,null,{timeout:5000});
await page.click('.v51al-instance');
await page.evaluate(()=>{const el=document.querySelector('#v51al-scale');el.value='1.15';el.dispatchEvent(new Event('input',{bubbles:true}))});
await page.waitForTimeout(350);
const beforeReload=await page.evaluate(()=>({assets:window.__V51_ASSET_LIBRARY__.assets,instances:window.__V51_ASSET_LIBRARY__.instances,status:document.querySelector('#v51al-status')?.textContent||''}));
await page.reload({waitUntil:'networkidle'});
await page.waitForFunction(()=>window.__V51_ASSET_LIBRARY__?.ready&&window.__V51_ASSET_LIBRARY__.assets.length===2&&window.__V51_ASSET_LIBRARY__.instances.length===3,null,{timeout:10000});
const restored=await page.evaluate(()=>({assets:window.__V51_ASSET_LIBRARY__.assets,instances:window.__V51_ASSET_LIBRARY__.instances,status:document.querySelector('#v51al-status')?.textContent||''}));
if(restored.assets.length!==2||restored.instances.length!==3)throw new Error(`Restore mismatch: ${JSON.stringify(restored)}`);
await page.screenshot({path:'artifacts/hanging-media-v5-1-asset-library.png',fullPage:true});
const report={bootDiag,imported,beforeReload,restored,consoleErrors,pageErrors};await fs.writeFile('artifacts/runtime-report-v5-1-asset-library.json',JSON.stringify(report,null,2));
if(pageErrors.length)throw new Error(`Page errors: ${pageErrors.join(' | ')}`);const relevant=consoleErrors.filter(x=>!x.includes('favicon'));if(relevant.length)throw new Error(`Console errors: ${relevant.join(' | ')}`);console.log(JSON.stringify(report,null,2));await browser.close();
