// Every 4xx/5xx leaves the service as {"error": {"code", "message"}}. Handlers throw
// ApiError; the server turns it into that envelope. Anything else is a programmer
// error and becomes a logged 500 (spec: requests must never produce 5xx).
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export const malformed = (message: string) => new ApiError(400, 'malformed_request', message);
export const invalid = (message: string) => new ApiError(422, 'validation_failed', message);
export const notFound = (message = 'no such resource') => new ApiError(404, 'not_found', message);
export const forbidden = (message = 'not permitted') => new ApiError(403, 'forbidden', message);
export const unauthenticated = (message = 'missing or unknown bearer token') =>
  new ApiError(401, 'unauthenticated', message);
export const insufficientFunds = () =>
  new ApiError(409, 'insufficient_funds', 'balance is below the amount');
