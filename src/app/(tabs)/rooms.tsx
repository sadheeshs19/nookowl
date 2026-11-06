import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Animated, Pressable, RefreshControl, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTabBarSpace } from '../../components/GlassTabBar';
import { Icon } from '../../components/icons';
import { CompactTitleBar, useCollapsingTitle } from '../../components/LargeTitle';
import { RowSkeletons } from '../../components/Skeleton';
import { Avatar, Button, Empty, PressableScale, T } from '../../components/ui';
import { findRoomByCode, joinRoom, listLiveRooms, type LiveRoom } from '../../lib/api';
import { haptic } from '../../lib/haptics';
import { useRealtime } from '../../lib/useRealtime';
import { fonts } from '../../theme/colors';
import { useTheme } from '../../theme/ThemeProvider';

export default function Rooms() {
  const { colors } = useTheme();
  const { scrollY, onScroll } = useCollapsingTitle();
  const tabSpace = useTabBarSpace(20);
  const [rooms, setRooms] = useState<LiveRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [code, setCode] = useState('');

  const load = useCallback(async () => {
    try {
      setRooms(await listLiveRooms());
    } catch (e) {
      Alert.alert('Could not load rooms', e instanceof Error ? e.message : '');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
      const t = setInterval(load, 20000);
      return () => clearInterval(t);
    }, [load]),
  );
  useRealtime('rooms-list', [{ table: 'rooms' }], load);

  const open = async (room: LiveRoom) => {
    try {
      if (!room.i_am_in) await joinRoom(room.id);
      haptic.tap();
      router.push({ pathname: '/room/[id]', params: { id: room.id } });
    } catch (e) {
      Alert.alert('Can’t join', e instanceof Error ? e.message : '');
    }
  };

  const joinByCode = async () => {
    const c = code.trim();
    if (c.length < 4) return;
    try {
      const id = await findRoomByCode(c);
      if (!id) {
        Alert.alert('No room found', 'Check the code with the host. Codes stop working when the room ends.');
        return;
      }
      await joinRoom(id, c);
      setCode('');
      router.push({ pathname: '/room/[id]', params: { id } });
    } catch (e) {
      Alert.alert('Can’t join', e instanceof Error ? e.message : '');
    }
  };

  const header = (
    <View style={{ gap: 14, marginBottom: 6 }}>
      <View style={{ gap: 6 }}>
        <T variant="title">Rooms</T>
        <T variant="small" muted>Live voice rooms. Listen in, raise your hand to speak, or start your own.</T>
      </View>
      <Button title="Start a room" icon={<Icon name="mic" size={18} color={colors.onAccent} />} onPress={() => router.push('/room/new')} />
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
        <TextInput
          value={code}
          onChangeText={(v) => setCode(v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
          placeholder="Have an invite code?"
          placeholderTextColor={colors.muted}
          autoCapitalize="characters"
          style={{
            flex: 1, minHeight: 46, borderRadius: 14, paddingHorizontal: 14, backgroundColor: colors.card,
            fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.text, letterSpacing: code ? 2 : 0,
          }}
          onSubmitEditing={joinByCode}
        />
        {code.length >= 4 ? <Button kind="secondary" title="Join" onPress={joinByCode} /> : null}
      </View>
    </View>
  );

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.bg }}>
      <Animated.FlatList
        data={rooms}
        keyExtractor={(r) => r.id}
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ padding: 20, paddingTop: 8, gap: 12, paddingBottom: tabSpace }}
        ListHeaderComponent={header}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.accent} colors={[colors.accent]} />}
        ListEmptyComponent={
          loading ? (
            <RowSkeletons count={3} inset={0} />
          ) : (
            <Empty title="No live rooms right now" body="Start one about anything: a film, a language, a late-night chat. People can listen in and raise a hand to talk." />
          )
        }
        renderItem={({ item }) => <RoomCard room={item} onPress={() => open(item)} />}
      />
      <CompactTitleBar title="Rooms" scrollY={scrollY} />
    </SafeAreaView>
  );
}

function RoomCard({ room, onPress }: { room: LiveRoom; onPress: () => void }) {
  const { colors } = useTheme();
  const people = Number(room.speaker_count) + Number(room.listener_count);
  return (
    <PressableScale accessibilityRole="button" accessibilityLabel={`${room.title}, hosted by ${room.host_username}, ${people} in the room`} onPress={onPress} scaleTo={0.98} style={{ borderRadius: 22, padding: 16, gap: 12, backgroundColor: colors.card }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, backgroundColor: 'rgba(239,68,68,0.14)' }}>
          <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: '#EF4444' }} />
          <Text style={{ fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 0.6, color: '#EF4444' }}>LIVE</Text>
        </View>
        {room.is_private ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Icon name="lock" size={13} color={colors.muted} />
            <T variant="small" muted>Private</T>
          </View>
        ) : null}
        {room.language ? <T variant="small" muted>{room.language}</T> : null}
        <View style={{ flex: 1 }} />
        {room.i_am_in ? <T variant="small" style={{ color: colors.accentText }}>You’re in</T> : null}
      </View>
      <Text style={{ fontFamily: fonts.displaySemi, fontSize: 20, lineHeight: 25, color: colors.text }}>{room.title}</Text>
      {room.tag ? <Text style={{ fontFamily: fonts.bodySemi, fontSize: 13, color: colors.accentText, marginTop: -6 }}>#{room.tag}</Text> : null}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ flexDirection: 'row' }}>
          {(room.speaker_avatars.length ? room.speaker_avatars : [room.host_avatar]).slice(0, 3).map((a, i) => (
            <View key={i} style={{ marginLeft: i ? -10 : 0, borderRadius: 18, borderWidth: 2, borderColor: colors.card }}>
              <Avatar name={i === 0 ? room.host_username : ' '} path={a} size={32} />
            </View>
          ))}
        </View>
        <View style={{ flex: 1 }}>
          <T variant="small" numberOfLines={1}>Hosted by {room.host_username}</T>
          <T variant="small" muted>
            {room.speaker_count} speaking · {room.listener_count} listening
          </T>
        </View>
        <Icon name="chevronRight" size={18} color={colors.muted} />
      </View>
    </PressableScale>
  );
}
