import * as FileSystem from 'expo-file-system/legacy';
import { MedicalDocument, DocumentCategory, StorageMetrics } from '../types/medical';

// Direktori Scoped Storage terisolasi di dalam documentDirectory aplikasi
const VAULT_DIR_NAME = 'medical_vault/';
const VAULT_DIR = `${FileSystem.documentDirectory}${VAULT_DIR_NAME}`;

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Service untuk mengelola dokumen rekam medis pada Scoped Storage
 * menggunakan FileSystem.documentDirectory (terisolasi sandbox OS).
 * Mematuhi Sub-CPMK 8: Penyimpanan lokal berbasis Scoped Storage.
 */
export const FileStorageService = {
  /**
   * Memastikan direktori sandbox dokumen sudah dibuat
   */
  async ensureVaultDirectory(): Promise<void> {
    try {
      const dirInfo = await FileSystem.getInfoAsync(VAULT_DIR);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(VAULT_DIR, { intermediates: true });
      }
    } catch (error) {
      console.error('Error ensuring vault directory:', error);
    }
  },

  /**
   * Menyimpan dokumen medis baru ke dalam Scoped Storage sandbox
   */
  async saveMedicalDocument(
    title: string,
    category: DocumentCategory,
    content: string
  ): Promise<MedicalDocument> {
    await this.ensureVaultDirectory();

    const timestamp = Date.now();
    const id = `doc-${timestamp}`;
    const safeTitle = title.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const fileName = `${safeTitle}_${timestamp}.json`;
    const fileUri = `${VAULT_DIR}${fileName}`;

    const docPayload: MedicalDocument = {
      id,
      title,
      category,
      fileName,
      fileUri,
      content,
      sizeBytes: new Blob([content]).size || content.length,
      createdAt: timestamp,
      isSandboxProtected: true,
    };

    const serialized = JSON.stringify(docPayload, null, 2);
    await FileSystem.writeAsStringAsync(fileUri, serialized, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    return docPayload;
  },

  /**
   * Membaca seluruh dokumen medis dari dalam Scoped Storage
   */
  async listMedicalDocuments(): Promise<MedicalDocument[]> {
    try {
      await this.ensureVaultDirectory();

      const files = await FileSystem.readDirectoryAsync(VAULT_DIR);
      const jsonFiles = files.filter((f) => f.endsWith('.json'));

      const documents: MedicalDocument[] = [];

      for (const fileName of jsonFiles) {
        try {
          const fileUri = `${VAULT_DIR}${fileName}`;
          const content = await FileSystem.readAsStringAsync(fileUri, {
            encoding: FileSystem.EncodingType.UTF8,
          });
          const parsed: MedicalDocument = JSON.parse(content);
          documents.push(parsed);
        } catch (readErr) {
          console.warn(`Failed to parse file ${fileName}:`, readErr);
        }
      }

      // Urutkan dari dokumen terbaru
      return documents.sort((a, b) => b.createdAt - a.createdAt);
    } catch (error) {
      console.error('Error reading documents from vault:', error);
      return [];
    }
  },

  /**
   * Menghapus dokumen tertentu dari sandbox
   */
  async deleteMedicalDocument(fileName: string): Promise<boolean> {
    try {
      const fileUri = `${VAULT_DIR}${fileName}`;
      await FileSystem.deleteAsync(fileUri, { idempotent: true });
      return true;
    } catch (error) {
      console.error(`Error deleting file ${fileName}:`, error);
      return false;
    }
  },

  /**
   * Menghitung metrik penggunaan Scoped Storage
   */
  async getStorageMetrics(): Promise<StorageMetrics> {
    try {
      await this.ensureVaultDirectory();
      const files = await FileSystem.readDirectoryAsync(VAULT_DIR);
      let totalBytes = 0;

      for (const f of files) {
        const info = await FileSystem.getInfoAsync(`${VAULT_DIR}${f}`);
        if (info.exists && typeof info.size === 'number') {
          totalBytes += info.size;
        }
      }

      return {
        totalBytes,
        formattedSize: formatFileSize(totalBytes),
        fileCount: files.length,
        sandboxPath: VAULT_DIR,
        isHardwareEncrypted: true,
      };
    } catch (error) {
      console.error('Error calculating storage metrics:', error);
      return {
        totalBytes: 0,
        formattedSize: '0 B',
        fileCount: 0,
        sandboxPath: VAULT_DIR,
        isHardwareEncrypted: true,
      };
    }
  },

  /**
   * Pre-seed dokumen contoh darurat jika vault masih kosong
   */
  async seedInitialDocumentsIfEmpty(): Promise<MedicalDocument[]> {
    const existing = await this.listMedicalDocuments();
    if (existing.length > 0) return existing;

    const sample1 = await this.saveMedicalDocument(
      'Surat Rujukan IGD PKU Muhammadiyah',
      'surat_rujukan',
      'Rujukan pasien trauma kecelakaan lalu lintas. Tanda vital stabil. Dianjurkan foto rontgen thoraks dan observasi neurologis selama 24 jam di ruang observasi intensif.'
    );

    const sample2 = await this.saveMedicalDocument(
      'Kartu Digital BPJS Kesehatan Aktif',
      'kartu_bpjs',
      'Nomor Kartu: 0001234567890\nNama: Ahmad Fauzan\nFaskes Tingkat 1: Klinik Pratama UMY\nStatus Kepesertaan: AKTIF (Kelas 1 Rawat Inap)'
    );

    const sample3 = await this.saveMedicalDocument(
      'Resume Medis Asma Akut',
      'resume_medis',
      'Pasien memiliki riwayat asma bronkial sedang. Terakhir mengalami serangan akut 6 bulan lalu. Respon baik terhadap nebulizer salbutamol + ipratropium bromide.'
    );

    return [sample1, sample2, sample3];
  },
};

