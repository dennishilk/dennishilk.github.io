#!/usr/bin/env python3
"""Opt-in editorial HTTPS audit. Never used by the browser or mandatory offline tests."""
import argparse
import concurrent.futures
import hashlib
import json
from pathlib import Path
import re
import subprocess
import urllib.error
import urllib.request

ROOT = Path(__file__).resolve().parent.parent
parser = argparse.ArgumentParser()
parser.add_argument('--cache', required=True, type=Path)
parser.add_argument('--output', required=True, type=Path)
args = parser.parse_args()
args.cache.mkdir(parents=True, exist_ok=True)
profiles = sum([json.loads(p.read_text()) for p in sorted((ROOT / 'content/linux-hardware-explorer/research').glob('*.json'))], [])
knowledge = json.loads(subprocess.check_output(['node', '--input-type=module', '-e', "import {knowledge} from './content/linux-hardware-explorer/knowledge.mjs'; process.stdout.write(JSON.stringify(knowledge));"], cwd=ROOT))
urls = sorted(set(s['url'].split('#')[0] for p in profiles + knowledge for s in p['sources']))

def audit(url):
    fetch = url
    m = re.match(r'https://github.com/([^/]+/[^/]+)/blob/([a-f0-9]{40})/(.+)', url)
    if m:
        fetch = f'https://raw.githubusercontent.com/{m[1]}/{m[2]}/{m[3]}'
    key = hashlib.sha256(fetch.encode()).hexdigest()
    target = args.cache / key
    result = {'url': url, 'fetchUrl': fetch}
    for attempt in range(2):
        try:
            if target.exists():
                data = target.read_bytes()
                result.update(status=200, cached=True)
            else:
                request = urllib.request.Request(fetch, headers={'User-Agent': 'Linux-Hardware-Explorer-Editorial-Source-Audit/1.0'})
                with urllib.request.urlopen(request, timeout=20) as response:
                    data = response.read(4_000_001)
                    if len(data) > 4_000_000:
                        raise ValueError('source-size-limit')
                    result.update(status=response.status, resolved=response.url, contentType=response.headers.get('Content-Type', ''))
                target.write_bytes(data)
            result.update(sha256=hashlib.sha256(data).hexdigest(), bytes=len(data))
            result.pop('error', None)
            return result
        except (urllib.error.URLError, ValueError, TimeoutError) as error:
            result.update(error=str(error), status=getattr(error, 'code', None))
    return result

records = []
with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
    for result in pool.map(audit, urls):
        records.append(result)
        if len(records) % 25 == 0:
            print(f'Checked {len(records)}/{len(urls)} primary resources', flush=True)
output = {'schemaVersion': 1, 'reviewed': '2026-10-10', 'method': 'Direct HTTPS; immutable GitHub blob resources inspected via raw.githubusercontent.com',
          'profileCount': len(profiles), 'resources': records}
args.output.parent.mkdir(parents=True, exist_ok=True)
args.output.write_text(json.dumps(output, ensure_ascii=False, indent=2) + '\n')
failures = [r for r in records if r.get('status') != 200 or 'error' in r]
print(json.dumps({'resources': len(records), 'verified': len(records)-len(failures), 'failures': failures}, ensure_ascii=False), flush=True)
raise SystemExit(bool(failures))
