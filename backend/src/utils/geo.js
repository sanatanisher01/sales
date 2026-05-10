/**
 * Calculate the Haversine distance between two GPS coordinates in metres.
 */
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth radius in metres
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calculate total geodesic distance of a coordinate array in kilometres.
 * @param {Array<{lat: number, lng: number}>} coords
 * @returns {number} distance in km, rounded to 2 decimal places
 */
function totalDistance(coords) {
  if (!coords || coords.length < 2) return 0;
  let total = 0;
  for (let i = 1; i < coords.length; i++) {
    total += haversineDistance(
      coords[i - 1].lat,
      coords[i - 1].lng,
      coords[i].lat,
      coords[i].lng
    );
  }
  return Math.round((total / 1000) * 100) / 100;
}

/**
 * Reverse geocode using OpenStreetMap Nominatim (free, no API key).
 */
async function reverseGeocode(lat, lng) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'SalesTrackingPlatform/1.0' },
    });
    if (!response.ok) throw new Error('Nominatim error');
    const data = await response.json();
    return data.display_name || null;
  } catch {
    return null;
  }
}

module.exports = { haversineDistance, totalDistance, reverseGeocode };
