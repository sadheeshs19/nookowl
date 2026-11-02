import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import { useEffect, useState } from 'react';

const FILES = {
  hoot: require('../../assets/sounds/hoot.m4a'),
  connect: require('../../assets/sounds/connect.m4a'),
};

export type SoundName = keyof typeof FILES;

const KEY = 'nooks.sounds';
let enabled = true;
const listeners = new Set<(v: boolean) => void>();
AsyncStorage.getItem(KEY)
  .then((v) => {
    if (v === 'off') {
      enabled = false;
      listeners.forEach((l) => l(false));
    }
  })
  .catch(() => {});

const players: Partial<Record<SoundName, AudioPlayer>> = {};

/**
 * Plays a short, quiet sound. On iPhone the ring/silent switch silences it
 * (except during a call, when the call audio is active).
 */
export function playSound(name: SoundName) {
  if (!enabled) return;
  try {
    let p = players[name];
    if (!p) {
      p = createAudioPlayer(FILES[name]);
      p.volume = 0.6;
      players[name] = p;
    }
    p.seekTo(0).catch(() => {});
    p.play();
  } catch {
    // sounds are a nicety; never break anything
  }
}

/** The Sounds on/off setting. */
export function useSoundsSetting(): [boolean, (v: boolean) => void] {
  const [on, setOn] = useState(enabled);
  useEffect(() => {
    listeners.add(setOn);
    return () => {
      listeners.delete(setOn);
    };
  }, []);
  const set = (v: boolean) => {
    enabled = v;
    listeners.forEach((l) => l(v));
    AsyncStorage.setItem(KEY, v ? 'on' : 'off').catch(() => {});
  };
  return [on, set];
}
