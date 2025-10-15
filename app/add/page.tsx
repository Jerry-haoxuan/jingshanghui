'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Save, Loader2, Plus, X } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { DEEPSEEK_CONFIG } from '@/lib/config'
import { AutocompleteInput } from '@/components/AutocompleteInput'
import { cities, universities, industries } from '@/lib/locationData'
import { addPerson, getCompanies, addOrUpdateCompany } from '@/lib/dataStore'
import { updateRelationshipNetwork } from '@/lib/relationshipManager'

interface CompanyPosition {
  company: string
  position: string
}

interface Education {
  level: '本科' | '硕士' | '博士' | 'EMBA'
  school: string
  major?: string
  year?: string
}

interface SupplierInfo {
  materialName: string
  materialCategory: string
  supplierName: string
  keywords: string
  keyPerson1: string
  keyPerson2: string
  keyPerson3: string
}

interface CustomerInfo {
  productName: string
  productCategory: string
  customerName: string
  keywords: string
  keyPerson1: string
  keyPerson2: string
  keyPerson3: string
}

// 党派选项
const politicalParties = [
  '中国共产党',
  '中国国民党革命委员会',
  '中国民主同盟',
  '中国民主建国会',
  '中国民主促进会',
  '中国农工民主党',
  '中国致公党',
  '九三学社',
  '台湾民主自治同盟',
  '无党派人士',
  '群众'
]

