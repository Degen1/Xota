// App.js
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Dimensions,
} from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useExtraLifeReward } from '@/hooks/useExtraLifeReward';


const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

// ---- Tunables ----
const PAD = 12;
const STAGE_MAX_W = 420;     // visual cap (looks nice on tablets)
const CELL = 18;             // base cell size (will be scaled to fit)
const SPEED_START_MS = 160;  // lower = faster
const SPEED_MIN_MS = 80;
const SPEED_STEP = 4;        // speed up every few foods

// Grid (responsive): pick cols from width, rows from height-ish
const STAGE_W = Math.min(SCREEN_W - PAD * 2, STAGE_MAX_W);
const COLS = Math.max(12, Math.floor(STAGE_W / CELL));         // 12+
const ROWS = Math.max(16, Math.floor((SCREEN_H * 0.46) / CELL)); // ~half screen tall

// Helpers
const same = (a, b) => a.x === b.x && a.y === b.y;
const inside = (c) => c.x >= 0 && c.x < COLS && c.y >= 0 && c.y < ROWS;
const rndInt = (n) => Math.floor(Math.random() * n);

function randomEmptyCell(snake) {
  // naive retry; fine for this grid size
  while (true) {
    const p = { x: rndInt(COLS), y: rndInt(ROWS) };
    if (!snake.some((s) => same(s, p))) return p;
  }
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
        snake: "#22c55e",
        snakeHead: "#16a34a",
        food: "#f59e0b",
      }
    : {
        bg: "#f9fafb",
        stage: "#ffffff",
        border: "#d1d5db",
        text: "#111827",
        sub: "#374151",
        hint: "#4b5563",
        snake: "#16a34a",
        snakeHead: "#15803d",
        food: "#d97706",
      };

  // Stage pixel sizes computed from cols/rows
  const stagePxW = COLS * CELL;
  const stagePxH = ROWS * CELL;

  // Game state
  const [running, setRunning] = useState(false);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [lives, setLives] = useState(1);
  const { isGrantingLife, showForExtraLife } = useExtraLifeReward();

  // Snake: array of segments (head at index 0)
  const [snake, setSnake] = useState(() => {
    const cx = Math.floor(COLS / 2);
    const cy = Math.floor(ROWS / 2);
    return [{ x: cx, y: cy }, { x: cx - 1, y: cy }];
  });
  const snakeRef = useRef(snake);
  useEffect(() => { snakeRef.current = snake; }, [snake]);

  // Direction: one of {x: -1|0|1, y: -1|0|1} where |x|+|y|=1
  const [dir, setDir] = useState({ x: 1, y: 0 }); // start moving right
  const dirRef = useRef(dir);
  useEffect(() => { dirRef.current = dir; }, [dir]);

  // Food
  const [food, setFood] = useState(() => randomEmptyCell(snakeRef.current));

  // Speed
  const [tickMs, setTickMs] = useState(SPEED_START_MS);
  const foodsEatenRef = useRef(0);

  const reset = useCallback(() => {
    const cx = Math.floor(COLS / 2);
    const cy = Math.floor(ROWS / 2);
    const initial = [{ x: cx, y: cy }, { x: cx - 1, y: cy }];
    setSnake(initial);
    setDir({ x: 1, y: 0 });
    setFood(randomEmptyCell(initial));
    setScore(0);
    setLives(1);
    setTickMs(SPEED_START_MS);
    foodsEatenRef.current = 0;
  }, []);

  // Movement loop
  const timerRef = useRef(null);
  const start = useCallback(() => {
    reset();
    setRunning(true);
  }, [reset]);

  const stop = useCallback(() => {
    setRunning(false);
    setLives(0);
  }, []);

  // Main tick: advances snake, checks collisions, eating, etc.
  const step = useCallback(() => {
    setSnake((prev) => {
      const d = dirRef.current;
      const head = prev[0];
      const nextHead = { x: head.x + d.x, y: head.y + d.y };

      // Wall collision
      if (!inside(nextHead)) {
        stop();
        setBest((b) => Math.max(b, score));
        return prev;
      }
      // Self collision (check against body)
      for (let i = 0; i < prev.length; i++) {
        if (same(prev[i], nextHead)) {
          stop();
          setBest((b) => Math.max(b, score));
          return prev;
        }
      }

      // Move
      const grew = same(nextHead, food);
      const nextSnake = [nextHead, ...prev];
      if (!grew) {
        nextSnake.pop(); // normal move
      } else {
        // Ate food: grow, score, speed up gradually, new food
        setScore((s) => s + 1);
        foodsEatenRef.current += 1;
        if (foodsEatenRef.current % SPEED_STEP === 0) {
          setTickMs((ms) => Math.max(SPEED_MIN_MS, ms - 10));
        }
        // Place new food on empty spot
        let f = randomEmptyCell(nextSnake);
        setFood(f);
      }
      return nextSnake;
    });
  }, [food, score, stop]);

  // Manage the interval when running/tickMs changes
  useEffect(() => {
    if (!running) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(step, tickMs);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
    };
  }, [running, tickMs, step]);

  // Direction buttons (no instant reverse)
  const setDirection = (nx, ny) => {
    const cur = dirRef.current;
    if (cur.x === -nx && cur.y === -ny) return; // disallow 180° turn
    setDir({ x: nx, y: ny });
  };

  const onAddLife = useCallback(async () => {
    if (running || lives > 0 || isGrantingLife) return;
    const didEarnReward = await showForExtraLife();
    if (!didEarnReward) return;
    setLives(1);
  }, [isGrantingLife, lives, running, showForExtraLife]);

  // Convenience UI text
  const status = useMemo(() => {
    if (!running) {
      return score > 0 ? "ጸወታ ተወዲኡ — ድገም ጠውቑ" : "ጀምር ጠውቑ";
    }
    return "እዚኤን  መጠወቒታት ተጠቐሙ";
  }, [running, score]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>ተመን</Text>
        <Text style={[styles.meta, { color: theme.sub }]}>
        ጸወታ ምስ መንደቕ ምስ ተጋጨኩም  ይውዳእ።
        </Text>

      </View>

      {/* Score row */}
      <View style={styles.scores}>
        <Text style={[styles.score, { color: theme.text }]}>ነጥቢ: {score}</Text>
        <Text style={[styles.score, { color: theme.hint }]}>ዝላዓለ ነጥቢ: {best}</Text>
        <Text style={[styles.score, { color: theme.sub }]}>ህይወት: {lives}</Text>
      </View>

      {/* Stage */}
      <View style={styles.stageWrap}>
        <View
          style={[
            styles.stage,
            {
              width: stagePxW,
              height: stagePxH,
              backgroundColor: theme.stage,
              borderColor: theme.border,
            },
          ]}
        >
          {/* Food */}
          <View
            style={{
              position: "absolute",
              width: CELL - 4,
              height: CELL - 4,
              left: food.x * CELL + 2,
              top: food.y * CELL + 2,
              backgroundColor: theme.food,
              borderRadius: 6,
              borderWidth: 2,
              borderColor: "#00000022",
            }}
          />

          {/* Snake */}
          {snake.map((s, i) => (
            <View
              key={`${s.x}-${s.y}-${i}`}
              style={{
                position: "absolute",
                width: CELL - 2,
                height: CELL - 2,
                left: s.x * CELL + 1,
                top: s.y * CELL + 1,
                backgroundColor: i === 0 ? theme.snakeHead : theme.snake,
                borderRadius: 6,
              }}
            />
          ))}

          {/* Grid lines (subtle) */}
          <View pointerEvents="none" style={StyleSheet.absoluteFill}>
            {Array.from({ length: COLS + 1 }).map((_, c) => (
              <View
                key={`v-${c}`}
                style={{
                  position: "absolute",
                  left: c * CELL,
                  top: 0,
                  width: 1,
                  height: "100%",
                  backgroundColor: "#00000015",
                }}
              />
            ))}
            {Array.from({ length: ROWS + 1 }).map((_, r) => (
              <View
                key={`h-${r}`}
                style={{
                  position: "absolute",
                  top: r * CELL,
                  left: 0,
                  height: 1,
                  width: "100%",
                  backgroundColor: "#00000015",
                }}
              />
            ))}
          </View>
        </View>
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        {!running ? (
          <Pressable
            style={[styles.btn, { width: stagePxW }, lives <= 0 && styles.disabled]}
            onPress={start}
            disabled={lives <= 0}>
            <Text style={styles.btnText}>{score > 0 ? "ድገም" : "ጀምር"}</Text>
          </Pressable>
        ) : (
          <Pressable
            style={[styles.btn, { width: stagePxW }, styles.pause]}
            onPress={() => {
              setRunning(false);
              setBest((b) => Math.max(b, score));
            }}
          >
            <Text style={styles.btnText}>ምቁራፅ</Text>
          </Pressable>
        )}

        <Text style={[styles.hint, { color: theme.hint }]}>{status}</Text>
        {!running && lives <= 0 && (
          <Pressable
            style={[
              styles.btn,
              { width: stagePxW },
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

        {/* D-pad */}
        <View style={styles.dpad}>
          <View style={styles.dpadRow}>
            <Pressable style={styles.pextraLifeBtn} onPress={() => setDirection(0, -1)}>
              <Text style={styles.padTxt}>↑</Text>
            </Pressable>
          </View>
          <View style={styles.dpadRow}>
            <Pressable style={styles.pextraLifeBtn} onPress={() => setDirection(-1, 0)}>
              <Text style={styles.padTxt}>←</Text>
            </Pressable>
            <View style={{ width: 16 }} />
            <Pressable style={styles.pextraLifeBtn} onPress={() => setDirection(1, 0)}>
              <Text style={styles.padTxt}>→</Text>
            </Pressable>
          </View>
          <View style={styles.dpadRow}>
            <Pressable style={styles.pextraLifeBtn} onPress={() => setDirection(0, 1)}>
              <Text style={styles.padTxt}>↓</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 6 },
  title: { fontSize: 18, fontWeight: "800" },
  meta: { fontSize: 13, marginTop: 4, fontWeight: "600" },

  scores: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  score: { fontSize: 16, fontWeight: "800" },

  stageWrap: { alignItems: "center", justifyContent: "center", flex: 1 },
  stage: {
    borderWidth: 2,
    borderRadius: 14,
    overflow: "hidden",
  },

  controls: {
    alignItems: "center",
    gap: 10,
    paddingBottom: 16,
  },
  btn: {
    backgroundColor: "#22c55e",
    height: 44,
    paddingHorizontal: 18,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  pause: { backgroundColor: "#f59e0b" },
  revive: { backgroundColor: "#2563eb" },
  disabled: { opacity: 0.65 },
  btnText: { color: "white", fontWeight: "800", fontSize: 16 },
  hint: { fontSize: 13, fontWeight: "700" },

  dpad: { marginTop: 6 },
  dpadRow: { flexDirection: "row", justifyContent: "center", gap: 16, marginVertical: 2 },
  pextraLifeBtn: {
    backgroundColor: "#0ea5e9",
    height: 40,
    minWidth: 72,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  padTxt: { color: "white", fontWeight: "900", fontSize: 16 },
});
