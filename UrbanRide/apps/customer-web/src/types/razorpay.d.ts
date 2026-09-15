export {}

declare global {
  interface RazorpayCheckoutResponse {
    razorpay_payment_id: string
    razorpay_order_id: string
    razorpay_signature: string
  }

  interface RazorpayOptions {
    key: string
    amount: number
    currency: string
    name: string
    description: string
    order_id: string
    handler: (response: RazorpayCheckoutResponse) => void
  }

  interface RazorpayCheckout {
    open: () => void
  }

  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayCheckout
  }
}