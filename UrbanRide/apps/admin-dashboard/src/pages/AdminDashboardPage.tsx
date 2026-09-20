import { useAdminOverview } from '../api/admin-queries'

export function DashboardPage() {
  const { data, isLoading, isError } = useAdminOverview()

  if (isLoading) {
    return <p>Loading admin overview...</p>
  }

  if (isError || !data) {
    return <p>Failed to load admin overview.</p>
  }

  return (
    <section>
      <h2>Admin Dashboard</h2>

      <div>
        <article>
          <h3>Total Rides</h3>
          <strong>{data.rides.total}</strong>
        </article>

        <article>
          <h3>Total Payments</h3>
          <strong>{data.payments.total}</strong>
        </article>

        <article>
          <h3>Captured Amount</h3>
          <strong>?{data.payments.capturedAmount}</strong>
        </article>

        <article>
          <h3>Corporate Accounts</h3>
          <strong>{data.corporate.accounts}</strong>
        </article>

        <article>
          <h3>Corporate Employees</h3>
          <strong>{data.corporate.employees}</strong>
        </article>

        <article>
          <h3>Rider Devices</h3>
          <strong>{data.rider.deviceTokens}</strong>
        </article>
      </div>

      <h3>Ride Status</h3>

      <ul>
        {Object.entries(data.rides.byStatus).map(([status, count]) => (
          <li key={status}>
            {status}: {count}
          </li>
        ))}
      </ul>
    </section>
  )
}
