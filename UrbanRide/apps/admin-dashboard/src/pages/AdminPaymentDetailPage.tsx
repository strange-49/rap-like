import { useQuery } from '@tanstack/react-query'
import { adminApi } from '../api/admin-api'

type PaymentDetail = {
  id: string
  rideId: string
  amount: number | string
  status: string
  razorpayOrderId: string | null
  razorpayPaymentId: string | null
  razorpaySignature: string | null
  createdAt: string
  updatedAt: string
}

export function AdminPaymentDetailPage() {
  const paymentId = 'cmu8o5qas0000qoi9dnkmfog2'

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin', 'payment', paymentId],
    queryFn: () => adminApi<PaymentDetail>(`/admin/payments/${paymentId}`),
  })

  if (isLoading) {
    return <p>Loading payment...</p>
  }

  if (isError || !data) {
    return <p>Failed to load payment.</p>
  }

  return (
    <section>
      <h2>Payment Details</h2>

      <p><strong>Payment ID:</strong> {data.id}</p>
      <p><strong>Ride ID:</strong> {data.rideId}</p>
      <p><strong>Amount:</strong> INR {data.amount}</p>
      <p><strong>Status:</strong> {data.status}</p>
      <p><strong>Razorpay Order:</strong> {data.razorpayOrderId ?? '-'}</p>
      <p><strong>Razorpay Payment:</strong> {data.razorpayPaymentId ?? '-'}</p>
      <p><strong>Razorpay Signature:</strong> {data.razorpaySignature ?? '-'}</p>
      <p><strong>Created:</strong> {data.createdAt}</p>
      <p><strong>Updated:</strong> {data.updatedAt}</p>
    </section>
  )
}
