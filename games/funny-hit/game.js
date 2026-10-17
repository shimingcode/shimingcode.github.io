window.Site.register('funny-hit', () => {
  'use strict';
  const root=document.getElementById('funny-hit');if(!root)return;
  const F=window.FunnyHit,events=new AbortController(),options={signal:events.signal};
  let saved;try{saved=JSON.parse(window.Site.storage.get('funny-hit-settings','null'));}catch{}
  const game=new F.GameState(saved),settings=game.settings;
  const get=id=>root.querySelector(`#${id}`),photo=get('hit-photo'),hitButton=get('hit-button');
  const bubble=get('hit-dialogue'),count=get('hit-count'),combo=get('hit-combo'),progress=get('hit-progress'),complete=get('hit-complete');
  const emotionLabel=get('voice-emotion'),voiceStatus=get('voice-status');
  const milestones=Object.keys(F.dialogue.milestones).map(Number);
  const effects=new F.Effects(get('hit-effects'),photo,settings),sound=new F.AudioManager(settings);
  const voice=new F.VoiceManager(settings,{caption:(text,emotion)=>{emotionLabel.textContent=F.emotions[emotion]?.label||'害羞';game.currentDialogue=text;bubble.textContent=text;bubble.classList.remove('faded');},finish:()=>bubble.classList.add('faded'),status:text=>voiceStatus.textContent=text});
  let lastRandom=-Infinity,previous='',celebrationDismissed=false,renderFrame=0,nextMilestone=0,preloaded=null;
  function update() {
    cancelAnimationFrame(renderFrame);renderFrame=0;
    count.textContent=`${game.totalHits} 次`;
    combo.textContent=`${game.comboCount} 连击 · 最高 ${game.highestCombo}`;
    const value=Math.min(20,game.totalHits),hidden=!game.gameCompleted||celebrationDismissed;
    if(progress.value!==value)progress.value=value;
    if(complete.hidden!==hidden)complete.hidden=hidden;
  }
  function scheduleUpdate(){if(!renderFrame)renderFrame=requestAnimationFrame(update);}
  function preloadNext(){
    while(nextMilestone<milestones.length&&milestones[nextMilestone]<=game.totalHits)nextMilestone++;
    const next=milestones[nextMilestone];
    if(next&&next!==preloaded&&settings.voiceEnabled&&settings.voiceMode!=='quiet'){
      preloaded=next;voice.preload(F.dialogue.milestones[next]);
    }
  }
  function hit() {
    if(document.hidden)return;
    const result=game.hit();if(!result)return;
    sound.play(result.completed||result.hit===15?'celebrate':result.combo?'combo':result.priority?'boing':'pop');
    effects.burst(result);
    if(result.text) voice.say(result.text,{priority:true,final:result.completed,emotion:F.nodeEmotions[result.hit]});
    else if(performance.now()-lastRandom>=2000) {
      const group=game.gameCompleted?'final':game.totalHits<5?'normal':game.totalHits<12?'plead':'shy';
      const text=F.pickDialogue(group,previous);previous=text;lastRandom=performance.now();
      voice.say(text,{ordinary:true,emotion:group==='plead'?'PLEADING':group==='final'?'HAPPY':'SHY'});
    }
    preloadNext();scheduleUpdate();
  }
  function reset() {voice.stop();sound.stop();effects.stop();game.reset();celebrationDismissed=false;previous='';lastRandom=-Infinity;nextMilestone=0;preloaded=null;bubble.textContent=game.currentDialogue;bubble.classList.remove('faded');update();hitButton.focus({preventScroll:true});}
  root.addEventListener('click',event=>{
    const action=event.target.closest('[data-hit-action]')?.dataset.hitAction;
    if(action==='hit')hit();
    if(action==='reset')reset();
    if(action==='preview'||action==='emotion-preview'){const emotion=action==='preview'?'SHY':get('voice-emotion-select').value;voice.say(F.emotions[emotion].lines[Math.floor(Math.random()*3)],{preview:true,priority:true,emotion});}
    if(action==='defaults'){voice.stop();sound.stop();effects.stop();Object.assign(settings,F.defaults);syncSettings();voice.setVolume();if(sound.gain)sound.gain.gain.value=settings.soundVolume;window.Site.storage.set('funny-hit-settings',JSON.stringify(settings));get('voice-status').textContent='已恢复默认：标准模式，语音 65%，音效 40%。';}
    if(action==='dismiss'){celebrationDismissed=true;update();hitButton.focus({preventScroll:true});}
  },options);
  function syncSettings(){for(const input of root.querySelectorAll('[data-setting]')) {
    const key=input.dataset.setting;
    if(input.type==='checkbox')input.checked=settings[key];else input.value=String(settings[key]);
    const output=input.parentElement.querySelector('output');if(output)output.value=`${Math.round(settings[key]*100)}%`;
  }
  }
  syncSettings();
  root.addEventListener('input',event=>{
    const input=event.target,key=input.dataset.setting;if(!Object.hasOwn(F.defaults,key))return;
    settings[key]=input.type==='checkbox'?input.checked:input.type==='range'?Number(input.value):input.value;
    const output=input.parentElement.querySelector('output');if(output)output.value=`${Math.round(settings[key]*100)}%`;
    voice.setVolume();
    if(key==='voiceMode')voice.stop();
    if(key==='voiceMode'||key==='voiceEnabled'){preloaded=null;preloadNext();}
    if(!settings.voiceEnabled){voice.stop();bubble.classList.remove('faded');}
    if(!settings.soundEnabled)sound.stop();
    if(sound.gain)sound.gain.gain.value=settings.soundVolume;
    if(!settings.effectsEnabled||!settings.sakuraEnabled)effects.stop();
  },options);
  // Save once per completed control change, not for every range input event.
  root.addEventListener('change',event=>{if(event.target.dataset.setting)window.Site.storage.set('funny-hit-settings',JSON.stringify(settings));},options);
  document.addEventListener('visibilitychange',()=>{if(document.hidden){voice.stop();sound.hide();effects.stop();if(renderFrame)update();}},options);
  photo.addEventListener('error',()=>{get('photo-error').hidden=false;},options);
  update();
  return ()=>{cancelAnimationFrame(renderFrame);events.abort();voice.dispose();sound.dispose();effects.dispose();};
});
