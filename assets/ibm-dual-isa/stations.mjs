// Presentation only. Existing DOM and simulation contexts stay mounted.
export function mountStations({onLeave=()=>{},formatPosition}) {
  const panels=[...document.querySelectorAll('[data-station]')];
  const navigation=document.getElementById('station-navigation');
  const tablist=document.getElementById('station-tabs');
  const tabs=[...tablist.querySelectorAll('[data-station-target]')];
  const position=document.getElementById('station-position');
  let active=null;

  function stationForHash() {
    let id;
    try { id=decodeURIComponent(location.hash.slice(1)); } catch { return null; }
    if(id==='application')id='services'; // Also accept the station's new English name.
    const target=document.getElementById(id);
    return panels.find(panel=>panel===target||panel.contains(target))?.id||null;
  }

  function select(id,{historyEntry=false,focusPanel=false,restoreView=true}={}) {
    const index=panels.findIndex(panel=>panel.id===id);
    if(index<0)return;
    if(id===active){
      tabs.forEach((tab,i)=>{tab.tabIndex=i===index?0:-1;});
      if(focusPanel)document.getElementById('heading-'+id).focus({preventScroll:true});
      return;
    }
    const scrollY=window.scrollY;
    const navTop=navigation.getBoundingClientRect().top;
    const focusWasInOldPanel=panels.some(panel=>panel.id===active&&panel.contains(document.activeElement));
    if(active!==null)onLeave(active);
    active=id;
    panels.forEach((panel,i)=>{
      panel.hidden=i!==index;
      tabs[i].setAttribute('aria-selected',String(i===index));
      tabs[i].tabIndex=i===index?0:-1;
    });
    position.textContent=formatPosition(index+1,panels.length);
    if(historyEntry){
      const url=new URL(location.href);url.hash=id;
      history.pushState({...history.state,dualIsaStation:id},'',url);
    }
    if(focusPanel)document.getElementById('heading-'+id).focus({preventScroll:true});
    else if(focusWasInOldPanel)tabs[index].focus({preventScroll:true});
    // Tab clicks keep the bar in place; bottom pagination returns to this same bar.
    // Instant scrolling also respects reduced-motion preferences.
    if(restoreView)window.scrollTo({top:navTop<0?scrollY+navTop:scrollY,behavior:'instant'});
  }

  // Enhance ordinary anchors and sections only after the runtime has initialized.
  tablist.setAttribute('role','tablist');
  tablist.setAttribute('aria-orientation','horizontal');
  panels.forEach((panel,index)=>{
    panel.setAttribute('role','tabpanel');
    panel.setAttribute('aria-labelledby',tabs[index].id);
    panel.tabIndex=0;
    tabs[index].setAttribute('role','tab');
    tabs[index].setAttribute('aria-controls',panel.id);
  });
  for(const link of document.querySelectorAll('[data-station-target]')){
    link.addEventListener('click',event=>{
      if(event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
      event.preventDefault();
      select(link.dataset.stationTarget,{historyEntry:true,focusPanel:!tablist.contains(link)});
    });
  }
  // Manual-activation tabs: arrows/Home/End move focus; Enter or Space selects.
  tablist.addEventListener('keydown',event=>{
    const index=tabs.indexOf(document.activeElement);
    if(index<0||event.ctrlKey||event.metaKey||event.altKey)return;
    let next;
    if(event.key==='ArrowRight')next=(index+1)%tabs.length;
    if(event.key==='ArrowLeft')next=(index+tabs.length-1)%tabs.length;
    if(event.key==='Home')next=0;
    if(event.key==='End')next=tabs.length-1;
    if(next!==undefined){
      event.preventDefault();
      tabs.forEach((tab,i)=>{tab.tabIndex=i===next?0:-1;});
      tabs[next].focus({preventScroll:true});
    }else if(event.key===' '||event.key==='Enter'){
      event.preventDefault();select(tabs[index].dataset.stationTarget,{historyEntry:true});
    }
  });
  const fromHistory=()=>{const id=stationForHash();if(id||!location.hash)select(id||panels[0].id);};
  window.addEventListener('popstate',fromHistory);
  window.addEventListener('hashchange',fromHistory);
  select(stationForHash()||panels[0].id,{restoreView:false});
  document.documentElement.dataset.stationsReady='true';
}
