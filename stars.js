const dedicatedInternetDetailIds = new Set([
  "cuba-internet-weather",
  "dns-time-to-answer-index",
  "dns-tta-stress-index",
  "global-reachability-long-horizon",
  "global-reachability-score",
  "http-reachability-index",
  "internet-shrinkage-index",
  "ipv6-adoption-locked-states",
  "ipv6-global-compare",
  "ipv6-locked-states",
  "iran-dns-behavior",
  "mx-presence-by-country",
  "mx-presence-per-country",
  "north-korea-connectivity",
  "silent-countries-list",
  "tls-fingerprint-change",
  "traceroute-to-nowhere",
  "undersea-cable-dependency",
  "undersea-cable-dependency-map",
]);

const useDedicatedInternetLanguageUi =
  document.body?.dataset.observerPage === "internet-detail"
  && dedicatedInternetDetailIds.has(document.body?.dataset.observerId);

const dedicatedWiesmoorEnglishPaths = new Set([
  "/world-observer/wiesmoor-weather.html",
  "/world-observer/wiesmoor-peatland.html",
  "/world-observer/wiesmoor-sky.html",
  "/world-observer/east-frisia-water.html",
  "/world-observer/horizon-observer.html",
  "/world-observer/wiesmoor-population.html",
  "/world-observer/wiesmoor-energy.html",
  "/world-observer/wiesmoor-groundwater.html",
  "/world-observer/wiesmoor-development.html",
  "/world-observer/wiesmoor-finance.html",
]);
const dedicatedGermanWiesmoorPaths = new Set([
  "/de/world-observer/wiesmoor-weather.html",
  "/de/world-observer/wiesmoor-peatland.html",
  "/de/world-observer/wiesmoor-sky.html",
  "/de/world-observer/east-frisia-water.html",
  "/de/world-observer/horizon-observer.html",
  "/de/world-observer/wiesmoor-population.html",
  "/de/world-observer/wiesmoor-energy.html",
  "/de/world-observer/wiesmoor-groundwater.html",
  "/de/world-observer/wiesmoor-development.html",
  "/de/world-observer/wiesmoor-finance.html",
]);
const useDedicatedGermanWiesmoorUi = dedicatedGermanWiesmoorPaths.has(window.location.pathname);
const useDedicatedWiesmoorLanguageUi = useDedicatedGermanWiesmoorUi || dedicatedWiesmoorEnglishPaths.has(window.location.pathname);

const dedicatedWorldObserverEnglishPaths = new Set([
  "/world-observer.html",
  "/world-observer/internet.html",
  "/world-observer/environment.html",
  "/world-observer/technology.html",
  "/world-observer/geomagnetic-storm-observer.html",
  "/world-observer/earthquake-observer.html",
  "/world-observer/ocean-buoy-observer.html",
  "/world-observer/time-observer.html",
  "/world-observer/technology/debian-package-count.html",
  "/world-observer/technology/arch-package-count.html",
]);
const dedicatedGermanWorldObserverPaths = new Set(
  Array.from(dedicatedWorldObserverEnglishPaths, path => `/de${path}`),
);
const useDedicatedGermanWorldObserverUi = dedicatedGermanWorldObserverPaths.has(window.location.pathname);
const useDedicatedWorldObserverLanguageUi =
  useDedicatedGermanWorldObserverUi || dedicatedWorldObserverEnglishPaths.has(window.location.pathname);

const ciscoFieldNote7Paths = new Set([
  "/museum/home-computing-lab/field-notes/field-note-7/",
  "/museum/home-computing-lab/field-notes/field-note-7/index.html",
]);
const useCiscoFieldNote7Ui = ciscoFieldNote7Paths.has(window.location.pathname);

