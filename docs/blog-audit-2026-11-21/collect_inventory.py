import json, re, subprocess
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urljoin, urlsplit, unquote
from collections import Counter

import argparse
parser=argparse.ArgumentParser(description='Read-only blog metadata, pairing and local-reference inventory')
parser.add_argument('--root',type=Path,default=Path(__file__).resolve().parents[2])
parser.add_argument('--output',type=Path,default=Path(__file__).resolve().parent/'inventory.json')
args=parser.parse_args()
ROOT=args.root.resolve()
OUT=args.output
ORIGIN = 'https://www.dennishilk.com'

class Page(HTMLParser):
    def __init__(self, source):
        super().__init__(convert_charrefs=True)
        self.tags=[]; self.ids=[]; self.text=[]; self.h1=[]; self.title=[]; self.ld=[]
        self.capture=None; self.buffer=[]; self.hidden=0; self.in_head=False
        self.feed(source)
    def handle_starttag(self, tag, attrs):
        a=dict(attrs); self.tags.append((tag,a))
        if tag=='head':self.in_head=True
        if a.get('id'): self.ids.append(a['id'])
        if tag=='h1' or (tag=='title' and self.in_head) or (tag=='script' and a.get('type')=='application/ld+json'):
            self.capture=tag; self.buffer=[]
        if tag in ['script','style']:self.hidden+=1
        if tag in ['h1','h2','h3','h4','p','li','pre','tr','section']:self.text.append('\n')
    def handle_startendtag(self, tag, attrs): self.handle_starttag(tag,attrs)
    def handle_endtag(self,tag):
        if tag==self.capture:
            value=''.join(self.buffer)
            if tag=='h1':self.h1.append(value)
            elif tag=='title':self.title.append(value)
            else:
                try:self.ld.append(json.loads(value))
                except Exception as e:self.ld.append({'parse_error':str(e)})
            self.capture=None
        if tag=='head':self.in_head=False
        if tag in ['script','style']:self.hidden=max(0,self.hidden-1)
    def handle_data(self,data):
        if self.capture:self.buffer.append(data)
        if not self.hidden:self.text.append(data)
    def meta(self,name):return next((a.get('content','') for t,a in self.tags if t=='meta' and (a.get('name')==name or a.get('property')==name)),None)
    def link(self,rel):return [a for t,a in self.tags if t=='link' and a.get('rel')==rel]

def nodes(obj):
    if isinstance(obj,list):
        for o in obj:yield from nodes(o)
    elif isinstance(obj,dict):
        yield obj
        for x in obj.values():yield from nodes(x)

def local(url,base):
    u=urlsplit(urljoin(base,url))
    if u.netloc not in ['www.dennishilk.com','dennishilk.com']:return None
    p=ROOT/unquote(u.path).lstrip('/')
    if p.is_dir() or u.path.endswith('/'):p=p/'index.html'
    return p,u

cache={}
def page(path):
    if path not in cache:cache[path]=Page(path.read_text())
    return cache[path]

