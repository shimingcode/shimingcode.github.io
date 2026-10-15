(() => {
  'use strict';
  const F = window.FunnyHit ||= {};
  F.defaults = Object.freeze({voiceMode:'standard',voiceEnabled:true,voiceVolume:.65,soundEnabled:true,soundVolume:.4,effectsEnabled:true,sakuraEnabled:true});
  F.settings = input => {
    const value = {...F.defaults};
    if (!input || typeof input !== 'object') return value;
    for (const key of ['voiceEnabled','soundEnabled','effectsEnabled','sakuraEnabled']) if(typeof input[key] === 'boolean') value[key] = input[key];
    for (const key of ['voiceVolume','soundVolume']) if(typeof input[key] === 'number' && Number.isFinite(input[key])) value[key] = Math.max(0,Math.min(1,input[key]));
    if(['quiet','standard','active'].includes(input.voiceMode)) value.voiceMode = input.voiceMode;
    return value;
  };
  F.GameState = class {
    constructor(settings, now = () => performance.now()) { this.settings = F.settings(settings); this.now = now; this.reset(); }
    get voiceMode() { return this.settings.voiceMode; }
    get voiceVolume() { return this.settings.voiceVolume; }
    get effectsEnabled() { return this.settings.effectsEnabled; }
    reset() { this.totalHits=0; this.comboCount=0; this.highestCombo=0; this.currentDialogue='轻轻点一下，和狐狐打个招呼吧～'; this.gameCompleted=false; this.freePlay=false; this.lastHit=-Infinity; }
    hit() {
      if(this.gameCompleted && !this.freePlay) return null;
      const now=this.now();
      this.comboCount = now-this.lastHit <= 700 ? this.comboCount+1 : 1;
      this.lastHit=now; this.highestCombo=Math.max(this.highestCombo,this.comboCount);
      if(!this.freePlay) this.totalHits++;
      const text = !this.freePlay ? F.dialogue.milestones[this.totalHits] : null;
      if(text) this.currentDialogue=text;
      const completed = !this.freePlay && this.totalHits === 20;
      if(completed) this.gameCompleted=true;
      return {text,completed,priority:!!text,combo:this.comboCount>=3,hit:this.totalHits,free:this.freePlay};
    }
    enterFreePlay() { if(this.gameCompleted) { this.freePlay=true; this.comboCount=0; this.lastHit=-Infinity; } }
  };
})();
