import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useIsFocused } from 'expo-router/react-navigation';
import { type Move, type PieceSymbol, type Square } from 'chess.js';
import { Board, BoardButton, BoardScreen, BoardStatus, ChessPiece, ModeChoice, squareLabel, useBoardTheme, type PlayMode } from '@/components/games/board-ui';
import { chessFromHistory, chessStatus, chooseChessMove, PIECE_NAMES, squareAt, squareIndex } from '@/lib/chess-game';

export default function ChessScreen() {
  const theme = useBoardTheme();
  const focused = useIsFocused();
  const [mode, setMode] = useState<PlayMode>('computer');
  const [history, setHistory] = useState<string[]>([]);
  const [selected, setSelected] = useState<Square | null>(null);
  const [promotion, setPromotion] = useState<Move[] | null>(null);
  const game = useMemo(() => chessFromHistory(history), [history]);
  const over = game.isGameOver();
  const computerTurn = mode === 'computer' && game.turn() === 'b' && !over;
  const legal = selected && !over ? game.moves({ square: selected, verbose: true }) : [];
  const last = game.history({ verbose: true }).at(-1);
  const reset = () => { setHistory([]); setSelected(null); setPromotion(null); };
  useEffect(() => {
    if (!computerTurn || !focused) return;
    const timer = setTimeout(() => {
      const move = chooseChessMove(game);
      if (move) { setHistory(prev => [...prev, move.san]); setSelected(null); }
    }, 300);
    return () => clearTimeout(timer);
  }, [computerTurn, focused, game]);

  function play(move: Move) {
    setHistory([...history, move.san]);
    setSelected(null); setPromotion(null);
  }
  function tap(index: number) {
    if (over || computerTurn || promotion) return;
    const square = squareAt(index);
    const moves = legal.filter(move => move.to === square);
    if (moves.length) {
      if (moves.some(m => m.promotion)) setPromotion(moves);
      else play(moves[0]);
    } else setSelected(selected === square ? null : game.get(square)?.color === game.turn() ? square : null);
  }
  function undo() {
    // While the phone is thinking, undo the user's move; otherwise rewind both moves.
    const count = mode === 'computer' && game.turn() === 'w' ? 2 : 1;
    setHistory(history.slice(0, Math.max(0, history.length - count)));
    setSelected(null); setPromotion(null);
  }
  const detail = over ? 'እንደገና ንምጽዋት፣ ሓድሽ ጸወታ ጠውቕ።' : promotion ? 'ወተሃደርካ ናብ ምንታይ ይቀየር?' : 'እምኒ ጠውቕ፣ ድሕሪኡ ዝበርሀ ቦታ ጠውቕ።';
  return <BoardScreen title="ቼዝ" onRefresh={reset}>
    <ModeChoice mode={mode} onChange={value => { setMode(value); reset(); }} />
    <BoardStatus text={chessStatus(game, computerTurn)} detail={detail} finished={over} />
    {promotion && <View style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {(['q', 'r', 'b', 'n'] as PieceSymbol[]).map(type => <Pressable key={type} accessibilityRole="button" accessibilityLabel={PIECE_NAMES[type]}
          onPress={() => play(promotion.find(m => m.promotion === type)!)}
          style={{ flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 12, backgroundColor: theme.mutedSurface }}>
          <ChessPiece type={type} white={game.turn() === 'w'} size={44} />
          <Text style={{ color: theme.text, fontSize: 13 }}>{PIECE_NAMES[type]}</Text>
        </Pressable>)}
      </View>
      <BoardButton secondary label="ሰርዝ" onPress={() => setPromotion(null)} />
    </View>}
    <Board selected={selected ? squareIndex(selected) : null} targets={computerTurn || promotion ? [] : [...new Set(legal.map(move => squareIndex(move.to)))]}
      lastMove={last ? [squareIndex(last.from), squareIndex(last.to)] : []}
      alertSquare={game.isCheck() ? squareIndex(game.findPiece({ type: 'k', color: game.turn() })[0]) : undefined}
      locked={over || computerTurn || !!promotion} onPress={tap}
      label={i => { const p = game.get(squareAt(i)); return `${squareLabel(i)}፣ ${p ? `${p.color === 'w' ? 'ጻዕዳ' : 'ጸሊም'} ${PIECE_NAMES[p.type]}` : 'ባዶ'}`; }}
      renderPiece={(i, size) => { const p = game.get(squareAt(i)); return p ? <ChessPiece type={p.type} white={p.color === 'w'} size={size} /> : null; }} />
    <View style={{ flexDirection: 'row', gap: 10 }}>
      <BoardButton label="ተመለስ" secondary onPress={undo} disabled={!history.length && !promotion} />
      <BoardButton label="ሓድሽ ጸወታ" onPress={reset} />
    </View>
  </BoardScreen>;
}
