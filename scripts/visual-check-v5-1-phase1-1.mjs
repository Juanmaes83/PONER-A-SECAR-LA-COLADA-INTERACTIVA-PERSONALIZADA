import {chromium} from 'playwright';
import {zipSync,strToU8} from 'fflate';
import fs from 'node:fs/promises';

await fs.mkdir('artifacts',{recursive:true});
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAIAAAAmkwkpAAAAFElEQVR42mNkYPj/n4GBgYGJAQoAHgAB/7VyrQAAAABJRU5ErkJggg==','base64');
for(const n of ['hanging-a.png','hanging-b.png','hanging-c.png','brand-logo.png'])await fs.writeFile(`artifacts/${n}`,png);
const objA='v -1 0 0\nv 1 0 0\nv 0 2 0\nv 0 0 1\nf 1 2 3\nf 1 4 2\nf 2 4 3\nf 3 4 1\n';
const objB='v -1 -1 0\nv 1 -1 0\nv 1 1 0\nv -1 1 0\nv 0 0 2\nf 1 2 5\nf 2 3 5\nf 3 4 5\nf 4 1 5\nf 1 4 3\nf 1 3 2\n';
await fs.writeFile('artifacts/object-a.zip',Buffer.from(zipSync({'object-a.obj':strToU8(objA)})));
await fs.writeFile('artifacts/object-b.zip',Buffer.from(zipSync({'object-b.obj':strToU8(objB)})));

const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1600,height:1000}});
const errors=[];page.on('pageerror',e=>errors.push(`page:${e.message}`));page.on('console',m=>{if(m.type()==='error')errors.push(`console:${m.text()}`)});
await page.goto('http://127.0.0.1:4174/',{waitUntil:'networkidle'});
await page.waitForFunction(()=>window.__V51_PHASE1_1__?.ready&&window.__V51_PHASE1__?.ready&&window.__V51_ASSET_LIBRARY__?.ready,{timeout:20000});

// 1. Hanging Media: three real images, all visible before any 3D work.
await page.locator('#media-upload').setInputFiles(['artifacts/hanging-a.png','artifacts/hanging-b.png','artifacts/hanging-c.png']);
await page.waitForFunction(()=>window.HangingMediaCore?.mediaRuntime?.items?.length===3&&window.HangingMediaMain?.cards?.length===3,null,{timeout:12000});
const projected=()=>page.evaluate(()=>{const c=window.HangingMediaMain.getSceneContext().camera;return window.HangingMediaMain.cards.map(e=>{const p=e.card.group.getWorldPosition(new THREE.Vector3());return p.project(c),{x:p.x,y:p.y,visible:e.card.group.visible!==false}})}).catch(()=>null);
const beforeMedia=await page.evaluate(()=>{const ctx=window.HangingMediaMain.getSceneContext(),cam=ctx.camera;return window.HangingMediaMain.cards.map(e=>{const p=e.card.group.getWorldPosition({x:0,y:0,z:0,applyMatrix4(){return this}});return {visible:e.card.group.visible!==false,x:e.card.group.position.x,y:e.card.group.position.y}})});
if(beforeMedia.filter(x=>x.visible&&Math.abs(x.x)<7&&Math.abs(x.y)<4).length<2)throw new Error(`Hanging Media not visibly laid out before 3D: ${JSON.stringify(beforeMedia)}`);

// 2. Branding: visible text + logo using the V5.1 authoring surface only.
await page.locator('#v5-1-brand-text').fill('PHASE 1.1 BRAND');
await page.locator('#v5-1-add-text').click();
await page.waitForFunction(()=>{const e=[...document.querySelectorAll('#v3-branding-overlay .v3-text')].find(x=>x.textContent.includes('PHASE 1.1 BRAND'));if(!e)return false;const r=e.getBoundingClientRect();return r.width>10&&r.height>5&&getComputedStyle(e).display!=='none'},null,{timeout:5000});
await page.locator('#v5-1-logo').setInputFiles('artifacts/brand-logo.png');
await page.waitForFunction(()=>{const e=document.querySelector('#v3-branding-overlay .v3-logo img');return e&&e.getBoundingClientRect().width>0},null,{timeout:5000});

