import { useEffect, useRef } from 'react'
import { useUser } from '@clerk/react'
import { useStore } from '../state/store.jsx'

// Bridges the signed-in account's stored proficiency with the local store.
// Rendered only when auth is enabled (i.e. inside <ClerkProvider>), so the
// Clerk hook here is always safe. Renders nothing.
//
// Rules:
//  - Account is the source of truth. On sign-in, if the account already has a
//    proficiency, adopt it locally.
//  - If the account has none yet (first login), migrate the current local value
//    up to the account — this is the "migrate on first login" behaviour.
//  - While signed in, push later local changes (buddy nudges) up to the account.
export default function AccountSync() {
  const { isLoaded, isSignedIn, user } = useUser()
  const { proficiency, setProficiency } = useStore()
  const hydrated = useRef(false)

  // One-time reconcile per sign-in.
  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user) {
      hydrated.current = false
      return
    }
    if (hydrated.current) return
    hydrated.current = true

    const acct = user.unsafeMetadata?.proficiency
    if (typeof acct === 'number') {
      setProficiency(acct) // account wins
    } else {
      // First login — seed the account from the local value.
      user
        .update({ unsafeMetadata: { ...user.unsafeMetadata, proficiency } })
        .catch(() => {})
    }
  }, [isLoaded, isSignedIn, user, proficiency, setProficiency])

  // Push local proficiency changes up to the account while signed in.
  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user || !hydrated.current) return
    if (user.unsafeMetadata?.proficiency === proficiency) return
    const t = setTimeout(() => {
      user
        .update({ unsafeMetadata: { ...user.unsafeMetadata, proficiency } })
        .catch(() => {})
    }, 800)
    return () => clearTimeout(t)
  }, [proficiency, isLoaded, isSignedIn, user])

  // Activity beacon: when pings are on, record "last active" so the server can skip
  // messaging someone who's already in the app. Throttled to once per ~30 min.
  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user) return
    const push = user.unsafeMetadata?.push
    if (!push?.enabled) return
    const last = push.lastActiveAt || 0
    if (Date.now() - last < 30 * 60 * 1000) return
    user
      .update({
        unsafeMetadata: {
          ...user.unsafeMetadata,
          push: { ...push, lastActiveAt: Date.now() },
        },
      })
      .catch(() => {})
  }, [isLoaded, isSignedIn, user])

  return null
}
