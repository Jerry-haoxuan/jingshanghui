'use client'

import React from 'react'
import { CompanyData } from '@/lib/dataStore'
import { ArrowDown, ArrowUp, Building2 } from 'lucide-react'

interface SupplierInfo {
  materialName?: string
  materialCategory?: string
  supplierName: string
  industryCategory?: string
  subTitle?: string
  keywords?: string
  keyPerson1?: string
  keyPerson2?: string
  keyPerson3?: string
}

interface CustomerInfo {
  productName?: string
  productCategory?: string
  customerName: string
  industryCategory?: string
  subTitle?: string
  keywords?: string
  keyPerson1?: string
  keyPerson2?: string
  keyPerson3?: string
}

interface SupplyChainDiagramProps {
  company: CompanyData
  suppliers?: string[] | SupplierInfo[]  // 兼容旧格式和新格式
  customers?: string[] | CustomerInfo[]  // 兼容旧格式和新格式
}

export function SupplyChainDiagram({ company, suppliers = [], customers = [] }: SupplyChainDiagramProps) {
  // 将数据标准化为对象数组格式
  const normalizeSuppliers = (data: string[] | SupplierInfo[]): SupplierInfo[] => {
    if (!data || data.length === 0) return []
    return data.map(item => {
      if (typeof item === 'string') {
        // 尝试解析 JSON 字符串
        if (item.startsWith('{')) {
          try {
            const parsed = JSON.parse(item)
            return {
              supplierName: parsed.supplierName || parsed.name || item,
              industryCategory: parsed.industryCategory || '',
              subTitle: parsed.subTitle || '',
              materialName: parsed.materialName || '',
              materialCategory: parsed.materialCategory || '',
              keywords: parsed.keywords || '',
              keyPerson1: parsed.keyPerson1 || '',
              keyPerson2: parsed.keyPerson2 || '',
              keyPerson3: parsed.keyPerson3 || ''
            }
          } catch {
            // 解析失败，当作普通名称
            return { supplierName: item }
          }
        }
        // 普通字符串，当作名称
        return { supplierName: item }
      }
      return item as SupplierInfo
    })
  }

  const normalizeCustomers = (data: string[] | CustomerInfo[]): CustomerInfo[] => {
    if (!data || data.length === 0) return []
    return data.map(item => {
      if (typeof item === 'string') {
        // 尝试解析 JSON 字符串
        if (item.startsWith('{')) {
          try {
            const parsed = JSON.parse(item)
            return {
              customerName: parsed.customerName || parsed.name || item,
              industryCategory: parsed.industryCategory || '',
              subTitle: parsed.subTitle || '',
              productName: parsed.productName || '',
              productCategory: parsed.productCategory || '',
              keywords: parsed.keywords || '',
              keyPerson1: parsed.keyPerson1 || '',
              keyPerson2: parsed.keyPerson2 || '',
              keyPerson3: parsed.keyPerson3 || ''
            }
          } catch {
            // 解析失败，当作普通名称
            return { customerName: item }
          }
        }
        // 普通字符串，当作名称
        return { customerName: item }
      }
      return item as CustomerInfo
    })
  }

  // 使用新的 supplierInfos 和 customerInfos 如果存在，否则使用旧的 suppliers 和 customers
  const supplierData = company.supplierInfos && company.supplierInfos.length > 0 
    ? company.supplierInfos 
    : normalizeSuppliers(suppliers)
  
  const customerData = company.customerInfos && company.customerInfos.length > 0 
    ? company.customerInfos 
    : normalizeCustomers(customers)
  
  // 限制显示数量，保持图谱简洁
  const displaySuppliers = supplierData.slice(0, 6)
  const displayCustomers = customerData.slice(0, 6)
  
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
                className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 hover:bg-blue-100 transition-colors"
              >
                <div className="flex items-center gap-2 mb-1">
                  <Building2 className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  <span className="text-sm font-medium text-blue-900">{supplier.supplierName}</span>
                </div>
                {(supplier.industryCategory || supplier.subTitle) && (
                  <div className="mt-1 pl-6 space-y-0.5">
                    {supplier.industryCategory && (
                      <div className="text-xs text-blue-700">
                        <span className="bg-blue-200 px-2 py-0.5 rounded">
                          {supplier.industryCategory}
                        </span>
                      </div>
                    )}
                    {supplier.subTitle && (
                      <div className="text-xs text-blue-600">
                        {supplier.subTitle}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
            {supplierData.length > 6 && (
              <div className="text-sm text-gray-500 flex items-center">
                ...还有 {supplierData.length - 6} 个供应商
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
                className="bg-orange-50 border border-orange-200 rounded-lg px-4 py-3 hover:bg-orange-100 transition-colors"
              >
                <div className="flex items-center gap-2 mb-1">
                  <Building2 className="w-4 h-4 text-orange-600 flex-shrink-0" />
                  <span className="text-sm font-medium text-orange-900">{customer.customerName}</span>
                </div>
                {(customer.industryCategory || customer.subTitle) && (
                  <div className="mt-1 pl-6 space-y-0.5">
                    {customer.industryCategory && (
                      <div className="text-xs text-orange-700">
                        <span className="bg-orange-200 px-2 py-0.5 rounded">
                          {customer.industryCategory}
                        </span>
                      </div>
                    )}
                    {customer.subTitle && (
                      <div className="text-xs text-orange-600">
                        {customer.subTitle}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
            {customerData.length > 6 && (
              <div className="text-sm text-gray-500 flex items-center">
                ...还有 {customerData.length - 6} 个客户
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
        {(supplierData.length === 0 && customerData.length === 0) && (
          <p className="text-xs text-gray-400 mt-2">
            提示：可通过编辑人员信息添加供应商和客户数据
          </p>
        )}
      </div>
    </div>
  )
} 