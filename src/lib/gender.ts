export type Gender = 'woman' | 'man' | 'nonbinary' | 'unspecified';
export type WhoCanCall = 'everyone' | 'women' | 'chatted';

export const GENDERS: { key: Gender; label: string }[] = [
  { key: 'woman', label: 'Woman' },
  { key: 'man', label: 'Man' },
  { key: 'nonbinary', label: 'Non-binary' },
  { key: 'unspecified', label: 'Prefer not to say' },
];

/** What others see on a profile; nothing for "prefer not to say". */
export function genderLabel(g: Gender | null | undefined): string | null {
  if (g === 'woman') return 'Woman';
  if (g === 'man') return 'Man';
  if (g === 'nonbinary') return 'Non-binary';
  return null;
}

export const WHO_CAN_CALL: { key: WhoCanCall; label: string; hint: string }[] = [
  { key: 'everyone', label: 'Everyone', hint: 'Anyone can send you call requests.' },
  { key: 'women', label: 'Women', hint: 'Only women can send you call requests or call you. Others don’t see you in People.' },
  { key: 'chatted', label: 'Chats', hint: 'Only people you already chat with can call you. You’re hidden from People.' },
];
