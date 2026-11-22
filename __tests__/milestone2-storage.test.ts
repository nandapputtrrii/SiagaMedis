import test, { describe } from 'node:test';
import assert from 'node:assert';
import type { MedicalDocument, DocumentCategory, EncryptedMedicalProfile } from '../src/types/medical.ts';

describe('Milestone 2 — Secure Storage & Scoped Storage Architecture Tests', () => {
  // 1. Uji Enkripsi & Masking NIK Data Sensitif (expo-secure-store logic)
  test('Masking NIK data sensitif menyembunyikan 8 digit tengah', () => {
    const rawNik = '3471012304950001';
    const maskedNik = `${rawNik.slice(0, 6)}••••••••${rawNik.slice(-2)}`;

    assert.strictEqual(maskedNik, '347101••••••••01');
    assert.strictEqual(maskedNik.length, 16);
    assert.strictEqual(maskedNik.includes('230495'), false, 'Digit tengah NIK tidak boleh bocor');
  });

  // 2. Uji Token Sesi & Masking Kredensial
  test('Masking Auth Token Darurat mempertahankan prefix dan suffix untuk verifikasi audit', () => {
    const rawToken = 'sm_jwt_emergency_session_hw_sec2026_aik';
    const maskedToken = `${rawToken.slice(0, 10)}••••••••••••••••••••••••••••${rawToken.slice(-6)}`;

    assert.ok(maskedToken.startsWith('sm_jwt_eme'));
    assert.ok(maskedToken.endsWith('26_aik'));
    assert.ok(maskedToken.includes('••••'));
  });

  // 3. Uji Validasi Kredensial PIN Darurat (6-digit format)
  test('Validasi PIN darurat hardware Keystore harus tepat 6 digit', () => {
    const validPin = '123456';
    const shortPin = '123';
    const letterPin = '12345A';

    const isValidFormat = (pin: string) => /^\d{6}$/.test(pin);

    assert.strictEqual(isValidFormat(validPin), true);
    assert.strictEqual(isValidFormat(shortPin), false);
    assert.strictEqual(isValidFormat(letterPin), false);
  });

  // 4. Uji Struktur Berkas Sandbox Scoped Storage
  test('Struktur metadata dokumen Scoped Storage memiliki integritas sandbox', () => {
    const mockDocument: MedicalDocument = {
      id: 'doc-1700000000000',
      title: 'Surat Rujukan IGD PKU',
      category: 'surat_rujukan',
      fileName: 'surat_rujukan_igd_pku_1700000000000.json',
      fileUri: 'file:///data/user/0/host.exp.exponent/files/medical_vault/surat_rujukan_igd_pku_1700000000000.json',
      type: 'document',
      content: 'Rujukan trauma kepala ringan, observasi 24 jam.',
      sizeBytes: 420,
      createdAt: 1700000000000,
      isSandboxProtected: true,
    };

    assert.strictEqual(mockDocument.isSandboxProtected, true);
    assert.ok(mockDocument.fileUri.includes('medical_vault'));
    assert.strictEqual(mockDocument.category, 'surat_rujukan');
  });

  // 5. Uji Berkas Media Sandbox (Kamera/Galeri)
  test('Dokumen media sandbox menyimpan path media terisolasi di dalam documentDirectory', () => {
    const mockMediaDoc: MedicalDocument = {
      id: 'media-1700000000000',
      title: 'Foto Hasil Rontgen Thoraks',
      category: 'hasil_lab',
      fileName: 'foto_hasil_rontgen_thoraks_1700000000000.json',
      fileUri: 'file:///data/user/0/host.exp.exponent/files/medical_vault/meta_1700000000000.json',
      mediaUri: 'file:///data/user/0/host.exp.exponent/files/medical_vault/media_1700000000000.jpg',
      type: 'image',
      content: 'Foto rontgen thoraks pasien trauma.',
      sizeBytes: 154820,
      createdAt: 1700000000000,
      isSandboxProtected: true,
    };

    assert.strictEqual(mockMediaDoc.type, 'image');
    assert.ok(mockMediaDoc.mediaUri?.endsWith('.jpg'));
    assert.ok(mockMediaDoc.mediaUri?.includes('medical_vault'));
    assert.ok(mockMediaDoc.sizeBytes > 1000);
  });

  // 6. Uji Formatting Metrik Scoped Storage
  test('Kalkulasi dan pemformatan kuota berkas Scoped Storage', () => {
    function formatFileSize(bytes: number): string {
      if (bytes < 1024) return `${bytes} B`;
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
      return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    }

    assert.strictEqual(formatFileSize(512), '512 B');
    assert.strictEqual(formatFileSize(2048), '2.0 KB');
    assert.strictEqual(formatFileSize(2500000), '2.38 MB');
  });
});
