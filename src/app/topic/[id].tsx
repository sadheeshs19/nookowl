import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Platform, Pressable, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from '../../components/icons';
import { Avatar, Button, Empty, T } from '../../components/ui';
import { addComment, getComments, report } from '../../lib/api';
import { timeAgo } from '../../lib/format';
import { supabase } from '../../lib/supabase';
import type { TopicComment } from '../../lib/types';
import { fonts } from '../../theme/colors';
import { useTheme } from '../../theme/ThemeProvider';

export default function TopicComments() {
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [topic, setTopic] = useState<{ body: string; author: { username: string } | null } | null>(null);
  const [comments, setComments] = useState<TopicComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const [{ data }, list] = await Promise.all([
        supabase.from('topics').select('body, author:profiles!topics_user_id_fkey(username)').eq('id', id).maybeSingle(),
        getComments(id),
      ]);
      setTopic(data as typeof topic);
      setComments(list);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const post = async () => {
    if (!id || !draft.trim()) return;
    setBusy(true);
    try {
      await addComment(id, draft);
      setDraft('');
      await load();
    } catch (e) {
      Alert.alert('Could not post', e instanceof Error ? e.message : '');
    } finally {
      setBusy(false);
    }
  };

  const reportComment = (c: TopicComment) =>
    Alert.alert('Report this comment?', 'Our team will review it.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Report',
        style: 'destructive',
        onPress: () => report({ userId: c.user_id, topicId: c.topic_id }, `Comment: ${c.body}`).catch(() => {}),
      },
    ]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingTop: 8, gap: 4 }}>
          <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={() => router.back()} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="close" color={colors.text} />
          </Pressable>
          <T variant="heading">Comments · {comments.length}</T>
        </View>
        {topic ? (
          <T muted style={{ paddingHorizontal: 20, paddingBottom: 8 }}>
            On {topic.author?.username ?? 'someone'}’s topic: {topic.body}
          </T>
        ) : null}
        <FlatList
          data={comments}
          keyExtractor={(c) => c.id}
          contentContainerStyle={{ padding: 20, gap: 16 }}
          renderItem={({ item }) => (
            <Pressable onLongPress={() => reportComment(item)} style={{ flexDirection: 'row', gap: 10 }}>
              <Avatar name={item.author?.username} size={32} />
              <View style={{ flex: 1, gap: 2 }}>
                <T variant="small">
                  <T variant="small" style={{ fontFamily: fonts.bodySemi }}>{item.author?.username ?? 'someone'}</T>
                  {'  '}
                  <T variant="small" muted>{timeAgo(item.created_at)}</T>
                </T>
                <T>{item.body}</T>
              </View>
            </Pressable>
          )}
          ListEmptyComponent={
            loading ? <ActivityIndicator color={colors.accent} /> : <Empty title="No comments yet" body="Say something kind to get things started." />
          }
        />
        <View style={{ flexDirection: 'row', gap: 8, padding: 12, borderTopWidth: 1, borderTopColor: colors.border }}>
          <TextInput
            accessibilityLabel="Add a comment"
            value={draft}
            onChangeText={setDraft}
            placeholder="Add a kind comment…"
            placeholderTextColor={colors.muted}
            maxLength={300}
            style={{
              flex: 1,
              minHeight: 46,
              borderRadius: 23,
              borderWidth: 1,
              borderColor: colors.border2,
              backgroundColor: colors.surface,
              paddingHorizontal: 16,
              fontFamily: fonts.body,
              fontSize: 15,
              color: colors.text,
            }}
          />
          <Button title="Post" onPress={post} loading={busy} disabled={!draft.trim()} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
