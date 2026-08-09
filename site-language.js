(() => {
  const STORAGE_KEY = "dennishilk-language";
  const LEGACY_KEYS = ["about-language"];
  const VERSION = "2026-08-09";

  const routes = {
    "/": { en: "/", de: "/de/" },
    "/index.html": { en: "/", de: "/de/" },
    "/de/": { en: "/", de: "/de/" },
    "/de/index.html": { en: "/", de: "/de/" },
    "/world-observer/hometown.html": {
      en: "/world-observer/hometown.html",
      de: "/de/world-observer/hometown.html",
    },
    "/de/world-observer/hometown.html": {
      en: "/world-observer/hometown.html",
      de: "/de/world-observer/hometown.html",
    },
    "/world-observer/wiesmoor.html": {
      en: "/world-observer/wiesmoor.html",
      de: "/de/world-observer/wiesmoor.html",
    },
    "/de/world-observer/wiesmoor.html": {
      en: "/world-observer/wiesmoor.html",
      de: "/de/world-observer/wiesmoor.html",
    },
  };

  const normalizeLanguage = (value) => (value === "de" ? "de" : value === "en" ? "en" : null);
  const currentPath = location.pathname || "/";
  const route = routes[currentPath];

  const readStoredLanguage = () => {
    try {
      const current = normalizeLanguage(localStorage.getItem(STORAGE_KEY));
      if (current) return current;

      for (const key of LEGACY_KEYS) {
        const legacy = normalizeLanguage(localStorage.getItem(key));
        if (legacy) {
          localStorage.setItem(STORAGE_KEY, legacy);
          return legacy;
        }
      }
    } catch (error) {
      // localStorage may be unavailable. The current page language remains the fallback.
    }
    return null;
  };

  const storeLanguage = (language) => {
    try {
      localStorage.setItem(STORAGE_KEY, language);
      LEGACY_KEYS.forEach((key) => localStorage.setItem(key, language));
    } catch (error) {
      // Navigation still works when storage is unavailable.
    }
  };

  if (!route) return;

  const currentLanguage = currentPath.startsWith("/de/") ? "de" : "en";
  const storedLanguage = readStoredLanguage();
  const targetLanguage = storedLanguage || currentLanguage;

  if (targetLanguage !== currentLanguage && route[targetLanguage]) {
    const target = route[targetLanguage] + location.search + location.hash;
    location.replace(target);
    return;
  }

  document.documentElement.lang = currentLanguage;

  const style = document.createElement("style");
  style.textContent = `
    .site-language-switcher {
      position: fixed;
      top: 14px;
      right: 16px;
      z-index: 10000;
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 7px 9px;
      border: 1px solid rgba(98, 231, 224, .35);
      border-radius: 999px;
      background: rgba(7, 16, 20, .88);
      box-shadow: 0 8px 24px rgba(0, 0, 0, .28);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      font: 12px/1 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    }
    .site-language-switcher a {
      color: #9aadaa;
      text-decoration: none;
      padding: 4px 3px;
      border-bottom: 1px solid transparent;
    }
    .site-language-switcher a[aria-current="true"] {
      color: #62e7e0;
      border-color: #62e7e0;
    }
    .site-language-switcher a:focus-visible {
      outline: 2px solid #e8a36c;
      outline-offset: 3px;
    }
    .site-language-switcher span { color: #61716f; }
    @media (max-width: 720px) {
      .site-language-switcher {
        top: 10px;
        right: 10px;
        padding: 6px 8px;
      }
    }
  `;
  document.head.appendChild(style);

  const switcher = document.createElement("nav");
  switcher.className = "site-language-switcher";
  switcher.setAttribute("aria-label", currentLanguage === "de" ? "Seitensprache" : "Page language");
  switcher.dataset.languageVersion = VERSION;

  const makeLink = (language, label) => {
    const link = document.createElement("a");
    link.href = route[language] + location.search + location.hash;
    link.textContent = label;
    link.hreflang = language;
    link.lang = language;
    link.setAttribute("aria-current", String(language === currentLanguage));
    link.addEventListener("click", () => storeLanguage(language));
    return link;
  };

  switcher.append(makeLink("en", "EN"));
  const separator = document.createElement("span");
  separator.textContent = "|";
  separator.setAttribute("aria-hidden", "true");
  switcher.append(separator, makeLink("de", "DE"));
  document.body.appendChild(switcher);
})();
