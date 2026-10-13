(() => {
  'use strict';
  const normalize = value => String(value).toLowerCase().replace(/ß/g,'ss').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
  const matches = (entry,query,category='all') => (category==='all'||entry.category===category) && normalize(query).split(/\s+/).filter(Boolean).every(term=>entry.search.includes(term));
  // The same pure matching functions are used by the browser and regression tests.
  globalThis.MuseumCatalog = Object.freeze({normalize,matches});
  if(typeof document==='undefined')return;
  const root=document.querySelector('.museum-index');if(!root)return;
  const cards=[...root.querySelectorAll('.catalog-card')],labels=[...root.querySelectorAll('[data-en][data-de]')],filters=[...root.querySelectorAll('[data-filter]')];
  const input=document.getElementById('catalog-search'),clear=document.getElementById('catalog-clear'),count=document.getElementById('catalog-count'),empty=document.getElementById('catalog-empty');
  const entries=cards.map(card=>({card,category:card.dataset.category,href:card.getAttribute('href'),search:normalize([...card.querySelectorAll('[data-en]')].flatMap(node=>[node.dataset.en,node.dataset.de]).join(' ')+' '+card.dataset.keywords)}));
  let category='all',currentLanguage=null;
  const language=()=>document.documentElement.lang.startsWith('de')?'de':'en';
  function filter(){
    let visible=0;
    for(const entry of entries){entry.card.hidden=!matches(entry,input.value,category);if(!entry.card.hidden)visible++;}
    const de=language()==='de';count.textContent=de?(visible===entries.length?`${visible} Ausstellungen`:`${visible} von ${entries.length}`):(visible===entries.length?`${visible} exhibits`:`${visible} of ${entries.length}`);
    empty.hidden=visible!==0;clear.hidden=!input.value;filters.forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.filter===category)));
  }
  function translate(){
    const lang=language();if(lang===currentLanguage)return;currentLanguage=lang;
    for(const node of labels)node.textContent=node.dataset[lang];
    input.placeholder=lang==='de'?'Titel, Themen oder Epochen suchen…':'Search titles, topics or eras…';
    clear.setAttribute('aria-label',lang==='de'?'Suche leeren':'Clear search');
    root.querySelector('.catalog-filters').setAttribute('aria-label',lang==='de'?'Nach Thema filtern':'Filter by topic');
    root.querySelector('.catalog-specials').setAttribute('aria-label',lang==='de'?'Mehr entdecken':'More to explore');
    root.querySelector('.catalog-breadcrumb').setAttribute('aria-label',lang==='de'?'Seitennavigation':'Breadcrumb');
    document.querySelector('.catalog-skip').textContent=lang==='de'?'Zu den Ausstellungen springen':'Skip to exhibits';
    for(const entry of entries)entry.card.setAttribute('href',lang==='de'&&entry.card.dataset.nativeDe?entry.card.dataset.nativeDe:entry.href);
    filter();
  }
  function reset(){category='all';input.value='';filter();input.focus();}
  input.addEventListener('input',filter);input.addEventListener('keydown',event=>{if(event.key==='Escape'){input.value='';filter();}});
  clear.addEventListener('click',()=>{input.value='';filter();input.focus();});document.getElementById('catalog-reset').addEventListener('click',reset);
  for(const button of filters)button.addEventListener('click',()=>{category=button.dataset.filter;filter();});
  new MutationObserver(translate).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
  root.querySelector('.catalog-controls').hidden=false;translate();
  window.museumCatalogReady=true;
})();
