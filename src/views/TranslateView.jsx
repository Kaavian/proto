import { useState, useRef, useEffect } from 'react'
import { useStore } from '../state/store.jsx'
import { translate, GeminiError, aiAvailable } from '../lib/gemini.js'
import { transCacheKey, getCachedTranslation, setCachedTranslation } from '../lib/storage.js'
import ApiKeyBanner from '../components/ApiKeyBanner.jsx'
import { BookmarkIcon, SparkIcon, SendIcon } from '../components/Icons.jsx'

export default function TranslateView({ goTo }) {
  const { settings, addVocab, isSaved, addHistory, history, markActivity } = useStore()
  const [input, setInput] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showAap, setShowAap] = useState(false)
  const [savedSentence, setSavedSentence] = useState(false)
  const [fromCache, setFromCache] = useState(false)
  const textareaRef = useRef(null)

  async function runTranslate(text) {
    const trimmed = (text ?? input).trim()
    setError('')
    if (!trimmed) {
      setError('Type an English sentence to translate — anything you’d actually say.')
      return
    }
    setShowAap(false)
    setSavedSentence(false)

    // Instant path: a sentence we've translated before (same settings) is cached.
    const key = transCacheKey(trimmed, settings)
    const cached = getCachedTranslation(key)
    if (cached) {
      setResult(cached)
      setFromCache(true)
      addHistory({ input: trimmed, result: cached })
      markActivity()
      return
    }

    if (!aiAvailable(settings)) {
      setError('Add your Google AI key in Settings first.')
      return
    }
    setLoading(true)
    setResult(null)
    setFromCache(false)
    try {
      const res = await translate(trimmed, settings)
      setResult(res)
      setCachedTranslation(key, res)
      addHistory({ input: trimmed, result: res })
      markActivity()
    } catch (e) {
      setError(e instanceof GeminiError ? e.message : 'Something went wrong. Try again.')
    } finally {
      setLoading(false)
    }
  }

  function onKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      runTranslate()
    }
  }

  function reopen(entry) {
    setInput(entry.input)
    setResult(entry.result)
    setError('')
    setShowAap(false)
    setSavedSentence(false)
    setFromCache(true)
    textareaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="scroll-slim h-full overflow-y-auto pb-6">
      <ApiKeyBanner goTo={goTo} />

      {/* Input */}
      <div className="px-4 pt-3">
        <div className="rounded-2xl border border-ink/10 bg-white p-3 shadow-card">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            rows={2}
            placeholder="Type in English — e.g. “Where are you from?”"
            className="w-full resize-none bg-transparent text-[16px] leading-snug text-ink outline-none placeholder:text-ink/35"
          />
          <div className="mt-2 flex items-center justify-between">
            <span className="text-xs text-ink/35">Enter to translate · Shift+Enter for new line</span>
            <button
              onClick={() => runTranslate()}
              disabled={loading}
              className="flex items-center gap-1.5 rounded-full bg-saffron-500 px-4 py-2 text-sm font-bold text-white transition-colors enabled:hover:bg-saffron-600 disabled:opacity-50"
            >
              {loading ? 'Translating…' : 'Translate'}
              {!loading && <SendIcon width={16} height={16} />}
            </button>
          </div>
        </div>
        {error && <p className="mt-2 px-1 text-sm text-red-500">{error}</p>}
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="mx-4 mt-4 animate-fade-in rounded-2xl border border-ink/10 bg-white p-4 shadow-card">
          <div className="h-5 w-2/3 animate-pulse rounded bg-ink/10" />
          <div className="mt-4 space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-4 w-full animate-pulse rounded bg-ink/5" />
            ))}
          </div>
        </div>
      )}

      {/* Result */}
      {result && !loading && (
        <div className="mx-4 mt-4 animate-pop-in space-y-4">
          {result.already_hindi && (
            <div className="rounded-xl bg-sky-50 px-3 py-2 text-[13px] text-sky-700">
              That’s already Hindi — here’s what it means and how it’s built. 👇
            </div>
          )}

          {/* Hindi sentence */}
          <div className="rounded-2xl border border-saffron-200 bg-white p-4 shadow-card">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-saffron-500">
                  {result.already_hindi ? 'You said' : 'Hindi'}
                  {fromCache && (
                    <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold normal-case tracking-normal text-emerald-700">
                      ⚡ instant
                    </span>
                  )}
                </p>
                <p className="hinglish mt-1 text-2xl font-bold leading-tight text-ink">
                  {result.hindi}
                </p>
                {result.tamil_parallel && (
                  <p className="mt-1.5 text-[14px] text-ink/60">
                    <span className="mr-1 text-[11px] font-bold uppercase tracking-wide text-emerald-600">
                      Tamil
                    </span>
                    {result.tamil_parallel}
                  </p>
                )}
              </div>
              <SaveButton
                saved={savedSentence || isSaved(result.hindi)}
                onClick={() => {
                  const added = addVocab({
                    hinglish: result.hindi,
                    meaning: input.trim(),
                    example: result.hindi,
                    source: 'translation',
                  })
                  if (added) setSavedSentence(true)
                }}
                label="Save phrase"
              />
            </div>

            {result.aap_version && (
              <div className="mt-3 border-t border-ink/5 pt-3">
                <button
                  onClick={() => setShowAap((v) => !v)}
                  className="text-sm font-semibold text-saffron-600"
                >
                  {showAap ? 'Hide' : 'Show'} polite “aap” version
                </button>
                {showAap && (
                  <div className="mt-2 animate-fade-in rounded-xl bg-saffron-50 p-3">
                    <p className="hinglish text-lg font-semibold text-ink">{result.aap_version}</p>
                    <p className="mt-1 text-[13px] text-ink/55">
                      Use this with elders, strangers, or anyone you’re being polite to.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Word by word */}
          {result.words.length > 0 && (
            <div className="rounded-2xl border border-ink/10 bg-white p-4 shadow-card">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink/45">Word by word</p>
              <ul className="mt-2 divide-y divide-ink/5">
                {result.words.map((w, i) => (
                  <li key={i} className="flex items-start gap-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-x-2">
                        <span className="hinglish font-bold text-ink">{w.hindi}</span>
                        <span className="text-sm text-ink/60">— {w.means}</span>
                      </div>
                      {w.note && <p className="mt-0.5 text-[13px] text-ink/45">{w.note}</p>}
                    </div>
                    <SaveButton
                      small
                      saved={isSaved(w.hindi)}
                      onClick={() =>
                        addVocab({
                          hinglish: w.hindi,
                          meaning: w.means,
                          example: result.hindi,
                          source: 'translation',
                        })
                      }
                      label="Save word"
                    />
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* How it's built */}
          {result.structure_note && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4">
              <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-emerald-700">
                <SparkIcon width={15} height={15} /> How it’s built
              </p>
              <p className="mt-1.5 text-[14px] leading-relaxed text-ink/75">{result.structure_note}</p>
            </div>
          )}
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <div className="mt-6 px-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink/40">Recent</p>
          <div className="scroll-slim flex gap-2 overflow-x-auto pb-1">
            {history.slice(0, 12).map((h) => (
              <button
                key={h.id}
                onClick={() => reopen(h)}
                className="w-44 shrink-0 rounded-xl border border-ink/10 bg-white p-3 text-left transition-colors hover:border-saffron-200"
              >
                <p className="truncate text-[13px] text-ink/50">{h.input}</p>
                <p className="hinglish mt-1 truncate text-sm font-semibold text-ink">
                  {h.result?.hindi}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function SaveButton({ saved, onClick, label, small }) {
  return (
    <button
      onClick={onClick}
      disabled={saved}
      title={saved ? 'Saved' : label}
      aria-label={saved ? 'Saved to vocabulary' : label}
      className={`flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold transition-colors ${
        saved
          ? 'text-saffron-500'
          : 'text-ink/40 hover:bg-saffron-50 hover:text-saffron-600'
      } ${small ? '' : 'border border-ink/10'}`}
    >
      <BookmarkIcon width={15} height={15} filled={saved} />
      {!small && <span>{saved ? 'Saved' : 'Save'}</span>}
    </button>
  )
}
