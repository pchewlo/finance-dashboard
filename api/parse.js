import Anthropic from '@anthropic-ai/sdk'

export const config = {
  api: {
    bodyParser: { sizeLimit: '4mb' },
  },
  // maxDuration only applies on Vercel Pro+ (Hobby caps at 60s).
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
        // CSV/Excel: send as plain text, truncate huge files
        content.push({ type: 'text', text: String(f.content).slice(0, 30000) })
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
      // For holdings: "value" is the CURRENT MARKET VALUE (must always be set if you find any monetary amount).
      // "cost" is the original purchase/book cost — only set if explicitly given as a separate column.
      // If the file has only one money column per holding, treat it as VALUE (not cost) and set cost to 0.
      // NEVER set cost without also setting value.
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
      model: 'claude-sonnet-4-6',
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

    // Defensive fixup: if a holding has cost > 0 but value == 0, treat the cost as value
    if (parsed.accounts) {
      parsed.accounts.forEach(acc => {
        if (acc.holdings) {
          acc.holdings.forEach(h => {
            if ((!h.value || h.value === 0) && h.cost > 0) {
              h.value = h.cost
              h.cost = 0
            }
          })
        }
      })

      // Recompute summary if it looks broken
      const totalHoldings = parsed.accounts.reduce((s, acc) =>
        s + (acc.holdings || []).reduce((hs, h) => hs + (h.value || 0), 0), 0)
      const totalCash = parsed.accounts
        .filter(acc => ['current', 'savings'].includes(acc.account_type))
        .reduce((s, acc) => s + (acc.current_balance || 0), 0)
      const totalLiab = parsed.accounts
        .filter(acc => acc.account_type === 'mortgage')
        .reduce((s, acc) => s + Math.abs(acc.current_balance || 0), 0)

      if (!parsed.summary) parsed.summary = {}
      if (!parsed.summary.total_investments || parsed.summary.total_investments === 0) {
        parsed.summary.total_investments = totalHoldings
      }
      if (!parsed.summary.total_cash || parsed.summary.total_cash === 0) {
        parsed.summary.total_cash = totalCash
      }
      if (!parsed.summary.total_liabilities) {
        parsed.summary.total_liabilities = totalLiab
      }
      if (!parsed.summary.net_worth || parsed.summary.net_worth === 0) {
        parsed.summary.net_worth = (parsed.summary.total_cash || 0) + (parsed.summary.total_investments || 0) - (parsed.summary.total_liabilities || 0)
      }
    }

    return res.status(200).json(parsed)
  } catch (err) {
    console.error('Parse error:', err)
    return res.status(500).json({ error: err.message || 'Internal error' })
  }
}
