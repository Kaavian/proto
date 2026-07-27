import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react'
import {
  loadSettings,
  saveSettings,
  loadVocab,
  saveVocab,
  loadHistory,
  saveHistory,
  loadStreak,
  saveStreak,
  bumpStreak,
  loadProgress,
  saveProgress,
  clamp,
  newId,
} from '../lib/storage.js'
import { familiarityOf, FAMILIARITY } from '../lib/defaults.js'

const StoreContext = createContext(null)

const norm = (s) => (s || '').trim().toLowerCase()

export function StoreProvider({ children }) {
  const [settings, setSettings] = useState(loadSettings)
  const [vocab, setVocab] = useState(loadVocab)
  const [history, setHistory] = useState(loadHistory)
  const [streak, setStreak] = useState(loadStreak)
  const [progress, setProgress] = useState(loadProgress) // { proficiency } — hidden

  // Persist on change.
  useEffect(() => saveSettings(settings), [settings])
  useEffect(() => saveVocab(vocab), [vocab])
  useEffect(() => saveHistory(history), [history])
  useEffect(() => saveStreak(streak), [streak])
  useEffect(() => saveProgress(progress), [progress])

  const updateSettings = useCallback((partial) => {
    setSettings((s) => ({ ...s, ...partial }))
  }, [])

  // ---- Streak / activity ----
  const markActivity = useCallback(() => {
    setStreak((s) => bumpStreak(s))
  }, [])

  // ---- Hidden proficiency ----
  // Nudged each buddy turn by the model's private read of the user's reply.
  const adjustProficiency = useCallback((delta) => {
    if (!delta) return
    setProgress((p) => ({ ...p, proficiency: clamp((p.proficiency || 0) + delta, 0, 100) }))
  }, [])

  // ---- Vocabulary ----
  const isSaved = useCallback(
    (hinglish) => vocab.some((v) => norm(v.hinglish) === norm(hinglish)),
    [vocab],
  )

  const addVocab = useCallback((item) => {
    let added = false
    setVocab((list) => {
      if (list.some((v) => norm(v.hinglish) === norm(item.hinglish))) return list
      added = true
      return [
        {
          id: newId(),
          hinglish: item.hinglish?.trim() || '',
          meaning: item.meaning?.trim() || '',
          example: item.example?.trim() || '',
          source: item.source || 'translation', // 'translation' | 'chat'
          date: new Date().toISOString(),
          familiarity: 0,
        },
        ...list,
      ]
    })
    return added
  }, [])

  const removeVocab = useCallback((id) => {
    setVocab((list) => list.filter((v) => v.id !== id))
  }, [])

  // Increment familiarity when the user uses a saved word correctly in Learning mode.
  const reinforceUsedWords = useCallback((text) => {
    if (!text) return
    const lower = ` ${text.toLowerCase()} `
    setVocab((list) =>
      list.map((v) => {
        const w = norm(v.hinglish)
        if (w && lower.includes(` ${w} `)) {
          return { ...v, familiarity: (v.familiarity || 0) + 1 }
        }
        return v
      }),
    )
  }, [])

  // ---- History ----
  const addHistory = useCallback((entry) => {
    setHistory((list) => [{ id: newId(), date: new Date().toISOString(), ...entry }, ...list].slice(0, 40))
  }, [])

  const clearHistory = useCallback(() => setHistory([]), [])

  const wordsLearned = useMemo(
    () => vocab.filter((v) => familiarityOf(v.familiarity) !== FAMILIARITY.NEW).length,
    [vocab],
  )

  const value = useMemo(
    () => ({
      settings,
      updateSettings,
      vocab,
      addVocab,
      removeVocab,
      isSaved,
      reinforceUsedWords,
      history,
      addHistory,
      clearHistory,
      streak,
      markActivity,
      wordsLearned,
      proficiency: progress.proficiency,
      adjustProficiency,
    }),
    [
      settings,
      updateSettings,
      vocab,
      addVocab,
      removeVocab,
      isSaved,
      reinforceUsedWords,
      history,
      addHistory,
      clearHistory,
      streak,
      markActivity,
      wordsLearned,
      progress.proficiency,
      adjustProficiency,
    ],
  )

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used within StoreProvider')
  return ctx
}
