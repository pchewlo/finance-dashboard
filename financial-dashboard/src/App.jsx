import React, { useEffect, useRef, useState } from 'react'
import { Chart, registerables } from 'chart.js'

Chart.register(...registerables)

const COLORS = {
  bg: '#0C0F0A',
  card: '#141812',
  cardBorder: '#1E2419',
  accent: '#C4A55A',
  accentDim: 'rgba(196,165,90,0.15)',
  green: '#4CAF7D',
  greenDim: 'rgba(76,175,125,0.15)',
  red: '#D4574E',
  redDim: 'rgba(212,87,78,0.15)',
  blue: '#5B8DB8',
  blueDim: 'rgba(91,141,184,0.15)',
  purple: '#8B7BB8',
  purpleDim: 'rgba(139,123,184,0.15)',
  coral: '#D4825A',
  teal: '#5AAFAF',
  text: '#E8E4DB',
  textMuted: '#8A8677',
  textDim: '#5A5747',
  gridLine: 'rgba(255,255,255,0.04)',
}

const fmt = (v) => '£' + Math.abs(v).toLocaleString('en-GB', { maximumFractionDigits: 0 })
const fmtK = (v) => '£' + Math.round(Math.abs(v) / 1000) + 'k'
const fmtM = (v) => '£' + (Math.abs(v) / 1000000).toFixed(1) + 'm'
const pct = (v) => (v * 100).toFixed(1) + '%'

function ChartCanvas({ id, config, height = 280 }) {
  const ref = useRef(null)
  const chartRef = useRef(null)
  useEffect(() => {
    if (chartRef.current) chartRef.current.destroy()
    chartRef.current = new Chart(ref.current, config)
    return () => { if (chartRef.current) chartRef.current.destroy() }
  }, [])
  return (
    <div style={{ position: 'relative', width: '100%', height }}>
      <canvas ref={ref} id={id} />
    </div>
  )
}

function MetricCard({ label, value, sub, color }) {
  return (
    <div style={{
      background: COLORS.card,
      border: `1px solid ${COLORS.cardBorder}`,
      borderRadius: 12,
      padding: '20px 24px',
      flex: 1,
      minWidth: 180,
    }}>
      <div style={{ fontSize: 12, color: COLORS.textMuted, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 28, fontFamily: '"DM Serif Display", serif', color: color || COLORS.text, lineHeight: 1.1 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: color || COLORS.textMuted, marginTop: 6 }}>{sub}</div>}
    </div>
  )
}

function SectionTitle({ children }) {
  return <h2 style={{ fontFamily: '"DM Serif Display", serif', fontSize: 22, color: COLORS.text, margin: '48px 0 20px', fontWeight: 400 }}>{children}</h2>
}

function Legend({ items }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px 20px', marginTop: 12 }}>
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
      <span style={{ fontSize: 14, fontFamily: '"DM Sans", sans-serif', fontWeight: 600, color: color || COLORS.text, fontVariantNumeric: 'tabular-nums' }}>{value}</span>
    </div>
  )
}

function Card({ children, style }) {
  return (
    <div style={{
      background: COLORS.card,
      border: `1px solid ${COLORS.cardBorder}`,
      borderRadius: 12,
      padding: '24px 28px',
      ...style,
    }}>
      {children}
    </div>
  )
}

const chartDefaults = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    x: { grid: { color: COLORS.gridLine }, ticks: { color: COLORS.textDim, font: { size: 11, family: '"DM Sans"' } } },
    y: { grid: { color: COLORS.gridLine }, ticks: { color: COLORS.textDim, font: { size: 11, family: '"DM Sans"' } } },
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

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'portfolio', label: 'Portfolio' },
    { id: 'cashflow', label: 'Cash Flow' },
    { id: 'property', label: 'York Purchase' },
    { id: 'projection', label: 'Projection' },
  ]

  return (
    <div style={{
      background: COLORS.bg,
      minHeight: '100vh',
      fontFamily: '"DM Sans", sans-serif',
      color: COLORS.text,
    }}>
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '40px 24px 80px' }}>
        {/* Header */}
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 12, color: COLORS.accent, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 8 }}>Financial Audit</div>
          <h1 style={{ fontFamily: '"DM Serif Display", serif', fontSize: 36, fontWeight: 400, margin: 0, lineHeight: 1.15 }}>
            March 2026
          </h1>
          <p style={{ fontSize: 14, color: COLORS.textMuted, marginTop: 8 }}>Thomas Littler — Complete financial position</p>
        </div>

        {/* Nav */}
        <div style={{ display: 'flex', gap: 4, marginTop: 32, marginBottom: 40, borderBottom: `1px solid ${COLORS.cardBorder}`, paddingBottom: 0 }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '10px 18px',
              fontSize: 13,
              fontFamily: '"DM Sans", sans-serif',
              fontWeight: activeTab === t.id ? 600 : 400,
              color: activeTab === t.id ? COLORS.accent : COLORS.textMuted,
              borderBottom: activeTab === t.id ? `2px solid ${COLORS.accent}` : '2px solid transparent',
              marginBottom: -1,
              transition: 'all 0.2s',
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
  )
}

