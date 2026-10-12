(() => {
  'use strict';
  const { el, url, storage } = window.Site;
  const config = window.SITE_CONFIG;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const mobile = matchMedia('(max-width: 599px)');
  const layer = document.getElementById('sakura');
  const weakDevice = (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) || (navigator.deviceMemory && navigator.deviceMemory <= 4) || navigator.connection?.saveData;
  function petals() {
    const enabled = storage.get('sakura', 'on') !== 'off' && !reduced.matches;
    const requested = Number(mobile.matches ? config.sakura?.mobile : config.sakura?.desktop);
    const count = enabled ? Math.max(0, Math.min(weakDevice ? 6 : mobile.matches ? 9 : 18, Number.isFinite(requested) ? requested : 9)) : 0;
    const fragment = document.createDocumentFragment();
    for (let i = 0; i < count; i++) {
      const petal = el('i', 'petal');
      petal.style.cssText = `left:${Math.random()*100}%;--size:${7+Math.random()*8}px;--duration:${18+Math.random()*15}s;--delay:-${Math.random()*30}s;--drift:${Math.random()*140-70}px;--rotation:${180+Math.random()*360}deg`;
      fragment.append(petal);
    }
    layer.replaceChildren(fragment);
  }
  const fox = el('aside', 'fox-assistant'); fox.setAttribute('aria-label', '狐狐助手');
  const button = el('button', 'fox-toggle'); button.type = 'button'; button.setAttribute('aria-label', '和狐狐打招呼'); button.setAttribute('aria-expanded', 'false'); button.setAttribute('aria-controls', 'fox-bubble');
  const picture = el('img'); picture.src = url(config.assistant?.image || config.avatar); picture.alt = ''; picture.width = 52; picture.height = 52; picture.decoding = 'async';
  button.append(picture);
  const bubble = el('div', 'fox-bubble glass'); bubble.id = 'fox-bubble'; bubble.hidden = true;
  const greeting = el('p'); greeting.setAttribute('aria-live', 'polite');
  const shortcuts = el('nav'); shortcuts.setAttribute('aria-label', '助手快捷导航');
  for (const page of (config.pages || []).filter(p => p.enabled && ['项目', '作品', '小游戏'].includes(p.title))) {
    const link = el('a', '', `${page.title} →`); link.href = url(page.url); shortcuts.append(link);
  }
  const hide = el('button', 'fox-hide', '隐藏助手'); hide.type = 'button';
  const again = el('button', 'fox-hide', '再聊一句'); again.type = 'button';
  function speak() {
    const hour = new Date().getHours();
    const time = hour < 6 ? '夜深啦，早点休息。' : hour < 12 ? '早上好，新的一天开始啦。' : hour < 18 ? '下午好，欢迎来我的小天地。' : '晚上好，今天辛苦啦。';
    const lines = config.assistant?.greetings || ['欢迎回来。'];
    greeting.textContent = `${time} ${lines[Math.floor(Math.random()*lines.length)] || ''}`;
  }
  button.addEventListener('click', () => {
    bubble.hidden = !bubble.hidden; button.setAttribute('aria-expanded', String(!bubble.hidden));
    if (!bubble.hidden) { speak(); const player = document.querySelector('.music-disclosure'); if (player) player.open = false; }
  });
  again.addEventListener('click', speak);
  hide.addEventListener('click', () => {
    storage.set('assistant','off'); document.getElementById('assistant-enabled').checked = false;
    sync(); document.querySelector('.preferences summary').focus();
  });
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && !bubble.hidden) { bubble.hidden = true; button.setAttribute('aria-expanded','false'); button.focus(); } });
  bubble.append(el('strong', '', config.assistant?.name || '狐狐'), greeting, shortcuts, again, hide);
  fox.append(bubble, button); document.body.append(fox);
  function sync() {
    fox.hidden = config.assistant?.enabled === false || storage.get('assistant','on') === 'off';
    if (fox.hidden) { bubble.hidden = true; button.setAttribute('aria-expanded','false'); }
    document.documentElement.dataset.interactionMotion = storage.get('interaction','on');
  }
  let lastPetalSetting = '';
  function update() {
    const setting = `${storage.get('sakura','on')}/${reduced.matches}/${mobile.matches}`;
    if (setting !== lastPetalSetting) { petals(); lastPetalSetting = setting; }
    sync();
  }
  const visibility = () => document.documentElement.classList.toggle('page-hidden', document.hidden);
  window.addEventListener('site-preferences', update); reduced.addEventListener('change', update); mobile.addEventListener('change', update);
  document.addEventListener('visibilitychange', visibility); update(); visibility();
})();
