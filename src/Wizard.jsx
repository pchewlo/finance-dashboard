import React, { useState, useRef } from 'react'
import { COLORS, Card, Button, Tag, fmt } from './ui.jsx'

export function Welcome({ onStart }) {
  return (
    <div style={{ textAlign: 'center', padding: '80px 0' }}>
      <div style={{ fontSize: 12, color: COLORS.textMuted, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 16 }}>Personal Finance Audit</div>
      <h1 style={{ fontFamily: 'inherit', fontSize: 44, fontWeight: 700, margin: 0, lineHeight: 1.15, color: COLORS.text, letterSpacing: '-0.02em' }}>
        Understand your money.<br />Get a plan.
      </h1>
      <p style={{ fontSize: 16, color: COLORS.textMuted, marginTop: 16, maxWidth: 520, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.6 }}>
        Upload your financial statements, share your goals, and get a personalized analysis with actionable recommendations.
      </p>
      <div style={{ marginTop: 40 }}>
        <Button onClick={onStart} variant="primary" style={{ padding: '14px 32px', fontSize: 15 }}>Get started</Button>
      </div>
      <div style={{ marginTop: 80, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, maxWidth: 720, marginLeft: 'auto', marginRight: 'auto' }}>
        <Card style={{ textAlign: 'left' }}>
          <div style={{ marginBottom: 8 }}><Tag color="blue">Step 1</Tag></div>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Set your goals</div>
          <div style={{ fontSize: 13, color: COLORS.textMuted, lineHeight: 1.5 }}>Tell us what you're working toward and when.</div>
        </Card>
        <Card style={{ textAlign: 'left' }}>
          <div style={{ marginBottom: 8 }}><Tag color="orange">Step 2</Tag></div>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Upload statements</div>
          <div style={{ fontSize: 13, color: COLORS.textMuted, lineHeight: 1.5 }}>Drag in CSV exports from your bank, broker, or pension.</div>
        </Card>
        <Card style={{ textAlign: 'left' }}>
          <div style={{ marginBottom: 8 }}><Tag color="green">Step 3</Tag></div>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Get your plan</div>
          <div style={{ fontSize: 13, color: COLORS.textMuted, lineHeight: 1.5 }}>AI-generated recommendations based on your real data.</div>
        </Card>
      </div>
      <div style={{ marginTop: 32, fontSize: 12, color: COLORS.textDim }}>Your data stays in your browser. Nothing is stored on our servers.</div>
    </div>
  )
}

export function GoalsForm({ initialGoals, onSubmit, onBack }) {
  const [goals, setGoals] = useState(initialGoals || {
    current_age: '',
    target_age: '',
    target_net_worth: '',
    monthly_savings: '',
    priorities: '',
    risk_tolerance: 'moderate',
    notes: '',
  })

  const update = (k, v) => setGoals(g => ({ ...g, [k]: v }))

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
      target_age: parseInt(goals.target_age) || 0,
      target_net_worth: parseFloat(goals.target_net_worth) || 0,
      monthly_savings: parseFloat(goals.monthly_savings) || 0,
    })
  }

  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      <div style={{ marginBottom: 32 }}>
        <Tag color="blue">Step 1 of 3</Tag>
        <h1 style={{ fontFamily: 'inherit', fontSize: 28, fontWeight: 700, margin: '12px 0 8px', lineHeight: 1.2, color: COLORS.text, letterSpacing: '-0.01em' }}>What are you working toward?</h1>
        <p style={{ fontSize: 14, color: COLORS.textMuted, margin: 0 }}>Tell us your goals so we can tailor recommendations.</p>
      </div>

      <Card>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <label style={labelStyle}>Current age</label>
            <input style={inputStyle} type="number" placeholder="30" value={goals.current_age} onChange={e => update('current_age', e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Target age</label>
            <input style={inputStyle} type="number" placeholder="50" value={goals.target_age} onChange={e => update('target_age', e.target.value)} />
          </div>
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

        <div style={{ marginTop: 16 }}>
          <label style={labelStyle}>Anything else we should know? (optional)</label>
          <textarea style={{ ...inputStyle, minHeight: 80, fontFamily: 'inherit' }} placeholder="e.g. expecting children, planning to relocate, have a mortgage ending in 2027..." value={goals.notes} onChange={e => update('notes', e.target.value)} />
        </div>
      </Card>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
        <Button onClick={onBack} variant="secondary">Back</Button>
        <Button onClick={handleSubmit} variant="primary">Continue</Button>
      </div>
    </div>
  )
}

