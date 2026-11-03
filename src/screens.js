import { useEffect, useState } from 'react';
import { Alert, FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from './supabase';
import { Btn, Card, Poster, Row, pct, resumable } from './components';
import { THEMES, useTheme } from './theme';

// Responsive helpers: tile width for rows, column count for grids
const useLayout = () => {
  const { width, height } = useWindowDimensions();
  const land = width > height;
  return { width, height, land, tile: Math.min(150, Math.max(110, width * 0.32)), wideTile: Math.min(260, Math.max(200, width * 0.62)),
    cols: Math.max(2, Math.floor((width - 32) / 130)) };
};

const meta = (m) => [m.year, m.genre, m.mins && `${m.mins} min`].filter(Boolean).join(' · ');

/* ---------- shared bottom padding so content clears the tab bar ---------- */
const PAD = { paddingBottom: 24 };

/* ---------- Hero banner (home) ---------- */
function Hero({ movie, prog, inList, onPlay, onList, onOpen }) {
  const { c } = useTheme();
  const { width, height, land } = useLayout();
  const h = land ? Math.min(height * 0.7, width * 0.4) : Math.min(width * 1.1, height * 0.6);
  return (
    <View style={{ marginHorizontal: 16, marginTop: 8 }}>
      <Poster movie={movie} showTitle={false} style={{ width: '100%', height: h, borderRadius: 14 }} />
      <View style={s.heroInfo}>
        <Text style={[s.heroTitle, { color: '#fff' }]}>{movie.title}</Text>
        <Text style={{ color: c.muted, marginTop: 2 }}>{[movie.year, movie.genre].filter(Boolean).join(' · ')}</Text>
        <View style={s.actions}>
          <Btn kind="primary" label={resumable(prog) ? '▶ Resume' : '▶ Play'} onPress={onPlay} />
          <Btn label={inList ? '✓ In My List' : '+ My List'} onPress={onList} />
          <Btn kind="ghost" label="Details" onPress={onOpen} />
        </View>
      </View>
    </View>
  );
}

/* ---------- Home ---------- */
export function Home({ movies, list, progress, onOpen, onPlay, toggleList }) {
  const { c } = useTheme();
  const { tile, wideTile } = useLayout();
  if (!movies.length) return <Text style={[s.empty, { color: c.muted }]}>No movies yet. See the Profile tab for how to add some.</Text>;

  const byId = Object.fromEntries(movies.map((m) => [m.id, m]));
  const featured = movies[0];
  // Continue Watching: started but not finished, most recent first
  const continuing = Object.values(progress)
    .filter((p) => byId[p.movie_id] && resumable(p))
    .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
  const myList = movies.filter((m) => list.has(m.id));
  const genres = [...new Set(movies.map((m) => m.genre).filter(Boolean))];

  return (
    <ScrollView contentContainerStyle={PAD}>
      <Hero movie={featured} prog={progress[featured.id]} inList={list.has(featured.id)}
        onPlay={() => onPlay(featured)} onList={() => toggleList(featured.id)} onOpen={() => onOpen(featured.id)} />

      {continuing.length > 0 && (
        <Row title="Continue Watching">
          {continuing.map((p) => <Card key={p.movie_id} movie={byId[p.movie_id]} prog={p} wide width={wideTile} onPress={() => onPlay(byId[p.movie_id])} />)}
        </Row>
      )}
      {myList.length > 0 && (
        <Row title="My List">{myList.map((m) => <Card key={m.id} movie={m} width={tile} onPress={() => onOpen(m.id)} />)}</Row>
      )}
      <Row title="All Titles">{movies.map((m) => <Card key={m.id} movie={m} width={tile} onPress={() => onOpen(m.id)} />)}</Row>
      {genres.map((g) => (
        <Row key={g} title={g}>
          {movies.filter((m) => m.genre === g).map((m) => <Card key={m.id} movie={m} width={tile} onPress={() => onOpen(m.id)} />)}
        </Row>
      ))}
    </ScrollView>
  );
}

/* ---------- Movie detail ---------- */
export function Detail({ movie, movies, list, progress, onBack, onOpen, onPlay, toggleList }) {
  const { c } = useTheme();
  const { tile, width, height, land } = useLayout();
  const p = progress[movie.id];
  const similar = movies.filter((m) => m.id !== movie.id && m.genre === movie.genre);
  const bannerH = land ? Math.min(height * 0.6, (width * 9) / 21) : ((width - 32) * 9) / 16;
  return (
    <ScrollView contentContainerStyle={PAD}>
      <Pressable onPress={onBack} style={s.back} accessibilityRole="button" accessibilityLabel="Back">
        <Ionicons name="arrow-back" size={22} color={c.text} /><Text style={{ color: c.text, fontWeight: '600' }}>Back</Text>
      </Pressable>
      <Poster movie={movie} showTitle={false} style={{ marginHorizontal: 16, height: bannerH, borderRadius: 14 }} />
      <View style={{ padding: 16 }}>
        <Text style={[s.detailTitle, { color: c.text }]}>{movie.title}</Text>
        <Text style={{ color: c.muted, marginTop: 4 }}>{meta(movie)}</Text>
        {pct(p) > 0 && resumable(p) && (
          <View style={s.progBar}><View style={{ width: `${pct(p)}%`, height: '100%', backgroundColor: c.accent }} /></View>
        )}
        <View style={s.actions}>
          <Btn kind="primary" label={resumable(p) ? '▶ Resume' : '▶ Play'} onPress={() => onPlay(movie)} />
          <Btn label={list.has(movie.id) ? '✓ In My List' : '+ My List'} onPress={() => toggleList(movie.id)} />
        </View>
        <Text style={{ color: c.text, lineHeight: 22, marginTop: 4 }}>{movie.about}</Text>
      </View>
      {similar.length > 0 && (
        <Row title="More Like This">{similar.map((m) => <Card key={m.id} movie={m} width={tile} onPress={() => onOpen(m.id)} />)}</Row>
      )}
    </ScrollView>
  );
}

/* ---------- grid used by Search and My List ---------- */
function Grid({ items, onOpen, header, empty }) {
  const { c } = useTheme();
  const { width, cols } = useLayout();
  const tile = (width - 32 - (cols - 1) * 12) / cols;
  return (
    <FlatList
      key={cols} // FlatList needs a new key when numColumns changes (rotation)
      data={items} numColumns={cols} keyExtractor={(m) => m.id}
      columnWrapperStyle={{ gap: 12 }} contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 24 }}
      keyboardShouldPersistTaps="handled"
      ListHeaderComponent={header}
      ListEmptyComponent={<Text style={[s.empty, { color: c.muted }]}>{empty}</Text>}
      renderItem={({ item }) => <Card movie={item} width={tile} onPress={() => onOpen(item.id)} />}
    />
  );
}

