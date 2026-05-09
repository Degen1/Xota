export const APP_THEME = {
  light: {
    background: '#f5f6f8',
    surface: '#ffffff',
    card: '#ffffff',
    mutedSurface: '#f2f2f7',
    border: '#dfe3e9',
    text: '#13151a',
    mutedText: '#5e6673',
    subtleText: '#8f96a3',
    accent: '#007aff',
    onAccent: '#ffffff',
    tabBarInactive: '#6d7380',
    tabBarActive: '#111319',
  },
  dark: {
    background: '#0f1217',
    surface: '#171b22',
    card: '#1e242e',
    mutedSurface: '#252d39',
    border: '#323c4a',
    text: '#f4f7fb',
    mutedText: '#b8c0cc',
    subtleText: '#8f97a5',
    accent: '#4b93ff',
    onAccent: '#ffffff',
    tabBarInactive: '#98a1af',
    tabBarActive: '#ffffff',
  },
};

export function getAppTheme(colorScheme) {
  return colorScheme === 'dark' ? APP_THEME.dark : APP_THEME.light;
}
