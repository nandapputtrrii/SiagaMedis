# Architect’s Audit Checklist & Laporan AIK — Milestone 2
### Mata Kuliah: Pemrograman Mobile
### Sub-CPMK 8: Penyimpanan Terenkripsi Hardware-Backed & Pengelolaan Berkas Scoped Storage
### Aplikasi: SiagaMedis

---

## 1. Bukti Implementasi Deliverables (Milestone 2)

| Deliverable | Status | Komponen / File | Penjelasan Teknis & Bukti |
| :--- | :---: | :--- | :--- |
| **Deliverable 1: Integrasi `expo-secure-store` untuk Enkripsi Data Sensitif (Token / NIK / Kredensial)** | **PASSED** | • `src/services/secureStorageService.ts`<br>• `src/app/(tabs)/vault.tsx`<br>• `package.json`<br>• `app.json` | • **Enkripsi Hardware-Backed:** Menggunakan KeyStore (Android) dan Secure Enclave / Keychain (iOS) via `expo-secure-store` dengan opsi `keychainAccessible: WHEN_UNLOCKED_THIS_DEVICE_ONLY`.<br>• **Sensitif Data (NIK):** Data profil medis pasien dan NIK dilindungi enkripsi AES-256. Pada UI `vault.tsx`, NIK dimask (`347101••••••••01`) dengan toggle sensor mata.<br>• **Auth Token:** Sesi autentikasi darurat disimpan terenkripsi (`saveAuthToken`, `getAuthToken`).<br>• **Kredensial PIN:** Akses catatan medis dilindungi PIN 6-digit dengan verifikasi terenkripsi (`verifyEmergencyPin`, `saveEmergencyPin`). |
| **Deliverable 2: Integrasi `expo-file-system` (`documentDirectory`) untuk Scoped Storage Sandbox** | **PASSED** | • `src/services/fileStorageService.ts`<br>• `src/types/medical.ts`<br>• `src/app/(tabs)/vault.tsx` | • **Scoped Storage Sandbox:** Berkas disimpan terisolasi di `${FileSystem.documentDirectory}medical_vault/`, terlindungi dari akses aplikasi lain di OS.<br>• **Dua Tipe Berkas:** Mendukung dokumen teks/JSON (surat rujukan IGD, kartu digital BPJS, resume medis) dan media/foto (foto resep, rontgen thoraks, hasil lab).<br>• **Metrik Storage:** Menghitung ukuran total penyimpanan terpakai, path fisik direktori sandbox OS, dan jumlah berkas (`getStorageMetrics`).<br>• **Operasi Berkas Lengkap:** CRUD berkas (tambah, baca, lihat detail/preview foto, dan hapus berkas fisik permanen). |
| **Deliverable 3: Penanganan Runtime Permissions (Kamera / Lokasi / Storage) Alur Just-In-Time (JIT)** | **PASSED** | • `src/services/permissionService.ts`<br>• `src/hooks/useLocationTracking.ts`<br>• `app.json` | • **Lokasi (GPS):** Izin foreground diminta hanya saat fitur LBS / Tracking darurat diaktifkan (`Location.requestForegroundPermissionsAsync`), dengan fallback ke titik siaga Yogyakarta jika ditolak.<br>• **Kamera (JIT):** Izin kamera diminta hanya saat pengguna menekan tombol *"Foto Kamera (JIT)"* via `PermissionService.requestCameraPermissionJIT()`. Jika izin ditolak permanen, aplikasi mengarahkan ke pengaturan sistem secara edukatif.<br>• **Storage / Media (JIT):** Izin media/galeri diminta secara JIT saat pengguna menekan tombol *"Import Galeri (JIT)"*. Foto disalin langsung dari cache sementara ke Scoped Storage internal. |

---

## 2. Hasil Pengujian Terautomasi (Unit Testing)

Perintah eksekusi:
```bash
npm test
```

Hasil eksekusi:
```
TAP version 13
# Subtest: Milestone 1 — Haversine Spatial Engine & Geofencing Tests
    ok 1 - Jarak antara dua koordinat identik harus 0 km
    ok 2 - Kalkulasi jarak Haversine antara RS PKU dan RSUP Sardjito (~3.7 km)
    ok 3 - formatDistance mengembalikan format meter jika jarak < 1 km
    ok 4 - formatDistance mengembalikan format kilometer jika jarak >= 1 km
    ok 5 - isWithinGeofenceRadius mendeteksi apakah posisi berada dalam radius
    ok 6 - calculateEtaMinutes menghitung estimasi waktu tiba dengan benar
ok 1 - Milestone 1 — Haversine Spatial Engine & Geofencing Tests

# Subtest: Milestone 2 — Secure Storage & Scoped Storage Architecture Tests
    ok 1 - Masking NIK data sensitif menyembunyikan 8 digit tengah
    ok 2 - Masking Auth Token Darurat mempertahankan prefix dan suffix untuk verifikasi audit
    ok 3 - Validasi PIN darurat hardware Keystore harus tepat 6 digit
    ok 4 - Struktur metadata dokumen Scoped Storage memiliki integritas sandbox
    ok 5 - Dokumen media sandbox menyimpan path media terisolasi di dalam documentDirectory
    ok 6 - Kalkulasi dan pemformatan kuota berkas Scoped Storage
ok 2 - Milestone 2 — Secure Storage & Scoped Storage Architecture Tests

# tests 12
# suites 2
# pass 12
# fail 0
```

Hasil Static Analysis (Lint & Typecheck):
- `npx eslint src`: **0 errors, 0 warnings (PASSED)**
- `npx tsc --noEmit`: **0 type errors (PASSED)**

---

## 3. Laporan Refleksi Nilai Al-Islam & Kemuhammadiyahan (AIK)

1. **Amanah (Hifz an-Nafs & Hifz al-Mal / Kerahasiaan Data Medis Pasien)**
   Dalam Islam, rekam medis pasien (seperti penyakit kronis, riwayat alergi, dan NIK) adalah rahasia pribadi yang wajib dijaga integritasnya (*Amanah*). Penerapan hardware-backed encryption via Keystore/Secure Enclave dan Scoped Storage sandbox menjamin bahwa data pasien tidak dapat disadap atau diakses oleh aplikasi pihak ketiga tanpa hak.

2. **Itqan (Kerapian Rekayasa & Keamanan Berlapis)**
   Prinsip *Itqan* (kesempurnaan dan profesionalitas kerja) diterapkan melalui perlindungan data berlapis: enkripsi data kunci menggunakan SecureStore, penyimpanan berkas lokal menggunakan sandbox OS tertutup, serta pengujian terautomasi yang membuktikan keandalan format penyimpanan.

3. **Alur Perizinan yang Transparan & Beradab (Just-In-Time Permissions)**
   Aplikasi tidak secara serakah meminta semua izin (Kamera, Lokasi, Media) di awal instalasi (*upfront permission hoarding*). Aplikasi hanya memohon izin pada saat pengguna benar-benar hendak mengambil foto rujukan atau mengaktifkan radar darurat (*Just-In-Time*), disertai dialog penjelasan tujuan penggunaan izin secara santun dan transparan.
