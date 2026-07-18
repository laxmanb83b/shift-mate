# Publishing ShiftMate to the App Store & Google Play

A complete walkthrough for shipping the native iOS and Android apps using Expo
**EAS** (Expo Application Services). The web app on GitHub Pages stays as-is;
this adds real store apps built from the same codebase.

> Rough time: an afternoon of setup + build, then **1–3 days** waiting on store
> review (Apple is usually slower and stricter than Google).

---

## 0. Costs & accounts (one-time)

| Account | Cost | Needed for |
|---|---|---|
| **Apple Developer Program** | **$99 / year** | App Store |
| **Google Play Console** | **$25 one-time** | Google Play |
| **Expo account** | Free | EAS build/submit |

Sign up:

- Apple: https://developer.apple.com/programs/enroll/ (needs an Apple ID; enrollment can take 24–48h to approve).
- Google: https://play.google.com/console/signup
- Expo: https://expo.dev/signup

---

## 1. Install the tools

```bash
npm install -g eas-cli
eas login          # log in to your Expo account
```

From the project folder, link the project (creates an EAS project and writes its id):

```bash
eas init
```

This fills the `extra.eas.projectId` value in `app.json` automatically.

---

## 2. Add your Supabase keys to the build

The native apps need your Supabase URL + anon key at build time. Two safe options:

**Option A — EAS environment variables (recommended, keeps keys out of git):**
```bash
eas env:create --name EXPO_PUBLIC_SUPABASE_URL --value "https://YOUR-PROJECT.supabase.co" --environment production
eas env:create --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "YOUR-ANON-KEY" --environment production
```

**Option B — edit `eas.json`:** replace the two placeholder values under
`build.production.env`. The anon key is safe to expose (it's protected by Row
Level Security), so committing it is acceptable — but never put the **service
role** or any `sb_secret_` key here.

---

## 3. Build the apps

```bash
eas build --platform ios --profile production
eas build --platform android --profile production
```

- EAS builds in the cloud (no Mac/Xcode needed for iOS). Each build takes ~10–20 min.
- **iOS signing:** EAS will offer to create the certificates and provisioning profile for you — say yes and log in with your Apple account.
- **Android signing:** EAS generates and stores a keystore for you (keep it — it's how you sign all future updates).
- Free plan covers ~15 iOS + 15 Android builds/month, which is plenty here.

When done, EAS gives you an `.ipa` (iOS) and `.aab` (Android) — and download links.

---

## 4. Create the store listings

Before submitting, create the app record in each store console:

**Apple — App Store Connect** (https://appstoreconnect.apple.com):
1. My Apps → **+** → New App. Pick the bundle id `com.laxmanb.shiftmate`, name "ShiftMate", primary language, and an SKU (any unique string).
2. Note the **App ID** (a number) — it goes in `eas.json` → `submit.production.ios.ascAppId`.
3. Also fill `appleId` (your Apple account email) and `appleTeamId` (from developer.apple.com → Membership).

**Google — Play Console** (https://play.google.com/console):
1. Create app → name "ShiftMate", app (not game), free.
2. To let EAS upload automatically, create a **service account**: Play Console → Setup → API access → create/link a Google Cloud service account, grant it "Release" permission, download its **JSON key**, and save it as `google-play-service-account.json` in the project root (already git-ignored).

---

## 5. Submit

```bash
eas submit --platform ios --profile production --latest
eas submit --platform android --profile production --latest
```

This uploads your latest build to App Store Connect / Play Console. From there
you finish the listing (below) and hit **Submit for review** in each console.

---

## 6. Listing content you must prepare

Both stores require:

- **App icon** — done (`assets/icon.png`, 1024×1024).
- **Screenshots** — capture a few from a simulator/emulator or real device. Apple needs 6.7" iPhone shots; Google needs phone shots (min 2 each). Good ones: the browse screen, a posting detail, the post form.
- **Description** — what ShiftMate does (browse/post local part-time jobs, contact directly, photo postings auto-screened).
- **Category** — Business or Lifestyle.
- **Support URL + contact email**.
- **Privacy Policy URL** — **required by both** (see §7).
- **Age rating** questionnaire.
- **Data safety (Google) / App Privacy (Apple)** — declare what you collect:
  email (auth), phone/email contact info in postings, location text, photos,
  and user-generated content.

---

## 7. Privacy policy (required)

Both stores reject apps without a privacy policy URL. ShiftMate collects email
(sign-in), posting contact details, location text, and uploaded images, so you
need one. Easiest: host a simple `privacy.html` on your GitHub Pages site
(`https://laxmanb83b.github.io/shift-mate/privacy.html`). I can draft this for
you — just ask.

---

## 8. User-generated content rules (important for approval)

Apple **Guideline 1.2** and Google's UGC policy require apps where users post
content to have all of these. Status in ShiftMate today:

- ✅ **Content filtering** — images are auto-moderated (Sightengine).
- ✅ **Report mechanism** — every posting has a Report button.
- ✅ **Remove content / act on reports** — admin review + delete.
- ⚠️ **Block abusive users** — **not built yet.** Apple often requires the
  ability for a user to block another. Consider adding this before iOS review.
- ⚠️ **Terms of use (EULA) with zero tolerance for objectionable content** —
  add a short terms link in-app and in the listing.

Recommended before submitting to Apple: add a **block user** feature and a
**Terms of Use** link. I can implement both — just ask.

---

## 9. After approval: shipping updates

- **JS-only changes** (most of your edits) can ship instantly with EAS Update —
  no re-review: `eas update --branch production`.
- **Native changes** (new permissions, SDK bumps) need a new `eas build` +
  `eas submit` and another review.
- Bump `ios.buildNumber` / `android.versionCode` for each new store build
  (the `autoIncrement` in `eas.json` handles this automatically).

---

## Quick reference

```bash
eas login
eas init
eas build --platform all --profile production
eas submit --platform ios --profile production --latest
eas submit --platform android --profile production --latest
```
