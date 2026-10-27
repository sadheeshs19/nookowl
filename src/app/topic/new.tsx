import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from '../../components/icons';
import { Button, Field, T } from '../../components/ui';
import { postTopic } from '../../lib/api';
import { parseTags } from '../../lib/format';
import { fonts } from '../../theme/colors';
import { useTheme } from '../../theme/ThemeProvider';

export default function NewTopic() {
  const { colors } = useTheme();
  const { prefill } = useLocalSearchParams<{ prefill?: string }>();
  const [body, setBody] = useState('');
  const [tagText, setTagText] = useState(prefill ? `#${prefill}` : '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const tags = parseTags(tagText);

  const submit = async () => {
    setError(null);
    if (body.trim().length < 3) {
      setError('Write a little more so people know what you want to talk about.');
      return;
    }
    setBusy(true);
    try {
      await postTopic(body, tags);
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not post your topic.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingTop: 8 }}>
          <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={() => router.back()} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="close" color={colors.text} />
          </Pressable>
          <T variant="label">New topic</T>
          <View style={{ width: 44 }} />
        </View>
        <ScrollView contentContainerStyle={{ padding: 20, gap: 18 }} keyboardShouldPersistTaps="handled">
          <Field
            label="What do you want to talk about?"
            value={body}
            onChangeText={setBody}
            placeholder="Just finished my first 10K. Anyone else into running?"
            multiline
            maxLength={140}
            autoFocus
            style={{ minHeight: 110, paddingTop: 12, textAlignVertical: 'top' }}
            hint={`${body.length}/140`}
          />
          <Field
            label="Tags (up to 3)"
            value={tagText}
            onChangeText={setTagText}
            placeholder="#Running, #Fitness"
            autoCapitalize="none"
            hint="Tags help people find your topic in search."
          />
          {tags.length ? (
            <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.accentText }}>
              {tags.map((t) => `#${t}`).join('  ')}
            </Text>
          ) : null}
          <View style={{ padding: 14, borderRadius: 14, backgroundColor: colors.noticeBg }}>
            <T variant="small" style={{ color: colors.noticeFg }}>
              People can like, comment and message you about this topic. Nobody can call you from it.
            </T>
          </View>
          {error ? <T style={{ color: colors.danger }}>{error}</T> : null}
          <Button title="Post topic" onPress={submit} loading={busy} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
