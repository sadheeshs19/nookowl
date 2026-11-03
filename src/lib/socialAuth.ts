import { requireOptionalNativeModule } from 'expo';
import { Platform, TurboModuleRegistry } from 'react-native';
import { GOOGLE_IOS_CLIENT_ID, GOOGLE_WEB_CLIENT_ID } from './oauthIds';
import { supabase } from './supabase';

// Both sign-ins need native parts that older test builds don't have, so the
// buttons only show when those parts (and the Google IDs) are present.
export const appleAvailable = Platform.OS === 'ios' && !!requireOptionalNativeModule('ExpoAppleAuthentication');
export const googleAvailable = !!GOOGLE_WEB_CLIENT_ID && !!TurboModuleRegistry.get('RNGoogleSignin');

/** Result: true when signed in, false when the person cancelled. Throws on errors. */
export async function signInWithApple(): Promise<boolean> {
  /* eslint-disable @typescript-eslint/no-require-imports */
  const Apple: typeof import('expo-apple-authentication') = require('expo-apple-authentication');
  const Crypto: typeof import('expo-crypto') = require('expo-crypto');
  /* eslint-enable @typescript-eslint/no-require-imports */
  const rawNonce = Crypto.randomUUID();
  const hashed = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawNonce);
  try {
    const cred = await Apple.signInAsync({
      requestedScopes: [Apple.AppleAuthenticationScope.EMAIL],
      nonce: hashed,
    });
    if (!cred.identityToken) throw new Error('Apple didn’t return a sign-in token. Please try again.');
    const { error } = await supabase.auth.signInWithIdToken({ provider: 'apple', token: cred.identityToken, nonce: rawNonce });
    if (error) throw new Error(error.message);
    return true;
  } catch (e) {
    if ((e as { code?: string })?.code === 'ERR_REQUEST_CANCELED') return false;
    throw e;
  }
}

let googleConfigured = false;

export async function signInWithGoogle(): Promise<boolean> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { GoogleSignin, isErrorWithCode, statusCodes } = require('@react-native-google-signin/google-signin') as typeof import('@react-native-google-signin/google-signin');
  if (!googleConfigured) {
    GoogleSignin.configure({ webClientId: GOOGLE_WEB_CLIENT_ID, iosClientId: GOOGLE_IOS_CLIENT_ID || undefined });
    googleConfigured = true;
  }
  try {
    if (Platform.OS === 'android') await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const res = await GoogleSignin.signIn();
    if (res.type !== 'success') return false;
    const token = res.data.idToken;
    if (!token) throw new Error('Google didn’t return a sign-in token. Please try again.');
    const { error } = await supabase.auth.signInWithIdToken({ provider: 'google', token });
    if (error) throw new Error(error.message);
    return true;
  } catch (e) {
    if (isErrorWithCode(e) && (e.code === statusCodes.SIGN_IN_CANCELLED || e.code === statusCodes.IN_PROGRESS)) return false;
    throw e;
  }
}

/** Also sign out of Google so the account picker shows next time. */
export async function signOutOfGoogle() {
  if (!googleAvailable) return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { GoogleSignin } = require('@react-native-google-signin/google-signin') as typeof import('@react-native-google-signin/google-signin');
    await GoogleSignin.signOut();
  } catch {
    // not signed in with Google
  }
}
