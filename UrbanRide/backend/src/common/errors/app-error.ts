export class AppError extends Error {
  constructor(
    message: string,
    public readonly statusCode = 500,
    public readonly code = 'INTERNAL_SERVER_ERROR',
  ) {
    super(message);
    this.name = 'AppError';
  }
}