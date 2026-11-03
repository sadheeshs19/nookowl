import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { fonts } from '../theme/colors';
import { useTheme } from '../theme/ThemeProvider';
import { cardStyle } from '../lib/cardStyles';
import type { FeedTopic } from '../lib/types';
import { timeAgo } from '../lib/format';
import { Icon } from './icons';
import { Avatar, Button, T } from './ui';

const NIGHT_STARS = [
  [0.08, 0.14, 1.1], [0.22, 0.32, 0.8], [0.37, 0.1, 1.3], [0.55, 0.24, 0.9], [0.7, 0.08, 1.2],
  [0.86, 0.3, 0.9], [0.93, 0.12, 0.7], [0.15, 0.6, 0.8], [0.46, 0.5, 0.7], [0.78, 0.55, 1],
  [0.6, 0.78, 0.8], [0.3, 0.85, 1.1], [0.9, 0.82, 0.8],
];

/** The gradient behind a coloured topic card (and its little stars for Night sky). */
export function CardBackground({ styleKey }: { styleKey: string | null | undefined }) {
  const s = cardStyle(styleKey);
  const [size, setSize] = useState({ w: 0, h: 0 });
  if (!s) return null;
  const id = `card-${s.key}`;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none" onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
      {size.w ? (
        <Svg width={size.w} height={size.h}>
          <Defs>
            <LinearGradient id={id} x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={s.from} />
              <Stop offset="1" stopColor={s.to} />
            </LinearGradient>
          </Defs>
          <Rect x={0} y={0} width={size.w} height={size.h} fill={`url(#${id})`} />
          {s.key === 'night'
            ? NIGHT_STARS.map(([x, y, r], i) => <Circle key={i} cx={x * size.w} cy={y * size.h} r={r} fill="#FFFFFF" opacity={0.75} />)
            : null}
        </Svg>
      ) : null}
    </View>
  );
}

export function TopicCard({
  topic,
  isMine,
  onLike,
  onComments,
  onMessage,
  onOpenAuthor,
}: {
  topic: FeedTopic;
  isMine: boolean;
  onLike: () => void;
  onComments: () => void;
  onMessage: () => void;
  onOpenAuthor?: () => void;
}) {
  const { colors } = useTheme();
  const styled = !!cardStyle(topic.style);
  const meta = [topic.city, topic.languages.slice(0, 2).join(', ')].filter(Boolean).join(' · ');

  return (
    <View style={{ borderRadius: 22, padding: 16, gap: 12, backgroundColor: colors.card }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`View ${topic.username}’s profile`}
          disabled={!onOpenAuthor}
          onPress={onOpenAuthor}
          style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 }}
        >
          <Avatar name={topic.username} path={topic.avatar_path} />
          <View style={{ flex: 1, gap: 2 }}>
            <T variant="label">{topic.username}</T>
            {meta ? <T variant="small" muted numberOfLines={1}>{meta}</T> : null}
          </View>
        </Pressable>
        <T variant="small" muted>{timeAgo(topic.created_at)}</T>
      </View>

      {/* The topic itself; a coloured style fills just this panel. */}
      <View
        style={
          styled
            ? { borderRadius: 18, padding: 18, minHeight: 130, overflow: 'hidden', flexDirection: 'row', alignItems: 'flex-start', gap: 10 }
            : { flexDirection: 'row', alignItems: 'flex-start', gap: 10 }
        }
      >
        <CardBackground styleKey={topic.style} />
        <Text
          style={{
            flex: 1,
            fontFamily: fonts.displaySemi,
            fontSize: styled ? 23 : 20,
            lineHeight: styled ? 29 : 25,
            color: styled ? '#FFFFFF' : colors.text,
          }}
        >
          {topic.body}
        </Text>
        {topic.mood ? <Text accessibilityLabel={`Mood ${topic.mood}`} style={{ fontSize: styled ? 34 : 28 }}>{topic.mood}</Text> : null}
      </View>

      {topic.tags.length ? (
        <Text style={{ fontFamily: fonts.bodySemi, fontSize: 13, color: colors.accentText, marginTop: -2 }}>
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
          style={pill}
        >
          <Icon name="heart" filled={topic.liked_by_me} color={topic.liked_by_me ? colors.like : colors.muted} size={20} />
          <Text style={{ fontFamily: fonts.bodySemi, fontSize: 14, color: topic.liked_by_me ? colors.like : colors.muted }}>{topic.like_count}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={`Comments, ${topic.comment_count}`} onPress={onComments} style={pill}>
          <Icon name="comment" color={colors.muted} size={20} />
          <Text style={{ fontFamily: fonts.bodySemi, fontSize: 14, color: colors.muted }}>{topic.comment_count}</Text>
        </Pressable>
      </View>

      {!isMine ? (
        <Button kind="secondary" title="Send a message" icon={<Icon name="message" size={18} color={colors.text} />} onPress={onMessage} />
      ) : null}
    </View>
  );
}

const pill = { minHeight: 40, paddingHorizontal: 8, flexDirection: 'row' as const, alignItems: 'center' as const, gap: 6 };
