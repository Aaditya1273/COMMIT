// Money-moving and money-describing operations. Every function here is synchronous:
// see the concurrency note at the top of store.ts.
import { randomUUID } from 'node:crypto';
import { ApiError, forbidden, insufficientFunds, invalid, malformed, notFound } from './errors.ts';
import { now, store, REQUEST_STATUSES, type Payment, type PaymentRequest, type User } from './store.ts';
import * as v from './validate.ts';

type Body = v.Body;
const newId = (prefix: string) => `${prefix}_${randomUUID()}`;

// ---- response shapes ----

export function paymentJson(p: Payment) {
  const s = store();
  const from = s.user(p.fromUserId);
  const to = s.user(p.toUserId);
  return {
    payment_id: p.id, from_user_id: from.id, from_handle: from.handle, to_user_id: to.id, to_handle: to.handle,
    amount: p.amount, currency: s.data.currency, note: p.note, visibility: p.visibility,
    request_id: p.requestId, settlement_id: p.settlementId, created_at: p.createdAt,
  };
}

export function requestJson(r: PaymentRequest) {
  const s = store();
  const requester = s.user(r.requesterId);
  const payer = s.user(r.payerId);
  return {
    request_id: r.id, requester_id: requester.id, requester_handle: requester.handle, payer_id: payer.id,
    payer_handle: payer.handle, amount: r.amount, currency: s.data.currency, note: r.note, status: r.status,
    payment_id: r.paymentId, created_at: r.createdAt,
  };
}

export function me(user: User) {
  const { currency, minorUnits } = store().data;
  return { user_id: user.id, display_name: user.displayName, handle: user.handle, balance: user.balance, currency, minor_units: minorUnits };
}

// ---- the one place money moves ----

/** Debit and credit in one synchronous step. The caller has already checked funds. */
function transfer(from: User, to: User, fields: Omit<Payment, 'id' | 'fromUserId' | 'toUserId'>): Payment {
  const payment: Payment = { id: newId('p'), fromUserId: from.id, toUserId: to.id, ...fields };
  from.balance -= payment.amount;
  to.balance += payment.amount;
  store().addPayment(payment);
  return payment;
}

function recipient(handle: string): User {
  const user = store().usersByHandle.get(handle);
  if (!user) throw notFound(`no user has the handle ${handle}`);
  return user;
}

// ---- payments ----

export function pay(caller: User, body: Body) {
  const toHandle = v.requiredString(body, 'to_handle');
  const amount = v.amount(body.amount);
  const note = v.note(body.note);
  const visibility = v.visibility(body.visibility);
  if (toHandle === caller.handle) throw new ApiError(422, 'self_payment', 'you cannot pay yourself');
  const to = recipient(toHandle);
  if (caller.balance < amount) throw insufficientFunds();
  const payment = transfer(caller, to, { amount, note, visibility, requestId: null, settlementId: null, createdAt: now() });
  return { status: 201, body: paymentJson(payment) };
}

// ---- requests ----

export function createRequest(caller: User, body: Body) {
  const payerHandle = v.requiredString(body, 'payer_handle');
  const amount = v.amount(body.amount);
  const note = v.note(body.note);
  if (payerHandle === caller.handle) throw new ApiError(422, 'self_request', 'you cannot request money from yourself');
  const payer = recipient(payerHandle);
  const request = newRequest(caller, payer, amount, note, now());
  return { status: 201, body: requestJson(request) };
}

function newRequest(requester: User, payer: User, amount: number, note: string, createdAt: string): PaymentRequest {
  const request: PaymentRequest = {
    id: newId('rq'), requesterId: requester.id, payerId: payer.id, amount, note, status: 'pending', paymentId: null, createdAt,
  };
  store().addRequest(request);
  return request;
}

function findRequest(id: string): PaymentRequest {
  const request = store().requestsById.get(id);
  if (!request) throw notFound('no such request');
  return request;
}

const notPending = () => new ApiError(409, 'request_not_pending', 'the request is no longer pending');

export function payRequest(caller: User, id: string, body: Body) {
  const visibility = v.visibility(body.visibility);
  const request = findRequest(id);
  if (request.payerId !== caller.id) throw forbidden('only the payer may pay a request');
  if (request.status !== 'pending') throw notPending();
  if (caller.balance < request.amount) throw insufficientFunds();
  const payment = transfer(caller, store().user(request.requesterId), {
    amount: request.amount, note: request.note, visibility, requestId: request.id, settlementId: null, createdAt: now(),
  });
  request.status = 'paid';
  request.paymentId = payment.id;
  return { status: 201, body: paymentJson(payment) };
}

