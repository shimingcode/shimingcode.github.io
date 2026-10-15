window.Site.register('funny-hit', () => {
  'use strict';
  const root=document.getElementById('funny-hit');if(!root)return;
  const F=window.FunnyHit,events=new AbortController(),options={signal:events.signal};
  let saved;try{saved=JSON.parse(window.Site.storage.get('funny-hit-settings','null'));}catch{}
  const game=new F.GameState(saved),settings=game.settings;
  const get=id=>root.querySelector(`#${id}`),photo=get('hit-photo'),trigger=get('hit-trigger'),hitButton=get('hit-button');
  const bubble=get('hit-dialogue'),count=get('hit-count'),combo=get('hit-combo'),progress=get('hit-progress'),complete=get('hit-complete');
  const effects=new F.Effects(get('hit-effects'),photo,settings),sound=new F.AudioManager(settings);
  const voice=new F.VoiceManager(settings,{caption:text=>{game.currentDialogue=text;bubble.textContent=text;bubble.classList.remove('faded');},finish:()=>bubble.classList.add('faded'),status:text=>get('voice-status').textContent=text});
  let lastRandom=-Infinity,previous='';
  function update() {
    count.textContent=game.freePlay?'自由互动':`${game.totalHits} / 20`;
    combo.textContent=`${game.comboCount} 连击 · 最高 ${game.highestCombo}`;progress.value=game.totalHits;
    trigger.disabled=hitButton.disabled=game.gameCompleted&&!game.freePlay;
    complete.hidden=!game.gameCompleted||game.freePlay;
  }
  function hit() {
    if(document.hidden)return;
    const result=game.hit();if(!result)return;
    sound.unlock();effects.burst(result);
    sound.play(result.completed||result.hit===15?'celebrate':result.combo?'combo':result.priority?'boing':'pop',result.completed);
    if(result.text) voice.say(result.text,{priority:true,final:result.completed});
    else if(performance.now()-lastRandom>=2000) {
      const group=game.freePlay?'final':game.totalHits<5?'normal':game.totalHits<12?'plead':'shy';
      const text=F.pickDialogue(group,previous);previous=text;lastRandom=performance.now();
      voice.say(text,{ordinary:true});
    }
    update();
    if(result.completed)get('hit-complete-title').focus({preventScroll:true});
  }
  function reset() {voice.stop();sound.stop();effects.stop();game.reset();previous='';lastRandom=-Infinity;bubble.textContent=game.currentDialogue;bubble.classList.remove('faded');update();hitButton.focus({preventScroll:true});}
  root.addEventListener('click',event=>{
    const action=event.target.closest('[data-hit-action]')?.dataset.hitAction;
    if(action==='hit')hit();
    if(action==='reset')reset();
    if(action==='free'){game.enterFreePlay();update();hitButton.focus({preventScroll:true});}
  },options);
  for(const input of root.querySelectorAll('[data-setting]')) {
    const key=input.dataset.setting;
    if(input.type==='checkbox')input.checked=settings[key];else input.value=String(settings[key]);
    const output=input.parentElement.querySelector('output');if(output)output.value=`${Math.round(settings[key]*100)}%`;
  }
  root.addEventListener('input',event=>{
    const input=event.target,key=input.dataset.setting;if(!Object.hasOwn(F.defaults,key))return;
    settings[key]=input.type==='checkbox'?input.checked:input.type==='range'?Number(input.value):input.value;
    const output=input.parentElement.querySelector('output');if(output)output.value=`${Math.round(settings[key]*100)}%`;
    if(!settings.voiceEnabled){voice.stop();bubble.classList.remove('faded');}
    if(!settings.soundEnabled)sound.stop();
    if(sound.gain)sound.gain.gain.value=settings.soundVolume;
    if(!settings.effectsEnabled||!settings.sakuraEnabled)effects.stop();
  },options);
  // Save once per completed control change, not for every range input event.
  root.addEventListener('change',event=>{if(event.target.dataset.setting)window.Site.storage.set('funny-hit-settings',JSON.stringify(settings));},options);
  document.addEventListener('visibilitychange',()=>{if(document.hidden){voice.stop();sound.hide();effects.stop();}},options);
  photo.addEventListener('error',()=>{get('photo-error').hidden=false;},options);
  update();
  return ()=>{events.abort();voice.dispose();sound.dispose();effects.dispose();};
});
