
/* Progressive enhancement: the game archive is fully visible without JS. */
(()=>{'use strict';
const root=document.querySelector('[data-game-browser]');if(!root)return;
const q=root.querySelector('[data-game-search]'),buttons=[...root.querySelectorAll('[data-era-filter]')],groups=[...root.querySelectorAll('[data-game-era]')],status=root.querySelector('[data-results]');
let selected='all';
const norm=s=>(s||'').toLocaleLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
function update(){
 const needle=norm(q.value.trim());let count=0;
 for(const group of groups){
  const active=selected==='all'||group.dataset.gameEra===selected;let shown=0;
  for(const li of group.querySelectorAll('li')){const show=active&&norm(li.textContent).includes(needle);li.hidden=!show;if(show){shown++;count++}}
  group.hidden=!shown;
 }
 buttons.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.eraFilter===selected)));
 status.textContent=count+(document.documentElement.lang==='de'?' Spiele in der persönlichen Sammlung':' games in the personal archive');
}
q.addEventListener('input',update);
buttons.forEach(btn=>btn.addEventListener('click',()=>{selected=btn.dataset.eraFilter;update()}));
update();
})();
