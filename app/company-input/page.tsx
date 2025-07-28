'use client'

import React, { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Upload, Download, Building2, Sparkles, Loader2, Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useDropzone } from 'react-dropzone'
import { AutocompleteInput } from '@/components/AutocompleteInput'
import { industries } from '@/lib/locationData'
import { saveCompanies, getCompanies } from '@/lib/dataStore'

interface SupplierInfo {
  materialName: string
  materialCategory: string
  supplierName: string
}

interface CustomerInfo {
  productName: string
  productCategory: string
  customerName: string
}

interface CompanyFormData {
  name: string
  industry: string
  scale: string
  positioning: string
  value: string
  achievements: string
  demands: string // 新增：企业诉求
  suppliers: string[]
  customers: string[]
  supplierInfos: SupplierInfo[] // 新增：详细供应商信息
  customerInfos: CustomerInfo[] // 新增：详细客户信息
  additionalInfo: string
}

export default function CompanyInput() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [uploadingSuppliers, setUploadingSuppliers] = useState(false)
  const [uploadingCustomers, setUploadingCustomers] = useState(false)
  
  const [formData, setFormData] = useState<CompanyFormData>({
    name: '',
    industry: '',
    scale: '',
    positioning: '',
    value: '',
    achievements: '',
    demands: '', // 新增：企业诉求
    suppliers: [],
    customers: [],
    supplierInfos: [], // 新增：详细供应商信息
    customerInfos: [], // 新增：详细客户信息
    additionalInfo: ''
  })

  // 处理表单输入
  const handleInputChange = (field: keyof CompanyFormData, value: string | string[]) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  // 处理供应商信息变化
  const handleSupplierInfoChange = (index: number, field: keyof SupplierInfo, value: string) => {
    const newSupplierInfos = [...formData.supplierInfos]
    newSupplierInfos[index] = { ...newSupplierInfos[index], [field]: value }
    setFormData(prev => ({ ...prev, supplierInfos: newSupplierInfos }))
  }

  // 添加供应商信息
  const addSupplierInfo = () => {
    setFormData(prev => ({
      ...prev,
      supplierInfos: [...prev.supplierInfos, { materialName: '', materialCategory: '', supplierName: '' }]
    }))
  }

  // 删除供应商信息
  const removeSupplierInfo = (index: number) => {
    if (formData.supplierInfos.length > 1) {
      const newSupplierInfos = formData.supplierInfos.filter((_, i) => i !== index)
      setFormData(prev => ({ ...prev, supplierInfos: newSupplierInfos }))
    }
  }

  // 处理客户信息变化
  const handleCustomerInfoChange = (index: number, field: keyof CustomerInfo, value: string) => {
    const newCustomerInfos = [...formData.customerInfos]
    newCustomerInfos[index] = { ...newCustomerInfos[index], [field]: value }
    setFormData(prev => ({ ...prev, customerInfos: newCustomerInfos }))
  }

  // 添加客户信息
  const addCustomerInfo = () => {
    setFormData(prev => ({
      ...prev,
      customerInfos: [...prev.customerInfos, { productName: '', productCategory: '', customerName: '' }]
    }))
  }

  // 删除客户信息
  const removeCustomerInfo = (index: number) => {
    if (formData.customerInfos.length > 1) {
      const newCustomerInfos = formData.customerInfos.filter((_, i) => i !== index)
      setFormData(prev => ({ ...prev, customerInfos: newCustomerInfos }))
    }
  }

  // 处理供应商Excel上传
  const onDropSuppliers = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0]
      setUploadingSuppliers(true)
      
      try {
        const formDataUpload = new FormData()
        formDataUpload.append('file', file)
        
        const response = await fetch('/api/parse-excel', {
          method: 'POST',
          body: formDataUpload
        })
        
        const result = await response.json()
        
        if (result.success && result.data) {
          if (result.type === 'supplier_customer') {
            // 处理供应商/客户格式
            const supplierNames = result.data.map((row: any) => row.company).filter(Boolean)
            handleInputChange('suppliers', supplierNames)
            alert(`成功导入 ${supplierNames.length} 个供应商`)
          } else {
            // 处理个人信息格式（兼容旧数据）
            const supplierNames = result.data.map((row: any) => 
              row.company || row.企业名称 || row.公司
            ).filter(Boolean)
            handleInputChange('suppliers', supplierNames)
            alert(`成功导入 ${supplierNames.length} 个供应商`)
          }
        } else {
          alert(result.error || '解析Excel文件失败')
        }
      } catch (error) {
        console.error('Excel处理错误:', error)
        alert('处理Excel文件时出错')
      } finally {
        setUploadingSuppliers(false)
      }
    }
  }, [])

  // 处理客户Excel上传
  const onDropCustomers = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0]
      setUploadingCustomers(true)
      
      try {
        const formDataUpload = new FormData()
        formDataUpload.append('file', file)
        
        const response = await fetch('/api/parse-excel', {
          method: 'POST',
          body: formDataUpload
        })
        
        const result = await response.json()
        
        if (result.success && result.data) {
          if (result.type === 'supplier_customer') {
            // 处理供应商/客户格式
            const customerNames = result.data.map((row: any) => row.company).filter(Boolean)
            handleInputChange('customers', customerNames)
            alert(`成功导入 ${customerNames.length} 个客户`)
          } else {
            // 处理个人信息格式（兼容旧数据）
            const customerNames = result.data.map((row: any) => 
              row.company || row.企业名称 || row.公司
            ).filter(Boolean)
            handleInputChange('customers', customerNames)
            alert(`成功导入 ${customerNames.length} 个客户`)
          }
        } else {
          alert(result.error || '解析Excel文件失败')
        }
      } catch (error) {
        console.error('Excel处理错误:', error)
        alert('处理Excel文件时出错')
      } finally {
        setUploadingCustomers(false)
      }
    }
  }, [])

  const suppliersDropzone = useDropzone({
    onDrop: onDropSuppliers,
    accept: {
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
    },
    maxFiles: 1
  })

  const customersDropzone = useDropzone({
    onDrop: onDropCustomers,
    accept: {
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
    },
    maxFiles: 1
  })

  // 处理表单提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name || !formData.industry || !formData.positioning || !formData.value || !formData.achievements || !formData.demands) {
      alert('请填写必要信息（企业名称、行业、定位、价值、成就、企业诉求）')
      return
    }
    
    setLoading(true)
    
    try {
      // 获取现有企业数据
      const companies = getCompanies()
      
      // 创建新企业数据
      const newCompany = {
        id: Date.now().toString(),
        name: formData.name,
        industry: formData.industry,
        scale: formData.scale,
        products: formData.positioning.split('、'), // 将定位转换为产品数组
        positioning: formData.positioning,
        value: formData.value,
        achievements: formData.achievements,
        demands: formData.demands, // 新增：企业诉求
        suppliers: formData.suppliers,
        customers: formData.customers,
        supplierInfos: formData.supplierInfos, // 新增：详细供应商信息
        customerInfos: formData.customerInfos, // 新增：详细客户信息
        additionalInfo: formData.additionalInfo,
        isFollowed: false
      }
      
      // 保存企业数据
      companies.push(newCompany)
      saveCompanies(companies)
      
      alert('企业信息添加成功！')
      router.push('/dashboard')
    } catch (error) {
      console.error('保存企业信息失败:', error)
      alert('保存失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        {/* 返回按钮 */}
        <Button
          variant="ghost"
          className="mb-6"
          onClick={() => router.push('/data-input')}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          返回选择
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-6 h-6" />
              企业信息录入
            </CardTitle>
            <CardDescription>
              请填写企业的核心信息，帮助建立产业生态圈
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* 基本信息 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="name">企业名称 *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="请输入企业名称"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="industry">所属行业 *</Label>
                  <AutocompleteInput
                    id="industry"
                    value={formData.industry}
                    onChange={(value) => handleInputChange('industry', value)}
                    placeholder="请选择或输入行业"
                    suggestions={industries}
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="scale">企业规模</Label>
                <select
                  id="scale"
                  value={formData.scale}
                  onChange={(e) => handleInputChange('scale', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">请选择</option>
                  <option value="1-50人">1-50人</option>
                  <option value="50-100人">50-100人</option>
                  <option value="100-500人">100-500人</option>
                  <option value="500-1000人">500-1000人</option>
                  <option value="1000人以上">1000人以上</option>
                </select>
              </div>

              {/* 核心信息 */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="positioning">
                    1. 企业定位 * 
                    <span className="text-sm text-gray-500 ml-2">（我们是做什么的）</span>
                  </Label>
                  <Textarea
                    id="positioning"
                    value={formData.positioning}
                    onChange={(e) => handleInputChange('positioning', e.target.value)}
                    placeholder="请简要描述企业的主营业务和定位"
                    rows={3}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="value">
                    2. 企业价值 * 
                    <span className="text-sm text-gray-500 ml-2">（为什么选择我们）</span>
                  </Label>
                  <Textarea
                    id="value"
                    value={formData.value}
                    onChange={(e) => handleInputChange('value', e.target.value)}
                    placeholder="请描述企业的核心竞争力和独特价值"
                    rows={3}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="achievements">
                    3. 关键成就 * 
                    <span className="text-sm text-gray-500 ml-2">（证明实力）</span>
                  </Label>
                  <Textarea
                    id="achievements"
                    value={formData.achievements}
                    onChange={(e) => handleInputChange('achievements', e.target.value)}
                    placeholder="请列举企业的重要成就、荣誉或案例"
                    rows={3}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="demands">
                    4. 企业诉求 * 
                    <span className="text-sm text-gray-500 ml-2">（希望获得什么帮助或合作）</span>
                  </Label>
                  <Textarea
                    id="demands"
                    value={formData.demands}
                    onChange={(e) => handleInputChange('demands', e.target.value)}
                    placeholder="请描述企业的具体诉求和希望获得的帮助"
                    rows={3}
                    required
                  />
                </div>
              </div>

              {/* 供应链关系 */}
              <div className="space-y-8">
                {/* 上游供应商 */}
                <div>
                  <Label className="text-lg font-semibold">
                    5. 上游供应商
                  </Label>
                  
                  {/* 直接输入供应商信息 */}
                  <div className="mt-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">直接输入供应商信息：</span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addSupplierInfo}
                        className="flex items-center gap-1"
                      >
                        <Plus className="h-4 w-4" />
                        添加供应商
                      </Button>
                    </div>
                    
                    {formData.supplierInfos.length === 0 && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={addSupplierInfo}
                        className="w-full h-20 border-dashed"
                      >
                        <Plus className="h-6 w-6 mr-2" />
                        点击添加第一个供应商
                      </Button>
                    )}
                    
                    {formData.supplierInfos.map((supplier, index) => (
                      <div key={index} className="p-4 border rounded-lg bg-gray-50">
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-sm font-medium">供应商 {index + 1}</span>
                          {formData.supplierInfos.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeSupplierInfo(index)}
                              className="text-red-600 hover:text-red-800"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div>
                            <Label htmlFor={`supplier-material-${index}`} className="text-xs">原材料名称</Label>
                            <Input
                              id={`supplier-material-${index}`}
                              value={supplier.materialName}
                              onChange={(e) => handleSupplierInfoChange(index, 'materialName', e.target.value)}
                              placeholder="如：钢材、塑料等"
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label htmlFor={`supplier-category-${index}`} className="text-xs">原材料类别</Label>
                            <Input
                              id={`supplier-category-${index}`}
                              value={supplier.materialCategory}
                              onChange={(e) => handleSupplierInfoChange(index, 'materialCategory', e.target.value)}
                              placeholder="如：金属材料、化工原料等"
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label htmlFor={`supplier-name-${index}`} className="text-xs">供应商名称</Label>
                            <Input
                              id={`supplier-name-${index}`}
                              value={supplier.supplierName}
                              onChange={(e) => handleSupplierInfoChange(index, 'supplierName', e.target.value)}
                              placeholder="供应商公司名称"
                              className="mt-1"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Excel 上传 */}
                  <div className="mt-6">
                    <Label className="text-sm font-medium">
                      或上传Excel文件：
                    </Label>
                    <div
                      {...suppliersDropzone.getRootProps()}
                      className={`mt-2 border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
                        ${suppliersDropzone.isDragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}`}
                    >
                      <input {...suppliersDropzone.getInputProps()} />
                      {uploadingSuppliers ? (
                        <div className="flex flex-col items-center">
                          <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
                          <p className="text-sm text-gray-600 mt-2">处理中...</p>
                        </div>
                      ) : (
                        <>
                          <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                          <p className="text-sm text-gray-600">
                            拖拽Excel文件或点击上传
                          </p>
                          {formData.suppliers.length > 0 && (
                            <p className="text-xs text-green-600 mt-2">
                              已导入 {formData.suppliers.length} 个供应商
                            </p>
                          )}
                        </>
                      )}
                    </div>
                    {formData.suppliers.length > 0 && (
                      <div className="mt-2 text-xs text-gray-600">
                        {formData.suppliers.slice(0, 3).join('、')}
                        {formData.suppliers.length > 3 && `等 ${formData.suppliers.length} 个供应商`}
                      </div>
                    )}
                  </div>
                </div>

                {/* 下游客户 */}
                <div>
                  <Label className="text-lg font-semibold">
                    6. 下游客户
                  </Label>
                  
                  {/* 直接输入客户信息 */}
                  <div className="mt-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">直接输入客户信息：</span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addCustomerInfo}
                        className="flex items-center gap-1"
                      >
                        <Plus className="h-4 w-4" />
                        添加客户
                      </Button>
                    </div>
                    
                    {formData.customerInfos.length === 0 && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={addCustomerInfo}
                        className="w-full h-20 border-dashed"
                      >
                        <Plus className="h-6 w-6 mr-2" />
                        点击添加第一个客户
                      </Button>
                    )}
                    
                    {formData.customerInfos.map((customer, index) => (
                      <div key={index} className="p-4 border rounded-lg bg-gray-50">
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-sm font-medium">客户 {index + 1}</span>
                          {formData.customerInfos.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeCustomerInfo(index)}
                              className="text-red-600 hover:text-red-800"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div>
                            <Label htmlFor={`customer-product-${index}`} className="text-xs">产品名称</Label>
                            <Input
                              id={`customer-product-${index}`}
                              value={customer.productName}
                              onChange={(e) => handleCustomerInfoChange(index, 'productName', e.target.value)}
                              placeholder="如：机械设备、电子产品等"
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label htmlFor={`customer-category-${index}`} className="text-xs">产品类别</Label>
                            <Input
                              id={`customer-category-${index}`}
                              value={customer.productCategory}
                              onChange={(e) => handleCustomerInfoChange(index, 'productCategory', e.target.value)}
                              placeholder="如：工业设备、消费电子等"
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label htmlFor={`customer-name-${index}`} className="text-xs">客户名称</Label>
                            <Input
                              id={`customer-name-${index}`}
                              value={customer.customerName}
                              onChange={(e) => handleCustomerInfoChange(index, 'customerName', e.target.value)}
                              placeholder="客户公司名称"
                              className="mt-1"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Excel 上传 */}
                  <div className="mt-6">
                    <Label className="text-sm font-medium">
                      或上传Excel文件：
                    </Label>
                    <div
                      {...customersDropzone.getRootProps()}
                      className={`mt-2 border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
                        ${customersDropzone.isDragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}`}
                    >
                      <input {...customersDropzone.getInputProps()} />
                      {uploadingCustomers ? (
                        <div className="flex flex-col items-center">
                          <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
                          <p className="text-sm text-gray-600 mt-2">处理中...</p>
                        </div>
                      ) : (
                        <>
                          <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                          <p className="text-sm text-gray-600">
                            拖拽Excel文件或点击上传
                          </p>
                          {formData.customers.length > 0 && (
                            <p className="text-xs text-green-600 mt-2">
                              已导入 {formData.customers.length} 个客户
                            </p>
                          )}
                        </>
                      )}
                    </div>
                    {formData.customers.length > 0 && (
                      <div className="mt-2 text-xs text-gray-600">
                        {formData.customers.slice(0, 3).join('、')}
                        {formData.customers.length > 3 && `等 ${formData.customers.length} 个客户`}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 其他信息 */}
              <div>
                <Label htmlFor="additionalInfo">其他补充信息</Label>
                <Textarea
                  id="additionalInfo"
                  value={formData.additionalInfo}
                  onChange={(e) => handleInputChange('additionalInfo', e.target.value)}
                  placeholder="其他需要补充的信息"
                  rows={3}
                />
              </div>

              {/* 提交按钮 */}
              <div className="flex justify-end space-x-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/data-input')}
                >
                  取消
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      保存中...
                    </>
                  ) : (
                    '保存企业信息'
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* 模板下载提示 */}
        <div className="mt-4 text-center space-y-2">
          <p className="text-sm text-gray-600 mb-3">Excel模板下载：</p>
          <div className="flex justify-center gap-4 flex-wrap">
            <a
              href="/api/download-supplier-template"
              download
              className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              <Download className="h-4 w-4" />
              供应商模板
            </a>
            <a
              href="/api/download-customer-template"
              download
              className="text-sm text-green-600 hover:text-green-800 flex items-center gap-1"
            >
              <Download className="h-4 w-4" />
              客户模板
            </a>
          </div>
        </div>
      </div>
    </div>
  )
} 