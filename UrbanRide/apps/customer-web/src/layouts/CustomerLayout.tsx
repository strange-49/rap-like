import type { ReactNode } from 'react'

type CustomerLayoutProps = {
  children: ReactNode
}

export function CustomerLayout({ children }: CustomerLayoutProps) {
  return (
    <div>
      <header>
        <h1>UrbanRide</h1>
      </header>

      <main>{children}</main>
    </div>
  )
}