function OverviewTab() {
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
              backgroundColor: [COLORS.blue, COLORS.coral, COLORS.teal, COLORS.green, COLORS.purple, COLORS.accent, COLORS.textDim],
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
        <Card>
          <div style={{ fontSize: 12, color: COLORS.red, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>Critical</div>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Wrapper inefficiency</div>
          <div style={{ fontSize: 13, color: COLORS.textMuted, lineHeight: 1.6 }}>
            87.9% of your Vanguard portfolio sits in a taxable GIA. ISA holds only 6.3%. You have ~£148k in unrealised gains exposed to CGT. A Bed & ISA programme sheltering £20k/year should start immediately.
          </div>
        </Card>
        <Card>
          <div style={{ fontSize: 12, color: COLORS.accent, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>Action</div>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Mortgage reset — May 2027</div>
          <div style={{ fontSize: 13, color: COLORS.textMuted, lineHeight: 1.6 }}>
            Your 1.4% Santander deal ends May 2027. Current 5-year fixes are ~4.4%. Monthly payment jumps from £1,139 to ~£1,650. Start researching products by Nov 2026.
          </div>
        </Card>
        <Card>
          <div style={{ fontSize: 12, color: COLORS.teal, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>Opportunity</div>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>£150k money market drag</div>
          <div style={{ fontSize: 13, color: COLORS.textMuted, lineHeight: 1.6 }}>
            After the Porsche (~£50k), £150k remains in Sterling Money Market earning ~4.5%. Equities return ~7% long-run. The gap on £150k is ~£4k/year compounding. Deploy or accept the drag consciously.
          </div>
        </Card>
        <Card>
          <div style={{ fontSize: 12, color: COLORS.green, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>On Track</div>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Pension contributions</div>
          <div style={{ fontSize: 13, color: COLORS.textMuted, lineHeight: 1.6 }}>
            £2,125/month employer contributions flowing. HMRC tax relief arriving correctly. Salary sacrificed to £63,750 — well below £100k threshold for childcare entitlements.
          </div>
        </Card>
      </div>
    </>
  )
}

function PortfolioTab() {
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
            <div style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmt(h.cost)}</div>
            <div style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmt(h.value)}</div>
            <div style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: h.change >= 0 ? COLORS.green : COLORS.red }}>
              {h.change >= 0 ? '+' : '-'}{fmt(h.change)}
            </div>
          </div>
        ))}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', padding: '14px 0', fontSize: 13, fontWeight: 600, borderTop: `2px solid ${COLORS.cardBorder}` }}>
          <div>Total</div>
          <div style={{ textAlign: 'right' }}>100%</div>
          <div style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>£995,843</div>
          <div style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>£1,158,097</div>
          <div style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: COLORS.green }}>+£162,254</div>
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
          <div style={{ marginTop: 20, padding: 16, background: COLORS.redDim, borderRadius: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: COLORS.red, marginBottom: 4 }}>GIA CGT exposure</div>
            <div style={{ fontSize: 13, color: COLORS.textMuted, lineHeight: 1.5 }}>
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
                <div style={{ fontSize: 11, color: COLORS.accent, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12, fontWeight: 600 }}>
                  Recommended
                </div>
              )}
              <div style={{ fontFamily: '"DM Serif Display", serif', fontSize: 20, marginBottom: 4 }}>{p.name}</div>
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
        <Card>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: COLORS.red }}>Sell London first</div>
          <div style={{ fontSize: 13, color: COLORS.textMuted, lineHeight: 1.6 }}>
            If you buy York before selling London, you'll face a 5% additional property surcharge — ~£41k on an £825k purchase. Reclaim within 36 months, but capital is locked. Sequence correctly to avoid.
          </div>
        </Card>
        <Card>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: COLORS.accent }}>PPR relief — check tax residency</div>
          <div style={{ fontSize: 13, color: COLORS.textMuted, lineHeight: 1.6 }}>
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
              { label: '7% return + £4.2k/mo', data: p7, borderColor: COLORS.blue, backgroundColor: COLORS.blueDim, fill: true, tension: 0.3, pointRadius: 2 },
              { label: '5% return + £4.2k/mo', data: p5, borderColor: COLORS.teal, fill: false, tension: 0.3, pointRadius: 2, borderDash: [4, 4] },
              { label: '7% return + £2k/mo (children)', data: p7low, borderColor: COLORS.purple, fill: false, tension: 0.3, pointRadius: 2, borderDash: [8, 4] },
              { label: '£5m target', data: years.map(() => 5000000), borderColor: 'rgba(196,165,90,0.3)', borderDash: [6, 4], pointRadius: 0, fill: false },
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
        <DataRow label="Bed & ISA" sub="Sell/rebuy VUAG within ISA" value="£20,000/year" color={COLORS.green} />
        <DataRow label="Pension contributions" sub="Employer via salary sacrifice" value="£25,500/year" />
        <DataRow label="Personal pension top-ups" sub="Opportunistic, tax-efficient" value="Variable" />
        <DataRow label="CGT harvest" sub="Use £3k annual exemption + Clara's" value="£6,000/year" />
        <DataRow label="ISA for Clara" sub="If married, use her ISA allowance too" value="£20,000/year" color={COLORS.accent} />
      </Card>
    </>
  )
}
