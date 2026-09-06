import { AppError } from '../errors/app-error';

// Domain request schemas will be introduced with their owning modules.
export class ValidationError extends AppError {
  public constructor(message = 'Request validation failed.') {
    super(message, 400, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}
