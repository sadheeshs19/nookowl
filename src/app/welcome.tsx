import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { OwlBody } from '../components/OwlSplash';
import { Button, Field, T } from '../components/ui';
import { useAuth } from '../lib/auth';
import { authRedirectUrl } from '../lib/magicLink';
import { supabase, supabaseHost } from '../lib/supabase';
import { fonts } from '../theme/colors';
import { useTheme } from '../theme/ThemeProvider';

const RESEND_SECONDS = 60;

export default function Welcome() {
  const { colors } = useTheme();
  const { session, linkError, clearLinkError } = useAuth();
  const [email, setEmail] = useState('');
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  // Signed in by the link while this screen was open.
  if (session) return <Redirect href="/" />;

  const sendLink = async (address: string) => {
    setError(null);
    clearLinkError();
    const value = address.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(value)) {
      setError('Enter a valid email address.');
      return;
    }
    setBusy(true);
    const { error: e } = await supabase.auth.signInWithOtp({
      email: value,
      options: { shouldCreateUser: true, emailRedirectTo: authRedirectUrl() },
    });
    setBusy(false);
    if (e) {
      setError(
        /rate|limit|seconds/i.test(e.message)
          ? 'Too many emails sent. Wait a minute, then try again.'
          : /json|parse|network|fetch/i.test(e.message)
            ? `Couldn’t reach the sign-in server (${supabaseHost()}). ${e.message}`
            : e.message,
      );
      return;
    }
    setSentTo(value);
    setCooldown(RESEND_SECONDS);
  };

  const shownError = error ?? linkError;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, padding: 24, gap: 20, justifyContent: 'center' }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={{ alignItems: 'center' }}>
            <OwlBody size={150} />
          </View>

          {!sentTo ? (
            <>
              <View style={{ gap: 8 }}>
                <T variant="title">Welcome to Nooks Owl</T>
                <T muted>A quiet corner to talk with kind strangers, about anything.</T>
              </View>
              <View style={{ gap: 14 }}>
                <Field
                  label="Email"
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  textContentType="emailAddress"
                  returnKeyType="send"
                  onSubmitEditing={() => sendLink(email)}
                />
                <Button title="Email me a sign-in link" onPress={() => sendLink(email)} loading={busy} />
              </View>
            </>
          ) : (
            <View style={{ gap: 14 }}>
              <T variant="title">Check your email</T>
              <T>
                We sent a sign-in link to <T style={{ fontFamily: fonts.bodySemi }}>{sentTo}</T>. Open it{' '}
                <T style={{ fontFamily: fonts.bodySemi }}>on this phone</T> and Nooks Owl will open, signed in.
              </T>
              <T variant="small" muted>Can’t find it? Check your spam folder. The link works once and expires after an hour.</T>
              <Button
                kind="secondary"
                title={cooldown > 0 ? `Resend link in ${cooldown}s` : 'Resend link'}
                disabled={cooldown > 0}
                loading={busy}
                onPress={() => sendLink(sentTo)}
              />
              <Button
                kind="ghost"
                title="Use a different email"
                onPress={() => {
                  setSentTo(null);
                  setError(null);
                }}
              />
            </View>
          )}

          {shownError ? <T style={{ color: colors.danger }}>{shownError}</T> : null}
          <T variant="small" muted>
            Nooks Owl is for people aged 18 and over. You’ll pick a nickname next; your email is never shown.
          </T>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
