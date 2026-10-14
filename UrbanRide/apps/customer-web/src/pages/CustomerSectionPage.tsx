
import { Link, useLocation } from 'react-router-dom'
import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { ROUTE_PATHS } from '../routes/route-paths'
import { getToken } from '../services/auth'

type SectionKey = 'saved-places' | 'payments' | 'notifications' | 'safety' | 'help'

type SupportMessage = {
  id: string
  conversationId: string
  senderId: string
  body: string
  createdAt: string
  sender?: {
    id: string
    username: string
    fullName: string | null
    role: string
  }
}

type SupportConversation = {
  id: string
  customerId: string
  subject: string
  status: string
  createdAt: string
  updatedAt: string
  customer?: {
    id: string
    username: string
    fullName: string | null
    email: string | null
  }
  messages: SupportMessage[]
}

const API = 'http://localhost:3000'

const SECTION_CONTENT: Record<
  SectionKey,
  {
    eyebrow: string
    title: string
    description: string
    icon: string
    status: string
    detail: string
  }
> = {
  'saved-places': {
    eyebrow: 'YOUR SHORTCUTS',
    title: 'Saved places',
    description: 'Keep frequently used destinations close at hand.',
    icon: '⌖',
    status: 'Saved-place management is not connected yet',
    detail:
      'This project does not currently expose a saved-place API. Home and Work addresses will become editable when persistence is implemented.',
  },
  payments: {
    eyebrow: 'PAYMENT CENTRE',
    title: 'Payments',
    description: 'Review payment-related information for your UrbanRide trips.',
    icon: '¤',
    status: 'Payment methods are not available here yet',
    detail:
      'The customer-facing payment-method and receipt-history APIs are not connected to this screen yet.',
  },
  notifications: {
    eyebrow: 'STAY INFORMED',
    title: 'Notifications',
    description: 'Ride updates and important account notices.',
    icon: '♧',
    status: 'Notification inbox is not connected yet',
    detail:
      'A customer-facing inbox backed by the notification service is needed before alerts can be displayed here.',
  },
  safety: {
    eyebrow: 'TRAVEL WITH CONFIDENCE',
    title: 'Safety centre',
    description: 'Safety tools and guidance for your trips.',
    icon: '◇',
    status: 'Safety tools need a customer-facing integration',
    detail:
      'This page does not claim to send an SOS or share a live trip until those actions are connected to real services.',
  },
  help: {
    eyebrow: 'URBANRIDE CARE',
    title: 'Help & support',
    description: 'Talk directly with the UrbanRide support team.',
    icon: '?',
    status: '',
    detail: '',
  },
}

function messageTime(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function conversationDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleDateString([], { day: 'numeric', month: 'short' })
}

