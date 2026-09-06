import type { ReactNode } from 'react'
import { AdminNavigation } from '../routes/AdminNavigation'

type AdminLayoutProps = {
  children: ReactNode
}

export function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <div>
      <header>
        <h1>UrbanRide</h1>
        <p>Admin Dashboard</p>
        <AdminNavigation />
      </header>

      <main>{children}</main>
    </div>
  )
}
