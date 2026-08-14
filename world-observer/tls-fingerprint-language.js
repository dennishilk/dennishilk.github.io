(() => {
  "use strict";

  const STORAGE_KEY = "dennishilk-language";
  const LEGACY_KEY = "about-language";

  document.addEventListener("click", event => {
    const link = event.target.closest(".tls-language a[hreflang]");
    if (!link) return;

    const language = link.getAttribute("hreflang");
    if (language !== "en" && language !== "de") return;

    event.preventDefault();
    try {
      localStorage.setItem(STORAGE_KEY, language);
      localStorage.setItem(LEGACY_KEY, language);
    } catch (error) {}

    window.location.assign(link.href);
  }, true);
})();
