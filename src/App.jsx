import React, { useState, useEffect } from 'react'
import { COLORS, FONT, DemoContext, Button } from './ui.jsx'
import Dashboard from './Dashboard.jsx'
import { Welcome, GoalsForm, CsvUpload, Recommendations } from './Wizard.jsx'

const STORAGE_KEY = 'finance-app-state-v1'

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {}
}

export default function App() {
  const saved = loadState()
  const [step, setStep] = useState(saved?.step || 'welcome')
  const [goals, setGoals] = useState(saved?.goals || null)
  const [finances, setFinances] = useState(saved?.finances || null)
  const [demo, setDemo] = useState(false)
  const [dashTab, setDashTab] = useState('dashboard')

  useEffect(() => {
    saveState({ step, goals, finances })
  }, [step, goals, finances])

  function reset() {
    if (!confirm('Clear all your data and start over?')) return
    localStorage.removeItem(STORAGE_KEY)
    setStep('welcome')
    setGoals(null)
    setFinances(null)
    setDashTab('dashboard')
  }

  const isApp = step === 'dashboard'

  return (
    <DemoContext.Provider value={demo}>
      <div style={{
        background: COLORS.pageBg,
        minHeight: '100vh',
        fontFamily: FONT,
        color: COLORS.text,
      }}>
        <div style={{ maxWidth: 960, margin: '0 auto', padding: '40px 24px 80px' }}>
          {/* Top bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isApp ? 24 : 16 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: COLORS.text, letterSpacing: '-0.01em' }}>Finance Audit</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {isApp && (
                <button onClick={() => setDemo(d => !d)} style={{
                  background: demo ? COLORS.text : COLORS.card,
                  color: demo ? '#FFFFFF' : COLORS.textMuted,
                  border: `1px solid ${COLORS.cardBorder}`,
                  borderRadius: 6,
                  padding: '6px 14px',
                  fontSize: 13,
                  fontFamily: 'inherit',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}>{demo ? 'Show numbers' : 'Hide numbers'}</button>
              )}
              {(goals || finances) && (
                <button onClick={reset} style={{
                  background: 'none',
                  color: COLORS.textMuted,
                  border: `1px solid ${COLORS.cardBorder}`,
                  borderRadius: 6,
                  padding: '6px 14px',
                  fontSize: 13,
                  fontFamily: 'inherit',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}>Reset</button>
              )}
            </div>
          </div>

          {step === 'welcome' && <Welcome onStart={() => setStep('goals')} />}

          {step === 'goals' && (
            <GoalsForm
              initialGoals={goals}
              onSubmit={(g) => { setGoals(g); setStep('upload') }}
              onBack={() => setStep('welcome')}
            />
          )}

          {step === 'upload' && (
            <CsvUpload
              onSubmit={(data) => { setFinances(data); setStep('dashboard') }}
              onBack={() => setStep('goals')}
            />
          )}

          {step === 'dashboard' && (
            <>
              <div style={{ marginBottom: 8 }}>
                <h1 style={{ fontFamily: 'inherit', fontSize: 32, fontWeight: 700, margin: 0, lineHeight: 1.2, color: COLORS.text, letterSpacing: '-0.02em' }}>
                  Your financial position
                </h1>
                <p style={{ fontSize: 14, color: COLORS.textMuted, marginTop: 4 }}>Based on the data you uploaded</p>
              </div>

              <div style={{ display: 'flex', gap: 0, marginTop: 24, marginBottom: 0, borderBottom: `1px solid ${COLORS.cardBorder}` }}>
                {['dashboard', 'recommendations'].map(t => (
                  <button key={t} onClick={() => setDashTab(t)} style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    padding: '8px 16px',
                    fontSize: 14,
                    fontFamily: 'inherit',
                    fontWeight: dashTab === t ? 600 : 400,
                    color: dashTab === t ? COLORS.text : COLORS.textMuted,
                    borderBottom: dashTab === t ? `2px solid ${COLORS.text}` : '2px solid transparent',
                    marginBottom: -1,
                    transition: 'color 0.15s',
                    textTransform: 'capitalize',
                  }}>{t}</button>
                ))}
              </div>

              {dashTab === 'dashboard' && <Dashboard finances={finances} goals={goals} />}
              {dashTab === 'recommendations' && <div style={{ marginTop: 32 }}><Recommendations goals={goals} finances={finances} onBack={() => setDashTab('dashboard')} /></div>}
            </>
          )}
        </div>
      </div>
    </DemoContext.Provider>
  )
}
