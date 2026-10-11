
import { useEffect, useState } from 'react'
import type {
  LocationSelection,
  RideRequest,
} from '../features/rides/ride-request'
import type { RideType } from '../features/rides/ride-types'
import {
  cancelRide,
  createRideRequest,
  type CreatedRide,
} from '../services/rides'
import {
  getFareEstimate,
  type FareEstimate,
} from '../services/fare-estimate'
import { LocationInput } from './LocationInput'
import { RideTypeSelector } from './RideTypeSelector'

type RideBookingCardProps = {
  onRideCreated: (ride: CreatedRide) => void
  onLocationsChange?: (
    pickup: LocationSelection | null,
    drop: LocationSelection | null,
  ) => void
  disabled?: boolean
}

export function RideBookingCard({
  onRideCreated,
  onLocationsChange,
  disabled = false,
}: RideBookingCardProps) {
  const [pickupQuery, setPickupQuery] = useState('')
  const [dropQuery, setDropQuery] = useState('')
  const [pickup, setPickup] = useState<LocationSelection | null>(null)
  const [drop, setDrop] = useState<LocationSelection | null>(null)
  const [rideType, setRideType] = useState<RideType | ''>('')
  const [fareEstimate, setFareEstimate] = useState<FareEstimate | null>(null)
  const [loadingEstimate, setLoadingEstimate] = useState(false)
  const [createdRide, setCreatedRide] = useState<CreatedRide | null>(null)
  const [cancelling, setCancelling] = useState(false)
  const [booking, setBooking] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!pickup || !drop || !rideType) {
      setFareEstimate(null)
      setLoadingEstimate(false)
      return
    }

    let cancelled = false

    async function loadFareEstimate() {
      setLoadingEstimate(true)
      setFareEstimate(null)
      setMessage('')

      try {
        const estimate = await getFareEstimate(
          pickup!.latitude,
          pickup!.longitude,
          drop!.latitude,
          drop!.longitude,
          rideType as RideType,
        )

        if (!cancelled) {
          setFareEstimate(estimate)
        }
      } catch {
        if (!cancelled) {
          setFareEstimate(null)
          setMessage('Unable to calculate fare estimate. Please try again.')
        }
      } finally {
        if (!cancelled) {
          setLoadingEstimate(false)
        }
      }
    }

    void loadFareEstimate()

    return () => {
      cancelled = true
    }
  }, [pickup, drop, rideType])

  async function handleBookRide() {
    if (disabled || booking) return

    if (!pickup) {
      setMessage('Please select your pickup location from the suggestions.')
      return
    }

    if (!drop) {
      setMessage('Please select your destination from the suggestions.')
      return
    }

    if (!rideType) {
      setMessage('Please select a ride type.')
      return
    }

    try {
      setBooking(true)
      setMessage('')

      const rideRequest: RideRequest = {
        pickup,
        drop,
        rideType,
      }

      const ride = await createRideRequest(rideRequest)

      setCreatedRide(ride)
      onRideCreated(ride)
      setMessage('Your ride request was created successfully.')
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Ride request failed.',
      )
    } finally {
      setBooking(false)
    }
  }

  async function handleCancelRide() {
    if (!createdRide || cancelling) return

    try {
      setCancelling(true)
      setMessage('')

      const cancelledRide = await cancelRide(createdRide.id)

      setCreatedRide(cancelledRide)
      onRideCreated(cancelledRide)
      setMessage('Ride cancelled successfully.')
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Ride cancellation failed.',
      )
    } finally {
      setCancelling(false)
    }
  }

  function handlePickupChange(value: string) {
    setPickupQuery(value)
    setPickup(null)
    setFareEstimate(null)
    setMessage('')
    onLocationsChange?.(null, drop)
  }

  function handleDropChange(value: string) {
    setDropQuery(value)
    setDrop(null)
    setFareEstimate(null)
    setMessage('')
    onLocationsChange?.(pickup, null)
  }

  function handlePickupSelect(location: LocationSelection) {
    setPickup(location)
    setPickupQuery(location.address)
    setMessage('')
    onLocationsChange?.(location, drop)
  }

  function handleDropSelect(location: LocationSelection) {
    setDrop(location)
    setDropQuery(location.address)
    setMessage('')
    onLocationsChange?.(pickup, location)
  }

  const canCancel =
    createdRide !== null &&
    ['REQUESTED', 'ASSIGNED', 'DRIVER_ARRIVING'].includes(
      createdRide.status,
    )

  const canBook =
    !disabled &&
    !booking &&
    !(
      createdRide !== null &&
      !['COMPLETED', 'CANCELLED'].includes(createdRide.status)
    )

  return (
    <section className="booking-card">
      <div className="section-eyebrow">YOUR NEXT JOURNEY</div>
      <h2 className="booking-card-title">Where are you going?</h2>
      <p className="muted-copy">
        Choose your pickup and destination to plan your ride.
      </p>

      <div className="location-fields">
        <LocationInput
          label="Pickup location"
          placeholder="Enter your pickup address"
          value={pickupQuery}
          onChange={handlePickupChange}
          onSelect={handlePickupSelect}
        />

        <LocationInput
          label="Destination"
          placeholder="Where do you want to go?"
          value={dropQuery}
          onChange={handleDropChange}
          onSelect={handleDropSelect}
        />
      </div>

      <div className="ride-type-section">
        <h3 className="subsection-title">Choose your ride</h3>
        <RideTypeSelector value={rideType} onChange={setRideType} showFareRanges={false} />
      </div>

      <div className="fare-panel" aria-live="polite">
        {!pickup || !drop ? (
          <p className="muted-copy">
            Select both locations to plan your route and estimate the fare.
          </p>
        ) : loadingEstimate ? (
          <p role="status">Calculating your estimated fare…</p>
        ) : fareEstimate ? (
          <>
            <div className="fare-panel-heading">
              <div>
                <span className="section-eyebrow">ESTIMATED TRIP</span>
                <h3 className="fare-amount">
                  ₹{fareEstimate.estimatedFare.toFixed(2)}
                </h3>
              </div>
              <span className="fare-estimate-label">Estimated fare</span>
            </div>

            <div className="trip-metrics">
              <div>
                <span className="metric-value">
                  {fareEstimate.distanceInKilometers.toFixed(1)} km
                </span>
                <span className="metric-label">Distance</span>
              </div>
              <div>
                <span className="metric-value">
                  {fareEstimate.durationInMinutes.toFixed(0)} min
                </span>
                <span className="metric-label">Estimated time</span>
              </div>
            </div>
          </>
        ) : null}
      </div>

      <button
        className="primary-button booking-submit"
        type="button"
        onClick={() => void handleBookRide()}
        disabled={!canBook}
      >
        {booking ? 'Requesting your ride…' : 'Book your ride'}
      </button>

      {disabled && (
        <p className="inline-notice" role="status">
          Please settle your outstanding payment before booking another ride.
        </p>
      )}

      {canCancel && (
        <button
          className="secondary-button"
          type="button"
          onClick={() => void handleCancelRide()}
          disabled={cancelling}
        >
          {cancelling ? 'Cancelling ride…' : 'Cancel this ride'}
        </button>
      )}

      {message && (
        <p
          className={
            message.toLowerCase().includes('successfully')
              ? 'success-message'
              : 'inline-notice'
          }
          role="status"
        >
          {message}
        </p>
      )}
    </section>
  )
}
