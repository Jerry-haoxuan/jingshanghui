import { NextRequest, NextResponse } from 'next/server'
import { supabase, isSupabaseReady } from '@/lib/supabaseClient'

export async function GET(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  // 检查环境变量
  const config = {
    hasUrl: Boolean(supabaseUrl),
    hasKey: Boolean(supabaseKey),
    urlPreview: supabaseUrl ? supabaseUrl.substring(0, 30) + '...' : 'NOT SET',
    keyPreview: supabaseKey ? supabaseKey.substring(0, 10) + '...' : 'NOT SET',
    isSupabaseReady
  }
  
  // 如果Supabase已配置，尝试连接测试
  let connectionTest = null
  if (isSupabaseReady) {
    try {
      // 尝试查询people表
      const { data, error } = await supabase
        .from('people')
        .select('count')
        .limit(1)
      
      if (error) {
        connectionTest = {
          success: false,
          error: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        }
      } else {
        connectionTest = {
          success: true,
          message: '成功连接到Supabase数据库'
        }
      }
    } catch (err: any) {
      connectionTest = {
        success: false,
        error: err.message || '连接测试失败'
      }
    }
  }
  
  return NextResponse.json({
    config,
    connectionTest,
    timestamp: new Date().toISOString()
  })
}
