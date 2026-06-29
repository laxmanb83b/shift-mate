# Part-Time Job Board — Architecture & Tech Stack Plan

A cross-platform (iOS, Android, web) app where job posters publish part-time gigs (text or a photo of a "help wanted" notice, with contact + location), and seekers browse and contact them directly. Uploaded images are auto-validated to block vulgar / non-job content. Built to run on free tiers, with the web build served from a GitHub `main` branch.

---

## 1. Recommended Stack (at a glance)

| Layer | Choice | Why | Free hosting |
|---|---|---|---|
| App framework | **Expo (React Native)** | One codebase → iOS, Android, **and** web (`react-native-web`) | SDK/CLI free forever |
| Language | TypeScript | Type safety across a shared codebase | — |
| Backend / DB | **Supabase** | Postgres + Auth + Storage + Edge Functions in one free project | 500 MB DB, 1 GB file storage, 50k MAU |
| Image moderation | **Sightengine API** (called from a Supabase Edge Function) | Nudity + offensive + relevance signals, simple REST | 2,000 checks/month free |
| Web hosting | **GitHub Pages** (deploy from `main` via GitHub Actions) | Static export of the Expo web build, free | Free, custom domain OK |
| Mobile builds | **EAS Build** (free plan) | 15 iOS + 15 Android cloud builds/month | Free plan |
| CI/CD | **GitHub Actions** | Build web on push to `main`, deploy to Pages | 2,000 free min/month |

**One sentence:** Expo gives you all three platforms from one TypeScript codebase, Supabase gives you a real backend for free, Sightengine screens images, and GitHub Pages serves the web app straight off `main`.

---

## 2. Why this stack

**Expo / React Native** is the only mainstream choice that produces native iOS, native Android, *and* a web app from a single codebase — directly matching your "iphone, android and web reactive" requirement. The Expo SDK and CLI are 100% free; you only ever pay if you outgrow the free cloud build quota.

**Supabase** bundles the four backend services this app needs — a Postgres database (postings), authentication (posters log in), file storage (images), and serverless Edge Functions (the moderation hook) — in a single free project. The free tier gives 500 MB database, 1 GB file storage, 5 GB egress, and up to 50,000 monthly active users, which is generous for an MVP. Note the one real catch: a free project **pauses after ~7 days of inactivity** (a single request wakes it), and you can have two free projects per account.

**Sightengine** handles the "validate the picture is related to a job, not vulgar content" requirement. Its free plan allows 2,000 operations/month with no time limit — enough for an MVP. It returns nudity, weapons, drugs, offensive-gesture, gore, and other scores you can threshold on. (Alternatives: Google Cloud Vision SafeSearch, AWS Rekognition Moderation — both have free tiers but need cloud accounts and billing on file.)

**GitHub Pages** serves the Expo **web export** (static HTML/JS/CSS) directly. A GitHub Action rebuilds and publishes on every push to `main`, which is exactly the "free hosting such as github main branch" flow you asked for.

---

## 3. High-level architecture

```
        ┌────────────────────────────────────────────────┐
        │            Expo app (TypeScript)               │
        │   iOS  •  Android  •  Web (react-native-web)   │
        └───────────────┬────────────────────────────────┘
                        │  Supabase JS client (HTTPS)
        ┌───────────────▼────────────────────────────────┐
        │                  SUPABASE                       │
        │  Auth  │  Postgres (postings)  │  Storage (imgs)│
        │                 │                               │
        │        Edge Function: moderate-image           │
        └─────────────────┬───────────────────────────────┘
                          │  REST call
                  ┌───────▼────────┐
                  │  Sightengine   │  ← nudity / offensive / relevance
                  └────────────────┘

   Web build  ──(GitHub Actions on push to main)──►  GitHub Pages
```

**Posting flow with image moderation:**

1. Poster fills the form (title, description, contact, location) and optionally picks a photo.
2. App uploads the photo to a **`pending` (private) Storage bucket**.
3. App calls the `moderate-image` Edge Function with the file path.
4. The function sends the image to Sightengine and reads back the scores.
5. **Reject** if nudity/offensive/gore scores exceed thresholds → delete file, show error.
6. **Accept** if clean → move file to the public bucket and insert the posting row (`status = active`).
7. Job seekers browse `active` postings and tap the contact number/details to call or message.

