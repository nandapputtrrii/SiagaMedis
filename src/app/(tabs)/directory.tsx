import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

import { useEmergencyStore } from '../../stores/emergencyStore';
import { useLocationStore } from '../../stores/locationStore';
import { calculateHaversineDistance, formatDistance, calculateEtaMinutes } from '../../utils/haversine';
import { MedicalFacility } from '../../types/spatial';

export default function DirectoryScreen() {
  const insets = useSafeAreaInsets();

  const facilities = useEmergencyStore((state) => state.facilities);
  const selectFacility = useEmergencyStore((state) => state.selectFacility);
  const currentLocation = useLocationStore((state) => state.currentLocation);

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // RxJS Subject untuk Reaktif Search Pipeline (Architect's Check 3: clean up subscription)
  const searchSubject$ = useMemo(() => new Subject<string>(), []);

  useEffect(() => {
    const subscription = searchSubject$
      .pipe(
        debounceTime(300), // Debounce 300ms untuk mencegah lag/re-render berlebih
        distinctUntilChanged()
      )
      .subscribe((query) => {
        setDebouncedQuery(query);
      });

    return () => {
      // Zero Memory Leak: unsubscribe RxJS saat unmount
      subscription.unsubscribe();
    };
  }, [searchSubject$]);

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    searchSubject$.next(text);
  };

  // Filter & Urutkan Fasilitas berdasarkan jarak terdekat (Haversine)
  const filteredFacilities = useMemo(() => {
    const coords = currentLocation || { latitude: -7.7956, longitude: 110.3695 };
    const query = debouncedQuery.toLowerCase().trim();

    return facilities
      .map((facility) => {
        const distanceKm = calculateHaversineDistance(coords, facility.coordinates);
        return {
          ...facility,
          distanceKm,
        };
      })
      .filter((fac) => {
        if (!query) return true;
        return (
          fac.name.toLowerCase().includes(query) ||
          fac.address.toLowerCase().includes(query) ||
          fac.type.toLowerCase().includes(query)
        );
      })
      .sort((a, b) => a.distanceKm - b.distanceKm);
  }, [facilities, currentLocation, debouncedQuery]);

  const handleSelectAndNavigate = useCallback(
    (facility: MedicalFacility) => {
      selectFacility(facility);
      router.push('/(tabs)');
    },
    [selectFacility]
  );

  const handleCall = useCallback((phone: string) => {
    Linking.openURL(`tel:${phone.replace(/[^0-9]/g, '')}`);
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: MedicalFacility & { distanceKm: number } }) => {
      const eta = calculateEtaMinutes(item.distanceKm);

      return (
        <View style={styles.facilityCard}>
          <View style={styles.cardHeader}>
            <View style={styles.badgeRow}>
              <View style={styles.typeBadge}>
                <Text style={styles.typeText}>{item.type}</Text>
              </View>
              {item.isIgd24Hours && (
                <View style={styles.igdBadge}>
                  <Text style={styles.igdText}>IGD 24 JAM</Text>
                </View>
              )}
            </View>
            <View style={styles.bedBadge}>
              <Ionicons name="bed-outline" size={13} color="#16A34A" />
              <Text style={styles.bedText}>{item.emergencyBedsAvailable} Bed Kosong</Text>
            </View>
          </View>

          <Text style={styles.facilityName}>{item.name}</Text>
          <Text style={styles.facilityAddress} numberOfLines={2}>
            {item.address}
          </Text>

          <View style={styles.metricsRow}>
            <View style={styles.metricItem}>
              <Ionicons name="navigate-outline" size={14} color="#0284C7" />
              <Text style={styles.metricText}>
                {formatDistance(item.distanceKm)} (Haversine)
              </Text>
            </View>
            <View style={styles.metricItem}>
              <Ionicons name="time-outline" size={14} color="#EA580C" />
              <Text style={styles.metricText}>~{eta} menit perjalanan</Text>
            </View>
          </View>

          <View style={styles.cardActions}>
            <TouchableOpacity
              style={styles.callButton}
              onPress={() => handleCall(item.phone)}
              activeOpacity={0.8}
            >
              <Ionicons name="call" size={14} color="#FFFFFF" />
              <Text style={styles.callButtonText}>Telepon IGD</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.mapButton}
              onPress={() => handleSelectAndNavigate(item)}
              activeOpacity={0.8}
            >
              <Ionicons name="map-outline" size={14} color="#0284C7" />
              <Text style={styles.mapButtonText}>Lihat di Peta</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    },
    [handleCall, handleSelectAndNavigate]
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top + 16 }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Direktori Fasilitas IGD</Text>
        <Text style={styles.subtitle}>
          Daftar rumah sakit rujukan dengan ketersediaan bed darurat real-time.
        </Text>
      </View>

      {/* Reactive Search Bar (RxJS Debounced) */}
      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color="#64748B" />
        <TextInput
          style={styles.searchInput}
          placeholder="Cari nama rumah sakit, puskesmas, atau tipe..."
          placeholderTextColor="#94A3B8"
          value={searchQuery}
          onChangeText={handleSearchChange}
          clearButtonMode="while-editing"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => handleSearchChange('')}>
            <Ionicons name="close-circle" size={16} color="#94A3B8" />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={filteredFacilities}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="search-outline" size={40} color="#CBD5E1" />
            <Text style={styles.emptyText}>Tidak ada faskes yang cocok dengan pencarian.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 16,
  },
  header: {
    marginBottom: 14,
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 3,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
  },
  listContent: {
    paddingBottom: 24,
    gap: 12,
  },
  facilityCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 6,
  },
  typeBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  typeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
  },
  igdBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  igdText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#DC2626',
  },
  bedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  bedText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#16A34A',
  },
  facilityName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 4,
  },
  facilityAddress: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 10,
    lineHeight: 15,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
    marginBottom: 10,
  },
  metricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metricText: {
    fontSize: 11,
    color: '#334155',
    fontWeight: '600',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 10,
  },
  callButton: {
    flex: 1,
    backgroundColor: '#DC2626',
    borderRadius: 8,
    paddingVertical: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  callButtonText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  mapButton: {
    flex: 1,
    backgroundColor: '#E0F2FE',
    borderRadius: 8,
    paddingVertical: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  mapButtonText: {
    color: '#0284C7',
    fontSize: 11,
    fontWeight: '700',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 10,
  },
  emptyText: {
    fontSize: 13,
    color: '#94A3B8',
  },
});

