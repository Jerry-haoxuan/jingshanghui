// 手机号验证码服务：生成/校验验证码 + 对接阿里云短信服务发送
import crypto from 'crypto'
import fs from 'fs'
import os from 'os'
import path from 'path'

const ALIYUN_ACCESS_KEY_ID = process.env.ALIYUN_SMS_ACCESS_KEY_ID || ''
const ALIYUN_ACCESS_KEY_SECRET = process.env.ALIYUN_SMS_ACCESS_KEY_SECRET || ''
const ALIYUN_SIGN_NAME = process.env.ALIYUN_SMS_SIGN_NAME || ''
const ALIYUN_TEMPLATE_CODE = process.env.ALIYUN_SMS_TEMPLATE_CODE || ''

const isSmsConfigured = Boolean(
  ALIYUN_ACCESS_KEY_ID && ALIYUN_ACCESS_KEY_SECRET && ALIYUN_SIGN_NAME && ALIYUN_TEMPLATE_CODE
)

const CODE_TTL_MS = 5 * 60 * 1000 // 验证码5分钟有效
const SEND_COOLDOWN_MS = 60 * 1000 // 同一手机号60秒内不能重复发送

interface CodeEntry {
  code: string
  expiresAt: number
  lastSentAt: number
  attempts: number
}

// 用文件而不是内存变量存储验证码：Next.js 会把每个 API 路由分别打包，
// 不同路由文件里的同一个模块可能各自持有独立的内存副本（尤其是开发模式下的
// 按需编译），导致"发送验证码"和"校验验证码"看不到同一份数据。
// 文件系统才是所有路由进程真正共享的存储介质。
const CODE_STORE_DIR = path.join(os.tmpdir(), 'jsh-sms-codes')

function ensureStoreDir() {
  if (!fs.existsSync(CODE_STORE_DIR)) {
    fs.mkdirSync(CODE_STORE_DIR, { recursive: true })
  }
}

function codeFilePath(phone: string): string {
  // 手机号本身已是纯数字，直接作为文件名，无需额外转义
  return path.join(CODE_STORE_DIR, `${phone}.json`)
}

function readEntry(phone: string): CodeEntry | null {
  try {
    const raw = fs.readFileSync(codeFilePath(phone), 'utf-8')
    return JSON.parse(raw) as CodeEntry
  } catch {
    return null
  }
}

function writeEntry(phone: string, entry: CodeEntry) {
  ensureStoreDir()
  fs.writeFileSync(codeFilePath(phone), JSON.stringify(entry), 'utf-8')
}

function deleteEntry(phone: string) {
  try {
    fs.unlinkSync(codeFilePath(phone))
  } catch {
    // 文件不存在也没关系
  }
}

export function isValidChinesePhone(phone: string): boolean {
  return /^1[3-9]\d{9}$/.test(phone.trim())
}

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

// ========== 阿里云短信 API 签名与发送（RPC 风格签名，无需额外 SDK 依赖）==========
function percentEncode(str: string): string {
  return encodeURIComponent(str)
    .replace(/\+/g, '%20')
    .replace(/\*/g, '%2A')
    .replace(/%7E/g, '~')
}

function buildSignature(params: Record<string, string>): string {
  const sorted = Object.keys(params).sort()
  const canonicalized = sorted
    .map(key => `${percentEncode(key)}=${percentEncode(params[key])}`)
    .join('&')
  const stringToSign = `POST&${percentEncode('/')}&${percentEncode(canonicalized)}`
  const hmac = crypto.createHmac('sha1', `${ALIYUN_ACCESS_KEY_SECRET}&`)
  return hmac.update(stringToSign).digest('base64')
}

