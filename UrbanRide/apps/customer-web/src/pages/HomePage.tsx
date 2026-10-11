
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { MapView } from '../components/MapView'
import { PaymentCard } from '../components/PaymentCard'
import { RideBookingCard } from '../components/RideBookingCard'
import type { LocationSelection } from '../features/rides/ride-request'
import { ROUTE_PATHS } from '../routes/route-paths'
import { UrbanRideLogo } from '../components/UrbanRideLogo'
import {
  cancelRide,
  confirmRideCompletion,
  getCustomerRides,
  getRideById,
  getRideStartOtp,
  rateRide,
  type CreatedRide,
} from '../services/rides'
import {
  getOutstandingPayment,
  type OutstandingPayment,
} from '../services/payments'
import {
  customerRealtime,
  type RideRealtimeEvent,
} from '../services/realtime'

type MapCoordinate = {
  latitude: number
  longitude: number
}

export function HomePage() {
  const navigate = useNavigate()
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [createdRide, setCreatedRide] = useState<CreatedRide | null>(null)
  const createdRideRef = useRef<CreatedRide | null>(null)

  const [rideStatus, setRideStatus] =
    useState<CreatedRide['status'] | null>(null)
  const [rideError, setRideError] = useState<string | null>(null)

  const [rideHistory, setRideHistory] = useState<CreatedRide[]>([])
  const [historyLoading, setHistoryLoading] = useState(true)
  const [historyError, setHistoryError] = useState<string | null>(null)

  const [cancellingRideId, setCancellingRideId] = useState<string | null>(null)
  const [outstandingPayment, setOutstandingPayment] =
    useState<OutstandingPayment | null>(null)
  const [confirmingRide, setConfirmingRide] = useState(false)

  const [ratingScore, setRatingScore] = useState(0)
  const [ratingFeedback, setRatingFeedback] = useState('')
  const [rideStartOtp, setRideStartOtp] = useState<string | null>(null)

  const [selectedPickup, setSelectedPickup] =
    useState<LocationSelection | null>(null)
  const [selectedDrop, setSelectedDrop] =
    useState<LocationSelection | null>(null)

  const [mapOpen, setMapOpen] = useState(false)
  const [mapFullscreen, setMapFullscreen] = useState(false)

  useEffect(() => {
    const openDetails = async () => {
      if (!createdRideRef.current) {
        await loadRideHistory()
      }
      if (createdRideRef.current) {
        setDetailsOpen(true)
      } else {
        navigate(ROUTE_PATHS.booking)
      }
    }
    window.addEventListener('urbanride:open-ride-details', openDetails)
    return () => window.removeEventListener('urbanride:open-ride-details', openDetails)
  }, [navigate])

  function updateCreatedRide(ride: CreatedRide) {
    createdRideRef.current = ride
    setCreatedRide(ride)
    setRideStatus(ride.status)
  }

  async function loadRideHistory() {
    try {
      setHistoryLoading(true)
      setHistoryError(null)

      const rides = await getCustomerRides()
      setRideHistory(rides)

      if (!createdRideRef.current) {
        const activeRide = rides.find((ride) =>
          [
            'REQUESTED',
            'SEARCHING',
            'ASSIGNED',
            'DRIVER_ARRIVING',
            'IN_PROGRESS',
          ].includes(ride.status),
        )

        if (activeRide) {
          updateCreatedRide(await getRideById(activeRide.id))
        }
      }

      const outstanding = await getOutstandingPayment()
      setOutstandingPayment(outstanding)

      if (
        outstanding &&
        createdRideRef.current?.id !== outstanding.rideId
      ) {
        updateCreatedRide(await getRideById(outstanding.rideId))
      }
    } catch (error) {
      setHistoryError(
        error instanceof Error
          ? error.message
          : 'Unable to load your rides. Please try again.',
      )
    } finally {
      setHistoryLoading(false)
    }
  }

  async function handleConfirmCompletion() {
    if (!createdRide || confirmingRide) return

    try {
      setConfirmingRide(true)
      const updatedRide = await confirmRideCompletion(createdRide.id)
      updateCreatedRide(updatedRide)
      await loadRideHistory()
    } catch (error) {
      setRideError(
        error instanceof Error
          ? error.message
          : 'Unable to confirm ride completion.',
      )
    } finally {
      setConfirmingRide(false)
    }
  }

  async function handleRateRide(rideToRate = createdRide) {
    if (!rideToRate || ratingScore < 1) return

    try {
      await rateRide(
        rideToRate.id,
        ratingScore,
        ratingFeedback,
      )

      if (createdRideRef.current?.id === rideToRate.id) {
        updateCreatedRide({
          ...rideToRate,
          rating: {
            score: ratingScore,
            feedback: ratingFeedback || null,
          },
        })
      }

      setRatingScore(0)
      setRatingFeedback('')
      await loadRideHistory()
    } catch (error) {
      setRideError(
        error instanceof Error
          ? error.message
          : 'Unable to submit your rating.',
      )
    }
  }

  useEffect(() => {
    void loadRideHistory()
  }, [])

  useEffect(() => {
    customerRealtime.connect()

    const unsubscribe = customerRealtime.subscribe((event) => {
      void handleRealtimeRideEvent(event)
    })

    return () => {
      unsubscribe()
      customerRealtime.disconnect()
    }
  }, [])

  useEffect(() => {
    if (!createdRide?.id) return

    let cancelled = false
    const rideId = createdRide.id

    async function refreshRideStatus() {
      try {
        const ride = await getRideById(rideId)

        if (!cancelled) {
          updateCreatedRide(ride)
          setRideError(null)
        }
      } catch (error) {
        if (!cancelled) {
          setRideError(
            error instanceof Error
              ? error.message
              : 'Unable to refresh ride status.',
          )
        }
      }
    }

    void refreshRideStatus()
    const interval = window.setInterval(() => {
      void refreshRideStatus()
    }, 5000)

    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [createdRide?.id])

  useEffect(() => {
    if (
      !createdRide ||
      createdRide.startOtpRequired === false ||
      !['ASSIGNED', 'DRIVER_ARRIVING'].includes(createdRide.status)
    ) {
      setRideStartOtp(null)
      return
    }

    let active = true

    void getRideStartOtp(createdRide.id)
      .then((result) => {
        if (active) setRideStartOtp(result.otp)
      })
      .catch((error) => {
        if (active) {
          setRideError(
            error instanceof Error
              ? error.message
              : 'Unable to load the ride start code.',
          )
        }
      })

    return () => {
      active = false
    }
  }, [
    createdRide?.id,
    createdRide?.status,
    createdRide?.startOtpRequired,
  ])

  useEffect(() => {
    if (createdRide?.status === 'COMPLETED') {
      void loadRideHistory()
    }
  }, [createdRide?.status])

  useEffect(() => {
    if (!mapOpen) {
      setMapFullscreen(false)
      return
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setMapOpen(false)
        setMapFullscreen(false)
      }
    }

    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [mapOpen])

  async function handleRealtimeRideEvent(event: RideRealtimeEvent) {
    const currentRide = createdRideRef.current

    if (!currentRide || event.rideId !== currentRide.id) return

    const eventStatus = event.data?.status

    if (typeof eventStatus === 'string') {
      const updatedRide = {
        ...currentRide,
        status: eventStatus as CreatedRide['status'],
      }

      createdRideRef.current = updatedRide
      setCreatedRide(updatedRide)
      setRideStatus(updatedRide.status)
      setRideError(null)
    }

    void loadRideHistory()
  }

  function handleRideCreated(ride: CreatedRide) {
    updateCreatedRide(ride)
    setRideError(null)
    void loadRideHistory()
  }

  function isRideCancellable(status: CreatedRide['status']) {
    return ['REQUESTED', 'ASSIGNED', 'DRIVER_ARRIVING'].includes(status)
  }

  async function handleCancelRide(rideId: string) {
    try {
      setCancellingRideId(rideId)
      setHistoryError(null)

      await cancelRide(rideId)

      if (createdRideRef.current?.id === rideId) {
        const updatedRide = {
          ...createdRideRef.current,
          status: 'CANCELLED' as CreatedRide['status'],
        }

        createdRideRef.current = updatedRide
        setCreatedRide(updatedRide)
        setRideStatus('CANCELLED')
      }

      await loadRideHistory()
    } catch (error) {
      setHistoryError(
        error instanceof Error
          ? error.message
          : 'Unable to cancel this ride.',
      )
    } finally {
      setCancellingRideId(null)
    }
  }

  const recentRides = rideHistory.slice(0, 2)

  const pickupCoordinate: MapCoordinate | undefined = selectedPickup
    ? {
        latitude: selectedPickup.latitude,
        longitude: selectedPickup.longitude,
      }
    : undefined

  const dropCoordinate: MapCoordinate | undefined = selectedDrop
    ? {
        latitude: selectedDrop.latitude,
        longitude: selectedDrop.longitude,
      }
    : undefined


  function navigateToSettings() { navigate(ROUTE_PATHS.settings) }

  const activeRide = createdRide && !['COMPLETED', 'CANCELLED'].includes(createdRide.status)
  const statusLabel = (ride: CreatedRide) => ride.status.replaceAll('_', ' ')
  const fareLabel = (ride: CreatedRide) =>
    ride.finalFare ?? ride.estimatedFare

  return (
    <div className="home-page cinematic-home">
      <section className="home-hero cinematic-hero">
        <div className="home-hero-copy">
          <span className="section-eyebrow">{activeRide ? 'GOOD EVENING' : 'YOUR CITY. YOUR RIDE.'}</span>
          <h1>{activeRide ? 'Your ride is on the way' : 'Discover the best of your city'}</h1>
          <p>{activeRide ? 'Your trip updates in real time.' : 'Safe. Reliable. Around you.'}</p>
          {!activeRide && (
            <Link className="primary-button book-ride-cta" to={ROUTE_PATHS.booking}>
              Book a Ride <span aria-hidden="true">→</span>
            </Link>
          )}
        </div>
      {createdRide && (
        <section className="active-ride-card glass-card home-active-ride home-active-ride-overlay">
          <div className="active-ride-heading">
            <div>
              <span className="section-eyebrow">ACTIVE RIDE</span>
              <span className="ride-status-pill status-live">{statusLabel(createdRide)}</span>
            </div>
            <div className="arrival-summary">
              <span>Arriving in</span>
              <strong>{activeRide ? '5 min' : 'Trip update'}</strong>
              <small>{activeRide ? '2.5 km away' : 'Ride status updated'}</small>
            </div>
          </div>

          <div className="ride-route-summary">
            <div className="route-point pickup-point">
              <span className="route-dot" />
              <div><strong>Your location</strong><small>{createdRide.pickupAddress ?? 'Pickup details unavailable'}</small></div>
            </div>
            <div className="route-point destination-point">
              <span className="route-dot" />
              <div><strong>Destination</strong><small>{createdRide.dropAddress ?? 'Destination details unavailable'}</small></div>
            </div>
          </div>

          {rideError && <p className="inline-notice error-message" role="alert">{rideError}</p>}
          <div className="active-ride-actions">
            <button className="secondary-button" type="button" onClick={() => setDetailsOpen(true)}>View Details</button>
            {isRideCancellable(createdRide.status) && (
              <button className="danger-button" type="button" disabled={cancellingRideId === createdRide.id} onClick={() => void handleCancelRide(createdRide.id)}>
                {cancellingRideId === createdRide.id ? 'Cancelling…' : 'Cancel Ride'}
              </button>
            )}
          </div>
        </section>
      )}

        <button className="hero-scroll-cue" type="button" aria-label="Scroll to your activity and quick actions" onClick={() => document.getElementById('recent-rides')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
          <span>Scroll to explore</span><i aria-hidden="true">↓</i>
        </button>
      </section>

      {outstandingPayment && (
        <section className="notice-card notice-card-warning home-payment-alert" role="status">
          <div>
            <h3>Payment needs your attention</h3>
            <p>Ride {outstandingPayment.rideId} has an outstanding payment. Settle it before booking another ride.</p>
          </div>
        </section>
      )}


      <div className="home-content-grid">
        <section id="recent-rides" className="recent-rides-card glass-card home-recent-rides">
          <div className="card-heading-row">
            <div><span className="section-eyebrow">YOUR ACTIVITY</span><h2>Recent Rides</h2></div>
            <Link className="text-link" to={ROUTE_PATHS.myRides}>View all <span aria-hidden="true">→</span></Link>
          </div>

          {historyLoading && <div className="empty-state"><span className="loading-indicator" /><p>Loading your recent rides…</p></div>}
          {!historyLoading && historyError && <div className="inline-notice error-message" role="alert">{historyError}<button className="text-button" type="button" onClick={() => void loadRideHistory()}>Try again</button></div>}
          {!historyLoading && !historyError && recentRides.length === 0 && <div className="empty-state"><h3>Your rides will appear here</h3><p>Book your first ride to get started.</p></div>}

          {!historyLoading && !historyError && recentRides.map((ride) => (
            <article className="recent-ride-row" key={ride.id}>
              <div className="recent-ride-route-art" aria-hidden="true"><span>●</span><i /><span>●</span></div>
              <div className="recent-ride-copy">
                <strong>Ride {ride.id.slice(0, 8)}</strong>
                <small>{ride.requestedAt ? new Date(ride.requestedAt).toLocaleString() : 'Trip details'}</small>
                <span className="ride-status-pill">{statusLabel(ride)}</span>
              </div>
              <div className="recent-ride-price">
                <strong>{fareLabel(ride) == null ? '—' : `₹${Number(fareLabel(ride)).toFixed(0)}`}</strong>
              </div>
              {isRideCancellable(ride.status) && <button className="text-button danger-text" type="button" disabled={cancellingRideId === ride.id} onClick={() => void handleCancelRide(ride.id)}>{cancellingRideId === ride.id ? 'Cancelling…' : 'Cancel'}</button>}
            </article>
          ))}
        </section>

        <section className="quick-actions-section">
          <span className="section-eyebrow">QUICK ACTIONS</span>
          <div className="quick-actions-grid">
            <Link className="quick-action-card" to={ROUTE_PATHS.booking}><span aria-hidden="true">🚘</span><strong>Book a Ride</strong></Link>
            <Link className="quick-action-card" to={ROUTE_PATHS.myRides}><span aria-hidden="true">◷</span><strong>Ride History</strong></Link>
            <button type="button" className="quick-action-card" onClick={() => { if (createdRide) window.dispatchEvent(new Event('urbanride:open-ride-details')); else navigateToSettings() }}><span aria-hidden="true">▣</span><strong>Payments</strong></button>
            <Link className="quick-action-card" to={ROUTE_PATHS.settings}><span aria-hidden="true">☏</span><strong>Support</strong></Link>
          </div>
        </section>

      </div>

      {activeRide && (
        <section className="below-hero-tracker-wrap" aria-label="Live ride tracking">
          <aside className="mini-tracker glass-card below-hero-tracker" aria-label="Active ride tracker">
            <div className="mini-tracker-heading"><strong>5 min <span>· 2.5 km</span></strong><span className="live-indicator"><i /> Live</span></div>
            <div className="mini-route-line"><span className="mini-route-start" /><span className="mini-car" aria-hidden="true">🚘</span><span className="mini-route-end" /></div>
            <div className="mini-tracker-metrics"><div><small>Estimated arrival</small><strong>5 min</strong></div><div><small>Distance</small><strong>2.5 km</strong></div></div>
            <button className="text-button tracker-details-link" type="button" onClick={() => setDetailsOpen(true)}>View ride details →</button>
          </aside>
        </section>
      )}

      <section className="explore-city-fixed">
        <button className="explore-city-banner" type="button" onClick={() => setMapOpen(true)} aria-haspopup="dialog" aria-expanded={mapOpen}>
          <span className="explore-map-icon" aria-hidden="true">▤</span>
          <span className="explore-city-copy"><strong>Explore your city</strong><small>Tap to open the map and plan your next ride.</small></span>
          <span className="explore-city-car" aria-hidden="true">🚙</span>
          <span className="explore-city-arrow" aria-hidden="true">→</span>
        </button>
      </section>

      {detailsOpen && createdRide && (
        <div className="ride-details-layer">
          <button className="ride-details-dismiss" type="button" aria-label="Close ride details" onClick={() => setDetailsOpen(false)} />
          <aside className="ride-details-drawer" role="dialog" aria-modal="true" aria-labelledby="ride-details-title">
            <header className="ride-details-header"><div><span className="section-eyebrow">YOUR JOURNEY</span><h2 id="ride-details-title">Current Ride</h2></div><button className="icon-button" type="button" aria-label="Close details" onClick={() => setDetailsOpen(false)}>×</button></header>
            <nav className="ride-details-tabs" aria-label="Ride detail sections">
              <button type="button" onClick={() => document.getElementById('ride-drawer-details')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>Details</button>
              <button type="button" onClick={() => document.getElementById('ride-drawer-map')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>Map</button>
              <button type="button" onClick={() => document.getElementById('ride-drawer-payments')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>Payments</button>
              <button type="button" onClick={() => document.getElementById('ride-drawer-support')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>Support</button>
            </nav>
            <div id="ride-drawer-details" className="driver-profile-placeholder drawer-anchor">
              <div className="driver-avatar-placeholder" aria-hidden="true">UR</div>
              <div className="driver-profile-copy"><strong>Rider details</strong><span>{createdRide.riderId ? `Rider ID · ${createdRide.riderId}` : 'Rider details will appear when assigned'}</span><small>Driver name and phone are not currently returned by the customer ride API.</small></div>
              <div className="driver-contact-actions">
                <button type="button" disabled title="Driver phone details are not currently provided by the customer API" aria-label="Call driver unavailable">☎</button>
                <button type="button" disabled title="Driver messaging is not currently provided by the customer API" aria-label="Message driver unavailable">▤</button>
              </div>
            </div>
            <div id="ride-drawer-map" className="details-map-preview drawer-anchor"><MapView
              pickup={createdRide.pickupLatitude != null && createdRide.pickupLongitude != null ? { latitude: createdRide.pickupLatitude, longitude: createdRide.pickupLongitude } : pickupCoordinate}
              drop={createdRide.dropLatitude != null && createdRide.dropLongitude != null ? { latitude: createdRide.dropLatitude, longitude: createdRide.dropLongitude } : dropCoordinate}
              height={260}
            /></div>
            <div className="ride-details-stats"><div><small>Status</small><strong>{statusLabel(createdRide)}</strong></div><div><small>Estimated fare</small><strong>{fareLabel(createdRide) == null ? '—' : `₹${Number(fareLabel(createdRide)).toFixed(2)}`}</strong></div><div><small>Vehicle</small><strong>{createdRide.rideType === 'bike' ? 'Bike' : createdRide.rideType === 'auto' ? 'Auto' : 'Car'}</strong></div></div>
            <section className="ride-progress-panel">
              <div className="card-heading-row"><h3>Ride Progress</h3><span className="live-indicator"><i /> {statusLabel(createdRide)}</span></div>
              <div className="ride-progress-track">
                <span className="progress-step is-complete">✓<small>Requested</small></span>
                <span className={['ASSIGNED','DRIVER_ARRIVING','IN_PROGRESS','COMPLETED'].includes(createdRide.status) ? 'progress-step is-complete' : 'progress-step'}>●<small>Assigned</small></span>
                <span className={['DRIVER_ARRIVING','IN_PROGRESS','COMPLETED'].includes(createdRide.status) ? 'progress-step is-complete' : 'progress-step'}>●<small>Arriving</small></span>
                <span className={['IN_PROGRESS','COMPLETED'].includes(createdRide.status) ? 'progress-step is-complete' : 'progress-step'}>●<small>On ride</small></span>
                <span className={createdRide.status === 'COMPLETED' ? 'progress-step is-complete' : 'progress-step'}>●<small>Completed</small></span>
              </div>
            </section>

            <section className="details-information-panel">
              <h3>Ride Information</h3>
              <dl>
                <div><dt>Pickup</dt><dd>{createdRide.pickupAddress ?? 'Pickup details unavailable'}</dd></div>
                <div><dt>Destination</dt><dd>{createdRide.dropAddress ?? 'Destination details unavailable'}</dd></div>
                <div><dt>Distance</dt><dd>{createdRide.estimatedDistance != null ? `${createdRide.estimatedDistance} km (estimated)` : 'Not available'}</dd></div>
                <div><dt>Ride type</dt><dd>{createdRide.rideType === 'bike' ? 'Bike' : createdRide.rideType === 'auto' ? 'Auto' : 'Car'}</dd></div>
                <div><dt>Requested</dt><dd>{createdRide.requestedAt ? new Date(createdRide.requestedAt).toLocaleString() : 'Not available'}</dd></div>
                <div><dt>Ride reference</dt><dd><code>{createdRide.id}</code></dd></div>
              </dl>
            </section>

            {createdRide.startOtpRequired !== false && rideStartOtp && ['ASSIGNED', 'DRIVER_ARRIVING'].includes(createdRide.status) && (
              <section className="details-action-panel otp-inline" role="status">
                <div><h3>Ride start code</h3><p>Share this code with your rider when the ride begins.</p></div>
                <strong className="otp-code">{rideStartOtp}</strong>
              </section>
            )}

            {createdRide.status === 'IN_PROGRESS' && (
              <section className="details-action-panel completion-panel" aria-live="polite">
                <h3>Ride completion</h3>
                <p>Rider confirmation: <strong>{createdRide.riderCompletedAt ? 'Confirmed' : 'Pending'}</strong></p>
                <p>Your confirmation: <strong>{createdRide.customerCompletedAt ? 'Confirmed' : 'Pending'}</strong></p>
                {!createdRide.customerCompletedAt && createdRide.riderCompletedAt && (
                  <button className="primary-button details-full-button" type="button" disabled={confirmingRide} onClick={() => void handleConfirmCompletion()}>
                    {confirmingRide ? 'Confirming…' : 'Confirm ride completion'}
                  </button>
                )}
              </section>
            )}

            {createdRide.status === 'COMPLETED' && (
              <section className="details-action-panel rating-panel">
                <h3>Rate your ride</h3>
                {createdRide.rating ? <p className="success-message">You rated this ride {createdRide.rating.score}/5.</p> : <>
                  <label className="field-label">Your rating
                    <select value={ratingScore} onChange={(event) => setRatingScore(Number(event.target.value))}>
                      <option value={0}>Choose a rating</option>{[1,2,3,4,5].map(score => <option key={score} value={score}>{score} / 5</option>)}
                    </select>
                  </label>
                  <label className="field-label">Feedback <span className="muted-copy">(optional)</span>
                    <textarea maxLength={1000} rows={3} value={ratingFeedback} onChange={(event) => setRatingFeedback(event.target.value)} placeholder="Tell us how it went…" />
                  </label>
                  <button className="primary-button details-full-button" type="button" disabled={ratingScore < 1} onClick={() => void handleRateRide(createdRide)}>Submit rating</button>
                </>}
              </section>
            )}

            {rideError && <p className="inline-notice error-message" role="alert">{rideError}</p>}

            <section id="ride-drawer-payments" className="details-payment-panel drawer-anchor">
              <div className="card-heading-row"><h3>Payment Options</h3><span className="payment-recommended">Secure checkout</span></div>
              <p className="details-muted-copy">Choose when to pay. Payment availability follows the current ride status.</p>
              <PaymentCard ride={createdRide} onPaymentUpdate={() => { void loadRideHistory() }} />
            </section>

            <section id="ride-drawer-support" className="details-action-panel drawer-support-panel drawer-anchor">
              <h3>Need help with this ride?</h3>
              <p>Ride reference: <code>{createdRide.id}</code></p>
              <p>Support contact actions will be connected when the customer support endpoint is available. Your ride and payment operations remain available above.</p>
            </section>

            <div className="details-bottom-actions">
              {isRideCancellable(createdRide.status) && (
                <button className="danger-button details-full-button" type="button" disabled={cancellingRideId === createdRide.id} onClick={() => void handleCancelRide(createdRide.id)}>
                  {cancellingRideId === createdRide.id ? 'Cancelling ride…' : 'Cancel Ride'}
                </button>
              )}
              <button className="secondary-button details-full-button" type="button" onClick={() => setDetailsOpen(false)}>Back to Home</button>
            </div>
          </aside>
        </div>
      )}

      {mapOpen && (
        <div className={`route-modal-backdrop${mapFullscreen ? ' is-fullscreen' : ''}`} onMouseDown={(event) => { if (event.target === event.currentTarget) { setMapOpen(false); setMapFullscreen(false) } }}>
          <section className={`route-modal${mapFullscreen ? ' is-fullscreen' : ''}`} role="dialog" aria-modal="true" aria-labelledby="route-modal-title">
            <header className="route-modal-header"><div><span className="section-eyebrow">LIVE ROUTE PREVIEW</span><h2 id="route-modal-title">Explore your city</h2><p>Choose locations on the booking screen to preview your route.</p></div><div className="route-modal-actions"><button className="icon-button" type="button" aria-label={mapFullscreen ? 'Exit full screen' : 'Expand map'} onClick={() => setMapFullscreen((current) => !current)}>{mapFullscreen ? '⤢' : '⛶'}</button><button className="icon-button" type="button" aria-label="Close map" onClick={() => { setMapOpen(false); setMapFullscreen(false) }}>×</button></div></header>
            <div className="route-modal-map"><MapView pickup={pickupCoordinate} drop={dropCoordinate} height={mapFullscreen ? 'calc(100vh - 160px)' : 'min(62vh, 620px)'} /></div>
            <footer className="route-modal-footer"><span>{selectedPickup && selectedDrop ? 'Your selected route is shown on the map.' : 'No default locations are loaded.'}</span><button className="secondary-button" type="button" onClick={() => { setMapOpen(false); setMapFullscreen(false) }}>Done</button></footer>
          </section>
        </div>
      )}

      <section className="home-footer-content">
        <div className="home-footer-heading"><span className="section-eyebrow">MORE WITH URBANRIDE</span><h2>Move forward with us.</h2><p>Whether you're travelling, partnering, or looking for your next opportunity, there's a place for you here.</p></div>
        <div className="home-footer-cards">
          <article><span aria-hidden="true">▦</span><h3>Do business with us</h3><p>Explore corporate mobility and ride solutions for your team.</p><a href="mailto:partnerships@urbanride.example">Partner with us ↗</a></article>
          <article><span aria-hidden="true">♙</span><h3>Become a rider</h3><p>Ride on your own schedule and connect with more customers.</p><a href="mailto:riders@urbanride.example">Rider opportunities ↗</a></article>
          <article><span aria-hidden="true">◉</span><h3>Help &amp; Support</h3><p>Need help with a booking or payment? We're here to help.</p><a href="mailto:support@urbanride.example">Contact support ↗</a></article>
        </div>
        <footer className="urbanride-footer"><div className="urbanride-footer-brand"><UrbanRideLogo markSize={34} /><small>Safe. Reliable. Around you.</small></div><nav aria-label="Footer"><a href="#about">About Us</a><a href="mailto:careers@urbanride.example">Careers</a><a href="#blog">Blog</a><a href="#privacy">Privacy Policy</a><a href="#terms">Terms of Service</a><a href="mailto:support@urbanride.example">Contact</a></nav><small>© {new Date().getFullYear()} UrbanRide. All rights reserved.</small></footer>
      </section>
    </div>
  )
}
