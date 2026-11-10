import { useCallback } from 'react';
import * as Haptics from 'expo-haptics';

export function useHaptics() {
  const triggerImpact = useCallback(async (style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Heavy) => {
    try {
      await Haptics.impactAsync(style);
    } catch {
      // Graceful fallback jika hardware haptics tidak tersedia
    }
  }, []);

  const triggerNotification = useCallback(async (type: Haptics.NotificationFeedbackType = Haptics.NotificationFeedbackType.Warning) => {
    try {
      await Haptics.notificationAsync(type);
    } catch {
      // Graceful fallback
    }
  }, []);

  return {
    triggerImpact,
    triggerNotification,
  };
}

