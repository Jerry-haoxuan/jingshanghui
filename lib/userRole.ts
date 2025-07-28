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
    localStorage.setItem('userRole', role);
    // 清除角色缓存，确保立即生效
    clearRoleCache();
  }
};

// 获取当前用户角色
export const getUserRole = (): UserRole | null => {
  if (typeof window !== 'undefined') {
    const role = localStorage.getItem('userRole');
    return role as UserRole | null;
  }
  return null;
};

// 清除用户角色（登出时使用）
export const clearUserRole = (): void => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('userRole');
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