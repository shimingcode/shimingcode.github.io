// Run against the production package, or `node tests/loading.cjs .` for branch publishing.
const {chromium}=require('playwright'),assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
const root=path.resolve(process.argv[2]||'_site'),server=require('./server.cjs')(root);
let browser;const checks=[],errors=[];
async function check(name,fn){await fn();checks.push(name);console.log('PASS '+name);}
(async()=>{
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||'msedge'});
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  await context.addInitScript(()=>{
    const Original=Audio;window.clips=[];
    window.Audio=function(){const audio=new Original();clips.push(audio);return audio;};
    const play=HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play=function(){return this.id==='bgm'?Promise.reject(new DOMException('Policy fixture','NotAllowedError')):play.call(this);};
  });
  const p=await context.newPage(),requests=[],base=`http://127.0.0.1:${server.address().port}`;
  p.on('request',r=>requests.push(r.url()));p.on('pageerror',e=>errors.push(e.message));
  await p.goto(base+'/');await p.waitForTimeout(250);
  await check('Blocked music and unopened games transfer no audio or game code on home',async()=>{
    assert(!requests.some(u=>/\.(?:mp3|wav)(?:\?|$)/.test(u)),requests.join('\n'));
    assert(!requests.some(u=>/page-(?:hit|games)-|game-engine|voice-manager/.test(u)));
    assert.equal(await p.evaluate(()=>clips.length),0);
  });
  const nav=async name=>{await p.locator('.main-nav').getByRole('link',{name,exact:true}).click();await p.waitForFunction(()=>!document.querySelector('#main').hasAttribute('aria-busy'));};
  await nav('小游戏');
  await check('Memory CSS and game initialize only on their route',async()=>{
    assert.equal(await p.locator('.memory-card').count(),8);
    assert.equal(requests.filter(u=>/\/css\/games(?:-[a-f0-9]+)?\.css(?:\?|$)/.test(u)).length,1);
  });
  await p.getByRole('link',{name:'和狐狐玩一会儿 →'}).click();await p.waitForSelector('#hit-button');
  await check('Focus warms only the existing recording; first click reuses it',async()=>{
    await p.locator('#hit-button').focus();await p.waitForFunction(()=>clips.length===1&&clips[0].readyState>=2);
    assert.equal(await p.evaluate(()=>clips[0].paused),true);
    assert.equal(await p.locator('#hit-count').textContent(),'0 / 100');
    await p.locator('#hit-button').tap();await p.waitForFunction(()=>clips[0].currentTime>0);
    assert.equal(await p.evaluate(()=>clips.length),1);
    assert.equal(await p.locator('#hit-count').textContent(),'1 / 100');
  });
  await check('Leaving the section stops playback while retaining the reusable clip',async()=>{
    await nav('首页');assert(await p.evaluate(()=>clips[0].paused&&clips[0].hasAttribute('src')));
    assert.deepEqual(errors,[]);
  });
  await check('A failed home module can retry without replacing the current document',async()=>{
    const bundled=await p.evaluate(()=>Boolean(window.SITE_ROUTE_ASSETS));
    const pattern=bundled?/\/js\/page-projects-[a-f0-9]+\.js/:/\/js\/projects(?:-data)?\.js/;
    // Use a fresh context: an already imported module would correctly bypass the network.
    const isolated=await browser.newContext(),tab=await isolated.newPage();
    await tab.goto(base+'/about/');
    let failures=0;await tab.route(pattern,r=>{if(!failures++){return r.fulfill({status:503,body:'Intentional offline fixture'});}return r.continue();});
    await tab.locator('.main-nav').getByRole('link',{name:'项目',exact:true}).click();
    await tab.waitForFunction(()=>!document.getElementById('main').hasAttribute('aria-busy'));
    await tab.locator('.main-nav').getByRole('link',{name:'项目',exact:true}).click();
    await tab.waitForURL(base+'/#projects');await tab.waitForSelector('.project-card');
    assert.equal(await tab.locator('.project-card').count(),5);
    assert(failures>=2,'A second navigation must retry the failed module');
    await isolated.close();
  });
  fs.mkdirSync('test-results/loading',{recursive:true});
  await check('A failed voice warm-up retries the same audio on an explicit tap',async()=>{
    const tab=await context.newPage();let attempts=0;
    await tab.route('**/xiaosheng-denial.wav',r=>++attempts===1?r.fulfill({status:503,body:'Intentional warm-up failure'}):r.continue());
    await tab.goto(base+'/games/funny-hit/');await tab.locator('#hit-button').focus();
    await tab.waitForFunction(()=>Boolean(clips[0]?.error));
    await tab.locator('#hit-button').tap();await tab.waitForFunction(()=>clips[0]?.currentTime>0);
    assert.equal(await tab.evaluate(()=>clips.length),1);assert(attempts>=2);
    assert.equal(await tab.locator('#hit-count').textContent(),'1 / 100');await tab.close();
  });
  fs.writeFileSync(`test-results/loading/${path.basename(root)==='_site'?'built':'source'}.json`,JSON.stringify({checks,errors},null,2));
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{await browser?.close();server.close();});
