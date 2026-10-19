// Progressive enhancement: all configurations remain visible/selectable without JS.
(() => {
  const de=document.documentElement.lang==='de';
  for(const block of document.querySelectorAll('.code-block')){
    const button=document.createElement('button');button.type='button';button.className='copy-code';
    const label=de?'Kopieren':'Copy';button.textContent=label;
    button.setAttribute('aria-label',(de?'Vollständigen Code kopieren: ':'Copy complete code: ')+block.querySelector('figcaption span').textContent);
    const feedback=document.createElement('span');feedback.className='sr-only';feedback.setAttribute('role','status');
    block.querySelector('figcaption').append(button,feedback);
    button.addEventListener('click',async()=>{
      try{await navigator.clipboard.writeText(block.querySelector('code').textContent);button.textContent=de?'Kopiert':'Copied';feedback.textContent=de?'Code kopiert.':'Code copied.';}
      catch{button.textContent=de?'Code markieren':'Select code';feedback.textContent=de?'Bitte den Code markieren und kopieren.':'Please select and copy the code.';}
      setTimeout(()=>{button.textContent=label;feedback.textContent='';},2200);
    });
  }
})();
