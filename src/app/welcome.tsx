import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { OwlBody } from '../components/OwlSplash';
import { Button, Field, T } from '../components/ui';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { useTheme } from '../theme/ThemeProvider';

export default function Welcome() {
  const { colors } = useTheme();
  const { refreshProfile } = useAuth();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendCode = async () => {
    setError(null);
    const value = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(value)) {
      setError('Enter a valid email address.');
      return;
    }
    setBusy(true);
    const { error: e } = await supabase.auth.signInWithOtp({ email: value, options: { shouldCreateUser: true } });
    setBusy(false);
    if (e) setError(e.message);
    else setStep('code');
  };

  const verify = async () => {
    setError(null);
    setBusy(true);
    const { error: e } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: code.trim(),
      type: 'email',
    });
    setBusy(false);
    if (e) {
      setError('That code didn’t work. Check it and try again.');
      return;
    }
    await refreshProfile();
    router.replace('/');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 24, gap: 20, justifyContent: 'center' }}>
          <View style={{ alignItems: 'center' }}>
            <OwlBody size={150} />
          </View>
          <View style={{ gap: 8 }}>
            <T variant="title">Welcome to Nook Owl</T>
            <T muted>A quiet corner to talk with kind strangers, about anything.</T>
          </View>

          {step === 'email' ? (
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
              />
              <Button title="Send me a code" onPress={sendCode} loading={busy} />
            </View>
          ) : (
            <View style={{ gap: 14 }}>
              <Field
                label="6-digit code"
                hint={`We sent it to ${email.trim()}.`}
                value={code}
                onChangeText={setCode}
                placeholder="123456"
                keyboardType="number-pad"
                autoComplete="one-time-code"
                textContentType="oneTimeCode"
                maxLength={8}
              />
              <Button title="Continue" onPress={verify} loading={busy} disabled={code.trim().length < 6} />
              <Button title="Use a different email" kind="ghost" onPress={() => setStep('email')} />
            </View>
          )}

          {error ? <T style={{ color: colors.danger }}>{error}</T> : null}
          <T variant="small" muted>
            Nook Owl is for people aged 18 and over. You’ll pick a nickname next; your email is never shown.
          </T>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
