import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from '../../components/icons';
import { TopicCard } from '../../components/TopicCard';
import { Button, Field, PressableScale, T } from '../../components/ui';
import { postTopic } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { CARD_STYLES, MOODS, type CardStyle } from '../../lib/cardStyles';
import { haptic } from '../../lib/haptics';
import { parseTags } from '../../lib/format';
import { fonts } from '../../theme/colors';
import { useTheme } from '../../theme/ThemeProvider';

export default function NewTopic() {
  const { colors } = useTheme();
  const { prefill } = useLocalSearchParams<{ prefill?: string }>();
  const [body, setBody] = useState('');
  const [tagText, setTagText] = useState(prefill ? `#${prefill}` : '');
  const [style, setStyle] = useState<CardStyle>('sunset');
  const [mood, setMood] = useState<string | null>(null);
  const { profile } = useAuth();
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
      await postTopic(body, tags, style, mood);
      haptic.success();
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
          <View style={{ gap: 10 }}>
            <T variant="label">Card style</T>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingVertical: 2 }}>
              {CARD_STYLES.map((c) => {
                const on = c.key === style;
                return (
                  <PressableScale
                    key={c.key}
                    accessibilityRole="button"
                    accessibilityLabel={`${c.label} card`}
                    accessibilityState={{ selected: on }}
                    feedback="select"
                    onPress={() => setStyle(c.key)}
                    style={{ alignItems: 'center', gap: 6 }}
                  >
                    <View style={{ padding: 3, borderRadius: 26, borderWidth: 2.5, borderColor: on ? colors.accent : 'transparent' }}>
                      <View style={{ width: 44, height: 44, borderRadius: 22, overflow: 'hidden', backgroundColor: c.key === 'plain' ? colors.card : c.from }}>
                        {c.key !== 'plain' ? <View style={{ position: 'absolute', right: 0, bottom: 0, width: 30, height: 30, borderTopLeftRadius: 30, backgroundColor: c.to }} /> : null}
                      </View>
                    </View>
                    <Text style={{ fontFamily: on ? fonts.bodySemi : fonts.body, fontSize: 12, color: on ? colors.text : colors.muted }}>{c.label}</Text>
                  </PressableScale>
                );
              })}
            </ScrollView>
          </View>

          <View style={{ gap: 10 }}>
            <T variant="label">Mood (optional)</T>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {MOODS.map((m) => {
                const on = m === mood;
                return (
                  <PressableScale
                    key={m}
                    accessibilityRole="button"
                    accessibilityLabel={`Mood ${m}`}
                    accessibilityState={{ selected: on }}
                    feedback="select"
                    scaleTo={0.88}
                    onPress={() => setMood(on ? null : m)}
                    style={{
                      width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center',
                      backgroundColor: on ? colors.accent : colors.card,
                    }}
                  >
                    <Text style={{ fontSize: 22 }}>{m}</Text>
                  </PressableScale>
                );
              })}
            </View>
          </View>

          <View style={{ gap: 10 }}>
            <T variant="label">Preview</T>
            <View pointerEvents="none">
              <TopicCard
                topic={{
                  id: 'preview',
                  body: body.trim() || 'What do you want to talk about?',
                  tags,
                  created_at: new Date().toISOString(),
                  user_id: profile?.id ?? '',
                  username: profile?.username ?? 'you',
                  avatar_path: profile?.avatar_path ?? null,
                  city: profile?.city ?? null,
                  languages: profile?.languages ?? [],
                  like_count: 0,
                  comment_count: 0,
                  liked_by_me: false,
                  last_comment_username: null,
                  last_comment_body: null,
                  style,
                  mood,
                }}
                isMine
                onLike={() => {}}
                onComments={() => {}}
                onMessage={() => {}}
              />
            </View>
          </View>
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
