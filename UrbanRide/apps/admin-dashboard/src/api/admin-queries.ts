import { useQuery } from '@tanstack/react-query'
import { adminApi } from './admin-api'
import type { AdminOverview } from './admin-types'

export function useAdminOverview() {
  return useQuery({
    queryKey: ['admin', 'overview'],
    queryFn: () => adminApi<AdminOverview>('/admin/overview'),
    refetchInterval: 10000,
  })
}
