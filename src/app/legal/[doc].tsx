import { router, useLocalSearchParams } from 'expo-router';
import { Linking, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from '../../components/icons';
import { T } from '../../components/ui';
import legal from '../../legal/content.json';
import { useTheme } from '../../theme/ThemeProvider';

type DocKey = 'terms' | 'privacy' | 'support';

/** Terms of Use, Privacy Policy and Support, readable inside the app. */
export default function LegalScreen() {
  const { colors } = useTheme();
  const { doc } = useLocalSearchParams<{ doc: string }>();
  const key: DocKey = doc === 'privacy' || doc === 'support' ? doc : 'terms';
  const page = legal[key];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.back()} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="back" color={colors.text} />
        </Pressable>
        <T variant="label">{page.title}</T>
      </View>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 18, paddingBottom: 48 }}>
        <View style={{ gap: 6 }}>
          <T variant="title">{page.title}</T>
          <T variant="small" muted>Last updated {legal.updated}</T>
          <T>{page.intro}</T>
        </View>
        {page.sections.map((s) => (
          <View key={s.h} style={{ gap: 8 }}>
            <T variant="heading">{s.h}</T>
            {s.p.map((line) => (
              <T key={line} style={{ lineHeight: 22 }}>{line}</T>
            ))}
          </View>
        ))}
        <View style={{ gap: 6, padding: 14, borderRadius: 16, backgroundColor: colors.surface }}>
          <T variant="label">Contact</T>
          <Pressable accessibilityRole="link" onPress={() => Linking.openURL(`mailto:${legal.supportEmail}`).catch(() => {})}>
            <T selectable style={{ color: colors.accentText }}>{legal.supportEmail}</T>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
