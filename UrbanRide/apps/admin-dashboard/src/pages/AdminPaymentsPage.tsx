import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { adminApi } from '../api/admin-api'

type Payment = {
  id: string
  rideId: string
  amount: number | string
  status: string
  razorpayOrderId: string | null
  razorpayPaymentId: string | null
  createdAt: string
}

export function AdminPaymentsPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin', 'payments'],
    queryFn: () => adminApi<Payment[]>('/admin/payments'),
    refetchInterval: 10000,
  })

  if (isLoading) {
    return <p>Loading payments...</p>
  }

  if (isError || !data) {
    return <p>Failed to load payments.</p>
  }

  return (
    <section>
      <h2>Payments</h2>

      <table>
        <thead>
          <tr>
            <th>Payment ID</th>
            <th>Ride ID</th>
            <th>Amount</th>
            <th>Status</th>
            <th>Razorpay Order</th>
            <th>Razorpay Payment</th>
            <th>Action</th>
          </tr>
        </thead>

        <tbody>
          {data.map((payment) => (
            <tr key={payment.id}>
              <td>{payment.id}</td>
              <td>{payment.rideId}</td>
              <td>INR {payment.amount}</td>
              <td>{payment.status}</td>
              <td>{payment.razorpayOrderId ?? '-'}</td>
              <td>{payment.razorpayPaymentId ?? '-'}</td>
              <td>
                <Link to="/payments/detail">View Details</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}
