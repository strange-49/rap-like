import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { ROUTE_PATHS } from '../routes/route-paths'

type ClientLayoutProps = {
  children: ReactNode
}

export function ClientLayout({ children }: ClientLayoutProps) {
  return (
    <div>
      <header>
        <h1>UrbanRide</h1>
        <p>Client Dashboard</p>

        <nav>
          <NavLink to={ROUTE_PATHS.dashboard}>Dashboard</NavLink>
          {' | '}
          <NavLink to={ROUTE_PATHS.employees}>Employees</NavLink>
          {' | '}
          <NavLink to={ROUTE_PATHS.rides}>Rides</NavLink>
          {' | '}
          <NavLink to={ROUTE_PATHS.settings}>Settings</NavLink>
        </nav>
      </header>

      <main>{children}</main>
    </div>
  )
}
