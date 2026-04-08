import React, { useState, useMemo } from 'react'
import { COLORS, MetricCard, SectionTitle, Card, DataRow, ChartCanvas, Legend, chartDefaults, useIsMobile, fmt, fmtK, fmtM } from './ui.jsx'

// === ANALYTICS HELPERS ===

// Classify a holding into an asset class based on its name
function classifyAsset(name = '') {
  const n = name.toLowerCase()
  if (/money market|cash fund|sterling fund|gilt|treasury|short.term/.test(n)) return 'Cash equivalent'
  if (/bond|gilt|fixed interest|corporate debt/.test(n)) return 'Bonds'
  if (/reit|real estate|property/.test(n)) return 'Property'
  if (/commodity|gold|silver|oil/.test(n)) return 'Commodities'
  if (/crypto|bitcoin|ethereum/.test(n)) return 'Crypto'
  if (/equity|stock|shares|s&p|ftse|nasdaq|index|etf|ucits|lifestrategy|vuag|all-world|all world|emerging market/.test(n)) return 'Equities'
  return 'Other'
}

// Classify a holding by geographic exposure
function classifyGeography(name = '') {
  const n = name.toLowerCase()
  if (/s&p|sp 500|s & p|us equity|north america|usa|nasdaq/.test(n)) return 'US'
  if (/ftse|uk equity|uk index|britain|gilt/.test(n)) return 'UK'
  if (/emerging market|em equity|emerging stocks|em index/.test(n)) return 'Emerging markets'
  if (/europe|euro stoxx|eurozone/.test(n)) return 'Europe'
  if (/japan|asia pacific|asia ex|china|india/.test(n)) return 'Asia'
  if (/global|world|all.?world|lifestrategy/.test(n)) return 'Global'
  if (/money market|sterling/.test(n)) return 'UK'
  return 'Unclassified'
}

// Detect recurring subscriptions from transactions
function detectSubscriptions(transactions = []) {
  // Group by description (normalized) and check for monthly recurring outgoing
  const groups = {}
  transactions.forEach(t => {
    if (t.amount >= 0) return // outgoing only
    const key = (t.description || '').toLowerCase().replace(/\d+/g, '').trim().slice(0, 30)
    if (!key) return
    if (!groups[key]) groups[key] = []
    groups[key].push(t)
  })
  const subs = []
  Object.entries(groups).forEach(([key, txs]) => {
    if (txs.length < 2) return
    // Average amount across occurrences (rounded)
    const amounts = txs.map(t => Math.abs(t.amount))
    const avg = amounts.reduce((a, b) => a + b, 0) / amounts.length
    // Check that amounts are similar (within 10% of avg)
    const allSimilar = amounts.every(a => Math.abs(a - avg) / avg < 0.15)
    if (!allSimilar) return
    // Use the most recent description
    const desc = txs[txs.length - 1].description || key
    subs.push({ description: desc, monthly: avg, occurrences: txs.length })
  })
  return subs.sort((a, b) => b.monthly - a.monthly)
}

// Group transactions by category and sum
function categorizeSpending(transactions = []) {
  const cats = {}
  transactions.forEach(t => {
    if (t.amount >= 0) return // outgoing only
    const cat = t.category || 'other'
    if (!cats[cat]) cats[cat] = 0
    cats[cat] += Math.abs(t.amount)
  })
  return Object.entries(cats)
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total)
}

