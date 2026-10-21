// Policy rejection is explicit test injection; subsequent play uses the real MP3.
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const server=require('./server.cjs')(path.resolve('_site')),checks=[],errors=[];let browser;
(async()=>{
  await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`;
  browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||'msedge',headless:true,args:['--autoplay-policy=no-user-gesture-required']});
  async function setup({mobile=false,blockCount=1,policy='NotAllowedError',paused=false}={}) {
    const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:mobile,isMobile:mobile});
    await context.addInitScript(({blockCount,policy,paused})=>{
      if(paused)localStorage.setItem('shiming:music-state',JSON.stringify({isPlaying:false,volume:.25}));
      window.attempts=0;window.activations=[];const original=HTMLMediaElement.prototype.play;
      HTMLMediaElement.prototype.play=function(){window.attempts++;window.activations.push(navigator.userActivation?.isActive);return window.attempts<=blockCount?Promise.reject(new DOMException('Test policy',policy)):original.call(this);};
    },{blockCount,policy,paused});
    const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(base+'/');
    await page.waitForFunction(()=>document.querySelector('.music-player').classList.contains('needs-play'));
    return {context,page};
  }
  async function check(name,options,run){const {context,page}=await setup(options);try{await run(page);checks.push(name);console.log('PASS '+name);}finally{await context.close();}}
  const playing=page=>page.waitForFunction(()=>!document.getElementById('bgm').paused&&document.getElementById('bgm').currentTime>0);
  for(const gesture of ['mouse','touch','keyboard'])await check(`Trusted ${gesture} starts blocked music exactly once`,{mobile:gesture==='touch'},async page=>{
    assert.equal(await page.evaluate(()=>attempts),1);assert.equal(await page.locator('.cd-prompt').textContent(),'轻触页面播放');
    if(gesture==='mouse')await page.locator('h1').click();
    if(gesture==='touch')await page.locator('h1').tap();
    if(gesture==='keyboard')await page.keyboard.press('Enter');
    await playing(page);assert.equal(await page.evaluate(()=>attempts),2);assert.equal(await page.evaluate(()=>activations[1]),true);
    await page.locator('h1').click();assert.equal(await page.evaluate(()=>attempts),2);
  });
  await check('Synthetic input and scroll do not start music',{},async page=>{
    await page.evaluate(()=>{for(const type of ['pointerup','touchend','click','keydown'])document.dispatchEvent(new Event(type,{bubbles:true}));scrollTo(0,100);});
    await page.waitForTimeout(150);assert.equal(await page.evaluate(()=>attempts),1);
    await page.locator('h1').click();await playing(page);assert.equal(await page.evaluate(()=>attempts),2);
  });
  await check('Direct CD touch/keyboard control does not double-toggle', {mobile:true},async page=>{
    await page.locator('#music-toggle').tap();await playing(page);assert.equal(await page.evaluate(()=>attempts),2);
    await page.locator('#music-toggle').focus();await page.keyboard.press('Enter');assert(await page.locator('#bgm').evaluate(a=>a.paused));
    await page.locator('h1').tap();assert.equal(await page.evaluate(()=>attempts),2);
  });
  await check('A second policy rejection does not retry on every interaction',{blockCount:2},async page=>{
    await page.locator('h1').click();await page.waitForFunction(()=>attempts===2&&document.querySelector('#music-toggle').getAttribute('aria-busy')==='false');
    for(let i=0;i<3;i++)await page.locator('h1').click();assert.equal(await page.evaluate(()=>attempts),2);
    assert.equal(await page.locator('.cd-prompt').textContent(),'点击播放');await page.locator('#music-toggle').click();await playing(page);assert.equal(await page.evaluate(()=>attempts),3);
  });
  await check('A new visit attempts autoplay even after a previously saved pause',{paused:true},async page=>{
    assert.equal(await page.evaluate(()=>attempts),1);
    await page.locator('h1').click();await playing(page);assert.equal(await page.evaluate(()=>attempts),2);
    await page.locator('#music-toggle').click();await page.locator('h1').click();
    assert(await page.locator('#bgm').evaluate(a=>a.paused));assert.equal(await page.evaluate(()=>attempts),2);
  });
  await check('Source/decoder failure only retries via the CD',{policy:'NotSupportedError'},async page=>{
    await page.locator('h1').click();assert.equal(await page.evaluate(()=>attempts),1);assert.equal(await page.locator('.cd-prompt').textContent(),'点击重试');
    await page.locator('#music-toggle').click();await playing(page);assert.equal(await page.evaluate(()=>attempts),2);
  });
  await check('First navigation starts music and later navigation preserves its instance',{},async page=>{
    await page.evaluate(()=>window.originalAudio=document.getElementById('bgm'));
    await page.locator('.main-nav').getByRole('link',{name:'项目',exact:true}).click();await page.waitForURL(base+'/#projects');await playing(page);
    await page.locator('#music-toggle').click();
    await page.locator('.main-nav').getByRole('link',{name:'关于',exact:true}).click();await page.waitForURL(base+'/#about');
    assert(await page.evaluate(()=>originalAudio===document.getElementById('bgm')&&originalAudio.paused&&attempts===2));
  });
  assert.deepEqual(errors,[]);fs.writeFileSync('test-results/music-gesture-results.json',JSON.stringify({checks,errors},null,2));
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{if(browser)await browser.close();server.close();});
