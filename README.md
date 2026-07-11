# Part-Time Job Board

Cross-platform (iOS, Android, web) app for posting and browsing local part-time jobs. Posters add a title, description, location, and contact details, optionally with a photo that is **automatically screened** for vulgar / non-job content. Seekers browse and tap to call, text, or email.

Built with **Expo (React Native + TypeScript)**, **Supabase** (Postgres + Auth + Storage + Edge Functions), and **Sightengine** for image moderation. Web is hosted free on **GitHub Pages** from `main`.

> Initial MVP version. Storage/back-end will be migrated/upgraded later based on real usage and feedback.

---

## Project structure

```
app/                      Expo Router screens
  _layout.tsx             Navigation stack
  index.tsx               Browse + search postings (has "Post a Job" button)
  post.tsx                Create a posting (form + image upload)
  posting/[id].tsx        Posting detail + contact buttons + report
  login.tsx               Optional email magic-link sign-in
components/PostingCard.tsx Reusable list card
lib/
  supabase.ts             Supabase client + bucket names
  postings.ts             Data access + uploadAndModerateImage()
  types.ts                Shared types
supabase/
  schema.sql              Tables, RLS policies, storage buckets
  functions/moderate-image/index.ts   Edge Function calling Sightengine
.github/workflows/deploy-web.yml      Web build → GitHub Pages on push to main
```

---

## 1. Prerequisites

- Node 20+, and `npm i -g eas-cli` (only for native builds)
- A free Supabase account and a free Sightengine account

## 2. Set up Supabase

1. Create a project at supabase.com.
2. In **SQL Editor**, paste and run `supabase/schema.sql` (creates tables, RLS, and the two storage buckets).
3. Install the CLI and deploy the moderation function:
   ```bash
   npm i -g supabase
   supabase login
   supabase link --project-ref erzzpfnezynjptjkbcfw #YOUR_PROJECT_REF
   supabase functions deploy moderate-image
   supabase secrets set SIGHTENGINE_API_USER=your-sightengine-user SIGHTENGINE_API_SECRET=your-sightengine-secret
   ```
   (Without the Sightengine secrets the function "fails open" and approves images — fine for early dev.)

## 3. Configure the app

Copy `.env.example` to `.env` and fill in your Supabase URL and anon key:
```
EXPO_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR-ANON-KEY
```
The anon key is safe to ship client-side — Row Level Security protects the data.

## 4. Run locally

```bash
npm install
npm run web        # opens the web app
npm run ios        # iOS simulator (Mac)
npm run android    # Android emulator
# or: npm start, then scan the QR code with Expo Go
```

## 5. Deploy the web app (free, from `main`)

1. Push this repo to GitHub.
2. Repo **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Add repo secrets `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` (Settings → Secrets and variables → Actions).
4. Every push to `main` runs `.github/workflows/deploy-web.yml`, which exports the web build and publishes it to GitHub Pages.

## 6. Build the mobile apps (when ready)

```bash
eas build --platform ios
eas build --platform android
```
Free EAS plan covers ~15 iOS + 15 Android builds/month. Store publishing needs an Apple Developer account ($99/yr) and Google Play account ($25 one-time).

---

## How image moderation works

`post.tsx` → `uploadAndModerateImage()` uploads the photo to the **private** `pending-images` bucket, then calls the `moderate-image` Edge Function. The function scores the image with Sightengine (nudity, offensive, gore, weapons, drugs). If any score crosses the threshold the file is deleted and the user sees a rejection message; otherwise the file is moved to the **public** `posting-images` bucket and its URL is saved with the posting. Keeping this server-side hides the API key and lets you tune thresholds without an app update.

> Note: moderation reliably blocks disallowed content but does not strictly verify an image *is* a job posting. The app also exposes a **Report** button for community moderation. A stricter relevance classifier is a planned v2 item.

---

## Free-tier limits to watch (verified June 2026)

- **Supabase free:** 500 MB DB, 1 GB file storage, 5 GB egress, 50k MAU; project pauses after ~7 days idle.
- **Sightengine free:** 2,000 image checks/month.
- **EAS free:** 15 iOS + 15 Android builds/month.
- **GitHub Actions:** 2,000 free minutes/month; GitHub Pages free.

Upgrade paths (do later based on usage): move images to a CDN/object store (e.g. Cloudflare R2/S3), add Postgres read replicas or upgrade Supabase tier, add pg_cron for auto-expiry, and a stricter image classifier.

---

## Security & secrets

Keep credentials out of the repo. GitHub push protection will block a push that
contains a detected secret.

**Public vs. secret — know the difference:**

- **Safe to expose (client-side):** the Supabase **URL**, the project **ref**,
  and the **anon key**. These ship in the web/mobile app by design; Row Level
  Security is what actually protects your data. Keep RLS enabled on every table.
- **Never commit / never ship in the app:** the Supabase **service role key**
  and any `sb_secret_…` **secret key**, the **Sightengine** API user/secret,
  SMTP/Gmail **App Passwords**, and any other provider secret.

**Where secrets belong:**

- Server-side secrets (Sightengine keys, service role): set with
  `supabase secrets set NAME=value` in your terminal, or in the Supabase
  dashboard. Edge Functions read them from the environment — see
  `supabase/functions/moderate-image/index.ts`.
- Local dev values (Supabase URL + anon key): put them in `.env` (already
  git-ignored). Only `.env.example` — with placeholders — is committed.
- CI/CD: store `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` as
  GitHub repo secrets (Settings → Secrets and variables → Actions).

**If a secret is ever committed:** treat it as compromised — rotate it at the
provider (e.g. Supabase → Settings → API keys → roll the key), then remove it
from the file and from git history (amend the commit if it's the latest, or use
`git filter-repo` / BFG for older ones) before pushing.

**Quick self-check before a push:**

```bash
git ls-files | grep -v node_modules | xargs grep -nE 'sb_secret_|service_role|eyJ[A-Za-z0-9_-]{30,}' 2>/dev/null
```

No output means no obvious keys in tracked files.
