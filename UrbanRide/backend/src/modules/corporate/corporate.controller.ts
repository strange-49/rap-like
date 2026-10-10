import type { IncomingMessage, ServerResponse } from 'node:http'

import type { AuthContext } from '../../common/auth/auth-context'
import { AppError } from '../../common/errors/app-error'
import {
  addEmployee,
  createAccount,
  listEmployees,
  listCorporateRides,
  getBillingSummary,
  getCorporateReport,
  findAccountForTenant,
} from './corporate.service'

async function readJsonBody(request: IncomingMessage) {
  let body = ''

  for await (const chunk of request) {
    body += chunk
  }

  if (!body.trim()) {
    throw new AppError(
      'Request body is required.',
      400,
      'REQUEST_BODY_REQUIRED',
    )
  }

  try {
    return JSON.parse(body) as Record<string, unknown>
  } catch {
    throw new AppError(
      'Invalid JSON body.',
      400,
      'INVALID_JSON',
    )
  }
}

function sendJson(
  response: ServerResponse,
  statusCode: number,
  data: unknown,
) {
  response.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
  })

  response.end(JSON.stringify(data))
}

function requireAuthenticated(
  authContext: AuthContext | null,
): asserts authContext is AuthContext {
  if (!authContext) {
    throw new AppError(
      'Authentication required.',
      401,
      'AUTHENTICATION_REQUIRED',
    )
  }
}

function requireCorporateAdmin(
  authContext: AuthContext | null,
): asserts authContext is AuthContext {
  requireAuthenticated(authContext)

  if (
    authContext.role !== 'CLIENT_ADMIN' &&
    authContext.role !== 'ADMIN'
  ) {
    throw new AppError(
      'Corporate administrator access is required.',
      403,
      'CORPORATE_ADMIN_REQUIRED',
    )
  }
}

async function requireCorporateAccountAccess(
  corporateAccountId: string,
  authContext: AuthContext | null,
) {
  requireCorporateAdmin(authContext)

  if (authContext.role === 'ADMIN') {
    return
  }

  const tenantId = authContext.tenant?.tenantId

  if (!tenantId) {
    throw new AppError(
      'Corporate tenant context is required.',
      403,
      'TENANT_CONTEXT_REQUIRED',
    )
  }

  const account = await findAccountForTenant(
    corporateAccountId,
    tenantId,
  )

  if (!account) {
    throw new AppError(
      'You do not have access to this corporate account.',
      403,
      'CORPORATE_ACCOUNT_ACCESS_DENIED',
    )
  }
}

export async function handleCorporateController(
  request: IncomingMessage,
  response: ServerResponse,
  pathname: string,
  authContext: AuthContext | null,
): Promise<boolean> {
  if (
    request.method === 'POST' &&
    pathname === '/corporate/accounts'
  ) {
    requireAuthenticated(authContext)

    if (authContext.role !== 'ADMIN') {
      throw new AppError(
        'Platform administrator access is required.',
        403,
        'ADMIN_REQUIRED',
      )
    }

    const body = await readJsonBody(request)

    const account = await createAccount(
      String(body.name ?? ''),
      body.billingEmail
        ? String(body.billingEmail)
        : undefined,
      body.tenantId
        ? String(body.tenantId)
        : undefined,
    )

    sendJson(response, 201, account)
    return true
  }

  const currentAccountMatch = pathname.match(
    /^\/corporate\/accounts\/current$/,
  )

  if (
    currentAccountMatch &&
    request.method === 'GET'
  ) {
    requireCorporateAdmin(authContext)

    if (authContext.role === 'ADMIN') {
      throw new AppError(
        'A tenant is required for current-account lookup.',
        400,
        'TENANT_REQUIRED',
      )
    }

    const tenantId = authContext.tenant?.tenantId

    if (!tenantId) {
      throw new AppError(
        'Corporate tenant context is required.',
        403,
        'TENANT_CONTEXT_REQUIRED',
      )
    }

    const account = await findAccountForTenant(
      undefined,
      tenantId,
    )

    if (!account) {
      throw new AppError(
        'Corporate account not found for this tenant.',
        404,
        'CORPORATE_ACCOUNT_NOT_FOUND',
      )
    }

    sendJson(response, 200, account)
    return true
  }

  const billingMatch = pathname.match(
    /^\/corporate\/accounts\/([^/]+)\/billing$/,
  )

  if (
    billingMatch &&
    request.method === 'GET'
  ) {
    const corporateAccountId = billingMatch[1]

    await requireCorporateAccountAccess(
      corporateAccountId,
      authContext,
    )

    const summary =
      await getBillingSummary(corporateAccountId)

    sendJson(response, 200, summary)
    return true
  }

  const reportMatch = pathname.match(
    /^\/corporate\/accounts\/([^/]+)\/reports$/,
  )

  if (
    reportMatch &&
    request.method === 'GET'
  ) {
    const corporateAccountId = reportMatch[1]

    await requireCorporateAccountAccess(
      corporateAccountId,
      authContext,
    )

    const report =
      await getCorporateReport(corporateAccountId)

    sendJson(response, 200, report)
    return true
  }

  const ridesMatch = pathname.match(
    /^\/corporate\/accounts\/([^/]+)\/rides$/,
  )

  if (
    ridesMatch &&
    request.method === 'GET'
  ) {
    const corporateAccountId = ridesMatch[1]

    await requireCorporateAccountAccess(
      corporateAccountId,
      authContext,
    )

    const rides =
      await listCorporateRides(corporateAccountId)

    sendJson(response, 200, rides)
    return true
  }

  const employeeMatch = pathname.match(
    /^\/corporate\/accounts\/([^/]+)\/employees$/,
  )

  if (employeeMatch) {
    const corporateAccountId = employeeMatch[1]

    await requireCorporateAccountAccess(
      corporateAccountId,
      authContext,
    )

    if (request.method === 'POST') {
      const body = await readJsonBody(request)

      const employee = await addEmployee(
        corporateAccountId,
        String(body.name ?? ''),
        String(body.email ?? ''),
        body.phone
          ? String(body.phone)
          : undefined,
      )

      sendJson(response, 201, employee)
      return true
    }

    if (request.method === 'GET') {
      const employees =
        await listEmployees(corporateAccountId)

      sendJson(response, 200, employees)
      return true
    }
  }

  return false
}