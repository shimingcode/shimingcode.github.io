const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const server=require('./server.cjs')(path.resolve(__dirname,'../_site')),out=path.resolve(__dirname,'../test-results/funny-hit-v2');
let browser;const checks=[],errors=[];async function check(name,fn){await fn();checks.push(name);console.log('PASS '+name);}
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=process.env.LIVE_URL||'http://127.0.0.1:'+server.address().port;
 browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||'msedge'});
 const ctx=await browser.newContext({viewport:{width:1280,height:1000}}),p=await ctx.newPage();
 p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url());});
 await p.addInitScript(()=>{
  const Original=window.Audio;window.gameAudios=[];
  window.Audio=function(...args){const a=new Original(...args);gameAudios.push(a);return a;};
  window.ttsCalls=0;if(window.speechSynthesis)speechSynthesis.speak=()=>ttsCalls++;
 });
 await p.goto(base+'/');await p.locator('h1').click();await p.waitForFunction(()=>!document.querySelector('#bgm').paused);
 await p.evaluate(()=>{window.firstBgm=document.querySelector('#bgm');window.resets=[];for(const n of ['pause','emptied','loadstart'])firstBgm.addEventListener(n,()=>resets.push(n));});
 await p.locator('.main-nav').getByRole('link',{name:'小游戏',exact:true}).click();await p.getByRole('link',{name:'和狐狐玩一会儿 →'}).click();
 await p.waitForSelector('#hit-button');
 await check('SPA photo, defaults and no game audio before gesture',async()=>{
  await p.locator('#hit-photo').evaluate(i=>i.decode());assert.equal(await p.locator('[data-setting=voiceVolume]').inputValue(),'0.65');
  assert.equal(await p.evaluate(()=>gameAudios.length),0);assert.equal(await p.locator('audio').count(),1);
 });
 await check('100 clicks display 100 unique ordered lines and ten accurate stages',async()=>{
  const lines=[];
  for(let i=1;i<=100;i++){
   await p.locator('#hit-button').click();
   await p.waitForFunction(n=>document.querySelector('#hit-count').textContent===n+' / 100',i);
   const result=await p.evaluate(n=>({text:document.querySelector('#hit-dialogue').textContent,expected:FunnyHit.DIALOGUES[n-1],stage:document.querySelector('#hit-stage-name').textContent,progress:document.querySelector('#hit-progress').getAttribute('aria-valuenow')}),i);
   assert.equal(result.text,result.expected);assert(result.stage.startsWith('第 '+Math.ceil(i/10)+' 阶段'));assert.equal(+result.progress,i);lines.push(result.text);
  }
  assert.equal(new Set(lines).size,100);assert(await p.locator('#hit-complete').isVisible());
  assert.equal(await p.locator('#hit-final-line').textContent(),lines[99]);assert(await p.locator('#hit-button').isDisabled());
 });
 await check('same real playable source, single audio, 65 percent volume and no synthesis',async()=>{
  await p.waitForFunction(()=>gameAudios.length===1&&gameAudios[0].currentTime>0);
  const a=await p.evaluate(()=>({src:gameAudios[0].src,volume:gameAudios[0].volume,rate:gameAudios[0].playbackRate,tts:ttsCalls,duration:gameAudios[0].duration}));
  assert(a.src.endsWith('/xiaosheng-denial.wav'));assert.equal(a.volume,.65);assert.equal(a.rate,1);assert.equal(a.tts,0);assert(a.duration>4&&a.duration<5);
 });
 await check('completion blocks more input and reset restores initial state',async()=>{
  await p.getByRole('button',{name:'查看本局',exact:true}).click();
  await p.evaluate(()=>{for(let i=0;i<500;i++)document.querySelector('#hit-button').click();});
  assert.equal(await p.locator('#hit-count').textContent(),'100 / 100');
  await p.locator('.hit-settings summary').click();await p.getByRole('button',{name:'重新开始本局',exact:true}).click();
  assert.equal(await p.locator('#hit-count').textContent(),'0 / 100');assert(await p.locator('#hit-button').isEnabled());
 });
 await check('rapid clicks count exactly, effects stay bounded, replay starts near zero',async()=>{
  await p.locator('#hit-button').click();await p.waitForFunction(()=>gameAudios[0].currentTime>.25);
  await p.locator('#hit-button').click();await p.waitForFunction(()=>gameAudios[0].currentTime<.2);
  await p.evaluate(()=>{for(let i=0;i<2000;i++)document.querySelector('#hit-button').click();});
  await p.waitForFunction(()=>document.querySelector('#hit-count').textContent==='100 / 100');
  assert.equal(await p.locator('.hit-particle').count(),20);assert.equal(await p.evaluate(()=>gameAudios.length),1);
  assert(await p.locator('#hit-effects').evaluate(e=>e.getAnimations({subtree:true}).length<=21));
  await p.getByRole('button',{name:'重新挑战',exact:true}).click();
 });
 await check('mute keeps dialogue, volume persists and defaults recover',async()=>{
  await p.getByLabel('点击原声',{exact:true}).uncheck();await p.getByLabel('原声音量',{exact:true}).fill('0.3');
  await p.locator('#hit-button').click();assert(await p.evaluate(()=>gameAudios[0].paused));
  assert.equal(await p.locator('#hit-dialogue').textContent(),await p.evaluate(()=>FunnyHit.DIALOGUES[0]));
  await p.getByRole('button',{name:'恢复默认设置',exact:true}).click();assert.equal(await p.locator('[data-setting=voiceVolume]').inputValue(),'0.65');
 });
 await check('hidden tab stops audio and owned effects without touching BGM',async()=>{
  await p.locator('#hit-button').click();
  await p.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
  assert(await p.evaluate(()=>gameAudios[0].paused));assert.equal(await p.locator('#hit-effects').evaluate(e=>e.getAnimations({subtree:true}).length),0);
  await p.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});
 });
 await check('section departure, retained game state and BGM continuity',async()=>{
  await p.locator('.hit-heading').getByRole('link',{name:'返回小游戏中心'}).click();await p.waitForSelector('#memory-grid');
  assert(await p.evaluate(()=>gameAudios[0].paused&&Boolean(gameAudios[0].getAttribute('src'))));
  assert(await p.evaluate(()=>firstBgm===document.querySelector('#bgm')&&!firstBgm.paused));assert.deepEqual(await p.evaluate(()=>resets),[]);
  await p.goBack();await p.waitForFunction(()=>location.hash==='#fox-game'&&!document.getElementById('main').hasAttribute('aria-busy'));assert.equal(await p.locator('#hit-count').textContent(),'2 / 100');
 });
 await check('reduced motion removes particle, shake and stage animations',async()=>{
  await p.emulateMedia({reducedMotion:'reduce'});await p.locator('#hit-button').click();
  assert.equal(await p.locator('#hit-effects').evaluate(e=>e.getAnimations({subtree:true}).length),0);
  assert.equal(await p.locator('#hit-photo').evaluate(e=>e.getAnimations().length),0);
  assert.equal(await p.locator('#hit-stage-notice').evaluate(e=>e.getAnimations().length),0);
 });
 await check('touch phone/tablet layouts and photo aspect ratio',async()=>{
  const c=await browser.newContext({hasTouch:true,isMobile:true}),m=await c.newPage();await m.goto(base+'/games/funny-hit/');
  for(const [width,height] of [[320,720],[390,844],[844,390],[768,1024],[1024,768]]){
   await m.setViewportSize({width,height});await m.locator('#hit-trigger').tap();
   assert(await m.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   assert(Math.abs(await m.locator('#hit-photo').evaluate(i=>i.clientWidth/i.clientHeight)-.75)<.005);
  }
  await m.waitForFunction(()=>document.querySelector('#hit-count').textContent==='5 / 100');
  fs.mkdirSync(out,{recursive:true});await m.setViewportSize({width:390,height:844});await m.screenshot({path:path.join(out,'mobile.png'),fullPage:true});await c.close();
 });
 await check('direct refresh and console/resources clean',async()=>{await p.reload();await p.waitForSelector('#hit-button');await p.locator('#hit-photo').evaluate(i=>i.decode());assert.deepEqual(errors,[]);});
 fs.mkdirSync(out,{recursive:true});await p.screenshot({path:path.join(out,'desktop.png'),fullPage:true});
 fs.writeFileSync(path.join(out,process.env.LIVE_URL?'live.json':'browser.json'),JSON.stringify({checks,errors},null,2));
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{await browser?.close();server.close();});