if (useCiscoFieldNote7Ui) {
  const languageVisibilityStyle = document.createElement("style");
  languageVisibilityStyle.textContent = `
    .cisco-recording-pending > hr { display:none; }
    body[data-site-language="de"] .cisco-recording-pending section[lang="en"] { display:none; }
    body[data-site-language="en"] .cisco-recording-pending section[lang="de"] { display:none; }
  `;
  document.head.appendChild(languageVisibilityStyle);

  const catFigure = document.querySelector('.hcl-field-story figure img[alt*="cat background"]')?.closest("figure");
  const catCaption = catFigure?.querySelector("figcaption");
  if (catCaption) {
    catCaption.textContent = "Figure 1 — First things first: the cat. Before Werner, before DOOM, the Cisco got its essential cat background. The speed dials came later.";
  }

  const storySections = document.querySelectorAll(".hcl-field-story > section");
  for (const section of storySections) {
    const heading = section.querySelector(":scope > h2");
    if (heading?.textContent.trim() === "Morning: a phone arrived") {
      const paragraphs = section.querySelectorAll(":scope > p");
      if (paragraphs[1]) {
        paragraphs[1].innerHTML = "A factory reset was necessary because the used phone still contained provisioning and network configuration from its previous organization. Before connecting it to the lab, the old configuration was wiped. On this CP-9951, the working reset procedure was: power off, hold <code>#</code> while powering on, then enter <code>123456789*0#</code>. After that, Cthulhu provided DHCP and TFTP, the Cisco loaded our SEP configuration, and Asterisk handled SIP.";
      }
      if (paragraphs[2]) {
        paragraphs[2].textContent = "First things first: the cat background. Before Werner, before DOOM, the Cisco got the cat. Essential.";
      }
      break;
    }
  }

  const germanHtml = new Map([
    ["Morning: a phone arrived", "Morgens: Ein Telefon kommt an"],
    ["The day started with a used Cisco Unified IP Phone CP-9951 that had cost €35. The original plan was reconnaissance: identify the interfaces, understand provisioning and find the cleanest supported way to make the phone useful in the home lab.", "Der Tag begann mit einem gebrauchten Cisco Unified IP Phone CP-9951 für 35 €. Der ursprüngliche Plan war reine Erkundung: Schnittstellen identifizieren, die Provisionierung verstehen und den saubersten unterstützten Weg finden, das Telefon im Homelab sinnvoll einzusetzen."],
    ["A factory reset was necessary because the used phone still contained provisioning and network configuration from its previous organization. Before connecting it to the lab, the old configuration was wiped. On this CP-9951, the working reset procedure was: power off, hold # while powering on, then enter 123456789*0#. After that, Cthulhu provided DHCP and TFTP, the Cisco loaded our SEP configuration, and Asterisk handled SIP.", "Ein Factory-Reset war nötig, weil auf dem gebrauchten Telefon noch Provisionierungs- und Netzwerkkonfigurationen der vorherigen Organisation gespeichert waren. Bevor es ins Homelab kam, wurde diese alte Konfiguration vollständig entfernt. Bei diesem CP-9951 funktionierte der Reset so: Strom aus, beim Einschalten <code>#</code> gedrückt halten und anschließend <code>123456789*0#</code> eingeben. Danach stellte Cthulhu DHCP und TFTP bereit, das Cisco lud unsere SEP-Konfiguration und Asterisk übernahm SIP."],
    ["First things first: the cat background. Before Werner, before DOOM, the Cisco got the cat. Essential.", "Das Wichtigste zuerst: der Katzen-Hintergrund. Noch vor Werner und DOOM bekam das Cisco die Katze. Essenziell."],
    ["First useful discovery: the screen can receive H.264", "Erste nützliche Entdeckung: Das Display kann H.264 empfangen"],
    ["The CP-9951 advertises H.264 video reception over SIP/RTP. Provisioning enabled the existing video capability, and the phone negotiated a 640×480 receive stream using the profile expected by the Cisco firmware.", "Das CP-9951 bietet H.264-Videoempfang über SIP/RTP. Durch die Provisionierung wurde die vorhandene Videofunktion aktiviert, und das Telefon handelte einen 640×480-Empfangsstream mit dem von der Cisco-Firmware erwarteten Profil aus."],
    ["That changed the question from “what can this old office phone do?” to “what can we make it display?”", "Damit änderte sich die Frage von „Was kann dieses alte Bürotelefon?“ zu „Was können wir darauf anzeigen lassen?“"],
    ["Speed dial 111: Werner", "Kurzwahl 111: Werner"],
    ["The first deliberately unnecessary application was Werner.", "Die erste ganz bewusst unnötige Anwendung war Werner."],
    ["A dedicated Baresip endpoint registers with Asterisk as extension 200. Dialling 111 from the Cisco routes to that endpoint, which auto-answers and sends the prepared Werner sequence as real H.264/PCMU media. The video had to be scaled to 640×480, 24 fps, H.264 Baseline/Constrained Baseline Level 3.0 so the Cisco would accept it.", "Ein eigener Baresip-Endpunkt registriert sich bei Asterisk als Nebenstelle 200. Wird am Cisco die <strong>111</strong> gewählt, landet der Anruf dort; der Endpunkt nimmt automatisch ab und sendet die vorbereitete Werner-Sequenz als echtes H.264/PCMU-Medium. Das Video musste auf 640×480 bei 24 fps und H.264 Baseline/Constrained Baseline Level 3.0 gebracht werden, damit das Cisco es akzeptiert."],
    ["Button 2 became Werner → 111. Video and sound both play on the phone.", "Taste 2 wurde zu <strong>Werner → 111</strong>. Bild und Ton laufen direkt über das Telefon."],
    ["Speed dial 666: live DOOM", "Kurzwahl 666: Live-DOOM"],
    ["The second application is not a prerecorded DOOM clip. DOOM Retro is actually running live on Cthulhu under Wayland/Sway, and the Cisco displays the current game output.", "Die zweite Anwendung ist kein vorab aufgenommenes DOOM-Video. DOOM Retro läuft tatsächlich live auf Cthulhu unter Wayland/Sway, und das Cisco zeigt die aktuelle Spielausgabe."],
    ["A separate Baresip instance registers as endpoint 201. The Cisco's third speed dial is DOOM → 666, Asterisk routes 666 to that endpoint, and the live stream is delivered back to the handset.", "Eine zweite Baresip-Instanz registriert sich als Endpunkt 201. Die dritte Kurzwahl des Cisco ist <strong>DOOM → 666</strong>, Asterisk routet die 666 zu diesem Endpunkt und der Live-Stream wird zurück an das Telefon geliefert."],
    ["Figure 1 — First things first: the cat. Before Werner, before DOOM, the Cisco got its essential cat background. The speed dials came later.", "Abbildung 1 — Das Wichtigste zuerst: die Katze. Noch vor Werner und DOOM bekam das Cisco seinen unverzichtbaren Katzen-Hintergrund. Die Kurzwahlen kamen später."],
    ["Figure 2 — This is the live game output from Cthulhu, not a prerecorded DOOM video.", "Abbildung 2 — Das ist die Live-Spielausgabe von Cthulhu und kein vorab aufgenommenes DOOM-Video."],
    ["The five-second problem", "Das Fünf-Sekunden-Problem"],
    ["The first working live path used wf-recorder, a NUT FIFO and Baresip's avformat input. It worked, but the picture arrived roughly five seconds late. Y4M reduced that to around two seconds but introduced visual corruption.", "Der erste funktionierende Live-Pfad nutzte <code>wf-recorder</code>, eine NUT-FIFO und den avformat-Eingang von Baresip. Es funktionierte, aber das Bild kam ungefähr fünf Sekunden zu spät an. Y4M reduzierte das auf etwa zwei Sekunden, verursachte jedoch Bildfehler."],
    ["The fix was to stop treating the live screen as a buffered media file and present it as a virtual camera instead.", "Die Lösung war, den Live-Bildschirm nicht mehr wie eine gepufferte Mediendatei zu behandeln, sondern ihn stattdessen als virtuelle Kamera bereitzustellen."],
    ["With that path, the previous multi-second delay is effectively gone and the phone shows DOOM near realtime.", "Mit diesem Pfad ist die vorherige Verzögerung von mehreren Sekunden praktisch verschwunden und das Telefon zeigt DOOM nahezu in Echtzeit."],
    ["And the sound really comes from the phone", "Und der Ton kommt wirklich aus dem Telefon"],
    ["Video alone would have been cheating.", "Nur Video wäre geschummelt gewesen."],
    ["The DOOM instance captures Cthulhu's real PipeWire/Pulse output monitor and sends it as PCMU audio through SIP/RTP. The result is the actual game sound coming from the Cisco speaker with essentially no noticeable delay.", "Die DOOM-Instanz greift Cthulhus echten PipeWire/Pulse-Ausgabemonitor ab und sendet ihn als PCMU-Audio über SIP/RTP. Das Ergebnis ist echter Spielsound aus dem Cisco-Lautsprecher – praktisch ohne wahrnehmbare Verzögerung."],
    ["Workshop recordings", "Werkstattaufnahmen"],
    ["Two original recordings belong with this field note because they show the experiment as it actually happened: the button press, the phone reacting and the audio in the room.", "Zu dieser Field Note gehören zwei Originalaufnahmen, weil sie das Experiment genau so zeigen, wie es passiert ist: Tastendruck, Reaktion des Telefons und der Ton im Raum."],
    ["Recording 01 — Werner / 111. Pressing the Werner speed dial starts the selected scene directly on the Cisco, with video and audio coming from the phone.", "<strong>Aufnahme 01 — Werner / 111.</strong> Ein Druck auf die <em>Werner</em>-Kurzwahl startet die ausgewählte Szene direkt auf dem Cisco; Bild und Ton kommen aus dem Telefon."],
    ["Recording 02 — DOOM / 666. Pressing the DOOM speed dial calls extension 666. Live DOOM from Cthulhu appears on the Cisco display, and the real game audio is audibly coming from the phone speaker.", "<strong>Aufnahme 02 — DOOM / 666.</strong> Ein Druck auf die <em>DOOM</em>-Kurzwahl ruft die 666 an. Live-DOOM von Cthulhu erscheint auf dem Cisco-Display, und der echte Spielsound kommt hörbar aus dem Telefonlautsprecher."],
    ["Current result", "Aktueller Stand"],
    ["Aktuell result", "Aktueller Stand"],
    ["The phone remains on its normal Cisco firmware. The cat remains on the background. 666 is now a perfectly legitimate speed dial.", "Das Telefon läuft weiterhin mit seiner normalen Cisco-Firmware. Die Katze bleibt im Hintergrund. 666 ist jetzt eine völlig legitime Kurzwahl."],
    ["Result", "Ergebnis"],
    ["Can a Cisco CP-9951 run DOOM?", "Kann ein Cisco CP-9951 DOOM ausführen?"],
    ["Yes — as a near-realtime SIP/H.264 thin client. :DD", "Ja — als nahezu in Echtzeit arbeitender SIP/H.264-Thin-Client. :DD"],
    ["Next experiment", "Nächstes Experiment"],
    ["Displaying DOOM is proven. The next step is to make the phone itself the controller: Cisco keypad / DTMF → Asterisk/Baresip → Cthulhu → DOOM.", "DOOM auf dem Display ist bewiesen. Der nächste Schritt ist, das Telefon selbst zum Controller zu machen: Cisco-Tastenfeld / DTMF → Asterisk/Baresip → Cthulhu → DOOM."],
    ["If that works, the answer changes from “DOOM is running on the phone display” to “DOOM is being played with an office phone.”", "Wenn das funktioniert, ändert sich die Antwort von „DOOM läuft auf dem Telefondisplay“ zu „DOOM wird mit einem Bürotelefon gespielt.“"],
    ["← RETURN TO FIELD NOTES & ARTIFACTS", "← ZURÜCK ZU FIELD NOTES & ARTEFAKTEN"],
  ]);

  const normalizeCiscoText = value => (value || "").replace(/\s+/g, " ").trim();

  const applyCiscoGerman = () => {
    if (document.body.dataset.ciscoFieldNote7GermanApplied === "true") return;

    document.documentElement.lang = "de";
    document.title = "Ich habe ein Cisco-Telefon für 35 € gekauft. Natürlich kam DOOM drauf. – Field Note #007";

    const title = document.querySelector(".hcl-field-detail-header h1");
    if (title) title.innerHTML = "ICH HABE EIN CISCO-TELEFON FÜR 35 € GEKAUFT.<br>NATÜRLICH HABE ICH DOOM DRAUF GEPACKT.";
    const kicker = document.querySelector(".hcl-field-detail-header .hcl-kicker");
    if (kicker) kicker.textContent = "FIELD NOTE #007 · DOKUMENTIERT AM 12. SEP 2026";
    const subtitle = document.querySelector(".hcl-field-detail-header .hcl-subtitle");
    if (subtitle) subtitle.textContent = "Ein Experiment am selben Tag machte aus einem Cisco CP-9951 einen SIP/H.264-Thin-Client für Werner und Live-DOOM von Cthulhu.";
    const back = document.querySelector(".museum-back");
    if (back) back.textContent = "← FIELD NOTES & ARTEFAKTE";

    document.querySelectorAll(".hcl-field-story h2, .hcl-field-story p, .hcl-field-story figcaption, .hcl-field-story .hcl-archive-return").forEach(element => {
      if (element.closest('.cisco-recording-pending section[lang]')) return;
      const key = normalizeCiscoText(element.textContent);
      const translated = germanHtml.get(key);
      if (translated) element.innerHTML = translated;
    });

    document.querySelectorAll(".hcl-field-story pre").forEach(pre => {
      pre.textContent = pre.textContent
        .replace(/\bButton\b/g, "Taste")
        .replace(/\bforward\b/g, "vorwärts")
        .replace(/\bbackward\b/g, "rückwärts")
        .replace(/turn left/g, "links drehen")
        .replace(/turn right/g, "rechts drehen")
        .replace(/\bfire\b/g, "feuern")
        .replace(/use \/ open/g, "benutzen / öffnen")
        .replace(/live Cthulhu video \+ real game audio/g, "Live-Cthulhu-Video + echter Spielsound");
    });

    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) metaDescription.content = "Ein Cisco CP-9951 kam morgens an. Am Nachmittag war es ein SIP/H.264-Thin-Client für Werner und nahezu latenzfreies Live-DOOM von Cthulhu.";

    document.body.dataset.ciscoFieldNote7GermanApplied = "true";
  };

  const syncCiscoLanguage = () => {
    if (document.body.dataset.siteLanguage === "de") applyCiscoGerman();
  };

  const ciscoLanguageObserver = new MutationObserver(syncCiscoLanguage);
  ciscoLanguageObserver.observe(document.body, { attributes: true, attributeFilter: ["data-site-language"] });
  queueMicrotask(syncCiscoLanguage);
}

