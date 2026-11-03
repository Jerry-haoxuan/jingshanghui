// 服务器签发的登录凭证：密码核对通过后才发，带 HMAC 签名，浏览器既改不了也造不出。
// 只依赖 Web Crypto、不引入数据库，因为 middleware（Edge）和 API Route（Node）都要用这个文件。
// userRole Cookie 只是给前端显示用的，任何人都能自己写，不能拿来判断是否登录。
import type { NextResponse } from 'next/server'

export const SESSION_COOKIE = 'jsh_session'
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 90 // 90天

export interface Session {
  userId: string
  username: string
  role: 'member' | 'manager'
  exp: number // 过期时间（Unix 秒）
}

const encoder = new TextEncoder()
const decoder = new TextDecoder()

function toBase64Url(bytes: Uint8Array): string {
  let binary = ''
  bytes.forEach(byte => { binary += String.fromCharCode(byte) })
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(value: string): Uint8Array {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/')
  const binary = atob(base64 + '='.repeat((4 - base64.length % 4) % 4))
  return Uint8Array.from(binary, char => char.charCodeAt(0))
}

async function getSigningKey(): Promise<CryptoKey> {
  const secret = process.env.SESSION_SECRET
  if (!secret) throw new Error('SESSION_SECRET 未配置，无法签发或校验登录凭证')
  return crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify'])
}

export async function createSessionToken(user: { id: string; username: string; role: Session['role'] }): Promise<string> {
  const session: Session = {
    userId: user.id,
    username: user.username,
    role: user.role,
    exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS,
  }
  const payload = toBase64Url(encoder.encode(JSON.stringify(session)))
  const signature = await crypto.subtle.sign('HMAC', await getSigningKey(), encoder.encode(payload))
  return `${payload}.${toBase64Url(new Uint8Array(signature))}`
}

// 凭证缺失、被改过、已过期，或服务器没配密钥，一律当作未登录
export async function verifySessionToken(token: string | undefined): Promise<Session | null> {
  if (!token) return null
  const parts = token.split('.')
  if (parts.length !== 2) return null
  const [payload, signature] = parts
  try {
    const valid = await crypto.subtle.verify('HMAC', await getSigningKey(), fromBase64Url(signature), encoder.encode(payload))
    if (!valid) return null
    const session = JSON.parse(decoder.decode(fromBase64Url(payload))) as Session
    return session.exp > Date.now() / 1000 ? session : null
  } catch {
    return null
  }
}

export async function attachSessionCookie(
  response: NextResponse,
  user: { id: string; username: string; role: Session['role'] }
): Promise<void> {
  response.cookies.set({
    name: SESSION_COOKIE,
    value: await createSessionToken(user),
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
  })
}

export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set({
    name: SESSION_COOKIE,
    value: '',
    path: '/',
    maxAge: 0,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
  })
}
