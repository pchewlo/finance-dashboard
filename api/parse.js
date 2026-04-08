import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { files } = req.body

    if (!files || !Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ error: 'No files provided' })
    }

    const fileBlocks = files.map((f, i) => `--- FILE ${i + 1}: ${f.name} ---\n${f.content.slice(0, 20000)}`).join('\n\n')

    const systemPrompt = `You are a financial data parser. The user will upload one or more CSV files exported from banks, brokers, pension providers, or other financial institutions. Your job is to auto-detect the format and extract the data into a normalized JSON structure.

Return STRICTLY this JSON shape (no markdown, no commentary, just JSON):
{
  "accounts": [
    {
      "source_file": "filename.csv",
      "detected_provider": "Monzo|Vanguard|Trading 212|Hargreaves Lansdown|Unknown",
      "account_type": "current|savings|isa|gia|pension|crypto|other",
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
- Convert all amounts to numbers (no currency symbols, no commas)
- Use negative numbers for outgoing/expenses, positive for income
- Auto-categorize transactions based on description
- For summary: estimate current balances from latest transaction balance or sum of holdings
- If you cannot detect a value, use 0 (never null)
- Default currency to GBP if unclear`

    const message = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 8000,
      system: systemPrompt,
      messages: [
        { role: 'user', content: `Parse these financial CSV files:\n\n${fileBlocks}` }
      ]
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
