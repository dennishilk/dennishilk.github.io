(() => {
  "use strict";

  const release = {
    owner: "dennishilk",
    repository: "dennishilk.github.io",
    tag: "the-lost-administrator-v1.0",
    assets: {
      english: [
        "The_Lost_Administrator_English.pdf",
        "The_Lost_Administrator_English.epub"
      ],
      german: [
        "The_Lost_Administrator_German.pdf",
        "The_Lost_Administrator_German.epub"
      ]
    }
  };

  // One-time migration offset for downloads made before the release assets existed.
  const DOWNLOAD_BASELINE = {
    english: 94,
    german: 42
  };

  const output = document.querySelector("#lost-admin-download-counts");
  if (!output) return;

  const render = (counts) => {
    const english = output.querySelector('[data-download-count="english"]');
    const german = output.querySelector('[data-download-count="german"]');
    const total = output.querySelector('[data-download-count="total"]');

    english.textContent = counts.english.toLocaleString("en-US");
    german.textContent = counts.german.toLocaleString("en-US");
    total.textContent = (counts.english + counts.german).toLocaleString("en-US");
  };

  const findAsset = (assets, name) => assets.find((asset) => asset.name === name);

  const sumDownloads = (assets, names) => names.reduce((sum, name) => {
    const asset = findAsset(assets, name);
    if (!asset) return sum;
    if (!Number.isInteger(asset.download_count)) {
      throw new Error("Release download counts unavailable");
    }
    return sum + asset.download_count;
  }, 0);

  const revealAvailableDownloads = (assets) => {
    document.querySelectorAll("[data-release-asset]").forEach((link) => {
      const asset = findAsset(assets, link.dataset.releaseAsset);
      if (!asset) return;
      link.href = asset.browser_download_url;
      link.hidden = false;
    });
  };

  const endpoint = `https://api.github.com/repos/${release.owner}/${release.repository}/releases/tags/${encodeURIComponent(release.tag)}`;
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 5000);

  fetch(endpoint, {
    headers: { Accept: "application/vnd.github+json" },
    signal: controller.signal
  })
    .then((response) => {
      if (!response.ok) throw new Error("Release metadata unavailable");
      return response.json();
    })
    .then(({ assets = [] }) => {
      // PDFs are the required base assets. EPUBs are optional until uploaded;
      // once present, their download counts are automatically added by language.
      const englishPdf = findAsset(assets, release.assets.english[0]);
      const germanPdf = findAsset(assets, release.assets.german[0]);
      if (!englishPdf || !germanPdf) throw new Error("Release assets unavailable");

      revealAvailableDownloads(assets);

      const counts = {
        english: DOWNLOAD_BASELINE.english + sumDownloads(assets, release.assets.english),
        german: DOWNLOAD_BASELINE.german + sumDownloads(assets, release.assets.german)
      };

      render(counts);
    })
    .catch(() => {
      // The em dash already in the page is the intentionally quiet failure state.
    })
    .finally(() => window.clearTimeout(timeout));
})();
