import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Marker } from 'react-native-maps';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { MedicalFacility, AmbulanceUnit, Coordinates } from '../../types/spatial';

interface UserMarkerProps {
  coordinate: Coordinates;
}

export const UserMarker = React.memo(({ coordinate }: UserMarkerProps) => {
  return (
    <Marker
      coordinate={coordinate}
      title="Posisi Anda"
      description="Titik koordinat Anda saat ini"
      anchor={{ x: 0.5, y: 0.5 }}
      flat={false}
    >
      <View style={styles.userMarkerContainer}>
        <View style={styles.userMarkerPulse} />
        <View style={styles.userMarkerCore}>
          <Ionicons name="person" size={14} color="#FFFFFF" />
        </View>
      </View>
    </Marker>
  );
});

UserMarker.displayName = 'UserMarker';

interface HospitalMarkerProps {
  facility: MedicalFacility;
  onPress?: () => void;
}

export const HospitalMarker = React.memo(({ facility, onPress }: HospitalMarkerProps) => {
  return (
    <Marker
      coordinate={facility.coordinates}
      title={facility.name}
      description={`IGD 24 Jam • ${facility.emergencyBedsAvailable} Bed Tersedia`}
      onPress={onPress}
    >
      <View style={styles.hospitalMarkerContainer}>
        <View style={styles.hospitalBadge}>
          <Ionicons name="medical" size={18} color="#FFFFFF" />
        </View>
        <View style={styles.bedCountBadge}>
          <Text style={styles.bedCountText}>{facility.emergencyBedsAvailable}</Text>
        </View>
      </View>
    </Marker>
  );
});

HospitalMarker.displayName = 'HospitalMarker';

interface AmbulanceMarkerProps {
  ambulance: AmbulanceUnit;
  onPress?: () => void;
}

export const AmbulanceMarker = React.memo(({ ambulance, onPress }: AmbulanceMarkerProps) => {
  const isDispatched = ambulance.status === 'dispatched';

  return (
    <Marker
      coordinate={ambulance.coordinates}
      title={ambulance.callSign}
      description={`Status: ${ambulance.status.toUpperCase()} • ${ambulance.licensePlate}`}
      onPress={onPress}
    >
      <View
        style={[
          styles.ambulanceMarkerContainer,
          isDispatched ? styles.ambulanceDispatched : styles.ambulanceAvailable,
        ]}
      >
        <MaterialCommunityIcons
          name="ambulance"
          size={20}
          color="#FFFFFF"
        />
      </View>
    </Marker>
  );
});

AmbulanceMarker.displayName = 'AmbulanceMarker';

const styles = StyleSheet.create({
  userMarkerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 36,
    height: 36,
  },
  userMarkerPulse: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(23, 114, 237, 0.25)',
  },
  userMarkerCore: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#0284C7',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  hospitalMarkerContainer: {
    alignItems: 'center',
  },
  hospitalBadge: {
    backgroundColor: '#DC2626',
    padding: 6,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  bedCountBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#16A34A',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    paddingHorizontal: 2,
  },
  bedCountText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: 'bold',
  },
  ambulanceMarkerContainer: {
    padding: 6,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  ambulanceAvailable: {
    backgroundColor: '#0284C7',
  },
  ambulanceDispatched: {
    backgroundColor: '#EA580C',
  },
});

