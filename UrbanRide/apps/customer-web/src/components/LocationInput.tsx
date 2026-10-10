import { useEffect, useState } from 'react'
import type { LocationSelection } from '../features/rides/ride-request'
import {
  searchLocations,
  type LocationSuggestion,
} from '../services/locations'

type LocationInputProps = {
  label: string
  value: string
  placeholder: string
  onChange: (value: string) => void
  onSelect: (location: LocationSelection) => void
}

export function LocationInput({
  label,
  value,
  placeholder,
  onChange,
  onSelect,
}: LocationInputProps) {
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const query = value.trim()

    if (!query) {
      setSuggestions([])
      return
    }

    const timeout = window.setTimeout(async () => {
      try {
        setLoading(true)
        const results = await searchLocations(query)
        setSuggestions(results)
      } catch {
        setSuggestions([])
      } finally {
        setLoading(false)
      }
    }, 300)

    return () => window.clearTimeout(timeout)
  }, [value])

  function handleSelect(location: LocationSuggestion) {
    onSelect({
      address: location.address,
      latitude: location.latitude,
      longitude: location.longitude,
    })

    setSuggestions([])
  }

  return (
    <div>
      <label>
        {label}
        <input
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      </label>

      {loading && <p>Searching...</p>}

      {suggestions.length > 0 && (
        <ul>
          {suggestions.map((suggestion) => (
            <li key={`${suggestion.latitude}-${suggestion.longitude}`}>
              <button
                type="button"
                onClick={() => handleSelect(suggestion)}
              >
                {suggestion.address}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