/* ---------- Search ---------- */
export function Search({ movies, onOpen }) {
  const { c } = useTheme();
  const [q, setQ] = useState('');
  const t = q.trim().toLowerCase();
  const results = t ? movies.filter((m) => m.title.toLowerCase().includes(t) || (m.genre || '').toLowerCase().includes(t)) : movies;
  return (
    <Grid items={results} onOpen={onOpen} empty={`No results for “${q}”.`}
      header={
        <TextInput value={q} onChangeText={setQ} placeholder="Search titles or genres" placeholderTextColor={c.muted}
          accessibilityLabel="Search" returnKeyType="search" clearButtonMode="while-editing"
          style={[s.search, { backgroundColor: c.card, color: c.text }]} />
      } />
  );
}

/* ---------- My List ---------- */
export function MyList({ movies, list, onOpen }) {
  const { c } = useTheme();
  return (
    <Grid items={movies.filter((m) => list.has(m.id))} onOpen={onOpen}
      header={<Text style={[s.pageTitle, { color: c.text }]}>My List</Text>}
      empty="Your list is empty. Tap “+ My List” on any title." />
  );
}

/* ---------- Profile ---------- */
// One tappable row inside a group card
function MenuRow({ icon, label, value, onPress, danger, last, expanded }) {
  const { c } = useTheme();
  const color = danger ? '#E5484D' : c.text;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label}
      style={({ pressed }) => [p.row, { borderBottomColor: '#ffffff12', borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth, opacity: pressed ? 0.7 : 1 }]}>
      <Ionicons name={icon} size={21} color={danger ? '#E5484D' : c.muted} />
      <Text style={[p.rowLabel, { color }]}>{label}</Text>
      {!!value && <Text style={{ color: c.muted, marginRight: 6 }}>{value}</Text>}
      {!danger && <Ionicons name={expanded ? 'chevron-down' : 'chevron-forward'} size={18} color={c.muted} />}
    </Pressable>
  );
}

