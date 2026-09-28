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
    items.forEach(work => {
      const card = document.createElement('button'); card.type = 'button'; card.className = 'work-card';
      card.setAttribute('aria-label', `查看作品：${work.title || '未命名作品'}`);
      const image = document.createElement('img');
      image.src = work.thumbnail || work.image; image.alt = work.title || '摄影作品';
      image.loading = 'lazy'; image.decoding = 'async';
      if (Number(work.width) > 0 && Number(work.height) > 0) card.style.setProperty('--work-ratio', `${work.width} / ${work.height}`);
      const copy = document.createElement('span'); copy.className = 'work-card-copy';
      const heading = document.createElement('span'); heading.className = 'work-card-title'; heading.textContent = work.title || '未命名作品'; copy.append(heading);
      if (work.description) { const description = document.createElement('span'); description.className = 'work-card-description'; description.textContent = work.description; copy.append(description); }
      const meta = document.createElement('span'); meta.className = 'work-card-meta';
      if (work.date) { const date = document.createElement('time'); date.dateTime = work.date; date.textContent = work.date; meta.append(date); }
      if (work.category) { const category = document.createElement('span'); category.className = 'work-tag'; category.textContent = work.category; meta.append(category); }
      if (meta.childElementCount) copy.append(meta);
      card.append(image, copy); card.addEventListener('click', () => openLightbox(work.sourceIndex)); gallery.append(card);
    });
  }

  function openLightbox(index) {
    currentIndex = index;
    const work = works[currentIndex];
    if (!work) return;
    preview.src = work.image; preview.alt = work.title || '摄影作品';
    title.textContent = work.title || '';
    details.textContent = [work.date, work.category, work.description, ...(work.tags || []).map(tag => `#${tag}`)].filter(Boolean).join(' · ');
    dialog.showModal();
  }
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
    sakura.replaceChildren(); if (reduced.matches) return;
    const count = mobile.matches ? 8 : 15;
    for (let i = 0; i < count; i++) {
      const petal = document.createElement('i'); petal.className = 'petal';
      petal.style.cssText = `left:${Math.random()*100}%;--size:${8+Math.random()*8}px;--duration:${17+Math.random()*14}s;--delay:-${Math.random()*30}s;--drift:${Math.random()*160-80}px;--rotation:${180+Math.random()*540}deg`;
      sakura.append(petal);
    }
  }
  renderFilters(); renderGallery(); renderSakura();
  reduced.addEventListener('change', renderSakura); mobile.addEventListener('change', renderSakura);
})();
