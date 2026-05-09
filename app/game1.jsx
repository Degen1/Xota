// App.js
import React, { useEffect, useRef, useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useExtraLifeReward } from '@/hooks/useExtraLifeReward';
import { useAppTheme } from '@/hooks/useAppTheme';

const FLOOR_HEIGHT = 90;
const BALL_RADIUS = 18;
const BALL_DIAMETER = BALL_RADIUS * 2;
const BALL_X = 80;

const GRAVITY = 0.9;
const JUMP_FORCE = -17;
const OBSTACLE_SPEED = 5.5;
const SPAWN_GAP_MIN = 1400;
const SPAWN_GAP_MAX = 2400;
const OBSTACLE_WIDTH = 44;
const OBSTACLE_MIN_HEIGHT = 30;
const OBSTACLE_MAX_HEIGHT = 110;

export default function App() {
  const { colorScheme } = useAppTheme();
  const isDark = colorScheme === "dark";
  const theme = isDark
    ? {
        bg: "#0f172a",
        floor: "#1e293b",
        floorBorder: "#334155",
        ball: "#60a5fa",
        ballBorder: "#dbeafe",
        obstacle: "#475569",
        score: "#ffffff",
        sub: "#cbd5e1",
        hint: "#94a3b8",
        title: "#f8fafc",
      }
    : {
        bg: "#eef2f7",
        floor: "#cbd5e1",
        floorBorder: "#94a3b8",
        ball: "#4f46e5",
        ballBorder: "#ffffff",
        obstacle: "#333333",
        score: "#1f2937",
        sub: "#374151",
        hint: "#6b7280",
        title: "#111827",
      };

  const [gameWidth, setGameWidth] = useState(0);
  const [gameHeight, setGameHeight] = useState(null);
  const floorTop = gameHeight != null ? gameHeight - FLOOR_HEIGHT : 0;
  const ballRestY = floorTop - BALL_DIAMETER;

  const [ballYState, setBallYState] = useState(0);
  const [obstacles, setObstacles] = useState([]);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [lives, setLives] = useState(1);
  const [canRestartAfterReward, setCanRestartAfterReward] = useState(true);
  const { isGrantingLife, showForExtraLife } = useExtraLifeReward();

  const runningRef = useRef(false);
  const didInitRef = useRef(false);
  const rafRef = useRef(null);
  const lastTimeRef = useRef(null);
  const lastSpawnRef = useRef(Date.now());
  const passedRef = useRef(new Set());

  const ballYRef = useRef(0);
  const velYRef = useRef(0);
  const obstaclesRef = useRef([]);
  const restartUnlockTimeoutRef = useRef(null);

  const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

  const spawnObstacle = () => {
    const height = rand(OBSTACLE_MIN_HEIGHT, OBSTACLE_MAX_HEIGHT);
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const next = [...obstaclesRef.current, { id, x: gameWidth + 20, height }];
    obstaclesRef.current = next;
    setObstacles(next);
  };

  const startLoop = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    runningRef.current = true;
    rafRef.current = requestAnimationFrame(loop);
  };

  const stopLoop = () => {
    runningRef.current = false;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
  };

  const endGame = () => {
    stopLoop();
    setIsGameOver(true);
    setLives(0);
    if (score > best) setBest(score);
  };

  const resetGame = () => {
    if (gameHeight == null) return;
    setIsGameOver(false);
    setScore(0);
    setLives(1);
    setCanRestartAfterReward(true);
    passedRef.current = new Set();
    ballYRef.current = ballRestY;
    velYRef.current = 0;
    obstaclesRef.current = [];
    setObstacles([]);
    setBallYState(ballRestY);
    lastTimeRef.current = null;
    lastSpawnRef.current = Date.now();
    startLoop();
  };

  const jump = () => {
    if (isGameOver) return;
    if (!runningRef.current) {
      resetGame();
      return;
    }
    const ballBottom = ballYRef.current + BALL_DIAMETER;
    if (ballBottom >= floorTop - 1) {
      velYRef.current = JUMP_FORCE;
    }
  };

  const circleRectCollides = (ball, rect) => {
    const nearestX = Math.max(rect.x, Math.min(ball.x, rect.x + rect.w));
    const nearestY = Math.max(rect.y, Math.min(ball.y, rect.y + rect.h));
    const dx = ball.x - nearestX;
    const dy = ball.y - nearestY;
    return dx * dx + dy * dy <= ball.r * ball.r;
  };

  const loop = (t) => {
    if (!runningRef.current) return;

    if (lastTimeRef.current == null) lastTimeRef.current = t;
    const dt = Math.min(32, t - lastTimeRef.current);
    lastTimeRef.current = t;
    const dtScale = dt / 16.67;

    velYRef.current += GRAVITY * dtScale;
    let nextBallY = ballYRef.current + velYRef.current;
    if (nextBallY > ballRestY) nextBallY = ballRestY;
    ballYRef.current = nextBallY;

    const now = Date.now();
    if (now - lastSpawnRef.current > rand(SPAWN_GAP_MIN, SPAWN_GAP_MAX)) {
      spawnObstacle();
      lastSpawnRef.current = now;
    }

    let moved = obstaclesRef.current
      .map((o) => ({ ...o, x: o.x - OBSTACLE_SPEED * dtScale }))
      .filter((o) => o.x + OBSTACLE_WIDTH > -20);

    const ballCenter = {
      x: BALL_X + BALL_RADIUS,
      y: ballYRef.current + BALL_RADIUS,
      r: BALL_RADIUS,
    };

    for (const o of moved) {
      const rect = { x: o.x, y: floorTop - o.height, w: OBSTACLE_WIDTH, h: o.height };
      if (circleRectCollides(ballCenter, rect)) {
        obstaclesRef.current = moved;
        setObstacles(moved);
        setBallYState(ballYRef.current);
        endGame();
        return;
      }
    }

    for (const o of moved) {
      const passed = o.x + OBSTACLE_WIDTH < BALL_X && !passedRef.current.has(o.id);
      if (passed) {
        passedRef.current.add(o.id);
        setScore((s) => s + 1);
      }
    }

    obstaclesRef.current = moved;
    setObstacles(moved);
    setBallYState(ballYRef.current);

    rafRef.current = requestAnimationFrame(loop);
  };

  useEffect(() => {
    if (gameHeight != null && gameWidth > 0) {
      ballYRef.current = ballRestY;
      velYRef.current = 0;
      setBallYState(ballRestY);
      if (!didInitRef.current) {
        didInitRef.current = true;
        setLives(1);
      }
    }
    return () => {
      stopLoop();
      if (restartUnlockTimeoutRef.current) {
        clearTimeout(restartUnlockTimeoutRef.current);
        restartUnlockTimeoutRef.current = null;
      }
    };
  }, [gameHeight, gameWidth]); // eslint-disable-line react-hooks/exhaustive-deps

  const onAddLife = async () => {
    if (!isGameOver || lives > 0 || isGrantingLife) return;
    const didEarnReward = await showForExtraLife();
    if (!didEarnReward) return;
    setCanRestartAfterReward(false);
    setLives(1);
    if (restartUnlockTimeoutRef.current) {
      clearTimeout(restartUnlockTimeoutRef.current);
    }
    restartUnlockTimeoutRef.current = setTimeout(() => {
      setCanRestartAfterReward(true);
      restartUnlockTimeoutRef.current = null;
    }, 700);
  };

  const actionBtnWidth = gameWidth > 0 ? gameWidth : 220;

  return (
    <Pressable style={[styles.container, { backgroundColor: theme.bg }]} onPress={jump}>
      {/* HUD */}
      <View style={styles.hud}>
        <Text style={[styles.score, { color: theme.score }]}>ነጥቢ: {score}</Text>
        <Text style={[styles.best, { color: theme.sub }]}>ዝላዓለ ነጥቢ: {best}</Text>
        <Text style={[styles.best, { color: theme.sub }]}>ህይወት: {lives}</Text>
        <Text style={[styles.hint, { color: theme.hint }]}>
          {isGameOver ? "ጠውቅ ዳግማይ ንምጅማር" : "ጥውቅ ንኽትዘልል"}
        </Text>
      </View>

      {/* Game Area */}
      <View
        style={styles.gameArea}
        onLayout={(e) => {
          const { width, height } = e.nativeEvent.layout;
          setGameWidth(width);
          setGameHeight(height);
        }}
      >
        {/* Ball */}
        {gameHeight != null && (
          <View
            style={[
              styles.ball,
              {
                left: BALL_X,
                top: ballYState,
                width: BALL_DIAMETER,
                height: BALL_DIAMETER,
                borderRadius: BALL_RADIUS,
                backgroundColor: theme.ball,
                borderColor: theme.ballBorder,
              },
            ]}
          />
        )}

        {/* Obstacles */}
        {gameHeight != null &&
          obstacles.map((o) => (
            <View
              key={o.id}
              style={{
                position: "absolute",
                left: o.x,
                width: OBSTACLE_WIDTH,
                height: o.height,
                bottom: FLOOR_HEIGHT,
                backgroundColor: theme.obstacle,
                borderRadius: 6,
              }}
            />
          ))}

        {/* Floor */}
        {gameHeight != null && (
          <View
            style={[
              styles.floor,
              {
                top: floorTop,
                backgroundColor: theme.floor,
                borderTopColor: theme.floorBorder,
              },
            ]}
          />
        )}
      </View>

      {/* Game Over Overlay */}
      {isGameOver && (
        <View style={styles.overlay}>
          <Text style={[styles.gameOver, { color: theme.title }]}>ጸወታ ተወዲኡ</Text>
          <Text style={[styles.hintSmall, { color: theme.sub }]}>
            {lives > 0 ? "ድገም መጠወቒ ጠውቕ ንኽትቅጽል" : "ንሓደ ተወሳኺ ህይወት ማስታወቂያ ርአ"}
          </Text>
          {lives > 0 && (
            <Pressable
              style={[
                styles.restartBtn,
                { width: actionBtnWidth },
                !canRestartAfterReward && styles.disabled,
              ]}
              onPress={(e) => {
                if (!canRestartAfterReward) return;
                e.stopPropagation();
                resetGame();
              }}
              disabled={!canRestartAfterReward}>
              <Text style={styles.restartBtnText}>ድገም</Text>
            </Pressable>
          )}
          {lives <= 0 && (
            <Pressable
              style={[
                styles.extraLifeBtn,
                { width: actionBtnWidth },
                isGrantingLife && styles.disabled,
              ]}
              onPress={(e) => {
                e.stopPropagation();
                onAddLife();
              }}
              disabled={isGrantingLife}>
              <Text style={styles.extraLifeBtnText}>
                {isGrantingLife ? "Adding life..." : "+1 ህይወት"}
              </Text>
            </Pressable>
          )}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  gameArea: { flex: 1 },
  floor: {
    position: "absolute",
    height: FLOOR_HEIGHT,
    width: "100%",
    borderTopWidth: 2,
  },
  ball: {
    position: "absolute",
    borderWidth: 3,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  hud: {
    position: "absolute",
    top: 50,
    width: "100%",
    zIndex: 10,
    alignItems: "center",
    gap: 4,
  },
  score: { fontSize: 28, fontWeight: "800" },
  best: { fontSize: 16, fontWeight: "600" },
  hint: { fontSize: 14, marginTop: 2 },
  gameOver: { fontSize: 36, fontWeight: "900" },
  hintSmall: { fontSize: 16, marginTop: 6 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  extraLifeBtn: {
    marginTop: 12,
    backgroundColor: "#2563eb",
    height: 44,
    paddingHorizontal: 18,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  extraLifeBtnText: { color: "#fff", fontWeight: "800", fontSize: 15 },
  restartBtn: {
    marginTop: 12,
    backgroundColor: "#22c55e",
    height: 44,
    paddingHorizontal: 18,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  restartBtnText: { color: "#fff", fontWeight: "800", fontSize: 15 },
  disabled: { opacity: 0.65 },
});
