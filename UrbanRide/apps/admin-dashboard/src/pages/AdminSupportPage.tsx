
import { useCallback, useEffect, useState, type FormEvent } from 'react'

type SupportMessage = {
  id: string
  conversationId: string
  senderId: string
  body: string
  createdAt: string
  sender?: {
    id: string
    username: string
    fullName?: string | null
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
    fullName?: string | null
    email?: string | null
  }
  messages?: SupportMessage[]
}

const API = 'http://localhost:3000'

function getToken() {
  return sessionStorage.getItem('urbanride-admin-token')
}

async function supportRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const authToken = getToken()

  if (!authToken) {
    throw new Error('Your admin session is missing. Please sign in again.')
  }

  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      authorization: `Bearer ${authToken}`,
      ...(options.body ? { 'content-type': 'application/json' } : {}),
      ...options.headers,
    },
  })

  const data = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(
      data?.error?.message ?? `Support request failed (${response.status}).`,
    )
  }

  return data as T
}

function customerName(conversation: SupportConversation) {
  return conversation.customer?.fullName?.trim()
    || conversation.customer?.username
    || conversation.customerId
}

function messageSender(message: SupportMessage) {
  if (message.sender?.fullName?.trim()) return message.sender.fullName
  if (message.sender?.username) return message.sender.username
  return message.sender?.role === 'ADMIN' ? 'Support team' : 'Customer'
}

