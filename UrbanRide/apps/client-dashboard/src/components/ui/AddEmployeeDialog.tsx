import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'

type Employee = {
  name: string
  email: string
  phone: string
}

type AddEmployeeDialogProps = {
  onEmployeeAdded: (employee: Employee) => void
}

export function AddEmployeeDialog({
  onEmployeeAdded,
}: AddEmployeeDialogProps) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const employee = {
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
    }

    if (!employee.name || !employee.email || !employee.phone) {
      return
    }

    onEmployeeAdded(employee)
    setName('')
    setEmail('')
    setPhone('')
    setOpen(false)
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button type="button">Add Employee</button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay />

        <Dialog.Content>
          <Dialog.Title>Add Employee</Dialog.Title>

          <Dialog.Description>
            Add an employee to your company's UrbanRide account.
          </Dialog.Description>

          <form onSubmit={handleSubmit}>
            <div>
              <label htmlFor="employee-name">Name</label>
              <input
                id="employee-name"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
              />
            </div>

            <div>
              <label htmlFor="employee-email">Email</label>
              <input
                id="employee-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>

            <div>
              <label htmlFor="employee-phone">Phone</label>
              <input
                id="employee-phone"
                type="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                required
              />
            </div>

            <button type="submit">Add Employee</button>

            <Dialog.Close asChild>
              <button type="button">Cancel</button>
            </Dialog.Close>
          </form>

          <Dialog.Close asChild>
            <button type="button" aria-label="Close">
              X
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}