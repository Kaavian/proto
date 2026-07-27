import { useState } from 'react'
import { useStore } from '../state/store.jsx'

export default function Onboarding() {
  const { updateSettings } = useStore()
  const [gender, setGender] = useState(null)

  return (
    <div className="mx-auto flex h-full max-w-lg flex-col justify-center px-6 py-10">
      <div className="animate-pop-in">
        <p className="text-sm font-semibold uppercase tracking-widest text-saffron-500">Namaste 👋</p>
        <h1 className="mt-1 text-4xl font-extrabold tracking-tight text-ink">
          Yaar<span className="text-saffron-500">.</span>
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-ink/70">
          Learn to speak Hindi the way people <em>actually</em> talk — casual, everyday, WhatsApp
          Hindi. Translate anything, then chat with a friendly buddy who nudges you along and fixes
          mistakes without ever making it feel like a test.
        </p>

        <div className="mt-8">
          <p className="text-sm font-semibold text-ink/80">
            One quick thing — Hindi verbs change with your gender.
          </p>
          <p className="mt-1 text-[13px] text-ink/55">
            <span className="hinglish font-medium">main aaya</span> (male) vs{' '}
            <span className="hinglish font-medium">main aayi</span> (female). Pick yours so
            everything agrees. You can change it later in Settings.
          </p>

          <div className="mt-4 grid grid-cols-2 gap-3">
            {[
              { key: 'male', label: 'Male', ex: 'main aaya' },
              { key: 'female', label: 'Female', ex: 'main aayi' },
            ].map((opt) => (
              <button
                key={opt.key}
                onClick={() => setGender(opt.key)}
                className={`rounded-2xl border-2 px-4 py-4 text-left transition-all ${
                  gender === opt.key
                    ? 'border-saffron-500 bg-saffron-50 shadow-card'
                    : 'border-ink/10 bg-white hover:border-ink/20'
                }`}
              >
                <div className="text-base font-bold text-ink">{opt.label}</div>
                <div className="hinglish mt-0.5 text-sm text-ink/50">{opt.ex}</div>
              </button>
            ))}
          </div>
        </div>

        <button
          disabled={!gender}
          onClick={() => updateSettings({ gender })}
          className="mt-8 w-full rounded-2xl bg-saffron-500 py-3.5 text-base font-bold text-white shadow-card transition-all enabled:hover:bg-saffron-600 disabled:opacity-40"
        >
          Chalo, let's go →
        </button>
        <p className="mt-3 text-center text-xs text-ink/40">
          {import.meta.env.PROD
            ? 'Translations & chat are ready to go — nothing else to set up.'
            : "You'll add a free Google AI key in Settings to power translations & chat."}
        </p>
      </div>
    </div>
  )
}
