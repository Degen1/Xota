// App.js
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Dimensions,
  Switch,
} from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useExtraLifeReward } from '@/hooks/useExtraLifeReward';


const { width: SCREEN_W } = Dimensions.get("window");
const PAD = 16;
const BOARD_MAX = 360; // cap for very wide screens

const WINS = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

function getWinner(board) {
  for (const line of WINS) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { player: board[a], line };
    }
  }
  return null;
}
const isBoardFull = (b) => b.every((v) => v);

/** Perfect-play minimax for 3x3 tic-tac-toe */
function bestMoveMinimax(board, ai = "O", human = "X") {
  const winner = getWinner(board);
  if (winner) return null; // no move needed
  if (isBoardFull(board)) return null;

  function minimax(b, maximizing, depth) {
    const win = getWinner(b);
    if (win) {
      if (win.player === ai) return 10 - depth;
      if (win.player === human) return depth - 10;
    }
    if (isBoardFull(b)) return 0;

    if (maximizing) {
      let best = -Infinity;
      for (let i = 0; i < 9; i++) {
        if (!b[i]) {
          b[i] = ai;
          const score = minimax(b, false, depth + 1);
          b[i] = null;
          if (score > best) best = score;
        }
      }
      return best;
    } else {
      let best = Infinity;
      for (let i = 0; i < 9; i++) {
        if (!b[i]) {
          b[i] = human;
          const score = minimax(b, true, depth + 1);
          b[i] = null;
          if (score < best) best = score;
        }
      }
      return best;
    }
  }

  let bestScore = -Infinity;
  let move = null;
  for (let i = 0; i < 9; i++) {
    if (!board[i]) {
      board[i] = ai;
      const score = minimax(board, false, 0);
      board[i] = null;
      if (score > bestScore) {
        bestScore = score;
        move = i;
      }
    }
  }
  return move;
}

