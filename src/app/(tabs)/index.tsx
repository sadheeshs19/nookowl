import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, RefreshControl, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from '../../components/icons';
import { TopicCard } from '../../components/TopicCard';
import { Button, Chip, Empty, T } from '../../components/ui';
import { getFeed, getOrStartConversation, getTrendingTags, setLiked } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import type { FeedTopic } from '../../lib/types';
import { fonts } from '../../theme/colors';
import { useTheme } from '../../theme/ThemeProvider';

const DEFAULT_TAGS = ['LanguageExchange', 'CantSleep', 'Cricket', 'Careers', 'Running', 'JustChat'];

export default function Topics() {
  const { colors } = useTheme();
  const { session } = useAuth();
  const me = session?.user.id;
  const [query, setQuery] = useState('');
  const [topics, setTopics] = useState<FeedTopic[]>([]);
  const [tags, setTags] = useState<string[]>(DEFAULT_TAGS);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const latest = useRef(0);

  const load = useCallback(async (q: string) => {
    const ticket = ++latest.current;
    try {
      const rows = await getFeed(q);
      if (ticket === latest.current) setTopics(rows);
    } catch (e) {
      if (ticket === latest.current) Alert.alert('Could not load topics', e instanceof Error ? e.message : '');
    } finally {
      if (ticket === latest.current) setLoading(false);
    }
  }, []);

  // Search as you type, with a short pause so we don't query on every key.
  useEffect(() => {
    const t = setTimeout(() => load(query), 250);
    return () => clearTimeout(t);
  }, [query, load]);

  useFocusEffect(
    useCallback(() => {
      load(query);
      getTrendingTags()
        .then((t) => setTags(t.length >= 3 ? t : DEFAULT_TAGS))
        .catch(() => {});
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [load]),
  );

  const toggleLike = async (t: FeedTopic) => {
    const liked = !t.liked_by_me;
    setTopics((list) =>
      list.map((x) => (x.id === t.id ? { ...x, liked_by_me: liked, like_count: x.like_count + (liked ? 1 : -1) } : x)),
    );
    try {
      await setLiked(t.id, liked);
    } catch {
      load(query);
    }
  };

  const message = async (t: FeedTopic) => {
    try {
      const conv = await getOrStartConversation(t.user_id);
      router.push({ pathname: '/chat/[id]', params: { id: conv.id, topic: t.body } });
    } catch (e) {
      Alert.alert('Could not start a chat', e instanceof Error ? e.message : '');
    }
  };

  const q = query.trim().replace(/^#/, '');

  const header = (
    <View style={{ gap: 14, paddingBottom: 12 }}>
      <View style={{ gap: 4 }}>
        <T variant="caps" muted>Nook Owl</T>
        <T variant="title">What do you want to talk about?</T>
      </View>

      <View style={{ justifyContent: 'center' }}>
        <View style={{ position: 'absolute', left: 14, zIndex: 1 }} pointerEvents="none">
          <Icon name="search" size={20} color={colors.muted} />
        </View>
        <TextInput
          accessibilityLabel="Search topics"
          value={query}
          onChangeText={setQuery}
          placeholder="Search topics, tags, languages"
          placeholderTextColor={colors.muted}
          returnKeyType="search"
          autoCorrect={false}
          style={{
            height: 48,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: colors.border2,
            backgroundColor: colors.surface,
            paddingLeft: 44,
            paddingRight: 44,
            fontFamily: fonts.body,
            fontSize: 15,
            color: colors.text,
          }}
        />
        {query ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Clear search"
            onPress={() => setQuery('')}
            style={{ position: 'absolute', right: 2, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
          >
            <Icon name="close" size={18} color={colors.muted} />
          </Pressable>
        ) : null}
      </View>

      <View style={{ gap: 8 }}>
        <T variant="caps" muted>Trending</T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {tags.map((tag) => {
            const on = q.toLowerCase() === tag.toLowerCase();
            return <Chip key={tag} label={`#${tag}`} selected={on} onPress={() => setQuery(on ? '' : tag)} />;
          })}
        </View>
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={() => router.push('/topic/new')}
        style={{
          minHeight: 52,
          borderRadius: 16,
          borderWidth: 1.5,
          borderStyle: 'dashed',
          borderColor: colors.dashed,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          paddingHorizontal: 16,
        }}
      >
        <Icon name="plus" size={20} color={colors.accentText} />
        <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.muted }}>
          Post a topic to start a conversation
        </Text>
      </Pressable>

      {q && !loading ? (
        <T variant="small" muted>
          {topics.length} {topics.length === 1 ? 'topic' : 'topics'} for “{q}”
        </T>
      ) : null}
    </View>
  );

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.bg }}>
      <FlatList
        data={topics}
        keyExtractor={(t) => t.id}
        contentContainerStyle={{ padding: 20, gap: 12 }}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={header}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={colors.accent}
            onRefresh={async () => {
              setRefreshing(true);
              await load(query);
              setRefreshing(false);
            }}
          />
        }
        renderItem={({ item }) => (
          <TopicCard
            topic={item}
            isMine={item.user_id === me}
            onLike={() => toggleLike(item)}
            onComments={() => router.push({ pathname: '/topic/[id]', params: { id: item.id } })}
            onMessage={() => message(item)}
          />
        )}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator style={{ marginTop: 32 }} color={colors.accent} />
          ) : q ? (
            <Empty
              title={`Nobody’s talking about “${q}” right now`}
              body="Be the first. Post it as your topic and people who search for it will find you."
              action={
                <Button
                  title={`Post “${q}” as a topic`}
                  onPress={() => router.push({ pathname: '/topic/new', params: { prefill: q } })}
                />
              }
            />
          ) : (
            <Empty title="It’s quiet in here" body="Post the first topic and get the conversation going." />
          )
        }
      />
    </SafeAreaView>
  );
}
