const API_BASE_URL = 'http://localhost:3000'

export async function adminApi<T>(path: string): Promise<T> {
  const token = sessionStorage.getItem('urbanride-admin-token')
  const response = await fetch(`${API_BASE_URL}${path}`, { headers: token ? { authorization: `Bearer ${token}` } : {} })
  const data = await response.json().catch(() => null)
  if (!response.ok) throw new Error(data?.error?.message || `Admin API request failed: ${response.status}`)
  return data as T
}
