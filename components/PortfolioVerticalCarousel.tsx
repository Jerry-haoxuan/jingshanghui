'use client'

import { useEffect, useRef, type PointerEvent as ReactPointerEvent } from 'react'
import { PORTFOLIO_COMPANIES } from '@/lib/portfolioCompanies'

const SLOT_HEIGHT = 120 // 每行之间的垂直间距（像素），留足空隙避免相邻行文字重叠
const VISIBLE_RANGE = 4 // 圆环距离超过这个值的公司直接透明隐藏，减少无谓渲染开销
const SPEED = 0.12 // 每秒自动滚动的槽位数，数值越小滚动越慢、越丝滑
const N = PORTFOLIO_COMPANIES.length

const normalize = (x: number) => ((x % N) + N) % N

// 生态商圈页的"已上市企业"竖向滚动展示：一横排一家公司（名称+代码+成就标签），
// 中间一行大而清晰，上下相邻行半隐身。自动持续滚动，同时支持鼠标/触摸按住上下拖动，
// 拖动结束后自动滚动会从当前位置继续。用 rAF 直接操作 DOM 而非 React state 刷新，
// 避免每帧触发组件重渲染，保证动画足够流畅。
export default function PortfolioVerticalCarousel() {
  const itemRefs = useRef<(HTMLDivElement | null)[]>([])
  const posRef = useRef(0)
  const draggingRef = useRef(false)
  const dragStartYRef = useRef(0)
  const dragStartPosRef = useRef(0)
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    let raf = 0
    let last = performance.now()

    const tick = (now: number) => {
      const dt = (now - last) / 1000
      last = now
      // 自动滚动持续进行，仅在用户主动拖动时才暂停（由拖动直接控制位置）
      if (!draggingRef.current) {
        posRef.current = normalize(posRef.current + SPEED * dt)
      }
      const pos = posRef.current

      itemRefs.current.forEach((el, i) => {
        if (!el) return
        // 环形最短距离：让最后一项和第一项也能无缝相邻，滚动没有断点
        let diff = i - pos
        if (diff > N / 2) diff -= N
        if (diff < -N / 2) diff += N

        const absDiff = Math.abs(diff)
        // 中间一行完全清晰，相邻行"半隐身"，再远快速淡出
        const opacity = absDiff < VISIBLE_RANGE ? Math.max(0, 1 - absDiff * 0.42) : 0
        const scale = Math.max(0.6, 1 - absDiff * 0.16)
        const blur = Math.min(3, absDiff * 1.2)
        const y = diff * SLOT_HEIGHT

        el.style.transform = `translateY(-50%) translateY(${y}px) scale(${scale})`
        el.style.opacity = String(opacity)
        el.style.filter = blur > 0.15 ? `blur(${blur}px)` : 'none'
        el.style.zIndex = String(100 - Math.round(absDiff * 10))
      })

      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  const handlePointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    draggingRef.current = true
    dragStartYRef.current = e.clientY
    dragStartPosRef.current = posRef.current
    containerRef.current?.setPointerCapture(e.pointerId)
  }

  const handlePointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return
    const deltaY = e.clientY - dragStartYRef.current
    // 手指/鼠标往上移动 => 内容往上滚动，即位置往前推进
    posRef.current = normalize(dragStartPosRef.current - deltaY / SLOT_HEIGHT)
  }

  const endDrag = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return
    draggingRef.current = false
    containerRef.current?.releasePointerCapture(e.pointerId)
  }

  return (
    // 单一底板面板：撑满内容区，边框保持完整；淡出遮罩只加在内层文字容器上
    <div
      ref={containerRef}
      className="relative h-[78vh] min-h-[560px] w-full cursor-grab select-none touch-none overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm active:cursor-grabbing"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      <div className="absolute inset-0 [-webkit-mask-image:linear-gradient(to_bottom,transparent,black_14%,black_86%,transparent)] [mask-image:linear-gradient(to_bottom,transparent,black_14%,black_86%,transparent)]">
        {PORTFOLIO_COMPANIES.map((company, i) => (
          <div
            key={company.code}
            ref={(el) => { itemRefs.current[i] = el }}
            className="absolute left-0 right-0 top-1/2 flex items-baseline justify-center gap-5 whitespace-nowrap will-change-transform"
          >
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-5xl font-bold text-transparent">
              {company.name}
            </span>
            <span className="rounded-lg bg-blue-50 px-3 py-1 font-mono text-xl font-medium text-blue-500">
              {company.code}
            </span>
            <span className="text-2xl text-gray-400">{company.tag}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
