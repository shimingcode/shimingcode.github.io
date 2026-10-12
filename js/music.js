(() => {
  'use strict';
  const { el, url, storage } = window.Site;
  const settings = window.SITE_CONFIG.music || {};
  const tracks = (settings.playlist?.length ? settings.playlist : [{title:'背景音乐',src:settings.src}]).filter(track => url(track.src));
  const root = document.getElementById('music-root');
  const audio = document.getElementById('bgm');
  if (!root || !audio || settings.enabled === false || !tracks.length) return;
  let index = Math.max(0, Math.min(tracks.length - 1, Number(storage.get('musicTrack','0')) || 0));
  index = Math.floor(index);
  let request = 0, pending = false, wanted = false, failed = false;
  const savedVolume = Number(storage.get('volume', String(settings.volume ?? .25)));
  audio.volume = Number.isFinite(savedVolume) ? Math.max(0, Math.min(1, savedVolume)) : .25;
  audio.loop = tracks.length === 1;
  root.className = 'music-player glass'; root.setAttribute('aria-label','音乐播放器');
  root.innerHTML = `<button id="music-toggle" class="music-play" type="button" aria-label="播放音乐" aria-pressed="false">▶</button>
    <details class="music-disclosure"><summary aria-label="展开音乐播放器"><strong id="music-title"></strong><small id="music-state" role="status" aria-live="polite">点击播放 · 展开歌单</small></summary>
    <div class="music-panel"><label for="music-track">播放列表<select id="music-track"></select></label>
    <label for="music-volume">音量 <output id="volume-value"></output><input id="music-volume" type="range" min="0" max="1" step="0.05"></label>
    <div class="music-actions"><button id="music-prev" type="button">上一首</button><button id="music-next" type="button">下一首</button></div>
    <p id="music-info"></p><p>手动播放，音频按需加载。手机音量也可使用设备按键调整。</p></div></details>`;
  const button = document.getElementById('music-toggle');
  const state = document.getElementById('music-state');
  const title = document.getElementById('music-title');
  const select = document.getElementById('music-track');
  const volume = document.getElementById('music-volume');
  const output = document.getElementById('volume-value');
  const info = document.getElementById('music-info');
  tracks.forEach((track, i) => { const option = el('option','',track.title || `曲目 ${i+1}`); option.value=String(i); select.append(option); });
  for (const id of ['music-prev','music-next']) document.getElementById(id).disabled = tracks.length < 2;
  function update(message) {
    const playing = !audio.paused && !failed;
    button.textContent = playing || pending ? 'Ⅱ' : '▶';
    button.setAttribute('aria-label', playing || pending ? '暂停音乐' : failed ? '音乐加载失败，点击重试' : '播放音乐');
    button.setAttribute('aria-pressed', String(playing)); button.setAttribute('aria-busy', String(pending));
    state.textContent = message || (failed ? '加载失败 · 点击重试' : pending ? '加载中…' : playing ? '正在播放 · 展开歌单' : '已暂停 · 点击播放');
  }
  function trackInfo() {
    select.value = String(index); title.textContent = tracks[index].title || '背景音乐';
    info.textContent = `${tracks[index].artist || ''}${tracks.length === 1 ? ' · 当前有 1 首歌曲' : ` · ${index+1} / ${tracks.length}`}`;
  }
  function volumeInfo() { volume.value = String(audio.volume); output.textContent = `${Math.round(audio.volume*100)}%`; }
  function fail(message) { pending=false; wanted=false; failed=true; update(message || '加载失败 · 点击重试'); }
  function stop() { ++request; wanted=false; pending=false; audio.pause(); update(); }
  function saveTime() {
    if (!audio.hasAttribute('src') || !audio.readyState) return;
    try { sessionStorage.setItem(`shiming:position:${audio.src}`, String(audio.currentTime)); } catch { /* Optional. */ }
  }
  async function play() {
    const attempt = ++request; wanted=true; pending=true; failed=false; update();
    const source = url(tracks[index].src);
    if (audio.getAttribute('src') !== source) audio.src = source;
    else if (audio.error) audio.load();
    try {
      // Called directly from a playback gesture; never rely on audible autoplay.
      await audio.play();
      if (attempt !== request) return;
      pending=false; update();
    } catch (error) {
      if (attempt !== request) return;
      if (error.name === 'NotAllowedError') { pending=false; wanted=false; update('浏览器已阻止播放，请点击 ▶'); }
      else if (error.name === 'AbortError') { pending=false; update(); }
      else fail();
    }
  }
  function switchTrack(next) {
    const resume = wanted || !audio.paused;
    saveTime(); stop(); index=(next+tracks.length)%tracks.length; failed=false;
    audio.removeAttribute('src'); audio.load(); storage.set('musicTrack',index); trackInfo(); update('已选择 · 点击播放');
    if (resume) play();
  }
  button.addEventListener('click', () => { if (pending || !audio.paused) stop(); else play(); });
  select.addEventListener('change', () => switchTrack(Number(select.value)));
  document.getElementById('music-prev').addEventListener('click', () => switchTrack(index-1));
  document.getElementById('music-next').addEventListener('click', () => switchTrack(index+1));
  volume.addEventListener('input', () => { audio.volume=Number(volume.value); storage.set('volume',audio.volume); volumeInfo(); });
  audio.addEventListener('playing', () => { if (!wanted) { audio.pause(); return; } pending=false; update(); });
  audio.addEventListener('pause', () => { if (!pending) update(); });
  audio.addEventListener('waiting', () => { if (wanted) update('正在缓冲…'); });
  audio.addEventListener('error', () => { if (audio.hasAttribute('src')) fail(); });
  audio.addEventListener('ended', () => { if (wanted && tracks.length > 1) switchTrack(index+1); });
  audio.addEventListener('loadedmetadata', () => {
    let position=0; try { position=Number(sessionStorage.getItem(`shiming:position:${audio.src}`)) || 0; } catch { /* Optional. */ }
    if (Number.isFinite(position) && position > 0 && position < audio.duration-1) audio.currentTime=position;
  });
  window.addEventListener('pagehide', saveTime);
  const disclosure = root.querySelector('details');
  disclosure.addEventListener('toggle', () => {
    if (!disclosure.open) return;
    const bubble=document.getElementById('fox-bubble'); if (bubble) bubble.hidden=true;
    document.querySelector('.fox-toggle')?.setAttribute('aria-expanded','false');
  });
  document.addEventListener('keydown', event => { if (event.key==='Escape' && disclosure.open) { disclosure.open=false; disclosure.querySelector('summary').focus(); } });
  trackInfo(); volumeInfo();
})();
