(() => {
  "use strict";

  const storageKey = "dennishilk-language";
  const current = document.documentElement.lang.toLowerCase().startsWith("de") ? "de" : "en";
  const routes = {
    en: "/world-observer/traceroute-to-nowhere.html",
    de: "/de/world-observer/traceroute-to-nowhere.html",
  };

  let stored = null;
  try {
    stored = localStorage.getItem(storageKey);
  } catch (error) {}

  if ((stored === "en" || stored === "de") && stored !== current) {
    location.replace(`${routes[stored]}${location.search}${location.hash}`);
    return;
  }

  document.querySelectorAll(".trace-language a[hreflang]").forEach(link => {
    link.addEventListener("click", () => {
      const language = link.getAttribute("hreflang");
      if (language !== "en" && language !== "de") return;
      try {
        localStorage.setItem(storageKey, language);
        localStorage.setItem("about-language", language);
      } catch (error) {}
    });
  });
})();
