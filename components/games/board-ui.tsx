import React, { type PropsWithChildren } from 'react';
import { Stack, useRouter } from 'expo-router';
import { HeaderBackButton } from 'expo-router/react-navigation';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getAppTheme } from '@/constants/appTheme';
import { useAppTheme } from '@/hooks/useAppTheme';
import { RefreshableScrollView } from '@/components/refreshable-scroll-view';

export type PlayMode = 'computer' | 'friend';
export function useBoardTheme() {
  const { colorScheme } = useAppTheme();
  return getAppTheme(colorScheme);
}
export function BoardScreen({ title, onRefresh, children }: PropsWithChildren<{ title: string; onRefresh: () => void }>) {
  const theme = useBoardTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  return <RefreshableScrollView onRefresh={onRefresh} refreshLabel="ሓድሽ ጸወታ…"
    contentInsetAdjustmentBehavior="automatic"
    contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }}>
    <Stack.Screen options={{ title, headerShown: true, headerTintColor: theme.text,
      headerStyle: { backgroundColor: theme.background }, headerShadowVisible: false,
      headerBackButtonDisplayMode: 'minimal',
      headerLeft: props => <HeaderBackButton {...props} accessibilityLabel="ተመለስ" displayMode="minimal" onPress={() => router.back()} /> }} />
    <View style={{ width: '100%', maxWidth: 480, alignSelf: 'center', gap: 18 }}>{children}</View>
  </RefreshableScrollView>;
}
export function ModeChoice({ mode, onChange }: { mode: PlayMode; onChange: (mode: PlayMode) => void }) {
  const theme = useBoardTheme();
  return <View style={{ flexDirection: 'row', gap: 8 }}>
    {(['computer', 'friend'] as const).map(value => <Pressable key={value}
      accessibilityRole="button" accessibilityState={{ selected: value === mode }}
      onPress={() => value !== mode && onChange(value)}
      style={({ pressed }) => ({ flex: 1, padding: 12, minHeight: 48, borderRadius: 14,
        alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.7 : 1,
        backgroundColor: value === mode ? theme.accent : theme.mutedSurface })}>
      <Text style={{ color: value === mode ? theme.onAccent : theme.text, fontWeight: '700', fontSize: 15, textAlign: 'center' }}>
        {value === 'computer' ? 'ምስ ኮምፒተር' : 'ምስ ዓርኪ'}
      </Text>
    </Pressable>)}
  </View>;
}
export function BoardStatus({ text, detail, finished = false }: { text: string; detail: string; finished?: boolean }) {
  const theme = useBoardTheme();
  return <View accessibilityLiveRegion="polite" style={{ gap: 5, minHeight: 60 }}>
    <Text style={{ fontSize: 23, lineHeight: 32, fontWeight: '800', color: finished ? theme.accent : theme.text }}>{text}</Text>
    <Text style={{ fontSize: 14, lineHeight: 22, color: theme.mutedText }}>{detail}</Text>
  </View>;
}
export function BoardButton({ label, onPress, disabled = false, secondary = false }: { label: string; onPress: () => void; disabled?: boolean; secondary?: boolean }) {
  const theme = useBoardTheme();
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress}
    style={({ pressed }) => ({ flex: 1, minHeight: 50, padding: 12, borderRadius: 14, alignItems: 'center', justifyContent: 'center',
      backgroundColor: secondary ? theme.mutedSurface : theme.accent, opacity: disabled ? 0.4 : pressed ? 0.7 : 1 })}>
    <Text style={{ fontSize: 15, fontWeight: '700', color: secondary ? theme.text : theme.onAccent }}>{label}</Text>
  </Pressable>;
}
export const squareLabel = (index: number) => `መስርዕ ${8 - Math.floor(index / 8)}፣ ዓምዲ ${index % 8 + 1}`;
export function Board({ selected, targets, lastMove = [], onPress, label, renderPiece, locked = false, alertSquare }: {
  selected: number | null; targets: number[]; lastMove?: number[]; onPress: (i: number) => void;
  label: (i: number) => string; renderPiece: (i: number, size: number) => React.ReactNode;
  locked?: boolean; alertSquare?: number;
}) {
  const { width } = useWindowDimensions();
  const boardSize = Math.min(width - 32, 480);
  const size = (boardSize - 8) / 8;
  return <View style={[styles.board, { width: boardSize, height: boardSize }]}>
    {Array.from({ length: 8 }, (_, row) => <View key={row} style={{ flexDirection: 'row', height: size }}>
      {Array.from({ length: 8 }, (_, col) => {
        const i = row * 8 + col;
        const target = targets.includes(i);
        const isSelected = selected === i;
        return <Pressable key={i} accessibilityRole="button" accessibilityLabel={`${label(i)}${target ? '፣ ናብዚ ኣንቀሳቕስ' : ''}`}
          accessibilityState={{ selected: isSelected, disabled: locked }} disabled={locked}
          onPress={() => onPress(i)} style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center',
            backgroundColor: alertSquare === i ? '#dc7770' : isSelected ? '#e5bb56' : lastMove.includes(i) ? '#bccb78' :
              (row + col) % 2 ? '#6d8a73' : '#f0e8d6' }}>
          {renderPiece(i, size)}
          {target && <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderWidth: 3, borderColor: '#edb53f', alignItems: 'center', justifyContent: 'center' }]}>
            <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: '#edb53f', borderWidth: 1, borderColor: '#6e4b0b' }} />
          </View>}
        </Pressable>;
      })}
    </View>)}
  </View>;
}
export function CheckerPiece({ red, king = false, size = 40 }: { red: boolean; king?: boolean; size?: number }) {
  return <View pointerEvents="none" style={{ width: size * 0.77, height: size * 0.77, borderRadius: size,
    backgroundColor: red ? '#b44736' : '#293331', borderWidth: 2, borderColor: red ? '#e89b79' : '#738078',
    alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 1px #00000035' }}>
    <View style={{ width: '73%', height: '73%', borderRadius: size, borderWidth: 1, borderColor: red ? '#d67b5e' : '#59665e', alignItems: 'center', justifyContent: 'center' }}>
      {king && <Text style={{ color: '#ffe0a0', fontSize: size * 0.36, lineHeight: size * 0.44 }}>★</Text>}
    </View>
  </View>;
}
export const CHESS_SYMBOLS = { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' };
export function ChessPiece({ type, white, size = 40 }: { type: keyof typeof CHESS_SYMBOLS; white: boolean; size?: number }) {
  return <Text pointerEvents="none" allowFontScaling={false} style={{ fontSize: size * 0.86, lineHeight: size,
    color: white ? '#fff9e9' : '#202b2a', textShadowColor: white ? '#534e40' : '#ced3be', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 }}>
    {CHESS_SYMBOLS[type]}
  </Text>;
}
const styles = StyleSheet.create({ board: { alignSelf: 'center', borderWidth: 4, borderColor: '#3c5145', borderRadius: 9, overflow: 'hidden' } });
