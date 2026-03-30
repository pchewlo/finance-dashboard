import React, { createContext, useContext, useEffect, useRef, useState } from 'react'
import { Chart, registerables } from 'chart.js'

Chart.register(...registerables)

const DemoContext = createContext(false)
const useDemo = () => useContext(DemoContext)

const blurStyle = { filter: 'blur(7px)', userSelect: 'none', pointerEvents: 'none' }

const COLORS = {
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
}

const fmt = (v) => '£' + Math.abs(v).toLocaleString('en-GB', { maximumFractionDigits: 0 })
const fmtK = (v) => '£' + Math.round(Math.abs(v) / 1000) + 'k'
const fmtM = (v) => '£' + (Math.abs(v) / 1000000).toFixed(1) + 'm'
const pct = (v) => (v * 100).toFixed(1) + '%'

function ChartCanvas({ id, config, height = 280 }) {
  const ref = useRef(null)
  const chartRef = useRef(null)
  const demo = useDemo()
  useEffect(() => {
    if (chartRef.current) chartRef.current.destroy()
    chartRef.current = new Chart(ref.current, config)
    return () => { if (chartRef.current) chartRef.current.destroy() }
  }, [])
  return (
    <div style={{ position: 'relative', width: '100%', height, ...(demo ? blurStyle : {}) }}>
      <canvas ref={ref} id={id} />
    </div>
  )
}

function MetricCard({ label, value, sub, color }) {
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

function SectionTitle({ children }) {
  return <h2 style={{ fontFamily: 'inherit', fontSize: 18, color: COLORS.text, margin: '48px 0 16px', fontWeight: 600, letterSpacing: '-0.01em' }}>{children}</h2>
}

function Legend({ items }) {
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

function DataRow({ label, value, sub, color, bold }) {
  const demo = useDemo()
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
      padding: '12px 0',
      borderBottom: `1px solid ${COLORS.cardBorder}`,
    }}>
      <div>
        <span style={{ fontSize: 14, color: COLORS.text, fontWeight: bold ? 600 : 400 }}>{label}</span>
        {sub && <span style={{ fontSize: 12, color: COLORS.textMuted, marginLeft: 8 }}>{sub}</span>}
      </div>
      <span style={{ fontSize: 14, fontFamily: 'inherit', fontWeight: 600, color: color || COLORS.text, fontVariantNumeric: 'tabular-nums', ...(demo ? blurStyle : {}) }}>{value}</span>
    </div>
  )
}

function Card({ children, style }) {
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

const chartDefaults = {
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

function monthlyPayment(principal, rate, years) {
  const r = rate / 12
  const n = years * 12
  return principal * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1)
}

function sdlt(price) {
  let tax = 0
  if (price > 125000) tax += (Math.min(price, 250000) - 125000) * 0.02
  if (price > 250000) tax += (Math.min(price, 925000) - 250000) * 0.05
  if (price > 925000) tax += (Math.min(price, 1500000) - 925000) * 0.10
  return tax
}

export default function App() {
  const [activeTab, setActiveTab] = useState('overview')
  const [demo, setDemo] = useState(false)

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'portfolio', label: 'Portfolio' },
    { id: 'cashflow', label: 'Cash Flow' },
    { id: 'property', label: 'York Purchase' },
    { id: 'projection', label: 'Projection' },
  ]

  return (
    <DemoContext.Provider value={demo}>
    <div style={{
      background: '#F7F6F3',
      minHeight: '100vh',
      fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      color: COLORS.text,
    }}>
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '40px 24px 80px' }}>
        {/* Header */}
        <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 12, color: COLORS.textMuted, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Financial Audit</div>
            <h1 style={{ fontFamily: 'inherit', fontSize: 32, fontWeight: 700, margin: 0, lineHeight: 1.2, color: COLORS.text, letterSpacing: '-0.02em' }}>
              March 2026
            </h1>
            <p style={{ fontSize: 14, color: COLORS.textMuted, marginTop: 4 }}>Thomas Littler — Complete financial position</p>
          </div>
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
            transition: 'all 0.15s',
            whiteSpace: 'nowrap',
          }}>{demo ? 'Show numbers' : 'Hide numbers'}</button>
        </div>

        {/* Nav */}
        <div style={{ display: 'flex', gap: 0, marginTop: 32, marginBottom: 40, borderBottom: `1px solid ${COLORS.cardBorder}`, paddingBottom: 0 }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '8px 16px',
              fontSize: 14,
              fontFamily: 'inherit',
              fontWeight: activeTab === t.id ? 600 : 400,
              color: activeTab === t.id ? COLORS.text : COLORS.textMuted,
              borderBottom: activeTab === t.id ? `2px solid ${COLORS.text}` : '2px solid transparent',
              marginBottom: -1,
              transition: 'color 0.15s',
            }}>{t.label}</button>
          ))}
        </div>

        {activeTab === 'overview' && <OverviewTab />}
        {activeTab === 'portfolio' && <PortfolioTab />}
        {activeTab === 'cashflow' && <CashFlowTab />}
        {activeTab === 'property' && <PropertyTab />}
        {activeTab === 'projection' && <ProjectionTab />}
      </div>
    </div>
    </DemoContext.Provider>
  )
}

