import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { goals, finances } = req.body

    if (!goals || !finances) {
      return res.status(400).json({ error: 'Missing goals or finances' })
    }

    const systemPrompt = `You are a UK-based personal finance advisor providing actionable recommendations. The user will share their financial position and their goals. You must produce a structured JSON response with specific, prioritized recommendations.

Return STRICTLY this JSON shape (no markdown, no commentary, just JSON):
{
  "summary": "2-3 sentence overview of the user's financial position",
  "headline_metric": {
    "label": "e.g. Years to goal",
    "value": "e.g. 12 years",
    "context": "e.g. assuming 7% real return and current contributions"
  },
  "findings": [
    {
      "severity": "critical|action|opportunity|on_track",
      "title": "Short title (3-6 words)",
      "body": "2-3 sentence explanation with specific numbers from their data",
      "estimated_impact_gbp": number
    }
  ],
  "recommendations": [
    {
      "priority": 1,
      "title": "Action title",
      "rationale": "Why this matters for THIS user given their goals and position",
      "steps": ["Step 1", "Step 2", "Step 3"],
      "estimated_value_gbp": number,
      "timeframe": "immediate|this_month|this_quarter|this_year"
    }
  ],
  "risks": [
    {
      "title": "Risk title",
      "description": "What could go wrong",
      "mitigation": "What to do about it"
    }
  ]
}

Rules:
- Be specific. Reference exact numbers from their data.
- Prioritize by impact: critical first.
- Consider UK tax wrappers (ISA £20k/year, Pension annual allowance, CGT allowance £3k, Bed & ISA strategy)
- If they have GIA holdings with gains, always recommend Bed & ISA
- If they have excess cash above 6mo expenses, recommend deploying
- If they have a mortgage, comment on rate/timing
- Tie every recommendation back to their stated goals
- Provide 4-8 recommendations max, ordered by priority`

    const userMessage = `My goals:
${JSON.stringify(goals, null, 2)}

My current financial position:
${JSON.stringify(finances, null, 2)}

Please analyze and provide structured recommendations.`

    const message = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 6000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }]
    })

    const text = message.content[0].text.trim()
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return res.status(500).json({ error: 'Could not parse Claude response', raw: text })
    }

    const parsed = JSON.parse(jsonMatch[0])
    return res.status(200).json(parsed)
  } catch (err) {
    console.error('Recommend error:', err)
    return res.status(500).json({ error: err.message || 'Internal error' })
  }
}
