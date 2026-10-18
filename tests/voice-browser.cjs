// V2 transport failure regressions. There is no synthesis or alternate voice fallback.
const {chromium}=require('playwright'),assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
const server=require('./server.cjs')(path.resolve(__dirname,'../_site'));let browser;const checks=[];
async function check(name,fn){await fn();checks.push(name);console.log('PASS '+name);}
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||'msedge'});
 const base=process.env.LIVE_URL||'http://127.0.0.1:'+server.address().port,p=await browser.newPage();
 await p.addInitScript(()=>{window.calls=0;HTMLMediaElement.prototype.play=function(){if(this.id==='bgm')return Promise.reject(new DOMException('blocked','NotAllowedError'));calls++;return Promise.reject(new DOMException('blocked','NotAllowedError'));};});
 await p.goto(base+'/games/funny-hit/');await p.locator('#hit-button').click();
 await check('autoplay rejection keeps unique dialogue and offers explicit retry',async()=>{
  await p.waitForFunction(()=>document.querySelector('#voice-status').textContent.includes('试听原声'));
  await p.waitForFunction(()=>document.querySelector('#hit-count').textContent==='1 / 100');
  assert.equal(await p.locator('#hit-count').textContent(),'1 / 100');
  assert.equal(await p.locator('#hit-dialogue').textContent(),await p.evaluate(()=>FunnyHit.DIALOGUES[0]));
  const calls=await p.evaluate(()=>calls);await p.waitForTimeout(350);assert.equal(await p.evaluate(()=>calls),calls);
 });
 await check('muted click and volume survive reload, legacy voice preferences ignored',async()=>{
  await p.locator('.hit-settings summary').click();await p.getByLabel('点击原声',{exact:true}).uncheck();await p.getByLabel('原声音量',{exact:true}).fill('0.2');
  await p.reload();assert.equal(await p.locator('[data-setting=voiceVolume]').inputValue(),'0.2');assert(!(await p.locator('[data-setting=voiceEnabled]').isChecked()));
  await p.locator('#hit-button').click();assert.equal(await p.evaluate(()=>calls),0);
  await p.locator('.hit-settings summary').click();await p.getByRole('button',{name:'恢复默认设置'}).click();assert.equal(await p.locator('[data-setting=voiceVolume]').inputValue(),'0.65');
 });
 const c=await browser.newContext(),m=await c.newPage();const errors=[];m.on('pageerror',e=>errors.push(e.message));
 await m.route('**/xiaosheng-denial.wav',r=>r.fulfill({status:200,contentType:'audio/wav',body:'invalid-media-test-fixture'}));
 await m.goto(base+'/games/funny-hit/');await m.locator('#hit-button').click();
 await check('invalid audio degrades to text and game still completes',async()=>{
  await m.waitForFunction(()=>/无法|失败/.test(document.querySelector('#voice-status').textContent));
  await m.evaluate(()=>{for(let i=0;i<99;i++)document.querySelector('#hit-button').click();});
  await m.waitForFunction(()=>document.querySelector('#hit-count').textContent==='100 / 100');
  assert(await m.locator('#hit-complete').isVisible());assert.deepEqual(errors,[]);
 });
 await check('completion modal keyboard focus and Escape preserve cap',async()=>{
  assert.equal(await m.locator('#hit-complete').evaluate(d=>d.contains(document.activeElement)),true);
  await m.keyboard.press('Escape');assert(!(await m.locator('#hit-complete').isVisible()));assert(await m.locator('#hit-trigger').isDisabled());
 });
 fs.mkdirSync('test-results/funny-hit-v2',{recursive:true});fs.writeFileSync('test-results/funny-hit-v2/voice'+(process.env.LIVE_URL?'-live':'')+'.json',JSON.stringify({checks,errors},null,2));
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{await browser?.close();server.close();});
