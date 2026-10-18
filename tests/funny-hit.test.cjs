const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
function setup(){
 let now=0,next=0;const timers=new Map(),audios=[];
 class Audio{
  constructor(){this.currentTime=0;this.volume=1;this.playbackRate=1;this.paused=true;this.plays=0;audios.push(this);}
  pause(){this.paused=true;}play(){this.plays++;this.paused=false;return Promise.resolve();}
  removeAttribute(){this.src='';}load(){}
 }
 const c={window:{Site:{url:p=>'/'+p}},Audio,document:{hidden:false},performance:{now:()=>now},setTimeout:fn=>{timers.set(++next,fn);return next;},clearTimeout:id=>timers.delete(id)};
 for(const f of ['dialogue','game-state','voice-manager'])vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../games/funny-hit',f+'.js'),'utf8'),c);
 return {F:c.window.FunnyHit,c,timers,audios,advance:ms=>now+=ms,flush(){const jobs=[...timers.values()];timers.clear();jobs.forEach(fn=>fn());}};
}
test('100 unique ordered reactions, ten exact stage boundaries, completion once',()=>{
 const {F}=setup(),g=new F.GameState(),stages=[],texts=[];assert.equal(F.DIALOGUES.length,100);assert.equal(new Set(F.DIALOGUES).size,100);
 for(let i=1;i<=100;i++){const r=g.hit();texts.push(r.text);assert.equal(r.hit,i);assert.equal(r.stage,Math.ceil(i/10));assert.equal(r.completed,i===100);if(r.stageChanged)stages.push(i);}
 assert.deepEqual(stages,[1,11,21,31,41,51,61,71,81,91]);assert.equal(new Set(texts).size,100);
 for(let i=0;i<10000;i++)assert.equal(g.hit(),null);assert.equal(g.totalHits,100);
 assert.equal(g.currentDialogue,'呜呜……狐狐彻底认输啦！恭喜你通关！不过……下次还要来陪狐狐玩哦！');
});
test('reset, phase remaining, combo expiration and legacy settings migration',()=>{
 const {F,advance}=setup(),g=new F.GameState({voiceSource:'system',voiceVolume:NaN,voiceEnabled:false});
 assert.equal(g.settings.voiceVolume,.65);assert.equal(g.settings.voiceEnabled,false);assert(!('voiceSource' in g.settings));
 for(let i=0;i<35;i++)g.hit();assert.equal(g.stage.number,4);assert.equal(g.remaining,5);
 advance(701);g.hit();assert.equal(g.comboCount,1);assert.equal(g.highestCombo,35);
 g.reset();assert.equal(g.totalHits,0);assert.equal(g.stage.number,1);assert.equal(g.highestCombo,0);assert(g.hit().stageChanged);
 assert.equal(F.settings({voiceVolume:3}).voiceVolume,1);assert.equal(F.settings({voiceVolume:-1}).voiceVolume,0);
});
test('existing PCM source and default volume remain unchanged',()=>{
 const {F}=setup(),b=fs.readFileSync(path.join(__dirname,'..',F.AUDIO_PATH));
 assert.equal(b.length,204956);assert.equal(b.toString('ascii',0,4),'RIFF');assert.equal(b.readUInt32LE(24),24000);assert.equal(F.AUDIO_VOLUME,.65);
});
test('one audio, same URL, restart from zero and no rate changes on 100 clicks',async()=>{
 const {F,audios,advance}=setup(),v=new F.VoiceManager({...F.defaults});
 for(let i=0;i<100;i++){assert(v.play());await new Promise(setImmediate);audios[0].currentTime=2;advance(160);}
 assert.equal(audios.length,1);assert.equal(audios[0].plays,100);assert.equal(audios[0].playbackRate,1);assert.equal(audios[0].volume,.65);
 v.play();assert.equal(audios[0].currentTime,0);assert(audios[0].src.endsWith(F.AUDIO_PATH));v.dispose();assert(audios[0].paused);
});
test('rapid input has a single trailing restart and no pending work after stop',()=>{
 const {F,audios,timers,advance,flush}=setup(),v=new F.VoiceManager({...F.defaults}),g=new F.GameState();
 for(let i=0;i<100;i++){assert(g.hit());v.play();}
 assert.equal(g.totalHits,100);assert.equal(audios[0].plays,1);assert.equal(timers.size,1);
 advance(150);flush();assert.equal(audios[0].plays,2);v.play();assert.equal(timers.size,1);
 v.stop();assert.equal(timers.size,0);assert(audios[0].paused);
});
test('mute, hidden and disposal block playback; volume applies live',()=>{
 const {F,c,audios,timers}=setup(),settings={...F.defaults},v=new F.VoiceManager(settings);
 settings.voiceEnabled=false;assert(!v.play());assert.equal(audios.length,0);settings.voiceEnabled=true;c.document.hidden=true;assert(!v.play());
 c.document.hidden=false;v.play();settings.voiceVolume=.2;v.setVolume();assert.equal(audios[0].volume,.2);
 v.dispose();assert.equal(v.audio,null);assert.equal(timers.size,0);assert(!v.play());assert.equal(audios[0].onerror,null);
});
test('play rejection degrades safely and stale promise cannot overwrite newer playback',async()=>{
 const {F,audios,advance}=setup(),statuses=[],v=new F.VoiceManager({...F.defaults},{status:t=>statuses.push(t)});v.play();await new Promise(setImmediate);
 let rejectOld;audios[0].play=()=>new Promise((_,reject)=>rejectOld=reject);advance(160);v.play();
 audios[0].play=()=>Promise.resolve();advance(160);v.play();await new Promise(setImmediate);rejectOld({name:'AbortError'});await new Promise(setImmediate);assert.equal(v.state,'PLAYING');
 audios[0].play=()=>Promise.reject({name:'NotAllowedError'});advance(160);v.play();await new Promise(setImmediate);assert.equal(v.state,'ERROR');assert(statuses.at(-1).includes('试听原声'));
});
test('audio never drives dialogue and no speech synthesis or extra sound context is used',()=>{
 for(const name of ['voice-manager','game']){
  const s=fs.readFileSync(path.join(__dirname,'../games/funny-hit',name+'.js'),'utf8');
  assert(!/speechSynthesis|SpeechSynthesisUtterance|new F.AudioManager|AudioContext/.test(s));
 }
});
test('rapid effect replacement releases cancelled callbacks and ownership',()=>{
 const {F,c}=setup();vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../games/funny-hit/effects.js'),'utf8'),c);
 const created=[],node={animate(){const a={cancel(){}};created.push(a);return a;}},e={photo:node,animations:new Map()};
 for(let i=0;i<1000;i++)F.Effects.prototype.animate.call(e,node,[],{});
 assert.equal(e.animations.size,1);assert(created.slice(0,-1).every(a=>a.onfinish===null&&a.oncancel===null));
 created.at(-1).onfinish();assert.equal(e.animations.size,0);
});

