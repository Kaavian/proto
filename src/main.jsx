import React from 'react'
import ReactDOM from 'react-dom/client'
import { ClerkProvider } from '@clerk/react'
import App from './App.jsx'
import { StoreProvider } from './state/store.jsx'
import { CLERK_KEY } from './lib/auth.js'
import './index.css'

const tree = (
  <React.StrictMode>
    <StoreProvider>
      <App />
    </StoreProvider>
  </React.StrictMode>
)

// Only wrap in ClerkProvider when a key is configured — otherwise the app runs
// auth-free (Translation works; Chat's login gate is simply inert). Clerk hooks
// are only ever called by components rendered under this provider.
ReactDOM.createRoot(document.getElementById('root')).render(
  CLERK_KEY ? (
    <ClerkProvider publishableKey={CLERK_KEY} afterSignOutUrl="/">
      {tree}
    </ClerkProvider>
  ) : (
    tree
  ),
)

// Register the service worker for offline support + "Add to Home Screen".
// Production only — in dev the SW would fight Vite's HMR.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('SW registration failed:', err)
    })
  })
}
