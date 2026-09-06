type LocationInputProps = {
  label: string
  value: string
  placeholder: string
  onChange: (value: string) => void
}

export function LocationInput({
  label,
  value,
  placeholder,
  onChange,
}: LocationInputProps) {
  return (
    <label>
      {label}
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  )
}
