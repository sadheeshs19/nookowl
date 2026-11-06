import { StatusBar } from 'expo-status-bar';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActionSheetIOS, Alert, Animated, Platform, Pressable, ScrollView, Share, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon, type IconName } from '../../components/icons';
import { NightSky, NIGHT } from '../../components/NightSky';
import { Avatar, PressableScale } from '../../components/ui';
import {
  endRoom,
  getRoom,
  getRoomInviteCode,
  getRoomMembers,
  leaveRoom,
  muteInRoom,
  raiseHand,
  removeFromRoom,
  reportRoom,
  roomHeartbeat,
  setRoomRole,
  stepDown,
  type RoomInfo,
  type RoomMember,
} from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { haptic } from '../../lib/haptics';
import { useAgoraRoom } from '../../lib/useAgoraRoom';
import { useRealtime } from '../../lib/useRealtime';
import { fonts } from '../../theme/colors';

export default function RoomScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const me = session?.user.id;
  const [room, setRoom] = useState<RoomInfo | null>(null);
  const [members, setMembers] = useState<RoomMember[]>([]);
  const [ended, setEnded] = useState(false);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const leaving = useRef(false);

  const mine = members.find((m) => m.user_id === me);
  const myRole = mine?.role ?? 'listener';
  const isHost = myRole === 'host';
  const canSpeak = myRole === 'host' || (myRole === 'speaker' && !mine?.muted_by_host);
  const audio = useAgoraRoom(id, !!id && !ended, canSpeak);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const [r, list] = await Promise.all([getRoom(id), getRoomMembers(id)]);
      setRoom(r);
      setMembers(list);
      if (r?.status === 'ended') setEnded(true);
    } catch {
      // not a member any more (removed) or the room ended
      setEnded(true);
    }
  }, [id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);
  useRealtime(`room-${id}`, [{ table: 'room_members', filter: `room_id=eq.${id}` }, { table: 'rooms', filter: `id=eq.${id}` }], load, !!id);

  // Keep my seat: a ping every 25 seconds. If the room ended or I was removed, show that.
  useEffect(() => {
    if (!id || ended) return;
    const tick = async () => {
      try {
        const r = await roomHeartbeat(id);
        if (r === 'ended' || r === 'left') setEnded(true);
      } catch {
        // offline for a moment
      }
    };
    tick();
    const t = setInterval(tick, 25000);
    return () => clearInterval(t);
  }, [id, ended]);

  useEffect(() => {
    if (isHost && room?.is_private && id) getRoomInviteCode(id).then(setInviteCode).catch(() => {});
  }, [isHost, room?.is_private, id]);

  // Leaving the screen = leaving the room.
  useEffect(
    () => () => {
      if (id && !leaving.current) leaveRoom(id).catch(() => {});
    },
    [id],
  );

  const leave = () => {
    const go = () => {
      leaving.current = true;
      if (id) leaveRoom(id).catch(() => {});
      router.back();
    };
    if (isHost && !ended) {
      Alert.alert('End the room?', 'You’re the host, so leaving ends the room for everyone.', [
        { text: 'Stay', style: 'cancel' },
        { text: 'End room', style: 'destructive', onPress: go },
      ]);
    } else go();
  };

  const stage = members.filter((m) => m.role !== 'listener');
  const listeners = members.filter((m) => m.role === 'listener');
  const hands = listeners.filter((m) => m.hand_raised).sort((a, b) => (a.hand_raised_at ?? '').localeCompare(b.hand_raised_at ?? ''));

  const isSpeaking = useCallback(
    (m: RoomMember) => (m.user_id === me ? audio.speaking.has(0) && !audio.muted : audio.speaking.has(m.agora_uid)),
    [audio.speaking, audio.muted, me],
  );

  const act = async (fn: () => Promise<unknown>) => {
    try {
      await fn();
      haptic.tap();
      load();
    } catch (e) {
      Alert.alert('Couldn’t do that', e instanceof Error ? e.message : '');
    }
  };

  const memberMenu = (m: RoomMember) => {
    if (!id) return;
    const options: { label: string; destructive?: boolean; run: () => void }[] = [];
    options.push({ label: 'View profile', run: () => router.push({ pathname: '/user/[id]', params: { id: m.user_id } }) });
    if (isHost && m.user_id !== me) {
      if (m.role === 'listener') options.push({ label: 'Invite to speak', run: () => act(() => setRoomRole(id, m.user_id, 'speaker')) });
      if (m.role === 'speaker') {
        options.push({ label: m.muted_by_host ? 'Unmute' : 'Mute', run: () => act(() => muteInRoom(id, m.user_id, !m.muted_by_host)) });
        options.push({ label: 'Move to listeners', run: () => act(() => setRoomRole(id, m.user_id, 'listener')) });
      }
      options.push({
        label: 'Remove from room',
        destructive: true,
        run: () =>
          Alert.alert(`Remove ${m.username}?`, 'They won’t be able to come back to this room.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Remove', style: 'destructive', onPress: () => act(() => removeFromRoom(id, m.user_id)) },
          ]),
      });
    }
    if (m.user_id !== me) {
      options.push({
        label: 'Report',
        destructive: true,
        run: () =>
          act(() => reportRoom(id, m.user_id, `Reported in room: ${room?.title ?? ''}`)).then(() =>
            Alert.alert('Thanks', 'Our team will review this. You can also leave the room at any time.'),
          ),
      });
    }
    showMenu(m.username, options);
  };

  const roomMenu = () => {
    if (!id) return;
    const options: { label: string; destructive?: boolean; run: () => void }[] = [];
    if (myRole === 'speaker') options.push({ label: 'Move back to listening', run: () => act(() => stepDown(id)) });
    options.push({ label: 'Share room', run: share });
    if (isHost) options.push({ label: 'End room for everyone', destructive: true, run: () => act(() => endRoom(id)).then(() => setEnded(true)) });
    else options.push({ label: 'Report room', destructive: true, run: () => act(() => reportRoom(id, room?.host_id ?? null, `Reported room: ${room?.title ?? ''}`)).then(() => Alert.alert('Thanks', 'Our team will review this room.')) });
    showMenu(room?.title ?? 'Room', options);
  };

  const share = () => {
    const msg = room?.is_private && inviteCode
      ? `Join my room “${room.title}” on Nooks Owl. Open Rooms and enter the code ${inviteCode}. https://nooksowl.com`
      : `I’m live in “${room?.title ?? 'a room'}” on Nooks Owl. Come listen: open Rooms in the app. https://nooksowl.com`;
    Share.share({ message: msg }).catch(() => {});
  };

  if (ended) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: NIGHT.top, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 14 }}>
        <StatusBar style="light" />
        <NightSky moon />
        <Text style={{ fontFamily: fonts.display, fontSize: 28, color: NIGHT.text, textAlign: 'center' }}>This room has ended</Text>
        <Text style={{ fontFamily: fonts.body, fontSize: 15, color: NIGHT.muted, textAlign: 'center' }}>Thanks for being part of it.</Text>
        <PressableScale accessibilityRole="button" feedback="tap" onPress={() => router.back()} style={{ marginTop: 10, paddingHorizontal: 28, paddingVertical: 14, borderRadius: 26, backgroundColor: NIGHT.glass }}>
          <Text style={{ fontFamily: fonts.bodySemi, fontSize: 16, color: NIGHT.text }}>Back to rooms</Text>
        </PressableScale>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: NIGHT.top }}>
      <StatusBar style="light" />
      <NightSky glow />

      {/* header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingTop: 4, gap: 8 }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Leave room" onPress={() => router.back()} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="back" color={NIGHT.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: '#EF4444' }} />
            <Text style={{ fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 0.6, color: '#FCA5A5' }}>LIVE</Text>
            {room?.is_private ? <Icon name="lock" size={12} color={NIGHT.muted} /> : null}
            <Text style={{ fontFamily: fonts.body, fontSize: 12, color: NIGHT.muted }}>{members.length} here</Text>
          </View>
          <Text numberOfLines={2} style={{ fontFamily: fonts.displaySemi, fontSize: 20, lineHeight: 24, color: NIGHT.text }}>{room?.title ?? ' '}</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Room options" onPress={roomMenu} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="more" color={NIGHT.text} />
        </Pressable>
      </View>

      {isHost && room?.is_private && inviteCode ? (
        <Pressable accessibilityRole="button" onPress={share} style={{ marginHorizontal: 20, marginTop: 8, padding: 12, borderRadius: 16, backgroundColor: NIGHT.glass, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Icon name="link" size={18} color={NIGHT.text} />
          <Text style={{ flex: 1, fontFamily: fonts.body, fontSize: 14, color: NIGHT.text }}>
            Invite code <Text style={{ fontFamily: fonts.bodyBold, letterSpacing: 2 }}>{inviteCode}</Text>
          </Text>
          <Text style={{ fontFamily: fonts.bodySemi, fontSize: 14, color: '#FDBA8C' }}>Share</Text>
        </Pressable>
      ) : null}

      <ScrollView contentContainerStyle={{ padding: 20, gap: 22, paddingBottom: 140 }}>
        {/* stage */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 18, justifyContent: 'flex-start' }}>
          {stage.map((m) => (
            <Seat key={m.user_id} m={m} big speaking={isSpeaking(m)} isMe={m.user_id === me} onPress={() => memberMenu(m)} />
          ))}
        </View>

        {isHost && hands.length ? (
          <View style={{ gap: 10, padding: 14, borderRadius: 18, backgroundColor: NIGHT.glass }}>
            <Text style={{ fontFamily: fonts.bodySemi, fontSize: 14, color: NIGHT.text }}>✋ {hands.length} {hands.length === 1 ? 'hand' : 'hands'} raised</Text>
            {hands.map((m) => (
              <View key={m.user_id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Avatar name={m.username} path={m.avatar_path} size={34} />
                <Text style={{ flex: 1, fontFamily: fonts.bodyMedium, fontSize: 15, color: NIGHT.text }} numberOfLines={1}>{m.username}</Text>
                <PressableScale accessibilityRole="button" feedback="tap" onPress={() => id && act(() => setRoomRole(id, m.user_id, 'speaker'))} style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18, backgroundColor: NIGHT.glassOn }}>
                  <Text style={{ fontFamily: fonts.bodySemi, fontSize: 14, color: '#111735' }}>Invite to speak</Text>
                </PressableScale>
              </View>
            ))}
          </View>
        ) : null}

        {listeners.length ? (
          <View style={{ gap: 12 }}>
            <Text style={{ fontFamily: fonts.bodySemi, fontSize: 12, letterSpacing: 0.6, textTransform: 'uppercase', color: NIGHT.muted }}>Listening</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>
              {listeners.map((m) => (
                <Seat key={m.user_id} m={m} speaking={false} isMe={m.user_id === me} onPress={() => memberMenu(m)} />
              ))}
            </View>
          </View>
        ) : null}

        {audio.error ? <Text style={{ fontFamily: fonts.body, fontSize: 13, color: '#FCA5A5' }}>{audio.error}</Text> : null}
      </ScrollView>

      {/* controls */}
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingBottom: 30, paddingTop: 14, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(7,10,26,0.86)' }}>
        <PressableScale accessibilityRole="button" accessibilityLabel={isHost ? 'End room' : 'Leave quietly'} feedback="tap" onPress={leave} style={{ paddingHorizontal: 18, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center', backgroundColor: NIGHT.glass }}>
          <Text style={{ fontFamily: fonts.bodySemi, fontSize: 15, color: '#FCA5A5' }}>{isHost ? 'End' : 'Leave quietly'}</Text>
        </PressableScale>
        <View style={{ flex: 1 }} />
        {myRole === 'listener' ? (
          <RoundControl
            icon="hand"
            label={mine?.hand_raised ? 'Lower hand' : 'Raise hand'}
            on={!!mine?.hand_raised}
            onPress={() => id && act(() => raiseHand(id, !mine?.hand_raised))}
          />
        ) : null}
        {canSpeak ? (
          <RoundControl icon={audio.muted ? 'micOff' : 'mic'} label={audio.muted ? 'Unmute' : 'Mute'} on={!audio.muted} onPress={audio.toggleMute} />
        ) : null}
        {myRole === 'speaker' && mine?.muted_by_host ? (
          <Text style={{ fontFamily: fonts.body, fontSize: 13, color: NIGHT.muted }}>Muted by host</Text>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

function Seat({ m, big, speaking, isMe, onPress }: { m: RoomMember; big?: boolean; speaking: boolean; isMe: boolean; onPress: () => void }) {
  const size = big ? 72 : 52;
  const [pulse] = useState(() => new Animated.Value(0));
  useEffect(() => {
    Animated.spring(pulse, { toValue: speaking ? 1 : 0, useNativeDriver: true, speed: 18, bounciness: 6 }).start();
  }, [pulse, speaking]);
  const label = useMemo(() => (m.role === 'host' ? 'Host' : isMe ? 'You' : null), [m.role, isMe]);
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${m.username}${m.role === 'host' ? ', host' : ''}${speaking ? ', speaking' : ''}`} onPress={onPress} style={{ width: big ? 88 : 66, alignItems: 'center', gap: 6 }}>
      <View style={{ width: size + 12, height: size + 12, alignItems: 'center', justifyContent: 'center' }}>
        <Animated.View
          style={{
            position: 'absolute', width: size + 12, height: size + 12, borderRadius: (size + 12) / 2,
            borderWidth: 3, borderColor: '#A78BFA',
            opacity: pulse,
            transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.06] }) }],
          }}
        />
        <Avatar name={m.username} path={m.avatar_path} size={size} />
        {big && m.muted_by_host ? (
          <View style={{ position: 'absolute', right: 0, bottom: 0, width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1F2937' }}>
            <Icon name="micOff" size={13} color="#FFFFFF" />
          </View>
        ) : null}
        {!big && m.hand_raised ? (
          <View style={{ position: 'absolute', right: -2, top: -2, width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FBBF24' }}>
            <Text style={{ fontSize: 13 }}>✋</Text>
          </View>
        ) : null}
      </View>
      <Text numberOfLines={1} style={{ fontFamily: fonts.bodyMedium, fontSize: big ? 13 : 12, color: NIGHT.text, maxWidth: big ? 88 : 66 }}>{m.username}</Text>
      {label ? <Text style={{ fontFamily: fonts.bodySemi, fontSize: 11, color: m.role === 'host' ? '#FDBA8C' : NIGHT.muted, marginTop: -4 }}>{label}</Text> : null}
    </Pressable>
  );
}

function RoundControl({ icon, label, on, onPress }: { icon: IconName; label: string; on: boolean; onPress: () => void }) {
  return (
    <PressableScale accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected: on }} feedback="select" scaleTo={0.9} onPress={onPress} style={{ width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? NIGHT.glassOn : NIGHT.glass }}>
      <Icon name={icon} size={24} color={on ? '#111735' : '#FFFFFF'} />
    </PressableScale>
  );
}

function showMenu(title: string, options: { label: string; destructive?: boolean; run: () => void }[]) {
  if (Platform.OS === 'ios') {
    const labels = [...options.map((o) => o.label), 'Cancel'];
    const destructive = options.map((o, i) => (o.destructive ? i : -1)).filter((i) => i >= 0);
    ActionSheetIOS.showActionSheetWithOptions(
      { title, options: labels, cancelButtonIndex: labels.length - 1, destructiveButtonIndex: destructive },
      (i) => {
        if (i < options.length) options[i].run();
      },
    );
  } else {
    Alert.alert(title, undefined, [...options.map((o) => ({ text: o.label, style: o.destructive ? ('destructive' as const) : ('default' as const), onPress: o.run })), { text: 'Cancel', style: 'cancel' as const }]);
  }
}
