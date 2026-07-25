# World Observer Basemap

Canonical non-political world basemap for World Observer.

## Files

- `world-observer-basemap.svg` — reusable styled world map
- `LICENSE-Natural-Earth.txt` — source and public-domain note

## Source

Natural Earth 1:50m Physical Vectors — Land, version 4.1.0.

## Geometry

- Projection: equirectangular
- SVG viewBox: `0 0 1800 900`
- Source CRS: WGS84 longitude/latitude
- No political borders
- Direct SVG colors for broad renderer compatibility

## Coordinate projection

```js
function projectCoordinates(latitude, longitude) {
  return {
    x: ((longitude + 180) / 360) * 1800,
    y: ((90 - latitude) / 180) * 900
  };
}
```

## Repository location

```text
assets/maps/world/
├── world-observer-basemap.svg
├── LICENSE-Natural-Earth.txt
└── README.md
```

Keep the original Natural Earth shapefile separately under:

```text
assets/maps/source/natural-earth/ne_50m_land/
```

Treat the SVG as a canonical geographic asset. Observer code may add
markers, overlays and labels, but should not redraw or replace its geography.
