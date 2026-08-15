(() => {
  "use strict";
  const pairs = {
    "/world-observer/wiesmoor-weather.html": "/de/world-observer/wiesmoor-weather.html",
    "/world-observer/wiesmoor-peatland.html": "/de/world-observer/wiesmoor-peatland.html",
    "/world-observer/wiesmoor-sky.html": "/de/world-observer/wiesmoor-sky.html",
    "/world-observer/east-frisia-water.html": "/de/world-observer/east-frisia-water.html",
    "/world-observer/horizon-observer.html": "/de/world-observer/horizon-observer.html",
    "/world-observer/wiesmoor-population.html": "/de/world-observer/wiesmoor-population.html",
    "/world-observer/wiesmoor-energy.html": "/de/world-observer/wiesmoor-energy.html",
    "/world-observer/wiesmoor-groundwater.html": "/de/world-observer/wiesmoor-groundwater.html",
    "/world-observer/wiesmoor-development.html": "/de/world-observer/wiesmoor-development.html",
    "/world-observer/wiesmoor-finance.html": "/de/world-observer/wiesmoor-finance.html",
  };
  const reverse = Object.fromEntries(Object.entries(pairs).map(([en, de]) => [de, en]));
  const currentPath = location.pathname;
  const enPath = reverse[currentPath] || (pairs[currentPath] ? currentPath : null);
  if (!enPath) return;
  const dePath = pairs[enPath];
  const current = currentPath.startsWith("/de/") ? "de" : "en";

  let stored = null;
  try { stored = localStorage.getItem("dennishilk-language"); } catch (error) {}
  if ((stored === "en" || stored === "de") && stored !== current) {
    location.replace(`${stored === "de" ? dePath : enPath}${location.search}${location.hash}`);
    return;
  }

  const style = document.createElement("style");
  style.textContent = `.site-language-switcher{position:fixed;top:14px;right:16px;z-index:10000;display:inline-flex;align-items:center;gap:5px;padding:7px 9px;border:1px solid rgba(98,231,224,.35);border-radius:999px;background:rgba(7,16,20,.88);box-shadow:0 8px 24px rgba(0,0,0,.28);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);font:12px/1 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}.site-language-switcher a{color:#9aadaa;text-decoration:none;padding:4px 3px;border-bottom:1px solid transparent}.site-language-switcher a[aria-current="page"]{color:#62e7e0;border-color:#62e7e0}.site-language-switcher a:focus-visible{outline:2px solid #e8a36c;outline-offset:3px}.site-language-switcher span{color:#61716f}@media(max-width:720px){.site-language-switcher{top:10px;right:10px;padding:6px 8px}}`;
  document.head.appendChild(style);

  const nav = document.createElement("nav");
  nav.className = "site-language-switcher";
  nav.setAttribute("aria-label", "Page language / Seitensprache");
  const addLink = (language, label, route) => {
    const link = document.createElement("a");
    link.textContent = label;
    link.lang = language;
    link.hreflang = language;
    link.href = `${route}${location.search}${location.hash}`;
    if (language === current) link.setAttribute("aria-current", "page");
    link.addEventListener("click", () => {
      try {
        localStorage.setItem("dennishilk-language", language);
        localStorage.setItem("about-language", language);
      } catch (error) {}
    });
    nav.appendChild(link);
  };
  addLink("en", "EN", enPath);
  const separator = document.createElement("span");
  separator.textContent = "|";
  separator.setAttribute("aria-hidden", "true");
  nav.appendChild(separator);
  addLink("de", "DE", dePath);
  document.body.appendChild(nav);
})();
