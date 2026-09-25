import React, { Fragment, useCallback, useEffect, useRef, useState, type ComponentType } from 'react';
import { ActivityIndicator, Platform, RefreshControl, ScrollView, View, type ScrollViewProps } from 'react-native';
import { getAppTheme } from '@/constants/appTheme';
import { useAppTheme } from '@/hooks/useAppTheme';

type Props = ScrollViewProps & { onRefresh?: () => void | Promise<void>; refreshLabel?: string };

/** Native refresh on every page, including pages too short to scroll. */
export function RefreshableScrollView({ children, onRefresh, refreshLabel = 'ይሕደስ ኣሎ…', contentContainerStyle, ...props }: Props) {
  const { colorScheme } = useAppTheme();
  const theme = getAppTheme(colorScheme);
  const [refreshing, setRefreshing] = useState(false);
  const [revision, setRevision] = useState(0);
  const busy = useRef(false);
  const mounted = useRef(true);
  const scrollTop = useRef(0);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const pulled = useRef(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const refresh = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    setRefreshing(true);
    try {
      // Remount page contents to dispose game timers and reset local state, keeping app preferences.
      if (onRefresh) await onRefresh();
      else setRevision(n => n + 1);
      await new Promise(resolve => setTimeout(resolve, 350));
    } finally {
      busy.current = false;
      if (mounted.current) setRefreshing(false);
    }
  }, [onRefresh]);
  return <ScrollView {...props}
    style={[{ flex: 1, backgroundColor: theme.background }, props.style]}
    contentContainerStyle={[{ flexGrow: 1 }, contentContainerStyle]}
    alwaysBounceVertical bounces
    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh}
      tintColor={theme.accent} colors={[theme.accent]} progressBackgroundColor={theme.surface}
      title={refreshLabel} titleColor={theme.mutedText} />}
    scrollEventThrottle={16}
    onScroll={event => { scrollTop.current = event.nativeEvent.contentOffset.y; props.onScroll?.(event); }}
    onPointerDown={event => {
      if (Platform.OS === 'web') {
        touchStart.current = scrollTop.current <= 0 ? { x: event.nativeEvent.pageX, y: event.nativeEvent.pageY } : null;
        pulled.current = false;
      }
      props.onPointerDown?.(event);
    }}
    onPointerMove={event => {
      const start = touchStart.current;
      if (Platform.OS === 'web' && start) pulled.current = event.nativeEvent.pageY - start.y > 90 && Math.abs(event.nativeEvent.pageX - start.x) < 50;
      props.onPointerMove?.(event);
    }}
    onPointerUp={event => {
      if (Platform.OS === 'web' && pulled.current) void refresh();
      touchStart.current = null; pulled.current = false;
      props.onPointerUp?.(event);
    }}
    onPointerCancel={event => { touchStart.current = null; pulled.current = false; props.onPointerCancel?.(event); }}>
    {Platform.OS === 'web' && refreshing && <ActivityIndicator accessibilityLabel={refreshLabel} color={theme.accent} style={{ position: 'absolute', top: 8, left: 0, right: 0, zIndex: 10 }} />}
    <Fragment key={revision}>{children}</Fragment>
  </ScrollView>;
}

/** The scroll container stays mounted while a refreshed game is completely recreated. */
export function withGameRefresh(Game: ComponentType, fixedHeight = false) {
  function RefreshableGame() {
    return <RefreshableScrollView refreshLabel="ሓድሽ ጸወታ…"
      contentContainerStyle={fixedHeight ? { height: '100%' } : { flexGrow: 1 }}>
      <View style={{ flex: 1 }}><Game /></View>
    </RefreshableScrollView>;
  }
  RefreshableGame.displayName = `Refreshable${Game.displayName || Game.name || 'Game'}`;
  return RefreshableGame;
}
