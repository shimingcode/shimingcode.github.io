/* Progressive navigation: real HTML URLs remain independently loadable on Pages. */
(() => {
  'use strict';
  const { url, mount, unmount } = window.Site;
  // Persistent head/header resources must not resolve against the next page's directory.
  document.head.querySelectorAll('link[href]').forEach(link => { link.href = link.href; });
  document.querySelectorAll('#site-header img[src]').forEach(img => { img.src = img.src; });
  const normalize = path => path.replace(/index\.html$/, '').replace(/\/$/, '');
  const routes = new Map([
    ['./', ['icons', 'links', 'projects-data', 'projects']],
    ['./links/', ['icons', 'links']], ['./projects/', ['projects-data', 'projects']],
    ['./games/', ['game-engine', 'games']],
    ['./games/funny-hit/', ['dialogue','game-state','audio-manager','voice-manager','effects','game'].map(name=>`funny-hit/${name}`)],
    ['./about/', []], ['./works.html', ['works-data', 'works']]
  ].map(([path, scripts]) => [normalize(new URL(url(path)).pathname), scripts]));
  const loaded = new Map([...document.querySelectorAll('script[src]')].map(script => [script.src, Promise.resolve()]));
  const styles = new Map([...document.querySelectorAll('link[rel="stylesheet"]')].map(link => [link.href, Promise.resolve()]));
  let controller, rendered = new URL(location.href), key = 0, nextKey = 0;
  const positions = new Map();
  const documents = new Map();
  window.SiteNavigation=Object.freeze({invalidate(){documents.clear();},get cacheSize(){return documents.size;}});
  const cacheKey = target => normalize(target.pathname)+target.search;
  // Cache immutable response text, never detached page DOM or event handlers.
  history.replaceState({ ...history.state, shimingPage: key }, '', location.href);
  history.scrollRestoration = 'manual';
  function known(target) { return target.origin === location.origin && routes.has(normalize(target.pathname)); }
  function remember() {
    const position=positions.get(key);
    if(position){position[0]=scrollX;position[1]=scrollY;}else positions.set(key,[scrollX,scrollY]);
    if(positions.size>100)positions.delete(positions.keys().next().value);
  }
  window.addEventListener('scroll', remember, { passive: true });
  function asset(name, style = false) {
    const source = url(name.startsWith('funny-hit/') ? `./games/${name}.${style?'css':'js'}?v=5` : style ? `./css/${name}.css?v=6` : `./js/${name}.js?v=4`);
    const cache = style ? styles : loaded;
    if (!cache.has(source)) {
      cache.set(source, new Promise((resolve, reject) => {
        const node = document.createElement(style ? 'link' : 'script');
        const timer = setTimeout(() => node.onerror(), 12000);
        if (style) { node.rel = 'stylesheet'; node.href = source; }
        else { node.src = source; node.async = false; }
        node.onload = () => { clearTimeout(timer); resolve(); };
        node.onerror = () => { clearTimeout(timer); cache.delete(source); node.remove(); reject(new Error('Page asset unavailable')); };
        document.head.append(node);
      }));
    }
    return cache.get(source);
  }
  function moveFocus(target, position) {
    document.getElementById('main').focus({ preventScroll: true });
    if (position) scrollTo(...position);
    else {
      let anchor;
      try { anchor = document.getElementById(decodeURIComponent(target.hash.slice(1))); } catch { /* Invalid fragment. */ }
      if (anchor) anchor.scrollIntoView(); else scrollTo(0, 0);
    }
  }
  async function navigate(target, pop = false, state = null) {
    remember(); controller?.abort();
    const task = new AbortController(); controller = task;
    const position = pop ? positions.get(state?.shimingPage) : null;
    const main = document.getElementById('main'), fragment = target.hash;
    const timeout = setTimeout(() => task.abort(), 12000);
    main.setAttribute('aria-busy', 'true');
    try {
      const samePage = normalize(rendered.pathname) === normalize(target.pathname) && rendered.search === target.search;
      let incoming, page;
      if (!samePage) {
        const id=cacheKey(target),cached=documents.get(id);
        let html, fetched = false;
        if(cached&&performance.now()-cached.time<60000){html=cached.html;documents.delete(id);documents.set(id,cached);}
        else {
          const response = await fetch(target.href, { signal: task.signal, headers: { Accept: 'text/html' } });
          if (!response.ok || !known(new URL(response.url)) || !response.headers.get('content-type')?.includes('text/html')) throw new Error('Not a site page');
          target = new URL(response.url); target.hash = fragment; html=await response.text(); fetched = true;
        }
        // A template uses one inert owner document and never starts image/media requests.
        // Parsing a whole detached Document on every route retained extra document resources.
        page = document.createElement('template'); page.innerHTML = html;
        incoming = page.content.querySelector('#main');
        if (!incoming || !page.content.querySelector('#music-root') || page.content.querySelector('meta[name="site-shell"]')?.content !== 'music-v4') throw new Error('Incompatible page shell');
        if(fetched){documents.delete(id);documents.set(id,{html,time:performance.now()});if(documents.size>6)documents.delete(documents.keys().next().value);}
        // Insert ordered (async=false) scripts together: fetch concurrently, execute
        // in dependency order. Styles can load alongside them before mounting.
        const assets=routes.get(normalize(target.pathname)).map(script=>asset(script));
        if (incoming.dataset.pageClass === 'works-page') assets.push(asset('works', true));
        if (incoming.dataset.pageClass === 'funny-hit-page') assets.push(asset('funny-hit/style', true));
        await Promise.all(assets);
        if (controller !== task || task.signal.aborted) throw new Error('Navigation cancelled');
      }
      if (!pop) { key = ++nextKey; history.pushState({ shimingPage: key }, '', target.href); }
      else { key = state?.shimingPage ?? ++nextKey; history.replaceState({ ...history.state, shimingPage: key }, '', target.href); }
      if (incoming) {
        unmount(); document.body.className = incoming.dataset.pageClass || '';
        main.replaceWith(document.importNode(incoming, true)); document.title = page.content.querySelector('title')?.textContent || document.title;
        for (const selector of ['meta[name="description"]', 'meta[property="og:title"]', 'meta[property="og:description"]']) {
          const content = page.content.querySelector(selector)?.content;
          if (content !== undefined && document.querySelector(selector)) document.querySelector(selector).content = content;
        }
        mount();
      }
      rendered = new URL(target.href);
      document.querySelectorAll('.preferences, .music-disclosure').forEach(details => { details.open = false; });
      const bubble = document.getElementById('fox-bubble'); if (bubble) bubble.hidden = true;
      document.querySelector('.fox-toggle')?.setAttribute('aria-expanded', 'false');
      moveFocus(target, position); window.dispatchEvent(new Event('site:navigated'));
    } catch {
      if (controller !== task) return;
      // A full document navigation may briefly interrupt audio; persisted progress is the fallback.
      window.SiteMusic?.save(); location.assign(target.href);
    } finally {
      clearTimeout(timeout);
      if (controller === task) document.getElementById('main')?.removeAttribute('aria-busy');
    }
  }
  document.addEventListener('click', event => {
    const link = event.target.closest?.('a[href]');
    if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey ||
      link.hasAttribute('download') || (link.target && link.target !== '_self') || link.hasAttribute('data-full-navigation')) return;
    const target = new URL(link.href);
    if (!known(target)) return;
    event.preventDefault(); navigate(target);
  });
  window.addEventListener('popstate', event => {
    const target = new URL(location.href);
    if (known(target)) navigate(target, true, event.state); else location.reload();
  });
})();
