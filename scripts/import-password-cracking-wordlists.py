from pathlib import Path
import unicodedata,re,json,hashlib,shutil
import argparse
parser=argparse.ArgumentParser(description='Import locally downloaded, pinned wordlist sources; runtime stays offline.')
parser.add_argument('--sources-dir',type=Path,required=True)
args=parser.parse_args()
src=args.sources_dir;root=Path(__file__).resolve().parents[1]/'assets/password-cracking-lab';dest=root/'wordlists';dest.mkdir(exist_ok=True)
def transliterate(word):
 word=word.replace('’',"'").lower().replace('ä','ae').replace('ö','oe').replace('ü','ue').replace('ß','ss')
 return ''.join(c for c in unicodedata.normalize('NFKD',word) if not unicodedata.combining(c))
def sha(data):return hashlib.sha256(data).hexdigest()
stats={};versions=json.loads((src/'versions.json').read_text())
raw=(src/'german.txt').read_bytes();lines=raw.decode('utf-8').splitlines();valid=set()
for line in lines:
 word=transliterate(line.strip())
 if re.fullmatch('[a-z]{1,20}',word):valid.add(word)
selected=sorted(valid,key=lambda w:(len(w),w))[:100000]
(dest/'german.txt').write_text('\n'.join(selected)+'\n');stats['de']={'sourceEntries':len(lines),'eligibleUnique':len(valid),'selected':len(selected),'limit':100000,'sourceSha256':sha(raw),'url':f"https://github.com/enz/german-wordlist/blob/{versions['de']}/words",'revision':versions['de'],'license':'CC0-1.0','selection':'ASCII transliteration; letters only, 1–20; deduplicate, order by length then ASCII lexicographic, first 100000'}
# Expand this release's explicit one-character Hunspell prefix/suffix rules.
# No guesses about grammar: only flags attached to each source headword apply.
aff=(src/'english.aff').read_bytes();rules={};cross={}
for line in aff.decode('utf-8').splitlines():
 parts=line.split()
 if not parts or parts[0] not in ['PFX','SFX']:continue
 kind,flag=parts[:2]
 if len(parts)==4:
  cross[(kind,flag)]=parts[2]=='Y';rules[(kind,flag)]=[]
 elif len(parts)==5:
  _,_,strip,add,condition=parts
  if '/' in add:raise ValueError('Continuation affix flags require a reviewed importer update')
  rules[(kind,flag)].append((strip if strip!='0' else '',add if add!='0' else '',condition))
 else:raise ValueError('Unexpected affix syntax')
def apply(word,kind,flag):
 for strip,add,condition in rules.get((kind,flag),[]):
  if not re.search(('^'+condition) if kind=='PFX' else (condition+'$'),word):continue
  if kind=='PFX':
   if not word.startswith(strip):continue
   yield add+word[len(strip):]
  else:
   if not word.endswith(strip):continue
   yield (word[:-len(strip)] if strip else word)+add
raw=(src/'english.dic').read_bytes();lines=raw.decode('utf-8').splitlines();valid=set()
for line in lines[1:]:
 parts=line.split('/');word=parts[0];flags=parts[1] if len(parts)>1 else ''
 if 'c' in flags:continue # ONLYINCOMPOUND in the pinned en_US affix file
 forms={word}
 for flag in flags:
  forms.update(apply(word,'SFX',flag));forms.update(apply(word,'PFX',flag))
  if cross.get(('PFX',flag)):
   for prefixed in apply(word,'PFX',flag):
    for suffix in flags:
     if cross.get(('SFX',suffix)):forms.update(apply(prefixed,'SFX',suffix))
 for form in forms:
  normalized=transliterate(form)
  if re.fullmatch("[a-z'-]{1,20}",normalized):valid.add(normalized)
selected=sorted(valid,key=lambda w:(len(w),w));(dest/'english.txt').write_text('\n'.join(selected)+'\n');stats['en']={'sourceEntries':len(lines)-1,'selected':len(selected),'sourceSha256':sha(raw),'affixSha256':sha(aff),'url':versions['englishUrl'],'revision':versions['en'],'license':'SCOWL permission notice (Kevin Atkinson) and Hunspell affix notice (Geoff Kuenning)','selection':"en_US headwords with only their explicit prefix/suffix flags and allowed cross-products expanded; numeric compound-only entries omitted; lowercase ASCII transliteration including apostrophes and hyphens; 1–20 characters; deduplicate and order by length then ASCII lexicographic"}
raw=(src/'common.txt').read_bytes();lines=raw.decode('utf-8').splitlines();selected=list(dict.fromkeys(w for w in lines if re.fullmatch('[ -~]{1,20}',w)));(dest/'common.txt').write_text('\n'.join(selected)+'\n');stats['common']={'sourceEntries':len(lines),'selected':len(selected),'sourceSha256':sha(raw),'url':f"https://github.com/danielmiessler/SecLists/blob/{versions['common']}/{versions['commonPath']}",'revision':versions['common'],'license':'MIT','selection':'Printable ASCII, 1–20; preserve exact source spelling and order; deduplicate. Published test list, not a claim about current password prevalence.'}
for original,name in [('german-COPYING','LICENSE-german-CC0.txt'),('english-Copyright','LICENSE-english-SCOWL.txt'),('common-LICENSE','LICENSE-common-MIT.txt'),('english-README','LICENSE-english-Hunspell.txt')]:shutil.copyfile(src/original,dest/name)
for language,name in [('de','german'),('en','english'),('common','common')]:stats[language]['bundledSha256']=sha((dest/(name+'.txt')).read_bytes())
(dest/'sources.json').write_text(json.dumps(stats,indent=2,ensure_ascii=False)+'\n')
print(json.dumps(stats,indent=2))
