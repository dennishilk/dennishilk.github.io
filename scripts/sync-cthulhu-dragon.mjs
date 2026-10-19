// Refresh from the canonical public repository after its changes are committed.
// node scripts/sync-cthulhu-dragon.mjs --from ../cthulhu
import {readFileSync,writeFileSync,mkdirSync,copyFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const position=process.argv.indexOf('--from');
if(position<0||!process.argv[position+1])throw Error('Supply --from /path/to/cthulhu');
const repo=resolve(process.argv[position+1]),directory='WM/xmonad/nixos-kanagawa-dragon';
const git=(...args)=>execFileSync('git',['-C',repo,...args],{encoding:'utf8'}).trim();
if(git('branch','--show-current')!=='main'||git('status','--porcelain'))throw Error('Source must be a clean main checkout');
const root=resolve(import.meta.dirname,'..','content/cthulhu-dragon'),source=resolve(repo,directory);
const paths=JSON.parse(readFileSync(resolve(source,'docs/files.json'),'utf8'));
const data={repository:'dennishilk/cthulhu',revision:git('rev-parse','HEAD'),directory,files:{}};
for(const path of paths){
  if(path.includes('..')||path.startsWith('/'))throw Error('Unsafe inventory path');
  const target=resolve(root,'files',path);mkdirSync(dirname(target),{recursive:true});copyFileSync(resolve(source,path),target);
  data.files[path]=createHash('sha256').update(readFileSync(target)).digest('hex');
}
for(const lang of ['en','de'])copyFileSync(resolve(source,'INSTALL.'+lang+'.md'),resolve(root,'guide.'+lang+'.md'));
writeFileSync(resolve(root,'source.json'),JSON.stringify(data,null,2)+'\n');
console.log('Synced '+paths.length+' files from '+data.revision);
