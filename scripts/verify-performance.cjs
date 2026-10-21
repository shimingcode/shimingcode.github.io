// Keep browser suites sequential so they do not compete for CPU or media resources.
const {spawnSync}=require('node:child_process'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),out=path.join(root,'test-results/fullsite-verification');fs.mkdirSync(out,{recursive:true});
const suites=[['unit','--test','tests/static.test.mjs','tests/game.test.cjs','tests/funny-hit.test.cjs','tests/build.test.mjs'],
  ...['browser','site-quality','performance','music','music-gesture','funny-hit-browser','voice-browser','original-voice','router-loading','loading','efficiency','sections','compat'].map(name=>[name,`tests/${name}.cjs`]),
  ['source-loading','tests/loading.cjs','.'],['source-efficiency','tests/efficiency.cjs','.','source'],['source-sections','tests/sections.cjs','.']];
const results=[];
const selected=process.argv.slice(2);
let previous=[];
if(selected.length&&fs.existsSync(path.join(out,'results.json')))previous=JSON.parse(fs.readFileSync(path.join(out,'results.json'),'utf8')).results;
for(const [name,...args] of suites){
  if(selected.length&&!selected.includes(name))continue;
  const start=Date.now(),run=spawnSync(process.execPath,args,{cwd:root,encoding:'utf8',env:{...process.env,BROWSER_CHANNEL:process.env.BROWSER_CHANNEL||(process.platform==='win32'?'msedge':'chromium')},timeout:240000});
  fs.writeFileSync(path.join(out,`${name}.log`),(run.stdout||'')+(run.stderr||'')+(run.error?.stack||''));
  const result={name,passed:run.status===0,durationMs:Date.now()-start};results.push(result);
  console.log(`${result.passed?'PASS':'FAIL'} ${name} (${result.durationMs}ms)`);
  if(!result.passed)console.error((run.stderr||run.stdout||String(run.error)).slice(-3500));
}
const merged=[...previous.filter(r=>!results.some(current=>current.name===r.name)),...results];
fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({date:new Date().toISOString(),results:merged},null,2));
if(results.some(r=>!r.passed))process.exitCode=1;
