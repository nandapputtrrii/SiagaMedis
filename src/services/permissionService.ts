import { Alert, Linking, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

export type PermissionKind = 'camera' | 'media_library' | 'location';

/**
 * Service untuk penanganan Runtime Permissions berbasis Just-In-Time (JIT).
 * Mematuhi Sub-CPMK 8: Izin hanya diminta saat fitur dipicu (Just-In-Time),
 * dengan pesan transparan dan graceful fallback jika ditolak.
 */
export const PermissionService = {
  /**
   * Cek status izin kamera
   */
  async getCameraStatus(): Promise<ImagePicker.PermissionStatus> {
    try {
      const response = await ImagePicker.getCameraPermissionsAsync();
      return response.status;
    } catch {
      return ImagePicker.PermissionStatus.UNDETERMINED;
    }
  },

  /**
   * Meminta izin kamera secara Just-In-Time dengan dialog edukatif
   */
  async requestCameraPermissionJIT(): Promise<boolean> {
    try {
      const current = await ImagePicker.getCameraPermissionsAsync();
      if (current.granted) {
        return true;
      }

      if (!current.canAskAgain && current.status === ImagePicker.PermissionStatus.DENIED) {
        this.showSettingsAlert(
          'Izin Kamera Dibutuhkan',
          'Aplikasi membutuhkan akses kamera untuk memfoto dokumen rekam medis ke sandbox Scoped Storage. Silakan aktifkan izin kamera di Pengaturan sistem perangkat.'
        );
        return false;
      }

      const requested = await ImagePicker.requestCameraPermissionsAsync();
      if (!requested.granted) {
        Alert.alert(
          'Izin Kamera Ditolak',
          'Anda tidak dapat mengambil foto dokumen tanpa memberikan izin kamera. Berkas tetap dapat diinput secara manual.'
        );
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error requesting camera permission JIT:', error);
      return false;
    }
  },

  /**
   * Cek status izin galeri / media library (Storage)
   */
  async getMediaLibraryStatus(): Promise<ImagePicker.PermissionStatus> {
    try {
      const response = await ImagePicker.getMediaLibraryPermissionsAsync();
      return response.status;
    } catch {
      return ImagePicker.PermissionStatus.UNDETERMINED;
    }
  },

  /**
   * Meminta izin galeri/media library secara Just-In-Time
   */
  async requestMediaLibraryPermissionJIT(): Promise<boolean> {
    try {
      const current = await ImagePicker.getMediaLibraryPermissionsAsync();
      if (current.granted) {
        return true;
      }

      if (!current.canAskAgain && current.status === ImagePicker.PermissionStatus.DENIED) {
        this.showSettingsAlert(
          'Izin Akses Galeri Dibutuhkan',
          'Aplikasi membutuhkan akses media untuk mengimpor berkas dokumen medis ke sandbox Scoped Storage. Silakan aktifkan izin di Pengaturan sistem perangkat.'
        );
        return false;
      }

      const requested = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!requested.granted) {
        Alert.alert(
          'Izin Galeri Ditolak',
          'Anda tidak dapat mengimpor berkas dokumen tanpa memberikan izin akses media.'
        );
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error requesting media library permission JIT:', error);
      return false;
    }
  },

  /**
   * Mengambil foto dokumen menggunakan kamera dengan alur JIT Permission
   */
  async capturePhotoWithJIT(): Promise<string | null> {
    const hasPermission = await this.requestCameraPermissionJIT();
    if (!hasPermission) return null;

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.85,
        allowsEditing: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        return result.assets[0].uri;
      }
      return null;
    } catch (error) {
      console.error('Error capturing photo with camera:', error);
      Alert.alert('Gagal Mengambil Foto', 'Terjadi kesalahan saat membuka kamera perangkat.');
      return null;
    }
  },

  /**
   * Memilih foto dokumen dari galeri dengan alur JIT Permission
   */
  async pickImageWithJIT(): Promise<string | null> {
    const hasPermission = await this.requestMediaLibraryPermissionJIT();
    if (!hasPermission) return null;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.85,
        allowsEditing: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        return result.assets[0].uri;
      }
      return null;
    } catch (error) {
      console.error('Error picking image from library:', error);
      Alert.alert('Gagal Membuka Galeri', 'Terjadi kesalahan saat mengakses media perangkat.');
      return null;
    }
  },

  /**
   * Helper dialog untuk mengarahkan pengguna ke Pengaturan Sistem
   */
  showSettingsAlert(title: string, message: string) {
    Alert.alert(
      title,
      message,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Buka Pengaturan',
          style: 'default',
          onPress: () => {
            if (Platform.OS === 'ios') {
              Linking.openURL('app-settings:');
            } else {
              Linking.openSettings();
            }
          },
        },
      ],
      { cancelable: true }
    );
  },
};
