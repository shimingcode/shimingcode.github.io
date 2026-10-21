/* Homepage sections plus backwards-compatible documents. Run after building, or pass `.` for source. */
const {chromium,webkit}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..',process.argv[2]||'_site');
const server=require('./server.cjs')(root);
server.prependListener('request',request=>{if(request.url.startsWith('/preview/'))request.url=request.url.slice('/preview'.length);});
const lazy=new Set(['works','games','fox-game']);
const checks=[],errors=[],expectedFailures=[],facts={root};
let browser;
async function check(name,run){await run();checks.push(name);console.log('PASS '+name);}
function watch(page,{failurePath=null}={}){
  page.on('pageerror',error=>errors.push(error.message));
  page.on('console',message=>{
    if(message.type()!=='error')return;
    if(failurePath&&/503/.test(message.text())){expectedFailures.push(message.text());return;}
    errors.push(message.text());
  });
  page.on('response',response=>{
    if(response.status()<400)return;
    const error=`${response.status()} ${response.url()}`;
    if(response.status()===503&&new URL(response.url()).pathname===failurePath)expectedFailures.push(error);
    else errors.push(error);
  });
}
async function ready(page,id){
  await page.waitForFunction(({id,isLazy})=>{
    const main=document.getElementById('main'),section=document.getElementById(id);
    return location.hash==='#'+id&&main&&!main.hasAttribute('aria-busy')&&section&&(!isLazy||section.dataset.sectionState==='ready');
  },{id,isLazy:lazy.has(id)});
}
const navigation=(page,id)=>page.locator(`.main-nav a[href$="#${id}"]`);
async function nav(page,id){await navigation(page,id).click();await ready(page,id);}
async function playMusic(page){
  await page.waitForFunction(()=>document.getElementById('music-toggle')?.getAttribute('aria-busy')==='false');
  if(await page.locator('#bgm').evaluate(audio=>audio.paused))await page.locator('#music-toggle').click();
  await page.waitForFunction(()=>{const a=document.getElementById('bgm');return !a.paused&&a.currentTime>0;});
}
async function structure(page){
  const duplicateIds=await page.evaluate(()=>{
    const seen=new Set();return [...document.querySelectorAll('[id]')].map(node=>node.id).filter(id=>seen.has(id)||!seen.add(id));
  });
  assert.deepEqual(duplicateIds,[],'Section imports must not duplicate document IDs');
  for(const selector of ['main','#main','#bgm','#music-root','#site-header','#site-footer'])assert.equal(await page.locator(selector).count(),1,selector);
}
const isFeatureScript=url=>/\/js\/(?:page-(?:works|games|hit)-[^/]+|works(?:-data)?|games|game-engine)\.js(?:\?|$)|\/games\/funny-hit\/[^/]+\.js(?:\?|$)/.test(url);