function OverviewTab() {
  const demo = useDemo()
  return (
    <>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
        <MetricCard label="Net Worth" value="£1,559,928" sub="31% toward £5m goal" color={COLORS.accent} />
        <MetricCard label="Liquid Investments" value="£1,158,097" sub="Vanguard portfolio" />
        <MetricCard label="Unrealised Gain" value="£162,254" sub="+16.3% on cost" color={COLORS.green} />
        <MetricCard label="Home Equity" value="£397,525" sub="£690k value — £292k mortgage" />
      </div>

      <SectionTitle>Net worth composition</SectionTitle>
      <Card>
        <ChartCanvas id="nwBar" height={300} config={{
          type: 'bar',
          data: {
            labels: ['GIA — S&P 500', 'Home Equity', 'GIA — Money Mkt', 'ISA', 'Pension', 'GIA — EM', 'Cash'],
            datasets: [{
              data: [761835, 397525, 203448, 73497, 66918, 52398, 4306],
              backgroundColor: [COLORS.blue, COLORS.coral, COLORS.teal, COLORS.green, COLORS.purple, '#D9730D', COLORS.textDim],
              borderRadius: 4, barPercentage: 0.65,
            }]
          },
          options: {
            ...chartDefaults, indexAxis: 'y',
            plugins: { legend: { display: false }, tooltip: { callbacks: { label: v => fmt(v.raw) } } },
            scales: {
              x: { ...chartDefaults.scales.x, ticks: { ...chartDefaults.scales.x.ticks, callback: v => fmtK(v) } },
              y: { ...chartDefaults.scales.y, grid: { display: false } },
            },
          }
        }} />
        <Legend items={[
          ['S&P 500 / VUAG £762k', COLORS.blue],
          ['Home equity £398k', COLORS.coral],
          ['Money market £203k', COLORS.teal],
          ['ISA £73k', COLORS.green],
          ['Pension £67k', COLORS.purple],
          ['Emerging markets £52k', COLORS.accent],
        ]} />
      </Card>

      <SectionTitle>Key findings</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
        <Card style={{ borderLeft: '3px solid #E03E3E' }}>
          <div style={{ marginBottom: 12 }}>
            <span style={{ display: 'inline-block', fontSize: 12, fontWeight: 500, color: '#E03E3E', background: 'rgba(224,62,62,0.08)', padding: '2px 8px', borderRadius: 3, lineHeight: '20px' }}>Critical</span>
          </div>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8, color: COLORS.text }}>Wrapper inefficiency</div>
          <div style={{ fontSize: 13, color: COLORS.textMuted, lineHeight: 1.65, ...(demo ? blurStyle : {}) }}>
            87.9% of your Vanguard portfolio sits in a taxable GIA. ISA holds only 6.3%. You have ~£148k in unrealised gains exposed to CGT. A Bed & ISA programme sheltering £20k/year should start immediately.
          </div>
        </Card>
        <Card style={{ borderLeft: '3px solid #D9730D' }}>
          <div style={{ marginBottom: 12 }}>
            <span style={{ display: 'inline-block', fontSize: 12, fontWeight: 500, color: '#D9730D', background: 'rgba(217,115,13,0.08)', padding: '2px 8px', borderRadius: 3, lineHeight: '20px' }}>Action</span>
          </div>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8, color: COLORS.text }}>Mortgage reset — May 2027</div>
          <div style={{ fontSize: 13, color: COLORS.textMuted, lineHeight: 1.65, ...(demo ? blurStyle : {}) }}>
            Your 1.4% Santander deal ends May 2027. Current 5-year fixes are ~4.4%. Monthly payment jumps from £1,139 to ~£1,650. Start researching products by Nov 2026.
          </div>
        </Card>
        <Card style={{ borderLeft: '3px solid #0F7B6C' }}>
          <div style={{ marginBottom: 12 }}>
            <span style={{ display: 'inline-block', fontSize: 12, fontWeight: 500, color: '#0F7B6C', background: 'rgba(15,123,108,0.08)', padding: '2px 8px', borderRadius: 3, lineHeight: '20px' }}>Opportunity</span>
          </div>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8, color: COLORS.text }}>£150k money market drag</div>
          <div style={{ fontSize: 13, color: COLORS.textMuted, lineHeight: 1.65, ...(demo ? blurStyle : {}) }}>
            After the Porsche (~£50k), £150k remains in Sterling Money Market earning ~4.5%. Equities return ~7% long-run. The gap on £150k is ~£4k/year compounding. Deploy or accept the drag consciously.
          </div>
        </Card>
        <Card>
          <div style={{ marginBottom: 12 }}>
            <span style={{ display: 'inline-block', fontSize: 12, fontWeight: 500, color: '#0F7B6C', background: 'rgba(15,123,108,0.08)', padding: '2px 8px', borderRadius: 3, lineHeight: '20px' }}>On Track</span>
          </div>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8, color: COLORS.text }}>Pension contributions</div>
          <div style={{ fontSize: 13, color: COLORS.textMuted, lineHeight: 1.65, ...(demo ? blurStyle : {}) }}>
            £2,125/month employer contributions flowing. HMRC tax relief arriving correctly. Salary sacrificed to £63,750 — well below £100k threshold for childcare entitlements.
          </div>
        </Card>
      </div>
    </>
  )
}

