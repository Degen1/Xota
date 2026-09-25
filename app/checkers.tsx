import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useIsFocused } from 'expo-router/react-navigation';
import { Board, BoardButton, BoardScreen, BoardStatus, CheckerPiece, ModeChoice, squareLabel, type PlayMode } from '@/components/games/board-ui';
import { checkersMoves, checkersResult, chooseCheckersMove, newCheckers, playCheckers, type CheckersState } from '@/lib/checkers';

export default function CheckersScreen() {
  const [mode, setMode] = useState<PlayMode>('computer');
  const [history, setHistory] = useState<CheckersState[]>(() => [newCheckers()]);
  const [selected, setSelected] = useState<number | null>(null);
  const focused = useIsFocused();
  const game = history[history.length - 1];
  const result = checkersResult(game);
  const computerTurn = mode === 'computer' && game.turn === 'black' && !result;
  const legal = result ? [] : checkersMoves(game);
  const active = game.forcedFrom ?? selected;
  const targets = legal.filter(m => m.from === active).map(m => m.to);
  const reset = () => { setHistory([newCheckers()]); setSelected(null); };

  useEffect(() => {
    if (!computerTurn || !focused) return;
    const timer = setTimeout(() => {
      const move = chooseCheckersMove(game);
      if (move) { setHistory(prev => [...prev, playCheckers(game, move)]); setSelected(null); }
    }, 320);
    return () => clearTimeout(timer);
  }, [computerTurn, focused, game]);

  function tap(index: number) {
    if (result || computerTurn) return;
    const move = legal.find(m => m.from === active && m.to === index);
    if (move) { setHistory([...history, playCheckers(game, move)]); setSelected(null); }
    else if (game.forcedFrom === null) setSelected(index === selected ? null : legal.some(m => m.from === index) ? index : null);
  }
  function undo() {
    let index = history.length - 2;
    // Undo a whole turn, including every jump; in solo mode also undo the computer response.
    while (index > 0 && (history[index].forcedFrom !== null || (mode === 'computer' && history[index].turn !== 'red'))) index--;
    if (index >= 0) { setHistory(history.slice(0, index + 1)); setSelected(null); }
  }
  const color = (side: string) => side === 'red' ? 'ቀይሕ' : 'ጸሊም';
  const status = result ? result === 'draw' ? 'ማዕረ!' : `${color(result)} ተዓዊቱ!` : computerTurn ? 'ኮምፒተር ይጻወት ኣሎ…' : `ተራ ናይ ${color(game.turn)}`;
  const detail = result ? 'እንደገና ንምጽዋት፣ ሓድሽ ጸወታ ጠውቕ።' : game.forcedFrom !== null ? 'በዚ እምኒ ምብላዕ ቀጽል።' : legal.some(m => m.capture !== undefined) ? 'ናይ ተቓራኒ እምኒ ብላዕ።' : 'እምኒ ጠውቕ፣ ድሕሪኡ ዝበርሀ ቦታ ጠውቕ።';
  return <BoardScreen title="ዳማ" onRefresh={reset}>
    <ModeChoice mode={mode} onChange={value => { setMode(value); reset(); }} />
    <BoardStatus text={status} detail={detail} finished={!!result} />
    <Board selected={active} targets={computerTurn ? [] : targets} locked={!!result || computerTurn} onPress={tap}
      label={i => `${squareLabel(i)}፣ ${game.board[i] ? `${color(game.board[i]!.side)} ${game.board[i]!.king ? 'ንጉስ' : 'እምኒ'}` : 'ባዶ'}`}
      renderPiece={(i, size) => game.board[i] ? <CheckerPiece red={game.board[i]!.side === 'red'} king={game.board[i]!.king} size={size} /> : null} />
    <View style={{ flexDirection: 'row', gap: 10 }}>
      <BoardButton label="ተመለስ" secondary onPress={undo} disabled={history.length < 2} />
      <BoardButton label="ሓድሽ ጸወታ" onPress={reset} />
    </View>
  </BoardScreen>;
}
