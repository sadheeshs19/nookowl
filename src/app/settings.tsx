import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Group, Row, TILE } from '../components/Grouped';
import { Icon } from '../components/icons';
import { Chip, Segmented, T, Toggle } from '../components/ui';
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

  const age = new Date().getFullYear() - profile.birth_year;
  const who = profile.who_can_call ?? 'everyone';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4 }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.back()} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="back" color={colors.accentText} />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 48, gap: 26 }}>
        <T variant="title" style={{ marginLeft: 4 }}>Settings</T>

        <Group title="Calls" footer={WHO_CAN_CALL.find((w) => w.key === who)?.hint}>
          <Row
            icon="phone"
            tint={TILE.green}
            title="Who can call me"
            below={
              <Segmented<WhoCanCall>
                value={who}
                onChange={changeWhoCanCall}
                options={WHO_CAN_CALL.map((w) => ({ key: w.key, label: w.label }))}
              />
            }
          />
          <Row
            icon="message"
            tint={TILE.blue}
            title="Chat button on my card"
            subtitle={profile.allow_card_chats === false ? 'People can only send you call requests' : 'People can message you from People'}
            right={<Toggle accessibilityLabel="Chat button on my card" value={profile.allow_card_chats !== false} onValueChange={changeCardChats} />}
          />
        </Group>

        <Group title="Profile" footer="Your birth year is never shown. Private profiles show strangers only your nickname, photo and gender; people you chat with see everything.">
          <Row
            icon="user"
            tint={TILE.pink}
            title="Gender"
            below={
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {GENDERS.map((g) => (
                  <Chip key={g.key} label={g.label} selected={profile.gender === g.key} onPress={() => changeGender(g.key)} />
                ))}
              </View>
            }
          />
          <Row
            icon="cake"
            tint={TILE.orange}
            title="Show my age"
            subtitle={profile.show_age === false ? 'Hidden' : `Shown as ${age}`}
            right={<Toggle accessibilityLabel="Show my age" value={profile.show_age !== false} onValueChange={changeShowAge} />}
          />
          <Row
            icon="lock"
            tint={TILE.indigo}
            title="Private profile"
            right={<Toggle accessibilityLabel="Private profile" value={!!profile.is_private} onValueChange={changePrivate} />}
          />
          <Row icon="card" tint={TILE.teal} title="Edit bio, city and languages" onPress={() => router.push('/edit-profile')} />
        </Group>

        <Group title="Appearance">
          <Row
            icon="moon"
            tint={TILE.purple}
            title="Theme"
            below={
              <Segmented<ThemePreference>
                value={preference}
                onChange={setPreference}
                options={[
                  { key: 'system', label: 'System' },
                  { key: 'light', label: 'Light' },
                  { key: 'dark', label: 'Dark' },
                ]}
              />
            }
          />
        </Group>

        <Group title="Help">
          <Row icon="doc" tint={TILE.grey} title="Terms of Use" onPress={() => router.push({ pathname: '/legal/[doc]', params: { doc: 'terms' } })} />
          <Row icon="shield" tint={TILE.blue} title="Privacy Policy" onPress={() => router.push({ pathname: '/legal/[doc]', params: { doc: 'privacy' } })} />
          <Row icon="help" tint={TILE.green} title="Support and contact" onPress={() => router.push({ pathname: '/legal/[doc]', params: { doc: 'support' } })} />
          <Row
            icon="settings"
            tint={TILE.grey}
            title="Ad choices"
            onPress={async () => {
              if (!(await showAdPrivacyOptions())) {
                Alert.alert('Ad choices', 'There are no ad choices to change in your region. On iPhone you can also turn off tracking in Settings → Privacy & Security → Tracking.');
              }
            }}
          />
        </Group>

        <Group>
          <Row
            icon="logout"
            tint={TILE.grey}
            title="Sign out"
            onPress={async () => {
              await Promise.race([unregisterPush(), new Promise((r) => setTimeout(r, 3000))]);
              await signOut();
            }}
          />
          <Row
            icon="trash"
            tint={TILE.red}
            title="Delete account"
            destructive
            right={deleting ? <ActivityIndicator color={colors.danger} /> : undefined}
            onPress={deleting ? undefined : confirmDeleteAccount}
          />
        </Group>
      </ScrollView>
    </SafeAreaView>
  );
}
