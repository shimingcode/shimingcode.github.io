const {chromium}=require('playwright'),assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
const server=require('./server.cjs')(path.resolve('_site'));let browser;const checks=[],errors=[];
async function check(name,fn){await fn();checks.push(name);console.log('PASS '+name);}
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`;
 browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||'msedge',headless:true});const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,hasTouch:true,reducedMotion:'no-preference'});
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
 const requests=[];page.on('request',r=>requests.push(r.url()));await page.goto(base+'/');
 async function nav(name){await page.locator('.main-nav').getByRole('link',{name,exact:true}).click();await page.waitForFunction(()=>!document.getElementById('main').hasAttribute('aria-busy'));}
 await check('Game engine is not fetched or initialized on the homepage',async()=>{assert(!requests.some(r=>r.includes('game-engine')));assert.equal(await page.evaluate(()=>typeof window.MemoryGame),'undefined');});
 await check('Search reuses card nodes, handles rapid input and cancels work on leave',async()=>{
  await page.evaluate(()=>window.telegramCard=document.querySelector('[href="https://t.me/shimingfox"]'));
  const search=page.getByRole('searchbox');await search.fill('does-not');await search.fill('telegram');await page.waitForFunction(()=>document.querySelectorAll('.social-card').length===1);
  assert(await page.evaluate(()=>window.telegramCard===document.querySelector('[href="https://t.me/shimingfox"]')));
  await search.fill('x');await nav('关于');await page.waitForTimeout(120);assert.equal(await page.locator('#about-content p').count(),3);
 });
 await check('Particle pool reuses nodes and stops/releases on disable, hidden and reduced motion',async()=>{
  await page.evaluate(()=>window.firstPetal=document.querySelector('.petal'));
  await page.setViewportSize({width:1440,height:1000});assert(await page.evaluate(()=>window.firstPetal===document.querySelector('.petal')));
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));});assert.equal(await page.evaluate(()=>SiteSakura.running),false);
  await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});assert.equal(await page.evaluate(()=>SiteSakura.running),true);
  await page.getByLabel('外观与互动设置').click();await page.getByLabel('飘落樱花').uncheck();assert.deepEqual(await page.evaluate(()=>[SiteSakura.active,SiteSakura.allocated,SiteSakura.running]),[0,0,false]);
  await page.getByLabel('飘落樱花').check();await page.keyboard.press('Escape');await page.emulateMedia({reducedMotion:'reduce'});await page.waitForFunction(()=>document.querySelectorAll('.petal').length===0);assert.equal(await page.locator('.petal').count(),0);await page.emulateMedia({reducedMotion:'no-preference'});
 });
 await check('All four difficulty boards are playable, complete once and reset cleanly',async()=>{
  await nav('小游戏');
  for(const [difficulty,pairs]of Object.entries({easy:4,normal:6,hard:8,expert:12})){
   await page.getByLabel('难度').selectOption(difficulty);assert.equal(await page.locator('.memory-card').count(),pairs*2);
   const groups=await page.locator('.memory-card').evaluateAll(cards=>{const groups={};cards.forEach((card,i)=>(groups[card.querySelector('.memory-front').textContent]??=[]).push(i));return Object.values(groups);});
   for(const [a,b]of groups){await page.locator('.memory-card').nth(a).click();await page.locator('.memory-card').nth(b).click();}
   assert.equal(await page.locator('#memory-grid').getAttribute('data-state'),'COMPLETED');assert.equal(await page.locator('[data-matched="true"]').count(),pairs*2);
   const message=await page.locator('#game-message').innerText();await page.locator('.memory-card').first().evaluate(card=>card.click());assert.equal(await page.locator('#game-message').innerText(),message);
  }
 });
 await check('Rapid taps cannot open a third card; pause and restart cancel stale pair tasks',async()=>{
  await page.getByLabel('难度').selectOption('easy');
  const unmatched=await page.locator('.memory-card').evaluateAll(cards=>{const a=cards[0].querySelector('.memory-front').textContent;return cards.findIndex(card=>card.querySelector('.memory-front').textContent!==a);});
  await page.evaluate(index=>{const c=document.querySelectorAll('.memory-card');c[0].click();c[0].click();c[index].click();for(const card of c)card.click();},unmatched);
  assert.equal(await page.locator('[data-open="true"]').count(),2);assert.equal(await page.locator('#memory-grid').getAttribute('data-state'),'CHECKING');
  await page.getByRole('button',{name:'暂停游戏',exact:true}).click();const clock=await page.locator('#game-time').innerText();await page.waitForTimeout(1100);assert.equal(await page.locator('#game-time').innerText(),clock);assert.equal(await page.locator('[data-open="true"]').count(),2);
  await page.getByRole('button',{name:'继续游戏',exact:true}).click();await page.waitForFunction(()=>document.querySelectorAll('[data-open="true"]').length===0);
  await page.evaluate(index=>{const c=document.querySelectorAll('.memory-card');c[0].click();c[index].click();},unmatched);await page.locator('#game-restart').click();await page.waitForTimeout(900);
  assert.equal(await page.locator('#memory-grid').getAttribute('data-state'),'READY');assert.equal(await page.locator('#game-time').innerText(),'00:00');
  await page.locator('.memory-card').first().click();await nav('首页');await page.waitForTimeout(1100);await nav('小游戏');assert.equal(await page.locator('#game-time').innerText(),'00:00');
 });
 await check('Document cache is bounded and repeated routes do not refetch HTML or scripts',async()=>{
  const routes=['项目','平台导航','作品','关于','小游戏','首页'];for(const name of routes)await nav(name);
  const before=requests.length;for(const name of routes)await nav(name);
  const newDocuments=requests.slice(before).filter(r=>/\/(?:index\.html|works\.html|projects\/|links\/|games\/|about\/)($|\?)/.test(r));
  assert.deepEqual(newDocuments,[]);assert(await page.evaluate(()=>SiteNavigation.cacheSize<=6));
 });
 await check('Closed/hidden music panel performs no progress DOM writes',async()=>{
  await page.evaluate(()=>{window.progressWrites=0;window.panelObserver=new MutationObserver(records=>window.progressWrites+=records.length);panelObserver.observe(document.querySelector('.music-panel'),{subtree:true,childList:true,attributes:true,characterData:true});for(let i=0;i<100;i++)document.getElementById('bgm').dispatchEvent(new Event('timeupdate'));});
  await page.waitForTimeout(100);assert.equal(await page.evaluate(()=>window.progressWrites),0);await page.evaluate(()=>panelObserver.disconnect());
 });
 await check('Mobile, tablet and landscape boards/images fit with stable dimensions',async()=>{
  for(const [width,height]of [[320,740],[390,844],[768,1024],[844,390]]){
   await page.setViewportSize({width,height});await nav('小游戏');await page.getByLabel('难度').selectOption('expert');assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   const board=await page.locator('#memory-grid').boundingBox(),fox=await page.locator('.fox-assistant').boundingBox();
   assert(fox.y>=board.y+board.height,'Fox assistant must not cover game cards');
   await page.screenshot({path:`test-results/game-${width}.png`,fullPage:true});
   await nav('作品');for(const img of await page.locator('.work-card img').all()){await img.scrollIntoViewIfNeeded();await img.evaluate(img=>img.decode());}assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  }
 });
 await check('Repeated mount/unmount keeps live DOM listener counts bounded after GC',async()=>{
  const cdp=await context.newCDPSession(page),samples=[];
  for(let round=0;round<3;round++){for(let i=0;i<6;i++){await nav('小游戏');await page.locator('.memory-card').first().click();await nav('首页');}await page.evaluate(()=>{window.telegramCard=null;window.firstPetal=null;window.panelObserver=null;});await cdp.send('HeapProfiler.collectGarbage');samples.push(await cdp.send('Memory.getDOMCounters'));}
  assert(samples[2].jsEventListeners<=samples[0].jsEventListeners+2);assert(samples[2].nodes<=samples[0].nodes+10);
  fs.writeFileSync('test-results/performance/lifecycle.json',JSON.stringify(samples,null,2));
 });
 assert.deepEqual(errors,[]);fs.writeFileSync('test-results/performance-tests.json',JSON.stringify({checks,errors},null,2));
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{if(browser)await browser.close();server.close();});
