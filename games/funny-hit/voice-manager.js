(() => {
  'use strict';
  const F=window.FunnyHit ||= {};
  F.VoiceManager=class {
    constructor(settings,{caption=()=>{},finish=()=>{},status=()=>{}}={}) {
      Object.assign(this,{settings,caption,finish,status});
      this.synth=window.speechSynthesis;this.voice=null;this.current=null;this.audio=null;
      this.queue=[];this.cache=new Map();this.failed=new Set();this.token=0;this.last=-Infinity;this.priority=false;this.disposed=false;
      this.refresh=()=>{try{const voices=this.synth?.getVoices()||[];this.voice=voices.find(v=>/^zh[-_](CN|Hans)/i.test(v.lang)&&v.localService)||voices.find(v=>/^zh[-_](CN|Hans)/i.test(v.lang))||voices.find(v=>/^zh/i.test(v.lang))||null;}catch{this.voice=null;}
        if(!this.current)this.describe();};
      this.synth?.addEventListener('voiceschanged',this.refresh);this.refresh();
    }
    describe() {this.status(this.voice?`临时系统语音：${this.voice.name || this.voice.lang}；不是预录狐狐音，情绪表现取决于设备。`:'没有可用中文系统音色；已配置的配音可播放，其余台词显示字幕。');}
    get state(){return !this.settings.voiceEnabled?'MUTED':this.current?(this.priority?'PRIORITY':'PLAYING'):performance.now()-this.last<2000?'COOLDOWN':'IDLE';}
    stop(clearQueue=true){
      this.token++;clearTimeout(this.timer);clearTimeout(this.captionTimer);
      if(this.current?.engine==='speech'){this.current.utterance.onstart=this.current.utterance.onend=this.current.utterance.onerror=null;try{this.synth.cancel();}catch{}}
      if(this.audio){this.audio.onended=this.audio.onerror=this.audio.onplaying=null;this.audio.pause();}
      this.current=null;this.priority=false;if(clearQueue)this.queue=[];
    }
    record(text){const r=F.recordings?.[text];return r&&r.license&&r.label&&typeof r.src==='string'&&/^[a-zA-Z0-9_-]+\.(wav|mp3|ogg|m4a)$/.test(r.src)?r:null;}
    preload(text){
      const record=this.record(text);if(!record||this.disposed||!this.settings.voiceEnabled||this.failed.has(record.src))return Promise.resolve(null);
      if(this.cache.has(record.src)){const entry=this.cache.get(record.src);this.cache.delete(record.src);this.cache.set(record.src,entry);return entry.promise;}
      // Three small files maximum, including the currently playing one. No bulk phrase loading.
      if(this.cache.size>=3){const old=[...this.cache.keys()].find(k=>k!==this.current?.src);if(!old)return Promise.resolve(null);this.release(old);}
      const entry={controller:new AbortController(),url:null};this.cache.set(record.src,entry);
      entry.timeout=setTimeout(()=>entry.controller.abort(),8000);
      entry.promise=(async()=>{try{
        const response=await fetch(window.Site.url('./assets/games/funny-hit/voices/'+record.src),{signal:entry.controller.signal});
        if(!response.ok||Number(response.headers.get('content-length'))>2000000)throw Error('Unavailable recording');
        const blob=await response.blob();if(blob.size>2000000||this.disposed||entry.controller.signal.aborted)return null;
        entry.url=URL.createObjectURL(blob);return entry.url;
      }catch{if(!entry.controller.signal.aborted)this.failed.add(record.src);return null;}finally{clearTimeout(entry.timeout);}})();return entry.promise;
    }
    release(key){const entry=this.cache.get(key);if(!entry)return;clearTimeout(entry.timeout);entry.controller.abort();if(entry.url)URL.revokeObjectURL(entry.url);this.cache.delete(key);}
    say(text,{priority=false,final=false,ordinary=false,preview=false,emotion='SHY'}={}){
      if(this.disposed||document.hidden)return false;
      const cue={text,priority,final,ordinary,preview,emotion};
      if(ordinary&&(performance.now()-this.last<2000||this.current))return false;
      // Important game lines are FIFO; the finale or an explicit preview supersedes stale lines.
      if(this.current && priority && !final && !preview && this.priority){
        if(!this.queue.some(c=>c.text===text)&&this.queue.length<7)this.queue.push(cue);
        return true;
      }
      if(this.current && !priority && !preview)return false;
      this.stop(final||preview||!priority);return this.start(cue);
    }
    start(cue){
      const {text,priority,final,ordinary,preview,emotion}=cue;
      const token=++this.token;this.priority=priority&&!preview;this.caption(text,emotion);this.started=performance.now();
      const allowed=this.settings.voiceEnabled&&(preview||final||this.settings.voiceMode==='active'||(this.settings.voiceMode==='standard'&&!ordinary));
      if(!allowed){this.captionOnly(token,text);return false;}
      this.last=performance.now();
      const record=this.record(text);
      if(record){
        this.current={engine:'loading',src:record.src};
        this.preload(text).then(url=>{if(token!==this.token||this.disposed||document.hidden)return;
          if(!url){this.speak(cue,token);return;}
          this.audio ||= new Audio();const a=this.audio;a.preload='auto';a.volume=this.settings.voiceVolume;
          // Rewind an already loaded recording without restarting media loading/decoding.
          if(a.src!==url)a.src=url;else a.currentTime=0;
          this.current={engine:'recording',src:record.src};
          a.onplaying=()=>{if(token===this.token){this.caption(text,emotion);this.status(`本地配音：${record.label}`);clearTimeout(this.timer);}};
          a.onended=()=>this.end(token,text);
          const failedRecording=()=>{if(token!==this.token||this.current?.engine!=='recording')return;this.failed.add(record.src);a.onended=a.onerror=a.onplaying=null;a.pause();a.removeAttribute('src');a.load();this.release(record.src);this.speak(cue,token);};
          a.onerror=failedRecording;
          this.timer=setTimeout(()=>{if(token===this.token){a.onended=a.onerror=a.onplaying=null;a.pause();this.status('配音加载超时，保留字幕。');this.end(token,text);}},10000);
          try{Promise.resolve(a.play()).catch(error=>{if(token!==this.token||this.current?.engine!=='recording')return;if(error?.name==='NotSupportedError'||a.error){failedRecording();return;}clearTimeout(this.timer);a.onended=a.onerror=a.onplaying=null;a.pause();this.status('配音播放受限，请再点击试听；本次保留字幕。');this.end(token,text);});}catch(error){if(error?.name==='NotSupportedError'||a.error)failedRecording();else this.end(token,text);}
        });return true;
      }
      return this.speak(cue,token);
    }
    speak(cue,token){
      if(token!==this.token||this.disposed)return false;
      this.current=null;clearTimeout(this.timer);
      const {text,emotion}=cue;
      if(!this.voice||!this.synth||!window.SpeechSynthesisUtterance){this.describe();this.captionOnly(token,text);return false;}
      const profile=F.emotions?.[emotion]||{rate:.93,pitch:1.04};
      try{
        const u=new SpeechSynthesisUtterance(text);u.voice=this.voice;u.lang=this.voice.lang;u.rate=profile.rate;u.pitch=profile.pitch;u.volume=this.settings.voiceVolume;
        this.current={engine:'speech',utterance:u};this.describe();
        u.onend=()=>this.end(token,text);u.onerror=()=>{if(token!==this.token)return;this.status('系统语音播放失败，字幕继续显示。');this.end(token,text);};
        // Only guard a stalled start. Do not cut off a healthy, long recording or utterance.
        u.onstart=()=>{if(token===this.token){clearTimeout(this.timer);this.caption(text,emotion);}};
        this.timer=setTimeout(()=>{if(token===this.token){this.status('系统语音未响应，保留字幕。');this.stop(false);this.captionOnly(this.token,text);}},12000);
        this.synth.speak(u);return true;
      }catch{this.current=null;this.status('系统语音不可用，保留字幕。');this.captionOnly(token,text);return false;}
    }
    end(token,text){
      if(token!==this.token||this.disposed)return;
      this.stop(false);
      if(this.queue.length){const next=this.queue.shift();this.start(next);return;}
      this.captionOnly(this.token,text,Math.max(700,2400-(performance.now()-this.started)));
    }
    captionOnly(token,text,delay=Math.max(2400,text.length*180)){
      clearTimeout(this.captionTimer);this.current=null;this.priority=false;
      this.captionTimer=setTimeout(()=>{if(token!==this.token||this.disposed)return;this.finish();if(this.queue.length)this.start(this.queue.shift());},delay);
    }
    setVolume(){if(this.audio)this.audio.volume=this.settings.voiceVolume;}
    dispose(){this.stop();this.disposed=true;this.synth?.removeEventListener('voiceschanged',this.refresh);if(this.audio){this.audio.removeAttribute('src');this.audio.load();this.audio=null;}for(const key of [...this.cache.keys()])this.release(key);this.failed.clear();this.voice=null;}
  };
})();
