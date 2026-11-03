import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { hsl, useTheme } from './theme';

/* ---------- helpers shared by screens ---------- */
export const pct = (p) => (p && p.d ? Math.min(100, (p.t / p.d) * 100) : 0);
// "Resume" only if started and not (almost) finished
export const resumable = (p) => Boolean(p && p.t > 5 && pct(p) < 95);

/* ---------- Poster: image if we have one, else a gradient from the hue with the title ---------- */
export function Poster({ movie, style, showTitle = true }) {
  const h = movie.hue ?? 200;
  return (
    <View style={[{ borderRadius: 10, overflow: 'hidden' }, style]}>
      {movie.poster_url ? (
        <Image source={{ uri: movie.poster_url }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      ) : (
        <LinearGradient colors={[hsl(h, 70, 38), hsl((h + 40) % 360, 60, 12)]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}>
          {showTitle && <Text style={s.posterTitle}>{movie.title}</Text>}
        </LinearGradient>
      )}
    </View>
  );
}

/* ---------- Card used in rows and grids ---------- */
export function Card({ movie, width, wide, prog, onPress }) {
  const { c } = useTheme();
  const height = wide ? (width * 9) / 16 : (width * 3) / 2;
  return (
    <Pressable onPress={onPress} style={{ width }} accessibilityRole="button" accessibilityLabel={movie.title}>
      <Poster movie={movie} style={{ width, height }} />
      {prog && (
        <View style={[s.bar, { backgroundColor: '#ffffff30' }]}>
          <View style={{ width: `${pct(prog)}%`, height: '100%', backgroundColor: c.accent }} />
        </View>
      )}
      {/* generated posters already show the title */}
      {movie.poster_url && <Text style={[s.cardName, { color: c.text }]} numberOfLines={1}>{movie.title}</Text>}
    </Pressable>
  );
}

/* ---------- Horizontal row with a heading ---------- */
export function Row({ title, children }) {
  const { c } = useTheme();
  return (
    <View style={{ marginTop: 22 }}>
      <Text style={[s.rowTitle, { color: c.text }]}>{title}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}>
        {children}
      </ScrollView>
    </View>
  );
}

/* ---------- Button (min 44px touch target) ---------- */
export function Btn({ label, onPress, kind = 'plain', disabled, style }) {
  const { c } = useTheme();
  const look = {
    primary: { bg: c.accent, fg: '#111', border: c.accent },
    plain: { bg: c.card, fg: c.text, border: '#ffffff22' },
    ghost: { bg: 'transparent', fg: c.muted, border: 'transparent' },
    danger: { bg: 'transparent', fg: '#E5484D', border: '#E5484D' },
  }[kind];
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button"
      style={({ pressed }) => [s.btn, { backgroundColor: look.bg, borderColor: look.border, opacity: disabled ? 0.6 : pressed ? 0.8 : 1 }, style]}>
      <Text style={[s.btnText, { color: look.fg }]}>{label}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  posterTitle: { position: 'absolute', left: 10, right: 10, bottom: 10, color: '#fff', fontWeight: '800', fontSize: 16, lineHeight: 19,
    textShadowColor: '#000a', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 6 },
  bar: { height: 4, borderRadius: 2, marginTop: 6, overflow: 'hidden' },
  cardName: { marginTop: 6, fontSize: 13 },
  rowTitle: { fontSize: 17, fontWeight: '700', marginBottom: 10, paddingHorizontal: 16 },
  btn: { minHeight: 44, paddingHorizontal: 18, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  btnText: { fontWeight: '700', fontSize: 15 },
});
