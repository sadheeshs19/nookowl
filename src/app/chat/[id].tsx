import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from '../../components/icons';
import { VoiceNote } from '../../components/VoiceNote';
import { Avatar, Button, T } from '../../components/ui';
import {
  block,
  getConversation,
  getProfile,
  listMessages,
  report,
  sendText,
  sendVoiceNote,
  setConversationStatus,
  startCall,
} from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { useCredits } from '../../lib/credits';
import { clock } from '../../lib/format';
import type { Conversation, Message, Profile } from '../../lib/types';
import { useRealtime } from '../../lib/useRealtime';
import { fonts } from '../../theme/colors';
import { useTheme } from '../../theme/ThemeProvider';

export default function Chat() {
  const { colors } = useTheme();
  const { session } = useAuth();
  const { ensureCanCall } = useCredits();
  const me = session?.user.id;
  const { id, topic } = useLocalSearchParams<{ id: string; topic?: string }>();
  const [conv, setConv] = useState<Conversation | null>(null);
  const [other, setOther] = useState<Profile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const rec = useAudioRecorderState(recorder, 200);

  const load = useCallback(async () => {
    if (!id || !me) return;
    const c = await getConversation(id);
    if (!c) return;
    setConv(c);
    const otherId = c.user_a === me ? c.user_b : c.user_a;
    const [p, msgs] = await Promise.all([getProfile(otherId), listMessages(id)]);
    setOther(p);
    setMessages(msgs);
  }, [id, me]);

  useEffect(() => {
    // Fetching on mount; state is only set after the network calls resolve.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load().catch(() => {});
  }, [load]);

  useRealtime(
    `chat-${id}`,
    [
      { table: 'messages', event: 'INSERT', filter: `conversation_id=eq.${id}` },
      { table: 'conversations', event: 'UPDATE', filter: `id=eq.${id}` },
    ],
    (p) => {
      if (p.table === 'messages') {
        setMessages((list) => (list.some((m) => m.id === p.new.id) ? list : [...list, p.new as Message]));
      } else {
        setConv(p.new as Conversation);
      }
    },
    !!id,
  );

  const isRequestToMe = conv?.status === 'request' && conv.created_by !== me;
  const isMyPendingRequest = conv?.status === 'request' && conv.created_by === me;
  const canCall = conv?.status === 'active';

  const send = async () => {
    if (!id || !draft.trim()) return;
    setSending(true);
    try {
      await sendText(id, draft);
      setDraft('');
      load();
    } catch (e) {
      Alert.alert('Message not sent', e instanceof Error ? e.message : '');
    } finally {
      setSending(false);
    }
  };

  const startRecording = async () => {
    const perm = await requestRecordingPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Microphone needed', 'Allow microphone access in Settings to send voice notes.');
      return;
    }
    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    await recorder.prepareToRecordAsync();
    recorder.record();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  };

  const stopRecording = async () => {
    if (!rec.isRecording) return;
    const duration = rec.durationMillis;
    await recorder.stop();
    await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
    const uri = recorder.uri;
    if (!uri || !id) return;
    if (duration < 1000) {
      Alert.alert('Too short', 'Hold the mic button to record, then let go to send.');
      return;
    }
    setSending(true);
    try {
      await sendVoiceNote(id, uri, duration);
      load();
    } catch (e) {
      Alert.alert('Voice note not sent', e instanceof Error ? e.message : '');
    } finally {
      setSending(false);
    }
  };

  const call = async () => {
    if (!other) return;
    if (!(await ensureCanCall())) return;
    try {
      const c = await startCall(other.id);
      router.push({ pathname: '/call/[id]', params: { id: c.id, name: other.username } });
    } catch (e) {
      Alert.alert('Could not call', e instanceof Error ? e.message : '');
    }
  };

  const more = () => {
    if (!other) return;
    Alert.alert(other.username, undefined, [
      {
        text: 'Report',
        onPress: () =>
          report({ userId: other.id }, 'Reported from chat')
            .then(() => Alert.alert('Thanks', 'Our team will review this.'))
            .catch(() => {}),
      },
      {
        text: 'Block',
        style: 'destructive',
        onPress: () =>
          block(other.id)
            .then(() => router.back())
            .catch(() => {}),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 8, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.back()} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="back" color={colors.text} />
        </Pressable>
        <Avatar name={other?.username} path={other?.avatar_path} />
        <View style={{ flex: 1 }}>
          <T variant="label">{other?.username ?? ' '}</T>
          {other?.city ? <T variant="small" muted>{other.city}</T> : null}
        </View>
        {canCall ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Call ${other?.username ?? ''}`}
            onPress={call}
            style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' }}
          >
            <Icon name="phone" size={20} color={colors.onAccent} />
          </Pressable>
        ) : null}
        <Pressable accessibilityRole="button" accessibilityLabel="More options: report or block" onPress={more} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="more" color={colors.text} />
        </Pressable>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {topic ? (
          <View style={{ alignSelf: 'center', marginTop: 10, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: colors.border }}>
            <T variant="small" muted numberOfLines={1}>About: {topic}</T>
          </View>
        ) : null}

        <FlatList
          style={{ flex: 1, backgroundColor: colors.chatBg }}
          data={[...messages].reverse()}
          inverted
          keyExtractor={(m) => m.id}
          contentContainerStyle={{ padding: 16, gap: 10 }}
          renderItem={({ item }) => {
            const mine = item.sender_id === me;
            return (
              <View
                style={{
                  alignSelf: mine ? 'flex-end' : 'flex-start',
                  maxWidth: '78%',
                  paddingHorizontal: item.audio_path ? 8 : 14,
                  paddingVertical: item.audio_path ? 8 : 10,
                  borderRadius: 18,
                  borderBottomRightRadius: mine ? 6 : 18,
                  borderBottomLeftRadius: mine ? 18 : 6,
                  backgroundColor: mine ? colors.accent : colors.card,
                  borderWidth: mine ? 0 : 1,
                  borderColor: colors.border,
                }}
              >
                {item.audio_path ? (
                  <VoiceNote path={item.audio_path} durationMs={item.audio_ms ?? 0} mine={mine} />
                ) : (
                  <Text style={{ fontFamily: fonts.body, fontSize: 15, lineHeight: 21, color: mine ? colors.onAccent : colors.text }}>
                    {item.body}
                  </Text>
                )}
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={{ transform: [{ scaleY: -1 }], alignItems: 'center', padding: 24 }}>
              <T muted style={{ textAlign: 'center' }}>Say hello. Your first message arrives as a request they can accept.</T>
            </View>
          }
        />

        {isRequestToMe ? (
          <View style={{ padding: 16, gap: 10, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.noticeBg }}>
            <T style={{ color: colors.noticeFg }}>{other?.username ?? 'Someone'} wants to chat. Accept to reply; ignoring is private.</T>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Button
                kind="secondary"
                title="Ignore"
                style={{ flex: 1 }}
                onPress={async () => {
                  if (id) await setConversationStatus(id, 'ignored').catch(() => {});
                  router.back();
                }}
              />
              <Button
                title="Accept"
                style={{ flex: 1 }}
                onPress={async () => {
                  if (id) await setConversationStatus(id, 'active').catch(() => {});
                  load();
                }}
              />
            </View>
          </View>
        ) : (
          <View style={{ gap: 6, padding: 10, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.bg }}>
            {isMyPendingRequest ? (
              <T variant="small" muted style={{ textAlign: 'center' }}>Waiting for {other?.username ?? 'them'} to accept your message request.</T>
            ) : null}
            {rec.isRecording ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 46, paddingHorizontal: 12 }}>
                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.danger }} />
                <T style={{ flex: 1 }}>Recording {clock(rec.durationMillis / 1000)} · let go to send</T>
              </View>
            ) : null}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {!rec.isRecording ? (
                <TextInput
                  accessibilityLabel="Message"
                  value={draft}
                  onChangeText={setDraft}
                  placeholder="Message…"
                  placeholderTextColor={colors.muted}
                  multiline
                  maxLength={1000}
                  style={{
                    flex: 1,
                    minHeight: 44,
                    maxHeight: 120,
                    borderRadius: 22,
                    borderWidth: 1,
                    borderColor: colors.border2,
                    backgroundColor: colors.chatBg,
                    paddingHorizontal: 16,
                    paddingTop: 11,
                    fontFamily: fonts.body,
                    fontSize: 15,
                    color: colors.text,
                  }}
                />
              ) : (
                <View style={{ flex: 1 }} />
              )}
              {sending ? (
                <ActivityIndicator color={colors.accent} style={{ width: 44 }} />
              ) : draft.trim() ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Send"
                  onPress={send}
                  style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' }}
                >
                  <Icon name="send" size={20} color={colors.onAccent} />
                </Pressable>
              ) : (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Hold to record a voice note"
                  onPressIn={startRecording}
                  onPressOut={stopRecording}
                  style={{
                    width: rec.isRecording ? 56 : 44,
                    height: rec.isRecording ? 56 : 44,
                    borderRadius: 28,
                    backgroundColor: rec.isRecording ? colors.danger : colors.accent,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon name="mic" size={20} color={colors.onAccent} />
                </Pressable>
              )}
            </View>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
