import { useMemo, useState } from 'react'
import { useStore } from '../state/store.jsx'
import { familiarityOf, FAMILIARITY } from '../lib/defaults.js'
import { SearchIcon, TrashIcon, FlameIcon, BookIcon } from '../components/Icons.jsx'

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: FAMILIARITY.NEW, label: 'New' },
  { key: FAMILIARITY.LEARNING, label: 'Learning' },
  { key: FAMILIARITY.KNOWN, label: 'Known' },
]

const BADGE = {
  [FAMILIARITY.NEW]: 'bg-sky-100 text-sky-700',
  [FAMILIARITY.LEARNING]: 'bg-amber-100 text-amber-700',
  [FAMILIARITY.KNOWN]: 'bg-emerald-100 text-emerald-700',
}

export default function VocabView({ goTo }) {
  const { vocab, removeVocab, streak, wordsLearned } = useStore()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return vocab.filter((v) => {
      const fam = familiarityOf(v.familiarity)
      if (filter !== 'all' && fam !== filter) return false
      if (!q) return true
      return (
        v.hinglish?.toLowerCase().includes(q) ||
        v.meaning?.toLowerCase().includes(q) ||
        v.example?.toLowerCase().includes(q)
      )
    })
  }, [vocab, query, filter])

  return (
    <div className="scroll-slim h-full overflow-y-auto pb-6">
      {/* Progress strip */}
      <div className="px-4 pt-3">
        <div className="grid grid-cols-3 gap-2">
          <Stat icon={<FlameIcon width={18} height={18} />} value={streak.current} label="day streak" />
          <Stat icon={<BookIcon width={18} height={18} />} value={vocab.length} label="saved" />
          <Stat value={wordsLearned} label="learned" />
        </div>
      </div>

      {/* Search + filters */}
      <div className="sticky top-0 z-10 bg-cream/95 px-4 pt-3 pb-2 backdrop-blur">
        <div className="flex items-center gap-2 rounded-full border border-ink/10 bg-white px-3 py-2">
          <SearchIcon width={17} height={17} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search your words…"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-ink/35"
          />
        </div>
        <div className="mt-2 flex gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`rounded-full px-3 py-1 text-[13px] font-semibold transition-colors ${
                filter === f.key
                  ? 'bg-saffron-500 text-white'
                  : 'bg-white text-ink/50 ring-1 ring-ink/10 hover:text-ink/70'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="px-4">
        {filtered.length === 0 ? (
          <Empty vocabEmpty={vocab.length === 0} goTo={goTo} />
        ) : (
          <ul className="space-y-2">
            {filtered.map((v) => {
              const fam = familiarityOf(v.familiarity)
              return (
                <li
                  key={v.id}
                  className="animate-fade-in rounded-2xl border border-ink/10 bg-white p-3.5 shadow-card"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="hinglish text-[17px] font-bold text-ink">{v.hinglish}</p>
                      {v.meaning && <p className="text-sm text-ink/60">{v.meaning}</p>}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${BADGE[fam]}`}>
                        {fam}
                      </span>
                      <button
                        onClick={() => removeVocab(v.id)}
                        className="text-ink/30 transition-colors hover:text-red-500"
                        aria-label="Delete word"
                      >
                        <TrashIcon width={17} height={17} />
                      </button>
                    </div>
                  </div>
                  {v.example && v.example !== v.hinglish && (
                    <p className="hinglish mt-2 border-l-2 border-saffron-200 pl-2 text-[13px] text-ink/50">
                      {v.example}
                    </p>
                  )}
                  <div className="mt-2 flex items-center gap-2 text-[11px] text-ink/35">
                    <span>{v.source === 'chat' ? '💬 from chat' : '🔤 from translate'}</span>
                    {v.familiarity > 0 && <span>· used {v.familiarity}×</span>}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}

function Stat({ icon, value, label }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-ink/10 bg-white py-3 shadow-card">
      <div className="flex items-center gap-1 text-saffron-600">
        {icon}
        <span className="text-xl font-extrabold text-ink">{value}</span>
      </div>
      <span className="mt-0.5 text-[11px] font-medium text-ink/45">{label}</span>
    </div>
  )
}

function Empty({ vocabEmpty, goTo }) {
  return (
    <div className="mt-12 flex flex-col items-center text-center">
      <div className="text-4xl">📒</div>
      <p className="mt-3 font-semibold text-ink/70">
        {vocabEmpty ? 'No words saved yet' : 'Nothing matches that'}
      </p>
      {vocabEmpty && (
        <>
          <p className="mt-1 max-w-xs text-sm text-ink/50">
            Tap the bookmark on any translation or chat message and it lands here.
          </p>
          <button
            onClick={() => goTo?.('translate')}
            className="mt-4 rounded-full bg-saffron-500 px-5 py-2 text-sm font-bold text-white"
          >
            Translate something →
          </button>
        </>
      )}
    </div>
  )
}
