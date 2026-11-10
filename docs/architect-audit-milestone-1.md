# Architect’s Audit Checklist & Laporan AIK — Milestone 1 (Week 9)
### Mata Kuliah: Pemrograman Mobile
### Topik: Smart Health & Emergency Response System (SDG 3)
### Aplikasi: SiagaMedis

---

## 1. Architect’s Audit Protocol (Milestone 1)

| Audit Item | Status | Bukti Implementasi & Penjelasan Teknis |
| :--- | :---: | :--- |
| **Check 1: Explicit Error Handling & Permissions** | **PASSED** | Diimplementasikan pada `src/hooks/useLocationTracking.ts`. Menggunakan alur *Just-In-Time* (JIT) permissions. Mengecek apakah hardware GPS aktif via `Location.hasServicesEnabledAsync()`, kemudian meminta izin via `Location.requestForegroundPermissionsAsync()`. Semua potensi *unhandled rejection* dibungkus dalam blok `try-catch` dengan state pesan error eksplisit di `locationStore`. |
| **Check 2: Graceful Fallbacks & Skeleton State** | **PASSED** | Jika izin lokasi ditolak oleh pengguna atau perangkat tidak mengaktifkan GPS, aplikasi tidak mengalami *crash*, melainkan melakukan *fallback* elegan ke koordinat default siaga (Pusat Kota Yogyakarta: `-7.7956, 110.3695`). Status koneksi ditampilkan transparan di *Floating Header Bar*. |
| **Check 3: Unsubscribe & Cleanup (Zero Memory Leak)** | **PASSED** | Pada `useLocationTracking.ts`, subscription `Location.watchPositionAsync` disimpan dalam `subscriptionRef.current`. Pada *cleanup return* `useEffect`, fungsi `subscription.remove()` dipanggil untuk memastikan memori dan sensor GPS dibersihkan sempurna saat komponen unmount. |
| **16-Millisecond Mandate (60 FPS Performance)** | **PASSED** | • Semua marker peta (`UserMarker`, `HospitalMarker`, `AmbulanceMarker`) dan kartu detail dibungkus dengan `React.memo`.<br>• Kalkulasi jarak Haversine untuk seluruh fasilitas dibungkus dengan `useMemo` sehingga tidak dihitung ulang pada setiap re-render.<br>• Seluruh fungsi event handler dibungkus dengan `useCallback`. |

---

## 2. Hasil Pengujian Terautomasi (Unit Testing)

File pengujian: `__tests__/haversine.test.ts`
Hasil eksekusi:
```
▶ Milestone 1 — Haversine Spatial Engine & Geofencing Tests
  ✔ Jarak antara dua koordinat identik harus 0 km (0.7ms)
  ✔ Kalkulasi jarak Haversine antara RS PKU dan RSUP Sardjito (~3.7 km) (1.2ms)
  ✔ formatDistance mengembalikan format meter jika jarak < 1 km (0.1ms)
  ✔ formatDistance mengembalikan format kilometer jika jarak >= 1 km (0.1ms)
  ✔ isWithinGeofenceRadius mendeteksi apakah posisi berada dalam radius (0.1ms)
  ✔ calculateEtaMinutes menghitung estimasi waktu tiba dengan benar (0.4ms)
✔ Milestone 1 — Haversine Spatial Engine & Geofencing Tests (3.5ms)
ℹ tests 6 | pass 6 | fail 0
```

---

## 3. Laporan Refleksi Nilai Al-Islam & Kemuhammadiyahan (AIK)

1. **Ikhlas (Ketulusan dan Pengabdian Sosial)**
   Aplikasi *SiagaMedis* dirancang sebagai solusi tanggap darurat murni kemanusiaan. Dalam situasi genting (*Golden Hour*), korban dapat memantau faskes terdekat tanpa diwajibkan melewati registrasi berbelit atau terpapar iklan komersial. Niat rekayasa perangkat lunak adalah semata-mata menolong sesama makhluk Allah.

2. **Itqan (Profesionalitas & Kerapian Rekayasa)**
   Nilai *Itqan* diwujudkan dalam akurasi tinggi dan stabilitas aplikasi:
   - Presisi komputasi spasial formula Haversine diverifikasi melalui unit test otomatis berstandar industri.
   - Kepatuhan terhadap *16ms Mandate* dan *Zero Memory Leak* memastikan aplikasi tidak mengalami *freeze* atau *lag* saat pengguna membutuhkan pertolongan medis segera.
   - Penerapan arsitektur *Unidirectional Data Flow* (UDF) via Zustand menjamin keadaan data dapat diprediksi (*predictable state*).

3. **Amanah (Kejujuran dan Penjagaan Privasi)**
   Akses lokasi pengguna adalah bentuk amanah data. Aplikasi hanya meminta izin GPS secara transparan saat dibutuhkan (*Just-In-Time*) dan tidak mengirimkan koordinat ke pihak ketiga tanpa persetujuan pengguna.

