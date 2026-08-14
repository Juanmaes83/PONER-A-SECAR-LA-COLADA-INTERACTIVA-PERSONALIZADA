import { chromium } from 'playwright';
import fs from 'node:fs/promises';

await fs.mkdir('artifacts', { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const consoleErrors = [];
const pageErrors = [];
page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
page.on('pageerror', (err) => pageErrors.push(err.message));

await page.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle' });
await page.waitForSelector('#stage');
await page.waitForSelector('#authoring-panel');
await page.waitForTimeout(1800);

const initial = await page.evaluate(() => {
  const canvas = document.querySelector('#stage');
  const panel = document.querySelector('#authoring-panel');
  const slots = document.querySelectorAll('.media-slot');
  return {
    canvasWidth: canvas?.width || 0,
    canvasHeight: canvas?.height || 0,
    panelWidth: Math.round(panel?.getBoundingClientRect().width || 0),
    slots: slots.length,
    hasWebGL: Boolean(canvas?.getContext('webgl2') || canvas?.getContext('webgl'))
  };
});

await page.screenshot({ path: 'artifacts/hanging-media-v1-default.png', fullPage: true });

await page.locator('[data-control="wind"]').evaluate((el) => { el.value = '0.9'; el.dispatchEvent(new Event('input', { bubbles: true })); });
await page.locator('[data-preset-group="lighting"] [data-preset="dramatic"]').click();
await page.mouse.move(430, 420);
await page.mouse.wheel(0, 420);
await page.waitForTimeout(1000);
await page.screenshot({ path: 'artifacts/hanging-media-v1-stress.png', fullPage: true });

const report = { initial, consoleErrors, pageErrors };
await fs.writeFile('artifacts/runtime-report.json', JSON.stringify(report, null, 2));

if (!initial.hasWebGL) throw new Error('WebGL context unavailable');
if (initial.canvasWidth < 500 || initial.canvasHeight < 400) throw new Error(`Canvas did not size correctly: ${initial.canvasWidth}x${initial.canvasHeight}`);
if (initial.panelWidth < 300) throw new Error(`Authoring panel did not render correctly: ${initial.panelWidth}px`);
if (pageErrors.length) throw new Error(`Page errors: ${pageErrors.join(' | ')}`);
if (consoleErrors.length) throw new Error(`Console errors: ${consoleErrors.join(' | ')}`);

console.log(JSON.stringify(report, null, 2));
await browser.close();
