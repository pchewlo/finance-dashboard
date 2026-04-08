import React, { useState, useMemo } from 'react'
import { COLORS, MetricCard, SectionTitle, Card, DataRow, ChartCanvas, Legend, chartDefaults, useIsMobile, fmt, fmtK, fmtM } from './ui.jsx'

// Normalize finances: fix the parser bug where holding cost was set but value was 0
function normalizeFinances(finances) {
  if (!finances) return finances
  const accounts = (finances.accounts || []).map(acc => {
    const holdings = (acc.holdings || []).map(h => {
      // If value is 0 or missing but cost is set, the parser put the value in the wrong column
      if ((!h.value || h.value === 0) && h.cost > 0) {
        return { ...h, value: h.cost, cost: 0 }
      }
      return h
    })
    return { ...acc, holdings }
  })

  const totalHoldings = accounts.reduce((s, acc) =>
    s + (acc.holdings || []).reduce((hs, h) => hs + (h.value || 0), 0), 0)
  const totalCash = accounts
    .filter(acc => ['current', 'savings'].includes(acc.account_type))
    .reduce((s, acc) => s + (acc.current_balance || 0), 0)
  const totalLiab = accounts
    .filter(acc => acc.account_type === 'mortgage')
    .reduce((s, acc) => s + Math.abs(acc.current_balance || 0), 0)

  const summary = { ...(finances.summary || {}) }
  if (!summary.total_investments || summary.total_investments === 0) summary.total_investments = totalHoldings
  if (!summary.total_cash || summary.total_cash === 0) summary.total_cash = totalCash
  if (!summary.total_liabilities) summary.total_liabilities = totalLiab
  if (!summary.net_worth || summary.net_worth === 0) {
    summary.net_worth = (summary.total_cash || 0) + (summary.total_investments || 0) - (summary.total_liabilities || 0)
  }

  return { ...finances, accounts, summary }
}

export default function Dashboard({ finances: rawFinances, goals }) {
  const finances = useMemo(() => normalizeFinances(rawFinances), [rawFinances])
  const [activeTab, setActiveTab] = useState('overview')
  const isMobile = useIsMobile()

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'portfolio', label: 'Portfolio' },
    { id: 'tax', label: 'Tax' },
    { id: 'cashflow', label: 'Cash Flow' },
    { id: 'goals', label: 'Goals' },
  ]

  return (
    <>
      <div style={{ display: 'flex', gap: 0, marginTop: 8, marginBottom: 32, borderBottom: `1px solid ${COLORS.cardBorder}`, overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
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
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}>{t.label}</button>
        ))}
      </div>

      {activeTab === 'overview' && <Overview finances={finances} goals={goals} />}
      {activeTab === 'portfolio' && <Portfolio finances={finances} />}
      {activeTab === 'tax' && <TaxEfficiency finances={finances} />}
      {activeTab === 'cashflow' && <CashFlow finances={finances} />}
      {activeTab === 'goals' && <Goals finances={finances} goals={goals} />}
    </>
  )
}

