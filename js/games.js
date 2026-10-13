window.Site.register('games', () => {
  'use strict';
  const grid=document.getElementById('memory-grid'); if(!grid) return;
  const {el}=window.Site, game=new window.MemoryGame.Game(), events=new AbortController(), options={signal:events.signal};
  const score=document.getElementById('game-score'),message=document.getElementById('game-message'),clock=document.getElementById('game-time');
  const pause=document.getElementById('game-pause'),difficulty=document.getElementById('game-difficulty');
  let cards=[],pairTimer=0,clockTimer=0,displaySecond=-1;
  function cancel() { clearTimeout(pairTimer);clearTimeout(clockTimer);pairTimer=clockTimer=0; }
  function tick() {
    clearTimeout(clockTimer);clockTimer=0;
    const second=Math.floor(game.elapsedMs()/1000);
    if(second!==displaySecond){clock.textContent=`${String(Math.floor(second/60)).padStart(2,'0')}:${String(second%60).padStart(2,'0')}`;displaySecond=second;}
    if(game.state==='PLAYING'||game.state==='CHECKING') clockTimer=setTimeout(tick,1000-game.elapsedMs()%1000+10);
  }
  function update(indices=[]) {
    for(const i of indices){const card=game.cards[i],button=cards[i];button.dataset.open=String(card.open);button.dataset.matched=String(card.matched);button.setAttribute('aria-pressed',String(card.open));button.setAttribute('aria-disabled',String(card.matched));button.setAttribute('aria-label',`卡片 ${i+1}${card.open?`：${card.face}${card.matched?'，已配对':''}`:'，未翻开'}`);}
    grid.dataset.state=game.state;score.textContent=`${game.moves} 次尝试 · ${game.matched} / ${game.pairs} 对`;
    pause.disabled=['READY','COMPLETED'].includes(game.state);pause.textContent=game.state==='PAUSED'?'继续游戏':'暂停游戏';
    const texts={READY:'翻开一张卡片，开始吧。',PLAYING:game.open.length?'再翻开一张，看看是不是一对。':'找到一对或再试一次，继续加油。',CHECKING:'记住它们的位置，再试一次。',PAUSED:'游戏已暂停，计时与配对等待均已停止。',COMPLETED:`全部找到啦！用了 ${game.moves} 次尝试，再来一局吧。`};
    message.textContent=texts[game.state];tick();
  }
  function schedulePair() {
    clearTimeout(pairTimer);pairTimer=0;
    if(game.state!=='CHECKING')return;
    const version=game.version;
    pairTimer=setTimeout(()=>{pairTimer=0;const changed=game.settle(version);if(changed.length)update(changed);else if(game.state==='CHECKING')schedulePair();},Math.max(0,game.deadline-performance.now())+1);
  }
  function restart() {
    cancel();game.reset(difficulty.value);displaySecond=-1;
    const fragment=document.createDocumentFragment();cards=game.cards.map((card,i)=>{
      const button=el('button','memory-card');button.type='button';button.dataset.index=String(i);
      const inner=el('span','memory-inner'),back=el('span','memory-back','✧'),front=el('span','memory-front',card.face);
      inner.setAttribute('aria-hidden','true');inner.append(back,front);button.append(inner);fragment.append(button);return button;
    });grid.replaceChildren(fragment);update(cards.map((_,i)=>i));
  }
  grid.addEventListener('click',event=>{
    const card=event.target.closest('.memory-card');if(!card||!grid.contains(card))return;
    const changed=game.flip(Number(card.dataset.index));if(!changed.length)return;
    update(changed);schedulePair();
  },options);
  pause.addEventListener('click',()=>{cancel();if(game.state==='PAUSED')game.resume();else game.pause();update();schedulePair();},options);
  difficulty.addEventListener('change',restart,options);
  document.getElementById('game-restart').addEventListener('click',restart,options);
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&game.pause()){cancel();update();}},options);
  restart();
  return ()=>{events.abort();cancel();game.dispose();cards=[];};
});
