import { StatCard } from '../components/StatCard'
import './ClientDashboardPage.css'

export function ClientDashboardPage() {
  return (
    <section className="dashboard">
      <header className="dashboard-header">
        <h2>Dashboard</h2>
        <p>Overview of your company rides and employees.</p>
      </header>

      <div className="dashboard-stats">
        <StatCard title="Total Employees" value="0" />
        <StatCard title="Active Rides" value="0" />
        <StatCard title="Completed Rides" value="0" />
        <StatCard title="Company Spending" value="?0" />
      </div>
    </section>
  )
}
