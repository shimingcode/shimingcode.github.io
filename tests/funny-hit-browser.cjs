const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const server=require('./server.cjs')(path.resolve(__dirname,'../_site')),out=path.resolve(__dirname,'../test-results/funny-hit');fs.mkdirSync(out,{recursive:true});
let browser;const checks=[],errors=[];let rapidClickMs=0;async function check(name,fn){await fn();checks.push(name);console.log('PASS '+name);}async function countIs(page,text){await page.waitForFunction(text=>document.querySelector('#hit-count').textContent===text,text);}
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=process.env.LIVE_URL||`http://127.0.0.1:${server.address().port}`;
browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||'msedge'});const ctx=await browser.newContext({viewport:{width:1280,height:1000}}),p=await ctx.newPage();
p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url());});
await p.goto(base+'/');await p.locator('h1').click();await p.waitForFunction(()=>!document.querySelector('#bgm').paused);await p.evaluate(()=>{window.firstBgm=document.querySelector('#bgm');window.audioResets=[];for(const name of ['pause','loadstart','emptied'])firstBgm.addEventListener(name,()=>audioResets.push(name));});
await p.locator('.main-nav').getByRole('link',{name:'小游戏',exact:true}).click();await p.getByRole('link',{name:'和狐狐玩一会儿 →'}).click();await p.waitForSelector('#hit-button');
await check('SPA entry, original photograph decodes and one persistent music instance',async()=>{await p.locator('#hit-photo').evaluate(img=>img.decode());assert.equal(await p.locator('audio').count(),1);assert(await p.evaluate(()=>firstBgm===document.querySelector('#bgm')&&!firstBgm.paused));assert(await p.locator('#hit-photo').evaluate(i=>i.naturalWidth>0));});
await check('default standard voice 65%, effects 40%, both visual effects enabled',async()=>{assert.equal(await p.locator('[data-setting=voiceMode]').inputValue(),'standard');assert.equal(await p.locator('[data-setting=voiceVolume]').inputValue(),'0.65');assert.equal(await p.locator('[data-setting=soundVolume]').inputValue(),'0.4');for(const key of ['voiceEnabled','soundEnabled','effectsEnabled','sakuraEnabled'])assert(await p.locator(`[data-setting=${key}]`).isChecked());});
// Monitor lifecycle ownership without changing browser audio behavior.
await p.evaluate(()=>{const F=FunnyHit;window.managers={voices:[],sounds:[],effects:[]};for(const [key,name] of [['voices','VoiceManager'],['sounds','AudioManager'],['effects','Effects']]){const Original=F[name];F[name]=class extends Original{constructor(...args){super(...args);managers[key].push(this);}};}Site.mount();});
await check('20 clicks, muted voice subtitles, bounded effects and unlocked celebration',async()=>{await p.locator('.hit-settings summary').click();await p.getByLabel('语音来源',{exact:true}).selectOption('system');await p.getByLabel('狐狐语音',{exact:true}).uncheck();await p.locator('.hit-settings summary').click();const expected={1:'呀！吓我一跳～',3:'等、等一下嘛～',5:'呜呜，饶了狐狐嘛～',8:'哼，狐狐才没有认输呢！',12:'再、再陪狐狐玩一下嘛～',15:'嘿嘿，你好厉害呀～',20:'好啦好啦，狐狐投降啦～'};for(let i=1;i<=20;i++){await p.locator('#hit-button').click();await countIs(p,`${i} 次`);if(expected[i])assert.equal(await p.locator('#hit-dialogue').textContent(),expected[i]);}assert(await p.locator('#hit-complete').isVisible());assert(await p.locator('#hit-trigger').isEnabled());assert(await p.locator('#hit-button').isEnabled());assert(await p.locator('#hit-button').evaluate(b=>b===document.activeElement));assert.equal(await p.locator('.hit-particle').count(),20);assert(await p.evaluate(()=>managers.sounds[0].sources.size<=4));await p.screenshot({path:path.join(out,'desktop-complete.png'),fullPage:true});});
await check('automatically continues beyond 20; every rapid click starts sound with bounded resources',async()=>{
  const result=await p.locator('#hit-button').evaluate(async b=>{
    let writes=0;const observer=new MutationObserver(records=>writes+=records.length);observer.observe(document.querySelector('.hit-score'),{subtree:true,childList:true,characterData:true});
    const ctx=managers.sounds[0].context,original=ctx.createBufferSource.bind(ctx);let starts=0;
    ctx.createBufferSource=()=>{const source=original(),start=source.start.bind(source);source.start=(...args)=>{starts++;return start(...args);};return source;};
    const start=performance.now();for(let i=0;i<200;i++)b.click();ctx.createBufferSource=original;
    const ms=performance.now()-start,sources=managers.sounds[0].sources.size,animations=managers.effects[0].animations.size;
    await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));observer.disconnect();
    return {ms,starts,sources,animations,writes};
  });
  rapidClickMs=result.ms;assert.equal(result.starts,200);assert(result.sources<=4);assert(result.animations<=22);assert.equal(result.writes,2);
  await countIs(p,'220 次');
  assert.equal(await p.locator('#hit-progress').getAttribute('value'),'20');
  await p.getByRole('button',{name:'收起彩蛋',exact:true}).click();
  await p.locator('#hit-trigger').click();await countIs(p,'221 次');
  assert(await p.locator('#hit-complete').isHidden());assert.equal(await p.locator('.hit-particle').count(),20);
  assert(await p.evaluate(()=>managers.effects[0].animations.size<=22));
});
await check('settings persistence, mute keeps subtitles, sound gain update and reset',async()=>{await p.locator('.hit-settings summary').click();await p.getByLabel('狐狐语音',{exact:true}).uncheck();await p.getByLabel('游戏音效',{exact:true}).uncheck();await p.getByLabel('语音音量',{exact:true}).fill('0.3');await p.getByLabel('音效音量',{exact:true}).fill('0.2');assert.equal(await p.evaluate(()=>managers.sounds[0].gain.gain.value),Math.fround(.2));await p.getByRole('button',{name:'重新开始本局',exact:true}).click();await countIs(p,'0 次');await p.locator('#hit-trigger').click();assert.equal(await p.locator('#hit-dialogue').textContent(),'呀！吓我一跳～');assert.equal(await p.evaluate(()=>managers.voices[0].state),'MUTED');assert.equal(await p.evaluate(()=>managers.sounds[0].sources.size),0);});
await check('hidden page stops owned audio and animation',async()=>{await p.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));});assert(await p.evaluate(()=>managers.voices[0].current===null&&managers.sounds[0].sources.size===0&&managers.effects[0].animations.size===0));await p.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});});
await check('route exit releases context, speech and visual objects, music continues',async()=>{await p.locator('.hit-heading').getByRole('link',{name:'返回小游戏中心'}).click();await p.waitForSelector('#memory-grid');assert(await p.evaluate(()=>managers.voices.every(m=>m.disposed)&&managers.sounds.every(m=>m.disposed&&m.context===null&&m.sources.size===0)&&managers.effects.every(m=>m.pool.length===0&&m.animations.size===0)));assert(await p.evaluate(()=>firstBgm===document.querySelector('#bgm')&&!firstBgm.paused));assert.deepEqual(await p.evaluate(()=>audioResets),[]);await p.goBack();await p.waitForSelector('#hit-button');assert.equal(await p.locator('[data-setting=voiceVolume]').inputValue(),'0.3');assert.equal(await p.locator('[data-setting=soundVolume]').inputValue(),'0.2');await countIs(p,'0 次');});
await check('reload and nested static paths work',async()=>{await p.reload();await p.waitForSelector('#hit-button');await p.locator('#hit-photo').evaluate(i=>i.decode());assert.equal(await p.locator('audio').count(),1);});
await check('touch phone and tablet portrait/landscape, no cropped photo or overflow',async()=>{const mobile=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true}),m=await mobile.newPage();await m.goto(base+'/games/funny-hit/');for(const [width,height] of [[390,844],[844,390],[768,1024],[1024,768]]){await m.setViewportSize({width,height});await m.locator('#hit-trigger').tap();assert(await m.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));const ratio=await m.locator('#hit-photo').evaluate(i=>i.clientWidth/i.clientHeight);assert(Math.abs(ratio-1086/1448)<.005);}await countIs(m,'4 次');await m.setViewportSize({width:390,height:844});await m.screenshot({path:path.join(out,'mobile.png'),fullPage:true});await mobile.close();});
await check('reduced motion skips particles and photoshake',async()=>{await p.emulateMedia({reducedMotion:'reduce'});await p.locator('#hit-button').click();assert.equal(await p.locator('.hit-particle:not([hidden])').count(),0);assert.equal(await p.locator('#hit-photo').evaluate(i=>i.getAnimations().length),0);});
await check('leaving before a scheduled render cancels stale score writes',async()=>{
  const writes=await p.evaluate(async()=>{
    let writes=0;const observer=new MutationObserver(r=>writes+=r.length);
    observer.observe(document.querySelector('.hit-score'),{subtree:true,childList:true,characterData:true});
    document.querySelector('#hit-button').click();Site.unmount();
    await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));observer.disconnect();Site.mount();return writes;
  });assert.equal(writes,0);await countIs(p,'0 次');
});
await check('no page errors or missing resources',async()=>assert.deepEqual(errors,[]));
fs.writeFileSync(path.join(out,process.env.LIVE_URL?'live.json':'browser.json'),JSON.stringify({checks,errors,rapidClickMs},null,2));
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{await browser?.close();server.close();});

