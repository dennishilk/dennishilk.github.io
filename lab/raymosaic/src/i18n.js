export const language=new URLSearchParams(location.search).get('lang')==='de'||location.pathname.startsWith('/de/')?'de':'en';
const de={
'.brand small':'EIN OPTISCHES EXPERIMENT · 001','.tagline .eyebrow':'LICHT, NEU GEORDNET','.tagline h1':'Zeichne mit <em>Licht.</em>',
'.tagline p':'Hunderte winzige Spiegel. Eine Lichtquelle.<br>Ein persönliches Stück Physik.',
'.creator .panel-title > span:first-child':'01 / GESTALTEN','.creator .status':'● OPTIK AKTIV',
'[data-tab="presets"]':'Motive','[data-tab="text"]':'Text','[data-tab="draw"]':'Zeichnen',
'[data-preset="heart"] small':'HERZ','[data-preset="hello"] small':'HALLO','[data-preset="bolt"] small':'BLITZ','[data-preset="star"] small':'STERN',
'#textTab label':'DEINE NACHRICHT','#applyText':'Erstellen','#quickGif':'✧ Als GIF verschenken ↗',
'#textTab .hint':'Bis zu 13 Zeichen. Kurze Namen werden am deutlichsten.',
'#brush':'Pinsel','#eraser':'Radierer','#undoDraw':'Zurück','#clearDraw':'Leeren','#applyDraw':'Projizieren','#replay':'↻ Wiederholen',
'.controls .panel-title > span:first-child':'02 / ERFORSCHEN','#reset':'ALLES ZURÜCKSETZEN ↗',
'.switchline:first-of-type span':'Lichtstrahlen zeigen<small>Verlauf einer Reflexion sichtbar machen</small>',
'.switchline:nth-of-type(2) span':'Kühles Licht<small>Farbe des Leuchtens wechseln</small>',
'.sliderhead span:first-child':'LICHTPOSITION','#recalculate':'Spiegel neu ausrichten ↗',
'.scenefoot':'✳ KEINE UPLOADS / ECHTE STRAHLENGEOMETRIE / PRIVAT',
'#savePng':'↓ PNG','#shareGif':'✧ GIF erstellen & teilen ↗','#saveProject':'Projekt speichern','#openProject':'Projekt öffnen','#shareProject':'Link teilen',
'#downloadProject':'Projektdatei herunterladen','#loadLocal':'Letztes Projekt laden',
'.dialogheading .eyebrow':'EIN BISSCHEN LICHT BEHALTEN','.dialogheading h2':'Mach es zu deinem.',
'.dialogheading p':'Erstelle ein echtes animiertes GIF direkt im Browser. Keine Uploads.',
'label[for="aspect"]':'FORMAT','label[for="quality"]':'QUALITÄT','label[for="duration"]':'DAUER',
'#projectionLabelText':'Nur Projektion (ohne Spiegelanlage)','#brandGifLabelText':'Kleines RAYMOSAIC-Logo anzeigen',
'#cancelExport':'Abbrechen','#startExport':'Animiertes GIF erstellen ↗','#downloadGif':'↓ GIF herunterladen','#nativeShare':'Teilen…',
'.exportfoot':'GIF ist weit verbreitet. Manche Messenger spielen die Animation beim Teilen anders ab. Bei Bedarf die GIF-Datei versenden.',
'#exportPreview strong':'Bereit zum Teilen.','#siteHome':'← Startseite','#siteBlog':'Blog','#siteLanguage':'EN',
'#quickHint':'Name eingeben → Erstellen → GIF teilen. Alles bleibt auf deinem Gerät.'
};
const messages={
en:{saved:'Project saved on this device',loaded:'Project restored',link:'Link copied; anyone with the link can see the motif',file:'Project file downloaded',broken:'Unable to load project: ',linkFail:'Cannot create link: ',shareFail:'Sharing unavailable; download the GIF instead',invalid:'Please enter a name first',replay:'Replaying mirror alignment',optics:'Drag to orbit. Scroll to zoom. Select a mirror.',exporting:'Rendering frame ',done:'Animated GIF created',cancel:'GIF export cancelled'},
de:{saved:'Projekt auf diesem Gerät gespeichert',loaded:'Projekt wiederhergestellt',link:'Link kopiert; Empfänger können das Motiv ansehen',file:'Projektdatei heruntergeladen',broken:'Projekt konnte nicht geladen werden: ',linkFail:'Link nicht möglich: ',shareFail:'Teilen nicht verfügbar. Bitte GIF herunterladen.',invalid:'Bitte zuerst einen Namen eingeben',replay:'Spiegelanimation wird wiederholt',optics:'Ziehen zum Drehen. Scrollen zum Zoomen. Spiegel anklicken.',exporting:'Bild wird berechnet ',done:'Animiertes GIF erstellt',cancel:'GIF-Export abgebrochen'}
};
export function t(key){return messages[language][key]||key;}
export function applyLanguage(){
 document.documentElement.lang=language;
 const home=document.getElementById('siteHome'),blog=document.getElementById('siteBlog'),swap=document.getElementById('siteLanguage');
 if(home)home.href=language==='de'?'/de/':'/';
 if(blog)blog.href=language==='de'?'/de/blog/':'/blog/';
 if(swap){const url=new URL(location.href);if(location.hostname==='localhost'||location.hostname==='127.0.0.1'){if(language==='de')url.searchParams.delete('lang');else url.searchParams.set('lang','de');swap.href=url.pathname+url.search+url.hash;}else swap.href=(language==='de'?'/lab/raymosaic/':'/de/lab/raymosaic/')+url.hash;swap.setAttribute('aria-label',language==='de'?'Switch to English':'Auf Deutsch wechseln');}
 if(language!=='de')return;
 for(const [selector,value] of Object.entries(de)){const el=document.querySelector(selector);if(!el)continue;if(value.includes('<'))el.innerHTML=value;else el.textContent=value;}
 document.getElementById('customText').placeholder='Schreib einen Namen…';
 for(const [selector,labels] of [['#aspect',['Quadrat · 1:1','Hochformat · 9:16','Querformat · 16:9']],['#quality',['Messenger · kleinere Datei','Standard · ausgewogen','Hoch · größere Datei']],['#duration',['3 Sekunden','5 Sekunden','8 Sekunden']]]){const select=document.querySelector(selector);if(select)Array.from(select.options).forEach((o,i)=>o.textContent=labels[i]);}
 document.title='RAYMOSAIC — Zeichne mit reflektiertem Licht';
}