import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from '../../components/icons';
import { Button, Chip, Field, Segmented, T } from '../../components/ui';
import { createRoom } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { haptic } from '../../lib/haptics';
import { useTheme } from '../../theme/ThemeProvider';

const IDEAS = ['Late-night chat', 'Practise English', 'Movie talk', 'Cricket', 'Books', 'Music', 'Careers', 'Travel stories'];

export default function NewRoom() {
  const { colors } = useTheme();
  const { profile } = useAuth();
  const [title, setTitle] = useState('');
  const [tag, setTag] = useState('');
  const [language, setLanguage] = useState(profile?.languages?.[0] ?? 'English');
  const [kind, setKind] = useState<'open' | 'private'>('open');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = async () => {
    setError(null);
    if (title.trim().length < 3) {
      setError('Give your room a title (at least 3 letters).');
      return;
    }
    setBusy(true);
    try {
      const id = await createRoom(title.trim(), tag.trim() || null, language || null, kind === 'private');
      haptic.success();
      router.replace({ pathname: '/room/[id]', params: { id } });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start the room.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4 }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={() => router.back()} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="close" color={colors.text} />
        </Pressable>
        <T variant="heading">Start a room</T>
      </View>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 8, gap: 20, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          <Field label="What’s the room about?" value={title} onChangeText={setTitle} placeholder="Late-night chat about anything" maxLength={80} />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: -8 }}>
            {IDEAS.map((i) => (
              <Chip key={i} label={i} selected={title === i} onPress={() => setTitle(i)} />
            ))}
          </View>
          <Field label="Tag (optional)" value={tag} onChangeText={(v) => setTag(v.replace(/[^\p{L}\p{N}_]/gu, '').slice(0, 30))} placeholder="nightowls" />
          <Field label="Language" value={language} onChangeText={setLanguage} placeholder="English" maxLength={30} />
          <View style={{ gap: 8 }}>
            <T variant="label">Who can join?</T>
            <Segmented<'open' | 'private'>
              value={kind}
              onChange={setKind}
              options={[
                { key: 'open', label: 'Anyone' },
                { key: 'private', label: 'Invite only' },
              ]}
            />
            <T variant="small" muted>
              {kind === 'open'
                ? 'Your room shows in Rooms. Anyone can listen; you choose who speaks.'
                : 'Hidden from the list. You’ll get a 6-letter code to share with friends.'}
            </T>
          </View>
          <View style={{ padding: 14, borderRadius: 16, backgroundColor: colors.card, gap: 4 }}>
            <T variant="label">You’re the host</T>
            <T variant="small" muted>
              Bring people up to speak, mute or remove anyone, and end the room. If you leave, the room ends. Keep it kind: the Terms of Use apply.
            </T>
          </View>
          {error ? <T style={{ color: colors.danger }}>{error}</T> : null}
          <Button title="Go live" loading={busy} onPress={start} icon={<Icon name="mic" size={18} color={colors.onAccent} />} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
