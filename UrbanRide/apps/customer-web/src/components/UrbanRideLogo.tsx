import type { CSSProperties } from 'react'

type UrbanRideLogoProps = {
  className?: string
  tagline?: boolean
  markSize?: number
}

export function UrbanRideLogo({ className = '', tagline = false, markSize = 38 }: UrbanRideLogoProps) {
  return (
    <span className={`urbanride-logo-lockup ${className}`.trim()} style={{ '--urbanride-logo-size': `${markSize}px` } as CSSProperties}>
      <span className="urbanride-logo-symbol" aria-hidden="true">
        <svg viewBox="0 0 48 48" focusable="false">
          <circle cx="24" cy="24" r="23" fill="#08d98b" />
          <path d="M8 24.5c3.1-3.1 7.4-6.1 11.2-6.3 3.5-.2 5.7 2 4.9 4.8-.7 2.4-3.8 4.3-7.3 6.1 4.8 3.6 11.2 2.8 15.5-1.2 3.1-2.9 4.7-6.5 4.1-10.1" fill="none" stroke="#052438" strokeWidth="4.1" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <span className="urbanride-logo-type">
        <span className="urbanride-wordmark">Urban<span className="urbanride-wordmark-r">R</span>ide</span>
        {tagline && <small className="urbanride-logo-tagline">Move through your city</small>}
      </span>
    </span>
  )
}
