import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LanguagePicker } from '../components/LanguagePicker';
import { PrivacyPromise } from '../components/PrivacyPromise';
import { Button, Chip, Field, T, Toggle } from '../components/ui';
import { isUsernameTaken, saveProfile } from '../lib/api';
import { useAuth } from '../lib/auth';
import { GENDERS, type Gender } from '../lib/gender';
import { INTERESTS } from '../lib/interests';
import { useTheme } from '../theme/ThemeProvider';


export default function Onboarding() {
  const { colors } = useTheme();
  const { session, refreshProfile } = useAuth();
  const [username, setUsername] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [city, setCity] = useState('');
  const [bio, setBio] = useState('');
  const [languages, setLanguages] = useState<string[]>([]);
  const [gender, setGender] = useState<Gender | null>(null);
  const [interests, setInterests] = useState<string[]>([]);
  const [openToCalls, setOpenToCalls] = useState(false);
  const [cardChats, setCardChats] = useState(true);
  const [showAge, setShowAge] = useState(true);
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // New people see our privacy promise first, then set up their profile.
  const [promised, setPromised] = useState(false);

  const toggle = (list: string[], set: (v: string[]) => void, v: string) =>
    set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  const thisYear = new Date().getFullYear();

  const submit = async () => {
    setError(null);
    const name = username.trim();
    const year = Number(birthYear);
    if (!/^[A-Za-z0-9._]{3,24}$/.test(name)) {
      setError('Nicknames are 3–24 letters, numbers, dots or underscores.');
      return;
    }
    if (!Number.isInteger(year) || year < 1900 || year > thisYear) {
      setError('Enter the year you were born, like 1998.');
      return;
    }
    if (year > thisYear - 18) {
      setError('Sorry, Nooks Owl is only for people aged 18 and over.');
      return;
    }
    if (!gender) {
      setError('Choose your gender, or “Prefer not to say”.');
      return;
    }
    if (languages.length === 0) {
      setError('Pick at least one language you can talk in.');
      return;
    }
    if (!agreed) {
      setError('Please agree to the Terms of Use to continue.');
      return;
    }
    if (!session) return;
    setBusy(true);
    try {
      if (await isUsernameTaken(name, session.user.id)) {
        setError('That nickname is taken. Try another.');
        return;
      }
      await saveProfile({
        id: session.user.id,
        username: name,
        birth_year: year,
        city: city.trim() || null,
        bio: bio.trim() || null,
        languages,
        gender,
        interests,
        open_to_calls: openToCalls,
        allow_card_chats: cardChats,
        show_age: showAge,
      });
      await refreshProfile();
      router.replace('/(tabs)');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };

  if (!promised) return <PrivacyPromise onContinue={() => setPromised(true)} />;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: 24, gap: 20 }} keyboardShouldPersistTaps="handled">
          <View style={{ gap: 6 }}>
            <T variant="title">Set up your nook</T>
            <T muted>People see your nickname, age, gender, city and languages. Never your email.</T>
          </View>

          <Field label="Nickname" value={username} onChangeText={setUsername} placeholder="arjun.talks" autoCapitalize="none" autoCorrect={false} />
          <Field
            label="Birth year"
            hint="Used to check you’re 18 or over. Your birth year is never shown."
            value={birthYear}
            onChangeText={(v) => setBirthYear(v.replace(/[^0-9]/g, '').slice(0, 4))}
            placeholder="1998"
            keyboardType="number-pad"
          />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ flex: 1, gap: 2 }}>
              <T variant="label">Show my age</T>
              <T variant="small" muted>Shows your age (like 27) on your profile. You can hide it anytime.</T>
            </View>
            <Toggle accessibilityLabel="Show my age" value={showAge} onValueChange={setShowAge} />
          </View>
          <View style={{ gap: 10 }}>
            <T variant="label">Gender</T>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {GENDERS.map((g) => (
                <Chip key={g.key} label={g.label} selected={gender === g.key} onPress={() => setGender(g.key)} />
              ))}
            </View>
            <T variant="small" muted>Shown on your profile. You can choose who’s allowed to call you in Profile.</T>
          </View>
          <Field label="City (optional)" value={city} onChangeText={setCity} placeholder="Kochi" />
          <Field label="A line about you (optional)" value={bio} onChangeText={setBio} placeholder="Movies, travel stories, or honestly anything." maxLength={160} multiline />

          <LanguagePicker label="Languages you can talk in" value={languages} onChange={setLanguages} />

          <View style={{ gap: 10 }}>
            <T variant="label">What do you like talking about?</T>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {INTERESTS.map((l) => (
                <Chip key={l} label={l} selected={interests.includes(l)} onPress={() => toggle(interests, setInterests, l)} />
              ))}
            </View>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 16, backgroundColor: colors.card }}>
            <View style={{ flex: 1, gap: 2 }}>
              <T variant="label">Open to calls</T>
              <T variant="small" muted>Show me in People so others can send me call requests. You can change this anytime.</T>
            </View>
            <Toggle accessibilityLabel="Open to calls" value={openToCalls} onValueChange={setOpenToCalls} />
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 16, backgroundColor: colors.card }}>
            <View style={{ flex: 1, gap: 2 }}>
              <T variant="label">Chat button on my card</T>
              <T variant="small" muted>Let people in People message you directly. Turn off to get call requests only. You can change this anytime.</T>
            </View>
            <Toggle accessibilityLabel="Chat button on my card" value={cardChats} onValueChange={setCardChats} />
          </View>

          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: agreed }}
            onPress={() => setAgreed(!agreed)}
            style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}
          >
            <View
              style={{
                width: 24,
                height: 24,
                borderRadius: 6,
                borderWidth: 2,
                borderColor: agreed ? colors.accent : colors.border2,
                backgroundColor: agreed ? colors.accent : 'transparent',
                marginTop: 2,
              }}
            />
            <T style={{ flex: 1 }}>
              I’m 18 or older and I agree to the Terms of Use, including zero tolerance for abusive or sexual content. I’ll be kind, and I won’t share anyone’s personal details or record calls.
            </T>
          </Pressable>
          <View style={{ flexDirection: 'row', gap: 16, marginLeft: 36, marginTop: -8 }}>
            <Pressable accessibilityRole="link" onPress={() => router.push({ pathname: '/legal/[doc]', params: { doc: 'terms' } })} hitSlop={8}>
              <T variant="small" style={{ color: colors.accentText }}>Read the Terms</T>
            </Pressable>
            <Pressable accessibilityRole="link" onPress={() => router.push({ pathname: '/legal/[doc]', params: { doc: 'privacy' } })} hitSlop={8}>
              <T variant="small" style={{ color: colors.accentText }}>Privacy Policy</T>
            </Pressable>
          </View>

          {error ? <T style={{ color: colors.danger }}>{error}</T> : null}
          <Button title="Start talking" onPress={submit} loading={busy} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
