(() => {
  'use strict';
  const config = window.SITE_CONFIG;
  const $ = id => document.getElementById(id);
  if (!config?.music || !$('bgm') || !$('music-toggle') || !$('music-status')) return;
  let toastTimer;
  function toast(message) {
    const notice = $('toast');
    if (!notice) return;
    notice.textContent = message;
    notice.classList.add('visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => notice.classList.remove('visible'), 3500);
  }
  const audio = $('bgm');
  const musicButtons = [$('music-toggle'), $('music-status')];
  let pending = false;
  let waitingForGesture = false;
  let failed = false;
  let wantsMusic = false;
  let reachedLoopBoundary = false;
  const storageKey = `shiming:music:${new URL(config.music.src, document.baseURI).href}`;
  let saved = null;
  try { saved = JSON.parse(sessionStorage.getItem(storageKey)); } catch { /* Storage may be unavailable. */ }
  audio.addEventListener('loadedmetadata', () => {
    if (Number.isFinite(saved?.time) && saved.time > 0 && Number.isFinite(audio.duration) && audio.duration > 0) {
      audio.currentTime = saved.time % audio.duration;
    }
    saved = null;
  }, { once: true });
  window.addEventListener('pagehide', () => {
    try {
      sessionStorage.setItem(storageKey, JSON.stringify({ time: audio.currentTime, playing: wantsMusic || waitingForGesture }));
    } catch { /* Playback still works without storage. */ }
  });
  const shouldStart = saved?.playing !== false;
  audio.loop = true;
  audio.volume = Math.min(1, Math.max(0, Number(config.music.volume) || 0.30));
  audio.preload = 'metadata';
  if (config.music.enabled === true) audio.src = config.music.src;

  function musicState(state) {
    const playing = state === 'On';
    musicButtons.forEach(button => {
      button.setAttribute('aria-pressed', String(playing));
      button.setAttribute('aria-label', state === 'Error' ? '音乐加载失败，点击重试' : playing ? '暂停背景音乐' : '播放背景音乐');
      button.setAttribute('aria-busy', String(pending));
    });
    $('music-status').textContent = `Music · ${state}`;
  }
  function reportMusicError(error) {
    failed = true;
    wantsMusic = false;
    pending = false;
    musicState('Error');
    console.error('BGM playback failed:', {
      name: error?.name,
      message: error?.message,
      mediaErrorCode: audio.error?.code,
      mediaErrorMessage: audio.error?.message,
      currentSrc: audio.currentSrc || audio.src,
      networkState: audio.networkState,
      readyState: audio.readyState
    });
    toast('音乐加载失败，请检查音频路径、网络和文件格式；点击可重试。');
  }
  async function toggleMusic({ automatic = false } = {}) {
    if (!automatic) waitingForGesture = false;
    if (config.music.enabled !== true) {
      toast('音乐尚未启用 ♡');
      return;
    }
    // A second click can cancel playback even while the first play promise is pending.
    if (!audio.paused) {
      wantsMusic = false;
      pending = false;
      audio.pause();
      musicState('Off');
      return;
    }
    if (pending) return;
    if (failed || audio.error) {
      failed = false;
      audio.load();
    }
    wantsMusic = true;
    pending = true;
    musicState('Off');
    try {
      // Keep play() in the original click event: no fetch or timer before it.
      await audio.play();
      if (!audio.paused) musicState('On');
    } catch (error) {
      if (error.name === 'AbortError' && audio.paused) musicState('Off');
      else if (automatic && error.name === 'NotAllowedError') {
        wantsMusic = false;
        waitingForGesture = true;
        musicState('Off');
        toast('轻触页面即可开启音乐 ♫');
      } else reportMusicError(error);
    } finally {
      pending = false;
      musicButtons.forEach(button => button.setAttribute('aria-busy', 'false'));
    }
  }
  musicButtons.forEach(button => button.addEventListener('click', toggleMusic));
  audio.addEventListener('playing', () => { failed = false; musicState('On'); });
  const rememberLoopBoundary = () => {
    if (Number.isFinite(audio.duration) && audio.currentTime >= audio.duration - 0.75) reachedLoopBoundary = true;
    else if (audio.currentTime > 1) reachedLoopBoundary = false;
  };
  audio.addEventListener('timeupdate', rememberLoopBoundary);
  audio.addEventListener('seeking', rememberLoopBoundary);
  audio.addEventListener('pause', () => {
    // WebKit can rewind a native loop and emit pause without an ended event.
    if (wantsMusic && !failed && audio.loop && reachedLoopBoundary && audio.currentTime < 0.1) {
      reachedLoopBoundary = false;
      audio.play().catch(reportMusicError);
    } else musicState(failed ? 'Error' : 'Off');
  });
  audio.addEventListener('ended', () => {
    // Some WebKit media backends stop at the loop boundary despite loop=true.
    if (wantsMusic && audio.loop) {
      audio.currentTime = 0;
      audio.play().catch(reportMusicError);
    } else musicState('Off');
  });
  audio.addEventListener('error', () => reportMusicError(audio.error));
  musicState('Off');
  // Browsers allowing audible autoplay start immediately. Otherwise use a real gesture.
  function unlockMusic(event) {
    if (!waitingForGesture || pending || event.target.closest?.('#music-toggle, #music-status')) return;
    if (event.type === 'keydown' && !['Enter', ' '].includes(event.key)) return;
    waitingForGesture = false;
    toggleMusic();
  }
  document.addEventListener('click', unlockMusic);
  document.addEventListener('keydown', unlockMusic);
  if (config.music.enabled === true && shouldStart) toggleMusic({ automatic: true });
})();


