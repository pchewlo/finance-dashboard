import React, { createContext, useContext, useEffect, useRef, useState } from 'react'
import { Chart, registerables } from 'chart.js'

Chart.register(...registerables)

export const COLORS = {
  bg: '#FFFFFF',
  card: '#FFFFFF',
  cardBorder: '#E8E8E6',
  accent: '#2383E2',
  accentDim: 'rgba(35,131,226,0.08)',
  green: '#0F7B6C',
  greenDim: 'rgba(15,123,108,0.08)',
  red: '#E03E3E',
  redDim: 'rgba(224,62,62,0.06)',
  blue: '#2383E2',
  blueDim: 'rgba(35,131,226,0.08)',
  purple: '#6940A5',
  purpleDim: 'rgba(105,64,165,0.08)',
  coral: '#D9730D',
  teal: '#0F7B6C',
  text: '#37352F',
  textMuted: '#787774',
  textDim: '#B4B4B0',
  gridLine: 'rgba(55,53,47,0.06)',
  pageBg: '#F7F6F3',
}

export const FONT = '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'

export const DemoContext = createContext(false)
export const useDemo = () => useContext(DemoContext)
export const blurStyle = { filter: 'blur(7px)', userSelect: 'none', pointerEvents: 'none' }

export const fmt = (v) => {
  if (v == null || isNaN(v)) return '£0'
  return '£' + Math.abs(v).toLocaleString('en-GB', { maximumFractionDigits: 0 })
}
export const fmtK = (v) => '£' + Math.round(Math.abs(v || 0) / 1000) + 'k'
export const fmtM = (v) => '£' + (Math.abs(v || 0) / 1000000).toFixed(1) + 'm'
export const pct = (v) => (v * 100).toFixed(1) + '%'

export function ChartCanvas({ id, config, height = 280 }) {
  const ref = useRef(null)
  const chartRef = useRef(null)
  const demo = useDemo()
  useEffect(() => {
    if (chartRef.current) chartRef.current.destroy()
    chartRef.current = new Chart(ref.current, config)
    return () => { if (chartRef.current) chartRef.current.destroy() }
  }, [JSON.stringify(config)])
  return (
    <div style={{ position: 'relative', width: '100%', height, ...(demo ? blurStyle : {}) }}>
      <canvas ref={ref} id={id} />
    </div>
  )
}

export function MetricCard({ label, value, sub, color }) {
  const demo = useDemo()
  return (
    <div style={{
      background: COLORS.card,
      border: `1px solid ${COLORS.cardBorder}`,
      borderRadius: 8,
      padding: '20px 24px',
      flex: 1,
      minWidth: 180,
      boxShadow: 'rgba(15,15,15,0.04) 0px 1px 3px',
    }}>
      <div style={{ fontSize: 12, color: COLORS.textMuted, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 28, fontFamily: 'inherit', fontWeight: 700, color: color || COLORS.text, lineHeight: 1.1, ...(demo ? blurStyle : {}) }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: color || COLORS.textMuted, marginTop: 6, ...(demo ? blurStyle : {}) }}>{sub}</div>}
    </div>
  )
}

export function SectionTitle({ children }) {
  return <h2 style={{ fontFamily: 'inherit', fontSize: 18, color: COLORS.text, margin: '48px 0 16px', fontWeight: 600, letterSpacing: '-0.01em' }}>{children}</h2>
}

export function Legend({ items }) {
  const demo = useDemo()
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px 20px', marginTop: 12, ...(demo ? blurStyle : {}) }}>
      {items.map(([label, color], i) => (
        <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: COLORS.textMuted }}>
          <span style={{ width: 10, height: 10, borderRadius: 2, background: color, display: 'inline-block', flexShrink: 0 }} />
          {label}
        </span>
      ))}
    </div>
  )
}

export function DataRow({ label, value, sub, color, bold }) {
  const demo = useDemo()
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
      padding: '12px 0',
      borderBottom: `1px solid ${COLORS.cardBorder}`,
      gap: 16,
    }}>
      <div>
        <span style={{ fontSize: 14, color: COLORS.text, fontWeight: bold ? 600 : 400 }}>{label}</span>
        {sub && <span style={{ fontSize: 12, color: COLORS.textMuted, marginLeft: 8 }}>{sub}</span>}
      </div>
      <span style={{ fontSize: 14, fontFamily: 'inherit', fontWeight: 600, color: color || COLORS.text, fontVariantNumeric: 'tabular-nums', textAlign: 'right', ...(demo ? blurStyle : {}) }}>{value}</span>
    </div>
  )
}

