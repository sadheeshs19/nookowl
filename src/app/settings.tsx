import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from '../components/icons';
import { Button, Chip, Segmented, T } from '../components/ui';
import { deleteMyAccount, setAllowCardChats, setGender, setPrivateProfile, setShowAge, setWhoCanCall } from '../lib/api';
import { GENDERS, WHO_CAN_CALL, type Gender, type WhoCanCall } from '../lib/gender';
import { useAuth } from '../lib/auth';
import { showAdPrivacyOptions } from '../lib/ads';
import { unregisterPush } from '../lib/push';
import { useTheme, type ThemePreference } from '../theme/ThemeProvider';

export default function SettingsScreen() {
  const { colors, preference, setPreference } = useTheme();
  const { profile, refreshProfile, signOut } = useAuth();
  const [deleting, setDeleting] = useState(false);

  const changeGender = async (g: Gender) => {
    try {
      await setGender(g);
      await refreshProfile();
    } catch (e) {
      Alert.alert('Could not update', e instanceof Error ? e.message : '');
    }
  };

  const changeWhoCanCall = async (w: WhoCanCall) => {
    try {
      await setWhoCanCall(w);
      await refreshProfile();
    } catch (e) {
      Alert.alert('Could not update', e instanceof Error ? e.message : '');
    }
  };

  const changeCardChats = async (v: boolean) => {
    try {
      await setAllowCardChats(v);
      await refreshProfile();
    } catch (e) {
      Alert.alert('Could not update', e instanceof Error ? e.message : '');
    }
  };

  const changePrivate = async (v: boolean) => {
    try {
      await setPrivateProfile(v);
      await refreshProfile();
    } catch (e) {
      Alert.alert('Could not update', e instanceof Error ? e.message : '');
    }
  };

  const changeShowAge = async (v: boolean) => {
    try {
      await setShowAge(v);
      await refreshProfile();
    } catch (e) {
      Alert.alert('Could not update', e instanceof Error ? e.message : '');
    }
  };

  const confirmDeleteAccount = () =>
    Alert.alert(
      'Delete your account?',
      'This permanently deletes your profile, photos, topics, comments, chats, voice notes, hoots, call history and minutes. It can’t be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete forever',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await deleteMyAccount();
              await signOut().catch(() => {});
            } catch (e) {
              Alert.alert('Couldn’t delete your account', `${e instanceof Error ? e.message : ''} Try again, or email us from Support.`);
            } finally {
              setDeleting(false);
            }
          },
        },
      ],
    );

  if (!profile) return null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4 }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.back()} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="back" color={colors.text} />
        </Pressable>
        <T variant="heading">Settings</T>
      </View>
      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 8, gap: 16, paddingBottom: 40 }}>
        <T variant="caps" muted>Profile and privacy</T>
        <View style={{ gap: 12, padding: 14, borderRadius: 18, borderWidth: 1, borderColor: colors.border }}>
          <View style={{ gap: 8 }}>
            <T variant="label">Gender</T>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {GENDERS.map((g) => (
                <Chip key={g.key} label={g.label} selected={profile.gender === g.key} onPress={() => changeGender(g.key)} />
              ))}
            </View>
          </View>
          <View style={{ gap: 8 }}>
            <T variant="label">Who can call me</T>
            <Segmented<WhoCanCall>
              value={profile.who_can_call ?? 'everyone'}
              onChange={changeWhoCanCall}
              options={WHO_CAN_CALL.map((w) => ({ key: w.key, label: w.label }))}
            />
            <T variant="small" muted>{WHO_CAN_CALL.find((w) => w.key === (profile.who_can_call ?? 'everyone'))?.hint}</T>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ flex: 1, gap: 2 }}>
              <T variant="label">Chat button on my card</T>
              <T variant="small" muted>
                {profile.allow_card_chats === false
                  ? 'Off: people in People can only send you a call request.'
                  : 'On: people in People can message you directly.'}
              </T>
            </View>
            <Switch
              accessibilityLabel="Chat button on my card"
              value={profile.allow_card_chats !== false}
              onValueChange={changeCardChats}
              trackColor={{ true: colors.online }}
            />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ flex: 1, gap: 2 }}>
              <T variant="label">Show my age</T>
              <T variant="small" muted>
                {profile.show_age === false ? 'Hidden. Your birth year is never shown.' : `Others see you as ${new Date().getFullYear() - profile.birth_year}. Your birth year is never shown.`}
              </T>
            </View>
            <Switch accessibilityLabel="Show my age" value={profile.show_age !== false} onValueChange={changeShowAge} trackColor={{ true: colors.online }} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ flex: 1, gap: 2 }}>
              <T variant="label">Private profile</T>
              <T variant="small" muted>
                {profile.is_private
                  ? 'On: strangers only see your nickname, photo and gender. People you chat with see everything.'
                  : 'Off: anyone can see your full profile and topics.'}
              </T>
            </View>
            <Switch
              accessibilityLabel="Private profile"
              value={!!profile.is_private}
              onValueChange={changePrivate}
              trackColor={{ true: colors.online }}
            />
          </View>
        </View>

        <T variant="caps" muted>Appearance</T>
        <Segmented<ThemePreference>
          value={preference}
          onChange={setPreference}
          options={[
            { key: 'system', label: 'System' },
            { key: 'light', label: 'Light' },
            { key: 'dark', label: 'Dark' },
          ]}
        />

        <T variant="caps" muted>Help and account</T>
        <View style={{ borderRadius: 18, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' }}>
          {(
            [
              ['Terms of Use', 'terms'],
              ['Privacy Policy', 'privacy'],
              ['Support and contact', 'support'],
            ] as const
          ).map(([label, doc], i) => (
            <Pressable
              key={doc}
              accessibilityRole="button"
              onPress={() => router.push({ pathname: '/legal/[doc]', params: { doc } })}
              style={({ pressed }) => ({
                flexDirection: 'row', alignItems: 'center', minHeight: 50, paddingHorizontal: 14,
                borderTopWidth: i ? 1 : 0, borderTopColor: colors.border, opacity: pressed ? 0.7 : 1,
              })}
            >
              <T style={{ flex: 1 }}>{label}</T>
              <View style={{ transform: [{ rotate: '180deg' }] }}>
                <Icon name="back" size={18} color={colors.muted} />
              </View>
            </Pressable>
          ))}
          <Pressable
            accessibilityRole="button"
            onPress={async () => {
              if (!(await showAdPrivacyOptions())) {
                Alert.alert('Ad choices', 'There are no ad choices to change in your region. On iPhone you can also turn off tracking in Settings → Privacy & Security → Tracking.');
              }
            }}
            style={({ pressed }) => ({
              flexDirection: 'row', alignItems: 'center', minHeight: 50, paddingHorizontal: 14,
              borderTopWidth: 1, borderTopColor: colors.border, opacity: pressed ? 0.7 : 1,
            })}
          >
            <T style={{ flex: 1 }}>Ad choices</T>
            <View style={{ transform: [{ rotate: '180deg' }] }}>
              <Icon name="back" size={18} color={colors.muted} />
            </View>
          </Pressable>
        </View>

        <Button
          kind="secondary"
          title="Sign out"
          onPress={async () => {
            await Promise.race([unregisterPush(), new Promise((r) => setTimeout(r, 3000))]);
            await signOut();
          }}
          style={{ marginTop: 8 }}
        />
        <Button kind="ghost" title="Delete account" loading={deleting} onPress={confirmDeleteAccount} style={{ marginBottom: 8 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
