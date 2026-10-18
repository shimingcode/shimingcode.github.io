// Verify the existing original recording transport; no generated fixture replaces it.
const {chromium}=require('playwright'),assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
const server=require('./server.cjs')(path.resolve(__dirname,'../_site'));let browser;
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||'msedge'});
 const page=await browser.newPage(),base=process.env.LIVE_URL||'http://127.0.0.1:'+server.address().port,errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{const Original=Audio;window.clips=[];window.Audio=function(){const a=new Original();clips.push(a);return a;};});
 await page.goto(base+'/games/funny-hit/');await page.locator('.hit-settings summary').click();
 await page.getByRole('button',{name:'试听原声',exact:true}).click();await page.waitForFunction(()=>clips[0]?.currentTime>0);
 assert.equal(await page.locator('#hit-count').textContent(),'0 / 100');
 await page.evaluate(()=>{window.loads=0;clips[0].addEventListener('loadstart',()=>loads++);});
 await page.waitForFunction(()=>clips[0].ended);await page.getByRole('button',{name:'试听原声',exact:true}).click();await page.waitForFunction(()=>!clips[0].paused&&clips[0].currentTime>0);
 assert.equal(await page.evaluate(()=>clips.length),1);assert.equal(await page.evaluate(()=>loads),0);
 assert.equal(await page.evaluate(()=>clips[0].playbackRate),1);
 await page.getByLabel('原声音量',{exact:true}).fill('0.25');assert.equal(await page.evaluate(()=>clips[0].volume),.25);
 assert.deepEqual(errors,[]);
 fs.mkdirSync('test-results/funny-hit-v2',{recursive:true});await page.evaluate(()=>{for(let i=0;i<100;i++)document.querySelector('#hit-button').click();});
 await page.waitForSelector('#hit-complete[open]');await page.screenshot({path:'test-results/funny-hit-v2/complete.png'});
 fs.writeFileSync('test-results/funny-hit-v2/original'+(process.env.LIVE_URL?'-live':'')+'.json',JSON.stringify({playedAndEnded:true,sameAudio:true,reloads:0,volume:.25,errors},null,2));
 console.log('PASS original WAV decodes, ends, replays without reloading, previews without counting and volume updates');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{await browser?.close();server.close();});
