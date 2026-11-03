import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Modal, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useEvent, useEventListener } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import * as ScreenOrientation from 'expo-screen-orientation';
import { useKeepAwake } from 'expo-keep-awake';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from './supabase';
import { useTheme } from './theme';
import EmbeddedPlayer from './EmbeddedPlayer';

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

export default function Player(props) {
  const isEmbedded = /(?:\.php(?:[?#]|$)|\/embed(?:\/|[?#]|$))/i.test(props.movie.video_url);
  return isEmbedded ? <EmbeddedPlayer {...props} /> : <DirectPlayer {...props} />;
}

// 75 -> "1:15", 3700 -> "1:01:40"
function fmt(sec) {
  if (!isFinite(sec) || sec < 0) sec = 0;
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60).toString().padStart(2, '0');
  return h ? `${h}:${m.toString().padStart(2, '0')}:${s}` : `${m}:${s}`;
}

// Full-screen landscape player with custom controls.
// Props: movie, startAt (seconds), userId, onClose({ t, d })
function DirectPlayer({ movie, startAt = 0, userId, onClose }) {
  const { c } = useTheme();
  useKeepAwake(); // don't let the screen sleep while watching

  const isHls = /\.m3u8(\?|$)/i.test(movie.video_url);
  const player = useVideoPlayer(
    { uri: movie.video_url, contentType: isHls ? 'hls' : 'auto' },
    (p) => { p.timeUpdateEventInterval = 0.5; },
  );

  const [time, setTime] = useState(startAt);
  const [dur, setDur] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showUI, setShowUI] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [muted, setMuted] = useState(false);
  const [flash, setFlash] = useState('');
  const [scrub, setScrub] = useState(null); // seconds while dragging the seek bar, else null

  const last = useRef({ t: startAt, d: 0 });
  const started = useRef(false);
  const hideTimer = useRef(null);
  const trackW = useRef(1);

  const { isPlaying } = useEvent(player, 'playingChange', { isPlaying: player.playing });

  /* ---------- landscape while watching, back to free rotation after ---------- */
  useEffect(() => {
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE).catch(() => {});
    return () => { ScreenOrientation.unlockAsync().catch(() => {}); };
  }, []);

  /* ---------- player events ---------- */
  useEventListener(player, 'statusChange', ({ status }) => {
    if (status === 'readyToPlay') {
      setLoading(false);
      setDur(player.duration);
      // First time only: resume (unless within 5s of the end), then play
      if (!started.current) {
        started.current = true;
        if (startAt > 0 && (!player.duration || startAt < player.duration - 5)) player.currentTime = startAt;
        player.play();
      }
    } else if (status === 'loading') setLoading(true);
    else if (status === 'error') { setLoading(false); setError('This video could not be played.'); }
  });

  useEventListener(player, 'timeUpdate', ({ currentTime, bufferedPosition }) => {
    setTime(currentTime);
    if (bufferedPosition > 0) setBuffered(bufferedPosition);
    if (player.duration) { setDur(player.duration); last.current = { t: currentTime, d: player.duration }; }
  });

  /* ---------- save progress ---------- */
  const save = useCallback(async () => {
    const { t, d } = last.current;
    if (!d || !supabase || userId === 'demo') return; // demo: App.js keeps progress locally
    await supabase.from('progress').upsert({
      user_id: userId, movie_id: movie.id, t, d, updated_at: new Date().toISOString(),
    });
  }, [movie.id, userId]);

  // every 5 seconds while playing
  useEffect(() => {
    const id = setInterval(() => { if (player.playing) save(); }, 5000);
    return () => clearInterval(id);
  }, [player, save]);

  // on pause
  useEffect(() => { if (!isPlaying && started.current) save(); }, [isPlaying, save]);

  const close = async () => {
    await save();
    onClose(last.current);
  };

  /* ---------- controls ---------- */
  // Show controls, hide again after 3s while playing
  const wake = useCallback(() => {
    setShowUI(true);
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => { if (player.playing) setShowUI(false); }, 3000);
  }, [player]);
  useEffect(() => { wake(); return () => clearTimeout(hideTimer.current); }, [wake]);

  const togglePlay = () => { if (player.playing) player.pause(); else player.play(); wake(); };

  const seekBy = (delta) => {
    const target = Math.max(0, Math.min(player.duration || 0, player.currentTime + delta));
    player.currentTime = target;
    setTime(target);
    setFlash(delta > 0 ? `+${delta}s` : `${delta}s`);
    setTimeout(() => setFlash(''), 600);
    wake();
  };

  const cycleSpeed = () => {
    const next = SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length];
    player.playbackRate = next;
    setSpeed(next);
    wake();
  };

  const toggleMute = () => { player.muted = !muted; setMuted(!muted); wake(); };

  // Seek bar: touch or drag anywhere on the track
  const seekPan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (e) => updateScrub(e.nativeEvent.locationX),
    onPanResponderMove: (e) => updateScrub(e.nativeEvent.locationX),
    onPanResponderRelease: () => commitScrub(),
    onPanResponderTerminate: () => commitScrub(),
  })).current;

  const scrubRef = useRef(null);
  const durRef = useRef(0);
  durRef.current = dur;
  function updateScrub(x) {
    const ratio = Math.max(0, Math.min(1, x / trackW.current));
    scrubRef.current = ratio * durRef.current;
    setScrub(scrubRef.current);
    clearTimeout(hideTimer.current);
  }
  function commitScrub() {
    if (scrubRef.current != null) { player.currentTime = scrubRef.current; setTime(scrubRef.current); }
    scrubRef.current = null;
    setScrub(null);
    wake();
  }

  const shown = scrub ?? time;
  const played = dur ? (shown / dur) * 100 : 0;
  const buf = dur ? (buffered / dur) * 100 : 0;

  return (
    <Modal visible animationType="fade" supportedOrientations={['landscape', 'landscape-left', 'landscape-right', 'portrait']}
      statusBarTranslucent onRequestClose={close}>
      <StatusBar hidden />
      <View style={styles.root}>
        <VideoView player={player} style={StyleSheet.absoluteFill} nativeControls={false} contentFit="contain"
          allowsPictureInPicture={false} />

        {/* full-area touch layer: tap = show/hide controls, double-tap sides = seek */}
        <DoubleTapZones onTap={() => { if (showUI) { setShowUI(false); clearTimeout(hideTimer.current); } else wake(); }}
          onSeek={seekBy} />

        {loading && !error && <ActivityIndicator size="large" color={c.accent} style={styles.spinner} pointerEvents="none" />}
        {!!error && <Text style={styles.error}>{error}</Text>}
        {!!flash && <View style={styles.flash} pointerEvents="none"><Text style={styles.flashText}>{flash}</Text></View>}

        {showUI && (
          <SafeAreaView style={StyleSheet.absoluteFill} pointerEvents="box-none">
            {/* top bar */}
            <View style={styles.top} pointerEvents="box-none">
              <Pressable onPress={close} style={styles.iconBtn} accessibilityLabel="Close player" hitSlop={8}>
                <Ionicons name="arrow-back" size={26} color="#fff" />
              </Pressable>
              <Text style={styles.title} numberOfLines={1}>{movie.title}</Text>
            </View>

            {/* centre controls */}
            <View style={styles.center} pointerEvents="box-none">
              <Pressable onPress={() => seekBy(-10)} style={styles.round} accessibilityLabel="Back 10 seconds">
                <Ionicons name="play-back" size={22} color="#fff" /><Text style={styles.small}>10</Text>
              </Pressable>
              <Pressable onPress={togglePlay} style={[styles.round, styles.big, { backgroundColor: c.accent }]}
                accessibilityLabel={isPlaying ? 'Pause' : 'Play'}>
                <Ionicons name={isPlaying ? 'pause' : 'play'} size={34} color="#111" />
              </Pressable>
              <Pressable onPress={() => seekBy(10)} style={styles.round} accessibilityLabel="Forward 10 seconds">
                <Text style={styles.small}>10</Text><Ionicons name="play-forward" size={22} color="#fff" />
              </Pressable>
            </View>

            {/* bottom bar */}
            <View style={styles.bottom} pointerEvents="box-none">
              <View style={styles.seek} onLayout={(e) => { trackW.current = e.nativeEvent.layout.width; }} {...seekPan.panHandlers}>
                <View style={styles.track} pointerEvents="none">
                  <View style={[styles.fill, { width: `${buf}%`, backgroundColor: '#ffffff55' }]} />
                  <View style={[styles.fill, { width: `${played}%`, backgroundColor: c.accent }]} />
                </View>
                <View pointerEvents="none" style={[styles.thumb, { left: `${played}%`, backgroundColor: c.accent }]} />
              </View>
              <View style={styles.row}>
                <Text style={styles.time}>{fmt(shown)} / {fmt(dur)}</Text>
                <View style={{ flex: 1 }} />
                <Pressable onPress={toggleMute} style={styles.iconBtn} accessibilityLabel={muted ? 'Unmute' : 'Mute'}>
                  <Ionicons name={muted ? 'volume-mute' : 'volume-high'} size={22} color="#fff" />
                </Pressable>
                <Pressable onPress={cycleSpeed} style={styles.iconBtn} accessibilityLabel="Playback speed">
                  <Text style={styles.speed}>{speed}×</Text>
                </Pressable>
              </View>
            </View>
          </SafeAreaView>
        )}
      </View>
    </Modal>
  );
}

