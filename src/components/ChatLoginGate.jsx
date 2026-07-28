import { SignIn } from '@clerk/react'

// Shown on the Chat tab when auth is enabled but the user is signed out.
// Clerk's <SignIn> renders the phone-number + OTP flow (configured in the Clerk
// dashboard). Only mounted under <ClerkProvider>, so the import is safe elsewhere.
export default function ChatLoginGate() {
  return (
    <div className="scroll-slim flex h-full flex-col items-center overflow-y-auto px-6 py-8">
      <div className="text-5xl">💬</div>
      <h2 className="mt-4 text-2xl font-extrabold text-ink">Sign in to chat</h2>
      <p className="mt-2 max-w-xs text-center text-[15px] leading-relaxed text-ink/60">
        Your buddy adapts to your Hindi level. Sign in with your phone number so your progress is
        saved to your account and follows you across devices.
      </p>
      <div className="mt-6">
        <SignIn
          appearance={{
            variables: {
              colorPrimary: '#F97316',
              borderRadius: '0.9rem',
            },
          }}
        />
      </div>
      <p className="mt-4 text-center text-xs text-ink/40">
        Translation stays open — no sign-in needed for that.
      </p>
    </div>
  )
}