function PortfolioTab() {
  const demo = useDemo()
  const holdings = [
    { name: 'S&P 500 UCITS ETF (VUAG)', account: 'ISA + GIA', weight: 70.02, cost: 679264, value: 810898, change: 131634 },
    { name: 'Sterling Money Market Fund', account: 'GIA', weight: 17.57, cost: 196300, value: 203448, change: 7148 },
    { name: 'LifeStrategy 100% Equity', account: 'ISA + Pension', weight: 7.63, cost: 78128, value: 88307, change: 10179 },
    { name: 'Emerging Markets Stock Index', account: 'GIA', weight: 4.52, cost: 39000, value: 52398, change: 13398 },
    { name: 'LifeStrategy Global 100%', account: 'Pension', weight: 0.26, cost: 3125, value: 3019, change: -106 },
  ]

  return (
    <>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
        <MetricCard label="Portfolio Value" value="£1,158,097" sub="As of 27 March 2026" />
        <MetricCard label="Total Cost" value="£995,843" sub="Capital deployed" />
        <MetricCard label="Total Return" value="£162,254" sub="+16.3%" color={COLORS.green} />
      </div>

      <SectionTitle>Holdings</SectionTitle>
      <Card>
        {holdings.map((h, i) => (
          <div key={i} style={{
            display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', alignItems: 'center',
            padding: '14px 0',
            borderBottom: i < holdings.length - 1 ? `1px solid ${COLORS.cardBorder}` : 'none',
            fontSize: 13,
          }}>
            <div>
              <div style={{ fontWeight: 500 }}>{h.name}</div>
              <div style={{ fontSize: 11, color: COLORS.textMuted }}>{h.account}</div>
            </div>
            <div style={{ color: COLORS.textMuted, textAlign: 'right' }}>{h.weight}%</div>
            <div style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', ...(demo ? blurStyle : {}) }}>{fmt(h.cost)}</div>
            <div style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', ...(demo ? blurStyle : {}) }}>{fmt(h.value)}</div>
            <div style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: h.change >= 0 ? COLORS.green : COLORS.red, ...(demo ? blurStyle : {}) }}>
              {h.change >= 0 ? '+' : '-'}{fmt(h.change)}
            </div>
          </div>
        ))}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', padding: '14px 0', fontSize: 13, fontWeight: 600, borderTop: `2px solid ${COLORS.cardBorder}` }}>
          <div>Total</div>
          <div style={{ textAlign: 'right' }}>100%</div>
          <div style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', ...(demo ? blurStyle : {}) }}>£995,843</div>
          <div style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', ...(demo ? blurStyle : {}) }}>£1,158,097</div>
          <div style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: COLORS.green, ...(demo ? blurStyle : {}) }}>+£162,254</div>
        </div>
      </Card>

      <SectionTitle>Wrapper allocation</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Card>
          <ChartCanvas id="wrapperDonut" height={240} config={{
            type: 'doughnut',
            data: {
              labels: ['GIA (taxable)', 'ISA (tax-free)', 'Pension (deferred)'],
              datasets: [{ data: [1017681, 73497, 66918], backgroundColor: [COLORS.red, COLORS.green, COLORS.purple], borderWidth: 0 }]
            },
            options: {
              responsive: true, maintainAspectRatio: false, cutout: '65%',
              plugins: { legend: { display: false }, tooltip: { callbacks: { label: v => v.label + ': ' + fmt(v.raw) } } },
            }
          }} />
          <Legend items={[
            ['GIA (taxable) — 87.9%', COLORS.red],
            ['ISA (tax-free) — 6.3%', COLORS.green],
            ['Pension (deferred) — 5.8%', COLORS.purple],
          ]} />
        </Card>
        <Card>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Wrapper breakdown</div>
          <DataRow label="GIA" sub="S&P 500, EM, Money Mkt" value="£1,017,681" color={COLORS.red} />
          <DataRow label="ISA" sub="VUAG, LS100" value="£73,497" color={COLORS.green} />
          <DataRow label="Pension" sub="LS100, LS Global" value="£66,918" color={COLORS.purple} />
          <DataRow label="Cash" sub="Vanguard accounts" value="£27" />
          <div style={{ marginTop: 20, padding: '14px 16px', background: 'rgba(224,62,62,0.04)', borderRadius: 4, borderLeft: '3px solid #E03E3E' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: COLORS.red, marginBottom: 4 }}>GIA CGT exposure</div>
            <div style={{ fontSize: 13, color: COLORS.textMuted, lineHeight: 1.5, ...(demo ? blurStyle : {}) }}>
              ~£148k unrealised gain. At 20% CGT above £3k allowance = ~£29k potential tax liability. Bed & ISA £20k/year to shelter.
            </div>
          </div>
        </Card>
      </div>
    </>
  )
}

