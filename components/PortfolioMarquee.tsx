'use client'

import { PORTFOLIO_COMPANIES, type PortfolioCompany } from '@/lib/portfolioCompanies'

// 首页"已投资并成功上市"企业展示条：纯展示、无点击交互，后续如果要做智能体/详情页，
// 可以直接在 CompanyChip 上加 onClick，不需要改动整体结构。
function CompanyChip({ company }: { company: PortfolioCompany }) {
  return (
    <div className="group flex shrink-0 items-center gap-4 rounded-2xl border border-white/10 bg-white/5 px-6 py-4 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-white/20 hover:bg-white/10 hover:shadow-lg hover:shadow-purple-500/10">
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <span className="whitespace-nowrap text-base font-semibold text-white">{company.name}</span>
          <span className="whitespace-nowrap rounded-md bg-emerald-500/10 px-1.5 py-0.5 font-mono text-xs text-emerald-400">
            {company.code}
          </span>
        </div>
        <span className="whitespace-nowrap text-xs text-gray-400">
          {company.exchange} · {company.tag}
        </span>
      </div>
    </div>
  )
}

export default function PortfolioMarquee() {
  // 复制一份拼接在后面，配合 translateX(-50%) 动画实现无缝循环滚动
  const items = [...PORTFOLIO_COMPANIES, ...PORTFOLIO_COMPANIES]

  return (
    <section className="relative overflow-hidden py-16 md:py-20">
      <div className="container mb-10 text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-1.5">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
          </span>
          <span className="text-sm text-emerald-300">已有 10 家投资企业成功登陆资本市场</span>
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-white md:text-3xl">
          我们投资，也见证他们上市
        </h2>
      </div>

      <div className="marquee-fade-mask">
        <div className="marquee-track flex w-max animate-marquee-scroll gap-4">
          {items.map((company, i) => (
            <CompanyChip key={`${company.code}-${i}`} company={company} />
          ))}
        </div>
      </div>
    </section>
  )
}
