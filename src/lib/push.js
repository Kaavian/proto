// Web Push client helpers for the buddy's daily pings.
// The browser subscription is stored per-account in Clerk (see SettingsView NudgeSection);
// the server (api/nudge.js) reads it and sends notifications on a schedule.

export const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || ''

// Push needs: a service worker (PROD only here), the Push API, and the Notifications API.
export function pushSupported() {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

// A VAPID public key must be configured (VITE_VAPID_PUBLIC_KEY) for subscriptions to work.
export function pushConfigured() {
  return !!VAPID_PUBLIC_KEY
}

export function notificationPermission() {
  return typeof Notification !== 'undefined' ? Notification.permission : 'default'
}

// VAPID keys are URL-safe base64; the subscribe() call wants a Uint8Array.
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const arr = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i)
  return arr
}

export async function currentSubscription() {
  if (!pushSupported()) return null
  const reg = await navigator.serviceWorker.ready
  return reg.pushManager.getSubscription()
}

// Ask permission + subscribe. Returns the subscription as plain JSON, or throws with a
// short reason ('unsupported' | 'not-configured' | 'denied').
export async function enablePush() {
  if (!pushSupported()) throw new Error('unsupported')
  if (!pushConfigured()) throw new Error('not-configured')
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') throw new Error('denied')
  const reg = await navigator.serviceWorker.ready
  let sub = await reg.pushManager.getSubscription()
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    })
  }
  return sub.toJSON() // { endpoint, keys: { p256dh, auth } }
}

export async function disablePush() {
  const sub = await currentSubscription()
  if (sub) await sub.unsubscribe().catch(() => {})
}

export function browserTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}
