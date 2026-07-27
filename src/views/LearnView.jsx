import { useState, useRef, useEffect, useCallback } from 'react'
import { useStore } from '../state/store.jsx'
import { chatWithBuddy, GeminiError, aiAvailable } from '../lib/gemini.js'
import { loadChat, saveChat, clearChat, newId } from '../lib/storage.js'
import ApiKeyBanner from '../components/ApiKeyBanner.jsx'
import { SendIcon, BookmarkIcon, SparkIcon } from '../components/Icons.jsx'

const HINTS = [
  { label: '💡 Hint', send: '[HINT]', display: '💡 give me a hint' },
  { label: '🪜 More help', send: '[MORE HELP]', display: '🪜 a bit more help' },
  { label: '🙃 Just tell me', send: '[JUST TELL ME]', display: '🙃 just tell me' },
]

export default function LearnView({ goTo }) {
  const { settings, addVocab, isSaved, reinforceUsedWords, markActivity, proficiency, adjustProficiency } =
    useStore()
  const [messages, setMessages] = useState(() => loadChat()?.messages || [])
  const [started, setStarted] = useState(false)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [metaOpen, setMetaOpen] = useState(false)
  const [metaText, setMetaText] = useState('')
  const scrollRef = useRef(null)
  const endRef = useRef(null)

  const hasSaved = messages.length > 0

  // Persist the running session.
  useEffect(() => {
    if (started) saveChat({ messages, updatedAt: Date.now() })
  }, [messages, started])

  // Auto-scroll on new content.
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, loading])

  const getBuddyReply = useCallback(
    async (convo, opts = {}) => {
      if (!aiAvailable(settings)) {
        setError('Add your Google AI key in Settings first.')
        return
      }
      setError('')
      setLoading(true)
      try {
        const reply = await chatWithBuddy(convo, settings, { ...opts, progress: { proficiency } })
        setMessages((m) => [
          ...m,
          { id: newId(), role: 'buddy', bubbles: reply.bubbles, correction: reply.correction },
        ])
        markActivity()
        adjustProficiency(reply.progressDelta) // silent background tracking
      } catch (e) {
        setError(e instanceof GeminiError ? e.message : 'Something went wrong. Try again.')
      } finally {
        setLoading(false)
      }
    },
    [settings, markActivity, proficiency, adjustProficiency],
  )

  function startNew() {
    clearChat()
    setMessages([])
    setStarted(true)
    getBuddyReply([], { kickoff: true })
  }

  function continueChat() {
    setStarted(true)
    // If the last turn was the user's (reply never came), fetch the buddy's response.
    if (messages.length && messages[messages.length - 1].role === 'user') {
      getBuddyReply(messages)
    }
  }

  function send(text, display) {
    const clean = (text ?? '').trim()
    if (!clean || loading) return
    const userMsg = { id: newId(), role: 'user', text: clean, display: display || clean }
    const next = [...messages, userMsg]
    setMessages(next)
    setInput('')
    reinforceUsedWords(clean)
    markActivity()
    getBuddyReply(next)
  }

  function sendMeta() {
    const q = metaText.trim()
    if (!q) return
    setMetaOpen(false)
    setMetaText('')
    send(`How do I say "${q}" in Hindi?`)
  }

  // ---- Entry screen ----
  if (!started) {
    return (
      <div className="scroll-slim flex h-full flex-col overflow-y-auto">
        <ApiKeyBanner goTo={goTo} />
        <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
          <div className="text-5xl">🫂</div>
          <h2 className="mt-4 text-2xl font-extrabold text-ink">Chat with your yaar</h2>
          <p className="mt-2 max-w-xs text-[15px] leading-relaxed text-ink/60">
            Everyday small talk in Hindi. Reply in Hinglish — stuck on a word? Tap for a hint. Slip
            up? They’ll laugh <em>with</em> you and show the fix.
          </p>
          <div className="mt-8 w-full max-w-xs space-y-3">
            {hasSaved && (
              <button
                onClick={continueChat}
                className="w-full rounded-2xl bg-saffron-500 py-3.5 text-base font-bold text-white shadow-card transition-colors hover:bg-saffron-600"
              >
                Continue where we left off
              </button>
            )}
            <button
              onClick={startNew}
              className={`w-full rounded-2xl py-3.5 text-base font-bold transition-colors ${
                hasSaved
                  ? 'border-2 border-ink/15 text-ink/70 hover:border-ink/25'
                  : 'bg-saffron-500 text-white shadow-card hover:bg-saffron-600'
              }`}
            >
              {hasSaved ? 'Start a fresh chat' : 'Start chatting'}
            </button>
          </div>
          {error && <p className="mt-4 text-sm text-red-500">{error}</p>}
        </div>
      </div>
    )
  }

  // ---- Chat screen ----
  const lastIsBuddy = messages.length > 0 && messages[messages.length - 1].role === 'buddy'

  return (
    <div className="flex h-full flex-col">
      {/* mini toolbar */}
      <div className="flex items-center justify-between border-b border-ink/5 px-4 py-1.5">
        <span className="text-xs font-medium text-ink/40">your Hindi buddy</span>
        <button
          onClick={startNew}
          className="text-xs font-semibold text-saffron-600 hover:text-saffron-700"
        >
          New chat
        </button>
      </div>

      {/* messages */}
      <div ref={scrollRef} className="scroll-slim flex-1 space-y-1 overflow-y-auto px-3 py-3">
        {messages.map((m) =>
          m.role === 'user' ? (
            <UserBubble key={m.id} text={m.display || m.text} />
          ) : (
            <BuddyTurn
              key={m.id}
              msg={m}
              onSave={(text) =>
                addVocab({ hinglish: text, meaning: '', example: text, source: 'chat' })
              }
              isSaved={isSaved}
            />
          ),
        )}
        {loading && <TypingBubble />}
        {error && (
          <p className="px-2 py-2 text-sm text-red-500">
            {error}{' '}
            {!aiAvailable(settings) && (
              <button onClick={() => goTo?.('settings')} className="font-semibold underline">
                Open Settings
              </button>
            )}
          </p>
        )}
        <div ref={endRef} />
      </div>

      {/* hint ladder under the latest buddy question */}
      {lastIsBuddy && !loading && (
        <div className="flex flex-wrap gap-2 px-3 pb-1.5">
          {HINTS.map((h) => (
            <button
              key={h.send}
              onClick={() => send(h.send, h.display)}
              className="rounded-full border border-ink/10 bg-white px-3 py-1.5 text-[13px] font-medium text-ink/70 transition-colors hover:border-saffron-300 hover:text-saffron-600"
            >
              {h.label}
            </button>
          ))}
        </div>
      )}

      {/* meta input */}
      {metaOpen && (
        <div className="animate-fade-in border-t border-ink/5 bg-saffron-50/60 px-3 py-2">
          <p className="mb-1 text-xs font-semibold text-saffron-700">How do I say… (in English)</p>
          <div className="flex gap-2">
            <input
              autoFocus
              value={metaText}
              onChange={(e) => setMetaText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMeta()}
              placeholder="e.g. the traffic was crazy today"
              className="min-w-0 flex-1 rounded-full border border-ink/10 bg-white px-3 py-2 text-sm outline-none focus:border-saffron-400"
            />
            <button
              onClick={sendMeta}
              className="rounded-full bg-saffron-500 px-4 py-2 text-sm font-bold text-white"
            >
              Ask
            </button>
          </div>
        </div>
      )}

      {/* composer */}
      <div className="shrink-0 border-t border-ink/10 bg-white px-3 py-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))]">
        <div className="flex items-end gap-2">
          <button
            onClick={() => setMetaOpen((v) => !v)}
            title="How do I say…?"
            className={`shrink-0 rounded-full border px-3 py-2 text-[13px] font-semibold transition-colors ${
              metaOpen
                ? 'border-saffron-400 bg-saffron-50 text-saffron-600'
                : 'border-ink/10 text-ink/50 hover:text-ink/70'
            }`}
          >
            How do I say…?
          </button>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send(input)}
            placeholder="Reply in Hinglish…"
            className="hinglish min-w-0 flex-1 rounded-full border border-ink/10 bg-cream px-4 py-2.5 text-[15px] outline-none focus:border-saffron-400"
          />
          <button
            onClick={() => send(input)}
            disabled={loading || !input.trim()}
            className="flex shrink-0 items-center justify-center rounded-full bg-saffron-500 p-2.5 text-white transition-colors enabled:hover:bg-saffron-600 disabled:opacity-40"
            aria-label="Send"
          >
            <SendIcon width={18} height={18} />
          </button>
        </div>
      </div>
    </div>
  )
}

