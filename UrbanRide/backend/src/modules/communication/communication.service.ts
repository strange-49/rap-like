import { AppError } from '../../common/errors/app-error'
import { MockSmsProvider } from './mock-sms.provider'
import { TwilioSmsProvider } from './twilio-sms.provider'
import type { SmsProvider } from './sms.provider'

function createSmsProvider(): SmsProvider {
  const provider = process.env.SMS_PROVIDER ?? 'mock'

  switch (provider) {
    case 'mock':
      return new MockSmsProvider()

    case 'twilio':
      return new TwilioSmsProvider()

    default:
      throw new AppError(
        `Unsupported SMS provider: ${provider}`,
        500,
        'UNSUPPORTED_SMS_PROVIDER',
      )
  }
}

const smsProvider = createSmsProvider()

export async function sendSms(to: string, body: string) {
  if (!to.trim()) {
    throw new AppError(
      'Recipient phone number is required.',
      400,
      'SMS_RECIPIENT_REQUIRED',
    )
  }

  if (!body.trim()) {
    throw new AppError(
      'SMS message is required.',
      400,
      'SMS_MESSAGE_REQUIRED',
    )
  }

  return smsProvider.send({
    to,
    body,
  })
}
