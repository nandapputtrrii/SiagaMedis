import test, { describe } from 'node:test';
import assert from 'node:assert';
import {
  calculateHaversineDistance,
  formatDistance,
  isWithinGeofenceRadius,
  calculateEtaMinutes,
} from '../src/utils/haversine.ts';
import type { Coordinates } from '../src/types/spatial.ts';

describe('Milestone 1 — Haversine Spatial Engine & Geofencing Tests', () => {
  const pkuCoords: Coordinates = {
    latitude: -7.8005,
    longitude: 110.3621,
  };

  const sardjitoCoords: Coordinates = {
    latitude: -7.7686,
    longitude: 110.3736,
  };

  test('Jarak antara dua koordinat identik harus 0 km', () => {
    const dist = calculateHaversineDistance(pkuCoords, pkuCoords);
    assert.strictEqual(dist, 0);
  });

  test('Kalkulasi jarak Haversine antara RS PKU dan RSUP Sardjito (~3.7 km)', () => {
    const dist = calculateHaversineDistance(pkuCoords, sardjitoCoords);
    // Berdasarkan koordinat Yogyakarta, jarak garis lurus sekitar 3.7 - 3.8 km
    assert.ok(dist >= 3.5 && dist <= 4.0, `Expected ~3.7 km, got ${dist}`);
  });

  test('formatDistance mengembalikan format meter jika jarak < 1 km', () => {
    assert.strictEqual(formatDistance(0.45), '450 m');
    assert.strictEqual(formatDistance(0.05), '50 m');
  });

  test('formatDistance mengembalikan format kilometer jika jarak >= 1 km', () => {
    assert.strictEqual(formatDistance(3.72), '3.7 km');
    assert.strictEqual(formatDistance(12.45), '12.5 km');
  });

  test('isWithinGeofenceRadius mendeteksi apakah posisi berada dalam radius', () => {
    // Titik sangat dekat (jarak ~100m)
    const nearbyPoint: Coordinates = {
      latitude: -7.801,
      longitude: 110.3625,
    };
    assert.strictEqual(isWithinGeofenceRadius(pkuCoords, nearbyPoint, 500), true);

    // Titik jauh (Sardjito ~3.7km, radius geofence hanya 1000m)
    assert.strictEqual(isWithinGeofenceRadius(pkuCoords, sardjitoCoords, 1000), false);
  });

  test('calculateEtaMinutes menghitung estimasi waktu tiba dengan benar', () => {
    // Jarak 40 km dengan kecepatan 40 km/jam -> 60 menit
    const eta = calculateEtaMinutes(40, 40);
    assert.strictEqual(eta, 60);

    // Jarak 0 km -> minimal 1 menit
    const minEta = calculateEtaMinutes(0);
    assert.strictEqual(minEta, 1);
  });
});
