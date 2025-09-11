'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, CheckCircle, XCircle, AlertCircle } from 'lucide-react'

export default function TestSupabase() {
  const [connectionResult, setConnectionResult] = useState<any>(null)
  const [editResult, setEditResult] = useState<any>(null)
  const [loading, setLoading] = useState<string | null>(null)

  const testConnection = async () => {
    setLoading('connection')
    try {
      const response = await fetch('/api/test-supabase')
      const data = await response.json()
      setConnectionResult(data)
    } catch (error: any) {
      setConnectionResult({ error: error.message })
    } finally {
      setLoading(null)
    }
  }

  const testEdit = async () => {
    setLoading('edit')
    try {
      const testPerson = {
        id: 'test-' + Date.now(),
        name: '测试用户',
        company: '测试公司',
        position: '测试职位',
        phone: '13800138000',
        email: 'test@example.com'
      }

      const response = await fetch('/api/update-person', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testPerson)
      })

      const result = await response.json()
      setEditResult(result)
    } catch (error: any) {
      setEditResult({ error: error.message })
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">🔍 Supabase 连接诊断工具</h1>

      <Alert className="mb-6">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          这个页面会帮您检查Supabase配置和连接状态，找出保存失败的原因。
        </AlertDescription>
      </Alert>

      <div className="space-y-6">
        {/* 连接测试 */}
        <Card>
          <CardHeader>
            <CardTitle>1. 测试API连接</CardTitle>
            <CardDescription>检查Supabase配置和数据库连接</CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={testConnection}
              disabled={loading === 'connection'}
            >
              {loading === 'connection' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              测试Supabase连接
            </Button>

            {connectionResult && (
              <div className="mt-4 space-y-2">
                {connectionResult.error ? (
                  <Alert variant="destructive">
                    <XCircle className="h-4 w-4" />
                    <AlertDescription>连接失败: {connectionResult.error}</AlertDescription>
                  </Alert>
                ) : (
                  <>
                    <h3 className="font-semibold">配置状态：</h3>
                    <ul className="space-y-1">
                      <li className="flex items-center gap-2">
                        {connectionResult.config?.hasUrl ? 
                          <CheckCircle className="h-4 w-4 text-green-500" /> : 
                          <XCircle className="h-4 w-4 text-red-500" />}
                        Supabase URL: {connectionResult.config?.hasUrl ? '已配置' : '未配置'}
                      </li>
                      <li className="flex items-center gap-2">
                        {connectionResult.config?.hasKey ? 
                          <CheckCircle className="h-4 w-4 text-green-500" /> : 
                          <XCircle className="h-4 w-4 text-red-500" />}
                        API Key: {connectionResult.config?.hasKey ? '已配置' : '未配置'}
                      </li>
                      <li className="flex items-center gap-2">
                        {connectionResult.config?.isSupabaseReady ? 
                          <CheckCircle className="h-4 w-4 text-green-500" /> : 
                          <XCircle className="h-4 w-4 text-red-500" />}
                        客户端就绪: {connectionResult.config?.isSupabaseReady ? '是' : '否'}
                      </li>
                    </ul>

                    {connectionResult.connectionTest && (
                      <div className="mt-4">
                        <h3 className="font-semibold">数据库连接：</h3>
                        {connectionResult.connectionTest.success ? (
                          <Alert className="mt-2">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <AlertDescription>{connectionResult.connectionTest.message}</AlertDescription>
                          </Alert>
                        ) : (
                          <Alert variant="destructive" className="mt-2">
                            <XCircle className="h-4 w-4" />
                            <AlertDescription>
                              <p>连接失败: {connectionResult.connectionTest.error}</p>
                              {connectionResult.connectionTest.hint && (
                                <p className="mt-1">提示: {connectionResult.connectionTest.hint}</p>
                              )}
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 编辑测试 */}
        <Card>
          <CardHeader>
            <CardTitle>2. 测试编辑功能</CardTitle>
            <CardDescription>模拟编辑操作，测试保存功能</CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={testEdit}
              disabled={loading === 'edit'}
            >
              {loading === 'edit' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              模拟编辑测试
            </Button>

            {editResult && (
              <div className="mt-4">
                {editResult.error ? (
                  <Alert variant="destructive">
                    <XCircle className="h-4 w-4" />
                    <AlertDescription>测试失败: {editResult.error}</AlertDescription>
                  </Alert>
                ) : editResult.success ? (
                  editResult.cloudError ? (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        <p>本地保存成功，但云端同步失败</p>
                        <p className="text-sm mt-1">错误详情: {editResult.errorDetails || '未知'}</p>
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <Alert>
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <AlertDescription>保存成功！数据已同步到云端</AlertDescription>
                    </Alert>
                  )
                ) : (
                  <Alert variant="destructive">
                    <XCircle className="h-4 w-4" />
                    <AlertDescription>保存失败: {editResult.message}</AlertDescription>
                  </Alert>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 配置说明 */}
        <Card>
          <CardHeader>
            <CardTitle>3. 配置说明</CardTitle>
            <CardDescription>如何正确配置Supabase</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">创建 .env.local 文件：</h3>
                <pre className="bg-gray-100 p-3 rounded text-sm overflow-x-auto">
{`NEXT_PUBLIC_SUPABASE_URL=https://你的项目.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=你的匿名密钥`}
                </pre>
              </div>

              <div>
                <h3 className="font-semibold mb-2">获取配置信息：</h3>
                <ol className="list-decimal list-inside space-y-1 text-sm">
                  <li>登录 <a href="https://app.supabase.com" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Supabase Dashboard</a></li>
                  <li>选择您的项目</li>
                  <li>进入 Settings → API</li>
                  <li>复制 Project URL 和 anon public key</li>
                  <li>粘贴到 .env.local 文件中</li>
                  <li>重启开发服务器</li>
                </ol>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  如果您还没有Supabase项目，编辑功能仍会在本地保存数据，不会丢失任何信息。
                </AlertDescription>
              </Alert>
            </div>
          </CardContent>
        </Card>

        {/* 错误日志 */}
        {(connectionResult || editResult) && (
          <Card>
            <CardHeader>
              <CardTitle>4. 详细日志</CardTitle>
              <CardDescription>调试信息</CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="bg-gray-900 text-green-400 p-4 rounded text-xs overflow-x-auto">
                {JSON.stringify({ connectionResult, editResult }, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
