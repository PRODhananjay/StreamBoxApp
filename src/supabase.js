import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// Expo inlines EXPO_PUBLIC_* variables from .env at build time
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// When false the app shows the login screen with only "Try demo" working
export const configured = Boolean(url && key);

export const supabase = configured
  ? createClient(url, key, {
      auth: {
        storage: AsyncStorage,       // keeps the user signed in between app launches
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,   // no URLs in a native app
      },
    })
  : null;
