// Seed values and constants used across the app.

// Pre-seeded "keep in English" list (PRD §6.3 / §3.4). User-editable in Settings.
export const DEFAULT_KEEP_IN_ENGLISH = [
  'bus',
  'car',
  'hair',
  'specs',
  'phone',
  'train',
  'ticket',
  'office',
  'weekend',
  'mobile',
  'WhatsApp',
  'college',
  'class',
  'meeting',
  'laptop',
  'email',
  'coffee',
  'metro',
  'auto',
  'movie',
  'match',
]

export const DEFAULT_SETTINGS = {
  // Speaker gender for verb agreement (main aaya / main aayi). Asked once on launch.
  gender: null, // 'male' | 'female' — null means onboarding not done yet
  // Register default. tum is the everyday default; aap variants are opt-in.
  includeAapVariants: true,
  // Correction intensity: 'gentle' (one fix at a time) | 'thorough'.
  correctionIntensity: 'gentle',
  // User-editable keep-in-English list.
  keepInEnglish: DEFAULT_KEEP_IN_ENGLISH,
  // Gemini API key (dev-only client-side key — see README §API key security).
  apiKey: '',
  // Model string (Google occasionally updates the default Flash model — editable).
  model: 'gemini-2.5-flash',
}

// The model used for both modes; kept here so it is easy to swap.
export const GEMINI_MODEL_FALLBACK = 'gemini-2.5-flash'

// Familiarity buckets for the Vocabulary tab filter.
export const FAMILIARITY = {
  NEW: 'new', // count 0
  LEARNING: 'learning', // 1–2
  KNOWN: 'known', // 3+
}

export function familiarityOf(count) {
  if (!count || count <= 0) return FAMILIARITY.NEW
  if (count <= 2) return FAMILIARITY.LEARNING
  return FAMILIARITY.KNOWN
}