def inspect(path):
    p=page(path); url=ORIGIN+'/'+path.relative_to(ROOT).as_posix().removesuffix('index.html')
    alts={a.get('hreflang'):a.get('href') for a in p.link('alternate') if a.get('hreflang')}
    blog=next((n for n in nodes(p.ld) if n.get('@type')=='BlogPosting'),{})
    issues=[]; links=[]; sources=[]; images=[]; scripts=[]
    if len(p.h1)!=1:issues.append(['h1_count',len(p.h1)])
    if len(p.title)!=1:issues.append(['title_count',len(p.title)])
    if not p.meta('description'):issues.append(['description_missing'])
    if [a.get('href') for a in p.link('canonical')]!=[url]:issues.append(['canonical',p.link('canonical')])
    if not blog:issues.append(['BlogPosting_missing'])
    if p.meta('article:modified_time') and blog.get('dateModified') and p.meta('article:modified_time')[:10]!=blog['dateModified'][:10]:issues.append(['modified_date_mismatch',p.meta('article:modified_time'),blog['dateModified']])
    for field in ['datePublished','dateModified','inLanguage','author','mainEntityOfPage','headline','description']:
        if not blog.get(field):issues.append(['schema_missing',field])
    for key in ['de','en','x-default']:
        if not alts.get(key):issues.append(['hreflang_missing',key])
    for aurl in alts.values():
        loc=local(aurl,url)
        if not loc or not loc[0].exists():issues.append(['alternate_missing',aurl])
        elif {a.get('hreflang'):a.get('href') for a in page(loc[0]).link('alternate') if a.get('hreflang')}!=alts:issues.append(['alternate_reciprocity',aurl])
    for tag,a in p.tags:
        values=[]
        if tag=='a' and a.get('href'): values.append(('link',a['href']))
        if tag in ['img','source','script','iframe','video','audio'] and a.get('src'):values.append((tag,a['src']))
        if tag=='link' and a.get('rel') in ['stylesheet','icon'] and a.get('href'):values.append((tag,a['href']))
        if tag=='video' and a.get('poster'):values.append(('poster',a['poster']))
        if tag in ['img','source'] and a.get('srcset'):
            values.extend(('srcset',s.strip().split()[0]) for s in a['srcset'].split(',') if s.strip())
        if tag=='img':
            images.append(a)
            if 'alt' not in a:issues.append(['image_alt_missing',a.get('src')])
        if tag=='script' and a.get('src'):scripts.append(a['src'])
        for kind,value in values:
            if value.startswith(('mailto:','tel:','data:','javascript:')):continue
            loc=local(value,url)
            if loc:
                target,u=loc
                if not target.exists():issues.append(['local_missing',kind,value])
                elif u.fragment and target.suffix=='.html' and unquote(u.fragment) not in page(target).ids:
                    issues.append(['fragment_missing',value])
                if kind=='link':links.append(value)
            elif kind=='link':sources.append(value)
    for value in [p.meta('og:image'),p.meta('twitter:image')]+([blog.get('image')] if isinstance(blog.get('image'),str) else []):
        if value:
            loc=local(value,url)
            if loc and not loc[0].exists():issues.append(['social_image_missing',value])
    for id_,num in Counter(p.ids).items():
        if num>1:issues.append(['duplicate_id',id_,num])
    gitdate=subprocess.check_output(['git','log','-1','--format=%cI','--',str(path.relative_to(ROOT))],cwd=ROOT,text=True).strip()
    return dict(path=str(path.relative_to(ROOT)),url=url,title=p.title,h1=p.h1,category=blog.get('articleSection'),published=blog.get('datePublished'),modified=blog.get('dateModified'),last_git_change=gitdate,description=p.meta('description'),seo=dict(canonical=p.link('canonical'),og_title=p.meta('og:title'),og_description=p.meta('og:description'),og_image=p.meta('og:image'),og_modified=p.meta('article:modified_time'),twitter_card=p.meta('twitter:card'),blog_posting=blog,breadcrumbs=any(n.get('@type')=='BreadcrumbList' for n in nodes(p.ld)),optional_schema_fields_missing=[f for f in ['publisher','image'] if not blog.get(f)]),alternates=alts,image_count=len(images),images=images,external_links=list(dict.fromkeys(sources)),internal_links=list(dict.fromkeys(links)),scripts=scripts,issues=issues)

def main():
    de=sorted((ROOT/'de/blog').glob('*/index.html'))
    pairs=[]
    for f in de:
        d=inspect(f); english=local(d['alternates'].get('en',''),d['url'])
        pairs.append(dict(slug=f.parent.name,de=d,en=inspect(english[0]) if english and english[0].is_file() else None))
    result=dict(snapshot_commit=subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip(),audit_date='2026-11-21',count=len(pairs),articles=pairs)
    OUT.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
    print('Topics:',len(pairs),'English:',sum(bool(p['en']) for p in pairs))
    for pair in pairs:
        for lang in ['de','en']:
            a=pair[lang]
            if a and a['issues']:print(a['path'],json.dumps(a['issues'],ensure_ascii=False))
    print('External URLs:',len(set(u for p in pairs for lang in ['de','en'] if p[lang] for u in p[lang]['external_links'])))

if __name__=='__main__':main()
