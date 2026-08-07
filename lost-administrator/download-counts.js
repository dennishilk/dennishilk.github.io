(() => {
  "use strict";

  // Add the published GitHub release tag here to enable real download counts.
  // The asset names must exactly match the two files attached to that release.
  const release = {
    owner: "dennishilk",
    repository: "dennishilk.github.io",
    tag: "",
    assets: {
      english: "The_Lost_Administrator_English.pdf",
      german: "The_Lost_Administrator_German.pdf"
    }
  };
  const cacheKey = "lost-administrator-release-download-counts";
  const cacheLifetime = 60 * 60 * 1000;
  const output = document.querySelector("#lost-admin-download-counts");

  if (!output || !release.tag) return;

  const render = (counts) => {
    const english = output.querySelector('[data-download-count="english"]');
    const german = output.querySelector('[data-download-count="german"]');
    const total = output.querySelector('[data-download-count="total"]');
    english.textContent = counts.english.toLocaleString("en-US");
    german.textContent = counts.german.toLocaleString("en-US");
    total.textContent = (counts.english + counts.german).toLocaleString("en-US");
  };
  const routeDownloads = (urls) => {
    output.parentElement.querySelector('[data-download-edition="english"]').href = urls.english;
    output.parentElement.querySelector('[data-download-edition="german"]').href = urls.german;
  };

  try {
    const cached = JSON.parse(localStorage.getItem(cacheKey));
    if (cached && Date.now() - cached.savedAt < cacheLifetime) {
      routeDownloads(cached.urls);
      render(cached.counts);
      return;
    }
  } catch {
    // Storage can be unavailable; the public API remains a safe fallback.
  }

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
      const counts = { english: english.download_count, german: german.download_count };
      const urls = { english: english.browser_download_url, german: german.browser_download_url };
      routeDownloads(urls);
      render(counts);
      try {
        localStorage.setItem(cacheKey, JSON.stringify({ savedAt: Date.now(), counts, urls }));
      } catch {
        // Counts still render when storage is disabled or full.
      }
    })
    .catch(() => {
      // The em dash already in the page is the intentionally quiet failure state.
    })
    .finally(() => window.clearTimeout(timeout));
})();