function Overview({ finances, goals }) {
  const summary = finances?.summary || {}
  const accounts = finances?.accounts || []

  // Build composition from all accounts
  const composition = []
  accounts.forEach(acc => {
    const total = (acc.holdings?.reduce((s, h) => s + (h.value || 0), 0) || 0) + (acc.current_balance || 0)
    if (total > 0) {
      composition.push({ label: `${acc.detected_provider || 'Unknown'} (${acc.account_type})`, value: total })
    }
  })

  // Add property equity from goals
  const propertyEquity = goals?.property_equity || 0
  if (propertyEquity > 0) {
    composition.push({ label: 'Home equity', value: propertyEquity })
  }

  const palette = [COLORS.blue, COLORS.coral, COLORS.teal, COLORS.green, COLORS.purple, '#D9730D', COLORS.textDim]

  const netWorthWithProperty = (summary.net_worth || 0) + propertyEquity
  const targetNetWorth = goals?.target_net_worth || 0
  const progressPct = targetNetWorth > 0 ? Math.min(100, (netWorthWithProperty / targetNetWorth) * 100) : 0

  return (
    <>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
        <MetricCard
          label="Net Worth"
          value={fmt(netWorthWithProperty)}
          sub={targetNetWorth ? `${progressPct.toFixed(0)}% toward ${fmt(targetNetWorth)} goal` : 'Total assets minus liabilities'}
          color={COLORS.accent}
        />
        <MetricCard label="Investments" value={fmt(summary.total_investments)} sub="Liquid + retirement" />
        {propertyEquity > 0 ? (
          <MetricCard label="Home Equity" value={fmt(propertyEquity)} sub={goals?.property_value ? `${fmt(goals.property_value)} value` : ''} />
        ) : (
          <MetricCard label="Cash" value={fmt(summary.total_cash)} sub="Across all accounts" />
        )}
        <MetricCard
          label="Net Monthly"
          value={fmt((summary.monthly_income_avg || 0) + (summary.monthly_outgoing_avg || 0))}
          sub="Income minus outgoing"
          color={(summary.monthly_income_avg || 0) + (summary.monthly_outgoing_avg || 0) >= 0 ? COLORS.green : COLORS.red}
        />
      </div>

      {composition.length > 0 && (
        <>
          <SectionTitle>Net worth composition</SectionTitle>
          <Card>
            <ChartCanvas id="nwBar" height={Math.max(200, composition.length * 40)} config={{
              type: 'bar',
              data: {
                labels: composition.map(c => c.label),
                datasets: [{
                  data: composition.map(c => c.value),
                  backgroundColor: composition.map((_, i) => palette[i % palette.length]),
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
          </Card>
        </>
      )}

      {goals && (
        <>
          <SectionTitle>Your goals</SectionTitle>
          <Card>
            {goals.target_net_worth > 0 && <DataRow label="Target net worth" value={fmt(goals.target_net_worth)} bold color={COLORS.accent} />}
            {goals.target_age && <DataRow label="Target age" value={`${goals.target_age} years old`} />}
            {goals.current_age && <DataRow label="Current age" value={`${goals.current_age} years old`} />}
            {goals.monthly_savings > 0 && <DataRow label="Planned monthly savings" value={`${fmt(goals.monthly_savings)}/mo`} color={COLORS.green} />}
            {goals.priorities && <DataRow label="Top priority" value={goals.priorities} />}
          </Card>
        </>
      )}
    </>
  )
}

function Portfolio({ finances }) {
  const isMobile = useIsMobile()
  const accounts = finances?.accounts || []
  const allHoldings = accounts.flatMap(acc =>
    (acc.holdings || []).map(h => ({ ...h, account: `${acc.detected_provider || ''} ${acc.account_type}`.trim() }))
  )

  const totalValue = allHoldings.reduce((s, h) => s + (h.value || 0), 0)
  const totalCost = allHoldings.reduce((s, h) => s + (h.cost || 0), 0)
  const hasCostData = totalCost > 0
  const totalChange = totalValue - totalCost

  if (allHoldings.length === 0) {
    return <Card><div style={{ color: COLORS.textMuted, fontSize: 14 }}>No investment holdings detected in your uploaded files.</div></Card>
  }

  return (
    <>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
        <MetricCard label="Portfolio Value" value={fmt(totalValue)} />
        {hasCostData ? (
          <>
            <MetricCard label="Total Cost" value={fmt(totalCost)} sub="Capital deployed" />
            <MetricCard
              label="Total Return"
              value={(totalChange >= 0 ? '+' : '-') + fmt(totalChange)}
              sub={`${(totalChange / totalCost * 100).toFixed(1)}%`}
              color={totalChange >= 0 ? COLORS.green : COLORS.red}
            />
          </>
        ) : (
          <MetricCard label="Holdings" value={String(allHoldings.length)} sub="Funds in portfolio" />
        )}
      </div>

      <SectionTitle>Holdings</SectionTitle>
      <Card style={{ padding: isMobile ? '16px 18px' : '24px 28px' }}>
        {allHoldings.map((h, i) => {
          const showCost = (h.cost || 0) > 0
          const change = (h.value || 0) - (h.cost || 0)

          if (isMobile) {
            return (
              <div key={i} style={{
                padding: '14px 0',
                borderBottom: i < allHoldings.length - 1 ? `1px solid ${COLORS.cardBorder}` : 'none',
                fontSize: 13,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 6 }}>
                  <div style={{ fontWeight: 500, flex: 1, minWidth: 0 }}>{h.name || h.ticker || 'Unknown'}</div>
                  <div style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{fmt(h.value)}</div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
                  <div style={{ fontSize: 11, color: COLORS.textMuted }}>{h.account}</div>
                  {hasCostData && showCost && (
                    <div style={{ fontSize: 12, fontVariantNumeric: 'tabular-nums', color: change >= 0 ? COLORS.green : COLORS.red }}>
                      {change >= 0 ? '+' : '-'}{fmt(change)}
                    </div>
                  )}
                </div>
              </div>
            )
          }

          return (
            <div key={i} style={{
              display: 'grid', gridTemplateColumns: hasCostData ? '2fr 1fr 1fr 1fr' : '3fr 1fr', alignItems: 'center',
              padding: '14px 0',
              borderBottom: i < allHoldings.length - 1 ? `1px solid ${COLORS.cardBorder}` : 'none',
              fontSize: 13,
              gap: 12,
            }}>
              <div>
                <div style={{ fontWeight: 500 }}>{h.name || h.ticker || 'Unknown'}</div>
                <div style={{ fontSize: 11, color: COLORS.textMuted }}>{h.account}</div>
              </div>
              {hasCostData && (
                <div style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: showCost ? COLORS.text : COLORS.textDim }}>
                  {showCost ? fmt(h.cost) : '—'}
                </div>
              )}
              <div style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{fmt(h.value)}</div>
              {hasCostData && (
                <div style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: showCost ? (change >= 0 ? COLORS.green : COLORS.red) : COLORS.textDim }}>
                  {showCost ? `${change >= 0 ? '+' : '-'}${fmt(change)}` : '—'}
                </div>
              )}
            </div>
          )
        })}
      </Card>
    </>
  )
}

function CashFlow({ finances }) {
  const accounts = finances?.accounts || []
  const allTx = accounts.flatMap(acc => acc.transactions || [])

  if (allTx.length === 0) {
    return <Card><div style={{ color: COLORS.textMuted, fontSize: 14 }}>No transaction data detected in your uploaded files.</div></Card>
  }

  // Group by month
  const monthly = {}
  allTx.forEach(tx => {
    if (!tx.date) return
    const ym = tx.date.slice(0, 7)
    if (!monthly[ym]) monthly[ym] = { income: 0, outgoing: 0 }
    if (tx.amount > 0) monthly[ym].income += tx.amount
    else monthly[ym].outgoing += tx.amount
  })

  const sortedMonths = Object.keys(monthly).sort()
  const labels = sortedMonths.map(m => {
    const [y, mo] = m.split('-')
    return new Date(parseInt(y), parseInt(mo) - 1).toLocaleDateString('en-GB', { month: 'short' })
  })
  const income = sortedMonths.map(m => monthly[m].income)
  const outgoing = sortedMonths.map(m => monthly[m].outgoing)

  const avgIncome = income.length > 0 ? income.reduce((a, b) => a + b, 0) / income.length : 0
  const avgOutgoing = outgoing.length > 0 ? Math.abs(outgoing.reduce((a, b) => a + b, 0)) / outgoing.length : 0
  const netMonthly = avgIncome - avgOutgoing

  return (
    <>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
        <MetricCard label="Avg Monthly Income" value={fmt(avgIncome) + '/mo'} color={COLORS.green} />
        <MetricCard label="Avg Monthly Outgoing" value={fmt(avgOutgoing) + '/mo'} color={COLORS.red} />
        <MetricCard label="Net Monthly" value={fmt(netMonthly) + '/mo'} color={netMonthly >= 0 ? COLORS.green : COLORS.red} />
      </div>

      <SectionTitle>Monthly cash flow</SectionTitle>
      <Card>
        <ChartCanvas id="cashflow" height={300} config={{
          type: 'bar',
          data: {
            labels,
            datasets: [
              { label: 'Income', data: income, backgroundColor: COLORS.green, borderRadius: 3, barPercentage: 0.75 },
              { label: 'Outgoing', data: outgoing, backgroundColor: COLORS.red, borderRadius: 3, barPercentage: 0.75 },
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
        <Legend items={[['Income', COLORS.green], ['Outgoing', COLORS.red]]} />
      </Card>
    </>
  )
}

function Goals({ finances, goals }) {
  if (!goals) {
    return <Card><div style={{ color: COLORS.textMuted, fontSize: 14 }}>No goals set yet.</div></Card>
  }

  const summary = finances?.summary || {}
  const propertyEquity = goals.property_equity || 0
  const currentNW = (summary.net_worth || 0) + propertyEquity
  const target = goals.target_net_worth || 0
  const baseMonthlySavings = goals.monthly_savings || 0
  const currentAge = goals.current_age || 30
  const baseTargetAge = goals.target_age || (currentAge + 20)

  // Scenario sliders — start at baseline, user can adjust
  const [savingsAdjust, setSavingsAdjust] = useState(0) // delta to monthly savings
  const [returnRate, setReturnRate] = useState(7) // % annual real return
  const [lumpSum, setLumpSum] = useState(0) // one-time injection

  const monthlySavings = Math.max(0, baseMonthlySavings + savingsAdjust)

  // Always project 30 years from current age so the chart can show goal reach
  const horizonYears = 30
  const years = Array.from({ length: horizonYears + 1 }, (_, i) => currentAge + i)

  function project(rate) {
    let v = currentNW + lumpSum
    return years.map((_, i) => {
      if (i > 0) v = v * (1 + rate / 100) + monthlySavings * 12
      return Math.round(v)
    })
  }

  const projection = project(returnRate)
  const baseline = project(7) // for comparison if user changes things
  const reachIdx = projection.findIndex(v => v >= target)
  const reachAge = reachIdx >= 0 ? currentAge + reachIdx : null

  const sliderStyle = {
    width: '100%',
    accentColor: COLORS.accent,
  }

  const labelStyle = { fontSize: 13, fontWeight: 500, color: COLORS.text, marginBottom: 4, display: 'flex', justifyContent: 'space-between' }

  const isAdjusted = savingsAdjust !== 0 || returnRate !== 7 || lumpSum !== 0

  return (
    <>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
        <MetricCard label="Current Net Worth" value={fmt(currentNW)} />
        <MetricCard label="Target" value={fmt(target)} sub={`By age ${baseTargetAge}`} color={COLORS.accent} />
        <MetricCard
          label="Goal reached"
          value={reachAge ? `Age ${reachAge}` : 'Not in 30y'}
          sub={reachAge && reachAge <= baseTargetAge ? `${baseTargetAge - reachAge} years early` : reachAge ? `${reachAge - baseTargetAge} years late` : ''}
          color={reachAge && reachAge <= baseTargetAge ? COLORS.green : reachAge ? COLORS.coral : COLORS.red}
        />
      </div>

      <SectionTitle>What if...</SectionTitle>
      <Card>
        <div style={{ display: 'grid', gap: 24 }}>
          <div>
            <div style={labelStyle}>
              <span>Monthly savings</span>
              <span style={{ color: COLORS.textMuted, fontVariantNumeric: 'tabular-nums' }}>
                {fmt(monthlySavings)}/mo {savingsAdjust !== 0 && <span style={{ color: savingsAdjust > 0 ? COLORS.green : COLORS.red }}>({savingsAdjust > 0 ? '+' : ''}{fmt(savingsAdjust)})</span>}
              </span>
            </div>
            <input type="range" min={-baseMonthlySavings} max={5000} step={100} value={savingsAdjust} onChange={e => setSavingsAdjust(parseInt(e.target.value))} style={sliderStyle} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: COLORS.textDim, marginTop: 2 }}>
              <span>{fmt(0)}</span>
              <span>{fmt(baseMonthlySavings + 5000)}/mo</span>
            </div>
          </div>

          <div>
            <div style={labelStyle}>
              <span>Annual return assumption</span>
              <span style={{ color: COLORS.textMuted, fontVariantNumeric: 'tabular-nums' }}>{returnRate.toFixed(1)}% real</span>
            </div>
            <input type="range" min={2} max={12} step={0.5} value={returnRate} onChange={e => setReturnRate(parseFloat(e.target.value))} style={sliderStyle} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: COLORS.textDim, marginTop: 2 }}>
              <span>2% (cash)</span>
              <span>7% (long-run equities)</span>
              <span>12%</span>
            </div>
          </div>

          <div>
            <div style={labelStyle}>
              <span>One-time lump sum</span>
              <span style={{ color: COLORS.textMuted, fontVariantNumeric: 'tabular-nums' }}>{fmt(lumpSum)}</span>
            </div>
            <input type="range" min={0} max={500000} step={5000} value={lumpSum} onChange={e => setLumpSum(parseInt(e.target.value))} style={sliderStyle} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: COLORS.textDim, marginTop: 2 }}>
              <span>£0</span>
              <span>£500k (e.g. inheritance, bonus)</span>
            </div>
          </div>

          {isAdjusted && (
            <button onClick={() => { setSavingsAdjust(0); setReturnRate(7); setLumpSum(0) }} style={{
              background: 'none',
              border: `1px solid ${COLORS.cardBorder}`,
              borderRadius: 6,
              padding: '6px 14px',
              fontSize: 12,
              color: COLORS.textMuted,
              cursor: 'pointer',
              fontFamily: 'inherit',
              alignSelf: 'flex-start',
            }}>Reset to baseline</button>
          )}
        </div>
      </Card>

      <SectionTitle>Path to your goal</SectionTitle>
      <Card>
        <ChartCanvas id="projection" height={340} config={{
          type: 'line',
          data: {
            labels: years,
            datasets: [
              { label: 'Your scenario', data: projection, borderColor: COLORS.blue, backgroundColor: 'rgba(35,131,226,0.08)', fill: true, tension: 0.3, pointRadius: 0, borderWidth: 2.5 },
              ...(isAdjusted ? [{ label: 'Baseline (7%)', data: baseline, borderColor: COLORS.textDim, fill: false, tension: 0.3, pointRadius: 0, borderDash: [4, 4], borderWidth: 1.5 }] : []),
              { label: 'Target', data: years.map(() => target), borderColor: 'rgba(224,62,62,0.4)', borderDash: [6, 4], pointRadius: 0, fill: false, borderWidth: 1.5 },
            ]
          },
          options: {
            ...chartDefaults,
            plugins: { legend: { display: false }, tooltip: { callbacks: { label: v => v.dataset.label + ': ' + fmt(v.raw) } } },
            scales: {
              x: { ...chartDefaults.scales.x, grid: { display: false }, title: { display: true, text: 'Age', color: COLORS.textMuted, font: { size: 11 } } },
              y: { ...chartDefaults.scales.y, ticks: { ...chartDefaults.scales.y.ticks, callback: v => fmtM(v) }, min: 0 },
            },
          }
        }} />
        <Legend items={isAdjusted
          ? [['Your scenario', COLORS.blue], ['Baseline (7%)', COLORS.textDim], ['Target', COLORS.red]]
          : [['Projection', COLORS.blue], ['Target', COLORS.red]]
        } />
      </Card>
    </>
  )
}