// 3. Character is active and visible; legacy V4/V5 runtime must not exist.
const character=await page.evaluate(()=>{const c=window.HangingMediaV51Character.getSceneContext();let root=null;c.scene.traverse(o=>{if(!root&&/^V5_1_/.test(o.name||''))root=o});return{found:!!root,visible:root?.visible!==false,legacyCanvas:!!document.querySelector('#v5-character-canvas'),legacyControls:!!document.querySelector('#v5-character-controls')}});
if(!character.found||!character.visible||character.legacyCanvas||character.legacyControls)throw new Error(`Character/runtime isolation failed: ${JSON.stringify(character)}`);

// 4. Import two independent ZIP assets in one operation and place both without replacing media.
await page.locator('#v51lib-upload').setInputFiles(['artifacts/object-a.zip','artifacts/object-b.zip']);
await page.waitForFunction(()=>window.HangingMediaV51AssetLibrary?.getAssets?.().length>=2,null,{timeout:10000});
await page.locator('#v51lib-grid [data-act="add"]').nth(0).click();
await page.waitForFunction(()=>window.HangingMediaV51AssetLibrary.getInstances().length>=1,null,{timeout:10000});
await page.locator('#v51lib-grid [data-act="add"]').nth(1).click();
await page.waitForFunction(()=>window.HangingMediaV51AssetLibrary.getInstances().length>=2,null,{timeout:10000});
await page.waitForTimeout(250);
const after3D=await page.evaluate(()=>({mediaCount:window.HangingMediaCore.mediaRuntime.items.length,cardCount:window.HangingMediaMain.cards.length,cards:window.HangingMediaMain.cards.map(e=>({x:e.card.group.position.x,y:e.card.group.position.y,visible:e.card.group.visible!==false})),instances:window.HangingMediaV51AssetLibrary.getInstances().length,thumbs:[...document.querySelectorAll('.v51lib-card img')].map(x=>x.src),state:window.HangingMediaV51SceneState.snapshot()}));
if(after3D.mediaCount!==3||after3D.cardCount!==3||after3D.cards.filter(x=>x.visible&&Math.abs(x.x)<7&&Math.abs(x.y)<4).length<2)throw new Error(`3D broke Hanging Media visibility: ${JSON.stringify(after3D.cards)}`);
if(after3D.instances<2)throw new Error('Multiple 3D instances missing');
if(!after3D.thumbs.some(x=>x.startsWith('data:image/webp')))throw new Error('Real 3D thumbnail was not generated');

// 5. Edit mode: 3D changes must not move carousel or trigger character narrative.
await page.locator('#v511-edit3d').click();
await page.waitForFunction(()=>window.HMSInteractionRouter.tool==='3d');
const firstId=await page.evaluate(()=>window.HangingMediaV51AssetLibrary.getInstances()[0].id);
await page.evaluate(id=>window.__V51_PHASE1__.attach(id),firstId);
await page.locator('#v51lib-ry').evaluate(el=>{el.value='47';el.dispatchEvent(new Event('input',{bubbles:true}))});
await page.waitForTimeout(150);
const editBefore=await page.evaluate(()=>({target:window.HangingMediaMain.target,current:window.HangingMediaMain.current,state:document.querySelector('#v5-1-character-canvas')?.dataset?.state||'',r:window.HangingMediaV51AssetLibrary.getInstances()[0].rotation.y}));
const box=await page.locator('#stage').boundingBox();
await page.mouse.move(box.x+box.width*.72,box.y+box.height*.55);await page.mouse.down();await page.mouse.move(box.x+box.width*.38,box.y+box.height*.58,{steps:8});await page.mouse.up();await page.waitForTimeout(120);
const editAfter=await page.evaluate(()=>({target:window.HangingMediaMain.target,current:window.HangingMediaMain.current,state:document.querySelector('#v5-1-character-canvas')?.dataset?.state||'',r:window.HangingMediaV51AssetLibrary.getInstances()[0].rotation.y}));
if(Math.abs(editAfter.target-editBefore.target)>.001||Math.abs(editAfter.current-editBefore.current)>.03)throw new Error(`3D edit moved Hanging Media carousel: ${JSON.stringify({editBefore,editAfter})}`);
if(['reach','grab','pull','effort'].includes(editAfter.state))throw new Error(`3D edit triggered character gesture: ${editAfter.state}`);

