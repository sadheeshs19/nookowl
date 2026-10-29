import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from '../../components/icons';
import { Avatar, Button, Empty, Segmented, T } from '../../components/ui';
import { listConversations, listHootsForMe, sendHoot, startCall } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { timeAgo } from '../../lib/format';
import { useCredits } from '../../lib/credits';
import type { ConversationListItem, HootForMe } from '../../lib/types';
import { useRealtime } from '../../lib/useRealtime';
import { useTheme } from '../../theme/ThemeProvider';

export default function Inbox() {
  const { colors } = useTheme();
  const { session } = useAuth();
  const me = session?.user.id;
  const [tab, setTab] = useState<'chats' | 'requests'>('chats');
  const [items, setItems] = useState<ConversationListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoots, setHoots] = useState<HootForMe[]>([]);
  const [busyHoot, setBusyHoot] = useState<string | null>(null);
  const { ensureCanCall } = useCredits();

  const load = useCallback(async () => {
    try {
      const [convs, h] = await Promise.all([listConversations(), listHootsForMe().catch(() => [] as HootForMe[])]);
      setItems(convs);
      setHoots(h);
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
  useRealtime('inbox', [{ table: 'messages', event: 'INSERT' }, { table: 'conversations' }, { table: 'hoots', event: 'INSERT' }], load, !!me);

  const hootBack = async (h: HootForMe) => {
    setBusyHoot(h.from_id);
    try {
      await sendHoot(h.from_id);
      setHoots((list) => list.filter((x) => x.from_id !== h.from_id));
    } catch (e) {
      Alert.alert('Couldn’t hoot', e instanceof Error ? e.message : '');
    } finally {
      setBusyHoot(null);
    }
  };

  const callBack = async (h: HootForMe) => {
    if (!(await ensureCanCall())) return;
    try {
      const c = await startCall(h.from_id);
      router.push({ pathname: '/call/[id]', params: { id: c.id, name: h.username } });
    } catch (e) {
      Alert.alert('Could not call', e instanceof Error ? e.message : '');
    }
  };

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
        {tab === 'chats' && hoots.length ? (
          <View style={{ gap: 8 }}>
            <T variant="caps" muted>Hooted at you</T>
            {hoots.map((h) => (
              <View
                key={h.from_id}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 16, backgroundColor: colors.noticeBg }}
              >
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Open chat with ${h.username}`}
                  onPress={() => router.push({ pathname: '/chat/[id]', params: { id: h.conversation_id } })}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}
                >
                  <View>
                    <Avatar name={h.username} path={h.avatar_path} size={44} />
                    <View style={{ position: 'absolute', right: -4, bottom: -4, width: 22, height: 22, borderRadius: 11, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.noticeBg }}>
                      <Icon name="owl" size={13} color={colors.onAccent} />
                    </View>
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <T variant="label" style={{ color: colors.noticeFg }}>{h.username} hooted at you</T>
                    <T variant="small" style={{ color: colors.noticeFg }}>
                      {timeAgo(h.created_at)} · {h.total} {h.total === 1 ? 'hoot' : 'hoots'} together
                    </T>
                  </View>
                </Pressable>
                <Button kind="secondary" title="Hoot back" loading={busyHoot === h.from_id} onPress={() => hootBack(h)} />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Call ${h.username}`}
                  onPress={() => callBack(h)}
                  style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' }}
                >
                  <Icon name="phone" size={18} color={colors.onAccent} />
                </Pressable>
              </View>
            ))}
          </View>
        ) : null}
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
              <Avatar name={item.other.username} path={item.other.avatar_path} size={48} />
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
