import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Icon, Label, NativeTabs, VectorIcon } from 'expo-router/unstable-native-tabs';
import React from 'react';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <NativeTabs tintColor={Colors[colorScheme ?? 'light'].tint}>
      <NativeTabs.Trigger name="index">
        <Label>ጸወታ</Label>
        <Icon src={<VectorIcon family={MaterialCommunityIcons} name="gamepad-variant" />} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="setting">
        <Label>መማረጺ</Label>
        <Icon src={<VectorIcon family={MaterialCommunityIcons} name="cog" />} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="explore" hidden>
        <Label>Explore</Label>
        <Icon src={<VectorIcon family={MaterialCommunityIcons} name="send" />} />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
