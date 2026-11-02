import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from '../../components/icons';
import { GenderAge } from '../../components/GenderAge';
import { Avatar, Button, Card, Empty, T } from '../../components/ui';
import { block, getFeed, getOrStartConversation, getProfileView, report, sendCallRequest } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { useCredits } from '../../lib/credits';
import { timeAgo } from '../../lib/format';
import { profileImageUrl } from '../../lib/images';
import type { FeedTopic, ProfileView } from '../../lib/types';
import { fonts } from '../../theme/colors';
import { useTheme } from '../../theme/ThemeProvider';

export default function UserProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const { session } = useAuth();
  const { credits, openSheet } = useCredits();
  const [person, setPerson] = useState<ProfileView | null>(null);
  const [topics, setTopics] = useState<FeedTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [requested, setRequested] = useState(false);

  const isMe = session?.user.id === id;

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const p = await getProfileView(id);
      setPerson(p);
      setTopics(p && !p.limited ? await getFeed(undefined, id) : []);
    } catch {
      setPerson(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  useEffect(() => {
    if (isMe) router.replace('/(tabs)/profile');
  }, [isMe]);

  const requestCall = async () => {
    if (!person) return;
    if (credits && credits.total_seconds < 60) {
      openSheet('You need at least a minute of call time to send a call request. Watch a short ad to get more.');
      return;
    }
    try {
      await sendCallRequest(person.id);
      setRequested(true);
      Alert.alert('Call request sent', `We’ll ring you if ${person.username} accepts.`);
    } catch (e) {
      Alert.alert('Could not send the request', e instanceof Error ? e.message : '');
    }
  };

  const chat = async () => {
    if (!person) return;
    try {
      const conv = person.conversation_id ? { id: person.conversation_id } : await getOrStartConversation(person.id);
      router.push({ pathname: '/chat/[id]', params: { id: conv.id } });
    } catch (e) {
      Alert.alert('Could not start a chat', e instanceof Error ? e.message : '');
    }
  };

  const more = () => {
    if (!person) return;
    Alert.alert(person.username, undefined, [
      {
        text: 'Report',
        onPress: () =>
          report({ userId: person.id }, 'Reported from profile')
            .then(() => Alert.alert('Thanks', 'Our team will review this.'))
            .catch(() => {}),
      },
      {
        text: 'Block',
        style: 'destructive',
        onPress: () =>
          block(person.id)
            .then(() => router.back())
            .catch(() => {}),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const header = (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4 }}>
      <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.back()} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="back" color={colors.text} />
      </Pressable>
      <View style={{ flex: 1 }} />
      {person ? (
        <Pressable accessibilityRole="button" accessibilityLabel="More options: report or block" onPress={more} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="more" color={colors.text} />
        </Pressable>
      ) : null}
    </View>
  );

  if (loading || isMe) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
        {header}
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.accent} />
      </SafeAreaView>
    );
  }

  if (!person || person.banned) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
        {header}
        <Empty title="Profile not available" body="This person may have left Nooks Owl." />
      </SafeAreaView>
    );
  }

  const canChat = !!person.conversation_id || person.allow_card_chats !== false;
  const canRequest = person.open_to_calls && person.can_call && !requested;
  const details = [person.city, person.languages.length ? `Speaks ${person.languages.join(', ')}` : null]
    .filter(Boolean)
    .join(' · ');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      {header}
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32, gap: 16 }}>
        <View>
          <View style={{ height: 150, borderRadius: 20, overflow: 'hidden', backgroundColor: colors.fill }}>
            {person.cover_path ? (
              <Image source={{ uri: profileImageUrl(person.cover_path)! }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
            ) : null}
          </View>
          <View style={{ marginTop: -46, marginLeft: 16, alignSelf: 'flex-start', padding: 4, borderRadius: 50, backgroundColor: colors.bg }}>
            <Avatar name={person.username} path={person.avatar_path} size={88} />
          </View>
        </View>

        <View style={{ gap: 4, marginTop: -6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <T variant="heading">{person.username}</T>
            <GenderAge gender={person.gender} age={person.age} size="large" />
          </View>
          {details ? <T variant="small" muted>{details}</T> : null}
          {person.open_to_calls ? <T variant="small" style={{ color: colors.online }}>Open for calls</T> : null}
        </View>

        {person.limited ? (
          <View style={{ flexDirection: 'row', gap: 10, padding: 14, borderRadius: 16, backgroundColor: colors.card }}>
            <Icon name="user" size={20} color={colors.muted} />
            <T variant="small" muted style={{ flex: 1 }}>
              This profile is private. You’ll see more once you two are chatting.
            </T>
          </View>
        ) : (
          <>
            {person.bio ? <T>{person.bio}</T> : null}
            {person.interests.length ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {person.interests.map((tag) => (
                  <View key={tag} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: colors.card }}>
                    <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.text }}>{tag}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </>
        )}

        <View style={{ flexDirection: 'row', gap: 10 }}>
          {canRequest ? (
            <Button title="Call request" icon={<Icon name="phone" size={18} color={colors.onAccent} />} onPress={requestCall} style={{ flex: 1 }} />
          ) : null}
          {canChat ? (
            <Button
              kind="secondary"
              title={person.conversation_id ? 'Open chat' : 'Chat'}
              icon={<Icon name="message" size={18} color={colors.text} />}
              onPress={chat}
              style={{ flex: 1 }}
            />
          ) : null}
        </View>
        {requested ? <T variant="small" muted>Call request sent. We’ll ring you if they accept.</T> : null}

        {!person.limited ? (
          <View style={{ gap: 10 }}>
            <T variant="label">Topics</T>
            {topics.length === 0 ? (
              <T variant="small" muted>No topics yet.</T>
            ) : (
              topics.map((t) => (
                <Pressable key={t.id} accessibilityRole="button" onPress={() => router.push({ pathname: '/topic/[id]', params: { id: t.id } })}>
                  <Card>
                    <T variant="topic">{t.body}</T>
                    <T variant="small" muted>
                      {[timeAgo(t.created_at), `${t.like_count} likes`, `${t.comment_count} comments`].join(' · ')}
                    </T>
                  </Card>
                </Pressable>
              ))
            )}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
