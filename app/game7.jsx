// App.js
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Dimensions,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useExtraLifeReward } from '@/hooks/useExtraLifeReward';


const { width: SCREEN_W } = Dimensions.get("window");

// Stage padding must match styles.stageWrapper
const STAGE_PAD_H = 12; // left/right padding
const STAGE_PAD_B = 8;  // bottom padding

// Tunables
const BIRD_SIZE = 28;
const GRAVITY = 0.55;         // px per frame^2 (approx @ 60fps)
const FLAP_VELOCITY = -8.5;   // upward impulse
const MAX_FALL_SPEED = 12;

const PIPE_W = 58;
const PIPE_GAP = 150;         // vertical gap between pipes
const PIPE_SPAWN_MS = 1400;   // base spawn timer
const PIPE_SPEED = 2.8;       // px per frame (@ ~60fps)

const PIPE_MIN_GAP_X = 220;   // minimum spacing between rightmost pipe and edge
const MIN_SPAWN_MS_GUARD = 350;

const FLOOR_THICK = 12;       // collision floor thickness (hidden visually)
const HIT_INSET = 3;          // soften hitbox a little

// AABB collision
function hit(a, b) {
  return !(
    a.x + a.w < b.x ||
    a.x > b.x + b.w ||
    a.y + a.h < b.y ||
    a.y > b.y + b.h
  );
}

