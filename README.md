# Proto — spoken Hindi for Tamil speakers

A two-mode web app for learning **natural, colloquial Hindi** (written in Roman "Hinglish"):

- **Translate** — English → real spoken Hindi, with a word-by-word breakdown and a "how it's built" note that explains the reordering (verb-at-end, postpositions, gender agreement).
- **Chat** — a friendly Hindi buddy who has everyday WhatsApp-style conversations, offers a graded **hint ladder**, and corrects mistakes in a way that's funny-but-kind, never a red pen.

Plus a **Vocabulary** tab (with a new/learning/known familiarity counter), a daily **streak**, and **Settings** (speaker gender, politeness, correction intensity, keep-in-English list, API key). Everything is stored locally in the browser — no accounts, no cloud.

Built per the product PRD. Stack: **React + Vite + Tailwind**, **Gemini 2.5 Flash** for both modes.

---

## Quick start

```bash
npm install
npm run dev
```

Open the printed URL (default http://localhost:5173).

### Add your free Gemini key

1. Go to **[Google AI Studio → API keys](https://aistudio.google.com/apikey)** and create a key (free, no credit card).
2. In the app, open **Settings** and paste the key.
3. Start translating / chatting.

The free tier is ~1,500 requests/day — effectively unlimited for one learner.

---

## How it works

| Piece | Where |
|---|---|
| System prompts (Appendix A & B, verbatim rules + JSON output contract) | `src/lib/prompts.js` |
| Gemini REST client (systemInstruction, temps 0.7 / 0.9, `BLOCK_ONLY_HIGH` safety) | `src/lib/gemini.js` |
| Local storage (settings, vocab, history, chat, streak) | `src/lib/storage.js` |
| App state (React context) | `src/state/store.jsx` |
| Translate / Chat / Vocab / Settings screens | `src/views/*` |

Both modes ask Gemini for **JSON** so the word-by-word table and the soft "quick fix" correction card render reliably. The PRD's RULES / PERSONALITY / CORRECTION text is used verbatim; only the output format is JSON-shaped. User settings (gender, register, keep-in-English list, correction intensity) are injected into the system prompt at call time.

### Speed

- **"Thinking" is disabled** (`thinkingConfig.thinkingBudget: 0`) — Gemini 2.5 Flash does hidden reasoning by default, which adds latency these simple tasks don't need.
- **Translations are cached locally** (`yaar.tcache`) keyed on the sentence + the settings that affect output. Any repeat returns instantly and works offline (shown with an "⚡ instant" tag). Reopening a recent translation is instant too.
- Not yet done: **streaming** the response so text appears as it generates (biggest *perceived* speedup) — a good next step.

### Adaptive language mix (chat)

The buddy does **not** speak full Hindi to a beginner. The Hindi share of its speech **equals your proficiency**: at level **0 it's 100% English** (zero Hindi, no glosses); at **10** it's ~10% Hindi / 90% English; and it climbs as you use Hindi. Hindi words are woven into English sentences and glossed in parentheses the first time — glosses appear only next to real Hindi words, so never at level 0.

This is driven by a hidden **proficiency score** (`yaar.progress`, 0–100): each buddy reply returns a private `assessment.progress_delta` that nudges the score up when you handle Hindi well. `targetHindiPct()` returns the score as the Hindi %, and `mixGuidance()` injects level-appropriate instructions into the prompt. **None of this is shown in the UI** — purely background, per design.

---

## Deploy to Vercel (shared-key proxy)

The Gemini key is held **server-side** so it never ships to the browser. A serverless
function ([api/gemini.js](api/gemini.js)) reads `GEMINI_API_KEY` and forwards requests to Google.

**Dual-mode client** ([src/lib/gemini.js](src/lib/gemini.js), `aiAvailable` + `callGemini`):

- If a user pastes a personal key in Settings → the browser calls Google directly with it
  (great for local dev, or a user who wants their own quota).
- Otherwise, a **production build** posts to `/api/gemini`, which supplies the shared key.
  So distributed users need no key at all.

### Steps — GitHub → Vercel (auto-deploys on every push)

1. **Push to GitHub** (private repo is fine — Vercel deploys private repos on the free tier):
   ```bash
   gh auth login
   gh repo create yaar --private --source=. --remote=origin --push
   ```
   (Or create an empty repo on github.com, then `git remote add origin <url>` and `git push -u origin main`.)
2. **Import in Vercel:** vercel.com → **Add New → Project** → import the `yaar` repo. Vercel
   auto-detects Vite (build `npm run build`, output `dist/`) and serves `api/gemini.js` as a
   function — no `vercel.json` needed.
3. **Add the key** in Project → Settings → **Environment Variables**: `GEMINI_API_KEY` =
   your Google AI Studio key (server-only — do NOT prefix with `VITE_`; enable Production + Preview).
4. **Deploy.** After this, every `git push` redeploys automatically.

To test the proxy locally, run `vercel dev` (plain `npm run preview` won't have the function).

> **Shared quota / abuse:** everyone using the link shares your free 1,500 requests/day, and
> anyone with the URL can use it. Fine for a circle of friends. If the link leaks, add a simple
> passcode gate in `api/gemini.js` (check a header/body value against a `YAAR_PASSCODE` env var).

The architecture is LLM-agnostic: swapping to Groq (Llama 3.3 70B) or OpenRouter is just the
endpoint + request shape in `api/gemini.js`; the prompts are model-neutral.

---

## Accounts — phone-number login (Chat only)

**Translation needs no account.** **Chat** requires a signed-in user so proficiency is tied to
the account (not just the device) and follows the learner across devices. Auth is powered by
**[Clerk](https://clerk.com)** with **Google sign-in** — one tap, no passwords, and **free** on
Clerk's Hobby plan (SMS/phone OTP is a paid Pro feature with per-message fees, so we skip it).

Auth is **optional at the code level**: with no Clerk key configured the app runs exactly as
before (Translation works, Chat is open). It only turns on once `VITE_CLERK_PUBLISHABLE_KEY` is set
([src/lib/auth.js](src/lib/auth.js) `authEnabled()`).

### How proficiency is stored

- The hidden proficiency score lives in the account as Clerk **`user.unsafeMetadata.proficiency`**
  (writable from the browser — fine here; it's not a security boundary). No separate database.
- **First login migrates the local score up** to the account; after that the **account is the
  source of truth** and later buddy nudges are pushed back to it
  ([src/components/AccountSync.jsx](src/components/AccountSync.jsx)).
- **Vocab, streak, and chat history stay on-device** (localStorage) for now — syncing those
  cross-device would need real per-row storage (a `profiles` table / Clerk is too small for a
  growing vocab list). Clean follow-up.

### Setup

1. **Create a Clerk app** at [dashboard.clerk.com](https://dashboard.clerk.com).
2. **Enable Google sign-in:** User & Authentication → **SSO Connections** → turn on **Google**.
   Clerk provides shared dev credentials so it works immediately in development; for production add
   your own Google OAuth credentials (Clerk shows the steps). You can turn Email/password off if you
   want Google-only.
3. **Copy the Publishable key** (Dashboard → **API Keys**, starts with `pk_`).
4. **Local dev:** copy `.env.example` → `.env.local` and set
   `VITE_CLERK_PUBLISHABLE_KEY=pk_...`, then `npm run dev`.
5. **Vercel:** add `VITE_CLERK_PUBLISHABLE_KEY` as an Environment Variable (Production + Preview).
   Unlike the Gemini key this one **is** browser-exposed, so the `VITE_` prefix is correct. Also add
   your deployed domain under Clerk → **Domains**.

> **Why Google, not SMS:** Google sign-in is free on Clerk's Hobby plan. Phone/SMS OTP requires
> Clerk Pro (~$20/mo) plus per-SMS fees, and no provider offers free production SMS OTP (every text
> has a real carrier cost) — so Google is the zero-cost path to account-based proficiency. Swapping
> in email OTP or adding more social providers later is a dashboard toggle; the app code is
> sign-in-method-agnostic.

---

## PWA (Phase 2 — done)

Yaar installs to the home screen and opens offline.

- **Manifest** (`public/manifest.webmanifest`) — standalone display, saffron theme, maskable icons.
- **Service worker** (`public/sw.js`) — no build step / no Workbox. Precaches the shell (index, manifest, icons); navigations are network-first with an offline fallback to the cached shell; Vite's content-hashed JS/CSS are cached cache-first on first fetch. Cross-origin requests (the Gemini API) are never intercepted — AI features simply need a connection.
- **Registered in production only** (`src/main.jsx`, guarded by `import.meta.env.PROD`) so it never fights Vite HMR in dev. Test it with `npm run build && npm run preview`, not `npm run dev`.
- **Install UI** — Settings shows "Add to Home Screen" (Chrome/Android `beforeinstallprompt`) or the Safari Share→Add instructions on iOS; hidden once installed (`src/hooks/useInstall.js`).
- Vocab/history/settings/streak already live in `localStorage`, so they're available offline too.
- **Bump `CACHE_VERSION` in `sw.js`** when you want to force old caches out.

Not yet done (optional Phase 2 extras): Devanagari display toggle, offline flashcard review of saved vocab.

---

## Buddy pings (daily push notifications)

The buddy messages you like a friend — a few casual openers a day to pull you back for a short chat.
It's **Web Push** (free; no per-message cost), gated behind a **sign-in** (pings are per-account) and
an in-app opt-in (**Settings → Buddy pings**). On iPhone it only works once Proto is **installed to the
home screen** (iOS 16.4+); Android/desktop Chrome work in-browser.

**How it works** (no database):
- The browser push subscription + prefs (on/off, frequency, timezone) live in the user's Clerk
  `unsafeMetadata.push` (written client-side, `src/lib/push.js` + the Settings `NudgeSection`).
- The service worker ([public/sw.js](public/sw.js)) renders `push` events as notifications; tapping one
  opens the app at `/?tab=chat`.
- An hourly **GitHub Actions** cron ([.github/workflows/nudge.yml](.github/workflows/nudge.yml)) hits the
  secured endpoint ([api/nudge.js](api/nudge.js)). Per user, per their **local time**, it decides whether
  this hour is one of their ~N daily pings — quiet overnight (9:00–21:00 window), skipped if they were
  active < 2h ago, spread randomly via a reservoir probability — then writes a fresh casual opener with
  **Gemini** and delivers it via `web-push`. Per-day scheduling state lives in Clerk `publicMetadata.pushState`.

### Setup

1. **Generate VAPID keys** once: `npx web-push generate-vapid-keys` → gives a public + private key.
2. **Client env:** set `VITE_VAPID_PUBLIC_KEY` (the public key) in `.env.local` and in Vercel
   (Production + Preview). It's browser-exposed, so `VITE_` is correct.
3. **Server env (Vercel, no `VITE_` prefix):**
   - `VAPID_PRIVATE_KEY` — the private key from step 1
   - `VAPID_SUBJECT` — `mailto:you@example.com`
   - `CLERK_SECRET_KEY` — Clerk dashboard → API Keys → **Secret key** (`sk_...`)
   - `NUDGE_SECRET` — any long random string (protects the endpoint)
   - `GEMINI_API_KEY` — already set (also writes the ping text)
4. **GitHub Actions secrets** (repo → Settings → Secrets → Actions):
   - `NUDGE_URL` = `https://<your-app>.vercel.app/api/nudge`
   - `NUDGE_SECRET` = same value as the Vercel one
5. **Test delivery:** opt in from Settings on an installed/HTTPS build, then hit the endpoint manually:
   `curl -X POST "$NUDGE_URL?force=1" -H "x-nudge-secret: $NUDGE_SECRET"` — `?force=1` bypasses the
   schedule and sends immediately to every opted-in subscription.

> Notes: GitHub scheduled workflows can lag under load and pause after ~60 days of repo inactivity.
> Each ping is a Gemini call (fine on the free tier for a small circle). Cross-device: pings go to
> whichever device(s) opted in.

## Remaining from the PRD

- **M5** — serverless key proxy + production deploy (see above). Note: to install the PWA on a phone it must be served from a live HTTPS URL, so this pairs with the deploy.

## Scripts

```bash
npm run dev      # local dev server (no service worker)
npm run build    # production build → dist/
npm run preview  # serve the production build on :4173 (service worker active)
```