// Three invisible touch zones: left/right double-tap seeks, any single tap toggles controls
function DoubleTapZones({ onTap, onSeek }) {
  const last = useRef({ at: 0, side: 0 });
  const press = (side) => {
    const now = Date.now();
    if (now - last.current.at < 300 && last.current.side === side && side !== 0) {
      last.current.at = 0;
      onSeek(side * 10);
    } else {
      last.current = { at: now, side };
      onTap();
    }
  };
  return (
    <View style={StyleSheet.absoluteFill} flexDirection="row">
      <Pressable style={{ flex: 1 }} onPress={() => press(-1)} accessible={false} />
      <Pressable style={{ flex: 1 }} onPress={() => press(0)} accessible={false} />
      <Pressable style={{ flex: 1 }} onPress={() => press(1)} accessible={false} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  spinner: { position: 'absolute', top: '50%', left: '50%', marginLeft: -18, marginTop: -18 },
  error: { position: 'absolute', top: '50%', width: '100%', textAlign: 'center', color: '#ff9a9d', fontSize: 16 },
  flash: { position: 'absolute', top: '40%', alignSelf: 'center', backgroundColor: '#000a', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  flashText: { color: '#fff', fontWeight: '700' },
  top: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingTop: 8, gap: 8, backgroundColor: '#0006' },
  title: { color: '#fff', fontSize: 17, fontWeight: '700', flex: 1 },
  iconBtn: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  center: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 40 },
  round: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#0008', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 2 },
  big: { width: 72, height: 72, borderRadius: 36 },
  small: { color: '#fff', fontWeight: '700', fontSize: 12 },
  bottom: { paddingHorizontal: 16, paddingBottom: 6, backgroundColor: '#0006' },
  seek: { height: 36, justifyContent: 'center' },
  track: { height: 5, borderRadius: 3, backgroundColor: '#ffffff35', overflow: 'hidden' },
  fill: { position: 'absolute', left: 0, top: 0, bottom: 0 },
  thumb: { position: 'absolute', width: 16, height: 16, borderRadius: 8, marginLeft: -8, top: 10 },
  row: { flexDirection: 'row', alignItems: 'center' },
  time: { color: '#fff', fontSize: 13, fontVariant: ['tabular-nums'] },
  speed: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