export function AdminSupportPage() {
  const [conversations, setConversations] = useState<SupportConversation[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [messages, setMessages] = useState<SupportMessage[]>([])
  const [body, setBody] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)

  const selected = conversations.find(item => item.id === selectedId)
  const isClosed = selected?.status !== 'OPEN'

  const loadConversations = useCallback(async () => {
    try {
      const data = await supportRequest<SupportConversation[]>(
        '/chat/support/conversations',
      )

      setConversations(data)

      setSelectedId(current => {
        if (current && data.some(item => item.id === current)) return current
        return data[0]?.id ?? ''
      })

      setError('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to load support inbox.')
    } finally {
      setLoading(false)
    }
  }, [])

  const loadMessages = useCallback(async (conversationId: string) => {
    try {
      const data = await supportRequest<SupportMessage[]>(
        `/chat/support/conversations/${encodeURIComponent(conversationId)}/messages`,
      )
      setMessages(data)
      setError('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to load messages.')
    }
  }, [])

  useEffect(() => {
    void loadConversations()
    const timer = window.setInterval(() => void loadConversations(), 5000)
    return () => window.clearInterval(timer)
  }, [loadConversations])

  useEffect(() => {
    if (!selectedId) {
      setMessages([])
      return
    }

    let active = true

    const refresh = async () => {
      try {
        const data = await supportRequest<SupportMessage[]>(
          `/chat/support/conversations/${encodeURIComponent(selectedId)}/messages`,
        )
        if (active) {
          setMessages(data)
          setError('')
        }
      } catch (e) {
        if (active) {
          setError(e instanceof Error ? e.message : 'Unable to load messages.')
        }
      }
    }

    void refresh()
    const timer = window.setInterval(() => void refresh(), 3000)

    return () => {
      active = false
      window.clearInterval(timer)
    }
  }, [selectedId])

  async function sendReply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const text = body.trim()
    if (!text || !selectedId || sending || isClosed) return

    setSending(true)
    setError('')

    try {
      const message = await supportRequest<SupportMessage>(
        `/chat/support/conversations/${encodeURIComponent(selectedId)}/messages`,
        {
          method: 'POST',
          body: JSON.stringify({ body: text }),
        },
      )

      setMessages(current =>
        current.some(item => item.id === message.id)
          ? current
          : [...current, message],
      )
      setBody('')
      await loadConversations()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to send reply.')
    } finally {
      setSending(false)
    }
  }

  return (
    <section className="admin-support-page" style={{ paddingBottom: 28 }}>
      <style>{`
        .support-inbox {
          display: grid;
          grid-template-columns: minmax(250px, 340px) minmax(0, 1fr);
          min-height: 560px;
          overflow: hidden;
          border: 1px solid var(--border, #e3e8ef);
          border-radius: 18px;
          background: var(--surface, #fff);
        }
        .support-list {
          min-width: 0;
          border-right: 1px solid var(--border, #e3e8ef);
        }
        .support-list-header, .support-chat-header {
          padding: 20px;
          border-bottom: 1px solid var(--border, #e3e8ef);
        }
        .support-list-header h2, .support-chat-header h2 {
          margin: 0 0 6px;
          font-size: 17px;
        }
        .support-list-header p, .support-chat-header p {
          margin: 0;
          opacity: .68;
          font-size: 13px;
        }
        .support-thread {
          display: block;
          width: 100%;
          padding: 16px;
          text-align: left;
          border: 0;
          border-bottom: 1px solid var(--border, #e3e8ef);
          background: transparent;
          color: inherit;
          cursor: pointer;
        }
        .support-thread.active {
          background: var(--surface-muted, #f0f5ff);
          box-shadow: inset 3px 0 #4778e8;
        }
        .support-thread-top {
          display: flex;
          justify-content: space-between;
          gap: 8px;
          align-items: center;
        }
        .support-thread-top strong {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .support-thread small, .support-thread-preview {
          display: block;
          margin-top: 7px;
          opacity: .68;
          font-size: 12px;
        }
        .support-thread-preview {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .support-status {
          flex-shrink: 0;
          border-radius: 20px;
          padding: 4px 8px;
          font-size: 10px;
          font-weight: 700;
          background: #e5f6eb;
          color: #187744;
        }
        .support-status.closed {
          background: #eceef2;
          color: #646b78;
        }
        .support-chat {
          display: flex;
          flex-direction: column;
          min-width: 0;
        }
        .support-chat-header {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: center;
        }
        .support-chat-messages {
          display: flex;
          flex: 1;
          flex-direction: column;
          gap: 14px;
          min-height: 320px;
          max-height: 560px;
          overflow-y: auto;
          padding: 22px;
        }
        .support-bubble {
          max-width: 82%;
          align-self: flex-start;
          padding: 12px 15px;
          border-radius: 14px 14px 14px 4px;
          background: var(--surface-muted, #f1f4f8);
          overflow-wrap: anywhere;
        }
        .support-bubble.admin {
          align-self: flex-end;
          border-radius: 14px 14px 4px 14px;
          background: #e7efff;
          color: #203f78;
        }
        .support-bubble-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-bottom: 7px;
          font-size: 11px;
          opacity: .75;
        }
        .support-bubble p {
          margin: 0;
          white-space: pre-wrap;
          line-height: 1.55;
        }
        .support-reply {
          display: flex;
          gap: 10px;
          padding: 16px;
          border-top: 1px solid var(--border, #e3e8ef);
        }
        .support-reply textarea {
          flex: 1;
          min-width: 0;
          min-height: 48px;
          max-height: 140px;
          resize: vertical;
          padding: 12px;
          border: 1px solid var(--border, #d9dfe8);
          border-radius: 10px;
          background: var(--surface, #fff);
          color: inherit;
          font: inherit;
        }
        .support-reply button, .support-refresh {
          align-self: flex-end;
          padding: 12px 16px;
          border: 0;
          border-radius: 10px;
          background: #315fe8;
          color: white;
          font-weight: 650;
          cursor: pointer;
        }
        .support-reply button:disabled {
          opacity: .5;
          cursor: not-allowed;
        }
        .support-empty {
          margin: auto;
          padding: 24px;
          text-align: center;
          opacity: .65;
        }
        .support-error {
          margin: 14px 0;
          color: #b42318;
        }
        @media (max-width: 760px) {
          .support-inbox { grid-template-columns: 1fr; }
          .support-list { border-right: 0; border-bottom: 1px solid var(--border, #e3e8ef); }
          .support-thread { padding: 12px 16px; }
          .support-chat-messages { min-height: 250px; }
          .support-bubble { max-width: 94%; }
        }
      `}</style>

      <div className="page-heading">
        <p className="eyebrow">CUSTOMER CARE</p>
        <h1>Customer support inbox</h1>
        <p>Read customer support conversations and reply from one place. Ride-linked chat remains separate.</p>
      </div>

      {error && <p className="support-error" role="alert">{error}</p>}

      <div className="support-inbox">
        <aside className="support-list" aria-label="Customer support conversations">
          <div className="support-list-header">
            <h2>Conversations</h2>
            <p>{conversations.length} total · refreshes automatically</p>
          </div>

          {loading ? (
            <p className="support-empty">Loading conversations…</p>
          ) : conversations.length === 0 ? (
            <p className="support-empty">No customer conversations yet.</p>
          ) : (
            conversations.map(conversation => (
              <button
                type="button"
                key={conversation.id}
                className={`support-thread${selectedId === conversation.id ? ' active' : ''}`}
                onClick={() => setSelectedId(conversation.id)}
              >
                <span className="support-thread-top">
                  <strong>{customerName(conversation)}</strong>
                  <span className={`support-status${conversation.status !== 'OPEN' ? ' closed' : ''}`}>
                    {conversation.status}
                  </span>
                </span>
                <small>{conversation.subject || 'General support'}</small>
                <span className="support-thread-preview">
                  {conversation.messages?.[0]?.body ?? 'No messages'}
                </span>
                <small>{new Date(conversation.updatedAt).toLocaleString()}</small>
              </button>
            ))
          )}
        </aside>

        <section className="support-chat" aria-label="Selected support conversation">
          {!selected ? (
            <p className="support-empty">Select a conversation to read and reply.</p>
          ) : (
            <>
              <header className="support-chat-header">
                <div>
                  <h2>{customerName(selected)}</h2>
                  <p>{selected.customer?.email || selected.customer?.username || selected.customerId}</p>
                  <p>{selected.subject || 'General support'} · {selected.id}</p>
                </div>
                <span className={`support-status${isClosed ? ' closed' : ''}`}>
                  {selected.status}
                </span>
              </header>

              <div className="support-chat-messages" aria-live="polite">
                {messages.length === 0 ? (
                  <p className="support-empty">No messages in this conversation.</p>
                ) : (
                  messages.map(message => (
                    <article
                      key={message.id}
                      className={`support-bubble${message.sender?.role === 'ADMIN' ? ' admin' : ''}`}
                    >
                      <div className="support-bubble-meta">
                        <strong>{messageSender(message)}</strong>
                        <time>{new Date(message.createdAt).toLocaleString()}</time>
                      </div>
                      <p>{message.body}</p>
                    </article>
                  ))
                )}
              </div>

              {isClosed ? (
                <p className="support-empty">This conversation is closed and cannot receive replies.</p>
              ) : (
                <form className="support-reply" onSubmit={sendReply}>
                  <textarea
                    value={body}
                    onChange={event => setBody(event.target.value)}
                    maxLength={2000}
                    placeholder="Write a reply to the customer…"
                    aria-label="Reply to customer"
                    required
                  />
                  <button type="submit" disabled={!body.trim() || sending}>
                    {sending ? 'Sending…' : 'Send reply'}
                  </button>
                </form>
              )}
            </>
          )}
        </section>
      </div>
    </section>
  )
}
