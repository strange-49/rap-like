import {
  useEffect,
  useState,
} from 'react'
import {
  getCorporateRides,
  getCurrentCorporateAccount,
  type CorporateRide,
} from '../services/corporate'

export function RidesPage() {
  const [rides, setRides] =
    useState<CorporateRide[]>([])

  const [loading, setLoading] =
    useState(true)

  const [error, setError] =
    useState('')

  useEffect(() => {
    async function loadRides() {
      try {
        setLoading(true)
        setError('')

        const account =
          await getCurrentCorporateAccount()

        const result =
          await getCorporateRides(
            account.id,
          )

        setRides(result)
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Unable to load rides.',
        )
      } finally {
        setLoading(false)
      }
    }

    void loadRides()
  }, [])

  return (
    <section>
      <header>
        <h2>Rides</h2>
        <p>
          View rides booked through your
          company account.
        </p>
      </header>

      {error && (
        <p role="alert">{error}</p>
      )}

      {loading ? (
        <p>Loading rides...</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Employee</th>
              <th>Pickup</th>
              <th>Drop</th>
              <th>Status</th>
              <th>Fare</th>
            </tr>
          </thead>

          <tbody>
            {rides.length === 0 ? (
              <tr>
                <td colSpan={5}>
                  No company rides yet.
                </td>
              </tr>
            ) : (
              rides.map((ride) => (
                <tr key={ride.id}>
                  <td>
                    {ride.customerId}
                  </td>

                  <td>
                    {ride.pickupAddress}
                  </td>

                  <td>
                    {ride.dropAddress}
                  </td>

                  <td>
                    {ride.status}
                  </td>

                  <td>
                    {ride.finalFare ??
                      ride.estimatedFare ??
                      '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}
    </section>
  )
}