// Optional development tool: install lighthouse@13.0.1, never bundled into the site.
const fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
const server=require('../tests/server.cjs')(path.resolve(process.argv[3]||'_site'));
(async()=>{
 const entry=fs.realpathSync(process.env.LIGHTHOUSE_PATH||require.resolve('lighthouse'));
 const {default:lighthouse}=await import(pathToFileURL(entry));
 const launcher=await import(pathToFileURL(require.resolve('chrome-launcher',{paths:[path.dirname(entry)]})));
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const chrome=await launcher.launch({chromePath:process.env.CHROME_PATH||'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',chromeFlags:['--headless=new','--disable-background-networking','--no-first-run']});
 try {
  const {lhr,report,artifacts}=await lighthouse(`http://127.0.0.1:${server.address().port}/`,{port:chrome.port,output:'html',logLevel:'error',onlyCategories:['performance','accessibility','best-practices','seo']});
  const out=path.resolve('test-results/performance');fs.mkdirSync(out,{recursive:true});const label=process.argv[2]||'after';
  fs.writeFileSync(path.join(out,`lighthouse-${label}.json`),JSON.stringify(lhr,null,2));fs.writeFileSync(path.join(out,`lighthouse-${label}.html`),report);
  fs.writeFileSync(path.join(out,`shifts-${label}.json`),JSON.stringify(artifacts.Trace?.traceEvents?.filter(e=>e.name==='LayoutShift')||[],null,2));
  console.log(JSON.stringify({scores:Object.fromEntries(Object.entries(lhr.categories).map(([k,v])=>[k,v.score*100])),metrics:Object.fromEntries(['largest-contentful-paint','first-contentful-paint','total-blocking-time','cumulative-layout-shift','speed-index'].map(k=>[k,lhr.audits[k].numericValue]))}));
 }finally{await chrome.kill();}
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>server.close());
