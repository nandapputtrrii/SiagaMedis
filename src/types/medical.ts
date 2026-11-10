import { EmergencyContact } from './emergency';

export type BloodType = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-' | 'Belum Diketahui';

export interface EncryptedMedicalProfile {
  nik: string;
  fullName: string;
  dateOfBirth: string;
  bloodType: BloodType;
  allergies: string[];
  chronicConditions: string[];
  regularMedications: string[];
  emergencyContacts: EmergencyContact[];
  bpjsOrInsuranceNumber?: string;
  donorOrganConsent: boolean;
  notes?: string;
}

export type DocumentCategory =
  | 'surat_rujukan'
  | 'kartu_bpjs'
  | 'resume_medis'
  | 'hasil_lab';

export interface MedicalDocument {
  id: string;
  title: string;
  category: DocumentCategory;
  fileName: string;
  fileUri: string;
  content: string;
  sizeBytes: number;
  createdAt: number;
  isSandboxProtected: boolean;
}

export interface StorageMetrics {
  totalBytes: number;
  formattedSize: string;
  fileCount: number;
  sandboxPath: string;
  isHardwareEncrypted: boolean;
}
