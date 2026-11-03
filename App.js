import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, BackHandler, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as DocumentPicker from 'expo-document-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

import { supabase } from './src/supabase';
import { DEMO_MOVIES, DEMO_USER } from './src/demo';
import { ThemeProvider, useTheme } from './src/theme';
import { resumable } from './src/components';
import { Detail, Home, MyList, Profile, Search } from './src/screens';
import Auth from './src/Auth';
import Player from './src/Player';
import Splash from './src/Splash';

const TABS = [
  ['home', 'home', 'Home'],
  ['search', 'search', 'Search'],
  ['list', 'bookmark', 'My List'],
  ['profile', 'person', 'Profile'],
];

export default function App() {
  const [splash, setSplash] = useState(true);
  const [demo, setDemo] = useState(false);

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <Root demo={demo} setDemo={setDemo} />
        {splash && <Splash onDone={() => setSplash(false)} />}
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

function Root({ demo, setDemo }) {
  if (demo) return <Main demo onExit={() => setDemo(false)} />;
  return <Main onDemo={() => setDemo(true)} />;
}

function Main({ demo = false, onDemo, onExit }) {
  const { c } = useTheme();
  const [session, setSession] = useState(undefined); // undefined = still loading
  const [movies, setMovies] = useState([]);
  const [list, setList] = useState(new Set());
  const [progress, setProgress] = useState({}); // movie_id -> row
  const [tab, setTab] = useState('home');
  const [detailId, setDetailId] = useState(null);
  const [playing, setPlaying] = useState(null);
  const [loadError, setLoadError] = useState('');

  /* ---------- auth session (Supabase stores it in AsyncStorage, so users stay signed in) ---------- */
  useEffect(() => {
    if (demo) { setSession({ user: DEMO_USER }); return; }
    if (!supabase) { setSession(null); return; }
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, [demo]);

  const userId = session?.user?.id;

  /* ---------- load data ---------- */
  const load = useCallback(async () => {
    if (demo) {
      setMovies(DEMO_MOVIES);
      const [l, p] = await Promise.all([AsyncStorage.getItem('sb-demo-list'), AsyncStorage.getItem('sb-demo-progress')]);
      setList(new Set(l ? JSON.parse(l) : []));
      setProgress(p ? JSON.parse(p) : {});
      return;
    }
    const [m, l, p] = await Promise.all([
      supabase.from('movies').select('*').order('created_at'),
      supabase.from('my_list').select('movie_id'),
      supabase.from('progress').select('*'),
    ]);
    const err = m.error || l.error || p.error;
    setLoadError(err ? err.message : '');
    setMovies(m.data || []);
    setList(new Set((l.data || []).map((r) => r.movie_id)));
    setProgress(Object.fromEntries((p.data || []).map((r) => [r.movie_id, r])));
  }, [demo]);

  useEffect(() => { if (userId) load(); }, [userId, load]);

  // Demo mode: remember list and progress on the phone
  useEffect(() => {
    if (!demo || !userId) return;
    AsyncStorage.setItem('sb-demo-list', JSON.stringify([...list]));
    AsyncStorage.setItem('sb-demo-progress', JSON.stringify(progress));
  }, [demo, userId, list, progress]);

  /* ---------- actions ---------- */
  // Optimistic toggle, then write to the database
  const toggleList = async (id) => {
    const has = list.has(id);
    setList((prev) => { const n = new Set(prev); if (has) n.delete(id); else n.add(id); return n; });
    if (demo) return;
    const { error } = has
      ? await supabase.from('my_list').delete().eq('movie_id', id)
      : await supabase.from('my_list').insert({ movie_id: id });
    if (error) load(); // roll back by reloading
  };

  const onPlay = (movie) => {
    const p = progress[movie.id];
    setPlaying({ movie, startAt: resumable(p) ? p.t : 0 });
  };

  const closePlayer = (final) => {
    const id = playing.movie.id;
    // update local progress immediately so Continue Watching is current
    if (final?.d) {
      setProgress((prev) => ({ ...prev, [id]: { user_id: userId, movie_id: id, t: final.t, d: final.d, updated_at: new Date().toISOString() } }));
    }
    setPlaying(null);
  };

  // Remove all watch progress (Continue Watching)
  const clearHistory = async () => {
    setProgress({});
    if (!demo && supabase) await supabase.from('progress').delete().eq('user_id', userId);
  };

  // Demo only: pick a video file from the phone
  const addLocal = async () => {
    const r = await DocumentPicker.getDocumentAsync({ type: 'video/*', copyToCacheDirectory: false });
    if (r.canceled) return;
    const f = r.assets[0];
    const movie = {
      id: 'local-' + Date.now(), title: f.name.replace(/\.[^.]+$/, ''), genre: 'My Videos',
      hue: Math.floor(Math.random() * 360), about: 'A video file from this phone.', video_url: f.uri,
    };
    setMovies((prev) => [...prev, movie]);
    setTab('home'); setDetailId(movie.id);
  };

  const goTab = (t) => { setTab(t); setDetailId(null); };

  /* ---------- Android back button: detail -> tab -> home -> exit ---------- */
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (playing) return false; // the player's Modal handles its own back
      if (detailId) { setDetailId(null); return true; }
      if (tab !== 'home') { setTab('home'); return true; }
      return false;
    });
    return () => sub.remove();
  }, [playing, detailId, tab]);

  /* ---------- render ---------- */
  if (session === undefined) {
    return <View style={[styles.fill, styles.center, { backgroundColor: c.bg }]}><ActivityIndicator color={c.accent} /></View>;
  }
  if (!session) return <><StatusBar style="dark" /><Auth onDemo={onDemo} /></>;

  const detail = detailId && movies.find((m) => m.id === detailId);
  const common = { movies, list, progress, onOpen: setDetailId, onPlay, toggleList };

  let screen;
  if (detail) screen = <Detail movie={detail} {...common} onBack={() => setDetailId(null)} />;
  else if (tab === 'home') screen = <Home {...common} />;
  else if (tab === 'search') screen = <Search movies={movies} onOpen={setDetailId} />;
  else if (tab === 'list') screen = <MyList movies={movies} list={list} onOpen={setDetailId} />;
  else screen = <Profile userId={userId} email={session.user.email} demo={demo} progress={progress} listCount={list.size}
    onGoList={() => goTab('list')} onClearHistory={clearHistory} onAddLocal={addLocal}
    onSignOut={demo ? onExit : () => supabase.auth.signOut()} />;

  return (
    <SafeAreaView style={[styles.fill, { backgroundColor: c.bg }]} edges={['top', 'left', 'right']}>
      <StatusBar style="light" />
      <Text style={[styles.logo, { color: c.accent }]}>StreamBox</Text>
      {!!loadError && <Text style={styles.error}>Could not load data: {loadError}. Did you run supabase.sql?</Text>}
      <View style={styles.fill}>{screen}</View>

      <SafeAreaView edges={['bottom']} style={[styles.nav, { backgroundColor: c.card }]}>
        <View style={styles.navRow}>
          {TABS.map(([id, icon, label]) => {
            const active = tab === id && !detail;
            return (
              <Pressable key={id} onPress={() => goTab(id)} style={styles.navBtn} accessibilityRole="tab" accessibilityState={{ selected: active }}>
                <Ionicons name={active ? icon : `${icon}-outline`} size={24} color={active ? c.accent : c.muted} />
                <Text style={{ color: active ? c.accent : c.muted, fontSize: 11 }}>{label}</Text>
              </Pressable>
            );
          })}
        </View>
      </SafeAreaView>

      {playing && <Player movie={playing.movie} startAt={playing.startAt} userId={userId} onClose={closePlayer} />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  logo: { fontSize: 24, fontWeight: '800', paddingHorizontal: 16, paddingTop: 6, paddingBottom: 4, letterSpacing: 0.5 },
  error: { color: '#ff7b80', paddingHorizontal: 16 },
  nav: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#ffffff20' },
  navRow: { flexDirection: 'row', minHeight: 56 },
  navBtn: { flex: 1, minHeight: 56, alignItems: 'center', justifyContent: 'center', gap: 2 },
});
