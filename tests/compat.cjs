/* Supplementary browser engines; emulation is not a substitute for physical devices. */
const {chromium, webkit} = require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..','_site'),server=require('./server.cjs')(root);
const results=[];
(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base=`http://127.0.0.1:${server.address().port}`;
  for(const engine of ['edge-policy','webkit']) {
    let browser, page;
    try {
      browser=engine==='webkit'?await webkit.launch({headless:true}):await chromium.launch({channel:process.env.BROWSER_CHANNEL||'msedge',headless:true,args:['--autoplay-policy=user-gesture-required']});
      const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
      page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
      if(engine==='webkit') {
        // Diagnose the runtime independently of application code before claiming media support.
        await page.goto(base+'/404.html');
        await page.evaluate(()=>{
          const button=document.createElement('button');button.textContent='Probe MP3';document.body.append(button);
          window.probe=new Audio('/assets/audio/bgm.mp3');window.probeResult='pending';
          button.onclick=()=>window.probe.play().then(()=>window.probeResult='played').catch(e=>window.probeResult=e.name);
        });
        await page.getByRole('button',{name:'Probe MP3'}).click();
        await page.waitForFunction(()=>window.probeResult!=='pending');
        const probe=await page.evaluate(()=>({result:window.probeResult,code:window.probe.error?.code}));
        if(probe.result==='NotSupportedError'&&probe.code===4) {
          await page.goto(base+'/');await page.waitForFunction(()=>document.getElementById('music-state').textContent.includes('加载失败'));
          await page.evaluate(()=>window.originalAudio=document.getElementById('bgm'));
          await page.locator('.main-nav').getByRole('link',{name:'项目',exact:true}).click();await page.waitForURL(base+'/projects/');
          assert(await page.evaluate(()=>window.originalAudio===document.getElementById('bgm')));
          assert(await page.getByRole('button',{name:'音乐加载失败，点击重试',exact:true}).isVisible());
          assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.deepEqual(errors,[]);
          results.push({engine,version:browser.version(),status:'media-blocked',uiPassed:true,probe,reason:'This Windows WebKit runtime cannot play even a standalone original MP3. Actual Safari/iOS audio remains unverified.'});
          continue;
        }
      }
      await page.goto(base+'/');
      await page.waitForFunction(()=>document.getElementById('music-toggle').getAttribute('aria-busy')==='false');
      const initiallyPaused=await page.locator('#bgm').evaluate(a=>a.paused);
      if(initiallyPaused){assert(await page.locator('.cd-prompt').isVisible());await page.locator('#music-toggle').click();}
      await page.waitForFunction(()=>!document.getElementById('bgm').paused&&document.getElementById('bgm').currentTime>0,null,{timeout:10000});
      await page.evaluate(()=>{window.sameAudio=document.getElementById('bgm');window.sameAudio.currentTime=20;});
      await page.locator('.main-nav').getByRole('link',{name:'项目',exact:true}).click();await page.waitForURL(base+'/projects/');
      assert(await page.evaluate(()=>window.sameAudio===document.getElementById('bgm')&&!window.sameAudio.paused&&window.sameAudio.currentTime>=20));
      await page.goBack();await page.waitForURL(base+'/');await page.waitForSelector('#social-links .social-card');
      await page.locator('#music-toggle').click();await page.reload();await page.waitForFunction(()=>document.getElementById('bgm').readyState>=1);
      assert(await page.locator('#bgm').evaluate(a=>a.paused&&a.currentTime>=20));
      assert.deepEqual(errors,[]);
      results.push({engine,version:browser.version(),passed:true,initialAutoplay:initiallyPaused?'blocked with manual recovery':'allowed'});
    } catch(error) {
      const media=page?await page.locator('#bgm').evaluate(a=>({codec:a.canPlayType('audio/mpeg'),paused:a.paused,time:a.currentTime,ready:a.readyState,network:a.networkState,error:a.error?.message,state:document.getElementById('music-state').textContent})).catch(()=>null):null;
      results.push({engine,passed:false,error:error.message,media});process.exitCode=1;
    }
    finally {if(browser)await browser.close();}
  }
  console.log(JSON.stringify(results,null,2));
  fs.writeFileSync(path.resolve(__dirname,'..','test-results','compat-results.json'),JSON.stringify(results,null,2));
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>server.close());
