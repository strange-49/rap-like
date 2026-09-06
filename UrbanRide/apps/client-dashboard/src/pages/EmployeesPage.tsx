import { useState } from 'react'
import { AddEmployeeDialog } from '../components/ui/AddEmployeeDialog'

type Employee = {
  name: string
  email: string
  phone: string
}

export function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([])

  function handleEmployeeAdded(employee: Employee) {
    setEmployees((currentEmployees) => [...currentEmployees, employee])
  }

  return (
    <section>
      <header>
        <h2>Employees</h2>
        <p>Manage employees who can use company rides.</p>
      </header>

      <div>
        <AddEmployeeDialog onEmployeeAdded={handleEmployeeAdded} />
      </div>

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
              <td colSpan={4}>No employees added yet.</td>
            </tr>
          ) : (
            employees.map((employee) => (
              <tr key={employee.email}>
                <td>{employee.name}</td>
                <td>{employee.email}</td>
                <td>{employee.phone}</td>
                <td>Active</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </section>
  )
}
