import { getAppTheme } from '@/constants/appTheme';
import { useAppTheme } from '@/hooks/useAppTheme';
import { BoardCover } from '@/components/games/board-cover';
import { RefreshableScrollView } from '@/components/refreshable-scroll-view';
import { useRouter } from 'expo-router';
import React from 'react';
import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  type ImageSourcePropType,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const H_PAD = 16;
const GUTTER = 16;
const NUM_COLS = 2;
const BOTTOM_SPACING = 100;

const games: { id: string; title: string; image?: ImageSourcePropType; cover?: 'checkers' | 'chess'; route: string }[] = [
  { id: '1', title: 'ጉያ', image: require('../../assets/images/game1.png'), route: '/game1' },
  { id: '7', title: 'ነፋሪት', image: require('../../assets/images/game7.png'), route: '/game7' },
  { id: '8', title: 'ሰለስተ', image: require('../../assets/images/game8.png'), route: '/game8' },
  { id: '9', title: 'ኣርባዕተ', image: require('../../assets/images/game9.jpg'), route: '/game9' },
  { id: '10', title: 'ተመን', image: require('../../assets/images/game10.png'), route: '/game10' },
  { id: 'checkers', title: 'ዳማ', cover: 'checkers', route: '/checkers' },
  { id: 'chess', title: 'ቼዝ', cover: 'chess', route: '/chess' },
];

export default function GamesScreen() {
  const { width } = useWindowDimensions();
  const cardSize = (width - H_PAD * 2 - GUTTER * (NUM_COLS - 1)) / NUM_COLS;
  const router = useRouter();
  const { colorScheme } = useAppTheme();
  const theme = getAppTheme(colorScheme);

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={[styles.container, { backgroundColor: theme.background }]}>
      <RefreshableScrollView
        contentContainerStyle={[styles.grid, { paddingBottom: BOTTOM_SPACING }]}
        showsVerticalScrollIndicator={false}>
        {games.map((game) => (
          <TouchableOpacity
            key={game.id}
            accessibilityRole="button"
            accessibilityLabel={game.title}
            style={[styles.card, { width: cardSize, backgroundColor: theme.mutedSurface }]}
            activeOpacity={0.8}
            onPress={() => router.push(game.route as never)}>
            {game.cover ? <BoardCover kind={game.cover} /> : <Image source={game.image} style={{ width: cardSize, height: cardSize }} />}
            <Text style={[styles.cardTitle, { color: theme.text }]}>
              {game.title}
            </Text>
          </TouchableOpacity>
        ))}
      </RefreshableScrollView>
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
    borderRadius: 8,
    marginBottom: GUTTER,
    overflow: 'hidden',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 4,
    paddingBottom: 6,
    paddingHorizontal: 4,
  },
});
