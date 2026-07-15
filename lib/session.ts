// 当前登录用户的会话存储（纯 localStorage 操作，客户端安全，不引入数据库依赖）
// 之所以独立于 lib/userStore.ts：userStore.ts 顶层引入了 pg 数据库连接，
// 如果客户端组件从 userStore.ts 导入任何内容，会把数据库驱动一并打包进浏览器代码。
export type { UserAccount } from './userStore'
import type { UserAccount } from './userStore'

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
