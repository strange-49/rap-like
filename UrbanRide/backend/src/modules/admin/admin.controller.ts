import type { IncomingMessage, ServerResponse } from 'node:http'

import { getAdminCorporateAccount, getAdminCustomerActivity, getAdminOverview, getAdminPayment, getAdminRide, getAdminRiderActivity, listAdminCorporateAccounts, listAdminPayments, listAdminRides } from './admin.service'

function sendJson(
  response: ServerResponse,
  statusCode: number,
  data: unknown,
) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json',
  })

  response.end(JSON.stringify(data))
}

export async function handleAdminController(
  request: IncomingMessage,
  response: ServerResponse,
  pathname: string,
): Promise<boolean> {
  if (
    pathname === '/admin/customers/activity' &&
    request.method === 'GET'
  ) {
    const activity = await getAdminCustomerActivity()

    sendJson(response, 200, activity)
    return true
  }
  if (
    pathname === '/admin/riders/activity' &&
    request.method === 'GET'
  ) {
    const activity = await getAdminRiderActivity()

    sendJson(response, 200, activity)
    return true
  }
  const corporateAccountMatch = pathname.match(
    /^\/admin\/corporate\/accounts\/([^/]+)$/,
  )

  if (corporateAccountMatch && request.method === 'GET') {
    const account = await getAdminCorporateAccount(
      corporateAccountMatch[1],
    )

    sendJson(response, 200, account)
    return true
  }

  if (
    pathname === '/admin/corporate/accounts' &&
    request.method === 'GET'
  ) {
    const accounts = await listAdminCorporateAccounts()

    sendJson(response, 200, accounts)
    return true
  }
  const paymentMatch = pathname.match(/^\/admin\/payments\/([^/]+)$/)

  if (paymentMatch && request.method === 'GET') {
    const payment = await getAdminPayment(paymentMatch[1])

    sendJson(response, 200, payment)
    return true
  }

  if (pathname === '/admin/payments' && request.method === 'GET') {
    const payments = await listAdminPayments()

    sendJson(response, 200, payments)
    return true
  }
  const rideMatch = pathname.match(/^\/admin\/rides\/([^/]+)$/)

  if (rideMatch && request.method === 'GET') {
    const ride = await getAdminRide(rideMatch[1])

    sendJson(response, 200, ride)
    return true
  }

  if (pathname === '/admin/rides' && request.method === 'GET') {
    const rides = await listAdminRides()

    sendJson(response, 200, rides)
    return true
  }
  if (pathname === '/admin/overview' && request.method === 'GET') {
    const overview = await getAdminOverview()

    sendJson(response, 200, overview)
    return true
  }

  return false
}





