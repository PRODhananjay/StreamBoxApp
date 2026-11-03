# StreamBox (React Native / Expo)

A personal streaming app for Android and iOS. Backend: Supabase (Auth + Postgres). Use it only with videos you own or have the rights to.

## 1. Supabase setup
1. Create a free project at https://supabase.com.
2. **SQL Editor** → paste `supabase.sql` → Run (tables, security rules, 4 demo movies).
3. **Authentication → Providers → Email** → turn **off** "Confirm email" (fine for personal use).
4. **Project Settings → API** → copy the Project URL and the anon public key.
5. Copy `.env.example` to `.env` and fill it in:
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
   ```

Until you do this, the login screen works only with **Try demo** (sample films, saved on the phone).

## 2. Run on your phone
```
npm install
npx expo start
```
Install **Expo Go** from the Play Store / App Store, then scan the QR code shown in the terminal (phone and computer on the same Wi-Fi). Restart `npx expo start` after editing `.env`.

## 3. Add your own videos
1. Supabase → **Storage → New bucket** (e.g. `videos`), tick **Public bucket**.
2. Upload your mp4 (and optionally a poster image) and copy its public URL.
3. **Table Editor → movies → Insert row**: `title`, `genre`, `year`, `mins`, `about`, `video_url`, optionally `poster_url`. `hue` (0–360) colours the generated poster.

HLS (`.m3u8`) URLs work too. Use H.264/AAC mp4 for best compatibility.

## 4. Build an Android APK
Install the EAS CLI and sign in to a free Expo account, then:
```
npm i -g eas-cli
eas login
eas build:configure
eas build -p android --profile preview
```
Add this to `eas.json` so the `preview` profile produces an installable APK instead of an app bundle:
```json
{ "build": { "preview": { "android": { "buildType": "apk" } } } }
```
EAS gives you a download link for the `.apk`. Put your two `EXPO_PUBLIC_*` values in the EAS project environment variables (or `eas.json` `env`) so the build can reach Supabase. Change the package name `com.yourname.streambox` in `app.json` first.

## Notes
- The app rotates freely; the video player locks to landscape while playing.
- Social login buttons are placeholders; use email or the demo for now.
