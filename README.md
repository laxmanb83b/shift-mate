# ShiftMate

Cross-platform (iOS, Android, web) app for posting and browsing local part-time jobs. Posters add a title, description, location, and contact details, optionally with a photo that is **automatically screened** for vulgar / non-job content. Seekers browse and tap to call, text, or email.

Built with **Expo (React Native + TypeScript)**, **Supabase** (Postgres + Auth + Storage + Edge Functions), and **Sightengine** for image moderation. Web is hosted free on **GitHub Pages** from `main`.

> Initial MVP version. Storage/back-end will be migrated/upgraded later based on real usage and feedback.

---

## Project structure

```
app/                      Expo Router screens
  _layout.tsx             Navigation stack
  index.tsx               Browse: search (location/type), category filter, pagination
  post.tsx                Create a posting (form, category, "active for", image upload)
  posting/[id].tsx        Detail + contact + "active till" + owner controls + report
  my-postings.tsx         Manage your postings: edit / mark filled / delete
  admin.tsx               Admin-only: review reported postings, dismiss or delete
  login.tsx               Optional email magic-link sign-in
components/PostingCard.tsx Reusable list card (shows category)
lib/
  supabase.ts             Supabase client + bucket names
  postings.ts             Data access, filters, pagination, manage, CATEGORIES
  theme.ts                Colors, spacing, app name/description
  types.ts                Shared types
supabase/
  schema.sql              Tables, RLS policies, storage buckets
  migrations/0002_*.sql   Adds category, 'filled' status (run if schema already created)
  functions/moderate-image/index.ts   Edge Function calling Sightengine
.github/workflows/deploy-web.yml      Web build → GitHub Pages on push to main
```

### Postings: categories, expiry, and management

Each posting has a **category** (Food & Café, Delivery, Tutoring, …) and an
**"active till"** date that defaults to **30 days** (poster can pick 7/14/30/60).
Browse shows only active, non-expired postings, **newest first**, paginated
(20 per page with "Load more"). Search matches **location or job type/category**,
and category chips filter the list.

Posters who are **signed in** get owner controls on their postings — **mark as
filled** (hides it once someone's hired), **reactivate**, or **delete** — from
the detail screen or the **My Postings** screen. These actions are enforced
server-side by Row Level Security, so only the owner can change their own posts.
> If you already ran `schema.sql`, run `supabase/migrations/0002_categories_status_expiry.sql` once to add the new column/status.

### Admin moderation

Anyone can flag a posting with the **Report** button. A designated **admin**
can review all reported postings on the **Admin Review** screen and either
**dismiss** the reports or **delete** the posting immediately. Admin powers are
enforced server-side by Row Level Security — non-admins can't read reports or
delete others' postings, even if they call the API directly.

Make yourself admin (one-time):

1. Run `supabase/migrations/0003_admin_moderation.sql` in the SQL Editor (or
   re-run `schema.sql` on a fresh project — it's included).
2. Sign in to the app once with the email you want as admin.
3. Find your user id under Dashboard → Authentication → Users, then run:
   ```sql
   insert into public.admins (user_id) values ('YOUR-USER-UUID');
   ```
4. Open the app → **My Postings** → the indigo **Admin review** banner appears,
   linking to the moderation queue. (To revoke: `delete from public.admins where user_id = '…';`)

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
   supabase link --project-ref YOUR_PROJECT_REF
   supabase functions deploy moderate-image
   supabase secrets set SIGHTENGINE_API_USER=xxx SIGHTENGINE_API_SECRET=xxx
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
