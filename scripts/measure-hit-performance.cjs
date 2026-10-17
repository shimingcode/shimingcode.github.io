// Local laboratory stress test. These samples are not field INP or Lighthouse scores.
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path');
const label=process.argv[2]||'after',root=path.resolve(process.argv[3]||'_site');
const server=require('../tests/server.cjs')(root),samples=[];let browser;
const metric=r=>Object.fromEntries(r.metrics.map(m=>[m.name,m.value]));
(async()=>{
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||'msedge'});
  for(let run=0;run<3;run++){
    const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,hasTouch:true});
    await context.addInitScript(()=>{
      localStorage.setItem('shiming:music-state',JSON.stringify({currentTime:0,volume:.25,isPlaying:false,muted:false}));
      localStorage.setItem('shiming:funny-hit-settings',JSON.stringify({voiceEnabled:false}));
      window.lab={animationQueries:0,longTasks:[]};
      const original=Element.prototype.getAnimations;
      Element.prototype.getAnimations=function(...args){lab.animationQueries++;return original.apply(this,args);};
      new PerformanceObserver(list=>lab.longTasks.push(...list.getEntries().map(e=>e.duration))).observe({type:'longtask',buffered:true});
    });
    const p=await context.newPage(),cdp=await context.newCDPSession(p);
    await cdp.send('Performance.enable');await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
    await p.goto(`http://127.0.0.1:${server.address().port}/games/funny-hit/`);
    await p.locator('#hit-photo').evaluate(i=>i.decode());
    await p.locator('#hit-button').click();
    await p.locator('#hit-button').evaluate(b=>{for(let i=0;i<19;i++)b.click();});
    await p.waitForTimeout(1400);
    const before=metric(await cdp.send('Performance.getMetrics'));
    const burst=await p.evaluate(async()=>{
      const b=document.querySelector('#hit-button'),score=document.querySelector('.hit-score');
      let mutations=0;const observer=new MutationObserver(r=>mutations+=r.length);observer.observe(score,{subtree:true,childList:true,characterData:true});
      lab.animationQueries=0;lab.longTasks=[];
      const start=performance.now();for(let i=0;i<1000;i++)b.click();const syncMs=performance.now()-start;
      await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
      observer.disconnect();return {syncMs,scoreMutations:mutations,animationQueries:lab.animationQueries,count:document.querySelector('#hit-count').textContent};
    });
    const after=metric(await cdp.send('Performance.getMetrics'));
    const paced=await p.evaluate(async()=>{
      lab.animationQueries=0;let start;const intervals=[];let previous;
      const tick=t=>{if(previous!==undefined)intervals.push(t-previous);previous=t;frame=requestAnimationFrame(tick);};let frame=requestAnimationFrame(tick);
      const b=document.querySelector('#hit-button');start=performance.now();
      for(let i=0;i<60;i++){b.click();await new Promise(r=>setTimeout(r,35));}
      cancelAnimationFrame(frame);intervals.sort((a,b)=>a-b);
      return {elapsedMs:performance.now()-start,animationQueries:lab.animationQueries,frameP95Ms:intervals[Math.floor(intervals.length*.95)]||null,longTasks:lab.longTasks.slice()};
    });
    await p.waitForTimeout(1400);await cdp.send('HeapProfiler.collectGarbage');
    const dom=await cdp.send('Memory.getDOMCounters'),heap=(await cdp.send('Runtime.getHeapUsage')).usedSize;
    samples.push({run,...burst,scriptMs:(after.ScriptDuration-before.ScriptDuration)*1000,layoutMs:(after.LayoutDuration-before.LayoutDuration)*1000,styleMs:(after.RecalcStyleDuration-before.RecalcStyleDuration)*1000,paced,heapBytes:heap,dom});
    console.log(`${label} ${run+1}: burst ${burst.syncMs.toFixed(1)}ms; score mutations ${burst.scoreMutations}; animation queries ${paced.animationQueries}`);
    await context.close();
  }
  fs.mkdirSync('test-results/hit-performance',{recursive:true});
  fs.writeFileSync(`test-results/hit-performance/${label}.json`,JSON.stringify({browser:await browser.version(),conditions:{viewport:'390x844 DPR2',cpuSlowdown:4,runs:3,warmupHits:20,burstHits:1000,pacedHits:60,intervalMs:35,voice:'muted',music:'paused',sound:'on',fieldINP:'not measured'},samples},null,2));
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{await browser?.close();server.close();});
