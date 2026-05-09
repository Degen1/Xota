// App.js
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Dimensions,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useExtraLifeReward } from '@/hooks/useExtraLifeReward';


const { width: SCREEN_W } = Dimensions.get("window");

// Tunables
const PLAYER_SIZE = 44;
const BLOCK_W = 34;
const BLOCK_H = 34;
const START_SPEED = 3.5;
const MAX_SPEED = 14;
const SPAWN_EVERY_MS = 650;
const MOVE_STEP = 24;
const HIT_INSET = 4;

// Utility: AABB collision
function hit(a, b) {
  return !(
    a.x + a.w < b.x ||
    a.x > b.x + b.w ||
    a.y + a.h < b.y ||
    a.y > b.y + b.h
  );
}

export default function App() {
  const { colorScheme } = useAppTheme();
  const isDark = colorScheme === "dark";

  // Stage dimensions
  const [stageW, setStageW] = useState(SCREEN_W - 24);
  const [stageH, setStageH] = useState(500);

  // Player position
  const [playerX, setPlayerX] = useState(0);
  const playerXRef = useRef(0);
  useEffect(() => {
    playerXRef.current = playerX;
  }, [playerX]);

  const playerY = useMemo(
    () => Math.max(0, stageH - PLAYER_SIZE - 12),
    [stageH]
  );

  // Blocks
  const [blocks, setBlocks] = useState([]);
  const blocksRef = useRef(blocks);
  useEffect(() => {
    blocksRef.current = blocks;
  }, [blocks]);

  // Game state
  const [running, setRunning] = useState(false);
  const [score, setScore] = useState(0);
  const scoreRef = useRef(0);
  const [lives, setLives] = useState(1);
  const { isGrantingLife, showForExtraLife } = useExtraLifeReward();
  const speedRef = useRef(START_SPEED);
  const frameRef = useRef(null);
  const lastTsRef = useRef(0);
  const spawnTimerRef = useRef(null);
  const holdDirRef = useRef(0);

  // Center player when stage ready
  useEffect(() => {
    const cx = (stageW - PLAYER_SIZE) / 2;
    setPlayerX(cx);
    playerXRef.current = cx;
  }, [stageW]);

  const resetGame = useCallback(() => {
    const cx = (stageW - PLAYER_SIZE) / 2;
    setBlocks([]);
    setPlayerX(cx);
    playerXRef.current = cx;
    setScore(0);
    scoreRef.current = 0;
    setLives(1);
    speedRef.current = START_SPEED;
  }, [stageW]);

  const startGame = useCallback(() => {
    resetGame();
    setRunning(true);

    if (spawnTimerRef.current) clearInterval(spawnTimerRef.current);
    spawnTimerRef.current = setInterval(() => {
      setBlocks((prev) => {
        const x = Math.max(
          6,
          Math.min(stageW - BLOCK_W - 6, Math.random() * (stageW - BLOCK_W))
        );
        return [...prev, { id: `${Date.now()}-${Math.random()}`, x, y: -BLOCK_H }];
      });
    }, SPAWN_EVERY_MS);

    lastTsRef.current = 0;
    const loop = (ts) => {
      frameRef.current = requestAnimationFrame(loop);

      if (!lastTsRef.current) lastTsRef.current = ts;
      const dt = Math.min(32, ts - lastTsRef.current);
      lastTsRef.current = ts;

      if (holdDirRef.current !== 0) {
        setPlayerX((px) => {
          const next = px + holdDirRef.current * MOVE_STEP * (dt / 16.67);
          return Math.max(0, Math.min(stageW - PLAYER_SIZE, next));
        });
      }

      const targetSpeed = Math.min(MAX_SPEED, START_SPEED + scoreRef.current * 0.015);
      speedRef.current = speedRef.current * 0.95 + targetSpeed * 0.05;

      setBlocks((prev) => {
        const speed = speedRef.current * (dt / 16.67);
        const updated = [];
        let localScoreBumps = 0;

        for (const b of prev) {
          const ny = b.y + speed;
          if (ny > stageH + 10) {
            localScoreBumps += 1;
            continue;
          }
          updated.push({ ...b, y: ny });
        }

        if (localScoreBumps) {
          scoreRef.current += localScoreBumps;
          setScore(scoreRef.current);
        }

        const playerRect = {
          x: playerXRef.current + HIT_INSET,
          y: playerY + HIT_INSET,
          w: PLAYER_SIZE - HIT_INSET * 2,
          h: PLAYER_SIZE - HIT_INSET * 2,
        };

        for (const b of updated) {
          const blockRect = {
            x: b.x + HIT_INSET,
            y: b.y + HIT_INSET,
            w: BLOCK_W - HIT_INSET * 2,
            h: BLOCK_H - HIT_INSET * 2,
          };
          if (hit(playerRect, blockRect)) {
            setRunning(false);
            if (spawnTimerRef.current) clearInterval(spawnTimerRef.current);
            if (frameRef.current) cancelAnimationFrame(frameRef.current);
            frameRef.current = null;
            setLives(0);
            break;
          }
        }

        return updated;
      });
    };
    frameRef.current = requestAnimationFrame(loop);
  }, [playerY, stageW, stageH, resetGame]);

  const onAddLife = useCallback(async () => {
    if (running || lives > 0 || isGrantingLife) return;
    const didEarnReward = await showForExtraLife();
    if (!didEarnReward) return;
    setLives(1);
  }, [isGrantingLife, lives, running, showForExtraLife]);

  useEffect(() => {
    return () => {
      if (spawnTimerRef.current) clearInterval(spawnTimerRef.current);
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, []);

  // Input
  const onPressIn = (evt) => {
    const x = evt.nativeEvent.locationX;
    const leftZone = stageW * 0.5;
    holdDirRef.current = x < leftZone ? -1 : 1;
  };
  const onPressOut = () => {
    holdDirRef.current = 0;
  };
  const onPress = (evt) => {
    const x = evt.nativeEvent.locationX;
    const leftZone = stageW * 0.5;
    setPlayerX((px) => {
      const dir = x < leftZone ? -1 : 1;
      const next = px + dir * (MOVE_STEP * 1.2);
      return Math.max(0, Math.min(stageW - PLAYER_SIZE, next));
    });
  };

  // Theme colors
  const theme = isDark
    ? {
        bg: "#0f172a",
        stage: "#0b1224",
        border: "#1f2a44",
        text: "#fff",
        subText: "#cbd5e1",
        hint: "#94a3b8",
        player: "#60a5fa",
        rock: "#a8a29e",
      }
    : {
        bg: "#f9fafb",
        stage: "#ffffff",
        border: "#d1d5db",
        text: "#111827",
        subText: "#374151",
        hint: "#4b5563",
        player: "#2563eb",
        rock: "#57534e",
      };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>
        ዝወድቕ እምኒ
        </Text>
        <Text style={[styles.titleTI, { color: theme.subText }]}>
        ብእምኒ ከይትህረሙ ተንቀሳቐሱ        </Text>
        <Text style={[styles.score, { color: theme.subText }]}>
          ነጥቢ: {score}   •   ህይወት: {lives}
        </Text>

      </View>

      <View
        style={styles.stageWrapper}
        onLayout={(e) => {
          // Fix: measure effective stage size (wrapper has paddingHorizontal: 12, paddingBottom: 8)
          const { width, height } = e.nativeEvent.layout;
          setStageW(width - 24);   // ← subtract left+right padding (12 * 2)
          setStageH(height - 8);   // ← subtract bottom padding
        }}
      >
        <View
          style={[
            styles.stage,
            { backgroundColor: theme.stage, borderColor: theme.border },
          ]}
        >
          {/* Blocks */}
          {blocks.map((b) => (
            <MaterialCommunityIcons
              key={b.id}
              name="terrain"
              size={BLOCK_W}
              color={theme.rock}
              style={{
                position: "absolute",
                width: BLOCK_W,
                height: BLOCK_H,
                textAlign: "center",
                transform: [{ translateX: b.x }, { translateY: b.y }],
              }}
            />
          ))}

          {/* Player */}
          <Ionicons
            name="person"
            size={PLAYER_SIZE}
            color={theme.player}
            style={[
              styles.player,
              {
                width: PLAYER_SIZE,
                height: PLAYER_SIZE,
                textAlign: "center",
                transform: [{ translateX: playerX }, { translateY: playerY }],
              },
            ]}
          />

          {/* Touch layer */}
          <Pressable
            style={StyleSheet.absoluteFill}
            onPressIn={onPressIn}
            onPressOut={onPressOut}
            onPress={onPress}
          />
        </View>
      </View>

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
              if (spawnTimerRef.current) clearInterval(spawnTimerRef.current);
              if (frameRef.current) cancelAnimationFrame(frameRef.current);
              frameRef.current = null;
            }}
          >
            <Text style={styles.btnText}>ምቁራፅ</Text>
          </Pressable>
        )}

        {!running && score > 0 && (
          <Text style={[styles.hint, { color: theme.hint }]}>
            ጸወታ ተወዲኡ - ነጥብኻ {score}
          </Text>
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
        {running && (
          <Text style={[styles.hint, { color: theme.hint }]}>
            ንምንቅስቓስ ኣብ ጸጋም ወይ ኣብ የማን ጠውቁ
          </Text>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 6,
  },
  title: { fontSize: 18, fontWeight: "700" },
  titleTI: { fontSize: 14, marginTop: 2 },
  score: { fontSize: 16, fontWeight: "600", marginTop: 6 },
  stageWrapper: { flex: 1, paddingHorizontal: 12, paddingBottom: 8 },
  stage: {
    flex: 1,
    borderWidth: 2,
    borderRadius: 14,
    overflow: "hidden",
  },
  player: { position: "absolute", zIndex: 2 },
  controls: { padding: 14, alignItems: "center", gap: 8 },
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
