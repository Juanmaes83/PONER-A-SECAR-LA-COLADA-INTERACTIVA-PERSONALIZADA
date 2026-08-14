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
await page.waitForSelector('.v4-raised-arm');
await page.waitForSelector('.v4-effort-face');
await page.waitForSelector('.v4-satisfaction-face');
await page.waitForTimeout(900);
const before=await page.evaluate(()=>({
 title:document.title,
 hasWebGL:Boolean(document.querySelector('#stage')?.getContext('webgl2')||document.querySelector('#stage')?.getContext('webgl')),
 characterVisible:!document.querySelector('#v4-character-layer')?.classList.contains('is-hidden'),
 hasRig:Boolean(document.querySelector('.v4-rig')),
 hasRaisedArm:Boolean(document.querySelector('.v4-raised-arm')),
 hasFakeRope:Boolean(document.querySelector('.v4-rope-link')),
 fakeGripVisible:document.querySelector('.v4-grip-line')?.getAttribute('display')!=='none',
 handAligned:document.querySelector('#v4-character-layer')?.dataset.handAligned==='true',
 hasToggle:Boolean(document.querySelector('#v4-character-enabled')),
 hasIntensity:Boolean(document.querySelector('#v4-character-intensity')),
 armTransform:document.querySelector('.v4-raised-arm')?.getAttribute('transform')||''
}));
await page.screenshot({path:'artifacts/hanging-media-v4-1-1-idle.png',fullPage:true});
const canvas=page.locator('#stage');
const box=await canvas.boundingBox();
if(!box)throw new Error('Canvas box missing');
await page.mouse.move(box.x+box.width*.55,box.y+box.height*.5);
await page.mouse.down();
await page.mouse.move(box.x+box.width*.25,box.y+box.height*.5,{steps:14});
await page.waitForTimeout(300);
const during=await page.evaluate(()=>({
 state:document.querySelector('#v4-character-layer')?.dataset.state,
 kinematicState:document.querySelector('#v4-character-layer')?.dataset.kinematicState,
 pullAmount:Number(document.querySelector('#v4-character-layer')?.dataset.pullAmount||0),
 effortAmount:Number(document.querySelector('#v4-character-layer')?.dataset.effortAmount||0),
 armTransform:document.querySelector('.v4-raised-arm')?.getAttribute('transform')||'',
 torsoTransform:document.querySelector('.v4-torso')?.getAttribute('transform')||'',
 effortOpacity:Number(document.querySelector('.v4-effort-face')?.getAttribute('opacity')||0)
}));
await page.screenshot({path:'artifacts/hanging-media-v4-1-1-pull.png',fullPage:true});
await page.mouse.up();
await page.waitForTimeout(480);
const satisfaction=await page.evaluate(()=>({
 state:document.querySelector('#v4-character-layer')?.dataset.state,
 kinematicState:document.querySelector('#v4-character-layer')?.dataset.kinematicState,
 happyOpacity:Number(document.querySelector('.v4-satisfaction-face')?.getAttribute('opacity')||0),
 effortOpacity:Number(document.querySelector('.v4-effort-face')?.getAttribute('opacity')||0)
}));
await page.screenshot({path:'artifacts/hanging-media-v4-1-1-satisfaction.png',fullPage:true});
await page.locator('#v4-character-enabled').uncheck();
const hidden=await page.evaluate(()=>document.querySelector('#v4-character-layer')?.classList.contains('is-hidden'));
await page.locator('#v4-character-enabled').check();
const report={before,during,satisfaction,hidden,consoleErrors,pageErrors};
await fs.writeFile('artifacts/runtime-report-v4-1-1.json',JSON.stringify(report,null,2));
if(!before.title.includes('V4'))throw new Error('V4 title missing');
if(!before.hasWebGL)throw new Error('WebGL unavailable');
if(!before.characterVisible||!before.hasRig||!before.hasRaisedArm)throw new Error('Narrative character rig incomplete');
if(before.hasFakeRope||before.fakeGripVisible)throw new Error('Fake golden rope segments still visible');
if(!before.hasToggle||!before.hasIntensity)throw new Error('Character controls missing');
if(during.state!=='pull')throw new Error(`Character did not enter pull state: ${during.state}`);
if(during.pullAmount<0.25||during.effortAmount<0.25)throw new Error(`Pull/effort response too weak: ${during.pullAmount}/${during.effortAmount}`);
if(!during.armTransform||during.armTransform===before.armTransform)throw new Error('Raised pull arm did not articulate');
if(!during.torsoTransform)throw new Error('Torso effort articulation missing');
if(during.effortOpacity<0.25)throw new Error('Effort facial expression missing');
if(satisfaction.state!=='satisfaction'||satisfaction.happyOpacity<0.9)throw new Error(`Satisfaction state missing: ${JSON.stringify(satisfaction)}`);
if(!hidden)throw new Error('Character toggle did not hide layer');
if(pageErrors.length)throw new Error(`Page errors: ${pageErrors.join(' | ')}`);
if(consoleErrors.length)throw new Error(`Console errors: ${consoleErrors.join(' | ')}`);
console.log(JSON.stringify(report,null,2));
await browser.close();
