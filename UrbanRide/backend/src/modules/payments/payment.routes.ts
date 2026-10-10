import type { IncomingMessage, ServerResponse } from 'node:http'
import type { AuthContext } from '../../common/auth/auth-context'

import {
  handleCreatePaymentOrder,
  handleVerifyPayment,
  handleGetPaymentStatus,
  handleGetOutstandingPayment,
} from './payment.controller'
import { processPaymentWebhook } from './payment.webhook'

export async function handlePaymentRoutes(
  request: IncomingMessage,
  response: ServerResponse,
  authContext: AuthContext | null,
): Promise<boolean> {
  const url = new URL(
    request.url ?? '/',
    `http://${request.headers.host ?? 'localhost'}`,
  )

  const paymentStatusMatch = url.pathname.match(/^\/payments\/ride\/([^/]+)$/)
  if (request.method === 'GET' && url.pathname === '/payments/outstanding') {
    await handleGetOutstandingPayment(response, authContext)
    return true
  }
  if (request.method === 'GET' && paymentStatusMatch) {
    await handleGetPaymentStatus(
      decodeURIComponent(paymentStatusMatch[1]),
      response,
      authContext,
    )
    return true
  }

  if (
    request.method === 'POST' &&
    (
      url.pathname === '/payments/orders' ||
      url.pathname === '/payments/verify'
    )
  ) {
    let body = ''

    for await (const chunk of request) {
      body += chunk
    }

    const input = JSON.parse(body)

    if (url.pathname === '/payments/orders') {
      await handleCreatePaymentOrder(input, response, authContext)
      return true
    }

    await handleVerifyPayment(input, response, authContext)
    return true
  }

  if (
    request.method === 'POST' &&
    url.pathname === '/payments/webhook'
  ) {
    let body = ''

    for await (const chunk of request) {
      body += chunk
    }

    const signature = request.headers['x-razorpay-signature']

    if (typeof signature !== 'string') {
      response.writeHead(400, {
        'content-type': 'application/json; charset=utf-8',
      })

      response.end(
        JSON.stringify({
          error: {
            code: 'RAZORPAY_WEBHOOK_SIGNATURE_REQUIRED',
            message: 'Razorpay webhook signature is required.',
          },
        }),
      )

      return true
    }

    const result = await processPaymentWebhook(
      body,
      signature,
    )

    response.writeHead(200, {
      'content-type': 'application/json; charset=utf-8',
    })

    response.end(JSON.stringify(result))

    return true
  }

  return false
}
