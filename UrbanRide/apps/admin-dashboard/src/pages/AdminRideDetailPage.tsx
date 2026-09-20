import { useQuery } from '@tanstack/react-query'
import { adminApi } from '../api/admin-api'

type RideDetail = {
  id: string
  customerId: string
  corporateAccountId: string | null
  riderId: string | null
  status: string
  pickupAddress: string
  pickupLatitude: string | number
  pickupLongitude: string | number
  dropAddress: string
  dropLatitude: string | number
  dropLongitude: string | number
  estimatedDistance: string | number | null
  estimatedFare: string | number | null
  finalFare: string | number | null
  requestedAt: string
  assignedAt: string | null
  startedAt: string | null
  completedAt: string | null
}

export function AdminRideDetailPage() {
  const rideId = 'cmu8eztmb0000jsi9r92oabb3'

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin', 'ride', rideId],
    queryFn: () => adminApi<RideDetail>(`/admin/rides/${rideId}`),
  })

  if (isLoading) {
    return <p>Loading ride...</p>
  }

  if (isError || !data) {
    return <p>Failed to load ride.</p>
  }

  return (
    <section>
      <h2>Ride Details</h2>

      <p><strong>Ride ID:</strong> {data.id}</p>
      <p><strong>Customer:</strong> {data.customerId}</p>
      <p><strong>Rider:</strong> {data.riderId ?? '-'}</p>
      <p><strong>Status:</strong> {data.status}</p>
      <p><strong>Corporate Account:</strong> {data.corporateAccountId ?? '-'}</p>

      <h3>Route</h3>
      <p><strong>Pickup:</strong> {data.pickupAddress}</p>
      <p><strong>Drop:</strong> {data.dropAddress}</p>

      <h3>Fare</h3>
      <p><strong>Estimated:</strong> INR {data.estimatedFare ?? '-'}</p>
      <p><strong>Final:</strong> INR {data.finalFare ?? '-'}</p>

      <h3>Timeline</h3>
      <p><strong>Requested:</strong> {data.requestedAt}</p>
      <p><strong>Assigned:</strong> {data.assignedAt ?? '-'}</p>
      <p><strong>Started:</strong> {data.startedAt ?? '-'}</p>
      <p><strong>Completed:</strong> {data.completedAt ?? '-'}</p>
    </section>
  )
}
