export interface SmsMessage {
  to: string
  body: string
}

export interface SmsResult {
  sid: string
  status: string
  to: string
}

export interface SmsProvider {
  send(message: SmsMessage): Promise<SmsResult>
}
