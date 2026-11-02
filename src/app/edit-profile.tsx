import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from '../components/icons';
import { LanguagePicker } from '../components/LanguagePicker';
import { Button, Chip, Field, T } from '../components/ui';
import { updateProfileDetails } from '../lib/api';
import { useAuth } from '../lib/auth';
import { INTERESTS } from '../lib/interests';
import { useTheme } from '../theme/ThemeProvider';

const BIO_MAX = 160;

export default function EditProfile() {
  const { colors } = useTheme();
  const { profile, refreshProfile } = useAuth();
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [city, setCity] = useState(profile?.city ?? '');
  const [languages, setLanguages] = useState<string[]>(profile?.languages ?? []);
  const [interests, setInterests] = useState<string[]>(profile?.interests ?? []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleInterest = (v: string) =>
    setInterests((list) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]));

  const save = async () => {
    setError(null);
    if (languages.length === 0) {
      setError('Pick at least one language you can talk in.');
      return;
    }
    setBusy(true);
    try {
      await updateProfileDetails({
        bio: bio.trim() || null,
        city: city.trim() || null,
        languages,
        interests,
      });
      await refreshProfile();
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };

  if (!profile) return null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4 }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.back()} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="back" color={colors.text} />
        </Pressable>
        <T variant="heading">Edit profile</T>
      </View>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 8, gap: 20, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          <View style={{ gap: 6 }}>
            <Field
              label="Bio"
              value={bio}
              onChangeText={setBio}
              placeholder="Movies, travel stories, or honestly anything."
              maxLength={BIO_MAX}
              multiline
              style={{ minHeight: 96, paddingTop: 12, textAlignVertical: 'top' }}
            />
            <T variant="small" muted style={{ alignSelf: 'flex-end' }}>{bio.length}/{BIO_MAX}</T>
          </View>

          <Field label="City (optional)" value={city} onChangeText={setCity} placeholder="Kochi" maxLength={40} />

          <LanguagePicker label="Languages you can talk in" value={languages} onChange={setLanguages} />

          <View style={{ gap: 10 }}>
            <T variant="label">What do you like talking about?</T>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {INTERESTS.map((l) => (
                <Chip key={l} label={l} selected={interests.includes(l)} onPress={() => toggleInterest(l)} />
              ))}
            </View>
          </View>

          {error ? <T style={{ color: colors.danger }}>{error}</T> : null}
          <Button title="Save" loading={busy} onPress={save} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
