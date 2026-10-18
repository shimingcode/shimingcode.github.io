window.Site.register('funny-hit', () => {
  'use strict';
  const root=document.getElementById('funny-hit');if(!root)return;
  const F=window.FunnyHit,events=new AbortController(),options={signal:events.signal};
  let saved;try{saved=JSON.parse(window.Site.storage.get('funny-hit-settings','null'));}catch{}
  const game=new F.GameState(saved),settings=game.settings;
  const get=id=>root.querySelector('#'+id),photo=get('hit-photo'),hitButton=get('hit-button'),trigger=get('hit-trigger');
  const bubble=get('hit-dialogue'),count=get('hit-count'),combo=get('hit-combo'),progress=get('hit-progress'),complete=get('hit-complete');
  const stage=get('hit-stage-name'),remaining=get('hit-remaining'),notice=get('hit-stage-notice'),fill=get('hit-progress-fill');
  const effects=new F.Effects(get('hit-effects'),photo,settings);
  const voice=new F.VoiceManager(settings,{status:text=>get('voice-status').textContent=text});
  let renderFrame=0,stageAnimation=null,completionShown=false;
  function update(){
    cancelAnimationFrame(renderFrame);renderFrame=0;
    count.textContent=game.totalHits+' / '+F.MAX_HITS;
    combo.textContent=game.comboCount+' 连击 · 最高 '+game.highestCombo;
    progress.setAttribute('aria-valuenow',game.totalHits);
    fill.style.transform='scaleX('+(game.totalHits/F.MAX_HITS)+')';
    stage.textContent='第 '+game.stage.number+' 阶段 · '+game.stage.name;
    remaining.textContent=game.gameCompleted?'挑战完成！':game.totalHits>0&&game.totalHits%F.STAGE_SIZE===0?'下一次点击进入新阶段':game.stage.number===F.STAGES.length?'距离通关：'+(F.MAX_HITS-game.totalHits)+' 次':'距离阶段终点：'+game.remaining+' 次';
    hitButton.disabled=trigger.disabled=game.gameCompleted;
    if(game.gameCompleted&&!completionShown){completionShown=true;get('hit-final-line').textContent=game.currentDialogue;complete.showModal();}
  }
  function hit(){
    if(document.hidden)return;
    const result=game.hit();if(!result)return;
    // Every accepted hit has its own text, independent of delayed audio events.
    bubble.textContent=result.text;
    effects.burst(result);voice.play();
    if(result.stageChanged){
      notice.textContent=game.stage.notice;
      stageAnimation?.cancel();stageAnimation=null;
      if(!matchMedia('(prefers-reduced-motion: reduce)').matches)stageAnimation=notice.animate([{opacity:.3,transform:'translateY(4px)'},{opacity:1,transform:'translateY(0)'}],{duration:280});
    }
    if(!renderFrame)renderFrame=requestAnimationFrame(update);
  }
  function reset(){
    voice.stop();effects.stop();stageAnimation?.cancel();stageAnimation=null;
    if(complete.open)complete.close();
    game.reset();completionShown=false;bubble.textContent=game.currentDialogue;notice.textContent='每 10 次完成一个阶段，共 100 次。';
    update();hitButton.focus({preventScroll:true});
  }
  function syncSettings(){
    for(const input of root.querySelectorAll('[data-setting]')){
      const key=input.dataset.setting;
      if(input.type==='checkbox')input.checked=settings[key];else input.value=String(settings[key]);
      const output=input.parentElement.querySelector('output');if(output)output.value=Math.round(settings[key]*100)+'%';
    }
  }
  root.addEventListener('click',event=>{
    const action=event.target.closest('[data-hit-action]')?.dataset.hitAction;
    if(action==='hit')hit();
    if(action==='reset')reset();
    if(action==='preview')voice.play();
    if(action==='defaults'){
      voice.stop();effects.stop();Object.assign(settings,F.defaults);syncSettings();voice.setVolume();
      window.Site.storage.set('funny-hit-settings',JSON.stringify(settings));
      get('voice-status').textContent='已恢复默认：同一段原声，音量 65%，漫画与樱花特效开启。';
    }
    if(action==='dismiss'){complete.close();get('hit-stage-name').focus({preventScroll:true});}
  },options);
  syncSettings();
  root.addEventListener('input',event=>{
    const input=event.target,key=input.dataset.setting;if(!Object.hasOwn(F.defaults,key))return;
    settings[key]=input.type==='checkbox'?input.checked:Number(input.value);
    const output=input.parentElement.querySelector('output');if(output)output.value=Math.round(settings[key]*100)+'%';
    voice.setVolume();if(!settings.voiceEnabled)voice.stop();
    if(!settings.effectsEnabled||!settings.sakuraEnabled)effects.stop();
  },options);
  root.addEventListener('change',event=>{if(event.target.dataset.setting)window.Site.storage.set('funny-hit-settings',JSON.stringify(settings));},options);
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden){voice.stop();effects.stop();stageAnimation?.cancel();cancelAnimationFrame(renderFrame);renderFrame=0;}
    else update();
  },options);
  photo.addEventListener('error',()=>{get('photo-error').hidden=false;},options);
  update();
  return ()=>{cancelAnimationFrame(renderFrame);stageAnimation?.cancel();events.abort();voice.dispose();effects.dispose();if(complete.open)complete.close();};
});