export function CustomerSectionPage() {
  const { pathname } = useLocation()
  const key = pathname.replace(/^\//, '') as SectionKey
  const section = SECTION_CONTENT[key] ?? SECTION_CONTENT.help

  const [conversations, setConversations] = useState<SupportConversation[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [messages, setMessages] = useState<SupportMessage[]>([])
  const [subject, setSubject] = useState('')
  const [newMessage, setNewMessage] = useState('')
  const [reply, setReply] = useState('')
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [sending, setSending] = useState(false)
  const [startingNew, setStartingNew] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const request = useCallback(
    async (path: string, options: RequestInit = {}) => {
      const token = getToken()
      if (!token) throw new Error('Please sign in again to contact support.')

      const response = await fetch(`${API}${path}`, {
        ...options,
        headers: {
          authorization: `Bearer ${token}`,
          ...(options.body ? { 'content-type': 'application/json' } : {}),
          ...options.headers,
        },
      })

      const data = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(
          data?.error?.message ?? 'The support request could not be completed.',
        )
      }

      return data
    },
    [],
  )

  const loadConversations = useCallback(async () => {
    if (key !== 'help') return

    try {
      const data = (await request(
        '/chat/support/conversations',
      )) as SupportConversation[]

      setConversations(data)
      setError('')

      setSelectedId(current => {
        if (current && data.some(item => item.id === current)) return current
        return data[0]?.id ?? ''
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to load support conversations.')
    }
  }, [key, request])

  const loadMessages = useCallback(
    async (conversationId: string) => {
      if (!conversationId || key !== 'help') return

      try {
        const data = (await request(
          `/chat/support/conversations/${encodeURIComponent(conversationId)}/messages`,
        )) as SupportMessage[]

        setMessages(data)
        setError('')
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Unable to load messages.')
      }
    },
    [key, request],
  )

  useEffect(() => {
    if (key !== 'help') return

    setLoading(true)
    void loadConversations().finally(() => setLoading(false))

    const timer = setInterval(() => {
      void loadConversations()
    }, 5000)

    return () => clearInterval(timer)
  }, [key, loadConversations])

  useEffect(() => {
    if (key !== 'help' || !selectedId) {
      setMessages([])
      return
    }

    void loadMessages(selectedId)

    const timer = setInterval(() => {
      void loadMessages(selectedId)
    }, 3000)

    return () => clearInterval(timer)
  }, [key, selectedId, loadMessages])

  async function createConversation(event: FormEvent) {
    event.preventDefault()

    const text = newMessage.trim()
    if (!text || creating) return

    setCreating(true)
    setError('')
    setNotice('')

    try {
      const conversation = (await request('/chat/support/conversations', {
        method: 'POST',
        body: JSON.stringify({
          subject: subject.trim() || 'General support',
          body: text,
        }),
      })) as SupportConversation

      setConversations(current => [
        conversation,
        ...current.filter(item => item.id !== conversation.id),
      ])
      setSelectedId(conversation.id)
      setMessages(conversation.messages ?? [])
      setSubject('')
      setNewMessage('')
      setStartingNew(false)
      setNotice('Your support conversation has been created.')
      await loadConversations()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to create your conversation.')
    } finally {
      setCreating(false)
    }
  }

  async function sendReply(event: FormEvent) {
    event.preventDefault()

    const text = reply.trim()
    if (!text || !selectedId || sending) return

    setSending(true)
    setError('')
    setNotice('')

    try {
      const message = (await request(
        `/chat/support/conversations/${encodeURIComponent(selectedId)}/messages`,
        {
          method: 'POST',
          body: JSON.stringify({ body: text }),
        },
      )) as SupportMessage

      setMessages(current =>
        current.some(item => item.id === message.id)
          ? current
          : [...current, message],
      )

      setReply('')
      await loadConversations()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to send your message.')
    } finally {
      setSending(false)
    }
  }

  const selected = conversations.find(item => item.id === selectedId)
  const selectedOpen = selected?.status === 'OPEN'

  return (
    <div className="customer-section-page">
      <style>{`
        .support-workspace {
          display: grid;
          grid-template-columns: minmax(230px, 0.8fr) minmax(0, 1.5fr);
          gap: 18px;
          margin-top: 24px;
          color: var(--text-primary, inherit);
        }
        .support-panel {
          min-width: 0;
          border: 1px solid var(--border-color, rgba(128,128,128,.25));
          border-radius: 20px;
          background: var(--surface-color, rgba(128,128,128,.06));
          overflow: hidden;
        }
        .support-panel-heading {
          padding: 20px;
          border-bottom: 1px solid var(--border-color, rgba(128,128,128,.2));
        }
        .support-panel-heading h2 {
          margin: 0 0 6px;
          font-size: 17px;
        }
        .support-muted {
          color: var(--text-secondary, #858585);
          font-size: 13px;
          line-height: 1.6;
        }
        .support-new-button {
          width: 100%;
          margin-top: 15px;
          padding: 12px 14px;
          border: 0;
          border-radius: 12px;
          background: var(--accent-color, #6658e8);
          color: white;
          font-weight: 650;
          cursor: pointer;
        }
        .support-conversation-list {
          display: grid;
          gap: 4px;
          padding: 9px;
        }
        .support-conversation-button {
          width: 100%;
          text-align: left;
          padding: 14px;
          border: 1px solid transparent;
          border-radius: 13px;
          background: transparent;
          color: inherit;
          cursor: pointer;
        }
        .support-conversation-button:hover {
          background: var(--hover-color, rgba(128,128,128,.1));
        }
        .support-conversation-button.is-selected {
          border-color: var(--accent-color, #6658e8);
          background: var(--support-selected-bg, rgba(102,88,232,.1));
        }
        .support-conversation-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
        }
        .support-conversation-top strong {
          overflow-wrap: anywhere;
          font-size: 14px;
        }
        .support-conversation-preview {
          display: block;
          margin-top: 8px;
          color: var(--text-secondary, #858585);
          font-size: 12px;
          line-height: 1.5;
          overflow-wrap: anywhere;
        }
        .support-status-pill {
          flex: 0 0 auto;
          padding: 4px 7px;
          border-radius: 99px;
          background: var(--hover-color, rgba(128,128,128,.12));
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: .04em;
        }
        .support-chat {
          display: flex;
          flex-direction: column;
          min-height: 520px;
        }
        .support-chat-header {
          padding: 20px;
          border-bottom: 1px solid var(--border-color, rgba(128,128,128,.2));
        }
        .support-chat-header h2 {
          margin: 0 0 6px;
          font-size: 18px;
          overflow-wrap: anywhere;
        }
        .support-chat-body {
          display: flex;
          flex: 1;
          flex-direction: column;
          gap: 13px;
          padding: 20px;
          min-height: 250px;
          max-height: 480px;
          overflow-y: auto;
        }
        .support-message {
          max-width: 84%;
          align-self: flex-start;
          padding: 12px 14px;
          border: 1px solid var(--border-color, rgba(128,128,128,.18));
          border-radius: 15px 15px 15px 4px;
          background: var(--message-incoming-bg, rgba(128,128,128,.09));
          overflow-wrap: anywhere;
        }
        .support-message.is-mine {
          align-self: flex-end;
          border-color: transparent;
          border-radius: 15px 15px 4px 15px;
          background: var(--accent-color, #6658e8);
          color: white;
        }
        .support-message-meta {
          display: flex;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 7px;
          font-size: 11px;
          opacity: .78;
        }
        .support-message p {
          margin: 0;
          white-space: pre-wrap;
          line-height: 1.6;
          font-size: 14px;
        }
        .support-compose {
          display: flex;
          align-items: flex-end;
          gap: 10px;
          padding: 15px;
          border-top: 1px solid var(--border-color, rgba(128,128,128,.2));
        }
        .support-compose textarea,
        .support-new-form input,
        .support-new-form textarea {
          width: 100%;
          min-width: 0;
          box-sizing: border-box;
          padding: 12px 13px;
          border: 1px solid var(--border-color, rgba(128,128,128,.3));
          border-radius: 12px;
          background: var(--input-bg, transparent);
          color: inherit;
          font: inherit;
          resize: vertical;
        }
        .support-compose textarea {
          min-height: 46px;
          max-height: 130px;
        }
        .support-compose button,
        .support-new-form button {
          flex: 0 0 auto;
          padding: 12px 16px;
          border: 0;
          border-radius: 11px;
          background: var(--accent-color, #6658e8);
          color: white;
          font-weight: 650;
          cursor: pointer;
        }
        .support-compose button:disabled,
        .support-new-button:disabled,
        .support-new-form button:disabled {
          opacity: .5;
          cursor: not-allowed;
        }
        .support-empty {
          display: grid;
          flex: 1;
          place-content: center;
          gap: 8px;
          padding: 28px;
          text-align: center;
          color: var(--text-secondary, #858585);
        }
        .support-empty strong {
          color: var(--text-primary, inherit);
        }
        .support-new-form {
          display: grid;
          gap: 12px;
          padding: 20px;
        }
        .support-new-form label {
          display: grid;
          gap: 7px;
          font-size: 13px;
          font-weight: 600;
        }
        .support-alert {
          margin: 12px 0;
          padding: 12px 14px;
          border-radius: 12px;
          background: var(--support-alert-bg, rgba(200,70,70,.1));
          color: var(--support-alert-text, #c44949);
          font-size: 13px;
          line-height: 1.5;
        }
        .support-notice {
          margin-top: 14px;
          color: var(--text-secondary, #858585);
          font-size: 12px;
          line-height: 1.6;
        }
        @media (max-width: 720px) {
          .support-workspace {
            grid-template-columns: minmax(0, 1fr);
          }
          .support-chat {
            min-height: 430px;
          }
          .support-chat-body {
            max-height: 420px;
            padding: 14px;
          }
          .support-message {
            max-width: 94%;
          }
        }
      `}</style>

      <header className="customer-section-header">
        <span className="section-eyebrow">{section.eyebrow}</span>
        <div className="customer-section-title-row">
          <span className="customer-section-icon" aria-hidden="true">
            {section.icon}
          </span>
          <h1>{section.title}</h1>
        </div>
        <p>{section.description}</p>
      </header>

      {key === 'help' ? (
        <section aria-label="Customer support" className="support-workspace">
          <aside className="support-panel">
            <div className="support-panel-heading">
              <h2>Your conversations</h2>
              <p className="support-muted">
                Contact the UrbanRide team about bookings, payments, or your account.
              </p>
              <button
                type="button"
                className="support-new-button"
                onClick={() => {
                  setStartingNew(true)
                  setError('')
                  setNotice('')
                }}
              >
                + Start a conversation
              </button>
            </div>

            {loading && conversations.length === 0 ? (
              <div className="support-empty">
                <strong>Loading your inbox…</strong>
                <span className="support-muted">Fetching saved conversations.</span>
              </div>
            ) : conversations.length === 0 ? (
              <div className="support-empty">
                <strong>No conversations yet</strong>
                <span className="support-muted">
                  Start a conversation and our support team can reply here.
                </span>
              </div>
            ) : (
              <div className="support-conversation-list">
                {conversations.map(conversation => (
                  <button
                    type="button"
                    key={conversation.id}
                    className={`support-conversation-button ${
                      selectedId === conversation.id ? 'is-selected' : ''
                    }`}
                    onClick={() => {
                      setSelectedId(conversation.id)
                      setStartingNew(false)
                      setError('')
                      setNotice('')
                    }}
                  >
                    <span className="support-conversation-top">
                      <strong>{conversation.subject}</strong>
                      <span className="support-status-pill">{conversation.status}</span>
                    </span>
                    <span className="support-conversation-preview">
                      {conversation.messages?.[0]?.body ?? 'No messages yet'}
                    </span>
                    <span className="support-conversation-preview">
                      Updated {conversationDate(conversation.updatedAt)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </aside>

          <section className="support-panel support-chat" aria-label="Support conversation">
            {startingNew ? (
              <>
                <header className="support-chat-header">
                  <h2>Contact UrbanRide support</h2>
                  <p className="support-muted">
                    Describe your issue. Your message will be saved as a separate support conversation.
                  </p>
                </header>
                <form className="support-new-form" onSubmit={createConversation}>
                  <label>
                    Subject
                    <input
                      value={subject}
                      onChange={event => setSubject(event.target.value)}
                      maxLength={120}
                      placeholder="e.g. Help with a payment"
                    />
                  </label>
                  <label>
                    Your message
                    <textarea
                      value={newMessage}
                      onChange={event => setNewMessage(event.target.value)}
                      maxLength={2000}
                      rows={6}
                      required
                      placeholder="Tell us how we can help…"
                    />
                  </label>
                  <button type="submit" disabled={!newMessage.trim() || creating}>
                    {creating ? 'Creating…' : 'Send to support'}
                  </button>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => setStartingNew(false)}
                  >
                    Cancel
                  </button>
                </form>
              </>
            ) : selected ? (
              <>
                <header className="support-chat-header">
                  <h2>{selected.subject}</h2>
                  <p className="support-muted">
                    Support conversation · {selected.status.toLowerCase()}
                  </p>
                </header>

                <div className="support-chat-body" aria-live="polite">
                  {messages.length === 0 ? (
                    <div className="support-empty">
                      <strong>No messages loaded</strong>
                      <span className="support-muted">
                        Messages will appear here when available.
                      </span>
                    </div>
                  ) : (
                    messages.map(message => {
                      const mine = message.senderId === selected.customerId
                      const senderName = mine
                        ? 'You'
                        : message.sender?.fullName || message.sender?.username || 'UrbanRide Support'

                      return (
                        <article
                          className={`support-message ${mine ? 'is-mine' : ''}`}
                          key={message.id}
                        >
                          <div className="support-message-meta">
                            <strong>{senderName}</strong>
                            <time>{messageTime(message.createdAt)}</time>
                          </div>
                          <p>{message.body}</p>
                        </article>
                      )
                    })
                  )}
                </div>

                {selectedOpen ? (
                  <form className="support-compose" onSubmit={sendReply}>
                    <textarea
                      value={reply}
                      onChange={event => setReply(event.target.value)}
                      maxLength={2000}
                      rows={2}
                      placeholder="Write a message…"
                      aria-label="Support message"
                    />
                    <button type="submit" disabled={!reply.trim() || sending}>
                      {sending ? 'Sending…' : 'Send'}
                    </button>
                  </form>
                ) : (
                  <div className="support-empty">
                    <strong>This conversation is closed</strong>
                    <span className="support-muted">
                      Start a new conversation if you need further assistance.
                    </span>
                  </div>
                )}
              </>
            ) : (
              <div className="support-empty">
                <strong>Your support inbox</strong>
                <span className="support-muted">
                  Choose a conversation or start a new one to contact UrbanRide support.
                </span>
              </div>
            )}
          </section>

          {error && (
            <p className="support-alert" role="alert" style={{ gridColumn: '1 / -1' }}>
              {error}
            </p>
          )}
          {notice && (
            <p
              className="support-muted"
              role="status"
              style={{ gridColumn: '1 / -1' }}
            >
              {notice}
            </p>
          )}
        </section>
      ) : (
        <section
          className="customer-section-status glass-card"
          aria-labelledby="customer-section-status-title"
        >
          <span className="customer-section-status-mark" aria-hidden="true">
            i
          </span>
          <div>
            <h2 id="customer-section-status-title">{section.status}</h2>
            <p>{section.detail}</p>
          </div>
        </section>
      )}

      <div className="customer-section-actions">
        <Link className="primary-button" to={ROUTE_PATHS.home}>
          Back to home
        </Link>
        <Link className="secondary-button" to={ROUTE_PATHS.settings}>
          Open settings
        </Link>
      </div>
    </div>
  )
}
