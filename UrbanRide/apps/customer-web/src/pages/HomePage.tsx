import {
  useEffect,
  useRef,
  useState,
} from 'react'
import { MapView } from '../components/MapView'
import { PaymentCard } from '../components/PaymentCard'
import { RideBookingCard } from '../components/RideBookingCard'
import {
  cancelRide,
  confirmRideCompletion,
  getCustomerRides,
  getRideById,
  getRideStartOtp,
  rateRide,
  type CreatedRide,
} from '../services/rides'
import { getOutstandingPayment, type OutstandingPayment } from '../services/payments'
import {
  customerRealtime,
  type RideRealtimeEvent,
} from '../services/realtime'

export function HomePage() {
  const [createdRide, setCreatedRide] =
    useState<CreatedRide | null>(null)

  const createdRideRef =
    useRef<CreatedRide | null>(null)

  const [rideStatus, setRideStatus] =
    useState<CreatedRide['status'] | null>(
      null,
    )

  const [rideError, setRideError] =
    useState<string | null>(null)

  const [rideHistory, setRideHistory] =
    useState<CreatedRide[]>([])

  const [historyLoading, setHistoryLoading] =
    useState(true)

  const [historyError, setHistoryError] =
    useState<string | null>(null)

  const [cancellingRideId, setCancellingRideId] =
    useState<string | null>(null)
  const [outstandingPayment, setOutstandingPayment] =
    useState<OutstandingPayment | null>(null)
  const [confirmingRide, setConfirmingRide] = useState(false)
  const [ratingScore, setRatingScore] = useState(0)
  const [ratingFeedback, setRatingFeedback] = useState('')
  const [rideStartOtp, setRideStartOtp] = useState<string | null>(null)

  function updateCreatedRide(
    ride: CreatedRide,
  ) {
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
        const active = rides.find((ride) =>
          ['REQUESTED', 'SEARCHING', 'ASSIGNED', 'DRIVER_ARRIVING', 'IN_PROGRESS'].includes(ride.status),
        )
        if (active) updateCreatedRide(await getRideById(active.id))
      }
      const outstanding = await getOutstandingPayment()
      setOutstandingPayment(outstanding)
      if (outstanding && createdRideRef.current?.id !== outstanding.rideId) {
        const dueRide = await getRideById(outstanding.rideId)
        updateCreatedRide(dueRide)
      }
    } catch (error) {
      setHistoryError(
        error instanceof Error
          ? error.message
          : 'Unable to load ride history.',
      )
    } finally {
      setHistoryLoading(false)
    }
  }

  async function handleConfirmCompletion() {
    if (!createdRide || confirmingRide) return
    try {
      setConfirmingRide(true)
      const updated = await confirmRideCompletion(createdRide.id)
      updateCreatedRide(updated)
      await loadRideHistory()
    } catch (error) {
      setRideError(error instanceof Error ? error.message : 'Unable to confirm completion.')
    } finally {
      setConfirmingRide(false)
    }
  }

  async function handleRateRide(rideToRate = createdRide) {
    if (!rideToRate || ratingScore < 1) return
    try {
      await rateRide(rideToRate.id, ratingScore, ratingFeedback)
      if (createdRideRef.current?.id === rideToRate.id) {
        updateCreatedRide({ ...rideToRate, rating: { score: ratingScore, feedback: ratingFeedback || null } })
      }
      await loadRideHistory()
    } catch (error) {
      setRideError(error instanceof Error ? error.message : 'Unable to submit rating.')
    }
  }

  useEffect(() => {
    void loadRideHistory()
  }, [])

  useEffect(() => {
    customerRealtime.connect()

    const unsubscribe =
      customerRealtime.subscribe(
        (event) => {
          void handleRealtimeRideEvent(
            event,
          )
        },
      )

    return () => {
      unsubscribe()
      customerRealtime.disconnect()
    }
  }, [])

  useEffect(() => {
    if (!createdRide?.id) {
      return
    }

    let cancelled = false

    const loadRideStatus = async () => {
      try {
        const ride = await getRideById(
          createdRide.id,
        )

        if (!cancelled) {
          updateCreatedRide(ride)
          setRideError(null)
        }
      } catch (error) {
        if (!cancelled) {
          setRideError(
            error instanceof Error
              ? error.message
              : 'Unable to load ride status.',
          )
        }
      }
    }

    void loadRideStatus()
    const interval = setInterval(() => void loadRideStatus(), 5000)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [createdRide?.id])

  useEffect(() => {
    if (!createdRide || createdRide.startOtpRequired === false || !['ASSIGNED', 'DRIVER_ARRIVING'].includes(createdRide.status)) {
      setRideStartOtp(null)
      return
    }
    let active = true
    void getRideStartOtp(createdRide.id).then((result) => {
      if (active) setRideStartOtp(result.otp)
    }).catch((error) => {
      if (active) setRideError(error instanceof Error ? error.message : 'Unable to load ride start code.')
    })
    return () => { active = false }
  }, [createdRide?.id, createdRide?.status, createdRide?.startOtpRequired])

  useEffect(() => {
    if (createdRide?.status === 'COMPLETED') void loadRideHistory()
  }, [createdRide?.status])

  async function handleRealtimeRideEvent(
    event: RideRealtimeEvent,
  ) {
    const currentRide =
      createdRideRef.current

    if (
      !currentRide ||
      event.rideId !== currentRide.id
    ) {
      return
    }

    const eventStatus =
      event.data?.status

    if (
      typeof eventStatus === 'string'
    ) {
      setRideStatus(
        eventStatus as CreatedRide['status'],
      )

      setCreatedRide((current) => {
        if (!current) {
          return current
        }

        const updatedRide = {
          ...current,
          status:
            eventStatus as CreatedRide['status'],
        }

        createdRideRef.current =
          updatedRide

        return updatedRide
      })

      setRideError(null)
    }

    void loadRideHistory()
  }

  function handleRideCreated(
    ride: CreatedRide,
  ) {
    updateCreatedRide(ride)
    setRideError(null)

    void loadRideHistory()
  }

  function isRideCancellable(
    status: CreatedRide['status'],
  ) {
    return (
      status === 'REQUESTED' ||
      status === 'ASSIGNED' ||
      status === 'DRIVER_ARRIVING'
    )
  }

  async function handleCancelRide(
    rideId: string,
  ) {
    try {
      setCancellingRideId(rideId)
      setHistoryError(null)

      await cancelRide(rideId)

      if (
        createdRideRef.current?.id === rideId
      ) {
        setRideStatus('CANCELLED')

        setCreatedRide((current) => {
          if (!current) {
            return current
          }

          const updatedRide = {
            ...current,
            status:
              'CANCELLED' as CreatedRide['status'],
          }

          createdRideRef.current =
            updatedRide

          return updatedRide
        })
      }

      await loadRideHistory()
    } catch (error) {
      setHistoryError(
        error instanceof Error
          ? error.message
          : 'Unable to cancel the ride.',
      )
    } finally {
      setCancellingRideId(null)
    }
  }

  return (
    <section>
      <h2>Book a ride</h2>

      <p>
        Get where you need to go with UrbanRide.
      </p>

      <RideBookingCard
        onRideCreated={handleRideCreated}
        disabled={outstandingPayment !== null}
      />

      {outstandingPayment && (
        <p role="status">
          Payment for completed ride {outstandingPayment.rideId} is {outstandingPayment.paymentStatus}. Settle it before booking another ride.
        </p>
      )}

      {createdRide && (
        <section>
          <h3>Your Ride</h3>

          <p>
            Ride ID:{' '}
            <strong>{createdRide.id}</strong>
          </p>

          {createdRide.status === 'COMPLETED' && (
            <section>
              {createdRide.rating ? (
                <p>Rating submitted: {createdRide.rating.score}/5</p>
              ) : (
                <>
                  <label>
                    Rate your rider (1–5)
                    <select value={ratingScore} onChange={(event) => setRatingScore(Number(event.target.value))}>
                      <option value={0}>Choose a rating</option>
                      {[1, 2, 3, 4, 5].map((score) => <option key={score} value={score}>{score}</option>)}
                    </select>
                  </label>
                  <label>
                    Feedback (optional)
                    <textarea maxLength={1000} value={ratingFeedback} onChange={(event) => setRatingFeedback(event.target.value)} />
                  </label>
                  <button type="button" disabled={ratingScore < 1} onClick={() => void handleRateRide()}>Submit Rating</button>
                </>
              )}
            </section>
          )}

          <p>
            Status:{' '}
            <strong>
              {rideStatus ??
                createdRide.status}
            </strong>
          </p>

          {createdRide.startOtpRequired !== false && rideStartOtp && ['ASSIGNED', 'DRIVER_ARRIVING'].includes(createdRide.status) && (
            <p role="status">Ride start code (share with your rider): <strong>{rideStartOtp}</strong></p>
          )}

          {createdRide.status === 'IN_PROGRESS' && (
            <section aria-live="polite">
              <p>Rider completion: {createdRide.riderCompletedAt ? 'confirmed' : 'pending'}</p>
              <p>Your confirmation: {createdRide.customerCompletedAt ? 'confirmed' : 'pending'}</p>
              {!createdRide.customerCompletedAt && createdRide.riderCompletedAt && (
                <button type="button" disabled={confirmingRide} onClick={() => void handleConfirmCompletion()}>
                  {confirmingRide ? 'Confirming...' : 'Ride Completed — Approve'}
                </button>
              )}
            </section>
          )}

          {createdRide.estimatedFare !==
            null && (
            <p>
              Estimated fare:{' '}
              <strong>
                ₹
                {createdRide.estimatedFare.toFixed(
                  2,
                )}
              </strong>
            </p>
          )}

          {rideError && (
            <p>{rideError}</p>
          )}
        </section>
      )}

      <PaymentCard ride={createdRide} onPaymentUpdate={() => void loadRideHistory()} />

      <section>
        <h3>Ride History</h3>

        {historyLoading && (
          <p>
            Loading ride history...
          </p>
        )}

        {historyError && (
          <p>{historyError}</p>
        )}

        {!historyLoading &&
          !historyError &&
          rideHistory.length === 0 && (
            <p>No rides yet.</p>
          )}

        {!historyLoading &&
          !historyError &&
          rideHistory.length > 0 && (
            <div>
              {rideHistory.map((ride) => (
                <article key={ride.id}>
                  <p>
                    <strong>
                      {ride.status}
                    </strong>
                  </p>

                  <p>
                    Ride ID: {ride.id}
                  </p>

                  {ride.estimatedFare !==
                    null && (
                    <p>
                      Fare: ₹
                      {ride.estimatedFare.toFixed(
                        2,
                      )}
                    </p>
                  )}

                  {ride.status === 'COMPLETED' && !ride.rating && (
                    <div>
                      <label>
                        Rate rider
                        <select value={ratingScore} onChange={(event) => setRatingScore(Number(event.target.value))}>
                          <option value={0}>Choose 1–5</option>
                          {[1, 2, 3, 4, 5].map((score) => <option key={score} value={score}>{score}</option>)}
                        </select>
                      </label>
                      <button type="button" disabled={ratingScore < 1} onClick={() => void handleRateRide(ride)}>Submit rating</button>
                    </div>
                  )}
                  {ride.rating && <p>Rated {ride.rating.score}/5</p>}

                  {ride.requestedAt && (
                    <p>
                      Requested:{' '}
                      {new Date(
                        ride.requestedAt,
                      ).toLocaleString()}
                    </p>
                  )}

                  {isRideCancellable(
                    ride.status,
                  ) && (
                    <button
                      type="button"
                      disabled={
                        cancellingRideId ===
                        ride.id
                      }
                      onClick={() =>
                        void handleCancelRide(
                          ride.id,
                        )
                      }
                    >
                      {cancellingRideId ===
                      ride.id
                        ? 'Cancelling...'
                        : 'Cancel Ride'}
                    </button>
                  )}
                </article>
              ))}
            </div>
          )}
      </section>

      <MapView
        pickup={{
          latitude: 12.9698,
          longitude: 77.75,
        }}
        drop={{
          latitude: 12.9591,
          longitude: 77.6974,
        }}
      />
    </section>
  )
}
