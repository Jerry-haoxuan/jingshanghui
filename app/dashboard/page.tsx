import { Suspense } from 'react'
import DashboardClient from './DashboardClient'

export default function Dashboard() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-500">加载中...</div>}>
      <DashboardClient />
    </Suspense>
  )
}
