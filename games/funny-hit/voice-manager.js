(() => {
  'use strict';
  const F = window.FunnyHit ||= {};
  // Temporary OS speech, not a recorded character voice. Never affects the CD Audio element.
  F.VoiceManager = class {
    constructor(settings, {caption=()=>{},finish=()=>{},status=()=>{}}={}) {
      this.settings=settings;this.caption=caption;this.finish=finish;this.status=status;
      this.synth=window.speechSynthesis;this.voice=null;this.current=null;this.last=-Infinity;this.priority=false;this.token=0;this.disposed=false;
      this.refresh=()=>{try{this.voice=this.synth?.getVoices().find(v=>/^zh(?:-|_)/i.test(v.lang)) || null;}catch{this.voice=null;}
        this.status(this.voice?'临时语音：系统中文合成音（非原创狐狐配音）':'当前没有可用中文音色，使用字幕互动');};
      this.synth?.addEventListener('voiceschanged',this.refresh);this.refresh();
    }
    get state() { return !this.settings.voiceEnabled?'MUTED':this.current?(this.priority?'PRIORITY':'PLAYING'):performance.now()-this.last<2000?'COOLDOWN':'IDLE'; }
    stop() {
      this.token++;clearTimeout(this.timer);
      if(this.current){this.current.onend=this.current.onerror=null;this.current=null;try{this.synth.cancel();}catch{}}
      this.priority=false;
    }
    say(text,{priority=false,final=false,ordinary=false}={}) {
      if(this.disposed || document.hidden)return false;
      // Do not replace the subtitle underneath an important line that is still speaking.
      if(!priority && this.current && this.priority)return false;
      if(ordinary && performance.now()-this.last<2000)return false;
      this.stop();this.caption(text);
      const token=this.token, started=performance.now(), hold=Math.max(2400,text.length*180);
      const end=()=>{
        if(token!==this.token||this.disposed)return;
        clearTimeout(this.timer);
        const remaining=hold-(performance.now()-started);
        if(remaining>0){this.timer=setTimeout(end,remaining);return;}
        this.stop();this.finish();
      };
      const allowed=this.settings.voiceEnabled && (this.settings.voiceMode==='active'||(this.settings.voiceMode==='standard'&&!ordinary)||final);
      this.timer=setTimeout(end,hold);
      if(!allowed || !this.voice || !this.synth || !window.SpeechSynthesisUtterance)return false;
      try {
        const utterance=new SpeechSynthesisUtterance(text);utterance.voice=this.voice;utterance.lang=this.voice.lang;
        utterance.rate=.88;utterance.pitch=1.12;utterance.volume=this.settings.voiceVolume;
        this.current=utterance;this.priority=priority;this.last=performance.now();
        utterance.onend=()=>{if(token!==this.token)return;this.current=null;this.priority=false;end();};
        utterance.onerror=()=>{if(token!==this.token)return;this.current=null;this.priority=false;this.status('临时语音暂不可用，字幕互动仍可继续');end();};
        clearTimeout(this.timer);this.timer=setTimeout(end,12000);this.synth.speak(utterance);return true;
      } catch {this.current=null;this.status('临时语音暂不可用，字幕互动仍可继续');return false;}
    }
    dispose() {this.stop();this.disposed=true;this.synth?.removeEventListener('voiceschanged',this.refresh);this.voice=null;}
  };
})();
