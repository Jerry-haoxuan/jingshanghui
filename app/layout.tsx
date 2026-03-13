import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '精尚慧 - 产业生态圈基石人',
  description: '连接产业关系，发现商业机会',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <body style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", "Helvetica Neue", Arial, sans-serif' }}>
        {children}
      </body>
    </html>
  )
} 