function UserBubble({ text }) {
  return (
    <div className="flex animate-pop-in justify-end">
      <div className="hinglish max-w-[82%] rounded-2xl rounded-br-md bg-saffron-500 px-3.5 py-2 text-[15px] leading-snug text-white shadow-sm">
        {text}
      </div>
    </div>
  )
}

function BuddyTurn({ msg, onSave, isSaved }) {
  return (
    <div className="flex animate-pop-in flex-col items-start gap-1">
      {msg.bubbles.map((b, i) => (
        <div key={i} className="group flex max-w-[85%] items-end gap-1">
          <div className="hinglish rounded-2xl rounded-bl-md bg-white px-3.5 py-2 text-[15px] leading-snug text-ink shadow-sm ring-1 ring-ink/5">
            {b}
          </div>
          <SaveDot saved={isSaved(b)} onClick={() => onSave(b)} />
        </div>
      ))}
      {msg.correction && <CorrectionCard c={msg.correction} onSave={() => onSave(msg.correction.fix)} saved={isSaved(msg.correction.fix)} />}
    </div>
  )
}

function CorrectionCard({ c, onSave, saved }) {
  return (
    <div className="mt-1 w-full max-w-[92%] animate-pop-in rounded-2xl border border-amber-200 bg-amber-50 p-3">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-amber-700">
          <SparkIcon width={14} height={14} /> Quick fix
        </p>
        <button
          onClick={onSave}
          disabled={saved}
          className={`flex items-center gap-1 text-xs font-semibold ${saved ? 'text-saffron-500' : 'text-amber-700 hover:text-amber-800'}`}
        >
          <BookmarkIcon width={14} height={14} filled={saved} />
          {saved ? 'Saved' : 'Save'}
        </button>
      </div>
      {c.you_said && (
        <p className="mt-1.5 text-[13px] text-ink/55">
          You said: <span className="hinglish font-medium text-ink/70">{c.you_said}</span>
          {c.literal && <span className="text-ink/45"> — “{c.literal}”</span>}
        </p>
      )}
      <p className="hinglish mt-1 text-[15px] font-bold text-ink">✅ {c.fix}</p>
      {c.why && <p className="mt-1 text-[13px] leading-relaxed text-ink/60">{c.why}</p>}
    </div>
  )
}

function SaveDot({ saved, onClick }) {
  return (
    <button
      onClick={onClick}
      disabled={saved}
      title={saved ? 'Saved' : 'Save phrase'}
      aria-label={saved ? 'Saved' : 'Save phrase'}
      className={`mb-1 shrink-0 rounded-full p-1 transition-opacity ${
        saved ? 'text-saffron-500 opacity-100' : 'text-ink/25 opacity-0 hover:text-saffron-500 group-hover:opacity-100'
      }`}
    >
      <BookmarkIcon width={14} height={14} filled={saved} />
    </button>
  )
}

function TypingBubble() {
  return (
    <div className="flex justify-start">
      <div className="flex items-center gap-1 rounded-2xl rounded-bl-md bg-white px-4 py-3 shadow-sm ring-1 ring-ink/5">
        <span className="typing-dot h-2 w-2 rounded-full bg-ink/30" />
        <span className="typing-dot h-2 w-2 rounded-full bg-ink/30" />
        <span className="typing-dot h-2 w-2 rounded-full bg-ink/30" />
      </div>
    </div>
  )
}
