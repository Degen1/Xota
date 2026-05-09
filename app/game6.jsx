// App.js
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Dimensions,
} from "react-native";
import { FontAwesome5 } from "@expo/vector-icons";
import { SafeAreaView } from 'react-native-safe-area-context';
import { useExtraLifeReward } from '@/hooks/useExtraLifeReward';
import { useAppTheme } from '@/hooks/useAppTheme';


const { width: SCREEN_W } = Dimensions.get("window");

// Tunables
const TARGET_SIZE = 68;         // diameter (px)
const PADDING = 8;              // keep target away from edges
const BASE_LIFE_MS = 1100;      // target visible time at score 0
const MIN_LIFE_MS = 450;        // minimum visible time
const LIFE_DECAY_MS = 20;       // reduces lifetime per point
const STAGE_PAD_H = 12;         // must match stageWrapper paddingHorizontal
const STAGE_PAD_B = 8;          // must match stageWrapper paddingBottom

export default function App() {
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
        targetBg: "#1e293b",
        targetRing: "#38bdf8",
        targetIcon: "#facc15",
      }
    : {
        bg: "#f9fafb",
        stage: "#ffffff",
        border: "#d1d5db",
        text: "#111827",
        subText: "#374151",
        hint: "#4b5563",
        targetBg: "#eff6ff",
        targetRing: "#2563eb",
        targetIcon: "#eab308",
      };

  // Stage size (measured)
  const [stageW, setStageW] = useState(SCREEN_W - 24);
  const [stageH, setStageH] = useState(520);

  // Game state
  const [running, setRunning] = useState(false);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const { isGrantingLife, showForExtraLife } = useExtraLifeReward();

  // Current target
  const [target, setTarget] = useState(null); // {id,x,y,hit:boolean}
  const timeoutRef = useRef(null);

  // Compute current lifetime based on score
  const lifeMs = Math.max(MIN_LIFE_MS, BASE_LIFE_MS - score * LIFE_DECAY_MS);

  // Helpers
  const clearSpawnTimer = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  const scheduleNext = useCallback(
    (delay = 250) => {
      clearSpawnTimer();
      timeoutRef.current = setTimeout(() => {
        // Random position inside the stage bounds
        const maxX = Math.max(0, stageW - TARGET_SIZE - PADDING * 2);
        const maxY = Math.max(0, stageH - TARGET_SIZE - PADDING * 2);
        const x = PADDING + Math.random() * maxX;
        const y = PADDING + Math.random() * maxY;

        const t = { id: `${Date.now()}-${Math.random()}`, x, y, hit: false };
        setTarget(t);

        // Auto-expire if not tapped in time
        clearSpawnTimer();
        timeoutRef.current = setTimeout(() => {
          setTarget((cur) => {
            // if already changed/hit, ignore
            if (!cur || cur.id !== t.id || cur.hit) return cur;
            // miss → lose a life
            setLives((lv) => {
              const next = Math.max(0, lv - 1);
              if (next <= 0) {
                // game over
                setRunning(false);
                clearSpawnTimer();
                return 0;
              }
              // keep playing: schedule another target
              scheduleNext(200);
              return next;
            });
            return cur; // target will be replaced by scheduleNext
          });
        }, lifeMs);
      }, delay);
    },
    [lifeMs, stageW, stageH]
  );

  const reset = useCallback(() => {
    clearSpawnTimer();
    setScore(0);
    setLives(3);
    setTarget(null);
  }, []);

  const startGame = useCallback(() => {
    reset();
    setRunning(true);
    scheduleNext(0);
  }, [reset, scheduleNext]);

  const onAddLife = useCallback(async () => {
    if (running || lives > 0 || isGrantingLife) return;

    const didEarnReward = await showForExtraLife();
    if (!didEarnReward) return;

    setLives(1);
  }, [isGrantingLife, lives, running, showForExtraLife]);

  // Cleanup timers
  useEffect(() => {
    return () => clearSpawnTimer();
  }, []);

  // Tap the target
  const onHit = useCallback(() => {
    if (!running || !target || target.hit) return;
    // Mark hit locally to avoid double taps
    setTarget((t) => (t ? { ...t, hit: true } : t));
    clearSpawnTimer();
    setScore((s) => s + 1);
    scheduleNext(150); // quick next target
  }, [running, target, scheduleNext]);

  // UI
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>ምልክት ጠውቑ</Text>
        <Text style={[styles.meta, { color: theme.subText }]}>ነጥብ: {score}   •   ህይወት: {lives}</Text>
      </View>

      <View
        style={styles.stageWrapper}
        onLayout={(e) => {
          const { width, height } = e.nativeEvent.layout;
          setStageW(width - STAGE_PAD_H * 2);
          setStageH(height - STAGE_PAD_B);
        }}
      >
        <View style={[styles.stage, { backgroundColor: theme.stage, borderColor: theme.border }]}>
          {/* Target */}
          {running && target && (
            <Pressable
              onPress={onHit}
              style={[
                styles.targetWrap,
                {
                  width: TARGET_SIZE,
                  height: TARGET_SIZE,
                  borderRadius: TARGET_SIZE / 2,
                  backgroundColor: theme.targetBg,
                  borderColor: theme.targetRing,
                  transform: [
                    { translateX: target.x },
                    { translateY: target.y },
                  ],
                },
              ]}
            >
              <View style={[styles.targetInner, { borderColor: theme.targetRing }]}>
                <FontAwesome5 name="bullseye" size={34} color={theme.targetIcon} />
              </View>
            </Pressable>
          )}

          {/* Background layer (does NOT intercept touches anymore) */}
          <View pointerEvents="none" style={StyleSheet.absoluteFill} />
        </View>
      </View>

      <View style={styles.controls}>
        {!running ? (
          <Pressable
            style={[styles.btn, { width: stageW }, lives <= 0 && styles.disabled]}
            onPress={startGame}
            disabled={lives <= 0}>
            <Text style={styles.btnText}>
              {score > 0 || lives < 3 ? "ድገም" : "ጀምር"}
            </Text>
          </Pressable>
        ) : (
          <Pressable
            style={[styles.btn, { width: stageW }, styles.pause]}
            onPress={() => {
              setRunning(false);
              clearSpawnTimer();
            }}
          >
            <Text style={styles.btnText}>ምቁራፅ</Text>
          </Pressable>
        )}

        {!running && (score > 0 || lives < 3) && (
          <Text style={[styles.hint, { color: theme.hint }]}>ጸወታ ተወዲኡ - ነጥብኹም {score}</Text>
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
       ምልክት ኣብ ዝተራኣየሉ ቦታ ብቕልጡፍ ጠውቑ
          </Text>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 6,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
  },
  meta: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: 6,
  },
  stageWrapper: {
    flex: 1,
    paddingHorizontal: STAGE_PAD_H,
    paddingBottom: STAGE_PAD_B,
  },
  stage: {
    flex: 1,
    borderWidth: 2,
    borderRadius: 14,
    overflow: "hidden",
  },
  targetWrap: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    zIndex: 2, // ensure above background
  },
  targetInner: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  controls: {
    padding: 14,
    alignItems: "center",
    gap: 8,
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
  btnText: {
    color: "white",
    fontWeight: "700",
    fontSize: 16,
  },
  hint: {
    marginTop: 6,
  },
});
