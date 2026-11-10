import { useEffect, useRef, useCallback } from 'react';
import * as Location from 'expo-location';
import { useLocationStore } from '../stores/locationStore';
import { Coordinates } from '../types/spatial';

// Default fallback coordinates: Pusat Kota Yogyakarta
const FALLBACK_COORDINATES: Coordinates = {
  latitude: -7.7956,
  longitude: 110.3695,
  accuracy: 10,
};

interface UseLocationTrackingOptions {
  isEmergencyActive?: boolean;
  enableHighAccuracy?: boolean;
}

/**
 * Custom Hook untuk tracking lokasi berbasis LBS secara reaktif.
 * Memenuhi Architect's Audit Protocol:
 * 1. Explicit Error & Permission Handling (Just-In-Time runtime permission)
 * 2. Graceful Fallback (menggunakan default coords jika izin ditolak)
 * 3. Zero Memory Leak (cleanup subscription saat unmount)
 * 4. Adaptive Distance Interval (penghematan baterai vs presisi darurat)
 */
export function useLocationTracking(options: UseLocationTrackingOptions = {}) {
  const { isEmergencyActive = false } = options;

  const subscriptionRef = useRef<Location.LocationSubscription | null>(null);

  const currentLocation = useLocationStore((state) => state.currentLocation);
  const permissionStatus = useLocationStore((state) => state.permissionStatus);
  const isTracking = useLocationStore((state) => state.isTracking);
  const errorMessage = useLocationStore((state) => state.errorMessage);

  const setCurrentLocation = useLocationStore((state) => state.setCurrentLocation);
  const setPermissionStatus = useLocationStore((state) => state.setPermissionStatus);
  const setIsTracking = useLocationStore((state) => state.setIsTracking);
  const setErrorMessage = useLocationStore((state) => state.setErrorMessage);

  // Fungsi untuk meminta izin & mengambil posisi awal (JIT Permission Pattern)
  const requestLocationPermission = useCallback(async () => {
    try {
      setErrorMessage(null);

      // Cek apakah service lokasi diaktifkan di device
      const isServicesEnabled = await Location.hasServicesEnabledAsync();
      if (!isServicesEnabled) {
        setErrorMessage('Layanan lokasi (GPS) pada perangkat tidak aktif.');
        setPermissionStatus('denied');
        setCurrentLocation(FALLBACK_COORDINATES);
        return false;
      }

      // Cek izin foreground yang sudah ada
      let { status } = await Location.getForegroundPermissionsAsync();

      if (status !== 'granted') {
        // Minta izin secara Just-In-Time dengan pesan transparan
        const permissionResponse = await Location.requestForegroundPermissionsAsync();
        status = permissionResponse.status;
      }

      if (status === 'granted') {
        setPermissionStatus('granted');
        // Dapatkan lokasi awal secepatnya
        const initialPos = await Location.getCurrentPositionAsync({
          accuracy: isEmergencyActive
            ? Location.Accuracy.Highest
            : Location.Accuracy.Balanced,
        });

        setCurrentLocation({
          latitude: initialPos.coords.latitude,
          longitude: initialPos.coords.longitude,
          altitude: initialPos.coords.altitude,
          accuracy: initialPos.coords.accuracy,
          heading: initialPos.coords.heading,
          speed: initialPos.coords.speed,
        });

        return true;
      } else {
        setPermissionStatus('denied');
        setErrorMessage('Izin lokasi ditolak. Menggunakan lokasi default siaga.');
        setCurrentLocation(FALLBACK_COORDINATES);
        return false;
      }
    } catch (err) {
      const errorStr = err instanceof Error ? err.message : 'Gagal mengakses GPS';
      setErrorMessage(errorStr);
      setCurrentLocation(FALLBACK_COORDINATES);
      return false;
    }
  }, [isEmergencyActive, setCurrentLocation, setPermissionStatus, setErrorMessage]);

  // Efek utama untuk berlangganan perubahan posisi (Location Watcher)
  useEffect(() => {
    let isMounted = true;

    async function startWatcher() {
      // Bersihkan watcher sebelumnya jika ada
      if (subscriptionRef.current) {
        subscriptionRef.current.remove();
        subscriptionRef.current = null;
      }

      const hasPermission = await requestLocationPermission();
      if (!hasPermission || !isMounted) {
        setIsTracking(false);
        return;
      }

      try {
        // Konfigurasi adaptif:
        // Jika mode darurat aktif: presisi tertinggi, interval 5 meter, 3 detik
        // Jika mode siaga/idle: interval 25 meter, 10 detik (efisiensi baterai)
        const accuracy = isEmergencyActive
          ? Location.Accuracy.Highest
          : Location.Accuracy.Balanced;
        const distanceInterval = isEmergencyActive ? 5 : 25;
        const timeInterval = isEmergencyActive ? 3000 : 10000;

        setIsTracking(true);

        const subscription = await Location.watchPositionAsync(
          {
            accuracy,
            distanceInterval,
            timeInterval,
          },
          (newLocation) => {
            if (!isMounted) return;

            setCurrentLocation({
              latitude: newLocation.coords.latitude,
              longitude: newLocation.coords.longitude,
              altitude: newLocation.coords.altitude,
              accuracy: newLocation.coords.accuracy,
              heading: newLocation.coords.heading,
              speed: newLocation.coords.speed,
            });
          }
        );

        if (isMounted) {
          subscriptionRef.current = subscription;
        } else {
          subscription.remove();
        }
      } catch (err) {
        if (isMounted) {
          const errorStr = err instanceof Error ? err.message : 'Kesalahan pada watchPositionAsync';
          setErrorMessage(errorStr);
          setIsTracking(false);
        }
      }
    }

    startWatcher();

    // Architect's Audit Check 3: Pembersihan subscription saat unmount (Zero Memory Leak)
    return () => {
      isMounted = false;
      if (subscriptionRef.current) {
        subscriptionRef.current.remove();
        subscriptionRef.current = null;
      }
      setIsTracking(false);
    };
  }, [
    isEmergencyActive,
    requestLocationPermission,
    setCurrentLocation,
    setIsTracking,
    setErrorMessage,
  ]);

  return {
    currentLocation: currentLocation || FALLBACK_COORDINATES,
    permissionStatus,
    isTracking,
    errorMessage,
    refreshLocation: requestLocationPermission,
  };
}

