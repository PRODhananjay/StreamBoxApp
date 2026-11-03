import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { WebView } from 'react-native-webview';
import * as ScreenOrientation from 'expo-screen-orientation';
import { useKeepAwake } from 'expo-keep-awake';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from './theme';

export default function EmbeddedPlayer({ movie, onClose }) {
  const { c } = useTheme();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  useKeepAwake();

  useEffect(() => {
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE).catch(() => {});
    return () => { ScreenOrientation.unlockAsync().catch(() => {}); };
  }, []);

  return (
    <Modal visible animationType="fade" supportedOrientations={['landscape', 'landscape-left', 'landscape-right', 'portrait']}
      statusBarTranslucent onRequestClose={() => onClose({ t: 0, d: 0 })}>
      <StatusBar hidden />
      <View style={styles.root}>
        <WebView
          source={{ uri: movie.video_url }}
          style={StyleSheet.absoluteFill}
          javaScriptEnabled
          domStorageEnabled
          allowsFullscreenVideo
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          onLoadStart={() => { setLoading(true); setError(false); }}
          onLoadEnd={() => setLoading(false)}
          onError={() => { setLoading(false); setError(true); }}
        />
        {loading && !error && <ActivityIndicator size="large" color={c.accent} style={styles.spinner} pointerEvents="none" />}
        {error && <Text style={styles.error}>This embedded video could not be loaded.</Text>}
        <SafeAreaView style={styles.header} pointerEvents="box-none">
          <Pressable onPress={() => onClose({ t: 0, d: 0 })} style={styles.close} accessibilityLabel="Close player" hitSlop={8}>
            <Ionicons name="arrow-back" size={26} color="#fff" />
          </Pressable>
          <Text style={styles.title} numberOfLines={1}>{movie.title}</Text>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  spinner: { position: 'absolute', top: '50%', left: '50%', marginLeft: -18, marginTop: -18 },
  error: { position: 'absolute', top: '50%', width: '100%', textAlign: 'center', color: '#ff9a9d', fontSize: 16 },
  header: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, backgroundColor: '#0006' },
  close: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  title: { color: '#fff', fontSize: 17, fontWeight: '700', flex: 1 },
});
