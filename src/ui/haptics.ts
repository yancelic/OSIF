import * as Haptics from 'expo-haptics';

export type HapticProfile = 'light' | 'medium' | 'success' | 'selection' | 'none';

/** Tek noktadan haptic profili. Hata fırlatmaz (desteklemeyen cihazlarda sessiz kalır). */
export const haptic = (profile: HapticProfile): void => {
  try {
    switch (profile) {
      case 'light':
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        break;
      case 'medium':
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        break;
      case 'success':
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        break;
      case 'selection':
        void Haptics.selectionAsync();
        break;
      default:
        break;
    }
  } catch {
    // no-op
  }
};
