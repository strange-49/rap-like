import { useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAdminOverview, useAdminRides, useAdminPayments } from '../api/admin-queries'

const pages: Record<string, { title: string; subtitle: string; links: [string, string][] }> = {
  '/support': { title: 'Support & disputes', subtitle: 'Review ride and payment activity while support-case integration is connected.', links: [['Ride operations', '/rides'], ['Payments', '/payments']] },
  '/fleet': { title: 'Live fleet', subtitle: 'Review real rider and ride records. Live GPS requires a fleet-location endpoint.', links: [['Riders', '/riders'], ['Ride operations', '/rides']] },
  '/analytics': { title: 'Reports & analytics', subtitle: 'Metrics calculated from records returned by the UrbanRide backend.', links: [['Overview', '/'], ['Payments', '/payments']] },
  '/notifications': { title: 'Notifications', subtitle: 'Notification delivery records and sending controls.', links: [['Settings', '/settings'], ['Support & disputes', '/support']] },
  '/admins': { title: 'Admin users & audit', subtitle: 'Administrator access and audit trail.', links: [['Settings', '/settings'], ['Overview', '/']] },
  '/settings': { title: 'Settings & system health', subtitle: 'Review available platform data and configure this dashboard view.', links: [['Admin users & audit', '/admins'], ['Notifications', '/notifications']] },
}
function money(value: number) {
  return `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
}
function Metric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <article className="metric-card"><div className="metric-top">{label}</div><div className="metric-value">{value}</div><div className="metric-bottom">{detail}</div></article>
}
function ConnectionNote({ title, detail }: { title: string; detail: string }) {
  return <section className="panel" style={{ marginBottom: 16 }}><div className="panel-header"><div><h2 className="panel-title">{title}</h2><p className="panel-subtitle">{detail}</p></div></div></section>
}
export function AdminModulePage() {
  const location = useLocation()
  const page = pages[location.pathname] ?? pages['/support']
  const overview = useAdminOverview()
  const ridesQuery = useAdminRides()
  const paymentsQuery = useAdminPayments()
  const [settingsTab, setSettingsTab] = useState('General')
  const [refreshSeconds, setRefreshSeconds] = useState('30')
  const [saved, setSaved] = useState(false)
  const rides = ridesQuery.data ?? []
  const payments = paymentsQuery.data ?? []
  const totalCaptured = useMemo(() => payments.filter(p => p.status.toUpperCase() === 'CAPTURED').reduce((sum, p) => sum + Number(p.amount || 0), 0), [payments])
  const statuses = useMemo(() => Object.entries(rides.reduce<Record<string, number>>((acc, ride) => {
    const status = ride.status || 'UNKNOWN'; acc[status] = (acc[status] ?? 0) + 1; return acc
  }, {})).sort((a,b) => b[1]-a[1]), [rides])
  const isAnalytics = location.pathname === '/analytics'
  const isSettings = location.pathname === '/settings'
  const isFleet = location.pathname === '/fleet'
  const isSupport = location.pathname === '/support'
  const isNotifications = location.pathname === '/notifications'
  const isAdmins = location.pathname === '/admins'
  return <>
    <div className="page-heading"><div><p className="eyebrow">URBANRIDE OPERATIONS</p><h1>{page.title}</h1><p>{page.subtitle}</p></div>
      <div className="heading-actions"><button className="secondary-button" onClick={() => { void overview.refetch(); void ridesQuery.refetch(); void paymentsQuery.refetch() }}>↻ Refresh data</button></div>
    </div>
    {(overview.isError || ridesQuery.isError || paymentsQuery.isError) && <ConnectionNote title="Some live data could not be loaded" detail="Check that the UrbanRide backend is running and that its admin endpoints are reachable. Missing data is not replaced with sample records." />}
    {isAnalytics && <>
      <div className="metrics-grid">
        <Metric label="Ride records returned" value={ridesQuery.isLoading ? '…' : ridesQuery.isError ? 'Unavailable' : rides.length.toLocaleString('en-IN')} detail="From GET /admin/rides" />
        <Metric label="Payment records returned" value={paymentsQuery.isLoading ? '…' : paymentsQuery.isError ? 'Unavailable' : payments.length.toLocaleString('en-IN')} detail="From GET /admin/payments" />
        <Metric label="Captured payments" value={paymentsQuery.isLoading ? '…' : payments.filter(p=>p.status.toUpperCase()==='CAPTURED').length.toLocaleString('en-IN')} detail="Status: CAPTURED" />
        <Metric label="Captured amount" value={paymentsQuery.isLoading ? '…' : money(totalCaptured)} detail="Sum of returned captured payments" />
      </div>
      <section className="panel"><div className="panel-header"><div><h2 className="panel-title">Ride status breakdown</h2><p className="panel-subtitle">Counts are computed from the ride records returned by the API.</p></div></div>
        {ridesQuery.isLoading ? <div className="empty-state">Loading ride records…</div> : ridesQuery.isError ? <div className="empty-state">Ride records could not be loaded. Check the backend connection.</div> : statuses.length === 0 ? <div className="empty-state">The API returned no ride records.</div> : <div className="status-list">{statuses.map(([status,count])=><div key={status}><div className="status-row"><span className="status-dot-color" style={{background:'var(--accent)'}}/><span className="label">{status.replaceAll('_',' ')}</span><strong>{count}</strong></div><div className="status-track"><span style={{width:`${Math.max(3,count/Math.max(...statuses.map(x=>x[1]))*100)}%`,background:'var(--accent)'}}/></div></div>)}</div>}
      </section>
    </>}
    {isSettings && <>
      <section className="panel">
        <div className="panel-header"><div><h2 className="panel-title">Dashboard preferences</h2><p className="panel-subtitle">These controls affect this view only; they do not change backend or business settings.</p></div></div>
        <div className="settings-tabs">{['General','Pricing','Integrations','System Health','Feature Flags'].map(tab=><button key={tab} className={`secondary-button ${settingsTab===tab?'settings-tab-active':''}`} onClick={()=>{setSettingsTab(tab);setSaved(false)}}>{tab}</button>)}</div>
        {settingsTab==='General' && <div className="settings-form"><label>Dashboard refresh interval<select className="select-control" value={refreshSeconds} onChange={e=>{setRefreshSeconds(e.target.value);setSaved(false)}}><option value="10">10 seconds</option><option value="30">30 seconds</option><option value="60">60 seconds</option></select></label><p className="panel-subtitle">Current theme can be changed using the sun/moon control in the top bar.</p><button className="primary-button" onClick={()=>setSaved(true)}>Save dashboard preference</button>{saved&&<p className="settings-saved">Preference selected: refresh every {refreshSeconds} seconds. This selection is not persisted across reloads yet.</p>}</div>}
        {settingsTab==='Pricing' && <ConnectionNote title="Pricing configuration is not exposed here" detail="Fare rules must be read from and saved to a verified backend configuration endpoint. No editable prices are fabricated on this screen."/>}
        {settingsTab==='Integrations' && <div className="integration-list">{['Razorpay payments','Twilio messaging','Firebase notifications','WebSocket realtime'].map(item=><div className="integration-row" key={item}><span>{item}</span><span className="status-badge pending">Status unavailable</span></div>)}</div>}
        {settingsTab==='System Health' && <div className="integration-list"><div className="integration-row"><span>Admin overview endpoint</span><span className={`status-badge ${overview.isError?'failed':overview.isLoading?'pending':'active'}`}>{overview.isError?'Request failed':overview.isLoading?'Checking':'Responding'}</span></div><div className="integration-row"><span>Ride records endpoint</span><span className={`status-badge ${ridesQuery.isError?'failed':ridesQuery.isLoading?'pending':'active'}`}>{ridesQuery.isError?'Request failed':ridesQuery.isLoading?'Checking':'Responding'}</span></div><div className="integration-row"><span>Payment records endpoint</span><span className={`status-badge ${paymentsQuery.isError?'failed':paymentsQuery.isLoading?'pending':'active'}`}>{paymentsQuery.isError?'Request failed':paymentsQuery.isLoading?'Checking':'Responding'}</span></div><p className="panel-subtitle">A responding endpoint confirms only that request succeeded; it does not prove the health of the database or third-party services.</p></div>}
        {settingsTab==='Feature Flags' && <ConnectionNote title="Feature flag service not connected" detail="Feature flags should be loaded from a backend-controlled configuration. No toggles are shown that would imply changes have been applied."/>}
      </section>
    </>}
    {isFleet && <>
      <div className="metrics-grid"><Metric label="Ride records available" value={ridesQuery.isLoading?'…':ridesQuery.isError?'Unavailable':String(rides.length)} detail="Returned by ride API"/><Metric label="Assigned rides" value={ridesQuery.isLoading?'…':String(rides.filter(r=>r.status.toUpperCase()==='ASSIGNED').length)} detail="Based on actual ride status"/><Metric label="Ongoing rides" value={ridesQuery.isLoading?'…':String(rides.filter(r=>['ONGOING','IN_PROGRESS'].includes(r.status.toUpperCase())).length)} detail="Based on actual ride status"/><Metric label="Rider location feed" value="Not connected" detail="No simulated GPS positions"/></div>
      <ConnectionNote title="Live map requires rider coordinates" detail="The current admin API exposes ride records, but this source does not establish a live fleet/GPS endpoint. The map will be enabled when real rider location updates are available."/>
      <section className="panel"><div className="panel-header"><div><h2 className="panel-title">Current ride activity</h2><p className="panel-subtitle">Real ride records, without invented locations.</p></div><Link className="view-all" to="/rides">Open rides ↗</Link></div><div className="table-wrap"><table><thead><tr><th>Ride ID</th><th>Status</th><th>Pickup</th><th>Destination</th></tr></thead><tbody>{rides.slice(0,8).map(r=><tr key={r.id}><td className="ride-id">{r.id.slice(0,12)}</td><td><span className={`status-badge ${r.status.toLowerCase().replaceAll('_','-')}`}>{r.status}</span></td><td>{r.pickupAddress||'—'}</td><td>{r.dropAddress||'—'}</td></tr>)}</tbody></table></div>{!ridesQuery.isLoading&&!ridesQuery.isError&&rides.length===0&&<div className="empty-state">No ride records returned.</div>}</section>
    </>}
    {isSupport && <>
      <div className="metrics-grid"><Metric label="Ride records to review" value={ridesQuery.isLoading?'…':ridesQuery.isError?'Unavailable':String(rides.length)} detail="Actual returned ride records"/><Metric label="Cancelled rides" value={ridesQuery.isLoading?'…':String(rides.filter(r=>r.status.toUpperCase()==='CANCELLED').length)} detail="From ride API"/><Metric label="Failed payments" value={paymentsQuery.isLoading?'…':String(payments.filter(p=>p.status.toUpperCase()==='FAILED').length)} detail="From payment API"/><Metric label="Support ticket feed" value="Not connected" detail="No fake tickets displayed"/></div>
      <ConnectionNote title="Support cases need a backend endpoint" detail="The page now surfaces real rides and failed payments that may need investigation. Ticket assignment, replies, and dispute resolution require a verified support API."/>
      <div className="module-grid"><Link className="module-card" to="/rides"><h3>Investigate rides</h3><p>Open ride records and their current statuses.</p><span className="view-all">Open ride operations ↗</span></Link><Link className="module-card" to="/payments"><h3>Investigate payments</h3><p>Review actual payment records and statuses.</p><span className="view-all">Open payments ↗</span></Link></div>
    </>}
    {isNotifications && <>
      <div className="metrics-grid"><Metric label="Payment records" value={paymentsQuery.isLoading?'…':paymentsQuery.isError?'Unavailable':String(payments.length)} detail="Available for reconciliation"/><Metric label="Failed payments" value={paymentsQuery.isLoading?'…':String(payments.filter(p=>p.status.toUpperCase()==='FAILED').length)} detail="Actual payment statuses"/><Metric label="Ride records" value={ridesQuery.isLoading?'…':ridesQuery.isError?'Unavailable':String(rides.length)} detail="Returned by ride API"/><Metric label="Delivery status feed" value="Not connected" detail="SMS/email/push logs unavailable"/></div>
      <ConnectionNote title="Delivery history and sending controls are not connected" detail="No messages are sent from this page. Connect the backend notification history and dispatch endpoints before showing recipients, delivery statuses, or a Send Notification action."/>
      <section className="panel"><div className="panel-header"><div><h2 className="panel-title">Available operational records</h2><p className="panel-subtitle">Payment and ride records can be reviewed while delivery logs are integrated.</p></div></div><div className="module-grid"><Link className="module-card" to="/rides"><h3>Ride operations</h3><p>Inspect current ride statuses.</p><span className="view-all">Open rides ↗</span></Link><Link className="module-card" to="/payments"><h3>Payments</h3><p>Review payment statuses.</p><span className="view-all">Open payments ↗</span></Link></div></section>
    </>}
    {isAdmins && <>
      <div className="metrics-grid"><Metric label="Overview endpoint" value={overview.isError?'Unavailable':overview.isLoading?'Checking':'Responding'} detail="GET /admin/overview"/><Metric label="Ride endpoint" value={ridesQuery.isError?'Unavailable':ridesQuery.isLoading?'Checking':'Responding'} detail="GET /admin/rides"/><Metric label="Payment endpoint" value={paymentsQuery.isError?'Unavailable':paymentsQuery.isLoading?'Checking':'Responding'} detail="GET /admin/payments"/><Metric label="Admin directory" value="Not connected" detail="No fabricated admin accounts"/></div>
      <ConnectionNote title="Admin user management and audit logging need dedicated routes" detail="This source only defines overview, rides, and payments queries. Adding accounts, changing roles, or showing IP addresses/security events without verified endpoints would be unsafe and misleading."/>
      <section className="panel"><div className="panel-header"><div><h2 className="panel-title">Available admin data</h2><p className="panel-subtitle">Verified operational endpoints currently used by this dashboard.</p></div></div><div className="integration-list"><div className="integration-row"><span>Platform overview</span><span className={`status-badge ${overview.isError?'failed':overview.isLoading?'pending':'active'}`}>{overview.isError?'Request failed':overview.isLoading?'Checking':'Available'}</span></div><div className="integration-row"><span>Ride operations</span><span className={`status-badge ${ridesQuery.isError?'failed':ridesQuery.isLoading?'pending':'active'}`}>{ridesQuery.isError?'Request failed':ridesQuery.isLoading?'Checking':'Available'}</span></div><div className="integration-row"><span>Payments</span><span className={`status-badge ${paymentsQuery.isError?'failed':paymentsQuery.isLoading?'pending':'active'}`}>{paymentsQuery.isError?'Request failed':paymentsQuery.isLoading?'Checking':'Available'}</span></div></div></section>
    </>}
    <div className="section-heading"><div><h2>Related areas</h2><p>Navigate to another admin section</p></div></div><div className="module-grid">{page.links.map(([label,to])=><Link className="module-card" key={to} to={to}><h3>{label}</h3><p>Open this section.</p><span className="view-all">Open section ↗</span></Link>)}</div>
  </>
}
