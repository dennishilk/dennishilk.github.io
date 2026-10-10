#!/usr/bin/env node
// Compare independent versioned index builds; does not alter either directory.
import { readFileSync,writeFileSync } from 'node:fs';
import { join } from 'node:path';
const [before,after,output]=process.argv.slice(2);
if(!before||!after||!output)throw Error('Usage: node scripts/compare-kernel-driver-index.mjs BASE_DIR CANDIDATE_DIR OUTPUT.md');
const json=(dir,name)=>JSON.parse(readFileSync(join(dir,name),'utf8'));
const a=json(before,'manifest.json'),b=json(after,'manifest.json');
if(a.schema!==2||b.schema!==2)throw Error('Require two schema-2 indexes');
const rows=(dir,bus)=>{
 const table=json(dir,bus+'.json'); const set=new Set();
 const accept=entries=>{for(const e of entries||[])set.add(JSON.stringify(e));};
 accept(table.generic);for(const v of Object.values(table.vendor)){
  accept(v.broad);for(const list of Object.values(v.exact))accept(list);
 }
 return set;
};
let md=`# Kernel-driver index review\n\nBase: ${a.kernelRelease}\nCandidate: ${b.kernelRelease}\n\n| Bus | Old | New | Added | Removed |\n|---|---:|---:|---:|---:|\n`;
for(const bus of ['pci','usb','hid']){
 const x=rows(before,bus),y=rows(after,bus),added=[...y].filter(v=>!x.has(v)),removed=[...x].filter(v=>!y.has(v));
 md+=`| ${bus} | ${x.size} | ${y.size} | ${added.length} | ${removed.length} |\n`;
 md+=`\n## ${bus} changes (first 30 each)\n\nAdded:\n${added.slice(0,30).map(v=>'- `'+v+'`').join('\n')||'- None'}\n\nRemoved:\n${removed.slice(0,30).map(v=>'- `'+v+'`').join('\n')||'- None'}\n`;
}
md+='\nReview source provenance, matching changes, automated tests and scope before publishing.\n';
writeFileSync(output,md);
console.log('Wrote '+output);
