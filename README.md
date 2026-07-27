# Yaar — spoken Hindi for Tamil speakers

A two-mode web app for learning **natural, colloquial Hindi** (written in Roman "Hinglish"):

- **Translate** — English → real spoken Hindi, with a word-by-word breakdown and a "how it's built" note that explains the reordering (verb-at-end, postpositions, gender agreement).
- **Chat** — a friendly Hindi "buddy" (a _yaar_) who has everyday WhatsApp-style conversations, offers a graded **hint ladder**, and corrects mistakes in a way that's funny-but-kind, never a red pen.

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

### Steps

```bash
npm i -g vercel          # once
vercel                   # from the project root — links/creates the project (no GitHub needed)
```

Then set the secret and ship:

1. **Add the key** (server-only — do NOT prefix with `VITE_`):
   ```bash
   vercel env add GEMINI_API_KEY
   ```
   Paste your Google AI Studio key when prompted; choose the Production (and Preview) environments.
   Or add it in the Vercel dashboard → Project → Settings → Environment Variables.
2. **Deploy to production:**
   ```bash
   vercel --prod
   ```

Vercel auto-detects Vite (builds to `dist/`) and serves `api/gemini.js` as a function — no
`vercel.json` needed. To test the proxy locally, run `vercel dev` (plain `npm run preview`
won't have the function).

> **Shared quota / abuse:** everyone using the link shares your free 1,500 requests/day, and
> anyone with the URL can use it. Fine for a circle of friends. If the link leaks, add a simple
> passcode gate in `api/gemini.js` (check a header/body value against a `YAAR_PASSCODE` env var).

The architecture is LLM-agnostic: swapping to Groq (Llama 3.3 70B) or OpenRouter is just the
endpoint + request shape in `api/gemini.js`; the prompts are model-neutral.

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

## Remaining from the PRD

- **M5** — serverless key proxy + production deploy (see above). Note: to install the PWA on a phone it must be served from a live HTTPS URL, so this pairs with the deploy.

## Scripts

```bash
npm run dev      # local dev server (no service worker)
npm run build    # production build → dist/
npm run preview  # serve the production build on :4173 (service worker active)
```
