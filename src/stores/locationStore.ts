import { create } from 'zustand';
import { Coordinates } from '../types/spatial';

export type TrackingMode = 'idle' | 'emergency';
export type PermissionStatus = 'undetermined' | 'granted' | 'denied';

interface LocationState {
  currentLocation: Coordinates | null;
  permissionStatus: PermissionStatus;
  isTracking: boolean;
  trackingMode: TrackingMode;
  errorMessage: string | null;

  // Actions (UDF)
  setCurrentLocation: (coords: Coordinates) => void;
  setPermissionStatus: (status: PermissionStatus) => void;
  setIsTracking: (isTracking: boolean) => void;
  setTrackingMode: (mode: TrackingMode) => void;
  setErrorMessage: (msg: string | null) => void;
  resetLocation: () => void;
}

export const useLocationStore = create<LocationState>((set) => ({
  currentLocation: null,
  permissionStatus: 'undetermined',
  isTracking: false,
  trackingMode: 'idle',
  errorMessage: null,

  setCurrentLocation: (coords) =>
    set({
      currentLocation: coords,
      errorMessage: null,
    }),

  setPermissionStatus: (status) =>
    set({
      permissionStatus: status,
    }),

  setIsTracking: (isTracking) =>
    set({
      isTracking,
    }),

  setTrackingMode: (trackingMode) =>
    set({
      trackingMode,
    }),

  setErrorMessage: (errorMessage) =>
    set({
      errorMessage,
    }),

  resetLocation: () =>
    set({
      currentLocation: null,
      errorMessage: null,
      isTracking: false,
    }),
}));

