// 用户角色管理
export enum UserRole {
  MEMBER = 'member',     // 精尚慧会员
  MANAGER = 'manager'    // 精尚慧管理者
}

// 导入清除缓存函数
import { clearRoleCache } from './deterministicNameAlias';

// 存储当前用户角色
export const setUserRole = (role: UserRole): void => {
  if (typeof window !== 'undefined') {
    // 存储到localStorage
    localStorage.setItem('userRole', role);
    
    // 同时存储到cookie，以便服务器端中间件可以访问
    // 在生产环境使用Secure属性
    const isProduction = window.location.protocol === 'https:';
    const cookieOptions = [
      `userRole=${role}`,
      'path=/',
      'max-age=7776000', // 90天有效期 (90 * 24 * 60 * 60)
      'SameSite=Lax' // 允许导航时发送Cookie
    ];
    
    if (isProduction) {
      cookieOptions.push('Secure'); // HTTPS环境下必需
    }
    
    document.cookie = cookieOptions.join('; ');
    
    // 清除角色缓存，确保立即生效
    clearRoleCache();
  }
};

// 获取当前用户角色
export const getUserRole = (): UserRole | null => {
  if (typeof window !== 'undefined') {
    // 优先从localStorage获取
    const role = localStorage.getItem('userRole');
    
    // 如果localStorage没有，尝试从cookie获取
    if (!role) {
      const cookieValue = document.cookie
        .split('; ')
        .find(row => row.startsWith('userRole='))
        ?.split('=')[1];
      
      if (cookieValue) {
        // 同步到localStorage
        localStorage.setItem('userRole', cookieValue);
        return cookieValue as UserRole;
      }
    }
    
    return role as UserRole | null;
  }
  return null;
};

// 清除用户角色（登出时使用）
export const clearUserRole = (): void => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('userRole');
    // 清除cookie
    document.cookie = 'userRole=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    // 清除角色缓存
    clearRoleCache();
  }
};

// 检查是否为管理者
export const isManager = (): boolean => {
  return getUserRole() === UserRole.MANAGER;
};

// 检查是否为会员
export const isMember = (): boolean => {
  return getUserRole() === UserRole.MEMBER;
}; 