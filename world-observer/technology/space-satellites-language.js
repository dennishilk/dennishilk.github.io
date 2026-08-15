(function () {
  "use strict";

  const routes = {
    en: "/world-observer/technology/space-satellites.html",
    de: "/de/world-observer/technology/space-satellites.html",
  };
  const current = document.documentElement.lang.toLowerCase().startsWith("de") ? "de" : "en";

  let stored = null;
  try {
    stored = localStorage.getItem("dennishilk-language");
  } catch (error) {}

  if ((stored === "en" || stored === "de") && stored !== current) {
    location.replace(`${routes[stored]}${location.search}${location.hash}`);
    return;
  }

  document.querySelectorAll("[data-space-language]").forEach((link) => {
    link.addEventListener("click", () => {
      const language = link.dataset.spaceLanguage;
      if (language !== "en" && language !== "de") return;
      try {
        localStorage.setItem("dennishilk-language", language);
        localStorage.setItem("about-language", language);
      } catch (error) {}
    });
  });
}());
