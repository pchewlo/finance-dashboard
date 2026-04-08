import Anthropic from '@anthropic-ai/sdk'

export const config = {
  api: {
    bodyParser: { sizeLimit: '5mb' },
  },
  // maxDuration only applies on Vercel Pro+ (Hobby caps at 60s).
  maxDuration: 60,
}

// Static system prompt — will be cached automatically by Anthropic when sent
// with cache_control. Keep it stable to maximize cache hits.
const SYSTEM_PROMPT = `You parse one financial file (CSV, Excel-as-CSV, or PDF text) into JSON.

Output STRICTLY this JSON shape with no markdown or commentary:
{
  "account": {
    "source_file": "filename",
    "detected_provider": "Monzo|Vanguard|Trading 212|Hargreaves Lansdown|Santander|Unknown",
    "account_type": "current|savings|isa|gia|pension|crypto|mortgage|other",
    "currency": "GBP|USD|EUR",
    "current_balance": number,
    "transactions": [{ "date": "YYYY-MM-DD", "description": "string", "amount": number, "category": "income|investment|housing|food|subscriptions|transport|other" }],
    "holdings": [{ "name": "string", "ticker": "string", "units": number, "cost": number, "value": number }]
  }
}

Rules:
- Transaction file: populate "transactions", leave "holdings" empty
- Holdings/portfolio file: populate "holdings", leave "transactions" empty
- Mortgage statement: account_type "mortgage", current_balance = outstanding (negative)
- Numbers only — strip £/$/€ and commas
- Negative = outgoing, positive = income
- For holdings: "value" is current market value. Only set "cost" if explicitly given as a separate column. If only one money column exists, treat it as VALUE.
- Limit transactions to most recent 200 if there are more
- 0 for missing values, never null
- Default currency GBP`

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'Server is missing ANTHROPIC_API_KEY environment variable. Add it in Vercel project settings and redeploy.' })
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  try {
    const { file } = req.body

    if (!file || !file.content) {
      return res.status(400).json({ error: 'No file provided' })
    }

    const label = file.type === 'pdf' ? 'PDF (extracted text)' : file.type === 'excel' ? 'Excel (converted to CSV)' : 'CSV'
    const truncated = String(file.content).slice(0, 60000)

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4000,
      system: [
        {
          type: 'text',
          text: SYSTEM_PROMPT,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [{
        role: 'user',
        content: `Filename: ${file.name}\nFormat: ${label}\n\n${truncated}`,
      }],
    })

    const text = message.content[0].text.trim()
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return res.status(500).json({ error: 'Could not parse model response', raw: text.slice(0, 500) })
    }

    let parsed
    try {
      parsed = JSON.parse(jsonMatch[0])
    } catch (parseErr) {
      return res.status(500).json({ error: 'Invalid JSON: ' + parseErr.message })
    }

    // Defensive fixup: if a holding has cost > 0 but value == 0, swap them
    if (parsed.account?.holdings) {
      parsed.account.holdings.forEach(h => {
        if ((!h.value || h.value === 0) && h.cost > 0) {
          h.value = h.cost
          h.cost = 0
        }
      })
    }

    return res.status(200).json(parsed)
  } catch (err) {
    console.error('Parse error:', err)
    return res.status(500).json({ error: err.message || 'Internal error' })
  }
}