export function Profile({ userId, email, demo, progress, listCount, onGoList, onClearHistory, onSignOut, onAddLocal }) {
  const { c, name: themeName, setName } = useTheme();
  const [name, setNameState] = useState('');
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [openTheme, setOpenTheme] = useState(false);
  const [openHelp, setOpenHelp] = useState(false);

  // Display name is stored in Supabase (profiles table), or on the phone in demo mode; default = the part of the email before the @
  const fallback = demo ? 'Guest' : (email || '').split('@')[0] || 'You';
  useEffect(() => {
    if (demo) { AsyncStorage.getItem('sb-name').then((n) => { if (n) setNameState(n); }); return; }
    // signed-in users: the name lives in the Supabase profiles table
    supabase.from('profiles').select('display_name').eq('user_id', userId).maybeSingle()
      .then(({ data }) => { if (data?.display_name) setNameState(data.display_name); });
  }, [demo, userId]);
  const shownName = name || fallback;

  const saveName = () => {
    const n = draft.trim();
    setNameState(n);
    setEditing(false);
    if (demo) { if (n) AsyncStorage.setItem('sb-name', n); else AsyncStorage.removeItem('sb-name'); return; }
    supabase.from('profiles').upsert({ user_id: userId, email, display_name: n || null })
      .then(({ error }) => { if (error) Alert.alert('Could not save', error.message); });
  };

  const rows = Object.values(progress);
  const inProgress = rows.filter((r) => resumable(r)).length;
  const finished = rows.filter((r) => pct(r) >= 95).length;

  const confirm = (title, msg, okLabel, onOk) =>
    Alert.alert(title, msg, [{ text: 'Cancel', style: 'cancel' }, { text: okLabel, style: 'destructive', onPress: onOk }]);

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
      <Text style={[p.screenTitle, { color: c.text }]}>My Profile</Text>

      {/* header: avatar + name + email + edit button */}
      <View style={p.header}>
        <View style={[p.avatar, { backgroundColor: c.accent }]}>
          <Text style={p.avatarText}>{shownName.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[p.name, { color: c.text }]} numberOfLines={1}>{shownName}</Text>
          <Text style={{ color: c.muted, marginTop: 2 }} numberOfLines={1}>{email}</Text>
          <Pressable onPress={() => { setDraft(name); setEditing(true); }} style={[p.editBtn, { backgroundColor: c.accent }]} accessibilityRole="button">
            <Text style={p.editText}>Edit Profile</Text>
          </Pressable>
        </View>
      </View>

      {/* quick stats */}
      <View style={[p.stats, { backgroundColor: c.card }]}>
        {[[listCount, 'In My List'], [inProgress, 'In progress'], [finished, 'Watched']].map(([n, l], i) => (
          <View key={l} style={[p.stat, i > 0 && { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: '#ffffff20' }]}>
            <Text style={[p.statNum, { color: c.accent }]}>{n}</Text>
            <Text style={{ color: c.muted, fontSize: 12 }}>{l}</Text>
          </View>
        ))}
      </View>

      {/* library */}
      <View style={[p.group, { backgroundColor: c.card }]}>
        <MenuRow icon="bookmark-outline" label="My List" value={String(listCount)} onPress={onGoList} />
        <MenuRow icon="time-outline" label="Clear watch history" last
          onPress={() => confirm('Clear watch history?', 'This removes all Continue Watching progress.', 'Clear', onClearHistory)} />
      </View>

      {/* appearance and help */}
      <View style={[p.group, { backgroundColor: c.card }]}>
        <MenuRow icon="color-palette-outline" label="Theme" value={themeName} expanded={openTheme} onPress={() => setOpenTheme(!openTheme)} />
        {openTheme && (
          <View style={p.themes}>
            {Object.entries(THEMES).map(([n, t]) => (
              <Pressable key={n} onPress={() => setName(n)} accessibilityRole="button" accessibilityState={{ selected: themeName === n }}
                style={[p.theme, { backgroundColor: t.bg, borderColor: t.accent, borderWidth: themeName === n ? 3 : 1.5, opacity: themeName === n ? 1 : 0.75 }]}>
                <View style={[p.dot, { backgroundColor: t.accent }]} />
                <Text style={{ color: '#fff', fontWeight: '600' }}>{n}</Text>
              </Pressable>
            ))}
          </View>
        )}
        {demo && <MenuRow icon="folder-open-outline" label="Add video from this phone" onPress={onAddLocal} />}
        <MenuRow icon="help-circle-outline" label="How to add movies" expanded={openHelp} onPress={() => setOpenHelp(!openHelp)} />
        {openHelp && (
          <Text style={[p.help, { color: c.muted }]}>
            1. Upload your video to a public Supabase Storage bucket.{'\n'}
            2. Open Table Editor → movies → Insert row.{'\n'}
            3. Fill in video_url with a public video URL or an HTTPS embed player's src URL (not the iframe markup).{'\n\n'}
            Only add videos you own or have the rights to. Full steps are in the README.
          </Text>
        )}
        <MenuRow icon="information-circle-outline" label="About StreamBox" value="v1.0.0" last
          onPress={() => Alert.alert('StreamBox', 'A personal streaming app.\nVersion 1.0.0')} />
      </View>

      {demo && <Text style={[p.demoNote, { color: c.muted }]}>Demo mode: your list and progress are saved only on this phone.</Text>}

      {/* sign out */}
      <View style={[p.group, { backgroundColor: c.card }]}>
        <MenuRow icon="log-out-outline" label={demo ? 'Exit demo' : 'Log Out'} danger last
          onPress={() => (demo ? onSignOut() : confirm('Log out?', 'You will need to sign in again.', 'Log Out', onSignOut))} />
      </View>

      {/* edit name dialog */}
      <Modal visible={editing} transparent animationType="fade" onRequestClose={() => setEditing(false)}>
        <View style={p.overlay}>
          <View style={[p.dialog, { backgroundColor: c.card }]}>
            <Text style={[p.dialogTitle, { color: c.text }]}>Edit profile</Text>
            <TextInput value={draft} onChangeText={setDraft} placeholder="Display name" placeholderTextColor={c.muted} autoFocus maxLength={30}
              style={[p.input, { backgroundColor: c.bg, color: c.text }]} onSubmitEditing={saveName} returnKeyType="done" />
            <View style={p.dialogBtns}>
              <Btn kind="ghost" label="Cancel" onPress={() => setEditing(false)} />
              <Btn kind="primary" label="Save" onPress={saveName} />
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const p = StyleSheet.create({
  screenTitle: { fontSize: 20, fontWeight: '700', textAlign: 'center', marginVertical: 10 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 20, marginTop: 8 },
  avatar: { width: 92, height: 92, borderRadius: 46, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 40, fontWeight: '800', color: '#111' },
  name: { fontSize: 20, fontWeight: '800' },
  editBtn: { alignSelf: 'flex-start', minHeight: 44, paddingHorizontal: 22, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  editText: { color: '#111', fontWeight: '700' },
  stats: { flexDirection: 'row', marginHorizontal: 16, marginTop: 22, borderRadius: 14, paddingVertical: 14 },
  stat: { flex: 1, alignItems: 'center' },
  statNum: { fontSize: 22, fontWeight: '800' },
  group: { marginHorizontal: 16, marginTop: 16, borderRadius: 14, overflow: 'hidden' },
  row: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16 },
  rowLabel: { flex: 1, fontSize: 15 },
  themes: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: 16, paddingBottom: 14 },
  theme: { minHeight: 44, paddingHorizontal: 14, borderRadius: 22, flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 14, height: 14, borderRadius: 7 },
  help: { paddingHorizontal: 16, paddingBottom: 14, lineHeight: 21 },
  demoNote: { textAlign: 'center', marginTop: 14, paddingHorizontal: 20, fontSize: 12 },
  overlay: { flex: 1, backgroundColor: '#000a', alignItems: 'center', justifyContent: 'center', padding: 24 },
  dialog: { width: '100%', maxWidth: 380, borderRadius: 16, padding: 20 },
  dialogTitle: { fontSize: 18, fontWeight: '700', marginBottom: 14 },
  input: { minHeight: 48, borderRadius: 10, paddingHorizontal: 14, fontSize: 16 },
  dialogBtns: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 16 },
});

const s = StyleSheet.create({
  heroInfo: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 14, backgroundColor: '#000a', borderBottomLeftRadius: 14, borderBottomRightRadius: 14 },
  heroTitle: { fontSize: 26, fontWeight: '800' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginVertical: 12 },
  empty: { textAlign: 'center', padding: 40 },
  back: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, paddingHorizontal: 16 },
  detailTitle: { fontSize: 28, fontWeight: '800' },
  progBar: { height: 4, borderRadius: 2, backgroundColor: '#ffffff30', marginTop: 12, overflow: 'hidden' },
  search: { minHeight: 48, borderRadius: 10, paddingHorizontal: 14, fontSize: 16, marginBottom: 4 },
  pageTitle: { fontSize: 24, fontWeight: '800', marginBottom: 4 },
  h2: { fontSize: 17, fontWeight: '700', marginTop: 22, marginBottom: 10 },
  themes: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  theme: { minHeight: 44, paddingHorizontal: 16, borderRadius: 22, flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 14, height: 14, borderRadius: 7 },
});
