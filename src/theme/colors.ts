export type ThemeColors = {
  bg: string;
  card: string;
  surface: string;
  chatBg: string;
  border: string;
  border2: string;
  dashed: string;
  text: string;
  muted: string;
  accent: string;
  accentText: string;
  onAccent: string;
  avatarBg: string;
  avatarFg: string;
  online: string;
  like: string;
  danger: string;
  chipOnBg: string;
  chipOnFg: string;
  noticeBg: string;
  noticeFg: string;
  warnBg: string;
  warnFg: string;
  callBg: string;
  callPanel: string;
  overlay: string;
  /** Soft grey fill for inputs, chips, secondary buttons and segmented controls. */
  fill: string;
  /** The selected segment in a segmented control. */
  segmentOn: string;
  /** Switch track when off. */
  toggleOff: string;
};

export const light: ThemeColors = {
  bg: '#F2F2F7',
  card: '#FFFFFF',
  surface: '#F2F2F7',
  chatBg: '#F2F2F7',
  border: 'rgba(60,60,67,0.12)',
  border2: 'rgba(60,60,67,0.2)',
  dashed: '#9AA0AE',
  text: '#16181D',
  muted: '#5B6070',
  accent: '#C2410C',
  accentText: '#C2410C',
  onAccent: '#FFFFFF',
  avatarBg: '#FDEBE2',
  avatarFg: '#9A3412',
  online: '#15803D',
  like: '#DC2626',
  danger: '#DC2626',
  chipOnBg: '#16181D',
  chipOnFg: '#FFFFFF',
  noticeBg: '#FDF2EC',
  noticeFg: '#7C2D12',
  warnBg: '#FEF3C7',
  warnFg: '#78350F',
  callBg: '#F2F2F7',
  callPanel: '#FFFFFF',
  overlay: 'rgba(0,0,0,0.4)',
  fill: 'rgba(118,118,128,0.12)',
  segmentOn: '#FFFFFF',
  toggleOff: '#E3E3E8',
};

export const dark: ThemeColors = {
  bg: '#0A0E1F',
  card: '#151A30',
  surface: '#1E2440',
  chatBg: '#080B19',
  border: 'rgba(130,140,200,0.22)',
  border2: 'rgba(130,140,200,0.34)',
  dashed: '#5B6070',
  text: '#F3F4F6',
  muted: '#A6ACC8',
  accent: '#C2410C',
  accentText: '#FB923C',
  onAccent: '#FFFFFF',
  avatarBg: '#2B2140',
  avatarFg: '#FDBA8C',
  online: '#4ADE80',
  like: '#F87171',
  danger: '#EF4444',
  chipOnBg: '#F3F4F6',
  chipOnFg: '#16181D',
  noticeBg: '#2A1C24',
  noticeFg: '#FDBA8C',
  warnBg: '#3A2E10',
  warnFg: '#FDE68A',
  callBg: '#0A0E1F',
  callPanel: '#151A30',
  overlay: 'rgba(0,0,0,0.6)',
  fill: 'rgba(130,140,200,0.16)',
  segmentOn: '#3A4170',
  toggleOff: '#2A3052',
};

export const fonts = {
  display: 'BricolageGrotesque_700Bold',
  displaySemi: 'BricolageGrotesque_600SemiBold',
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodySemi: 'Inter_600SemiBold',
  bodyBold: 'Inter_700Bold',
};
