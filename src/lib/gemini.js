// Gemini client — raw REST (no SDK) to keep the integration transparent and dependency-free.
// PRD §8.2: systemInstruction, per-mode temperature, BLOCK_ONLY_HIGH safety settings.

import { GEMINI_MODEL_FALLBACK } from './defaults.js'
import { buildTranslationSystemPrompt, buildLearningSystemPrompt } from './prompts.js'

const BASE = 'https://generativelanguage.googleapis.com/v1beta/models'

// Set all categories to BLOCK_ONLY_HIGH so casual Hindi slang (yaar, abey, pagal)
// isn't filtered out (PRD §8.2).
const SAFETY_SETTINGS = [
  { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
  { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
  { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
  { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
]

export class GeminiError extends Error {
  constructor(message, { kind } = {}) {
    super(message)
    this.name = 'GeminiError'
    this.kind = kind || 'unknown' // 'no-key' | 'auth' | 'rate' | 'safety' | 'network' | 'parse' | 'http'
  }
}

// Can we make AI calls right now? Either the user pasted a personal key, or this is a
// deployed build where the serverless proxy (/api/gemini) supplies a shared key.
export function aiAvailable(settings) {
  return !!settings?.apiKey || import.meta.env.PROD
}

function stripFences(text) {
  // Models sometimes wrap JSON in ```json ... ``` despite instructions.
  return text
    .replace(/^\s*```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim()
}

function extractJson(text) {
  const cleaned = stripFences(text)
  try {
    return JSON.parse(cleaned)
  } catch {
    // Fall back to the first {...} block if there's stray prose around it.
    const start = cleaned.indexOf('{')
    const end = cleaned.lastIndexOf('}')
    if (start !== -1 && end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1))
      } catch {
        /* fall through */
      }
    }
    throw new GeminiError('Could not read the model response.', { kind: 'parse' })
  }
}

async function callGemini({
  apiKey,
  model,
  systemPrompt,
  contents,
  temperature,
  maxOutputTokens,
  thinkingBudget, // undefined = use Gemini's default; set explicitly for translation/chat as needed.
}) {
  // The Gemini request payload — identical whether we call Google directly or via the proxy.
  const payload = {
    systemInstruction: { parts: [{ text: systemPrompt }] },
    contents,
    generationConfig: {
      temperature,
      responseMimeType: 'application/json',
      ...(thinkingBudget !== undefined ? { thinkingConfig: { thinkingBudget } } : {}),
      ...(maxOutputTokens ? { maxOutputTokens } : {}),
    },
    safetySettings: SAFETY_SETTINGS,
  }
  const chosenModel = model || GEMINI_MODEL_FALLBACK

  // Dual-mode: a personal key (from Settings) calls Google directly; otherwise a deployed
  // build routes through our serverless proxy, which holds the shared key server-side.
  const useProxy = !apiKey && import.meta.env.PROD
  if (!apiKey && !useProxy) {
    throw new GeminiError('No API key set. Add your Google AI Studio key in Settings.', {
      kind: 'no-key',
    })
  }

  let url, requestBody
  if (useProxy) {
    url = '/api/gemini'
    requestBody = { model: chosenModel, payload }
  } else {
    url = `${BASE}/${encodeURIComponent(chosenModel)}:generateContent?key=${encodeURIComponent(apiKey)}`
    requestBody = payload
  }

  let res
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    })
  } catch {
    throw new GeminiError('Network error — check your connection and try again.', {
      kind: 'network',
    })
  }

  if (!res.ok) {
    let detail = ''
    try {
      const err = await res.json()
      detail = err?.error?.message || ''
    } catch {
      /* ignore */
    }
    if (res.status === 400 && /api key/i.test(detail)) {
      throw new GeminiError(
        useProxy
          ? "The server's API key looks invalid — check GEMINI_API_KEY in Vercel."
          : 'That API key looks invalid. Double-check it in Settings.',
        { kind: 'auth' },
      )
    }
    if (res.status === 401 || res.status === 403) {
      throw new GeminiError(
        useProxy
          ? "The server's API key was rejected — check GEMINI_API_KEY in Vercel."
          : 'API key was rejected. Check the key and its permissions.',
        { kind: 'auth' },
      )
    }
    if (res.status === 429) {
      throw new GeminiError("Hit the free-tier rate limit. Give it a minute and try again.", {
        kind: 'rate',
      })
    }
    throw new GeminiError(detail || `Request failed (HTTP ${res.status}).`, { kind: 'http' })
  }

  const data = await res.json()

  // Blocked prompt / no candidate.
  const blockReason = data?.promptFeedback?.blockReason
  if (blockReason) {
    throw new GeminiError(`The request was blocked (${blockReason}). Try rephrasing.`, {
      kind: 'safety',
    })
  }
  const candidate = data?.candidates?.[0]
  const finish = candidate?.finishReason
  if (finish === 'SAFETY') {
    throw new GeminiError('The reply was filtered by safety settings. Try rephrasing.', {
      kind: 'safety',
    })
  }
  const text = candidate?.content?.parts?.map((p) => p.text || '').join('') || ''
  // MAX_TOKENS means the model ran out of budget mid-answer (often because "thinking"
  // consumed it) — the JSON is truncated and won't parse. Give a clear, distinct message.
  if (finish === 'MAX_TOKENS') {
    throw new GeminiError('The reply got cut off before it finished. Please try again.', {
      kind: 'parse',
    })
  }
  if (!text) {
    throw new GeminiError('Empty response from the model. Try again.', { kind: 'parse' })
  }
  return extractJson(text)
}

// ---- Mode 1: Live Translation ----
export async function translate(input, settings) {
  const result = await callGemini({
    apiKey: settings.apiKey,
    model: settings.model,
    systemPrompt: buildTranslationSystemPrompt(settings),
    contents: [{ role: 'user', parts: [{ text: input }] }],
    temperature: 0.7,
    maxOutputTokens: 2048,
  })
  // Normalise shape defensively.
  return {
    hindi: result.hindi || '',
    aap_version: result.aap_version || null,
    words: Array.isArray(result.words) ? result.words : [],
    tamil_parallel: result.tamil_parallel || '',
    structure_note: result.structure_note || '',
    already_hindi: !!result.already_hindi,
  }
}

// ---- Mode 2: Learning buddy ----
// `history` = our internal message list. `progress` = { proficiency } (drives Hindi/English
// mix). `kickoff` starts a fresh session.
export async function chatWithBuddy(history, settings, { kickoff = false, progress } = {}) {
  const contents = historyToContents(history)
  if (kickoff) {
    contents.push({
      role: 'user',
      parts: [
        {
          text: '[SESSION START] Greet me warmly like a friend on WhatsApp and kick off our everyday chat with a first small-talk question. Keep it short and follow the LANGUAGE MIX rule exactly.',
        },
      ],
    })
  }

  const result = await callGemini({
    apiKey: settings.apiKey,
    model: settings.model,
    systemPrompt: buildLearningSystemPrompt(settings, progress),
    contents,
    // 0.6 (was 0.9): high randomness made the buddy overshoot the target Hindi ratio
    // and lean on its "Hindi buddy" instinct. Lower temp = tighter adherence to the
    // LANGUAGE MIX rule, while still sounding natural.
    temperature: 0.6,
    // Headroom for the JSON answer, plus a cap on "thinking" so it can't eat the whole
    // budget and truncate the reply (the cause of "could not read the model response").
    // Casual chat needs far less reasoning than translation, so a modest cap is safe.
    maxOutputTokens: 2048,
    thinkingBudget: 1024,
  })

  const messages = Array.isArray(result.messages)
    ? result.messages.filter((m) => typeof m === 'string' && m.trim())
    : []
  const correction =
    result.correction && result.correction.fix
      ? {
          you_said: result.correction.you_said || '',
          literal: result.correction.literal || '',
          fix: result.correction.fix || '',
          why: result.correction.why || '',
          tamil: result.correction.tamil || '',
          pairs: Array.isArray(result.correction.pairs)
            ? result.correction.pairs
                .filter((p) => p && (p.hindi || p.tamil))
                .map((p) => ({ hindi: p.hindi || '', tamil: p.tamil || '', means: p.means || '' }))
            : [],
        }
      : null

  // Hidden signal that nudges the learner's proficiency. Two guards against runaway drift:
  //  1. Symmetric clamp (-3..+3, was -2..+3) so the score isn't biased upward.
  //  2. Damping factor so a single turn moves it only a little — proficiency climbs
  //     slowly and honestly over many turns instead of jumping into "mostly Hindi".
  const PROGRESS_DAMP = 0.4
  let raw = Number(result?.assessment?.progress_delta)
  raw = Number.isFinite(raw) ? Math.max(-3, Math.min(3, Math.round(raw))) : 0
  const progressDelta = raw * PROGRESS_DAMP

  // Tamil-anchored teaching card ("how do I say…"). Present only on teaching turns.
  const b = result.breakdown
  const breakdown =
    b && b.hindi
      ? {
          english: b.english || '',
          hindi: b.hindi || '',
          tamil: b.tamil || '',
          pairs: Array.isArray(b.pairs)
            ? b.pairs
                .filter((p) => p && (p.hindi || p.tamil))
                .map((p) => ({ hindi: p.hindi || '', tamil: p.tamil || '', means: p.means || '' }))
            : [],
          similarity: b.similarity || '',
        }
      : null

  // One-line rolling summary of the chat, synced to the account so a later push ping can
  // reference it ("last time you talked about…"). Trimmed defensively.
  const recap = typeof result.recap === 'string' ? result.recap.trim().slice(0, 200) : ''

  return {
    bubbles: messages.length ? messages : ['(hmm, kuch garbar hui — ek baar phir bolo?)'],
    correction,
    breakdown,
    progressDelta,
    recap,
  }
}

// Map our internal messages to Gemini `contents`. Keep the last ~20 turns (PRD §8.4).
function historyToContents(history) {
  const recent = history.slice(-20)
  const contents = []
  for (const m of recent) {
    if (m.role === 'user') {
      contents.push({ role: 'user', parts: [{ text: m.text }] })
    } else if (m.role === 'buddy') {
      // Feed back what the buddy said (bubbles joined) plus the corrected form for context.
      let text = (m.bubbles || []).join('\n')
      if (m.correction?.fix) text += `\n(correct form: ${m.correction.fix})`
      contents.push({ role: 'model', parts: [{ text: text || '...' }] })
    }
  }
  // Gemini expects the first turn to be role 'user'. Drop any leading model turns.
  while (contents.length && contents[0].role === 'model') contents.shift()
  return contents
}
