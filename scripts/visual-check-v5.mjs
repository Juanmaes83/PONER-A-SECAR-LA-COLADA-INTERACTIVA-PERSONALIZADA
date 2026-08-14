import { chromium } from 'playwright';
import fs from 'node:fs/promises';
await fs.mkdir('artifacts',{recursive:true});
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1600,height:1000},deviceScaleFactor:1});
const consoleErrors=[],pageErrors=[];
page.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text())});
page.on('pageerror',e=>pageErrors.push(e.message));
await page.goto('http://127.0.0.1:4173/',{waitUntil:'networkidle'});
await page.waitForSelector('#stage');
await page.waitForSelector('#v3-studio');
await page.waitForSelector('#v5-character-canvas');
await page.waitForSelector('#v5-character-controls');
await page.waitForTimeout(1100);
const before=await page.evaluate(()=>({
  title:document.title,
  stageWebGL:Boolean(document.querySelector('#stage')?.getContext('webgl2')||document.querySelector('#stage')?.getContext('webgl')),
  characterWebGL:Boolean(document.querySelector('#v5-character-canvas')?.getContext('webgl2')||document.querySelector('#v5-character-canvas')?.getContext('webgl')),
  rig:document.querySelector('#v5-character-canvas')?.dataset.rig,
  template:document.querySelector('#v5-character-canvas')?.dataset.template,
  state:document.querySelector('#v5-character-canvas')?.dataset.state,
  effort:Number(document.querySelector('#v5-character-canvas')?.dataset.effort||0),
  vectorDisplay:getComputedStyle(document.querySelector('#v4-character-layer')).display,
  mode:document.querySelector('#v5-mode')?.value,
  hasScale:Boolean(document.querySelector('#v5-scale')),
  hasGrip:Boolean(document.querySelector('#v5-grip')),
  hasDepth:Boolean(document.querySelector('#v5-depth'))
}));
await page.screenshot({path:'artifacts/hanging-media-v5-idle.png',fullPage:true});
const canvas=page.locator('#stage');const box=await canvas.boundingBox();if(!box)throw new Error('Canvas box missing');
await page.mouse.move(box.x+box.width*.60,box.y+box.height*.52);await page.mouse.down();await page.mouse.move(box.x+box.width*.27,box.y+box.height*.52,{steps:18});await page.waitForTimeout(320);
const during=await page.evaluate(()=>({state:document.querySelector('#v5-character-canvas')?.dataset.state,effort:Number(document.querySelector('#v5-character-canvas')?.dataset.effort||0)}));
await page.screenshot({path:'artifacts/hanging-media-v5-effort.png',fullPage:true});
await page.mouse.up();await page.waitForTimeout(520);
const after=await page.evaluate(()=>({state:document.querySelector('#v5-character-canvas')?.dataset.state,effort:Number(document.querySelector('#v5-character-canvas')?.dataset.effort||0)}));
await page.screenshot({path:'artifacts/hanging-media-v5-satisfaction.png',fullPage:true});
await page.locator('#v5-mode').selectOption('vector');await page.waitForTimeout(120);
const fallback=await page.evaluate(()=>({canvasDisplay:getComputedStyle(document.querySelector('#v5-character-canvas')).display,vectorDisplay:getComputedStyle(document.querySelector('#v4-character-layer')).display}));
await page.locator('#v5-mode').selectOption('3d');await page.locator('#v5-enabled').uncheck();
const hidden=await page.evaluate(()=>getComputedStyle(document.querySelector('#v5-character-canvas')).display==='none');
const report={before,during,after,fallback,hidden,consoleErrors,pageErrors};await fs.writeFile('artifacts/runtime-report-v5.json',JSON.stringify(report,null,2));
if(!before.title.includes('V5'))throw new Error('V5 title missing');
if(!before.stageWebGL||!before.characterWebGL)throw new Error('WebGL unavailable');
if(before.rig!=='articulated-3d'||before.template!=='AYA_3D')throw new Error(`3D rig missing: ${before.rig}/${before.template}`);
if(before.mode!=='3d'||before.vectorDisplay!=='none')throw new Error('3D mode did not replace vector character');
if(!before.hasScale||!before.hasGrip||!before.hasDepth)throw new Error('V5 3D authoring controls incomplete');
if(!['pull','effort'].includes(during.state)||during.effort<.35)throw new Error(`3D effort response too weak: ${during.state}/${during.effort}`);
if(after.state!=='satisfaction')throw new Error(`3D character missed satisfaction state: ${after.state}`);
if(fallback.canvasDisplay!=='none'||fallback.vectorDisplay==='none')throw new Error('Vector fallback switch failed');
if(!hidden)throw new Error('Character toggle failed');
if(pageErrors.length)throw new Error(`Page errors: ${pageErrors.join(' | ')}`);
if(consoleErrors.length)throw new Error(`Console errors: ${consoleErrors.join(' | ')}`);
console.log(JSON.stringify(report,null,2));await browser.close();
