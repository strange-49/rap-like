import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { getToken } from '../services/auth'

type ChatMessage = { id: string; senderId: string; senderName: string; body: string; createdAt: string }
const API = 'http://localhost:3000'

export function RideChatPanel({ rideId, rideStatus }: { rideId: string; rideStatus: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [body, setBody] = useState('')
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const load = useCallback(async () => {
    const token = getToken()
    if (!token) { setError('Sign in to use ride chat.'); return }
    try {
      const response = await fetch(`${API}/chat/rides/${encodeURIComponent(rideId)}/messages`, { headers: { authorization: `Bearer ${token}` } })
      const data = await response.json()
      if (!response.ok) throw new Error(data?.error?.message ?? 'Unable to load messages.')
      setMessages(data as ChatMessage[]); setError('')
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to load messages.') }
  }, [rideId])
  useEffect(() => { void load(); const timer = setInterval(() => void load(), 3000); return () => clearInterval(timer) }, [load])
  async function send(event: FormEvent) {
    event.preventDefault(); const text = body.trim(); if (!text || sending) return
    const token = getToken(); if (!token) { setError('Sign in to send messages.'); return }
    setSending(true)
    try {
      const response = await fetch(`${API}/chat/rides/${encodeURIComponent(rideId)}/messages`, { method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify({ body: text }) })
      const data = await response.json(); if (!response.ok) throw new Error(data?.error?.message ?? 'Message could not be sent.')
      setMessages(current => [...current, data as ChatMessage]); setBody(''); setError('')
    } catch (e) { setError(e instanceof Error ? e.message : 'Message could not be sent.') } finally { setSending(false) }
  }
  return <section className="ride-chat-panel" aria-label="Ride chat"><header><div><h3>Chat with your rider</h3><p>Messages are saved to this ride.</p></div><span className="ride-chat-live">● Chat</span></header><div className="ride-chat-messages" aria-live="polite">{messages.length === 0 ? <p className="ride-chat-empty">No messages yet. Say hello when your rider is assigned.</p> : messages.map(message => <article className="ride-chat-message" key={message.id}><div><strong>{message.senderName}</strong><time>{new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time></div><p>{message.body}</p></article>)}</div>{error && <p className="ride-chat-error" role="alert">{error}</p>}<form onSubmit={send}><input value={body} onChange={event => setBody(event.target.value)} maxLength={2000} placeholder={rideStatus === 'CANCELLED' ? 'Chat unavailable for cancelled rides' : 'Write a message…'} disabled={rideStatus === 'CANCELLED' || sending} aria-label="Chat message"/><button type="submit" disabled={!body.trim() || sending || rideStatus === 'CANCELLED'}>{sending ? 'Sending…' : 'Send'}</button></form></section>
}
