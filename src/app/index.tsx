import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { T } from '../components/ui';
import { useAuth } from '../lib/auth';
import { isConfigured } from '../lib/supabase';
import { useTheme } from '../theme/ThemeProvider';

export default function Index() {
  const { ready, session, profile } = useAuth();
  const { colors } = useTheme();

  if (!isConfigured) {
    return (
      <SafeAreaView style={{ flex: 1, padding: 24, gap: 12, justifyContent: 'center', backgroundColor: colors.bg }}>
        <T variant="title">Almost there</T>
        <T muted>
          Add your Supabase URL and anon key to a .env file (see .env.example), then restart the app with
          `npx expo start -c`.
        </T>
      </SafeAreaView>
    );
  }

  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (!session) return <Redirect href="/welcome" />;
  if (!profile) return <Redirect href="/onboarding" />;
  return <Redirect href="/(tabs)" />;
}
