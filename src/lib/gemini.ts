export async function personalizeEmail(
  template: string,
  companyName: string,
  sector: string,
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY missing')

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `Personalizza questa email per un'azienda chiamata "${companyName}" nel settore "${sector}".
Sostituisci [Nome] con il nome dell'azienda e adatta leggermente il tono al settore.
Mantieni il testo quasi identico all'originale, cambia solo il necessario.
Rispondi SOLO con il testo dell'email, senza commenti.

Template originale:
${template}`,
              },
            ],
          },
        ],
      }),
    },
  )

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status}`)
  }

  const data = await response.json()
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) {
    // Fallback: substitute [Nome] manually
    return template.replaceAll('[Nome]', companyName)
  }
  return text
}
