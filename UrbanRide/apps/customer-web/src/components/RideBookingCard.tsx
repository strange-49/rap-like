import { useState } from 'react'
import type { RideRequest } from '../features/rides/ride-request'
import type { RideType } from '../features/rides/ride-types'
import { createRideRequest } from '../services/rides'
import { LocationInput } from './LocationInput'
import { RideTypeSelector } from './RideTypeSelector'

export function RideBookingCard() {
  const [pickup, setPickup] = useState('')
  const [drop, setDrop] = useState('')
  const [rideType, setRideType] = useState<RideType | ''>('')
  const [message, setMessage] = useState('')

  async function handleBookRide() {
    if (!pickup.trim()) {
      setMessage('Please enter your pickup location.')
      return
    }

    if (!drop.trim()) {
      setMessage('Please enter your destination.')
      return
    }

    if (!rideType) {
      setMessage('Please select a ride type.')
      return
    }

    const rideRequest: RideRequest = {
      pickup: pickup.trim(),
      drop: drop.trim(),
      rideType,
    }

    await createRideRequest(rideRequest)
    setMessage('Ride request ready.')
  }

  return (
    <section>
      <h3>Where are you going?</h3>

      <LocationInput
        label="Pickup"
        placeholder="Enter pickup location"
        value={pickup}
        onChange={setPickup}
      />

      <LocationInput
        label="Drop"
        placeholder="Enter destination"
        value={drop}
        onChange={setDrop}
      />

      <RideTypeSelector value={rideType} onChange={setRideType} />

      <button type="button" onClick={handleBookRide}>
        Book Ride
      </button>

      {message && <p>{message}</p>}
    </section>
  )
}
