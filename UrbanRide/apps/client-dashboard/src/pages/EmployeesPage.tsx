import {
  FormEvent,
  useEffect,
  useState,
} from 'react'
import {
  addEmployee,
  getCurrentCorporateAccount,
  getEmployees,
  type Employee,
} from '../services/corporate'

export function EmployeesPage() {
  const [employees, setEmployees] =
    useState<Employee[]>([])

  const [accountId, setAccountId] =
    useState('')

  const [name, setName] =
    useState('')

  const [email, setEmail] =
    useState('')

  const [phone, setPhone] =
    useState('')

  const [loading, setLoading] =
    useState(true)

  const [saving, setSaving] =
    useState(false)

  const [error, setError] =
    useState('')

  async function loadEmployees() {
    try {
      setLoading(true)
      setError('')

      const account =
        await getCurrentCorporateAccount()

      const result =
        await getEmployees(account.id)

      setAccountId(account.id)
      setEmployees(result)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to load employees.',
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadEmployees()
  }, [])

  async function handleSubmit(
    event: FormEvent,
  ) {
    event.preventDefault()

    if (!accountId) {
      return
    }

    try {
      setSaving(true)
      setError('')

      const employee =
        await addEmployee(
          accountId,
          {
            name: name.trim(),
            email: email.trim(),
            phone: phone.trim() || undefined,
          },
        )

      setEmployees((current) => [
        employee,
        ...current,
      ])

      setName('')
      setEmail('')
      setPhone('')
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to add employee.',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <section>
      <header>
        <h2>Employees</h2>
        <p>
          Manage employees who can use
          company rides.
        </p>
      </header>

      <form
        onSubmit={handleSubmit}
        style={{
          display: 'grid',
          gap: '12px',
          maxWidth: '520px',
          marginBottom: '24px',
        }}
      >
        <input
          placeholder="Employee name"
          value={name}
          onChange={(event) =>
            setName(event.target.value)
          }
          required
        />

        <input
          type="email"
          placeholder="Employee email"
          value={email}
          onChange={(event) =>
            setEmail(event.target.value)
          }
          required
        />

        <input
          placeholder="Phone"
          value={phone}
          onChange={(event) =>
            setPhone(event.target.value)
          }
        />

        <button
          type="submit"
          disabled={saving}
        >
          {saving
            ? 'Adding...'
            : 'Add Employee'}
        </button>
      </form>

      {error && (
        <p role="alert">{error}</p>
      )}

      {loading ? (
        <p>Loading employees...</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Status</th>
            </tr>
          </thead>

          <tbody>
            {employees.length === 0 ? (
              <tr>
                <td colSpan={4}>
                  No employees yet.
                </td>
              </tr>
            ) : (
              employees.map(
                (employee) => (
                  <tr key={employee.id}>
                    <td>
                      {employee.name}
                    </td>
                    <td>
                      {employee.email}
                    </td>
                    <td>
                      {employee.phone ??
                        '—'}
                    </td>
                    <td>
                      {employee.active
                        ? 'Active'
                        : 'Inactive'}
                    </td>
                  </tr>
                ),
              )
            )}
          </tbody>
        </table>
      )}
    </section>
  )
}