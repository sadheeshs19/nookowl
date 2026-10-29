import { Platform } from 'react-native';
import mobileAds, { AdsConsent, TestIds } from 'react-native-google-mobile-ads';

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

/**
 * Asks for ad consent where the law needs it (Google's message in the EU/UK, and the
 * iPhone "Allow tracking?" prompt when it's set up in AdMob), then starts ads.
 * Ads still work without consent; they're just not personalised.
 */
export async function prepareAds() {
  try {
    await AdsConsent.gatherConsent();
  } catch {
    // No consent message configured, offline, etc. Carry on.
  }
  await mobileAds()
    .initialize()
    .catch(() => {});
}

/** Lets people change their ad choices later (shown in Profile). */
export async function showAdPrivacyOptions(): Promise<boolean> {
  try {
    await AdsConsent.showPrivacyOptionsForm();
    return true;
  } catch {
    return false;
  }
}