if (!document.querySelector('script[data-seo-runtime-loader]')) {
  const seoScript = document.createElement('script');
  seoScript.src = '/seo-runtime.js?v=20260815-1';
  seoScript.dataset.seoRuntimeLoader = 'true';
  document.head.appendChild(seoScript);
}

if (useDedicatedWiesmoorLanguageUi && !document.querySelector('script[data-wiesmoor-route-loader]')) {
  const routeScript = document.createElement('script');
  routeScript.src = '/wiesmoor-language-route.js?v=20260815-1';
  routeScript.dataset.wiesmoorRouteLoader = 'true';
  document.head.appendChild(routeScript);
}

if (useDedicatedWorldObserverLanguageUi && !document.querySelector('script[data-world-observer-route-loader]')) {
  const routeScript = document.createElement('script');
  routeScript.src = '/world-observer-language-route.js?v=20260816-internet-1';
  routeScript.dataset.worldObserverRouteLoader = 'true';
  document.head.appendChild(routeScript);
}

if (useDedicatedGermanWiesmoorUi) {
  if (!document.querySelector('script[data-wiesmoor-de-loader]')) {
    const languageScript = document.createElement('script');
    languageScript.src = '/wiesmoor-de-bootstrap.js?v=20260901-3';
    languageScript.dataset.wiesmoorDeLoader = 'true';
    document.head.appendChild(languageScript);
  }
} else if (useDedicatedGermanWorldObserverUi) {
  if (!document.querySelector('script[data-world-observer-de-loader]')) {
    const languageScript = document.createElement('script');
    languageScript.src = '/world-observer-de-bootstrap.js?v=20260901-1';
    languageScript.dataset.worldObserverDeLoader = 'true';
    document.head.appendChild(languageScript);
  }
} else if (!useDedicatedInternetLanguageUi && !useDedicatedWiesmoorLanguageUi && !useDedicatedWorldObserverLanguageUi && !document.querySelector('script[data-site-language-loader]')) {
  const languageScript = document.createElement('script');
  languageScript.src = '/site-language.js?v=20260816-museum-3';
  languageScript.dataset.siteLanguageLoader = 'true';
  document.head.appendChild(languageScript);
}

