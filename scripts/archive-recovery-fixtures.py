"""Independent fixtures: Python stdlib + cryptography, not the browser ZIP engine."""
import base64,hashlib,hmac,json,struct,zlib
from cryptography.hazmat.primitives.ciphers import Cipher,algorithms,modes
p16=lambda n:struct.pack('<H',n);p32=lambda n:struct.pack('<I',n)
crc_table=[]
for n in range(256):
 for _ in range(8):n=(n>>1)^(0xedb88320 if n&1 else 0)
 crc_table.append(n)
def zipcrypto(raw,password,check):
 keys=[0x12345678,0x23456789,0x34567890]
 def update(n):
  keys[0]=(keys[0]>>8)^crc_table[(keys[0]^n)&255];keys[1]=((keys[1]+(keys[0]&255))*134775813+1)&0xffffffff;keys[2]=(keys[2]>>8)^crc_table[(keys[2]^(keys[1]>>24))&255]
 for n in password.encode():update(n)
 result=bytearray()
 for n in bytes(range(11))+bytes([check])+raw:
  t=keys[2]|2;result.append(n^(((t*(t^1))>>8)&255));update(n)
 return bytes(result)
def archive(password,method='aes256',version=2,compression=8,names=('folder/hello.txt','empty.txt'),zip64=False):
 local=bytearray();central=bytearray()
 for index,name in enumerate(names):
  plain=('Independent encrypted fixture — grüße!\n'.encode() if index==0 and name!='empty-only.txt' else b'');crc=zlib.crc32(plain);raw=zlib.compress(plain,wbits=-15) if compression==8 else plain
  extra=b'';flags=0x801;wire_method=compression;checksum=crc;needed=20
  if method=='zipcrypto':payload=zipcrypto(raw,password,crc>>24)
  else:
   strength={'aes128':1,'aes192':2,'aes256':3}[method];keybytes={1:16,2:24,3:32}[strength];salt=bytes(range(keybytes//2));derived=hashlib.pbkdf2_hmac('sha1',password.encode(),salt,1000,2*keybytes+2)
   encryptor=Cipher(algorithms.AES(derived[:keybytes]),modes.ECB()).encryptor();ciphertext=bytearray()
   for block in range(0,len(raw),16):
    mask=encryptor.update((block//16+1).to_bytes(16,'little'));ciphertext.extend(a^b for a,b in zip(raw[block:block+16],mask))
   ciphertext=bytes(ciphertext);payload=salt+derived[-2:]+ciphertext+hmac.new(derived[keybytes:2*keybytes],ciphertext,hashlib.sha1).digest()[:10]
   extra=p16(0x9901)+p16(7)+p16(version)+b'AE'+bytes([strength])+p16(compression);wire_method=99;needed=51;checksum=crc if version==1 else 0
  filename=name.encode();offset=len(local);size=len(payload);u=len(plain)
  lextra=extra+(p16(1)+p16(16)+struct.pack('<QQ',u,size) if zip64 else b'');cextra=extra+(p16(1)+p16(24)+struct.pack('<QQQ',u,size,offset) if zip64 else b'')
  zsize=0xffffffff if zip64 else size;zusize=0xffffffff if zip64 else u;zoffset=0xffffffff if zip64 else offset
  local+=p32(0x04034b50)+p16(max(needed,45) if zip64 else needed)+p16(flags)+p16(wire_method)+p16(0)+p16(33)+p32(checksum)+p32(zsize)+p32(zusize)+p16(len(filename))+p16(len(lextra))+filename+lextra+payload
  central+=p32(0x02014b50)+p16(20)+p16(max(needed,45) if zip64 else needed)+p16(flags)+p16(wire_method)+p16(0)+p16(33)+p32(checksum)+p32(zsize)+p32(zusize)+p16(len(filename))+p16(len(cextra))+p16(0)+p16(0)+p16(0)+p32(0)+p32(zoffset)+filename+cextra
 offset=len(local);local+=central;count=len(names)
 if zip64:
  zoffset=len(local);local+=p32(0x06064b50)+struct.pack('<QHHIIQQQQ',44,45,45,0,0,count,count,len(central),offset);local+=p32(0x07064b50)+p32(0)+struct.pack('<Q',zoffset)+p32(1)
 local+=p32(0x06054b50)+p16(0)+p16(0)+p16(65535 if zip64 else count)*2+p32(0xffffffff if zip64 else len(central))+p32(0xffffffff if zip64 else offset)+p16(0)
 return base64.b64encode(local).decode()
fixtures={}
for method in ['zipcrypto','aes128','aes192','aes256']:
 for compression in [0,8]:
  for version in ([1,2] if method!='zipcrypto' else [1]):fixtures[f'{method}-{compression}-{version}']=archive('päss🔐',method,version,compression)
fixtures['zip64']=archive('7','aes256',zip64=True)
fixtures['empty-aes']=archive('7','aes256',names=('empty-only.txt',))
fixtures['empty-zipcrypto']=archive('7','zipcrypto',names=('empty-only.txt',))
fixtures['unsafe']=archive('7',names=('../escape.txt',))
fixtures['duplicate']=archive('7',names=('same.txt','SAME.txt'))
fixtures['unsupported-compression']=archive('7',compression=12)
print(json.dumps(fixtures))
