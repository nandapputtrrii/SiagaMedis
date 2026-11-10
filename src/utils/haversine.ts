import type { Coordinates } from '../types/spatial';

// Konstanta radius bumi rata-rata WGS-84 dalam kilometer
const EARTH_RADIUS_KM = 6371.0;

/**
 * Mengonversi derajat ke radian
 */
function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Menghitung jarak garis lurus (great-circle distance) antara dua koordinat geografis
 * menggunakan Formulasi Haversine.
 *
 * @param origin - Koordinat awal { latitude, longitude }
 * @param destination - Koordinat tujuan { latitude, longitude }
 * @returns Jarak dalam kilometer (presisi 3 desimal)
 */
export function calculateHaversineDistance(
  origin: Coordinates,
  destination: Coordinates
): number {
  if (
    origin.latitude === destination.latitude &&
    origin.longitude === destination.longitude
  ) {
    return 0;
  }

  const dLat = toRadians(destination.latitude - origin.latitude);
  const dLon = toRadians(destination.longitude - origin.longitude);

  const lat1 = toRadians(origin.latitude);
  const lat2 = toRadians(destination.latitude);

  // Rumus Haversine:
  // a = sin²(Δlat/2) + cos(lat1) * cos(lat2) * sin²(Δlon/2)
  // c = 2 * atan2(√a, √(1−a))
  // d = R * c
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = EARTH_RADIUS_KM * c;

  // Bulatkan ke 3 angka desimal (presisi meter)
  return Math.round(distance * 1000) / 1000;
}

/**
 * Format jarak ke string yang ramah pengguna (m jika < 1km, km jika >= 1km)
 */
export function formatDistance(distanceKm: number): string {
  if (distanceKm < 1) {
    const meters = Math.round(distanceKm * 1000);
    return `${meters} m`;
  }
  const roundedKm = Math.round(distanceKm * 10) / 10;
  return `${roundedKm.toFixed(1)} km`;
}

/**
 * Memeriksa apakah suatu titik koordinat berada di dalam radius geofence tertentu
 * @param center Titik pusat geofence
 * @param target Titik yang diperiksa
 * @param radiusMeters Radius geofence dalam meter
 */
export function isWithinGeofenceRadius(
  center: Coordinates,
  target: Coordinates,
  radiusMeters: number
): boolean {
  const distanceKm = calculateHaversineDistance(center, target);
  return distanceKm * 1000 <= radiusMeters;
}

/**
 * Mengestimasi waktu kedatangan (ETA) ambulans dalam menit berdasarkan jarak dan kecepatan rata-rata darurat
 * @param distanceKm Jarak dalam km
 * @param averageSpeedKmh Kecepatan rata-rata ambulans dengan sirine (default 40 km/jam di area perkotaan)
 */
export function calculateEtaMinutes(
  distanceKm: number,
  averageSpeedKmh: number = 40
): number {
  if (distanceKm <= 0) return 1;
  const hours = distanceKm / averageSpeedKmh;
  const minutes = Math.ceil(hours * 60);
  return Math.max(1, minutes);
}
