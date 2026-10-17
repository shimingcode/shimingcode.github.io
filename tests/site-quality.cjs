const {chromium}=require('playwright'),assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
const server=require('./server.cjs')(path.resolve('_site'));
// Exercise a project-prefix deployment without copying the built site.
server.prependListener('request',req=>{if(req.url.startsWith('/preview/'))req.url=req.url.slice('/preview'.length);});
let browser;const checks=[],errors=[];
async function check(name,fn){await fn();checks.push(name);console.log('PASS '+name);}
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||'msedge'});
 const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'}),p=await context.newPage();
 const base=process.env.LIVE_URL||`http://127.0.0.1:${server.address().port}`,requests=[];
 p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url());});p.on('request',r=>requests.push(r.url()));
 const cdp=await context.newCDPSession(p);await cdp.send('Network.enable');await cdp.send('Network.setCacheDisabled',{cacheDisabled:true});
 async function nav(name){await p.locator('.main-nav').getByRole('link',{name,exact:true}).click();await p.waitForFunction(()=>!document.querySelector('#main').hasAttribute('aria-busy'));}
 await p.goto(base+'/');
 await check('cold home requests each stylesheet once even without browser cache',async()=>{for(const name of ['/css/style.css','/css/music.css'])assert.equal(requests.filter(u=>new URL(u).pathname===name).length,1,name);assert.equal(await p.locator('#social-links .social-card').count(),11);});
 await check('project filtering reuses all original cards and ignores the selected filter',async()=>{
  await p.evaluate(()=>window.projectCards=[...document.querySelectorAll('.project-card')]);
  for(let i=0;i<5;i++){await p.locator('#project-filters').getByRole('button',{name:'Python',exact:true}).click();await p.locator('#project-filters').getByRole('button',{name:'全部',exact:true}).click();}
  assert(await p.evaluate(()=>[...document.querySelectorAll('.project-card')].every((c,i)=>c===projectCards[i])));
  const writes=await p.evaluate(async()=>{let n=0;const observer=new MutationObserver(r=>n+=r.length);observer.observe(document.querySelector('#project-grid'),{childList:true});document.querySelector('#project-filters button[aria-pressed=true]').click();await Promise.resolve();observer.disconnect();return n;});assert.equal(writes,0);
 });
 await nav('作品');
 await check('gallery filtering reuses photographs; preview only loads on demand and releases on close',async()=>{
  assert.equal(await p.locator('#lightbox-image').getAttribute('src'),null);await p.evaluate(()=>window.photoCards=[...document.querySelectorAll('.work-card')]);
  await p.locator('#work-filters button').nth(1).click();await p.locator('#work-filters button').first().click();
  assert(await p.evaluate(()=>[...document.querySelectorAll('.work-card')].every((c,i)=>c===photoCards[i])));
  await p.locator('.work-card').first().click();await p.locator('#lightbox-image').evaluate(i=>i.decode());await p.keyboard.press('ArrowRight');await p.locator('#lightbox-image').evaluate(i=>i.decode());await p.evaluate(()=>{document.querySelector('#lightbox').close();document.querySelector('.work-card').click();});await p.waitForTimeout(50);assert(await p.locator('#lightbox').evaluate(d=>d.open));await p.locator('#lightbox-image').evaluate(i=>i.decode());await p.keyboard.press('Escape');await p.waitForFunction(()=>!document.querySelector('#lightbox-image').hasAttribute('src'));
 });
 await check('repeated mounts do not duplicate filters or about paragraphs',async()=>{
  await nav('关于');await p.evaluate(()=>{Site.mount();Site.mount();});assert.equal(await p.locator('#about-content p').count(),3);
  await nav('首页');await p.evaluate(()=>{Site.mount();Site.mount();});const labels=await p.locator('#platform-filters button').allTextContents();assert.equal(labels.length,new Set(labels).size);
 });
 await check('canonical and social metadata track routes and survive direct refresh',async()=>{
  for(const [name,suffix] of [['项目','/projects/'],['平台导航','/links/'],['小游戏','/games/'],['关于','/about/'],['作品','/works.html'],['首页','/']]){
   await nav(name);const canonical='https://shimingcode.github.io'+suffix;assert.equal(await p.locator('link[rel=canonical]').getAttribute('href'),canonical);assert.equal(await p.locator('meta[property="og:url"]').getAttribute('content'),canonical);
  }
  await p.goto(base+'/games/funny-hit/');await p.reload();await p.waitForSelector('#hit-button');assert.equal(await p.locator('link[rel=canonical]').getAttribute('href'),'https://shimingcode.github.io/games/funny-hit/');
  assert.equal((await p.request.get(base+'/sitemap.xml')).status(),200);assert.equal((await p.request.get(base+'/robots.txt')).status(),200);
 });
 await check('all pages fit phone tablet and desktop widths without horizontal scrolling',async()=>{
  for(const width of [320,430,768,1024,1280]){await p.setViewportSize({width,height:900});for(const name of ['首页','平台导航','项目','小游戏','关于','作品']){await nav(name);assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${width} ${name}`);}await p.goto(base+'/games/funny-hit/');assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${width} funny-hit`);}
 });
 if(!process.env.LIVE_URL)await check('project subpath navigation preserves styles images audio shell and routes',async()=>{
  await p.goto(base+'/preview/');await p.evaluate(()=>window.originalBgm=document.querySelector('#bgm'));
  for(const name of ['项目','作品','小游戏','关于','首页']){await nav(name);assert(new URL(p.url()).pathname.startsWith('/preview/'));assert(await p.evaluate(()=>originalBgm===document.querySelector('#bgm')));assert.equal(await p.locator('.site-header').evaluate(e=>getComputedStyle(e).display),'flex');}
 });
 await check('no uncaught errors or missing page resources',async()=>assert.deepEqual(errors,[]));
 fs.mkdirSync('test-results/site-quality',{recursive:true});fs.writeFileSync('test-results/site-quality/'+(process.env.LIVE_URL?'live':'browser')+'.json',JSON.stringify({checks,errors},null,2));
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{await browser?.close();server.close();});
