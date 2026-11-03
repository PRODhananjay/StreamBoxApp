import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE = { text: '#F2F2F2', muted: '#A8ADB7' };

export const THEMES = {
  Amber:   { ...BASE, bg: '#0F1115', card: '#171A21', accent: '#F5B544' },
  Cyan:    { ...BASE, bg: '#0B1220', card: '#131C2E', accent: '#22D3EE' },
  Crimson: { ...BASE, bg: '#0A0A0A', card: '#151515', accent: '#E5484D' },
  Mint:    { ...BASE, bg: '#08130F', card: '#10201A', accent: '#34D399' },
};

const ThemeContext = createContext({ c: THEMES.Amber, name: 'Amber', setName: () => {} });
export const useTheme = () => useContext(ThemeContext);

export function ThemeProvider({ children }) {
  const [name, setNameState] = useState('Amber');

  useEffect(() => {
    AsyncStorage.getItem('sb-theme').then((n) => { if (n && THEMES[n]) setNameState(n); });
  }, []);

  const value = useMemo(() => ({
    c: THEMES[name],
    name,
    setName: (n) => { setNameState(n); AsyncStorage.setItem('sb-theme', n); },
  }), [name]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

// hsl -> "#rrggbb" (used for the generated poster gradients)
export function hsl(h, s, l) {
  s /= 100; l /= 100;
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const x = (v) => Math.round(255 * v).toString(16).padStart(2, '0');
  return `#${x(f(0))}${x(f(8))}${x(f(4))}`;
}
