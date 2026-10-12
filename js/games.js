(() => {
  'use strict';
  const { el } = window.Site;
  const grid=document.getElementById('memory-grid');
  if (!grid) return;
  const score=document.getElementById('game-score'), message=document.getElementById('game-message');
  let open=[], matched=0, moves=0, busy=false, timer;
  function stats() { score.textContent=`${moves} 次尝试 · ${matched} / 4 对`; }
  function restart() {
    clearTimeout(timer); open=[]; matched=0; moves=0; busy=false;
    const faces=['🌸','🦊','🌙','⭐','🌸','🦊','🌙','⭐'];
    for(let i=faces.length-1;i>0;i--) { const j=Math.floor(Math.random()*(i+1)); [faces[i],faces[j]]=[faces[j],faces[i]]; }
    grid.replaceChildren();
    faces.forEach((face,i) => {
      const card=el('button','memory-card','✧');card.type='button';card.setAttribute('aria-label',`卡片 ${i+1}，未翻开`);card.setAttribute('aria-pressed','false');
      card.addEventListener('click', () => {
        if(busy || card.dataset.matched==='true' || open.some(x=>x.card===card)) return;
        card.textContent=face;card.setAttribute('aria-label',`卡片 ${i+1}：${face}`);card.setAttribute('aria-pressed','true');open.push({card,face,index:i});
        if(open.length<2) { message.textContent='再翻开一张，看看是不是一对。'; return; }
        moves++;stats();
        if(open[0].face===open[1].face) {
          open.forEach(x=>{ x.card.dataset.matched='true';x.card.setAttribute('aria-label',`卡片 ${x.index+1}：${x.face}，已配对`);x.card.setAttribute('aria-disabled','true'); });
          matched++;open=[];stats();message.textContent=matched===4?`全部找到啦！用了 ${moves} 次尝试，再来一局吧。`:'找到一对！继续加油。';
        } else {
          busy=true;message.textContent='记住它们的位置，再试一次。';
          timer=setTimeout(()=>{open.forEach(x=>{x.card.textContent='✧';x.card.setAttribute('aria-label',`卡片 ${x.index+1}，未翻开`);x.card.setAttribute('aria-pressed','false');});open=[];busy=false;},850);
        }
      });grid.append(card);
    });stats();message.textContent='翻开一张卡片，开始吧。';
  }
  document.getElementById('game-restart').addEventListener('click',restart);restart();
})();
