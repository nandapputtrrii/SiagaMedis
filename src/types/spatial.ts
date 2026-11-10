export interface Coordinates {
  latitude: number;
  longitude: number;
  altitude?: number | null;
  accuracy?: number | null;
  heading?: number | null;
  speed?: number | null;
}

export type FacilityType = 'RSUP' | 'RSUD' | 'RS Swasta' | 'Puskesmas' | 'Klinik 24 Jam';

export interface MedicalFacility {
  id: string;
  name: string;
  type: FacilityType;
  address: string;
  phone: string;
  coordinates: Coordinates;
  emergencyBedsAvailable: number;
  isIgd24Hours: boolean;
  distanceKm?: number;
}

export type ResponderStatus = 'available' | 'dispatched' | 'on_scene' | 'busy';

export interface AmbulanceUnit {
  id: string;
  callSign: string;
  licensePlate: string;
  hospitalName: string;
  status: ResponderStatus;
  coordinates: Coordinates;
  distanceKm?: number;
  etaMinutes?: number;
}

export interface GeofenceZone {
  id: string;
  name: string;
  center: Coordinates;
  radiusMeters: number;
  alertLevel: 'safe' | 'caution' | 'critical';
}

