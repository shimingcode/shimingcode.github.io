(() => {
  'use strict';
  const F = window.FunnyHit ||= {};
  // Original, synthesized cartoon tones. A single context and four cached buffers per visit.
  F.AudioManager = class {
    constructor(settings) { this.settings=settings; this.context=null; this.buffers=new Map(); this.sources=new Set(); this.disposed=false; }
    unlock() {
      if(this.disposed || !this.settings.soundEnabled) return;
      try {
        if(!this.context) { const Context=window.AudioContext || window.webkitAudioContext; if(!Context)return; this.context=new Context(); this.gain=this.context.createGain(); this.gain.connect(this.context.destination); }
        this.gain.gain.value=this.settings.soundVolume;
        if(this.context.state==='suspended') this.context.resume().catch(()=>{});
      } catch { /* Sound is optional; game input always succeeds. */ }
    }
    buffer(kind) {
      if(this.buffers.has(kind)) return this.buffers.get(kind);
      const ctx=this.context, duration=kind==='celebrate'?.85:kind==='combo'?.3:.18;
      const buffer=ctx.createBuffer(1,Math.ceil(ctx.sampleRate*duration),ctx.sampleRate), data=buffer.getChannelData(0);
      let phase=0; const notes=[523.25,659.25,783.99,1046.5];
      for(let i=0;i<data.length;i++) {
        const t=i/ctx.sampleRate;
        const frequency=kind==='pop'?550*Math.exp(-t*12):kind==='boing'?260+110*Math.sin(t*32)*Math.exp(-t*10):notes[Math.min(3,Math.floor(t/(duration/4)))];
        phase+=2*Math.PI*frequency/ctx.sampleRate;
        data[i]=Math.sin(phase)*Math.min(1,t/.008)*Math.pow(1-t/duration,2)*.35;
      }
      this.buffers.set(kind,buffer); return buffer;
    }
    play(kind='pop') {
      if(this.disposed || document.hidden || !this.settings.soundEnabled) return false;
      this.unlock(); if(!this.context)return false;
      try {
        // Every click starts a sound; recycle the oldest voice instead of dropping input.
        while(this.sources.size>=4) { const oldest=this.sources.values().next().value; oldest.onended=null; oldest.stop(); oldest.disconnect(); this.sources.delete(oldest); }
        const source=this.context.createBufferSource(); source.buffer=this.buffer(kind); source.connect(this.gain);
        this.sources.add(source); source.onended=()=>{source.disconnect();this.sources.delete(source);}; source.start(); return true;
      } catch { return false; }
    }
    stop() { for(const source of this.sources){source.onended=null;try{source.stop();}catch{}source.disconnect();}this.sources.clear(); }
    hide() { this.stop(); this.context?.suspend().catch(()=>{}); }
    dispose() { this.disposed=true;this.stop();this.buffers.clear();this.context?.close().catch(()=>{});this.context=null; }
  };
})();
