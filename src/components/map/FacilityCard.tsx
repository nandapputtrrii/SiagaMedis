import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MedicalFacility } from '../../types/spatial';
import { formatDistance, calculateEtaMinutes } from '../../utils/haversine';

interface FacilityCardProps {
  facility: MedicalFacility;
  userDistanceKm?: number;
  onClose: () => void;
  onSelectAsTarget?: (facility: MedicalFacility) => void;
}

export const FacilityCard = React.memo(
  ({ facility, userDistanceKm, onClose, onSelectAsTarget }: FacilityCardProps) => {
    const eta = userDistanceKm !== undefined ? calculateEtaMinutes(userDistanceKm) : null;

    const handleCallPhone = () => {
      const phoneUrl = `tel:${facility.phone.replace(/[^0-9]/g, '')}`;
      Linking.canOpenURL(phoneUrl).then((supported) => {
        if (supported) {
          Linking.openURL(phoneUrl);
        }
      });
    };

    return (
      <View style={styles.cardContainer}>
        <View style={styles.headerRow}>
          <View style={styles.badgeRow}>
            <View style={styles.typeBadge}>
              <Text style={styles.typeText}>{facility.type}</Text>
            </View>
            {facility.isIgd24Hours && (
              <View style={styles.igdBadge}>
                <Text style={styles.igdText}>IGD 24 JAM</Text>
              </View>
            )}
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton} hitSlop={10}>
            <Ionicons name="close" size={20} color="#64748B" />
          </TouchableOpacity>
        </View>

        <Text style={styles.facilityName} numberOfLines={1}>
          {facility.name}
        </Text>
        <Text style={styles.facilityAddress} numberOfLines={2}>
          {facility.address}
        </Text>

        <View style={styles.metricsRow}>
          <View style={styles.metricItem}>
            <Ionicons name="navigate-outline" size={16} color="#0284C7" />
            <Text style={styles.metricValue}>
              {userDistanceKm !== undefined ? formatDistance(userDistanceKm) : '—'}
            </Text>
            <Text style={styles.metricLabel}>Jarak Haversine</Text>
          </View>

          <View style={styles.metricDivider} />

          <View style={styles.metricItem}>
            <Ionicons name="time-outline" size={16} color="#EA580C" />
            <Text style={styles.metricValue}>{eta !== null ? `~${eta} mnt` : '—'}</Text>
            <Text style={styles.metricLabel}>Estimasi Tiba</Text>
          </View>

          <View style={styles.metricDivider} />

          <View style={styles.metricItem}>
            <Ionicons name="bed-outline" size={16} color="#16A34A" />
            <Text style={styles.metricValue}>{facility.emergencyBedsAvailable}</Text>
            <Text style={styles.metricLabel}>Bed Kosong</Text>
          </View>
        </View>

        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.callButton}
            onPress={handleCallPhone}
            activeOpacity={0.8}
          >
            <Ionicons name="call" size={18} color="#FFFFFF" />
            <Text style={styles.callButtonText}>Hubungi IGD ({facility.phone})</Text>
          </TouchableOpacity>

          {onSelectAsTarget && (
            <TouchableOpacity
              style={styles.targetButton}
              onPress={() => onSelectAsTarget(facility)}
              activeOpacity={0.8}
            >
              <Ionicons name="navigate" size={18} color="#0284C7" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }
);

FacilityCard.displayName = 'FacilityCard';

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
    gap: 6,
  },
  typeBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  typeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  igdBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  igdText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
  },
  closeButton: {
    padding: 4,
  },
  facilityName: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 4,
  },
  facilityAddress: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 14,
    lineHeight: 16,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingVertical: 10,
    marginBottom: 14,
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
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  callButton: {
    flex: 1,
    backgroundColor: '#DC2626',
    borderRadius: 10,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  callButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
  },
  targetButton: {
    width: 44,
    backgroundColor: '#E0F2FE',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

