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
  disabled?: boolean
}

export function RideBookingCard({
  onRideCreated,
  disabled = false,
}: RideBookingCardProps) {
  const [pickupQuery, setPickupQuery] = useState('')
  const [dropQuery, setDropQuery] = useState('')

  const [pickup, setPickup] = useState<LocationSelection | null>(null)
  const [drop, setDrop] = useState<LocationSelection | null>(null)

  const [rideType, setRideType] = useState<RideType | ''>('')
  const [fareEstimate, setFareEstimate] =
    useState<FareEstimate | null>(null)
  const [loadingEstimate, setLoadingEstimate] = useState(false)

  const [createdRide, setCreatedRide] =
    useState<CreatedRide | null>(null)

  const [cancelling, setCancelling] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!pickup || !drop || !rideType) {
      setFareEstimate(null)
      return
    }

    const selectedPickup = pickup
    const selectedDrop = drop
    const selectedRideType = rideType

    let cancelled = false

    async function loadFareEstimate() {
      try {
        setLoadingEstimate(true)
        setMessage('')

        const estimate = await getFareEstimate(
          selectedPickup.latitude,
          selectedPickup.longitude,
          selectedDrop.latitude,
          selectedDrop.longitude,
          selectedRideType,
        )

        if (!cancelled) {
          setFareEstimate(estimate)
        }
      } catch {
        if (!cancelled) {
          setFareEstimate(null)
          setMessage('Unable to calculate fare estimate.')
        }
      } finally {
        if (!cancelled) {
          setLoadingEstimate(false)
        }
      }
    }

    loadFareEstimate()

    return () => {
      cancelled = true
    }
  }, [pickup, drop, rideType])

  async function handleBookRide() {
    if (!pickup) {
      setMessage(
        'Please select your pickup location from the suggestions.',
      )
      return
    }

    if (!drop) {
      setMessage(
        'Please select your destination from the suggestions.',
      )
      return
    }

    if (!rideType) {
      setMessage('Please select a ride type.')
      return
    }

    try {
      const rideRequest: RideRequest = {
        pickup,
        drop,
        rideType,
      }

      const ride = await createRideRequest(rideRequest)

      setCreatedRide(ride)
      onRideCreated(ride)
      setMessage('Ride request created successfully.')
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Ride request failed.',
      )
    }
  }

  async function handleCancelRide() {
    if (!createdRide) {
      return
    }

    try {
      setCancelling(true)
      setMessage('')

      const cancelledRide = await cancelRide(createdRide.id)

      setCreatedRide(cancelledRide)
      onRideCreated(cancelledRide)
      setMessage('Ride cancelled successfully.')
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Ride cancellation failed.',
      )
    } finally {
      setCancelling(false)
    }
  }

  function handlePickupChange(value: string) {
    setPickupQuery(value)
    setPickup(null)
    setFareEstimate(null)
  }

  function handleDropChange(value: string) {
    setDropQuery(value)
    setDrop(null)
    setFareEstimate(null)
  }

  function handlePickupSelect(location: LocationSelection) {
    setPickup(location)
    setPickupQuery(location.address)
  }

  function handleDropSelect(location: LocationSelection) {
    setDrop(location)
    setDropQuery(location.address)
  }

  const canCancel =
    createdRide !== null &&
    (createdRide.status === 'REQUESTED' ||
      createdRide.status === 'ASSIGNED' ||
      createdRide.status === 'DRIVER_ARRIVING')

  return (
    <section>
      <h3>Where are you going?</h3>

      <LocationInput
        label="Pickup"
        placeholder="Enter pickup location"
        value={pickupQuery}
        onChange={handlePickupChange}
        onSelect={handlePickupSelect}
      />

      <LocationInput
        label="Drop"
        placeholder="Enter destination"
        value={dropQuery}
        onChange={handleDropChange}
        onSelect={handleDropSelect}
      />

      <RideTypeSelector
        value={rideType}
        onChange={setRideType}
      />

      {loadingEstimate && <p>Calculating fare...</p>}

      {fareEstimate && !loadingEstimate && (
        <div>
          <p>
            Distance:{' '}
            {fareEstimate.distanceInKilometers.toFixed(2)} km
          </p>

          <p>
            Estimated time:{' '}
            {fareEstimate.durationInMinutes.toFixed(0)} min
          </p>

          <p>
            Estimated fare: Rs.{' '}
            {fareEstimate.estimatedFare.toFixed(2)}
          </p>
        </div>
      )}

      <button
        type="button"
        onClick={handleBookRide}
        disabled={disabled || (createdRide !== null && !['COMPLETED', 'CANCELLED'].includes(createdRide.status))}
      >
        Book Ride
      </button>

      {canCancel && (
        <button
          type="button"
          onClick={handleCancelRide}
          disabled={cancelling}
        >
          {cancelling ? 'Cancelling...' : 'Cancel Ride'}
        </button>
      )}

      {message && <p>{message}</p>}
    </section>
  )
}
