"""Test-only independent parsers. Never imported or served by the application."""
import hashlib
import pathlib
import sys
import tempfile
import py7zr
from pypdf import PdfReader

root = pathlib.Path(sys.argv[1])
r = PdfReader(root / 'test-pdf-aes256-test9.pdf')
assert r.pdf_header == '%PDF-2.0' and r.is_encrypted
security = r.trailer['/Encrypt']
assert security['/Filter'] == '/Standard'
assert security['/R'] == 6 and security['/V'] == 5 and security['/Length'] == 256
assert security['/CF']['/StdCF']['/CFM'] == '/AESV3'
assert r.decrypt('wrong') == 0 and r.decrypt('test9') == 1
assert len(r.pages) == 1 and 'ARCHIVE RECOVERY LAB' in r.pages[0].extract_text()
expected = {
    'scripts/py7zr': (111, 'b0385e71d6a07eb692f5fb9798e9d33aaf87be7dfff936fd2473eab2a593d4fd'),
    'setup.cfg': (58, 'ff77878e070c4ba52732b0c847b5a055a7c454731939c3217db4a7fb4a1e7240'),
    'setup.py': (559, 'b916eed2a4ee4e48c51a2b51d07d450de0be4dbb83d20e67f6fd166ff7921e49'),
}
with tempfile.TemporaryDirectory() as directory:
    out = pathlib.Path(directory)
    with py7zr.SevenZipFile(root / 'test-7z-secret.7z', password='secret') as z:
        assert z.needs_password()
        assert set(z.archiveinfo().method_names) == {'ZStandard', '7zAES'}
        folder = z.header.main_streams.unpackinfo.folders[0]
        aes = next(c for c in folder.coders if c['method'] == b'\x06\xf1\x07\x01')
        assert aes['properties'][0] & 0x3f == 19  # 2^19 SHA-256 KDF cycles
        z.extractall(out)
    assert {str(p.relative_to(out)) for p in out.rglob('*') if p.is_file()} == set(expected)
    for name, (size, sha) in expected.items():
        data = (out / name).read_bytes()
        assert len(data) == size and hashlib.sha256(data).hexdigest() == sha
    try:
        with py7zr.SevenZipFile(root / 'test-7z-secret.7z', password='wrong') as z:
            z.extractall(out / 'wrong')
    except Exception:
        pass
    else:
        raise AssertionError('Wrong 7Z password unexpectedly extracted')
print('Independent original PDF R6 / original 7Z AES+Zstandard verification passed')
