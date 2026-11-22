import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Linking,
  Alert,
  Modal,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { SecureStorageService } from '../../services/secureStorageService';
import { FileStorageService } from '../../services/fileStorageService';
import { PermissionService } from '../../services/permissionService';
import {
  EncryptedMedicalProfile,
  BloodType,
  MedicalDocument,
  DocumentCategory,
  StorageMetrics,
} from '../../types/medical';

type ActiveTab = 'secure_profile' | 'scoped_documents';

const CATEGORY_LABELS: Record<DocumentCategory, { label: string; icon: string; color: string }> = {
  surat_rujukan: { label: 'Surat Rujukan', icon: 'document-text', color: '#DC2626' },
  kartu_bpjs: { label: 'Kartu BPJS/Asuransi', icon: 'card', color: '#16A34A' },
  resume_medis: { label: 'Resume Medis', icon: 'fitness', color: '#0284C7' },
  hasil_lab: { label: 'Hasil Lab/Diagnostik', icon: 'flask', color: '#9333EA' },
  resep_obat: { label: 'Resep Obat Darurat', icon: 'medkit', color: '#EA580C' },
};

export default function VaultScreen() {
  const insets = useSafeAreaInsets();

  const [activeTab, setActiveTab] = useState<ActiveTab>('secure_profile');
  const [isHardwareSecure, setIsHardwareSecure] = useState(true);

  // SecureStore States (Deliverable 1)
  const [profile, setProfile] = useState<EncryptedMedicalProfile | null>(null);
  const [authToken, setAuthToken] = useState<string>('');
  const [showNik, setShowNik] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSavedNotice, setIsSavedNotice] = useState(false);
  const [pinModalVisible, setPinModalVisible] = useState(false);
  const [inputPin, setInputPin] = useState('');
  const [pinStatusText, setPinStatusText] = useState('PIN Aktif (6-Digit)');

  // Form states for profile editing
  const [fullName, setFullName] = useState('');
  const [bloodType, setBloodType] = useState<BloodType>('O+');
  const [allergiesText, setAllergiesText] = useState('');
  const [chronicText, setChronicText] = useState('');
  const [notes, setNotes] = useState('');

  // FileSystem Scoped Storage States (Deliverable 2 & 3)
  const [documents, setDocuments] = useState<MedicalDocument[]>([]);
  const [metrics, setMetrics] = useState<StorageMetrics | null>(null);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<MedicalDocument | null>(null);
  const [isAddTextModalVisible, setIsAddTextModalVisible] = useState(false);

  // States for new media categorization modal (Kamera / Galeri)
  const [isMediaModalVisible, setIsMediaModalVisible] = useState(false);
  const [pendingMediaUri, setPendingMediaUri] = useState<string | null>(null);
  const [mediaDocTitle, setMediaDocTitle] = useState('');
  const [mediaDocCategory, setMediaDocCategory] = useState<DocumentCategory>('surat_rujukan');
  const [mediaDocNotes, setMediaDocNotes] = useState('');

  // Form states for new text document
  const [newDocTitle, setNewDocTitle] = useState('');
  const [newDocCategory, setNewDocCategory] = useState<DocumentCategory>('surat_rujukan');
  const [newDocContent, setNewDocContent] = useState('');

  // Inisialisasi Data Scoped Storage FileSystem (untuk tombol refresh & update berkas)
  const loadScopedDocuments = useCallback(async () => {
    setIsLoadingFiles(true);
    try {
      await FileStorageService.ensureVaultDirectory();
      const docs = await FileStorageService.listMedicalDocuments();
      setDocuments(docs);
      const storageMetrics = await FileStorageService.getStorageMetrics();
      setMetrics(storageMetrics);
    } catch (err) {
      console.error('Error loading scoped documents:', err);
    } finally {
      setIsLoadingFiles(false);
    }
  }, []);

  // Efek inisialisasi awal (Async initialization to avoid cascading renders)
  useEffect(() => {
    let isMounted = true;

    async function initializeVault() {
      try {
        const hwAvailable = await SecureStorageService.isHardwareAvailable();
        const data = await SecureStorageService.getProfile();
        const token = await SecureStorageService.getAuthToken();
        const isPinConfigured = await SecureStorageService.isPinSet();
        if (!isPinConfigured) {
          await SecureStorageService.saveEmergencyPin('123456');
        }

        await FileStorageService.ensureVaultDirectory();
        await FileStorageService.seedInitialDocumentsIfEmpty();
        const docs = await FileStorageService.listMedicalDocuments();
        const storageMetrics = await FileStorageService.getStorageMetrics();

        if (isMounted) {
          setIsHardwareSecure(hwAvailable);
          setProfile(data);
          setFullName(data.fullName);
          setBloodType(data.bloodType);
          setAllergiesText(data.allergies.join(', '));
          setChronicText(data.chronicConditions.join(', '));
          setNotes(data.notes || '');
          setAuthToken(token);
          setDocuments(docs);
          setMetrics(storageMetrics);
          setIsLoadingFiles(false);
        }
      } catch (err) {
        console.error('Error initializing vault:', err);
        if (isMounted) {
          setIsLoadingFiles(false);
        }
      }
    }

    initializeVault();

    return () => {
      isMounted = false;
    };
  }, []);

  // Handler Simpan Profil SecureStore
  const handleSaveProfile = useCallback(async () => {
    if (!profile) return;

    const updated: EncryptedMedicalProfile = {
      ...profile,
      fullName: fullName.trim() || profile.fullName,
      bloodType,
      allergies: allergiesText
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      chronicConditions: chronicText
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      notes: notes.trim(),
    };

    const success = await SecureStorageService.saveProfile(updated);
    if (success) {
      setProfile(updated);
      setIsEditing(false);
      setIsSavedNotice(true);
      setTimeout(() => setIsSavedNotice(false), 3000);
    } else {
      Alert.alert('Gagal', 'Terjadi kesalahan saat menyimpan data terenkripsi.');
    }
  }, [profile, fullName, bloodType, allergiesText, chronicText, notes]);

  // Handler Verifikasi PIN Kredensial
  const handleVerifyOrChangePin = useCallback(async () => {
    if (inputPin.length < 6) {
      Alert.alert('PIN Tidak Valid', 'Masukkan minimal 6 digit PIN darurat.');
      return;
    }

    const isValid = await SecureStorageService.verifyEmergencyPin(inputPin);
    if (isValid) {
      Alert.alert(
        'Kredensial Terverifikasi',
        'PIN hardware Keystore valid. Anda memiliki akses penuh ke rekam medis darurat.'
      );
      setPinStatusText(`PIN Terverifikasi (${inputPin})`);
      setPinModalVisible(false);
      setInputPin('');
    } else {
      Alert.alert('Verifikasi Gagal', 'PIN yang Anda masukkan salah. Default PIN contoh: 123456');
    }
  }, [inputPin]);

  // Handler Just-In-Time Kamera (Deliverable 3): Buka kamera dan munculkan dialog pilihan jenis berkas
  const handleCaptureWithCamera = useCallback(async () => {
    const photoUri = await PermissionService.capturePhotoWithJIT();
    if (!photoUri) return;

    setPendingMediaUri(photoUri);
    setMediaDocCategory('surat_rujukan');
    setMediaDocTitle(`Foto Surat Rujukan ${new Date().toLocaleDateString('id-ID')}`);
    setMediaDocNotes('');
    setIsMediaModalVisible(true);
  }, []);

  // Handler Just-In-Time Galeri/Storage (Deliverable 3): Buka galeri dan munculkan dialog pilihan jenis berkas
  const handlePickFromGallery = useCallback(async () => {
    const mediaUri = await PermissionService.pickImageWithJIT();
    if (!mediaUri) return;

    setPendingMediaUri(mediaUri);
    setMediaDocCategory('hasil_lab');
    setMediaDocTitle(`Berkas Hasil Lab ${new Date().toLocaleDateString('id-ID')}`);
    setMediaDocNotes('');
    setIsMediaModalVisible(true);
  }, []);

  // Handler Simpan Berkas Media ke Scoped Storage Sandbox setelah memilih kategori
  const handleSaveMediaDoc = useCallback(async () => {
    if (!pendingMediaUri) return;
    if (!mediaDocTitle.trim()) {
      Alert.alert('Perhatian', 'Judul berkas tidak boleh kosong.');
      return;
    }

    try {
      setIsLoadingFiles(true);
      await FileStorageService.saveMediaDocument(
        mediaDocTitle.trim(),
        mediaDocCategory,
        pendingMediaUri,
        mediaDocNotes.trim()
      );
      setIsMediaModalVisible(false);
      setPendingMediaUri(null);
      await loadScopedDocuments();
      Alert.alert(
        'Sukses Tersimpan',
        `Berkas (${CATEGORY_LABELS[mediaDocCategory]?.label}) berhasil disalin dan diamankan di Scoped Storage sandbox.`
      );
    } catch (err) {
      console.error('Failed to save media document:', err);
      Alert.alert('Error', 'Gagal menyimpan berkas ke Scoped Storage.');
    } finally {
      setIsLoadingFiles(false);
    }
  }, [pendingMediaUri, mediaDocTitle, mediaDocCategory, mediaDocNotes, loadScopedDocuments]);

  // Handler Tambah Dokumen Teks Manual
  const handleCreateTextDoc = useCallback(async () => {
    if (!newDocTitle.trim() || !newDocContent.trim()) {
      Alert.alert('Perhatian', 'Judul dan isi dokumen tidak boleh kosong.');
      return;
    }

    try {
      await FileStorageService.saveMedicalDocument(
        newDocTitle.trim(),
        newDocCategory,
        newDocContent.trim()
      );
      setNewDocTitle('');
      setNewDocContent('');
      setIsAddTextModalVisible(false);
      await loadScopedDocuments();
      Alert.alert('Sukses', 'Dokumen medis teks berhasil disimpan di Scoped Storage.');
    } catch {
      Alert.alert('Gagal', 'Terjadi kesalahan saat menulis berkas.');
    }
  }, [newDocTitle, newDocCategory, newDocContent, loadScopedDocuments]);

  // Handler Hapus Dokumen Sandbox
  const handleDeleteDocument = useCallback(
    (doc: MedicalDocument) => {
      Alert.alert(
        'Hapus Dokumen?',
        `Apakah Anda yakin ingin menghapus "${doc.title}" dari Scoped Storage sandbox? Berkas fisik akan dihapus permanen.`,
        [
          { text: 'Batal', style: 'cancel' },
          {
            text: 'Hapus',
            style: 'destructive',
            onPress: async () => {
              const ok = await FileStorageService.deleteMedicalDocument(doc);
              if (ok) {
                if (selectedDoc?.id === doc.id) {
                  setSelectedDoc(null);
                }
                await loadScopedDocuments();
              } else {
                Alert.alert('Error', 'Gagal menghapus berkas.');
              }
            },
          },
        ]
      );
    },
    [selectedDoc, loadScopedDocuments]
  );

  const handleCallIce = useCallback((phone: string) => {
    Linking.openURL(`tel:${phone.replace(/[^0-9]/g, '')}`);
  }, []);

  if (!profile) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#0284C7" />
        <Text style={styles.loadingText}>Mendekripsi Data Medis dari Hardware KeyStore...</Text>
      </View>
    );
  }

  const maskedNik = showNik
    ? profile.nik
    : `${profile.nik.slice(0, 6)}••••••••${profile.nik.slice(-2)}`;

  const maskedToken = showToken
    ? authToken
    : `${authToken.slice(0, 10)}••••••••••••••••••••••••••••${authToken.slice(-6)}`;

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.contentContainer, { paddingTop: insets.top + 16 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Title */}
        <View style={styles.header}>
          <Text style={styles.title}>Secure Medical Vault</Text>
          <Text style={styles.subtitle}>
            Arsitektur Offline-First & Penyimpanan Hardware-Backed terenkripsi (Sub-CPMK 8).
          </Text>
        </View>

        {/* Segmented Tab Switcher */}
        <View style={styles.tabSwitcher}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'secure_profile' && styles.tabButtonActive]}
            onPress={() => setActiveTab('secure_profile')}
            activeOpacity={0.8}
          >
            <Ionicons
              name="lock-closed"
              size={15}
              color={activeTab === 'secure_profile' ? '#FFFFFF' : '#64748B'}
            />
            <Text
              style={[
                styles.tabButtonText,
                activeTab === 'secure_profile' && styles.tabButtonTextActive,
              ]}
            >
              Hardware SecureStore
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'scoped_documents' && styles.tabButtonActive]}
            onPress={() => setActiveTab('scoped_documents')}
            activeOpacity={0.8}
          >
            <Ionicons
              name="folder-open"
              size={15}
              color={activeTab === 'scoped_documents' ? '#FFFFFF' : '#64748B'}
            />
            <Text
              style={[
                styles.tabButtonText,
                activeTab === 'scoped_documents' && styles.tabButtonTextActive,
              ]}
            >
              Scoped Storage ({documents.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* TAB 1: HARDWARE SECURE STORE (Deliverable 1) */}
        {activeTab === 'secure_profile' && (
          <View>
            {/* Hardware Encryption Trust Banner (AIK Amanah) */}
            <View style={styles.securityTrustCard}>
              <Ionicons
                name={isHardwareSecure ? 'shield-checkmark' : 'alert-circle'}
                size={22}
                color={isHardwareSecure ? '#16A34A' : '#EA580C'}
              />
              <View style={styles.securityTrustTextContainer}>
                <Text style={styles.securityTrustTitle}>
                  {isHardwareSecure ? 'Hardware-Backed Security Active' : 'Software Fallback Storage'}
                </Text>
                <Text style={styles.securityTrustDesc}>
                  Data sensitif diamankan via AES-256 KeyStore / Secure Enclave (expo-secure-store).
                  Menerapkan nilai Amanah dalam menjaga privasi medis pasien.
                </Text>
              </View>
            </View>

            {isSavedNotice && (
              <View style={styles.saveNotice}>
                <Ionicons name="checkmark-circle" size={18} color="#16A34A" />
                <Text style={styles.saveNoticeText}>Data medis berhasil dienkripsi dan diperbarui.</Text>
              </View>
            )}

            {/* QUICK MEDICAL EMERGENCY ID CARD (ICE) */}
            <View style={styles.medicalIdCard}>
              <View style={styles.idCardHeader}>
                <View>
                  <Text style={styles.idCardType}>KARTU IDENTITAS GAWAT DARURAT (ICE)</Text>
                  <Text style={styles.idCardName}>{profile.fullName}</Text>
                </View>
                <View style={styles.bloodBadge}>
                  <Text style={styles.bloodBadgeLabel}>GOL. DARAH</Text>
                  <Text style={styles.bloodBadgeValue}>{profile.bloodType}</Text>
                </View>
              </View>

              {/* NIK ROW (Masked) */}
              <View style={styles.nikRow}>
                <Text style={styles.nikLabel}>NIK:</Text>
                <Text style={styles.nikValue}>{maskedNik}</Text>
                <TouchableOpacity onPress={() => setShowNik(!showNik)} style={styles.eyeBtn}>
                  <Ionicons name={showNik ? 'eye-off' : 'eye'} size={16} color="#94A3B8" />
                </TouchableOpacity>
              </View>

              {profile.bpjsOrInsuranceNumber && (
                <View style={styles.bpjsRow}>
                  <Text style={styles.nikLabel}>No. BPJS:</Text>
                  <Text style={styles.bpjsValue}>{profile.bpjsOrInsuranceNumber}</Text>
                </View>
              )}
            </View>

            {/* KREDENSIAL & TOKEN HARDWARE ROW */}
            <View style={styles.credentialsCard}>
              <View style={styles.credHeader}>
                <Ionicons name="key" size={16} color="#0284C7" />
                <Text style={styles.credSectionTitle}>KREDENSIAL & TOKEN ENKRIPSI</Text>
              </View>

              {/* Token Sesi Darurat */}
              <View style={styles.credItem}>
                <View style={styles.credInfo}>
                  <Text style={styles.credLabel}>Auth Token Darurat:</Text>
                  <Text style={styles.credTokenText} numberOfLines={1}>
                    {maskedToken}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setShowToken(!showToken)}
                  style={styles.credActionBtn}
                >
                  <Ionicons name={showToken ? 'eye-off' : 'eye'} size={15} color="#0284C7" />
                </TouchableOpacity>
              </View>

              {/* Kredensial PIN Darurat */}
              <View style={[styles.credItem, { borderBottomWidth: 0 }]}>
                <View style={styles.credInfo}>
                  <Text style={styles.credLabel}>Akses PIN Darurat:</Text>
                  <Text style={styles.credValue}>{pinStatusText}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => setPinModalVisible(true)}
                  style={styles.verifyPinBtn}
                >
                  <Text style={styles.verifyPinText}>Verifikasi</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* EDIT TOGGLE INFORMASI KLINIS */}
            <View style={styles.editRow}>
              <Text style={styles.sectionHeader}>INFORMASI KLINIS DARURAT</Text>
              <TouchableOpacity
                onPress={() => setIsEditing(!isEditing)}
                style={styles.editToggleBtn}
              >
                <Ionicons name={isEditing ? 'close' : 'create-outline'} size={16} color="#0284C7" />
                <Text style={styles.editToggleText}>{isEditing ? 'Batal' : 'Edit Data'}</Text>
              </TouchableOpacity>
            </View>

            {isEditing ? (
              /* FORM EDIT */
              <View style={styles.editForm}>
                <Text style={styles.inputLabel}>Nama Lengkap:</Text>
                <TextInput
                  style={styles.input}
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="Nama Lengkap"
                />

                <Text style={styles.inputLabel}>Golongan Darah:</Text>
                <View style={styles.bloodTypePicker}>
                  {(['A+', 'B+', 'AB+', 'O+', 'Belum Diketahui'] as BloodType[]).map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.bloodOption,
                        bloodType === type && styles.bloodOptionSelected,
                      ]}
                      onPress={() => setBloodType(type)}
                    >
                      <Text
                        style={[
                          styles.bloodOptionText,
                          bloodType === type && styles.bloodOptionTextSelected,
                        ]}
                      >
                        {type}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.inputLabel}>Alergi Obat (Pisahkan koma):</Text>
                <TextInput
                  style={styles.input}
                  value={allergiesText}
                  onChangeText={setAllergiesText}
                  placeholder="Contoh: Penisilin, Aspirin"
                />

                <Text style={styles.inputLabel}>Penyakit Kronis (Pisahkan koma):</Text>
                <TextInput
                  style={styles.input}
                  value={chronicText}
                  onChangeText={setChronicText}
                  placeholder="Contoh: Asma, Diabetes, Jantung"
                />

                <Text style={styles.inputLabel}>Catatan Tambahan untuk Petugas IGD:</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={notes}
                  onChangeText={setNotes}
                  multiline
                  numberOfLines={3}
                  placeholder="Lokasi obat darurat, riwayat operasi..."
                />

                <TouchableOpacity style={styles.saveBtn} onPress={handleSaveProfile}>
                  <Ionicons name="save" size={18} color="#FFFFFF" />
                  <Text style={styles.saveBtnText}>Simpan ke Secure Enclave</Text>
                </TouchableOpacity>
              </View>
            ) : (
              /* READ VIEW INFORMASI KLINIS */
              <View style={styles.clinicalDetailsCard}>
                {/* Alergi Obat */}
                <View style={styles.clinicalBlock}>
                  <View style={styles.clinicalBlockHeader}>
                    <Ionicons name="alert-circle" size={16} color="#DC2626" />
                    <Text style={styles.clinicalTitleRed}>Alergi Obat Kritis:</Text>
                  </View>
                  <View style={styles.tagWrap}>
                    {profile.allergies.length > 0 ? (
                      profile.allergies.map((allergy, index) => (
                        <View key={index} style={styles.allergyTag}>
                          <Text style={styles.allergyText}>{allergy}</Text>
                        </View>
                      ))
                    ) : (
                      <Text style={styles.noneText}>Tidak ada riwayat alergi obat yang dilaporkan.</Text>
                    )}
                  </View>
                </View>

                {/* Penyakit Kronis */}
                <View style={styles.clinicalBlock}>
                  <View style={styles.clinicalBlockHeader}>
                    <Ionicons name="pulse" size={16} color="#EA580C" />
                    <Text style={styles.clinicalTitle}>Penyakit Penyerta / Kondisi Kronis:</Text>
                  </View>
                  <View style={styles.tagWrap}>
                    {profile.chronicConditions.length > 0 ? (
                      profile.chronicConditions.map((condition, index) => (
                        <View key={index} style={styles.conditionTag}>
                          <Text style={styles.conditionText}>{condition}</Text>
                        </View>
                      ))
                    ) : (
                      <Text style={styles.noneText}>Tidak ada riwayat penyakit kronis.</Text>
                    )}
                  </View>
                </View>

                {/* Catatan Medis */}
                {profile.notes && (
                  <View style={styles.clinicalBlock}>
                    <View style={styles.clinicalBlockHeader}>
                      <Ionicons name="document-text" size={16} color="#0284C7" />
                      <Text style={styles.clinicalTitle}>Catatan Petugas Medis:</Text>
                    </View>
                    <Text style={styles.notesText}>{profile.notes}</Text>
                  </View>
                )}
              </View>
            )}

            {/* KONTAK DARURAT UTAMA (ICE) */}
            <Text style={[styles.sectionHeader, { marginTop: 20 }]}>
              KONTAK DARURAT UTAMA (ICE)
            </Text>
            <View style={styles.contactsList}>
              {profile.emergencyContacts.map((contact) => (
                <View key={contact.id} style={styles.contactCard}>
                  <View style={styles.contactInfo}>
                    <View style={styles.contactNameRow}>
                      <Text style={styles.contactName}>{contact.name}</Text>
                      {contact.isPrimaryIce && (
                        <View style={styles.iceBadge}>
                          <Text style={styles.iceBadgeText}>UTAMA</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.contactPhone}>{contact.phoneNumber}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.callContactBtn}
                    onPress={() => handleCallIce(contact.phoneNumber)}
                  >
                    <Ionicons name="call" size={16} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* TAB 2: SCOPED STORAGE & MEDIA SANDBOX (Deliverable 2 & 3) */}
        {activeTab === 'scoped_documents' && (
          <View>
            {/* Scoped Storage Metrics Card */}
            {metrics && (
              <View style={styles.metricsCard}>
                <View style={styles.metricsHeader}>
                  <Ionicons name="server" size={18} color="#0284C7" />
                  <Text style={styles.metricsTitle}>METRIK SCOPED STORAGE SANDBOX</Text>
                </View>
                <View style={styles.metricsGrid}>
                  <View style={styles.metricItem}>
                    <Text style={styles.metricValue}>{metrics.formattedSize}</Text>
                    <Text style={styles.metricLabel}>Total Penggunaan</Text>
                  </View>
                  <View style={styles.metricItem}>
                    <Text style={styles.metricValue}>{metrics.fileCount} Berkas</Text>
                    <Text style={styles.metricLabel}>File Terisolasi</Text>
                  </View>
                  <View style={styles.metricItem}>
                    <Text style={[styles.metricValue, { color: '#16A34A' }]}>Sandboxed</Text>
                    <Text style={styles.metricLabel}>Akses Terlindungi</Text>
                  </View>
                </View>
                <Text style={styles.sandboxPathText} numberOfLines={1}>
                  📁 {metrics.sandboxPath}
                </Text>
              </View>
            )}

            {/* JUST-IN-TIME ACTION BUTTONS (Deliverable 3: Kamera & Storage) */}
            <Text style={styles.sectionHeader}>AKSI DOKUMEN & RUNTIME PERMISSIONS (JIT)</Text>
            <View style={styles.actionButtonGroup}>
              {/* Button Kamera JIT */}
              <TouchableOpacity
                style={styles.jitActionButton}
                onPress={handleCaptureWithCamera}
                activeOpacity={0.8}
              >
                <View style={[styles.jitIconBox, { backgroundColor: '#FEE2E2' }]}>
                  <Ionicons name="camera" size={20} color="#DC2626" />
                </View>
                <View style={styles.jitActionContent}>
                  <Text style={styles.jitActionTitle}>Foto Kamera (JIT)</Text>
                  <Text style={styles.jitActionDesc}>Minta izin kamera & foto resep/rujukan</Text>
                </View>
              </TouchableOpacity>

              {/* Button Galeri/Storage JIT */}
              <TouchableOpacity
                style={styles.jitActionButton}
                onPress={handlePickFromGallery}
                activeOpacity={0.8}
              >
                <View style={[styles.jitIconBox, { backgroundColor: '#E0F2FE' }]}>
                  <Ionicons name="images" size={20} color="#0284C7" />
                </View>
                <View style={styles.jitActionContent}>
                  <Text style={styles.jitActionTitle}>Import Galeri (JIT)</Text>
                  <Text style={styles.jitActionDesc}>Minta izin media & salin ke Scoped Storage</Text>
                </View>
              </TouchableOpacity>

              {/* Button Dokumen Teks */}
              <TouchableOpacity
                style={styles.jitActionButton}
                onPress={() => setIsAddTextModalVisible(true)}
                activeOpacity={0.8}
              >
                <View style={[styles.jitIconBox, { backgroundColor: '#DCFCE7' }]}>
                  <Ionicons name="document-text" size={20} color="#16A34A" />
                </View>
                <View style={styles.jitActionContent}>
                  <Text style={styles.jitActionTitle}>Buat Berkas Teks</Text>
                  <Text style={styles.jitActionDesc}>Tulis dokumen medis ke documentDirectory</Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* DAFTAR DOKUMEN SANDBOX */}
            <View style={styles.docListHeaderRow}>
              <Text style={styles.sectionHeader}>BERKAS MEDIS DALAM SANDBOX</Text>
              <TouchableOpacity onPress={loadScopedDocuments} style={styles.refreshDocsBtn}>
                <Ionicons name="reload" size={14} color="#0284C7" />
                <Text style={styles.refreshDocsText}>Segarkan</Text>
              </TouchableOpacity>
            </View>

            {isLoadingFiles ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="small" color="#0284C7" />
                <Text style={styles.loadingText}>Membaca berkas Scoped Storage...</Text>
              </View>
            ) : documents.length === 0 ? (
              <View style={styles.emptyDocumentsBox}>
                <Ionicons name="folder-open-outline" size={40} color="#94A3B8" />
                <Text style={styles.emptyDocsTitle}>Belum ada berkas tersimpan</Text>
                <Text style={styles.emptyDocsDesc}>
                  Gunakan tombol di atas untuk memfoto surat rujukan atau membuat dokumen lokal.
                </Text>
              </View>
            ) : (
              <View style={styles.documentsList}>
                {documents.map((doc) => {
                  const meta = CATEGORY_LABELS[doc.category] || CATEGORY_LABELS.surat_rujukan;
                  return (
                    <TouchableOpacity
                      key={doc.id}
                      style={styles.docCard}
                      onPress={() => setSelectedDoc(doc)}
                      activeOpacity={0.8}
                    >
                      <View style={styles.docCardHeader}>
                        <View style={styles.docCategoryBadge}>
                          <Ionicons name={meta.icon as any} size={14} color={meta.color} />
                          <Text style={[styles.docCategoryText, { color: meta.color }]}>
                            {meta.label}
                          </Text>
                        </View>
                        <Text style={styles.docDate}>
                          {new Date(doc.createdAt).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </Text>
                      </View>

                      <View style={styles.docBody}>
                        {doc.type === 'image' && doc.mediaUri ? (
                          <Image
                            source={{ uri: doc.mediaUri }}
                            style={styles.docThumbnail}
                            resizeMode="cover"
                          />
                        ) : (
                          <View style={styles.docIconThumbnail}>
                            <Ionicons name="document-text-outline" size={24} color="#64748B" />
                          </View>
                        )}
                        <View style={styles.docMainInfo}>
                          <Text style={styles.docTitle} numberOfLines={1}>
                            {doc.title}
                          </Text>
                          <Text style={styles.docSnippet} numberOfLines={2}>
                            {doc.content || 'Foto tersimpan di sandbox Scoped Storage.'}
                          </Text>
                          <View style={styles.docMetaRow}>
                            <Text style={styles.docSize}>
                              {(doc.sizeBytes / 1024).toFixed(1)} KB
                            </Text>
                            <Text style={styles.docDot}>•</Text>
                            <Text style={styles.docTypeBadgeText}>
                              {doc.type === 'image' ? 'Media JPG/PNG' : 'JSON/UTF-8'}
                            </Text>
                          </View>
                        </View>
                      </View>

                      <View style={styles.docFooter}>
                        <TouchableOpacity
                          style={styles.docActionBtn}
                          onPress={() => setSelectedDoc(doc)}
                        >
                          <Ionicons name="eye-outline" size={14} color="#0284C7" />
                          <Text style={styles.docActionText}>Buka Detail</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.docDeleteBtn}
                          onPress={() => handleDeleteDocument(doc)}
                        >
                          <Ionicons name="trash-outline" size={14} color="#DC2626" />
                        </TouchableOpacity>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* MODAL 1: PREVIEW / DETAIL DOKUMEN MEDIS */}
      <Modal
        visible={Boolean(selectedDoc)}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedDoc(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxHeight: '85%' }]}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>{selectedDoc?.title}</Text>
                <Text style={styles.modalSubtitle}>
                  Kategori:{' '}
                  {selectedDoc?.category
                    ? CATEGORY_LABELS[selectedDoc.category]?.label
                    : 'Dokumen'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedDoc(null)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              {/* Media Preview if Image */}
              {selectedDoc?.type === 'image' && selectedDoc.mediaUri && (
                <View style={styles.imagePreviewContainer}>
                  <Image
                    source={{ uri: selectedDoc.mediaUri }}
                    style={styles.previewImage}
                    resizeMode="contain"
                  />
                  <Text style={styles.previewPathText} numberOfLines={1}>
                    URI: {selectedDoc.mediaUri}
                  </Text>
                </View>
              )}

              {/* Text Content */}
              <View style={styles.contentBox}>
                <Text style={styles.contentBoxTitle}>Isi Dokumen / Keterangan:</Text>
                <Text style={styles.contentText}>{selectedDoc?.content}</Text>
              </View>

              {/* Scoped Storage File Details */}
              <View style={styles.docTechnicalBox}>
                <Text style={styles.technicalTitle}>Informasi Teknis Sandbox (Scoped Storage):</Text>
                <Text style={styles.technicalText}>Nama File: {selectedDoc?.fileName}</Text>
                <Text style={styles.technicalText}>
                  Ukuran: {selectedDoc ? (selectedDoc.sizeBytes / 1024).toFixed(2) : 0} KB
                </Text>
                <Text style={styles.technicalText}>
                  Status: Terisolasi (Hanya dapat diakses oleh SiagaMedis)
                </Text>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.deleteModalBtn}
                onPress={() => {
                  if (selectedDoc) {
                    handleDeleteDocument(selectedDoc);
                  }
                }}
              >
                <Ionicons name="trash" size={16} color="#DC2626" />
                <Text style={styles.deleteModalText}>Hapus Berkas</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.closeModalBtn}
                onPress={() => setSelectedDoc(null)}
              >
                <Text style={styles.closeModalText}>Tutup</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL 2: INPUT DOKUMEN MEDIS TEKS */}
      <Modal
        visible={isAddTextModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsAddTextModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Tambah Catatan / Surat Medis</Text>
              <TouchableOpacity
                onPress={() => setIsAddTextModalVisible(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              <Text style={styles.inputLabel}>Judul Dokumen:</Text>
              <TextInput
                style={styles.input}
                placeholder="Contoh: Surat Rujukan RS PKU"
                value={newDocTitle}
                onChangeText={setNewDocTitle}
              />

              <Text style={styles.inputLabel}>Kategori Dokumen:</Text>
              <View style={styles.categoryPicker}>
                {(Object.keys(CATEGORY_LABELS) as DocumentCategory[]).map((cat) => {
                  const meta = CATEGORY_LABELS[cat];
                  const isSelected = newDocCategory === cat;
                  return (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.catOption,
                        isSelected && { borderColor: meta.color, backgroundColor: '#FEF2F2' },
                      ]}
                      onPress={() => setNewDocCategory(cat)}
                    >
                      <Text
                        style={[
                          styles.catOptionText,
                          isSelected && { color: meta.color, fontWeight: '700' },
                        ]}
                      >
                        {meta.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.inputLabel}>Isi Catatan / Ringkasan Klinis:</Text>
              <TextInput
                style={[styles.input, styles.textArea, { minHeight: 90 }]}
                placeholder="Masukkan keterangan tanda vital, instruksi obat, diagnosis..."
                value={newDocContent}
                onChangeText={setNewDocContent}
                multiline
              />

              <TouchableOpacity style={styles.saveBtn} onPress={handleCreateTextDoc}>
                <Ionicons name="save" size={18} color="#FFFFFF" />
                <Text style={styles.saveBtnText}>Tulis ke Scoped Storage Sandbox</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MODAL 3: VERIFIKASI PIN KREDENSIAL */}
      <Modal
        visible={pinModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPinModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxWidth: 340 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Verifikasi Kredensial PIN</Text>
              <TouchableOpacity
                onPress={() => setPinModalVisible(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.pinExplanation}>
              Masukkan 6 digit PIN darurat hardware Keystore untuk memverifikasi hak akses
              rekam medis. (Default contoh: 123456)
            </Text>

            <TextInput
              style={[styles.input, styles.pinInput]}
              value={inputPin}
              onChangeText={setInputPin}
              placeholder="••••••"
              keyboardType="number-pad"
              maxLength={6}
              secureTextEntry
            />

            <TouchableOpacity style={styles.saveBtn} onPress={handleVerifyOrChangePin}>
              <Ionicons name="shield-checkmark" size={18} color="#FFFFFF" />
              <Text style={styles.saveBtnText}>Verifikasi Hardware PIN</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL 4: PILIHAN JENIS BERKAS & SIMPAN MEDIA (KAMERA / GALERI) */}
      <Modal
        visible={isMediaModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setIsMediaModalVisible(false);
          setPendingMediaUri(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxHeight: '90%' }]}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Simpan Berkas ke Sandbox</Text>
                <Text style={styles.modalSubtitle}>
                  Pilih jenis/kategori berkas medis sebelum disimpan ke Scoped Storage.
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setIsMediaModalVisible(false);
                  setPendingMediaUri(null);
                }}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              {/* Preview Thumbnail */}
              {pendingMediaUri && (
                <View style={styles.mediaModalPreviewContainer}>
                  <Image
                    source={{ uri: pendingMediaUri }}
                    style={styles.mediaModalPreviewImage}
                    resizeMode="cover"
                  />
                  <View style={styles.mediaModalBadgeOverlay}>
                    <Ionicons
                      name={CATEGORY_LABELS[mediaDocCategory]?.icon as any}
                      size={14}
                      color="#FFFFFF"
                    />
                    <Text style={styles.mediaModalBadgeText}>
                      {CATEGORY_LABELS[mediaDocCategory]?.label}
                    </Text>
                  </View>
                </View>
              )}

              {/* Pilihan Jenis Berkas */}
              <Text style={styles.inputLabel}>Pilih Jenis / Kategori Berkas:</Text>
              <View style={styles.categoryPicker}>
                {(Object.keys(CATEGORY_LABELS) as DocumentCategory[]).map((cat) => {
                  const meta = CATEGORY_LABELS[cat];
                  const isSelected = mediaDocCategory === cat;
                  return (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.catOption,
                        isSelected && {
                          borderColor: meta.color,
                          backgroundColor: '#FEF2F2',
                        },
                      ]}
                      onPress={() => {
                        setMediaDocCategory(cat);
                        setMediaDocTitle(`Foto ${meta.label} ${new Date().toLocaleDateString('id-ID')}`);
                      }}
                    >
                      <Ionicons
                        name={meta.icon as any}
                        size={14}
                        color={isSelected ? meta.color : '#64748B'}
                      />
                      <Text
                        style={[
                          styles.catOptionText,
                          isSelected && { color: meta.color, fontWeight: '700' },
                        ]}
                      >
                        {meta.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Judul Berkas */}
              <Text style={styles.inputLabel}>Judul Dokumen:</Text>
              <TextInput
                style={styles.input}
                placeholder="Contoh: Foto Surat Rujukan IGD PKU"
                value={mediaDocTitle}
                onChangeText={setMediaDocTitle}
              />

              {/* Catatan Tambahan (Opsional) */}
              <Text style={styles.inputLabel}>Catatan Tambahan (Opsional):</Text>
              <TextInput
                style={[styles.input, styles.textArea, { minHeight: 64 }]}
                placeholder="Keterangan dokter, tanggal periksa, catatan obat..."
                value={mediaDocNotes}
                onChangeText={setMediaDocNotes}
                multiline
              />

              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveMediaDoc}>
                <Ionicons name="shield-checkmark" size={18} color="#FFFFFF" />
                <Text style={styles.saveBtnText}>Simpan ke Scoped Storage Sandbox</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 8,
  },
  header: {
    marginBottom: 14,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
    lineHeight: 18,
  },
  tabSwitcher: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
    gap: 4,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  tabButtonActive: {
    backgroundColor: '#0F172A',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  tabButtonTextActive: {
    color: '#FFFFFF',
  },
  securityTrustCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    gap: 10,
    marginBottom: 14,
  },
  securityTrustTextContainer: {
    flex: 1,
  },
  securityTrustTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#166534',
  },
  securityTrustDesc: {
    fontSize: 10,
    color: '#15803D',
    marginTop: 2,
    lineHeight: 14,
  },
  saveNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#DCFCE7',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  saveNoticeText: {
    fontSize: 12,
    color: '#166534',
    fontWeight: '600',
  },
  medicalIdCard: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
    marginBottom: 14,
  },
  idCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  idCardType: {
    fontSize: 9,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 1,
  },
  idCardName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 2,
  },
  bloodBadge: {
    backgroundColor: '#DC2626',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: 'center',
  },
  bloodBadgeLabel: {
    fontSize: 8,
    fontWeight: '800',
    color: 'rgba(255, 255, 255, 0.8)',
    letterSpacing: 0.5,
  },
  bloodBadgeValue: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  nikRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
  },
  nikLabel: {
    fontSize: 11,
    color: '#94A3B8',
  },
  nikValue: {
    fontSize: 12,
    color: '#F8FAFC',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  eyeBtn: {
    padding: 4,
  },
  bpjsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  bpjsValue: {
    fontSize: 11,
    color: '#E2E8F0',
  },
  credentialsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
    gap: 8,
  },
  credHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  credSectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0284C7',
    letterSpacing: 0.5,
  },
  credItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  credInfo: {
    flex: 1,
    marginRight: 8,
  },
  credLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  credTokenText: {
    fontSize: 11,
    color: '#0F172A',
    fontWeight: '700',
    marginTop: 2,
    fontFamily: 'monospace',
  },
  credValue: {
    fontSize: 12,
    color: '#0F172A',
    fontWeight: '700',
    marginTop: 2,
  },
  credActionBtn: {
    padding: 6,
    backgroundColor: '#E0F2FE',
    borderRadius: 6,
  },
  verifyPinBtn: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  verifyPinText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  editRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
    letterSpacing: 0.5,
  },
  editToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  editToggleText: {
    fontSize: 12,
    color: '#0284C7',
    fontWeight: '600',
  },
  clinicalDetailsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 14,
  },
  clinicalBlock: {
    gap: 6,
  },
  clinicalBlockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  clinicalTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  clinicalTitleRed: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626',
  },
  tagWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  allergyTag: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  allergyText: {
    fontSize: 11,
    color: '#DC2626',
    fontWeight: '700',
  },
  conditionTag: {
    backgroundColor: '#FFEDD5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  conditionText: {
    fontSize: 11,
    color: '#9A3412',
    fontWeight: '600',
  },
  noneText: {
    fontSize: 11,
    color: '#94A3B8',
    fontStyle: 'italic',
  },
  notesText: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 18,
    backgroundColor: '#F8FAFC',
    padding: 8,
    borderRadius: 6,
  },
  editForm: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: '#0F172A',
  },
  textArea: {
    minHeight: 64,
    textAlignVertical: 'top',
  },
  bloodTypePicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  bloodOption: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  bloodOptionSelected: {
    backgroundColor: '#DC2626',
    borderColor: '#DC2626',
  },
  bloodOptionText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
  },
  bloodOptionTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  saveBtn: {
    backgroundColor: '#0284C7',
    borderRadius: 10,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 6,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  contactsList: {
    gap: 10,
    marginTop: 8,
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  contactInfo: {
    flex: 1,
  },
  contactNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  contactName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  iceBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  iceBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#16A34A',
  },
  contactPhone: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  callContactBtn: {
    backgroundColor: '#16A34A',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // SCOPED STORAGE STYLES
  metricsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
    gap: 10,
  },
  metricsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metricsTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0284C7',
    letterSpacing: 0.5,
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  metricItem: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0F172A',
  },
  metricLabel: {
    fontSize: 9,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 2,
  },
  sandboxPathText: {
    fontSize: 9,
    color: '#94A3B8',
    fontFamily: 'monospace',
    paddingTop: 4,
  },
  actionButtonGroup: {
    gap: 10,
    marginTop: 8,
    marginBottom: 20,
  },
  jitActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
  },
  jitIconBox: {
    width: 42,
    height: 42,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  jitActionContent: {
    flex: 1,
  },
  jitActionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  jitActionDesc: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  docListHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  refreshDocsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  refreshDocsText: {
    fontSize: 11,
    color: '#0284C7',
    fontWeight: '600',
  },
  loadingBox: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyDocumentsBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  emptyDocsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
  },
  emptyDocsDesc: {
    fontSize: 11,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 16,
  },
  documentsList: {
    gap: 12,
  },
  docCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  docCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  docCategoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  docCategoryText: {
    fontSize: 11,
    fontWeight: '700',
  },
  docDate: {
    fontSize: 10,
    color: '#94A3B8',
  },
  docBody: {
    flexDirection: 'row',
    gap: 12,
  },
  docThumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  docIconThumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  docMainInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  docTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  docSnippet: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 15,
  },
  docMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  docSize: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
  },
  docDot: {
    fontSize: 10,
    color: '#CBD5E1',
  },
  docTypeBadgeText: {
    fontSize: 9,
    color: '#0284C7',
    fontWeight: '700',
  },
  docFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
  },
  docActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  docActionText: {
    fontSize: 11,
    color: '#0284C7',
    fontWeight: '700',
  },
  docDeleteBtn: {
    padding: 4,
  },
  // MODAL STYLES
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  modalSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalScroll: {
    marginVertical: 4,
  },
  imagePreviewContainer: {
    marginBottom: 14,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  previewImage: {
    width: '100%',
    height: 220,
  },
  previewPathText: {
    fontSize: 9,
    color: '#94A3B8',
    padding: 6,
    fontFamily: 'monospace',
    backgroundColor: '#F1F5F9',
  },
  contentBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  contentBoxTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  contentText: {
    fontSize: 12,
    color: '#1E293B',
    lineHeight: 18,
  },
  docTechnicalBox: {
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    padding: 10,
    gap: 4,
  },
  technicalTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 2,
  },
  technicalText: {
    fontSize: 10,
    color: '#64748B',
    fontFamily: 'monospace',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  deleteModalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  deleteModalText: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '700',
  },
  closeModalBtn: {
    backgroundColor: '#0F172A',
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 8,
  },
  closeModalText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  categoryPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  catOption: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  catOptionText: {
    fontSize: 10,
    color: '#475569',
    fontWeight: '600',
  },
  pinExplanation: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 16,
    marginBottom: 12,
  },
  pinInput: {
    textAlign: 'center',
    fontSize: 24,
    letterSpacing: 10,
    fontWeight: '900',
    paddingVertical: 12,
    marginBottom: 10,
  },
  mediaModalPreviewContainer: {
    height: 160,
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 12,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    position: 'relative',
  },
  mediaModalPreviewImage: {
    width: '100%',
    height: '100%',
  },
  mediaModalBadgeOverlay: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  mediaModalBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
});