export function Card({ children, style }) {
  return (
    <div style={{
      background: COLORS.card,
      border: `1px solid ${COLORS.cardBorder}`,
      borderRadius: 8,
      padding: '24px 28px',
      boxShadow: 'rgba(15,15,15,0.04) 0px 1px 3px',
      ...style,
    }}>
      {children}
    </div>
  )
}

export function Tag({ children, color }) {
  const colorMap = {
    red: { fg: '#E03E3E', bg: 'rgba(224,62,62,0.08)' },
    orange: { fg: '#D9730D', bg: 'rgba(217,115,13,0.08)' },
    green: { fg: '#0F7B6C', bg: 'rgba(15,123,108,0.08)' },
    blue: { fg: '#2383E2', bg: 'rgba(35,131,226,0.08)' },
    purple: { fg: '#6940A5', bg: 'rgba(105,64,165,0.08)' },
  }
  const c = colorMap[color] || colorMap.blue
  return (
    <span style={{ display: 'inline-block', fontSize: 12, fontWeight: 500, color: c.fg, background: c.bg, padding: '2px 8px', borderRadius: 3, lineHeight: '20px' }}>{children}</span>
  )
}

export function Button({ children, onClick, variant = 'primary', disabled, style }) {
  const variants = {
    primary: { background: COLORS.text, color: '#FFFFFF', border: `1px solid ${COLORS.text}` },
    secondary: { background: COLORS.card, color: COLORS.text, border: `1px solid ${COLORS.cardBorder}` },
    ghost: { background: 'transparent', color: COLORS.textMuted, border: `1px solid transparent` },
  }
  return (
    <button onClick={onClick} disabled={disabled} style={{
      ...variants[variant],
      borderRadius: 6,
      padding: '10px 20px',
      fontSize: 14,
      fontFamily: 'inherit',
      fontWeight: 500,
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.5 : 1,
      transition: 'all 0.15s',
      ...style,
    }}>{children}</button>
  )
}

export function LoadingState({ messages, title }) {
  const [idx, setIdx] = useState(0)
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    const messageInterval = setInterval(() => {
      setIdx(i => (i + 1) % messages.length)
    }, 2400)
    const timeInterval = setInterval(() => {
      setElapsed(e => e + 1)
    }, 1000)
    return () => {
      clearInterval(messageInterval)
      clearInterval(timeInterval)
    }
  }, [messages.length])

  return (
    <>
      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
        .shimmer-text {
          background: linear-gradient(90deg, ${COLORS.text} 0%, ${COLORS.text} 40%, ${COLORS.textDim} 50%, ${COLORS.text} 60%, ${COLORS.text} 100%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: shimmer 2.5s linear infinite;
        }
        .loading-dot {
          animation: pulse 1.4s ease-in-out infinite;
        }
        .loading-dot:nth-child(2) { animation-delay: 0.2s; }
        .loading-dot:nth-child(3) { animation-delay: 0.4s; }
        .fade-in {
          animation: fadeIn 0.4s ease-out;
        }
      `}</style>
      <Card style={{ textAlign: 'center', padding: '56px 32px' }}>
        <div style={{ display: 'inline-flex', gap: 6, marginBottom: 24 }}>
          <span className="loading-dot" style={{ width: 8, height: 8, borderRadius: '50%', background: COLORS.text, display: 'inline-block' }} />
          <span className="loading-dot" style={{ width: 8, height: 8, borderRadius: '50%', background: COLORS.text, display: 'inline-block' }} />
          <span className="loading-dot" style={{ width: 8, height: 8, borderRadius: '50%', background: COLORS.text, display: 'inline-block' }} />
        </div>
        {title && (
          <div className="shimmer-text" style={{ fontSize: 20, fontWeight: 600, marginBottom: 12, letterSpacing: '-0.01em' }}>
            {title}
          </div>
        )}
        <div key={idx} className="fade-in" style={{ fontSize: 14, color: COLORS.textMuted, minHeight: 22 }}>
          {messages[idx]}
        </div>
        <div style={{ fontSize: 11, color: COLORS.textDim, marginTop: 24, letterSpacing: '0.05em' }}>
          {elapsed}s elapsed
        </div>
      </Card>
    </>
  )
}

export const chartDefaults = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: '#FFFFFF',
      titleColor: '#37352F',
      bodyColor: '#37352F',
      borderColor: '#E8E8E6',
      borderWidth: 1,
      cornerRadius: 6,
      padding: 10,
      titleFont: { weight: '600', family: '"Inter"' },
      bodyFont: { family: '"Inter"' },
      boxPadding: 4,
    },
  },
  scales: {
    x: { grid: { color: COLORS.gridLine }, ticks: { color: COLORS.textMuted, font: { size: 11, family: '"Inter"' } } },
    y: { grid: { color: COLORS.gridLine }, ticks: { color: COLORS.textMuted, font: { size: 11, family: '"Inter"' } } },
  },
}
