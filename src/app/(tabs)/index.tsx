import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import MapView, { Circle, PROVIDER_DEFAULT } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { useLocationTracking } from '../../hooks/useLocationTracking';
import { useEmergencyStore } from '../../stores/emergencyStore';
import { UserMarker, HospitalMarker, AmbulanceMarker } from '../../components/map/CustomMarkers';
import { FacilityCard } from '../../components/map/FacilityCard';
import { AmbulanceCard } from '../../components/map/AmbulanceCard';
import {
  calculateHaversineDistance,
  formatDistance,
  isWithinGeofenceRadius,
} from '../../utils/haversine';
import { AmbulanceUnit, MedicalFacility } from '../../types/spatial';

type FilterType = 'all' | 'facilities' | 'ambulances';

export default function LiveMapScreen() {
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView | null>(null);

  // Zustand State Selectors (Precision Selectors - UDF)
  const emergencyStatus = useEmergencyStore((state) => state.status);
  const facilities = useEmergencyStore((state) => state.facilities);
  const ambulances = useEmergencyStore((state) => state.ambulances);
  const selectedFacility = useEmergencyStore((state) => state.selectedFacility);
  const selectFacility = useEmergencyStore((state) => state.selectFacility);
  const updateAmbulanceLocation = useEmergencyStore((state) => state.updateAmbulanceLocation);

  const [selectedAmbulance, setSelectedAmbulance] = useState<AmbulanceUnit | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  // Custom Hook useLocationTracking dengan adaptive distanceInterval
  const { currentLocation, permissionStatus, isTracking, errorMessage, refreshLocation } =
    useLocationTracking({
      isEmergencyActive: emergencyStatus !== 'idle',
    });

  // Komputasi Spasial Haversine untuk seluruh faskes (16ms Mandate: memoized)
  const facilitiesWithDistance = useMemo(() => {
    return facilities
      .map((facility) => {
        const distanceKm = calculateHaversineDistance(
          currentLocation,
          facility.coordinates
        );
        return {
          ...facility,
          distanceKm,
        };
      })
      .sort((a, b) => (a.distanceKm || 0) - (b.distanceKm || 0));
  }, [facilities, currentLocation]);

  // Faskes terdekat
  const nearestFacility = facilitiesWithDistance[0];

  // Geofence check: Apakah korban berada dalam radius 2000m dari IGD terdekat
  const isInsideHospitalGeofence = useMemo(() => {
    if (!nearestFacility) return false;
    return isWithinGeofenceRadius(nearestFacility.coordinates, currentLocation, 2000);
  }, [nearestFacility, currentLocation]);

  // Filter markers untuk efisiensi rendering
  const visibleFacilities = useMemo(() => {
    if (activeFilter === 'ambulances') return [];
    return facilitiesWithDistance;
  }, [activeFilter, facilitiesWithDistance]);

  const visibleAmbulances = useMemo(() => {
    if (activeFilter === 'facilities') return [];
    return ambulances;
  }, [activeFilter, ambulances]);

  // Hitung jarak ambulans ke korban
  const selectedAmbulanceDistance = useMemo(() => {
    if (!selectedAmbulance) return undefined;
    return calculateHaversineDistance(currentLocation, selectedAmbulance.coordinates);
  }, [selectedAmbulance, currentLocation]);

  const selectedFacilityDistance = useMemo(() => {
    if (!selectedFacility) return undefined;
    return calculateHaversineDistance(currentLocation, selectedFacility.coordinates);
  }, [selectedFacility, currentLocation]);

  // Handler Recenter Peta ke Posisi Pengguna
  const handleRecenter = useCallback(() => {
    if (mapRef.current && currentLocation) {
      mapRef.current.animateToRegion(
        {
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
          latitudeDelta: 0.035,
          longitudeDelta: 0.035,
        },
        500
      );
    }
  }, [currentLocation]);

  // Handler Klik Marker
  const handleSelectFacility = useCallback(
    (facility: MedicalFacility) => {
      setSelectedAmbulance(null);
      selectFacility(facility);
    },
    [selectFacility]
  );

  const handleSelectAmbulance = useCallback(
    (ambulance: AmbulanceUnit) => {
      selectFacility(null);
      setSelectedAmbulance(ambulance);
    },
    [selectFacility]
  );

  // Simulasi Pergerakan Ambulans Real-Time menuju Korban saat mode Emergency
  useEffect(() => {
    if (emergencyStatus !== 'broadcasting' && emergencyStatus !== 'dispatched') return;

    const interval = setInterval(() => {
      const targetAmbulance = ambulances[0];
      if (!targetAmbulance) return;

      const deltaLat = (currentLocation.latitude - targetAmbulance.coordinates.latitude) * 0.15;
      const deltaLon = (currentLocation.longitude - targetAmbulance.coordinates.longitude) * 0.15;

      updateAmbulanceLocation(targetAmbulance.id, {
        latitude: targetAmbulance.coordinates.latitude + deltaLat,
        longitude: targetAmbulance.coordinates.longitude + deltaLon,
      });
    }, 2500);

    return () => clearInterval(interval);
  }, [emergencyStatus, ambulances, currentLocation, updateAmbulanceLocation]);

  return (
    <View style={styles.container}>
      {/* Peta Interaktif react-native-maps */}
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_DEFAULT}
        initialRegion={{
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
        showsCompass={false}
        showsScale={false}
        toolbarEnabled={false}
      >
        {/* User Marker */}
        <UserMarker coordinate={currentLocation} />

        {/* Geofence Lingkaran Radius Rumah Sakit Terdekat (2000 meter) */}
        {nearestFacility && (
          <Circle
            center={nearestFacility.coordinates}
            radius={2000}
            strokeWidth={1.5}
            strokeColor={isInsideHospitalGeofence ? 'rgba(22, 163, 74, 0.7)' : 'rgba(220, 38, 38, 0.5)'}
            fillColor={isInsideHospitalGeofence ? 'rgba(22, 163, 74, 0.12)' : 'rgba(220, 38, 38, 0.08)'}
          />
        )}

        {/* Marker Seluruh Faskes IGD */}
        {visibleFacilities.map((facility) => (
          <HospitalMarker
            key={facility.id}
            facility={facility}
            onPress={() => handleSelectFacility(facility)}
          />
        ))}

        {/* Marker Seluruh Ambulans Aktif */}
        {visibleAmbulances.map((ambulance) => (
          <AmbulanceMarker
            key={ambulance.id}
            ambulance={ambulance}
            onPress={() => handleSelectAmbulance(ambulance)}
          />
        ))}
      </MapView>

      {/* Floating Header Bar */}
      <View style={[styles.floatingHeader, { top: insets.top + 8 }]}>
        <View style={styles.headerCard}>
          <View style={styles.headerStatusRow}>
            <View style={styles.gpsIndicatorRow}>
              <View
                style={[
                  styles.statusDot,
                  permissionStatus === 'granted' ? styles.dotGreen : styles.dotOrange,
                ]}
              />
              <Text style={styles.gpsStatusText}>
                {permissionStatus === 'granted'
                  ? isTracking
                    ? 'GPS AKTIF (LBS Real-Time)'
                    : 'GPS Terhubung'
                  : 'Mode Siaga Default'}
              </Text>
            </View>

            <TouchableOpacity
              onPress={refreshLocation}
              style={styles.refreshButton}
              hitSlop={8}
            >
              <Ionicons name="reload" size={16} color="#0284C7" />
            </TouchableOpacity>
          </View>

          {nearestFacility && (
            <View style={styles.nearestFacilityRow}>
              <Ionicons name="medical" size={16} color="#DC2626" />
              <View style={styles.nearestInfo}>
                <View style={styles.nearestTitleRow}>
                  <Text style={styles.nearestTitle} numberOfLines={1}>
                    RS Terdekat: {nearestFacility.name}
                  </Text>
                  {isInsideHospitalGeofence && (
                    <View style={styles.geofenceActiveBadge}>
                      <Text style={styles.geofenceActiveText}>DALAM GEOFENCE</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.nearestDistance}>
                  {formatDistance(nearestFacility.distanceKm || 0)} garis lurus (Haversine)
                  {' • '}
                  {nearestFacility.emergencyBedsAvailable} Bed IGD Siaga
                </Text>
              </View>
            </View>
          )}

          {errorMessage && (
            <Text style={styles.errorText} numberOfLines={1}>
              ⚠️ {errorMessage}
            </Text>
          )}

          {/* Filter Pills Row */}
          <View style={styles.filterPillsRow}>
            <TouchableOpacity
              style={[styles.filterPill, activeFilter === 'all' && styles.filterPillActive]}
              onPress={() => setActiveFilter('all')}
            >
              <Text style={[styles.filterText, activeFilter === 'all' && styles.filterTextActive]}>
                Semua ({facilities.length + ambulances.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterPill, activeFilter === 'facilities' && styles.filterPillActive]}
              onPress={() => setActiveFilter('facilities')}
            >
              <Text style={[styles.filterText, activeFilter === 'facilities' && styles.filterTextActive]}>
                🏥 RS & IGD ({facilities.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterPill, activeFilter === 'ambulances' && styles.filterPillActive]}
              onPress={() => setActiveFilter('ambulances')}
            >
              <Text style={[styles.filterText, activeFilter === 'ambulances' && styles.filterTextActive]}>
                🚑 Ambulans ({ambulances.length})
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Action Buttons (Recenter & Quick Panic) */}
      <View style={[styles.floatingActions, { bottom: insets.bottom + 90 }]}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleRecenter}
          activeOpacity={0.8}
        >
          <Ionicons name="locate" size={22} color="#0284C7" />
        </TouchableOpacity>

        {emergencyStatus === 'idle' && (
          <TouchableOpacity
            style={styles.panicFloatingButton}
            onPress={() => router.push('/(tabs)/panic')}
            activeOpacity={0.85}
          >
            <Ionicons name="warning" size={20} color="#FFFFFF" />
            <Text style={styles.panicFloatingText}>PANIK</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Status Banner jika Emergency Aktif */}
      {emergencyStatus !== 'idle' && (
        <View style={[styles.emergencyBanner, { bottom: insets.bottom + 85 }]}>
          <Ionicons name="alert-circle" size={22} color="#FFFFFF" />
          <View style={styles.emergencyBannerTextContainer}>
            <Text style={styles.emergencyBannerTitle}>
              {emergencyStatus === 'countdown'
                ? 'MEMPERSIAPKAN SINYAL DARURAT...'
                : 'DARURAT MEDIS DIBROADCAST!'}
            </Text>
            <Text style={styles.emergencyBannerSubtitle}>
              Ambulans terdekat sedang dipandu ke koordinat GPS Anda.
            </Text>
          </View>
          <TouchableOpacity
            style={styles.bannerActionButton}
            onPress={() => router.push('/(tabs)/panic')}
          >
            <Text style={styles.bannerActionText}>LIHAT STATUS</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Modal Card Faskes yang Dipilih */}
      {selectedFacility && (
        <View style={[styles.bottomCardContainer, { bottom: insets.bottom + 20 }]}>
          <FacilityCard
            facility={selectedFacility}
            userDistanceKm={selectedFacilityDistance}
            onClose={() => selectFacility(null)}
            onSelectAsTarget={() => {
              if (mapRef.current) {
                mapRef.current.animateToRegion(
                  {
                    latitude: selectedFacility.coordinates.latitude,
                    longitude: selectedFacility.coordinates.longitude,
                    latitudeDelta: 0.02,
                    longitudeDelta: 0.02,
                  },
                  500
                );
              }
            }}
          />
        </View>
      )}

      {/* Modal Card Ambulans yang Dipilih */}
      {selectedAmbulance && (
        <View style={[styles.bottomCardContainer, { bottom: insets.bottom + 20 }]}>
          <AmbulanceCard
            ambulance={selectedAmbulance}
            userDistanceKm={selectedAmbulanceDistance}
            onClose={() => setSelectedAmbulance(null)}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  map: {
    ...StyleSheet.absoluteFill,
  },
  floatingHeader: {
    position: 'absolute',
    left: 16,
    right: 16,
  },
  headerCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 14,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  headerStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  gpsIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotGreen: {
    backgroundColor: '#16A34A',
  },
  dotOrange: {
    backgroundColor: '#EA580C',
  },
  gpsStatusText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
    letterSpacing: 0.3,
  },
  refreshButton: {
    padding: 2,
  },
  nearestFacilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  nearestInfo: {
    flex: 1,
  },
  nearestTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  nearestTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#0F172A',
    flex: 1,
  },
  geofenceActiveBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  geofenceActiveText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#166534',
  },
  nearestDistance: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  errorText: {
    fontSize: 11,
    color: '#DC2626',
    marginTop: 4,
  },
  filterPillsRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  filterPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
  },
  filterPillActive: {
    backgroundColor: '#0284C7',
  },
  filterText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#475569',
  },
  filterTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  floatingActions: {
    position: 'absolute',
    right: 16,
    gap: 12,
    alignItems: 'center',
  },
  actionButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 5,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  panicFloatingButton: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  panicFloatingText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 13,
    letterSpacing: 0.5,
  },
  bottomCardContainer: {
    position: 'absolute',
    left: 16,
    right: 16,
  },
  emergencyBanner: {
    position: 'absolute',
    left: 16,
    right: 16,
    backgroundColor: '#B91C1C',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 7,
  },
  emergencyBannerTextContainer: {
    flex: 1,
  },
  emergencyBannerTitle: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  emergencyBannerSubtitle: {
    color: '#FEE2E2',
    fontSize: 10,
    marginTop: 2,
  },
  bannerActionButton: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  bannerActionText: {
    color: '#B91C1C',
    fontSize: 10,
    fontWeight: '800',
  },
});
