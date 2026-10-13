import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAdminOverview, useAdminRides, useAdminPayments } from '../api/admin-queries'
import type { AdminRide, AdminPayment } from '../api/admin-types'

function Metric({ label, value }: { label: string; value: string }) {
  return <article className="metric-card"><div className="metric-top">{label}</div><div className="metric-value">{value}</div></article>
}
function money(value: number | string | null | undefined) {
  const n = Number(value)
  return Number.isFinite(n) ? `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}` : '—'
}
function dateLabel(value?: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
}
function LiveTrend({ rides, payments, rangeDays }: { rides: AdminRide[]; payments: AdminPayment[]; rangeDays: number }) {
  const days = Array.from({ length: rangeDays }, (_, i) => {
    const d = new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate() - (rangeDays-1-i))
    return d
  })
  const inRange = (raw?: string | null, day?: Date) => {
    if (!raw || !day) return false
    const d = new Date(raw); return !Number.isNaN(d.getTime()) && d.toDateString() === day.toDateString()
  }
  const rideCounts = days.map(day => rides.filter(r => inRange(r.requestedAt ?? r.createdAt, day)).length)
  const paymentTotals = days.map(day => payments.filter(p => inRange(p.createdAt, day) && p.status === 'CAPTURED').reduce((sum,p) => sum + Number(p.amount || 0), 0))
  const hasDates = rides.some(r => r.requestedAt || r.createdAt) || payments.some(p => p.createdAt)
  if (!hasDates) return <div className="empty-state">No dated ride or payment records were returned by the backend. Trend lines will appear when the API returns dated records.</div>
  const width=760, height=290, left=48, right=20, top=18, bottom=42
  const plotW=width-left-right, plotH=height-top-bottom
  const maxRide=Math.max(1,...rideCounts), maxPay=Math.max(1,...paymentTotals)
  const x=(i:number)=>left+(days.length===1?plotW/2:i*plotW/(days.length-1))
  const y=(v:number,max:number)=>top+plotH-(v/max)*plotH
  const path=(vals:number[],max:number)=>vals.map((v,i)=>`${i?'L':'M'} ${x(i).toFixed(1)} ${y(v,max).toFixed(1)}`).join(' ')
  const area=(vals:number[],max:number)=>`${path(vals,max)} L ${x(vals.length-1)} ${top+plotH} L ${x(0)} ${top+plotH} Z`
  const labelEvery = rangeDays <= 7 ? 1 : rangeDays <= 14 ? 2 : 5
  return <div className="live-chart-wrap">
    <div className="chart-legend"><span><i className="legend-dot legend-blue"/> Ride requests</span><span><i className="legend-dot legend-green"/> Captured payment volume</span></div>
    <div className="chart-summary"><div><small>Rides in returned records</small><strong>{rides.length.toLocaleString('en-IN')}</strong></div><div><small>Captured payment records</small><strong>{payments.filter(p=>p.status==='CAPTURED').length.toLocaleString('en-IN')}</strong></div><div><small>Captured amount in returned records</small><strong>{money(payments.filter(p=>p.status==='CAPTURED').reduce((n,p)=>n+Number(p.amount||0),0))}</strong></div></div>
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${rangeDays}-day ride and captured-payment trends calculated from returned backend records`} className="live-chart premium-chart">
      {[0,.25,.5,.75,1].map((t,i)=><g key={i}><line x1={left} x2={width-right} y1={top+plotH*t} y2={top+plotH*t} stroke="var(--line)" strokeDasharray="4 6"/><text x={left-10} y={top+plotH*t+4} textAnchor="end" fill="var(--muted)" fontSize="10">{Math.round(maxRide*(1-t))}</text></g>)}
      <path d={area(rideCounts,maxRide)} fill="#6474ed" opacity=".12"/><path d={area(paymentTotals,maxPay)} fill="#1aa77a" opacity=".10"/>
      <path d={path(rideCounts,maxRide)} fill="none" stroke="#6474ed" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d={path(paymentTotals,maxPay)} fill="none" stroke="#1aa77a" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
      {days.map((d,i)=>(i%labelEvery===0||i===days.length-1)?<g key={d.toISOString()}><circle cx={x(i)} cy={y(rideCounts[i],maxRide)} r="3.8" fill="#6474ed" stroke="var(--panel)" strokeWidth="2"/><circle cx={x(i)} cy={y(paymentTotals[i],maxPay)} r="3.8" fill="#1aa77a" stroke="var(--panel)" strokeWidth="2"/><text x={x(i)} y={height-14} textAnchor="middle" fill="var(--muted)" fontSize="10">{d.toLocaleDateString('en-IN',{day:'2-digit',month:'short'})}</text></g>:null)}
    </svg>
    <div className="chart-footnote">Last {rangeDays} days · computed from actual returned records only. Lines are independently scaled for readability; no synthetic records are used.</div>
  </div>
}
export function DashboardPage() {
  const [rangeDays, setRangeDays] = useState(7)
  const overview = useAdminOverview()
  const ridesQuery = useAdminRides()
  const paymentsQuery = useAdminPayments()
  const rides = ridesQuery.data ?? []
  const payments = paymentsQuery.data ?? []
  const data = overview.data
  const statuses = data?.rides.byStatus ? Object.entries(data.rides.byStatus) : []
  const refreshing = overview.isFetching || ridesQuery.isFetching || paymentsQuery.isFetching
  const refreshAll = () => { void Promise.all([overview.refetch(), ridesQuery.refetch(), paymentsQuery.refetch()]) }
  return <>
    <div className="page-heading"><div><p className="eyebrow">URBANRIDE PLATFORM</p><h1>Platform overview</h1><p>Live metrics and charts derived from the UrbanRide backend.</p></div><div className="heading-actions"><select className="range-select" aria-label="Chart time range" value={rangeDays} onChange={e=>setRangeDays(Number(e.target.value))}><option value={7}>Last 7 days</option><option value={14}>Last 14 days</option><option value={31}>Last 31 days</option></select><button className="primary-button" onClick={refreshAll} disabled={refreshing}>↻ &nbsp; {refreshing ? 'Refreshing…' : 'Refresh data'}</button></div></div>
    {overview.isLoading && <div className="notice">Loading live platform metrics…</div>}
    {overview.isError && <div className="notice"><strong>Overview unavailable.</strong> Could not load <code>/admin/overview</code>. No demo metrics are substituted.</div>}
    {data && <div className="metrics-grid"><Metric label="Total rides" value={data.rides.total.toLocaleString('en-IN')} /><Metric label="Total payments" value={data.payments.total.toLocaleString('en-IN')} /><Metric label="Captured amount" value={money(data.payments.capturedAmount)} /><Metric label="Corporate accounts" value={data.corporate.accounts.toLocaleString('en-IN')} /><Metric label="Corporate employees" value={data.corporate.employees.toLocaleString('en-IN')} /><Metric label="Rider device tokens" value={data.rider.deviceTokens.toLocaleString('en-IN')} /></div>}
    <div className="dashboard-grid" style={{marginTop:22}}>
      <section className="panel"><div className="panel-header"><div><h2 className="panel-title">Ride & payment trends</h2><p className="panel-subtitle">Real backend records · selectable date range</p></div><div className="chart-actions"><span className="range-chip">{rangeDays} day view</span><button className="secondary-button" onClick={refreshAll} disabled={refreshing}>↻ Refresh</button></div></div>
        {(ridesQuery.isError || paymentsQuery.isError) ? <div className="notice">Could not load one or more data sources (<code>/admin/rides</code>, <code>/admin/payments</code>). The chart is not replaced with demo data.</div> : (ridesQuery.isLoading || paymentsQuery.isLoading) ? <div className="empty-state">Loading ride and payment records…</div> : <LiveTrend rides={rides} payments={payments} rangeDays={rangeDays}/>}
      </section>
      <section className="panel"><div className="panel-header"><div><h2 className="panel-title">Ride status breakdown</h2><p className="panel-subtitle">Counts returned by /admin/overview</p></div></div>
        {statuses.length ? <div className="status-list">{statuses.map(([status,count])=>{const total=Math.max(1,...statuses.map(([,n])=>Number(n)));const color=status.toLowerCase().includes('cancel')?'#e16a7b':status.toLowerCase().includes('complete')?'#20b486':status.toLowerCase().includes('assign')?'#6d7af2':'#e6a348';return <div className="status-item" key={status}><div className="status-row"><span className="status-dot-color" style={{background:color}}/><span className="label">{status.replaceAll('_',' ' ).toLowerCase().replace(/\b\w/g,c=>c.toUpperCase())}</span><strong>{Number(count).toLocaleString('en-IN')}</strong></div><div className="status-track"><span style={{width:`${Math.max(0,Number(count))/total*100}%`,background:color}}/></div></div>})}</div> : <div className="empty-state">No ride-status counts returned.</div>}
      </section>
    </div>
    <section className="panel" style={{marginTop:18}}><div className="panel-header"><div><h2 className="panel-title">Recent rides</h2><p className="panel-subtitle">Latest records returned by /admin/rides</p></div><Link className="view-all" to="/rides">Open ride operations ↗</Link></div>
      {ridesQuery.isLoading ? <div className="empty-state">Loading real ride records…</div> : ridesQuery.isError ? <div className="empty-state">Ride records unavailable. Check the backend endpoint; no sample rides are shown.</div> : rides.length === 0 ? <div className="empty-state">The backend returned no ride records.</div> : <div className="table-scroll"><table className="data-table"><thead><tr><th>Ride ID</th><th>Status</th><th>Pickup</th><th>Drop-off</th><th>Estimated fare</th><th>Requested</th></tr></thead><tbody>{[...rides].sort((a,b)=>new Date(b.requestedAt ?? b.createdAt ?? 0).getTime()-new Date(a.requestedAt ?? a.createdAt ?? 0).getTime()).slice(0,6).map(r=><tr key={r.id}><td title={r.id}><code>{r.id.length>14?`${r.id.slice(0,8)}…${r.id.slice(-4)}`:r.id}</code></td><td><span className="record-status">{r.status}</span></td><td>{r.pickupAddress || '—'}</td><td>{r.dropAddress || '—'}</td><td>{money(r.estimatedFare)}</td><td>{dateLabel(r.requestedAt ?? r.createdAt)}</td></tr>)}</tbody></table></div>}
    </section>
    <section className="panel" style={{marginTop:18}}><div className="panel-header"><div><h2 className="panel-title">Payment activity</h2><p className="panel-subtitle">Latest payment records returned by /admin/payments</p></div><Link className="view-all" to="/payments">Open payments ↗</Link></div>
      {paymentsQuery.isLoading ? <div className="empty-state">Loading payment records…</div> : paymentsQuery.isError ? <div className="empty-state">Payment records unavailable. No sample payments are shown.</div> : payments.length === 0 ? <div className="empty-state">The backend returned no payment records.</div> : <div className="table-scroll"><table className="data-table"><thead><tr><th>Payment ID</th><th>Status</th><th>Amount</th><th>Ride ID</th><th>Created</th></tr></thead><tbody>{[...payments].sort((a,b)=>new Date(b.createdAt ?? 0).getTime()-new Date(a.createdAt ?? 0).getTime()).slice(0,5).map(p=><tr key={p.id}><td title={p.id}><code>{p.id.length>14?`${p.id.slice(0,8)}…${p.id.slice(-4)}`:p.id}</code></td><td><span className="record-status">{p.status}</span></td><td>{money(p.amount)}</td><td>{p.rideId || '—'}</td><td>{dateLabel(p.createdAt)}</td></tr>)}</tbody></table></div>}
    </section>
  </>
}
