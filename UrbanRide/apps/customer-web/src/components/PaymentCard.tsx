import { useState } from 'react'
import {
  createPaymentOrder,
  verifyPayment,
} from '../services/payments'

const TEST_RIDE_ID = 'cmu2xh5vx0000uwi997uhkq56'

export function PaymentCard() {
  const [message, setMessage] = useState('')

  async function handlePayment() {
    try {
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

      const payment = await createPaymentOrder(TEST_RIDE_ID)

      setMessage('Opening Razorpay Checkout...')

      const checkout = new window.Razorpay({
        key: razorpayKeyId,
        amount: Math.round(payment.amount * 100),
        currency: 'INR',
        name: 'UrbanRide',
        description: 'UrbanRide Test Payment',
        order_id: payment.razorpayOrderId,

        handler: async (response) => {
          try {
            setMessage('Verifying payment...')

            const verifiedPayment = await verifyPayment(
              payment.id,
              response.razorpay_payment_id,
              response.razorpay_signature,
            )

            setMessage(
              `Payment ${verifiedPayment.status.toLowerCase()} successfully.`,
            )
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
    }
  }

  return (
    <section>
      <h3>Payment</h3>

      <p>Test ride fare: ₹123</p>

      <button
        type="button"
        onClick={handlePayment}
      >
        Pay ₹123
      </button>

      {message && <p>{message}</p>}
    </section>
  )
}