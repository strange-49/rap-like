import { Link, useLocation } from 'react-router-dom'
import { ROUTE_PATHS } from '../routes/route-paths'

type SectionKey = 'saved-places' | 'payments' | 'notifications' | 'safety' | 'help'

const SECTION_CONTENT: Record<SectionKey, { eyebrow: string; title: string; description: string; icon: string; status: string; detail: string }> = {
  'saved-places': {
    eyebrow: 'YOUR SHORTCUTS', title: 'Saved places', description: 'Keep frequently used destinations close at hand.', icon: '⌖',
    status: 'Saved-place management is not connected yet', detail: 'This project does not currently expose a saved-place API. We have not added fake Home or Work addresses; this section will become editable when persistence is implemented.'
  },
  payments: {
    eyebrow: 'PAYMENT CENTRE', title: 'Payments', description: 'Review payment-related information for your UrbanRide trips.', icon: '▤',
    status: 'Payment methods are not available here yet', detail: 'Razorpay is part of the project stack, but this customer screen does not currently expose a payment-method or receipt-history API. No card or wallet details are being simulated.'
  },
  notifications: {
    eyebrow: 'STAY INFORMED', title: 'Notifications', description: 'Ride updates and important account notices.', icon: '♧',
    status: 'Notification inbox is not connected yet', detail: 'Ride and account notifications need a customer-facing inbox backed by the notification service. This page will not display invented alerts.'
  },
  safety: {
    eyebrow: 'TRAVEL WITH CONFIDENCE', title: 'Safety centre', description: 'Safety tools and guidance for your trips.', icon: '◇',
    status: 'Safety tools need a customer-facing integration', detail: 'This section is a clear landing page only for now. It does not claim to send an SOS, share a live trip, or contact emergency services until those actions are wired to real services.'
  },
  help: {
    eyebrow: 'WE CAN HELP', title: 'Help & support', description: 'Find help with booking, ride status, and your account.', icon: '?',
    status: 'Support contact workflow is not configured yet', detail: 'No support email, phone number, or ticket endpoint is configured in this customer UI, so we are not displaying made-up contact details.'
  },
}

export function CustomerSectionPage() {
  const { pathname } = useLocation()
  const key = pathname.replace(/^\//, '') as SectionKey
  const section = SECTION_CONTENT[key] ?? SECTION_CONTENT.help

  return (
    <div className="customer-section-page">
      <header className="customer-section-header">
        <span className="section-eyebrow">{section.eyebrow}</span>
        <div className="customer-section-title-row"><span className="customer-section-icon" aria-hidden="true">{section.icon}</span><h1>{section.title}</h1></div>
        <p>{section.description}</p>
      </header>
      <section className="customer-section-status glass-card" aria-labelledby="customer-section-status-title">
        <span className="customer-section-status-mark" aria-hidden="true">i</span>
        <div><h2 id="customer-section-status-title">{section.status}</h2><p>{section.detail}</p></div>
      </section>
      <div className="customer-section-actions">
        <Link className="primary-button" to={ROUTE_PATHS.home}>Back to home</Link>
        <Link className="secondary-button" to={ROUTE_PATHS.settings}>Open settings</Link>
      </div>
    </div>
  )
}
