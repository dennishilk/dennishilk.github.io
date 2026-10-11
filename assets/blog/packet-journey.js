(() => {
  "use strict";
  const lab = document.querySelector("#packet-lab");
  if (!lab) return;
  const de = lab.dataset.lang === "de";
  const stages = de ? [
    ["Die Adresse","Du tippst https://www.example.com/ ein. Der Browser prüft erst, ob er eine bereits bekannte Adresse, eine bestehende Verbindung oder einen Cache-Eintrag verwenden kann.","URL: https://www.example.com/"],
    ["DNS: Wer ist zuständig?","Falls eine Auflösung nötig ist, fragt der Browser beziehungsweise das System einen Resolver nach Adressdaten. DNS-Antworten können im Cache liegen. Für diese Demo verwenden wir eine reservierte Beispiel-IP.","www.example.com → 203.0.113.42 (nur Beispiel)"],
    ["Der Weg durchs Netz","Pakete werden über dein lokales Netz und Router zum Ziel weitergeleitet. Sie enthalten unter anderem Quell- und Zieladressen. Die hier gezeigten Knoten sind keine gemessene Route.","Client → Router → Server/CDN"],
    ["Transport: TCP","Für HTTP/2 wird üblicherweise eine TCP-Verbindung aufgebaut. Ein vereinfachter Drei-Wege-Handshake ist SYN → SYN-ACK → ACK.","TCP: SYN → SYN-ACK → ACK"],
    ["TLS: Ist das der richtige Server?","Bei HTTPS verhandeln Browser und Server TLS, prüfen das Zertifikat und leiten Sitzungsschlüssel ab. Erst danach laufen HTTP-Daten geschützt über diese Verbindung.","TLS: Zertifikat + Schlüsselaustausch"],
    ["HTTP: Bitte die Seite","Der Browser sendet eine Anfrage mit Methode, Pfad und Headern. Ein Cookie kann gesendet werden, wenn es für diese Anfrage gilt. Das Beispiel ist schematisch.","GET / HTTP/2\nHost: www.example.com"],
    ["Antwort vom Server","Der Server sendet einen Status und Inhalt. Häufig beginnt die Antwort mit HTML; sie kann aber auch umleiten, einen Fehler melden oder einen Cache validieren.","HTTP/2 200\ncontent-type: text/html"],
    ["Der Browser baut die Seite","HTML wird zum DOM, CSS zum CSSOM. Der Browser berechnet Layout und zeichnet Pixel; JavaScript kann den Ablauf verändern. Das beginnt oft bereits während Daten eintreffen.","HTML → DOM + CSSOM → Layout → Paint"],
    ["Mehr Dateien, fertig?","Bilder, Schriften, Skripte und weitere Ressourcen können zusätzliche Anfragen auslösen, teils an andere Hosts. Sichtbar ist die Seite oft schon lange vor dem letzten Request.","Weitere Requests: CSS · JS · Bilder"]
  ] : [
    ["The address","You enter https://www.example.com/. The browser first checks whether it can reuse an address, an existing connection or a cached resource.","URL: https://www.example.com/"],
    ["DNS: where to go?","If resolution is needed, the browser or operating system asks a resolver for address records. DNS results may be cached. Our sample IP is reserved for documentation.","www.example.com → 203.0.113.42 (example only)"],
    ["Across the network","Packets travel through your local network and routers toward the destination. Among other things they carry source and destination IPs. These nodes are not a measured route.","Client → router → server/CDN"],
    ["Transport: TCP","For HTTP/2 a TCP connection is normally established. The simplified three-way handshake is SYN → SYN-ACK → ACK.","TCP: SYN → SYN-ACK → ACK"],
    ["TLS: the right server?","With HTTPS, browser and server negotiate TLS, validate the certificate and derive session keys. HTTP data then travels inside the protected connection.","TLS: certificate + key exchange"],
    ["HTTP: request the page","The browser sends a method, path and headers. Cookies may be sent if applicable to this request. This is a schematic example.","GET / HTTP/2\nHost: www.example.com"],
    ["The response","The server returns a status and content, often starting with HTML. It could also redirect, return an error or revalidate a cached copy.","HTTP/2 200\ncontent-type: text/html"],
    ["The browser renders","HTML becomes the DOM and CSS becomes the CSSOM. The browser calculates layout and paints pixels; JavaScript can modify this work. Rendering may begin before downloads finish.","HTML → DOM + CSSOM → Layout → Paint"],
    ["More requests, done?","Images, fonts, scripts and other assets can trigger more requests, sometimes to other hosts. The page often becomes visible before the final request completes.","More requests: CSS · JS · images"]
  ];
  const modes = {
    de: {
      h3: {
        3:["Transport: QUIC","HTTP/3 nutzt QUIC über UDP statt TCP. Transport und kryptografischer Verbindungsaufbau sind eng gekoppelt; es gibt hier keinen separaten TCP-Handshake.","UDP + QUIC (kein TCP-SYN)"],
        4:["TLS ist Teil von QUIC","QUIC integriert den TLS-1.3-Handshake. Die Authentifizierung bleibt wichtig, aber es ist kein zusätzlicher TLS-Handshake nach TCP.","QUIC + TLS 1.3"],
        5:["HTTP/3-Anfrage","Die Anfrage wird als HTTP/3-Daten über QUIC-Streams übertragen. Dies ist keine klassische HTTP/1.1-Textleitung.","GET / · HTTP/3-Stream"],
        6:["HTTP/3-Antwort","Der Server liefert Status und Inhalt über QUIC-Streams. HTTP/3 kann mehrere Streams unabhängig übertragen.","HTTP/3 :status 200"]
      }
    },
    en: {
      h3: {
        3:["Transport: QUIC","HTTP/3 uses QUIC over UDP rather than TCP. Transport and cryptographic connection setup are integrated; there is no separate TCP handshake here.","UDP + QUIC (no TCP SYN)"],
        4:["TLS lives inside QUIC","QUIC incorporates the TLS 1.3 handshake. Authentication still matters, but there is no extra TLS handshake after TCP.","QUIC + TLS 1.3"],
        5:["HTTP/3 request","The request travels as HTTP/3 data on QUIC streams. This is not an HTTP/1.1 text conversation.","GET / · HTTP/3 stream"],
        6:["HTTP/3 response","Status and content travel on QUIC streams. HTTP/3 supports independent streams within the connection.","HTTP/3 :status 200"]
      }
    }
  };
  let current = 0, mode = "h2";
  const buttons = [...lab.querySelectorAll("[data-step]")];
  const prev = lab.querySelector('[data-action="prev"]');
  const next = lab.querySelector('[data-action="next"]');
  const title = lab.querySelector("[data-stage-title]");
  const message = lab.querySelector("[data-stage-message]");
  const code = lab.querySelector("[data-stage-code]");
  const counter = lab.querySelector("[data-stage-counter]");
  const progress = lab.querySelector("[data-progress]");
  const nodes = [...lab.querySelectorAll("[data-node]")];
  const nodeByStage = ["browser","dns","dns","server","server","server","server","browser","browser"];
  function render(){
    const currentStage = mode === "h3" && modes[de?"de":"en"].h3[current] ? modes[de?"de":"en"].h3[current] : stages[current];
    title.textContent = currentStage[0];
    message.textContent = currentStage[1];
    code.textContent = currentStage[2];
    counter.textContent = (de?"Schritt ":"Step ") + (current + 1) + " / " + stages.length;
    progress.textContent = Math.round(((current+1)/stages.length)*100) + "%";
    prev.disabled = current === 0;
    next.disabled = current === stages.length-1;
    buttons.forEach((button,i)=>{if(i===current) button.setAttribute("aria-current","step");else button.removeAttribute("aria-current");button.classList.toggle("is-past",i<current);});
    nodes.forEach(node=>node.classList.toggle("is-lit",node.dataset.node===nodeByStage[current]));
  }
  buttons.forEach(button=>button.addEventListener("click",()=>{current=Number(button.dataset.step);render();}));
  lab.querySelectorAll("[data-mode]").forEach(button=>button.addEventListener("click",()=>{
    mode=button.dataset.mode;
    lab.querySelectorAll("[data-mode]").forEach(b=>b.setAttribute("aria-pressed",String(b===button)));
    render();
  }));
  prev.addEventListener("click",()=>{current=Math.max(0,current-1);render();});
  next.addEventListener("click",()=>{current=Math.min(stages.length-1,current+1);render();});
  lab.querySelector('[data-action="reset"]').addEventListener("click",()=>{current=0;render();});
  lab.classList.add("is-ready");
  render();
})();
