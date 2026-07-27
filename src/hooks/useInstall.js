import { useEffect, useState } from 'react'

// Capture Chrome/Android's install prompt as early as the bundle evaluates, since
// `beforeinstallprompt` can fire before any component mounts.
let deferredPrompt = null
const listeners = new Set()
function notify() {
  listeners.forEach((fn) => fn())
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferredPrompt = e
    notify()
  })
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null
    notify()
  })
}

function detectStandalone() {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    window.navigator.standalone === true // iOS Safari
  )
}

function detectIos() {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent || ''
  const isIosDevice = /iphone|ipad|ipod/i.test(ua)
  // iPadOS 13+ reports as Mac; detect touch to catch it.
  const isIpadOs = /macintosh/i.test(ua) && navigator.maxTouchPoints > 1
  return isIosDevice || isIpadOs
}

export function useInstall() {
  const [, force] = useState(0)
  useEffect(() => {
    const fn = () => force((n) => n + 1)
    listeners.add(fn)
    return () => listeners.delete(fn)
  }, [])

  async function promptInstall() {
    if (!deferredPrompt) return null
    deferredPrompt.prompt()
    const choice = await deferredPrompt.userChoice
    deferredPrompt = null
    notify()
    return choice?.outcome || null
  }

  return {
    canInstall: !!deferredPrompt, // Chrome/Android/desktop only
    promptInstall,
    isStandalone: detectStandalone(),
    isIos: detectIos(),
  }
}
