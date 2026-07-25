/** Width of the canonical World Observer basemap viewBox. */
export const MAP_WIDTH = 1800;

/** Height of the canonical World Observer basemap viewBox. */
export const MAP_HEIGHT = 900;

/**
 * Project a geographic coordinate into the canonical basemap's SVG viewBox.
 *
 * @param {number} latitude Latitude in degrees, from -90 to 90.
 * @param {number} longitude Longitude in degrees, from -180 to 180.
 * @returns {{x: number, y: number}} Coordinates in the 1800 x 900 viewBox.
 * @throws {RangeError|TypeError} If either coordinate is invalid.
 */
export function projectCoordinates(latitude, longitude) {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new TypeError("Latitude and longitude must be finite numbers.");
  }

  if (latitude < -90 || latitude > 90) {
    throw new RangeError("Latitude must be between -90 and 90 degrees.");
  }

  if (longitude < -180 || longitude > 180) {
    throw new RangeError("Longitude must be between -180 and 180 degrees.");
  }

  return {
    x: ((longitude + 180) / 360) * MAP_WIDTH,
    y: ((90 - latitude) / 180) * MAP_HEIGHT,
  };
}
