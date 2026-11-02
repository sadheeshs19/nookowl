import { Text, View } from 'react-native';
import type { Gender } from '../lib/gender';
import { genderLabel } from '../lib/gender';
import { fonts } from '../theme/colors';
import { Icon } from './icons';

const TINT: Record<'woman' | 'man' | 'nonbinary', string> = {
  woman: '#D9578E',
  man: '#3D86D6',
  nonbinary: '#8E6BD1',
};

/** A small pill with a gender symbol and age, like "♀ 27". Shows nothing if both are hidden. */
export function GenderAge({ gender, age, size = 'small' }: { gender?: Gender | null; age?: number | null; size?: 'small' | 'large' }) {
  const g = gender === 'woman' || gender === 'man' || gender === 'nonbinary' ? gender : null;
  if (!g && !age) return null;
  const color = g ? TINT[g] : '#8A8A8A';
  const big = size === 'large';
  const label = [age ? `${age}` : null, genderLabel(gender)].filter(Boolean).join(', ');
  return (
    <View
      accessible
      accessibilityLabel={label}
      style={{
        flexDirection: 'row', alignItems: 'center', gap: 3, alignSelf: 'center',
        paddingHorizontal: big ? 9 : 7, paddingVertical: big ? 3 : 2, borderRadius: 999,
        backgroundColor: color + '22',
      }}
    >
      {g ? <Icon name={g === 'woman' ? 'female' : g === 'man' ? 'male' : 'nonbinary'} size={big ? 19 : 16} color={color} /> : null}
      {age ? <Text style={{ fontFamily: fonts.bodySemi, fontSize: big ? 14 : 12, color }}>{age}</Text> : null}
    </View>
  );
}
