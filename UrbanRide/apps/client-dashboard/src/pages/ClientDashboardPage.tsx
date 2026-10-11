import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  getCurrentCorporateAccount,
  getCorporateReport,
  getCorporateRides,
  getEmployees,
  type CorporateAccount,
  type CorporateRide,
} from '../services/corporate'
import './ClientDashboardPage.css'

type ReportSummary = {
  totalRides: number
  completedRides: number
  cancelledRides: number
  requestedRides: number
  capturedAmount: number
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0)
}

function formatDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat('en-IN', {
    day: 'numeric', month: 'short',
  }).format(date)
}

function statusClass(status: string) {
  const normalized = status.toLowerCase()
  if (normalized.includes('complete')) return 'is-complete'
  if (normalized.includes('cancel')) return 'is-cancelled'
  if (normalized.includes('request') || normalized.includes('assign') || normalized.includes('start')) return 'is-active'
  return 'is-neutral'
}

function makeWeekData(rides: CorporateRide[]) {
  const today = new Date()
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today)
    date.setHours(0, 0, 0, 0)
    date.setDate(today.getDate() - (6 - index))
    return { date, label: new Intl.DateTimeFormat('en-IN', { weekday: 'short' }).format(date), count: 0 }
  })
  for (const ride of rides) {
    const requested = new Date(ride.requestedAt)
    if (Number.isNaN(requested.getTime())) continue
    const match = days.find(day => day.date.toDateString() === requested.toDateString())
    if (match) match.count += 1
  }
  return days
}

