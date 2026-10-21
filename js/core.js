/* Small shared helpers. Configuration is data, never executable markup. */
(() => {
  'use strict';
  const base = new URL('../', document.currentScript.src);
  const storage = {
    get(key, fallback = null) { try { return localStorage.getItem(`shiming:${key}`) ?? fallback; } catch { return fallback; } },
    set(key, value) { try { localStorage.setItem(`shiming:${key}`, String(value)); return true; } catch { return false; /* Optional persistence can be retried. */ } }
  };
  function url(value, external = false) {
    if (typeof value !== 'string' || !value.trim()) return null;
    try {
      const result = new URL(value, base);
      if (!['https:', 'http:'].includes(result.protocol) || result.username || result.password) return null;
      if (external && !/^https?:\/\//i.test(value)) return null;
      return result.href;
    } catch { return null; }
  }
  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function icon(name) {
    const node = el('span', 'platform-icon');
    // Only trusted, source-controlled icon strings enter innerHTML.
    const icons = window.SITE_ICONS || {};
    node.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">${Object.hasOwn(icons, name) ? icons[name] : icons.link || ''}</svg>`;
    return node;
  }
  function externalLink(label, href, className = '') {
    const node = el('a', className, label);
    node.href = href; node.target = '_blank'; node.rel = 'noopener noreferrer';
    node.setAttribute('aria-label', `${label}（新窗口打开）`);
    return node;
  }
  let timer;
  function toast(message) {
    const node = document.getElementById('toast');
    if (!node) return;
    node.textContent = message; node.classList.add('visible');
    clearTimeout(timer); timer = setTimeout(() => node.classList.remove('visible'), 4000);
  }
  async function copy(value, label) {
    try { await navigator.clipboard.writeText(value); toast(`已复制${label}`); }
    catch { window.prompt(`请手动复制${label}：`, value); }
  }
  // Page modules register once; only their main-content DOM is mounted per navigation.
  const pages = new Map();
  const cleanups = new Map();
  function unmount() { for (const dispose of cleanups.values()) dispose(); cleanups.clear(); }
  // Appending a section must never recreate another section's game or filters.
  function mountOnce(name) {
    if (cleanups.has(name)) return;
    const dispose = pages.get(name)?.();
    if (typeof dispose === 'function') cleanups.set(name, dispose);
  }
  function mount() {
    unmount();
    for (const name of pages.keys()) mountOnce(name);
  }
  const register = (name, init) => pages.set(name, init);
  document.addEventListener('DOMContentLoaded', mount, { once: true });
  window.Site = Object.freeze({ base, storage, url, el, icon, externalLink, toast, copy, register, mount, mountOnce, unmount });
})();
