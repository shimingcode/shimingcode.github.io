const {test}=require('node:test'),assert=require('node:assert/strict');
const {Game,shuffle,difficulties}=require('../js/game-engine.js');
const {Budget}=require('../js/sakura.js');
function fixture(difficulty='easy'){let t=0;const game=new Game({difficulty,now:()=>t,random:()=>.999});return {game,advance:ms=>t+=ms};}
test('Fisher-Yates uses exactly n-1 random draws and preserves every ID without mutating input',()=>{const source=Array.from({length:24},(_,i)=>i);let calls=0;const result=shuffle(source,()=>{calls++;return .25;});assert.equal(calls,23);assert.deepEqual([...result].sort((a,b)=>a-b),source);assert.notDeepEqual(result,source);assert.throws(()=>shuffle([1,2],()=>1),RangeError);});
test('Deterministic Fisher-Yates choices can reach all six permutations of three cards',()=>{const choices=new Set();for(let i=0;i<3;i++)for(let j=0;j<2;j++){const values=[(i+.1)/3,(j+.1)/2];choices.add(shuffle([0,1,2],()=>values.shift()).join(''));}assert.equal(choices.size,6);});
for(const [difficulty,pairs] of Object.entries(difficulties))test(`${difficulty}: exact pair multiplicity, stable image IDs, completion once`,()=>{const {game,advance}=fixture(difficulty);assert.equal(game.cards.length,pairs*2);const ids=new Map();game.cards.forEach((c,i)=>{if(!ids.has(c.imageId))ids.set(c.imageId,[]);ids.get(c.imageId).push(i);});for(const [a,b] of ids.values()){assert.equal(game.cards[a].face,game.cards[b].face);game.flip(a);advance(100);game.flip(b);}assert.equal(game.state,'COMPLETED');assert.equal(game.matched,pairs);assert.deepEqual(game.flip(0),[]);const elapsed=game.elapsedMs();advance(1000);assert.equal(game.elapsedMs(),elapsed);});
test('Duplicate, invalid and matched clicks do not increase moves',()=>{const {game}=fixture();assert.deepEqual(game.flip(-1),[]);game.flip(0);assert.deepEqual(game.flip(0),[]);game.flip(4);assert.equal(game.matched,1);assert.deepEqual(game.flip(0),[]);assert.equal(game.moves,1);});
test('CHECKING rejects a third card and early/stale delayed resolution',()=>{const {game,advance}=fixture();game.flip(0);game.flip(1);assert.equal(game.state,'CHECKING');assert.deepEqual(game.flip(2),[]);assert.equal(game.open.length,2);advance(849);assert.deepEqual(game.settle(),[]);advance(1);assert.deepEqual(game.settle(),[0,1]);assert.equal(game.state,'PLAYING');});
test('Pause freezes elapsed time and remaining pair delay; resume uses the monotonic clock',()=>{const {game,advance}=fixture();game.flip(0);advance(1250);game.flip(1);advance(250);game.pause();assert.equal(game.state,'PAUSED');const elapsed=game.elapsedMs();advance(60000);assert.equal(game.elapsedMs(),elapsed);assert.deepEqual(game.flip(2),[]);assert.deepEqual(game.settle(),[]);game.resume();advance(599);assert.deepEqual(game.settle(),[]);advance(1);assert.deepEqual(game.settle(),[0,1]);assert.equal(game.elapsedMs(),2100);});
test('Restart invalidates old tasks, resets clock and returns READY',()=>{const {game,advance}=fixture();game.flip(0);game.flip(1);const version=game.version;game.reset('expert');advance(10000);assert.deepEqual(game.settle(version),[]);assert.equal(game.state,'READY');assert.equal(game.elapsedMs(),0);assert.equal(game.cards.length,24);game.dispose();assert.equal(game.cards.length,0);});
test('Adaptive particle budget has hysteresis and bounded gradual changes',()=>{const budget=new Budget(4,18,18);budget.sample(.5);assert.equal(budget.count,18);budget.sample(.5);assert.equal(budget.count,16);for(let i=0;i<100;i++)budget.sample(.5);assert.equal(budget.count,4);for(let i=0;i<4;i++)budget.sample(0);assert.equal(budget.count,4);budget.sample(0);assert.equal(budget.count,5);for(let i=0;i<100;i++)budget.sample(0);assert.equal(budget.count,18);});

test('sakura samples intermittently and clears both frame and timer on hide or disable',()=>{
 const vm=require('node:vm'),fs=require('node:fs'),frames=new Map(),timers=new Map(),hooks={},layer={dataset:{},append(){},replaceChildren(){}};
 let id=0,enabled=true;const media={matches:false,addEventListener(){}};
 const window={addEventListener(name,fn){hooks[name]=fn;},Site:{storage:{get:()=>enabled?'on':'off'},el:()=>({style:{}})},SITE_CONFIG:{sakura:{desktop:18,mobile:9}}};
 const document={hidden:false,getElementById:()=>layer,addEventListener(name,fn){hooks[name]=fn;}};
 const c={window,document,navigator:{hardwareConcurrency:8},matchMedia:()=>media,AbortController,requestAnimationFrame:fn=>{frames.set(++id,fn);return id;},cancelAnimationFrame:id=>frames.delete(id),setTimeout:(fn,ms)=>{timers.set(++id,{fn,ms});return id;},clearTimeout:id=>timers.delete(id)};
 vm.runInNewContext(fs.readFileSync(require.resolve('../js/sakura.js'),'utf8'),c);
 for(let t=1;t<=2011;t+=10){const [key,fn]=frames.entries().next().value||[];if(!fn)break;frames.delete(key);fn(t);}
 assert.equal(frames.size,0);assert.equal(timers.size,1);assert.equal([...timers.values()][0].ms,4000);assert(window.SiteSakura.running);assert.equal(window.SiteSakura.active,18);
 document.hidden=true;hooks.visibilitychange();assert.equal(frames.size+timers.size,0);assert(!window.SiteSakura.running);
 document.hidden=false;hooks.visibilitychange();assert.equal(frames.size,1);
 enabled=false;hooks['site-preferences']();assert.equal(frames.size+timers.size,0);assert.equal(window.SiteSakura.allocated,0);
 window.SiteSakura.dispose();assert(!window.SiteSakura.running);
});
