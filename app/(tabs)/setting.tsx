import { getAppTheme } from '@/constants/appTheme';
import { useAppTheme } from '@/hooks/useAppTheme';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type ThemePreference = 'system' | 'light' | 'dark';

const THEME_OPTIONS = [
  { label: 'ብርሃን', value: 'light' as const },
  { label: 'ተቀያሪ', value: 'system' as const },
  { label: 'ጸልማት', value: 'dark' as const },
];

export default function SettingScreen() {
  const { colorScheme, preference, setPreference } = useAppTheme() as {
    colorScheme: 'light' | 'dark';
    preference: ThemePreference;
    setPreference: (preference: ThemePreference) => void;
  };
  const theme = getAppTheme(colorScheme);

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.content}>
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>ልጪ</Text>
          <View style={[styles.segmentedControl, { backgroundColor: theme.mutedSurface }]}>
            {THEME_OPTIONS.map((option) => {
              const selected = preference === option.value;

              return (
                <Pressable
                  key={option.value}
                  style={[
                    styles.segment,
                    selected && { backgroundColor: theme.accent },
                  ]}
                  onPress={() => setPreference(option.value)}>
                  <Text
                    style={[
                      styles.segmentLabel,
                      { color: selected ? theme.onAccent : theme.text },
                    ]}>
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 16,
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  segmentedControl: {
    borderRadius: 24,
    flexDirection: 'row',
    padding: 4,
  },
  segment: {
    alignItems: 'center',
    borderRadius: 20,
    flex: 1,
    justifyContent: 'center',
    minHeight: 40,
  },
  segmentLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
});
