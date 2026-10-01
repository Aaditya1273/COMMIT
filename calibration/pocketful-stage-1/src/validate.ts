// Field rules shared by every endpoint (spec §5). Wrong JSON type is 400; right type
// with a bad value is 422 -- except amount, note and visibility, whose every failure
// is 422.
import { invalid, malformed } from './errors.ts';

export type Body = Record<string, unknown>;

export const MAX_AMOUNT = 1_000_000_000;
export const HANDLE = /^[a-z0-9_]{1,20}$/;

export function amount(value: unknown, min = 1): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < min || value > MAX_AMOUNT) {
    throw invalid(`amount must be an integer from ${min} to ${MAX_AMOUNT}`);
  }
  return value;
}

export function note(value: unknown): string {
  if (value === undefined) return '';
  if (typeof value !== 'string') throw invalid('note must be a string');
  if ([...value].length > 200) throw invalid('note is longer than 200 characters');
  return value;
}

export type Visibility = 'public' | 'private';

export function visibility(value: unknown): Visibility {
  if (value === undefined) return 'public';
  if (value !== 'public' && value !== 'private') throw invalid('visibility must be public or private');
  return value;
}

export function requiredString(body: Body, field: string): string {
  const value = body[field];
  if (value === undefined) throw invalid(`${field} is required`);
  if (typeof value !== 'string') throw malformed(`${field} must be a string`);
  return value;
}

/** Integer query parameter: plain decimal digits only (spec §5), then a range check. */
export function intParam(raw: string | null, fallback: number, min: number, max = Infinity): number {
  if (raw === null) return fallback;
  if (!/^\d+$/.test(raw)) throw invalid('integer query parameters are plain decimal digits');
  const value = Number(raw);
  if (value < min || value > max) throw invalid(`value must be between ${min} and ${max}`);
  return value;
}

export function enumParam<T extends string>(raw: string | null, allowed: readonly T[]): T | null {
  if (raw === null) return null;
  if (!(allowed as readonly string[]).includes(raw)) throw invalid(`expected one of ${allowed.join(', ')}`);
  return raw as T;
}

/** JSON value equality for idempotency: key order and whitespace never matter. */
export function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    const entries = Object.keys(value as Body).sort()
      .map((k) => `${JSON.stringify(k)}:${canonical((value as Body)[k])}`);
    return `{${entries.join(',')}}`;
  }
  return JSON.stringify(value);
}
