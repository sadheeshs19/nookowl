import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from '../../components/icons';
import { Avatar, Empty, Segmented, T } from '../../components/ui';
import { listConversations } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { timeAgo } from '../../lib/format';
import type { ConversationListItem } from '../../lib/types';
import { useRealtime } from '../../lib/useRealtime';
import { useTheme } from '../../theme/ThemeProvider';

export default function Inbox() {
  const { colors } = useTheme();
  const { session } = useAuth();
  const me = session?.user.id;
  const [tab, setTab] = useState<'chats' | 'requests'>('chats');
  const [items, setItems] = useState<ConversationListItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setItems(await listConversations());
    } catch (e) {
      Alert.alert('Could not load your inbox', e instanceof Error ? e.message : '');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );
  useRealtime('inbox', [{ table: 'messages', event: 'INSERT' }, { table: 'conversations' }], load, !!me);

  // A "request" is a conversation someone else started that I haven't accepted yet.
  const requests = items.filter((c) => c.status === 'request' && c.created_by !== me);
  const chats = items.filter((c) => !(c.status === 'request' && c.created_by !== me) && (c.last || c.status === 'active'));
  const list = tab === 'chats' ? chats : requests;

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ paddingHorizontal: 20, paddingTop: 8, gap: 14 }}>
        <T variant="title">Inbox</T>
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { key: 'chats', label: 'Chats' },
            { key: 'requests', label: `Requests · ${requests.length}` },
          ]}
        />
        {tab === 'requests' && requests.length ? (
          <View style={{ flexDirection: 'row', gap: 12, padding: 14, borderRadius: 16, backgroundColor: colors.noticeBg }}>
            <T variant="small" style={{ color: colors.noticeFg, flex: 1 }}>
              You haven’t talked to these people yet. They can’t see if you’ve read their message until you accept.
            </T>
          </View>
        ) : null}
      </View>
      <FlatList
        data={list}
        keyExtractor={(c) => c.id}
        contentContainerStyle={{ paddingVertical: 8 }}
        renderItem={({ item }) => {
          const preview = item.last
            ? item.last.audio_path
              ? `Voice note · 0:${String(Math.round((item.last.audio_ms ?? 0) / 1000)).padStart(2, '0')}`
              : item.last.body ?? ''
            : 'Say hello';
          return (
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push({ pathname: '/chat/[id]', params: { id: item.id } })}
              style={({ pressed }) => ({
                flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 14,
                borderBottomWidth: 1, borderBottomColor: colors.border, opacity: pressed ? 0.7 : 1,
              })}
            >
              <Avatar name={item.other.username} size={48} />
              <View style={{ flex: 1, gap: 3 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                  <T variant="label">{item.other.username}</T>
                  <T variant="small" muted>{timeAgo(item.last?.created_at ?? item.created_at)}</T>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  {item.last?.audio_path ? <Icon name="mic" size={15} color={colors.accentText} /> : null}
                  <T muted numberOfLines={1} style={{ flex: 1 }}>
                    {item.last && item.last.sender_id === me ? `You: ${preview}` : preview}
                  </T>
                </View>
              </View>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator style={{ marginTop: 24 }} color={colors.accent} />
          ) : (
            <Empty
              title={tab === 'chats' ? 'No chats yet' : 'No message requests'}
              body={tab === 'chats' ? 'Message someone about their topic, or stay in touch after a good call.' : undefined}
            />
          )
        }
      />
    </SafeAreaView>
  );
}
