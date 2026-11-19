// Copy only authored commands. Outputs intentionally have no copy control.
const de=document.documentElement.lang==='de';
if(navigator.clipboard?.writeText){
  for(const pre of document.querySelectorAll('.mt7612u-guide pre[data-copy]')){
    const tools=document.createElement('div');tools.className='command-tools';
    const button=document.createElement('button');button.type='button';button.textContent=de?'Befehl kopieren':'Copy command';
    const status=document.createElement('span');status.setAttribute('role','status');
    button.addEventListener('click',async()=>{
      try{await navigator.clipboard.writeText(pre.querySelector('code').textContent);status.textContent=de?'Kopiert.':'Copied.';}
      catch{status.textContent=de?'Bitte den Befehl von Hand kopieren.':'Please copy the command manually.';}
    });tools.append(button,status);pre.after(tools);
  }
}
