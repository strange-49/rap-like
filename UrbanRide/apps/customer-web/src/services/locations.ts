export type LocationSuggestion = {
  address: string
  latitude: number
  longitude: number
}

const API_BASE_URL = 'http://localhost:3000'

export async function searchLocations(
  query: string,
): Promise<LocationSuggestion[]> {
  const trimmedQuery = query.trim()

  if (!trimmedQuery) {
    return []
  }

  const response = await fetch(
    `${API_BASE_URL}/locations/search?q=${encodeURIComponent(trimmedQuery)}`,
  )

  if (!response.ok) {
    throw new Error(`Location search failed: ${response.status}`)
  }

  const results = (await response.json()) as Array<{
    displayName: string
    latitude: number
    longitude: number
  }>

  return results.map((result) => ({
    address: result.displayName,
    latitude: result.latitude,
    longitude: result.longitude,
  }))
}
