import { Redirect, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { OwlHero } from '../components/OwlHero';
import { Button, Field, PressableScale, T } from '../components/ui';
import { useAuth } from '../lib/auth';
import { authRedirectUrl } from '../lib/magicLink';
import { appleAvailable, googleAvailable, signInWithApple, signInWithGoogle } from '../lib/socialAuth';
import Svg, { Path } from 'react-native-svg';
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

  const social = async (which: 'apple' | 'google') => {
    setError(null);
    clearLinkError();
    setBusy(true);
    try {
      await (which === 'apple' ? signInWithApple() : signInWithGoogle());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Couldn’t sign you in. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const shownError = error ?? linkError;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, padding: 24, gap: 20, justifyContent: 'center' }}
          keyboardShouldPersistTaps="handled"
        >
          <OwlHero height={240} />

          {!sentTo ? (
            <>
              <View style={{ gap: 8 }}>
                <T variant="title">Welcome to Nooks Owl</T>
                <T muted>A quiet corner to talk with kind strangers, about anything.</T>
              </View>
              {appleAvailable || googleAvailable ? (
                <View style={{ gap: 10 }}>
                  {appleAvailable ? <AppleButton onPress={() => social('apple')} disabled={busy} /> : null}
                  {googleAvailable ? <GoogleButton onPress={() => social('google')} disabled={busy} /> : null}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 }}>
                    <View style={{ flex: 1, height: 0.5, backgroundColor: colors.border2 }} />
                    <T variant="small" muted>or use email</T>
                    <View style={{ flex: 1, height: 0.5, backgroundColor: colors.border2 }} />
                  </View>
                </View>
              ) : null}
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

/** Apple's own "Sign in with Apple" button (black, or white in dark mode), as Apple requires. */
function AppleButton({ onPress, disabled }: { onPress: () => void; disabled?: boolean }) {
  const { isDark } = useTheme();
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Apple = require('expo-apple-authentication') as typeof import('expo-apple-authentication');
  return (
    <View pointerEvents={disabled ? 'none' : 'auto'} style={{ opacity: disabled ? 0.6 : 1 }}>
      <Apple.AppleAuthenticationButton
        buttonType={Apple.AppleAuthenticationButtonType.CONTINUE}
        buttonStyle={isDark ? Apple.AppleAuthenticationButtonStyle.WHITE : Apple.AppleAuthenticationButtonStyle.BLACK}
        cornerRadius={25}
        style={{ height: 50 }}
        onPress={onPress}
      />
    </View>
  );
}

/** "Continue with Google", following Google's button guidelines (white with the G logo). */
function GoogleButton({ onPress, disabled }: { onPress: () => void; disabled?: boolean }) {
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel="Continue with Google"
      feedback="tap"
      disabled={disabled}
      onPress={onPress}
      style={{
        height: 50, borderRadius: 25, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
        backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#DADCE0', opacity: disabled ? 0.6 : 1,
      }}
    >
      <Svg width={20} height={20} viewBox="0 0 48 48">
        <Path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
        <Path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
        <Path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
        <Path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
      </Svg>
      <Text style={{ fontFamily: fonts.bodySemi, fontSize: 16, color: '#1F1F1F' }}>Continue with Google</Text>
    </PressableScale>
  );
}
