import { useStore } from '../state/store.jsx'
import { aiAvailable } from '../lib/gemini.js'

// Shown on Translate/Chat only when the app can't make AI calls: no personal key AND
// not a deployed build (where the shared proxy key handles it).
export default function ApiKeyBanner({ goTo }) {
  const { settings } = useStore()
  if (aiAvailable(settings)) return null

  return (
    <div className="mx-4 mt-3 rounded-2xl border border-saffron-200 bg-saffron-50 px-4 py-3">
      <p className="text-sm font-semibold text-saffron-700">Add your free Google AI key to begin</p>
      <p className="mt-0.5 text-[13px] text-ink/60">
        Translations and chat are powered by Gemini. Grab a free key from Google AI Studio, then
        paste it in Settings — no credit card needed.
      </p>
      <button
        onClick={() => goTo?.('settings')}
        className="mt-2 rounded-full bg-saffron-500 px-4 py-1.5 text-[13px] font-bold text-white transition-colors hover:bg-saffron-600"
      >
        Open Settings →
      </button>
    </div>
  )
}
