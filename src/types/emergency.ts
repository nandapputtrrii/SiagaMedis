import { Coordinates } from './spatial';

export type EmergencyStatus = 'idle' | 'countdown' | 'broadcasting' | 'dispatched' | 'resolved' | 'cancelled';

export type EmergencyCategory =
  | 'trauma_kecelakaan'
  | 'henti_jantung'
  | 'sesak_napas'
  | 'stroke'
  | 'kebidanan'
  | 'lainnya';

export interface EmergencyIncident {
  id: string;
  category: EmergencyCategory;
  status: EmergencyStatus;
  timestamp: number;
  userCoordinates: Coordinates;
  userAddress?: string;
  assignedAmbulanceId?: string;
  targetHospitalId?: string;
  notes?: string;
}

export interface EmergencyContact {
  id: string;
  name: string;
  relationship: string;
  phoneNumber: string;
  isPrimaryIce: boolean;
}

