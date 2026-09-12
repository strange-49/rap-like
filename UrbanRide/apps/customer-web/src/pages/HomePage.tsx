import { MapView } from '../components/MapView'
import { RideBookingCard } from '../components/RideBookingCard'

export function HomePage() {
  return (
    <section>
      <h2>Book a ride</h2>
      <p>Get where you need to go with UrbanRide.</p>

      <RideBookingCard />

      <MapView
        pickup={{
          latitude: 12.9698,
          longitude: 77.7500,
        }}
        drop={{
          latitude: 12.9591,
          longitude: 77.6974,
        }}
      />
    </section>
  )
}