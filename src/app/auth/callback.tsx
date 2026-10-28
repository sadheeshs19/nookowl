import { Redirect } from 'expo-router';
import { ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { T } from '../../components/ui';
import { useAuth } from '../../lib/auth';
import { useTheme } from '../../theme/ThemeProvider';

/**
 * The sign-in email link opens nooksowl://auth/callback. The AuthProvider reads
 * the tokens from that link; this screen just waits, then moves on.
 */
export default function AuthCallback() {
  const { colors } = useTheme();
  const { ready, session, linkError } = useAuth();

  if (ready && session) return <Redirect href="/" />;
  if (ready && linkError) return <Redirect href="/welcome" />;

  return (
    <SafeAreaView style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: colors.bg }}>
      <ActivityIndicator color={colors.accent} />
      <T muted>Signing you in…</T>
    </SafeAreaView>
  );
}