const canvas = document.getElementById("stars");
const homepagePaths = new Set(["/", "/index.html", "/de/", "/de/index.html"]);
const isHomepage = homepagePaths.has(window.location.pathname);

if (!isHomepage || !canvas) {
  canvas?.remove();
} else {
  const ctx = canvas.getContext("2d");
  let width = 0;
  let height = 0;
  let pixelRatio = 1;
  let stars = [];

  function makeStar() {
    return {
      x: (Math.random() - 0.5) * width,
      y: (Math.random() - 0.5) * height,
      z: Math.random() * width,
    };
  }

  function resize() {
    const bounds = canvas.getBoundingClientRect();
    const nextWidth = bounds.width || document.documentElement.clientWidth;
    const nextHeight = bounds.height || document.documentElement.clientHeight;
    const nextRatio = window.devicePixelRatio || 1;
    const scaleX = width ? nextWidth / width : 1;
    const scaleY = height ? nextHeight / height : 1;

    width = nextWidth;
    height = nextHeight;
    pixelRatio = nextRatio;
    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

    stars.forEach((star) => {
      star.x *= scaleX;
      star.y *= scaleY;
      star.z *= scaleX;
    });
  }
  window.addEventListener("resize", resize);
  window.visualViewport?.addEventListener("resize", resize);
  resize();

  stars = Array.from({ length: 200 }, makeStar);

  function animate() {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = "#00b4ff";
    stars.forEach((s) => {
      s.z -= 2;
      if (s.z <= 0) s.z = width;
      const k = 128.0 / s.z;
      const px = s.x * k + width / 2;
      const py = s.y * k + height / 2;
      if (px >= 0 && px <= width && py >= 0 && py <= height) {
        const size = (1 - s.z / width) * 2;
        ctx.beginPath();
        ctx.arc(px, py, size, 0, Math.PI * 2);
        ctx.fill();
      }
    });
    requestAnimationFrame(animate);
  }
  animate();
}

