const API_BASE_URL = 'http://localhost:3000'

export async function adminApi<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`)

  if (!response.ok) {
    throw new Error(`Admin API request failed: ${response.status}`)
  }

  return response.json() as Promise<T>
}
