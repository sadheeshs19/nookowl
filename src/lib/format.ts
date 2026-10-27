export function timeAgo(iso: string): string {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d === 1) return 'Yesterday';
  if (d < 7) return `${d}d`;
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

export function minutesLeft(iso: string): string {
  const m = Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 60000));
  return `${m} min`;
}

export function clock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

export function initial(name: string | null | undefined): string {
  return (name?.trim()?.[0] ?? '?').toUpperCase();
}

/** "#French, language exchange" -> ["French", "LanguageExchange"] */
export function parseTags(input: string): string[] {
  return input
    .split(/[,#\n]/)
    .map((t) =>
      t
        .trim()
        .split(/\s+/)
        .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : ''))
        .join('')
        .replace(/[^A-Za-z0-9]/g, ''),
    )
    .filter((t) => t.length >= 2)
    .slice(0, 3);
}
