import { useState } from 'react'
import { useStore } from '../state/store.jsx'

// Graded check: a single word → an everyday phrase → sentence structure.
// Each is a real test (not self-report) and weighted, so the harder ones count more.
// `hinglish: true` styles Hindi option text in the transliteration font.
const PROFICIENCY_QUESTIONS = [
  {
    id: 'word',
    weight: 1,
    question: "What does 'kal' mean?",
    hint: 'A word you hear every day.',
    options: [
      { value: 'a', label: 'Tomorrow (or yesterday)', correct: true },
      { value: 'b', label: 'Today' },
      { value: 'c', label: 'Now' },
    ],
  },
  {
    id: 'phrase',
    weight: 2,
    question: "Someone asks you 'khana khaya?' — what are they asking?",
    hint: 'A very common everyday phrase.',
    options: [
      { value: 'a', label: 'Did you eat?', correct: true },
      { value: 'b', label: 'Are you coming?' },
      { value: 'c', label: 'Where are you going?' },
    ],
  },
  {
    id: 'sentence',
    weight: 3,
    question: "Which one correctly says 'I want water'?",
    hint: 'Look at how the words are put together.',
    options: [
      { value: 'a', label: 'Mujhe paani chahiye', correct: true, hinglish: true },
      { value: 'b', label: 'Main paani chahiye', hinglish: true },
      { value: 'c', label: 'Paani mujhe hoon chahiye', hinglish: true },
    ],
  },
]

export default function Onboarding() {
  const { updateSettings, adjustProficiency } = useStore()
  const [step, setStep] = useState('gender') // 'gender' | 'proficiency' | 'done'
  const [gender, setGender] = useState(null)
  const [answers, setAnswers] = useState({})

  function handleGenderSelect(g) {
    setGender(g)
  }

  function handleProceedToAssessment() {
    if (!gender) return
    setStep('proficiency')
  }

  function handleAnswer(questionId, value) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }))
  }

  function calculateProficiency() {
    let score = 0
    let maxScore = 0
    for (const q of PROFICIENCY_QUESTIONS) {
      maxScore += q.weight
      const chosen = q.options.find((o) => o.value === answers[q.id])
      if (chosen?.correct) score += q.weight
    }
    // Cap at 25%: recognising words/phrases doesn't mean you can build sentences yet.
    return Math.round((score / maxScore) * 25)
  }

  function handleFinishAssessment() {
    const proficiency = calculateProficiency()
    updateSettings({ gender })
    adjustProficiency(proficiency) // Initialize proficiency
    setStep('done')
  }

  const allAnswered =
    PROFICIENCY_QUESTIONS.length === Object.keys(answers).length

  return (
    <div className="mx-auto flex h-full max-w-lg flex-col justify-center px-6 py-10">
      <div className="animate-pop-in">
        {step === 'gender' && (
          <>
            <p className="text-sm font-semibold uppercase tracking-widest text-saffron-500">Namaste 👋</p>
            <h1 className="mt-1 text-4xl font-extrabold tracking-tight text-ink">
              Proto<span className="text-saffron-500">.</span>
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
                    onClick={() => handleGenderSelect(opt.key)}
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
              onClick={handleProceedToAssessment}
              className="mt-8 w-full rounded-2xl bg-saffron-500 py-3.5 text-base font-bold text-white shadow-card transition-all enabled:hover:bg-saffron-600 disabled:opacity-40"
            >
              Continue →
            </button>
          </>
        )}

        {step === 'proficiency' && (
          <>
            <p className="text-sm font-semibold uppercase tracking-widest text-saffron-500">Quick check 📚</p>
            <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-ink">
              What's your Hindi level?
            </h2>
            <p className="mt-3 text-[15px] leading-relaxed text-ink/70">
              Just a quick 3-question check so the buddy can speak at your level. No pressure!
            </p>

            <div className="mt-6 space-y-4">
              {PROFICIENCY_QUESTIONS.map((q, idx) => (
                <div key={q.id} className="rounded-2xl border border-ink/10 bg-white p-4">
                  <p className="text-sm font-semibold text-ink/70">
                    Question {idx + 1}/3
                  </p>
                  <p className="mt-2 text-base font-semibold text-ink">{q.question}</p>
                  {q.hint && <p className="mt-1 text-sm text-ink/50">{q.hint}</p>}

                  <div className="mt-3 space-y-2">
                    {q.options.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => handleAnswer(q.id, opt.value)}
                        className={`w-full rounded-lg border-2 px-3 py-2 text-sm font-semibold transition-all ${
                          opt.hinglish ? 'hinglish' : ''
                        } ${
                          answers[q.id] === opt.value
                            ? 'border-saffron-500 bg-saffron-50 text-saffron-600'
                            : 'border-ink/10 bg-white text-ink/70 hover:border-ink/20'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <button
              disabled={!allAnswered}
              onClick={handleFinishAssessment}
              className="mt-6 w-full rounded-2xl bg-saffron-500 py-3.5 text-base font-bold text-white shadow-card transition-all enabled:hover:bg-saffron-600 disabled:opacity-40"
            >
              See the app →
            </button>
          </>
        )}
      </div>
    </div>
  )
}
