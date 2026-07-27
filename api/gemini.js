// Serverless proxy for the Gemini API (Vercel function).
//
// Holds the shared API key server-side so it never ships to the browser (PRD §8.3).
// The client posts { model, payload } where `payload` is the Gemini generateContent body;
// we add the key and forward it. Set GEMINI_API_KEY in the Vercel project's env vars
// (NOT prefixed with VITE_, so it stays server-only).

const ALLOWED_MODEL = /^gemini-[a-z0-9.\-]+$/i

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: { message: 'Method not allowed.' } })
  }

  const key = process.env.GEMINI_API_KEY
  if (!key) {
    return res
      .status(500)
      .json({ error: { message: 'Server is missing GEMINI_API_KEY. Set it in Vercel env vars.' } })
  }

  // Vercel parses JSON bodies automatically, but guard for string/edge cases.
  let body = req.body
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body)
    } catch {
      return res.status(400).json({ error: { message: 'Invalid JSON body.' } })
    }
  }

  const { model, payload } = body || {}
  if (!payload || typeof payload !== 'object' || !Array.isArray(payload.contents)) {
    return res.status(400).json({ error: { message: 'Bad request: missing payload.contents.' } })
  }
  const chosenModel = typeof model === 'string' && ALLOWED_MODEL.test(model) ? model : 'gemini-2.5-flash'

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${chosenModel}:generateContent?key=${key}`

  try {
    const upstream = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const data = await upstream.json()
    // Pass Gemini's status + body straight through so the client's error handling still works.
    return res.status(upstream.status).json(data)
  } catch {
    return res.status(502).json({ error: { message: 'Upstream error contacting Gemini.' } })
  }
}
