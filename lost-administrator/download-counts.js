(() => {
  "use strict";

  const release = {
    owner: "dennishilk",
    repository: "dennishilk.github.io",
    tag: "the-lost-administrator-v1.0",
    assets: {
      english: "The_Lost_Administrator_English.pdf",
      german: "The_Lost_Administrator_German.pdf"
    }
  };
  // One-time migration offset for downloads made before the release assets existed.
  const DOWNLOAD_BASELINE = {
    english: 35,
    german: 15
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
      const english = assets.find((asset) => asset.name === release.assets.english);
      const german = assets.find((asset) => asset.name === release.assets.german);
      if (!english || !german) throw new Error("Release assets unavailable");
      if (!Number.isInteger(english.download_count) || !Number.isInteger(german.download_count)) {
        throw new Error("Release download counts unavailable");
      }
      const counts = {
        english: DOWNLOAD_BASELINE.english + english.download_count,
        german: DOWNLOAD_BASELINE.german + german.download_count
      };
      render(counts);
    })
    .catch(() => {
      // The em dash already in the page is the intentionally quiet failure state.
    })
    .finally(() => window.clearTimeout(timeout));
})();
