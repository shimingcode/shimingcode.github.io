// Apply saved colors before the stylesheet paints. Works when storage is disabled.
try {
  const theme = localStorage.getItem('shiming:theme');
  if (['sakura', 'star', 'night'].includes(theme)) document.documentElement.dataset.theme = theme;
} catch { /* Use the default sakura theme. */ }
