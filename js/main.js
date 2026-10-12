(() => {
  'use strict';
  const { el, url, storage } = window.Site;
  const config = window.SITE_CONFIG;
  const header = document.getElementById('site-header');
  const nav = el('nav', 'main-nav'); nav.setAttribute('aria-label', '主导航');
  const normalize = path => path.replace(/index\.html$/, '').replace(/\/$/, '');
  for (const page of (config.pages || []).filter(p => p.enabled)) {
    const href = url(page.url); if (!href || new URL(href).origin !== location.origin) continue;
    const link = el('a', '', page.title); link.href = href;
    if (normalize(new URL(href).pathname) === normalize(location.pathname)) link.setAttribute('aria-current', 'page');
    nav.append(link);
  }
  const settings = el('details', 'preferences');
  settings.innerHTML = `<summary aria-label="外观与互动设置" title="外观与互动设置">☼</summary>
    <div class="preferences-panel"><strong>让这里更像你喜欢的样子</strong>
    <label for="theme-select">配色主题</label><select id="theme-select"><option value="sakura">樱花粉</option><option value="star">星空蓝</option><option value="night">暗夜</option></select>
    <label>飘落樱花<input id="sakura-enabled" type="checkbox"></label>
    <label>显示狐狐助手<input id="assistant-enabled" type="checkbox"></label>
    <label>助手互动动画<input id="interaction-enabled" type="checkbox"></label>
    <p>偏好只保存在当前浏览器。系统的“减少动态效果”优先生效。</p></div>`;
  header.append(nav, settings);
  const theme = document.getElementById('theme-select');
  theme.value = document.documentElement.dataset.theme || 'sakura';
  function themeColor() { document.querySelector('meta[name="theme-color"]').content = {sakura:'#fff3f8',star:'#101c37',night:'#19161e'}[theme.value]; }
  themeColor();
  theme.addEventListener('change', () => { document.documentElement.dataset.theme = theme.value; storage.set('theme', theme.value); themeColor(); });
  for (const [id, key, fallback] of [['sakura-enabled','sakura','on'], ['assistant-enabled','assistant',config.assistant?.enabled === false ? 'off' : 'on'], ['interaction-enabled','interaction','on']]) {
    const control = document.getElementById(id); control.checked = storage.get(key, fallback) !== 'off';
    control.addEventListener('change', () => { storage.set(key, control.checked ? 'on' : 'off'); window.dispatchEvent(new Event('site-preferences')); });
  }
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && settings.open) { settings.open = false; settings.querySelector('summary').focus(); }
  });
  document.addEventListener('click', event => { if (!settings.contains(event.target)) settings.open = false; });
  for (const [id, value] of [['name', config.name], ['bio', config.bio], ['status', config.status]]) {
    const target = document.getElementById(id); if (target) target.textContent = value;
  }
  const avatar = document.getElementById('avatar');
  if (avatar) { avatar.src = url(config.avatar); avatar.alt = `${config.name} 的头像`; }
  const avatarWebp = document.getElementById('avatar-webp');
  if (avatarWebp && url(config.avatarWebp)) avatarWebp.srcset = url(config.avatarWebp);
  document.querySelectorAll('[data-profile-image]').forEach(img => { img.src = url(config.avatarWebp || config.avatar); });
  if (!document.body.classList.contains('works-page')) {
    const media = matchMedia('(max-width: 599px)');
    const update = () => {
      const fallback = url(config.background);
      const optimized = url(media.matches ? config.backgroundMobileWebp || config.backgroundWebp : config.backgroundWebp);
      if (!fallback) return;
      const value = `image-set(url(${JSON.stringify(optimized)}) type("image/webp"), url(${JSON.stringify(fallback)}) type("image/jpeg"))`;
      document.querySelector('.background').style.backgroundImage = optimized && CSS.supports('background-image', value) ? value : `url(${JSON.stringify(fallback)})`;
    }; update(); media.addEventListener('change', update);
  }
  const about = document.getElementById('about-content');
  if (about) {
    about.append(el('p', '', config.about?.intro || config.bio));
    for (const paragraph of config.about?.paragraphs || []) about.append(el('p', '', paragraph));
  }
  const footer = document.getElementById('site-footer');
  footer.append(el('p', '', `© ${new Date().getFullYear()} ${config.name} · A little pink, a little magic.`));
  const footerNote = el('p', '', '原生前端 · 无追踪脚本 · ');
  const source = config.socialLinks.find(item => item.icon === 'github');
  if (url(source?.url, true)) footerNote.append(window.Site.externalLink('GitHub ↗', url(source.url, true)));
  footer.append(footerNote);
})();
