"""Merge licensed lexical snapshots and curated themes; never credential data.
Inputs: original german.txt + esdb80.txt from pinned ESDB query + ssa-names.zip.
The existing bundled lists are preserved as the stable leading segment.
"""
from pathlib import Path
from collections import Counter
import argparse,json,re,hashlib,unicodedata,zipfile,shutil
args=argparse.ArgumentParser();args.add_argument('--sources-dir',type=Path,required=True);args=args.parse_args()
root=Path(__file__).resolve().parents[1]/'assets/password-cracking-lab/wordlists';src=args.sources_dir
manifest=json.loads((root/'sources.json').read_text());curation=json.loads((root/'curated-themes.json').read_text());groups=curation['categories']
def sha(b):return hashlib.sha256(b).hexdigest()
def ascii_word(w):
 w=w.replace('’',"'").lower().replace('ä','ae').replace('ö','oe').replace('ü','ue').replace('ß','ss')
 return ''.join(c for c in unicodedata.normalize('NFKD',w) if not unicodedata.combining(c))
def eligible(w):return bool(re.fullmatch('[ -~]{1,20}',w))
def preserve_and_append(old,new):return list(dict.fromkeys(old+[w for w in new if eligible(w)]))
old={l:(root/(name+'.txt')).read_text().splitlines() for l,name in [('de','german'),('en','english'),('common','common')]}
original={l:dict(manifest[l]['datasets'][0] if 'datasets' in manifest[l] else manifest[l]) for l in old}
de_raw=(src/'german.txt').read_bytes();de_words={ascii_word(w.strip()) for w in de_raw.decode('utf-8').splitlines()};de_words={w for w in de_words if re.fullmatch('[a-z]{1,20}',w)};de_selected=sorted(de_words,key=lambda w:(len(w),w))[:210000]
en_raw=(src/'esdb80.txt').read_bytes();en_words={ascii_word(w.strip()) for w in en_raw.decode('utf-8').splitlines()};en_selected=sorted((w for w in en_words if re.fullmatch("[a-z'-]{1,20}",w)),key=lambda w:(len(w),w))
ssa_raw=(src/'ssa-names.zip').read_bytes();z=zipfile.ZipFile(src/'ssa-names.zip');names=Counter();years=[]
for file in z.namelist():
 if not re.fullmatch('yob[0-9]{4}\\.txt',file):continue
 years.append(int(file[3:7]))
 for line in z.read(file).decode('utf-8').splitlines():
  name,sex,count=line.split(',');name=ascii_word(name)
  if re.fullmatch('[a-z]{1,20}',name):names[name]+=int(count)
given=sorted(names,key=lambda w:(-names[w],w))[:15000]
# Bound aliases to explicit names: no arbitrary actor/game/name cross products.
aliases=[]
for name in groups['popculture']+groups['games_music']:
 normalized=ascii_word(name)
 aliases.extend([normalized,re.sub('[ -]','',normalized),re.sub('[ -]+','-',normalized)])
de_curated=[ascii_word(w) for w in groups['de_compounds']+groups['de_colloquial']+groups['it_culture']]
en_curated=[ascii_word(w) for w in groups['en_compounds_slang']+groups['it_culture']]
common_curated=[ascii_word(w) for w in groups['it_culture']+groups['password_themes']+groups['de_colloquial']+groups['en_compounds_slang']]+aliases
new={'de':preserve_and_append(old['de'],de_selected+de_curated),'en':preserve_and_append(old['en'],en_selected+en_curated),'common':preserve_and_append(old['common'],common_curated+given)}
ssa_info={'url':'https://www.ssa.gov/oact/babynames/limits.html','downloadUrl':'https://www.ssa.gov/oact/babynames/names.zip','sourceSha256':sha(ssa_raw),'period':[min(years),max(years)],'selected':len(given),'minimumAggregatedBirthCount':names[given[-1]],'license':'U.S. federal government statistical data; public domain in the United States (17 USC 105)','selection':'Top 15000 distinct ASCII first names by summed national birth counts, all included annual files; alphabetical tie-break. No individuals, dates of birth or credentials.'}
esdb_info={'url':'https://github.com/en-wl/wordlist/tree/7e99edab8e32f9f9ea2b15f249ca8d4d67237410','revision':'7e99edab8e32f9f9ea2b15f249ca8d4d67237410','sourceSha256':sha(en_raw),'selected':len(en_selected),'license':'SCOWL permission notice and upstream source notices; see LICENSE-ESDB80.txt','command':'./scowl word-list 80 A,B,Z,C 5 --deaccent --wo-usage-notes=offensive-1,offensive-2','selection':'Size <=80, US/GB/CA spellings, variants <=5; source-tagged offensive categories omitted; lower ASCII letters/apostrophes/hyphens 1–20; deduplicate; valid current vocabulary includes less frequent words.'}
curated_info={'url':'/assets/password-cracking-lab/wordlists/curated-themes.json','sourceSha256':sha((root/'curated-themes.json').read_bytes()),'license':'CC0-1.0','categories':{k:len(v) for k,v in groups.items()},'selection':curation['joinedNamePolicy']}
for language,filename in [('de','german'),('en','english'),('common','common')]:
 values=new[language];assert set(old[language])<=set(values)
 raw=('\n'.join(values)+'\n').encode('utf-8');(root/(filename+'.txt')).write_bytes(raw)
 entry=dict(original[language]);entry.update({'selected':len(values),'bundledSha256':sha(raw),'baselineSelected':original[language]['selected'],'newUnique':len(values)-original[language]['selected'],'datasets':[original[language],curated_info]})
 if language=='de':entry.update({'limit':210000,'selection':'Preserve previous bundled leading segment; append first 210000 eligible source words by length/alphabet and curated German/IT themes','datasets':[original['de'],{'url':original['de']['url'],'sourceSha256':sha(de_raw),'selected':len(de_selected),'limit':210000,'license':'CC0-1.0'},curated_info]})
 if language=='en':entry.update({'url':esdb_info['url'],'selection':'Preserve baseline, append ESDB80 eligible vocabulary and curated conversational/IT themes','datasets':[original['en'],esdb_info,curated_info]})
 if language=='common':entry.update({'selection':'Preserve existing public test-list baseline; append curated theme aliases and aggregated public given-name statistics; no new leaked credentials','datasets':[original['common'],curated_info,ssa_info]})
 manifest[language]=entry
shutil.copyfile(src/'esdb80-Copyright',root/'LICENSE-ESDB80.txt')
(root/'LICENSE-SSA.txt').write_text('Source: U.S. Social Security Administration national baby-name statistics.\nhttps://www.ssa.gov/oact/babynames/limits.html\nAggregated first-name counts only; names occurring fewer than five times per geographic area/year are suppressed by the publisher.\nU.S. federal government work: public domain in the United States under 17 USC 105.\nhttps://www.copyright.gov/title17/92chap1.html#105\nThis derivative keeps only generic first names, ranked across the published annual files, without person-level records or credentials.\n')
(root/'sources.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
print({language:{'before':len(old[language]),'after':len(new[language])} for language in old})
