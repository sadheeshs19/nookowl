import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { voiceNoteUrl } from '../lib/api';
import { clock } from '../lib/format';
import { useTheme } from '../theme/ThemeProvider';
import { Icon } from './icons';
import { T } from './ui';

// A fixed, friendly-looking waveform; real amplitude data can come later.
const BARS = [6, 12, 20, 10, 16, 24, 12, 6, 18, 10, 22, 14, 8, 16, 10, 6, 12, 6, 4];

export function VoiceNote({ path, durationMs, mine }: { path: string; durationMs: number; mine: boolean }) {
  const { colors } = useTheme();
  const [url, setUrl] = useState<string | null>(null);
  const player = useAudioPlayer(url ? { uri: url } : null);
  const status = useAudioPlayerStatus(player);

  useEffect(() => {
    let alive = true;
    voiceNoteUrl(path)
      .then((u) => alive && setUrl(u))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [path]);

  useEffect(() => {
    if (status.didJustFinish) {
      player.seekTo(0);
    }
  }, [status.didJustFinish, player]);

  const total = durationMs / 1000;
  const progress = status.duration ? status.currentTime / status.duration : 0;
  const fg = mine ? colors.onAccent : colors.text;
  const played = mine ? '#FFFFFF' : colors.accentText;
  const rest = mine ? 'rgba(255,255,255,0.45)' : colors.dashed;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, width: 230 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={status.playing ? 'Pause voice note' : `Play voice note, ${Math.round(total)} seconds`}
        disabled={!url}
        onPress={() => (status.playing ? player.pause() : player.play())}
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: mine ? 'rgba(255,255,255,0.22)' : colors.accent,
        }}
      >
        {!url ? (
          <ActivityIndicator color={mine ? '#FFFFFF' : colors.onAccent} />
        ) : (
          <Icon name={status.playing ? 'pause' : 'play'} size={16} color={mine ? '#FFFFFF' : colors.onAccent} />
        )}
      </Pressable>
      <Svg width={130} height={28} viewBox="0 0 130 28">
        {BARS.map((h, i) => (
          <Rect
            key={i}
            x={i * 7}
            y={(28 - h) / 2}
            width={3}
            height={h}
            rx={1.5}
            fill={i / BARS.length < progress ? played : rest}
          />
        ))}
      </Svg>
      <T variant="small" style={{ color: fg }}>
        {clock(status.playing || status.currentTime > 0 ? status.currentTime : total)}
      </T>
    </View>
  );
}
