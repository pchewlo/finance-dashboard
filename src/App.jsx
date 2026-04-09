import React, { useState, useEffect } from 'react'
import { COLORS, FONT, DemoContext, Button, useIsMobile } from './ui.jsx'
import Dashboard from './Dashboard.jsx'
import { Welcome, GoalsForm, CsvUpload, Recommendations } from './Wizard.jsx'

const STORAGE_KEY = 'finance-app-state-v2'
const LEGACY_KEYS = ['finance-app-state-v1']

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      // Clean up any legacy keys so they don't accumulate
      LEGACY_KEYS.forEach(k => { try { localStorage.removeItem(k) } catch {} })
      return null
    }
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

// Error boundary so a render bug never produces a totally blank screen
class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null } }
  static getDerivedStateFromError(error) { return { error } }
  componentDidCatch(error, info) { console.error('App crashed:', error, info) }
  reset = () => {
    try { localStorage.removeItem(STORAGE_KEY) } catch {}
    LEGACY_KEYS.forEach(k => { try { localStorage.removeItem(k) } catch {} })
    window.location.reload()
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ background: COLORS.pageBg, minHeight: '100vh', fontFamily: FONT, color: COLORS.text, padding: '60px 24px' }}>
          <div style={{ maxWidth: 560, margin: '0 auto', background: '#FFFFFF', border: `1px solid ${COLORS.cardBorder}`, borderRadius: 8, padding: '32px 36px', boxShadow: 'rgba(15,15,15,0.04) 0px 1px 3px' }}>
            <div style={{ fontSize: 12, color: '#E03E3E', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12, fontWeight: 600 }}>Something went wrong</div>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 12px', letterSpacing: '-0.01em' }}>The audit hit a snag rendering your data.</h1>
            <p style={{ fontSize: 14, color: COLORS.textMuted, lineHeight: 1.55, margin: '0 0 16px' }}>
              This can happen after an app update if your saved data is from an older version. Resetting will clear your local data and let you start a fresh audit. Your statements are not stored on our servers.
            </p>
            {this.state.error?.message && (
              <pre style={{ fontSize: 11, color: COLORS.textDim, background: COLORS.pageBg, padding: 12, borderRadius: 4, overflow: 'auto', margin: '0 0 16px' }}>{String(this.state.error.message)}</pre>
            )}
            <button onClick={this.reset} style={{
              background: COLORS.text, color: '#FFFFFF', border: 'none', borderRadius: 6,
              padding: '10px 20px', fontSize: 14, fontFamily: 'inherit', fontWeight: 500, cursor: 'pointer',
            }}>Reset and reload</button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

export default function AppWithBoundary() {
  return <ErrorBoundary><App /></ErrorBoundary>
}

