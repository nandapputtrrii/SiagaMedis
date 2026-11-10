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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

import { SecureStorageService } from '../../services/secureStorageService';
import { EncryptedMedicalProfile, BloodType } from '../../types/medical';

export default function VaultScreen() {
  const insets = useSafeAreaInsets();

  const [profile, setProfile] = useState<EncryptedMedicalProfile | null>(null);
  const [showNik, setShowNik] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSavedNotice, setIsSavedNotice] = useState(false);

  // Form states for editing
  const [fullName, setFullName] = useState('');
  const [bloodType, setBloodType] = useState<BloodType>('O+');
  const [allergiesText, setAllergiesText] = useState('');
  const [chronicText, setChronicText] = useState('');
  const [notes, setNotes] = useState('');

  // Load profile from hardware-backed SecureStore
  useEffect(() => {
    async function loadData() {
      const data = await SecureStorageService.getProfile();
      setProfile(data);
      setFullName(data.fullName);
      setBloodType(data.bloodType);
      setAllergiesText(data.allergies.join(', '));
      setChronicText(data.chronicConditions.join(', '));
      setNotes(data.notes || '');
    }
    loadData();
  }, []);

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

  const handleCallIce = useCallback((phone: string) => {
    Linking.openURL(`tel:${phone.replace(/[^0-9]/g, '')}`);
  }, []);

  if (!profile) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.loadingText}>Mendekripsi Data Medis dari Hardware KeyStore...</Text>
      </View>
    );
  }

  const maskedNik = showNik
    ? profile.nik
    : `${profile.nik.slice(0, 6)}••••••••${profile.nik.slice(-2)}`;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.contentContainer, { paddingTop: insets.top + 16 }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Vault Medis Terenkripsi</Text>
        <Text style={styles.subtitle}>
          Data rekam medis darurat diamankan secara hardware-backed via expo-secure-store.
        </Text>
      </View>

      {/* Hardware Encryption Trust Banner (AIK Amanah) */}
      <View style={styles.securityTrustCard}>
        <Ionicons name="lock-closed" size={20} color="#16A34A" />
        <View style={styles.securityTrustTextContainer}>
          <Text style={styles.securityTrustTitle}>Hardware-Backed Security Active</Text>
          <Text style={styles.securityTrustDesc}>
            Enkripsi AES-256 via KeyStore/Secure Enclave. Menerapkan nilai Amanah dalam
            menjaga kerahasiaan data pasien.
          </Text>
        </View>
      </View>

      {isSavedNotice && (
        <View style={styles.saveNotice}>
          <Ionicons name="checkmark-circle" size={18} color="#16A34A" />
          <Text style={styles.saveNoticeText}>Data medis berhasil dienkripsi dan diperbarui.</Text>
        </View>
      )}

      {/* QUICK MEDICAL EMERGENCY ID CARD */}
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

        <View style={styles.nikRow}>
          <Text style={styles.nikLabel}>NIK:</Text>
          <Text style={styles.nikValue}>{maskedNik}</Text>
          <TouchableOpacity onPress={() => setShowNik(!showNik)} style={styles.eyeBtn}>
            <Ionicons name={showNik ? 'eye-off' : 'eye'} size={16} color="#64748B" />
          </TouchableOpacity>
        </View>

        {profile.bpjsOrInsuranceNumber && (
          <View style={styles.bpjsRow}>
            <Text style={styles.nikLabel}>No. BPJS:</Text>
            <Text style={styles.bpjsValue}>{profile.bpjsOrInsuranceNumber}</Text>
          </View>
        )}
      </View>

      {/* EDIT TOGGLE */}
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

          <Text style={styles.inputLabel}>Catatan Tambahan untuk Tenaga Medis:</Text>
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
        /* READ VIEW */
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
    </ScrollView>
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
    fontSize: 13,
    color: '#64748B',
  },
  header: {
    marginBottom: 16,
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
  securityTrustCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    gap: 10,
    marginBottom: 16,
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
    marginBottom: 20,
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
});

