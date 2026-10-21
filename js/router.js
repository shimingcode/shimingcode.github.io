/* One persistent home document; legacy HTML remains a reusable, standalone fallback. */
(() => {
  'use strict';
  const { url, mountOnce } = window.Site;
  // Keep already loaded resource attributes untouched. Reassigning identical URLs
  // can trigger another stylesheet/image request; history navigation keeps their loads.
  // Favicons are re-resolved on history navigation, so only pin their URL.
  document.head.querySelectorAll('link[rel="icon"]').forEach(link=>{link.href=link.href;});
  const normalize = path => path.replace(/index\.html$/, '').replace(/\/$/, '');
  const routes = new Map([
    ['./', ['icons', 'links', 'projects-data', 'projects']],
    ['./links/', ['icons', 'links']], ['./projects/', ['projects-data', 'projects']],
    ['./games/', ['game-engine', 'games']],
    ['./games/funny-hit/', ['dialogue','game-state','voice-manager','effects','game'].map(name=>`funny-hit/${name}`)],
    ['./about/', []], ['./works.html', ['works-data', 'works']]
  ].map(([path, scripts]) => [normalize(new URL(url(path)).pathname), scripts]));
  for (const [path, scripts] of Object.entries(window.SITE_ROUTE_ASSETS || {})) routes.set(normalize(new URL(url(path)).pathname), scripts);
  const loaded = new Map(), styles = new Map(), retries = new Map();
  function trackInitial(node, cache, source) {
    const status = window.SITE_RESOURCE_STATUS?.get(node);
    if (status === 'error') return;
    if (status === 'load' || node.sheet || node === document.currentScript) {
      cache.set(source, Promise.resolve()); return;
    }
    // If the early tracker itself failed, retry unverified scripts on demand.
    if (!window.SITE_RESOURCE_STATUS) return;
    // In the built shell, the deferred page bundles may still be in flight.
    const pending = new Promise((resolve, reject) => {
      const finish = event => {
        clearTimeout(timer);
        node.removeEventListener('load', finish); node.removeEventListener('error', finish);
        if (event.type === 'load') { cache.set(source, Promise.resolve()); resolve(); }
        else { if (cache.get(source) === pending) cache.delete(source); reject(new Error('Initial page asset unavailable')); }
      };
      // The native request continues after our deadline. Keep observing it so a
      // late success is not downloaded/executed again on the next route visit.
      const timer = setTimeout(() => {
        if (cache.get(source) === pending) cache.delete(source);
        reject(new Error('Initial page asset timed out'));
      }, 12000);
      node.addEventListener('load', finish); node.addEventListener('error', finish);
    });
    cache.set(source, pending);
    // An initial failure can happen without any pending navigation to catch it.
    pending.catch(() => {});
  }
  document.querySelectorAll('script[src]').forEach(node => trackInitial(node, loaded, node.src));
  document.querySelectorAll('link[rel="stylesheet"]').forEach(node => trackInitial(node, styles, node.href));
  function asset(name, style = false) {
    const path = name.startsWith('./') ? name : name.startsWith('funny-hit/') ? `./games/${name}.${style?'css':'js'}?v=${name==='funny-hit/game'?11:style||name==='funny-hit/voice-manager'?8:7}` : style ? `./css/${name}.css?v=${name==='games'?1:7}` : `./js/${name}.js?v=${['works','games'].includes(name)?6:['links','projects'].includes(name)?5:4}`;
    const source = url(window.SITE_ASSETS?.[path.split('?')[0]] || path);
    const cache = style ? styles : loaded;
    if (!cache.has(source)) {
      // Production page bundles preserve dependency order internally. Native import
      // loads each bundle only on first entry, and shares its module cache on return.
      if (!style && name.startsWith('./js/page-')) {
        let timer;
        const deadline = new Promise((_, reject) => { timer=setTimeout(()=>reject(new Error('Page module timed out')),12000); });
        // A failed native import can be cached by the browser; explicit retries
        // get a stable attempt URL while successful imports remain shared.
        const attempt = retries.get(source) || 0;
        const pending = Promise.race([import(source + (attempt ? `?retry=${attempt}` : '')), deadline]).finally(()=>clearTimeout(timer)).catch(error => { cache.delete(source); retries.set(source, attempt+1); throw error; });
        cache.set(source, pending);
        return pending;
      }
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

  const contentTools = () => asset(window.SITE_ASSETS?.['./js/page-content.js'] || 'page-content').then(()=>window.SitePageContent);

  const homeURL = new URL(url('./'));
  const features = {
    works: { path:'./works.html', module:'works', css:'works' },
    games: { path:'./games/', module:'games', css:'games' },
    'fox-game': { path:'./games/funny-hit/', module:'funny-hit', css:'funny-hit/style' }
  };
  const legacy = new Map([
    ['./','home'], ['./links/','links'], ['./projects/','projects'],
    ['./works.html','works'], ['./games/','games'], ['./games/funny-hit/','fox-game'], ['./about/','about']
  ].map(([path,id])=>[normalize(new URL(url(path)).pathname),id]));
  const ids = new Set(['home','links','projects','works','games','fox-game','about','music']);
  const documents = new Map(), pendingSections = new Map();
  let homePending, sequence=0, active='', activeSection='', scrollAnchor='', navigating=false, settleTimer=0;
  let visibilityObserver, lazyObserver, revealObserver, resizeObserver;
  const visible = new Set(), revealed = new WeakSet();
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const header = document.getElementById('site-header');
  let headerHeight=0, observersStarted=false;
  const isHome = () => document.getElementById('main')?.dataset.pageClass === 'single-page';
  window.SiteNavigation=Object.freeze({invalidate(){documents.clear();},get cacheSize(){return documents.size;}});
  history.scrollRestoration='manual';

  function sectionId(target) {
    if(target.origin!==location.origin)return null;
    const page=legacy.get(normalize(target.pathname));
    if(!page)return null;
    let hash;try{hash=decodeURIComponent(target.hash.slice(1));}catch{return null;}
    if(hash==='platforms')hash='links';
    if(hash==='funny-hit')hash='fox-game';
    if(isHome()&&ids.has(hash))return hash;
    if(page==='home')return ids.has(hash)?hash:hash?null:'home';
    return page;
  }
  function setActive(id, navigation=false) {
    const section=document.getElementById(id);
    const selected=section?.dataset.navSection || id;
    if(activeSection!==id){activeSection=id;window.dispatchEvent(new CustomEvent('site:sectionchange',{detail:{id,navigation}}));}
    if(active===selected)return;
    active=selected;
    for(const link of document.querySelectorAll('.main-nav a[data-section-link]')) {
      if(link.dataset.sectionLink===selected) {
        link.setAttribute('aria-current','location');
        const nav=link.parentElement;
        if(nav.scrollWidth>nav.clientWidth)nav.scrollTo({left:link.offsetLeft-nav.offsetLeft-(nav.clientWidth-link.offsetWidth)/2,behavior:'instant'});
      } else link.removeAttribute('aria-current');
    }
  }
  function closePanels() {
    document.querySelectorAll('.preferences, .music-disclosure').forEach(node=>node.open=false);
    document.querySelectorAll('dialog[open]').forEach(node=>node.close());
    const bubble=document.getElementById('fox-bubble');if(bubble)bubble.hidden=true;
    document.querySelector('.fox-toggle')?.setAttribute('aria-expanded','false');
  }
  async function readPage(path) {
    const source=url(path);
    if(!documents.has(source)) {
      const task=new AbortController(),timer=setTimeout(()=>task.abort(),12000);
      const pending=fetch(source,{signal:task.signal,headers:{Accept:'text/html'}}).then(async response=>{
        if(!response.ok||!response.headers.get('content-type')?.includes('text/html'))throw Error('Page unavailable');
        const html=await response.text();
        return {html,source:response.url};
      }).finally(()=>clearTimeout(timer)).catch(error=>{documents.delete(source);throw error;});
      documents.set(source,pending);
    }
    const {html,source:responseURL}=await documents.get(source);
    const template=document.createElement('template');template.innerHTML=html;
    const main=template.content.querySelector('#main');
    if(!main||template.content.querySelector('meta[name="site-shell"]')?.content!=='music-v4'){documents.delete(source);throw Error('Incompatible page');}
    return {main,template,source:responseURL};
  }
  function dependencies(path,css) {
    const pending=(routes.get(normalize(new URL(url(path)).pathname))||[]).map(name=>asset(name));
    if(css)pending.push(asset(css,true));
    return Promise.all(pending);
  }
  function sectionError(section) {
    section.dataset.sectionState='error';
    const host=section.querySelector('.section-content');
    const message=document.createElement('p');message.setAttribute('role','status');message.textContent='暂时没有加载成功，网络恢复后可以重试。';
    const retry=document.createElement('button');retry.type='button';retry.className='button';retry.dataset.sectionRetry='';retry.textContent='重试加载';
    const fallback=document.createElement('a');fallback.className='button';fallback.href=url(features[section.id].path);fallback.dataset.fullNavigation='';fallback.textContent='打开独立页面 ↗';
    host.replaceChildren(message,retry,fallback);
  }
  async function ensureSection(id) {
    const section=document.getElementById(id),feature=features[id];
    if(!section||!feature||section.dataset.sectionState==='ready')return;
    if(pendingSections.has(id))return pendingSections.get(id);
    section.dataset.sectionState='loading';section.setAttribute('aria-busy','true');
    const pending=(async()=>{
      try {
        const [page,,content]=await Promise.all([readPage(feature.path),dependencies(feature.path,feature.css),contentTools()]);
        if(!section.isConnected)return;
        const anchor=scrollAnchor&&document.getElementById(scrollAnchor);
        const keepPosition=anchor&&anchor!==section&&(section.compareDocumentPosition(anchor)&Node.DOCUMENT_POSITION_FOLLOWING);
        const before=keepPosition?anchor.getBoundingClientRect().top:null;
        content.prepareContent(page.main,page.source);
        section.querySelector('.section-content').replaceChildren(...page.main.childNodes);
        mountOnce(feature.module);
        section.dataset.sectionState='ready';lazyObserver?.unobserve(section);
        if(before!==null){
          if(navigating)anchor.scrollIntoView({behavior:reduce.matches?'instant':'smooth',block:'start'});
          else {const delta=anchor.getBoundingClientRect().top-before;if(Math.abs(delta)>1)scrollBy({top:delta,behavior:'instant'});}
        }
      } catch { if(section.isConnected)sectionError(section); }
      finally {section.removeAttribute('aria-busy');pendingSections.delete(id);}
    })();
    pendingSections.set(id,pending);return pending;
  }
  async function ensureHome() {
    if(isHome())return;
    if(homePending)return homePending;
    homePending=(async()=>{
      const oldURL=new URL(location.href);
      const oldSection=legacy.get(normalize(oldURL.pathname));
      const [page,,content]=await Promise.all([readPage('./'),dependencies('./'),contentTools()]);
      if(features[oldSection])await dependencies(features[oldSection].path,features[oldSection].css);
      content.mountHome(page,oldSection,oldURL,features[oldSection]?.module);
      startObservers();
    })().finally(()=>homePending=null);
    return homePending;
  }
  function observeVisibility() {
    visibilityObserver?.disconnect();visible.clear();
    visibilityObserver=new IntersectionObserver(entries=>{
      for(const entry of entries){if(entry.isIntersecting)visible.add(entry.target);else visible.delete(entry.target);}
      if(navigating)return;
      const sections=[...visible].sort((a,b)=>a.getBoundingClientRect().top-b.getBoundingClientRect().top);
      if(Math.ceil(scrollY+innerHeight)>=document.documentElement.scrollHeight-2)setActive('music');
      else if(sections.length)setActive(sections[0].id);
    },{rootMargin:`-${headerHeight}px 0px -55% 0px`,threshold:0});
    for(const section of document.querySelectorAll('[data-section]'))visibilityObserver.observe(section);
  }
  function startObservers() {
    if(!isHome()||observersStarted)return;observersStarted=true;
    const measureHeader=()=>{
      const height=Math.ceil(header.getBoundingClientRect().height)+16;
      if(height===headerHeight)return;
      headerHeight=height;document.documentElement.style.setProperty('--section-offset',height+'px');observeVisibility();
    };
    measureHeader();resizeObserver=new ResizeObserver(measureHeader);resizeObserver.observe(header);
    lazyObserver=new IntersectionObserver(entries=>{
      if(navigating)return;
      for(const entry of entries)if(entry.isIntersecting&&entry.target.dataset.sectionState!=='error')ensureSection(entry.target.id);
    },{rootMargin:'160px 0px',threshold:0});
    for(const section of document.querySelectorAll('[data-section-source]'))if(section.dataset.sectionState!=='ready')lazyObserver.observe(section);
    revealObserver=new IntersectionObserver(entries=>{
      for(const entry of entries)if(entry.isIntersecting&&!revealed.has(entry.target)) {
        revealed.add(entry.target);revealObserver.unobserve(entry.target);
        if(!reduce.matches)entry.target.classList.add('section-enter');
      }
    },{threshold:.05});
    for(const section of document.querySelectorAll('[data-section]'))revealObserver.observe(section);
  }
  function finishScroll() {
    if(!navigating)return;
    navigating=false;clearTimeout(settleTimer);
    // Refresh visibility after an animated jump skipped intermediate sections.
    if(isHome()) {
      observeVisibility();
      lazyObserver?.disconnect();
      for(const section of document.querySelectorAll('[data-section-source]'))if(!['ready','error'].includes(section.dataset.sectionState))lazyObserver?.observe(section);
    }
  }
  async function navigate(id,{historyMode='push',smooth=true,focus=true}={}) {
    const token=++sequence;navigating=true;scrollAnchor='';clearTimeout(settleTimer);closePanels();
    scrollTo({top:scrollY,behavior:'instant'});
    document.getElementById('main').setAttribute('aria-busy','true');
    try {
      await ensureHome();await ensureSection(id);
      if(token!==sequence)return;
      const section=document.getElementById(id);if(!section)return;
      const target=new URL(homeURL);target.hash=id;
      if(historyMode==='replace'||(historyMode==='pop'&&normalize(location.pathname)!==normalize(homeURL.pathname)))history.replaceState({...history.state,section:id},'',target.href);
      else if(historyMode==='push'&&location.href!==target.href)history.pushState({section:id},'',target.href);
      setActive(id,true);if(focus)section.focus({preventScroll:true});
      scrollAnchor=id;
      const behavior=smooth&&!reduce.matches?'smooth':'instant';
      if(id==='home')scrollTo({top:0,behavior});else section.scrollIntoView({behavior,block:'start'});
      // Long native scrolls can last more than a second. Do not start loading
      // intermediate sections until we actually reach the requested section.
      settleTimer=setTimeout(()=>{
        if(token!==sequence||!navigating)return;
        if(id==='home')scrollTo({top:0,behavior:'instant'});else section.scrollIntoView({behavior:'instant',block:'start'});
        finishScroll();
      },2500);
      if(behavior==='instant')finishScroll();
      window.dispatchEvent(new Event('site:navigated'));
    } catch {
      if(token!==sequence)return;
      // Keep the current document and running game if the home shell cannot load.
      window.Site.toast('暂时无法载入主页，请稍后再次点击导航。');
      finishScroll();
    } finally {
      if(token===sequence)document.getElementById('main').removeAttribute('aria-busy');
    }
  }
  document.addEventListener('click',event=>{
    const retry=event.target.closest?.('[data-section-retry]');
    if(retry){const id=retry.closest('[data-section]').id;navigate(id,{historyMode:'replace'});return;}
    if(event.target.closest?.('[data-music-open]')) {
      const panel=document.querySelector('.music-disclosure');panel.open=true;
      document.getElementById('music-toggle').focus({preventScroll:true});return;
    }
    const link=event.target.closest?.('a[href]');
    if(!link||event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey||link.hasAttribute('download')||link.hasAttribute('data-full-navigation')||(link.target&&link.target!=='_self'))return;
    const id=sectionId(new URL(link.href));if(!id)return;
    event.preventDefault();navigate(id);
  });
  let handledURL=location.href;
  function fromHistory() {
    if(handledURL===location.href)return;handledURL=location.href;
    const id=sectionId(new URL(location.href));if(id)navigate(id,{historyMode:'pop',smooth:false});
  }
  window.addEventListener('popstate',fromHistory);window.addEventListener('hashchange',fromHistory);
  window.addEventListener('site:navigated',()=>handledURL=location.href);
  window.addEventListener('scrollend',()=>{
    if(!navigating||!scrollAnchor)return;
    const section=document.getElementById(scrollAnchor);if(!section)return;
    const margin=parseFloat(getComputedStyle(section).scrollMarginTop)||0;
    const padding=parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop)||0;
    const wanted=scrollAnchor==='home'?0:Math.max(0,Math.min(document.documentElement.scrollHeight-innerHeight,section.getBoundingClientRect().top+scrollY-margin-padding));
    if(Math.abs(scrollY-wanted)<3)finishScroll();
  });
  const manualScroll=event=>{
    // A real interaction interrupts native smooth scrolling as well as our
    // navigation state. Keep its section stable if an earlier lazy load arrives.
    if(navigating)scrollTo({top:scrollY,behavior:'instant'});
    scrollAnchor=event.target?.closest?.('[data-section]')?.id || '';
    finishScroll();
  };
  for(const event of ['wheel','touchstart','pointerdown'])window.addEventListener(event,manualScroll,{passive:true});
  document.addEventListener('keydown',event=>{if(['PageDown','PageUp','ArrowDown','ArrowUp','Home','End',' '].includes(event.key))manualScroll(event);});
  document.addEventListener('DOMContentLoaded',()=>{
    if(!isHome())return;
    const id=sectionId(new URL(location.href));
    if(location.hash&&id){navigating=true;startObservers();navigate(id,{historyMode:'replace',smooth:false,focus:false});}
    else{startObservers();setActive('home');}
  },{once:true});
})();
