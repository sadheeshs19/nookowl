import { requestRecordingPermissionsAsync } from 'expo-audio';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ChannelProfileType,
  ClientRoleType,
  createAgoraRtcEngine,
  type IRtcEngine,
  type IRtcEngineEventHandler,
} from 'react-native-agora';
import { getAgoraToken } from './api';

export type AgoraState = 'idle' | 'joining' | 'waiting' | 'connected' | 'left' | 'error';

/**
 * Joins the Agora voice channel for a call once `active` is true.
 * `connectedAt` is set when the other person's audio arrives.
 */
export function useAgoraCall(callId: string | undefined, active: boolean, onRemoteLeft: () => void) {
  const engine = useRef<IRtcEngine | null>(null);
  const [state, setState] = useState<AgoraState>('idle');
  /** The caller's call minutes when the call started (seconds). */
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [connectedAt, setConnectedAt] = useState<number | null>(null);
  const [muted, setMuted] = useState(false);
  const [speaker, setSpeaker] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** 0..1: how loudly the other person is talking right now (for the speaking glow). */
  const [remoteLevel, setRemoteLevel] = useState(0);
  const remoteLeft = useRef(onRemoteLeft);
  useEffect(() => {
    remoteLeft.current = onRemoteLeft;
  });

  useEffect(() => {
    if (!callId || !active) return;
    let cancelled = false;

    const handler: IRtcEngineEventHandler = {
      onJoinChannelSuccess: () => setState('waiting'),
      onUserJoined: () => {
        setState('connected');
        setConnectedAt((t) => t ?? Date.now());
      },
      onUserOffline: () => remoteLeft.current(),
      // The token only lasts as long as the caller's minutes: when it runs out, the call ends.
      onRequestToken: () => remoteLeft.current(),
      onAudioVolumeIndication: (_conn, speakers) => {
        // Remote speakers have a non-zero uid; the local user is reported as uid 0.
        const remote = speakers.filter((sp) => (sp.uid ?? 0) !== 0);
        if (!remote.length) return;
        const v = Math.max(...remote.map((sp) => sp.volume ?? 0));
        setRemoteLevel(Math.min(1, v / 160));
      },
      onError: (code, msg) => {
        setError(`${code}: ${msg}`);
      },
    };

    (async () => {
      setState('joining');
      try {
        const perm = await requestRecordingPermissionsAsync();
        if (!perm.granted) throw new Error('Microphone permission is needed for calls.');
        const { token, channel, appId, secondsLeft: allowed } = await getAgoraToken(callId);
        if (cancelled) return;
        setSecondsLeft(allowed);
        const rtc = createAgoraRtcEngine();
        engine.current = rtc;
        rtc.initialize({
          appId: appId || process.env.EXPO_PUBLIC_AGORA_APP_ID || '',
          channelProfile: ChannelProfileType.ChannelProfileCommunication,
        });
        rtc.registerEventHandler(handler);
        rtc.enableAudio();
        rtc.enableAudioVolumeIndication(200, 3, true);
        rtc.setEnableSpeakerphone(false);
        rtc.joinChannel(token, channel, 0, {
          clientRoleType: ClientRoleType.ClientRoleBroadcaster,
          publishMicrophoneTrack: true,
          autoSubscribeAudio: true,
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not connect the call.');
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
      setState('left');
    };
  }, [callId, active]);

  const toggleMute = useCallback(() => {
    setMuted((m) => {
      engine.current?.muteLocalAudioStream(!m);
      return !m;
    });
  }, []);

  const toggleSpeaker = useCallback(() => {
    setSpeaker((s) => {
      engine.current?.setEnableSpeakerphone(!s);
      return !s;
    });
  }, []);

  return { state, connectedAt, secondsLeft, muted, speaker, error, remoteLevel, toggleMute, toggleSpeaker };
}
