import { RefreshableScrollView } from '@/components/refreshable-scroll-view';
import { Link } from 'expo-router';
import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';

export default function ModalScreen() {
  return (
    <RefreshableScrollView contentContainerStyle={styles.container}>
      <ThemedText type="title">ጸወታ</ThemedText>
      <Link href="/" dismissTo style={styles.link}>
        <ThemedText type="link">ናብ ቀንዲ ገጽ ተመለስ</ThemedText>
      </Link>
    </RefreshableScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  link: {
    marginTop: 15,
    paddingVertical: 15,
  },
});
