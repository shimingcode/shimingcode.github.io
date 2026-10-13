// Laboratory measurements only. No telemetry is shipped to visitors.
const {chromium}=require('playwright'),path=require('node:path'),fs=require('node:fs');
const label=process.argv[2]||'after',root=path.resolve(process.argv[3]||'_site');
const server=require('../tests/server.cjs')(root);
const out=path.resolve('test-results/performance');fs.mkdirSync(out,{recursive:true});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`;
 const browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||'msedge',headless:true});
 const samples=[];
 try {for(let run=0;run<3;run++) {
  const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,reducedMotion:'no-preference'});
  await context.addInitScript(()=>{
   window.metrics={lcp:0,cls:0,longTasks:[],interactions:[]};let start=0,last=0,session=0;
   for(const type of ['largest-contentful-paint','layout-shift','longtask','event']) {
    try{new PerformanceObserver(list=>{for(const e of list.getEntries()) {
     if(type==='largest-contentful-paint')metrics.lcp=e.startTime;
     if(type==='layout-shift'&&!e.hadRecentInput){if(e.startTime-last>1000||e.startTime-start>5000){start=e.startTime;session=0;}session+=e.value;last=e.startTime;metrics.cls=Math.max(metrics.cls,session);}
     if(type==='longtask')metrics.longTasks.push({start:e.startTime,duration:e.duration});
     if(type==='event'&&e.interactionId)metrics.interactions.push(e.duration);
    }}).observe({type,buffered:true,...(type==='event'?{durationThreshold:16}:{})});}catch{}
   }
  });
  const page=await context.newPage(),cdp=await context.newCDPSession(page);
  await cdp.send('Performance.enable');await cdp.send('Network.enable');await cdp.send('Network.setCacheDisabled',{cacheDisabled:true});
  await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
  await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:80,downloadThroughput:200000,uploadThroughput:93750,connectionType:'cellular4g'});
  await page.goto(base+'/',{waitUntil:'networkidle'});await page.waitForTimeout(1000);
  const load=await page.evaluate(()=>{const n=performance.getEntriesByType('navigation')[0],r=performance.getEntriesByType('resource');return {lcpMs:metrics.lcp,fcpMs:performance.getEntriesByName('first-contentful-paint')[0]?.startTime,cls:metrics.cls,loadMs:n.loadEventEnd,longTaskCount:metrics.longTasks.length,observedBlockingMs:metrics.longTasks.reduce((s,t)=>s+Math.max(0,t.duration-50),0),resourceBytes:r.reduce((s,e)=>s+e.transferSize,0),imageBytes:r.filter(e=>/\.(avif|webp|jpg|svg)(\?|$)/.test(e.name)).reduce((s,e)=>s+e.transferSize,0),resources:r.map(e=>({url:new URL(e.name).pathname,bytes:e.transferSize}))};});
  const timings=Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(m=>[m.name,m.value]));load.scriptMs=timings.ScriptDuration*1000;load.taskMs=timings.TaskDuration*1000;
  const fps=await page.evaluate(()=>new Promise(resolve=>{let first,last,sum=0,frames=0,slow=0;function tick(t){if(first===undefined)first=t;if(last!==undefined){const dt=t-last;sum+=dt;frames++;if(dt>25)slow++;}last=t;if(t-first<2500)requestAnimationFrame(tick);else resolve({fps:frames*1000/sum,slowFrames:slow,frames});}requestAnimationFrame(tick);}));
  await cdp.send('HeapProfiler.collectGarbage');const before=await cdp.send('Memory.getDOMCounters');const heapBefore=(await cdp.send('Runtime.getHeapUsage')).usedSize;
  const routes=['项目','平台导航','关于','小游戏','作品','首页'];const navigation=[];
  for(let i=0;i<24;i++){const begin=performance.now();await page.locator('.main-nav').getByRole('link',{name:routes[i%6],exact:true}).click();await page.waitForFunction(()=>!document.getElementById('main').hasAttribute('aria-busy'));navigation.push(performance.now()-begin);}
  await page.locator('.main-nav').getByRole('link',{name:'小游戏',exact:true}).click();await page.waitForSelector('.memory-card');
  const latency=[];
  for(let i=0;i<6;i++){await page.locator('#game-restart').click();const elapsed=await page.evaluate(()=>new Promise(resolve=>{const t=performance.now();document.querySelector('.memory-card').click();requestAnimationFrame(()=>requestAnimationFrame(()=>resolve(performance.now()-t)));}));latency.push(elapsed);}
  await page.locator('.main-nav').getByRole('link',{name:'首页',exact:true}).click();await page.waitForSelector('.social-card');await page.waitForTimeout(1000);
  await cdp.send('HeapProfiler.collectGarbage');const after=await cdp.send('Memory.getDOMCounters');const heapAfter=(await cdp.send('Runtime.getHeapUsage')).usedSize;
  const interactions=await page.evaluate(()=>metrics.interactions);
  samples.push({run,...load,...fps,heapBefore,heapAfter,domBefore:before,domAfter:after,navigationMs:navigation,gameClickToTwoFramesMs:latency,eventTimingMaxMs:interactions.length?Math.max(...interactions):null});
  console.log(`${label} run ${run+1}: LCP ${load.lcpMs.toFixed(0)}ms, ${load.resourceBytes}B, ${fps.fps.toFixed(1)} FPS`);await context.close();
 }}finally{await browser.close();}
 fs.writeFileSync(path.join(out,label+'.json'),JSON.stringify({label,browser:'Edge',conditions:{viewport:'390x844 DPR2',cpuSlowdown:4,latencyMs:80,downloadBytesPerSec:200000,cache:'disabled',runs:3,INP:'No field data; Event Timing sample is not field INP',blocking:'Observed long-task blocking, not Lighthouse TBT'},samples},null,2));
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>server.close());
