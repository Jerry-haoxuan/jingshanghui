'use client'

import { useEffect } from 'react'
import { clearUserRole } from '@/lib/userRole'
import { clearCurrentUser } from '@/lib/session'

// 页面开着的时候登录失效（凭证过期、服务器换了密钥），数据接口会返回 401。
// 在这里统一接住并回到首页重新登录，否则页面只会悄悄显示空数据，保存也会悄悄失败。
export default function SessionWatcher() {
  useEffect(() => {
    const originalFetch = window.fetch
    window.fetch = async (input, init) => {
      const response = await originalFetch.call(window, input, init)
      if (response.status === 401 && response.headers.get('x-login-required')) {
        clearUserRole()
        clearCurrentUser()
        window.location.href = '/'
      }
      return response
    }
    return () => {
      window.fetch = originalFetch
    }
  }, [])

  return null
}
