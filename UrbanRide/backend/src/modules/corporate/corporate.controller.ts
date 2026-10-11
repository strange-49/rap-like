import type { IncomingMessage, ServerResponse } from 'node:http'

import type { AuthContext } from '../../common/auth/auth-context'
import { AppError } from '../../common/errors/app-error'
import {
  addEmployee,
  createAccount,
  registerCorporateCompany,
  listEmployees,
  listCorporateRides,
  getBillingSummary,
  getCorporateReport,
  findAccountForTenant,
} from './corporate.service'

async function readJsonBody(request: IncomingMessage) {
  let body = ''
  for await (const chunk of request) body += chunk
  if (!body.trim()) throw new AppError('Request body is required.', 400, 'REQUEST_BODY_REQUIRED')
  try { return JSON.parse(body) as Record<string, unknown> }
  catch { throw new AppError('Invalid JSON body.', 400, 'INVALID_JSON') }
}

function sendJson(response: ServerResponse, statusCode: number, data: unknown) {
  response.writeHead(statusCode, { 'content-type': 'application/json; charset=utf-8' })
  response.end(JSON.stringify(data))
}

function requireAuthenticated(authContext: AuthContext | null): asserts authContext is AuthContext {
  if (!authContext) throw new AppError('Authentication required.', 401, 'AUTHENTICATION_REQUIRED')
}

function requireCorporateAdmin(authContext: AuthContext | null): asserts authContext is AuthContext {
  requireAuthenticated(authContext)
  if (authContext.role !== 'CLIENT_ADMIN' && authContext.role !== 'ADMIN') {
    throw new AppError('Corporate administrator access is required.', 403, 'CORPORATE_ADMIN_REQUIRED')
  }
}

async function requireCorporateAccountAccess(corporateAccountId: string, authContext: AuthContext | null) {
  requireCorporateAdmin(authContext)
  if (authContext.role === 'ADMIN') return
  const tenantId = authContext.tenant?.tenantId
  if (!tenantId) throw new AppError('Corporate tenant context is required.', 403, 'TENANT_CONTEXT_REQUIRED')
  const account = await findAccountForTenant(corporateAccountId, tenantId)
  if (!account) throw new AppError('You do not have access to this corporate account.', 403, 'CORPORATE_ACCOUNT_ACCESS_DENIED')
}

export async function handleCorporateController(
  request: IncomingMessage,
  response: ServerResponse,
  pathname: string,
  authContext: AuthContext | null,
): Promise<boolean> {
  // Public self-registration creates the company and its first administrator atomically.
  if (request.method === 'POST' && pathname === '/corporate/register') {
    const body = await readJsonBody(request)
    const result = await registerCorporateCompany({
      companyName: String(body.companyName ?? body.name ?? ''),
      billingEmail: String(body.billingEmail ?? body.companyEmail ?? ''),
      adminName: String(body.adminName ?? ''),
      adminUsername: String(body.adminUsername ?? body.adminEmail ?? ''),
      adminEmail: String(body.adminEmail ?? ''),
      password: String(body.password ?? ''),
    })
    sendJson(response, 201, {
      account: result.account,
      administrator: result.admin,
      message: 'Company registered. Sign in to the Client Dashboard using the administrator email and password.',
    })
    return true
  }

  if (request.method === 'POST' && pathname === '/corporate/accounts') {
    requireAuthenticated(authContext)
    if (authContext.role !== 'ADMIN') throw new AppError('Platform administrator access is required.', 403, 'ADMIN_REQUIRED')
    const body = await readJsonBody(request)
    const account = await createAccount(String(body.name ?? ''), body.billingEmail ? String(body.billingEmail) : undefined, body.tenantId ? String(body.tenantId) : undefined)
    sendJson(response, 201, account)
    return true
  }

  if (request.method === 'GET' && pathname === '/corporate/accounts/current') {
    requireCorporateAdmin(authContext)
    if (authContext.role === 'ADMIN') throw new AppError('A tenant is required for current-account lookup.', 400, 'TENANT_REQUIRED')
    const tenantId = authContext.tenant?.tenantId
    if (!tenantId) throw new AppError('Corporate tenant context is required.', 403, 'TENANT_CONTEXT_REQUIRED')
    const account = await findAccountForTenant(undefined, tenantId)
    if (!account) throw new AppError('Corporate account not found for this tenant.', 404, 'CORPORATE_ACCOUNT_NOT_FOUND')
    sendJson(response, 200, account)
    return true
  }

  const billingMatch = pathname.match(/^\/corporate\/accounts\/([^/]+)\/billing$/)
  if (billingMatch && request.method === 'GET') {
    const id = billingMatch[1]; await requireCorporateAccountAccess(id, authContext)
    sendJson(response, 200, await getBillingSummary(id)); return true
  }
  const reportMatch = pathname.match(/^\/corporate\/accounts\/([^/]+)\/reports$/)
  if (reportMatch && request.method === 'GET') {
    const id = reportMatch[1]; await requireCorporateAccountAccess(id, authContext)
    sendJson(response, 200, await getCorporateReport(id)); return true
  }
  const ridesMatch = pathname.match(/^\/corporate\/accounts\/([^/]+)\/rides$/)
  if (ridesMatch && request.method === 'GET') {
    const id = ridesMatch[1]; await requireCorporateAccountAccess(id, authContext)
    sendJson(response, 200, await listCorporateRides(id)); return true
  }
  const employeeMatch = pathname.match(/^\/corporate\/accounts\/([^/]+)\/employees$/)
  if (employeeMatch) {
    const id = employeeMatch[1]; await requireCorporateAccountAccess(id, authContext)
    if (request.method === 'POST') {
      const body = await readJsonBody(request)
      const employee = await addEmployee(id, String(body.name ?? ''), String(body.email ?? ''), body.phone ? String(body.phone) : undefined)
      sendJson(response, 201, employee); return true
    }
    if (request.method === 'GET') {
      sendJson(response, 200, await listEmployees(id)); return true
    }
  }
  return false
}
