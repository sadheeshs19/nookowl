import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { Platform } from 'react-native';
import { deletePushToken, savePushToken } from './api';

export type PushData =
  | { type: 'call'; callId: string }
  | { type: 'request'; requestId: string }
  | { type: 'message'; conversationId: string };

// While the app is open, calls are shown by the in-app incoming-call screen,
// so only messages and requests show a banner.
Notifications.setNotificationHandler({
  handleNotification: async (n) => {
    const data = n.request.content.data as Partial<PushData> | undefined;
    const quiet = data?.type === 'call';
    return {
      shouldShowBanner: !quiet,
      shouldShowList: !quiet,
      shouldPlaySound: !quiet,
      shouldSetBadge: false,
    };
  },
});

async function ensureAndroidChannels() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('calls', {
    name: 'Calls',
    importance: AndroidImportance.MAX,
    sound: 'default',
    vibrationPattern: [0, 400, 250, 400],
  });
  await Notifications.setNotificationChannelAsync('default', {
    name: 'Messages and requests',
    importance: AndroidImportance.HIGH,
    sound: 'default',
  });
}

/**
 * Asks for permission and saves this device's push token so calls, call
 * requests and messages arrive even when the app is closed.
 * Never throws: push is a nice-to-have, the app works without it.
 */
export async function registerForPush(): Promise<'ok' | 'denied' | 'unavailable'> {
  try {
    if (!Device.isDevice || Platform.OS === 'web') return 'unavailable';
    await ensureAndroidChannels();
    const current = await Notifications.getPermissionsAsync();
    let granted = current.granted;
    if (!granted && current.canAskAgain) {
      granted = (await Notifications.requestPermissionsAsync()).granted;
    }
    if (!granted) return 'denied';
    const projectId =
      (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId ??
      Constants.easConfig?.projectId;
    if (!projectId) return 'unavailable';
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    await savePushToken(token);
    return 'ok';
  } catch {
    // e.g. Android build without Firebase set up yet.
    return 'unavailable';
  }
}

export async function unregisterPush() {
  try {
    await deletePushToken();
  } catch {
    // ignore
  }
}
