// Local-first persistence (PRD §8.1). Thin, synchronous wrapper over localStorage.
// For a single-learner app the data volume is tiny, so localStorage is plenty and
// keeps the React code free of async storage plumbing.

import { DEFAULT_SETTINGS } from './defaults.js'

const KEYS = {
  settings: 'yaar.settings',
  vocab: 'yaar.vocab',
  history: 'yaar.history', // recent translations
  chat: 'yaar.chat', // current Learning-mode conversation
  streak: 'yaar.streak',
  tcache: 'yaar.tcache', // translation cache: normalized input -> result
  progress: 'yaar.progress', // hidden learner proficiency (drives Hindi/English mix)
}

const CACHE_LIMIT = 300

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    if (raw == null) return fallback
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Storage full / unavailable — fail quietly; the UI still works for the session.
  }
}

// ---- Settings ----
export function loadSettings() {
  const stored = read(KEYS.settings, {})
  // Merge over defaults so new fields appear for existing users.
  return { ...DEFAULT_SETTINGS, ...stored }
}
export function saveSettings(settings) {
  write(KEYS.settings, settings)
}

// ---- Vocabulary ----
// Each item: { id, hinglish, meaning, example, source, date, familiarity }
export function loadVocab() {
  return read(KEYS.vocab, [])
}
export function saveVocab(items) {
  write(KEYS.vocab, items)
}

// ---- Translation history ----
// Each item: { id, input, result, date }
export function loadHistory() {
  return read(KEYS.history, [])
}
export function saveHistory(items) {
  write(KEYS.history, items)
}

// ---- Learning chat ----
// { messages: [...], updatedAt }
export function loadChat() {
  return read(KEYS.chat, null)
}
export function saveChat(chat) {
  write(KEYS.chat, chat)
}
export function clearChat() {
  try {
    localStorage.removeItem(KEYS.chat)
  } catch {
    /* ignore */
  }
}

// ---- Streak ----
// { current, best, lastActiveDate (YYYY-MM-DD) }
export function loadStreak() {
  return read(KEYS.streak, { current: 0, best: 0, lastActiveDate: null })
}
export function saveStreak(streak) {
  write(KEYS.streak, streak)
}

// ---- Learner proficiency (hidden — never shown in the UI) ----
// A 0–100 score that quietly rises as the user handles more Hindi. It drives how much
// Hindi vs English the buddy speaks (see targetHindiPct). Starts near 0 = mostly English.
export function loadProgress() {
  const p = read(KEYS.progress, {})
  return { proficiency: clamp(p.proficiency ?? 0, 0, 100) }
}
export function saveProgress(progress) {
  write(KEYS.progress, progress)
}
export function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n))
}
// The Hindi share of the buddy's speech IS the proficiency score, directly.
// 0 -> 0% Hindi (100% English). 10 -> 10% Hindi / 90% English. 100 -> full Hindi.
export function targetHindiPct(proficiency) {
  return clamp(Math.round(proficiency || 0), 0, 100)
}

// Utility: local YYYY-MM-DD (not UTC) so the streak matches the user's calendar day.
export function todayKey(d = new Date()) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// Advance the streak given a "used the app today" event.
export function bumpStreak(streak) {
  const today = todayKey()
  if (streak.lastActiveDate === today) return streak // already counted today

  const yesterday = todayKey(new Date(Date.now() - 24 * 60 * 60 * 1000))
  const current = streak.lastActiveDate === yesterday ? streak.current + 1 : 1
  return {
    current,
    best: Math.max(current, streak.best || 0),
    lastActiveDate: today,
  }
}

export function newId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

// ---- Translation cache ----
// Repeats return instantly (and work offline). Keyed on the normalized input plus a
// short hash of the settings that change the output (gender, register, keep-list).
function hashStr(s) {
  let h = 5381
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0
  return (h >>> 0).toString(36)
}

export function transCacheKey(input, settings) {
  const norm = (input || '').trim().toLowerCase().replace(/\s+/g, ' ')
  const keep = (settings.keepInEnglish || []).slice().sort().join(',')
  const sig = hashStr(`${settings.gender}|${settings.includeAapVariants ? 1 : 0}|${keep}`)
  return `${sig}|${norm}`
}

export function getCachedTranslation(key) {
  const cache = read(KEYS.tcache, {})
  return cache[key] || null
}

export function setCachedTranslation(key, result) {
  const cache = read(KEYS.tcache, {})
  // Refresh insertion order so recently-used entries survive trimming.
  delete cache[key]
  cache[key] = result
  const keys = Object.keys(cache)
  if (keys.length > CACHE_LIMIT) {
    for (const k of keys.slice(0, keys.length - CACHE_LIMIT)) delete cache[k]
  }
  write(KEYS.tcache, cache)
}
