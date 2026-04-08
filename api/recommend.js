import Anthropic from '@anthropic-ai/sdk'

// NOTE: maxDuration only applies on Vercel Pro+ (Hobby caps at 60s).
// Keep this conservative so the function exits before Hobby's hard limit.
export const config = {
  maxDuration: 60,
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'Server is missing ANTHROPIC_API_KEY environment variable. Add it in Vercel project settings and redeploy.' })
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  try {
    const { goals, finances } = req.body

    if (!goals || !finances) {
      return res.status(400).json({ error: 'Missing goals or finances' })
    }

    const systemPrompt = `You are a UK personal finance advisor. Output ONLY valid JSON matching this exact schema (no markdown, no commentary):

{
  "summary": "2 sentences on their position",
  "headline_metric": { "label": "string", "value": "string", "context": "string" },
  "findings": [
    { "severity": "critical|action|opportunity|on_track", "title": "3-6 words", "body": "2 sentences with numbers", "estimated_impact_gbp": number }
  ],
  "recommendations": [
    { "priority": 1, "title": "string", "rationale": "1-2 sentences", "steps": ["...", "..."], "estimated_value_gbp": number, "timeframe": "immediate|this_month|this_quarter|this_year" }
  ],
  "risks": [
    { "title": "string", "description": "1 sentence", "mitigation": "1 sentence" }
  ]
}

Constraints:
- Reference specific numbers from the data
- 3-5 findings, 4-6 recommendations, 1-3 risks
- UK tax context: ISA £20k/yr, CGT allowance £3k, Bed & ISA for GIA gains, pension annual allowance
- Tie recommendations to their goals
- Be concise — every field should be useful, no fluff`

    const userMessage = `Goals: ${JSON.stringify(goals)}

Finances: ${JSON.stringify(finances)}`

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 3500,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }]
    })

    const text = message.content[0].text.trim()
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return res.status(500).json({ error: 'Could not parse Claude response', raw: text.slice(0, 500) })
    }

    let parsed
    try {
      parsed = JSON.parse(jsonMatch[0])
    } catch (parseErr) {
      return res.status(500).json({ error: 'Invalid JSON from model: ' + parseErr.message })
    }

    return res.status(200).json(parsed)
  } catch (err) {
    console.error('Recommend error:', err)
    return res.status(500).json({ error: err.message || 'Internal error' })
  }
}
