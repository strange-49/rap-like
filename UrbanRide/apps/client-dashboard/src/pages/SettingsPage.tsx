import { useState } from 'react'

export function SettingsPage() {
  const [companyName, setCompanyName] = useState('')
  const [companyEmail, setCompanyEmail] = useState('')
  const [companyPhone, setCompanyPhone] = useState('')
  const [saved, setSaved] = useState(false)

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaved(true)
  }

  return (
    <section>
      <header>
        <h2>Company Settings</h2>
        <p>Manage your company account information.</p>
      </header>

      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="company-name">Company Name</label>
          <input
            id="company-name"
            name="companyName"
            type="text"
            value={companyName}
            onChange={(event) => {
              setCompanyName(event.target.value)
              setSaved(false)
            }}
            placeholder="Enter company name"
            required
          />
        </div>

        <div>
          <label htmlFor="company-email">Company Email</label>
          <input
            id="company-email"
            name="companyEmail"
            type="email"
            value={companyEmail}
            onChange={(event) => {
              setCompanyEmail(event.target.value)
              setSaved(false)
            }}
            placeholder="Enter company email"
            required
          />
        </div>

        <div>
          <label htmlFor="company-phone">Company Phone</label>
          <input
            id="company-phone"
            name="companyPhone"
            type="tel"
            value={companyPhone}
            onChange={(event) => {
              setCompanyPhone(event.target.value)
              setSaved(false)
            }}
            placeholder="Enter company phone"
            required
          />
        </div>

        <button type="submit">Save Changes</button>

        {saved && <p>Changes saved successfully.</p>}
      </form>
    </section>
  )
}
