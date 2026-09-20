import { useQuery } from '@tanstack/react-query'
import { adminApi } from '../api/admin-api'

type RiderActivity = {
  riderId: string
  totalRides: number
  completedRides: number
  assignedRides: number
  cancelledRides: number
}

export function AdminRidersPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin', 'riders', 'activity'],
    queryFn: () => adminApi<RiderActivity[]>('/admin/riders/activity'),
    refetchInterval: 10000,
  })

  if (isLoading) {
    return <p>Loading riders...</p>
  }

  if (isError || !data) {
    return <p>Failed to load riders.</p>
  }

  return (
    <section>
      <h2>Riders</h2>

      <table>
        <thead>
          <tr>
            <th>Rider ID</th>
            <th>Total Rides</th>
            <th>Completed</th>
            <th>Assigned</th>
            <th>Cancelled</th>
          </tr>
        </thead>

        <tbody>
          {data.map((rider) => (
            <tr key={rider.riderId}>
              <td>{rider.riderId}</td>
              <td>{rider.totalRides}</td>
              <td>{rider.completedRides}</td>
              <td>{rider.assignedRides}</td>
              <td>{rider.cancelledRides}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}
