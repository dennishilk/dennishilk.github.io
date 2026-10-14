"""Independent, test-only py7zr Zstandard variants (never a runtime dependency)."""
import pathlib
import sys
import py7zr
root = pathlib.Path(sys.argv[1])
root.mkdir(parents=True, exist_ok=True)
filters = [{'id': py7zr.FILTER_ZSTD, 'level': 3}, {'id': py7zr.FILTER_CRYPTO_AES256_SHA256}]
with py7zr.SevenZipFile(root/'zstd-header-encrypted.7z', 'w', password='7', header_encryption=True, filters=filters) as z:
    z.writestr(b'Independent Zstandard encrypted-header fixture\n', 'folder/sample.txt')
with py7zr.SevenZipFile(root/'zstd-unsafe.7z', 'w', password='7', filters=filters) as z:
    z.writestr(b'Never write this outside the isolated output directory\n', 'safe.txt')
    z.header.files_info.files[0]['filename'] = '../escape.txt'
with py7zr.SevenZipFile(root/'zstd-over-limit.7z', 'w', password='7', filters=filters) as z:
    z.writestr(b'x'*(17*1024*1024), 'oversized.txt')
with py7zr.SevenZipFile(root/'zstd-unencrypted.7z', 'w', filters=[{'id':py7zr.FILTER_ZSTD, 'level':3}]) as z:
    z.writestr(b'No password recovery needed\n', 'plain.txt')
with py7zr.SevenZipFile(root/'unsupported-lzma.7z', 'w', password='7', filters=[{'id':py7zr.FILTER_LZMA}, {'id':py7zr.FILTER_CRYPTO_AES256_SHA256}]) as z:
    z.writestr(b'Outside the validated codec allowlist\n', 'plain.txt')
with py7zr.SevenZipFile(root/'zstd-invalid-properties.7z', 'w', password='7', filters=filters) as z:
    z.writestr(b'Unsupported two-byte codec properties\n', 'plain.txt')
    for coder in z.header.main_streams.unpackinfo.folders[0].coders:
        if coder['method'] == b'\x04\xf7\x11\x01':
            coder['properties'] = b'\x01\x05'

# A genuine frame requesting a 64 MiB decoder window, despite tiny output.
# This exercises the native window-allocation policy after AES decryption.
import py7zr.compressor as codecs
original_classes = codecs.algorithm_class_map[py7zr.FILTER_ZSTD]
class LargeWindowCompressor(codecs.ZstdCompressor):
    def __init__(self, level):
        self.compressor = codecs.zstd.ZstdCompressor(options={codecs.zstd.CompressionParameter.window_log: 26})
try:
    codecs.algorithm_class_map[py7zr.FILTER_ZSTD] = (LargeWindowCompressor, original_classes[1])
    with py7zr.SevenZipFile(root/'zstd-window-limit.7z', 'w', password='7', filters=filters) as z:
        z.writestr(b'Large declared window, tiny output\n', 'window.txt')
finally:
    codecs.algorithm_class_map[py7zr.FILTER_ZSTD] = original_classes