export default function App() {
  // THEME
  const { colorScheme } = useAppTheme();
  const isDark = colorScheme === "dark";
  const theme = isDark
    ? {
        bg: "#0f172a",
        stage: "#0b1224",
        border: "#1f2a44",
        text: "#ffffff",
        subText: "#cbd5e1",
        hint: "#94a3b8",
        floor: "#0e7490", // not used visually (floor is hidden)
        bird: "#38bdf8",
      }
    : {
        bg: "#f9fafb",
        stage: "#ffffff",
        border: "#d1d5db",
        text: "#111827",
        subText: "#374151",
        hint: "#4b5563",
        floor: "#60a5fa", // not used visually (floor is hidden)
        bird: "#2563eb",
      };

  // Stage
  const [stageW, setStageW] = useState(SCREEN_W - 24);
  const [stageH, setStageH] = useState(520);
  const didMeasureRef = useRef(false); // lock stage size after first layout

  // Bird
  const [birdY, setBirdY] = useState(0);
  const birdYRef = useRef(0);
  const birdVelRef = useRef(0);
  const birdX = 72;
  useEffect(() => { birdYRef.current = birdY; }, [birdY]);

  // Pipes
  const [pipes, setPipes] = useState([]);
  const pipesRef = useRef([]);
  const passedRef = useRef(new Set());

  // Game state
  const [running, setRunning] = useState(false);
  const [score, setScore] = useState(0);
  const scoreRef = useRef(0);
  const [lives, setLives] = useState(1);
  const { isGrantingLife, showForExtraLife } = useExtraLifeReward();

  const frameRef = useRef(null);
  const lastTsRef = useRef(0);
  const spawnRef = useRef(null);
  const lastSpawnAtRef = useRef(0);

  // Reset round
  const reset = useCallback(() => {
    pipesRef.current = [];
    setPipes([]);
    passedRef.current = new Set();
    birdVelRef.current = 0;

    // center bird vertically
    const cy = Math.max(0, (stageH - FLOOR_THICK) / 2 - BIRD_SIZE / 2);
    setBirdY(cy);
    birdYRef.current = cy;

    // reset score for endless mode
    scoreRef.current = 0;
    setScore(0);
    setLives(1);
  }, [stageH]);

  // Spawn a pipe pair (into the ref, then mirror to state)
  const spawnPipe = useCallback(() => {
    const now = Date.now();

    // guard against double spawns
    if (now - lastSpawnAtRef.current < MIN_SPAWN_MS_GUARD) return;

    // keep minimum spacing from the right edge to avoid clustering
    if (pipesRef.current.length > 0) {
      const rightmost = pipesRef.current.reduce((a, b) => (a.x > b.x ? a : b));
      if (rightmost.x > stageW - PIPE_MIN_GAP_X) return;
    }

    const topMin = 32;
    const topMax = Math.max(topMin, stageH - FLOOR_THICK - PIPE_GAP - 32);
    const gapTop = topMin + Math.random() * (topMax - topMin);
    const p = { id: `${Date.now()}-${Math.random()}`, x: stageW, gapTop };
    pipesRef.current = [...pipesRef.current, p];
    setPipes(pipesRef.current);
    lastSpawnAtRef.current = now;
  }, [stageH, stageW]);

  const endGame = useCallback(() => {
    setRunning(false);
    if (spawnRef.current) clearInterval(spawnRef.current);
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    setLives(0);
  }, []);

  // Start
  const startGame = useCallback(() => {
    reset();

    setRunning(true);

    // spawn timer
    if (spawnRef.current) clearInterval(spawnRef.current);
    lastSpawnAtRef.current = 0;
    spawnRef.current = setInterval(spawnPipe, PIPE_SPAWN_MS);
    // spawn first immediately
    spawnPipe();

    // frame loop
    lastTsRef.current = 0;
    const loop = (ts) => {
      frameRef.current = requestAnimationFrame(loop);

      if (!lastTsRef.current) lastTsRef.current = ts;
      const dtMs = Math.min(32, ts - lastTsRef.current);
      lastTsRef.current = ts;
      const dt = dtMs / (1000 / 60); // normalize to ~60fps steps

      // physics
      birdVelRef.current = Math.min(MAX_FALL_SPEED, birdVelRef.current + GRAVITY * dt);
      const nextBirdY = birdYRef.current + birdVelRef.current * dt;
      setBirdY(nextBirdY);
      birdYRef.current = nextBirdY;

      // floor / ceiling
      const floorY = stageH - FLOOR_THICK;
      if (nextBirdY + BIRD_SIZE > floorY || nextBirdY < 0) {
        endGame();
        return;
      }

      // Pipes: move, score, collide
      const moved = [];
      for (const p of pipesRef.current) {
        const nx = p.x - PIPE_SPEED * dt;
        if (nx + PIPE_W < 0) continue; // off-screen left
        moved.push({ ...p, x: nx });
      }

      // scoring: only once per pipe
      for (const p of moved) {
        if (!passedRef.current.has(p.id)) {
          const pipeCenter = p.x + PIPE_W / 2;
          if (birdX > pipeCenter) {
            passedRef.current.add(p.id);
            scoreRef.current += 1;
            setScore(scoreRef.current);
          }
        }
      }

      // collisions
      const birdRect = {
        x: birdX + HIT_INSET,
        y: birdYRef.current + HIT_INSET,
        w: BIRD_SIZE - HIT_INSET * 2,
        h: BIRD_SIZE - HIT_INSET * 2,
      };

      let collided = false;
      for (const p of moved) {
        const topPipe = { x: p.x, y: 0, w: PIPE_W, h: p.gapTop };
        const bottomPipe = {
          x: p.x,
          y: p.gapTop + PIPE_GAP,
          w: PIPE_W,
          h: floorY - (p.gapTop + PIPE_GAP),
        };
        if (hit(birdRect, topPipe) || hit(birdRect, bottomPipe)) {
          collided = true;
          break;
        }
      }

      // mirror ref -> state
      pipesRef.current = moved;
      setPipes(moved);

      if (collided) {
        endGame();
        return;
      }
    };

    frameRef.current = requestAnimationFrame(loop);
  }, [endGame, reset, spawnPipe, stageH]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (spawnRef.current) clearInterval(spawnRef.current);
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, []);

  // Flap
  const flap = useCallback(() => {
    if (!running) return;
    birdVelRef.current = FLAP_VELOCITY;
  }, [running]);

  const onAddLife = useCallback(async () => {
    if (running || lives > 0 || isGrantingLife) return;
    const didEarnReward = await showForExtraLife();
    if (!didEarnReward) return;
    setLives(1);
  }, [isGrantingLife, lives, running, showForExtraLife]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>ነፋሪት</Text>
        <Text style={[styles.meta, { color: theme.subText }]}>ነጥቢ: {score}   •   ህይወት: {lives}</Text>

      </View>

      <View
        style={styles.stageWrapper}
        onLayout={(e) => {
          if (didMeasureRef.current) return; // lock size after first measure
          const { width, height } = e.nativeEvent.layout;
          setStageW(width - STAGE_PAD_H * 2);
          setStageH(height - STAGE_PAD_B);
          didMeasureRef.current = true;
        }}
      >
        <View
          style={[
            styles.stage,
            { backgroundColor: theme.stage, borderColor: theme.border },
          ]}
        >
          {/* Pipes */}
          {pipes.map((p) => {
            const gapBottom = p.gapTop + PIPE_GAP;
            return (
              <React.Fragment key={p.id}>
                {/* Top pipe */}
                <View
                  style={[
                    styles.pipe,
                    {
                      width: PIPE_W,
                      height: Math.max(0, p.gapTop),
                      transform: [{ translateX: p.x }, { translateY: 0 }],
                    },
                  ]}
                />
                {/* Bottom pipe */}
                <View
                  style={[
                    styles.pipe,
                    {
                      width: PIPE_W,
                      height: Math.max(0, stageH - FLOOR_THICK - gapBottom),
                      transform: [
                        { translateX: p.x },
                        { translateY: gapBottom },
                      ],
                    },
                  ]}
                />
              </React.Fragment>
            );
          })}

          {/* Bird */}
          <MaterialCommunityIcons
            name="bird"
            size={BIRD_SIZE + 8}
            color={theme.bird}
            style={{
              position: "absolute",
              width: BIRD_SIZE + 8,
              height: BIRD_SIZE + 8,
              textAlign: "center",
              transform: [
                { translateX: birdX - 4 },
                { translateY: birdY - 4 },
                { rotate: `${Math.max(-25, Math.min(35, birdVelRef.current * 4))}deg` },
              ],
            }}
          />

          {/* Floor (collision only — hidden visually) */}
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              height: FLOOR_THICK,
              bottom: 0,
              backgroundColor: "transparent", // hide the bar
            }}
          />

          {/* Tap layer */}
          <Pressable style={StyleSheet.absoluteFill} onPress={flap} />
        </View>
      </View>

      {/* Controls area with fixed height so layout never shifts */}
      <View style={styles.controls}>
        {!running ? (
          <Pressable
            style={[styles.btn, { width: stageW }, lives <= 0 && styles.disabled]}
            onPress={startGame}
            disabled={lives <= 0}>
            <Text style={styles.btnText}>{score > 0 ? "ድገም" : "ጀምር"}</Text>
          </Pressable>
        ) : (
          <Pressable
            style={[styles.btn, { width: stageW }, styles.pause]}
            onPress={() => {
              setRunning(false);
              if (spawnRef.current) clearInterval(spawnRef.current);
              if (frameRef.current) cancelAnimationFrame(frameRef.current);
              frameRef.current = null;
            }}
          >
            <Text style={styles.btnText}>ምቁራፅ</Text>
          </Pressable>
        )}
        {!running && lives <= 0 && (
          <Pressable
            style={[
              styles.btn,
              { width: stageW },
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

        {/* Always reserve space for hint text; toggle visibility only */}
        <Text
          style={[
            styles.hint,
            { color: theme.hint, opacity: running ? 1 : 0 },
          ]}
        >
ንኽትዘልል ጠውቕ
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 6 },
  title: { fontSize: 18, fontWeight: "700" },
  meta: { fontSize: 16, fontWeight: "600", marginTop: 6 },

  stageWrapper: { flex: 1, paddingHorizontal: STAGE_PAD_H, paddingBottom: STAGE_PAD_B },
  stage: { flex: 1, borderWidth: 2, borderRadius: 14, overflow: "hidden" },

  pipe: {
    position: "absolute",
    backgroundColor: "#22c55e",
    borderColor: "#16a34a",
    borderWidth: 2,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
  },

  // Fixed-height controls prevent layout jumps on game over
  controls: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 10,
    alignItems: "center",
    gap: 8,
    height: 84, // <- keep this fixed so stage above doesn't move
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
  btnText: { color: "white", fontWeight: "700", fontSize: 16 },
  hint: { marginTop: 6 },
});
