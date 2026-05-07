// 用户账号管理系统
// 注册账号存储在阿里云 RDS PostgreSQL，无法连接时降级到 localStorage

import pool from './db'

const isSupabaseReady = Boolean(process.env.DATABASE_URL)

export interface UserAccount {
  id: string
  username: string
  passwordHash: string
  role: 'member' | 'manager'
  invitationCode: string
  personName?: string   // 仅预置账号有此字段，不存入数据库（保护隐私）
  createdAt: string
}

// ========== 内测邀请码（10个）==========
export const BETA_INVITATION_CODES: string[] = [
  'ECO-INV-X7K2M9PQ',
  'ECO-INV-A3N8Q5RT',
  'ECO-INV-B4L7W2SY',
  'ECO-INV-C9M3T6UZ',
  'ECO-INV-D2P8V4ZF',
  'ECO-INV-E5R1Y9FG',
  'ECO-INV-F8S6G3HJ',
  'ECO-INV-G1T4J7IK',
  'ECO-INV-H6U9K2OL',
  'ECO-INV-I0V3L8NM',
]

// 管理者专用邀请码
export const ADMIN_INVITATION_CODE = 'ECO-ADM-ECOSYS24'

// ========== 预置账号（由管理员预配，直接可用，跨设备）==========
interface PresetAccount {
  id: string
  username: string
  password: string
  role: 'member' | 'manager'
  personName?: string
  createdAt: string
}

const PRESET_ACCOUNTS: PresetAccount[] = [
  {
    id: 'preset_xuxiang',
    username: 'songjiang',
    password: 'JSH@SJ2024',
    role: 'member',
    personName: '徐翔',
    createdAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'preset_lili',
    username: 'ruanxiaowu',
    password: 'JSH@RXW2024',
    role: 'member',
    personName: '李莉',
    createdAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'preset_wanliping',
    username: 'qianliyan',
    password: 'JSH@QLY2024',
    role: 'member',
    personName: '王丽平',
    createdAt: '2024-01-01T00:00:00.000Z',
  },
]

// ========== 密码哈希（djb2 变体）==========
export function hashPassword(password: string): string {
  let hash = 5381
  for (let i = 0; i < password.length; i++) {
    hash = ((hash << 5) + hash) ^ password.charCodeAt(i)
    hash = hash >>> 0
  }
  return hash.toString(16).padStart(8, '0')
}

// ========== Supabase 数据库操作 ==========
type DbUserAccount = {
  id: string
  username: string
  password_hash: string
  role: string
  invitation_code: string
  created_at: string
}

async function findUserInCloud(username: string): Promise<DbUserAccount | null> {
  if (!isSupabaseReady) return null
  try {
    const { rows } = await pool.query(
      'SELECT * FROM public.user_accounts WHERE LOWER(username) = LOWER($1) LIMIT 1',
      [username]
    )
    return (rows[0] as DbUserAccount) ?? null
  } catch {
    return null
  }
}

async function insertUserToCloud(user: UserAccount): Promise<boolean> {
  if (!isSupabaseReady) return false
  try {
    await pool.query(
      'INSERT INTO public.user_accounts (id, username, password_hash, role, invitation_code) VALUES ($1,$2,$3,$4,$5)',
      [user.id, user.username, user.passwordHash, user.role, user.invitationCode]
    )
    return true
  } catch {
    return false
  }
}

async function checkInviteCodeUsedInCloud(code: string): Promise<boolean> {
  if (!isSupabaseReady) return false
  try {
    const { rows } = await pool.query(
      'SELECT id FROM public.user_accounts WHERE invitation_code=$1 LIMIT 1',
      [code]
    )
    return rows.length > 0
  } catch {
    return false
  }
}

async function checkManagerExistsInCloud(): Promise<boolean> {
  if (!isSupabaseReady) return false
  try {
    const { rows } = await pool.query(
      "SELECT id FROM public.user_accounts WHERE role='manager' LIMIT 1"
    )
    return rows.length > 0
  } catch {
    return false
  }
}

