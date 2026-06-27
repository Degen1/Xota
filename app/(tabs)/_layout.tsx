import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
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
        <NativeTabs.Trigger.Icon
          renderingMode="template"
          src={<NativeTabs.Trigger.VectorIcon family={MaterialCommunityIcons} name="gamepad-variant" />}
        />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="setting">
        <NativeTabs.Trigger.Label>መማረጺ</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          renderingMode="template"
          src={<NativeTabs.Trigger.VectorIcon family={MaterialCommunityIcons} name="cog" />}
        />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="explore" hidden>
        <NativeTabs.Trigger.Label>Explore</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          renderingMode="template"
          src={<NativeTabs.Trigger.VectorIcon family={MaterialCommunityIcons} name="send" />}
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
