#!/usr/bin/env python3
"""Provision pinned local model/runtime artifacts. No packages or server config changes.

Example (run by the site owner after reviewing docs):
python3 scripts/prepare-snakkie-assets.py --output /absolute/path/to/assets/snakkie/local-ai
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import shutil
import tarfile
import tempfile
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = json.loads((ROOT / 'assets/snakkie/artifacts.json').read_text())


def checksum(path):
    digest = hashlib.sha256()
    with path.open('rb') as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b''):
            digest.update(chunk)
    return digest.hexdigest()


def present(path, sha):
    if not path.exists():
        return False
    if checksum(path) != sha:
        raise RuntimeError(f'Existing file has a different checksum; refusing to replace: {path}')
    print(f'Verified existing: {path.name}', flush=True)
    return True


def download(url, destination, sha, size=None):
    if present(destination, sha):
        return
    destination.parent.mkdir(parents=True, exist_ok=True)
    partial = destination.with_name(destination.name + '.part')
    if partial.exists():
        raise RuntimeError(f'Incomplete earlier download exists; inspect/remove it first: {partial}')
    try:
        request = urllib.request.Request(url, headers={'User-Agent': 'Snakkie-assets/0.2'})
        with urllib.request.urlopen(request, timeout=90) as response, partial.open('xb') as output:
            loaded, last = 0, -1
            while chunk := response.read(1024 * 1024):
                loaded += len(chunk)
                if size and loaded > size:
                    raise RuntimeError('Download larger than pinned model size')
                output.write(chunk)
                if loaded // 25000000 != last:
                    last = loaded // 25000000
                    print(f'{destination.name}: {loaded / 1000000:.0f} MB', flush=True)
        if size and loaded != size:
            raise RuntimeError(f'Wrong size for {destination.name}: {loaded}, expected {size}')
        if checksum(partial) != sha:
            raise RuntimeError(f'SHA-256 mismatch: {destination.name}')
        os.replace(partial, destination)
    except BaseException:
        partial.unlink(missing_ok=True)
        raise


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, required=True, help='Directory served as /assets/snakkie/local-ai/')
    parser.add_argument('--model', choices=['qwen17', 'qwen3', 'qwen25', 'all'], default='qwen17')
    parser.add_argument('--dry-run', action='store_true')
    args = parser.parse_args()
    out = args.output.resolve()
    runtime = MANIFEST['runtime']
    chosen = list(MANIFEST['models'].values()) if args.model == 'all' else [MANIFEST['models'][args.model]]
    print(f'Destination: {out}')
    for model in chosen:
        print(f"{model['name']} | {model['license']} | {model['bytes']} bytes | {model['source']}")
    print(f"Runtime: wllama {runtime['version']} (MIT), approximately 9 MB installed")
    if args.dry_run:
        return
    out.mkdir(parents=True, exist_ok=True)
    runtime_dir = out / ('wllama-' + runtime['version'])
    runtime_dir.mkdir(exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='.snakkie-assets-', dir=out) as work:
        archive = Path(work) / 'wllama.tgz'
        targets = [('package/esm/index.js', 'index.js', runtime['moduleSHA256']),
                   ('package/esm/wasm/wllama.wasm', 'wllama.wasm', runtime['wasmSHA256'])]
        needed = [(member, name, sha) for member, name, sha in targets if not present(runtime_dir / name, sha)]
        if needed:
            download(runtime['archive'], archive, runtime['sha256'])
            with tarfile.open(archive, 'r:gz') as package:
                for member, name, sha in needed:
                    # Only these exact regular files are extracted; no archive paths are trusted.
                    info = package.getmember(member)
                    if not info.isfile():
                        raise RuntimeError(f'Unexpected archive member: {member}')
                    temp = Path(work) / name
                    with package.extractfile(info) as source, temp.open('xb') as target:
                        shutil.copyfileobj(source, target)
                    if checksum(temp) != sha:
                        raise RuntimeError(f'Runtime checksum mismatch: {name}')
                    os.replace(temp, runtime_dir / name)
    for model in chosen:
        download(model['source'], out / 'models' / model['file'], model['sha256'], model['bytes'])
    licenses = ROOT / 'assets/snakkie/licenses'
    shutil.copy2(licenses / 'WLLAMA-MIT.txt', runtime_dir / 'LICENSE.txt')
    (out / 'models').mkdir(exist_ok=True)
    shutil.copy2(licenses / 'QWEN-APACHE-2.0.txt', out / 'models' / 'LICENSE.txt')
    print('All requested artifacts verified. No nginx/service/system changes were made.')


if __name__ == '__main__':
    main()
