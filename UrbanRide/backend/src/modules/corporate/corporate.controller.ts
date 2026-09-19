import type { IncomingMessage, ServerResponse } from 'node:http'

import { AppError } from '../../common/errors/app-error'
import {
  addEmployee,
  createAccount,
  listEmployees,
  listCorporateRides,
  getBillingSummary,
  getCorporateReport,
} from './corporate.service'

async function readJsonBody(request: IncomingMessage) {
  let body = ''

  for await (const chunk of request) {
    body += chunk
  }

  if (!body.trim()) {
    throw new AppError('Request body is required.', 400, 'REQUEST_BODY_REQUIRED')
  }

  try {
    return JSON.parse(body) as Record<string, unknown>
  } catch {
    throw new AppError('Invalid JSON body.', 400, 'INVALID_JSON')
  }
}

function sendJson(response: ServerResponse, statusCode: number, data: unknown) {
  response.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
  })

  response.end(JSON.stringify(data))
}

export async function handleCorporateController(
  request: IncomingMessage,
  response: ServerResponse,
  pathname: string,
): Promise<boolean> {
  if (request.method === 'POST' && pathname === '/corporate/accounts') {
    const body = await readJsonBody(request)

    const account = await createAccount(
      String(body.name ?? ''),
      body.billingEmail ? String(body.billingEmail) : undefined,
    )

    sendJson(response, 201, account)
    return true
  }

  const billingMatch = pathname.match(
    /^\/corporate\/accounts\/([^/]+)\/billing$/,
  )

  if (billingMatch && request.method === 'GET') {
    const corporateAccountId = billingMatch[1]
    const summary = await getBillingSummary(corporateAccountId)

    sendJson(response, 200, summary)
    return true
  }

  const reportMatch = pathname.match(
    /^\/corporate\/accounts\/([^/]+)\/reports$/,
  )

  if (reportMatch && request.method === 'GET') {
    const corporateAccountId = reportMatch[1]
    const report = await getCorporateReport(corporateAccountId)

    sendJson(response, 200, report)
    return true
  }
  const ridesMatch = pathname.match(
    /^\/corporate\/accounts\/([^/]+)\/rides$/,
  )

  if (ridesMatch && request.method === 'GET') {
    const corporateAccountId = ridesMatch[1]
    const rides = await listCorporateRides(corporateAccountId)

    sendJson(response, 200, rides)
    return true
  }

  const employeeMatch = pathname.match(
    /^\/corporate\/accounts\/([^/]+)\/employees$/,
  )

  if (employeeMatch) {
    const corporateAccountId = employeeMatch[1]

    if (request.method === 'POST') {
      const body = await readJsonBody(request)

      const employee = await addEmployee(
        corporateAccountId,
        String(body.name ?? ''),
        String(body.email ?? ''),
        body.phone ? String(body.phone) : undefined,
      )

      sendJson(response, 201, employee)
      return true
    }

    if (request.method === 'GET') {
      const employees = await listEmployees(corporateAccountId)

      sendJson(response, 200, employees)
      return true
    }
  }

  return false
}




