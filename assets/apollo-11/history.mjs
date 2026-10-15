// NASA MSC-00171, November 1969, Table 5-I, printed p. 5-13.
// These are historical GET times, NEVER the clock of our independent flight model.
export const events=[
 ['102:33:05','ignition','P63 · Powered descent ignition','P63 · Zündung des Abstiegstriebwerks'],
 ['102:37:51','radar','Landing radar data good','Gültige Landeradardaten'],
 ['102:38:22','1202','1202 · Executive overflow','1202 · Executive-Überlastung'],
 ['102:38:45','updates','Radar updates enabled','Radaraktualisierung freigegeben'],
 ['102:39:02','1202','1202 · Second alarm','1202 · Zweiter Alarm'],
 ['102:41:32','p64','P64 · Approach phase','P64 · Anflugphase'],
 ['102:42:18','1201','1201 · No VAC areas','1201 · Keine VAC-Bereiche frei'],
 ['102:42:43','1202','1202 · Fourth alarm','1202 · Vierter Alarm'],
 ['102:42:58','1202','1202 · Fifth alarm','1202 · Fünfter Alarm'],
 ['102:43:09','target','Landing-point redesignation','Neuwahl des Landepunkts'],
 ['102:43:22','p66','P66 · Rate-of-descent control','P66 · Sinkratensteuerung'],
 ['102:44:28','fuel','Low-level sensor indication','Anzeige des Treibstoff-Niedrigstandsensors'],
 ['102:45:40','contact','Landing / engine off (rounded)','Landung / Triebwerk aus (gerundet)']
].map(([get,id,en,de])=>({get,id,en,de}));
export const toSeconds=get=>get.split(':').reduce((v,n)=>v*60+Number(n),0);
export const HIST_START=toSeconds(events[0].get),HIST_END=toSeconds(events.at(-1).get);
