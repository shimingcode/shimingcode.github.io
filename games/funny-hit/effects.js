(() => {
  'use strict';
  const F = window.FunnyHit ||= {};
  const photoFrames=[{transform:'translate(0) scale(1)'},{transform:'translate(3px,-2px) scale(1.015)'},{transform:'translate(-2px,1px)'},{transform:'translate(0) scale(1)'}];
  const speedFrames=[{opacity:.5,transform:'scale(.98)'},{opacity:0,transform:'scale(1.04)'}];
  F.Effects = class {
    constructor(layer,photo,settings) {
      this.layer=layer;this.photo=photo;this.settings=settings;this.motion=matchMedia('(prefers-reduced-motion: reduce)');this.animations=new Map();
      this.pool=Array.from({length:matchMedia('(max-width: 600px)').matches?12:20},()=>{const n=document.createElement('span');n.className='hit-particle';n.hidden=true;layer.append(n);return n;});
      this.speed=document.createElement('span');this.speed.className='hit-speed';this.speed.hidden=true;layer.append(this.speed);
      this.cursor=0;this.last=-Infinity;this.change=()=>this.stop();this.motion.addEventListener('change',this.change);
    }
    animate(node,frames,options) {
      // Direct ownership avoids querying browser animation state after style writes.
      const previous=this.animations.get(node);
      if(previous){previous.oncancel=previous.onfinish=null;previous.cancel();}
      if(node!==this.photo)node.hidden=false;
      const animation=node.animate(frames,options);this.animations.set(node,animation);
      const done=()=>{if(this.animations.get(node)!==animation)return;this.animations.delete(node);if(node!==this.photo)node.hidden=true;};animation.onfinish=done;animation.oncancel=done;
    }
    burst(result) {
      if(document.hidden || this.motion.matches)return;
      const now=performance.now();if(!result.priority && now-this.last<90)return;this.last=now;
      if(this.settings.effectsEnabled) this.animate(this.photo,photoFrames,{duration:260});
      if(this.settings.effectsEnabled && result.combo)this.animate(this.speed,speedFrames,{duration:300});
      const blossom=this.settings.sakuraEnabled && [5,12,15,20].includes(result.hit);
      if(!this.settings.effectsEnabled && !blossom)return;
      const count=blossom?this.pool.length:4;
      for(let i=0;i<count;i++) {
        const node=this.pool[this.cursor++%this.pool.length];
        node.textContent=blossom?(i%3?'❀':'♡'):i===0?(result.combo?'COMBO!':'BOOM!'):i===1?`+${10+Math.floor(Math.random()*90)}`:i===2?'★':'◎';
        node.style.left=`${25+Math.random()*50}%`;node.style.top=`${50+Math.random()*30}%`;
        this.animate(node,[{transform:'translate(0,0) scale(.6)',opacity:0},{opacity:1,offset:.2},{transform:`translate(${Math.random()*140-70}px,${-80-Math.random()*100}px) scale(1.2) rotate(${Math.random()*60-30}deg)`,opacity:0}],{duration:blossom?1200:650,easing:'ease-out'});
      }
    }
    stop() {for(const a of this.animations.values()){a.oncancel=a.onfinish=null;a.cancel();}this.animations.clear();this.pool.forEach(n=>n.hidden=true);this.speed.hidden=true;}
    dispose() {this.stop();this.motion.removeEventListener('change',this.change);this.layer.replaceChildren();this.pool=[];}
  };
})();
