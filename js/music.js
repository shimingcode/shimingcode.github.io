(() => {
  'use strict';
  const settings = window.SITE_CONFIG?.music;
  const audio = document.getElementById('bgm');
  const button = document.getElementById('music-toggle');
  const label = document.getElementById('music-status');
  const notice = document.getElementById('toast');
  if (!settings || !audio || !button || !label) return;
  const controls = [button, label];
  const preferenceKey = 'shiming:musicPreference';
  const positionKey = `shiming:music:${new URL(settings.src, document.baseURI).href}`;
  let preference = null, savedTime = 0;
  try { preference = localStorage.getItem(preferenceKey); } catch { /* Private mode may restrict storage. */ }
  try { savedTime = JSON.parse(sessionStorage.getItem(positionKey))?.time || 0; } catch { /* Optional resume position. */ }
  let pending = false, failed = false, wantsMusic = false, nearEnd = false;
  let attempt = 0, armed = false, toastTimer;
  const gestures = ['pointerdown', 'touchstart', 'click', 'keydown'];
  audio.loop = true;
  const volume = Number(settings.volume);
  audio.volume = Number.isFinite(volume) ? Math.min(1, Math.max(0, volume)) : 0.25;
  audio.preload = 'none';

  function state(value) {
    const on = value === 'On';
    label.textContent = `Music · ${value}`;
    for (const control of controls) {
      control.setAttribute('aria-pressed', String(on));
      control.setAttribute('aria-busy', String(pending));
      control.setAttribute('aria-label', value === 'Error' ? '音乐加载失败，点击重试' : on ? '暂停背景音乐' : '播放背景音乐');
    }
  }
  function toast(message) {
    if (!notice) return;
    notice.textContent = message; notice.classList.add('visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => notice.classList.remove('visible'), 3500);
  }
  function remember(value) {
    preference = value;
    try { localStorage.setItem(preferenceKey, value); } catch { /* Controls work without storage. */ }
  }
  function disarm() {
    for (const event of gestures) document.removeEventListener(event, unlock, true);
    armed = false;
  }
  function arm() {
    if (armed || preference === 'off') return;
    armed = true;
    for (const event of gestures) document.addEventListener(event, unlock, { capture: true, passive: true });
  }
  function unlock(event) {
    if (pending || preference === 'off' || event.target.closest?.('#music-toggle, #music-status')) return;
    if (event.type === 'keydown' && (event.repeat || ['Shift', 'Control', 'Alt', 'Meta', 'Escape'].includes(event.key))) return;
    // play() stays inside the trusted pointer/touch/click/key event, including on Safari.
    play();
  }
  function error(error) {
    if (error?.name === 'NotAllowedError') {
      wantsMusic = false;
      state('Off'); arm();
      return;
    }
    if (error?.name === 'AbortError' && audio.paused) { state('Off'); return; }
    if (!failed) console.error('BGM playback failed:', {
      name: error?.name, message: error?.message,
      mediaErrorCode: audio.error?.code, currentSrc: audio.currentSrc || audio.src
    });
    failed = true; wantsMusic = false;
    state('Error');
    toast('音乐加载失败，请点击重试。');
  }
  async function play() {
    if (settings.enabled !== true || pending || !audio.paused) return;
    const currentAttempt = ++attempt;
    pending = true; wantsMusic = true;
    state('Off');
    // No audio request before this point. No fetch, await, or timer precedes play().
    if (!audio.hasAttribute('src')) audio.src = settings.src;
    if (failed || audio.error) { failed = false; audio.load(); }
    try {
      await audio.play();
      if (currentAttempt !== attempt) return;
      if (!audio.paused) { failed = false; state('On'); disarm(); }
    } catch (reason) {
      if (currentAttempt === attempt) error(reason);
    } finally {
      if (currentAttempt === attempt) {
        pending = false;
        controls.forEach(control => control.setAttribute('aria-busy', 'false'));
      }
    }
  }
  function toggle() {
    if (settings.enabled !== true) { toast('音乐尚未启用 ♡'); return; }
    if (!audio.paused || pending) {
      ++attempt; pending = false; wantsMusic = false;
      remember('off'); disarm(); audio.pause(); state('Off');
    } else {
      remember('on'); play();
    }
  }
  controls.forEach(control => control.addEventListener('click', toggle));
  audio.addEventListener('loadedmetadata', () => {
    if (Number.isFinite(savedTime) && savedTime > 0 && Number.isFinite(audio.duration) && audio.duration > 0) audio.currentTime = savedTime % audio.duration;
    savedTime = 0;
  }, { once: true });
  window.addEventListener('pagehide', () => {
    if (!audio.readyState) return;
    try { sessionStorage.setItem(positionKey, JSON.stringify({ time: audio.currentTime })); } catch { /* Optional. */ }
  });
  audio.addEventListener('playing', () => { if (!pending) { state('On'); disarm(); } });
  audio.addEventListener('waiting', () => state('Off'));
  audio.addEventListener('error', () => error(audio.error));
  const markBoundary = () => {
    if (Number.isFinite(audio.duration) && audio.currentTime >= audio.duration - 0.75) nearEnd = true;
    else if (audio.currentTime > 1) nearEnd = false;
  };
  audio.addEventListener('timeupdate', markBoundary);
  audio.addEventListener('seeking', markBoundary);
  audio.addEventListener('pause', () => {
    if (wantsMusic && !failed && nearEnd && audio.currentTime < 0.1) { nearEnd = false; play(); }
    else state(failed ? 'Error' : 'Off');
  });
  audio.addEventListener('ended', () => {
    if (wantsMusic && audio.loop) { audio.currentTime = 0; play(); }
    else state('Off');
  });
  state('Off');
  function startAfterPage() {
    // Critical HTML/CSS/images finish first; audio never blocks their rendering.
    requestAnimationFrame(() => { if (preference !== 'off') play(); });
  }
  if (document.readyState === 'complete') startAfterPage();
  else window.addEventListener('load', startAfterPage, { once: true });
})();

