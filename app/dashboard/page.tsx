'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { ChevronLeft, ChevronRight, Search, User, Building2, Star, Trash2, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getPeople, getCompanies, savePeople, saveCompanies, PersonData, CompanyData } from '@/lib/dataStore'
import { deterministicAliasName, forceGetAliasName } from '@/lib/deterministicNameAlias'
import { isManager } from '@/lib/userRole'

export default function Dashboard() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [activeTab, setActiveTab] = useState('people')
  const [searchQuery, setSearchQuery] = useState('')
  const [people, setPeople] = useState<PersonData[]>([])
  const [companies, setCompanies] = useState<CompanyData[]>([])


  // 加载数据和处理查询参数
  useEffect(() => {
    // 确保在客户端环境中加载数据
    if (typeof window === 'undefined') return

    const loadData = () => {
      const peopleData = getPeople()
      const companiesData = getCompanies()
      
      console.log('Dashboard 加载数据:', peopleData.length, '个人物,', companiesData.length, '个企业')
      
      setPeople(peopleData)
      setCompanies(companiesData)
    }

    // 延迟加载确保localStorage可用
    const timer = setTimeout(loadData, 50)
    
    // 处理tab查询参数
    const tab = searchParams.get('tab')
    if (tab === 'companies') {
      setActiveTab('companies')
    }

    return () => clearTimeout(timer)
  }, [searchParams])

  // 过滤搜索结果
  const filteredPeople = people.filter(person => {
    const displayName = deterministicAliasName(person.name)
    return displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      person.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      person.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  })

  const filteredCompanies = companies.filter(company =>
    company.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    company.industry.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // 获取关注列表
  const followedPeople = people.filter(p => p.isFollowed)
  const followedCompanies = companies.filter(c => c.isFollowed)

  // 切换关注状态
  const toggleFollow = (type: 'person' | 'company', id: string) => {
    if (type === 'person') {
      const updatedPeople = people.map(p =>
        p.id === id ? { ...p, isFollowed: !p.isFollowed } : p
      )
      setPeople(updatedPeople)
      savePeople(updatedPeople)
    } else {
      const updatedCompanies = companies.map(c =>
        c.id === id ? { ...c, isFollowed: !c.isFollowed } : c
      )
      setCompanies(updatedCompanies)
      saveCompanies(updatedCompanies)
    }
  }

  // 删除项目
  const deleteItem = (type: 'person' | 'company', id: string) => {
    if (confirm('确定要删除吗？')) {
      if (type === 'person') {
        const updatedPeople = people.filter(p => p.id !== id)
        setPeople(updatedPeople)
        savePeople(updatedPeople)
      } else {
        const updatedCompanies = companies.filter(c => c.id !== id)
        setCompanies(updatedCompanies)
        saveCompanies(updatedCompanies)
      }
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* 左侧导航栏 */}
      <div className={`${isSidebarCollapsed ? 'w-16' : 'w-64'} bg-white shadow-lg transition-all duration-300`}>
        <div className="p-4">
          <div className="flex items-center justify-between mb-8">
            {!isSidebarCollapsed && (
              <Link href="/" className="text-2xl font-bold text-blue-600">
                精尚慧
              </Link>
            )}
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              {isSidebarCollapsed ? <ChevronRight /> : <ChevronLeft />}
            </button>
          </div>

          <nav className="space-y-2">
            <Link
              href="/dashboard"
              className="flex items-center space-x-3 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg"
            >
              <User className="h-5 w-5" />
              {!isSidebarCollapsed && <span>智能关系网</span>}
            </Link>
            <Link
              href="/data-input"
              className="flex items-center space-x-3 px-3 py-2 hover:bg-gray-100 rounded-lg"
            >
              <Building2 className="h-5 w-5" />
              {!isSidebarCollapsed && <span>信息录入</span>}
            </Link>
            <Link
              href="/ai-assistant"
              className="flex items-center space-x-3 px-3 py-2 hover:bg-gray-100 rounded-lg"
            >
              <MessageSquare className="h-5 w-5" />
              {!isSidebarCollapsed && <span>你想找谁</span>}
            </Link>
          </nav>

          {!isSidebarCollapsed && (
            <div className="mt-8 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold mb-3">我关注的列表</h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {followedPeople.map(person => (
                  <div
                    key={person.id}
                    className="p-2 bg-white rounded cursor-pointer hover:shadow-sm"
                    onClick={() => router.push(`/person/${person.id}`)}
                  >
                    <div className="font-medium text-sm">
                      {isManager() 
                        ? `${person.name}（${deterministicAliasName(person.name)}）` 
                        : deterministicAliasName(person.name)}
                    </div>
                    <div className="text-xs text-gray-500">{person.company}</div>
                  </div>
                ))}
                {followedCompanies.map(company => (
                  <div
                    key={company.id}
                    className="p-2 bg-white rounded cursor-pointer hover:shadow-sm"
                    onClick={() => router.push(`/company/${company.id}?from=companies`)}
                  >
                    <div className="font-medium text-sm">{company.name}</div>
                    <div className="text-xs text-gray-500">{company.industry}</div>
                  </div>
                ))}
                {followedPeople.length === 0 && followedCompanies.length === 0 && (
                  <div className="text-sm text-gray-400 text-center py-4">
                    暂无关注
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 右侧内容区 */}
      <div className="flex-1 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold text-gray-800">智能关系网络</h1>
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <Input
                  type="text"
                  placeholder="搜索人物或企业..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 w-80"
                />
              </div>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6">
              <TabsTrigger value="people">人物</TabsTrigger>
              <TabsTrigger value="companies">企业</TabsTrigger>
            </TabsList>

            <TabsContent value="people">
              {people.length === 0 ? (
                <div className="text-center py-8 text-gray-500">暂无人物数据</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredPeople.map(person => (
                    <div
                      key={person.id}
                      className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow p-6 cursor-pointer"
                      onClick={() => router.push(`/person/${person.id}`)}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                            <User className="h-6 w-6 text-blue-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-lg">
                              {isManager() 
                                ? `${person.name}（${forceGetAliasName(person.name)}）` 
                                : deterministicAliasName(person.name)}
                            </h3>
                            <p className="text-sm text-gray-500">{person.position}</p>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant={person.isFollowed ? "default" : "outline"}
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleFollow('person', person.id)
                            }}
                          >
                            <Star className={`h-4 w-4 ${person.isFollowed ? 'fill-current' : ''}`} />
                          </Button>
                          {isManager() && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation()
                                deleteItem('person', person.id)
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 mb-1">{person.company}</p>
                      {person.industry && (
                        <p className="text-xs text-gray-500 mb-1">行业: {person.industry}</p>
                      )}
                      {person.currentCity && (
                        <p className="text-xs text-gray-500 mb-3">现居: {person.currentCity}</p>
                      )}
                      <div className="flex flex-wrap gap-2">
                        {person.tags.map((tag, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                  {filteredPeople.length === 0 && (
                    <div className="col-span-3 text-center py-12 text-gray-400">
                      暂无人物数据
                    </div>
                  )}
                </div>
              )}
            </TabsContent>

            <TabsContent value="companies">
              {companies.length === 0 ? (
                <div className="text-center py-8 text-gray-500">暂无企业数据</div>
              ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredCompanies.map(company => (
                  <div
                    key={company.id}
                    className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow p-6 cursor-pointer"
                    onClick={() => router.push(`/company/${company.id}?from=companies`)}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
                          <Building2 className="h-6 w-6 text-green-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg">{company.name}</h3>
                          <p className="text-sm text-gray-500">{company.industry}</p>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant={company.isFollowed ? "default" : "outline"}
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleFollow('company', company.id)
                          }}
                        >
                          <Star className={`h-4 w-4 ${company.isFollowed ? 'fill-current' : ''}`} />
                        </Button>
                        {isManager() && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation()
                              deleteItem('company', company.id)
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">规模: {company.scale}</p>
                    <div className="text-sm text-gray-500">
                      主要产品: {company.products.slice(0, 2).join(', ')}
                      {company.products.length > 2 && '...'}
                    </div>
                  </div>
                ))}
                {filteredCompanies.length === 0 && (
                  <div className="col-span-3 text-center py-12 text-gray-400">
                    暂无企业数据
                  </div>
                )}
              </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

    </div>
  )
} 