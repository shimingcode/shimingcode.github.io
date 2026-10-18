const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const server=require('./server.cjs')(path.resolve('_site'));let browser;const checks=[],errors=[],downloads=[];
async function check(name,fn){await fn();checks.push(name);console.log('PASS '+name);}
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||'msedge'});
 const p=await browser.newPage({viewport:{width:390,height:844}}),base=process.env.LIVE_URL||`http://127.0.0.1:${server.address().port}`;
 p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url());});p.on('request',r=>{if(r.url().includes('/voices/'))downloads.push(r.url());});
 await p.goto(base+'/games/funny-hit/');await p.waitForSelector('#hit-button');
 await check('original voice is default without fetching or playing before input',async()=>{assert.equal(await p.locator('[data-setting=voiceSource]').inputValue(),'original');assert.equal(downloads.length,0);});
 await p.evaluate(()=>{const Original=FunnyHit.VoiceManager;FunnyHit.VoiceManager=class extends Original{constructor(...args){super(...args);window.gameVoice=this;}};Site.mount();window.savedMusic=document.querySelector('#bgm');});
 await check('first hit plays the real denial clip with matching subtitles and 65% volume',async()=>{
  await p.locator('#hit-button').click();await p.waitForFunction(()=>gameVoice.current?.engine==='recording'&&gameVoice.audio.currentTime>0&&!gameVoice.audio.paused);
  assert.equal(await p.locator('#hit-dialogue').textContent(),'我才没有！');assert.equal(await p.evaluate(()=>gameVoice.audio.volume),.65);
  assert(Math.abs(await p.evaluate(()=>gameVoice.audio.duration)-4.269)<.05);await p.evaluate(()=>window.originalVoiceAudio=gameVoice.audio);
 });
 await p.locator('.hit-settings summary').click();
 await check('invitation preview decodes, ends naturally and reuses the same audio element',async()=>{
  await p.getByLabel('情绪试听',{exact:true}).selectOption('CUTE');await p.getByRole('button',{name:'试听所选情绪',exact:true}).click();
  await p.waitForFunction(()=>gameVoice.current?.src==='xiaosheng-invitation.wav'&&gameVoice.audio.currentTime>0&&!gameVoice.audio.paused);
  assert.equal(await p.locator('#hit-dialogue').textContent(),'看看可怜虫，一个人走路。要不要本小姐陪你？');assert(await p.evaluate(()=>gameVoice.audio===originalVoiceAudio));
  assert(Math.abs(await p.evaluate(()=>gameVoice.audio.duration)-6.5)<.05);await p.waitForFunction(()=>gameVoice.audio.ended,null,{timeout:12000});
 });
 await check('volume updates, replay is cached, mute keeps original subtitles',async()=>{
  await p.getByLabel('语音音量',{exact:true}).fill('0.25');await p.getByRole('button',{name:'试听所选情绪',exact:true}).click();await p.waitForFunction(()=>gameVoice.audio.currentTime>0&&!gameVoice.audio.paused);
  assert.equal(await p.evaluate(()=>gameVoice.audio.volume),.25);assert.equal(downloads.filter(u=>u.includes('invitation.wav')).length,1);
  await p.getByLabel('狐狐语音',{exact:true}).uncheck();assert(await p.evaluate(()=>gameVoice.audio.paused));await p.getByRole('button',{name:'语音试听',exact:true}).click();assert.equal(await p.locator('#hit-dialogue').textContent(),'我才没有！');
  await p.getByLabel('狐狐语音',{exact:true}).check();
 });
 await check('rapid unlimited hits keep a single voice, bounded queue, final priority and music',async()=>{
  await p.locator('.hit-settings summary').click();await p.locator('#hit-button').evaluate(b=>{for(let i=0;i<100;i++)b.click();});await p.waitForFunction(()=>document.querySelector('#hit-count').textContent==='101 次');
  assert(await p.evaluate(()=>gameVoice.audio===originalVoiceAudio&&gameVoice.queue.length<=7&&gameVoice.cache.size<=3));assert(await p.locator('#hit-complete').isVisible());
  assert(await p.evaluate(()=>savedMusic===document.querySelector('#bgm')&&!savedMusic.paused));
 });
 await check('system source is selectable and persists; defaults restore original',async()=>{
  await p.locator('.hit-settings summary').click();await p.getByLabel('语音来源',{exact:true}).selectOption('system');assert(await p.evaluate(()=>gameVoice.audio.paused));await p.reload();assert.equal(await p.locator('[data-setting=voiceSource]').inputValue(),'system');
  await p.locator('.hit-settings summary').click();await p.getByRole('button',{name:'恢复默认设置',exact:true}).click();assert.equal(await p.locator('[data-setting=voiceSource]').inputValue(),'original');assert.equal(await p.locator('[data-setting=voiceVolume]').inputValue(),'0.65');
 });
 await check('voice controls fit mobile and source credit is safe',async()=>{
  for(const width of [320,390,768]){await p.setViewportSize({width,height:900});assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
  const source=p.getByRole('link',{name:'查看原视频',exact:true});assert.equal(await source.getAttribute('rel'),'noopener noreferrer');assert.deepEqual(errors,[]);
 });
 fs.mkdirSync('test-results/douyin',{recursive:true});fs.writeFileSync(`test-results/douyin/${process.env.LIVE_URL?'live':'browser'}.json`,JSON.stringify({checks,errors,downloads},null,2));
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{await browser?.close();server.close();});
