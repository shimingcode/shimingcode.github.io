window.Site.register('projects', () => {
  'use strict';
  const { el, url, externalLink } = window.Site;
  const grid = document.getElementById('project-grid');
  const filters = document.getElementById('project-filters');
  if (!grid) return;
  const projects = window.PROJECTS || [];
  const events=new AbortController(),options={signal:events.signal};
  const cards=new Map();let selected = '全部';
  filters.replaceChildren();
  function render() {
    const fragment = document.createDocumentFragment();
    for (const project of projects.filter(p => selected === '全部' || selected === p.category)) {
      if(cards.has(project)){fragment.append(cards.get(project));continue;}
      const card = el('article', 'project-card');
      const cover = el('img', 'project-cover'); cover.alt = '';
      cover.loading = 'lazy'; cover.decoding = 'async'; cover.width = 640; cover.height = 320;
      cover.src = url(project.cover);
      cover.addEventListener('error', () => { cover.hidden = true; }, { once: true, ...options });
      const body = el('div', 'project-body');
      body.append(el('span', 'eyebrow', project.example ? `${project.category} · 示例，待完善` : `${project.category} · 可以体验`),
        el('h3', '', project.name), el('p', '', project.description));
      const tags = el('div', 'tags'); for (const tech of project.stack || []) tags.append(el('span', 'tag', tech));
      const actions = el('div', 'project-actions');
      const source = url(project.source, true), demo = url(project.demo);
      if (source) actions.append(externalLink('源码 ↗', source));
      else actions.append(el('span', 'muted', '源码待添加'));
      if (demo) {
        const link = new URL(demo).origin === location.origin ? el('a', '', '在线体验 →') : externalLink('在线体验 ↗', demo);
        link.href = demo; actions.append(link);
      } else actions.append(el('span', 'muted', '暂无在线体验'));
      body.append(tags, actions); card.append(cover, body);cards.set(project,card);fragment.append(card);
    }
    grid.replaceChildren(fragment);
    document.getElementById('project-count').textContent = `${grid.children.length} 个项目`;
  }
  for (const category of ['全部', ...new Set(projects.map(p => p.category))]) {
    const button = el('button', 'filter-button', category); button.type = 'button';
    button.setAttribute('aria-pressed', String(category === selected));
    button.dataset.category=category;filters.append(button);
  }
  filters.addEventListener('click',event=>{
    const button=event.target.closest('button[data-category]');if(!button||button.dataset.category===selected)return;
    selected=button.dataset.category;
    for(const sibling of filters.children)sibling.setAttribute('aria-pressed',String(sibling===button));
    render();
  },options);
  render();
  return ()=>{events.abort();cards.clear();};
});