// 6. Snap + safe bounds + persistence contract.
await page.locator('#v511-snap').selectOption('15');
await page.locator('#v51lib-px').evaluate(el=>{el.value='6';el.dispatchEvent(new Event('input',{bubbles:true}))});
await page.locator('#v51lib-ry').evaluate(el=>{el.value='47';el.dispatchEvent(new Event('input',{bubbles:true}))});
await page.evaluate(()=>window.__V51_PHASE1_1__.clampAndSnap());
await page.waitForTimeout(180);
const bounded=await page.evaluate(()=>{const r=window.HangingMediaV51AssetLibrary.getInstances()[0];return{x:r.position.x,ry:r.rotation.y}});
if(bounded.x>4.61)throw new Error(`Safe bounds failed: ${bounded.x}`);
const deg=Math.round(bounded.ry*180/Math.PI);if(Math.abs(deg-45)>1)throw new Error(`Rotation snap failed: ${deg}`);

// 7. Experience mode: no 3D editor helpers; core experience remains interactive.
await page.locator('#v511-experience').click();
await page.waitForFunction(()=>window.HMSInteractionRouter.tool==='experience');
const helpersHidden=await page.evaluate(()=>window.HangingMediaV51Character.getSceneContext().scene.children.filter(o=>o.userData?.v51System).every(o=>o.visible===false));
if(!helpersHidden)throw new Error('3D editor helpers remain visible in experience mode');
const threeBefore=await page.evaluate(()=>JSON.stringify(window.HangingMediaV51AssetLibrary.getInstances().map(r=>({p:r.position,r:r.rotation,s:r.scale}))));
const targetBefore=await page.evaluate(()=>window.HangingMediaMain.target);
await page.mouse.move(box.x+box.width*.25,box.y+box.height*.45);await page.mouse.down();await page.mouse.move(box.x+box.width*.55,box.y+box.height*.45,{steps:8});await page.mouse.up();await page.waitForTimeout(160);
const exp=await page.evaluate(()=>({target:window.HangingMediaMain.target,three:JSON.stringify(window.HangingMediaV51AssetLibrary.getInstances().map(r=>({p:r.position,r:r.rotation,s:r.scale})))}));
if(Math.abs(exp.target-targetBefore)<.02)throw new Error('Experience drag did not reach Hanging Media');
if(exp.three!==threeBefore)throw new Error('Experience interaction changed 3D object transforms');

// 8. Panel coherence and central scene-state contract.
const ui=await page.evaluate(()=>({libraryTitle:document.querySelector('#v5-1-asset-library-v2 h2')?.textContent,instancesTitle:document.querySelector('#v5-1-asset-library-v2 .section-title-row h3')?.textContent,v3Display:getComputedStyle(document.querySelector('#v3-studio')).display,sceneState:window.HangingMediaV51SceneState.snapshot(),modeBar:!!document.querySelector('#v511-modebar')}));
if(ui.libraryTitle!=='My 3D Library'||ui.instancesTitle!=='Objects in this Scene'||ui.v3Display!=='none'||!ui.modeBar)throw new Error(`Editor coherence failed: ${JSON.stringify(ui)}`);
if(ui.sceneState.mediaCount!==3||ui.sceneState.instances3d.length<2||ui.sceneState.branding.length<2)throw new Error(`Central SceneState incomplete: ${JSON.stringify(ui.sceneState)}`);

await page.reload({waitUntil:'networkidle'});
await page.waitForFunction(()=>window.__V51_PHASE1_1__?.ready&&window.HangingMediaV51AssetLibrary?.getInstances?.().length>=2&&window.HangingMediaCore?.mediaRuntime?.items?.length===3,{timeout:20000});
const restored=await page.evaluate(()=>({media:window.HangingMediaCore.mediaRuntime.items.length,cards:window.HangingMediaMain.cards.length,instances:window.HangingMediaV51AssetLibrary.getInstances().length,brand:window.HangingMediaV3.getProject().layers.length,characterVisible:(()=>{let r=null;window.HangingMediaV51Character.getSceneContext().scene.traverse(o=>{if(!r&&/^V5_1_/.test(o.name||''))r=o});return r?.visible!==false})()}));
if(restored.media!==3||restored.cards!==3||restored.instances<2||restored.brand<2||!restored.characterVisible)throw new Error(`Reload coexistence failed: ${JSON.stringify(restored)}`);

await page.screenshot({path:'artifacts/v5-1-phase1-1-coexistence.png',fullPage:true});
await fs.writeFile('artifacts/v5-1-phase1-1-report.json',JSON.stringify({character,beforeMedia,after3D,editBefore,editAfter,bounded,ui,restored,errors},null,2));
if(errors.length)throw new Error(`Browser console errors: ${errors.join(' | ')}`);
console.log(JSON.stringify({ok:true,criterion:'Hanging Media visible + character visible + multiple editable 3D + branding visible + isolated interactions',restored},null,2));
await browser.close();
