import { create } from 'zustand';
import { EmergencyCategory, EmergencyIncident, EmergencyStatus } from '../types/emergency';
import { AmbulanceUnit, Coordinates, MedicalFacility } from '../types/spatial';
import { INITIAL_FACILITIES, INITIAL_AMBULANCES } from '../data/mockFacilities';

interface EmergencyState {
  incident: EmergencyIncident | null;
  status: EmergencyStatus;
  countdownSeconds: number;
  isCountingDown: boolean;
  facilities: MedicalFacility[];
  ambulances: AmbulanceUnit[];
  selectedFacility: MedicalFacility | null;
  assignedAmbulance: AmbulanceUnit | null;

  // Actions
  startPanicCountdown: (coords: Coordinates, category?: EmergencyCategory) => void;
  tickCountdown: () => void;
  abortPanic: () => void;
  broadcastIncident: () => void;
  resolveIncident: () => void;
  selectFacility: (facility: MedicalFacility | null) => void;
  setFacilities: (facilities: MedicalFacility[]) => void;
  updateAmbulanceLocation: (ambulanceId: string, coords: Coordinates) => void;
}

export const useEmergencyStore = create<EmergencyState>((set, get) => ({
  incident: null,
  status: 'idle',
  countdownSeconds: 3,
  isCountingDown: false,
  facilities: INITIAL_FACILITIES,
  ambulances: INITIAL_AMBULANCES,
  selectedFacility: null,
  assignedAmbulance: null,

  startPanicCountdown: (coords, category = 'trauma_kecelakaan') => {
    set({
      status: 'countdown',
      isCountingDown: true,
      countdownSeconds: 3,
      incident: {
        id: `inc-${Date.now()}`,
        category,
        status: 'countdown',
        timestamp: Date.now(),
        userCoordinates: coords,
      },
    });
  },

  tickCountdown: () => {
    const { countdownSeconds, isCountingDown } = get();
    if (!isCountingDown) return;

    if (countdownSeconds > 1) {
      set({ countdownSeconds: countdownSeconds - 1 });
    } else {
      // Countdown selesai -> Broadcast darurat otomatis
      get().broadcastIncident();
    }
  },

  abortPanic: () => {
    set({
      status: 'idle',
      isCountingDown: false,
      countdownSeconds: 3,
      incident: null,
      assignedAmbulance: null,
    });
  },

  broadcastIncident: () => {
    const currentIncident = get().incident;
    const availableAmbulances = get().ambulances.filter((a) => a.status === 'available');
    const assigned = availableAmbulances.length > 0 ? availableAmbulances[0] : null;

    set({
      status: 'broadcasting',
      isCountingDown: false,
      countdownSeconds: 0,
      assignedAmbulance: assigned,
      incident: currentIncident
        ? {
            ...currentIncident,
            status: 'broadcasting',
            assignedAmbulanceId: assigned?.id,
          }
        : null,
      // Update status ambulans menjadi dispatched
      ambulances: get().ambulances.map((amb) =>
        amb.id === assigned?.id ? { ...amb, status: 'dispatched' } : amb
      ),
    });
  },

  resolveIncident: () => {
    const { assignedAmbulance } = get();
    set({
      status: 'idle',
      isCountingDown: false,
      countdownSeconds: 3,
      incident: null,
      assignedAmbulance: null,
      ambulances: get().ambulances.map((amb) =>
        amb.id === assignedAmbulance?.id ? { ...amb, status: 'available' } : amb
      ),
    });
  },

  selectFacility: (facility) => {
    set({ selectedFacility: facility });
  },

  setFacilities: (facilities) => {
    set({ facilities });
  },

  updateAmbulanceLocation: (ambulanceId, coords) => {
    set((state) => ({
      ambulances: state.ambulances.map((amb) =>
        amb.id === ambulanceId ? { ...amb, coordinates: coords } : amb
      ),
      assignedAmbulance:
        state.assignedAmbulance?.id === ambulanceId
          ? { ...state.assignedAmbulance, coordinates: coords }
          : state.assignedAmbulance,
    }));
  },
}));

