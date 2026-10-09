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
        <footer className="w-full border-t border-gray-200 bg-white py-4 text-center text-xs text-gray-500">
          <span>© 2026 苏州福润科技有限公司</span>
          <span className="mx-2">|</span>
          <a
            href="https://beian.miit.gov.cn/"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-gray-700 hover:underline"
          >
            苏ICP备15000868号-2
          </a>
        </footer>
      </body>
    </html>
  )
} 