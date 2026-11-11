# Founder OS — Mobile (Expo)

Install dependencies **from this directory** (not the repo root workspace — Expo pulls a large dependency tree):

```bash
cd apps/mobile
npm install
npx expo start
```

Configure `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, and `EXPO_PUBLIC_API_URL` in `.env` or EAS secrets.

Run `eas init` and set unique bundle identifiers for production.
