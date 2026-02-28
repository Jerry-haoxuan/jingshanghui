'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ChevronLeft,
  Search,
  Users,
  UserPlus,
  UserMinus,
  Loader2,
  Building2,
} from 'lucide-react'
import { getCurrentUser } from '@/lib/userStore'
import { listPeopleFromCloud } from '@/lib/cloudStore'
import { PersonData } from '@/lib/dataStore'
import { isManager } from '@/lib/userRole'
import { deterministicAliasName } from '@/lib/deterministicNameAlias'

export default function BusinessCirclePage() {
  const router = useRouter()
  const [allPeople, setAllPeople] = useState<PersonData[]>([])
  const [friendIds, setFriendIds] = useState<Set<string>>(new Set())
  const [currentPersonId, setCurrentPersonId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'friends' | 'discover'>('friends')

  const displayName = useCallback(
    (person: PersonData) =>
      isManager()
        ? `${person.name}（${deterministicAliasName(person.name)}）`
        : deterministicAliasName(person.name),
    []
  )

  const loadFriends = useCallback(async (personId: string) => {
    const res = await fetch(`/api/friendships?personId=${personId}`)
    const { friends } = await res.json()
    setFriendIds(new Set(friends ?? []))
  }, [])

  useEffect(() => {
    const currentUser = getCurrentUser()
    if (!currentUser) { router.push('/'); return }

    const init = async () => {
      setLoading(true)
      const people = await listPeopleFromCloud()
      const me = people.find(
        p => p.name === currentUser.personName
      )
      if (me) {
        setCurrentPersonId(me.id)
        setAllPeople(people.filter(p => p.id !== me.id))
        await loadFriends(me.id)
      } else {
        setAllPeople(people)
      }
      setLoading(false)
    }
    init()
  }, [loadFriends, router])

  const handleAdd = async (friendId: string) => {
    if (!currentPersonId) return
    setActionLoading(friendId)
    await fetch('/api/friendships', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ personId: currentPersonId, friendId }),
    })
    setFriendIds(prev => new Set([...prev, friendId]))
    setActionLoading(null)
  }

  const handleRemove = async (friendId: string) => {
    if (!currentPersonId || !confirm('确认从商圈移除该好友？')) return
    setActionLoading(friendId)
    await fetch(`/api/friendships?personId=${currentPersonId}&friendId=${friendId}`, {
      method: 'DELETE',
    })
    setFriendIds(prev => {
      const next = new Set(prev)
      next.delete(friendId)
      return next
    })
    setActionLoading(null)
  }

  const friends = allPeople.filter(p => friendIds.has(p.id))
  const nonFriends = allPeople.filter(p => !friendIds.has(p.id))

  const filteredFriends = friends.filter(p => {
    const q = searchQuery.toLowerCase()
    return (
      p.name.toLowerCase().includes(q) ||
      deterministicAliasName(p.name).toLowerCase().includes(q) ||
      p.company.toLowerCase().includes(q)
    )
  })

  const filteredDiscover = nonFriends.filter(p => {
    const q = searchQuery.toLowerCase()
    return (
      p.name.toLowerCase().includes(q) ||
      deterministicAliasName(p.name).toLowerCase().includes(q) ||
      p.company.toLowerCase().includes(q) ||
      (p.industry ?? '').toLowerCase().includes(q)
    )
  })

  const PersonCard = ({ person, isFriend }: { person: PersonData; isFriend: boolean }) => (
    <div className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-100 hover:border-blue-200 hover:shadow-sm transition-all group">
      <div
        className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white font-bold text-lg shrink-0 cursor-pointer"
        onClick={() => router.push(`/person/${person.id}`)}
      >
        {displayName(person).slice(0, 1)}
      </div>
      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => router.push(`/person/${person.id}`)}>
        <p className="font-semibold text-gray-900 truncate">{displayName(person)}</p>
        <p className="text-sm text-gray-500 truncate">{person.position}</p>
        <p className="text-xs text-gray-400 truncate flex items-center gap-1 mt-0.5">
          <Building2 className="w-3 h-3" /> {person.company}
          {person.industry && <span className="text-gray-300">·</span>}
          {person.industry && <span>{person.industry}</span>}
        </p>
      </div>
      <button
        onClick={() => isFriend ? handleRemove(person.id) : handleAdd(person.id)}
        disabled={actionLoading === person.id}
        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all shrink-0 ${
          isFriend
            ? 'bg-gray-100 text-gray-500 hover:bg-red-50 hover:text-red-500 hover:border-red-200'
            : 'bg-blue-600 text-white hover:bg-blue-700'
        }`}
      >
        {actionLoading === person.id ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : isFriend ? (
          <><UserMinus className="w-4 h-4" /> 移出</>
        ) : (
          <><UserPlus className="w-4 h-4" /> 加入商圈</>
        )}
      </button>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航 */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/dashboard" className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
            <ChevronLeft className="w-5 h-5 text-gray-500" />
          </Link>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            <h1 className="font-bold text-gray-900 text-lg">我的商圈</h1>
          </div>
          <span className="ml-1 text-sm text-gray-400">
            {friends.length} 位好友
          </span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        {/* 商圈说明 */}
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-5">
          <p className="text-sm text-blue-700">
            <strong>商圈好友</strong>是你可以开展项目合作的对象。只有互相在商圈中的企业家，才能在「My Project」中建立合作项目。
          </p>
        </div>

        {/* 搜索栏 */}
        <div className="relative mb-5">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="搜索姓名、公司、行业..."
            className="w-full border border-gray-200 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
          />
        </div>

        {/* Tab 切换 */}
        <div className="flex gap-1 bg-white border border-gray-100 rounded-xl p-1 shadow-sm mb-5">
          <button
            onClick={() => setActiveTab('friends')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'friends' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            我的好友 ({friends.length})
          </button>
          <button
            onClick={() => setActiveTab('discover')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'discover' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            发现企业家 ({nonFriends.length})
          </button>
        </div>

        {/* 内容区 */}
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
          </div>
        ) : activeTab === 'friends' ? (
          filteredFriends.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="text-sm">
                {searchQuery ? `未找到匹配的好友` : '还没有商圈好友，去「发现企业家」添加吧'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredFriends.map(p => (
                <PersonCard key={p.id} person={p} isFriend={true} />
              ))}
            </div>
          )
        ) : (
          filteredDiscover.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <p className="text-sm">所有企业家都已在你的商圈中</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredDiscover.map(p => (
                <PersonCard key={p.id} person={p} isFriend={false} />
              ))}
            </div>
          )
        )}
      </main>
    </div>
  )
}
