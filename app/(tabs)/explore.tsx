import { RefreshableScrollView } from '@/components/refreshable-scroll-view';
import { getAppTheme } from '@/constants/appTheme';
import { useAppTheme } from '@/hooks/useAppTheme';
import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ExploreScreen() {
  const { colorScheme } = useAppTheme();
  const theme = getAppTheme(colorScheme);

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={[styles.container, { backgroundColor: theme.background }]}>
      <RefreshableScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: theme.text }]}>ጸወታ</Text>
        <Text style={[styles.body, { color: theme.subtleText }]}>
          ቀለልቲ ጸወታታት ንቕልጡፍ መዘናግዒ።
        </Text>
      </RefreshableScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    gap: 12,
    paddingBottom: 100,
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
  },
});
