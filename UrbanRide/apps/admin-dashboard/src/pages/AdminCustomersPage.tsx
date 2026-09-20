import { useQuery } from '@tanstack/react-query'
import { adminApi } from '../api/admin-api'

type CustomerActivity = {
  customerId: string
  totalRides: number
  completedRides: number
  requestedRides: number
  cancelledRides: number
}

export function AdminCustomersPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin', 'customers', 'activity'],
    queryFn: () =>
      adminApi<CustomerActivity[]>('/admin/customers/activity'),
    refetchInterval: 10000,
  })

  if (isLoading) {
    return <p>Loading customers...</p>
  }

  if (isError || !data) {
    return <p>Failed to load customers.</p>
  }

  return (
    <section>
      <h2>Customers</h2>

      <table>
        <thead>
          <tr>
            <th>Customer ID</th>
            <th>Total Rides</th>
            <th>Completed</th>
            <th>Requested</th>
            <th>Cancelled</th>
          </tr>
        </thead>

        <tbody>
          {data.map((customer) => (
            <tr key={customer.customerId}>
              <td>{customer.customerId}</td>
              <td>{customer.totalRides}</td>
              <td>{customer.completedRides}</td>
              <td>{customer.requestedRides}</td>
              <td>{customer.cancelledRides}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}
