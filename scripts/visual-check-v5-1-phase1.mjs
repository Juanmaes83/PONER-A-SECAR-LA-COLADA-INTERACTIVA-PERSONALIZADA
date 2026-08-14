import {chromium} from 'playwright';
import fs from 'node:fs/promises';
await fs.mkdir('artifacts',{recursive:true});
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAIAAAAmkwkpAAAAFElEQVR42mNkYPj/n4GBgYGJAQoAHgAB/7VyrQAAAABJRU5ErkJggg==','base64');
await fs.writeFile('artifacts/phase1-image.png',png);
await fs.writeFile('artifacts/phase1-object.obj','v -1 0 0\nv 1 0 0\nv 0 2 0\nv 0 0 0.6\nf 1 2 3\nf 1 4 2\nf 2 4 3\nf 3 4 1\n');
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1600,height:1000}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
await page.goto('http://127.0.0.1:4174/',{waitUntil:'networkidle'});
await page.waitForFunction(()=>window.__V51_PHASE1__?.ready&&window.__V51_ASSET_LIBRARY__?.ready,{timeout:15000});

await page.locator('#media-upload').setInputFiles('artifacts/phase1-image.png');
await page.waitForFunction(()=>document.querySelectorAll('#media-slots .media-slot').length>=1&&/ready/i.test(document.querySelector('#v51-media-health')?.textContent||''),null,{timeout:10000});

const videoResult=await page.evaluate(async()=>{const c=document.createElement('canvas');c.width=96;c.height=64;const x=c.getContext('2d');const stream=c.captureStream(12);const rec=new MediaRecorder(stream,{mimeType:MediaRecorder.isTypeSupported('video/webm;codecs=vp8')?'video/webm;codecs=vp8':'video/webm'}),chunks=[];rec.ondataavailable=e=>e.data.size&&chunks.push(e.data);const stopped=new Promise(r=>rec.onstop=r);rec.start(80);for(let i=0;i<8;i++){x.fillStyle=i%2?'#e85d4a':'#285c88';x.fillRect(0,0,96,64);x.fillStyle='white';x.fillRect(10+i*4,20,20,20);await new Promise(r=>setTimeout(r,55));}rec.stop();await stopped;stream.getTracks().forEach(t=>t.stop());const blob=new Blob(chunks,{type:'video/webm'}),file=new File([blob],'phase1-video.webm',{type:'video/webm'}),dt=new DataTransfer();dt.items.add(file);const input=document.querySelector('#media-upload');input.files=dt.files;input.dispatchEvent(new Event('change',{bubbles:true}));return blob.size;});
if(videoResult<100)throw new Error('Synthetic WebM was not generated');
await page.waitForFunction(()=>[...document.querySelectorAll('#media-slots .media-kind')].some(e=>/video/i.test(e.textContent||'')),null,{timeout:10000});

await page.locator('#background-upload').setInputFiles('artifacts/phase1-image.png');
await page.waitForFunction(()=>/image/i.test(document.querySelector('#v51-background-health')?.textContent||''),null,{timeout:10000});

await page.evaluate(async()=>{const c=document.createElement('canvas');c.width=160;c.height=90;const x=c.getContext('2d'),stream=c.captureStream(12),rec=new MediaRecorder(stream,{mimeType:MediaRecorder.isTypeSupported('video/webm;codecs=vp8')?'video/webm;codecs=vp8':'video/webm'}),chunks=[];rec.ondataavailable=e=>e.data.size&&chunks.push(e.data);const stopped=new Promise(r=>rec.onstop=r);rec.start(80);for(let i=0;i<8;i++){x.fillStyle=i%2?'#2a745f':'#d2a75b';x.fillRect(0,0,160,90);await new Promise(r=>setTimeout(r,55));}rec.stop();await stopped;stream.getTracks().forEach(t=>t.stop());const file=new File([new Blob(chunks,{type:'video/webm'})],'phase1-background.webm',{type:'video/webm'}),dt=new DataTransfer();dt.items.add(file);const input=document.querySelector('#background-upload');input.files=dt.files;input.dispatchEvent(new Event('change',{bubbles:true}));});
await page.waitForFunction(()=>/video/i.test(document.querySelector('#v51-background-health')?.textContent||''),null,{timeout:10000});
await page.locator('[data-bg-fit="contain"]').click();
await page.waitForFunction(()=>/CONTAIN/.test(document.querySelector('#v51-background-health')?.textContent||''));

