import type { SmsMessage, SmsProvider, SmsResult } from './sms.provider'

export class MockSmsProvider implements SmsProvider {
  async send(message: SmsMessage): Promise<SmsResult> {
    return {
      sid: `mock-${Date.now()}`,
      status: 'sent',
      to: message.to,
    }
  }
}
