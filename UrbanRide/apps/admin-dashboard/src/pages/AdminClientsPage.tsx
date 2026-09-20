import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { adminApi } from '../api/admin-api'

type CorporateAccount = {
  id: string
  name: string
  billingEmail: string | null
  createdAt: string
  employees?: unknown[]
  rides?: unknown[]
}

export function AdminClientsPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin', 'corporate', 'accounts'],
    queryFn: () =>
      adminApi<CorporateAccount[]>('/admin/corporate/accounts'),
    refetchInterval: 10000,
  })

  if (isLoading) {
    return <p>Loading corporate accounts...</p>
  }

  if (isError || !data) {
    return <p>Failed to load corporate accounts.</p>
  }

  return (
    <section>
      <h2>Corporate Clients</h2>

      <table>
        <thead>
          <tr>
            <th>Account ID</th>
            <th>Company</th>
            <th>Billing Email</th>
            <th>Employees</th>
            <th>Rides</th>
            <th>Action</th>
          </tr>
        </thead>

        <tbody>
          {data.map((account) => (
            <tr key={account.id}>
              <td>{account.id}</td>
              <td>{account.name}</td>
              <td>{account.billingEmail ?? '-'}</td>
              <td>{account.employees?.length ?? '-'}</td>
              <td>{account.rides?.length ?? '-'}</td>
              <td>
                <Link to="/clients/detail">View Details</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}
