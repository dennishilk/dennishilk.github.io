#!/usr/bin/env python3
"""Original exact explanatory graphics; no photographs or simulated screenshots."""
from pathlib import Path
from html import escape
from PIL import Image, ImageDraw, ImageFont
root=Path(__file__).resolve().parent.parent
out=root/'assets/blog/mt7612u';out.mkdir(parents=True,exist_ok=True)
font='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
for lang in ['de','en']:
 de=lang=='de'
 steps=[('USB erkannt','USB detected','lsusb','Kennung vorhanden; noch kein WLAN.','Device ID present; Wi-Fi not established.'),('Treiber gebunden','Driver bound','lsusb -t','Driver=mt76x2u am richtigen Port.','Driver=mt76x2u on the correct port.'),('Firmware geladen','Firmware loaded','journalctl -k -b','Anforderung und Initialisierung prüfen.','Check requests and initialization.'),('Interface vorhanden','Interface registered','iw dev','WLAN-Gerät sichtbar; Verbindung offen.','Wireless device exists; link still separate.'),('Verbindung hergestellt','Connection established','iw dev INTERFACE link','Danach IP, Route und DNS prüfen.','Then check IP, routing and DNS.')]
 for mobile in [False,True]:
  w,h=(620,1060) if mobile else (1200,760)
  title='Vom USB-Port ins WLAN' if de else 'From USB port to Wi-Fi'
  svg=[f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}" role="img" aria-labelledby="title desc">',f'<title id="title">{title}</title><desc id="desc">'+escape(' → '.join(x[0 if de else 1] for x in steps))+'</desc>',f'<rect width="{w}" height="{h}" rx="22" fill="#0d1520"/>', '<g font-family="DejaVu Sans, sans-serif">',f'<text x="36" y="49" fill="#76dbea" font-size="18">MT7612U / LINUX / DIAGNOSE</text>',f'<text x="36" y="91" fill="#edf5fc" font-size="{28 if mobile else 36}" font-weight="bold">{title}</text>']
  for i,s in enumerate(steps):
   y=(135+i*170) if mobile else (130+i*112);x=36;bw=w-72;bh=142 if mobile else 92
   svg+=[f'<rect x="{x}" y="{y}" width="{bw}" height="{bh}" rx="12" fill="#152636" stroke="#2b6077"/>',f'<text x="58" y="{y+34}" fill="#edf5fc" font-size="{23 if mobile else 25}" font-weight="bold">{escape(s[0 if de else 1])}</text>']
   if mobile:
    svg += [f'<text x="58" y="{y+72}" fill="#75deef" font-size="21" font-family="monospace">{escape(s[2])}</text>',f'<text x="58" y="{y+111}" fill="#bccddc" font-size="18">{escape(s[3 if de else 4])}</text>']
   else:
    svg += [f'<text x="620" y="{y+34}" fill="#75deef" font-size="22" font-family="monospace">{escape(s[2])}</text>',f'<text x="58" y="{y+66}" fill="#bccddc" font-size="20">{escape(s[3 if de else 4])}</text>']
   if i<4:
    yy=y+bh;svg += [f'<path d="M {w/2} {yy} v {28 if mobile else 20}" stroke="#60cee2" stroke-width="2"/>']
  svg += [f'<text x="36" y="{h-26}" fill="#9cafc0" font-size="17">dennishilk.com · '+('Quellenbasiertes Schema, kein Hardwaretest' if de else 'Source-based schematic, not a hardware test')+'</text></g></svg>']
  (out/f'diagnosis-{lang}{"-mobile" if mobile else ""}.svg').write_text('\n'.join(svg)+'\n')
 im=Image.new('RGB',(1200,630),'#0d1520');d=ImageDraw.Draw(im)
 def text(x,y,s,size,color):d.text((x,y),s,font=ImageFont.truetype(font,size),fill=color)
 text(60,48,'LINUX / USB WI-FI / PRACTICAL GUIDE',22,'#76dbea');text(60,104,'MediaTek MT7612U',58,'#edf5fc')
 text(60,188,'Treiber, Firmware & WLAN' if de else 'Driver, firmware & Wi-Fi',34,'#c1d5e5')
 for i,(label,cmd) in enumerate([('USB','lsusb'),('Driver','mt76x2u'),('Firmware','mt7662'),('Wi-Fi','iw dev')]):
  x=60+i*275;d.rounded_rectangle((x,290,x+250,454),radius=12,fill='#152636',outline='#2b6077',width=2);text(x+20,314,label,28,'#edf5fc');text(x+20,378,cmd,24,'#76dbea')
 text(60,522,'Debian 13 · Ubuntu · Linux Mint · Arch Linux',26,'#c1d5e5');text(60,574,'Dennis Hilk · dennishilk.com',21,'#9cafc0');im.save(out/f'social-{lang}.png',optimize=True)