export function CsvUpload({ onSubmit, onBack }) {
  const [files, setFiles] = useState([])
  const [parsing, setParsing] = useState(false)
  const [error, setError] = useState(null)
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef(null)

  function handleFiles(fileList) {
    const newFiles = Array.from(fileList).filter(f => f.name.toLowerCase().endsWith('.csv') || f.type === 'text/csv')
    if (newFiles.length === 0) {
      setError('Please upload CSV files only')
      return
    }
    setError(null)

    Promise.all(newFiles.map(f => new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = () => resolve({ name: f.name, content: reader.result })
      reader.readAsText(f)
    }))).then(loaded => {
      setFiles(prev => [...prev, ...loaded])
    })
  }

  function removeFile(idx) {
    setFiles(prev => prev.filter((_, i) => i !== idx))
  }

  async function handleParse() {
    if (files.length === 0) {
      setError('Add at least one CSV file')
      return
    }
    setParsing(true)
    setError(null)
    try {
      const res = await fetch('/api/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files }),
      })
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}))
        throw new Error(errBody.error || `Server error (${res.status})`)
      }
      const data = await res.json()
      onSubmit(data)
    } catch (err) {
      setError(err.message || 'Failed to parse files')
    } finally {
      setParsing(false)
    }
  }

  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      <div style={{ marginBottom: 32 }}>
        <Tag color="orange">Step 2 of 3</Tag>
        <h1 style={{ fontFamily: 'inherit', fontSize: 28, fontWeight: 700, margin: '12px 0 8px', lineHeight: 1.2, color: COLORS.text, letterSpacing: '-0.01em' }}>Upload your statements</h1>
        <p style={{ fontSize: 14, color: COLORS.textMuted, margin: 0 }}>Drag in CSV exports from your bank, broker, or pension provider. We'll auto-detect the format.</p>
      </div>

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
        }}
      >
        <div style={{ fontSize: 32, marginBottom: 12 }}>📁</div>
        <div style={{ fontSize: 15, fontWeight: 600, color: COLORS.text, marginBottom: 4 }}>Drop CSV files here</div>
        <div style={{ fontSize: 13, color: COLORS.textMuted }}>or click to browse</div>
        <input ref={inputRef} type="file" multiple accept=".csv,text/csv" style={{ display: 'none' }} onChange={e => handleFiles(e.target.files)} />
      </div>

      {files.length > 0 && (
        <div style={{ marginTop: 20 }}>
          {files.map((f, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#FFFFFF', border: `1px solid ${COLORS.cardBorder}`, borderRadius: 6, marginBottom: 8 }}>
              <div style={{ fontSize: 14, color: COLORS.text }}>{f.name}</div>
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
        <Button onClick={onBack} variant="secondary" disabled={parsing}>Back</Button>
        <Button onClick={handleParse} variant="primary" disabled={parsing || files.length === 0}>
          {parsing ? 'Analyzing...' : 'Analyze my data'}
        </Button>
      </div>
    </div>
  )
}

export function Recommendations({ goals, finances, onBack }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [data, setData] = useState(null)

  React.useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const res = await fetch('/api/recommend', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ goals, finances }),
        })
        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}))
          throw new Error(errBody.error || `Server error (${res.status})`)
        }
        const result = await res.json()
        if (!cancelled) setData(result)
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to generate recommendations')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  if (loading) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '40px 0', color: COLORS.textMuted }}>
          <div style={{ fontSize: 14 }}>Analyzing your data and generating personalized recommendations...</div>
        </div>
      </Card>
    )
  }

  if (error) {
    return (
      <>
        <div style={{ padding: '14px 16px', background: 'rgba(224,62,62,0.06)', borderRadius: 6, borderLeft: '3px solid #E03E3E', fontSize: 13, color: COLORS.text }}>
          {error}
        </div>
        <div style={{ marginTop: 16 }}>
          <Button onClick={onBack} variant="secondary">Back</Button>
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
