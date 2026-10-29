import { Pressable, Text, View } from 'react-native';
import { fonts } from '../theme/colors';
import { useTheme } from '../theme/ThemeProvider';
import type { FeedTopic } from '../lib/types';
import { timeAgo } from '../lib/format';
import { Icon } from './icons';
import { Avatar, Button, Card, T } from './ui';

export function TopicCard({
  topic,
  isMine,
  onLike,
  onComments,
  onMessage,
}: {
  topic: FeedTopic;
  isMine: boolean;
  onLike: () => void;
  onComments: () => void;
  onMessage: () => void;
}) {
  const { colors } = useTheme();
  const meta = [topic.city, topic.languages.slice(0, 2).join(', ')].filter(Boolean).join(' · ');
  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Avatar name={topic.username} path={topic.avatar_path} />
        <View style={{ flex: 1, gap: 2 }}>
          <T variant="label">{topic.username}</T>
          {meta ? <T variant="small" muted numberOfLines={1}>{meta}</T> : null}
        </View>
        <T variant="small" muted>{timeAgo(topic.created_at)}</T>
      </View>

      <T variant="topic">{topic.body}</T>
      {topic.tags.length ? (
        <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.accentText, marginTop: -4 }}>
          {topic.tags.map((t) => `#${t}`).join('  ')}
        </Text>
      ) : null}

      {topic.last_comment_body ? (
        <Text style={{ fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: colors.muted }} numberOfLines={2}>
          <Text style={{ fontFamily: fonts.bodySemi, color: colors.text }}>{topic.last_comment_username} </Text>
          {topic.last_comment_body}
        </Text>
      ) : null}

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginHorizontal: -8 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Like, ${topic.like_count} likes`}
          accessibilityState={{ selected: topic.liked_by_me }}
          onPress={onLike}
          style={{ minHeight: 40, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', gap: 6 }}
        >
          <Icon name="heart" filled={topic.liked_by_me} color={topic.liked_by_me ? colors.like : colors.muted} size={20} />
          <Text style={{ fontFamily: fonts.bodySemi, fontSize: 14, color: topic.liked_by_me ? colors.like : colors.muted }}>
            {topic.like_count}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Comments, ${topic.comment_count}`}
          onPress={onComments}
          style={{ minHeight: 40, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', gap: 6 }}
        >
          <Icon name="comment" color={colors.muted} size={20} />
          <Text style={{ fontFamily: fonts.bodySemi, fontSize: 14, color: colors.muted }}>{topic.comment_count}</Text>
        </Pressable>
      </View>

      {!isMine ? (
        <Button
          kind="secondary"
          title="Send a message"
          icon={<Icon name="message" size={18} color={colors.text} />}
          onPress={onMessage}
        />
      ) : null}
    </Card>
  );
}