// Top merchants/expenses
function topMerchants(transactions = [], limit = 8) {
  const groups = {}
  transactions.forEach(t => {
    if (t.amount >= 0) return
    const key = (t.description || 'Unknown').slice(0, 40)
    if (!groups[key]) groups[key] = { description: key, total: 0, count: 0 }
    groups[key].total += Math.abs(t.amount)
    groups[key].count += 1
  })
  return Object.values(groups).sort((a, b) => b.total - a.total).slice(0, limit)
}

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

      <FinancialHealth finances={finances} goals={goals} netWorthWithProperty={netWorthWithProperty} />

      {goals && (
        <>
          <SectionTitle>Your goals</SectionTitle>
          <Card>
            {goals.target_net_worth > 0 && <DataRow label="Target net worth" value={fmt(goals.target_net_worth)} bold color={COLORS.accent} />}
            {goals.current_age && <DataRow label="Current age" value={`${goals.current_age} years old`} />}
            {goals.monthly_savings > 0 && <DataRow label="Planned monthly savings" value={`${fmt(goals.monthly_savings)}/mo`} color={COLORS.green} />}
            {goals.priorities && <DataRow label="Top priority" value={goals.priorities} />}
          </Card>
        </>
      )}
    </>
  )
}

function FinancialHealth({ finances, goals, netWorthWithProperty }) {
  const summary = finances?.summary || {}
  const accounts = finances?.accounts || []
  const totalCash = summary.total_cash || 0
  const totalInvestments = summary.total_investments || 0
  const totalLiabilities = (summary.total_liabilities || 0) + (goals?.mortgage_balance || 0)
  const propertyValue = goals?.property_value || 0
  const totalAssets = totalCash + totalInvestments + propertyValue

  // Monthly outgoing for emergency fund calc
  const monthlyOutgoing = Math.abs(summary.monthly_outgoing_avg || 0)
  const emergencyMonths = monthlyOutgoing > 0 ? totalCash / monthlyOutgoing : 0

  // Liquidity ratio: liquid assets / total assets
  const liquidPct = totalAssets > 0 ? ((totalCash + totalInvestments) / totalAssets) * 100 : 0

  // Debt-to-asset ratio
  const debtRatio = totalAssets > 0 ? (totalLiabilities / totalAssets) * 100 : 0

  // Asset diversification: number of "buckets" with meaningful balance
  const buckets = []
  if (totalCash > 1000) buckets.push('cash')
  if (totalInvestments > 1000) buckets.push('investments')
  if (propertyValue > 0) buckets.push('property')
  // Check for crypto / pension / etc by account types
  const types = new Set(accounts.map(a => a.account_type))
  if (types.has('pension')) buckets.push('pension')
  if (types.has('crypto')) buckets.push('crypto')
  const diversificationScore = Math.min(100, buckets.length * 25)

  // IHT exposure (basic): assets above £325k nil-rate band
  const ihtThreshold = 325000
  const ihtExposure = Math.max(0, netWorthWithProperty - ihtThreshold)
  const potentialIht = ihtExposure * 0.40

  return (
    <>
      <SectionTitle>Financial health</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
        <Card>
          <div style={{ fontSize: 12, color: COLORS.textMuted, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Emergency fund</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: emergencyMonths >= 6 ? COLORS.green : emergencyMonths >= 3 ? COLORS.coral : COLORS.red }}>
            {emergencyMonths.toFixed(1)} mo
          </div>
          <div style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 6, lineHeight: 1.5 }}>
            {emergencyMonths >= 6 ? '✓ Solid buffer (6+ months)' : emergencyMonths >= 3 ? 'Building (aim for 6 months)' : '⚠ Below 3 months recommended'}
          </div>
        </Card>

        <Card>
          <div style={{ fontSize: 12, color: COLORS.textMuted, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Liquidity</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: COLORS.text }}>
            {liquidPct.toFixed(0)}%
          </div>
          <div style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 6, lineHeight: 1.5 }}>
            Of assets are liquid (cash + investments)
          </div>
        </Card>

        <Card>
          <div style={{ fontSize: 12, color: COLORS.textMuted, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Debt ratio</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: debtRatio < 30 ? COLORS.green : debtRatio < 50 ? COLORS.coral : COLORS.red }}>
            {debtRatio.toFixed(0)}%
          </div>
          <div style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 6, lineHeight: 1.5 }}>
            {debtRatio < 30 ? '✓ Conservative leverage' : debtRatio < 50 ? 'Moderate leverage' : '⚠ High leverage'}
          </div>
        </Card>

        <Card>
          <div style={{ fontSize: 12, color: COLORS.textMuted, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Diversification</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: diversificationScore >= 75 ? COLORS.green : diversificationScore >= 50 ? COLORS.coral : COLORS.red }}>
            {diversificationScore}/100
          </div>
          <div style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 6, lineHeight: 1.5 }}>
            Spread across {buckets.length} asset {buckets.length === 1 ? 'class' : 'classes'}
          </div>
        </Card>
      </div>

      {ihtExposure > 0 && (
        <>
          <SectionTitle>Inheritance tax exposure</SectionTitle>
          <Card style={{ borderLeft: '3px solid #D9730D' }}>
            <DataRow label="Net worth" value={fmt(netWorthWithProperty)} />
            <DataRow label="Nil-rate band" value={fmt(ihtThreshold)} sub="2024/25" />
            <DataRow label="Estate above threshold" value={fmt(ihtExposure)} color={COLORS.coral} />
            <DataRow label="Potential IHT at 40%" value={fmt(potentialIht)} color={COLORS.red} bold />
            <div style={{ marginTop: 12, fontSize: 12, color: COLORS.textMuted, lineHeight: 1.5 }}>
              Note: married couples get a combined £650k allowance, plus a £175k residence nil-rate band each if leaving your home to direct descendants. Speak to a financial advisor about pension wrappers, gifts, and trusts to mitigate.
            </div>
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

      <PortfolioAnalytics holdings={allHoldings} totalValue={totalValue} />
    </>
  )
}

