import React, { useState, useRef } from 'react'
import * as XLSX from 'xlsx'
import * as pdfjsLib from 'pdfjs-dist/build/pdf.mjs'
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url'
import { COLORS, Card, Button, Tag, LoadingState, useIsMobile, fmt } from './ui.jsx'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker

async function extractPdfText(arrayBuffer) {
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  const pages = []
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    const text = content.items.map(item => item.str).join(' ')
    pages.push(`--- Page ${i} ---\n${text}`)
  }
  return pages.join('\n\n')
}

export function Welcome({ onStart }) {
  const isMobile = useIsMobile()
  return (
    <div style={{ textAlign: 'center', padding: isMobile ? '40px 0' : '80px 0' }}>
      <div style={{ fontSize: 12, color: COLORS.textMuted, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 16 }}>Your complete financial audit</div>
      <h1 style={{ fontFamily: 'inherit', fontSize: isMobile ? 32 : 44, fontWeight: 700, margin: 0, lineHeight: 1.15, color: COLORS.text, letterSpacing: '-0.02em' }}>
        Are you actually on track?<br />Let's find out.
      </h1>
      <p style={{ fontSize: 16, color: COLORS.textMuted, marginTop: 16, maxWidth: 560, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.6 }}>
        Upload your statements, share your goals, and get a clear, opinionated verdict on your financial position — plus the exact actions to close the gap.
      </p>
      <div style={{ marginTop: 40 }}>
        <Button onClick={onStart} variant="primary" style={{ padding: '14px 32px', fontSize: 15 }}>Start my audit</Button>
      </div>
      <div style={{ marginTop: 80, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, maxWidth: 720, marginLeft: 'auto', marginRight: 'auto' }}>
        <Card style={{ textAlign: 'left' }}>
          <div style={{ marginBottom: 8 }}><Tag color="blue">Step 1</Tag></div>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>What you're aiming for</div>
          <div style={{ fontSize: 13, color: COLORS.textMuted, lineHeight: 1.5 }}>Tell us your target net worth and financial priorities.</div>
        </Card>
        <Card style={{ textAlign: 'left' }}>
          <div style={{ marginBottom: 8 }}><Tag color="orange">Step 2</Tag></div>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Where you are today</div>
          <div style={{ fontSize: 13, color: COLORS.textMuted, lineHeight: 1.5 }}>Upload exports from your bank, broker, and pension provider.</div>
        </Card>
        <Card style={{ textAlign: 'left' }}>
          <div style={{ marginBottom: 8 }}><Tag color="green">Step 3</Tag></div>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Are you on track?</div>
          <div style={{ fontSize: 13, color: COLORS.textMuted, lineHeight: 1.5 }}>Get a verdict, a financial health score, and prioritized actions.</div>
        </Card>
      </div>
      <div style={{ marginTop: 32, fontSize: 12, color: COLORS.textDim }}>Your data never leaves your browser. The audit takes 30–60 seconds.</div>
    </div>
  )
}