async function sendSmsViaAliyun(phone: string, code: string): Promise<{ success: boolean; message: string }> {
  const params: Record<string, string> = {
    AccessKeyId: ALIYUN_ACCESS_KEY_ID,
    Action: 'SendSms',
    Format: 'JSON',
    PhoneNumbers: phone,
    RegionId: 'cn-hangzhou',
    SignName: ALIYUN_SIGN_NAME,
    SignatureMethod: 'HMAC-SHA1',
    SignatureNonce: crypto.randomUUID(),
    SignatureVersion: '1.0',
    TemplateCode: ALIYUN_TEMPLATE_CODE,
    TemplateParam: JSON.stringify({ code }),
    Timestamp: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
    Version: '2017-05-25',
  }
  const signature = buildSignature(params)
  const finalParams = { ...params, Signature: signature }

  const body = Object.entries(finalParams)
    .map(([k, v]) => `${percentEncode(k)}=${percentEncode(v)}`)
    .join('&')

  try {
    const res = await fetch('https://dysmsapi.aliyuncs.com/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    })
    const data = await res.json()
    if (data.Code === 'OK') {
      return { success: true, message: '发送成功' }
    }
    console.error('[SMS] 阿里云短信发送失败:', data)
    return { success: false, message: data.Message || '短信发送失败，请稍后重试' }
  } catch (err) {
    console.error('[SMS] 阿里云短信请求异常:', err)
    return { success: false, message: '短信服务请求异常，请稍后重试' }
  }
}

export interface SendCodeResult {
  success: boolean
  message: string
  devCode?: string // 仅在短信服务未配置时（本地开发调试）返回，生产环境不会出现
}

export async function sendVerificationCode(phone: string): Promise<SendCodeResult> {
  if (!isValidChinesePhone(phone)) {
    return { success: false, message: '请输入有效的手机号' }
  }

  const existing = readEntry(phone)
  const now = Date.now()
  if (existing && now - existing.lastSentAt < SEND_COOLDOWN_MS) {
    const waitSec = Math.ceil((SEND_COOLDOWN_MS - (now - existing.lastSentAt)) / 1000)
    return { success: false, message: `发送太频繁，请${waitSec}秒后再试` }
  }

  const code = generateCode()
  writeEntry(phone, { code, expiresAt: now + CODE_TTL_MS, lastSentAt: now, attempts: 0 })

  if (!isSmsConfigured) {
    // 短信服务未配置（本地开发/尚未申请签名模板）：打印到服务器日志，方便本地测试
    console.log(`[SMS-DEV] 短信服务未配置，验证码明文打印用于调试：手机号=${phone} 验证码=${code}`)
    return {
      success: true,
      message: '短信服务尚未配置，验证码已打印到服务器日志（仅开发调试用）',
      devCode: code,
    }
  }

  const result = await sendSmsViaAliyun(phone, code)
  if (!result.success) {
    deleteEntry(phone)
  }
  return result
}

// 仅校验验证码是否正确，不会使其失效——调用方应在业务流程（如注册）
// 真正成功之后再调用 consumeVerificationCode，避免用户填错邀请码等
// 与验证码无关的信息时，白白浪费一次已经验证通过的验证码。
export function verifyCode(phone: string, code: string): { success: boolean; message: string } {
  const entry = readEntry(phone)
  if (!entry) {
    return { success: false, message: '验证码不存在或已过期，请重新获取' }
  }
  if (Date.now() > entry.expiresAt) {
    deleteEntry(phone)
    return { success: false, message: '验证码已过期，请重新获取' }
  }
  if (entry.code !== code.trim()) {
    entry.attempts += 1
    if (entry.attempts > 5) {
      deleteEntry(phone)
      return { success: false, message: '验证次数过多，请重新获取验证码' }
    }
    writeEntry(phone, entry) // 持久化失败次数计数
    return { success: false, message: '验证码错误' }
  }
  return { success: true, message: '验证成功' }
}

// 业务流程（如注册）真正完成后调用，使验证码失效，防止重复使用
export function consumeVerificationCode(phone: string): void {
  deleteEntry(phone)
}
