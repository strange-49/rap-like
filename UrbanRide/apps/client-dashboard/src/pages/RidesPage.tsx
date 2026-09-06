export function RidesPage() {
  return (
    <section>
      <header>
        <h2>Rides</h2>
        <p>View and manage rides booked through your company account.</p>
      </header>

      <div>
        <button type="button">Book a Ride</button>
      </div>

      <table>
        <thead>
          <tr>
            <th>Employee</th>
            <th>Pickup</th>
            <th>Drop</th>
            <th>Status</th>
            <th>Fare</th>
          </tr>
        </thead>

        <tbody>
          <tr>
            <td colSpan={5}>No company rides yet.</td>
          </tr>
        </tbody>
      </table>
    </section>
  )
}
