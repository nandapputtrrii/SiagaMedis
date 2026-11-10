import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Linking,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';

import { useEmergencyStore } from '../../stores/emergencyStore';
import { useLocationStore } from '../../stores/locationStore';
import { useHaptics } from '../../hooks/useHaptics';
import { EmergencyCategory } from '../../types/emergency';
import { formatDistance, calculateEtaMinutes, calculateHaversineDistance } from '../../utils/haversine';

const CATEGORIES: { id: EmergencyCategory; label: string; icon: string }[] = [
  { id: 'trauma_kecelakaan', label: 'Kecelakaan Lalu Lintas', icon: 'car-crash' },
  { id: 'henti_jantung', label: 'Serangan Jantung', icon: 'heart-pulse' },
  { id: 'sesak_napas', label: 'Sesak Napas Berat', icon: 'lungs' },
  { id: 'stroke', label: 'Gejala Stroke', icon: 'brain' },
  { id: 'kebidanan', label: 'Persalinan Darurat', icon: 'baby-carriage' },
  { id: 'lainnya', label: 'Kegawatdaruratan Lain', icon: 'alert-decagram' },
];

export default function PanicScreen() {
  const insets = useSafeAreaInsets();
  const { triggerImpact, triggerNotification } = useHaptics();

  const [selectedCategory, setSelectedCategory] = useState<EmergencyCategory>('trauma_kecelakaan');

  // Zustand State Selectors
  const currentLocation = useLocationStore((state) => state.currentLocation);
  const emergencyStatus = useEmergencyStore((state) => state.status);
  const countdownSeconds = useEmergencyStore((state) => state.countdownSeconds);
  const isCountingDown = useEmergencyStore((state) => state.isCountingDown);
  const assignedAmbulance = useEmergencyStore((state) => state.assignedAmbulance);
  const incident = useEmergencyStore((state) => state.incident);

  const startPanicCountdown = useEmergencyStore((state) => state.startPanicCountdown);
  const tickCountdown = useEmergencyStore((state) => state.tickCountdown);
  const abortPanic = useEmergencyStore((state) => state.abortPanic);
  const resolveIncident = useEmergencyStore((state) => state.resolveIncident);

  // Countdown timer ticker
  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (isCountingDown) {
      timer = setInterval(() => {
        tickCountdown();
        triggerImpact(Haptics.ImpactFeedbackStyle.Medium);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isCountingDown, tickCountdown, triggerImpact]);

  // Handler Tombol Panik Utama
  const handlePressPanic = () => {
    triggerNotification(Haptics.NotificationFeedbackType.Warning);
    const coords = currentLocation || { latitude: -7.7956, longitude: 110.3695 };
    startPanicCountdown(coords, selectedCategory);
  };

  // Handler Batal Panik (Safe-Abort)
  const handleAbort = () => {
    triggerImpact(Haptics.ImpactFeedbackStyle.Light);
    abortPanic();
  };

  // Handler Panggilan Darurat Offline 119
  const handleCall119 = () => {
    Linking.openURL('tel:119');
  };

  // Handler SMS Darurat dengan Koordinat GPS (Offline Fallback)
  const handleSendEmergencySMS = () => {
    const lat = currentLocation?.latitude ?? -7.7956;
    const lon = currentLocation?.longitude ?? 110.3695;
    const gmapsUrl = `https://maps.google.com/?q=${lat},${lon}`;
    const message = `[DARURAT MEDIS SIAGAMEDIS] Butuh bantuan segera! Kategori: ${selectedCategory.toUpperCase()}. Posisi: ${gmapsUrl}`;
    const smsUrl = Platform.select({
      ios: `sms:112&body=${encodeURIComponent(message)}`,
      android: `sms:112?body=${encodeURIComponent(message)}`,
      default: `sms:112?body=${encodeURIComponent(message)}`,
    });
    Linking.openURL(smsUrl);
  };

  // Jarak ke ambulans yang ditugaskan
  const ambulanceDistance =
    currentLocation && assignedAmbulance
      ? calculateHaversineDistance(currentLocation, assignedAmbulance.coordinates)
      : null;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.contentContainer, { paddingTop: insets.top + 16 }]}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Pusat Tanggap Darurat</Text>
        <Text style={styles.subtitle}>
          Sistem respon cepat terintegrasi LBS dan first-responder terdekat.
        </Text>
      </View>

      {/* STATE 1: IDLE - Tombol Panik Utama */}
      {emergencyStatus === 'idle' && (
        <>
          <Text style={styles.sectionLabel}>1. PILIH KATEGORI KEGAWATDARURATAN</Text>
          <View style={styles.categoryGrid}>
            {CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.categoryCard, isSelected && styles.categoryCardSelected]}
                  onPress={() => setSelectedCategory(cat.id)}
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons
                    name={cat.icon as any}
                    size={24}
                    color={isSelected ? '#DC2626' : '#64748B'}
                  />
                  <Text
                    style={[
                      styles.categoryLabel,
                      isSelected && styles.categoryLabelSelected,
                    ]}
                  >
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={[styles.sectionLabel, { marginTop: 24 }]}>
            2. TEKAN UNTUK MENGIRIM SINYAL DARURAT
          </Text>

          <View style={styles.panicButtonWrapper}>
            <TouchableOpacity
              style={styles.panicButton}
              onPress={handlePressPanic}
              activeOpacity={0.8}
            >
              <View style={styles.panicInnerRing}>
                <Ionicons name="warning" size={56} color="#FFFFFF" />
                <Text style={styles.panicButtonText}>SOS DARURAT</Text>
                <Text style={styles.panicSubtext}>TEKAN SEKALI</Text>
              </View>
            </TouchableOpacity>
          </View>

          <Text style={styles.safetyHint}>
            ℹ️ Terdapat jendela pembatalan 3 detik setelah tombol ditekan untuk mencegah
            laporan palsu.
          </Text>
        </>
      )}

      {/* STATE 2: COUNTDOWN - Safe Abort Window */}
      {emergencyStatus === 'countdown' && (
        <View style={styles.countdownContainer}>
          <Text style={styles.countdownTitle}>MEMANCARKAN SINYAL SOS...</Text>
          <Text style={styles.countdownSubtitle}>
            Sinyal lokasi GPS Anda akan disiarkan ke unit ambulans terdekat dalam:
          </Text>

          <View style={styles.timerCircle}>
            <Text style={styles.timerNumber}>{countdownSeconds}</Text>
            <Text style={styles.timerUnit}>DETIK</Text>
          </View>

          <TouchableOpacity
            style={styles.abortButton}
            onPress={handleAbort}
            activeOpacity={0.8}
          >
            <Ionicons name="close-circle" size={24} color="#FFFFFF" />
            <Text style={styles.abortButtonText}>BATALKAN (SALAH PENCET)</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* STATE 3: BROADCASTING / ACTIVE RESCUE */}
      {(emergencyStatus === 'broadcasting' || emergencyStatus === 'dispatched') && (
        <View style={styles.activeRescueContainer}>
          <View style={styles.activeRescueHeader}>
            <View style={styles.pulseBadge}>
              <View style={styles.pulseDot} />
              <Text style={styles.pulseText}>SINYAL AKTIF DIBROADCAST</Text>
            </View>
            <Text style={styles.activeCategory}>
              Kategori: {selectedCategory.toUpperCase()}
            </Text>
          </View>

          {assignedAmbulance ? (
            <View style={styles.assignedAmbulanceCard}>
              <View style={styles.ambHeader}>
                <MaterialCommunityIcons name="ambulance" size={28} color="#EA580C" />
                <View style={styles.ambTitle}>
                  <Text style={styles.ambName}>{assignedAmbulance.callSign}</Text>
                  <Text style={styles.ambDetails}>
                    {assignedAmbulance.licensePlate} • Pangkalan{' '}
                    {assignedAmbulance.hospitalName}
                  </Text>
                </View>
              </View>

              <View style={styles.ambMetrics}>
                <View style={styles.ambMetricBox}>
                  <Text style={styles.ambMetricValue}>
                    {ambulanceDistance !== null ? formatDistance(ambulanceDistance) : '—'}
                  </Text>
                  <Text style={styles.ambMetricLabel}>Jarak Ambulans</Text>
                </View>
                <View style={styles.ambMetricBox}>
                  <Text style={styles.ambMetricValue}>
                    {ambulanceDistance !== null
                      ? `~${calculateEtaMinutes(ambulanceDistance)} mnt`
                      : '—'}
                  </Text>
                  <Text style={styles.ambMetricLabel}>Estimasi Tiba (ETA)</Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.viewMapButton}
                onPress={() => router.push('/(tabs)')}
              >
                <Ionicons name="map" size={16} color="#0284C7" />
                <Text style={styles.viewMapText}>Pantau Posisi Ambulans di Peta</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.searchingAmbulanceCard}>
              <Text style={styles.searchingText}>Mencari armada ambulans siaga terdekat...</Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.resolveButton}
            onPress={resolveIncident}
            activeOpacity={0.8}
          >
            <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
            <Text style={styles.resolveButtonText}>TANDAI TERTANGANI / SELESAI</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* OFFLINE-FIRST FALLBACKS */}
      <View style={styles.offlineFallbackSection}>
        <Text style={styles.offlineSectionTitle}>JALUR DARURAT OFFLINE (TANPA INTERNET)</Text>
        <Text style={styles.offlineSectionSubtitle}>
          Gunakan tombol di bawah jika jaringan seluler internet terputus atau lemah.
        </Text>

        <View style={styles.offlineButtonRow}>
          <TouchableOpacity
            style={styles.call119Button}
            onPress={handleCall119}
            activeOpacity={0.8}
          >
            <Ionicons name="call" size={18} color="#FFFFFF" />
            <Text style={styles.call119Text}>Telepon SPGDT 119</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.smsButton}
            onPress={handleSendEmergencySMS}
            activeOpacity={0.8}
          >
            <Ionicons name="chatbubble-ellipses" size={18} color="#0F172A" />
            <Text style={styles.smsText}>SMS Koordinat GPS</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
    lineHeight: 18,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  categoryCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  categoryCardSelected: {
    borderColor: '#DC2626',
    backgroundColor: '#FEF2F2',
  },
  categoryLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
    textAlign: 'center',
  },
  categoryLabelSelected: {
    color: '#DC2626',
    fontWeight: '700',
  },
  panicButtonWrapper: {
    alignItems: 'center',
    marginVertical: 24,
  },
  panicButton: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.45,
    shadowRadius: 18,
    elevation: 12,
  },
  panicInnerRing: {
    width: 172,
    height: 172,
    borderRadius: 86,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  panicButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1,
  },
  panicSubtext: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  safetyHint: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    backgroundColor: '#F1F5F9',
    padding: 10,
    borderRadius: 8,
  },
  countdownContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#DC2626',
    marginVertical: 20,
  },
  countdownTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#DC2626',
    marginBottom: 6,
  },
  countdownSubtitle: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 20,
  },
  timerCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    borderWidth: 3,
    borderColor: '#DC2626',
  },
  timerNumber: {
    fontSize: 48,
    fontWeight: '900',
    color: '#DC2626',
  },
  timerUnit: {
    fontSize: 10,
    fontWeight: '800',
    color: '#DC2626',
    letterSpacing: 1,
  },
  abortButton: {
    backgroundColor: '#475569',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: '100%',
    justifyContent: 'center',
  },
  abortButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
  activeRescueContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#EA580C',
    marginBottom: 20,
  },
  activeRescueHeader: {
    marginBottom: 14,
  },
  pulseBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFEDD5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EA580C',
  },
  pulseText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#9A3412',
  },
  activeCategory: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  assignedAmbulanceCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },
  ambHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  ambTitle: {
    flex: 1,
  },
  ambName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  ambDetails: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  ambMetrics: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  ambMetricBox: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  ambMetricValue: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0F172A',
  },
  ambMetricLabel: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
  viewMapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  viewMapText: {
    color: '#0284C7',
    fontSize: 12,
    fontWeight: '700',
  },
  searchingAmbulanceCard: {
    padding: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 14,
  },
  searchingText: {
    fontSize: 12,
    color: '#64748B',
  },
  resolveButton: {
    backgroundColor: '#16A34A',
    borderRadius: 10,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  resolveButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
  },
  offlineFallbackSection: {
    marginTop: 10,
    paddingTop: 18,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  offlineSectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#334155',
    letterSpacing: 0.3,
  },
  offlineSectionSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    marginBottom: 12,
    lineHeight: 16,
  },
  offlineButtonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  call119Button: {
    flex: 1,
    backgroundColor: '#DC2626',
    borderRadius: 10,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  call119Text: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  smsButton: {
    flex: 1,
    backgroundColor: '#E2E8F0',
    borderRadius: 10,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  smsText: {
    color: '#0F172A',
    fontSize: 12,
    fontWeight: '700',
  },
});