export default function AddPerson() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [aiProcessing, setAiProcessing] = useState(false)
  
  const FORM_SAVE_KEY = 'add_person_form_draft'
  
  const [formData, setFormData] = useState({
    name: '',
    birthDate: '',
    phones: [''],
    email: '',
    hometown: '',
    currentCity: '',
    homeAddress: '',
    companyAddress: '',
    industry: '',
    politicalParty: '',
    socialOrganizations: [''],
    hobbies: '',
    skills: '',
    expectations: '',
    workHistory: '',
    additionalInfo: '',
    companyIndustry: '',
    companyScale: '',
    companyPositioning: '',
    companyValue: '',
    companyAchievements: '',
    companyDemands: '',
    companySuppliers: '',
    companyCustomers: ''
  })
  
  const [companyPositions, setCompanyPositions] = useState<CompanyPosition[]>([
    { company: '', position: '' }
  ])
  
  const [educations, setEducations] = useState<Education[]>([
    { level: '本科', school: '', major: '', year: '' }
  ])
  
  const [supplierInfos, setSupplierInfos] = useState<SupplierInfo[]>([])
  const [customerInfos, setCustomerInfos] = useState<CustomerInfo[]>([])

  // 保存表单数据
  const saveFormData = useCallback(() => {
    if (typeof window !== 'undefined') {
      const dataToSave = {
        formData,
        companyPositions,
        educations,
        supplierInfos,
        customerInfos,
        timestamp: Date.now()
      }
      localStorage.setItem(FORM_SAVE_KEY, JSON.stringify(dataToSave))
    }
  }, [formData, companyPositions, educations, supplierInfos, customerInfos])

  // 恢复表单数据
  const restoreFormData = useCallback(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedData = localStorage.getItem(FORM_SAVE_KEY)
        if (savedData) {
          const parsed = JSON.parse(savedData)
          const hasContent = parsed.formData.name || 
                           parsed.companyPositions?.[0]?.company || 
                           parsed.formData.phones?.[0] ||
                           parsed.educations?.length > 0 ||
                           Object.values(parsed.formData).some((value: any) => 
                             value && value !== '' && 
                             !(Array.isArray(value) && (value.length === 0 || (value.length === 1 && value[0] === '')))
                           )
          
          if (hasContent) {
            setFormData(parsed.formData || formData)
            setCompanyPositions(parsed.companyPositions || companyPositions)
            setEducations(parsed.educations || [])
            setSupplierInfos(parsed.supplierInfos || [])
            setCustomerInfos(parsed.customerInfos || [])
            return true
          }
        }
      } catch (error) {
        console.error('恢复表单数据失败:', error)
      }
    }
    return false
  }, [])

  // 清除保存的表单数据
  const clearSavedFormData = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(FORM_SAVE_KEY)
    }
  }, [])

  // 页面加载时恢复表单数据
  useEffect(() => {
    const restored = restoreFormData()
    if (restored) {
      setTimeout(() => {
        alert('检测到未完成的表单，已自动恢复您之前的输入内容。')
      }, 500)
    }
  }, [restoreFormData])

  // 自动保存表单数据（防抖）
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      saveFormData()
    }, 1000)

    return () => clearTimeout(timeoutId)
  }, [formData, companyPositions, educations, supplierInfos, customerInfos, saveFormData])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleAutocompleteChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handlePhoneChange = (index: number, value: string) => {
    const newPhones = [...formData.phones]
    newPhones[index] = value
    setFormData(prev => ({ ...prev, phones: newPhones }))
  }

  const addPhone = () => {
    setFormData(prev => ({ ...prev, phones: [...prev.phones, ''] }))
  }

  const removePhone = (index: number) => {
    if (formData.phones.length > 1) {
      const newPhones = formData.phones.filter((_, i) => i !== index)
      setFormData(prev => ({ ...prev, phones: newPhones }))
    }
  }

  const handleSocialOrgChange = (index: number, value: string) => {
    const newOrgs = [...formData.socialOrganizations]
    newOrgs[index] = value
    setFormData(prev => ({ ...prev, socialOrganizations: newOrgs }))
  }

  const addSocialOrg = () => {
    setFormData(prev => ({ ...prev, socialOrganizations: [...prev.socialOrganizations, ''] }))
  }

  const removeSocialOrg = (index: number) => {
    if (formData.socialOrganizations.length > 1) {
      const newOrgs = formData.socialOrganizations.filter((_, i) => i !== index)
      setFormData(prev => ({ ...prev, socialOrganizations: newOrgs }))
    }
  }

  const handleCompanyPositionChange = (index: number, field: 'company' | 'position', value: string) => {
    const newCompanyPositions = [...companyPositions]
    newCompanyPositions[index][field] = value
    setCompanyPositions(newCompanyPositions)
  }

  const addCompanyPosition = () => {
    setCompanyPositions([...companyPositions, { company: '', position: '' }])
  }

  const removeCompanyPosition = (index: number) => {
    if (companyPositions.length > 1) {
      setCompanyPositions(companyPositions.filter((_, i) => i !== index))
    }
  }

  const handleEducationChange = (index: number, field: keyof Education, value: string) => {
    const newEducations = [...educations]
    newEducations[index] = { ...newEducations[index], [field]: value }
    setEducations(newEducations)
  }

  const addEducation = (level: Education['level']) => {
    setEducations([...educations, { level, school: '', major: '', year: '' }])
  }

  const removeEducation = (index: number) => {
    if (educations.length > 1) {
      setEducations(educations.filter((_, i) => i !== index))
    }
  }

  const handleSubmit = async () => {
    // 验证必填字段
    if (
      !formData.name ||
      companyPositions[0].company === '' ||
      formData.phones[0] === '' ||
      !formData.companyIndustry
    ) {
      alert('请填写所有必填字段（姓名、公司、电话、所属行业）')
      return
    }
    
    setLoading(true)
    setAiProcessing(true)
    
    try {
      // 整理数据
      const personData = {
        name: formData.name,
        birthDate: formData.birthDate,
        company: companyPositions[0].company,
        position: companyPositions[0].position,
        allCompanies: companyPositions,
        phones: formData.phones.filter(phone => phone.trim() !== ''),
        phone: formData.phones[0],
        email: formData.email,
        hometown: formData.hometown,
        currentCity: formData.currentCity,
        homeAddress: formData.homeAddress,
        companyAddress: formData.companyAddress,
        industry: formData.companyIndustry || formData.industry,
        politicalParty: formData.politicalParty,
        socialOrganizations: formData.socialOrganizations.filter(org => org.trim() !== ''),
        hobbies: formData.hobbies,
        skills: formData.skills,
        expectations: formData.expectations,
        educations: educations.filter(edu => edu.school.trim() !== ''),
        school: educations[0]?.school || '',
        workHistory: formData.workHistory,
        additionalInfo: formData.additionalInfo
      }
      
      // 保存人物数据
      const newPerson = addPerson(personData)
      try {
        const { markPersonAsMyCard } = await import('@/lib/dataStore')
        markPersonAsMyCard(newPerson.id)
      } catch (_) {}

      // 如果填写了企业信息，创建/更新企业数据
      try {
        const mainCompany = companyPositions[0]?.company?.trim()
        if (mainCompany) {
          const suppliers = supplierInfos.map(s => s.supplierName).filter(Boolean)
          const customers = customerInfos.map(c => c.customerName).filter(Boolean)
          const products = (formData.companyPositioning || '').split(/[\n、,，]/).map(s => s.trim()).filter(Boolean)
          const companyData = {
            name: mainCompany,
            industry: formData.companyIndustry || formData.industry || '待分类',
            scale: formData.companyScale || '',
            products,
            positioning: formData.companyPositioning || undefined,
            value: formData.companyValue || undefined,
            achievements: formData.companyAchievements || undefined,
            demands: formData.companyDemands || undefined,
            suppliers,
            customers,
            additionalInfo: ''
          }
          addOrUpdateCompany(companyData as any)
        }
      } catch (e) {
        console.warn('同步企业信息失败（跳过，不阻塞人物保存）', e)
      }
      
      // 使用AI自动梳理关系网络
      await updateRelationshipNetwork(newPerson)
      
      setAiProcessing(false)
      setLoading(false)
      
      // 清除保存的表单数据
      clearSavedFormData()
      
      alert('人物信息已成功保存！AI已自动分析并更新关系网络。')
      router.push('/dashboard')
      
    } catch (error) {
      console.error('保存数据错误:', error)
      setAiProcessing(false)
      setLoading(false)
      alert('保存失败，请重试')
    }
  }

  // AI处理中界面
  if (aiProcessing) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-96">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center space-y-4">
              <div className="relative">
                <Loader2 className="h-16 w-16 text-purple-500 animate-spin" />
              </div>
              <h3 className="text-xl font-semibold">慧慧AI处理中</h3>
              <p className="text-gray-600 text-center">
                正在智能分析数据，提取关键信息并构建关系网络...
              </p>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div className="bg-gradient-to-r from-purple-500 to-blue-500 h-2.5 rounded-full animate-pulse" style={{ width: '75%' }}></div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container max-w-4xl py-8">
        <Link href="/dashboard">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            返回
          </Button>
        </Link>
        
        <Card>
          <CardHeader>
            <CardTitle>添加新成员</CardTitle>
            <CardDescription>请填写成员基本信息和企业信息</CardDescription>
          </CardHeader>
          
          <CardContent>
            <Tabs defaultValue="manual">
              <TabsList className="grid w-full grid-cols-1">
                <TabsTrigger value="manual">手动录入</TabsTrigger>
              </TabsList>

              <TabsContent value="manual" className="space-y-6">
                {/* 基本信息 */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">基本信息</h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">姓名 *</Label>
                      <Input
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        placeholder="请输入姓名"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="birthDate">出生年月日</Label>
                      <Input
                        id="birthDate"
                        name="birthDate"
                        type="date"
                        value={formData.birthDate}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="politicalParty">党派</Label>
                      <select
                        id="politicalParty"
                        name="politicalParty"
                        value={formData.politicalParty}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border rounded-md"
                      >
                        <option value="">请选择</option>
                        {politicalParties.map(party => (
                          <option key={party} value={party}>{party}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* 工作信息 */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">工作信息</h3>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label>公司职位信息 *</Label>
                      <Button type="button" variant="outline" size="sm" onClick={addCompanyPosition}>
                        <Plus className="h-4 w-4 mr-1" />
                        添加公司
                      </Button>
                    </div>
                    {companyPositions.map((cp, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          value={cp.company}
                          onChange={(e) => handleCompanyPositionChange(index, 'company', e.target.value)}
                          placeholder="公司名称"
                          required={index === 0}
                          className="flex-1"
                        />
                        <Input
                          value={cp.position}
                          onChange={(e) => handleCompanyPositionChange(index, 'position', e.target.value)}
                          placeholder="职位"
                          className="flex-1"
                        />
                        {companyPositions.length > 1 && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeCompanyPosition(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* 企业信息 */}
                  <div className="space-y-4 mt-6">
                    <h4 className="text-md font-medium text-gray-700">企业信息</h4>
                    <p className="text-sm text-gray-500">为防止企业多名重名，请按照企查查报告的公司名进行填写</p>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="companyIndustry">所属行业 *</Label>
                        <AutocompleteInput
                          id="companyIndustry"
                          value={formData.companyIndustry}
                          onChange={(value) => handleAutocompleteChange('companyIndustry', value)}
                          placeholder="请选择或输入企业所属行业"
                          suggestions={industries}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="companyScale">企业规模</Label>
                        <select
                          id="companyScale"
                          name="companyScale"
                          value={formData.companyScale}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border rounded-md"
                        >
                          <option value="">请选择企业规模</option>
                          <option value="1-10人">1-10人</option>
                          <option value="11-50人">11-50人</option>
                          <option value="51-100人">51-100人</option>
                          <option value="101-500人">101-500人</option>
                          <option value="501-1000人">501-1000人</option>
                          <option value="1000人以上">1000人以上</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="companyPositioning">企业定位（我们是做什么的）</Label>
                        <Textarea
                          id="companyPositioning"
                          name="companyPositioning"
                          value={formData.companyPositioning}
                          onChange={handleInputChange}
                          placeholder="简要描述企业定位，可用'、'分隔主要产品/服务"
                          rows={3}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="companyValue">企业价值（为什么选择我们）</Label>
                        <Textarea
                          id="companyValue"
                          name="companyValue"
                          value={formData.companyValue}
                          onChange={handleInputChange}
                          placeholder="企业核心价值/差异化优势"
                          rows={3}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="companyAchievements">关键成就（证明实力）</Label>
                        <Textarea
                          id="companyAchievements"
                          name="companyAchievements"
                          value={formData.companyAchievements}
                          onChange={handleInputChange}
                          placeholder="里程碑、奖项、典型客户等"
                          rows={3}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="companyDemands">企业诉求</Label>
                        <Textarea
                          id="companyDemands"
                          name="companyDemands"
                          value={formData.companyDemands}
                          onChange={handleInputChange}
                          placeholder="当前最需要的资源/合作/资金等"
                          rows={3}
                        />
                      </div>
                    </div>

                    {/* 供应商信息 */}
                    <div className="mt-6">
                      <div className="flex items-center justify-between mb-4">
                        <Label className="text-md font-medium">上游供应商</Label>
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="sm" 
                          onClick={() => setSupplierInfos(prev => [...prev, { 
                            materialName: '', 
                            materialCategory: '', 
                            supplierName: '', 
                            keywords: '', 
                            keyPerson1: '', 
                            keyPerson2: '', 
                            keyPerson3: '' 
                          }])}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          添加供应商
                        </Button>
                      </div>
                      
                      {supplierInfos.map((supplier, index) => (
                        <div key={index} className="p-4 border rounded-lg bg-gray-50 mb-3">
                          <div className="flex justify-between items-center mb-3">
                            <span className="text-sm font-medium">供应商 {index + 1}</span>
                            <Button 
                              type="button" 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => setSupplierInfos(prev => prev.filter((_, i) => i !== index))}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <Input
                              value={supplier.materialName}
                              onChange={(e) => setSupplierInfos(prev => prev.map((s, i) => 
                                i === index ? { ...s, materialName: e.target.value } : s
                              ))}
                              placeholder="采购类别"
                            />
                            <Input
                              value={supplier.supplierName}
                              onChange={(e) => setSupplierInfos(prev => prev.map((s, i) => 
                                i === index ? { ...s, supplierName: e.target.value } : s
                              ))}
                              placeholder="供应商名称"
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* 客户信息 */}
                    <div className="mt-6">
                      <div className="flex items-center justify-between mb-4">
                        <Label className="text-md font-medium">下游客户</Label>
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="sm" 
                          onClick={() => setCustomerInfos(prev => [...prev, { 
                            productName: '', 
                            productCategory: '', 
                            customerName: '', 
                            keywords: '', 
                            keyPerson1: '', 
                            keyPerson2: '', 
                            keyPerson3: '' 
                          }])}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          添加客户
                        </Button>
                      </div>
                      
                      {customerInfos.map((customer, index) => (
                        <div key={index} className="p-4 border rounded-lg bg-gray-50 mb-3">
                          <div className="flex justify-between items-center mb-3">
                            <span className="text-sm font-medium">客户 {index + 1}</span>
                            <Button 
                              type="button" 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => setCustomerInfos(prev => prev.filter((_, i) => i !== index))}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <Input
                              value={customer.productName}
                              onChange={(e) => setCustomerInfos(prev => prev.map((c, i) => 
                                i === index ? { ...c, productName: e.target.value } : c
                              ))}
                              placeholder="采购类别"
                            />
                            <Input
                              value={customer.customerName}
                              onChange={(e) => setCustomerInfos(prev => prev.map((c, i) => 
                                i === index ? { ...c, customerName: e.target.value } : c
                              ))}
                              placeholder="客户名称"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>


                {/* 联系方式 */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">联系方式</h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label>电话 *</Label>
                        <Button type="button" variant="outline" size="sm" onClick={addPhone}>
                          <Plus className="h-4 w-4 mr-1" />
                          添加电话
                        </Button>
                      </div>
                      {formData.phones.map((phone, index) => (
                        <div key={index} className="flex gap-2 items-center">
                          <Input
                            type="tel"
                            value={phone}
                            onChange={(e) => handlePhoneChange(index, e.target.value)}
                            placeholder="请输入电话号码"
                            required={index === 0}
                            className="flex-1"
                          />
                          {formData.phones.length > 1 && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => removePhone(index)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">邮箱</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        placeholder="可选"
                      />
                    </div>
                  </div>
                </div>

                {/* 地址信息 */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">地址信息</h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="hometown">籍贯</Label>
                      <AutocompleteInput
                        id="hometown"
                        value={formData.hometown}
                        onChange={(value) => handleAutocompleteChange('hometown', value)}
                        placeholder="请输入籍贯"
                        suggestions={cities}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="currentCity">现居地</Label>
                      <AutocompleteInput
                        id="currentCity"
                        value={formData.currentCity}
                        onChange={(value) => handleAutocompleteChange('currentCity', value)}
                        placeholder="请输入现居地"
                        suggestions={cities}
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="homeAddress">家庭住址</Label>
                      <Input
                        id="homeAddress"
                        name="homeAddress"
                        value={formData.homeAddress}
                        onChange={handleInputChange}
                        placeholder="详细地址"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="companyAddress">公司地址</Label>
                      <Input
                        id="companyAddress"
                        name="companyAddress"
                        value={formData.companyAddress}
                        onChange={handleInputChange}
                        placeholder="详细地址"
                      />
                    </div>
                  </div>
                </div>

                {/* 教育背景 */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">教育背景</h3>
                  
                  {educations.map((edu, index) => (
                    <div key={index} className="space-y-2 p-4 border rounded">
                      <div className="flex justify-between items-center">
                        <Label>{edu.level}</Label>
                        {educations.length > 1 && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeEducation(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <AutocompleteInput
                          id={`education-school-${index}`}
                          value={edu.school}
                          onChange={(value) => handleEducationChange(index, 'school', value)}
                          placeholder="学校名称"
                          suggestions={universities}
                        />
                        <Input
                          value={edu.major || ''}
                          onChange={(e) => handleEducationChange(index, 'major', e.target.value)}
                          placeholder="专业"
                        />
                        <Input
                          value={edu.year || ''}
                          onChange={(e) => handleEducationChange(index, 'year', e.target.value)}
                          placeholder="毕业年份"
                        />
                      </div>
                    </div>
                  ))}
                  
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => addEducation('本科')}>
                      + 本科
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => addEducation('硕士')}>
                      + 硕士
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => addEducation('博士')}>
                      + 博士
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => addEducation('EMBA')}>
                      + EMBA
                    </Button>
                  </div>
                </div>

                {/* 其他信息 */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">其他信息</h3>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label>社会组织身份</Label>
                      <Button type="button" variant="outline" size="sm" onClick={addSocialOrg}>
                        <Plus className="h-4 w-4 mr-1" />
                        添加身份
                      </Button>
                    </div>
                    {formData.socialOrganizations.map((org, index) => (
                      <div key={index} className="flex gap-2 items-center">
                        <Input
                          value={org}
                          onChange={(e) => handleSocialOrgChange(index, e.target.value)}
                          placeholder="请输入社会组织身份"
                          className="flex-1"
                        />
                        {formData.socialOrganizations.length > 1 && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeSocialOrg(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="hobbies">个人爱好</Label>
                      <Textarea
                        id="hobbies"
                        name="hobbies"
                        value={formData.hobbies}
                        onChange={handleInputChange}
                        placeholder="请输入个人爱好"
                        rows={3}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="skills">擅长能力</Label>
                      <Textarea
                        id="skills"
                        name="skills"
                        value={formData.skills}
                        onChange={handleInputChange}
                        placeholder="请输入擅长的能力"
                        rows={3}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="expectations">您想从精尚慧中获得什么</Label>
                    <Textarea
                      id="expectations"
                      name="expectations"
                      value={formData.expectations}
                      onChange={handleInputChange}
                      placeholder="请描述您希望通过精尚慧平台获得什么帮助或资源"
                      rows={3}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="workHistory">工作履历</Label>
                    <Textarea
                      id="workHistory"
                      name="workHistory"
                      value={formData.workHistory}
                      onChange={handleInputChange}
                      placeholder="请输入工作履历"
                      rows={4}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="additionalInfo">其他信息</Label>
                    <Textarea
                      id="additionalInfo"
                      name="additionalInfo"
                      value={formData.additionalInfo}
                      onChange={handleInputChange}
                      placeholder="请输入其他补充信息"
                      rows={3}
                    />
                  </div>
                </div>

                <Button 
                  onClick={handleSubmit}
                  disabled={loading || !formData.name || companyPositions[0].company === '' || formData.phones[0] === ''}
                  className="w-full"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      慧慧AI分析中...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      保存并生成关系图谱
                    </>
                  )}
                </Button>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}