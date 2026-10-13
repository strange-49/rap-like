import { useQuery } from '@tanstack/react-query'
import { adminApi } from './admin-api'
import type { AdminOverview, AdminRide, AdminPayment } from './admin-types'

export function useAdminOverview() {
  return useQuery({ queryKey: ['admin', 'overview'], queryFn: () => adminApi<AdminOverview>('/admin/overview'), refetchInterval: 10000 })
}
export function useAdminRides() {
  return useQuery({ queryKey: ['admin', 'rides'], queryFn: () => adminApi<AdminRide[]>('/admin/rides'), refetchInterval: 30000 })
}
export function useAdminPayments() {
  return useQuery({ queryKey: ['admin', 'payments'], queryFn: () => adminApi<AdminPayment[]>('/admin/payments'), refetchInterval: 30000 })
}
