import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from '../../components/icons';
import { Avatar, Button, Card, Empty, Segmented, T } from '../../components/ui';
import { deleteTopic, getFeed, setOpenToCalls } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { timeAgo } from '../../lib/format';
import type { FeedTopic } from '../../lib/types';
import { fonts } from '../../theme/colors';
import { useTheme, type ThemePreference } from '../../theme/ThemeProvider';

export default function ProfileScreen() {
  const { colors, preference, setPreference } = useTheme();
  const { profile, refreshProfile, signOut } = useAuth();
  const [topics, setTopics] = useState<FeedTopic[]>([]);
  const [open, setOpen] = useState(profile?.open_to_calls ?? false);

  const load = useCallback(async () => {
    if (!profile) return;
    setOpen(profile.open_to_calls);
    try {
      setTopics(await getFeed(undefined, profile.id));
    } catch {
      // keep what we have
    }
  }, [profile]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const toggleOpen = async (v: boolean) => {
    setOpen(v);
    try {
      await setOpenToCalls(v);
      await refreshProfile();
    } catch (e) {
      setOpen(!v);
      Alert.alert('Could not update', e instanceof Error ? e.message : '');
    }
  };

  const confirmDelete = (t: FeedTopic) =>
    Alert.alert('Delete this topic?', 'Its likes and comments will be removed too.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteTopic(t.id).catch(() => {});
          load();
        },
      },
    ]);

  if (!profile) return null;

  const likes = topics.reduce((a, t) => a + Number(t.like_count), 0);
  const comments = topics.reduce((a, t) => a + Number(t.comment_count), 0);

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
        <T variant="title">Profile</T>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <Avatar name={profile.username} size={80} />
          <View style={{ flex: 1, gap: 4 }}>
            <T variant="heading">{profile.username}</T>
            <T variant="small" muted>
              {[profile.city, profile.languages.length ? `Speaks ${profile.languages.join(', ')}` : null].filter(Boolean).join(' · ')}
            </T>
            {profile.bio ? <T variant="small">{profile.bio}</T> : null}
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface }}>
          <View style={{ flex: 1, gap: 3 }}>
            <T variant="label">Open to calls</T>
            <T variant="small" muted>
              {open ? 'People can find you in People and send call requests.' : 'You’re hidden. Turn on when you’re free to talk.'}
            </T>
          </View>
          <Switch accessibilityLabel="Open to calls" value={open} onValueChange={toggleOpen} trackColor={{ true: colors.online }} />
        </View>

        <View style={{ flexDirection: 'row', gap: 8 }}>
          {[
            ['Topics', topics.length],
            ['Likes', likes],
            ['Comments', comments],
          ].map(([label, n]) => (
            <View key={label} style={{ flex: 1, padding: 12, borderRadius: 16, borderWidth: 1, borderColor: colors.border, alignItems: 'center', gap: 2 }}>
              <Text style={{ fontFamily: fonts.display, fontSize: 24, color: colors.text }}>{n}</Text>
              <T variant="small" muted>{label}</T>
            </View>
          ))}
        </View>

        <T variant="caps" muted>Your topics</T>
        {topics.length === 0 ? (
          <Empty
            title="No topics yet"
            body="Post one and the likes and comments it gets will show up here."
            action={<Button title="Post a topic" onPress={() => router.push('/topic/new')} />}
          />
        ) : (
          topics.map((t) => (
            <Pressable key={t.id} onPress={() => router.push({ pathname: '/topic/[id]', params: { id: t.id } })} onLongPress={() => confirmDelete(t)}>
              <Card style={{ gap: 10 }}>
                <T variant="small" muted>Posted {timeAgo(t.created_at)}</T>
                <T variant="topic" style={{ fontSize: 18 }}>{t.body}</T>
                <View style={{ flexDirection: 'row', gap: 16 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Icon name="heart" filled size={18} color={colors.like} />
                    <T variant="label" style={{ color: colors.like }}>{t.like_count} likes</T>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Icon name="comment" size={18} color={colors.muted} />
                    <T variant="label" muted>{t.comment_count} comments</T>
                  </View>
                </View>
                {t.last_comment_body ? (
                  <Text style={{ fontFamily: fonts.body, fontSize: 14, color: colors.muted }} numberOfLines={2}>
                    <Text style={{ fontFamily: fonts.bodySemi, color: colors.text }}>{t.last_comment_username} </Text>
                    {t.last_comment_body}
                  </Text>
                ) : null}
              </Card>
            </Pressable>
          ))
        )}

        <T variant="caps" muted>Appearance</T>
        <Segmented<ThemePreference>
          value={preference}
          onChange={setPreference}
          options={[
            { key: 'system', label: 'System' },
            { key: 'light', label: 'Light' },
            { key: 'dark', label: 'Dark' },
          ]}
        />

        <Button kind="secondary" title="Sign out" onPress={signOut} style={{ marginTop: 8 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
