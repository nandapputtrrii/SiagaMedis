import * as SecureStore from 'expo-secure-store';
import { EncryptedMedicalProfile } from '../types/medical';

const PROFILE_KEY = 'siagamedis_encrypted_medical_profile';
const AUTH_TOKEN_KEY = 'siagamedis_secure_auth_token';
const EMERGENCY_PIN_KEY = 'siagamedis_emergency_access_pin';

const DEFAULT_PROFILE: EncryptedMedicalProfile = {
  nik: '3471012304950001',
  fullName: 'Ahmad Fauzan',
  dateOfBirth: '1995-04-23',
  bloodType: 'O+',
  allergies: ['Penisilin', 'Amoksisilin'],
  chronicConditions: ['Asma Bronkial Ringan'],
  regularMedications: ['Salbutamol Inhaler (Saat Kambuh)'],
  emergencyContacts: [
    {
      id: 'ice-1',
      name: 'Siti Rahma (Istri)',
      relationship: 'Istri',
      phoneNumber: '081234567890',
      isPrimaryIce: true,
    },
    {
      id: 'ice-2',
      name: 'Budi Santoso (Ayah)',
      relationship: 'Orang Tua',
      phoneNumber: '081987654321',
      isPrimaryIce: false,
    },
  ],
  bpjsOrInsuranceNumber: '0001234567890',
  donorOrganConsent: true,
  notes: 'Membawa inhaler di saku jaket kiri.',
};

/**
 * Service untuk menyimpan dan mengambil data sensitif terenkripsi
 * menggunakan Secure Enclave (iOS) dan Keystore (Android) via expo-secure-store.
 * Memenuhi prinsip AIK: Amanah (menjaga kerahasiaan data medis & kredensial pasien).
 */
export const SecureStorageService = {
  /**
   * Mengecek apakah hardware-backed secure storage tersedia di perangkat
   */
  async isHardwareAvailable(): Promise<boolean> {
    try {
      return await SecureStore.isAvailableAsync();
    } catch {
      return false;
    }
  },

  /**
   * Menyimpan profil medis ke hardware-backed storage terenkripsi
   */
  async saveProfile(profile: EncryptedMedicalProfile): Promise<boolean> {
    try {
      const jsonValue = JSON.stringify(profile);
      await SecureStore.setItemAsync(PROFILE_KEY, jsonValue, {
        keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      });
      return true;
    } catch (error) {
      console.error('Error saving profile to SecureStore:', error);
      return false;
    }
  },

  /**
   * Mengambil profil medis dari SecureStore
   */
  async getProfile(): Promise<EncryptedMedicalProfile> {
    try {
      const stored = await SecureStore.getItemAsync(PROFILE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
      await this.saveProfile(DEFAULT_PROFILE);
      return DEFAULT_PROFILE;
    } catch (error) {
      console.error('Error reading profile from SecureStore:', error);
      return DEFAULT_PROFILE;
    }
  },

  /**
   * Menghapus profil dari SecureStore
   */
  async clearProfile(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(PROFILE_KEY);
    } catch (error) {
      console.error('Error clearing profile from SecureStore:', error);
    }
  },

  /**
   * Menyimpan token sesi autentikasi darurat secara terenkripsi
   */
  async saveAuthToken(token: string): Promise<boolean> {
    try {
      await SecureStore.setItemAsync(AUTH_TOKEN_KEY, token, {
        keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      });
      return true;
    } catch (error) {
      console.error('Error saving auth token to SecureStore:', error);
      return false;
    }
  },

  /**
   * Mengambil token sesi autentikasi
   */
  async getAuthToken(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
    } catch {
      return null;
    }
  },

  /**
   * Menghapus token sesi
   */
  async clearAuthToken(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
    } catch (error) {
      console.error('Error clearing auth token from SecureStore:', error);
    }
  },

  /**
   * Menyimpan PIN pengaman akses rekam medis
   */
  async saveEmergencyPin(pin: string): Promise<boolean> {
    try {
      await SecureStore.setItemAsync(EMERGENCY_PIN_KEY, pin);
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Verifikasi PIN pengaman akses
   */
  async verifyEmergencyPin(pin: string): Promise<boolean> {
    try {
      const stored = await SecureStore.getItemAsync(EMERGENCY_PIN_KEY);
      return stored === pin;
    } catch {
      return false;
    }
  },

  /**
   * Cek apakah PIN sudah diatur
   */
  async isPinSet(): Promise<boolean> {
    try {
      const stored = await SecureStore.getItemAsync(EMERGENCY_PIN_KEY);
      return Boolean(stored);
    } catch {
      return false;
    }
  },
};
