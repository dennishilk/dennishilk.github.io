(() => {
  const bundle = window.DennisSiteI18nDE || (window.DennisSiteI18nDE = { common: {}, prefixes: {}, pages: {} });
  bundle.pages ||= {};

  const path = "/world-observer/wiesmoor-peatland.html";
  const page = bundle.pages[path] || (bundle.pages[path] = {});
  page.text = Object.assign({}, page.text || {}, {
    "ACTIVE · OK": "AKTIV · OK",
    "Nearby groundwater stations can indicate regional groundwater behaviour but are not an in-situ peat water-table sensor for Wiesmoor-Nord.": "Nahegelegene Grundwassermessstellen können Hinweise auf das regionale Grundwasserverhalten geben, sind jedoch kein In-situ-Sensor für den Moorwasserstand in Wiesmoor-Nord."
  });
  page.phrases = [
    ...(page.phrases || []),
    ["Moorschutzprogramm entry ", "Moorschutzprogramm Gebiet "],
    ["Daily grids of mean soil moisture under grass for Germany, Version v1.0", "Tägliche Raster der mittleren Bodenfeuchte unter Gras für Deutschland, Version v1.0"],
    ["Recent daily climate observations Germany (KL), daily precipitation RSK and daily mean temperature TMK", "Aktuelle tägliche Klimabeobachtungen Deutschland (KL), täglicher Niederschlag RSK und Tagesmitteltemperatur TMK"]
  ];
})();