(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base=`http://127.0.0.1:${server.address().port}`;
  browser=process.env.BROWSER_ENGINE==='webkit'?await webkit.launch():await chromium.launch({channel:process.env.BROWSER_CHANNEL||'msedge'});facts.browser=browser.version();
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
  // Deterministic blocked startup. Subsequent real clicks still use actual MP3 playback.
  await context.addInitScript(()=>{
    const play=HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play=function(){
      if(this.id==='bgm'&&!navigator.userActivation.isActive)return Promise.reject(new DOMException('Blocked startup fixture','NotAllowedError'));
      return play.call(this);
    };
  });
  const page=await context.newPage();watch(page);const requests=[];
  page.on('request',request=>requests.push(request.url()));
  await page.goto(base+'/');
  await page.waitForFunction(()=>document.querySelectorAll('.social-card').length===11&&document.querySelectorAll('.project-card').length===5);
  await check('Cold home contains static content and fetches no gallery, game code or audio',async()=>{
    assert(!requests.some(isFeatureScript),requests.join('\n'));
    assert(!requests.some(url=>/\/js\/page-content(?:-[a-f0-9]+)?\.js/.test(url)),requests.join('\n'));
    assert(!requests.some(url=>/\.(?:wav|mp3)(?:\?|$)/.test(url)),requests.join('\n'));
    assert(!requests.some(url=>/\/works\.html$|\/games\/(?:funny-hit\/)?$/.test(url)),requests.join('\n'));
    assert.equal(await page.locator('.memory-card,.work-card,#hit-button').count(),0);
    const hashes=await page.locator('.main-nav a').evaluateAll(links=>links.map(link=>new URL(link.href).hash));
    assert.deepEqual(hashes,['#home','#links','#projects','#works','#games','#about','#music']);
    await structure(page);
  });

  await playMusic(page);
  await page.evaluate(()=>{
    window.sectionAudio=document.getElementById('bgm');window.sectionPlayer=document.getElementById('music-root');window.sectionMediaResets=[];
    for(const type of ['pause','emptied','loadstart'])sectionAudio.addEventListener(type,()=>sectionMediaResets.push(type));
    window.originalMain=document.getElementById('main');window.originalSocial=document.querySelector('.social-card');
  });
  await check('First section visits load features once and preserve game, gallery and music state',async()=>{
    await nav(page,'games');assert.equal(await page.locator('.memory-card').count(),8);
    await page.locator('.memory-card').first().click();await page.locator('#game-pause').click();
    await page.evaluate(()=>{window.retainedGrid=document.getElementById('memory-grid');window.retainedCard=document.querySelector('.memory-card');});
    await nav(page,'works');assert.equal(await page.locator('.work-card').count(),4);
    await page.locator('#work-filters').getByRole('button',{name:'摄影',exact:true}).click();
    await page.evaluate(()=>window.retainedPhoto=document.querySelector('.work-card'));
    await nav(page,'games');
    assert(await page.evaluate(()=>retainedGrid===document.getElementById('memory-grid')&&retainedCard===document.querySelector('.memory-card')));
    assert.equal(await page.locator('.memory-card').first().getAttribute('data-open'),'true');
    assert.equal(await page.locator('#memory-grid').getAttribute('data-state'),'PAUSED');
    await page.locator('#games').getByRole('link',{name:'和狐狐玩一会儿 →',exact:true}).click();await ready(page,'fox-game');
    await page.locator('#hit-button').click();await page.waitForFunction(()=>document.getElementById('hit-count').textContent==='1 / 100');
    await page.evaluate(()=>window.retainedFox=document.getElementById('funny-hit'));
    await nav(page,'home');await nav(page,'works');
    assert.equal(await page.locator('#work-filters [aria-pressed="true"]').textContent(),'摄影');
    assert(await page.evaluate(()=>retainedPhoto===document.querySelector('.work-card')));
    await nav(page,'games');await page.locator('#games').getByRole('link',{name:'和狐狐玩一会儿 →',exact:true}).click();await ready(page,'fox-game');
    assert.equal(await page.locator('#hit-count').textContent(),'1 / 100');
    assert(await page.evaluate(()=>retainedFox===document.getElementById('funny-hit')));
    const counts={};for(const url of requests.filter(isFeatureScript))counts[url]=(counts[url]||0)+1;
    assert(Object.keys(counts).length>=3);assert(Object.values(counts).every(count=>count===1),JSON.stringify(counts));
    facts.featureRequests=counts;
    assert(await page.evaluate(()=>originalMain===document.getElementById('main')&&originalSocial===document.querySelector('.social-card')));
    assert(await page.evaluate(()=>sectionAudio===document.getElementById('bgm')&&sectionPlayer===document.getElementById('music-root')&&!sectionAudio.paused));
    const previousTime=await page.locator('#bgm').evaluate(audio=>audio.currentTime);
    await page.waitForFunction(previous=>document.getElementById('bgm').currentTime!==previous,previousTime);
    assert.deepEqual(await page.evaluate(()=>sectionMediaResets),[]);await structure(page);
  });

  await check('Back, forward and repeated navigation preserve one history entry per destination',async()=>{
    await nav(page,'links');await nav(page,'projects');await nav(page,'works');
    const length=await page.evaluate(()=>history.length);
    for(let i=0;i<3;i++)await nav(page,'works');
    assert.equal(await page.evaluate(()=>history.length),length);
    await page.goBack();await ready(page,'projects');await page.goForward();await ready(page,'works');
    assert.equal(await page.evaluate(()=>history.length),length);
    assert(await page.evaluate(()=>originalMain===document.getElementById('main')&&sectionAudio===document.getElementById('bgm')));
  });

  await check('Manual scrolling updates a single active navigation link without growing history',async()=>{
    await nav(page,'home');const length=await page.evaluate(()=>history.length);
    await page.evaluate(()=>{
      const section=document.getElementById('links'),header=document.getElementById('site-header');
      scrollTo({top:scrollY+section.getBoundingClientRect().top-header.getBoundingClientRect().height-12,behavior:'instant'});
    });
    await page.waitForFunction(()=>{
      const active=[...document.querySelectorAll('.main-nav a[aria-current]')];return active.length===1&&new URL(active[0].href).hash==='#links';
    });
    assert.equal(await page.evaluate(()=>history.length),length);
  });

  await check('Reduced motion, sticky-header offsets and phone/tablet/desktop layouts remain usable',async()=>{
    await page.emulateMedia({reducedMotion:'reduce'});
    assert.equal(await page.locator('.site-header').evaluate(node=>getComputedStyle(node).position),'sticky');
    assert.notEqual(await page.locator('html').evaluate(node=>getComputedStyle(node).scrollBehavior),'smooth');
    for(const width of [320,768,1280]){
      await page.setViewportSize({width,height:900});
      for(const id of ['home','links','projects','works','games','about','music']){
        await nav(page,id);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${width}px #${id}`);
      }
      await nav(page,'links');
      const bounds=await page.evaluate(()=>({top:document.getElementById('links').getBoundingClientRect().top,bottom:document.getElementById('site-header').getBoundingClientRect().bottom}));
      assert(bounds.top>=bounds.bottom-2,`Sticky header covers #links at ${width}px: ${JSON.stringify(bounds)}`);
      await nav(page,'games');await page.locator('#games').getByRole('link',{name:'和狐狐玩一会儿 →',exact:true}).click();await ready(page,'fox-game');
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${width}px #fox-game`);
    }
    await structure(page);
  });

  await check('Direct deep links and reload initialize their requested section',async()=>{
    const direct=await context.newPage();watch(direct);
    for(const id of ['works','games','fox-game']){
      await direct.goto(base+'/#'+id);await ready(direct,id);await structure(direct);
      assert.equal(await direct.locator('link[rel="canonical"]').getAttribute('href'),'https://shimingcode.github.io/');
    }
    await direct.reload();await ready(direct,'fox-game');assert.equal(await direct.locator('#hit-count').textContent(),'0 / 100');
    await direct.close();
  });

  await check('The latest click wins when an earlier section response is delayed',async()=>{
    const rapid=await context.newPage();watch(rapid);await rapid.goto(base+'/');
    let release,started;const gate=new Promise(resolve=>release=resolve),requested=new Promise(resolve=>started=resolve);
    await rapid.route('**/works.html',async route=>{started();await gate;await route.continue().catch(()=>{});});
    try{
      await navigation(rapid,'works').click();
      let timer;try{await Promise.race([requested,new Promise((_,reject)=>timer=setTimeout(()=>reject(Error('Gallery fetch did not start')),6000))]);}finally{clearTimeout(timer);}
      await nav(rapid,'games');release();await rapid.waitForTimeout(300);
      assert.equal(new URL(rapid.url()).hash,'#games');await ready(rapid,'games');
      assert.equal(await rapid.locator('.memory-card').count(),8);
      const offset=await rapid.evaluate(()=>document.getElementById('games').getBoundingClientRect().top-document.getElementById('site-header').getBoundingClientRect().bottom);
      assert(offset>=0&&offset<60,`Late gallery content must not displace the latest target: ${offset}`);
    }finally{release();await rapid.close();}
  });

  await check('A failed section fetch offers an in-page retry without replacing the document',async()=>{
    const failed=await context.newPage();watch(failed,{failurePath:'/works.html'});await failed.goto(base+'/');
    await failed.evaluate(()=>{window.retryMain=document.getElementById('main');window.retryAudio=document.getElementById('bgm');});
    let attempts=0;await failed.route('**/works.html',route=>++attempts===1?route.fulfill({status:503,contentType:'text/plain',body:'Intentional section fetch failure'}):route.continue());
    await navigation(failed,'works').click();const retry=failed.locator('#works').getByRole('button',{name:/重试/});await retry.waitFor({state:'visible'});
    assert(await failed.evaluate(()=>retryMain===document.getElementById('main')&&retryAudio===document.getElementById('bgm')));
    await retry.click();await ready(failed,'works');assert.equal(attempts,2);assert.equal(await failed.locator('.work-card').count(),4);
    assert(await failed.evaluate(()=>retryMain===document.getElementById('main')&&retryAudio===document.getElementById('bgm')));
    await structure(failed);await failed.close();
  });

  await check('Old independent URLs remain directly usable and keep their canonical URLs',async()=>{
    const old=await context.newPage();watch(old);
    for(const [suffix,selector,count] of [['/links/','.social-card',11],['/projects/','.project-card',5],['/works.html','.work-card',4],['/games/','.memory-card',8],['/games/funny-hit/','#hit-button',1],['/about/','#about-content p',3]]){
      await old.goto(base+suffix);await old.locator(selector).first().waitFor();
      assert.equal(new URL(old.url()).pathname,suffix);assert.equal(await old.locator(selector).count(),count);
      assert.equal(await old.locator('link[rel="canonical"]').getAttribute('href'),'https://shimingcode.github.io'+suffix);await structure(old);
    }
    await old.close();
  });

  await check('Navigating from an old game moves its live DOM, progress and audio into home',async()=>{
    const old=await context.newPage();watch(old);await old.goto(base+'/games/');await playMusic(old);
    await old.locator('#game-difficulty').selectOption('normal');await old.locator('.memory-card').first().click();await old.locator('#game-pause').click();
    await old.evaluate(()=>{window.oldGrid=document.getElementById('memory-grid');window.oldCard=document.querySelector('.memory-card');window.oldAudio=document.getElementById('bgm');window.oldAudioEvents=[];for(const type of ['pause','emptied','loadstart'])oldAudio.addEventListener(type,()=>oldAudioEvents.push(type));});
    await nav(old,'projects');await ready(old,'projects');
    assert(/^\/(?:index\.html)?$/.test(new URL(old.url()).pathname));
    assert(await old.evaluate(()=>oldGrid===document.querySelector('#games #memory-grid')&&oldCard===document.querySelector('#games .memory-card')));
    assert.equal(await old.locator('.memory-card').count(),12);assert.equal(await old.locator('#game-difficulty').inputValue(),'normal');
    await nav(old,'games');assert.equal(await old.locator('#memory-grid').getAttribute('data-state'),'PAUSED');assert.equal(await old.locator('.memory-card').first().getAttribute('data-open'),'true');
    await old.locator('#game-pause').click();await old.locator('.memory-card').nth(1).click();assert.match(await old.locator('#game-score').textContent(),/^1 次尝试/);
    assert(await old.evaluate(()=>oldAudio===document.getElementById('bgm')&&!oldAudio.paused));assert.deepEqual(await old.evaluate(()=>oldAudioEvents),[]);
    await structure(old);await old.close();
  });

  await check('Project-prefix deployment resolves imported links, responsive pictures and media',async()=>{
    const prefixed=await context.newPage();watch(prefixed);const localRequests=[];
    prefixed.on('request',request=>{if(request.url().startsWith(base))localRequests.push(request.url());});
    await prefixed.goto(base+'/preview/#works');await ready(prefixed,'works');
    await prefixed.locator('.work-card img').first().evaluate(image=>image.decode());
    await nav(prefixed,'games');await prefixed.locator('#games').getByRole('link',{name:'和狐狐玩一会儿 →',exact:true}).click();await ready(prefixed,'fox-game');
    await prefixed.locator('#hit-photo').evaluate(image=>image.decode());
    assert(await prefixed.locator('#hit-photo').evaluate(image=>new URL(image.currentSrc).pathname.startsWith('/preview/assets/')));
    assert(localRequests.every(url=>new URL(url).pathname.startsWith('/preview/')),localRequests.join('\n'));
    for(const id of ['home','links','projects','about','music']){await nav(prefixed,id);assert(new URL(prefixed.url()).pathname.startsWith('/preview/'));}
    await structure(prefixed);await prefixed.close();
  });
  await check('A legacy subpath entry can open the home gallery with correctly rebased pictures',async()=>{
    const old=await context.newPage();watch(old);await old.goto(base+'/preview/about/');
    await nav(old,'works');await old.locator('.work-card img').first().evaluate(image=>image.decode());
    await old.locator('.work-card').first().click();await old.locator('#lightbox-image').evaluate(image=>image.decode());
    assert(await old.locator('#lightbox-image').evaluate(image=>new URL(image.currentSrc).pathname.startsWith('/preview/assets/')));
    await old.keyboard.press('Escape');await structure(old);await old.close();
  });
  await check('A rejected feature script retries in place, including the native module cache',async()=>{
    const failed=await context.newPage();await failed.goto(base+'/');let attempts=0;
    await failed.route(/\/js\/(?:page-works-[a-f0-9]+|works)\.js/,route=>++attempts===1?route.fulfill({status:503,contentType:'text/javascript',body:'Intentional module failure'}):route.continue());
    await failed.evaluate(()=>window.moduleRetryMain=document.getElementById('main'));
    await navigation(failed,'works').click();await failed.waitForFunction(()=>document.getElementById('works').dataset.sectionState==='error');
    await failed.locator('#works [data-section-retry]').click();await ready(failed,'works');
    assert.equal(attempts,2);assert(await failed.evaluate(()=>moduleRetryMain===document.getElementById('main')));await failed.close();
  });
  await check('The shared content helper is lazy, retries a failed load and is reused',async()=>{
    const failed=await context.newPage();let attempts=0;
    await failed.route(/\/js\/page-content(?:-[a-f0-9]+)?\.js/,route=>++attempts===1?route.fulfill({status:503,contentType:'text/javascript',body:'Intentional helper failure'}):route.continue());
    await failed.goto(base+'/');assert.equal(attempts,0);
    await navigation(failed,'works').click();await failed.waitForFunction(()=>document.getElementById('works').dataset.sectionState==='error');
    await failed.locator('#works [data-section-retry]').click();await ready(failed,'works');
    await nav(failed,'games');await nav(failed,'works');
    assert.equal(attempts,2);await structure(failed);await failed.close();
  });
  await check('A high-density phone defers the larger about avatar until needed',async()=>{
    const phone=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,reducedMotion:'reduce'});
    const avatar=await phone.newPage();watch(avatar);const images=[];
    avatar.on('request',request=>{if(/\/assets\/images\/avatar\.webp(?:\?|$)/.test(request.url()))images.push(request.url());});
    await avatar.goto(base+'/',{waitUntil:'networkidle'});
    assert.equal(images.length,0,'Offscreen about avatar must not download its larger source during home load');
    assert.equal(await avatar.locator('.about-avatar').getAttribute('srcset'),null);
    await nav(avatar,'about');
    await avatar.waitForFunction(()=>document.querySelector('.about-avatar').currentSrc.endsWith('/avatar.webp'));
    await avatar.locator('.about-avatar').evaluate(image=>image.decode());
    assert(await avatar.locator('.about-avatar').evaluate(image=>image.naturalWidth>0));
    await nav(avatar,'home');await nav(avatar,'about');assert.equal(images.length,1);
    await avatar.goto(base+'/preview/#about');await ready(avatar,'about');
    await avatar.waitForFunction(()=>document.querySelector('.about-avatar').currentSrc.includes('/preview/assets/images/avatar.webp'));
    await avatar.locator('.about-avatar').evaluate(image=>image.decode());
    await phone.close();
  });
  await check('Native smooth scroll settles below the header and the final music section stays active',async()=>{
    const smooth=await context.newPage();watch(smooth);await smooth.emulateMedia({reducedMotion:'no-preference'});await smooth.goto(base+'/');
    await smooth.evaluate(()=>{window.scrollCalls=[];const scroll=Element.prototype.scrollIntoView;Element.prototype.scrollIntoView=function(options){scrollCalls.push({id:this.id,behavior:options?.behavior});return scroll.call(this,options);};});
    await nav(smooth,'projects');
    await smooth.waitForFunction(()=>{const gap=document.getElementById('projects').getBoundingClientRect().top-document.getElementById('site-header').getBoundingClientRect().bottom;return gap>=0&&gap<60;});
    assert(await smooth.evaluate(()=>scrollCalls.some(call=>call.id==='projects'&&call.behavior==='smooth')));
    await nav(smooth,'music');
    await smooth.waitForFunction(()=>{const section=document.getElementById('music'),header=document.getElementById('site-header');return section.getBoundingClientRect().top>=header.getBoundingClientRect().bottom-2&&section.getBoundingClientRect().bottom<=innerHeight;});
    await smooth.waitForTimeout(250);
    assert.equal(await smooth.locator('.main-nav [aria-current]').getAttribute('data-section-link'),'music');
    await smooth.locator('[data-music-open]').click();assert(await smooth.locator('.music-panel').isVisible());
    await smooth.keyboard.press('Escape');assert.equal(await smooth.locator('.music-disclosure').getAttribute('open'),null);
    await nav(smooth,'home');await smooth.waitForFunction(()=>scrollY<2);
    fs.mkdirSync('test-results/sections',{recursive:true});
    for(const width of [390,1280]){await smooth.setViewportSize({width,height:900});await smooth.screenshot({path:`test-results/sections/home-${width}.png`});}
    await nav(smooth,'games');await smooth.waitForTimeout(1000);await smooth.screenshot({path:'test-results/sections/games-desktop.png'});
    await smooth.close();
  });
  await check('Normal section navigation has no missing resources or console exceptions',async()=>assert.deepEqual(errors,[]));
  await context.close();
})().catch(error=>{console.error(error);facts.failure=error.stack||String(error);process.exitCode=1;}).finally(async()=>{
  const output=path.resolve(__dirname,'..','test-results','sections');fs.mkdirSync(output,{recursive:true});
  fs.writeFileSync(path.join(output,(process.env.BROWSER_ENGINE==='webkit'?'webkit-':'')+(path.basename(root)==='_site'?'built.json':'source.json')),JSON.stringify({facts,checks,errors,expectedFailures},null,2));
  await browser?.close();server.close();
});
