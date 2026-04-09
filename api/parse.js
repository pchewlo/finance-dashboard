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

A single file may contain MULTIPLE accounts. For example, a Vanguard export
often contains an ISA, a GIA, and a Pension all in the same file. Detect each
distinct account (different account_type or different wrapper) and return one
entry per account in the accounts array.

Output STRICTLY this JSON shape with no markdown or commentary:
{
  "accounts": [
    {
      "source_file": "filename",
      "detected_provider": "Monzo|Vanguard|Trading 212|Hargreaves Lansdown|Santander|Unknown",
      "account_type": "current|savings|isa|gia|pension|crypto|mortgage|other",
      "currency": "GBP|USD|EUR",
      "current_balance": number,
      "transactions": [{ "date": "YYYY-MM-DD", "description": "string", "amount": number, "category": "income|investment|housing|food|subscriptions|transport|other" }],
      "holdings": [{ "name": "string", "ticker": "string", "units": number, "cost": number, "value": number }]
    }
  ]
}

CRITICAL: Output token budget is limited. You MUST follow these rules to avoid truncation:
- Return at most 200 transactions PER ACCOUNT. If more, return only the most recent 200.
- Keep "description" under 40 characters — abbreviate aggressively
- Round amounts to whole numbers
- Return at most 30 holdings per account

Account splitting rules:
- ISA holdings → one account with account_type "isa"
- GIA / general investment / taxable holdings → one account with account_type "gia"
- Pension / SIPP holdings → one account with account_type "pension"
- Current/savings bank accounts → "current" or "savings"
- Mortgage statements → account_type "mortgage", current_balance = outstanding (negative)
- If a file shows multiple wrappers, split them into separate account entries

Other rules:
- Transaction file: populate "transactions", leave "holdings" empty
- Holdings/portfolio file: populate "holdings", leave "transactions" empty
- Numbers only — strip £/$/€ and commas
- Negative = outgoing, positive = income
- For holdings: "value" is current market value. Only set "cost" if explicitly given as a separate column. If only one money column exists, treat it as VALUE.
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
    // Client already trimmed to 80k with header+tail strategy. Final safety cap.
    const truncated = String(file.content).slice(0, 80000)

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 16000,
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
    const jsonStart = text.indexOf('{')
    if (jsonStart === -1) {
      return res.status(500).json({ error: 'Could not parse model response', raw: text.slice(0, 500) })
    }

    let parsed
    try {
      // First try parsing as-is
      parsed = JSON.parse(text.slice(jsonStart))
    } catch (parseErr) {
      // JSON was truncated mid-array. Repair by finding the last complete object
      // before the truncation point and closing the structure.
      parsed = repairTruncatedJson(text.slice(jsonStart))
      if (!parsed) {
        return res.status(500).json({ error: 'Invalid JSON: ' + parseErr.message })
      }
    }

    // Backward compatibility: some responses may use the old single "account" key
    if (parsed.account && !parsed.accounts) {
      parsed.accounts = [parsed.account]
      delete parsed.account
    }

    // Defensive fixup: if a holding has cost > 0 but value == 0, swap them
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
    }

    return res.status(200).json(parsed)
  } catch (err) {
    console.error('Parse error:', err)
    return res.status(500).json({ error: err.message || 'Internal error' })
  }
}

// Attempt to recover a JSON object that was truncated mid-array.
// Strategy: walk forward, track bracket depth, and on parse failure,
// snip back to the last complete object inside the open array, then
// close all open structures.
function repairTruncatedJson(text) {
  // Try progressively shorter prefixes ending at a closed object
  // followed by the right number of closing brackets/braces.
  const stack = []
  let inString = false
  let escape = false
  let lastSafeEnd = -1 // index immediately after the last fully-closed top-level child

  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (escape) { escape = false; continue }
    if (c === '\\') { escape = true; continue }
    if (c === '"') { inString = !inString; continue }
    if (inString) continue

    if (c === '{' || c === '[') {
      stack.push(c)
    } else if (c === '}' || c === ']') {
      stack.pop()
      // If we're now inside an array (top of stack is '['), this was a complete element
      if (stack.length > 0 && stack[stack.length - 1] === '[') {
        lastSafeEnd = i + 1
      }
      // If we close the outermost {, parse worked already so we won't hit the repair path
    }
  }

  if (lastSafeEnd === -1) return null

  // Build a repaired payload: text up to lastSafeEnd, then close all open brackets in reverse
  // Re-walk the prefix to know what's open at lastSafeEnd
  const prefix = text.slice(0, lastSafeEnd)
  const openStack = []
  let s = false, e = false
  for (let i = 0; i < prefix.length; i++) {
    const c = prefix[i]
    if (e) { e = false; continue }
    if (c === '\\') { e = true; continue }
    if (c === '"') { s = !s; continue }
    if (s) continue
    if (c === '{' || c === '[') openStack.push(c)
    else if (c === '}' || c === ']') openStack.pop()
  }

  let closing = ''
  for (let i = openStack.length - 1; i >= 0; i--) {
    closing += openStack[i] === '{' ? '}' : ']'
  }

  try {
    return JSON.parse(prefix + closing)
  } catch {
    return null
  }
}
