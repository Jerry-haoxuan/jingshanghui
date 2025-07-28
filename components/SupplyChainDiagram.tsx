'use client'

import React from 'react'
import { CompanyData } from '@/lib/dataStore'
import { ArrowDown, ArrowUp, Building2 } from 'lucide-react'

interface SupplyChainDiagramProps {
  company: CompanyData
  suppliers: string[]
  customers: string[]
}

export function SupplyChainDiagram({ company, suppliers, customers }: SupplyChainDiagramProps) {
  // 限制显示数量，保持图谱简洁
  const displaySuppliers = suppliers.slice(0, 6)
  const displayCustomers = customers.slice(0, 6)
  
  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-8">
      {/* 上游供应商 */}
      <div className="w-full mb-8">
        <h4 className="text-sm font-semibold text-gray-600 mb-4 text-center">上游供应商</h4>
        {displaySuppliers.length > 0 ? (
          <div className="flex flex-wrap justify-center gap-3 mb-4">
            {displaySuppliers.map((supplier, index) => (
              <div
                key={index}
                className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 flex items-center gap-2"
              >
                <Building2 className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">{supplier}</span>
              </div>
            ))}
            {suppliers.length > 6 && (
              <div className="text-sm text-gray-500 flex items-center">
                ...还有 {suppliers.length - 6} 个供应商
              </div>
            )}
          </div>
        ) : (
          <p className="text-center text-gray-400 text-sm mb-4">暂无供应商数据</p>
        )}
        
        {/* 向下箭头 */}
        {displaySuppliers.length > 0 && (
          <div className="flex justify-center">
            <ArrowDown className="w-8 h-8 text-gray-400" />
          </div>
        )}
      </div>

      {/* 核心企业 */}
      <div className="relative mb-8">
        <div className="bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg px-8 py-6 shadow-lg transform scale-110">
          <div className="flex items-center justify-center gap-3">
            <Building2 className="w-8 h-8" />
            <div>
              <h3 className="text-xl font-bold">{company.name}</h3>
              <p className="text-sm opacity-90">{company.industry}</p>
            </div>
          </div>
        </div>
        
        {/* 装饰性光环 */}
        <div className="absolute inset-0 bg-green-400 rounded-lg opacity-20 blur-xl -z-10"></div>
      </div>

      {/* 向下箭头 */}
      {displayCustomers.length > 0 && (
        <div className="flex justify-center mb-4">
          <ArrowDown className="w-8 h-8 text-gray-400" />
        </div>
      )}

      {/* 下游客户 */}
      <div className="w-full">
        <h4 className="text-sm font-semibold text-gray-600 mb-4 text-center">下游客户</h4>
        {displayCustomers.length > 0 ? (
          <div className="flex flex-wrap justify-center gap-3">
            {displayCustomers.map((customer, index) => (
              <div
                key={index}
                className="bg-orange-50 border border-orange-200 rounded-lg px-4 py-2 flex items-center gap-2"
              >
                <Building2 className="w-4 h-4 text-orange-600" />
                <span className="text-sm font-medium text-orange-800">{customer}</span>
              </div>
            ))}
            {customers.length > 6 && (
              <div className="text-sm text-gray-500 flex items-center">
                ...还有 {customers.length - 6} 个客户
              </div>
            )}
          </div>
        ) : (
          <p className="text-center text-gray-400 text-sm">暂无客户数据</p>
        )}
      </div>

      {/* 说明文字 */}
      <div className="mt-8 text-center">
        <p className="text-xs text-gray-500">
          该图谱展示了 {company.name} 的供应链上下游关系
        </p>
        {(suppliers.length === 0 && customers.length === 0) && (
          <p className="text-xs text-gray-400 mt-2">
            提示：可通过上传Excel文件导入供应商和客户数据
          </p>
        )}
      </div>
    </div>
  )
} 