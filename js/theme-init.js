// Apply saved colors before the stylesheet paints. Works when storage is disabled.
try {
  const theme = localStorage.getItem('shiming:theme');
  if (['sakura', 'star', 'night'].includes(theme)) document.documentElement.dataset.theme = theme;
} catch { /* Use the default sakura theme. */ }
// A conservative initial hint, without UA sniffing or a new resize/animation loop.
if (navigator.connection?.saveData || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) || (navigator.deviceMemory && navigator.deviceMemory <= 4)) {
  document.documentElement.dataset.glassQuality = 'low';
}
