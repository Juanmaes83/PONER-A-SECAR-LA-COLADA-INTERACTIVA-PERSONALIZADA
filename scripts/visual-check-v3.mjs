import { chromium } from 'playwright';
import fs from 'node:fs/promises';

await fs.mkdir('artifacts', { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1680, height: 1050 }, deviceScaleFactor: 1 });
const consoleErrors=[],pageErrors=[];
page.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text())});
page.on('pageerror',e=>pageErrors.push(e.message));
await page.goto('http://127.0.0.1:4173/',{waitUntil:'networkidle'});
await page.waitForSelector('#v3-studio');
await page.waitForSelector('#stage');
await page.waitForTimeout(1400);

const initial=await page.evaluate(()=>({
 title:document.title,
 webgl:Boolean(document.querySelector('#stage')?.getContext('webgl2')||document.querySelector('#stage')?.getContext('webgl')),
 savePiece:Boolean(document.querySelector('#v3-save-piece')),
 saveProject:Boolean(document.querySelector('#v3-save-project')),
 start:Boolean(document.querySelector('#v3-start')),
 html:Boolean(document.querySelector('#v3-html')),
 zip:Boolean(document.querySelector('#v3-zip')),
 embed:Boolean(document.querySelector('#v3-embed')),
 record:Boolean(document.querySelector('#v3-record')),
 png:Boolean(document.querySelector('#v3-png')),
 json:Boolean(document.querySelector('#v3-json')),
 branding:Boolean(document.querySelector('#v3-add-text')&&document.querySelector('#v3-logo'))
}));

await page.locator('#v3-project-name').fill('QA V3 Project');
await page.locator('#v3-piece-name').fill('Hero Cloth');
await page.locator('#v3-save-piece').click();
await page.locator('#v3-save-project').click();
await page.locator('#v3-text').fill('V3 BRAND LAYER');
await page.locator('#v3-layer-position').selectOption('top-left');
await page.locator('#v3-add-text').click();
await page.waitForTimeout(250);
const saved=await page.evaluate(()=>({
 project:JSON.parse(localStorage.getItem('hanging-media-project-v3')||'{}'),
 versions:JSON.parse(localStorage.getItem('hanging-media-project-v3-versions')||'[]'),
 layers:document.querySelectorAll('#v3-branding-overlay .v3-layer').length
}));
await page.screenshot({path:'artifacts/hanging-media-v3-authoring.png',fullPage:true});
await page.locator('#v3-start').click();
await page.waitForTimeout(400);
const started=await page.evaluate(()=>document.body.classList.contains('v3-experience-mode'));
await page.screenshot({path:'artifacts/hanging-media-v3-experience.png',fullPage:true});
await page.keyboard.press('Escape');
await page.waitForTimeout(150);
const edited=await page.evaluate(()=>!document.body.classList.contains('v3-experience-mode'));

const report={initial,saved:{name:saved.project.name,pieces:Object.keys(saved.project.pieces||{}).length,versions:saved.versions.length,layers:saved.layers},started,edited,consoleErrors,pageErrors};
await fs.writeFile('artifacts/runtime-report-v3.json',JSON.stringify(report,null,2));
if(!initial.title.includes('V3')) throw new Error('V3 title missing');
if(!initial.webgl) throw new Error('WebGL unavailable');
for(const [k,v] of Object.entries(initial)) if(k!=='title'&&k!=='webgl'&&!v) throw new Error(`Missing V3 capability: ${k}`);
if(saved.project.name!=='QA V3 Project'||Object.keys(saved.project.pieces||{}).length<1||saved.versions.length<1||saved.layers<1) throw new Error('Save/branding contract failed');
if(!started||!edited) throw new Error('START/EDIT contract failed');
if(pageErrors.length) throw new Error(`Page errors: ${pageErrors.join(' | ')}`);
if(consoleErrors.length) throw new Error(`Console errors: ${consoleErrors.join(' | ')}`);
console.log(JSON.stringify(report,null,2));
await browser.close();
