import { useAppTheme } from '@/hooks/useAppTheme';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ComingSoonGame({ title }) {
  const { colorScheme } = useAppTheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark
    ? {
        background: '#0f172a',
        card: '#0b1224',
        border: '#1f2a44',
        text: '#ffffff',
        hint: '#cbd5e1',
      }
    : {
        background: '#f9fafb',
        card: '#ffffff',
        border: '#d1d5db',
        text: '#111827',
        hint: '#4b5563',
      };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
        <Text style={[styles.meta, { color: theme.hint }]}>ህይወት: 1</Text>
      </View>
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Text style={[styles.body, { color: theme.hint }]}>ኣብ ቀረባ እዋን ክቕረብ እዩ...</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 },
  title: { fontSize: 18, fontWeight: '800' },
  meta: { marginTop: 6, fontSize: 15, fontWeight: '700' },
  card: {
    flex: 1,
    marginHorizontal: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  body: { fontSize: 18, fontWeight: '700', textAlign: 'center' },
});
