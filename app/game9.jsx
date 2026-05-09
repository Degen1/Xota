// App.js
import React, { useMemo, useState, useEffect } from "react";
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
const BOARD_MAX_W = 420;

const COLS = 7;
const ROWS = 6;
const HUMAN = "R"; // you
const AI = "Y";    // computer

// Helpers
const idx = (r, c) => r * COLS + c;

function emptyBoard() {
  return Array(ROWS * COLS).fill(null);
}

function findDropRow(board, col) {
  for (let r = ROWS - 1; r >= 0; r--) {
    if (!board[idx(r, col)]) return r;
  }
  return -1; // full
}

function getWinner(board) {
  // returns {player: 'R'|'Y', line: [[r,c],...4]} or null
  const dirs = [
    [0, 1],   // →
    [1, 0],   // ↓
    [1, 1],   // ↘
    [-1, 1],  // ↗
  ];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const start = board[idx(r, c)];
      if (!start) continue;
      for (const [dr, dc] of dirs) {
        const cells = [[r, c]];
        let ok = true;
        for (let k = 1; k < 4; k++) {
          const rr = r + dr * k;
          const cc = c + dc * k;
          if (rr < 0 || rr >= ROWS || cc < 0 || cc >= COLS) { ok = false; break; }
          const v = board[idx(rr, cc)];
          if (v !== start) { ok = false; break; }
          cells.push([rr, cc]);
        }
        if (ok) return { player: start, line: cells };
      }
    }
  }
  return null;
}

const isFull = (b) => b.every(Boolean);

// ---------- Simple fast AI (win -> block -> center -> best column) ----------
const CENTER_COL = Math.floor(COLS / 2);
const centerPrefOrder = [3, 2, 4, 1, 5, 0, 6]; // prefer center, then outward

function canWinNext(board, col, who) {
  const r = findDropRow(board, col);
  if (r < 0) return false;
  const k = idx(r, col);
  const copy = board.slice();
  copy[k] = who;
  return !!getWinner(copy);
}

function simulateDrop(board, col, who) {
  const r = findDropRow(board, col);
  if (r < 0) return null;
  const k = idx(r, col);
  const copy = board.slice();
  copy[k] = who;
  return { board: copy, row: r };
}

// tiny heuristic: more center = better; avoid giving opponent instant win
function scoreColumn(board, col, me = AI) {
  const sim = simulateDrop(board, col, me);
  if (!sim) return -Infinity;
  // discourage moves that let the opponent win immediately
  for (let c = 0; c < COLS; c++) {
    if (canWinNext(sim.board, c, HUMAN)) return -9999;
  }
  // prefer center and higher rows (less commitment), very lightweight
  const centerBias = -Math.abs(col - CENTER_COL);
  const heightBias = -sim.row * 0.05;
  return centerBias + heightBias;
}

function bestComputerMove(board) {
  // 1) winning move now?
  for (let c = 0; c < COLS; c++) {
    if (canWinNext(board, c, AI)) return c;
  }
  // 2) block human’s winning move
  for (let c = 0; c < COLS; c++) {
    if (canWinNext(board, c, HUMAN)) return c;
  }
  // 3) center if available
  if (findDropRow(board, CENTER_COL) >= 0) return CENTER_COL;

  // 4) pick best by heuristic (center-out)
  let best = null;
  let bestScore = -Infinity;
  for (const c of centerPrefOrder) {
    if (findDropRow(board, c) < 0) continue;
    const s = scoreColumn(board, c, AI);
    if (s > bestScore) {
      bestScore = s;
      best = c;
    }
  }
  return best;
}

