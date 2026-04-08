import React, { useState } from 'react'
import { COLORS, MetricCard, SectionTitle, Card, DataRow, ChartCanvas, Legend, chartDefaults, fmt, fmtK, fmtM } from './ui.jsx'

export default function Dashboard({ finances, goals }) {
  const [activeTab, setActiveTab] = useState('overview')

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'portfolio', label: 'Portfolio' },
    { id: 'cashflow', label: 'Cash Flow' },
    { id: 'goals', label: 'Goals' },
  ]

  return (
    <>
      <div style={{ display: 'flex', gap: 0, marginTop: 8, marginBottom: 32, borderBottom: `1px solid ${COLORS.cardBorder}` }}>
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

      {activeTab === 'overview' && <Overview finances={finances} goals={goals} />}
      {activeTab === 'portfolio' && <Portfolio finances={finances} />}
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
  const accounts = finances?.accounts || []
  const allHoldings = accounts.flatMap(acc =>
    (acc.holdings || []).map(h => ({ ...h, account: `${acc.detected_provider || ''} ${acc.account_type}`.trim() }))
  )

  const totalValue = allHoldings.reduce((s, h) => s + (h.value || 0), 0)
  const totalCost = allHoldings.reduce((s, h) => s + (h.cost || 0), 0)
  const totalChange = totalValue - totalCost

  if (allHoldings.length === 0) {
    return <Card><div style={{ color: COLORS.textMuted, fontSize: 14 }}>No investment holdings detected in your uploaded files.</div></Card>
  }

  return (
    <>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
        <MetricCard label="Portfolio Value" value={fmt(totalValue)} />
        <MetricCard label="Total Cost" value={fmt(totalCost)} sub="Capital deployed" />
        <MetricCard
          label="Total Return"
          value={(totalChange >= 0 ? '+' : '-') + fmt(totalChange)}
          sub={totalCost > 0 ? `${(totalChange / totalCost * 100).toFixed(1)}%` : ''}
          color={totalChange >= 0 ? COLORS.green : COLORS.red}
        />
      </div>

      <SectionTitle>Holdings</SectionTitle>
      <Card>
        {allHoldings.map((h, i) => {
          const change = (h.value || 0) - (h.cost || 0)
          return (
            <div key={i} style={{
              display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', alignItems: 'center',
              padding: '14px 0',
              borderBottom: i < allHoldings.length - 1 ? `1px solid ${COLORS.cardBorder}` : 'none',
              fontSize: 13,
              gap: 12,
            }}>
              <div>
                <div style={{ fontWeight: 500 }}>{h.name || h.ticker || 'Unknown'}</div>
                <div style={{ fontSize: 11, color: COLORS.textMuted }}>{h.account}</div>
              </div>
              <div style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmt(h.cost)}</div>
              <div style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmt(h.value)}</div>
              <div style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: change >= 0 ? COLORS.green : COLORS.red }}>
                {change >= 0 ? '+' : '-'}{fmt(change)}
              </div>
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
  const currentNW = summary.net_worth || 0
  const target = goals.target_net_worth || 0
  const monthlySavings = goals.monthly_savings || 0
  const currentAge = goals.current_age || 30
  const targetAge = goals.target_age || (currentAge + 20)
  const yearsUntilTarget = targetAge - currentAge

  // Project forward at 7% real return
  const years = Array.from({ length: Math.max(1, yearsUntilTarget) + 1 }, (_, i) => currentAge + i)
  function project(rate) {
    let v = currentNW
    return years.map((_, i) => {
      if (i > 0) v = v * (1 + rate) + monthlySavings * 12
      return Math.round(v)
    })
  }
  const p7 = project(0.07)
  const p5 = project(0.05)

  // Find when target is reached
  const reachAt7 = p7.findIndex(v => v >= target)
  const reachAt5 = p5.findIndex(v => v >= target)

  return (
    <>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
        <MetricCard label="Current Net Worth" value={fmt(currentNW)} />
        <MetricCard label="Target" value={fmt(target)} sub={`By age ${targetAge}`} color={COLORS.accent} />
        <MetricCard
          label="At 7% return"
          value={reachAt7 >= 0 ? `Age ${currentAge + reachAt7}` : 'Not reached'}
          sub={`+ ${fmt(monthlySavings)}/mo`}
          color={COLORS.green}
        />
      </div>

      <SectionTitle>Path to your goal</SectionTitle>
      <Card>
        <ChartCanvas id="projection" height={340} config={{
          type: 'line',
          data: {
            labels: years,
            datasets: [
              { label: '7% return', data: p7, borderColor: COLORS.blue, backgroundColor: 'rgba(35,131,226,0.06)', fill: true, tension: 0.3, pointRadius: 2 },
              { label: '5% return', data: p5, borderColor: COLORS.teal, fill: false, tension: 0.3, pointRadius: 2, borderDash: [4, 4] },
              { label: 'Target', data: years.map(() => target), borderColor: 'rgba(55,53,47,0.15)', borderDash: [6, 4], pointRadius: 0, fill: false },
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
        <Legend items={[['7% return', COLORS.blue], ['5% return', COLORS.teal], ['Target', COLORS.textDim]]} />
      </Card>
    </>
  )
}
