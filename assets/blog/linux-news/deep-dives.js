// Progressive enhancement only. No storage, telemetry, output collection or scan.
const de=document.documentElement.lang==='de';
for(const pre of document.querySelectorAll('.deep-dive pre[data-copy]')){
  const controls=document.createElement('div');controls.className='copy-control';
  const status=document.createElement('span');status.className='copy-status';status.setAttribute('role','status');
  const button=document.createElement('button');button.type='button';button.textContent=de?'Befehl kopieren':'Copy command';
  button.setAttribute('aria-label',(de?'Kopieren: ':'Copy: ')+pre.dataset.copy);
  button.addEventListener('click',async()=>{
    try{await navigator.clipboard.writeText(pre.textContent);status.textContent=de?'Kopiert.':'Copied.';}
    catch{status.textContent=de?'Bitte den Befehl markieren und manuell kopieren.':'Select the command and copy it manually.';}
  });
  controls.append(status,button);pre.after(controls);
}
for(const guide of document.querySelectorAll('[data-reader-guide]')){
  const select=guide.querySelector('select');
  if(select){
    guide.querySelector('[data-selector]').hidden=false;
    const update=()=>{
      for(const panel of guide.querySelectorAll('[data-guide-panel]')){
        const selected=select.value==='all'||panel.dataset.guidePanel===select.value;
        panel.hidden=!selected;
        if(selected&&panel.tagName==='DETAILS')panel.open=select.value!=='all';
      }
    };
    select.addEventListener('change',update);update();
  }
  const checks=[...guide.querySelectorAll('input[type=checkbox]')],progress=guide.querySelector('[data-progress]');
  if(checks.length&&progress){
    const update=()=>{const n=checks.filter(c=>c.checked).length;progress.textContent=de?`${n} von ${checks.length} Punkten geprüft. Das ist kein Sicherheitsnachweis.`:`${n} of ${checks.length} checks reviewed. This is not a security assessment.`;};
    checks.forEach(c=>c.addEventListener('change',update));update();
    const reset=guide.querySelector('[data-reset]');reset.hidden=false;
    reset.addEventListener('click',()=>{checks.forEach(c=>c.checked=false);update();});
  }
}
