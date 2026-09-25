import { NativeTabs } from 'expo-router/unstable-native-tabs';
import React from 'react';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <NativeTabs tintColor={Colors[colorScheme ?? 'light'].tint}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>ጸወታ</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="gamecontroller.fill" md="sports_esports" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="setting">
        <NativeTabs.Trigger.Label>መማረጺ</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="gearshape.fill" md="settings" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="explore" hidden>
        <NativeTabs.Trigger.Label>ብዛዕባ</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="paperplane.fill" md="send" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
