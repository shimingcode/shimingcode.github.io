// Compare resource work and exercise failures against either source or built output.
const {chromium}=require('playwright'),assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
const root=path.resolve(process.argv[2]||'_site'),label=process.argv[3]||'after',verify=label!=='before';
const server=require('./server.cjs')(root);let browser;
const results={label,root,browser:null,conditions:'390x844; local no-store HTTP; new contexts; autoplay blocked fixture',checks:[]};
const check=(name,condition)=>{results.checks.push({name,passed:Boolean(condition)});if(verify)assert(condition,name);};
(async()=>{
  await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`;
  browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||'msedge'});results.browser=browser.version();
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  await context.addInitScript(()=>{
    const play=HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play=function(){return this.id==='bgm'?Promise.reject(new DOMException('Policy fixture','NotAllowedError')):play.call(this);};
  });
  const nav=async(page,name)=>{await page.locator('.main-nav').getByRole('link',{name,exact:true}).click();await page.waitForFunction(()=>!document.querySelector('#main').hasAttribute('aria-busy'));};
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/');
  const measure=()=>page.evaluate(()=>{
    const entries=performance.getEntriesByType('resource'),scripts=entries.filter(e=>/\.js(?:\?|$)/.test(e.name));
    return {requests:entries.length+1,scriptRequests:scripts.length,scriptBytes:scripts.reduce((sum,e)=>sum+e.encodedBodySize,0),scripts:scripts.map(e=>new URL(e.name).pathname)};
  });
  const home=await measure();await nav(page,'平台导航');await nav(page,'项目');await nav(page,'首页');
  const journey=await measure();results.resources={home,journey,extraScriptRequests:journey.scriptRequests-home.scriptRequests,extraScriptBytes:journey.scriptBytes-home.scriptBytes};
  check('Home, links and projects reuse the same loaded feature code',results.resources.extraScriptRequests===0);
  check('Home still renders all platform and project cards',await page.locator('.social-card').count()===11&&await page.locator('.project-card').count()>0);
  check('Normal navigation has no script errors',errors.length===0);

  const bundled=await page.evaluate(()=>Boolean(window.SITE_ROUTE_ASSETS));
  const failedScript=await context.newPage();let scriptAttempts=0;
  await failedScript.route(bundled?/\/js\/page-projects-[a-f0-9]+\.js/:/\/js\/projects\.js/,route=>++scriptAttempts===1?route.fulfill({status:503,body:'Initial script failure fixture'}):route.continue());
  await failedScript.goto(base+'/projects/');assert.equal(await failedScript.locator('.project-card').count(),0);
  await nav(failedScript,'关于');await nav(failedScript,'项目');
  results.scriptRecovery={attempts:scriptAttempts,cards:await failedScript.locator('.project-card').count()};
  check('A failed direct-entry script is retried on return',scriptAttempts===2&&results.scriptRecovery.cards===5);await failedScript.close();

  const failedStyle=await context.newPage();let styleAttempts=0;
  await failedStyle.route(/\/css\/games(?:-[a-f0-9]+)?\.css/,route=>++styleAttempts===1?route.fulfill({status:503,body:'Initial CSS failure fixture'}):route.continue());
  await failedStyle.goto(base+'/games/');await nav(failedStyle,'关于');await nav(failedStyle,'小游戏');
  results.styleRecovery={attempts:styleAttempts,loaded:await failedStyle.evaluate(()=>[...document.styleSheets].some(s=>/\/css\/games(?:-[a-f0-9]+)?\.css/.test(s.href||'')))};
  check('A failed direct-entry stylesheet is retried on return',styleAttempts===2&&results.styleRecovery.loaded);await failedStyle.close();

  if(verify&&bundled){
    const slow=await context.newPage();let requests=0;
    await slow.route(/\/js\/page-projects-[a-f0-9]+\.js/,async route=>{
      if(++requests===1)await new Promise(resolve=>setTimeout(resolve,13000));
      await route.continue();
    });
    await slow.goto(base+'/projects/');await nav(slow,'关于');await nav(slow,'项目');
    check('A late initial script success is cached after the loading deadline',requests===1&&await slow.locator('.project-card').count()===5);await slow.close();
  }
  if(verify){
    const noTracker=await context.newPage();
    await noTracker.route(/\/js\/theme-init(?:-[a-f0-9]+)?\.js/,route=>route.fulfill({status:503,body:'Early tracker failure fixture'}));
    await noTracker.goto(base+'/');await nav(noTracker,'关于');await nav(noTracker,'项目');
    check('Navigation still works when the early load tracker fails',await noTracker.locator('.project-card').count()===5);await noTracker.close();
  }

  const media=await context.newPage();let release,requested;const gate=new Promise(r=>release=r),started=new Promise(r=>requested=r);
  await media.addInitScript(()=>{
    localStorage.setItem('shiming:music-state',JSON.stringify({currentTime:0,volume:.25,isPlaying:false,muted:false}));
    const load=HTMLMediaElement.prototype.load,set=Storage.prototype.setItem;
    window.metadataLoads=0;window.musicWrites=0;
    HTMLMediaElement.prototype.load=function(){if(this.id==='bgm')metadataLoads++;return load.call(this);};
    Storage.prototype.setItem=function(key,value){if(key==='shiming:music-state')musicWrites++;return set.call(this,key,value);};
  });
  await media.route('**/bgm-web.mp3',async route=>{requested();await gate;await route.continue();});
  try {
    await media.goto(base+'/about/');
    await media.locator('.music-disclosure summary').click();await started;
    for(let i=0;i<3;i++){await media.locator('.music-disclosure summary').click();await media.locator('.music-disclosure summary').click();}
    results.metadataLoads=await media.evaluate(()=>metadataLoads);
    check('Reopening controls during a slow metadata load does not restart it',results.metadataLoads===1);
  } finally {release();}
  await media.waitForFunction(()=>document.getElementById('bgm').readyState>=1);
  results.repeatedSaves=await media.evaluate(()=>{SiteMusic.save();musicWrites=0;for(let i=0;i<10;i++)SiteMusic.save();return musicWrites;});
  check('Ten identical music saves perform no redundant storage writes',results.repeatedSaves===0);
  const changedSave=await media.evaluate(()=>{document.getElementById('bgm').volume=.5;SiteMusic.save();return JSON.parse(localStorage.getItem('shiming:music-state')).volume;});
  check('Changed music preferences are still persisted',changedSave===.5);
  const retrySave=await media.evaluate(()=>{
    const set=Storage.prototype.setItem;let attempts=0;
    Storage.prototype.setItem=function(key,value){if(key==='shiming:music-state'&&++attempts===1)throw new DOMException('Fixture','QuotaExceededError');return set.call(this,key,value);};
    document.getElementById('bgm').volume=.6;SiteMusic.save();SiteMusic.save();Storage.prototype.setItem=set;
    return {attempts,volume:JSON.parse(localStorage.getItem('shiming:music-state')).volume};
  });
  check('A failed music-state write can be retried',retrySave.attempts===2&&retrySave.volume===.6);await media.close();

  await page.goto(base+'/games/funny-hit/');
  await page.evaluate(()=>{const prepare=FunnyHit.VoiceManager.prototype.prepare;window.prepareCalls=0;FunnyHit.VoiceManager.prototype.prepare=function(){prepareCalls++;return prepare.call(this);};});
  await page.locator('#hit-button').focus();
  results.voicePrepareCalls=await page.evaluate(()=>{const button=document.getElementById('hit-button');for(let i=0;i<100;i++)button.dispatchEvent(new PointerEvent('pointermove',{bubbles:true}));return prepareCalls;});
  check('Successful voice warm-up removes its high-frequency listeners',results.voicePrepareCalls===1);
  await context.close();
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{
  fs.mkdirSync('test-results/efficiency',{recursive:true});fs.writeFileSync(`test-results/efficiency/${label}.json`,JSON.stringify(results,null,2));
  console.log(JSON.stringify(results,null,2));await browser?.close();server.close();
});
