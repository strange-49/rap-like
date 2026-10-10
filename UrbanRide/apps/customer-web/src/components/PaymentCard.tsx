import { useEffect, useState } from 'react'
import {
  createPaymentOrder,
  verifyPayment,
  getRidePaymentStatus,
  type PaymentMode,
} from '../services/payments'
import type { CreatedRide } from '../services/rides'

type PaymentCardProps = {
  ride: CreatedRide | null
  onPaymentUpdate?: () => void
}

export function PaymentCard({ ride, onPaymentUpdate }: PaymentCardProps) {
  const [paymentMode, setPaymentMode] =
    useState<PaymentMode>('POST_RIDE')
  const [message, setMessage] = useState('')
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let active = true
    setPaymentStatus(null)
    if (ride) {
      void getRidePaymentStatus(ride.id).then((payment) => {
        if (active) setPaymentStatus(payment?.status ?? null)
      }).catch(() => {
        if (active) setPaymentStatus(null)
      })
    }
    return () => { active = false }
  }, [ride?.id])

  useEffect(() => {
    if (!ride || !['PENDING', 'AUTHORIZED'].includes(paymentStatus ?? '')) return
    const timer = setInterval(() => {
      void getRidePaymentStatus(ride.id).then((payment) => {
        if (payment) {
          setPaymentStatus(payment.status)
          if (payment.status === 'CAPTURED') onPaymentUpdate?.()
        }
      }).catch(() => undefined)
    }, 5000)
    return () => clearInterval(timer)
  }, [ride?.id, paymentStatus])

  async function handlePayment() {
    if (!ride) {
      setMessage('Please book a ride first.')
      return
    }

    if (busy || paymentStatus === 'CAPTURED') return
    try {
      setBusy(true)
      setMessage('Creating payment order...')

      const razorpayKeyId = import.meta.env.VITE_RAZORPAY_KEY_ID

      if (!razorpayKeyId) {
        throw new Error(
          'VITE_RAZORPAY_KEY_ID is not configured.',
        )
      }

      if (!window.Razorpay) {
        throw new Error(
          'Razorpay Checkout is not loaded.',
        )
      }

      const payment = await createPaymentOrder(
        ride.id,
        paymentMode,
      )
      setPaymentStatus(payment.status)

      setMessage('Opening Razorpay Checkout...')

      const checkout = new window.Razorpay({
        key: razorpayKeyId,
        amount: Math.round(Number(payment.amount) * 100),
        currency: 'INR',
        name: 'UrbanRide',
        description:
          paymentMode === 'ADVANCE'
            ? 'UrbanRide Advance Payment'
            : 'UrbanRide Post-Ride Payment',
        order_id: payment.razorpayOrderId,

        handler: async (response) => {
          try {
            setMessage('Verifying payment...')

            const verifiedPayment = await verifyPayment(
              payment.id,
              response.razorpay_payment_id,
              response.razorpay_signature,
            )

            const current = await getRidePaymentStatus(ride.id)
            setPaymentStatus(current?.status ?? verifiedPayment.status)
            setMessage(verifiedPayment.status === 'CAPTURED'
              ? 'Payment captured and verified.'
              : 'Payment authorized; waiting for capture confirmation.')
            onPaymentUpdate?.()
          } catch (error) {
            setMessage(
              error instanceof Error
                ? error.message
                : 'Payment verification failed.',
            )
          }
        },
      })

      checkout.open()
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Payment failed.',
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <section>
      <h3>Payment</h3>

      <p>
        Ride fare:{' '}
        {(ride?.finalFare ?? ride?.estimatedFare) != null
          ? `Rs. ${(ride?.finalFare ?? ride?.estimatedFare)?.toFixed(2)}`
          : 'Book a ride first'}
      </p>

      {paymentStatus && <p>Payment status: {paymentStatus}</p>}

      {ride && (
        <label>
          Payment option
          <select
            value={paymentMode}
            onChange={(event) =>
              setPaymentMode(event.target.value as PaymentMode)
            }
          >
            <option value="POST_RIDE">
              Pay after ride
            </option>
            <option value="ADVANCE">
              Pay in advance
            </option>
          </select>
        </label>
      )}

      <button
        type="button"
        onClick={handlePayment}
        disabled={!ride || busy || ['CAPTURED', 'PENDING', 'AUTHORIZED'].includes(paymentStatus ?? '') || (paymentMode === 'POST_RIDE' && ride.status !== 'COMPLETED')}
      >
        {busy ? 'Processing...' : paymentStatus === 'CAPTURED' ? 'Paid' : 'Pay Now'}
      </button>

      {message && <p>{message}</p>}
    </section>
  )
}
