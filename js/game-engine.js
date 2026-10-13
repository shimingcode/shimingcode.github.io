/* Pure O(n) shuffle + O(1) matching. Clock/random injection makes transitions testable. */
((root, factory) => {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.MemoryGame = api;
})(typeof window === 'object' ? window : globalThis, () => {
  'use strict';
  const faces = Object.freeze(['🌸','🦊','🌙','⭐','🍓','🎐','🍡','🎀','🌻','🍀','💎','🦋']);
  const difficulties = Object.freeze({ easy:4, normal:6, hard:8, expert:12 });
  function shuffle(input, random = Math.random) {
    const cards = input.slice();
    for (let i = cards.length - 1; i > 0; i--) {
      const value = random();
      if (!(value >= 0 && value < 1)) throw new RangeError('Random must return [0, 1).');
      const j = Math.floor(value * (i + 1)); [cards[i], cards[j]] = [cards[j], cards[i]];
    }
    return cards;
  }
  class Game {
    constructor({ difficulty='easy', now=()=>performance.now(), random=Math.random }={}) {
      this.now=now; this.random=random; this.version=0; this.reset(difficulty);
    }
    reset(difficulty=this.difficulty) {
      if (!Object.hasOwn(difficulties,difficulty)) throw new RangeError('Unknown difficulty');
      this.difficulty=difficulty; this.pairs=difficulties[difficulty]; this.version++;
      this.cards=shuffle(Array.from({length:this.pairs*2},(_,id)=>({id,imageId:id%this.pairs,face:faces[id%this.pairs],matched:false,open:false})),this.random);
      this.state='READY'; this.previous='READY'; this.open=[]; this.moves=0; this.matched=0; this.elapsed=0; this.started=0; this.remaining=0; this.deadline=0;
    }
    elapsedMs() { return this.elapsed + (this.state==='PLAYING'||this.state==='CHECKING' ? this.now()-this.started : 0); }
    flip(index) {
      if (!['READY','PLAYING'].includes(this.state)) return [];
      const card=this.cards[index]; if (!card||card.matched||card.open) return [];
      if (this.state==='READY') { this.state='PLAYING'; this.started=this.now(); }
      card.open=true; this.open.push(index);
      if (this.open.length===2) {
        this.moves++;
        const [a,b]=this.open;
        if (this.cards[a].imageId===this.cards[b].imageId) {
          this.cards[a].matched=this.cards[b].matched=true; this.matched++; this.open=[];
          if (this.matched===this.pairs) { this.elapsed=this.elapsedMs(); this.state='COMPLETED'; }
          return [a,b];
        }
        this.state='CHECKING'; this.remaining=850; this.deadline=this.now()+this.remaining;
      }
      return [index];
    }
    settle(version=this.version) {
      if (version!==this.version||this.state!=='CHECKING'||this.now()<this.deadline) return [];
      const changed=this.open; for(const index of changed) this.cards[index].open=false;
      this.open=[]; this.remaining=0; this.state='PLAYING'; return changed;
    }
    pause() {
      if (!['PLAYING','CHECKING'].includes(this.state)) return false;
      this.elapsed=this.elapsedMs(); this.previous=this.state;
      if(this.state==='CHECKING') this.remaining=Math.max(0,this.deadline-this.now());
      this.state='PAUSED'; return true;
    }
    resume() {
      if(this.state!=='PAUSED') return false;
      this.started=this.now(); this.state=this.previous;
      if(this.state==='CHECKING') this.deadline=this.now()+this.remaining;
      return true;
    }
    dispose() { this.version++; this.cards=[]; this.open=[]; this.state='PAUSED'; }
  }
  return Object.freeze({Game,shuffle,difficulties});
});