export function GoalsForm({ initialGoals, onSubmit, onBack, isEditing }) {
  const isMobile = useIsMobile()
  const [goals, setGoals] = useState(initialGoals || {
    current_age: '',
    target_net_worth: '',
    monthly_savings: '',
    priorities: '',
    risk_tolerance: 'moderate',
    owns_home: 'no',
    property_value: '',
    mortgage_balance: '',
    mortgage_rate: '',
    mortgage_years_left: '',
    mortgage_fix_ends: '',
    planning_to_move: 'no',
    target_purchase_price: '',
    notes: '',
  })

  const update = (k, v) => setGoals(g => ({ ...g, [k]: v }))

  const equity = (parseFloat(goals.property_value) || 0) - (parseFloat(goals.mortgage_balance) || 0)

  const inputStyle = {
    width: '100%',
    padding: '10px 12px',
    fontSize: 14,
    fontFamily: 'inherit',
    border: `1px solid ${COLORS.cardBorder}`,
    borderRadius: 6,
    background: '#FFFFFF',
    color: COLORS.text,
    boxSizing: 'border-box',
  }

  const labelStyle = { fontSize: 13, fontWeight: 500, color: COLORS.text, marginBottom: 6, display: 'block' }

  function handleSubmit() {
    onSubmit({
      ...goals,
      current_age: parseInt(goals.current_age) || 0,
      target_net_worth: parseFloat(goals.target_net_worth) || 0,
      monthly_savings: parseFloat(goals.monthly_savings) || 0,
      property_value: parseFloat(goals.property_value) || 0,
      mortgage_balance: parseFloat(goals.mortgage_balance) || 0,
      mortgage_rate: parseFloat(goals.mortgage_rate) || 0,
      mortgage_years_left: parseInt(goals.mortgage_years_left) || 0,
      target_purchase_price: parseFloat(goals.target_purchase_price) || 0,
      property_equity: equity,
    })
  }

  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      <div style={{ marginBottom: 32 }}>
        <Tag color="blue">{isEditing ? 'Editing goals' : 'Step 1 of 3'}</Tag>
        <h1 style={{ fontFamily: 'inherit', fontSize: 28, fontWeight: 700, margin: '12px 0 8px', lineHeight: 1.2, color: COLORS.text, letterSpacing: '-0.01em' }}>{isEditing ? 'Update your goals' : 'What does success look like?'}</h1>
        <p style={{ fontSize: 14, color: COLORS.textMuted, margin: 0 }}>{isEditing ? 'Changes will refresh your audit and recommendations.' : 'Your goals shape every recommendation. Be specific where you can — these aren\'t locked in.'}</p>
      </div>

      <Card>
        <div>
          <label style={labelStyle}>Current age</label>
          <input style={inputStyle} type="number" placeholder="30" value={goals.current_age} onChange={e => update('current_age', e.target.value)} />
        </div>

        <div style={{ marginTop: 16 }}>
          <label style={labelStyle}>Target net worth (£)</label>
          <input style={inputStyle} type="number" placeholder="1000000" value={goals.target_net_worth} onChange={e => update('target_net_worth', e.target.value)} />
        </div>

        <div style={{ marginTop: 16 }}>
          <label style={labelStyle}>Planned monthly savings (£)</label>
          <input style={inputStyle} type="number" placeholder="2000" value={goals.monthly_savings} onChange={e => update('monthly_savings', e.target.value)} />
        </div>

        <div style={{ marginTop: 16 }}>
          <label style={labelStyle}>Top priority</label>
          <select style={inputStyle} value={goals.priorities} onChange={e => update('priorities', e.target.value)}>
            <option value="">Select one...</option>
            <option value="early_retirement">Retire early</option>
            <option value="buy_property">Buy property</option>
            <option value="financial_independence">Financial independence</option>
            <option value="children_education">Children's education</option>
            <option value="debt_free">Pay off debt</option>
            <option value="grow_wealth">Grow wealth</option>
          </select>
        </div>

        <div style={{ marginTop: 16 }}>
          <label style={labelStyle}>Risk tolerance</label>
          <select style={inputStyle} value={goals.risk_tolerance} onChange={e => update('risk_tolerance', e.target.value)}>
            <option value="conservative">Conservative — prefer safety over growth</option>
            <option value="moderate">Moderate — balanced approach</option>
            <option value="aggressive">Aggressive — maximize long-term growth</option>
          </select>
        </div>
      </Card>

      <Card style={{ marginTop: 16 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: COLORS.text, marginBottom: 4 }}>Your home</div>
        <div style={{ fontSize: 13, color: COLORS.textMuted, marginBottom: 16 }}>Property is often a major part of net worth — including it gives you a more accurate audit.</div>

        <div>
          <label style={labelStyle}>Do you own a home?</label>
          <select style={inputStyle} value={goals.owns_home} onChange={e => update('owns_home', e.target.value)}>
            <option value="no">No — renting or living with others</option>
            <option value="yes_outright">Yes — owned outright (no mortgage)</option>
            <option value="yes_mortgage">Yes — with a mortgage</option>
          </select>
        </div>

        {(goals.owns_home === 'yes_mortgage' || goals.owns_home === 'yes_outright') && (
          <>
            <div style={{ marginTop: 16 }}>
              <label style={labelStyle}>Estimated property value (£)</label>
              <input style={inputStyle} type="number" placeholder="450000" value={goals.property_value} onChange={e => update('property_value', e.target.value)} />
            </div>

            {goals.owns_home === 'yes_mortgage' && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16, marginTop: 16 }}>
                  <div>
                    <label style={labelStyle}>Outstanding mortgage (£)</label>
                    <input style={inputStyle} type="number" placeholder="250000" value={goals.mortgage_balance} onChange={e => update('mortgage_balance', e.target.value)} />
                  </div>
                  <div>
                    <label style={labelStyle}>Estimated equity (£)</label>
                    <input style={{ ...inputStyle, background: COLORS.pageBg, color: COLORS.textMuted }} type="text" value={equity > 0 ? '£' + equity.toLocaleString('en-GB') : '£0'} disabled />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16, marginTop: 16 }}>
                  <div>
                    <label style={labelStyle}>Current rate (%)</label>
                    <input style={inputStyle} type="number" step="0.01" placeholder="4.5" value={goals.mortgage_rate} onChange={e => update('mortgage_rate', e.target.value)} />
                  </div>
                  <div>
                    <label style={labelStyle}>Years remaining</label>
                    <input style={inputStyle} type="number" placeholder="25" value={goals.mortgage_years_left} onChange={e => update('mortgage_years_left', e.target.value)} />
                  </div>
                </div>

                <div style={{ marginTop: 16 }}>
                  <label style={labelStyle}>Fixed-rate deal ends (optional)</label>
                  <input style={inputStyle} type="text" placeholder="e.g. May 2027" value={goals.mortgage_fix_ends} onChange={e => update('mortgage_fix_ends', e.target.value)} />
                </div>
              </>
            )}
          </>
        )}

        <div style={{ marginTop: 16 }}>
          <label style={labelStyle}>Planning to move or buy?</label>
          <select style={inputStyle} value={goals.planning_to_move} onChange={e => update('planning_to_move', e.target.value)}>
            <option value="no">No</option>
            <option value="next_year">Yes — within the next year</option>
            <option value="next_3_years">Yes — within 3 years</option>
            <option value="someday">Eventually</option>
          </select>
        </div>

        {goals.planning_to_move !== 'no' && (
          <div style={{ marginTop: 16 }}>
            <label style={labelStyle}>Target purchase price (£)</label>
            <input style={inputStyle} type="number" placeholder="600000" value={goals.target_purchase_price} onChange={e => update('target_purchase_price', e.target.value)} />
          </div>
        )}
      </Card>

      <Card style={{ marginTop: 16 }}>
        <div>
          <label style={labelStyle}>Anything else we should know? (optional)</label>
          <textarea style={{ ...inputStyle, minHeight: 80, fontFamily: 'inherit' }} placeholder="e.g. expecting children, planning to relocate, partner's income..." value={goals.notes} onChange={e => update('notes', e.target.value)} />
        </div>
      </Card>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
        <Button onClick={onBack} variant="secondary">{isEditing ? 'Cancel' : 'Back'}</Button>
        <Button onClick={handleSubmit} variant="primary">{isEditing ? 'Save changes' : 'Continue'}</Button>
      </div>
    </div>
  )
}

