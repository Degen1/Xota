import { useColorScheme as useReactNativeColorScheme } from 'react-native';

export function useColorScheme(): 'light' | 'dark' {
  return useReactNativeColorScheme() === 'dark' ? 'dark' : 'light';
}