await page.locator('#v5-1-brand-text').fill('PHASE 1 TEXT WORKS');
await page.locator('#v5-1-brand-position').selectOption('top-center');
await page.locator('#v5-1-add-text').click();
await page.waitForFunction(()=>{const e=[...document.querySelectorAll('#v3-branding-overlay .v3-text')].find(x=>x.textContent.includes('PHASE 1 TEXT WORKS'));if(!e)return false;const r=e.getBoundingClientRect();return r.width>20&&r.height>5&&getComputedStyle(e).visibility!=='hidden'&&getComputedStyle(e).opacity!=='0';},null,{timeout:5000});

await page.locator('#v51lib-upload').setInputFiles('artifacts/phase1-object.obj');
await page.waitForFunction(()=>window.HangingMediaV51AssetLibrary?.getAssets?.().length>=1,null,{timeout:8000});
await page.locator('#v51lib-grid [data-act="add"]').first().click();
await page.waitForFunction(()=>window.HangingMediaV51AssetLibrary?.getInstances?.().length>=1,null,{timeout:10000});
await page.evaluate(()=>window.__V51_PHASE1__.matchRoots());
const id=await page.evaluate(()=>window.HangingMediaV51AssetLibrary.getInstances()[0].id);

const point=await page.evaluate(id=>{const c=window.HangingMediaV51Character.getSceneContext(),stage=document.querySelector('#stage'),root=c.scene.children.find(o=>o.userData?.v51InstanceId===id);if(!root)throw new Error('Tagged 3D root missing');const p=root.position.clone().project(c.camera),r=stage.getBoundingClientRect();return{x:r.left+(p.x+1)*.5*r.width,y:r.top+(1-p.y)*.5*r.height};},id);
await page.mouse.click(point.x,point.y);
await page.waitForFunction(id=>window.__V51_PHASE1__.selectedId===id,id,{timeout:4000});
await page.locator('#v51-gizmo-toolbar [data-mode="rotate"]').click();
await page.waitForFunction(()=>window.__V51_PHASE1__.mode==='rotate');

await page.locator('#v51lib-ry').evaluate(el=>{el.value='67';el.dispatchEvent(new Event('input',{bubbles:true}));});
await page.waitForTimeout(350);
const rotation=await page.evaluate(id=>{const c=window.HangingMediaV51Character.getSceneContext(),root=c.scene.children.find(o=>o.userData?.v51InstanceId===id);return root?.rotation?.y??null;},id);
if(rotation===null||Math.abs(rotation-67*Math.PI/180)>.035)throw new Error(`3D rotation did not apply: ${rotation}`);

await page.reload({waitUntil:'networkidle'});
await page.waitForFunction(()=>window.__V51_PHASE1__?.ready&&window.__V51_ASSET_LIBRARY__?.ready,{timeout:15000});
await page.waitForFunction(()=>window.HangingMediaV51AssetLibrary?.getInstances?.().length>=1,null,{timeout:10000});
const restored=await page.evaluate(()=>({media:[...document.querySelectorAll('#media-slots .media-kind')].map(x=>x.textContent),text:[...document.querySelectorAll('#v3-branding-overlay .v3-text')].map(x=>x.textContent),instances:window.HangingMediaV51AssetLibrary.getInstances().map(x=>({id:x.id,ry:x.rotation.y})),background:document.querySelector('#v51-background-health')?.textContent||''}));
if(!restored.media.some(x=>/image/i.test(x))||!restored.media.some(x=>/video/i.test(x)))throw new Error(`Hanging media restore failed: ${JSON.stringify(restored.media)}`);
if(!restored.text.some(x=>x.includes('PHASE 1 TEXT WORKS')))throw new Error('Text restore failed');
if(Math.abs(restored.instances[0].ry-67*Math.PI/180)>.035)throw new Error('3D rotation persistence failed');
await page.screenshot({path:'artifacts/v5-1-phase1-final.png',fullPage:true});
await fs.writeFile('artifacts/v5-1-phase1-report.json',JSON.stringify({videoResult,rotation,restored,errors},null,2));
if(errors.length)throw new Error(`Browser errors: ${errors.join(' | ')}`);
console.log(JSON.stringify({ok:true,videoResult,rotation,restored},null,2));
await browser.close();
