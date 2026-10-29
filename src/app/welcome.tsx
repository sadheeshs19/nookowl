import { Redirect, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
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
  // Password sign-in exists for accounts that have one, such as app-store review accounts.
  const [usePassword, setUsePassword] = useState(false);
  const [password, setPassword] = useState('');

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

  const signInWithPassword = async () => {
    setError(null);
    clearLinkError();
    const value = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(value) || !password) {
      setError('Enter your email and password.');
      return;
    }
    setBusy(true);
    const { error: e } = await supabase.auth.signInWithPassword({ email: value, password });
    setBusy(false);
    if (e) setError(/invalid/i.test(e.message) ? 'That email and password don’t match.' : e.message);
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
                  returnKeyType={usePassword ? 'next' : 'send'}
                  onSubmitEditing={() => (usePassword ? undefined : sendLink(email))}
                />
                {usePassword ? (
                  <>
                    <Field
                      label="Password"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry
                      autoCapitalize="none"
                      autoComplete="password"
                      textContentType="password"
                      returnKeyType="go"
                      onSubmitEditing={signInWithPassword}
                    />
                    <Button title="Sign in" onPress={signInWithPassword} loading={busy} />
                  </>
                ) : (
                  <Button title="Email me a sign-in link" onPress={() => sendLink(email)} loading={busy} />
                )}
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    setUsePassword((v) => !v);
                    setError(null);
                  }}
                  hitSlop={8}
                  style={{ alignSelf: 'center', paddingVertical: 4 }}
                >
                  <T variant="small" muted>{usePassword ? 'Use an email link instead' : 'Have a password? Sign in with it'}</T>
                </Pressable>
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
          <View style={{ flexDirection: 'row', gap: 16 }}>
            <Pressable accessibilityRole="link" onPress={() => router.push({ pathname: '/legal/[doc]', params: { doc: 'terms' } })} hitSlop={8}>
              <T variant="small" style={{ color: colors.accentText }}>Terms of Use</T>
            </Pressable>
            <Pressable accessibilityRole="link" onPress={() => router.push({ pathname: '/legal/[doc]', params: { doc: 'privacy' } })} hitSlop={8}>
              <T variant="small" style={{ color: colors.accentText }}>Privacy Policy</T>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
