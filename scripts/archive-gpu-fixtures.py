"""Independent RAR5 fixture writer: Python hashlib + cryptography, no app code.
MIT: assets/archive-recovery-lab/LICENSE.gpu. RARLAB format specification:
https://www.rarlab.com/technote.htm . Fixed public test data, never private input.
"""
import hashlib,zlib,struct,pathlib
from cryptography.hazmat.primitives.ciphers import Cipher,algorithms,modes
v=lambda n:bytes([n]) if n<128 else bytes([(n&127)|128])+v(n>>7)
p32=lambda n:struct.pack('<I',n)
def block(body):
 b=v(len(body))+body;return p32(zlib.crc32(b))+b
def keys(password,salt):
 key=hashlib.pbkdf2_hmac('sha256',password.encode(),salt,32768,32)
 p=hashlib.pbkdf2_hmac('sha256',password.encode(),salt,32800,32)
 check=bytes(p[i]^p[i+8]^p[i+16]^p[i+24] for i in range(8))
 return key,check+hashlib.sha256(check).digest()[:4]
def encrypt(data,key,iv):
 e=Cipher(algorithms.AES(key),modes.CBC(iv)).encryptor();return e.update(data+bytes((-len(data))%16))+e.finalize()
password='7';salt=bytes(range(16));key,check=keys(password,salt)
raw=bytes([82,97,114,33,26,7,1,0])+block(v(4)+v(0)+v(0)+v(1)+bytes([15])+salt+check)
def header(body,n):
 iv=bytes([n])*16;return iv+encrypt(block(body),key,iv)
raw+=header(v(1)+v(0)+v(0),1)
plain=b'Independent Python RAR5 AES-256 fixture\n';fsalt=bytes(range(16,32));fkey,fcheck=keys(password,fsalt);iv=bytes([3])*16;data=encrypt(plain,fkey,iv)
record=v(1)+v(0)+v(1)+bytes([15])+fsalt+iv+fcheck;extra=v(len(record))+record;name=b'folder/sample.txt'
body=v(2)+v(3)+v(len(extra))+v(len(data))+v(4)+v(len(plain))+v(32)+p32(zlib.crc32(plain))+v(0)+v(0)+v(len(name))+name+extra
raw+=header(body,2)+data+header(v(5)+v(0)+v(0),4)
out=pathlib.Path(__import__('sys').argv[1] if len(__import__('sys').argv)>1 else 'tests/fixtures/archive-recovery')
out.mkdir(parents=True,exist_ok=True)
(out/'rar5-header-gpu-7.rar').write_bytes(raw)
print(hashlib.sha256(raw).hexdigest())
