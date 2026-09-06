import { NavLink } from 'react-router-dom'
import { ROUTE_PATHS } from '../routes/route-paths'

export function ClientNavigation() {
  return (
    <nav>
      <NavLink to={ROUTE_PATHS.dashboard}>Dashboard</NavLink>
      {' | '}
      <NavLink to={ROUTE_PATHS.employees}>Employees</NavLink>
      {' | '}
      <NavLink to={ROUTE_PATHS.rides}>Rides</NavLink>
      {' | '}
      <NavLink to={ROUTE_PATHS.settings}>Settings</NavLink>
    </nav>
  )
}
