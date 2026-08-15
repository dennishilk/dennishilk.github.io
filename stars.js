const dedicatedInternetDetailIds = new Set([
  "cuba-internet-weather",
  "dns-time-to-answer-index",
  "dns-tta-stress-index",
  "global-reachability-long-horizon",
  "global-reachability-score",
  "http-reachability-index",
  "internet-shrinkage-index",
  "ipv6-adoption-locked-states",
  "ipv6-global-compare",
  "ipv6-locked-states",
  "iran-dns-behavior",
  "mx-presence-by-country",
  "mx-presence-per-country",
  "north-korea-connectivity",
  "silent-countries-list",
  "tls-fingerprint-change",
  "traceroute-to-nowhere",
  "undersea-cable-dependency",
  "undersea-cable-dependency-map",
]);

const useDedicatedInternetLanguageUi =
  document.body?.dataset.observerPage === "internet-detail"
  && dedicatedInternetDetailIds.has(document.body?.dataset.observerId);

const dedicatedGermanWiesmoorPaths = new Set([
  "/de/world-observer/wiesmoor-weather.html",
  "/de/world-observer/wiesmoor-peatland.html",
  "/de/world-observer/wiesmoor-sky.html",
  "/de/world-observer/east-frisia-water.html",
  "/de/world-observer/horizon-observer.html",
  "/de/world-observer/wiesmoor-population.html",
  "/de/world-observer/wiesmoor-energy.html",
  "/de/world-observer/wiesmoor-groundwater.html",
  "/de/world-observer/wiesmoor-development.html",
  "/de/world-observer/wiesmoor-finance.html",
]);
const useDedicatedGermanWiesmoorUi = dedicatedGermanWiesmoorPaths.has(window.location.pathname);

if (!document.querySelector('script[data-seo-runtime-loader]')) {
  const seoScript = document.createElement('script');
  seoScript.src = '/seo-runtime.js?v=20260815-1';
  seoScript.dataset.seoRuntimeLoader = 'true';
  document.head.appendChild(seoScript);
}

if (useDedicatedGermanWiesmoorUi) {
  if (!document.querySelector('script[data-wiesmoor-de-loader]')) {
    const languageScript = document.createElement('script');
    languageScript.src = '/wiesmoor-de-bootstrap.js?v=20260815-1';
    languageScript.dataset.wiesmoorDeLoader = 'true';
    document.head.appendChild(languageScript);
  }
} else if (!useDedicatedInternetLanguageUi && !document.querySelector('script[data-site-language-loader]')) {
  const languageScript = document.createElement('script');
  languageScript.src = '/site-language.js?v=20260814-area51-1';
  languageScript.dataset.siteLanguageLoader = 'true';
  document.head.appendChild(languageScript);
}

const canvas = document.getElementById("stars");
const homepagePaths = new Set(["/", "/index.html", "/de/", "/de/index.html"]);
const isHomepage = homepagePaths.has(window.location.pathname);

if (!isHomepage || !canvas) {
  canvas?.remove();
} else {
  const ctx = canvas.getContext("2d");
  let width = 0;
  let height = 0;
  let pixelRatio = 1;
  let stars = [];

  function makeStar() {
    return {
      x: (Math.random() - 0.5) * width,
      y: (Math.random() - 0.5) * height,
      z: Math.random() * width,
    };
  }

  function resize() {
    const bounds = canvas.getBoundingClientRect();
    const nextWidth = bounds.width || document.documentElement.clientWidth;
    const nextHeight = bounds.height || document.documentElement.clientHeight;
    const nextRatio = window.devicePixelRatio || 1;
    const scaleX = width ? nextWidth / width : 1;
    const scaleY = height ? nextHeight / height : 1;

    width = nextWidth;
    height = nextHeight;
    pixelRatio = nextRatio;
    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

    stars.forEach((star) => {
      star.x *= scaleX;
      star.y *= scaleY;
      star.z *= scaleX;
    });
  }
  window.addEventListener("resize", resize);
  window.visualViewport?.addEventListener("resize", resize);
  resize();

  stars = Array.from({ length: 200 }, makeStar);

  function animate() {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = "#00b4ff";
    stars.forEach((s) => {
      s.z -= 2;
      if (s.z <= 0) s.z = width;
      const k = 128.0 / s.z;
      const px = s.x * k + width / 2;
      const py = s.y * k + height / 2;
      if (px >= 0 && px <= width && py >= 0 && py <= height) {
        const size = (1 - s.z / width) * 2;
        ctx.beginPath();
        ctx.arc(px, py, size, 0, Math.PI * 2);
        ctx.fill();
      }
    });
    requestAnimationFrame(animate);
  }
  animate();
}
