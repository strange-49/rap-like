import { NavLink } from 'react-router-dom'
import { ROUTE_PATHS } from './route-paths'

export function AdminNavigation() {
  return (
    <nav>
      <NavLink to={ROUTE_PATHS.dashboard}>Dashboard</NavLink>
      {' | '}
      <NavLink to={ROUTE_PATHS.customers}>Customers</NavLink>
      {' | '}
      <NavLink to={ROUTE_PATHS.riders}>Riders</NavLink>
      {' | '}
      <NavLink to={ROUTE_PATHS.rides}>Rides</NavLink>
      {' | '}
      <NavLink to={ROUTE_PATHS.clients}>Clients</NavLink>
      {' | '}
      <NavLink to={ROUTE_PATHS.settings}>Settings</NavLink>
    </nav>
  )
}
