import type { IncomingMessage, ServerResponse } from 'node:http'

import {
  handleCreatePaymentOrder,
  handleVerifyPayment,
} from './payment.controller'
import { processPaymentWebhook } from './payment.webhook'

export async function handlePaymentRoutes(
  request: IncomingMessage,
  response: ServerResponse,
): Promise<boolean> {
  const url = new URL(
    request.url ?? '/',
    `http://${request.headers.host ?? 'localhost'}`,
  )

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
      await handleCreatePaymentOrder(input, response)
      return true
    }

    await handleVerifyPayment(input, response)
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