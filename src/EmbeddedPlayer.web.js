import { createElement, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function EmbeddedPlayer({ movie, onClose }) {
  const [loading, setLoading] = useState(true);
  return (
    <Modal visible animationType="fade" onRequestClose={() => onClose({ t: 0, d: 0 })}>
      <StatusBar hidden />
      <View style={styles.root}>
        {createElement('iframe', {
          src: movie.video_url,
          title: movie.title,
          allow: 'autoplay; fullscreen; picture-in-picture',
          allowFullScreen: true,
          onLoad: () => setLoading(false),
          style: styles.iframe,
        })}
        {loading && <ActivityIndicator size="large" color="#F5B544" style={styles.spinner} pointerEvents="none" />}
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
  iframe: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, width: '100%', height: '100%', border: 0 },
  spinner: { position: 'absolute', top: '50%', left: '50%', marginLeft: -18, marginTop: -18 },
  header: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, backgroundColor: '#0006' },
  close: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  title: { color: '#fff', fontSize: 17, fontWeight: '700', flex: 1 },
});
