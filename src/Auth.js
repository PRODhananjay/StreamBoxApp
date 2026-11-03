import { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { configured, supabase } from './supabase';
import { useTheme } from './theme';

const SOCIAL = [
  { id: 'google', icon: 'logo-google', color: '#EA4335' },
  { id: 'facebook', icon: 'logo-facebook', color: '#1877F2' },
  { id: 'twitter', icon: 'logo-twitter', color: '#1D9BF0' },
];

// Turn Supabase error text into something a person can act on
function friendly(msg) {
  const m = msg.toLowerCase();
  if (m.includes('invalid login')) return 'Wrong email or password.';
  if (m.includes('already registered')) return 'This email already has an account. Try signing in.';
  if (m.includes('email not confirmed')) return 'Please confirm your email first (check your inbox).';
  if (m.includes('rate limit')) return 'Too many attempts. Please wait a minute and try again.';
  if (m.includes('network') || m.includes('fetch')) return 'Cannot reach the server. Check your internet connection.';
  return msg;
}

// Login and Create account screens (light card style)
export default function Auth({ onDemo }) {
  const { c } = useTheme();
  const [signUp, setSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);

  // darker version of the accent, readable on white
  const link = c.accent === '#F5B544' ? '#9A6700' : c.accent;

  const switchMode = (up) => { setSignUp(up); setError(''); setInfo(''); setConfirm(''); };

  const submit = async () => {
    setError(''); setInfo('');
    const mail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) { setError('Enter a valid email address.'); return; }
    if (!password) { setError('Enter your password.'); return; }
    if (signUp && password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (signUp && password !== confirm) { setError('Passwords do not match.'); return; }
    if (!supabase) { setError('Supabase is not set up yet. Try the demo, or see README.md.'); return; }
    setBusy(true);
    const { data, error: err } = signUp
      ? await supabase.auth.signUp({ email: mail, password })
      : await supabase.auth.signInWithPassword({ email: mail, password });
    setBusy(false);
    if (err) setError(friendly(err.message));
    // With "Confirm email" off, Supabase returns a session and the app signs you in automatically.
    // If a session is missing, email confirmation is still turned on in Supabase.
    else if (signUp && !data.session) setInfo('Account created. Check your email to confirm it, then sign in.');
    // on success the session listener in App.js switches screens
  };

  return (
    <SafeAreaView style={styles.page}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.box}>
            {signUp && (
              <Pressable onPress={() => switchMode(false)} style={styles.back} accessibilityLabel="Back to login" hitSlop={8}>
                <Ionicons name="arrow-back" size={26} color={link} />
              </Pressable>
            )}
            <Text style={[styles.logo, { color: link }]}>StreamBox</Text>
            <Text style={styles.title}>{signUp ? 'Create your Account' : 'Login to your Account'}</Text>

            <TextInput style={styles.input} placeholder="Email" placeholderTextColor="#7b8090" value={email} onChangeText={setEmail}
              autoCapitalize="none" autoComplete="email" keyboardType="email-address" textContentType="emailAddress" />
            <TextInput style={styles.input} placeholder="Password" placeholderTextColor="#7b8090" value={password} onChangeText={setPassword}
              secureTextEntry autoCapitalize="none" textContentType={signUp ? 'newPassword' : 'password'} />
            {signUp && (
              <TextInput style={styles.input} placeholder="Confirm Password" placeholderTextColor="#7b8090" value={confirm}
                onChangeText={setConfirm} secureTextEntry autoCapitalize="none" textContentType="newPassword" />
            )}

            {!!error && <Text style={styles.error} accessibilityRole="alert">{error}</Text>}
            {!!info && <Text style={styles.info}>{info}</Text>}

            <Pressable onPress={submit} disabled={busy} style={[styles.primary, { backgroundColor: c.accent }]} accessibilityRole="button">
              {busy ? <ActivityIndicator color="#111" /> : <Text style={styles.primaryText}>{signUp ? 'Sign up' : 'Sign in'}</Text>}
            </Pressable>

            <Text style={styles.or}>- Or {signUp ? 'sign up' : 'sign in'} with -</Text>
            <View style={styles.socialRow}>
              {SOCIAL.map((p) => (
                <Pressable key={p.id} style={styles.social} accessibilityLabel={`Continue with ${p.id}`}
                  onPress={() => Alert.alert('Not set up yet', 'Social login needs extra setup in Supabase. Use email or the demo for now.')}>
                  <Ionicons name={p.icon} size={26} color={p.color} />
                </Pressable>
              ))}
            </View>

            <Pressable onPress={onDemo} style={[styles.demo, { borderColor: c.accent }]} accessibilityRole="button">
              <Ionicons name="play" size={16} color={link} />
              <Text style={[styles.demoText, { color: link }]}>Try demo (no account needed)</Text>
            </Pressable>
            {!configured && <Text style={styles.note}>Supabase isn't set up yet, so sign in is off. See README.md to connect it.</Text>}

            {!signUp && (
              <View style={styles.switchRow}>
                <Text style={styles.switchText}>Don't have an account? </Text>
                <Pressable onPress={() => switchMode(true)} hitSlop={10}><Text style={[styles.switchLink, { color: link }]}>Sign up</Text></Pressable>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#fff' },
  scroll: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  box: { width: '100%', maxWidth: 400 },
  back: { position: 'absolute', top: -8, left: -8, width: 44, height: 44, alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  logo: { fontSize: 36, fontWeight: '800', textAlign: 'center', marginBottom: 28 },
  title: { fontSize: 19, fontWeight: '600', color: '#3a3f4b', marginBottom: 18 },
  input: { minHeight: 54, borderWidth: 1, borderColor: '#eceef3', borderRadius: 8, paddingHorizontal: 18, marginBottom: 12,
    backgroundColor: '#fff', color: '#2b2f3a', fontSize: 16, elevation: 2, shadowColor: '#1f2a60', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
  error: { color: '#d6336c', marginBottom: 8 },
  info: { color: '#2b8a3e', marginBottom: 8 },
  primary: { minHeight: 54, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginTop: 6, elevation: 3 },
  primaryText: { color: '#111', fontWeight: '700', fontSize: 16 },
  or: { textAlign: 'center', color: '#7b8090', fontSize: 13, marginTop: 28, marginBottom: 14 },
  socialRow: { flexDirection: 'row', gap: 12 },
  social: { flex: 1, minHeight: 54, borderWidth: 1, borderColor: '#eceef3', borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', elevation: 2 },
  demo: { minHeight: 54, marginTop: 24, borderWidth: 2, borderRadius: 8, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center' },
  demoText: { fontWeight: '700', fontSize: 15 },
  note: { textAlign: 'center', color: '#6b7080', fontSize: 12, marginTop: 12 },
  switchRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 28 },
  switchText: { color: '#6b7080' },
  switchLink: { fontWeight: '700', minHeight: 44, textAlignVertical: 'center', lineHeight: 44 },
});