function CashFlowTab() {
  const months = ['Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar']
  const income = [4900, 0, 6000, 7500, 7000, 7000, 7000, 5500, 6900, 6800]
  const outgoing = [7707, 7994, 16007, 20298, 25074, 10057, 10040, 7033, 9694, 10741]

  const avgIncome = income.reduce((a, b) => a + b) / income.filter(x => x > 0).length
  const avgSpend = outgoing.reduce((a, b) => a + b) / outgoing.length

  return (
    <>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
        <MetricCard label="GL Products Income" value="~£6,500/mo" sub="Avg. over 10 months (excl. zero months)" color={COLORS.green} />
        <MetricCard label="Avg Monthly Outgoing" value={fmtK(avgSpend) + '/mo'} sub="Incl. investments & transfers" />
        <MetricCard label="Monzo Balance" value="−£2,245" sub="Main account (excl. Pots)" color={COLORS.red} />
        <MetricCard label="Pots" value="£6,551" sub="Savings pots" />
      </div>

      <SectionTitle>Monthly cash flow — Monzo</SectionTitle>
      <Card>
        <ChartCanvas id="cashflow" height={300} config={{
          type: 'bar',
          data: {
            labels: months,
            datasets: [
              { label: 'Income', data: income, backgroundColor: COLORS.green, borderRadius: 3, barPercentage: 0.75 },
              { label: 'Outgoing', data: outgoing.map(v => -v), backgroundColor: COLORS.red, borderRadius: 3, barPercentage: 0.75 },
            ]
          },
          options: {
            ...chartDefaults,
            plugins: { legend: { display: false }, tooltip: { callbacks: { label: v => (v.raw < 0 ? '-' : '') + fmt(v.raw) } } },
            scales: {
              x: { ...chartDefaults.scales.x, grid: { display: false } },
              y: { ...chartDefaults.scales.y, ticks: { ...chartDefaults.scales.y.ticks, callback: v => (v < 0 ? '-' : '') + fmtK(v) } },
            },
          }
        }} />
        <Legend items={[['GL Products income', COLORS.green], ['Total outgoing', COLORS.red]]} />
      </Card>

      <SectionTitle>Recurring subscriptions</SectionTitle>
      <Card>
        <DataRow label="YouTube Premium" value="~£13/mo" />
        <DataRow label="Audible" value="£8.99/mo" />
        <DataRow label="Adobe" value="£67/mo" />
        <DataRow label="Vodafone" value="£32/mo" />
        <DataRow label="Readwise" value="~£4/mo" />
        <DataRow label="PlayStation" value="~£13/mo" />
        <DataRow label="Fitness Costablanca" value="~£82/mo" />
        <DataRow label="Club Lucha (BJJ)" value="~£56/mo" />
        <DataRow label="Estimated total" value="~£276/mo" bold color={COLORS.accent} />
      </Card>
    </>
  )
}

