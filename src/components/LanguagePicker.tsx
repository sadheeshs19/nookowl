import { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LANGUAGES } from '../lib/languages';
import { fonts } from '../theme/colors';
import { useTheme } from '../theme/ThemeProvider';
import { Icon } from './icons';
import { Button, T } from './ui';

/** A dropdown field that opens a searchable list where several languages can be ticked. */
export function LanguagePicker({
  label,
  value,
  onChange,
  max = 5,
}: {
  label: string;
  value: string[];
  onChange: (v: string[]) => void;
  max?: number;
}) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    const all = s ? LANGUAGES.filter((l) => l.toLowerCase().includes(s)) : LANGUAGES;
    // Ticked ones first so they're easy to untick.
    return [...all.filter((l) => value.includes(l)), ...all.filter((l) => !value.includes(l))];
  }, [q, value]);

  const toggle = (l: string) => {
    if (value.includes(l)) onChange(value.filter((x) => x !== l));
    else if (value.length < max) onChange([...value, l]);
  };

  const close = () => {
    setOpen(false);
    setQ('');
  };

  return (
    <View style={{ gap: 6 }}>
      <T variant="label">{label}</T>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value.length ? value.join(', ') : 'none chosen'}`}
        accessibilityHint="Opens the list of languages"
        onPress={() => setOpen(true)}
        style={{
          minHeight: 48,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: colors.border2,
          backgroundColor: colors.surface,
          paddingHorizontal: 14,
          paddingVertical: 10,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <Text
          numberOfLines={2}
          style={{ flex: 1, fontFamily: fonts.body, fontSize: 16, color: value.length ? colors.text : colors.muted }}
        >
          {value.length ? value.join(', ') : 'Choose languages'}
        </Text>
        <Icon name="chevronDown" size={20} color={colors.muted} />
      </Pressable>
      <T variant="small" muted>Pick up to {max}.</T>

      <Modal visible={open} animationType="slide" presentationStyle="pageSheet" onRequestClose={close}>
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
          <View style={{ padding: 16, gap: 12, borderBottomWidth: 1, borderBottomColor: colors.border }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <T variant="title" style={{ flex: 1, fontSize: 20 }}>Languages</T>
              <T variant="small" muted>{value.length}/{max} chosen</T>
            </View>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                minHeight: 44,
                borderRadius: 12,
                backgroundColor: colors.surface,
                paddingHorizontal: 12,
              }}
            >
              <Icon name="search" size={18} color={colors.muted} />
              <TextInput
                value={q}
                onChangeText={setQ}
                placeholder="Search languages"
                placeholderTextColor={colors.muted}
                autoCorrect={false}
                accessibilityLabel="Search languages"
                style={{ flex: 1, fontFamily: fonts.body, fontSize: 16, color: colors.text }}
              />
            </View>
          </View>

          <FlatList
            data={list}
            keyExtractor={(l) => l}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={<T muted style={{ padding: 24, textAlign: 'center' }}>No language matches “{q}”.</T>}
            renderItem={({ item }) => {
              const on = value.includes(item);
              const full = !on && value.length >= max;
              return (
                <Pressable
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: on, disabled: full }}
                  onPress={() => toggle(item)}
                  style={{
                    minHeight: 52,
                    paddingHorizontal: 16,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    opacity: full ? 0.4 : 1,
                    borderBottomWidth: 1,
                    borderBottomColor: colors.border,
                  }}
                >
                  <Text style={{ flex: 1, fontFamily: on ? fonts.bodySemi : fonts.body, fontSize: 16, color: colors.text }}>{item}</Text>
                  <View
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 6,
                      borderWidth: 2,
                      borderColor: on ? colors.accent : colors.border2,
                      backgroundColor: on ? colors.accent : 'transparent',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {on ? <Icon name="check" size={16} color={colors.onAccent} /> : null}
                  </View>
                </Pressable>
              );
            }}
          />

          <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: colors.border }}>
            <Button title={value.length ? `Done (${value.length})` : 'Done'} onPress={close} />
          </View>
        </SafeAreaView>
      </Modal>
    </View>
  );
}
