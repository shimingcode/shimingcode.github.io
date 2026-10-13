/* One audio element for the lifetime of this document; navigation never reloads it. */
(() => {
  'use strict';
  if (window.SiteMusic) return;
  const { url, storage } = window.Site;
  const settings = window.SITE_CONFIG.music || {};
  const root = document.getElementById('music-root'), audio = document.getElementById('bgm');
  const source = url(settings.src);
  if (!root || !audio || settings.enabled === false || !source) return;
  let saved = {};
  try { const value = JSON.parse(storage.get('music-state', '{}')); if (value && typeof value === 'object') saved = value; } catch { /* Corrupt preferences use defaults. */ }
  const clamp = (value, fallback, max = 1) => typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.min(max, value)) : fallback;
  let restoreTime = clamp(saved.currentTime, 0, Number.MAX_SAFE_INTEGER);
  let wanted = saved.isPlaying !== false, pending = false, failed = false, blocked = false, request = 0, lastSave = 0, restored = false;
  let gestureEvents = null;
  audio.loop = true; audio.preload = 'metadata';
  audio.volume = clamp(saved.volume, clamp(Number(storage.get('volume', String(settings.volume ?? .25))), .25));
  audio.muted = saved.muted === true;
  root.className = 'music-player'; root.setAttribute('aria-label', '音乐播放器');
  root.innerHTML = `<button id="music-toggle" class="cd-button" type="button" aria-label="播放音乐" aria-pressed="false">
    <span class="cd-disc" aria-hidden="true"><img class="cd-cover" alt="" width="88" height="88"><span class="cd-hole"></span></span>
    <span class="cd-symbol" aria-hidden="true">▶</span><span class="cd-prompt" aria-hidden="true">点击播放</span></button>
    <details class="music-disclosure"><summary aria-label="展开音乐播放器" title="音乐控制面板">♫ <span aria-hidden="true">⌃</span></summary>
    <div class="music-panel glass"><p class="eyebrow">NOW PLAYING · SINGLE LOOP</p><strong id="music-title"></strong><p id="music-artist"></p>
    <p id="music-state" role="status" aria-live="polite"></p>
    <label for="music-progress">播放进度</label><input id="music-progress" type="range" min="0" max="0" step="0.1" value="0" disabled>
    <div class="music-time"><output id="music-current">00:00</output><span aria-hidden="true"> / </span><output id="music-duration">00:00</output></div>
    <div class="music-volume-heading"><label for="music-volume">音量 <output id="volume-value"></output></label><button id="music-mute" type="button" aria-label="静音" aria-pressed="false">静音</button></div>
    <input id="music-volume" type="range" min="0" max="1" step="0.05">
    <p>单曲循环 · 手机也可用设备音量键调整。</p></div></details>`;
  const find = id => document.getElementById(id);
  const button = find('music-toggle'), state = find('music-state'), progress = find('music-progress');
  const volume = find('music-volume'), mute = find('music-mute'), disclosure = root.querySelector('details');
  const currentLabel=find('music-current'),durationLabel=find('music-duration'),volumeLabel=find('volume-value');
  const symbol=root.querySelector('.cd-symbol'),prompt=root.querySelector('.cd-prompt');
  let shownSecond=-1,shownDuration=-1,uiFrame=0;
  find('music-title').textContent = settings.title || '背景音乐'; find('music-artist').textContent = settings.artist || '';
  const cover = root.querySelector('.cd-cover');
  cover.addEventListener('error', () => { cover.hidden = true; }, { once: true });
  cover.src = url(settings.cover || window.SITE_CONFIG.avatarSmall || window.SITE_CONFIG.avatarWebp || window.SITE_CONFIG.avatar);
  if(!settings.cover && window.SITE_CONFIG.avatarSmall){cover.srcset=`${url(window.SITE_CONFIG.avatarSmall)} 160w, ${url(window.SITE_CONFIG.avatarWebp)} 336w`;cover.sizes='(max-width:599px) 60px, 88px';}
  const time = seconds => { const value = Math.max(0, Math.floor(Number.isFinite(seconds) ? seconds : 0)); return `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`; };
  function save() {
    lastSave = Date.now();
    storage.set('music-state', JSON.stringify({ currentTime: restored ? audio.currentTime : restoreTime, volume: audio.volume, isPlaying: wanted, muted: audio.muted }));
  }
  function update(message) {
    const playing = !audio.paused && !failed;
    root.classList.toggle('is-playing', playing); root.classList.toggle('needs-play', blocked || failed);
    button.setAttribute('aria-label', playing || pending ? '暂停音乐' : failed ? '音乐加载失败，点击重试' : '播放音乐');
    button.setAttribute('aria-pressed', String(playing)); button.setAttribute('aria-busy', String(pending));
    symbol.textContent = playing || pending ? 'Ⅱ' : '▶';
    prompt.textContent = failed ? '点击重试' : blocked && gestureEvents ? '轻触页面播放' : '点击播放';
    const text = message || (failed ? '音频加载失败，请点击光碟重试。' : blocked ? gestureEvents ? '轻触页面、点击或按键即可尝试播放音乐，也可点击光碟。' : '浏览器仍阻止播放，请点击光碟重试。' : pending ? '正在加载…' : playing ? '正在播放 · 单曲循环' : '已暂停 · 点击光碟播放');
    if (state.textContent !== text) state.textContent = text;
    button.title = text;
  }
  function updateTime() {
    uiFrame=0;
    if(document.hidden||!disclosure.open)return;
    const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
    if(duration!==shownDuration){progress.disabled=!duration;progress.max=String(duration);durationLabel.textContent=time(duration);shownDuration=duration;}
    progress.value=String(audio.currentTime);
    const second=Math.floor(audio.currentTime);
    if(second!==shownSecond){currentLabel.textContent=time(second);progress.setAttribute('aria-valuetext',`${time(second)} / ${time(duration)}`);shownSecond=second;}
  }
  function queueTime(){if(!uiFrame&&!document.hidden&&disclosure.open)uiFrame=requestAnimationFrame(updateTime);}
  function updateVolume() {
    volume.value = String(audio.volume); volumeLabel.textContent = `${Math.round(audio.volume * 100)}%`;
    const label = audio.muted ? '取消静音' : '静音'; mute.textContent = label; mute.setAttribute('aria-label', label); mute.setAttribute('aria-pressed', String(audio.muted));
  }
  function clearGesture() { gestureEvents?.abort(); gestureEvents = null; }
  function waitForGesture() {
    clearGesture(); gestureEvents = new AbortController();
    const options = { signal: gestureEvents.signal, passive: true };
    const activate = event => {
      if (!event.isTrusted || !wanted || !blocked || pending || failed || document.hidden) return;
      // Let the CD's own click handler run, without immediately toggling playback twice.
      if (button.contains(event.target)) return;
      if ((event.type === 'click' || event.type === 'pointerup') && event.button !== 0) return;
      if (event.type === 'keydown' && (event.repeat || event.ctrlKey || event.altKey || event.metaKey || ['Escape','Shift','Control','Alt','Meta','CapsLock','NumLock','ScrollLock','PrintScreen'].includes(event.key))) return;
      // One real gesture retry. A further rejection leaves the explicit CD control available.
      clearGesture(); play();
    };
    for (const type of ['pointerup', 'touchend', 'click', 'keydown']) document.addEventListener(type, activate, options);
  }
  async function play(automatic = false) {
    clearGesture();
    const attempt = ++request; wanted = true; pending = true; failed = false; blocked = false; update(); save();
    if (audio.error) { restoreTime = restored ? audio.currentTime : restoreTime; restored = false; audio.load(); }
    try {
      // Gesture retries call play synchronously, while the browser's activation is available.
      await audio.play();
      if (attempt !== request) return;
      pending = false; update(); save();
    } catch (error) {
      if (attempt !== request) return;
      pending = false;
      if (error.name === 'NotAllowedError') { blocked = true; if (automatic && wanted) waitForGesture(); }
      else if (error.name !== 'AbortError') failed = true;
      update(); save();
    }
  }
  function pause() { clearGesture(); ++request; wanted = false; pending = false; blocked = false; audio.pause(); update(); save(); }
  button.addEventListener('click', () => { if (failed || blocked) play(); else if (pending || !audio.paused) pause(); else play(); });
  volume.addEventListener('input', () => { audio.volume = Number(volume.value); updateVolume(); });
  volume.addEventListener('change', save);
  mute.addEventListener('click', () => { audio.muted = !audio.muted; updateVolume(); save(); });
  progress.addEventListener('input', () => { if (Number.isFinite(audio.duration)) audio.currentTime = Math.min(Number(progress.value), Math.max(0, audio.duration - .01)); queueTime(); });
  progress.addEventListener('change',save);
  audio.addEventListener('loadedmetadata', () => {
    if (!restored && Number.isFinite(audio.duration) && audio.duration > 0) {
      if (restoreTime > 0) audio.currentTime = restoreTime % audio.duration;
      restored = true; restoreTime = 0;
    }
    updateTime();
  });
  audio.addEventListener('durationchange', updateTime);
  audio.addEventListener('timeupdate', () => { queueTime(); if (Date.now() - lastSave >= 5000) save(); });
  audio.addEventListener('seeked', () => { if(Date.now()-lastSave>=1000)save(); });
  audio.addEventListener('volumechange', () => { updateVolume(); if(Date.now()-lastSave>=1000)save(); });
  audio.addEventListener('playing', () => { clearGesture(); pending = false; failed = false; blocked = false; update(); });
  audio.addEventListener('pause', () => { update(); save(); });
  audio.addEventListener('waiting', () => { if (wanted) update('正在缓冲…'); });
  audio.addEventListener('error', () => { clearGesture(); ++request; pending = false; failed = true; update(); save(); });
  function visibility() { root.classList.toggle('is-hidden-page', document.hidden); if (document.hidden) {cancelAnimationFrame(uiFrame);uiFrame=0;save();}else queueTime(); }
  document.addEventListener('visibilitychange', visibility); window.addEventListener('pagehide', save);
  window.addEventListener('pageshow', () => { visibility(); update(); });
  disclosure.addEventListener('toggle', () => {
    if (!disclosure.open) {cancelAnimationFrame(uiFrame);uiFrame=0;return;}
    updateTime();
    const bubble = find('fox-bubble'); if (bubble) bubble.hidden = true;
    document.querySelector('.fox-toggle')?.setAttribute('aria-expanded', 'false');
  });
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && disclosure.open) { disclosure.open = false; disclosure.querySelector('summary').focus(); } });
  window.SiteMusic = Object.freeze({ save });
  updateVolume(); update(); visibility(); audio.src = source;
  // Exactly one automatic attempt per document, unless the user previously chose pause.
  if (wanted) play(true);
})();
