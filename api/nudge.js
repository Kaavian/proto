// Buddy pings — the scheduler endpoint (Vercel function).
//
// Hit hourly by a GitHub Actions cron (see .github/workflows/nudge.yml) with the shared
// NUDGE_SECRET. For every signed-in user who opted in, it decides whether *this hour* is a
// good moment for one of their ~N daily pings, and if so generates a short casual opener with
// Gemini and delivers it via Web Push.
//
// Storage (no database): the browser push subscription + prefs live in the user's Clerk
// unsafeMetadata.push (written client-side); the per-day scheduling state lives in Clerk
// publicMetadata.pushState (written here, server-only).
//
// Required env vars (Vercel): NUDGE_SECRET, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT,
// CLERK_SECRET_KEY, GEMINI_API_KEY.

import webpush from 'web-push'
import { createClerkClient } from '@clerk/backend'

const WAKE_START = 9 // don't ping before 9:00 local
const WAKE_END = 21 // ...or after 21:00 local
const ACTIVE_SKIP_MS = 2 * 60 * 60 * 1000 // skip if they were in the app < 2h ago
const RECAP_REF_CHANCE = 0.4 // only *sometimes* nod to the last chat, like a real friend
const RECAP_MAX_AGE_MS = 3 * 24 * 60 * 60 * 1000 // ...and only if it's recent

// Local hour + date in a given IANA timezone.
function localParts(tz) {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hour12: false,
      hour: '2-digit',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date())
    const get = (t) => parts.find((p) => p.type === t)?.value
    return { hour: parseInt(get('hour'), 10) % 24, day: `${get('year')}-${get('month')}-${get('day')}` }
  } catch {
    const d = new Date()
    return { hour: d.getUTCHours(), day: d.toISOString().slice(0, 10) }
  }
}

function timeOfDay(hour) {
  if (hour < 12) return 'morning'
  if (hour < 17) return 'afternoon'
  return 'evening'
}

// Generate a short, casual opener via Gemini. Falls back to a canned line on any error so a
// ping still goes out.
async function generateMessage({ firstName, hour, lastChat }) {
  const fallback = [
    'oye, kya chal raha hai? free for a quick chat? 😄',
    'hey! how’s your day going?',
    'chai break? tell me one thing that happened today 👀',
    'random check-in — what’s up?',
  ]
  const key = process.env.GEMINI_API_KEY
  if (!key) return fallback[Math.floor(Math.random() * fallback.length)]

  const nameLine = firstName ? `Their name is ${firstName}.` : ''
  // Only sometimes, and only if the recap is recent, nod to the last conversation.
  const recapFresh =
    lastChat?.recap && lastChat?.at && Date.now() - lastChat.at < RECAP_MAX_AGE_MS
  const referenceLine =
    recapFresh && Math.random() < RECAP_REF_CHANCE
      ? `Last time you two were chatting about: "${lastChat.recap}". You MAY nod to that lightly and naturally, but keep it a short friendly hello — don't quiz them or list it.`
      : 'Do NOT reference past conversations — just a fresh, friendly hello.'
  const prompt = `You are the user's warm, funny buddy who is helping a native Tamil speaker learn
Hindi. Write ONE short, casual WhatsApp-style opener that nudges them to come chat — like a friend
texting out of the blue. Rules: mostly English, ONE short sentence (max ~12 words), warm and light,
at most one emoji, casual lowercase is fine. It's ${timeOfDay(hour)} for them. ${nameLine} ${referenceLine}
Do NOT mention notifications, apps, lessons, streaks, reminders, or "practice". Just say hi like a
friend and invite a quick chat. You may sprinkle at most one very common Hindi word. Output ONLY the message.`

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 1.0, maxOutputTokens: 60, thinkingConfig: { thinkingBudget: 0 } },
      }),
    })
    const data = await r.json()
    const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('').trim()
    return text ? text.replace(/^["']|["']$/g, '') : fallback[Math.floor(Math.random() * fallback.length)]
  } catch {
    return fallback[Math.floor(Math.random() * fallback.length)]
  }
}

