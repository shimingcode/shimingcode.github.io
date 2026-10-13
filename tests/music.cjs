/* Real MP3 playback + progressive navigation. Fixtures are labelled explicitly. */
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..', '_site'), output = path.resolve(__dirname, '..', 'test-results');
const server = require('./server.cjs')(root);
fs.mkdirSync(output, {recursive:true});
let browser, checks = [], errors = [], facts = {};
async function check(name, run) { await run(); checks.push(name); console.log(`PASS ${name}`); }
const current = page => page.locator('#bgm').evaluate(a=>a.currentTime);
const playing = page => page.waitForFunction(()=>!document.getElementById('bgm').paused && document.getElementById('bgm').currentTime > 0);
(async () => {
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  // Browser test policy enables audible autoplay; the site itself never bypasses policy.
  browser = await chromium.launch({headless:true, args:['--autoplay-policy=no-user-gesture-required'], ...(process.env.BROWSER_CHANNEL ? {channel:process.env.BROWSER_CHANNEL} : {})});
  facts.browser = browser.version();
  const context = await browser.newContext({viewport:{width:1440,height:1000}, reducedMotion:'no-preference'});
  await context.addInitScript(()=>{
    const original=HTMLMediaElement.prototype.play;
    window.playCalls=0; window.savedWrites=0;
    HTMLMediaElement.prototype.play=function(){window.playCalls++;return original.call(this);};
    const set=Storage.prototype.setItem;
    Storage.prototype.setItem=function(key,value){if(key==='shiming:music-state')window.savedWrites++;return set.call(this,key,value);};
  });
  const page = await context.newPage();
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
  await page.goto(base+'/');
  await check('First visit attempts audible autoplay once and plays the existing MP3', async()=>{
    await playing(page);
    const result=await page.locator('#bgm').evaluate(a=>({loop:a.loop,muted:a.muted,source:a.currentSrc,duration:a.duration,calls:window.playCalls}));
    assert.equal(result.loop,true);assert.equal(result.muted,false);assert.equal(result.calls,1);assert(result.source.endsWith('/assets/audio/bgm-web.mp3'));
    facts.audio=result;assert(await page.locator('.cd-cover').evaluate(img=>img.complete&&img.naturalWidth>0));
    assert.equal(await page.locator('.music-disclosure').getAttribute('open'),null);
  });
  await check('CD pauses at its current rotation angle and resumes the same animation', async()=>{
    await page.waitForTimeout(300); await page.locator('#music-toggle').click();
    await page.waitForTimeout(100);
    const transform=await page.locator('.cd-disc').evaluate(el=>getComputedStyle(el).transform);
    await page.waitForTimeout(250);
    assert.equal(await page.locator('.cd-disc').evaluate(el=>getComputedStyle(el).transform),transform);
    assert.equal(await page.locator('.cd-disc').evaluate(el=>getComputedStyle(el).animationPlayState),'paused');
    await page.evaluate(()=>window.discAnimation=document.querySelector('.cd-disc').getAnimations()[0]);
    await page.locator('#music-toggle').click();await playing(page);
    await page.waitForTimeout(250);
    assert(await page.evaluate(()=>window.discAnimation===document.querySelector('.cd-disc').getAnimations()[0]));
    assert.notEqual(await page.locator('.cd-disc').evaluate(el=>getComputedStyle(el).transform),transform);
  });
  await check('Native single-track loop wraps naturally after seeking near the end', async()=>{
    await page.locator('#bgm').evaluate(a=>{a.currentTime=a.duration-1;});
    await page.waitForFunction(()=>{const a=document.getElementById('bgm');return a.currentTime<3&&!a.paused;},null,{timeout:6000});
    facts.loop='Seek to duration - 1 second, then observe natural wrap (no synthetic ended event).';
  });
  await page.locator('#bgm').evaluate(a=>{a.currentTime=Math.min(95,a.duration/2);window.initialTime=a.currentTime;window.originalAudio=a;window.originalPlayer=document.getElementById('music-root');window.mediaResets=[];for(const type of ['pause','emptied','loadstart'])a.addEventListener(type,()=>window.mediaResets.push(type));});
  const routes=[['项目','/projects/'],['平台导航','/links/'],['关于','/about/'],['小游戏','/games/'],['作品','/works.html'],['首页','/index.html']];
  async function navigate(label, suffix) {
    await page.locator('.main-nav').getByRole('link',{name:label,exact:true}).click();
    await page.waitForURL(base+suffix);
    await page.waitForFunction(()=>!document.getElementById('main').hasAttribute('aria-busy'));
  }
  await check('Repeated navigation across every page keeps the exact Audio, player, progress and playback', async()=>{
    for(let round=0;round<2;round++) for(const [label,suffix] of routes) {
      const before=await current(page); await navigate(label,suffix);
      const result=await page.evaluate(()=>({same:window.originalAudio===document.getElementById('bgm')&&window.originalPlayer===document.getElementById('music-root'),count:document.querySelectorAll('audio').length,time:document.getElementById('bgm').currentTime,paused:document.getElementById('bgm').paused,events:window.mediaResets,focus:document.activeElement.id}));
      assert(result.same);assert.equal(result.count,1);assert.equal(result.paused,false);assert(result.time>=before);assert.deepEqual(result.events,[]);assert.equal(result.focus,'main');
      if(label==='平台导航')assert.equal(await page.locator('.social-card').count(),11);
      if(label==='项目')assert.equal(await page.locator('.project-card').count(),5);
      if(label==='关于')assert.equal(await page.locator('#about-content p').count(),3);
      if(label==='小游戏'){assert.equal(await page.locator('.memory-card').count(),8);await page.locator('.memory-card').first().click();assert.equal(await page.locator('.memory-card').first().getAttribute('aria-pressed'),'true');}
      if(label==='作品'){assert.equal(await page.locator('.work-card').count(),4);await page.locator('.work-card').first().click();await page.locator('#lightbox-image').evaluate(img=>img.decode());await page.keyboard.press('Escape');}
    }
    facts.navigation=await page.evaluate(()=>({start:window.initialTime,end:document.getElementById('bgm').currentTime,mediaResets:window.mediaResets}));
    assert.equal(await page.locator('#platform-filters button').count(),await page.evaluate(()=>1+new Set(window.SITE_CONFIG.socialLinks.map(link=>link.category)).size));
  });
  await check('History back/forward and same-page anchors preserve music and usable focus',async()=>{
    await page.goBack();await page.waitForURL(base+'/works.html');await page.waitForSelector('.work-card');
    await page.goForward();await page.waitForURL(base+'/index.html');await page.waitForSelector('#social-links .social-card');
    await page.getByRole('link',{name:'找到我 ↗',exact:true}).click();assert(page.url().endsWith('#platforms'));
    assert(await page.evaluate(()=>window.originalAudio===document.getElementById('bgm')));assert.deepEqual(await page.evaluate(()=>window.mediaResets),[]);
  });
  await check('Volume, mute, progress and paused preference survive a full reload',async()=>{
    await page.locator('#music-toggle').click();await page.getByLabel('展开音乐播放器').click();
    await page.locator('#music-volume').fill('0.6');await page.getByRole('button',{name:'静音',exact:true}).click();
    const position=Math.floor(Math.min(95,facts.audio.duration/2)*10)/10;await page.locator('#music-progress').fill(String(position));
    await page.waitForFunction(()=>!document.getElementById('bgm').seeking);
    await page.reload();await page.waitForFunction(()=>document.getElementById('bgm').readyState>=1);
    const saved=await page.locator('#bgm').evaluate(a=>({time:a.currentTime,volume:a.volume,muted:a.muted,paused:a.paused,calls:window.playCalls}));
    assert(Math.abs(saved.time-position)<.5);assert.equal(saved.volume,.6);assert(saved.muted&&saved.paused);assert.equal(saved.calls,0);facts.restored=saved;
    await page.getByLabel('展开音乐播放器').click();await page.getByRole('button',{name:'取消静音',exact:true}).click();await page.locator('#music-toggle').click();await playing(page);
    await page.reload();await playing(page);assert(await current(page)>=position);assert.equal(await page.evaluate(()=>window.playCalls),1);
  });
  await check('Hidden-page and reduced-motion settings stop rotation without pausing audio',async()=>{
    await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));});
    assert.equal(await page.locator('.cd-disc').evaluate(el=>getComputedStyle(el).animationPlayState),'paused');
    assert.equal(await page.locator('#bgm').evaluate(a=>a.paused),false);
    await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});
    await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await page.locator('.cd-disc').evaluate(el=>getComputedStyle(el).animationName),'none');
    assert.equal(await page.locator('#bgm').evaluate(a=>a.paused),false);await page.emulateMedia({reducedMotion:'no-preference'});
  });
  await check('Progress writes are throttled instead of writing each media event',async()=>{
    const before=await page.evaluate(()=>window.savedWrites);await page.waitForTimeout(5500);
    const writes=await page.evaluate(()=>window.savedWrites)-before;assert(writes>=1&&writes<=2);facts.writesIn5500ms=writes;
  });
  await check('Desktop, phone, tablet and landscape CD/panel fit the viewport',async()=>{
    for(const [width,height] of [[1440,1000],[320,740],[390,844],[768,1024],[844,390]]) {
      await page.setViewportSize({width,height});await page.evaluate(()=>document.querySelector('.music-disclosure').open=true);
      const bounds=await page.locator('.music-panel').boundingBox();assert(bounds.x>=0&&bounds.y>=0&&bounds.x+bounds.width<=width+1&&bounds.y+bounds.height<=height+1);
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
      await page.screenshot({path:path.join(output,`cd-${width}.png`)});
      await page.evaluate(()=>document.querySelector('.music-disclosure').open=false);
      if(width===390)await page.screenshot({path:path.join(output,'cd-mobile-collapsed.png')});
    }
  });
    await check('Rejected autoplay fixture waits for a real navigation gesture then starts once',async()=>{
    const blockedContext=await browser.newContext();
    await blockedContext.addInitScript(()=>{window.attempts=0;const play=HTMLMediaElement.prototype.play;HTMLMediaElement.prototype.play=function(){if(++window.attempts===1)return Promise.reject(new DOMException('Autoplay blocked','NotAllowedError'));return play.call(this);};});
    const tab=await blockedContext.newPage();await tab.goto(base+'/');
    await tab.waitForFunction(()=>document.querySelector('.music-player').classList.contains('needs-play'));
    assert(await tab.locator('.cd-prompt').isVisible());assert.equal(await tab.evaluate(()=>window.attempts),1);
    await tab.locator('.main-nav').getByRole('link',{name:'项目',exact:true}).click();await tab.waitForURL(base+'/projects/');
      await playing(tab);assert.equal(await tab.evaluate(()=>window.attempts),2);
    await blockedContext.close();
  });
  await check('Game page reserves its touch surface; the CD never overlaps cards or restart',async()=>{
    await navigate('小游戏','/games/');
    for(const [width,height] of [[320,740],[390,844],[844,390],[1440,1000]]) {
      await page.setViewportSize({width,height});await page.locator('#music-toggle').scrollIntoViewIfNeeded();
      const disc=await page.locator('#music-root').boundingBox(),board=await page.locator('.game-panel').boundingBox();
      assert(disc.y>=board.y+board.height);assert(await page.locator('#music-toggle').isVisible());
    }
    await navigate('首页','/index.html');
  });
  await check('Media failure fixture offers a manual retry without an automatic retry loop',async()=>{
    const tab=await context.newPage();await tab.route('**/assets/audio/bgm-web.mp3',route=>route.fulfill({status:404,body:'Missing fixture'}));await tab.goto(base+'/');
    await tab.waitForFunction(()=>document.getElementById('music-state').textContent.includes('加载失败'));
    assert.equal(await tab.evaluate(()=>window.playCalls),1);await tab.unroute('**/assets/audio/bgm-web.mp3');
    await tab.getByRole('button',{name:'音乐加载失败，点击重试',exact:true}).click();await playing(tab);await tab.close();
  });
  await check('Rapid navigation cancels stale results without reloading the document',async()=>{
    await page.evaluate(()=>window.SiteNavigation?.invalidate());
    await page.route('**/about/',async route=>{await new Promise(r=>setTimeout(r,500));await route.continue().catch(()=>{});});
    await page.evaluate(()=>{window.navigationSentinel=true;document.querySelector('.main-nav a[href$="about/"]').click();document.querySelector('.main-nav a[href$="games/"]').click();});
    await page.waitForURL(base+'/games/');await page.waitForTimeout(700);assert.equal(await page.evaluate(()=>window.navigationSentinel),true);assert(page.url().endsWith('/games/'));await page.unroute('**/about/');
  });
  await check('Fetch failure falls back to real HTML and restores progress',async()=>{
    await page.evaluate(()=>window.SiteNavigation?.invalidate());
    await page.evaluate(()=>window.fullNavigationSentinel=true);
    const before=await current(page);
    await page.route('**/projects/',async route=>{if(route.request().resourceType()==='fetch')await route.fulfill({status:503,body:'Unavailable fixture'});else await route.continue();});
    // Intentional 503 is captured separately from the ordinary clean-console checks.
    const previousErrors=errors.length;
    await navigate('项目','/projects/');await playing(page);
    assert.equal(await page.evaluate(()=>window.fullNavigationSentinel),undefined);assert(Math.abs(await current(page)-before)<3);
    errors.splice(previousErrors);await page.unroute('**/projects/');
  });
  await check('No ordinary console errors, missing resources or uncaught exceptions',async()=>assert.deepEqual(errors,[]));
  fs.writeFileSync(path.join(output,'music-results.json'),JSON.stringify({passed:checks.length,checks,facts,errors},null,2));
  console.log(`Completed ${checks.length} music checks.`);
})().catch(e=>{console.error(e);fs.writeFileSync(path.join(output,'music-failure.txt'),e.stack||String(e));process.exitCode=1;}).finally(async()=>{if(browser)await browser.close();server.close();});
