// Apply saved colors before the stylesheet paints. Works when storage is disabled.
try {
  const theme = localStorage.getItem('shiming:theme');
  if (['sakura', 'star', 'night'].includes(theme)) document.documentElement.dataset.theme = theme;
} catch { /* Use the default sakura theme. */ }
// A conservative initial hint, without UA sniffing or a new resize/animation loop.
if (navigator.connection?.saveData || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) || (navigator.deviceMemory && navigator.deviceMemory <= 4)) {
  document.documentElement.dataset.glassQuality = 'low';
}
// Record actual startup loads: a script/link being present does not mean it loaded.
// Capture starts before deferred scripts and styles, including failed direct entries.
(() => {
  const status = window.SITE_RESOURCE_STATUS = new Map();
  const record = event => {
    if (event.target.matches?.('script[src],link[rel="stylesheet"]')) status.set(event.target, event.type);
  };
  document.addEventListener('load', record, true);
  document.addEventListener('error', record, true);
  document.addEventListener('DOMContentLoaded', () => {
    document.removeEventListener('load', record, true);
    document.removeEventListener('error', record, true);
    delete window.SITE_RESOURCE_STATUS;
  }, { once: true });
})();
