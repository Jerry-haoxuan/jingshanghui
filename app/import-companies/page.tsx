'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, RefreshCw, Upload, CheckCircle, XCircle, Search } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { getUserRole, isManager } from '@/lib/userRole'

type PreviewRow = {
  name: string
  industry: string
  inferredIndustry: string
  source: string
}

const INDUSTRY_COLORS: Record<string, string> = {
  '半导体':      'bg-cyan-100 text-cyan-700',
  '智能制造':    'bg-orange-100 text-orange-700',
  '人工智能':    'bg-pink-100 text-pink-700',
  '新材料':      'bg-violet-100 text-violet-700',
  '新能源':      'bg-teal-100 text-teal-700',
  '新能源汽车':  'bg-green-100 text-green-700',
  '医疗器械':    'bg-rose-100 text-rose-700',
  '互联网/软件': 'bg-indigo-100 text-indigo-700',
  '金融投资':    'bg-yellow-100 text-yellow-700',
  '其他行业':    'bg-gray-100 text-gray-600',
}

export default function ImportCompanies() {
  const router = useRouter()
  const [preview, setPreview] = useState<PreviewRow[]>([])
  const [existingCount, setExistingCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<{ success: boolean; imported: number; total: number; errors: string[] } | null>(null)
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState('')

  useEffect(() => {
    if (!getUserRole()) { router.push('/'); return }
    if (!isManager()) { router.push('/dashboard'); return }
    fetchPreview()
  }, [router])

  async function fetchPreview() {
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch('/api/all-companies')
      const json = await res.json()
      setPreview(json.toImport ?? [])
      setExistingCount(json.existingCount ?? 0)
    } finally {
      setLoading(false)
    }
  }

  async function doImport() {
    if (!confirm(`确认将 ${preview.length} 家企业批量导入 companies 表？\n此操作不可逆，请确认。`)) return
    setImporting(true)
    try {
      const res = await fetch('/api/all-companies', { method: 'POST' })
      const json = await res.json()
      setResult(json)
      if (json.success) fetchPreview()
    } finally {
      setImporting(false)
    }
  }

  // 统计各行业数量
  const catCounts = preview.reduce<Record<string, number>>((acc, r) => {
    acc[r.inferredIndustry] = (acc[r.inferredIndustry] ?? 0) + 1
    return acc
  }, {})

  const categories = Object.keys(catCounts).sort((a, b) => catCounts[b] - catCounts[a])

  const filtered = preview.filter(r => {
    const matchSearch = !search || r.name.includes(search) || r.source.includes(search)
    const matchCat = !filterCat || r.inferredIndustry === filterCat
    return matchSearch && matchCat
  })

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航 */}
      <div className="bg-white border-b shadow-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link href="/dashboard" className="text-gray-400 hover:text-gray-700">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-gray-800">批量导入企业</h1>
            <p className="text-xs text-gray-400">将人员档案中的 all_companies 批量写入 companies 表</p>
          </div>
          <button onClick={fetchPreview} className="ml-auto p-2 hover:bg-gray-100 rounded-lg text-gray-500" title="刷新预览">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-6 space-y-5">

        {/* 结果提示 */}
        {result && (
          <div className={`rounded-2xl p-5 flex items-start gap-4 ${result.success ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'}`}>
            {result.success
              ? <CheckCircle className="w-6 h-6 text-emerald-500 shrink-0 mt-0.5" />
              : <XCircle className="w-6 h-6 text-red-500 shrink-0 mt-0.5" />}
            <div>
              <p className="font-semibold text-gray-800">
                {result.success
                  ? `✅ 成功导入 ${result.imported} 家企业！`
                  : `⚠️ 导入完成，成功 ${result.imported}/${result.total} 家`}
              </p>
              {result.errors.length > 0 && (
                <ul className="mt-2 text-sm text-red-600 space-y-1">
                  {result.errors.map((e, i) => <li key={i}>• {e}</li>)}
                </ul>
              )}
            </div>
          </div>
        )}

        {/* 统计卡片 */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl shadow-sm p-5 text-center">
            <div className="text-3xl font-bold text-blue-600">{existingCount}</div>
            <div className="text-sm text-gray-500 mt-1">已有企业（companies 表）</div>
          </div>
          <div className="bg-white rounded-2xl shadow-sm p-5 text-center">
            <div className="text-3xl font-bold text-orange-500">{preview.length}</div>
            <div className="text-sm text-gray-500 mt-1">待导入企业（人员档案新增）</div>
          </div>
          <div className="bg-white rounded-2xl shadow-sm p-5 text-center">
            <div className="text-3xl font-bold text-emerald-600">{existingCount + preview.length}</div>
            <div className="text-sm text-gray-500 mt-1">导入后企业总数</div>
          </div>
        </div>

        {/* 行业分布 */}
        {!loading && preview.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <h2 className="text-sm font-bold text-gray-700 mb-3">待导入企业行业分布</h2>
            <div className="flex flex-wrap gap-2">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setFilterCat(filterCat === cat ? '' : cat)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all
                    ${filterCat === cat ? 'border-blue-500 ring-2 ring-blue-200' : 'border-transparent'}
                    ${INDUSTRY_COLORS[cat] ?? 'bg-gray-100 text-gray-600'}`}
                >
                  {cat} · {catCounts[cat]}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 操作按钮 */}
        <div className="flex items-center justify-between">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              className="pl-9 pr-4 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 w-64"
              placeholder="搜索企业名或来源人员…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <button
            onClick={doImport}
            disabled={importing || loading || preview.length === 0}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-white font-semibold transition-all
              ${preview.length === 0 ? 'bg-gray-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 active:scale-95'}`}
          >
            {importing
              ? <><RefreshCw className="w-4 h-4 animate-spin" />导入中…</>
              : <><Upload className="w-4 h-4" />一键导入 {preview.length} 家企业</>}
          </button>
        </div>

        {/* 预览列表 */}
        {loading ? (
          <div className="text-center py-20 text-gray-400">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-blue-400" />
            <p>正在从 Supabase 读取数据…</p>
          </div>
        ) : preview.length === 0 && !result ? (
          <div className="text-center py-20 text-gray-400">
            <CheckCircle className="w-12 h-12 mx-auto mb-3 text-emerald-400" />
            <p className="font-medium">所有人员档案中的企业已全部在 companies 表中，无需导入</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b bg-gray-50 text-xs font-semibold text-gray-500 grid grid-cols-12 gap-2">
              <span className="col-span-5">企业名称</span>
              <span className="col-span-4">推断行业</span>
              <span className="col-span-3">来源人员</span>
            </div>
            <div className="divide-y max-h-[60vh] overflow-y-auto">
              {filtered.map((r, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 px-5 py-3 text-sm hover:bg-gray-50 items-center">
                  <span className="col-span-5 font-medium text-gray-800 truncate" title={r.name}>{r.name}</span>
                  <span className="col-span-4">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${INDUSTRY_COLORS[r.inferredIndustry] ?? 'bg-gray-100 text-gray-500'}`}>
                      {r.inferredIndustry}
                    </span>
                  </span>
                  <span className="col-span-3 text-gray-400 text-xs truncate">{r.source}</span>
                </div>
              ))}
              {filtered.length === 0 && (
                <div className="text-center py-10 text-gray-400">无匹配结果</div>
              )}
            </div>
            <div className="px-5 py-3 border-t bg-gray-50 text-xs text-gray-400">
              显示 {filtered.length} / {preview.length} 条
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
