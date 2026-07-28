// Clerk auth is optional: the app runs fully for Translation without it. Chat is
// gated behind phone-OTP login only when a publishable key is configured (locally
// via a .env file, in production via a Vercel env var). No key => auth disabled,
// everything falls back to the on-device localStorage behaviour.
export const CLERK_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || ''

// Build-time constant — safe to branch component trees / conditional hook usage on it,
// since it never changes between renders.
export const authEnabled = () => !!CLERK_KEY
