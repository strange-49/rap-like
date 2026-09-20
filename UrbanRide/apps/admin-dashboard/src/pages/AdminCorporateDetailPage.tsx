import { useQuery } from '@tanstack/react-query'
import { adminApi } from '../api/admin-api'

type CorporateEmployee = {
  id: string
  name: string
  email: string
  phone: string | null
  active: boolean
}

type CorporateRide = {
  id: string
  customerId: string
  riderId: string | null
  status: string
  pickupAddress: string
  dropAddress: string
}

type CorporateAccountDetail = {
  id: string
  name: string
  billingEmail: string | null
  employees: CorporateEmployee[]
  rides: CorporateRide[]
}

export function AdminCorporateDetailPage() {
  const accountId = 'cmu8cr69a0000roi9a8z14xns'

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin', 'corporate', accountId],
    queryFn: () =>
      adminApi<CorporateAccountDetail>(
        `/admin/corporate/accounts/${accountId}`,
      ),
  })

  if (isLoading) {
    return <p>Loading corporate account...</p>
  }

  if (isError || !data) {
    return <p>Failed to load corporate account.</p>
  }

  return (
    <section>
      <h2>{data.name}</h2>
      <p>Billing Email: {data.billingEmail ?? '-'}</p>

      <h3>Employees</h3>

      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Phone</th>
            <th>Active</th>
          </tr>
        </thead>

        <tbody>
          {data.employees.map((employee) => (
            <tr key={employee.id}>
              <td>{employee.name}</td>
              <td>{employee.email}</td>
              <td>{employee.phone ?? '-'}</td>
              <td>{employee.active ? 'Yes' : 'No'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3>Corporate Rides</h3>

      <table>
        <thead>
          <tr>
            <th>Ride ID</th>
            <th>Customer</th>
            <th>Rider</th>
            <th>Status</th>
            <th>Pickup</th>
            <th>Drop</th>
          </tr>
        </thead>

        <tbody>
          {data.rides.map((ride) => (
            <tr key={ride.id}>
              <td>{ride.id}</td>
              <td>{ride.customerId}</td>
              <td>{ride.riderId ?? '-'}</td>
              <td>{ride.status}</td>
              <td>{ride.pickupAddress}</td>
              <td>{ride.dropAddress}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}
