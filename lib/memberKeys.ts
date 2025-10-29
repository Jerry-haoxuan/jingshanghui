// 会员密钥管理系统
// 每个会员拥有独立的密钥和绑定的人物卡片

export interface MemberAccount {
  key: string           // 密钥（用于登录）
  personId?: string     // 绑定的人物ID（首次使用时绑定）
  personName?: string   // 人物真实姓名
  aliasName: string     // AI化名字（用于标识）
  createdAt: string     // 创建时间
  isUsed: boolean       // 是否已被使用
}

// 已分配的会员账号（3个现有用户）
export const ASSIGNED_MEMBERS: MemberAccount[] = [
  {
    key: 'JSH-RXW-8K2M9P4Q',
    personId: undefined,  // 需要管理员在数据库中找到对应的person id
    personName: '阮小五对应的真实姓名',  // 需要替换为真实姓名
    aliasName: '阮小五',
    createdAt: new Date().toISOString(),
    isUsed: true
  },
  {
    key: 'JSH-QLY-3N7X6H8W',
    personId: undefined,
    personName: '千里眼对应的真实姓名',
    aliasName: '千里眼',
    createdAt: new Date().toISOString(),
    isUsed: true
  },
  {
    key: 'JSH-RLFS-5Y9T2K4M',
    personId: undefined,
    personName: '徐翔',  // 如来佛祖
    aliasName: '如来佛祖',
    createdAt: new Date().toISOString(),
    isUsed: true
  }
]

// 未使用的预生成密钥（10个）
export const UNUSED_MEMBER_KEYS: MemberAccount[] = [
  {
    key: 'JSH-NEW-A1B2C3D4',
    aliasName: '待分配',
    createdAt: new Date().toISOString(),
    isUsed: false
  },
  {
    key: 'JSH-NEW-E5F6G7H8',
    aliasName: '待分配',
    createdAt: new Date().toISOString(),
    isUsed: false
  },
  {
    key: 'JSH-NEW-I9J0K1L2',
    aliasName: '待分配',
    createdAt: new Date().toISOString(),
    isUsed: false
  },
  {
    key: 'JSH-NEW-M3N4O5P6',
    aliasName: '待分配',
    createdAt: new Date().toISOString(),
    isUsed: false
  },
  {
    key: 'JSH-NEW-Q7R8S9T0',
    aliasName: '待分配',
    createdAt: new Date().toISOString(),
    isUsed: false
  },
  {
    key: 'JSH-NEW-U1V2W3X4',
    aliasName: '待分配',
    createdAt: new Date().toISOString(),
    isUsed: false
  },
  {
    key: 'JSH-NEW-Y5Z6A7B8',
    aliasName: '待分配',
    createdAt: new Date().toISOString(),
    isUsed: false
  },
  {
    key: 'JSH-NEW-C9D0E1F2',
    aliasName: '待分配',
    createdAt: new Date().toISOString(),
    isUsed: false
  },
  {
    key: 'JSH-NEW-G3H4I5J6',
    aliasName: '待分配',
    createdAt: new Date().toISOString(),
    isUsed: false
  },
  {
    key: 'JSH-NEW-K7L8M9N0',
    aliasName: '待分配',
    createdAt: new Date().toISOString(),
    isUsed: false
  }
]

// 合并所有密钥
export const ALL_MEMBER_KEYS = [...ASSIGNED_MEMBERS, ...UNUSED_MEMBER_KEYS]

// 验证密钥是否有效
export function validateMemberKey(key: string): MemberAccount | null {
  const member = ALL_MEMBER_KEYS.find(m => m.key === key)
  return member || null
}

// 获取会员信息（从localStorage）
export function getCurrentMemberAccount(): MemberAccount | null {
  if (typeof window === 'undefined') return null
  const memberData = localStorage.getItem('memberAccount')
  if (!memberData) return null
  try {
    return JSON.parse(memberData)
  } catch {
    return null
  }
}

// 保存会员信息
export function saveMemberAccount(account: MemberAccount): void {
  if (typeof window === 'undefined') return
  localStorage.setItem('memberAccount', JSON.stringify(account))
}

// 绑定人物到密钥（首次使用）
export function bindPersonToKey(key: string, personId: string, personName: string): boolean {
  const member = ALL_MEMBER_KEYS.find(m => m.key === key)
  if (!member) return false
  
  // 更新会员信息
  member.personId = personId
  member.personName = personName
  member.isUsed = true
  
  // 保存到localStorage
  saveMemberAccount(member)
  
  return true
}

// 检查是否是查看自己的卡片
export function isViewingOwnCard(personId: string): boolean {
  const currentMember = getCurrentMemberAccount()
  if (!currentMember || !currentMember.personId) return false
  return currentMember.personId === personId
}

// 清除会员登录信息
export function clearMemberAccount(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem('memberAccount')
}

