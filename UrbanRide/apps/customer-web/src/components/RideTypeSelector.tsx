import type { RideType } from '../features/rides/ride-types'

type RideTypeSelectorProps = {
  value: RideType | ''
  onChange: (value: RideType | '') => void
}

export function RideTypeSelector({
  value,
  onChange,
}: RideTypeSelectorProps) {
  return (
    <label>
      Ride type
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as RideType | '')}
      >
        <option value="">Select ride type</option>
        <option value="bike">Bike</option>
        <option value="auto">Auto</option>
        <option value="cab">Cab</option>
      </select>
    </label>
  )
}
