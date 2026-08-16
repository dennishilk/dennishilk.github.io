(() => {
  const bundle = window.DennisSiteI18nDE || (window.DennisSiteI18nDE = { common: {}, prefixes: {}, pages: {} });
  bundle.pages ||= {};

  const route = "/museum/linux-game-install/lab.html";
  const page = bundle.pages[route] || (bundle.pages[route] = {});
  page.text = Object.assign({}, page.text || {}, {
    "ENTER CALLSIGN": "RUFZEICHEN EINGEBEN",
  });
})();
