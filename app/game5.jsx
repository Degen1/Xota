// App.js
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Dimensions,
  ScrollView,
} from "react-native";
import { FontAwesome5, Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useExtraLifeReward } from '@/hooks/useExtraLifeReward';


const { width: SCREEN_W } = Dimensions.get("window");

// Tunables
const BASKET_W = 136;
const BASKET_H = 88;
const STAR_SIZE = 28;
const GOLD_SCALE = 1.35;                 // gold stars are slightly bigger
const STAR_SIZE_GOLD = Math.round(STAR_SIZE * GOLD_SCALE);
const START_SPEED = 3.2;
const MAX_SPEED = 12;
const SPAWN_EVERY_MS = 650;
const MOVE_STEP = 24;
const HIT_INSET = 3;

// Axis-aligned rectangle collision
function hit(a, b) {
  return !(
    a.x + a.w < b.x ||
    a.x > b.x + b.w ||
    a.y + a.h < b.y ||
    a.y > b.y + b.h
  );
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
        subText: "#cbd5e1",
        hint: "#94a3b8",
        basket: "#38bdf8",
        star: "#facc15",
        goldStar: "#f59e0b",
      }
    : {
        bg: "#f9fafb",
        stage: "#ffffff",
        border: "#d1d5db",
        text: "#111827",
        subText: "#374151",
        hint: "#4b5563",
        basket: "#2563eb",
        star: "#eab308",
        goldStar: "#f59e0b",
      };

  // Stage (measured)
  const [stageW, setStageW] = useState(SCREEN_W - 24);
  const [stageH, setStageH] = useState(520);

  // Basket
  const [bx, setBx] = useState(0);
  const bxRef = useRef(0);
  useEffect(() => {
    bxRef.current = bx;
  }, [bx]);

  const by = useMemo(() => Math.max(0, stageH - BASKET_H - 12), [stageH]);

  // Stars
  const [stars, setStars] = useState([]);
  const [caughtStars, setCaughtStars] = useState([]);

  // Floating “+5” messages for gold catches
  const [floaters, setFloaters] = useState([]); // {id,x,y,age}

  // Game state
  const [running, setRunning] = useState(false);
  const [score, setScore] = useState(0);
  const scoreRef = useRef(0);
  const [lives, setLives] = useState(3);
  const livesRef = useRef(3);
  const { isGrantingLife, showForExtraLife } = useExtraLifeReward();

  const speedRef = useRef(START_SPEED);
  const spawnTimerRef = useRef(null);
  const frameRef = useRef(null);
  const lastTsRef = useRef(0);
  const holdDirRef = useRef(0); // -1 left, +1 right, 0 none

  // Center basket on size known
  useEffect(() => {
    const cx = (stageW - BASKET_W) / 2;
    setBx(cx);
    bxRef.current = cx;
  }, [stageW]);

  const resetGame = useCallback(() => {
    const cx = (stageW - BASKET_W) / 2;
    setStars([]);
    setCaughtStars([]);
    setFloaters([]);
    setBx(cx);
    bxRef.current = cx;

    setScore(0);
    scoreRef.current = 0;

    setLives(3);
    livesRef.current = 3;

    speedRef.current = START_SPEED;
  }, [stageW]);

  const stopGameLoops = useCallback(() => {
    if (spawnTimerRef.current) clearInterval(spawnTimerRef.current);
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
  }, []);

  const runGameLoops = useCallback(() => {
    stopGameLoops();

    // Spawn loop (account for max size so big gold stars fit)
    spawnTimerRef.current = setInterval(() => {
      setStars((prev) => {
        const isGold = Math.random() < 0.2;             // 20% chance gold
        const size = isGold ? STAR_SIZE_GOLD : STAR_SIZE;
        const x = Math.max(
          6,
          Math.min(stageW - size - 6, Math.random() * (stageW - size))
        );
        return [
          ...prev,
          {
            id: `${Date.now()}-${Math.random()}`,
            x,
            y: -size,
            gold: isGold,
            w: size,
            h: size,
          },
        ];
      });
    }, SPAWN_EVERY_MS);

    // Frame loop
    lastTsRef.current = 0;
    const loop = (ts) => {
      frameRef.current = requestAnimationFrame(loop);

      if (!lastTsRef.current) lastTsRef.current = ts;
      const dt = Math.min(32, ts - lastTsRef.current); // clamp spikes
      lastTsRef.current = ts;

      // Basket hold movement
      if (holdDirRef.current !== 0) {
        setBx((px) => {
          const next = px + holdDirRef.current * MOVE_STEP * (dt / 16.67);
          return Math.max(0, Math.min(stageW - BASKET_W, next));
        });
      }

      // Speed ramps with score
      const targetSpeed = Math.min(MAX_SPEED, START_SPEED + scoreRef.current * 0.012);
      speedRef.current = speedRef.current * 0.95 + targetSpeed * 0.05;

      // Move stars, catch/miss logic
      setStars((prev) => {
        const spd = speedRef.current * (dt / 16.67);
        const updated = [];
        let caught = 0;
        let missed = 0;

        const basketRect = {
          x: bxRef.current + HIT_INSET,
          y: by + HIT_INSET,
          w: BASKET_W - HIT_INSET * 2,
          h: BASKET_H - HIT_INSET * 2,
        };

        for (const s of prev) {
          const ny = s.y + spd;

          // Miss: star hits ground
          if (ny > stageH + 4) {
            missed += 1;
            continue;
          }

          // Check catch (overlap with basket) — use nominal STAR_SIZE for hitbox fairness
          const starRect = {
            x: s.x + HIT_INSET,
            y: ny + HIT_INSET,
            w: s.w - HIT_INSET * 2,
            h: s.h - HIT_INSET * 2,
          };

          if (hit(basketRect, starRect)) {
            const points = s.gold ? 5 : 1;
            caught += points;
            setCaughtStars((prevCaught) => [
              ...prevCaught,
              { id: `c-${Date.now()}-${Math.random()}`, gold: s.gold },
            ]);

            // Add floating +5 message for gold
            if (s.gold) {
              const id = `f-${Date.now()}-${Math.random()}`;
              setFloaters((prevF) => [
                ...prevF,
                { id, x: s.x, y: by - 16, age: 0 },
              ]);
            }
            continue; // don't keep the star
          }

          updated.push({ ...s, y: ny });
        }

        // Apply score/lives changes
        if (caught) {
          scoreRef.current += caught;
          setScore(scoreRef.current);
        }
        if (missed) {
          livesRef.current = Math.max(0, livesRef.current - missed);
          setLives(livesRef.current);
          if (livesRef.current <= 0) {
            // Game over
            setRunning(false);
            stopGameLoops();
          }
        }

        return updated;
      });

      // Animate floating +5 messages (rise & fade)
      setFloaters((prev) => {
        const LIFE_MS = 700;
        const RISE_PER_MS = 0.06; // px per ms
        const out = [];
        for (const f of prev) {
          const age = f.age + dt;
          if (age >= LIFE_MS) continue;
          out.push({
            ...f,
            age,
            y: f.y - dt * RISE_PER_MS,
          });
        }
        return out;
      });
    };
    frameRef.current = requestAnimationFrame(loop);
  }, [by, stageW, stageH, stopGameLoops]);

  const startGame = useCallback(() => {
    resetGame();
    setRunning(true);
    runGameLoops();
  }, [resetGame, runGameLoops]);

  const onAddLife = useCallback(async () => {
    if (running || lives > 0 || isGrantingLife) return;

    const didEarnReward = await showForExtraLife();
    if (!didEarnReward) return;

    livesRef.current = 1;
    setLives(1);
  }, [isGrantingLife, lives, running, showForExtraLife]);

  // Cleanup
  useEffect(() => {
    return () => stopGameLoops();
  }, [stopGameLoops]);

  // Input zones (tap/hold)
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
    setBx((px) => {
      const dir = x < leftZone ? -1 : 1;
      const next = px + dir * (MOVE_STEP * 1.2);
      return Math.max(0, Math.min(stageW - BASKET_W, next));
    });
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>ኮኾብ ምሓዝ</Text>
        <Text style={[styles.score, { color: theme.subText }]}>
          ነጥብ: {score}   •   ህይወት: {lives}
        </Text>
        <View style={styles.caughtRow}>
          <Text style={[styles.caughtLabel, { color: theme.subText }]}>ዝተታሕዙ:</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.caughtStars}>
            {caughtStars.map((star) => (
              <Ionicons
                key={star.id}
                name="star"
                size={18}
                color={star.gold ? theme.goldStar : theme.star}
              />
            ))}
          </ScrollView>
        </View>
      </View>

      <View
        style={styles.stageWrapper}
        onLayout={(e) => {
          const { width, height } = e.nativeEvent.layout;
          // Keep objects inside border box
          setStageW(width - 24);   // 12 + 12 horizontal padding
          setStageH(height - 8);   // bottom padding 8
        }}
      >
        <View
          style={[
            styles.stage,
            { backgroundColor: theme.stage, borderColor: theme.border },
          ]}
        >
          {/* Stars */}
          {stars.map((s) => (
            <Ionicons
              key={s.id}
              name="star"
              size={s.w}
              color={s.gold ? theme.goldStar : theme.star}
              style={{
                position: "absolute",
                width: s.w,
                height: s.h,
                textAlign: "center",
                transform: [{ translateX: s.x }, { translateY: s.y }],
              }}
            />
          ))}

          {/* Floating +5 for gold catches */}
          {floaters.map((f) => {
            const life = 700;
            const opacity = Math.max(0, 1 - f.age / life);
            return (
              <Text
                key={f.id}
                style={{
                  position: "absolute",
                  transform: [{ translateX: f.x }, { translateY: f.y }],
                  color: "#fbbf24", // amber-400
                  fontWeight: "800",
                  fontSize: 16,
                  opacity,
                  textShadowColor: "rgba(0,0,0,0.35)",
                  textShadowOffset: { width: 0, height: 1 },
                  textShadowRadius: 2,
                }}
              >
                +5
              </Text>
            );
          })}

          {/* Basket */}
          <FontAwesome5
            name="shopping-basket"
            size={BASKET_H}
            color={theme.basket}
            style={[
              styles.basketIcon,
              {
                width: BASKET_W,
                height: BASKET_H,
                textAlign: "center",
                transform: [{ translateX: bx }, { translateY: by }],
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
            <Text style={styles.btnText}>{score > 0 || lives < 3 ? "ድገም" : "ጀምር"}</Text>
          </Pressable>
        ) : (
          <Pressable
            style={[styles.btn, { width: stageW }, styles.pause]}
            onPress={() => {
              setRunning(false);
              stopGameLoops();
            }}
          >
            <Text style={styles.btnText}>ምቁራፅ</Text>
          </Pressable>
        )}

        {!running && (score > 0 || lives < 3) && (
          <Text style={[styles.hint, { color: theme.hint }]}>
            ጸወታ ተወዲኡ - ነጥብኹም {score}
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
          ንኹለን ከዋኽብቲ ክትሕዙወን ፈትኑ
          </Text>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 6 },
  title: { fontSize: 18, fontWeight: "700" },
  score: { fontSize: 16, fontWeight: "600", marginTop: 6 },
  caughtRow: {
    minHeight: 24,
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  caughtLabel: { fontSize: 14, fontWeight: "600" },
  caughtStars: { alignItems: "center", gap: 3, paddingRight: 8 },
  stageWrapper: { flex: 1, paddingHorizontal: 12, paddingBottom: 8 },
  stage: { flex: 1, borderWidth: 2, borderRadius: 14, overflow: "hidden" },
  basketIcon: { position: "absolute", zIndex: 2 },
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
