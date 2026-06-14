import { getAppTheme } from '@/constants/appTheme';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useRouter } from 'expo-router';
import React from 'react';
import {
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const H_PAD = 16;
const GUTTER = 16;
const NUM_COLS = 2;
const CARD_SIZE = (SCREEN_WIDTH - H_PAD * 2 - GUTTER * (NUM_COLS - 1)) / NUM_COLS;
const BOTTOM_SPACING = 100;

const games = [
  { id: '1', title: 'ጉያ', image: require('../../assets/images/game1.png'), route: '/game1' },
  { id: '3', title: 'ዳማ', image: require('../../assets/images/game3.png'), route: '/game3' },
  { id: '4', title: 'ምክልኻል', image: require('../../assets/images/game4.png'), route: '/game4' },
  { id: '5', title: 'ኮኾብ', image: require('../../assets/images/game5.png'), route: '/game5' },
  { id: '6', title: 'ሓዝ', image: require('../../assets/images/game6.png'), route: '/game6' },
  { id: '7', title: 'ነፋሪት', image: require('../../assets/images/game7.png'), route: '/game7' },
  { id: '8', title: 'ሰለስተ', image: require('../../assets/images/game8.png'), route: '/game8' },
  { id: '9', title: 'ኣርባዕተ', image: require('../../assets/images/game9.jpg'), route: '/game9' },
];

export default function GamesScreen() {
  const router = useRouter();
  const { colorScheme } = useAppTheme();
  const theme = getAppTheme(colorScheme);

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView
        contentContainerStyle={[styles.grid, { paddingBottom: BOTTOM_SPACING }]}
        showsVerticalScrollIndicator={false}>
        {games.map((game) => (
          <TouchableOpacity
            key={game.id}
            style={[styles.card, { backgroundColor: theme.mutedSurface }]}
            activeOpacity={0.8}
            onPress={() => router.push(game.route as never)}>
            <Image source={game.image} style={styles.cardImage} />
            <Text numberOfLines={1} style={[styles.cardTitle, { color: theme.text }]}>
              {game.title}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: H_PAD,
    paddingTop: 16,
  },
  card: {
    width: CARD_SIZE,
    height: CARD_SIZE + 24,
    borderRadius: 8,
    marginBottom: GUTTER,
    overflow: 'hidden',
  },
  cardImage: { width: CARD_SIZE, height: CARD_SIZE },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: 4,
  },
});
