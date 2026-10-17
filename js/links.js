window.Site.register('links', () => {
  'use strict';
  const { el, icon, url, copy, storage } = window.Site, config=window.SITE_CONFIG;
  const grid=document.getElementById('social-links');if(!grid)return;
  const search=document.getElementById('platform-search'),sort=document.getElementById('platform-sort'),filters=document.getElementById('platform-filters'),count=document.getElementById('platform-count');
  const events=new AbortController(),options={signal:events.signal};
  let category='全部',visits={},timer=0,nameOrder=null;
  try{visits=JSON.parse(storage.get('visits','{}'));if(!visits||typeof visits!=='object')visits={};}catch{}
  const records=(config.socialLinks||[]).map((item,index)=>{
    const value=String(item.field?config[item.field]??'':item.username||''),copying=item.action==='copy',href=url(item.url,true);
    const valid=item.disabled!==true&&(copying?Boolean(value):Boolean(href)),tile=el('div','platform-tile'),card=el(valid&&!copying?'a':'button','social-card');
    card.dataset.index=String(index);
    if(valid&&!copying){card.href=href;card.target='_blank';card.rel='noopener noreferrer';card.setAttribute('aria-label',`${item.name} ${value}（新窗口打开）`);}
    else{card.type='button';card.disabled=!valid;card.setAttribute('aria-label',valid?`复制 ${item.name}：${value}`:`${item.name}：链接暂不可用`);}
    const top=el('span','card-top'),arrow=el('span','card-arrow',copying?'⧉':'↗');arrow.setAttribute('aria-hidden','true');top.append(icon(item.icon),arrow);
    card.append(top,el('strong','card-name',item.name),el('span','card-account',value),el('span','card-description',valid?item.description||item.category||'打开平台':'链接暂不可用'));tile.append(card);
    if(item.mailto&&valid&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)){const mail=el('a','mail-link','发邮件 ↗');mail.href=`mailto:${value}`;tile.append(mail);}
    return {item,value,copying,tile,key:item.url||item.field||item.name,search:[item.name,item.username,item.description,item.category,value].join(' ').toLocaleLowerCase()};
  });
  const empty=el('p','empty-state','没有找到匹配的平台，试试其他关键词或分类。');
  filters.replaceChildren();
  function render(){
    clearTimeout(timer);timer=0;
    const query=search.value.trim().toLocaleLowerCase();
    if(sort.value==='name'&&!nameOrder){const collator=new Intl.Collator('zh-CN');nameOrder=records.slice().sort((a,b)=>collator.compare(a.item.name,b.item.name));}
    const order=sort.value==='name'?nameOrder:sort.value==='recent'?records.slice().sort((a,b)=>(Number(visits[b.key])||0)-(Number(visits[a.key])||0)):records;
    const fragment=document.createDocumentFragment();let size=0;
    for(const record of order)if((category==='全部'||(record.item.category||'其他')===category)&&record.search.includes(query)){fragment.append(record.tile);size++;}
    if(!size)fragment.append(empty);grid.replaceChildren(fragment);count.textContent=`${size} / ${records.length} 个入口`;
  }
  for(const name of ['全部',...new Set(records.map(r=>r.item.category||'其他'))]){const button=el('button','filter-button',name);button.type='button';button.setAttribute('aria-pressed',String(name===category));filters.append(button);}
  filters.addEventListener('click',event=>{const button=event.target.closest('button');if(!button)return;category=button.textContent;for(const other of filters.children)other.setAttribute('aria-pressed',String(other===button));render();},options);
  grid.addEventListener('click',event=>{const card=event.target.closest('.social-card');if(!card||card.disabled)return;const record=records[Number(card.dataset.index)];if(!record)return;visits[record.key]=Date.now();storage.set('visits',JSON.stringify(visits));if(record.copying)copy(record.value,record.item.name);},options);
  search.addEventListener('input',event=>{clearTimeout(timer);if(!event.isComposing)timer=setTimeout(render,80);},options);
  search.addEventListener('compositionend',render,options);sort.addEventListener('change',render,options);render();
  return ()=>{events.abort();clearTimeout(timer);records.length=0;nameOrder=null;};
});