function PropertyTab() {
  const demo = useDemo()
  const deposit = 584000

  const properties = [
    { name: 'Southlands Road', price: 775000, achievable: 750000, beds: 4, baths: 2, sqft: '~1,800 usable', band: 'E', type: 'Mid terrace townhouse' },
    { name: 'Nunthorpe Avenue', price: 875000, achievable: 825000, beds: 5, baths: 3, sqft: '~2,300 est.', band: 'F', type: 'End terrace townhouse' },
  ]

  return (
    <>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
        <MetricCard label="London Sale (net)" value="£384,000" sub="£690k − £292k mortgage − £14k costs" />
        <MetricCard label="Clara's Contribution" value="£200,000" />
        <MetricCard label="Combined Deposit" value="£584,000" sub="Before stamp duty" color={COLORS.accent} />
      </div>

      <SectionTitle>Property comparison</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {properties.map((p, i) => {
          const stampDuty = sdlt(p.achievable)
          const depositUsed = deposit - stampDuty
          const mortgage = p.achievable - depositUsed
          const ltv = (mortgage / p.achievable * 100).toFixed(0)
          const monthly = monthlyPayment(Math.max(0, mortgage), 0.044, 25)
          const isRecommended = i === 1

          return (
            <Card key={i} style={isRecommended ? { border: `2px solid ${COLORS.accent}` } : {}}>
              {isRecommended && (
                <div style={{ marginBottom: 12 }}>
                  <span style={{ display: 'inline-block', fontSize: 12, fontWeight: 500, color: '#2383E2', background: 'rgba(35,131,226,0.08)', padding: '2px 8px', borderRadius: 3, lineHeight: '20px' }}>Recommended</span>
                </div>
              )}
              <div style={{ fontFamily: 'inherit', fontSize: 18, fontWeight: 600, marginBottom: 4 }}>{p.name}</div>
              <div style={{ fontSize: 13, color: COLORS.textMuted, marginBottom: 20 }}>{p.type} — {p.beds} bed, {p.baths} bath — {p.sqft}</div>

              <DataRow label="Asking price" value={fmt(p.price)} />
              <DataRow label="Achievable price" value={fmt(p.achievable)} color={COLORS.green} />
              <DataRow label="Stamp duty" value={fmt(stampDuty)} color={COLORS.red} />
              <DataRow label="Mortgage required" value={mortgage > 0 ? fmt(mortgage) : '£0'} />
              <DataRow label="LTV" value={ltv + '%'} />
              <DataRow label="Monthly payment" sub="5yr fix @ 4.4%, 25yr" value={fmt(monthly) + '/mo'} bold color={COLORS.accent} />
              <DataRow label="Council tax band" value={'Band ' + p.band} />
            </Card>
          )
        })}
      </div>

      <SectionTitle>Stamp duty — main residence rates</SectionTitle>
      <Card>
        <ChartCanvas id="sdltChart" height={220} config={{
          type: 'line',
          data: {
            labels: Array.from({ length: 17 }, (_, i) => fmtK((i + 4) * 50000)),
            datasets: [{
              data: Array.from({ length: 17 }, (_, i) => sdlt((i + 4) * 50000)),
              borderColor: COLORS.accent,
              backgroundColor: COLORS.accentDim,
              fill: true,
              tension: 0.3,
              pointRadius: 2,
              pointBackgroundColor: COLORS.accent,
            }]
          },
          options: {
            ...chartDefaults,
            plugins: { legend: { display: false }, tooltip: { callbacks: { label: v => 'SDLT: ' + fmt(v.raw) } } },
            scales: {
              x: { ...chartDefaults.scales.x, grid: { display: false }, title: { display: true, text: 'Property price', color: COLORS.textDim, font: { size: 11 } } },
              y: { ...chartDefaults.scales.y, ticks: { ...chartDefaults.scales.y.ticks, callback: v => fmtK(v) } },
            },
          }
        }} />
      </Card>

      <SectionTitle>Critical notes</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Card style={{ borderLeft: '3px solid #E03E3E' }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: COLORS.red }}>Sell London first</div>
          <div style={{ fontSize: 13, color: COLORS.textMuted, lineHeight: 1.65, ...(demo ? blurStyle : {}) }}>
            If you buy York before selling London, you'll face a 5% additional property surcharge — ~£41k on an £825k purchase. Reclaim within 36 months, but capital is locked. Sequence correctly to avoid.
          </div>
        </Card>
        <Card style={{ borderLeft: '3px solid #D9730D' }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: COLORS.coral }}>PPR relief — check tax residency</div>
          <div style={{ fontSize: 13, color: COLORS.textMuted, lineHeight: 1.65, ...(demo ? blurStyle : {}) }}>
            You've been living in Spain and applying for residency. If HMRC treats Spain as your main residence, you could lose full Principal Private Residence relief on the London sale and owe CGT. Get tax advice before selling.
          </div>
        </Card>
      </div>
    </>
  )
}

