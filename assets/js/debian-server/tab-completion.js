import { normalizePath } from './path-utils.js';

function activeWord(source, cursor) {
  let start=0,quote='';
  for(let i=0;i<cursor;i++) {
    const char=source[i];
    if((char==='"'||char==="'")&&(!quote||quote===char))quote=quote? '':char;
    else if(/\s/.test(char)&&!quote)start=i+1;
  }
  const opening=(source[start]==='"'||source[start]==="'")?source[start]:'';
  return {start:start+(opening?1:0),text:source.slice(start+(opening?1:0),cursor),quote:opening};
}

/** Complete the word at the caret without changing logical shell state. */
export function completeTerminalInput(input, state, fs, commandNames, onCandidates=()=>{}) {
  const cursor=input.selectionStart??input.value.length,{start,text:needle,quote}=activeWord(input.value,cursor);
  const prefix=input.value.slice(0,start),isCommand=!prefix.trim(),home=state.environment?.HOME||'/home/visitor';
  let choices=[];
  if(isCommand&&!needle.includes('/')) choices=commandNames.filter(name=>name.startsWith(needle));
  else {
    const slash=needle.lastIndexOf('/'),dirPart=slash<0?'':needle.slice(0,slash+1),base=slash<0?needle:needle.slice(slash+1);
    const rawDirectory=dirPart||'.',expanded=rawDirectory==='~/'?home:rawDirectory.startsWith('~/')?home+rawDirectory.slice(1):rawDirectory;
    const path=normalizePath(expanded,state.currentDirectory);let directory=fs.get(path),canonicalDirectory=path;
    if(!directory){let node=fs.root,built='';for(const segment of path.split('/').filter(Boolean)){const direct=node?.children?.[segment],matches=direct?[direct]:Object.values(node?.children||{}).filter(x=>x.type==='directory'&&x.name.toLowerCase()===segment.toLowerCase());if(matches.length!==1){node=null;break;}node=matches[0];built+=`/${node.name}`;}directory=node;canonicalDirectory=built||'/';}
    if(directory?.type==='directory'&&!fs.denied(canonicalDirectory)) choices=Object.values(directory.children).filter(node=>node.name.startsWith(base)||(node.type==='directory'&&node.name.toLowerCase().startsWith(base.toLowerCase()))).map(node=>`${dirPart}${node.name}${node.type==='directory'?'/':''}`);
  }
  if(choices.length===1) {
    let replacement=choices[0];
    if(!quote&&replacement.includes(' '))replacement=replacement.replaceAll(' ','\\ ');
    input.value=input.value.slice(0,start)+replacement+input.value.slice(cursor);
    input.selectionStart=input.selectionEnd=start+replacement.length;
  } else if(choices.length>1) onCandidates(choices);
  return choices;
}
