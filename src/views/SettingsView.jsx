import { useState } from 'react'
import { useUser, useClerk } from '@clerk/react'
import { useStore } from '../state/store.jsx'
import { DEFAULT_KEEP_IN_ENGLISH } from '../lib/defaults.js'
import { authEnabled } from '../lib/auth.js'
import { useInstall } from '../hooks/useInstall.js'

export default function SettingsView() {
  const { settings, updateSettings } = useStore()
  const [newWord, setNewWord] = useState('')
  const [showKey, setShowKey] = useState(false)

  const keep = settings.keepInEnglish || []

  function addKeepWord() {
    const w = newWord.trim()
    if (!w) return
    if (!keep.some((k) => k.toLowerCase() === w.toLowerCase())) {
      updateSettings({ keepInEnglish: [...keep, w] })
    }
    setNewWord('')
  }

  function removeKeepWord(word) {
    updateSettings({ keepInEnglish: keep.filter((k) => k !== word) })
  }

  return (
    <div className="scroll-slim h-full overflow-y-auto px-4 pb-8 pt-3">
      {authEnabled() && <AccountSection />}
      <InstallSection />

      {/* API key */}
      <Section title="Google AI key" subtitle="Optional — your own Gemini quota">
        <input
          type={showKey ? 'text' : 'password'}
          value={settings.apiKey}
          onChange={(e) => updateSettings({ apiKey: e.target.value.trim() })}
          placeholder="Paste your Gemini API key (optional)"
          className="w-full rounded-xl border border-ink/10 bg-white px-3 py-2.5 text-sm outline-none focus:border-saffron-400"
          autoComplete="off"
          spellCheck={false}
        />
        <div className="mt-2 flex items-center justify-between">
          <label className="flex items-center gap-1.5 text-[13px] text-ink/50">
            <input
              type="checkbox"
              checked={showKey}
              onChange={(e) => setShowKey(e.target.checked)}
              className="accent-saffron-500"
            />
            Show key
          </label>
          <a
            href="https://aistudio.google.com/apikey"
            target="_blank"
            rel="noreferrer"
            className="text-[13px] font-semibold text-saffron-600 hover:underline"
          >
            Get a free key →
          </a>
        </div>
        <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-[12px] leading-relaxed text-amber-800">
          Translation & chat already work without this — the app uses a shared key on the server.
          Add your own key only to use your personal Gemini quota; it's stored just in this browser
          and sent straight to Google. (Running locally without the server, a key here is required.)
        </p>
      </Section>

      {/* Speaker gender */}
      <Section title="Speaker gender" subtitle="For verb agreement — main aaya / main aayi">
        <Segmented
          value={settings.gender}
          onChange={(v) => updateSettings({ gender: v })}
          options={[
            { value: 'male', label: 'Male' },
            { value: 'female', label: 'Female' },
          ]}
        />
      </Section>

      {/* Register */}
      <Section title="Politeness" subtitle="Default is casual “tum”">
        <Toggle
          checked={settings.includeAapVariants}
          onChange={(v) => updateSettings({ includeAapVariants: v })}
          label="Show polite “aap” version when relevant"
        />
      </Section>

      {/* Correction intensity */}
      <Section title="Corrections" subtitle="How much the buddy fixes at once">
        <Segmented
          value={settings.correctionIntensity}
          onChange={(v) => updateSettings({ correctionIntensity: v })}
          options={[
            { value: 'gentle', label: 'Gentle' },
            { value: 'thorough', label: 'Thorough' },
          ]}
        />
        <p className="mt-2 text-[13px] text-ink/50">
          {settings.correctionIntensity === 'thorough'
            ? 'Points out more, but still warm and one-at-a-time in spirit.'
            : 'One fix at a time — the most important slip only.'}
        </p>
      </Section>

      {/* Keep in English */}
      <Section
        title="Keep in English"
        subtitle="Everyday words that stay in English, never translated"
      >
        <div className="flex flex-wrap gap-1.5">
          {keep.map((w) => (
            <button
              key={w}
              onClick={() => removeKeepWord(w)}
              className="group flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[13px] font-medium text-ink/70 ring-1 ring-ink/10 hover:ring-red-200"
              title="Remove"
            >
              {w}
              <span className="text-ink/30 group-hover:text-red-500">×</span>
            </button>
          ))}
        </div>
        <div className="mt-2 flex gap-2">
          <input
            value={newWord}
            onChange={(e) => setNewWord(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addKeepWord()}
            placeholder="Add a word…"
            className="min-w-0 flex-1 rounded-full border border-ink/10 bg-white px-3 py-2 text-sm outline-none focus:border-saffron-400"
          />
          <button
            onClick={addKeepWord}
            className="rounded-full bg-saffron-500 px-4 py-2 text-sm font-bold text-white"
          >
            Add
          </button>
        </div>
        {keep.length !== DEFAULT_KEEP_IN_ENGLISH.length && (
          <button
            onClick={() => updateSettings({ keepInEnglish: DEFAULT_KEEP_IN_ENGLISH })}
            className="mt-2 text-[13px] font-semibold text-ink/40 hover:text-ink/60"
          >
            Reset to defaults
          </button>
        )}
      </Section>

      <p className="mt-6 text-center text-xs text-ink/30">
        Proto · everything saves locally on this device
      </p>
    </div>
  )
}

// Only mounted when auth is enabled, so it always sits inside <ClerkProvider>.
function AccountSection() {
  const { isLoaded, isSignedIn, user } = useUser()
  const { signOut } = useClerk()

  if (!isLoaded) return null

  if (!isSignedIn) {
    return (
      <Section title="Account" subtitle="Sign in to save your progress">
        <p className="rounded-xl bg-white px-3.5 py-3 text-[13px] leading-relaxed text-ink/60 ring-1 ring-ink/10">
          Head to the <span className="font-semibold text-ink/80">Chat</span> tab to sign in with
          Google. Your proficiency then saves to your account and follows you across devices.
        </p>
      </Section>
    )
  }

  const label =
    user?.primaryEmailAddress?.emailAddress ||
    user?.fullName ||
    user?.primaryPhoneNumber?.phoneNumber ||
    'your account'
  return (
    <Section title="Account" subtitle="Your progress is saved here">
      <div className="flex items-center justify-between rounded-xl bg-white px-3.5 py-3 ring-1 ring-ink/10">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ink">Signed in</p>
          <p className="truncate text-[13px] text-ink/50">{label}</p>
        </div>
        <button
          onClick={() => signOut()}
          className="shrink-0 rounded-full border border-ink/15 px-3.5 py-1.5 text-[13px] font-semibold text-ink/60 transition-colors hover:border-red-200 hover:text-red-500"
        >
          Sign out
        </button>
      </div>
    </Section>
  )
}

function InstallSection() {
  const { canInstall, promptInstall, isStandalone, isIos } = useInstall()
  // Hide once installed, or when there's nothing actionable on this device/browser.
  if (isStandalone) return null
  if (!canInstall && !isIos) return null

  return (
    <Section
      title="Install Proto"
      subtitle="Add it to your home screen — opens like an app and works offline"
    >
      {canInstall ? (
        <button
          onClick={promptInstall}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-saffron-500 px-4 py-3 text-sm font-bold text-white active:scale-[.99]"
        >
          📲 Add to Home Screen
        </button>
      ) : (
        <div className="rounded-xl bg-white px-3.5 py-3 text-[13px] leading-relaxed text-ink/70 ring-1 ring-ink/10">
          In Safari, tap the <span className="font-semibold">Share</span> button (the square with an
          up-arrow), then <span className="font-semibold">“Add to Home Screen.”</span>
        </div>
      )}
    </Section>
  )
}

function Section({ title, subtitle, children }) {
  return (
    <section className="mt-5 first:mt-2">
      <h2 className="text-sm font-bold text-ink">{title}</h2>
      {subtitle && <p className="mb-2 text-[13px] text-ink/45">{subtitle}</p>}
      {children}
    </section>
  )
}

function Segmented({ value, onChange, options }) {
  return (
    <div className="inline-flex rounded-full bg-white p-1 ring-1 ring-ink/10">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`rounded-full px-5 py-1.5 text-sm font-semibold transition-colors ${
            value === o.value ? 'bg-saffron-500 text-white' : 'text-ink/50 hover:text-ink/70'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

function Toggle({ checked, onChange, label }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between rounded-xl bg-white px-3 py-2.5 ring-1 ring-ink/10"
    >
      <span className="text-sm text-ink/70">{label}</span>
      <span
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
          checked ? 'bg-saffron-500' : 'bg-ink/15'
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-5' : 'translate-x-0.5'
          }`}
        />
      </span>
    </button>
  )
}
