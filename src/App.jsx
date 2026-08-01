import { useState } from 'react'
import { useStore } from './state/store.jsx'
import { authEnabled } from './lib/auth.js'
import Onboarding from './components/Onboarding.jsx'
import AccountSync from './components/AccountSync.jsx'
import TranslateView from './views/TranslateView.jsx'
import LearnView from './views/LearnView.jsx'
import VocabView from './views/VocabView.jsx'
import SettingsView from './views/SettingsView.jsx'
import { TranslateIcon, ChatIcon, BookIcon, SettingsIcon, FlameIcon } from './components/Icons.jsx'

const TABS = [
  { key: 'translate', label: 'Translate', Icon: TranslateIcon },
  { key: 'learn', label: 'Chat', Icon: ChatIcon },
  { key: 'vocab', label: 'Vocab', Icon: BookIcon },
  { key: 'settings', label: 'Settings', Icon: SettingsIcon },
]

const VALID_TABS = ['translate', 'learn', 'vocab', 'settings']
// Notifications open the app at /?tab=chat — honor that on first load.
function initialTab() {
  try {
    const t = new URLSearchParams(window.location.search).get('tab')
    if (t === 'chat') return 'learn'
    if (VALID_TABS.includes(t)) return t
  } catch {
    /* ignore */
  }
  return 'translate'
}

export default function App() {
  const { settings, streak, vocab } = useStore()
  const [tab, setTab] = useState(initialTab)

  // First-launch: ask speaker gender once (PRD §6.3).
  if (!settings.gender) {
    return <Onboarding />
  }

  return (
    <div className="mx-auto flex h-full max-w-lg flex-col bg-cream">
      {/* Keeps the signed-in account's proficiency in sync with the store. */}
      {authEnabled() && <AccountSync />}

      {/* Header */}
      <header className="flex items-center justify-between px-4 pt-3 pb-2">
        <div className="flex items-baseline gap-2">
          <h1 className="text-xl font-extrabold tracking-tight text-saffron-600">Proto</h1>
          <span className="text-xs font-medium text-ink/40">spoken Hindi, the real way</span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span
            className="flex items-center gap-1 font-semibold text-saffron-600"
            title={`${streak.current}-day streak · best ${streak.best}`}
          >
            <FlameIcon width={16} height={16} />
            {streak.current}
          </span>
          <span className="text-ink/30">·</span>
          <span className="font-medium text-ink/50" title="words saved">
            {vocab.length} words
          </span>
        </div>
      </header>

      {/* Active view */}
      <main className="relative min-h-0 flex-1 overflow-hidden">
        {tab === 'translate' && <TranslateView goTo={setTab} />}
        {tab === 'learn' && <LearnView goTo={setTab} />}
        {tab === 'vocab' && <VocabView goTo={setTab} />}
        {tab === 'settings' && <SettingsView />}
      </main>

      {/* Bottom nav */}
      <nav className="flex shrink-0 items-stretch justify-around border-t border-ink/10 bg-white/80 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        {TABS.map(({ key, label, Icon }) => {
          const active = tab === key
          return (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium transition-colors ${
                active ? 'text-saffron-600' : 'text-ink/45 hover:text-ink/70'
              }`}
              aria-current={active ? 'page' : undefined}
            >
              <Icon width={22} height={22} />
              {label}
            </button>
          )
        })}
      </nav>
    </div>
  )
}
