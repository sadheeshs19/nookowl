import { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { useRewardedAd } from 'react-native-google-mobile-ads';
import { SafeAreaView } from 'react-native-safe-area-context';
import { rewardedAdUnitId } from '../lib/ads';
import { claimAdReward } from '../lib/api';
import type { Credits } from '../lib/types';
import { fonts } from '../theme/colors';
import { useTheme } from '../theme/ThemeProvider';
import { Icon } from './icons';
import { Button, T } from './ui';

export function CreditsSheet({
  visible,
  reason,
  credits,
  onCredits,
  onClose,
}: {
  visible: boolean;
  reason?: string;
  credits: Credits | null;
  onCredits: (c: Credits) => void;
  onClose: () => void;
}) {
  const { colors } = useTheme();
  const ad = useRewardedAd({ adUnitId: rewardedAdUnitId(), autoLoad: true });
  const [message, setMessage] = useState<string | null>(null);
  const claimedForShow = useRef(false);

  // Google confirmed the ad was watched: add the minutes.
  useEffect(() => {
    if (!ad.earnedReward || claimedForShow.current) return;
    claimedForShow.current = true;
    claimAdReward()
      .then((c) => {
        onCredits(c);
        setMessage(`+${Math.round(c.ad_seconds / 60)} minutes added. Enjoy your chat!`);
      })
      .catch((e) => setMessage(e instanceof Error ? e.message : 'Could not add minutes.'));
  }, [ad.earnedReward, onCredits]);

  // Get the next ad ready after one is closed.
  useEffect(() => {
    if (ad.status === 'closed') ad.load();
  }, [ad, ad.status]);

  const watch = () => {
    setMessage(null);
    claimedForShow.current = false;
    if (ad.status === 'loaded') ad.show();
    else if (ad.status === 'no-fill' || ad.status === 'error') {
      setMessage('No ad is available right now. Try again in a minute.');
      ad.retry();
    }
  };

  const total = credits?.total_seconds ?? 0;
  const minutes = Math.floor(total / 60);
  const adMinutes = Math.round((credits?.ad_seconds ?? 300) / 60);
  const adsLeft = credits?.ads_left ?? 0;
  const loading = ad.status === 'loading' || ad.status === 'idle' || ad.status === 'showing';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} style={{ flex: 1, backgroundColor: colors.overlay }} />
      <SafeAreaView
        edges={['bottom']}
        style={{ backgroundColor: colors.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, gap: 16 }}
      >
        <View style={{ alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: colors.border2 }} />
        {reason ? (
          <View style={{ padding: 12, borderRadius: 14, backgroundColor: colors.noticeBg }}>
            <T variant="small" style={{ color: colors.noticeFg }}>{reason}</T>
          </View>
        ) : null}

        <View style={{ alignItems: 'center', gap: 4 }}>
          <T variant="caps" muted>Call minutes</T>
          <Text style={{ fontFamily: fonts.display, fontSize: 56, lineHeight: 62, color: colors.text }}>{minutes}</Text>
          <T muted>
            {Math.floor((credits?.free_seconds ?? 0) / 60)} free today · {Math.floor((credits?.bonus_seconds ?? 0) / 60)} from ads
          </T>
        </View>

        <View style={{ gap: 6, padding: 14, borderRadius: 16, backgroundColor: colors.surface }}>
          <T variant="label">How minutes work</T>
          <T variant="small" muted>Only the person who calls uses minutes. Answering is always free.</T>
          <T variant="small" muted>You get 30 free minutes every day. Minutes from ads never expire.</T>
        </View>

        <Button
          title={adsLeft > 0 ? `Watch a short ad · +${adMinutes} min` : 'Ad limit reached for today'}
          icon={<Icon name="play" size={16} color={colors.onAccent} />}
          onPress={watch}
          loading={loading && adsLeft > 0}
          disabled={adsLeft <= 0}
        />
        {adsLeft > 0 ? (
          <T variant="small" muted style={{ textAlign: 'center' }}>
            {adsLeft} {adsLeft === 1 ? 'ad' : 'ads'} left today
          </T>
        ) : null}
        {message ? <T style={{ textAlign: 'center' }}>{message}</T> : null}
        <Button kind="ghost" title="Done" onPress={onClose} />
      </SafeAreaView>
    </Modal>
  );
}

export function CreditsPill({ seconds, onPress }: { seconds: number | null | undefined; onPress: () => void }) {
  const { colors } = useTheme();
  const low = (seconds ?? 0) < 120;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${Math.floor((seconds ?? 0) / 60)} call minutes left. Get more`}
      onPress={onPress}
      style={{
        minHeight: 36,
        paddingHorizontal: 12,
        borderRadius: 999,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: low ? colors.warnBg : colors.surface,
        borderWidth: 1,
        borderColor: low ? colors.warnBg : colors.border,
      }}
    >
      <Icon name="phone" size={15} color={low ? colors.warnFg : colors.text} />
      <Text style={{ fontFamily: fonts.bodySemi, fontSize: 13, color: low ? colors.warnFg : colors.text }}>
        {seconds == null ? '…' : `${Math.floor(seconds / 60)} min`}
      </Text>
    </Pressable>
  );
}
