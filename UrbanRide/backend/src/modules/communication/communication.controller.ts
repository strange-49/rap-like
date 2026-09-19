import type { ServerResponse } from 'node:http';

import { AppError } from '../../common/errors/app-error';
import { sendSms } from './communication.service';

export async function handleSendSms(
  input: {
    to?: string;
    body?: string;
  },
  response: ServerResponse,
): Promise<void> {
  if (!input.to?.trim()) {
    throw new AppError(
      'Recipient phone number is required.',
      400,
      'SMS_RECIPIENT_REQUIRED',
    );
  }

  if (!input.body?.trim()) {
    throw new AppError(
      'SMS message is required.',
      400,
      'SMS_MESSAGE_REQUIRED',
    );
  }

  const message = await sendSms(
    input.to,
    input.body,
  );

  response.writeHead(200, {
    'content-type': 'application/json; charset=utf-8',
  });

  response.end(
    JSON.stringify(message),
  );
}