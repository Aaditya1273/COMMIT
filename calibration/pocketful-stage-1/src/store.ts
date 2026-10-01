// The whole service state, as one JSON-serialisable value plus lookup indexes.
//
// Concurrency model: Node runs JavaScript on one thread. Every handler that moves
// money reads, checks and writes this state synchronously -- no `await` between the
// check and the write -- so each operation is atomic and the history is a serial
// order of operations. That is the whole locking strategy.
// ponytail: single-process, single-core; a multi-process deployment would need the
// state in a database with row locks or SERIALIZABLE transactions.
import { invalid } from './errors.ts';
import { HANDLE, MAX_AMOUNT, type Visibility } from './validate.ts';

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  displayName: string;
  handle: string;
  balance: number;
}

export interface Payment {
  id: string;
  fromUserId: string;
  toUserId: string;
  amount: number;
  note: string;
  visibility: Visibility;
  requestId: string | null;
  settlementId: string | null;
  createdAt: string;
}

export type RequestStatus = 'pending' | 'paid' | 'declined' | 'cancelled';
export const REQUEST_STATUSES: readonly RequestStatus[] = ['pending', 'paid', 'declined', 'cancelled'];

export interface PaymentRequest {
  id: string;
  requesterId: string;
  payerId: string;
  amount: number;
  note: string;
  status: RequestStatus;
  paymentId: string | null;
  createdAt: string;
}

export interface IdempotencyRecord {
  fingerprint: string;
  body: unknown;
}

export interface Data {
  currency: string;
  minorUnits: number;
  users: User[];
  tokens: Record<string, string>;
  /** Insertion order is creation order; feeds read it backwards for newest first. */
  payments: Payment[];
  requests: PaymentRequest[];
  operatorIds: string[];
  idempotency: Record<string, IdempotencyRecord>;
}

export class Store {
  readonly data: Data;
  readonly usersById = new Map<string, User>();
  readonly usersByEmail = new Map<string, User>();
  readonly usersByHandle = new Map<string, User>();
  readonly requestsById = new Map<string, PaymentRequest>();

  constructor(data: Data) {
    this.data = data;
    for (const user of data.users) this.indexUser(user);
    for (const request of data.requests) this.requestsById.set(request.id, request);
  }

  indexUser(user: User): void {
    this.usersById.set(user.id, user);
    this.usersByEmail.set(user.email.toLowerCase(), user);
    this.usersByHandle.set(user.handle, user);
  }

  addUser(user: User): void {
    this.data.users.push(user);
    this.indexUser(user);
  }

  addPayment(payment: Payment): void {
    this.data.payments.push(payment);
  }

  addRequest(request: PaymentRequest): void {
    this.data.requests.push(request);
    this.requestsById.set(request.id, request);
  }

  user(id: string): User {
    const user = this.usersById.get(id);
    if (!user) throw new Error(`dangling user reference ${id}`);
    return user;
  }
}

export const now = (): string => new Date().toISOString().replace('Z', '+00:00');

let current = new Store(emptyData('EUR', 2));

export const store = (): Store => current;

export function replace(next: Store): void {
  current = next;
}

export function emptyData(currency: string, minorUnits: number): Data {
  return { currency, minorUnits, users: [], tokens: {}, payments: [], requests: [], operatorIds: [], idempotency: {} };
}

// ---- validation of state arriving from outside: reset fixtures and imports ----

type Obj = Record<string, unknown>;

const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const isStr = (v: unknown): v is string => typeof v === 'string';
const isId = (v: unknown): v is string => isStr(v) && v.length > 0 && v.length <= 64;
const isBalance = (v: unknown): v is number => Number.isSafeInteger(v) && (v as number) >= 0;
const isAmount = (v: unknown): v is number => Number.isInteger(v) && (v as number) >= 1 && (v as number) <= MAX_AMOUNT;
const isVisibility = (v: unknown): v is Visibility => v === 'public' || v === 'private';
const MINOR_UNITS = [0, 2, 3];

function check(condition: boolean, message: string): asserts condition {
  if (!condition) throw invalid(message);
}

function list(value: unknown, field: string): unknown[] {
  if (value === undefined) return [];
  check(Array.isArray(value), `${field} must be an array`);
  return value;
}

/** A fixture user, before its password is hashed. */
export interface SeedUser extends Omit<User, 'passwordHash'> {
  password: string;
}

/**
 * Validates a reset fixture into seed users plus everything else. Throws 422 on any
 * inconsistency, before the caller has touched the live state.
 */