export function ClientDashboardPage() {
  const navigate = useNavigate()
  const [account, setAccount] = useState<CorporateAccount | null>(null)
  const [employeeCount, setEmployeeCount] = useState(0)
  const [summary, setSummary] = useState<ReportSummary>({
    totalRides: 0, completedRides: 0, cancelledRides: 0, requestedRides: 0, capturedAmount: 0,
  })
  const [rides, setRides] = useState<CorporateRide[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true
    async function loadDashboard() {
      try {
        setLoading(true)
        setError('')
        const corporateAccount = await getCurrentCorporateAccount()
        const [employees, report, corporateRides] = await Promise.all([
          getEmployees(corporateAccount.id),
          getCorporateReport(corporateAccount.id),
          getCorporateRides(corporateAccount.id),
        ])
        if (!mounted) return
        setAccount(corporateAccount)
        setEmployeeCount(employees.length)
        setSummary({
          totalRides: report.summary.totalRides,
          completedRides: report.summary.completedRides,
          cancelledRides: report.summary.cancelledRides,
          requestedRides: report.summary.requestedRides,
          capturedAmount: report.summary.capturedAmount,
        })
        setRides(corporateRides.slice().sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime()))
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unable to load company overview.'
        const normalized = message.toLowerCase()
        if (normalized.includes('authentication required') || normalized.includes('unauthorized') || normalized.includes('401')) {
          try { for (const key of Object.keys(localStorage)) { if (key.startsWith('urbanride_client_')) localStorage.removeItem(key) } } catch {}
          navigate('/login', { replace: true })
          return
        }
        if (mounted) setError(message)
      } finally {
        if (mounted) setLoading(false)
      }
    }
    void loadDashboard()
    return () => { mounted = false }
  }, [])

  const week = useMemo(() => makeWeekData(rides), [rides])
  const maxCount = Math.max(1, ...week.map(day => day.count))
  const accessCode = (account as (CorporateAccount & { accessCode?: string }) | null)?.accessCode
  const firstName = (() => {
    try {
      const raw = localStorage.getItem('urbanride_client_principal')
      if (!raw) return 'Admin'
      const principal = JSON.parse(raw) as { username?: string; fullName?: string }
      return principal.fullName || principal.username || 'Admin'
    } catch { return 'Admin' }
  })()

  if (loading) {
    return <section className="dashboard dashboard-state"><div className="dashboard-loading-mark">UR</div><h2>Preparing your overview</h2><p>Loading company activity and employee data…</p><div className="dashboard-skeleton-row"><span /><span /><span /><span /></div></section>
  }

  if (error) {
    return <section className="dashboard dashboard-state"><div className="dashboard-state-icon dashboard-state-icon--error">!</div><h2>We couldn’t load your overview</h2><p role="alert">{error}</p><button className="dashboard-button dashboard-button--primary" onClick={() => window.location.reload()}>Try again</button></section>
  }

  return (
    <section className="dashboard">
      <div className="dashboard-welcome-row">
        <div className="dashboard-welcome-copy">
          <p className="dashboard-eyebrow">COMPANY WORKSPACE</p>
          <h1>Good day, {firstName}</h1>
          <p className="dashboard-subtitle">Here’s what’s happening with {account?.name || 'your company'}.</p>
        </div>
        <div className="dashboard-company-chip"><span className="dashboard-company-chip-icon">▦</span><span><small>ACTIVE COMPANY</small><strong>{account?.name || 'Your company'}</strong></span><span className="dashboard-live-dot" /></div>
      </div>

      <div className="dashboard-title-row">
        <div><h2>Company overview</h2><p className="dashboard-muted">Your company’s ride activity at a glance.</p></div>
        <div className="dashboard-actions">
          {accessCode && <div className="dashboard-access-code"><span className="dashboard-access-icon">♧</span><span><small>EMPLOYEE ACCESS CODE</small><strong>{accessCode}</strong></span><button aria-label="Copy company access code" title="Copy access code" onClick={async () => { try { await navigator.clipboard.writeText(accessCode ?? ''); } catch { const el = document.createElement('textarea'); el.value = accessCode ?? ''; document.body.appendChild(el); el.select(); document.execCommand('copy'); el.remove() } }}>▢</button></div>}
          <button className="dashboard-button dashboard-button--primary" onClick={() => navigate('/employees')}><span aria-hidden="true">＋</span> Invite employee</button>
        </div>
      </div>

      <div className="dashboard-stats">
        <button className="dashboard-stat dashboard-stat--people" onClick={() => navigate('/employees')}>
          <span className="dashboard-stat-icon">♙</span><span className="dashboard-stat-copy"><span>Total employees</span><strong>{employeeCount}</strong><small>Company members</small></span><span className="dashboard-stat-arrow">↗</span>
        </button>
        <button className="dashboard-stat dashboard-stat--active" onClick={() => navigate('/rides')}>
          <span className="dashboard-stat-icon">↗</span><span className="dashboard-stat-copy"><span>Active rides</span><strong>{summary.requestedRides}</strong><small>Currently in progress</small></span><span className="dashboard-stat-arrow">↗</span>
        </button>
        <button className="dashboard-stat dashboard-stat--complete" onClick={() => navigate('/rides')}>
          <span className="dashboard-stat-icon">✓</span><span className="dashboard-stat-copy"><span>Completed rides</span><strong>{summary.completedRides}</strong><small>Successfully completed</small></span><span className="dashboard-stat-arrow">↗</span>
        </button>
        <button className="dashboard-stat dashboard-stat--spending" onClick={() => navigate('/rides')}>
          <span className="dashboard-stat-icon">₹</span><span className="dashboard-stat-copy"><span>Company spending</span><strong>{formatMoney(summary.capturedAmount)}</strong><small>Payments captured</small></span><span className="dashboard-stat-arrow">↗</span>
        </button>
      </div>

      <div className="dashboard-panels">
        <article className="dashboard-panel dashboard-activity-panel">
          <div className="dashboard-panel-heading"><div><h3>Ride activity</h3><p>Company rides over the last seven days</p></div><span className="dashboard-period-chip">Last 7 days <span>⌄</span></span></div>
          {rides.length === 0 ? (
            <div className="dashboard-chart-empty"><div className="dashboard-chart-empty-icon">⌁</div><strong>No activity yet</strong><span>Ride activity will appear here as employees book trips.</span></div>
          ) : (
            <div className="dashboard-chart" role="img" aria-label="Ride count by day for the last seven days">
              <div className="dashboard-chart-y"><span>{maxCount}</span><span>{Math.ceil(maxCount * .75)}</span><span>{Math.ceil(maxCount * .5)}</span><span>{Math.ceil(maxCount * .25)}</span><span>0</span></div>
              <div className="dashboard-chart-plot"><div className="dashboard-chart-grid"><i /><i /><i /><i /><i /></div><div className="dashboard-chart-bars">{week.map(day => <div className="dashboard-chart-column" key={day.date.toISOString()}><div className="dashboard-chart-bar-wrap"><span className="dashboard-chart-value">{day.count}</span><span className="dashboard-chart-bar" style={{ height: `${Math.max(day.count ? 10 : 3, (day.count / maxCount) * 100)}%` }} /></div><small>{day.label}</small></div>)}</div></div>
            </div>
          )}
          <div className="dashboard-panel-footer"><span><i className="dashboard-legend-dot" /> Total rides: <strong>{summary.totalRides}</strong></span><button onClick={() => navigate('/rides')}>View ride history <span>→</span></button></div>
        </article>

        <article className="dashboard-panel dashboard-recent-panel">
          <div className="dashboard-panel-heading"><div><h3>Recent rides</h3><p>Your company’s latest trips</p></div><button className="dashboard-text-button" onClick={() => navigate('/rides')}>View all <span>→</span></button></div>
          {rides.length === 0 ? (
            <div className="dashboard-empty-rides"><div className="dashboard-empty-illustration"><span className="dashboard-empty-pin">●</span><span className="dashboard-empty-route" /><span className="dashboard-empty-car">▰</span><span className="dashboard-empty-spark">✦</span></div><strong>No rides yet</strong><p>Company rides will appear here once your employees start using UrbanRide.</p><button className="dashboard-button dashboard-button--secondary" onClick={() => navigate('/employees')}>Manage employees</button></div>
          ) : (
            <div className="dashboard-recent-list">{rides.slice(0, 4).map(ride => <button className="dashboard-recent-ride" key={ride.id} onClick={() => navigate('/rides')}><span className="dashboard-ride-marker">↗</span><span className="dashboard-ride-route"><strong>{ride.pickupAddress || 'Pickup location'}</strong><span>{ride.dropAddress || 'Drop-off location'}</span><small>{formatDate(ride.requestedAt)}</small></span><span className="dashboard-ride-meta"><strong>{formatMoney(Number(ride.finalFare ?? ride.estimatedFare ?? 0))}</strong><small className={`dashboard-status ${statusClass(ride.status)}`}>{ride.status.replace(/_/g, ' ')}</small></span></button>)}</div>
          )}
        </article>
      </div>

      <div className="dashboard-bottom-note"><span className="dashboard-bottom-note-icon">✓</span><span><strong>Your company data, in one place</strong><small>Employee access and ride information are scoped to your corporate account.</small></span><button onClick={() => navigate('/settings')}>Company settings <span>→</span></button></div>
    </section>
  )
}