function ProjectionTab() {
  const years = Array.from({ length: 16 }, (_, i) => 2026 + i)

  function project(rate, monthly = 4200) {
    let v = 1158097
    return years.map((y, i) => {
      if (i > 0) v = v * (1 + rate) + monthly * 12
      return Math.round(v)
    })
  }

  const p7 = project(0.07)
  const p5 = project(0.05)
  const p7low = project(0.07, 2000)

  return (
    <>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
        <MetricCard label="Current Investments" value="£1,158,097" />
        <MetricCard label="Monthly Contributions" value="£4,200" sub="£2k savings + £2.2k pension" />
        <MetricCard label="£5m Target" value="Age ~46" sub="At 7% real return" color={COLORS.green} />
      </div>

      <SectionTitle>Path to £5m</SectionTitle>
      <Card>
        <ChartCanvas id="projection" height={340} config={{
          type: 'line',
          data: {
            labels: years,
            datasets: [
              { label: '7% return + £4.2k/mo', data: p7, borderColor: COLORS.blue, backgroundColor: 'rgba(35,131,226,0.06)', fill: true, tension: 0.3, pointRadius: 2 },
              { label: '5% return + £4.2k/mo', data: p5, borderColor: COLORS.teal, fill: false, tension: 0.3, pointRadius: 2, borderDash: [4, 4] },
              { label: '7% return + £2k/mo (children)', data: p7low, borderColor: COLORS.purple, fill: false, tension: 0.3, pointRadius: 2, borderDash: [8, 4] },
              { label: '£5m target', data: years.map(() => 5000000), borderColor: 'rgba(55,53,47,0.15)', borderDash: [6, 4], pointRadius: 0, fill: false },
            ]
          },
          options: {
            ...chartDefaults,
            plugins: {
              legend: { display: false },
              tooltip: { callbacks: { label: v => v.dataset.label + ': ' + fmt(v.raw) } },
            },
            scales: {
              x: { ...chartDefaults.scales.x, grid: { display: false } },
              y: { ...chartDefaults.scales.y, ticks: { ...chartDefaults.scales.y.ticks, callback: v => fmtM(v) }, min: 0 },
            },
          }
        }} />
        <Legend items={[
          ['7% + £4.2k/mo contributions', COLORS.blue],
          ['5% + £4.2k/mo contributions', COLORS.teal],
          ['7% + £2k/mo (reduced during children years)', COLORS.purple],
          ['£5m target', COLORS.accent],
        ]} />
      </Card>

      <SectionTitle>Scenario milestones</SectionTitle>
      <Card>
        <DataRow label="7% return + full contributions" sub="Base case" value="£5m by 2041 (age 46)" color={COLORS.green} bold />
        <DataRow label="5% return + full contributions" sub="Conservative" value="£5m by 2044 (age 49)" />
        <DataRow label="7% return + reduced contributions" sub="During children years" value="£5m by 2043 (age 48)" />
        <DataRow label="Deploy £150k money market → equities" sub="Accelerator" value="Saves ~1 year" color={COLORS.accent} />
      </Card>

      <SectionTitle>Annual action items</SectionTitle>
      <Card>
        <DataRow label="☐ Bed & ISA" sub="Sell/rebuy VUAG within ISA" value="£20,000/year" color={COLORS.green} />
        <DataRow label="☐ Pension contributions" sub="Employer via salary sacrifice" value="£25,500/year" />
        <DataRow label="☐ Personal pension top-ups" sub="Opportunistic, tax-efficient" value="Variable" />
        <DataRow label="☐ CGT harvest" sub="Use £3k annual exemption + Clara's" value="£6,000/year" />
        <DataRow label="☐ ISA for Clara" sub="If married, use her ISA allowance too" value="£20,000/year" color={COLORS.accent} />
      </Card>
    </>
  )
}
