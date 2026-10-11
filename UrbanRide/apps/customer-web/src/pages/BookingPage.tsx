import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { MapView } from '../components/MapView'
import { RideBookingCard } from '../components/RideBookingCard'
import type { LocationSelection } from '../features/rides/ride-request'
import type { CreatedRide } from '../services/rides'
import { ROUTE_PATHS } from '../routes/route-paths'
import { UrbanRideLogo } from '../components/UrbanRideLogo'

type Coordinate = { latitude: number; longitude: number }

export function BookingPage() {
  const navigate = useNavigate()
  const [pickup, setPickup] = useState<LocationSelection | null>(null)
  const [drop, setDrop] = useState<LocationSelection | null>(null)
  const pickupCoordinate: Coordinate | undefined = pickup ? { latitude: pickup.latitude, longitude: pickup.longitude } : undefined
  const dropCoordinate: Coordinate | undefined = drop ? { latitude: drop.latitude, longitude: drop.longitude } : undefined

  function handleRideCreated(_ride: CreatedRide) {
    navigate(ROUTE_PATHS.home, { replace: true })
  }

  return (
    <div className="booking-page">
      <aside className="booking-sidebar">
        <header className="booking-sidebar-brand">
          <Link to={ROUTE_PATHS.home} className="booking-brand" aria-label="UrbanRide home"><UrbanRideLogo markSize={30} /></Link>
          <Link className="booking-back-link" to={ROUTE_PATHS.home} aria-label="Back to Home">←</Link>
        </header>
        <div className="booking-sidebar-content">
          <span className="section-eyebrow">YOUR NEXT JOURNEY</span>
          <h1>Route Details</h1>
          <p className="booking-intro">Choose your pickup and destination to find the best way there.</p>
          <RideBookingCard onRideCreated={handleRideCreated} onLocationsChange={(nextPickup, nextDrop) => { setPickup(nextPickup); setDrop(nextDrop) }} />
        </div>
        <footer className="booking-sidebar-footer">UrbanRide · Safe. Reliable. Around you.</footer>
      </aside>
      <section className="booking-map-panel">
        <div className="booking-map-topbar"><Link to={ROUTE_PATHS.home} className="booking-map-back">← <span>Back to Home</span></Link><span className="map-status"><i /> Live route map</span></div>
        <div className="booking-map"><MapView pickup={pickupCoordinate} drop={dropCoordinate} height="100%" /></div>
        <div className="booking-route-summary">
          <div className="booking-route-summary-heading"><span className="section-eyebrow">YOUR ROUTE</span><strong>{pickup && drop ? 'Route preview ready' : 'Your journey starts here'}</strong></div>
          <div className="booking-route-points"><div><span className="route-dot" /><span><small>Pickup</small><strong>{pickup?.address ?? 'Choose your pickup'}</strong></span></div><div><span className="route-dot destination-dot" /><span><small>Destination</small><strong>{drop?.address ?? 'Choose your destination'}</strong></span></div></div>
        </div>
      </section>
    </div>
  )
}
