import React, { createContext, useContext, useMemo, useState } from 'react';
import { useColorScheme as useDeviceColorScheme } from 'react-native';

const AppThemeContext = createContext(null);

function resolveColorScheme(preference, deviceColorScheme) {
  if (preference === 'system') {
    return deviceColorScheme === 'dark' ? 'dark' : 'light';
  }

  return preference;
}

export function AppThemeProvider({ children }) {
  const deviceColorScheme = useDeviceColorScheme();
  const [preference, setPreference] = useState('system');
  const colorScheme = resolveColorScheme(preference, deviceColorScheme);

  const value = useMemo(
    () => ({
      preference,
      setPreference,
      colorScheme,
    }),
    [preference, colorScheme]
  );

  return <AppThemeContext.Provider value={value}>{children}</AppThemeContext.Provider>;
}

export function useAppTheme() {
  const context = useContext(AppThemeContext);
  const deviceColorScheme = useDeviceColorScheme();

  if (context) {
    return context;
  }

  return {
    preference: 'system',
    setPreference: () => {},
    colorScheme: deviceColorScheme === 'dark' ? 'dark' : 'light',
  };
}