export function CsvUpload({ onSubmit, onBack, isEditing }) {
  const [files, setFiles] = useState([])
  const [parsing, setParsing] = useState(false)
  const [error, setError] = useState(null)
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef(null)

  function handleFiles(fileList) {
    const newFiles = Array.from(fileList).filter(f => {
      const name = f.name.toLowerCase()
      return name.endsWith('.csv') || name.endsWith('.pdf') || name.endsWith('.xlsx') || name.endsWith('.xls') || f.type === 'text/csv' || f.type === 'application/pdf'
    })
    if (newFiles.length === 0) {
      setError('Please upload CSV, PDF, or Excel files only')
      return
    }
    setError(null)

    Promise.all(newFiles.map(f => new Promise((resolve) => {
      const name = f.name.toLowerCase()
      const isPdf = name.endsWith('.pdf') || f.type === 'application/pdf'
      const isExcel = name.endsWith('.xlsx') || name.endsWith('.xls')
      const reader = new FileReader()
      if (isPdf) {
        reader.onload = async () => {
          try {
            const text = await extractPdfText(reader.result)
            resolve({ name: f.name, type: 'pdf', content: text })
          } catch (err) {
            resolve({ name: f.name, type: 'pdf', content: '', error: 'Could not extract text from PDF' })
          }
        }
        reader.readAsArrayBuffer(f)
      } else if (isExcel) {
        reader.onload = () => {
          try {
            const workbook = XLSX.read(reader.result, { type: 'array' })
            // Convert each sheet to CSV, concatenate with sheet labels
            const csvParts = workbook.SheetNames.map(sheetName => {
              const sheet = workbook.Sheets[sheetName]
              const csv = XLSX.utils.sheet_to_csv(sheet)
              return workbook.SheetNames.length > 1 ? `### Sheet: ${sheetName}\n${csv}` : csv
            })
            resolve({ name: f.name, type: 'excel', content: csvParts.join('\n\n') })
          } catch (err) {
            resolve({ name: f.name, type: 'excel', content: '', error: 'Could not parse Excel file' })
          }
        }
        reader.readAsArrayBuffer(f)
      } else {
        reader.onload = () => resolve({ name: f.name, type: 'csv', content: reader.result })
        reader.readAsText(f)
      }
    }))).then(loaded => {
      setFiles(prev => [...prev, ...loaded])
    })
  }

  function removeFile(idx) {
    setFiles(prev => prev.filter((_, i) => i !== idx))
  }

  async function handleParse() {
    if (files.length === 0) {
      setError('Add at least one file')
      return
    }

    setParsing(true)
    setError(null)
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 90000)

    try {
      // Fire one parallel request per file. Each one is small and fast (Haiku
      // + cached prompt). The slowest file determines total time, not the sum.
      const results = await Promise.all(files.map(async (f) => {
        // For long files, send a HEADER (start) for metadata + a TAIL (end)
        // for the most recent transactions. Bank statements are usually
        // chronological, so the tail has the recent data.
        const raw = String(f.content || '')
        let payload
        if (raw.length <= 80000) {
          payload = raw
        } else {
          const header = raw.slice(0, 8000)
          const tail = raw.slice(-72000)
          payload = `${header}\n\n[... older entries omitted ...]\n\n${tail}`
        }

        const res = await fetch('/api/parse', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ file: { name: f.name, type: f.type, content: payload } }),
          signal: controller.signal,
        })
        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}))
          throw new Error(`${f.name}: ${errBody.error || `Server error (${res.status})`}`)
        }
        return res.json()
      }))

      // Merge per-file results into the shape the dashboard expects.
      // Each result is { accounts: [...] } — flatten across files.
      const accounts = results.flatMap(r => r.accounts || (r.account ? [r.account] : []))

      // Compute summary client-side from merged accounts
      const totalHoldings = accounts.reduce((s, a) =>
        s + (a.holdings || []).reduce((hs, h) => hs + (h.value || 0), 0), 0)
      const totalCash = accounts
        .filter(a => ['current', 'savings'].includes(a.account_type))
        .reduce((s, a) => s + (a.current_balance || 0), 0)
      const totalLiab = accounts
        .filter(a => a.account_type === 'mortgage')
        .reduce((s, a) => s + Math.abs(a.current_balance || 0), 0)

      // Estimate monthly income/outgoing from current/savings accounts only.
      // Investment account "transactions" are fund buys/sells, not real cash flow.
      const cashTx = accounts
        .filter(a => ['current', 'savings'].includes(a.account_type))
        .flatMap(a => a.transactions || [])
      const monthly = {}
      cashTx.forEach(tx => {
        if (!tx.date) return
        const ym = tx.date.slice(0, 7)
        if (!monthly[ym]) monthly[ym] = { inc: 0, out: 0 }
        if (tx.amount > 0) monthly[ym].inc += tx.amount
        else monthly[ym].out += tx.amount
      })
      // Use last 12 months for average
      const recentMonths = Object.keys(monthly).sort().slice(-12).map(k => monthly[k])
      const avgInc = recentMonths.length ? recentMonths.reduce((s, m) => s + m.inc, 0) / recentMonths.length : 0
      const avgOut = recentMonths.length ? recentMonths.reduce((s, m) => s + m.out, 0) / recentMonths.length : 0

      const merged = {
        accounts,
        summary: {
          total_cash: totalCash,
          total_investments: totalHoldings,
          total_liabilities: totalLiab,
          net_worth: totalCash + totalHoldings - totalLiab,
          monthly_income_avg: avgInc,
          monthly_outgoing_avg: avgOut,
          currency: 'GBP',
        },
      }

      onSubmit(merged)
    } catch (err) {
      if (err.name === 'AbortError') {
        setError('Parsing took too long (>90s). Try uploading fewer or smaller files.')
      } else {
        const msg = err.message || 'Failed to parse files'
        setError(msg === 'Failed to fetch' ? 'The server took too long to respond. Try uploading fewer or smaller files.' : msg)
      }
    } finally {
      clearTimeout(timeoutId)
      setParsing(false)
    }
  }

  if (parsing) {
    return (
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        <div style={{ marginBottom: 32 }}>
          <Tag color="orange">{isEditing ? 'Updating files' : 'Step 2 of 3'}</Tag>
          <h1 style={{ fontFamily: 'inherit', fontSize: 28, fontWeight: 700, margin: '12px 0 8px', lineHeight: 1.2, color: COLORS.text, letterSpacing: '-0.01em' }}>Running your audit</h1>
          <p style={{ fontSize: 14, color: COLORS.textMuted, margin: 0 }}>This usually takes 15–30 seconds.</p>
        </div>
        <LoadingState
          title="Analyzing your finances"
          messages={[
            'Reading your statements...',
            'Sense-checking your assets...',
            'Cross-referencing with your goals...',
            'Detecting account types and providers...',
            'Extracting holdings and balances...',
            'Spotting blind spots...',
            'Building your verdict...',
            'Almost there...',
          ]}
        />
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <div style={{ marginBottom: 32 }}>
        <Tag color="orange">{isEditing ? 'Updating files' : 'Step 2 of 3'}</Tag>
        <h1 style={{ fontFamily: 'inherit', fontSize: 28, fontWeight: 700, margin: '12px 0 8px', lineHeight: 1.2, color: COLORS.text, letterSpacing: '-0.01em' }}>{isEditing ? 'Upload fresh statements' : 'Show us where you stand today'}</h1>
        <p style={{ fontSize: 14, color: COLORS.textMuted, margin: 0, lineHeight: 1.5 }}>{isEditing ? 'New files will replace your existing data. Your goals will be kept.' : 'The more you upload, the more accurate your audit. We extract data in your browser — nothing is stored on our servers.'}</p>
      </div>

      {!isEditing && <UploadGuide />}

      <div
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files) }}
        onClick={() => inputRef.current?.click()}
        style={{
          border: `2px dashed ${dragging ? COLORS.accent : COLORS.cardBorder}`,
          borderRadius: 8,
          padding: '48px 24px',
          textAlign: 'center',
          cursor: 'pointer',
          background: dragging ? COLORS.accentDim : '#FFFFFF',
          transition: 'all 0.15s',
          marginTop: isEditing ? 0 : 24,
        }}
      >
        <div style={{ fontSize: 32, marginBottom: 12 }}>📁</div>
        <div style={{ fontSize: 15, fontWeight: 600, color: COLORS.text, marginBottom: 4 }}>Drop CSV, Excel, or PDF files here</div>
        <div style={{ fontSize: 13, color: COLORS.textMuted }}>or click to browse</div>
        <input ref={inputRef} type="file" multiple accept=".csv,.pdf,.xlsx,.xls,text/csv,application/pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" style={{ display: 'none' }} onChange={e => handleFiles(e.target.files)} />
      </div>

      {!isEditing && (
        <div style={{ marginTop: 12, fontSize: 12, color: COLORS.textDim, textAlign: 'center' }}>
          Don't have everything? You can run the audit with what you have and add more files later.
        </div>
      )}

      {files.length > 0 && (
        <div style={{ marginTop: 20 }}>
          {files.map((f, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#FFFFFF', border: `1px solid ${COLORS.cardBorder}`, borderRadius: 6, marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Tag color={f.type === 'pdf' ? 'red' : f.type === 'excel' ? 'green' : 'blue'}>{(f.type || 'csv').toUpperCase()}</Tag>
                <div style={{ fontSize: 14, color: COLORS.text }}>{f.name}</div>
              </div>
              <button onClick={() => removeFile(i)} style={{ background: 'none', border: 'none', color: COLORS.textMuted, cursor: 'pointer', fontSize: 13 }}>Remove</button>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div style={{ marginTop: 20, padding: '12px 16px', background: 'rgba(224,62,62,0.06)', borderRadius: 6, borderLeft: '3px solid #E03E3E', fontSize: 13, color: COLORS.text }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
        <Button onClick={onBack} variant="secondary" disabled={parsing}>{isEditing ? 'Cancel' : 'Back'}</Button>
        <Button onClick={handleParse} variant="primary" disabled={parsing || files.length === 0}>
          {parsing ? 'Analyzing...' : (isEditing ? 'Update my data' : 'Run my audit')}
        </Button>
      </div>
    </div>
  )
}

function UploadGuide() {
  const isMobile = useIsMobile()
  const categories = [
    {
      tag: 'Bank',
      tagColor: 'blue',
      title: 'Bank statements',
      sub: 'Last 12–24 months from your main current and savings accounts',
      providers: [
        { name: 'Monzo', steps: 'App → Account → Statements → Export (CSV or PDF, last 2 years)' },
        { name: 'Starling', steps: 'App → Account → Statements → Email me a statement (CSV)' },
        { name: 'Revolut', steps: 'App → Profile → Statements → Generate (CSV or PDF)' },
        { name: 'HSBC, Barclays, Lloyds, NatWest, Santander', steps: 'Online banking → Statements → Export to CSV' },
      ],
      formats: 'CSV, PDF',
    },
    {
      tag: 'Investments',
      tagColor: 'green',
      title: 'Investment accounts (ISA, GIA, brokerage)',
      sub: 'Current holdings and 12 months of transactions',
      providers: [
        { name: 'Vanguard UK', steps: 'vanguardinvestor.co.uk → Portfolio → Download (Excel)' },
        { name: 'Trading 212', steps: 'App → History → Export → CSV (select all-time)' },
        { name: 'Hargreaves Lansdown', steps: 'My Account → Account history → Download → CSV' },
        { name: 'AJ Bell, interactive investor, Freetrade', steps: 'Account history → Export / Download → CSV or Excel' },
      ],
      formats: 'CSV, Excel, PDF',
    },
    {
      tag: 'Pension',
      tagColor: 'purple',
      title: 'Pensions (workplace and SIPP)',
      sub: 'Latest pension statement showing balance and contributions',
      providers: [
        { name: 'Workplace pension (Aviva, Scottish Widows, Standard Life, L&G, NEST)', steps: 'Provider portal → Statements → Latest annual statement (PDF)' },
        { name: 'SIPP', steps: 'Same as your investment platform — find the holdings export' },
      ],
      formats: 'PDF, CSV',
    },
    {
      tag: 'Mortgage',
      tagColor: 'orange',
      title: 'Mortgage statement (if you have one)',
      sub: 'Latest annual statement or current balance letter',
      providers: [
        { name: 'Santander, Halifax, Nationwide, NatWest etc.', steps: 'Mortgage provider portal → Statements → Annual mortgage statement (PDF)' },
      ],
      formats: 'PDF',
    },
  ]

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.text, marginBottom: 12, letterSpacing: '-0.01em' }}>What to upload</div>
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12 }}>
        {categories.map((c, i) => (
          <Card key={i} style={{ padding: '16px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <Tag color={c.tagColor}>{c.tag}</Tag>
              <span style={{ fontSize: 11, color: COLORS.textDim }}>{c.formats}</span>
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: COLORS.text, marginBottom: 4 }}>{c.title}</div>
            <div style={{ fontSize: 12, color: COLORS.textMuted, marginBottom: 12, lineHeight: 1.5 }}>{c.sub}</div>
            <div style={{ display: 'grid', gap: 8 }}>
              {c.providers.map((p, j) => (
                <div key={j} style={{ fontSize: 12, lineHeight: 1.5 }}>
                  <div style={{ fontWeight: 500, color: COLORS.text }}>{p.name}</div>
                  <div style={{ color: COLORS.textMuted }}>{p.steps}</div>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

export function Recommendations({ goals, finances, onBack }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [data, setData] = useState(null)
  const [retryKey, setRetryKey] = useState(0)

  React.useEffect(() => {
    let cancelled = false
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 90000)

    async function load() {
      setLoading(true)
      try {
        // Slim down finances payload — drop individual transactions, keep summary + account meta + holdings
        const slimFinances = finances ? {
          summary: finances.summary,
          accounts: (finances.accounts || []).map(acc => ({
            provider: acc.detected_provider,
            account_type: acc.account_type,
            currency: acc.currency,
            current_balance: acc.current_balance,
            holdings: (acc.holdings || []).map(h => ({
              name: h.name,
              value: h.value,
              cost: h.cost,
            })),
          })),
        } : null

        const res = await fetch('/api/recommend', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ goals, finances: slimFinances }),
          signal: controller.signal,
        })
        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}))
          throw new Error(errBody.error || `Server error (${res.status})`)
        }
        const result = await res.json()
        if (!cancelled) setData(result)
      } catch (err) {
        if (!cancelled) {
          if (err.name === 'AbortError') {
            setError('The recommendations took too long to generate (>90s). The server may be overloaded. Please try again.')
          } else {
            const msg = err.message || 'Failed to generate recommendations'
            setError(msg === 'Failed to fetch' ? 'The server took too long to respond. Please try again.' : msg)
          }
        }
      } finally {
        clearTimeout(timeoutId)
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true; clearTimeout(timeoutId); controller.abort() }
  }, [retryKey])

  if (loading) {
    return (
      <LoadingState
        title="Crafting your plan"
        messages={[
          'Reviewing your financial position...',
          'Cross-referencing with your goals...',
          'Identifying tax optimization opportunities...',
          'Checking ISA, GIA, and pension allocation...',
          'Modeling scenarios to your target...',
          'Spotting risks and red flags...',
          'Prioritizing actions by impact...',
          'Writing your personalized recommendations...',
          'Adding final touches...',
        ]}
      />
    )
  }

  if (error) {
    return (
      <>
        <div style={{ padding: '14px 16px', background: 'rgba(224,62,62,0.06)', borderRadius: 6, borderLeft: '3px solid #E03E3E', fontSize: 13, color: COLORS.text }}>
          {error}
        </div>
        <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
          <Button onClick={onBack} variant="secondary">Back</Button>
          <Button onClick={() => { setError(null); setData(null); setRetryKey(k => k + 1) }} variant="primary">Try again</Button>
        </div>
      </>
    )
  }

  if (!data) return null

  const severityToColor = {
    critical: 'red',
    action: 'orange',
    opportunity: 'green',
    on_track: 'green',
  }
  const severityToBorder = {
    critical: '#E03E3E',
    action: '#D9730D',
    opportunity: '#0F7B6C',
    on_track: '#0F7B6C',
  }

  return (
    <>
      <Card>
        <div style={{ fontSize: 12, color: COLORS.textMuted, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Summary</div>
        <div style={{ fontSize: 15, color: COLORS.text, lineHeight: 1.6 }}>{data.summary}</div>
        {data.headline_metric && (
          <div style={{ marginTop: 20, padding: '16px 20px', background: COLORS.accentDim, borderRadius: 6, borderLeft: `3px solid ${COLORS.accent}` }}>
            <div style={{ fontSize: 12, color: COLORS.textMuted, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{data.headline_metric.label}</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: COLORS.text, marginTop: 4 }}>{data.headline_metric.value}</div>
            <div style={{ fontSize: 13, color: COLORS.textMuted, marginTop: 4 }}>{data.headline_metric.context}</div>
          </div>
        )}
      </Card>

      {data.findings && data.findings.length > 0 && (
        <>
          <h2 style={{ fontFamily: 'inherit', fontSize: 18, color: COLORS.text, margin: '40px 0 16px', fontWeight: 600 }}>Key findings</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
            {data.findings.map((f, i) => (
              <Card key={i} style={{ borderLeft: `3px solid ${severityToBorder[f.severity] || COLORS.cardBorder}` }}>
                <div style={{ marginBottom: 12 }}>
                  <Tag color={severityToColor[f.severity] || 'blue'}>{f.severity?.replace('_', ' ').toUpperCase()}</Tag>
                </div>
                <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8, color: COLORS.text }}>{f.title}</div>
                <div style={{ fontSize: 13, color: COLORS.textMuted, lineHeight: 1.65 }}>{f.body}</div>
                {f.estimated_impact_gbp > 0 && (
                  <div style={{ fontSize: 12, color: COLORS.accent, marginTop: 12, fontWeight: 500 }}>
                    Est. impact: {fmt(f.estimated_impact_gbp)}
                  </div>
                )}
              </Card>
            ))}
          </div>
        </>
      )}

      {data.recommendations && data.recommendations.length > 0 && (
        <>
          <h2 style={{ fontFamily: 'inherit', fontSize: 18, color: COLORS.text, margin: '40px 0 16px', fontWeight: 600 }}>Recommended actions</h2>
          {data.recommendations.map((rec, i) => (
            <Card key={i} style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 8 }}>
                <div>
                  <div style={{ fontSize: 11, color: COLORS.textMuted, fontWeight: 600 }}>#{rec.priority}</div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: COLORS.text }}>{rec.title}</div>
                </div>
                <Tag color="blue">{rec.timeframe?.replace('_', ' ')}</Tag>
              </div>
              <div style={{ fontSize: 13, color: COLORS.textMuted, lineHeight: 1.65, marginBottom: 12 }}>{rec.rationale}</div>
              {rec.steps && rec.steps.length > 0 && (
                <ol style={{ paddingLeft: 20, margin: 0, fontSize: 13, color: COLORS.text, lineHeight: 1.7 }}>
                  {rec.steps.map((s, j) => <li key={j}>{s}</li>)}
                </ol>
              )}
              {rec.estimated_value_gbp > 0 && (
                <div style={{ fontSize: 12, color: COLORS.accent, marginTop: 12, fontWeight: 500 }}>
                  Est. value: {fmt(rec.estimated_value_gbp)}
                </div>
              )}
            </Card>
          ))}
        </>
      )}

      {data.risks && data.risks.length > 0 && (
        <>
          <h2 style={{ fontFamily: 'inherit', fontSize: 18, color: COLORS.text, margin: '40px 0 16px', fontWeight: 600 }}>Risks to watch</h2>
          {data.risks.map((r, i) => (
            <Card key={i} style={{ marginBottom: 12, borderLeft: '3px solid #D9730D' }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: COLORS.text, marginBottom: 6 }}>{r.title}</div>
              <div style={{ fontSize: 13, color: COLORS.textMuted, lineHeight: 1.65, marginBottom: 8 }}>{r.description}</div>
              <div style={{ fontSize: 13, color: COLORS.text, lineHeight: 1.65 }}><strong>Mitigation:</strong> {r.mitigation}</div>
            </Card>
          ))}
        </>
      )}
    </>
  )
}
