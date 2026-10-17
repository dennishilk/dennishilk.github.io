export const language=new URLSearchParams(location.search).get('lang')==='de'||location.pathname.startsWith('/de/')?'de':'en';
const de={
'.brand small':'EIN OPTISCHES EXPERIMENT · 001','.tagline .eyebrow':'LICHT, NEU GEORDNET','.tagline h1':'Zeichne mit <em>Licht.</em>',
'.tagline p':'Hunderte winzige Spiegel. Eine Lichtquelle.<br>Ein persönliches Stück Physik.',
'.creator .panel-title > span:first-child':'01 / GESTALTEN','.creator .status':'● OPTIK AKTIV',
'[data-tab="presets"]':'Motive','[data-tab="text"]':'Text','[data-tab="draw"]':'Zeichnen',
'[data-preset="heart"] small':'HERZ','[data-preset="hello"] small':'HALLO','[data-preset="bolt"] small':'BLITZ','[data-preset="star"] small':'STERN',
'#textTab label[for="customText"]':'DEINE NACHRICHT','#applyText':'Nachricht projizieren ↗','#quickGif':'✧ Als GIF verschenken ↗',
'#textHint':'Ein kurzer Name erscheint sofort. Lange Nachrichten erscheinen in echten Lichtreflexionen. Emoji-Darstellung hängt von installierten Schriften ab.',
'#brush':'Pinsel','#eraser':'Radierer','#undoDraw':'Zurück','#clearDraw':'Leeren','#applyDraw':'Projizieren','#replay':'↻ Wiederholen',
'.controls .panel-title > span:first-child':'02 / ERFORSCHEN','#reset':'ALLES ZURÜCKSETZEN ↗',
'.switchline:first-of-type span':'Lichtstrahlen zeigen<small>Verlauf einer Reflexion sichtbar machen</small>',
'.switchline:nth-of-type(2) span':'Kühles Licht<small>Farbe des Leuchtens wechseln</small>',
'.sliderhead span:first-child':'LICHTPOSITION','#recalculate':'Spiegel neu ausrichten ↗',
'.scenefoot':'✳ KEINE UPLOADS / ECHTE STRAHLENGEOMETRIE / PRIVAT',
'#savePng':'↓ PNG','#shareGif':'✧ GIF erstellen & teilen ↗','#saveProject':'Projekt speichern','#openProject':'Projekt öffnen','#shareProject':'Eigene Kreation teilen',
'#downloadProject':'Projektdatei herunterladen','#loadLocal':'Letztes Projekt laden',
'#drawPreviewTitle':'Deine Zeichnung · unverändert',
'#projectionPreviewTitle':'Lichtprojektion · reflektiertes Ergebnis',
'#mirrorDrawingTitle':'Motiv automatisch spiegeln',
'#mirrorDrawingHelp':'Zeichne ganz normal. RAYMOSAIC korrigiert die Ausrichtung für die Spiegelprojektion.',
'#shareRaymosaic':'RAYMOSAIC teilen ❤️ ↗',
'#shareDialogEyebrow':'LICHT WEITERGEBEN',
'#shareDialogTitle':'RAYMOSAIC teilen ❤️',
'#shareDialogIntro':'Teile das öffentliche Lichtlabor – nicht automatisch dein privates Motiv.',
'#publicNativeShare':'Mit Apps auf diesem Gerät teilen…',
'#publicEmail':'E-Mail',
'#publicCopy':'Webseiten-Link kopieren',
'#mastodonInstanceLabel':'Mastodon-Instanz (z. B. mastodon.social)',
'#publicMastodon':'Auf Mastodon teilen ↗',
'#sharePrivacyNote':'Externe Anbieter öffnen sich erst nach deinem Klick. Der öffentliche Link enthält keine Zeichnung.',
'#mirrorTextTitle':'Motiv automatisch spiegeln','#mirrorTextHelp':'Schreib ganz normal. RAYMOSAIC korrigiert die Ausrichtung für die echte Spiegelprojektion.',
'#mirrorDensityLabel':'SPIEGELDICHTE','#densityHint':'Jeder Spiegel wird einzeln berechnet.',
'#showLabelsText':'Beschriftungen anzeigen<small id="showLabelsHelp">Technische Hinweise zu Licht, Wand und Spiegeln</small>',
'#sequenceHeading':'Deine Nachricht aus Licht','#prevScene':'← Zurück','#nextScene':'Weiter →',
'#howItWorks span':'Wie funktioniert das?','#physicsEyebrow':'DIE PHYSIK DES LICHTS',
'#physicsTitle':'Wie funktioniert das? 🔬','#physicsIntro':'448, 666 oder 1337 einzeln ausgerichtete Spiegel, eine Lichtquelle und das Reflexionsgesetz.',
'#physicsStep1':'01 — Eine Lichtquelle','#physicsBody1':'Eine punktförmige Lichtquelle beleuchtet alle Spiegel der Anlage.',
'#physicsStep2':'02 — Spiegelausrichtung','#physicsBody2':'Jede Spiegelfläche erhält eine berechnete Oberflächennormale.',
'#physicsStep3':'03 — Reflexionsgesetz','#physicsBody3':'Einfalls- und Ausfallswinkel zur Flächennormale sind gleich: r = i − 2(i · n)n.',
'#physicsStep4':'04 — Die Projektion','#physicsBody4':'Die reflektierten Strahlen treffen auf die Wand und bilden einzelne Lichtpunkte.',
'#physicsStep5':'05 — Neue Nachricht','#physicsBody5':'Für jede Szene werden die Spiegelnormalen neu berechnet und ihre Ausrichtung animiert.',
'#physicsStep6':'06 — Export und Teilen','#physicsBody6':'Der Browser erzeugt GIF-Bilder aus der Simulation, ganz ohne Upload.',
'#diagramLight':'LICHT','#diagramMirror':'SPIEGEL','#diagramNormal':'NORMALE','#diagramWall':'WAND',

'.dialogheading .eyebrow':'EIN BISSCHEN LICHT BEHALTEN','.dialogheading h2':'Mach es zu deinem.',
'.dialogheading p':'Erstelle ein echtes animiertes GIF direkt im Browser. Keine Uploads.',
'label[for="aspect"]':'FORMAT','label[for="quality"]':'QUALITÄT','label[for="duration"]':'DAUER',
'#projectionLabelText':'Nur Projektion (ohne Spiegelanlage)','#brandGifLabelText':'Kleines RAYMOSAIC-Logo anzeigen',
'#exportModeNote':'Die gesamte Spiegelanlage mit Lichtquelle und Projektionswand.',
'#progressStatus':'Wird vorbereitet…',
'#cancelExport':'Abbrechen','#startExport':'Animiertes GIF erstellen ↗','#downloadGif':'↓ GIF herunterladen','#nativeShare':'Teilen…',
'.exportfoot':'GIF ist weit verbreitet. Manche Messenger spielen die Animation beim Teilen anders ab. Bei Bedarf die GIF-Datei versenden.',
'#exportPreview strong':'Bereit zum Teilen.','#siteHome':'← Startseite','#siteBlog':'Blog','#siteLanguage':'EN',
'#quickHint':'Nachricht eingeben → Projizieren → GIF teilen. Alles bleibt auf deinem Gerät.'
};
const messages={
en:{saved:'Project saved on this device',loaded:'Project restored',link:'Link copied; anyone with the link can see the motif',file:'Project file downloaded',broken:'Unable to load project: ',linkFail:'Cannot create link: ',shareFail:'Sharing unavailable; download the GIF instead',invalid:'Please enter a name first',replay:'Replaying mirror alignment',optics:'Drag to orbit. Scroll to zoom. Select a mirror.',exporting:'Rendering frame ',done:'Animated GIF created',cancel:'GIF export cancelled',textTooLong:'Your text is too long (400 characters max)',loveMirrors:'666 mirrors · DOOM of Love ❤️',overdriveMirrors:'1337 mirrors · OVERDRIVE 🚀',classicMirrors:'448 mirrors · Classic',pngOneScene:'PNG saves only the current scene',sequenceExport:'Complete message sequence — duration adjusted automatically:',sequenceTooLong:'This GIF would be too large.'},
de:{saved:'Projekt auf diesem Gerät gespeichert',loaded:'Projekt wiederhergestellt',link:'Link kopiert; Empfänger können das Motiv ansehen',file:'Projektdatei heruntergeladen',broken:'Projekt konnte nicht geladen werden: ',linkFail:'Link nicht möglich: ',shareFail:'Teilen nicht verfügbar. Bitte GIF herunterladen.',invalid:'Bitte zuerst einen Namen eingeben',replay:'Spiegelanimation wird wiederholt',optics:'Ziehen zum Drehen. Scrollen zum Zoomen. Spiegel anklicken.',exporting:'Bild wird berechnet ',done:'Animiertes GIF erstellt',cancel:'GIF-Export abgebrochen',textTooLong:'Die Nachricht ist zu lang (maximal 400 Zeichen)',loveMirrors:'666 Spiegel · DOOM of Love ❤️',overdriveMirrors:'1337 Spiegel · OVERDRIVE 🚀',classicMirrors:'448 Spiegel · Classic',pngOneScene:'PNG speichert nur die aktuelle Szene',sequenceExport:'Vollständige Nachrichtenfolge — Dauer automatisch angepasst:',sequenceTooLong:'Dieses GIF würde zu groß.'}
};
Object.assign(messages.en,{
 createGif:'Create animated GIF ↗',anotherGif:'Create another GIF ↗',encoding:'Encoding animation…',frames:'frames',
 gifError:'GIF error: ',encodingError:'GIF encoding error: ',exportUnavailable:'Export unavailable: ',
 sequenceAdvice:'Choose Messaging quality or shorten the text.',gifShareText:'I made this with simulated reflected light.',
 projectionNote:'Only reflected light on black. No mirrors, lamp or wall frame.',
 sceneNote:'The complete mirror instrument, light source and projection wall.'
});
Object.assign(messages.de,{
 createGif:'Animiertes GIF erstellen ↗',anotherGif:'Weiteres GIF erstellen ↗',encoding:'Animation wird erstellt…',frames:'Bilder',
 gifError:'GIF-Fehler: ',encodingError:'Fehler bei der GIF-Kodierung: ',exportUnavailable:'Export nicht verfügbar: ',
 sequenceAdvice:'Wähle die Messenger-Qualität oder kürze die Nachricht.',gifShareText:'Mit simulierten Lichtreflexionen gestaltet.',
 projectionNote:'Nur reflektiertes Licht auf Schwarz. Ohne Spiegel, Lichtquelle oder Wandrahmen.',
 sceneNote:'Die gesamte Spiegelanlage mit Lichtquelle und Projektionswand.'
});
export function t(key){return messages[language][key]||key;}
export function applyLanguage(){
 document.documentElement.lang=language;
 const home=document.getElementById('siteHome'),blog=document.getElementById('siteBlog'),swap=document.getElementById('siteLanguage');
 if(home)home.href=language==='de'?'/de/':'/';
 if(blog)blog.href=language==='de'?'/de/blog/':'/blog/';
 if(swap){const url=new URL(location.href);if(location.hostname==='localhost'||location.hostname==='127.0.0.1'){if(language==='de')url.searchParams.delete('lang');else url.searchParams.set('lang','de');swap.href=url.pathname+url.search+url.hash;}else swap.href=(language==='de'?'/lab/raymosaic/':'/de/lab/raymosaic/')+url.hash;swap.setAttribute('aria-label',language==='de'?'Switch to English':'Auf Deutsch wechseln');}
 if(language!=='de')return;
 for(const [selector,value] of Object.entries(de)){const el=document.querySelector(selector);if(!el)continue;if(value.includes('<'))el.innerHTML=value;else el.textContent=value;}
 document.getElementById('customText').placeholder='Schreib einen Namen oder eine Liebesnachricht…';document.getElementById('mirrorDensity').options[0].textContent='448 Spiegel · Classic';document.getElementById('mirrorDensity').options[1].textContent='666 Spiegel · DOOM of Love ❤️';document.getElementById('mirrorDensity').options[2].textContent='1337 Spiegel · OVERDRIVE 🚀';
 for(const [selector,labels] of [['#aspect',['Quadrat · 1:1','Hochformat · 9:16','Querformat · 16:9']],['#quality',['Messenger · kleinere Datei','Standard · ausgewogen','Hoch · größere Datei']],['#duration',['3 Sekunden','5 Sekunden','8 Sekunden']]]){const select=document.querySelector(selector);if(select)Array.from(select.options).forEach((o,i)=>o.textContent=labels[i]);}
 document.getElementById('closeExport').setAttribute('aria-label','Exporteinstellungen schließen');
 document.getElementById('gifPreview').alt='Vorschau deiner animierten Lichtprojektion';
 document.title='RAYMOSAIC — Zeichne mit reflektiertem Licht';
}