# 🧑‍💻 Dennis Hilk — Personal GitHub Page

Welcome to the source of my personal developer website:  
👉 **[dennishilk.github.io](https://dennishilk.github.io)**  

This page serves as the central hub for all my Linux-related projects, tutorials, and open-source releases —  
including **Nebunix OS**, **Project Maxwell**, **Penguin Power Plant**, and more.

---

## 🐧 About the Site

Built using:
- Pure **HTML + CSS + Vanilla JS**
- Custom dark **tech aesthetic**
- Animated **starfield background**
- **Neon-terminal UI** inspired by Zsh / Powerlevel10k
- Offline, **no tracking**, **no analytics**

---

## ⚙️ Features

| Feature | Description |
|----------|-------------|
| 🧠 **Static & Fast** | No frameworks, fully hosted on GitHub Pages |
| 🐧 **Nebby Mascot** | The official space penguin of Nebunix OS |
| 💫 **Starfield Background** | Animated JavaScript canvas (stars.js) |
| 💡 **Dynamic Visitor Counter** | Simulated, time-based counter (no API or tracking) |
| 📰 **News Page** | Live Linux news feed from Phoronix & OMG!Ubuntu |
| 🎨 **Gruvbox-like Design** | Clean, minimal, readable |

💬 License

This repository is open-source.
Feel free to fork, study, and learn from it — but please give credit when reusing assets (avatar, Nebby, or layout).

© 2025 Dennis Hilk — GitHub Profile

---

## World Observer shared map engine

The reusable map engine lives beside the immutable canonical basemap in
`assets/maps/world/`. It uses plain ES modules and has no dependencies. Future
Observers should use `WorldObserverMap` instead of querying or changing raw SVG.

### Creating a map

```html
<div id="map"></div>
<script type="module">
  import WorldObserverMap from "/assets/maps/world/world-map.js";

  const map = new WorldObserverMap({ container: "#map" });
  await map.ready;
</script>
```

The default source is `/assets/maps/world/world-observer-basemap.svg`. A custom
URL can be passed as `svg` when required by a different hosting base path.
Marker and overlay methods may be called immediately; each returns a promise
that resolves to the created SVG element after `map.ready` settles.

### Adding markers

```js
await map.addMarker({
  latitude: 51.05,
  longitude: 13.74,
  size: 8,
  color: "#38d0ff",
  className: "observer-station",
  id: "dresden-station",
});

await map.addPulseMarker({
  latitude: 38.32,
  longitude: 142.37,
  size: 12,
  color: "#38d0ff",
});
```

`addRingMarker()` accepts the same options. Animations are CSS-only and honor
the visitor's reduced-motion preference.

### Drawing a line

```js
await map.addPolyline({
  points: [
    { latitude: 51.05, longitude: 13.74 },
    { latitude: 35.68, longitude: 139.69 },
  ],
  color: "#38d0ff",
  width: 2,
});
```

Use `addCircle({ latitude, longitude, radius, ... })` for circles and
`addTextLabel({ latitude, longitude, text, ... })` for labels. Dedicated layers
keep overlays, markers, and labels in a stable visual order regardless of call
order.

### Projecting coordinates

```js
import { projectCoordinates } from "/assets/maps/world/projection.js";

const center = projectCoordinates(0, 0); // { x: 900, y: 450 }
const point = map.projectCoordinates(38.32, 142.37);
```

Latitude must be between -90 and 90 and longitude between -180 and 180. The
result uses the canonical 1800 × 900 equirectangular SVG viewBox.
