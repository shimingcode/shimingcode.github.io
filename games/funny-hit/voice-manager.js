(() => {
  'use strict';
  const F=window.FunnyHit ||= {};
  F.VoiceManager=class {
    constructor(settings,{status=()=>{}}={}){
      this.settings=settings;this.status=status;this.audio=null;this.disposed=false;
      this.lastRestart=-Infinity;this.restartTimer=0;this.token=0;this.state='IDLE';
    }
    prepare(){
      if(this.disposed||document.hidden||!this.settings.voiceEnabled)return null;
      if(!this.audio){
        this.audio=new Audio();this.audio.preload='auto';this.audio.src=window.Site.url(F.AUDIO_PATH);
        this.audio.onended=()=>{this.state='IDLE';this.status('原声播放完毕，点击可再次播放。');};
        this.audio.onerror=()=>{this.state='ERROR';this.status('原声暂时无法加载，文字和特效仍可正常互动。');};
      }
      return this.audio;
    }
    // Keep initial play synchronous with the user's gesture (especially Safari).
    play(){
      if(this.disposed||document.hidden)return false;
      if(!this.settings.voiceEnabled){this.stop();this.state='MUTED';return false;}
      const delay=150-(performance.now()-this.lastRestart);
      if(delay>0){
        if(!this.restartTimer)this.restartTimer=setTimeout(()=>{this.restartTimer=0;this.play();},delay);
        return true;
      }
      clearTimeout(this.restartTimer);this.restartTimer=0;this.lastRestart=performance.now();
      const token=++this.token;
      try{
        const audio=this.prepare();audio.pause();
        if(audio.error)audio.load(); // A failed warm-up can be retried on an explicit click.
        audio.currentTime=0;this.setVolume();
        this.state='LOADING';this.status('正在播放同一段原声……');
        Promise.resolve(audio.play()).then(()=>{
          if(this.disposed||token!==this.token)return;
          this.state='PLAYING';this.status('原视频原声 · 每次点击重新播放');
        },error=>{
          if(this.disposed||token!==this.token)return;
          this.state='ERROR';this.status(error.name==='NotAllowedError'?'浏览器暂未允许播放，请点击“试听原声”重试。':'原声播放失败，文字和特效仍可正常互动。');
        });
      }catch{this.state='ERROR';this.status('原声暂时无法播放，文字和特效仍可正常互动。');}
      return true;
    }
    setVolume(){if(this.audio)this.audio.volume=this.settings.voiceVolume;}
    stop(){++this.token;clearTimeout(this.restartTimer);this.restartTimer=0;this.lastRestart=-Infinity;this.audio?.pause();this.state='IDLE';}
    dispose(){this.disposed=true;this.stop();if(this.audio){this.audio.onended=this.audio.onerror=null;this.audio.removeAttribute('src');this.audio.load();this.audio=null;}}
  };
})();
