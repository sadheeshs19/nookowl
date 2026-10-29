import { Platform } from 'react-native';
import { TestIds } from 'react-native-google-mobile-ads';

/**
 * Rewarded ad unit for "watch an ad, get call minutes".
 * Until you add your own AdMob IDs to .env, Google's test ads are used
 * (always safe to tap; they never earn or cost anything).
 */
export function rewardedAdUnitId(): string {
  const own =
    Platform.OS === 'ios'
      ? process.env.EXPO_PUBLIC_ADMOB_REWARDED_IOS
      : process.env.EXPO_PUBLIC_ADMOB_REWARDED_ANDROID;
  if (__DEV__ || !own) return TestIds.REWARDED;
  return own;
}
