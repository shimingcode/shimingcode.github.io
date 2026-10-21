/* Loaded only when a feature document is needed or a legacy page joins home. */
(() => {
  'use strict';
  const { mountOnce } = window.Site;
  function prepareContent(root,source,section=true) {
    // Resolve against the old page BEFORE moving its nodes into the home document.
    for(const node of root.querySelectorAll('[href],[src],[srcset]')) {
      for(const attr of ['href','src'])if(node.hasAttribute(attr)) {
        const value=node.getAttribute(attr);
        if(value&&!value.startsWith('#'))node.setAttribute(attr,new URL(value,source).href);
      }
      if(node.hasAttribute('srcset'))node.setAttribute('srcset',node.getAttribute('srcset').split(',').map(candidate=>{
        const [path,...size]=candidate.trim().split(/\s+/);return [new URL(path,source).href,...size].join(' ');
      }).join(', '));
    }
    if(!section)return;
    for(const heading of root.querySelectorAll('h1')) {
      const replacement=document.createElement('h2');
      for(const attr of heading.attributes)replacement.setAttribute(attr.name,attr.value);
      replacement.append(...heading.childNodes);heading.replaceWith(replacement);
    }
    for(const image of root.querySelectorAll('img')){image.loading='lazy';image.decoding='async';image.removeAttribute('fetchpriority');}
  }
  function mountHome(page,oldSection,oldURL,module) {
      prepareContent(page.main,page.source,false);
      const oldMain=document.getElementById('main');
      const incoming=document.importNode(page.main,true);
      incoming.setAttribute('aria-busy','true');
      // Keep live nodes, listeners, current filters and game instances from a legacy entry.
      if(oldSection&&oldSection!=='home') {
        const destination=incoming.querySelector('#'+oldSection);
        if(destination) {
          prepareContent(oldMain,oldURL.href);
          (destination.querySelector('.section-content')||destination).replaceChildren(...oldMain.childNodes);
          if(!module) {
            const heading=destination.querySelector('h2');
            if(heading){heading.id ||= oldSection+'-legacy-heading';destination.setAttribute('aria-labelledby',heading.id);}
          }
          if(module)destination.dataset.sectionState='ready';
        }
      }
      oldMain.replaceWith(incoming);document.body.className='single-page';
      document.title=page.template.content.querySelector('title').textContent;
      for(const selector of ['meta[name="description"]','meta[property="og:title"]','meta[property="og:description"]','meta[property="og:url"]','meta[property="og:image"]']) {
        const content=page.template.content.querySelector(selector)?.content;
        if(content!==undefined)document.querySelector(selector)?.setAttribute('content',content);
      }
      document.querySelector('link[rel="canonical"]').href=page.template.content.querySelector('link[rel="canonical"]').getAttribute('href');
      for(const name of ['profile','links','projects'])mountOnce(name);
      if(module)mountOnce(module);
  }
  window.SitePageContent=Object.freeze({prepareContent,mountHome});
})();
