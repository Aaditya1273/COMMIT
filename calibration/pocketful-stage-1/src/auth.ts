// Signup, login and bearer tokens. Passwords are stored as scrypt hashes only.
import { randomBytes, randomUUID, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { ApiError, invalid, unauthenticated } from './errors.ts';
import { store, type User } from './store.ts';
import { requiredString, type Body } from './validate.ts';

const derive = promisify(scrypt) as (password: string, salt: Buffer, length: number) => Promise<Buffer>;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await derive(password, salt, 32);
  return `scrypt$${salt.toString('base64')}$${hash.toString('base64')}`;
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, salt, hash] = stored.split('$');
  if (scheme !== 'scrypt' || !salt || !hash) return false;
  const expected = Buffer.from(hash, 'base64');
  const actual = await derive(password, Buffer.from(salt, 'base64'), expected.length);
  return timingSafeEqual(actual, expected);
}

/** §4: local part, lowercased, anything outside [a-z0-9_] becomes `_`, cut to 20. */
export function deriveHandle(email: string): string {
  return email.slice(0, email.lastIndexOf('@')).toLowerCase().replace(/[^a-z0-9_]/g, '_').slice(0, 20);
}

function issueToken(userId: string): string {
  const token = randomBytes(32).toString('base64url');
  store().data.tokens[token] = userId;
  return token;
}

export function authenticate(header: string | undefined): User {
  const match = /^Bearer (\S+)$/.exec(header ?? '');
  const userId = match ? store().data.tokens[match[1]] : undefined;
  const user = userId === undefined ? undefined : store().usersById.get(userId);
  if (!user) throw unauthenticated();
  return user;
}

const sessionBody = (user: User, token: string) => ({ user_id: user.id, display_name: user.displayName, token });

export async function signup(body: Body) {
  const email = requiredString(body, 'email');
  const password = requiredString(body, 'password');
  const displayName = requiredString(body, 'display_name');
  if (!/^[^@\s]+@[^@\s]+$/.test(email)) throw invalid('email must look like local@domain');
  if (password.length < 8) throw invalid('password must be at least 8 characters');
  const handle = deriveHandle(email);
  const taken = () => {
    if (store().usersByEmail.has(email.toLowerCase())) throw new ApiError(409, 'email_taken', 'email is already registered');
    if (store().usersByHandle.has(handle)) throw new ApiError(409, 'handle_taken', 'the handle derived from this email is taken');
  };
  taken();
  const passwordHash = await hashPassword(password);
  // Hashing yielded the thread: check again, then insert in the same synchronous step.
  taken();
  const user: User = { id: `u_${randomUUID()}`, email, passwordHash, displayName, handle, balance: 0 };
  store().addUser(user);
  return { status: 201, body: sessionBody(user, issueToken(user.id)) };
}

export async function login(body: Body) {
  const email = requiredString(body, 'email');
  const password = requiredString(body, 'password');
  const before = store();
  const user = before.usersByEmail.get(email.toLowerCase());
  if (!user || !(await verifyPassword(password, user.passwordHash))) throw unauthenticated('wrong email or password');
  // A reset or import during verification replaced the user this login was for.
  if (store() !== before) throw unauthenticated('state was replaced during login');
  return { status: 200, body: sessionBody(user, issueToken(user.id)) };
}
