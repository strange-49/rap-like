type StatCardProps = {
  title: string
  value: string
}

export function StatCard({ title, value }: StatCardProps) {
  return (
    <article className="dashboard-stat">
      <h3>{title}</h3>
      <strong>{value}</strong>
    </article>
  )
}
