#!/usr/bin/env python3
"""Original vector explanatory figures and raster social cards. No measured data."""
from pathlib import Path
from html import escape
from PIL import Image, ImageDraw, ImageFont
import textwrap
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'assets/blog/linux-audio-rescue'
OUT.mkdir(parents=True,exist_ok=True)
BG='#0b1017'; LINE='#355068'; TEXT='#e9eef5'; MUTED='#acbfd1'; BLUE='#76d2fa'; GREEN='#93dfc1'; AMBER='#e5b47c'
def label(x,y,s,size=22,color=TEXT,anchor='start',weight=400):
 return f'<text x="{x}" y="{y}" fill="{color}" font-size="{size}" text-anchor="{anchor}" font-weight="{weight}">{escape(s)}</text>'
def rect(x,y,w,h,color='#142332',stroke=LINE):
 return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="14" fill="{color}" stroke="{stroke}"/>'
def arrow(x1,y1,x2,y2,dashed=False):
 return f'<path d="M{x1},{y1} L{x2},{y2}" stroke="{GREEN if dashed else BLUE}" stroke-width="2.5" fill="none" marker-end="url(#arrow)" '+('stroke-dasharray="7 6"' if dashed else '')+'/>'
def box(x,y,w,h,title,sub='',accent=BLUE,font=22):
 lines=textwrap.wrap(sub,32) if w==364 else [sub]
 return rect(x,y,w,h)+label(x+20,y+34,title,font,accent,weight=650)+''.join(label(x+20,y+62+i*22,line,19 if w==364 else 16,MUTED) for i,line in enumerate(lines) if line)
