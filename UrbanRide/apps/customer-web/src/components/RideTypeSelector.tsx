import type { RideType } from '../features/rides/ride-types'

type RideTypeSelectorProps = {
  value: RideType | ''
  onChange: (value: RideType | '') => void
  showFareRanges?: boolean
}

const rideOptions: { value: RideType; label: string; icon: string; description: string; fareRange: string; eta: string }[] = [
  { value: 'auto', label: 'Auto', icon: '🛺', description: 'Quick city rides', fareRange: '₹60–₹90', eta: '~ 5 min' },
  { value: 'bike', label: 'Bike', icon: '🏍', description: 'Beat the traffic', fareRange: '₹40–₹70', eta: '~ 4 min' },
  { value: 'cab', label: 'Car', icon: '🚘', description: 'Comfortable trips', fareRange: '₹120–₹180', eta: '~ 5 min' },
]

export function RideTypeSelector({ value, onChange, showFareRanges = false }: RideTypeSelectorProps) {
  return (
    <fieldset className="ride-type-options">
      <legend className="ride-type-legend">Choose a ride</legend>
      <div className="ride-type-choice-grid">
        {rideOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            className={`ride-type-choice${value === option.value ? ' is-selected' : ''}`}
            aria-pressed={value === option.value}
            onClick={() => onChange(option.value)}
          >
            <span className="ride-type-icon" aria-hidden="true">{option.icon}</span>
            <span className="ride-type-copy"><strong>{option.label}</strong><small>{option.description}</small></span>
            <span className="ride-type-fare"><small>{option.eta}</small></span>
            <span className="ride-type-selection" aria-hidden="true">{value === option.value ? '✓' : ''}</span>
          </button>
        ))}
      </div>
    </fieldset>
  )
}