function TaxEfficiency({ finances }) {
  const accounts = finances?.accounts || []
  const allHoldings = accounts.flatMap(acc =>
    (acc.holdings || []).map(h => ({ ...h, account_type: acc.account_type }))
  )

  // Group by tax wrapper
  const wrappers = {
    isa: { label: 'ISA', tax: 'Tax-free', color: COLORS.green, total: 0, gains: 0, holdings: [] },
    pension: { label: 'Pension', tax: 'Tax-deferred', color: COLORS.purple, total: 0, gains: 0, holdings: [] },
    gia: { label: 'GIA', tax: 'Taxable', color: COLORS.red, total: 0, gains: 0, holdings: [] },
    other: { label: 'Other', tax: '—', color: COLORS.textDim, total: 0, gains: 0, holdings: [] },
  }

  allHoldings.forEach(h => {
    const key = wrappers[h.account_type] ? h.account_type : 'other'
    wrappers[key].total += h.value || 0
    wrappers[key].gains += Math.max(0, (h.value || 0) - (h.cost || 0))
    wrappers[key].holdings.push(h)
  })

  const totalInvested = Object.values(wrappers).reduce((s, w) => s + w.total, 0)

  if (totalInvested === 0) {
    return <Card><div style={{ color: COLORS.textMuted, fontSize: 14 }}>No investment holdings detected. Upload investment account statements to see tax efficiency analysis.</div></Card>
  }

  const isaPct = (wrappers.isa.total / totalInvested) * 100
  const giaPct = (wrappers.gia.total / totalInvested) * 100
  const pensionPct = (wrappers.pension.total / totalInvested) * 100

  // CGT exposure
  const cgtAllowance = 3000
  const cgtRate = 0.20
  const taxableGains = Math.max(0, wrappers.gia.gains - cgtAllowance)
  const potentialCgt = taxableGains * cgtRate

  // ISA recommendation
  const isaAnnualLimit = 20000
  const yearsToShelter = wrappers.gia.total > 0 ? Math.ceil(wrappers.gia.total / isaAnnualLimit) : 0

  // Findings
  const findings = []
  if (giaPct > 50 && wrappers.gia.total > 20000) {
    findings.push({
      severity: 'critical',
      title: 'High GIA concentration',
      body: `${giaPct.toFixed(0)}% of your portfolio sits in a taxable General Investment Account. Bed & ISA £${isaAnnualLimit.toLocaleString()}/year to start sheltering it.`,
      impact: potentialCgt,
    })
  }
  if (isaPct < 10 && totalInvested > 30000) {
    findings.push({
      severity: 'action',
      title: 'ISA underused',
      body: `Only ${isaPct.toFixed(0)}% in ISA. You can shelter £${isaAnnualLimit.toLocaleString()} per tax year — this is a permanent tax-free allowance.`,
      impact: 0,
    })
  }
  if (wrappers.gia.gains > cgtAllowance) {
    findings.push({
      severity: 'action',
      title: 'CGT exposure',
      body: `Unrealised gains in GIA exceed your £${cgtAllowance.toLocaleString()} annual CGT allowance by £${(wrappers.gia.gains - cgtAllowance).toLocaleString()}. ~${fmt(potentialCgt)} potential tax at 20%.`,
      impact: potentialCgt,
    })
  }
  if (pensionPct > 0 && pensionPct < 15 && totalInvested > 50000) {
    findings.push({
      severity: 'opportunity',
      title: 'Pension capacity',
      body: `Pension is only ${pensionPct.toFixed(0)}% of your portfolio. Pension contributions get income tax relief upfront — consider increasing if you're a higher-rate taxpayer.`,
      impact: 0,
    })
  }
  if (giaPct < 30 && isaPct > 40) {
    findings.push({
      severity: 'on_track',
      title: 'Well sheltered',
      body: `${isaPct.toFixed(0)}% in ISA, ${pensionPct.toFixed(0)}% in pension. Most of your investments are protected from CGT and dividend tax.`,
      impact: 0,
    })
  }

  const severityToColor = {
    critical: '#E03E3E',
    action: '#D9730D',
    opportunity: '#0F7B6C',
    on_track: '#0F7B6C',
  }
  const severityToTagColor = {
    critical: 'red',
    action: 'orange',
    opportunity: 'green',
    on_track: 'green',
  }

  return (
    <>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
        <MetricCard label="ISA Tax-Free" value={fmt(wrappers.isa.total)} sub={`${isaPct.toFixed(0)}% of portfolio`} color={COLORS.green} />
        <MetricCard label="Pension Deferred" value={fmt(wrappers.pension.total)} sub={`${pensionPct.toFixed(0)}% of portfolio`} color={COLORS.purple} />
        <MetricCard label="GIA Taxable" value={fmt(wrappers.gia.total)} sub={`${giaPct.toFixed(0)}% of portfolio`} color={giaPct > 50 ? COLORS.red : COLORS.text} />
      </div>

      <SectionTitle>Wrapper allocation</SectionTitle>
      <Card>
        <ChartCanvas id="taxWrapperBar" height={180} config={{
          type: 'bar',
          data: {
            labels: ['ISA (tax-free)', 'Pension (deferred)', 'GIA (taxable)'],
            datasets: [{
              data: [wrappers.isa.total, wrappers.pension.total, wrappers.gia.total],
              backgroundColor: [COLORS.green, COLORS.purple, COLORS.red],
              borderRadius: 4, barPercentage: 0.55,
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
      </Card>

      {wrappers.gia.total > 0 && (
        <>
          <SectionTitle>CGT exposure</SectionTitle>
          <Card style={{ borderLeft: potentialCgt > 0 ? '3px solid #E03E3E' : '3px solid #0F7B6C' }}>
            <DataRow label="GIA holdings value" value={fmt(wrappers.gia.total)} />
            <DataRow label="Unrealised gains" value={fmt(wrappers.gia.gains)} />
            <DataRow label="Annual CGT allowance" value={fmt(cgtAllowance)} sub="2024/25" />
            <DataRow label="Taxable gains (over allowance)" value={fmt(taxableGains)} color={taxableGains > 0 ? COLORS.red : COLORS.text} />
            <DataRow label="Potential CGT at 20%" value={fmt(potentialCgt)} color={potentialCgt > 0 ? COLORS.red : COLORS.green} bold />
            {yearsToShelter > 0 && (
              <div style={{ marginTop: 16, padding: '12px 16px', background: COLORS.accentDim, borderRadius: 6, fontSize: 13, color: COLORS.text, lineHeight: 1.5 }}>
                <strong>Bed &amp; ISA strategy:</strong> At £{isaAnnualLimit.toLocaleString()}/year ISA contributions, it would take ~{yearsToShelter} year{yearsToShelter !== 1 ? 's' : ''} to fully shelter your GIA holdings. If you have a partner, double the speed by using their ISA too.
              </div>
            )}
          </Card>
        </>
      )}

      {findings.length > 0 && (
        <>
          <SectionTitle>Tax findings</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
            {findings.map((f, i) => (
              <Card key={i} style={{ borderLeft: `3px solid ${severityToColor[f.severity]}` }}>
                <div style={{ marginBottom: 12 }}>
                  <span style={{ display: 'inline-block', fontSize: 12, fontWeight: 500, color: severityToColor[f.severity], background: `${severityToColor[f.severity]}14`, padding: '2px 8px', borderRadius: 3, lineHeight: '20px' }}>
                    {f.severity.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
                <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8, color: COLORS.text }}>{f.title}</div>
                <div style={{ fontSize: 13, color: COLORS.textMuted, lineHeight: 1.65 }}>{f.body}</div>
                {f.impact > 0 && (
                  <div style={{ fontSize: 12, color: COLORS.accent, marginTop: 12, fontWeight: 500 }}>
                    Est. impact: {fmt(f.impact)}
                  </div>
                )}
              </Card>
            ))}
          </div>
        </>
      )}
    </>
  )
}