def make(name,lang,mobile=False):
 de=lang=='de'; pick=lambda en,ger: ger if de else en
 w,h=(420,960) if mobile else (1040,700)
 titles={'architecture':pick('How Linux audio fits together','So hängt Linux-Audio zusammen'),'failures':pick('Find the failing layer','Die fehlerhafte Ebene finden'),'silence':pick('When the beginning disappears','Wenn der Anfang verschwindet'),'decisions':pick('The next check follows the evidence','Der nächste Schritt folgt dem Befund')}
 desc={'architecture':pick('Solid = audio · dashed = policy','Durchgezogen = Audio · gestrichelt = Policy'),'failures':pick('An observation is a lead, not a verdict.','Ein Befund ist ein Hinweis, kein Urteil.'),'silence':pick('Illustrative sequence · no measured durations','Schematischer Ablauf · keine gemessenen Zeiten'),'decisions':pick('Simplified map · more branches in the assistant','Vereinfachte Karte · mehr Zweige im Assistenten')}
 s=[f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}" role="img" aria-labelledby="title desc"><title id="title">{escape(titles[name])}</title><desc id="desc">{escape(desc[name])}</desc><defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10" fill="{BLUE}"/></marker></defs><rect width="100%" height="100%" fill="{BG}"/><g font-family="DejaVu Sans, sans-serif">',label(28 if mobile else 48,40 if mobile else 44,'DENNIS HILK / LINUX AUDIO RESCUE',11 if mobile else 13,BLUE,weight=650)]
 for i,l in enumerate(textwrap.wrap(titles[name],25 if mobile else 58)):
  s.append(label(28 if mobile else 48,(80 if mobile else 98)+i*34,l,23 if mobile else 32,weight=650))
 y0=160 if mobile else 146
 if name=='architecture':
  if mobile:
   s += [box(28,y0,364,75,pick('Applications','Anwendungen'),pick('Browser · game · recorder','Browser · Spiel · Rekorder')),arrow(210,235,210,258),box(28,264,364,86,pick('API / compatibility','API / Kompatibilität'),pick('Native · PulseAudio · ALSA · JACK','Nativ · PulseAudio · ALSA · JACK')),arrow(210,350,210,372),box(28,378,364,75,'PipeWire',pick('Audio graph / stream processing','Audiograph / Stream-Verarbeitung')),arrow(210,453,210,482),box(28,488,364,78,pick('ALSA / kernel','ALSA / Kernel'),pick('Local drivers and PCM interfaces','Treiber und PCM-Interfaces')),arrow(210,566,210,590),box(28,596,364,78,pick('Local audio hardware','Lokale Audiohardware'),pick('DAC · speakers · microphone','DAC · Lautsprecher · Mikrofon'))]
   s += [rect(28,704,364,90,'#102921',GREEN),label(48,738,pick('WirePlumber = policy','WirePlumber = Policy'),22,GREEN,weight=650),label(48,768,pick('Controls devices, routes and links','Steuert Geräte, Routen und Links'),17,MUTED),arrow(380,704,380,436,True)]
   s += [label(28,832,pick('Bluetooth: PipeWire → BlueZ','Bluetooth: PipeWire → BlueZ'),18,BLUE),label(28,862,pick('→ radio / headset (not ALSA)','→ Funk / Headset (nicht ALSA)'),18,MUTED),label(28,914,pick('Solid: audio · dashed: control','Linie: Audio · gestrichelt: Steuerung'),15,MUTED)]
  else:
   s += [box(48,y0,570,82,pick('Applications','Anwendungen'),pick('Browser · game · recorder','Browser · Spiel · Rekorder')),arrow(330,228,330,247),box(48,253,570,82,pick('API / compatibility','API / Kompatibilität'),pick('Native · pipewire-pulse · ALSA plugin · JACK','Nativ · pipewire-pulse · ALSA-Plugin · JACK')),arrow(330,335,330,354),box(48,360,570,82,'PipeWire',pick('Audio graph and stream processing','Audiograph und Stream-Verarbeitung')),arrow(330,442,330,462),box(48,468,570,82,pick('ALSA / kernel','ALSA / Kernel'),pick('Local drivers / PCM interfaces','Lokale Treiber / PCM-Interfaces')),arrow(330,550,330,570),box(48,576,570,80,pick('Local audio hardware','Lokale Audiohardware'),pick('DAC · speakers · microphone','DAC · Lautsprecher · Mikrofon'))]
   s += [box(682,253,310,106,'WirePlumber',pick('Policy / device management','Policy / Geräteverwaltung'),GREEN),arrow(682,310,618,395,True),arrow(682,334,618,502,True),box(682,468,310,94,'BlueZ / Bluetooth',pick('Separate audio transport','Eigener Audiotransport')),arrow(618,402,826,468),label(682,600,pick('Dashed links control the graph.','Gestrichelte Links steuern.'),15,GREEN),label(682,625,pick('They do not carry audio here.','Sie transportieren hier kein Audio.'),15,MUTED)]
 elif name=='failures':
  items=[(pick('Application','Anwendung'),pick('Mute, permission, selected backend','Mute, Freigabe, gewähltes Backend')),(pick('Server connection','Serververbindung'),pick('User, runtime, socket, bridge','Benutzer, Runtime, Socket, Brücke')),(pick('Policy and routing','Policy und Routing'),pick('Profile, port, target, stream','Profil, Port, Ziel, Stream')),('ALSA / kernel',pick('Card, PCM, firmware, ownership','Karte, PCM, Firmware, Besitzer')),(pick('Physical link / receiver','Verbindung / Empfänger'),pick('Cable, power, clock, signal lock','Kabel, Strom, Clock, Signallock'))]
  for i,(title,sub) in enumerate(items):
   y=y0+i*(142 if mobile else 100);s += [box(28 if mobile else 48,y,364 if mobile else 944,100 if mobile else 80,f'{i+1:02}  {title}',sub,font=21 if mobile else 23)]
   if i<4:s.append(arrow(210 if mobile else 520,y+(100 if mobile else 80),210 if mobile else 520,y+(136 if mobile else 95)))
  s.append(label(28 if mobile else 48,935 if mobile else 682,pick('Go deeper only when evidence points there.','Nur nach Befund tiefer gehen.'),15,MUTED))
 elif name=='silence':
  items=[(pick('Playback','Wiedergabe'),pick('Receiver already synchronized','Empfänger bereits synchron')),(pick('Pause / seek / silence','Pause / Spulen / Stille'),pick('Stream may stop or disconnect','Stream kann stoppen / trennen')),(pick('Possible idle transition','Möglicher Leerlaufwechsel'),pick('Node suspend OR receiver mute','Node-Suspend ODER Receiver-Mute')),(pick('Playback resumes','Wiedergabe startet erneut'),pick('Device / receiver may need time','Gerät / Empfänger braucht evtl. Zeit')),(pick('Opening sound may be lost','Anfangston kann fehlen'),pick('Cause and duration vary by setup','Ursache und Dauer variieren'))]
  for i,(title,sub) in enumerate(items):
   y=y0+i*(143 if mobile else 101);s += [box(28 if mobile else 112,y,364 if mobile else 816,100 if mobile else 80,title,sub,AMBER if i in (2,4) else BLUE,font=20 if mobile else 23)]
   if i<4:s.append(arrow(210 if mobile else 520,y+(100 if mobile else 80),210 if mobile else 520,y+(137 if mobile else 96)))
  s.append(label(28 if mobile else 112,935 if mobile else 680,pick('Schematic only — not a recording.','Nur Schema — keine Aufzeichnung.'),16,MUTED))
 else:
  if mobile:
   seq=[(pick('Can wpctl connect?','Verbindet sich wpctl?'),pick('No → user / socket / service','Nein → Benutzer / Socket / Dienst')),(pick('Expected ALSA card?','Erwartete ALSA-Karte?'),pick('No → bus / driver / firmware','Nein → Bus / Treiber / Firmware')),(pick('Expected sink / profile?','Ausgang / Profil vorhanden?'),pick('No → profile / policy / journal','Nein → Profil / Policy / Journal')),(pick('Correct route and volume?','Route und Pegel richtig?'),pick('No → selected target / mute','Nein → Zielwahl / Mute')),(pick('Still no clear cause?','Ursache noch unklar?'),pick('Keep evidence; avoid blind fixes','Befunde sichern; nichts blind ändern'))]
   for i,(title,sub) in enumerate(seq):
    y=y0+i*142;s.append(box(28,y,364,100,title,sub,font=20))
    if i<4:s.append(arrow(210,y+100,210,y+137))
  else:
   s += [box(48,154,410,90,pick('Can wpctl connect?','Verbindet sich wpctl?'),pick('No → session / socket / service','Nein → Sitzung / Socket / Dienst')),box(574,154,418,90,pick('Expected ALSA card?','Erwartete ALSA-Karte?'),pick('No → bus / driver / firmware','Nein → Bus / Treiber / Firmware')),arrow(458,199,568,199),label(486,184,pick('yes','ja'),15,GREEN),box(574,308,418,90,pick('Expected sink / profile?','Ausgang / Profil vorhanden?'),pick('No → policy / profile / journal','Nein → Policy / Profil / Journal')),arrow(783,244,783,302),label(798,278,pick('yes','ja'),15,GREEN),box(48,308,410,90,pick('Correct route and volume?','Route und Pegel richtig?'),pick('No → target / mute / mixer','Nein → Ziel / Mute / Mixer')),arrow(574,353,464,353),label(486,338,pick('yes','ja'),15,GREEN),box(48,483,944,106,pick('Still no clear cause? Preserve the evidence.','Ursache noch unklar? Befunde sichern.'),pick('Compare app, transport, timing and resume — one variable at a time.','App, Transport, Timing und Resume vergleichen — eine Variable pro Test.')),arrow(253,398,253,477),label(48,640,pick('This map is a summary, not the complete interactive tree.','Diese Karte ist eine Zusammenfassung, nicht der vollständige Fehlerfinder.'),17,MUTED)]
 s.append('</g></svg>')
 (OUT/f'{name}-{lang}{"-mobile" if mobile else ""}.svg').write_text(''.join(s)+'\n')
