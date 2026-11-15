/* No external gallery library. Shows only image files that really exist. */
(function(){
  "use strict";
  function init(gallery){
    var manifest=gallery.querySelector('[data-wow-gallery-manifest]');
    var photo=gallery.querySelector('[data-wow-gallery-image]');
    var imageLink=gallery.querySelector('[data-wow-gallery-link]');
    var openLink=gallery.querySelector('[data-wow-gallery-open]');
    var saveLink=gallery.querySelector('[data-wow-gallery-save]');
    var caption=gallery.querySelector('[data-wow-gallery-caption]');
    var counter=gallery.querySelector('[data-wow-gallery-counter]');
    var thumbs=gallery.querySelector('[data-wow-gallery-thumbs]');
    var prev=gallery.querySelector('[data-wow-gallery-prev]');
    var next=gallery.querySelector('[data-wow-gallery-next]');
    if(!manifest||!photo||!imageLink||!openLink||!saveLink||!caption||!counter||!thumbs||!prev||!next)return;
    var sources;
    try { sources=JSON.parse(manifest.textContent); }
    catch(e){ return; }
    if(!Array.isArray(sources))return;
    var pictures=[],current=0,locale=gallery.getAttribute('lang')==='en'?'en':'de';
    function show(index){
      if(!pictures.length)return;
      current=(index+pictures.length)%pictures.length;
      var item=pictures[current];
      photo.src=item.src;
      photo.alt=item.alt||item.caption||'WoW Forever screenshot';
      imageLink.href=item.src;
      openLink.href=item.src;
      saveLink.href=item.src;
      saveLink.download=item.src.split('/').pop();
      caption.textContent=item.caption||'';
      counter.textContent=String(current+1)+' / '+String(pictures.length);
      Array.prototype.forEach.call(thumbs.children,function(button,i){
        button.setAttribute('aria-current',i===current?'true':'false');
        button.tabIndex=i===current?0:-1;
      });
      prev.disabled=pictures.length<2;
      next.disabled=pictures.length<2;
    }
    function verify(item){
      if(!item||typeof item.src!=='string'||!item.src.startsWith('/assets/blog/wow-forever/'))return Promise.resolve(null);
      return fetch(item.src,{method:'HEAD'}).then(function(response){
        return response.ok?item:null;
      }).catch(function(){return null;});
    }
    Promise.all(sources.map(verify)).then(function(verified){
      pictures=verified.filter(Boolean);
      if(!pictures.length)return;
      thumbs.textContent='';
      pictures.forEach(function(item,i){
        var button=document.createElement('button');
        button.type='button';
        button.setAttribute('aria-label',(locale==='de'?'Bild ':'Image ')+String(i+1)+': '+(item.caption||''));
        var img=document.createElement('img');
        img.src=item.src;
        img.alt='';
        img.loading='lazy';
        img.decoding='async';
        button.appendChild(img);
        button.addEventListener('click',function(){show(i);});
        thumbs.appendChild(button);
      });
      var preferred=pictures.findIndex(function(x){return /beach-sunset/.test(x.src);});
      show(preferred>=0?preferred:0);
      prev.addEventListener('click',function(){show(current-1);});
      next.addEventListener('click',function(){show(current+1);});
      gallery.addEventListener('keydown',function(event){
        if(event.key==='ArrowLeft'){event.preventDefault();show(current-1);}
        if(event.key==='ArrowRight'){event.preventDefault();show(current+1);}
      });
      var start=null;
      var stage=gallery.querySelector('.wow-gallery-stage');
      if(stage){
        stage.addEventListener('touchstart',function(event){start=event.touches[0].clientX;},{passive:true});
        stage.addEventListener('touchend',function(event){
          if(start===null)return;
          var delta=event.changedTouches[0].clientX-start;start=null;
          if(Math.abs(delta)>55){show(current+(delta<0?1:-1));}
        },{passive:true});
      }
    });
  }
  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',function(){document.querySelectorAll('[data-wow-gallery]').forEach(init);});
  }else{document.querySelectorAll('[data-wow-gallery]').forEach(init);}
}());
