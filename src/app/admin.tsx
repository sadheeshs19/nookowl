import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from '../components/icons';
import { Button, Card, Empty, T } from '../components/ui';
import { adminListReports, adminResolveReport } from '../lib/api';
import { timeAgo } from '../lib/format';
import type { AdminReport } from '../lib/types';
import { useTheme } from '../theme/ThemeProvider';

/** Moderators only: review open reports and act on them (within 24 hours). */
export default function AdminScreen() {
  const { colors } = useTheme();
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [overdue, setOverdue] = useState(false);

  const load = useCallback(async () => {
    try {
      const list = await adminListReports();
      setReports(list);
      // Reports must be handled within 24 hours; warn after 20.
      setOverdue(!!list[0] && Date.now() - new Date(list[0].created_at).getTime() > 20 * 3600 * 1000);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load reports.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const act = (r: AdminReport, action: 'dismiss' | 'hide_content' | 'ban_user') => {
    const run = async () => {
      setBusy(r.id + action);
      try {
        await adminResolveReport(r.id, action);
        setReports((list) => list.filter((x) => x.id !== r.id));
      } catch (e) {
        Alert.alert('Couldn’t do that', e instanceof Error ? e.message : '');
      } finally {
        setBusy(null);
      }
    };
    if (action !== 'ban_user') return run();
    Alert.alert(
      `Suspend ${r.target_username ?? 'this person'}?`,
      'They won’t be able to post, message, call or hoot, they disappear from People, and all their topics are hidden.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Suspend', style: 'destructive', onPress: run },
      ],
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.back()} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="back" color={colors.text} />
        </Pressable>
        <T variant="label" style={{ flex: 1 }}>Moderation · {reports.length} open</T>
      </View>
      {overdue ? (
        <View style={{ margin: 16, marginBottom: 0, padding: 12, borderRadius: 14, backgroundColor: colors.warnBg }}>
          <T variant="small" style={{ color: colors.warnFg }}>The oldest report is almost 24 hours old. Reports must be handled within 24 hours.</T>
        </View>
      ) : null}
      {error ? <T style={{ color: colors.danger, margin: 16 }}>{error}</T> : null}
      <FlatList
        data={reports}
        keyExtractor={(r) => r.id}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        onRefresh={load}
        refreshing={false}
        renderItem={({ item: r }) => {
          const content = r.topic_body ?? r.comment_body;
          const kind = r.topic_id ? 'Topic' : r.comment_id ? 'Comment' : r.call_id ? 'Call' : 'Profile';
          return (
            <Card>
              <View style={{ gap: 4 }}>
                <T variant="caps" muted>{kind} · reported {timeAgo(r.created_at)} by {r.reporter}</T>
                <T variant="label">
                  {r.target_username ?? 'Unknown person'}
                  {r.target_banned ? ' (suspended)' : ''}
                  {r.reports_against_user > 1 ? ` · ${r.reports_against_user} reports in total` : ''}
                </T>
                <T variant="small" muted>Reason: {r.reason}</T>
              </View>
              {content ? (
                <View style={{ padding: 12, borderRadius: 12, backgroundColor: colors.surface }}>
                  <T>“{content}”</T>
                </View>
              ) : null}
              <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                <Button kind="secondary" title="Dismiss" loading={busy === r.id + 'dismiss'} onPress={() => act(r, 'dismiss')} />
                {r.topic_id || r.comment_id ? (
                  <Button kind="secondary" title={r.topic_id ? 'Hide topic' : 'Delete comment'} loading={busy === r.id + 'hide_content'} onPress={() => act(r, 'hide_content')} />
                ) : null}
                {r.target_user_id && !r.target_banned ? (
                  <Button kind="danger" title="Suspend" loading={busy === r.id + 'ban_user'} onPress={() => act(r, 'ban_user')} />
                ) : null}
              </View>
            </Card>
          );
        }}
        ListEmptyComponent={
          loading ? <ActivityIndicator color={colors.accent} /> : <Empty title="No open reports" body="New reports arrive here and as a notification." />
        }
      />
    </SafeAreaView>
  );
}
