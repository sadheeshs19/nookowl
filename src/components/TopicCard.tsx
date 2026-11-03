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
  const ink = styled ? '#FFFFFF' : colors.text;
  const sub = styled ? 'rgba(255,255,255,0.78)' : colors.muted;
  const meta = [topic.city, topic.languages.slice(0, 2).join(', ')].filter(Boolean).join(' · ');

  return (
    <View
      style={{
        borderRadius: 22, padding: 16, gap: 12, overflow: 'hidden',
        backgroundColor: styled ? 'transparent' : colors.card,
        minHeight: styled ? 210 : undefined,
      }}
    >
      <CardBackground styleKey={topic.style} />

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
            <T variant="label" style={{ color: ink }}>{topic.username}</T>
            {meta ? <T variant="small" numberOfLines={1} style={{ color: sub }}>{meta}</T> : null}
          </View>
        </Pressable>
        <T variant="small" style={{ color: sub }}>{timeAgo(topic.created_at)}</T>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, flexGrow: styled ? 1 : 0 }}>
        <Text
          style={{
            flex: 1,
            fontFamily: fonts.displaySemi,
            fontSize: styled ? 24 : 20,
            lineHeight: styled ? 30 : 25,
            color: ink,
          }}
        >
          {topic.body}
        </Text>
        {topic.mood ? <Text accessibilityLabel={`Mood ${topic.mood}`} style={{ fontSize: styled ? 36 : 28 }}>{topic.mood}</Text> : null}
      </View>
      {topic.tags.length ? (
        <Text style={{ fontFamily: fonts.bodySemi, fontSize: 13, color: styled ? '#FFFFFF' : colors.accentText, marginTop: -4, opacity: styled ? 0.92 : 1 }}>
          {topic.tags.map((t) => `#${t}`).join('  ')}
        </Text>
      ) : null}

      {topic.last_comment_body ? (
        <Text style={{ fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: sub }} numberOfLines={2}>
          <Text style={{ fontFamily: fonts.bodySemi, color: ink }}>{topic.last_comment_username} </Text>
          {topic.last_comment_body}
        </Text>
      ) : null}

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: styled ? 0 : -8 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Like, ${topic.like_count} likes`}
          accessibilityState={{ selected: topic.liked_by_me }}
          onPress={onLike}
          style={[pill, styled ? glass : null]}
        >
          <Icon
            name="heart"
            filled={topic.liked_by_me}
            color={topic.liked_by_me ? (styled ? '#FFE4EC' : colors.like) : sub}
            size={20}
          />
          <Text style={{ fontFamily: fonts.bodySemi, fontSize: 14, color: topic.liked_by_me && !styled ? colors.like : styled ? '#FFFFFF' : colors.muted }}>
            {topic.like_count}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Comments, ${topic.comment_count}`}
          onPress={onComments}
          style={[pill, styled ? glass : null]}
        >
          <Icon name="comment" color={sub} size={20} />
          <Text style={{ fontFamily: fonts.bodySemi, fontSize: 14, color: styled ? '#FFFFFF' : colors.muted }}>{topic.comment_count}</Text>
        </Pressable>
      </View>

      {!isMine ? (
        <Button
          kind="secondary"
          title="Send a message"
          icon={<Icon name="message" size={18} color={ink} />}
          onPress={onMessage}
          color={styled ? '#FFFFFF' : undefined}
          style={styled ? { backgroundColor: 'rgba(255,255,255,0.22)' } : undefined}
        />
      ) : null}
    </View>
  );
}

const pill = { minHeight: 38, paddingHorizontal: 10, borderRadius: 19, flexDirection: 'row' as const, alignItems: 'center' as const, gap: 6 };
const glass = { backgroundColor: 'rgba(255,255,255,0.18)' };
