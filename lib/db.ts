import { Pool } from 'pg'

// 是否配置了数据库连接（服务端专用；浏览器里 process.env.DATABASE_URL 永远为空）
export const isDbReady = Boolean(process.env.DATABASE_URL)

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
})

export default pool
