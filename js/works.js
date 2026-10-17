window.Site.register('works', () => {
  'use strict';
  const works = Array.isArray(window.WORKS) ? window.WORKS : [];
  const gallery = document.getElementById('work-gallery');
  if (!gallery) return;
  const filters = document.getElementById('work-filters');
  const dialog = document.getElementById('lightbox');
  const preview = document.getElementById('lightbox-image');
  const title = document.getElementById('lightbox-title');
  const details = document.getElementById('lightbox-details');
  const categories = ['全部', ...new Set(works.map(work => work.category).filter(Boolean))];
  const events=new AbortController(),options={signal:events.signal},cards=new Map();
  const indexed=works.map((work,sourceIndex)=>({...work,sourceIndex}));
  let visible=indexed,selected = '全部';
  let currentIndex = 0;
  let touchStartX = null;

  function renderFilters() {
    filters.replaceChildren();
    categories.forEach(category => {
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'filter-button'; button.textContent = category;
      button.setAttribute('aria-pressed', String(selected === category));
      button.dataset.category=category;
      filters.append(button);
    });
  }

  function visibleWorks() {
    return visible;
  }

  function renderGallery() {
    gallery.replaceChildren();
    const items = visibleWorks();
    if (!items.length) {
      const empty = document.createElement('div'); empty.className = 'works-empty';
      empty.innerHTML = '<span class="works-empty-icon" aria-hidden="true">✧</span><strong>作品正在准备中</strong><p>新的作品正在整理中，稍后再来看看吧。</p>';
      gallery.append(empty); return;
    }
    const fragment = document.createDocumentFragment();
    items.forEach((work, index) => {
      if(cards.has(work.sourceIndex)){fragment.append(cards.get(work.sourceIndex));return;}
      const card = document.createElement('button'); card.type = 'button'; card.className = 'work-card';
      card.dataset.index=String(work.sourceIndex);
      card.setAttribute('aria-label', `查看作品：${work.title || '未命名作品'}`);
      const image = document.createElement('img');
      const originalUrl = new URL(work.image, document.baseURI);
      const filename = originalUrl.pathname.split('/').pop().replace(/\.[^.]+$/, '.webp');
      const primaryImage = work.thumbnail || new URL(`thumbs/${filename}`, originalUrl).href;
      image.alt = work.title || '摄影作品';
      image.loading = index < (matchMedia('(max-width: 700px)').matches ? 2 : 4) ? 'eager' : 'lazy'; image.decoding = 'async';
      if (Number(work.width) > 0 && Number(work.height) > 0) { image.width = Number(work.width); image.height = Number(work.height); }
      if (Number(work.width) > 0 && Number(work.height) > 0) card.style.setProperty('--work-ratio', `${work.width} / ${work.height}`);
      image.addEventListener('error', () => {
        const failedPath = image.currentSrc || image.src || primaryImage;
        console.warn('作品缩略图加载失败，请生成缩略图；点击作品仍可查看原图:', failedPath);
        const placeholder = document.createElement('span');
        placeholder.className = 'work-image-error';
        placeholder.setAttribute('role', 'img');
        placeholder.setAttribute('aria-label', `图片加载失败：${work.title || failedPath}`);
        placeholder.innerHTML = '<span aria-hidden="true">✧</span><strong>预览图暂不可用，点击查看原图</strong>';
        image.replaceWith(placeholder);
      },{once:true,...options});
      if(work.thumbnailSrcset){image.srcset=work.thumbnailSrcset;image.sizes='(max-width:599px) calc(100vw - 32px), (max-width:900px) 45vw, 280px';}
      image.src = primaryImage;
      const copy = document.createElement('span'); copy.className = 'work-card-copy';
      const heading = document.createElement('span'); heading.className = 'work-card-title'; heading.textContent = work.title || '未命名作品'; copy.append(heading);
      if (work.description) { const description = document.createElement('span'); description.className = 'work-card-description'; description.textContent = work.description; copy.append(description); }
      const meta = document.createElement('span'); meta.className = 'work-card-meta';
      if (work.date) { const date = document.createElement('time'); date.dateTime = work.date; date.textContent = work.date; meta.append(date); }
      if (work.category) { const category = document.createElement('span'); category.className = 'work-tag'; category.textContent = work.category; meta.append(category); }
      if (meta.childElementCount) copy.append(meta);
      card.append(image, copy);cards.set(work.sourceIndex,card);fragment.append(card);
    });
    gallery.append(fragment);
  }

  function openLightbox(index) {
    currentIndex = index;
    const work = works[currentIndex];
    if (!work) return;
    preview.classList.remove('image-load-failed');
    preview.src = work.preview || work.image; preview.alt = work.title || '摄影作品';
    const original=document.getElementById('lightbox-original');
    if(original)original.href=window.Site.url(work.image);
    title.textContent = work.title || '';
    details.textContent = [work.date, work.category, work.description, ...(work.tags || []).map(tag => `#${tag}`)].filter(Boolean).join(' · ');
    if (!dialog.open) dialog.showModal();
  }

  preview.decoding='async';
  preview.addEventListener('error', () => {
    if(!preview.hasAttribute('src'))return;
    const failedPath = preview.currentSrc || preview.src;
    console.error('作品预览图片加载失败:', failedPath);
    preview.classList.add('image-load-failed');
    details.textContent = '图片加载失败，请检查作品数据中的图片路径。';
  },options);
  function move(delta) {
    const indices = visibleWorks().map(work => work.sourceIndex);
    if (!indices.length) return;
    const position = indices.indexOf(currentIndex);
    openLightbox(indices[(position + delta + indices.length) % indices.length]);
  }

  document.querySelector('.lightbox-close').addEventListener('click', () => dialog.close(),options);
  document.querySelector('.lightbox-prev').addEventListener('click', () => move(-1),options);
  document.querySelector('.lightbox-next').addEventListener('click', () => move(1),options);
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); },options);
  dialog.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft') { event.preventDefault(); move(-1); }
    if (event.key === 'ArrowRight') { event.preventDefault(); move(1); }
  },options);
  dialog.addEventListener('touchstart', event => { touchStartX = event.changedTouches[0]?.clientX ?? null; }, { passive: true,...options });
  dialog.addEventListener('touchend', event => {
    if (touchStartX === null) return;
    const delta = event.changedTouches[0].clientX - touchStartX; touchStartX = null;
    if (Math.abs(delta) > 48) move(delta < 0 ? 1 : -1);
  }, { passive: true,...options });

  filters.addEventListener('click',event=>{
    const button=event.target.closest('button[data-category]');if(!button||button.dataset.category===selected)return;
    selected=button.dataset.category;visible=indexed.filter(work=>selected==='全部'||work.category===selected);
    for(const sibling of filters.children)sibling.setAttribute('aria-pressed',String(sibling===button));renderGallery();
  },options);
  gallery.addEventListener('click',event=>{const card=event.target.closest('[data-index]');if(card)openLightbox(Number(card.dataset.index));},options);
  const releasePreview=()=>{preview.removeAttribute('src');touchStartX=null;};
  dialog.addEventListener('close',()=>{if(!dialog.open)releasePreview();},options);
  renderFilters(); renderGallery();
  return () => { events.abort();if(dialog.open)dialog.close();releasePreview();cards.clear();visible=[]; };
});