function App() {
  const saved = loadState()
  const [step, setStep] = useState(saved?.step || 'welcome')
  const [goals, setGoals] = useState(saved?.goals || null)
  const [finances, setFinances] = useState(saved?.finances || null)
  const [demo, setDemo] = useState(false)
  const [view, setView] = useState('dashboard') // 'dashboard' | 'actionplan'
  const [menuOpen, setMenuOpen] = useState(false)
  const isMobile = useIsMobile()

  useEffect(() => {
    saveState({ step, goals, finances })
  }, [step, goals, finances])

  // Close menu when clicking outside
  useEffect(() => {
    if (!menuOpen) return
    const handler = () => setMenuOpen(false)
    window.addEventListener('click', handler)
    return () => window.removeEventListener('click', handler)
  }, [menuOpen])

  function reset() {
    if (!confirm('Clear all your data and start over?')) return
    localStorage.removeItem(STORAGE_KEY)
    setStep('welcome')
    setGoals(null)
    setFinances(null)
    setView('dashboard')
  }

  // If user has completed onboarding (has finances), edits return to dashboard.
  const hasCompleted = !!finances
  const isApp = step === 'dashboard'
  const isEditing = hasCompleted && (step === 'goals' || step === 'upload')

  return (
    <DemoContext.Provider value={demo}>
      <div style={{
        background: COLORS.pageBg,
        minHeight: '100vh',
        fontFamily: FONT,
        color: COLORS.text,
      }}>
        <div style={{ maxWidth: 960, margin: '0 auto', padding: isMobile ? '24px 16px 60px' : '40px 24px 80px' }}>
          {/* Top bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isApp ? 24 : 16, flexWrap: 'wrap', gap: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: COLORS.text, letterSpacing: '-0.01em' }}>Financial Audit</div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', position: 'relative' }}>
              {isApp && view === 'dashboard' && (
                <button onClick={() => setView('actionplan')} style={actionPlanBtnStyle}>
                  {isMobile ? 'Plan →' : 'Action plan →'}
                </button>
              )}
              {isApp && view === 'actionplan' && (
                <button onClick={() => setView('dashboard')} style={topBtnStyle(false)}>
                  ← Back to audit
                </button>
              )}
              {(goals || finances) && isApp && (
                <div style={{ position: 'relative' }}>
                  <button
                    onClick={(e) => { e.stopPropagation(); setMenuOpen(v => !v) }}
                    style={topBtnStyle(menuOpen)}
                    aria-label="Menu"
                  >⋯</button>
                  {menuOpen && (
                    <div style={{
                      position: 'absolute',
                      top: 'calc(100% + 6px)',
                      right: 0,
                      background: '#FFFFFF',
                      border: `1px solid ${COLORS.cardBorder}`,
                      borderRadius: 8,
                      boxShadow: 'rgba(15,15,15,0.1) 0px 8px 24px',
                      minWidth: 180,
                      overflow: 'hidden',
                      zIndex: 50,
                    }}>
                      <MenuItem onClick={() => { setStep('goals'); setMenuOpen(false) }}>Edit goals</MenuItem>
                      <MenuItem onClick={() => { setStep('upload'); setMenuOpen(false) }}>Update files</MenuItem>
                      <MenuItem onClick={() => { setDemo(d => !d); setMenuOpen(false) }}>{demo ? 'Show numbers' : 'Hide numbers'}</MenuItem>
                      <MenuItem onClick={() => { reset(); setMenuOpen(false) }} danger>Reset audit</MenuItem>
                    </div>
                  )}
                </div>
              )}
              {!isApp && (goals || finances) && (
                <button onClick={reset} style={topBtnStyle(false)}>Reset</button>
              )}
            </div>
          </div>

          {step === 'welcome' && <Welcome onStart={() => setStep('goals')} />}

          {step === 'goals' && (
            <GoalsForm
              initialGoals={goals}
              isEditing={isEditing}
              onSubmit={(g) => {
                setGoals(g)
                setStep(hasCompleted ? 'dashboard' : 'upload')
              }}
              onBack={() => setStep(hasCompleted ? 'dashboard' : 'welcome')}
            />
          )}

          {step === 'upload' && (
            <CsvUpload
              isEditing={isEditing}
              onSubmit={(data) => {
                setFinances(data)
                setStep('dashboard')
                setView('dashboard')
              }}
              onBack={() => setStep(hasCompleted ? 'dashboard' : 'goals')}
            />
          )}

          {step === 'dashboard' && (
            <>
              <div style={{ marginBottom: 8 }}>
                <h1 style={{ fontFamily: 'inherit', fontSize: isMobile ? 24 : 32, fontWeight: 700, margin: 0, lineHeight: 1.2, color: COLORS.text, letterSpacing: '-0.02em' }}>
                  {view === 'dashboard' ? 'Your audit' : 'Your action plan'}
                </h1>
                <p style={{ fontSize: 14, color: COLORS.textMuted, marginTop: 4 }}>
                  {view === 'dashboard' ? 'Based on the data you uploaded' : 'Personalized recommendations from your audit'}
                </p>
              </div>

              {view === 'dashboard' && (
                <Dashboard
                  finances={finances}
                  goals={goals}
                  onOpenActionPlan={() => setView('actionplan')}
                />
              )}
              {view === 'actionplan' && (
                <div style={{ marginTop: 24 }}>
                  <Recommendations goals={goals} finances={finances} onBack={() => setView('dashboard')} />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </DemoContext.Provider>
  )
}

function MenuItem({ children, onClick, danger }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'block',
        width: '100%',
        textAlign: 'left',
        background: 'none',
        border: 'none',
        padding: '10px 16px',
        fontSize: 13,
        fontFamily: 'inherit',
        color: danger ? '#E03E3E' : COLORS.text,
        cursor: 'pointer',
      }}
      onMouseEnter={(e) => e.currentTarget.style.background = COLORS.pageBg}
      onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
    >{children}</button>
  )
}

const actionPlanBtnStyle = {
  background: '#2383E2',
  color: '#FFFFFF',
  border: '1px solid #2383E2',
  borderRadius: 6,
  padding: '7px 16px',
  fontSize: 13,
  fontFamily: 'inherit',
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'all 0.15s',
}

function topBtnStyle(active) {
  return {
    background: active ? COLORS.text : COLORS.card,
    color: active ? '#FFFFFF' : COLORS.textMuted,
    border: `1px solid ${COLORS.cardBorder}`,
    borderRadius: 6,
    padding: '6px 14px',
    fontSize: 13,
    fontFamily: 'inherit',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.15s',
  }
}