export default function App() {
  // Theme
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
        r: "#ef4444",
        y: "#f59e0b",
        win: "#22c55e",
      }
    : {
        bg: "#f9fafb",
        stage: "#ffffff",
        border: "#d1d5db",
        text: "#111827",
        sub: "#374151",
        hint: "#4b5563",
        r: "#b91c1c",
        y: "#b45309",
        win: "#16a34a",
      };

  const boardW = Math.min(SCREEN_W - PAD * 2, BOARD_MAX_W);
  const boardH = (boardW * ROWS) / COLS;
  const cellW = boardW / COLS;
  const cellH = boardH / ROWS;

  // Game state
  const [board, setBoard] = useState(emptyBoard());
  const [turn, setTurn] = useState(HUMAN); // Red starts
  const [winsR, setWinsR] = useState(0);
  const [winsY, setWinsY] = useState(0);
  const [draws, setDraws] = useState(0);
  const [lives, setLives] = useState(1);
  const { isGrantingLife, showForExtraLife } = useExtraLifeReward();

  // NEW: Vs Computer (default ON)
  const [vsComputer, setVsComputer] = useState(true);

  const result = useMemo(() => getWinner(board), [board]);
  const full = useMemo(() => isFull(board), [board]);
  const gameOver = !!result || full;

  // Update scoreboard on finish
  useEffect(() => {
    if (!gameOver) return;
    if (result) {
      if (result.player === HUMAN) setWinsR((n) => n + 1);
      else setWinsY((n) => n + 1);
    } else {
      setDraws((n) => n + 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameOver]);

  useEffect(() => {
    if (!gameOver) return;
    if (vsComputer && result?.player === AI) {
      setLives(0);
    }
  }, [gameOver, result, vsComputer]);

  // Computer move (Yellow) auto-plays after your move
  useEffect(() => {
    if (!vsComputer) return;
    if (gameOver) return;
    if (turn !== AI) return;

    const id = setTimeout(() => {
      setBoard((prev) => {
        if (getWinner(prev) || isFull(prev)) return prev.slice();
        const move = bestComputerMove(prev.slice());
        if (move == null) return prev.slice();
        const r = findDropRow(prev, move);
        if (r < 0) return prev.slice();
        const next = prev.slice();
        next[idx(r, move)] = AI;
        return next;
      });
      setTurn(HUMAN);
    }, 220); // small delay feels natural

    return () => clearTimeout(id);
  }, [turn, vsComputer, gameOver]);

  // Drop a piece (human or second player)
  const dropAt = (col) => {
    if (lives <= 0) return;
    if (gameOver) return;
    if (vsComputer && turn !== HUMAN) return; // lock while AI "thinks"
    const row = findDropRow(board, col);
    if (row < 0) return; // column full
    const next = board.slice();
    next[idx(row, col)] = turn;
    setBoard(next);
    setTurn((t) => (t === HUMAN ? AI : HUMAN));
  };

  const restart = () => {
    if (lives <= 0) return;
    setBoard(emptyBoard());
    setTurn(HUMAN);
  };

  const resetScores = () => {
    setWinsR(0);
    setWinsY(0);
    setDraws(0);
    setBoard(emptyBoard());
    setTurn(HUMAN);
  };

  const onAddLife = async () => {
    if (lives > 0 || isGrantingLife) return;
    const didEarnReward = await showForExtraLife();
    if (!didEarnReward) return;
    setLives(1);
  };

  const statusText = (() => {
    if (result) return `ዕዉት ${result.player === "R" ? "ቀይሕ" : "ብጫ"}!`;
    if (full) return "ማዕረ";
    if (vsComputer) {
      return turn === HUMAN ? "ናይ ቀይሕ ታራ" : "ናይ ብጫ ታራ";
    }
    return `ዝተኸልከሉ: ${turn === "R" ? "Red" : "Yellow"}`;
  })();

  // Win-line set for highlighting
  const winSet = useMemo(() => {
    if (!result) return new Set();
    return new Set(result.line.map(([r, c]) => idx(r, c)));
  }, [result]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>ኣርባዕት</Text>
        <Text style={[styles.sub, { color: theme.sub }]}>
        ኣርባዕት ዝሰርዐ ይዕወት
        </Text>

      </View>

      {/* Toggles */}
      <View style={styles.togglesRow}>
        <View style={styles.toggle}>
          <Text style={[styles.toggleLabel, { color: theme.sub }]}>ኣንጻር ኮምፒተር</Text>
          <Switch value={vsComputer} onValueChange={setVsComputer} />
        </View>
      </View>

      {/* Scores */}
      <View style={styles.scores}>
        <Text style={[styles.score, { color: theme.r }]}>ቀይሕ: {winsR}</Text>
        <Text style={[styles.score, { color: theme.y }]}>ብጫ: {winsY}</Text>
        <Text style={[styles.score, { color: theme.hint }]}>ማዕረ: {draws}</Text>
        <Text style={[styles.score, { color: theme.hint }]}>ህይወት: {lives}</Text>
      </View>

      {/* Board */}
      <View style={styles.boardWrap}>
        <View
          style={[
            styles.board,
            {
              width: boardW,
              height: boardH,
              backgroundColor: theme.stage,
              borderColor: theme.border,
            },
          ]}
        >
          {/* Grid cells */}
          {Array.from({ length: ROWS }).map((_, r) => (
            <View key={`row-${r}`} style={{ flexDirection: "row" }}>
              {Array.from({ length: COLS }).map((__, c) => {
                const k = idx(r, c);
                const v = board[k];
                const isWin = winSet.has(k);
                return (
                  <View
                    key={`cell-${r}-${c}`}
                    style={[
                      styles.cell,
                      {
                        width: cellW,
                        height: cellH,
                        borderColor: theme.border,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.disc,
                        {
                          backgroundColor: v
                            ? v === "R"
                              ? theme.r
                              : theme.y
                            : "transparent",
                          borderColor: isWin ? theme.win : "transparent",
                        },
                      ]}
                    />
                  </View>
                );
              })}
            </View>
          ))}

          {/* Tap overlay by columns */}
          <View style={StyleSheet.absoluteFill}>
            <View style={{ flexDirection: "row", width: "100%", height: "100%" }}>
              {Array.from({ length: COLS }).map((_, c) => (
                <Pressable
                  key={`drop-${c}`}
                  onPress={() => dropAt(c)}
                  style={{ width: cellW, height: "100%" }}
                />
              ))}
            </View>
          </View>
        </View>
      </View>

      {/* Status + Controls */}
      <View style={styles.controls}>
        <Text style={[styles.status, { color: theme.hint }]}>{statusText}</Text>

        <View style={styles.btnRow}>
          <Pressable
            style={[styles.btn, { width: boardW }, lives <= 0 && styles.disabled]}
            onPress={restart}
            disabled={lives <= 0}>
            <Text style={styles.btnText}>ድገም</Text>
          </Pressable>
          <Pressable
            style={[styles.btn, { width: boardW }, styles.secondary]}
            onPress={resetScores}>
            <Text style={styles.btnText}>ሓድሽ ጸወታ</Text>
          </Pressable>
        </View>
        {lives <= 0 && (
          <Pressable
            style={[
              styles.btn,
              { width: boardW },
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
    alignItems: "center",
    justifyContent: "center",
  },
  cell: {
    borderRightWidth: 1,
    borderBottomWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  disc: {
    width: "72%",
    height: "72%",
    borderRadius: 999,
    borderWidth: 3,
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