export function parseFixture(fixture: unknown, createdAt: string): { seeds: SeedUser[]; data: Data } {
  check(isObj(fixture), 'fixture must be an object');
  check(isStr(fixture.currency) && fixture.currency.length > 0, 'currency is required');
  check(MINOR_UNITS.includes(fixture.minor_units as number), 'minor_units must be 0, 2 or 3');
  const data = emptyData(fixture.currency, fixture.minor_units as number);
  const seeds: SeedUser[] = [];
  const ids = new Set<string>();
  const emails = new Set<string>();
  const handles = new Set<string>();

  for (const raw of list(fixture.users, 'users')) {
    check(isObj(raw), 'each user must be an object');
    const { id, email, password, display_name: displayName, handle, balance } = raw;
    check(isId(id) && !ids.has(id), 'user ids must be unique strings');
    check(isStr(email) && /^[^@\s]+@[^@\s]+$/.test(email) && !emails.has(email.toLowerCase()), 'user emails must be valid and unique');
    check(isStr(password) && password.length > 0, 'user password is required');
    check(isStr(displayName), 'user display_name must be a string');
    check(isStr(handle) && HANDLE.test(handle) && !handles.has(handle), 'user handles must be valid and unique');
    check(isBalance(balance), 'user balance must be a non-negative integer');
    ids.add(id);
    emails.add(email.toLowerCase());
    handles.add(handle);
    seeds.push({ id, email, password, displayName, handle, balance });
  }

  for (const raw of list(fixture.payments, 'payments')) {
    check(isObj(raw), 'each payment must be an object');
    const { id, from_user_id: from, to_user_id: to, amount, note = '', visibility = 'public' } = raw;
    check(isId(id) && !data.payments.some((p) => p.id === id), 'payment ids must be unique strings');
    check(isStr(from) && ids.has(from) && isStr(to) && ids.has(to) && from !== to, 'payment parties must be two seeded users');
    check(isAmount(amount), 'payment amount is out of range');
    check(isStr(note) && isVisibility(visibility), 'payment note or visibility is invalid');
    data.payments.push({ id, fromUserId: from, toUserId: to, amount, note, visibility, requestId: null, settlementId: null, createdAt });
  }

  for (const raw of list(fixture.requests, 'requests')) {
    check(isObj(raw), 'each request must be an object');
    const { id, requester_id: requester, payer_id: payer, amount, note = '', status = 'pending', payment_id: paymentId = null } = raw;
    check(isId(id) && !data.requests.some((r) => r.id === id), 'request ids must be unique strings');
    check(isStr(requester) && ids.has(requester) && isStr(payer) && ids.has(payer) && requester !== payer, 'request parties must be two seeded users');
    check(isAmount(amount), 'request amount is out of range');
    check(isStr(note) && REQUEST_STATUSES.includes(status as RequestStatus), 'request note or status is invalid');
    check(paymentId === null || isStr(paymentId), 'request payment_id must be a string or null');
    data.requests.push({ id, requesterId: requester, payerId: payer, amount, note, status: status as RequestStatus, paymentId, createdAt });
  }

  const operators = list(fixture.settlement_operator_ids, 'settlement_operator_ids');
  check(operators.every(isStr), 'settlement_operator_ids must be strings');
  data.operatorIds = operators as string[];
  return { seeds, data };
}

/**
 * Validates a state object produced by `export`. Structural only: the export came from
 * this service, so the check is that nothing is missing or mistyped, not that history
 * is re-derived -- balances are imported as they stand, never replayed.
 */
export function parseState(state: unknown): Data {
  check(isObj(state), 'state must be an object');
  const { currency, minorUnits, users, tokens, payments, requests, operatorIds, idempotency } = state;
  check(isStr(currency) && MINOR_UNITS.includes(minorUnits as number), 'state currency is invalid');
  check(Array.isArray(users) && Array.isArray(payments) && Array.isArray(requests), 'state lists are missing');
  check(isObj(tokens) && isObj(idempotency) && Array.isArray(operatorIds), 'state maps are missing');
  const userIds = new Set<string>();
  const handles = new Set<string>();
  for (const u of users) {
    check(isObj(u) && isId(u.id) && isStr(u.email) && isStr(u.passwordHash) && isStr(u.displayName)
      && isStr(u.handle) && HANDLE.test(u.handle) && isBalance(u.balance), 'state user is invalid');
    check(!userIds.has(u.id) && !handles.has(u.handle), 'state users are duplicated');
    userIds.add(u.id);
    handles.add(u.handle);
  }
  const paymentIds = new Set<string>();
  for (const p of payments) {
    check(isObj(p) && !paymentIds.has(p.id as string), 'state payments are duplicated');
    paymentIds.add(p.id as string);
    check(isObj(p) && isId(p.id) && userIds.has(p.fromUserId as string) && userIds.has(p.toUserId as string)
      && isAmount(p.amount) && isStr(p.note) && isVisibility(p.visibility) && isStr(p.createdAt), 'state payment is invalid');
  }
  const requestIds = new Set<string>();
  for (const r of requests) {
    check(isObj(r) && !requestIds.has(r.id as string), 'state requests are duplicated');
    requestIds.add(r.id as string);
    check(isObj(r) && isId(r.id) && userIds.has(r.requesterId as string) && userIds.has(r.payerId as string)
      && isAmount(r.amount) && isStr(r.note) && REQUEST_STATUSES.includes(r.status as RequestStatus)
      && isStr(r.createdAt), 'state request is invalid');
  }
  check(Object.values(tokens).every((id) => userIds.has(id as string)), 'state token names an unknown user');
  check(Object.values(idempotency).every((rec) => isObj(rec) && isStr(rec.fingerprint) && 'body' in rec), 'state idempotency record is invalid');
  return structuredClone(state) as unknown as Data;
}