for lang in ['en','de']:
 for name in ['architecture','failures','silence','decisions']:
  make(name,lang);make(name,lang,True)
 # Raster social preview: original typography and signal motif, no fake terminal.
 image=Image.new('RGB',(1200,630),BG);d=ImageDraw.Draw(image)
 font='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf';bold='/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
 f=lambda size,b=False: ImageFont.truetype(bold if b else font,size)
 d.rounded_rectangle((32,32,1168,598),radius=24,outline=LINE,width=2)
 d.text((72,64),'DENNIS HILK / LINUX FIX LAB',font=f(18,True),fill=BLUE)
 d.text((72,125),'Linux Audio',font=f(66,True),fill=TEXT);d.text((72,205),'Rescue',font=f(66,True),fill=BLUE)
 lines=['Kein Ton? Erst verstehen.','Dann gezielt reparieren.'] if lang=='de' else ['No sound? Understand it.','Then make a focused repair.']
 for i,line in enumerate(lines):d.text((76,318+i*42),line,font=f(28),fill=TEXT)
 d.text((76,455),'14 '+('Diagnoseeinstiege' if lang=='de' else 'symptom paths')+'  /  DE + EN',font=f(21,True),fill=GREEN)
 d.text((76,531),'PipeWire · WirePlumber · ALSA · Bluetooth',font=f(20),fill=MUTED)
 for i,bar in enumerate([50,100,160,90,220,130,270,190,100]):
  x=828+i*30;d.rounded_rectangle((x,300-bar/2,x+12,300+bar/2),radius=6,fill=BLUE if i%2==0 else GREEN)
 image.save(OUT/f'social-{lang}.png',optimize=True)
print('Built 16 localized SVG figures and two 1200×630 PNG social previews.')
