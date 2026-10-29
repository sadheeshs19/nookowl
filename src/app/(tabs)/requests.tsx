import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from '../../components/icons';
import { Avatar, Button, Card, Empty, Segmented, T } from '../../components/ui';
import { acceptCallRequest, cancelCallRequest, declineCallRequest, getCallRequests } from '../../lib/api';
import { minutesLeft, timeAgo } from '../../lib/format';
import type { CallRequest } from '../../lib/types';
import { useRealtime } from '../../lib/useRealtime';
import { useTheme } from '../../theme/ThemeProvider';

export default function Requests() {
  const { colors } = useTheme();
  const [tab, setTab] = useState<'received' | 'sent'>('received');
  const [data, setData] = useState<{ received: CallRequest[]; sent: CallRequest[] }>({ received: [], sent: [] });
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setData(await getCallRequests());
    } catch (e) {
      Alert.alert('Could not load requests', e instanceof Error ? e.message : '');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
      const t = setInterval(load, 30000); // drop expired requests
      return () => clearInterval(t);
    }, [load]),
  );
  useRealtime('requests-tab', [{ table: 'call_requests' }], load);

  const accept = async (r: CallRequest) => {
    setBusyId(r.id);
    try {
      const call = await acceptCallRequest(r);
      router.push({ pathname: '/call/[id]', params: { id: call.id, name: r.from_profile?.username ?? '' } });
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      Alert.alert(
        'Could not start the call',
        /row-level security/i.test(msg) ? 'They’ve run out of call minutes right now. Try again later.' : msg,
      );
    } finally {
      setBusyId(null);
      load();
    }
  };

  const act = async (id: string, fn: (id: string) => Promise<void>) => {
    setBusyId(id);
    try {
      await fn(id);
    } finally {
      setBusyId(null);
      load();
    }
  };

  const list = tab === 'received' ? data.received : data.sent;

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ paddingHorizontal: 20, paddingTop: 8, gap: 14 }}>
        <T variant="title">Call requests</T>
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { key: 'received', label: `Received · ${data.received.length}` },
            { key: 'sent', label: `Sent · ${data.sent.length}` },
          ]}
        />
        <T variant="small" muted>Requests expire after 15 minutes. Answering a call is always free.</T>
      </View>
      <FlatList
        data={list}
        keyExtractor={(r) => r.id}
        contentContainerStyle={{ padding: 20, gap: 12 }}
        renderItem={({ item }) =>
          tab === 'received' ? (
            <Card>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Avatar name={item.from_profile?.username} size={48} />
                <View style={{ flex: 1, gap: 3 }}>
                  <T variant="label">{item.from_profile?.username ?? 'Someone'}</T>
                  <T variant="small" muted>
                    {timeAgo(item.created_at)} · expires in {minutesLeft(item.expires_at)}
                  </T>
                </View>
              </View>
              {item.note ? (
                <View style={{ padding: 12, borderRadius: 12, backgroundColor: colors.surface }}>
                  <T>“{item.note}”</T>
                </View>
              ) : null}
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Button kind="secondary" title="Decline" style={{ flex: 1 }} onPress={() => act(item.id, declineCallRequest)} disabled={busyId === item.id} />
                <Button
                  title="Accept and call"
                  style={{ flex: 1.4 }}
                  icon={<Icon name="phone" size={18} color={colors.onAccent} />}
                  onPress={() => accept(item)}
                  loading={busyId === item.id}
                />
              </View>
            </Card>
          ) : (
            <Card style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Avatar name={item.to_profile?.username} size={48} />
              <View style={{ flex: 1, gap: 3 }}>
                <T variant="label">{item.to_profile?.username ?? 'Someone'}</T>
                <T variant="small" muted>Waiting · expires in {minutesLeft(item.expires_at)}</T>
              </View>
              <Button kind="secondary" title="Cancel" onPress={() => act(item.id, cancelCallRequest)} loading={busyId === item.id} />
            </Card>
          )
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={colors.accent} />
          ) : (
            <Empty
              title={tab === 'received' ? 'No requests right now' : 'No pending requests'}
              body={tab === 'received' ? 'Turn on “Open to calls” in your profile so people can find you.' : undefined}
              action={<Button kind="secondary" title="Find people to talk to" onPress={() => router.navigate('/(tabs)/people')} />}
            />
          )
        }
      />
    </SafeAreaView>
  );
}
