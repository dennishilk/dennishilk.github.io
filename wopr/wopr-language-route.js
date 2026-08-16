(() => {
  const STORAGE_KEY = "dennishilk-language";
  const routes = {
    "/wopr/": { en: "/wopr/", de: "/de/wopr/" },
    "/de/wopr/": { en: "/wopr/", de: "/de/wopr/" },
    "/wopr/dashboard/": { en: "/wopr/dashboard/", de: "/de/wopr/dashboard/" },
    "/de/wopr/dashboard/": { en: "/wopr/dashboard/", de: "/de/wopr/dashboard/" },
    "/wopr/dashboard/security/": { en: "/wopr/dashboard/security/", de: "/de/wopr/dashboard/security/" },
    "/de/wopr/dashboard/security/": { en: "/wopr/dashboard/security/", de: "/de/wopr/dashboard/security/" },
  };
  const pair = routes[location.pathname];
  if (!pair) return;
  const current = location.pathname.startsWith("/de/") ? "de" : "en";
  let stored = null;
  try { stored = localStorage.getItem(STORAGE_KEY); } catch (_) {}
  if ((stored === "en" || stored === "de") && stored !== current) {
    location.replace(pair[stored] + location.search + location.hash);
    return;
  }
  const nav = document.createElement("nav");
  nav.className = "wopr-language-switcher";
  nav.setAttribute("aria-label", current === "de" ? "Seitensprache" : "Page language");
  nav.innerHTML = `<a href="${pair.en}" lang="en"${current === "en" ? ' aria-current="page"' : ""}>EN</a><span aria-hidden="true">|</span><a href="${pair.de}" lang="de"${current === "de" ? ' aria-current="page"' : ""}>DE</a>`;
  document.body.prepend(nav);
  nav.querySelectorAll("a").forEach((link) => link.addEventListener("click", () => {
    try { localStorage.setItem(STORAGE_KEY, link.lang); } catch (_) {}
  }));
})();
