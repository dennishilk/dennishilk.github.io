(() => {
  "use strict";

  const germanPath = window.location.pathname;
  if (!germanPath.startsWith("/de/museum/")) return;

  const sourcePath = germanPath.replace(/^\/de/, "");
  const sourceDirectory = sourcePath.endsWith("/")
    ? sourcePath
    : sourcePath.slice(0, sourcePath.lastIndexOf("/") + 1);

  const escapeHtml = value => String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

  const fail = message => {
    document.documentElement.lang = "de";
    document.body.innerHTML = `<main style="max-width:760px;margin:12vh auto;padding:24px;font:16px/1.6 system-ui;color:#eee;background:#111;border:1px solid #444"><h1>Computer Museum</h1><p>Die deutsche Fassung konnte nicht geladen werden.</p><p><code>${escapeHtml(message)}</code></p><p><a style="color:#7de7e0" href="${escapeHtml(sourcePath)}">Englische Originalseite öffnen</a></p></main>`;
  };

  fetch(sourcePath, { credentials: "same-origin", cache: "no-cache" })
    .then(response => {
      if (!response.ok) throw new Error(`HTTP ${response.status} for ${sourcePath}`);
      return response.text();
    })
    .then(source => {
      const bootstrap = [
        `<base href="${sourceDirectory}">`,
        `<script>window.__DENNIS_MUSEUM_MIRROR_SOURCE_PATH=${JSON.stringify(sourcePath)};window.__DENNIS_FORCE_SITE_LANGUAGE="de";<\/script>`,
        `<script defer data-site-language-loader src="/site-language.js?v=20260816-museum-2"><\/script>`,
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
