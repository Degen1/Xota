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
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const H_PAD = 16;
const GUTTER = 16;
const NUM_COLS = 3;
const CARD_SIZE = (SCREEN_WIDTH - H_PAD * 2 - GUTTER * (NUM_COLS - 1)) / NUM_COLS;
const BOTTOM_SPACING = 100;

const games = [
  { id: '1', title: 'ጉያ', image: require('../../assets/images/game1.png'), route: '/game1' },
  { id: '2', title: 'ካልኩሌተር', image: require('../../assets/images/game2.png'), route: '/game2' },
  { id: '3', title: 'ዳማ', image: require('../../assets/images/game3.png'), route: '/game3' },
  { id: '4', title: 'ምክልኻል', image: require('../../assets/images/game4.png'), route: '/game4' },
  { id: '5', title: 'ኮኾብ', image: require('../../assets/images/game5.png'), route: '/game5' },
  { id: '6', title: 'ሓዝ', image: require('../../assets/images/game6.png'), route: '/game6' },
  { id: '7', title: 'ነፋሪት', image: require('../../assets/images/game7.png'), route: '/game7' },
  { id: '8', title: 'ሰለስተ', image: require('../../assets/images/game8.png'), route: '/game8' },
  { id: '9', title: 'ኣርባዕተ', image: require('../../assets/images/game9.jpg'), route: '/game9' },
  { id: '10', title: 'ተመን', image: require('../../assets/images/game10.png'), route: '/game10' },
  { id: '11', title: 'ቑጽሪ', image: require('../../assets/images/game11.png'), route: '/game11' },
  { id: '12', title: 'ውድድር', image: require('../../assets/images/game12.png'), route: '/game12' },
  { id: '13', title: 'ቸስ', image: require('../../assets/images/game13.png'), route: '/game13' },
  { id: '14', title: 'ካርታ', image: require('../../assets/images/game14.png'), route: '/game14' },
  { id: '15', title: 'ጸወታ 15', image: require('../../assets/images/game10.png'), route: '/game15' },
  { id: '16', title: 'ጸወታ 16', image: require('../../assets/images/game10.png'), route: '/game16' },
  { id: '17', title: 'ጸወታ 17', image: require('../../assets/images/game10.png'), route: '/game17' },
  { id: '18', title: 'ጸወታ 18', image: require('../../assets/images/game10.png'), route: '/game18' },
];

export default function GamesScreen() {
  const router = useRouter();
  const { colorScheme } = useAppTheme();
  const theme = getAppTheme(colorScheme);

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>ጸወታ</Text>
      </View>
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
  header: {
    paddingHorizontal: H_PAD,
    paddingBottom: 12,
    paddingTop: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: H_PAD,
    paddingTop: 4,
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
