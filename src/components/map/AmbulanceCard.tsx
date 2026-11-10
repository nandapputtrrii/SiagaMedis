import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { AmbulanceUnit } from '../../types/spatial';
import { formatDistance, calculateEtaMinutes } from '../../utils/haversine';

interface AmbulanceCardProps {
  ambulance: AmbulanceUnit;
  userDistanceKm?: number;
  onClose: () => void;
}

export const AmbulanceCard = React.memo(
  ({ ambulance, userDistanceKm, onClose }: AmbulanceCardProps) => {
    const eta = userDistanceKm !== undefined ? calculateEtaMinutes(userDistanceKm) : null;
    const isDispatched = ambulance.status === 'dispatched';

    return (
      <View style={styles.cardContainer}>
        <View style={styles.headerRow}>
          <View style={styles.badgeRow}>
            <View
              style={[
                styles.statusBadge,
                isDispatched ? styles.badgeDispatched : styles.badgeAvailable,
              ]}
            >
              <Text style={styles.statusText}>
                {isDispatched ? 'MENUJU LOKASI KORBAN' : 'UNIT STANDBY SIAGA'}
              </Text>
            </View>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton} hitSlop={10}>
            <Ionicons name="close" size={20} color="#64748B" />
          </TouchableOpacity>
        </View>

        <View style={styles.titleRow}>
          <MaterialCommunityIcons
            name="ambulance"
            size={24}
            color={isDispatched ? '#EA580C' : '#0284C7'}
          />
          <View style={styles.titleTextContainer}>
            <Text style={styles.callSign}>{ambulance.callSign}</Text>
            <Text style={styles.plate}>{ambulance.licensePlate} • Pangkalan {ambulance.hospitalName}</Text>
          </View>
        </View>

        <View style={styles.metricsRow}>
          <View style={styles.metricItem}>
            <Ionicons name="navigate-outline" size={16} color="#0284C7" />
            <Text style={styles.metricValue}>
              {userDistanceKm !== undefined ? formatDistance(userDistanceKm) : '—'}
            </Text>
            <Text style={styles.metricLabel}>Jarak ke Korban</Text>
          </View>

          <View style={styles.metricDivider} />

          <View style={styles.metricItem}>
            <Ionicons name="flash-outline" size={16} color="#EA580C" />
            <Text style={styles.metricValue}>{eta !== null ? `~${eta} menit` : '—'}</Text>
            <Text style={styles.metricLabel}>Estimasi Tiba (ETA)</Text>
          </View>
        </View>
      </View>
    );
  }
);

AmbulanceCard.displayName = 'AmbulanceCard';

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  badgeRow: {
    flexDirection: 'row',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeAvailable: {
    backgroundColor: '#E0F2FE',
  },
  badgeDispatched: {
    backgroundColor: '#FFEDD5',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0F172A',
  },
  closeButton: {
    padding: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  titleTextContainer: {
    flex: 1,
  },
  callSign: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  plate: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingVertical: 10,
  },
  metricItem: {
    alignItems: 'center',
    flex: 1,
  },
  metricValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0F172A',
    marginTop: 2,
  },
  metricLabel: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
  metricDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#E2E8F0',
  },
});

