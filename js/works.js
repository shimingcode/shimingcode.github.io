(() => {
  'use strict';
  const works = Array.isArray(window.WORKS) ? window.WORKS : [];
  const gallery = document.getElementById('work-gallery');
  const filters = document.getElementById('work-filters');
  const dialog = document.getElementById('lightbox');
  const preview = document.getElementById('lightbox-image');
  const title = document.getElementById('lightbox-title');
  const details = document.getElementById('lightbox-details');
  const categories = ['全部', ...new Set(works.map(work => work.category).filter(Boolean))];
  let selected = '全部';
  let currentIndex = 0;
  let touchStartX = null;

  function renderFilters() {
    filters.replaceChildren();
    categories.forEach(category => {
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'filter-button'; button.textContent = category;
      button.setAttribute('aria-pressed', String(selected === category));
      button.addEventListener('click', () => { selected = category; renderFilters(); renderGallery(); });
      filters.append(button);
    });
  }

  function visibleWorks() {
    return works.map((work, sourceIndex) => ({ ...work, sourceIndex }))
      .filter(work => selected === '全部' || work.category === selected);
  }

  function renderGallery() {
    gallery.replaceChildren();
    const items = visibleWorks();
    if (!items.length) {
      const empty = document.createElement('div'); empty.className = 'works-empty';
      empty.innerHTML = '<span class="works-empty-icon" aria-hidden="true">✧</span><strong>作品正在准备中</strong><p>把照片放入 <code>assets/images/works/</code>，再在 <code>js/works-data.js</code> 添加作品信息，这里就会自动展示。</p>';
      gallery.append(empty); return;
    }
    const fragment = document.createDocumentFragment();
    items.forEach((work, index) => {
      const card = document.createElement('button'); card.type = 'button'; card.className = 'work-card';
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
      });
      image.src = primaryImage;
      const copy = document.createElement('span'); copy.className = 'work-card-copy';
      const heading = document.createElement('span'); heading.className = 'work-card-title'; heading.textContent = work.title || '未命名作品'; copy.append(heading);
      if (work.description) { const description = document.createElement('span'); description.className = 'work-card-description'; description.textContent = work.description; copy.append(description); }
      const meta = document.createElement('span'); meta.className = 'work-card-meta';
      if (work.date) { const date = document.createElement('time'); date.dateTime = work.date; date.textContent = work.date; meta.append(date); }
      if (work.category) { const category = document.createElement('span'); category.className = 'work-tag'; category.textContent = work.category; meta.append(category); }
      if (meta.childElementCount) copy.append(meta);
      card.append(image, copy); card.addEventListener('click', () => openLightbox(work.sourceIndex)); fragment.append(card);
    });
    gallery.append(fragment);
  }

  function openLightbox(index) {
    currentIndex = index;
    const work = works[currentIndex];
    if (!work) return;
    preview.classList.remove('image-load-failed');
    preview.src = work.image; preview.alt = work.title || '摄影作品';
    title.textContent = work.title || '';
    details.textContent = [work.date, work.category, work.description, ...(work.tags || []).map(tag => `#${tag}`)].filter(Boolean).join(' · ');
    dialog.showModal();
  }

  preview.addEventListener('error', () => {
    const failedPath = preview.currentSrc || preview.src;
    console.error('作品预览图片加载失败:', failedPath);
    preview.classList.add('image-load-failed');
    details.textContent = '图片加载失败，请检查作品数据中的图片路径。';
  });
  function move(delta) {
    const indices = visibleWorks().map(work => work.sourceIndex);
    if (!indices.length) return;
    const position = indices.indexOf(currentIndex);
    openLightbox(indices[(position + delta + indices.length) % indices.length]);
  }

  document.querySelector('.lightbox-close').addEventListener('click', () => dialog.close());
  document.querySelector('.lightbox-prev').addEventListener('click', () => move(-1));
  document.querySelector('.lightbox-next').addEventListener('click', () => move(1));
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  dialog.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft') { event.preventDefault(); move(-1); }
    if (event.key === 'ArrowRight') { event.preventDefault(); move(1); }
  });
  dialog.addEventListener('touchstart', event => { touchStartX = event.changedTouches[0]?.clientX ?? null; }, { passive: true });
  dialog.addEventListener('touchend', event => {
    if (touchStartX === null) return;
    const delta = event.changedTouches[0].clientX - touchStartX; touchStartX = null;
    if (Math.abs(delta) > 48) move(delta < 0 ? 1 : -1);
  }, { passive: true });

  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const mobile = matchMedia('(max-width: 600px)');
  const sakura = document.getElementById('sakura');
  function renderSakura() {
    const fragment = document.createDocumentFragment();
    const count = reduced.matches ? 0 : mobile.matches ? 8 : 15;
    for (let i = 0; i < count; i++) {
      const petal = document.createElement('i'); petal.className = 'petal';
      petal.style.cssText = `left:${Math.random()*100}%;--size:${8+Math.random()*8}px;--duration:${17+Math.random()*14}s;--delay:-${Math.random()*30}s;--drift:${Math.random()*160-80}px;--rotation:${180+Math.random()*540}deg`;
      fragment.append(petal);
    }
    sakura.replaceChildren(fragment);
  }
  renderFilters(); renderGallery(); renderSakura();
  reduced.addEventListener('change', renderSakura); mobile.addEventListener('change', renderSakura);
  const syncVisibility = () => document.documentElement.classList.toggle('page-hidden', document.hidden);
  document.addEventListener('visibilitychange', syncVisibility); syncVisibility();
})();

