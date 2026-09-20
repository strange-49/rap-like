export type AdminOverview = {
  rides: {
    total: number
    byStatus: Record<string, number>
  }
  payments: {
    total: number
    capturedAmount: number | string
  }
  corporate: {
    accounts: number
    employees: number
  }
  rider: {
    deviceTokens: number
  }
}
