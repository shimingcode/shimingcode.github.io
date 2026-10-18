(() => {
  'use strict';
  const F=window.FunnyHit ||= {};
  F.defaults=Object.freeze({voiceEnabled:true,voiceVolume:F.AUDIO_VOLUME,effectsEnabled:true,sakuraEnabled:true});
  F.settings=input=>{
    const value={...F.defaults};
    if(!input||typeof input!=='object')return value;
    for(const key of ['voiceEnabled','effectsEnabled','sakuraEnabled'])if(typeof input[key]==='boolean')value[key]=input[key];
    if(typeof input.voiceVolume==='number'&&Number.isFinite(input.voiceVolume))value.voiceVolume=Math.max(0,Math.min(1,input.voiceVolume));
    return value;
  };
  F.GameState=class {
    constructor(settings,now=()=>performance.now()){this.settings=F.settings(settings);this.now=now;this.reset();}
    get stageIndex(){return Math.max(0,Math.ceil(this.totalHits/F.STAGE_SIZE)-1);}
    get stage(){return F.STAGES[this.stageIndex];}
    get remaining(){return this.gameCompleted?0:F.STAGE_SIZE-this.totalHits%F.STAGE_SIZE;}
    reset(){this.totalHits=0;this.comboCount=0;this.highestCombo=0;this.currentDialogue='轻轻点一下，和狐狐打个招呼吧～';this.gameCompleted=false;this.lastHit=-Infinity;}
    hit(){
      if(this.gameCompleted)return null;
      const now=this.now();this.comboCount=now-this.lastHit<=700?this.comboCount+1:1;
      this.lastHit=now;this.highestCombo=Math.max(this.highestCombo,this.comboCount);this.totalHits++;
      this.currentDialogue=F.DIALOGUES[this.totalHits-1];this.gameCompleted=this.totalHits===F.MAX_HITS;
      const stageChanged=(this.totalHits-1)%F.STAGE_SIZE===0;
      return {text:this.currentDialogue,completed:this.gameCompleted,stageChanged,stage:this.stage.number,priority:stageChanged||this.gameCompleted,combo:this.comboCount>=3,hit:this.totalHits};
    }
  };
})();
