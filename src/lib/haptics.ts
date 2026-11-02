import * as Haptics from 'expo-haptics';

/** Small, consistent haptic feedback. Never throws. */
export const haptic = {
  /** Light tap: buttons, opening things. */
  tap: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}),
  /** Selection tick: switches, chips, segmented controls. */
  select: () => Haptics.selectionAsync().catch(() => {}),
  /** Firmer bump: swiping a card away. */
  swipe: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {}),
  /** Something worked: request sent, call connected, saved. */
  success: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}),
  /** Something needs attention. */
  warn: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {}),
};
