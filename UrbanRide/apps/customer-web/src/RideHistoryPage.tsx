import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ROUTE_PATHS } from './routes/route-paths'
import { getCustomerRides, type CreatedRide } from './services/rides'
import '../styles/ride-history.css'

type RideFilter = 'all' | 'active' | 'completed' | 'cancelled'

function statusText(status: CreatedRide['status']): string {
  return status.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function rideTypeText(type: CreatedRide['rideType']): string {
  if (type === 'bike') return 'Bike'
  if (type === 'auto') return 'Auto'
  if (type === 'cab') return 'Car'
  return 'Vehicle not recorded'
}

function fareText(ride: CreatedRide): string {
  const fare = ride.finalFare ?? ride.estimatedFare
  return fare == null || !Number.isFinite(Number(fare)) ? 'Fare unavailable' : `₹${Number(fare).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
}

function dateText(value?: string): string {
  if (!value) return 'Date not available'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Date not available' : date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

function isActive(status: CreatedRide['status']): boolean {
  return !['COMPLETED', 'CANCELLED'].includes(status)
}

export function RideHistoryPage() {
  const [rides, setRides] = useState<CreatedRide[]>([])
  const [filter, setFilter] = useState<RideFilter>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadRides = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const result = await getCustomerRides()
      result.sort((a, b) => new Date(b.requestedAt ?? 0).getTime() - new Date(a.requestedAt ?? 0).getTime())
      setRides(result)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load your ride history. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void loadRides() }, [loadRides])

  const filteredRides = useMemo(() => rides.filter((ride) => {
    if (filter === 'active') return isActive(ride.status)
    if (filter === 'completed') return ride.status === 'COMPLETED'
    if (filter === 'cancelled') return ride.status === 'CANCELLED'
    return true
  }), [rides, filter])

  const activeCount = rides.filter((ride) => isActive(ride.status)).length
  const completedCount = rides.filter((ride) => ride.status === 'COMPLETED').length

  return (
    <div className="ride-history-page">
      <header className="ride-history-header">
        <div>
          <span className="section-eyebrow">YOUR JOURNEYS</span>
          <h1>My rides</h1>
          <p>All your upcoming, completed and cancelled UrbanRide trips in one place.</p>
        </div>
        <div className="ride-history-header-actions">
          <button className="secondary-button" type="button" onClick={() => void loadRides()} disabled={loading}>↻ Refresh</button>
          <Link className="primary-button" to={ROUTE_PATHS.booking}>＋ Book a ride</Link>
        </div>
      </header>

      <section className="ride-history-summary" aria-label="Ride summary">
        <article><span className="ride-history-summary-icon">◷</span><div><small>Total rides</small><strong>{loading ? '—' : rides.length}</strong></div></article>
        <article><span className="ride-history-summary-icon">↗</span><div><small>Active rides</small><strong>{loading ? '—' : activeCount}</strong></div></article>
        <article><span className="ride-history-summary-icon">✓</span><div><small>Completed rides</small><strong>{loading ? '—' : completedCount}</strong></div></article>
      </section>

      <section className="ride-history-list-panel">
        <div className="ride-history-list-heading">
          <div><h2>Ride history</h2><p>Trip information is loaded from your UrbanRide account.</p></div>
          <div className="ride-history-filters" role="group" aria-label="Filter rides">
            {([['all', 'All rides'], ['active', 'Active'], ['completed', 'Completed'], ['cancelled', 'Cancelled']] as const).map(([key, label]) => (
              <button key={key} type="button" className={filter === key ? 'is-selected' : ''} onClick={() => setFilter(key)} aria-pressed={filter === key}>{label}</button>
            ))}
          </div>
        </div>

        {loading && <div className="ride-history-state"><span className="loading-indicator" /><p>Loading your rides from UrbanRide…</p></div>}
        {!loading && error && <div className="ride-history-state is-error" role="alert"><strong>We couldn't load your rides.</strong><p>{error}</p><button className="secondary-button" type="button" onClick={() => void loadRides()}>Try again</button></div>}
        {!loading && !error && filteredRides.length === 0 && <div className="ride-history-state"><span className="ride-history-empty-icon">⌁</span><h3>{rides.length === 0 ? 'No rides yet' : 'No rides in this filter'}</h3><p>{rides.length === 0 ? 'When you book a ride, it will appear here with its status, route and fare.' : 'Choose another filter to see your other trips.'}</p>{rides.length === 0 && <Link className="primary-button" to={ROUTE_PATHS.booking}>Book your first ride</Link>}</div>}

        {!loading && !error && filteredRides.length > 0 && <div className="ride-history-items">{filteredRides.map((ride) => (
          <article className="ride-history-item" key={ride.id}>
            <div className="ride-history-item-icon" aria-hidden="true">{ride.rideType === 'bike' ? '🏍' : ride.rideType === 'auto' ? '🛺' : '🚘'}</div>
            <div className="ride-history-item-main">
              <div className="ride-history-item-title"><strong>{rideTypeText(ride.rideType)} ride</strong><span className={`ride-history-status status-${ride.status.toLowerCase().replaceAll('_', '-')}`}>{statusText(ride.status)}</span></div>
              <small className="ride-history-date">{dateText(ride.requestedAt)}</small>
              <div className="ride-history-route" aria-label="Trip route">
                <div className="ride-history-route-stop"><span className="route-dot route-dot-start" /><span>{ride.pickupAddress || 'Pickup address unavailable'}</span></div>
                <div className="ride-history-route-stop"><span className="route-dot route-dot-end" /><span>{ride.dropAddress || 'Destination unavailable'}</span></div>
              </div>
              <div className="ride-history-item-meta"><span>{ride.estimatedDistance != null ? `${Number(ride.estimatedDistance).toLocaleString('en-IN', { maximumFractionDigits: 1 })} km estimated` : 'Distance unavailable'}</span><span>Ride ID: {ride.id.slice(0, 8)}</span></div>
            </div>
            <div className="ride-history-fare"><small>{ride.finalFare != null ? 'Final fare' : 'Estimated fare'}</small><strong>{fareText(ride)}</strong></div>
          </article>
        ))}</div>}
      </section>
      <footer className="ride-history-footer"><span>UrbanRide · Your city. Your ride.</span><Link to={ROUTE_PATHS.home}>Back to home →</Link></footer>
    </div>
  )
}
