(() => {
  const STORAGE_KEY = "dennishilk-language";
  const pairs = {
    "/impressum.html": { en: "/impressum.html", de: "/de/impressum.html" },
    "/de/impressum.html": { en: "/impressum.html", de: "/de/impressum.html" },
    "/datenschutzerklaerung.html": { en: "/datenschutzerklaerung.html", de: "/de/datenschutzerklaerung.html" },
    "/de/datenschutzerklaerung.html": { en: "/datenschutzerklaerung.html", de: "/de/datenschutzerklaerung.html" },
  };

  const pair = pairs[location.pathname];
  if (!pair) return;

  let stored = null;
  try { stored = localStorage.getItem(STORAGE_KEY); } catch (_) {}
  const current = location.pathname.startsWith("/de/") ? "de" : "en";
  if ((stored === "de" || stored === "en") && stored !== current) {
    location.replace(pair[stored] + location.search + location.hash);
    return;
  }

  const nav = document.createElement("nav");
  nav.className = "legal-language-switcher";
  nav.setAttribute("aria-label", current === "de" ? "Seitensprache" : "Page language");
  nav.innerHTML = `<a href="${pair.en}" lang="en"${current === "en" ? ' aria-current="page"' : ""}>EN</a><span aria-hidden="true">|</span><a href="${pair.de}" lang="de"${current === "de" ? ' aria-current="page"' : ""}>DE</a>`;
  document.body.prepend(nav);

  nav.querySelectorAll("a").forEach(link => {
    link.addEventListener("click", () => {
      try { localStorage.setItem(STORAGE_KEY, link.lang); } catch (_) {}
    });
  });
})();