Doing the check in an Edge Function (not the app) keeps your Sightengine API key secret and lets you change thresholds without shipping a new app version.

---

## 4. Data model (Postgres)

```sql
-- postings
id            uuid primary key default gen_random_uuid()
created_at    timestamptz default now()
poster_id     uuid references auth.users        -- nullable if anonymous posting allowed
title         text not null
description    text
contact_name  text
contact_phone text                              -- the number seekers call
contact_email text
location_text text                              -- human-readable address
lat           double precision                  -- optional, for map/distance
lng           double precision
image_url     text                              -- public URL after moderation passes
status        text default 'active'             -- active | expired | flagged
expires_at    timestamptz                       -- auto-hide old gigs

-- reports (let seekers flag bad postings — community moderation)
id, posting_id (fk), reason, created_at
```

Use **Row Level Security**: anyone can `SELECT` active postings; only the authenticated `poster_id` can update/delete their own. Add a Postgres index on `(status, created_at)` and optionally `(lat, lng)` for "near me" search.

---

## 5. Image validation logic

Call Sightengine's image moderation models and reject on these signals:

- **Nudity / sexual content** — `nudity.sexual_activity`, `nudity.suggestive`, etc. above ~0.5
- **Offensive** — gestures, hate symbols
- **Gore / violence**, **weapons**, **recreational drugs**, **alcohol** (your call on alcohol)

**"Is it job-related?"** is harder — moderation APIs detect *bad* content well but don't directly confirm *relevant* content. Practical approach for the MVP: (1) block clearly disallowed categories with Sightengine, and (2) for relevance, use Sightengine's text/OCR or a vision label check to require the photo to contain *something plausible* (text like "hiring/help wanted", or a workplace scene) — or simply make the image optional and rely on community **report** buttons + a lightweight admin review for borderline cases. Treat strict relevance detection as a v2 enhancement (e.g., a custom classifier) rather than a launch blocker.

---

## 6. Free hosting setup (web on GitHub `main`)

1. `npx expo export --platform web` produces a static `dist/` folder.
2. A GitHub Action triggers on push to `main`, runs the export, and publishes `dist/` to GitHub Pages.

```yaml
# .github/workflows/deploy-web.yml
name: Deploy web to GitHub Pages
on:
  push: { branches: [main] }
permissions: { contents: read, pages: write, id-token: write }
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: npx expo export --platform web
      - uses: actions/upload-pages-artifact@v3
        with: { path: dist }
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment: { name: github-pages }
    steps:
      - uses: actions/deploy-pages@v4
```

Store the Supabase URL/anon key as repo secrets / public env (the anon key is safe client-side thanks to RLS). The **iOS and Android** apps are produced separately via `eas build` (free plan: 15 + 15 builds/month) and submitted to the App Store / Play Store — note those store accounts have their own one-time/annual fees that are outside the free stack.

---

## 7. Suggested build roadmap

1. **Scaffold** — `npx create-expo-app`, add navigation, set up Supabase project + tables + RLS.
2. **Auth** — email/OTP login for posters (browsing can stay anonymous).
3. **Browse** — list + detail screens pulling `active` postings; tap-to-call contact.
4. **Post** — form with text fields + location; write to Postgres.
5. **Images + moderation** — Storage upload → `moderate-image` Edge Function → Sightengine → accept/reject.
6. **Reports / expiry** — flag button, scheduled cleanup of expired gigs.
7. **Ship** — GitHub Pages for web; EAS builds for the stores.

---

## 8. Cost reality check

Everything above runs at **$0/month** for an MVP within these limits: Supabase (500 MB DB, 1 GB storage, 50k MAU, pauses when idle), Sightengine (2,000 image checks/month), EAS (30 mobile builds/month), GitHub Actions (2,000 min/month) and GitHub Pages (free). The only unavoidable real-world costs are the **Apple Developer Program ($99/yr)** and **Google Play one-time $25** *if* you publish the native apps to the stores — the web app on GitHub Pages stays free.

---

*Sources: Supabase pricing, Sightengine pricing, and Expo/EAS docs — see the chat message for links. Free-tier figures verified June 2026 and can change; confirm current limits before launch.*
