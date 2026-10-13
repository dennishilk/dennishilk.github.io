// Shared by deterministic build-time indexing and legacy regression fixtures.
export function* wordForms(word,variants=false,leet=false){
  const classic={a:'4',e:'3',i:'1',o:'0',s:'5',t:'7'},symbols={a:'@',i:'!',o:'0',s:'$'};
  const forms=leet?[word,word.replace(/[aeiost]/g,c=>classic[c]),word.replace(/[aios]/g,c=>symbols[c])]:[word];
  for(const form of forms){yield form;if(variants){yield form[0].toUpperCase()+form.slice(1);yield form.toUpperCase();}}
}