function PortfolioAnalytics({ holdings, totalValue }) {
  // Asset class breakdown
  const assetClasses = {}
  holdings.forEach(h => {
    const cls = classifyAsset(h.name)
    assetClasses[cls] = (assetClasses[cls] || 0) + (h.value || 0)
  })
  const assetEntries = Object.entries(assetClasses).sort((a, b) => b[1] - a[1])

  // Geographic breakdown
  const geos = {}
  holdings.forEach(h => {
    const g = classifyGeography(h.name)
    geos[g] = (geos[g] || 0) + (h.value || 0)
  })
  const geoEntries = Object.entries(geos).sort((a, b) => b[1] - a[1])

  // Concentration risk: top holding as %
  const sortedByValue = [...holdings].sort((a, b) => (b.value || 0) - (a.value || 0))
  const topHolding = sortedByValue[0]
  const topPct = topHolding ? ((topHolding.value || 0) / totalValue) * 100 : 0
  const top3Pct = sortedByValue.slice(0, 3).reduce((s, h) => s + (h.value || 0), 0) / totalValue * 100

  // HHI concentration index (0-100, lower = more diversified)
  const hhi = sortedByValue.reduce((s, h) => {
    const share = (h.value || 0) / totalValue
    return s + share * share * 100
  }, 0)

  const palette = [COLORS.blue, COLORS.coral, COLORS.teal, COLORS.green, COLORS.purple, '#D9730D', COLORS.textDim]

  return (
    <>
      <SectionTitle>Asset class breakdown</SectionTitle>
      <Card>
        <ChartCanvas id="assetClassBar" height={Math.max(160, assetEntries.length * 36)} config={{
          type: 'bar',
          data: {
            labels: assetEntries.map(([label]) => label),
            datasets: [{
              data: assetEntries.map(([, v]) => v),
              backgroundColor: assetEntries.map((_, i) => palette[i % palette.length]),
              borderRadius: 4, barPercentage: 0.65,
            }]
          },
          options: {
            ...chartDefaults, indexAxis: 'y',
            plugins: { legend: { display: false }, tooltip: { callbacks: { label: v => fmt(v.raw) + ' (' + (v.raw / totalValue * 100).toFixed(0) + '%)' } } },
            scales: {
              x: { ...chartDefaults.scales.x, ticks: { ...chartDefaults.scales.x.ticks, callback: v => fmtK(v) } },
              y: { ...chartDefaults.scales.y, grid: { display: false } },
            },
          }
        }} />
      </Card>

      <SectionTitle>Geographic exposure</SectionTitle>
      <Card>
        <ChartCanvas id="geoBar" height={Math.max(160, geoEntries.length * 36)} config={{
          type: 'bar',
          data: {
            labels: geoEntries.map(([label]) => label),
            datasets: [{
              data: geoEntries.map(([, v]) => v),
              backgroundColor: geoEntries.map((_, i) => palette[i % palette.length]),
              borderRadius: 4, barPercentage: 0.65,
            }]
          },
          options: {
            ...chartDefaults, indexAxis: 'y',
            plugins: { legend: { display: false }, tooltip: { callbacks: { label: v => fmt(v.raw) + ' (' + (v.raw / totalValue * 100).toFixed(0) + '%)' } } },
            scales: {
              x: { ...chartDefaults.scales.x, ticks: { ...chartDefaults.scales.x.ticks, callback: v => fmtK(v) } },
              y: { ...chartDefaults.scales.y, grid: { display: false } },
            },
          }
        }} />
        {geos['Unclassified'] > 0 && (
          <div style={{ marginTop: 12, fontSize: 12, color: COLORS.textMuted }}>
            Some holdings couldn't be auto-classified. Geography is inferred from fund names.
          </div>
        )}
      </Card>

      <SectionTitle>Concentration risk</SectionTitle>
      <Card style={{ borderLeft: topPct > 50 ? '3px solid #E03E3E' : top3Pct > 80 ? '3px solid #D9730D' : '3px solid #0F7B6C' }}>
        {topHolding && (
          <DataRow
            label="Largest holding"
            sub={topHolding.name}
            value={topPct.toFixed(0) + '%'}
            color={topPct > 50 ? COLORS.red : topPct > 30 ? COLORS.coral : COLORS.text}
            bold
          />
        )}
        <DataRow
          label="Top 3 holdings"
          value={top3Pct.toFixed(0) + '%'}
          color={top3Pct > 80 ? COLORS.red : top3Pct > 60 ? COLORS.coral : COLORS.text}
        />
        <DataRow
          label="Diversification index (HHI)"
          sub="Lower is more diversified"
          value={hhi.toFixed(0) + '/100'}
          color={hhi < 25 ? COLORS.green : hhi < 50 ? COLORS.coral : COLORS.red}
        />
        <div style={{ marginTop: 12, fontSize: 12, color: COLORS.textMuted, lineHeight: 1.5 }}>
          {topPct > 50 && '⚠ Single holding exceeds 50% of portfolio. Consider diversifying to reduce single-asset risk.'}
          {topPct <= 50 && top3Pct > 80 && 'Top 3 holdings dominate the portfolio. Reasonable for index fund investors but worth knowing.'}
          {topPct <= 50 && top3Pct <= 80 && '✓ Portfolio is reasonably diversified across multiple holdings.'}
        </div>
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
  const savingsRate = avgIncome > 0 ? (netMonthly / avgIncome) * 100 : 0

  // Volatility: stdev of monthly outgoing as % of mean
  const outgoingAbs = outgoing.map(o => Math.abs(o))
  const meanOut = outgoingAbs.reduce((a, b) => a + b, 0) / Math.max(1, outgoingAbs.length)
  const variance = outgoingAbs.reduce((s, x) => s + Math.pow(x - meanOut, 2), 0) / Math.max(1, outgoingAbs.length)
  const stdev = Math.sqrt(variance)
  const volatilityPct = meanOut > 0 ? (stdev / meanOut) * 100 : 0

  // Highest spend month
  const maxOutIdx = outgoingAbs.indexOf(Math.max(...outgoingAbs))
  const maxMonthLabel = labels[maxOutIdx]
  const maxMonthAmount = outgoingAbs[maxOutIdx]

  // Categories, top merchants, subscriptions
  const categories = categorizeSpending(allTx)
  const totalSpend = categories.reduce((s, c) => s + c.total, 0)
  const merchants = topMerchants(allTx, 8)
  const subs = detectSubscriptions(allTx)
  const totalSubs = subs.reduce((s, x) => s + x.monthly, 0)

  const categoryColors = {
    income: COLORS.green,
    investment: COLORS.purple,
    housing: COLORS.coral,
    food: COLORS.blue,
    subscriptions: COLORS.teal,
    transport: '#D9730D',
    other: COLORS.textDim,
  }
  const palette = [COLORS.blue, COLORS.coral, COLORS.teal, COLORS.purple, '#D9730D', COLORS.green, COLORS.textDim]

  return (
    <>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
        <MetricCard label="Avg Monthly Income" value={fmt(avgIncome) + '/mo'} color={COLORS.green} />
        <MetricCard label="Avg Monthly Outgoing" value={fmt(avgOutgoing) + '/mo'} color={COLORS.red} />
        <MetricCard
          label="Savings Rate"
          value={savingsRate.toFixed(0) + '%'}
          sub={fmt(netMonthly) + '/mo net'}
          color={savingsRate >= 20 ? COLORS.green : savingsRate >= 10 ? COLORS.coral : COLORS.red}
        />
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

      {categories.length > 0 && (
        <>
          <SectionTitle>Spending by category</SectionTitle>
          <Card>
            <ChartCanvas id="spendCats" height={Math.max(180, categories.length * 36)} config={{
              type: 'bar',
              data: {
                labels: categories.map(c => c.category.charAt(0).toUpperCase() + c.category.slice(1)),
                datasets: [{
                  data: categories.map(c => c.total),
                  backgroundColor: categories.map((c, i) => categoryColors[c.category] || palette[i % palette.length]),
                  borderRadius: 4, barPercentage: 0.7,
                }]
              },
              options: {
                ...chartDefaults, indexAxis: 'y',
                plugins: { legend: { display: false }, tooltip: { callbacks: { label: v => fmt(v.raw) + ' (' + (v.raw / totalSpend * 100).toFixed(0) + '%)' } } },
                scales: {
                  x: { ...chartDefaults.scales.x, ticks: { ...chartDefaults.scales.x.ticks, callback: v => fmtK(v) } },
                  y: { ...chartDefaults.scales.y, grid: { display: false } },
                },
              }
            }} />
          </Card>
        </>
      )}

      {merchants.length > 0 && (
        <>
          <SectionTitle>Top expenses</SectionTitle>
          <Card>
            {merchants.map((m, i) => (
              <DataRow
                key={i}
                label={m.description}
                sub={m.count > 1 ? `${m.count} transactions` : null}
                value={fmt(m.total)}
              />
            ))}
          </Card>
        </>
      )}

      {subs.length > 0 && (
        <>
          <SectionTitle>Recurring subscriptions</SectionTitle>
          <Card>
            <div style={{ marginBottom: 12, fontSize: 13, color: COLORS.textMuted }}>
              Detected {subs.length} recurring payments totalling <strong style={{ color: COLORS.text }}>{fmt(totalSubs)}/mo</strong> ({fmt(totalSubs * 12)}/yr).
            </div>
            {subs.slice(0, 12).map((s, i) => (
              <DataRow
                key={i}
                label={s.description}
                sub={`${s.occurrences} months`}
                value={fmt(s.monthly) + '/mo'}
              />
            ))}
          </Card>
        </>
      )}

      <SectionTitle>Spending volatility</SectionTitle>
      <Card>
        <DataRow label="Average monthly outgoing" value={fmt(meanOut)} />
        <DataRow label="Standard deviation" value={fmt(stdev)} sub="Variability month-to-month" />
        <DataRow
          label="Volatility"
          value={volatilityPct.toFixed(0) + '%'}
          color={volatilityPct < 15 ? COLORS.green : volatilityPct < 30 ? COLORS.coral : COLORS.red}
          bold
        />
        {maxMonthLabel && (
          <DataRow label="Highest spend month" sub={maxMonthLabel} value={fmt(maxMonthAmount)} color={COLORS.red} />
        )}
        <div style={{ marginTop: 12, fontSize: 12, color: COLORS.textMuted, lineHeight: 1.5 }}>
          {volatilityPct < 15 && '✓ Your spending is consistent month-to-month — easy to budget.'}
          {volatilityPct >= 15 && volatilityPct < 30 && 'Moderate variability. Some months are noticeably higher than others.'}
          {volatilityPct >= 30 && '⚠ Highly variable spending. Consider building a larger emergency buffer.'}
        </div>
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
  const yearsToGoal = reachAge ? reachAge - currentAge : null

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
        <MetricCard label="Target" value={fmt(target)} color={COLORS.accent} />
        <MetricCard
          label="Goal reached"
          value={reachAge ? `Age ${reachAge}` : 'Not in 30y'}
          sub={yearsToGoal !== null ? `${yearsToGoal} year${yearsToGoal !== 1 ? 's' : ''} from now` : ''}
          color={reachAge ? COLORS.green : COLORS.red}
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

      <SectionTitle>Sensitivity analysis</SectionTitle>
      <Card>
        <div style={{ marginBottom: 16, fontSize: 13, color: COLORS.textMuted, lineHeight: 1.5 }}>
          How much each lever moves your goal age (vs current baseline of {fmt(monthlySavings)}/mo at {returnRate}% return).
        </div>
        {(() => {
          // Compute baseline reach age
          function reachAt(rate, savings, lump = 0) {
            let v = currentNW + lump
            for (let i = 0; i < 60; i++) {
              if (v >= target) return currentAge + i
              v = v * (1 + rate / 100) + savings * 12
            }
            return null
          }
          const baseAge = reachAt(returnRate, monthlySavings, lumpSum)
          const scenarios = [
            { label: '+£500/mo savings', delta: reachAt(returnRate, monthlySavings + 500, lumpSum) },
            { label: '+£1,000/mo savings', delta: reachAt(returnRate, monthlySavings + 1000, lumpSum) },
            { label: '−£500/mo savings', delta: reachAt(returnRate, Math.max(0, monthlySavings - 500), lumpSum) },
            { label: '+1% return', delta: reachAt(returnRate + 1, monthlySavings, lumpSum) },
            { label: '−1% return', delta: reachAt(Math.max(2, returnRate - 1), monthlySavings, lumpSum) },
            { label: '+£50k lump sum', delta: reachAt(returnRate, monthlySavings, lumpSum + 50000) },
          ]
          return scenarios.map((s, i) => {
            const diff = s.delta && baseAge ? s.delta - baseAge : null
            const diffStr = diff === null ? 'No reach' : diff === 0 ? 'No change' : diff < 0 ? `${diff} year${diff !== -1 ? 's' : ''} earlier` : `${diff} year${diff !== 1 ? 's' : ''} later`
            const color = diff === null ? COLORS.textDim : diff < 0 ? COLORS.green : diff > 0 ? COLORS.red : COLORS.text
            return <DataRow key={i} label={s.label} value={s.delta ? `Age ${s.delta}` : '—'} sub={diffStr} color={color} />
          })
        })()}
      </Card>

      <SectionTitle>Lost growth from cash drag</SectionTitle>
      <Card>
        {(() => {
          const accounts = finances?.accounts || []
          const cashAccounts = accounts.filter(a => ['current', 'savings'].includes(a.account_type))
          const totalCash = cashAccounts.reduce((s, a) => s + (a.current_balance || 0), 0)
          // Money market in GIA also counts as "cash drag" for analysis
          const moneyMarketHoldings = accounts
            .flatMap(a => (a.holdings || []))
            .filter(h => classifyAsset(h.name) === 'Cash equivalent')
            .reduce((s, h) => s + (h.value || 0), 0)
          const cashDrag = totalCash + moneyMarketHoldings
          // Excess above 6 months emergency fund
          const monthlyOut = Math.abs((finances?.summary?.monthly_outgoing_avg) || 0)
          const sixMonthBuffer = monthlyOut * 6 || 15000
          const excess = Math.max(0, cashDrag - sixMonthBuffer)

          // Cost of cash drag over 10 years: 7% return vs 4% cash
          const equityValue10y = excess * Math.pow(1.07, 10)
          const cashValue10y = excess * Math.pow(1.04, 10)
          const lostGrowth = equityValue10y - cashValue10y

          if (excess === 0) {
            return <div style={{ fontSize: 13, color: COLORS.textMuted }}>You don't have meaningful excess cash sitting idle. Cash holdings look right-sized to your spending.</div>
          }

          return (
            <>
              <DataRow label="Total cash & money market" value={fmt(cashDrag)} />
              <DataRow label="Recommended emergency buffer" sub="6 months of outgoings" value={fmt(sixMonthBuffer)} />
              <DataRow label="Excess sitting in cash" value={fmt(excess)} color={COLORS.coral} bold />
              <DataRow label="If invested at 7% (10 years)" value={fmt(equityValue10y)} color={COLORS.green} />
              <DataRow label="If left in cash at 4% (10 years)" value={fmt(cashValue10y)} />
              <DataRow label="Lost growth" value={fmt(lostGrowth)} color={COLORS.red} bold />
              <div style={{ marginTop: 12, fontSize: 12, color: COLORS.textMuted, lineHeight: 1.5 }}>
                Inflation erodes cash. Even at 4% interest, you lose buying power over time. The equity premium is the gap between cash and long-run market returns — historically ~3% per year.
              </div>
            </>
          )
        })()}
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

  // Dividend estimate: assume 1.5% average yield on GIA equity holdings (excluding money market)
  const giaEquityValue = wrappers.gia.holdings
    .filter(h => classifyAsset(h.name) === 'Equities')
    .reduce((s, h) => s + (h.value || 0), 0)
  const estimatedDividends = giaEquityValue * 0.015
  const dividendAllowance = 500 // 2024/25
  const taxableDividends = Math.max(0, estimatedDividends - dividendAllowance)
  // Higher rate dividend tax 33.75%, basic 8.75% — assume basic for safety
  const potentialDividendTax = taxableDividends * 0.0875

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

      {giaEquityValue > 5000 && (
        <>
          <SectionTitle>Dividend tax estimate</SectionTitle>
          <Card style={{ borderLeft: potentialDividendTax > 0 ? '3px solid #D9730D' : '3px solid #0F7B6C' }}>
            <DataRow label="GIA equity holdings" value={fmt(giaEquityValue)} sub="Excluding money market" />
            <DataRow label="Estimated annual dividends" value={fmt(estimatedDividends) + '/yr'} sub="Assuming ~1.5% yield" />
            <DataRow label="Dividend allowance" value={fmt(dividendAllowance)} sub="2024/25" />
            <DataRow label="Taxable dividends" value={fmt(taxableDividends)} color={taxableDividends > 0 ? COLORS.coral : COLORS.text} />
            <DataRow label="Potential tax at 8.75%" value={fmt(potentialDividendTax)} color={potentialDividendTax > 0 ? COLORS.coral : COLORS.green} bold sub="Higher rate is 33.75%" />
            <div style={{ marginTop: 12, fontSize: 12, color: COLORS.textMuted, lineHeight: 1.5 }}>
              Estimate uses a generic 1.5% dividend yield on equity ETFs. Actual figures depend on the specific funds. Accumulating funds (e.g. VUAG) reinvest dividends but you still owe tax on the deemed distribution.
            </div>
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