// ========== localStorage 降级存储 ==========
function getLocalUsers(): UserAccount[] {
  if (typeof window === 'undefined') return []
  try {
    const data = localStorage.getItem('jsh_userAccounts')
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

function saveLocalUsers(users: UserAccount[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem('jsh_userAccounts', JSON.stringify(users))
}

// ========== 注册（异步）==========
export interface RegisterResult {
  success: boolean
  message: string
  role?: 'member' | 'manager'
  account?: UserAccount
}

export async function registerUser(
  username: string,
  password: string,
  invitationCode: string
): Promise<RegisterResult> {
  if (!username.trim()) return { success: false, message: '用户名不能为空' }
  if (username.length < 2) return { success: false, message: '用户名至少需要2个字符' }
  if (!password) return { success: false, message: '密码不能为空' }
  if (password.length < 6) return { success: false, message: '密码至少需要6位' }
  if (!invitationCode.trim()) return { success: false, message: '邀请码不能为空' }

  const trimmedName = username.trim()

  // 与预置账号冲突检查
  if (PRESET_ACCOUNTS.find(p => p.username.toLowerCase() === trimmedName.toLowerCase())) {
    return { success: false, message: '用户名已被占用，请换一个' }
  }

  // 验证邀请码并确定角色
  let role: 'member' | 'manager'
  if (invitationCode === ADMIN_INVITATION_CODE) {
    // 管理者：检查是否已存在
    const managerExists = isSupabaseReady
      ? await checkManagerExistsInCloud()
      : getLocalUsers().some(u => u.role === 'manager')
    if (managerExists) {
      return { success: false, message: '管理者账号已存在，请直接登录' }
    }
    role = 'manager'
  } else if (BETA_INVITATION_CODES.includes(invitationCode)) {
    // 会员：检查邀请码是否已用
    const codeUsed = isSupabaseReady
      ? await checkInviteCodeUsedInCloud(invitationCode)
      : getLocalUsers().some(u => u.invitationCode === invitationCode)
    if (codeUsed) {
      return { success: false, message: '该邀请码已被使用' }
    }
    role = 'member'
  } else {
    return { success: false, message: '邀请码无效，请检查后重试' }
  }

  // 检查用户名是否已存在
  if (isSupabaseReady) {
    const existing = await findUserInCloud(trimmedName)
    if (existing) return { success: false, message: '用户名已被占用，请换一个' }
  } else {
    if (getLocalUsers().find(u => u.username.toLowerCase() === trimmedName.toLowerCase())) {
      return { success: false, message: '用户名已被占用，请换一个' }
    }
  }

  const newUser: UserAccount = {
    id: `user_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    username: trimmedName,
    passwordHash: hashPassword(password),
    role,
    invitationCode,
    createdAt: new Date().toISOString(),
  }

  // 优先存 Supabase，失败降级到 localStorage
  if (isSupabaseReady) {
    const ok = await insertUserToCloud(newUser)
    if (!ok) return { success: false, message: '注册失败，请检查网络后重试' }
  } else {
    const users = getLocalUsers()
    users.push(newUser)
    saveLocalUsers(users)
  }

  return { success: true, message: '注册成功', role, account: newUser }
}

// ========== 登录（异步）==========
export interface LoginResult {
  success: boolean
  message: string
  role?: 'member' | 'manager'
  account?: UserAccount
}

export async function loginUser(username: string, password: string): Promise<LoginResult> {
  if (!username.trim()) return { success: false, message: '请输入用户名' }
  if (!password) return { success: false, message: '请输入密码' }

  const name = username.trim().toLowerCase()

  // 1. 先检查预置账号（明文比对，跨设备可用）
  const preset = PRESET_ACCOUNTS.find(
    p => p.username.toLowerCase() === name && p.password === password
  )
  if (preset) {
    const account: UserAccount = {
      id: preset.id,
      username: preset.username,
      passwordHash: '',
      role: preset.role,
      invitationCode: 'PRESET',
      personName: preset.personName,
      createdAt: preset.createdAt,
    }
    return { success: true, message: '登录成功', role: preset.role, account }
  }

  const passwordHash = hashPassword(password)

  // 2. 从 Supabase 查找
  if (isSupabaseReady) {
    const dbUser = await findUserInCloud(name)
    if (dbUser) {
      if (dbUser.password_hash !== passwordHash) {
        return { success: false, message: '用户名或密码错误' }
      }
      const account: UserAccount = {
        id: dbUser.id,
        username: dbUser.username,
        passwordHash: dbUser.password_hash,
        role: dbUser.role as 'member' | 'manager',
        invitationCode: dbUser.invitation_code,
        createdAt: dbUser.created_at,
      }
      return { success: true, message: '登录成功', role: account.role, account }
    }
  }

  // 3. 降级：从 localStorage 查找
  const localUsers = getLocalUsers()
  const localUser = localUsers.find(
    u => u.username.toLowerCase() === name && u.passwordHash === passwordHash
  )
  if (localUser) {
    return { success: true, message: '登录成功', role: localUser.role, account: localUser }
  }

  return { success: false, message: '用户名或密码错误' }
}

// ========== 当前登录用户（Session，存 localStorage）==========
export function getCurrentUser(): UserAccount | null {
  if (typeof window === 'undefined') return null
  try {
    const data = localStorage.getItem('jsh_currentUser')
    return data ? JSON.parse(data) : null
  } catch {
    return null
  }
}

export function saveCurrentUser(account: UserAccount): void {
  if (typeof window === 'undefined') return
  localStorage.setItem('jsh_currentUser', JSON.stringify(account))
}

export function clearCurrentUser(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem('jsh_currentUser')
}
