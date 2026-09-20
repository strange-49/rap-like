import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { adminApi } from '../api/admin-api'

type Ride = {
  id: string
  customerId: string
  corporateAccountId: string | null
  riderId: string | null
  status: string
  pickupAddress: string
  dropAddress: string
  estimatedFare: number | string | null
  finalFare: number | string | null
  requestedAt: string
}

export function AdminRidesPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin', 'rides'],
    queryFn: () => adminApi<Ride[]>('/admin/rides'),
    refetchInterval: 10000,
  })

  if (isLoading) {
    return <p>Loading rides...</p>
  }

  if (isError || !data) {
    return <p>Failed to load rides.</p>
  }

  return (
    <section>
      <h2>Rides</h2>

      <table>
        <thead>
          <tr>
            <th>Ride ID</th>
            <th>Customer</th>
            <th>Rider</th>
            <th>Status</th>
            <th>Pickup</th>
            <th>Drop</th>
            <th>Fare</th>
            <th>Action</th>
          </tr>
        </thead>

        <tbody>
          {data.map((ride) => (
            <tr key={ride.id}>
              <td>{ride.id}</td>
              <td>{ride.customerId}</td>
              <td>{ride.riderId ?? '-'}</td>
              <td>{ride.status}</td>
              <td>{ride.pickupAddress}</td>
              <td>{ride.dropAddress}</td>
              <td>{ride.finalFare ?? ride.estimatedFare ?? '-'}</td>
              <td>
                <Link to="/rides/detail">View Details</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}