/** Decline (payer) and cancel (requester): repeating the same transition is a no-op 200. */
export function closeRequest(caller: User, id: string, to: 'declined' | 'cancelled') {
  const request = findRequest(id);
  const owner = to === 'declined' ? request.payerId : request.requesterId;
  if (owner !== caller.id) throw forbidden(`only the ${to === 'declined' ? 'payer' : 'requester'} may do that`);
  if (request.status !== to) {
    if (request.status !== 'pending') throw notPending();
    request.status = to;
  }
  return { status: 200, body: requestJson(request) };
}

export function listRequests(caller: User, query: URLSearchParams) {
  const direction = v.enumParam(query.get('direction'), ['incoming', 'outgoing'] as const);
  const status = v.enumParam(query.get('status'), REQUEST_STATUSES);
  const { limit, offset } = page(query);
  const mine = store().data.requests.filter((r) =>
    (direction !== 'outgoing' && r.payerId === caller.id) || (direction !== 'incoming' && r.requesterId === caller.id));
  const matching = mine.filter((r) => status === null || r.status === status).reverse();
  return { status: 200, body: { requests: matching.slice(offset, offset + limit).map(requestJson), has_more: matching.length > offset + limit } };
}

// ---- splits (§9) ----

/** Whole units, summing to `amount`, differing by at most one; extras go first. */
export function equalShares(amount: number, n: number): number[] {
  const base = Math.floor(amount / n);
  const extra = amount - base * n;
  return Array.from({ length: n }, (_, i) => base + (i < extra ? 1 : 0));
}

export function split(caller: User, body: Body) {
  const amount = v.amount(body.amount);
  const handles = body.participant_handles;
  if (handles === undefined) throw invalid('participant_handles is required');
  if (!Array.isArray(handles) || !handles.every((h) => typeof h === 'string')) throw malformed('participant_handles must be an array of strings');
  if (handles.length === 0 || new Set(handles).size !== handles.length) throw invalid('participant_handles must be non-empty and distinct');
  const note = v.note(body.note);
  const participants = (handles as string[]).map(recipient);
  const shares = equalShares(amount, participants.length);
  const createdAt = now();
  const requests = participants.flatMap((payer, i) =>
    payer.id === caller.id ? [] : [requestJson(newRequest(caller, payer, shares[i], note, createdAt))]);
  return {
    status: 201,
    body: {
      split_id: newId('sp'), amount, currency: store().data.currency, note,
      shares: participants.map((p, i) => ({ handle: p.handle, amount: shares[i] })), requests, created_at: createdAt,
    },
  };
}

// ---- the activity feed ----

export function activity(caller: User, query: URLSearchParams) {
  const { limit, offset } = page(query);
  const visible = store().data.payments
    .filter((p) => p.visibility === 'public' || p.fromUserId === caller.id || p.toUserId === caller.id)
    .reverse();
  return { status: 200, body: { payments: visible.slice(offset, offset + limit).map(paymentJson), has_more: visible.length > offset + limit } };
}

function page(query: URLSearchParams) {
  return { limit: v.intParam(query.get('limit'), 50, 1, 200), offset: v.intParam(query.get('offset'), 0, 0) };
}

// ---- settlements (§11) ----

export function settle(caller: User, body: Body) {
  const s = store();
  if (!s.data.operatorIds.includes(caller.id)) throw forbidden('only a settlement operator may settle');
  const transfers = body.transfers;
  if (!Array.isArray(transfers) || transfers.length < 1 || transfers.length > 32) throw invalid('transfers must hold 1 to 32 items');
  // Entry errors, in input order, before any affordability question.
  const legs = transfers.map((t: unknown) => {
    if (typeof t !== 'object' || t === null || Array.isArray(t)) throw invalid('each transfer must be an object');
    const entry = t as Body;
    if (typeof entry.from_handle !== 'string' || typeof entry.to_handle !== 'string') throw invalid('transfer handles must be strings');
    const amount = v.amount(entry.amount);
    const note = v.note(entry.note);
    const visibility = v.visibility(entry.visibility);
    const from = recipient(entry.from_handle);
    const to = recipient(entry.to_handle);
    if (from.id === to.id) throw new ApiError(422, 'self_payment', 'a transfer cannot pay its own sender');
    return { from, to, amount, note, visibility };
  });
  const net = new Map<User, number>();
  for (const leg of legs) {
    net.set(leg.from, (net.get(leg.from) ?? 0) - leg.amount);
    net.set(leg.to, (net.get(leg.to) ?? 0) + leg.amount);
  }
  for (const [user, delta] of net) if (user.balance + delta < 0) throw insufficientFunds();
  const settlementId = newId('st');
  const committedAt = now();
  const payments = legs.map((leg) => transfer(leg.from, leg.to, {
    amount: leg.amount, note: leg.note, visibility: leg.visibility, requestId: null, settlementId, createdAt: committedAt,
  }));
  return { status: 201, body: { settlement_id: settlementId, committed_at: committedAt, payments: payments.map(paymentJson) } };
}
