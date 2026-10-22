/**
 * Optional GPU/WebGL smoke QA. Runs against an already-running Vite server.
 * npm install --no-save playwright
 * $env:SHORELINE_URL = 'http://127.0.0.1:4178/'
 * node scripts/visual-smoke.mjs
 *
 * A headless browser working on a software adapter is not proof of real GPU FPS.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';

const url = process.env.SHORELINE_URL || 'http://127.0.0.1:4178/';
let chromium;
try { ({chromium} = await import('playwright')); }
catch {
 console.error('Optional QA dependency missing. Install locally: npm install --no-save playwright');
 process.exit(2);
}
const options={headless:true,args:['--no-first-run','--no-default-browser-check']};
if(process.env.EDGE_PATH)options.executablePath=process.env.EDGE_PATH;
let browser;
try {
 browser=await chromium.launch(options);
 const page=await browser.newPage({viewport:{width:1440,height:900},acceptDownloads:true});
 const errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
 const response=await page.goto(url,{waitUntil:'networkidle',timeout:30000});
 assert.equal(response.status(),200);
 await page.waitForFunction(()=>document.getElementById('life-count')?.textContent.includes('trees'),null,{timeout:20000});
 const gpu=await page.evaluate(()=>{
  const c=document.getElementById('world');
  const gl=c.getContext('webgl2');
  if(!gl)return null;
  return {version:gl.getParameter(gl.VERSION),renderer:gl.getParameter(gl.RENDERER),width:c.width,height:c.height};
 });
 assert.ok(gpu,'WebGL2 not available: render test cannot pass');
 await page.click('#btn-save');
 const saved=await page.evaluate(()=>localStorage.getItem('shoreline.island.v1'));
 assert.ok(saved&&JSON.parse(saved).heights.length>10000,'Save island did not produce terrain');
 await page.click('#btn-load');
 await page.click('#btn-help');
 await page.click('#close-help');
 const avgFrameMs=await page.evaluate(()=>new Promise(resolve=>{
  let frames=0,first=performance.now();
  const tick=()=>{if(++frames>=45)resolve((performance.now()-first)/frames);
                  else requestAnimationFrame(tick);};
  requestAnimationFrame(tick);
 }));
 const folder=path.resolve('.edge-qa');
 await fs.mkdir(folder,{recursive:true});
 const filename=path.join(folder,'shoreline-real-browser.png');
 await page.screenshot({path:filename,fullPage:true});
 await page.setViewportSize({width:390,height:720});
 await page.waitForTimeout(300);
 assert.equal(await page.getAttribute('#btn-mobile-tools','aria-expanded'),'false');
 const bottomControlsGap=await page.evaluate(()=>document.querySelector('.bottom-center').getBoundingClientRect().left-document.getElementById('btn-mobile-tools').getBoundingClientRect().right);
 assert.ok(bottomControlsGap>=5,'Mobile Tools button overlaps the simulation controls');
 await page.click('#btn-mobile-tools');
 assert.equal(await page.getAttribute('#btn-mobile-tools','aria-expanded'),'true');
 await page.click('[data-tool="plant"]');
 assert.equal(await page.getAttribute('#btn-mobile-tools','aria-expanded'),'false');
 const criticalErrors=errors.filter(e=>!/fonts\\.googleapis\\.com|fonts\\.gstatic\\.com/i.test(e));
 assert.deepEqual(criticalErrors,[],'Browser JavaScript or console errors');
 console.log(JSON.stringify({url,gpu,avgFrameMs,approxFps:Math.round(1000/avgFrameMs),savedBytes:saved.length,screenshot:filename},null,2));
} catch(error) {
 console.error('VISUAL_SMOKE_FAILED:',error.message);
 process.exitCode=1;
} finally {await browser?.close();}
