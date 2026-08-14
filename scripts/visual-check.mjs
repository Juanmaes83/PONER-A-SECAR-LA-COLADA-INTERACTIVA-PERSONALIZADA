import { chromium } from 'playwright';
import fs from 'node:fs/promises';

await fs.mkdir('artifacts', { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
const consoleErrors = [], pageErrors = [];
page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
page.on('pageerror', e => pageErrors.push(e.message));
await page.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle' });
await page.waitForSelector('#stage');
await page.waitForSelector('#authoring-panel');
await page.waitForTimeout(1600);

const initial = await page.evaluate(() => {
  const canvas=document.querySelector('#stage');
  const panel=document.querySelector('#authoring-panel');
  return {
    title: document.title,
    canvasWidth: canvas?.width || 0,
    canvasHeight: canvas?.height || 0,
    panelWidth: Math.round(panel?.getBoundingClientRect().width || 0),
    hasWebGL: Boolean(canvas?.getContext('webgl2') || canvas?.getContext('webgl')),
    shapes: document.querySelectorAll('[data-surface-control="surfaceShape"] option').length,
    hasBackgroundUpload: Boolean(document.querySelector('#background-upload')),
    hasAudioUpload: Boolean(document.querySelector('#audio-upload')),
    hasClipRelease: Boolean(document.querySelector('[data-control="clipRelease"]')),
    hasRim: Boolean(document.querySelector('[data-control="rim"]')),
    hasThreadRelief: Boolean(document.querySelector('[data-control="threadRelief"]'))
  };
});
await page.screenshot({ path:'artifacts/hanging-media-v2-default.png', fullPage:true });

await page.locator('[data-surface-control="surfaceShape"]').selectOption('tshirt');
await page.locator('[data-surface-control="backing"]').uncheck();
await page.locator('[data-control="wind"]').evaluate(el=>{el.value='0.75';el.dispatchEvent(new Event('input',{bubbles:true}));});
await page.locator('[data-preset-group="backgroundTemplate"] [data-preset="dark-editorial"]').click();
await page.locator('[data-preset-group="lighting"] [data-preset="golden"]').click();
await page.locator('[data-control="rim"]').evaluate(el=>{el.value='1.4';el.dispatchEvent(new Event('input',{bubbles:true}));});
await page.waitForTimeout(1000);
await page.screenshot({ path:'artifacts/hanging-media-v2-creative.png', fullPage:true });

const report={initial,consoleErrors,pageErrors};
await fs.writeFile('artifacts/runtime-report-v2.json',JSON.stringify(report,null,2));
if(!initial.title.includes('V2')) throw new Error('V2 title missing');
if(!initial.hasWebGL) throw new Error('WebGL unavailable');
if(initial.canvasWidth<700||initial.canvasHeight<500) throw new Error(`Canvas invalid ${initial.canvasWidth}x${initial.canvasHeight}`);
if(initial.panelWidth<350) throw new Error(`Panel invalid ${initial.panelWidth}`);
if(initial.shapes<10) throw new Error(`Creative shape library incomplete: ${initial.shapes}`);
if(!initial.hasBackgroundUpload||!initial.hasAudioUpload||!initial.hasClipRelease||!initial.hasRim||!initial.hasThreadRelief) throw new Error('V2 controls missing');
if(pageErrors.length) throw new Error(`Page errors: ${pageErrors.join(' | ')}`);
if(consoleErrors.length) throw new Error(`Console errors: ${consoleErrors.join(' | ')}`);
console.log(JSON.stringify(report,null,2));
await browser.close();