export default function App() {
  const { colorScheme } = useAppTheme();
  const isDark = colorScheme === "dark";
  const theme = isDark
    ? {
        bg: "#0f172a",
        stage: "#0b1224",
        border: "#1f2a44",
        text: "#ffffff",
        sub: "#cbd5e1",
        hint: "#94a3b8",
        x: "#38bdf8", // sky-400
        o: "#f472b6", // pink-400
        win: "#22c55e",
      }
    : {
        bg: "#f9fafb",
        stage: "#ffffff",
        border: "#d1d5db",
        text: "#111827",
        sub: "#374151",
        hint: "#4b5563",
        x: "#0284c7",
        o: "#be185d",
        win: "#16a34a",
      };

  const boardSize = Math.min(SCREEN_W - PAD * 2, BOARD_MAX);

  // Game state
  const [board, setBoard] = useState(Array(9).fill(null));
  const [turn, setTurn] = useState("X"); // you start as X
  const [winsX, setWinsX] = useState(0);
  const [winsO, setWinsO] = useState(0);
  const [draws, setDraws] = useState(0);
  const [lives, setLives] = useState(1);
  const { isGrantingLife, showForExtraLife } = useExtraLifeReward();

  // NEW: vs Computer toggle (default ON)
  const [vsComputer, setVsComputer] = useState(true);
  const human = "X";
  const ai = "O";

  const result = useMemo(() => getWinner(board), [board]);
  const isFull = isBoardFull(board);
  const gameOver = !!result || isFull;

  // Update score when game ends
  useEffect(() => {
    if (!gameOver) return;
    if (result) {
      if (result.player === "X") setWinsX((n) => n + 1);
      else setWinsO((n) => n + 1);
    } else {
      setDraws((n) => n + 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameOver]);

  useEffect(() => {
    if (!gameOver) return;
    if (vsComputer && result?.player === ai) {
      setLives(0);
    }
  }, [gameOver, result, vsComputer, ai]);

  // Let the computer (O) move automatically after your move
  useEffect(() => {
    if (!vsComputer) return;
    if (gameOver) return;
    if (turn !== ai) return;

    const id = setTimeout(() => {
      setBoard((prev) => {
        // if game finished while waiting, bail
        if (getWinner(prev) || isBoardFull(prev)) return prev.slice();
        const move = bestMoveMinimax(prev.slice(), ai, human);
        if (move == null) return prev.slice();
        const next = prev.slice();
        next[move] = ai;
        return next;
      });
      setTurn(human);
    }, 200); // slight delay feels natural

    return () => clearTimeout(id);
  }, [turn, vsComputer, gameOver]);

  const playAt = (i) => {
    if (lives <= 0) return;
    if (board[i] || gameOver) return;
    if (vsComputer && turn !== human) return; // lock board during AI turn

    const next = board.slice();
    next[i] = turn;
    setBoard(next);
    setTurn((t) => (t === "X" ? "O" : "X"));
  };

  const restartRound = useCallback(() => {
    setBoard(Array(9).fill(null));
    setTurn("X"); // you start
  }, []);

  const restart = () => {
    if (lives <= 0) return;
    restartRound();
  };

  const resetScores = () => {
    setWinsX(0);
    setWinsO(0);
    setDraws(0);
    restartRound();
  };

  const onAddLife = useCallback(async () => {
    if (lives > 0 || isGrantingLife) return;
    const didEarnReward = await showForExtraLife();
    if (!didEarnReward) return;
    setLives(1);
  }, [isGrantingLife, lives, showForExtraLife]);

  const statusText = (() => {
    if (result) return `ዕዉት ${result.player}!`;
    if (isFull) return "ማዕረ";
    if (vsComputer) {
      return turn === human ? "ተራ (X)" : "ተራ (O)";
    }
    return `ተራ: ${turn}`;
  })();

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>
          ሰለስተ
        </Text>
        <Text style={[styles.sub, { color: theme.sub }]}>
        ሰለስተ ዝሰርዐ ይዕወት
                </Text>

      </View>

      {/* Toggles */}
      <View style={styles.togglesRow}>
        <View style={styles.toggle}>
          <Text style={[styles.toggleLabel, { color: theme.sub }]}>
           ኣንጻር ኮምፒተር          </Text>
          <Switch value={vsComputer} onValueChange={setVsComputer} />
        </View>
      </View>

      {/* Score row */}
      <View style={styles.scores}>
        <Text style={[styles.score, { color: theme.x }]}>X: {winsX}</Text>
        <Text style={[styles.score, { color: theme.o }]}>O: {winsO}</Text>
        <Text style={[styles.score, { color: theme.hint }]}>ማዕረ: {draws}</Text>
        <Text style={[styles.score, { color: theme.hint }]}>ህይወት: {lives}</Text>
      </View>

      {/* Board */}
      <View
        style={[
          styles.boardWrap,
          { paddingHorizontal: PAD, paddingBottom: PAD },
        ]}
      >
        <View
          style={[
            styles.board,
            {
              width: boardSize,
              aspectRatio: 1,
              backgroundColor: theme.stage,
              borderColor: theme.border,
            },
          ]}
        >
          {board.map((mark, i) => {
            const winCell = result?.line?.includes(i);
            const disabled = vsComputer && turn !== human; // during AI move
            return (
              <Pressable
                key={i}
                onPress={() => playAt(i)}
                disabled={disabled || !!mark || gameOver}
                style={[
                  styles.cell,
                  {
                    borderColor: theme.border,
                    backgroundColor: winCell ? `${theme.win}22` : "transparent",
                    opacity:
                      disabled && !mark && !gameOver ? 0.8 : 1,
                  },
                ]}
              >
                {mark ? (
                  <Text
                    style={[
                      styles.mark,
                      { color: mark === "X" ? theme.x : theme.o },
                    ]}
                  >
                    {mark}
                  </Text>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Status + Controls */}
      <View style={styles.controls}>
        <Text style={[styles.status, { color: theme.hint }]}>{statusText}</Text>

        <View style={styles.btnRow}>
          <Pressable
            style={[styles.btn, { width: boardSize }, lives <= 0 && styles.disabled]}
            onPress={restart}
            disabled={lives <= 0}>
            <Text style={styles.btnText}>ድገም</Text>
          </Pressable>
          <Pressable
            style={[styles.btn, { width: boardSize }, styles.secondary]}
            onPress={resetScores}>
            <Text style={styles.btnText}>ሓድሽ ጸወታ</Text>
          </Pressable>
        </View>
        {lives <= 0 && (
          <Pressable
            style={[
              styles.btn,
              { width: boardSize },
              styles.revive,
              isGrantingLife && styles.disabled,
            ]}
            onPress={onAddLife}
            disabled={isGrantingLife}>
            <Text style={styles.btnText}>
              {isGrantingLife ? "Adding life..." : "+1 ህይወት"}
            </Text>
          </Pressable>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 6 },
  title: { fontSize: 18, fontWeight: "800" },
  sub: { fontSize: 14, marginTop: 4, fontWeight: "600" },

  togglesRow: {
    flexDirection: "row",
    justifyContent: "flex-start",
    gap: 16,
    paddingHorizontal: 16,
    paddingBottom: 6,
    alignItems: "center",
  },
  toggle: { flexDirection: "row", alignItems: "center", gap: 8 },
  toggleLabel: { fontSize: 14, fontWeight: "700" },

  scores: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  score: { fontSize: 16, fontWeight: "800" },

  boardWrap: { alignItems: "center", justifyContent: "center", flex: 1 },
  board: {
    borderWidth: 2,
    borderRadius: 14,
    overflow: "hidden",
    flexDirection: "row",
    flexWrap: "wrap",
  },
  cell: {
    width: "33.3333%",
    height: "33.3333%",
    borderRightWidth: 1,
    borderBottomWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  mark: {
    fontSize: 44,
    fontWeight: "900",
  },
  controls: {
    alignItems: "center",
    gap: 8,
    paddingBottom: 16,
  },
  status: { fontSize: 16, fontWeight: "700" },
  btnRow: { width: "100%", alignItems: "center", gap: 10 },
  btn: {
    backgroundColor: "#22c55e",
    height: 44,
    paddingHorizontal: 16,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  secondary: { backgroundColor: "#64748b" },
  revive: { backgroundColor: "#2563eb" },
  disabled: { opacity: 0.65 },
  btnText: { color: "white", fontWeight: "800", fontSize: 14 },
});