export default async function handler(req, res) {
  // Auth: shared secret via header or query.
  const secret = process.env.NUDGE_SECRET
  const provided = req.headers['x-nudge-secret'] || req.query?.secret
  if (!secret || provided !== secret) {
    return res.status(401).json({ error: 'unauthorized' })
  }

  // The public key is safe to expose, so accept either the server name or the client's VITE_ one.
  const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || process.env.VITE_VAPID_PUBLIC_KEY
  const { VAPID_PRIVATE_KEY, VAPID_SUBJECT, CLERK_SECRET_KEY } = process.env
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY || !VAPID_SUBJECT || !CLERK_SECRET_KEY) {
    const missing = [
      !VAPID_PUBLIC_KEY && 'VAPID_PUBLIC_KEY (or VITE_VAPID_PUBLIC_KEY)',
      !VAPID_PRIVATE_KEY && 'VAPID_PRIVATE_KEY',
      !VAPID_SUBJECT && 'VAPID_SUBJECT',
      !CLERK_SECRET_KEY && 'CLERK_SECRET_KEY',
    ].filter(Boolean)
    return res.status(500).json({ error: 'missing env', missing })
  }
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)
  const clerk = createClerkClient({ secretKey: CLERK_SECRET_KEY })

  // `?force=1` bypasses the schedule (quiet hours / quota / random gate) for testing — it still
  // requires an enabled subscription. Handy to verify delivery end-to-end.
  const force = req.query?.force === '1'

  const summary = { checked: 0, sent: 0, skipped: 0, failed: 0 }
  const now = Date.now()

  try {
    for (let offset = 0; offset < 1000; offset += 100) {
      const page = await clerk.users.getUserList({ limit: 100, offset })
      const users = Array.isArray(page) ? page : page.data || []
      if (users.length === 0) break

      for (const user of users) {
        const push = user.unsafeMetadata?.push
        if (!push?.enabled || !push?.subscription) continue
        summary.checked++

        const tz = push.tz || 'UTC'
        const { hour, day } = localParts(tz)
        const state = user.publicMetadata?.pushState || {}
        const sameDay = state.day === day
        const sentToday = sameDay ? state.sentToday || 0 : 0
        const freq = Math.max(1, Math.min(12, push.freq || 5))

        if (!force) {
          if (hour < WAKE_START || hour >= WAKE_END) {
            summary.skipped++
            continue
          }
          if (sentToday >= freq) {
            summary.skipped++
            continue
          }
          if (push.lastActiveAt && now - push.lastActiveAt < ACTIVE_SKIP_MS) {
            summary.skipped++
            continue
          }
          // Uniform random spread: send this hour with p = remaining pings / remaining hours.
          const remainingPings = freq - sentToday
          const remainingHours = Math.max(1, WAKE_END - hour)
          if (Math.random() >= remainingPings / remainingHours) {
            summary.skipped++
            continue
          }
        }

        const body = await generateMessage({ firstName: user.firstName, hour, lastChat: push.lastChat })
        try {
          await webpush.sendNotification(
            push.subscription,
            JSON.stringify({ title: 'Proto 👋', body, url: '/?tab=chat', tag: 'buddy-ping' }),
          )
          summary.sent++
          await clerk.users.updateUserMetadata(user.id, {
            publicMetadata: { pushState: { day, sentToday: sentToday + 1, lastSentAt: now } },
          })
        } catch (e) {
          summary.failed++
          // 404/410 = subscription is dead; turn it off so we stop trying.
          if (e?.statusCode === 404 || e?.statusCode === 410) {
            await clerk.users
              .updateUserMetadata(user.id, {
                unsafeMetadata: { ...user.unsafeMetadata, push: { ...push, enabled: false, subscription: null } },
              })
              .catch(() => {})
          }
        }
      }

      if (users.length < 100) break
    }
  } catch (e) {
    return res.status(500).json({ error: 'run failed', detail: String(e), summary })
  }

  return res.status(200).json({ ok: true, ...summary })
}
