(() => {
  "use strict";

  const germanPath = location.pathname;
  const supported = new Set([
    "/de/world-observer.html",
    "/de/world-observer/environment.html",
    "/de/world-observer/technology.html",
    "/de/world-observer/geomagnetic-storm-observer.html",
    "/de/world-observer/earthquake-observer.html",
    "/de/world-observer/ocean-buoy-observer.html",
    "/de/world-observer/time-observer.html",
    "/de/world-observer/technology/debian-package-count.html",
    "/de/world-observer/technology/arch-package-count.html",
  ]);
  if (!supported.has(germanPath)) return;

  const sourcePath = germanPath.replace(/^\/de/, "");
  const sourceDirectory = sourcePath.includes("/")
    ? sourcePath.slice(0, sourcePath.lastIndexOf("/") + 1)
    : "/";

  const escapeHtml = value => String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

  const fail = message => {
    document.documentElement.lang = "de";
    document.body.innerHTML = `<main style="max-width:760px;margin:12vh auto;padding:24px;font:16px/1.6 system-ui;color:#eee;background:#111;border:1px solid #444"><h1>World Observer</h1><p>Die deutsche Fassung konnte nicht geladen werden.</p><p><code>${escapeHtml(message)}</code></p><p><a style="color:#7de7e0" href="${escapeHtml(sourcePath)}">Englische Originalseite öffnen</a></p></main>`;
  };

  document.documentElement.lang = "de";
  try {
    localStorage.setItem("dennishilk-language", "de");
    localStorage.setItem("about-language", "de");
  } catch (error) {}

  fetch(sourcePath, { credentials: "same-origin", cache: "no-cache" })
    .then(response => {
      if (!response.ok) throw new Error(`HTTP ${response.status} for ${sourcePath}`);
      return response.text();
    })
    .then(source => {
      const bootstrap = [
        `<base href="${escapeHtml(sourceDirectory)}">`,
        `<script>window.__DENNIS_WORLD_OBSERVER_MIRROR_SOURCE_PATH=${JSON.stringify(sourcePath)};<\/script>`,
      ].join("");
      const rendered = /<head(?:\s[^>]*)?>/i.test(source)
        ? source.replace(/<head(\s[^>]*)?>/i, match => `${match}${bootstrap}`)
        : source.replace(/<html(\s[^>]*)?>/i, match => `${match}<head>${bootstrap}</head>`);

      document.open();
      document.write(rendered);
      document.close();
    })
    .catch(error => fail(error?.message || String(error)));
})();