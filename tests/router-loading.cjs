const {chromium}=require('playwright'),assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
const server=require('./server.cjs')(path.resolve('_site'));let browser,release,timeout;
(async()=>{
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||'msedge'});
  const page=await browser.newPage(),errors=[],requests=[];
  page.on('pageerror',e=>errors.push(e.message));
  const base=process.env.LIVE_URL||`http://127.0.0.1:${server.address().port}`;
  await page.goto(base+'/games/');
  let ready;const allRequested=new Promise(r=>ready=r),gate=new Promise(r=>release=r);
  await page.route('**/games/funny-hit/*.js*',async route=>{
    requests.push(new URL(route.request().url()).pathname);
    if(requests.length===5)ready();
    await gate;await route.continue();
  });
  await page.getByRole('link',{name:'和狐狐玩一会儿 →'}).click();
  // With sequential fetching, the first held response prevents requests 2–5.
  await Promise.race([allRequested,new Promise((_,reject)=>timeout=setTimeout(()=>reject(Error('Game scripts were not requested concurrently')),6000))]);
  clearTimeout(timeout);release();
  await page.waitForSelector('#hit-button');
  assert.equal(new Set(requests).size,5);
  assert(await page.evaluate(()=>['GameState','VoiceManager','Effects'].every(k=>typeof FunnyHit[k]==='function')));
  await page.locator('#hit-button').click();await page.waitForFunction(()=>document.querySelector('#hit-count').textContent==='1 / 100');
  assert.deepEqual(errors,[]);
  fs.mkdirSync('test-results/hit-performance',{recursive:true});
  fs.writeFileSync('test-results/hit-performance/router'+(process.env.LIVE_URL?'-live':'')+'.json',JSON.stringify({requests,errors,concurrent:true},null,2));
  console.log('PASS five game scripts fetch concurrently and execute dependencies before mounting');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{clearTimeout(timeout);release?.();await browser?.close();server.close();});
