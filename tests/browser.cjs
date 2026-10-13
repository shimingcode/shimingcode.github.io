/* Browser integration tests. Uses an isolated headless browser and a local static server. */
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..', '_site');
const results = path.resolve(__dirname, '..', 'test-results');
fs.mkdirSync(results, { recursive: true });
const server = require('./server.cjs')(root);
let browser, failures=[], checks=[], requests=[];
async function check(name, fn) { await fn(); checks.push(name); console.log(`PASS ${name}`); }
(async () => {
  await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
  const base=`http://127.0.0.1:${server.address().port}`;
  browser=await chromium.launch({headless:true, ...(process.env.BROWSER_CHANNEL ? {channel:process.env.BROWSER_CHANNEL} : {})});
  const context=await browser.newContext({ viewport:{width:1440,height:1000}, reducedMotion:'reduce' });
  const page=await context.newPage();
  page.on('pageerror',error=>failures.push(error.message));
  page.on('console',message=>{ if(message.type()==='error') failures.push(message.text()); });
  page.on('response',response=>{if(response.status()>=400)failures.push(`${response.status()} ${response.url()}`);});
  page.on('request',req=>requests.push(req.url()));
  await page.goto(base+'/');
  const initialResources = await page.evaluate(() => performance.getEntriesByType('resource').map(entry => ({name: new URL(entry.name).pathname, bytes:entry.transferSize, decodedBytes:entry.decodedBodySize})));
  fs.writeFileSync(path.join(results,'initial-resources.json'),JSON.stringify(initialResources,null,2));
  await check('11 original social entries and safe external anchors',async()=>{
    assert.equal(await page.locator('.social-card').count(),11);
    const external=await page.locator('#social-links a.social-card').evaluateAll(nodes=>nodes.map(a=>({href:a.href,rel:a.rel,target:a.target})));
    const ctx={window:{}};vm.runInNewContext(fs.readFileSync(path.join(root,'js/config.js'),'utf8'),ctx);
    assert.deepEqual(external.map(a=>a.href),Array.from(ctx.window.SITE_CONFIG.socialLinks).filter(x=>!x.action).map(x=>x.url));
    assert(external.every(a=>a.target==='_blank'&&a.rel.includes('noopener')&&a.rel.includes('noreferrer')));
  });
  await check('Directory search, empty state, category, sorting, focus preservation',async()=>{
    await page.getByRole('searchbox',{name:'搜索平台'}).fill('telegram');assert.equal(await page.locator('.social-card').count(),1);
    await page.getByRole('searchbox').fill('does-not-exist');assert(await page.locator('.empty-state').isVisible());
    await page.getByRole('searchbox').fill('');
    await page.locator('#platform-filters').getByRole('button',{name:'联系',exact:true}).click();
    assert.equal(await page.locator('.social-card').count(),3);
    assert.equal(await page.evaluate(()=>document.activeElement.textContent),'联系');
    await page.locator('#platform-filters').getByRole('button',{name:'全部',exact:true}).click();
    await page.getByLabel('排列方式').selectOption('name');
    const names=await page.locator('.card-name').allTextContents();assert.deepEqual(names,[...names].sort((a,b)=>a.localeCompare(b,'zh-CN')));
    await page.getByLabel('排列方式').selectOption('default');
  });
  await check('QQ copy and clipboard content',async()=>{
    await context.grantPermissions(['clipboard-read','clipboard-write'],{origin:base});
    await page.getByRole('button',{name:'复制 QQ：2057466996',exact:true}).click();
    assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),'2057466996');
  });
  await check('Project filters and clearly marked examples',async()=>{
    await page.locator('#project-filters').getByRole('button',{name:'Python',exact:true}).click();
    assert.equal(await page.locator('.project-card').count(),1);assert.match(await page.locator('.project-card').innerText(),/示例/);
    assert.equal(await page.locator('.project-card a').count(),0);
    await page.locator('#project-filters').getByRole('button',{name:'全部',exact:true}).click();
  });
  await check('Themes persist after reload, settings remain operable',async()=>{
    await page.getByLabel('外观与互动设置').click();await page.getByLabel('配色主题').selectOption('star');
    await page.reload();assert.equal(await page.locator('html').getAttribute('data-theme'),'star');
    await page.getByLabel('外观与互动设置').click();await page.getByLabel('配色主题').selectOption('night');
    await page.screenshot({path:path.join(results,'home-night.png'),fullPage:true});
    await page.getByLabel('配色主题').selectOption('sakura');await page.keyboard.press('Escape');
  });
  await check('Reduced motion, sakura switch, hidden-page animation state',async()=>{
    assert.equal(await page.locator('.petal').count(),0);await page.emulateMedia({reducedMotion:'no-preference'});
    await page.waitForFunction(()=>document.querySelectorAll('.petal').length>0);
    assert((await page.locator('.petal').count())<=18);assert((await page.locator('.petal').count())>0);
    await page.getByLabel('外观与互动设置').click();await page.getByLabel('飘落樱花').uncheck();assert.equal(await page.locator('.petal').count(),0);
    await page.reload();assert.equal(await page.locator('.petal').count(),0);
    await page.getByLabel('外观与互动设置').click();await page.getByLabel('飘落樱花').check();await page.keyboard.press('Escape');
    await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));});
    assert.equal(await page.locator('.petal').first().evaluate(el=>getComputedStyle(el).animationPlayState),'paused');
    await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});
    await page.emulateMedia({reducedMotion:'reduce'});
  });
  await check('Fox greeting, hide, restore, animation preference',async()=>{
    await page.getByRole('button',{name:'和狐狐打招呼'}).click();assert(await page.locator('#fox-bubble').isVisible());
    assert((await page.locator('#fox-bubble p').innerText()).length>5);
    await page.getByRole('button',{name:'隐藏助手',exact:true}).click();assert(await page.locator('.fox-assistant').isHidden());
    await page.getByLabel('外观与互动设置').click();await page.getByLabel('显示狐狐助手').check();await page.getByLabel('助手互动动画').uncheck();
    assert.equal(await page.locator('html').getAttribute('data-interaction-motion'),'off');assert(await page.locator('.fox-assistant').isVisible());await page.keyboard.press('Escape');
  });
  await check('Music actual media playback, pause, volume and persistence',async()=>{
    if (await page.locator('#bgm').evaluate(a=>a.paused)) await page.getByRole('button',{name:'播放音乐',exact:true}).click();
    await page.waitForFunction(()=>!document.getElementById('bgm').paused&&document.getElementById('bgm').currentTime>0);
    await page.getByRole('button',{name:'暂停音乐',exact:true}).click();assert(await page.locator('#bgm').evaluate(a=>a.paused));
    await page.getByLabel('展开音乐播放器').click();await page.locator('#music-volume').fill('0.5');
    assert.equal(await page.locator('#bgm').evaluate(a=>a.volume),.5);assert.equal(await page.locator('#music-next, #music-prev, #music-track').count(),0);
    await page.reload();assert.equal(await page.locator('#bgm').evaluate(a=>a.volume),.5);assert(await page.locator('#bgm').evaluate(a=>a.paused&&a.loop));
  });
  await check('Invalid URL and hostile display text cannot inject markup',async()=>{
    await page.route('**/js/config.js*',async route=>{
      const source=fs.readFileSync(path.join(root,'js/config.js'),'utf8');
      await route.fulfill({contentType:'text/javascript',body:source+'\nwindow.SITE_CONFIG.socialLinks.push({name:"<img src=x onerror=alert(1)>",icon:"link",category:"其他",url:"javascript:alert(1)"});'});
    });
    await page.reload();const invalid=page.locator('.social-card').last();assert(await invalid.isDisabled());assert.equal(await invalid.locator('img').count(),0);assert.match(await invalid.innerText(),/链接暂不可用/);
    await page.unroute('**/js/config.js*');await page.reload();
  });
  await check('Blocked storage leaves all core controls usable',async()=>{
    const isolated=await browser.newContext();await isolated.addInitScript(()=>{Storage.prototype.getItem=()=>{throw new DOMException('Blocked','SecurityError')};Storage.prototype.setItem=()=>{throw new DOMException('Blocked','SecurityError')};});
    const tab=await isolated.newPage();const errors=[];tab.on('pageerror',e=>errors.push(e.message));await tab.goto(base+'/');assert.equal(await tab.locator('.social-card').count(),11);
    await tab.getByLabel('外观与互动设置').click();await tab.getByLabel('配色主题').selectOption('night');assert.equal(await tab.locator('html').getAttribute('data-theme'),'night');assert.deepEqual(errors,[]);await isolated.close();
  });
  const routes=['/','/links/','/projects/','/games/','/about/','/works.html'];
  await check('Six routes, six viewport sizes, no overflow and correct grid columns',async()=>{
    for(const [width,height,columns] of [[320,740,2],[390,844,2],[768,1024,3],[1024,768,4],[1440,1000,5],[844,390,4]]) {
      await page.setViewportSize({width,height});
      for(const route of routes) {
        await page.goto(base+route);assert(await page.locator('main h1').isVisible());
        assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${route} overflows at ${width}`);
        if(route==='/'||route==='/links/') assert.equal(await page.locator('#social-links').evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').length),columns);
        if(route==='/'&&(width===390||width===1440)) {
          for(const cover of await page.locator('.project-cover').all()) { await cover.scrollIntoViewIfNeeded(); await cover.evaluate(img=>img.decode()); }
          const ratios=await page.locator('.project-cover').evaluateAll(imgs=>imgs.map(img=>img.clientWidth/img.clientHeight));
          assert(ratios.every(ratio=>Math.abs(ratio-2)<.03),'Project covers must retain 2:1 aspect ratio');
          await page.evaluate(()=>scrollTo(0,0));
          await page.screenshot({path:path.join(results,`home-${width}.png`),fullPage:true});
          await page.screenshot({path:path.join(results,`home-${width}-viewport.png`)});
        }
      }
    }
    for(const route of ['/projects','/links','/games','/about']){await page.goto(base+route);assert(page.url().endsWith(route+'/'));await page.reload();assert(await page.locator('main h1').isVisible());}
  });
  await check('Gallery loads four thumbnails; original, navigation, Escape and filters work',async()=>{
    await page.setViewportSize({width:1440,height:1000});await page.goto(base+'/works.html');
    for(const card of await page.locator('.work-card').all()) {await card.scrollIntoViewIfNeeded();await card.locator('img').evaluate(img=>img.decode());}
    assert.equal(await page.locator('.work-card img').count(),4);
    await page.getByRole('button',{name:'查看作品：作品 04',exact:true}).click();await page.locator('#lightbox-image').evaluate(img=>img.decode());
    assert.deepEqual(await page.locator('#lightbox-image').evaluate(img=>[img.naturalWidth,img.naturalHeight]),[1280,960]);
    await page.keyboard.press('ArrowLeft');assert.equal(await page.locator('#lightbox-title').innerText(),'作品 03');await page.keyboard.press('Escape');assert(await page.locator('#lightbox').isHidden());
    await page.locator('#work-filters').getByRole('button',{name:'摄影',exact:true}).click();assert.equal(await page.locator('.work-card').count(),2);
    await page.screenshot({path:path.join(results,'works-desktop.png'),fullPage:true});
  });
  await check('Memory game can be completed and reset without stale timers',async()=>{
    await page.goto(base+'/games/');const cards=page.locator('.memory-card');const known={};
    // First discover each card through the same UI a visitor uses.
    for(let i=0;i<8;i+=2){await cards.nth(i).click();known[i]=await cards.nth(i).innerText();await cards.nth(i+1).click();known[i+1]=await cards.nth(i+1).innerText();await page.waitForTimeout(900);}
    for(const face of new Set(Object.values(known))){const indices=Object.keys(known).filter(i=>known[i]===face).map(Number);if(await cards.nth(indices[0]).getAttribute('data-matched')==='true')continue;for(const i of indices)await cards.nth(i).click();}
    assert.match(await page.locator('#game-message').innerText(),/全部找到/);await page.getByRole('button',{name:'重新开始 ↻'}).click();assert.equal(await page.locator('[data-matched="true"]').count(),0);
    assert.equal(await page.locator('#game-score').innerText(),'0 次尝试 · 0 / 4 对');
  });
  await check('Zero console exceptions and missing resources during integration tests',async()=>assert.deepEqual(failures,[]));
  fs.writeFileSync(path.join(results,'browser-results.json'),JSON.stringify({passed:checks.length,checks,failures},null,2));
  console.log(`Completed ${checks.length} browser checks.`);
})().catch(error=>{console.error(error);fs.writeFileSync(path.join(results,'failure.txt'),error.stack||String(error));process.exitCode=1;}).finally(async()=>{if(browser)await browser.close();server.close();});
