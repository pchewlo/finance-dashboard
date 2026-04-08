import Anthropic from '@anthropic-ai/sdk'

export const config = {
  api: {
    bodyParser: { sizeLimit: '25mb' },
  },
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
    const { files } = req.body

    if (!files || !Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ error: 'No files provided' })
    }

    // Build a mixed content array: text intro + each file as either text or document block
    const content = [
      {
        type: 'text',
        text: 'Parse the following financial files. Each is labeled with its filename. Return only the JSON described in the system prompt.',
      },
    ]

    files.forEach((f, i) => {
      const isPdf = f.type === 'pdf'
      const label = isPdf ? 'PDF' : f.type === 'excel' ? 'Excel (converted to CSV)' : 'CSV'
      content.push({ type: 'text', text: `\n--- FILE ${i + 1}: ${f.name} (${label}) ---` })
      if (isPdf) {
        content.push({
          type: 'document',
          source: {
            type: 'base64',
            media_type: 'application/pdf',
            data: f.content,
          },
        })
      } else {
        // CSV: send as plain text, truncate huge files
        content.push({ type: 'text', text: String(f.content).slice(0, 40000) })
      }
    })

    const systemPrompt = `You are a financial data parser. The user will upload one or more files (CSV or PDF) exported from banks, brokers, pension providers, mortgage statements, or other financial institutions. Your job is to auto-detect each format and extract the data into a normalized JSON structure.

Return STRICTLY this JSON shape (no markdown, no commentary, just JSON):
{
  "accounts": [
    {
      "source_file": "filename",
      "detected_provider": "Monzo|Vanguard|Trading 212|Hargreaves Lansdown|Santander|Unknown",
      "account_type": "current|savings|isa|gia|pension|crypto|mortgage|other",
      "currency": "GBP|USD|EUR",
      "current_balance": number,
      "transactions": [
        { "date": "YYYY-MM-DD", "description": "...", "amount": number, "category": "income|investment|housing|food|subscriptions|transport|other" }
      ],
      "holdings": [
        { "name": "...", "ticker": "...", "units": number, "cost": number, "value": number }
      ]
    }
  ],
  "summary": {
    "total_cash": number,
    "total_investments": number,
    "total_liabilities": number,
    "net_worth": number,
    "monthly_income_avg": number,
    "monthly_outgoing_avg": number,
    "currency": "GBP"
  }
}

Rules:
- If a file is a transaction list, populate "transactions" and leave "holdings" empty
- If a file is a portfolio/holdings list, populate "holdings" and leave "transactions" empty
- If a file is a mortgage statement, set account_type "mortgage", current_balance to outstanding balance (negative), and add to total_liabilities
- Convert all amounts to numbers (no currency symbols, no commas)
- Use negative numbers for outgoing/expenses, positive for income
- Auto-categorize transactions based on description
- For summary: total_cash = sum of current/savings; total_investments = sum of holdings + ISA/GIA/pension cash balances; total_liabilities = sum of mortgages/debts (positive number); net_worth = total_cash + total_investments - total_liabilities
- If you cannot detect a value, use 0 (never null)
- Default currency to GBP if unclear
- Limit transactions to last 12 months per account if there are many`

    const message = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 8000,
      system: systemPrompt,
      messages: [{ role: 'user', content }],
    })

    const text = message.content[0].text.trim()
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return res.status(500).json({ error: 'Could not parse Claude response', raw: text })
    }

    const parsed = JSON.parse(jsonMatch[0])
    return res.status(200).json(parsed)
  } catch (err) {
    console.error('Parse error:', err)
    return res.status(500).json({ error: err.message || 'Internal error' })
  }
}
