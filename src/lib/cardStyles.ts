export type CardStyle = 'plain' | 'sunset' | 'ocean' | 'forest' | 'night' | 'rose' | 'gold';

/** Colours for coloured topic cards: a top-left to bottom-right gradient. */
export const CARD_STYLES: { key: CardStyle; label: string; from: string; to: string }[] = [
  { key: 'plain', label: 'Plain', from: '', to: '' },
  { key: 'sunset', label: 'Sunset', from: '#F97316', to: '#DB2777' },
  { key: 'ocean', label: 'Ocean', from: '#1E40AF', to: '#0E9F9A' },
  { key: 'forest', label: 'Forest', from: '#166534', to: '#4D9A3B' },
  { key: 'night', label: 'Night sky', from: '#0A0E1F', to: '#3B2F7A' },
  { key: 'rose', label: 'Rose', from: '#EC4899', to: '#7C3AED' },
  { key: 'gold', label: 'Gold', from: '#B45309', to: '#F2B33D' },
];

export function cardStyle(key: string | null | undefined) {
  return CARD_STYLES.find((s) => s.key === key && s.key !== 'plain') ?? null;
}

/** Mood emojis people can put on a topic. */
export const MOODS = ['☕', '🎧', '📚', '🌙', '✈️', '🏏', '⚽', '🎬', '🎮', '💼', '🍜', '💭', '😂', '🌧️'];
