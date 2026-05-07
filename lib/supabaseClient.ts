// 数据库连接已迁移到阿里云 RDS PostgreSQL
// 此文件保留兼容性导出，实际连接见 lib/db.ts

export const isSupabaseReady = Boolean(process.env.DATABASE_URL)

// supabase 导出保留为 null，各 store 已直接使用 lib/db.ts
export const supabase = null as any


