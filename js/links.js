window.Site.register('links', () => {
  'use strict';
  const { el, icon, url, copy, storage } = window.Site;
  const config = window.SITE_CONFIG;
  const grid = document.getElementById('social-links');
  if (!grid) return;
  const search = document.getElementById('platform-search');
  const sort = document.getElementById('platform-sort');
  const filters = document.getElementById('platform-filters');
  const count = document.getElementById('platform-count');
  const links = config.socialLinks || [];
  let category = '全部', visits = {};
  try { visits = JSON.parse(storage.get('visits', '{}')); if (!visits || typeof visits !== 'object') visits = {}; } catch { /* Recover corrupt storage. */ }
  const key = item => item.url || item.field || item.name;
  function record(item) { visits[key(item)] = Date.now(); storage.set('visits', JSON.stringify(visits)); }
  for (const name of ['全部', ...new Set(links.map(item => item.category || '其他'))]) {
    const button = el('button', 'filter-button', name); button.type = 'button';
    button.setAttribute('aria-pressed', String(name === category));
    button.addEventListener('click', () => {
      category = name;
      for (const sibling of filters.children) sibling.setAttribute('aria-pressed', String(sibling === button));
      render();
    });
    filters.append(button);
  }
  function render() {
    const query = search.value.trim().toLocaleLowerCase();
    const items = links.filter(item => (category === '全部' || (item.category || '其他') === category)
      && [item.name, item.username, item.description, item.category, config[item.field]].join(' ').toLocaleLowerCase().includes(query));
    if (sort.value === 'name') items.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));
    if (sort.value === 'recent') items.sort((a, b) => (Number(visits[key(b)]) || 0) - (Number(visits[key(a)]) || 0));
    const fragment = document.createDocumentFragment();
    for (const item of items) {
      const value = String(item.field ? config[item.field] ?? '' : item.username || '');
      const copying = item.action === 'copy';
      const href = url(item.url, true);
      const valid = item.disabled !== true && (copying ? Boolean(value) : Boolean(href));
      const tile = el('div', 'platform-tile');
      const card = el(valid && !copying ? 'a' : 'button', 'social-card');
      if (valid && !copying) {
        card.href = href; card.target = '_blank'; card.rel = 'noopener noreferrer';
        card.setAttribute('aria-label', `${item.name} ${value}（新窗口打开）`);
        card.addEventListener('click', () => record(item));
      } else {
        card.type = 'button'; card.disabled = !valid;
        card.setAttribute('aria-label', valid ? `复制 ${item.name}：${value}` : `${item.name}：链接暂不可用`);
        if (valid) card.addEventListener('click', () => { record(item); copy(value, item.name); });
      }
      const top = el('span', 'card-top');
      const arrow = el('span', 'card-arrow', copying ? '⧉' : '↗'); arrow.setAttribute('aria-hidden', 'true');
      top.append(icon(item.icon), arrow);
      card.append(top, el('strong', 'card-name', item.name), el('span', 'card-account', value),
        el('span', 'card-description', valid ? item.description || item.category || '打开平台' : '链接暂不可用'));
      tile.append(card);
      if (item.mailto && valid && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        const mail = el('a', 'mail-link', '发邮件 ↗'); mail.href = `mailto:${value}`; tile.append(mail);
      }
      fragment.append(tile);
    }
    if (!items.length) fragment.append(el('p', 'empty-state', '没有找到匹配的平台，试试其他关键词或分类。'));
    grid.replaceChildren(fragment);
    count.textContent = `${items.length} / ${links.length} 个入口`;
  }
  search.addEventListener('input', render); sort.addEventListener('change', render); render();
});
