(() => {
  'use strict';
  const config = window.SITE_CONFIG;
  const $ = (id) => document.getElementById(id);
  const icons = {
    facebook: '<path d="M24 12a12 12 0 1 0-13.875 11.854V15.47H7.078V12h3.047V9.356c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953h-1.513c-1.491 0-1.956.925-1.956 1.874V12h3.328l-.532 3.47h-2.796v8.384A12.003 12.003 0 0 0 24 12Z"/>',
    bilibili: '<g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="15" rx="4"/><path d="m7 2 4 4m6-4-4 4M7 11v3m10-3v3m-8 3 3 1 3-1"/></g>',
    x: '<path d="M18.9 2H22l-6.8 7.8L23.2 22H17l-4.8-7.3L5.8 22H2.6l8.1-9.3L.8 2h6.4l4.4 6.7L18.9 2Zm-1.1 18h1.7L6.3 3.9H4.5L17.8 20Z"/>',
    github: '<path d="M12 .8a11.3 11.3 0 0 0-3.6 22c.6.1.8-.2.8-.5v-2c-3.3.7-4-1.4-4-1.4-.5-1.3-1.3-1.6-1.3-1.6-1.1-.8.1-.8.1-.8 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.7 1.3 3.4 1 .1-.8.4-1.3.7-1.6-2.6-.3-5.4-1.3-5.4-5.6 0-1.2.4-2.2 1.2-3-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.1 1.2a10.9 10.9 0 0 1 5.6 0c2.2-1.5 3.1-1.2 3.1-1.2.6 1.6.2 2.8.1 3.1.8.8 1.2 1.8 1.2 3 0 4.3-2.8 5.3-5.4 5.6.4.4.8 1.1.8 2.2v3c0 .3.2.6.8.5A11.3 11.3 0 0 0 12 .8Z"/>',
    youtube: '<path d="M23 7s-.2-1.7-.9-2.4c-.9-.9-1.8-.9-2.2-1C16.8 3.4 12 3.4 12 3.4s-4.8 0-7.9.2c-.4.1-1.3.1-2.2 1C1.2 5.3 1 7 1 7S.8 9 .8 11v2c0 2 .2 4 .2 4s.2 1.7.9 2.4c.9.9 2 .9 2.5 1 1.8.2 7.6.2 7.6.2s4.8 0 7.9-.3c.4 0 1.3-.1 2.2-1 .7-.7.9-2.4.9-2.4s.2-2 .2-4v-2c0-2-.2-4-.2-4ZM9.7 15.5v-7l6.1 3.5-6.1 3.5Z"/>',
    qq: '<path d="M12 2c-3.5 0-5.4 2.6-5.4 6.1 0 .7.1 1.4.2 2.1-1.3 1.9-2.5 5-1.7 5.7.4.4 1.1-.2 1.7-.8.3 1.2 1 2.2 1.8 2.9-1.5.4-2.4 1.1-2.1 1.9.3 1 3.7 1.1 5.5.2 1.8.9 5.2.8 5.5-.2.3-.8-.6-1.5-2.1-1.9.8-.7 1.5-1.7 1.8-2.9.6.6 1.3 1.2 1.7.8.8-.7-.4-3.8-1.7-5.7.1-.7.2-1.4.2-2.1C17.4 4.6 15.5 2 12 2Z"/>',
    email: '<path d="M3 4h18a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Zm9 9L3 7v11h18V7l-9 6Zm0-2.4L19 6H5l7 4.6Z"/>',
    link: '<path d="m10 13 4-4 1.4 1.4-4 4L10 13Zm-3 6a4 4 0 0 1-2.8-6.8l3-3 1.4 1.4-3 3a2 2 0 1 0 2.8 2.8l3-3 1.4 1.4-3 3A4 4 0 0 1 7 19Zm10-14a4 4 0 0 1 2.8 6.8l-3 3-1.4-1.4 3-3a2 2 0 1 0-2.8-2.8l-3 3-1.4-1.4 3-3A4 4 0 0 1 17 5Z"/>'
  };
  $('name').textContent = config.name;
  $('bio').textContent = config.bio;
  $('status').textContent = config.status;
  $('avatar').src = config.avatar;
  $('avatar').alt = `${config.name} 的头像`;
  document.title = config.name;
  document.querySelector('[property="og:title"]').content = config.name;
  document.querySelector('.background').style.backgroundImage = `url(${JSON.stringify(config.background)})`;
  let toastTimer;
  function toast(message) { $('toast').textContent = message; $('toast').classList.add('visible'); clearTimeout(toastTimer); toastTimer = setTimeout(() => $('toast').classList.remove('visible'), 3500); }
  async function copy(value, label) {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(value);
    } catch {
      const input = document.createElement('textarea'); input.value = value; input.style.cssText = 'position:fixed;left:-9999px'; document.body.append(input);
      const previous = document.activeElement; input.select();
      let copied = false; try { copied = document.execCommand('copy'); } catch { /* manual fallback below */ }
      input.remove(); previous?.focus();
      if (!copied) { window.prompt(`请手动复制${label}：`, value); return; }
    }
    toast(`已复制 ${label}：${value}`);
  }
  config.socialLinks.forEach((item, index) => {
    const value = item.field ? String(config[item.field] ?? '') : (item.username || item.url || '');
    const row = document.createElement('div'); row.className = 'card-row'; row.style.setProperty('--index', index);
    const card = document.createElement(item.action === 'copy' ? 'button' : 'a'); card.className = 'social-card';
    if (item.action === 'copy') { card.type = 'button'; card.addEventListener('click', () => copy(value, item.name === 'Email' ? '邮箱' : item.name)); card.setAttribute('aria-label', `复制 ${item.name}：${value}`); }
    else { const url = new URL(item.url, location.href); if (!['https:', 'http:'].includes(url.protocol)) return; card.href = url.href; card.target = '_blank'; card.rel = 'noopener noreferrer'; card.setAttribute('aria-label', `${item.name} ${value}（新窗口打开）`); }
    const icon = document.createElement('span'); icon.className = 'platform-icon'; icon.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">${icons[item.icon] || icons.link}</svg>`;
    const text = document.createElement('span'); text.className = 'card-text';
    const name = document.createElement('span'); name.className = 'card-name'; name.textContent = item.name;
    const account = document.createElement('span'); account.className = 'card-account'; account.textContent = value;
    text.append(name, account);
    const arrow = document.createElement('span'); arrow.className = 'card-arrow'; arrow.setAttribute('aria-hidden', 'true'); arrow.textContent = item.action === 'copy' ? '⧉' : '↗';
    card.append(icon, text, arrow); row.append(card);
    if (item.mailto) { const mail = document.createElement('a'); mail.className = 'mail-link'; mail.href = `mailto:${value}`; mail.setAttribute('aria-label', `发送邮件至 ${value}`); mail.innerHTML = '<span aria-hidden="true">↗</span><span>发邮件</span>'; row.append(mail); }
    $('social-links').append(row);
  });
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const mobile = matchMedia('(max-width: 600px)');
  function petals() {
    $('sakura').replaceChildren(); if (reduced.matches) return;
    const count = Math.min(60, Math.max(0, mobile.matches ? config.sakura.mobile : config.sakura.desktop));
    for (let i = 0; i < count; i++) { const petal = document.createElement('i'); petal.className = 'petal'; petal.style.cssText = `left:${Math.random()*100}%;--size:${8+Math.random()*9}px;--duration:${15+Math.random()*15}s;--delay:-${Math.random()*30}s;--drift:${Math.random()*180-90}px;--rotation:${180+Math.random()*540}deg`; $('sakura').append(petal); }
  }
  petals(); reduced.addEventListener('change', petals); mobile.addEventListener('change', petals);
  const audio = $('bgm');
  const musicButtons = [$('music-toggle'), $('music-status')];
  let pending = false;
  let failed = false;
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
  async function toggleMusic() {
    if (config.music.enabled !== true) {
      toast('音乐尚未启用 ♡');
      return;
    }
    // A second click can cancel playback even while the first play promise is pending.
    if (!audio.paused) {
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
    pending = true;
    musicState('Off');
    try {
      // Keep play() in the original click event: no fetch or timer before it.
      await audio.play();
      if (!audio.paused) musicState('On');
    } catch (error) {
      if (error.name === 'AbortError' && audio.paused) musicState('Off');
      else reportMusicError(error);
    } finally {
      pending = false;
      musicButtons.forEach(button => button.setAttribute('aria-busy', 'false'));
    }
  }
  musicButtons.forEach(button => button.addEventListener('click', toggleMusic));
  audio.addEventListener('playing', () => { failed = false; musicState('On'); });
  audio.addEventListener('pause', () => musicState(failed ? 'Error' : 'Off'));
  audio.addEventListener('ended', () => musicState('Off'));
  audio.addEventListener('error', () => reportMusicError(audio.error));
  musicState('Off');
})();
