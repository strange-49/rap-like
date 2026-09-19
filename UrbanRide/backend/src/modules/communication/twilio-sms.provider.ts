import twilio from 'twilio'

import { AppError } from '../../common/errors/app-error'
import type { SmsMessage, SmsProvider, SmsResult } from './sms.provider'

export class TwilioSmsProvider implements SmsProvider {
  async send(message: SmsMessage): Promise<SmsResult> {
    const accountSid = process.env.TWILIO_ACCOUNT_SID
    const authToken = process.env.TWILIO_AUTH_TOKEN
    const from = process.env.TWILIO_PHONE_NUMBER

    if (!accountSid) {
      throw new AppError(
        'Twilio account SID is not configured.',
        500,
        'TWILIO_ACCOUNT_SID_NOT_CONFIGURED',
      )
    }

    if (!authToken) {
      throw new AppError(
        'Twilio auth token is not configured.',
        500,
        'TWILIO_AUTH_TOKEN_NOT_CONFIGURED',
      )
    }

    if (!from) {
      throw new AppError(
        'Twilio phone number is not configured.',
        500,
        'TWILIO_PHONE_NUMBER_NOT_CONFIGURED',
      )
    }

    const client = twilio(accountSid, authToken)

    const result = await client.messages.create({
      body: message.body,
      from,
      to: message.to,
    })

    return {
      sid: result.sid,
      status: result.status,
      to: result.to,
    }
  }
}
