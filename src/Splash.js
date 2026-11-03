import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

const LETTERS = 'StreamBox'.split('');

// Animated start-up screen: letters bounce in one by one, dots pulse, then it fades away.
// The native splash (app.json) is the same amber colour, so the hand-over is seamless.
export default function Splash({ onDone }) {
  const letters = useRef(LETTERS.map(() => new Animated.Value(0))).current;
  const dots = useRef([0, 1, 2].map(() => new Animated.Value(0.25))).current;
  const fade = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // letters in, staggered
    Animated.stagger(70, letters.map((v) =>
      Animated.spring(v, { toValue: 1, friction: 5, tension: 120, useNativeDriver: true }))).start();

    // dots pulse in a loop
    const loops = dots.map((v, i) => Animated.loop(Animated.sequence([
      Animated.delay(i * 150),
      Animated.timing(v, { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.timing(v, { toValue: 0.25, duration: 350, useNativeDriver: true }),
    ])));
    loops.forEach((l) => l.start());

    // after ~2s fade out, then tell the parent to remove us
    const t = setTimeout(() => {
      Animated.timing(fade, { toValue: 0, duration: 400, useNativeDriver: true }).start(() => onDone());
    }, 2000);
    return () => { clearTimeout(t); loops.forEach((l) => l.stop()); };
  }, []);

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.wrap, { opacity: fade }]} accessibilityLabel="StreamBox">
      <View style={styles.logo}>
        {LETTERS.map((ch, i) => (
          <Animated.Text key={i} style={[styles.letter, {
            opacity: letters[i],
            transform: [{ translateY: letters[i].interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) },
                        { scale: letters[i].interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) }],
          }]}>{ch}</Animated.Text>
        ))}
      </View>
      <View style={styles.dots}>
        {dots.map((v, i) => <Animated.View key={i} style={[styles.dot, { opacity: v, transform: [{ scale: v.interpolate({ inputRange: [0.25, 1], outputRange: [1, 1.3] }) }] }]} />)}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { backgroundColor: '#F5B544', alignItems: 'center', justifyContent: 'center', gap: 22, zIndex: 50 },
  logo: { flexDirection: 'row' },
  letter: { fontSize: 42, fontWeight: '800', color: '#111', letterSpacing: 1 },
  dots: { flexDirection: 'row', gap: 8 },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: '#111' },
});