if (useCiscoFieldNote7Ui) {
  const recordings = document.querySelectorAll(".cisco-recording-pending");

  if (recordings[0]) {
    recordings[0].outerHTML = `
      <figure class="hcl-story-evidence">
        <video controls playsinline preload="metadata">
          <source src="/assets/home-computing-lab/field-notes/cisco-werner-111-web.mp4" type="video/mp4">
          Your browser does not support embedded MP4 video.
        </video>
        <figcaption><strong>Recording 01 — Werner / 111.</strong> Pressing the <em>Werner</em> speed dial starts the selected scene directly on the Cisco, with video and audio coming from the phone.</figcaption>
      </figure>
      <div class="cisco-recording-pending" style="border-style:solid">
        <section lang="de" aria-labelledby="werner-de-title">
          <strong id="werner-de-title">DEUTSCH</strong>
          <p>Ein Druck auf die Kurzwahl <strong>„Werner“</strong> startet die vorbereitete Szene direkt auf dem Cisco — mit Bild und Ton über das Telefon.</p>
          <p>In der Szene steigt jemand auf einem gefrorenen See aus dem Auto und rutscht sofort hin und her. Darauf sagt Andi: <strong>„Kannst du nicht mal vernünftig grüßen?“</strong></p>
          <p>Der Mann macht noch zwei oder drei Schritte, rutscht dann komplett weg, überschlägt sich und landet mit dem Kopf auf dem Eis. Werner kommentiert trocken, dass der Typ mit seiner <strong>„Abrissbirne“</strong> gleich das ganze Eis kaputtmacht.</p>
          <p>Genau an der Stelle hört man auch mein Lachen im Video. Ich lache dabei sowieso ständig, weil ich die Werner-Filme einfach feiere. :D</p>
        </section>
        <hr style="border:0;border-top:1px solid rgba(137,185,191,.28);margin:1.1rem 0">
        <section lang="en" aria-labelledby="werner-en-title">
          <strong id="werner-en-title">ENGLISH</strong>
          <p>Pressing the <strong>“Werner”</strong> speed dial starts the prepared scene directly on the Cisco, with both video and audio playing through the phone.</p>
          <p>In the scene, a man gets out of a car onto a frozen lake and immediately starts sliding around. Andi says: <strong>“Can’t you even say hello properly for once?”</strong></p>
          <p>He takes another two or three steps, completely loses his footing, flips over and lands head-first on the ice. Werner then dryly comments that the guy is going to wreck the whole ice surface with his <strong>“wrecking ball”</strong> — meaning his head.</p>
          <p>You can hear me laughing in the recording too. I laugh through Werner movies all the time anyway — I just love them. :D</p>
        </section>
      </div>`;
  }

  if (recordings[1]) {
    recordings[1].outerHTML = `
      <figure class="hcl-story-evidence">
        <video controls playsinline preload="metadata">
          <source src="/assets/home-computing-lab/field-notes/cisco-doom-666-web.mp4" type="video/mp4">
          Your browser does not support embedded MP4 video.
        </video>
        <figcaption><strong>Recording 02 — DOOM / 666.</strong> Pressing the <em>DOOM</em> speed dial calls extension 666. Live DOOM from Cthulhu appears on the Cisco display, and the real game audio is audibly coming from the phone speaker.</figcaption>
      </figure>`;
  }
}