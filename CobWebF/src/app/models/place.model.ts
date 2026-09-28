export interface Place {
  id: string;
  // Short label, e.g. "Regensburg".
  name: string;
  // Everything after the name, e.g. "Bayern, Deutschland".
  region: string;

  // Latitude
  lat: number;
  // Longitude
  lon: number;
  // Filled in once the place has been measured against a search center.
  distanceKm?: number;
}

const EARTH_RADIUS_KM = 6371;

export function distanceInKm(a: Place, b: Place): number {
  const dLat = toRadians(b.lat - a.lat);
  const dLon = toRadians(b.lon - a.lon);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(a.lat)) * Math.cos(toRadians(b.lat)) * Math.sin(dLon / 2) ** 2;

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}
