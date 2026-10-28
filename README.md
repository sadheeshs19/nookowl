# Nook Owl

A quiet corner to talk with kind strangers. Post a topic, swipe through people who are open to calls, send call requests, and keep chatting with text and voice notes.

Built with Expo (SDK 58) + Expo Router, Supabase (auth, database, realtime, storage) and Agora (voice calls).

## What's in this first version

- **Owl splash**: "nook" appears, the two o's blink into the owl's eyes, and the owl settles into its nest.
- **Sign up** with an email magic link that opens the app, then a nickname, birth year (18+ only), languages and interests.
- **Topics**: scrolling feed with search, trending tags, likes and comments. No calls from topics, only messages.
- **People**: swipe right to send a call request, left to pass, or tap Call now. Only people who switched on "Open to calls" appear.
- **Requests**: received and sent call requests. They expire after 15 minutes. Accepting starts the call.
- **Inbox**: chats and message requests (a stranger's first message waits until you accept). Text and hold-to-record voice notes.
- **Voice calls** over Agora with mute, speaker, talk prompts, report, and a rating plus "stay in touch?" after the call.
- **Profile**: open-to-calls switch, your topics with their likes and comments, light/dark/system appearance.
- **Safety**: 18+ check in the database, report and block, row level security on every table, calls only allowed when the other person opted in.

Not built yet: ads and credits, push notifications (calls only ring while the app is open), voice rooms.

## Setup

### 1. Install

```bash
npm install
cp .env.example .env
```

### 2. Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Run the schema: open **SQL Editor**, paste `supabase/migrations/20261027000000_init.sql`, and run it. (Or with the Supabase CLI: `supabase link` then `supabase db push`.)
3. **Authentication → Sign In / Providers → Email**: keep Email enabled.
4. **Authentication → URL Configuration → Redirect URLs → Add URL**: add `nookowl://**`. This lets the sign-in email link open the app. (No email template changes are needed; the default Magic Link email works.)
5. Copy **Project URL** and **anon public key** (Project Settings → API) into `.env`.

Sign-in works by magic link: the app emails a link, and tapping it **on the same phone** opens Nook Owl signed in. Supabase's built-in email sender only sends a few emails per hour, so connect your own SMTP (Authentication → Emails → SMTP Settings) before launch.

### 3. Agora

1. Create a project at [console.agora.io](https://console.agora.io) with **App ID + Token** authentication.
2. Put the **App ID** in `.env` as `EXPO_PUBLIC_AGORA_APP_ID`.
3. Deploy the token function (the App Certificate must stay on the server):

```bash
npx supabase login
npx supabase link --project-ref YOUR-PROJECT-REF
npx supabase secrets set AGORA_APP_ID=your-app-id AGORA_APP_CERTIFICATE=your-app-certificate
npx supabase functions deploy agora-token
```

### 4. Run it on your phone

Agora uses native code, so the app needs a **development build** (Expo Go won't work):

```bash
npx eas-cli@latest login
npx eas-cli@latest build --profile development --platform android
```

Install the build on your phone, then start the dev server:

```bash
npx expo start --dev-client
```

To test calls you need two accounts on two phones (or a phone and an emulator).

## Project layout

```
src/app/            screens (Expo Router)
  (tabs)/           Topics, People, Requests, Inbox, Profile
  topic/            new topic, comments
  chat/[id].tsx     chat with voice notes
  call/[id].tsx     voice call + after-call rating
src/components/     UI pieces, owl splash, call watcher, voice note player
src/lib/            Supabase client, data functions, auth, Agora hook
src/theme/          light and dark colours
supabase/           database schema and the Agora token function
```

## Checks

```bash
npx tsc --noEmit
npx expo lint
```
