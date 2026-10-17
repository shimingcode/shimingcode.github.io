/* CSS compositor particles: one reusable pool and one adaptive frame sampler. */
((root,factory)=>{const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.SakuraBudget=api;})(typeof window==='object'?window:globalThis,()=>{
  class Budget {
    constructor(min,max,initial){this.min=min;this.max=max;this.count=Math.max(min,Math.min(max,initial));this.bad=0;this.good=0;}
    sample(slowRatio){
      if(slowRatio>.15){this.bad++;this.good=0;}else if(slowRatio<.03){this.good++;this.bad=0;}else{this.good=this.bad=0;}
      if(this.bad>=2){this.count=Math.max(this.min,this.count-2);this.bad=0;}
      if(this.good>=5){this.count=Math.min(this.max,this.count+1);this.good=0;}
      return this.count;
    }
  }
  return {Budget};
});
if(typeof window==='object') (()=>{
  'use strict';
  if(window.SiteSakura)return;
  const layer=document.getElementById('sakura');if(!layer)return;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)'),mobile=matchMedia('(max-width: 599px)');
  const {storage,el}=window.Site,settings=window.SITE_CONFIG.sakura||{};
  let pool=[],budget=null,frame=0,timer=0,last=0,start=0,total=0,slow=0,fastest=16.67,disposed=false;
  const events=new AbortController(),options={signal:events.signal};
  function stop(){cancelAnimationFrame(frame);clearTimeout(timer);frame=timer=0;last=start=total=slow=0;fastest=16.67;}
  function release(){stop();layer.replaceChildren();pool=[];budget=null;}
  function apply(){
    while(pool.length<budget.count){const petal=el('i','petal');petal.style.cssText=`left:${Math.random()*100}%;--size:${7+Math.random()*8}px;--duration:${18+Math.random()*15}s;--delay:-${Math.random()*30}s;--drift:${Math.random()*140-70}px;--rotation:${180+Math.random()*360}deg`;pool.push(petal);layer.append(petal);}
    for(let i=0;i<pool.length;i++)pool[i].hidden=i>=budget.count;
    layer.dataset.particles=String(budget.count);
  }
  function tick(now){
    frame=0;if(document.hidden||!budget||disposed)return;
    if(last){const dt=now-last;if(dt>0&&dt<1000){fastest=Math.max(6,Math.min(fastest,dt));total++;if(dt>Math.max(12,fastest*1.7+2))slow++;}}
    last=now;if(!start)start=now;
    if(now-start>=2000){
      const old=budget.count;budget.sample(total?slow/total:0);if(old!==budget.count)apply();
      last=start=total=slow=0;fastest=16.67;
      // CSS keeps petals moving. Sample two seconds out of six instead of keeping
      // JavaScript awake every frame; recalibrate when the display refresh rate changes.
      timer=setTimeout(()=>{timer=0;if(!document.hidden&&budget&&!disposed)frame=requestAnimationFrame(tick);},4000);
      return;
    }
    frame=requestAnimationFrame(tick);
  }
  function sync(){
    if(disposed)return;
    const enabled=storage.get('sakura','on')!=='off'&&!reduced.matches;
    const cap=Number(mobile.matches?settings.mobile:settings.desktop);
    if(!enabled||cap===0){release();layer.dataset.particles='0';return;}
    const constrained=navigator.connection?.saveData||(navigator.hardwareConcurrency&&navigator.hardwareConcurrency<=4)||(navigator.deviceMemory&&navigator.deviceMemory<=4);
    // Device hints only set the starting budget. Measured frame intervals drive adjustment.
    const max=Math.max(1,Math.min(mobile.matches?24:48,Number.isFinite(cap)?cap:mobile.matches?9:18));
    if(!budget||budget.max!==max){budget=new window.SakuraBudget.Budget(Math.min(4,max),max,constrained?Math.min(8,max):max);apply();}
    stop();if(!document.hidden)frame=requestAnimationFrame(tick);
  }
  window.addEventListener('site-preferences',sync,options);mobile.addEventListener('change',sync,options);reduced.addEventListener('change',sync,options);
  document.addEventListener('visibilitychange',sync,options);
  window.addEventListener('pagehide',stop,options);window.addEventListener('pageshow',sync,options);
  window.SiteSakura=Object.freeze({get active(){return budget?.count||0;},get allocated(){return pool.length;},get running(){return Boolean(frame||timer);},dispose(){disposed=true;events.abort();release();}});
  sync();
})();
