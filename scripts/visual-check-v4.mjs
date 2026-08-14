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
await page.waitForSelector('#v4-character-layer');
await page.waitForSelector('#v4-character-controls');
await page.waitForTimeout(900);
const before=await page.evaluate(()=>({
 title:document.title,
 hasWebGL:Boolean(document.querySelector('#stage')?.getContext('webgl2')||document.querySelector('#stage')?.getContext('webgl')),
 characterVisible:!document.querySelector('#v4-character-layer')?.classList.contains('is-hidden'),
 hasRig:Boolean(document.querySelector('.v4-rig')),
 hasFrontArm:Boolean(document.querySelector('.v4-arm-front')),
 hasBackArm:Boolean(document.querySelector('.v4-arm-back')),
 hasToggle:Boolean(document.querySelector('#v4-character-enabled')),
 hasIntensity:Boolean(document.querySelector('#v4-character-intensity')),
 transform:document.querySelector('#v4-character-layer')?.style.transform||''
}));
await page.screenshot({path:'artifacts/hanging-media-v4-idle.png',fullPage:true});
const canvas=page.locator('#stage');
const box=await canvas.boundingBox();
if(!box)throw new Error('Canvas box missing');
await page.mouse.move(box.x+box.width*.55,box.y+box.height*.5);
await page.mouse.down();
await page.mouse.move(box.x+box.width*.35,box.y+box.height*.5,{steps:8});
await page.waitForTimeout(180);
const during=await page.evaluate(()=>({state:document.querySelector('#v4-character-layer')?.dataset.state,transform:document.querySelector('#v4-character-layer')?.style.transform,arm:document.querySelector('.v4-arm-front')?.style.transform}));
await page.screenshot({path:'artifacts/hanging-media-v4-pull.png',fullPage:true});
await page.mouse.up();
await page.waitForTimeout(700);
const after=await page.evaluate(()=>({state:document.querySelector('#v4-character-layer')?.dataset.state,transform:document.querySelector('#v4-character-layer')?.style.transform}));
await page.locator('#v4-character-enabled').uncheck();
const hidden=await page.evaluate(()=>document.querySelector('#v4-character-layer')?.classList.contains('is-hidden'));
await page.locator('#v4-character-enabled').check();
const report={before,during,after,hidden,consoleErrors,pageErrors};
await fs.writeFile('artifacts/runtime-report-v4.json',JSON.stringify(report,null,2));
if(!before.title.includes('V4'))throw new Error('V4 title missing');
if(!before.hasWebGL)throw new Error('WebGL unavailable');
if(!before.characterVisible||!before.hasRig||!before.hasFrontArm||!before.hasBackArm)throw new Error('Narrative character rig incomplete');
if(!before.hasToggle||!before.hasIntensity)throw new Error('V4 character controls missing');
if(during.state!=='pull')throw new Error(`Character did not enter pull state: ${during.state}`);
if(!during.arm||during.arm===before.transform)throw new Error('Pull arm animation missing');
if(!hidden)throw new Error('Character toggle did not hide layer');
if(pageErrors.length)throw new Error(`Page errors: ${pageErrors.join(' | ')}`);
if(consoleErrors.length)throw new Error(`Console errors: ${consoleErrors.join(' | ')}`);
console.log(JSON.stringify(report,null,2));
await browser.close();
