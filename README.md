# SiagaMedis (Smart Emergency First-Responder & Medical LBS Network)
### Tugas Besar Pemrograman Mobile — SDG 3: Good Health & Well-Being

SiagaMedis adalah aplikasi tanggap darurat medis LBS (*Location-Based Services*) berbasis React Native (Expo SDK 58) yang menghubungkan korban kegawatdaruratan dengan armada ambulans terdekat dan IGD rumah sakit secara *real-time* dengan mematuhi prinsip **Golden Hour**.

Proyek ini dibangun menggunakan alur kerja **AI Vibe Coding di Antigravity IDE**, mematuhi **Architect’s Audit Protocol**, standar performa **16-Millisecond Mandate (60 FPS)**, serta mengintegrasikan nilai-nilai **Al-Islam dan Kemuhammadiyahan (AIK)** (*Ikhlas, Itqan, Amanah*).

---

## 🚀 Fitur Utama (Milestone 1 — Week 9)

- **Interactive Live Map Engine (`react-native-maps`):**
  - Pemetaan posisi pengguna (`UserMarker`) dengan efek animasi pulsa LBS.
  - Pemetaan rumah sakit siaga (`HospitalMarker`) lengkap dengan jumlah ketersediaan bed darurat.
  - Pemetaan armada ambulans bergerak (`AmbulanceMarker`) dengan status ketersediaan.
  - Visualisasi radius **Geofencing** (lingkaran 2000 meter di sekitar IGD rumah sakit rujukan).
  - Filter interaktif (Semua, RS/IGD, Ambulans).
- **Komputasi Spasial Haversine Formula:**
  - Perhitungan jarak garis lurus akurat (*great-circle distance*) dengan konstanta bumi WGS-84 ($R = 6371\text{ km}$).
  - Estimasi waktu tiba (*ETA*) berdasarkan kecepatan ambulans darurat.
- **Custom Hook `useLocationTracking`:**
  - JIT (*Just-In-Time*) Runtime Permissions.
  - *Adaptive Distance Interval* (5m saat darurat, 25m saat siaga).
  - *Graceful Fallback* ke koordinat default siaga Yogyakarta jika GPS mati.
  - **Zero Memory Leak:** pembersihan watcher `subscription.remove()` saat unmount.
- **Zustand State Management (UDF):**
  - *Unidirectional Data Flow* dengan *precision selectors* tanpa mutasi langsung.

---

## 🛠️ Cara Menjalankan Proyek di Antigravity IDE

1. Buka Terminal terintegrasi di Antigravity IDE (`Ctrl + \`` atau `Cmd + \`` di Mac).
2. Jalankan server pengembang Expo:
   ```bash
   npx expo start
   ```
3. Opsi Pratinjau:
   - **Di Smartphone Fisik (Expo Go):** Buka aplikasi Expo Go, lalu scan QR Code yang tampil di terminal.
   - **Di Android Emulator:** Tekan huruf `a` di keyboard terminal.
   - **Di iOS Simulator (Mac):** Tekan huruf `i` di keyboard terminal.

### Menjalankan Pengujian Terautomasi & Validasi Tipe

```bash
# Menjalankan Unit Testing Matematis Spasial Haversine & Geofencing (Node Test Runner)
npm test

# Menjalankan TypeScript Typecheck (0 Error)
npm run typecheck
```

---

## 📁 Struktur Direktori Proyek

```
proyek/
├── assets/                  # Aset ikon dan splash screen
├── src/
│   ├── app/                 # Expo Router file-based screens
│   │   ├── _layout.tsx      # Root Stack Provider
│   │   └── (tabs)/          # Bottom Tabs Navigator
│   │       ├── _layout.tsx  # Definisi tab bar & icon
│   │       ├── index.tsx    # [WEEK 9] Peta LBS & Haversine Engine
│   │       ├── panic.tsx    # Tombol Panik SOS & Safe Abort Window
│   │       ├── directory.tsx# Direktori Faskes & Reactive Search
│   │       └── vault.tsx    # Vault Medis Terenkripsi KeyStore
│   ├── components/          # Komponen UI terisolasi (React.memo)
│   │   └── map/             # CustomMarkers, FacilityCard, AmbulanceCard
│   ├── data/                # Mock data faskes Yogyakarta & armada ambulans
│   ├── hooks/               # useLocationTracking, useHaptics
│   ├── services/            # SecureStorageService (AES-256 KeyStore)
│   ├── stores/              # Zustand Stores (locationStore, emergencyStore)
│   ├── types/               # TypeScript interfaces (spatial, emergency, medical)
│   └── utils/               # haversine.ts (Komputasi Spasial)
├── __tests__/               # Automated Unit Tests
│   └── haversine.test.ts    # 6 test suite terverifikasi
├── app.json                 # Konfigurasi plugin native Expo
├── package.json
└── tsconfig.json
```

---

## ⚖️ Implementasi Nilai Al-Islam & Kemuhammadiyahan (AIK)

- **Ikhlas (Ketulusan):** Dirancang murni demi keselamatan jiwa manusia tanpa diskriminasi latar belakang dan bebas dari iklan komersial.
- **Itqan (Profesionalitas & Presisi):** Kepatuhan ketat terhadap aturan *16-Millisecond Mandate (60 FPS)*, verifikasi matematis rumus Haversine via *Automated Unit Testing*, dan jaminan *Zero Memory Leaks*.
- **Amanah (Integritas Data):** Perlindungan data rekam medis sensitif pasien menggunakan enkripsi *hardware-backed SecureStore (KeyStore/Secure Enclave)*.

