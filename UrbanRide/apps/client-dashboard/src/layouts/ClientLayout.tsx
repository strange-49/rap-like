import type { ReactNode } from 'react'
import { UserMenu } from '../components/ui/UserMenu'
import { ClientNavigation } from '../components/ClientNavigation'
import './ClientLayout.css'

type ClientLayoutProps = {
  children: ReactNode
}

export function ClientLayout({ children }: ClientLayoutProps) {
  return (
    <div className="client-layout">
      <header className="client-header">
        <div className="client-header-top">
          <div>
            <h1>UrbanRide</h1>
            <p>Client Dashboard</p>
          </div>

          <UserMenu />
        </div>

        <div className="client-navigation">
          <ClientNavigation />
        </div>
      </header>

      <main className="client-main">{children}</main>
    </div>
  )
}
