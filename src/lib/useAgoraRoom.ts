import { requestRecordingPermissionsAsync } from 'expo-audio';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ChannelProfileType,
  ClientRoleType,
  createAgoraRtcEngine,
  type IRtcEngine,
  type IRtcEngineEventHandler,
} from 'react-native-agora';
import { getRoomToken } from './api';

export type RoomAudioState = 'idle' | 'joining' | 'joined' | 'error';

/**
 * Joins a voice room's audio. Speakers (and the host) publish their mic; listeners only
 * hear. When `canSpeak` changes (brought up to speak, moved back, muted by the host),
 * we fetch a fresh token for the new role and switch over without leaving the room.
 * `speaking` holds the Agora uids that are talking right now (0 = me).
 */
export function useAgoraRoom(roomId: string | undefined, active: boolean, canSpeak: boolean) {
  const engine = useRef<IRtcEngine | null>(null);
  const [state, setState] = useState<RoomAudioState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [speaking, setSpeaking] = useState<Set<number>>(new Set());
  const [myUid, setMyUid] = useState<number | null>(null);
  const joinedAsSpeaker = useRef<boolean | null>(null);

  useEffect(() => {
    if (!roomId || !active) return;
    let cancelled = false;

    const handler: IRtcEngineEventHandler = {
      onJoinChannelSuccess: () => setState('joined'),
      onAudioVolumeIndication: (_conn, speakers) => {
        const now = new Set<number>();
        for (const sp of speakers) if ((sp.volume ?? 0) > 25) now.add(sp.uid ?? 0);
        setSpeaking(now);
      },
      onRequestToken: async () => {
        try {
          const t = await getRoomToken(roomId);
          engine.current?.renewToken(t.token);
        } catch {
          // the room probably ended; the screen notices on its next heartbeat
        }
      },
      onError: (code, msg) => setError(`${code}: ${msg}`),
    };

    (async () => {
      setState('joining');
      try {
        const t = await getRoomToken(roomId);
        if (t.canSpeak) {
          const perm = await requestRecordingPermissionsAsync();
          if (!perm.granted) throw new Error('Microphone permission is needed to speak in rooms.');
        }
        if (cancelled) return;
        setMyUid(t.uid);
        const rtc = createAgoraRtcEngine();
        engine.current = rtc;
        rtc.initialize({
          appId: t.appId || process.env.EXPO_PUBLIC_AGORA_APP_ID || '',
          channelProfile: ChannelProfileType.ChannelProfileLiveBroadcasting,
        });
        rtc.registerEventHandler(handler);
        rtc.enableAudio();
        rtc.enableAudioVolumeIndication(300, 3, true);
        rtc.setDefaultAudioRouteToSpeakerphone(true);
        joinedAsSpeaker.current = t.canSpeak;
        rtc.joinChannel(t.token, t.channel, t.uid, {
          clientRoleType: t.canSpeak ? ClientRoleType.ClientRoleBroadcaster : ClientRoleType.ClientRoleAudience,
          publishMicrophoneTrack: t.canSpeak,
          autoSubscribeAudio: true,
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not join the room audio.');
        setState('error');
      }
    })();

    return () => {
      cancelled = true;
      const rtc = engine.current;
      engine.current = null;
      if (rtc) {
        try {
          rtc.unregisterEventHandler(handler);
          rtc.leaveChannel();
          rtc.release();
        } catch {
          // already gone
        }
      }
      setState('idle');
    };
  }, [roomId, active]);

  // Role changed while in the room: new token, new client role.
  useEffect(() => {
    const rtc = engine.current;
    if (!roomId || !rtc || state !== 'joined' || joinedAsSpeaker.current === canSpeak) return;
    let cancelled = false;
    (async () => {
      try {
        if (canSpeak) {
          const perm = await requestRecordingPermissionsAsync();
          if (!perm.granted) throw new Error('Allow the microphone to speak in rooms.');
        }
        const t = await getRoomToken(roomId);
        if (cancelled || !engine.current) return;
        engine.current.renewToken(t.token);
        engine.current.setClientRole(t.canSpeak ? ClientRoleType.ClientRoleBroadcaster : ClientRoleType.ClientRoleAudience);
        engine.current.updateChannelMediaOptions({ publishMicrophoneTrack: t.canSpeak });
        engine.current.muteLocalAudioStream(false);
        joinedAsSpeaker.current = t.canSpeak;
        setMuted(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not switch your microphone.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [roomId, canSpeak, state]);

  const toggleMute = useCallback(() => {
    setMuted((m) => {
      engine.current?.muteLocalAudioStream(!m);
      return !m;
    });
  }, []);

  return { state, error, muted, speaking, myUid, toggleMute };
}
