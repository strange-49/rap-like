import { useEffect, useState } from 'react'
import { StatCard } from '../components/StatCard'
import {
  getCurrentCorporateAccount,
  getCorporateReport,
  getEmployees,
  type CorporateAccount,
} from '../services/corporate'
import './ClientDashboardPage.css'

export function ClientDashboardPage() {
  const [account, setAccount] =
    useState<CorporateAccount | null>(null)

  const [employeeCount, setEmployeeCount] =
    useState(0)

  const [stats, setStats] =
    useState({
      activeRides: 0,
      completedRides: 0,
      spending: 0,
    })

  const [loading, setLoading] =
    useState(true)

  const [error, setError] =
    useState('')

  useEffect(() => {
    async function loadDashboard() {
      try {
        setLoading(true)
        setError('')

        const corporateAccount =
          await getCurrentCorporateAccount()

        const [employees, report] =
          await Promise.all([
            getEmployees(
              corporateAccount.id,
            ),
            getCorporateReport(
              corporateAccount.id,
            ),
          ])

        setAccount(corporateAccount)
        setEmployeeCount(
          employees.length,
        )

        setStats({
          activeRides:
            report.summary.requestedRides,
          completedRides:
            report.summary.completedRides,
          spending:
            report.summary.capturedAmount,
        })
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Unable to load dashboard.',
        )
      } finally {
        setLoading(false)
      }
    }

    void loadDashboard()
  }, [])

  if (loading) {
    return (
      <section className="dashboard">
        <h2>Loading dashboard...</h2>
      </section>
    )
  }

  if (error) {
    return (
      <section className="dashboard">
        <h2>Dashboard</h2>
        <p role="alert">{error}</p>
      </section>
    )
  }

  return (
    <section className="dashboard">
      <header className="dashboard-header">
        <h2>Dashboard</h2>
        <p>
          {account?.name ??
            'Company overview'}
        </p>
      </header>

      <div className="dashboard-stats">
        <StatCard
          title="Total Employees"
          value={String(employeeCount)}
        />

        <StatCard
          title="Active Rides"
          value={String(
            stats.activeRides,
          )}
        />

        <StatCard
          title="Completed Rides"
          value={String(
            stats.completedRides,
          )}
        />

        <StatCard
          title="Company Spending"
          value={`₹${stats.spending.toFixed(
            2,
          )}`}
        />
      </div>
    </section>
  )
}