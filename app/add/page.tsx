'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Upload, ArrowLeft, Save, Loader2, Plus, X } from 'lucide-react'
import { useDropzone } from 'react-dropzone'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { DEEPSEEK_CONFIG } from '@/lib/config'
import { AutocompleteInput } from '@/components/AutocompleteInput'
import { cities, universities, industries } from '@/lib/locationData'
import { addPerson, getCompanies, saveCompanies, addOrUpdateCompany } from '@/lib/dataStore'
import { updateRelationshipNetwork } from '@/lib/relationshipManager'

interface BatchData {
  id: string
  name: string
  company: string
  position: string
  companies: Array<{company: string, position: string}>
  allCompanies: Array<{company: string, position: string}>
  phones: string[]
  phone: string
  email: string
  school: string
  hometown: string
  currentCity: string
  industry: string
  products: string // 保留以兼容现有数据结构
  workHistory: string
  additionalInfo: string
  politicalParty: string
  socialOrganizations: string[]
  educations: Array<{level: string, school: string, major: string, year: string}>
  hobbies: string
  skills: string
  expectations: string
  isValid: boolean
}

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

// 供应链信息结构（从企业录入页迁移）
interface SupplierInfo {
  materialName: string
  materialCategory: string
  supplierName: string
  keywords: string // 关键词（非必填）
  keyPerson1: string // 关键人物1（非必填）
  keyPerson2: string // 关键人物2（非必填）
  keyPerson3: string // 关键人物3（非必填）
}

interface CustomerInfo {
  productName: string
  productCategory: string
  customerName: string
  keywords: string // 关键词（非必填）
  keyPerson1: string // 关键人物1（非必填）
  keyPerson2: string // 关键人物2（非必填）
  keyPerson3: string // 关键人物3（非必填）
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
  
  // 自动保存的key
  const FORM_SAVE_KEY = 'add_person_form_draft'
  
  const [formData, setFormData] = useState({
    name: '',
    birthDate: '', // 新增：出生年月日
    phones: [''], // 改为数组支持多个电话
    email: '',
    hometown: '',
    currentCity: '',
    homeAddress: '', // 新增：家庭详细位置
    companyAddress: '', // 新增：公司住址
    industry: '',
    politicalParty: '', // 新增：党派
    socialOrganizations: [''], // 新增：社会组织身份（支持多个）
    hobbies: '', // 新增：个人爱好
    skills: '', // 新增：擅长能力
    expectations: '', // 新增：想从精尚慧获得什么
    workHistory: '',
    additionalInfo: '',
    // 以下为企业信息字段（融合进个人录入下的公司信息）
    companyIndustry: '',
    companyScale: '',
    companyPositioning: '',
    companyValue: '',
    companyAchievements: '',
    companyDemands: '',
    companySuppliers: '', // 使用"、/，/,"或换行分隔
    companyCustomers: '' // 使用"、/，/,"或换行分隔
  })
  
  // 公司职位数组（支持多个）
  const [companyPositions, setCompanyPositions] = useState<CompanyPosition[]>([
    { company: '', position: '' }
  ])

  // 自动保存表单数据
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
  }, [formData, companyPositions])

  // 恢复表单数据
  const restoreFormData = useCallback(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedData = localStorage.getItem(FORM_SAVE_KEY)
        if (savedData) {
          const parsed = JSON.parse(savedData)
          // 检查数据是否不为空（有实际输入内容）
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
            return true // 表示已恢复数据
          }
        }
      } catch (error) {
        console.error('恢复表单数据失败:', error)
      }
    }
    return false // 表示没有恢复数据
  }, [])

  // 清除保存的表单数据
  const clearSavedFormData = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(FORM_SAVE_KEY)
    }
  }, [])
  
  // 教育背景数组
  const [educations, setEducations] = useState<Education[]>([
    { level: '本科', school: '', major: '', year: '' }
  ])
  
  // 已移除上传文件功能
  // 上下游供应链信息（可选）
  const [supplierInfos, setSupplierInfos] = useState<SupplierInfo[]>([])
  const [customerInfos, setCustomerInfos] = useState<CustomerInfo[]>([])
  const [uploadingSuppliers, setUploadingSuppliers] = useState(false)
  const [uploadingCustomers, setUploadingCustomers] = useState(false)
  
  // 页面加载时恢复表单数据
  useEffect(() => {
    const restored = restoreFormData()
    if (restored) {
      // 如果恢复了数据，显示提示
      setTimeout(() => {
        alert('检测到未完成的表单，已自动恢复您之前的输入内容。')
      }, 500)
    }
  }, [restoreFormData])

  // 自动保存表单数据（防抖）
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      saveFormData()
    }, 1000) // 1秒后保存

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

  // 处理电话号码数组变化
  const handlePhoneChange = (index: number, value: string) => {
    const newPhones = [...formData.phones]
    newPhones[index] = value
    setFormData(prev => ({ ...prev, phones: newPhones }))
  }

  // 添加电话号码
  const addPhone = () => {
    setFormData(prev => ({ ...prev, phones: [...prev.phones, ''] }))
  }

  // 删除电话号码
  const removePhone = (index: number) => {
    if (formData.phones.length > 1) {
      const newPhones = formData.phones.filter((_, i) => i !== index)
      setFormData(prev => ({ ...prev, phones: newPhones }))
    }
  }

  // 处理社会组织身份变化
  const handleSocialOrgChange = (index: number, value: string) => {
    const newOrgs = [...formData.socialOrganizations]
    newOrgs[index] = value
    setFormData(prev => ({ ...prev, socialOrganizations: newOrgs }))
  }

  // 添加社会组织身份
  const addSocialOrg = () => {
    setFormData(prev => ({ ...prev, socialOrganizations: [...prev.socialOrganizations, ''] }))
  }

  // 删除社会组织身份
  const removeSocialOrg = (index: number) => {
    if (formData.socialOrganizations.length > 1) {
      const newOrgs = formData.socialOrganizations.filter((_, i) => i !== index)
      setFormData(prev => ({ ...prev, socialOrganizations: newOrgs }))
    }
  }

  // 处理公司职位变化
  const handleCompanyPositionChange = (index: number, field: 'company' | 'position', value: string) => {
    const newCompanyPositions = [...companyPositions]
    newCompanyPositions[index][field] = value
    setCompanyPositions(newCompanyPositions)
  }

  // 添加公司职位
  const addCompanyPosition = () => {
    setCompanyPositions([...companyPositions, { company: '', position: '' }])
  }

  // 删除公司职位
  const removeCompanyPosition = (index: number) => {
    if (companyPositions.length > 1) {
      setCompanyPositions(companyPositions.filter((_, i) => i !== index))
    }
  }

  // 处理教育背景变化
  const handleEducationChange = (index: number, field: keyof Education, value: string) => {
    const newEducations = [...educations]
    newEducations[index] = { ...newEducations[index], [field]: value }
    setEducations(newEducations)
  }

  // 添加教育背景
  const addEducation = (level: Education['level']) => {
    setEducations([...educations, { level, school: '', major: '', year: '' }])
  }

  // 删除教育背景
  const removeEducation = (index: number) => {
    if (educations.length > 1) {
      setEducations(educations.filter((_, i) => i !== index))
    }
  }

  // 调用DeepSeek API处理文本（备用功能）
  const callDeepSeekAPI = async (prompt: string) => {
    // 如果没有配置API密钥，返回模拟数据
    if (!DEEPSEEK_CONFIG.apiKey) {
      console.log('DeepSeek API未配置，使用本地处理')
      return null
    }

    try {
      const response = await fetch(`${DEEPSEEK_CONFIG.apiUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${DEEPSEEK_CONFIG.apiKey}`
        },
        body: JSON.stringify({
          model: DEEPSEEK_CONFIG.model,
          messages: [
            {
              role: 'system',
              content: '你是一个专业的信息提取助手，需要从文本中提取人物的基本信息、教育背景、工作经历等信息。'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 1000
        })
      })

      if (!response.ok) {
        throw new Error('API调用失败')
      }

      const data = await response.json()
      return data.choices[0].message.content
    } catch (error) {
      console.error('DeepSeek API错误:', error)
      return null
    }
  }

  const handleSubmit = async () => {
    // 验证必填字段（含企业信息）
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
        company: companyPositions[0].company, // 主要公司
        position: companyPositions[0].position, // 主要职位
        allCompanies: companyPositions, // 所有公司职位
        phones: formData.phones.filter(phone => phone.trim() !== ''),
        phone: formData.phones[0], // 主要电话
        email: formData.email,
        hometown: formData.hometown,
        currentCity: formData.currentCity,
        homeAddress: formData.homeAddress, // 家庭详细位置
        companyAddress: formData.companyAddress, // 公司住址
        industry: formData.companyIndustry || formData.industry,
        politicalParty: formData.politicalParty,
        socialOrganizations: formData.socialOrganizations.filter(org => org.trim() !== ''),
        hobbies: formData.hobbies,
        skills: formData.skills,
        expectations: formData.expectations,
        educations: educations.filter(edu => edu.school.trim() !== ''),
        school: educations[0]?.school || '', // 主要学校（兼容性）
        workHistory: formData.workHistory,
        additionalInfo: formData.additionalInfo
      }
      
      // 1. 保存人物数据到 dataStore
      const newPerson = addPerson(personData)
      try {
        const { markPersonAsMyCard } = await import('@/lib/dataStore')
        markPersonAsMyCard(newPerson.id)
      } catch (_) {}

      // 1.1 如果填写了企业信息，则创建/更新企业数据
      try {
        const mainCompany = companyPositions[0]?.company?.trim()
        if (mainCompany) {
          const companies = getCompanies()
          const idx = companies.findIndex(c => c.name === mainCompany)
          const suppliers = supplierInfos.map(s => s.supplierName).filter(Boolean)
          const customers = customerInfos.map(c => c.customerName).filter(Boolean)
          const products = (formData.companyPositioning || '').split(/[\n、,，]/).map(s => s.trim()).filter(Boolean)
          const base = {
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
          // 使用智能添加或更新企业功能，避免重复创建
          addOrUpdateCompany(base as any)
        }
      } catch (e) {
        console.warn('同步企业信息失败（跳过，不阻塞人物保存）', e)
      }
      
      // 2. 使用AI自动梳理关系网络
      await updateRelationshipNetwork(newPerson)
      
      setAiProcessing(false)
      setLoading(false)
      
      // 清除保存的表单数据
      clearSavedFormData()
      
      // 成功保存后提示用户
      alert('人物信息已成功保存！AI已自动分析并更新关系网络。')
      router.push('/dashboard')
      
    } catch (error) {
      console.error('保存数据错误:', error)
      setAiProcessing(false)
      setLoading(false)
      alert('保存失败，请重试')
    }
  }

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      /* 上传功能已移除，忽略文件 */
    }
  }, [])

  // 已移除供应商/客户Excel上传功能

  // 取消批量导入
  const handleBatchCancel = () => {
    /* 批量导入已移除 */
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

  // 批量导入视图已移除

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container max-w-4xl py-8">
        {/* 返回按钮 */}
        <Link href="/dashboard">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" />
            返回控制台
          </Button>
        </Link>

        <Card>
          <CardHeader>
            <CardTitle>添加新朋友</CardTitle>
            <CardDescription>
              通过填写表单或上传简历/Excel来添加新的人脉信息，慧慧AI将智能处理并生成关系图谱
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="form" className="w-full">
              <TabsList className="grid w-full grid-cols-1">
                <TabsTrigger value="form">手动填写</TabsTrigger>
              </TabsList>

              {/* 表单模式 */}
              <TabsContent value="form" className="space-y-6">
                {/* 基本信息 */}
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

                {/* 工作信息 - 公司和职位组合 */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>工作信息 *</Label>
                    <Button type="button" variant="outline" size="sm" onClick={addCompanyPosition}>
                      <Plus className="h-4 w-4 mr-1" />
                      添加公司
                    </Button>
                  </div>
                  {companyPositions.map((cp, index) => (
                    <div key={index} className="flex gap-2 items-end">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor={`company-${index}`}>公司 {index === 0 ? '*' : ''}</Label>
                          {index === 0 && (
                            <span className="text-xs text-gray-500">为防止企业多名重名，请按照企查查报备的公司名进行填写</span>
                          )}
                        </div>
                        <Input
                          id={`company-${index}`}
                          value={cp.company}
                          onChange={(e) => handleCompanyPositionChange(index, 'company', e.target.value)}
                          placeholder="请输入公司名称"
                          required={index === 0}
                        />
                      </div>
                      <div className="flex-1 space-y-2">
                        <Label htmlFor={`position-${index}`}>职位</Label>
                        <Input
                          id={`position-${index}`}
                          value={cp.position}
                          onChange={(e) => handleCompanyPositionChange(index, 'position', e.target.value)}
                          placeholder="请输入职位"
                        />
                      </div>
                      {companyPositions.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeCompanyPosition(index)}
                          className="mb-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                {/* 党派 */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="politicalParty">党派</Label>
                    <select
                      id="politicalParty"
                      name="politicalParty"
                      value={formData.politicalParty}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">请选择党派</option>
                      {politicalParties.map((party) => (
                        <option key={party} value={party}>{party}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 企业信息（融合） */}
                <div className="space-y-4">
                  <Label>企业信息</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="companyIndustry">所属行业</Label>
                      <AutocompleteInput
                        id="companyIndustry"
                        value={formData.companyIndustry}
                        onChange={(value) => setFormData(prev => ({ ...prev, companyIndustry: value }))}
                        placeholder="请选择或输入企业所属行业"
                        suggestions={industries}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="companyScale">企业规模</Label>
                      <select
                        id="companyScale"
                        value={formData.companyScale}
                        onChange={(e) => setFormData(prev => ({ ...prev, companyScale: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">请选择企业规模</option>
                        <option value="0-50人">0-50人</option>
                        <option value="50-100人">50-100人</option>
                        <option value="100-500人">100-500人</option>
                        <option value="500-1000人">500-1000人</option>
                        <option value="1000人以上">1000人以上</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="companyPositioning">企业定位（我们是做什么的）</Label>
                      <Textarea
                        id="companyPositioning"
                        value={formData.companyPositioning}
                        onChange={(e) => setFormData(prev => ({ ...prev, companyPositioning: e.target.value }))}
                        placeholder="简要描述企业定位，可用 '、' 分隔主要产品/服务"
                        
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="companyValue">企业价值（为什么选择我们）</Label>
                      <Textarea
                        id="companyValue"
                        value={formData.companyValue}
                        onChange={(e) => setFormData(prev => ({ ...prev, companyValue: e.target.value }))}
                        placeholder="企业核心价值/差异化优势"
                        
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="companyAchievements">关键成就（证明实力）</Label>
                      <Textarea
                        id="companyAchievements"
                        value={formData.companyAchievements}
                        onChange={(e) => setFormData(prev => ({ ...prev, companyAchievements: e.target.value }))}
                        placeholder="里程碑、奖项、典型客户等"
                        
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="companyDemands">企业诉求</Label>
                      <Textarea
                        id="companyDemands"
                        value={formData.companyDemands}
                        onChange={(e) => setFormData(prev => ({ ...prev, companyDemands: e.target.value }))}
                        placeholder="当前最需要的资源/合作/资金等"
                        
                      />
                    </div>
                  </div>

                  {/* 供应链关系（迁移自企业录入页） */}
                  <div className="space-y-8">
                    {/* 上游供应商 */}
                    <div>
                      <Label className="text-lg font-semibold">5. 上游供应商</Label>
                      <div className="mt-4 space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">直接输入供应商信息：</span>
                          <Button type="button" variant="outline" size="sm" onClick={() => setSupplierInfos(prev => [...prev, { materialName: '', materialCategory: '', supplierName: '', keywords: '', keyPerson1: '', keyPerson2: '', keyPerson3: '' }])} className="flex items-center gap-1">
                            <Plus className="h-4 w-4" /> 添加供应商
                          </Button>
                        </div>
                        {supplierInfos.length === 0 && (
                          <Button type="button" variant="outline" onClick={() => setSupplierInfos(prev => [...prev, { materialName: '', materialCategory: '', supplierName: '', keywords: '', keyPerson1: '', keyPerson2: '', keyPerson3: '' }])} className="w-full h-20 border-dashed">
                            <Plus className="h-6 w-6 mr-2" /> 点击添加第一个供应商
                          </Button>
                        )}
                        {supplierInfos.map((supplier, index) => (
                          <div key={index} className="p-4 border rounded-lg bg-gray-50">
                            <div className="flex justify-between items-center mb-3">
                              <span className="text-sm font-medium">供应商 {index + 1}</span>
                              {supplierInfos.length > 1 && (
                                <Button type="button" variant="ghost" size="sm" onClick={() => setSupplierInfos(prev => prev.filter((_, i) => i !== index))} className="text-red-600 hover:text-red-800">
                                  <X className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                            <div className="space-y-3">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                  <Label htmlFor={`supplier-material-${index}`} className="text-xs">采购类别</Label>
                                  <Input id={`supplier-material-${index}`} value={supplier.materialName} onChange={(e) => setSupplierInfos(prev => prev.map((s, i) => i === index ? { ...s, materialName: e.target.value } : s))} placeholder="如：钢材、塑料、金属材料等" className="mt-1" />
                                </div>
                                <div>
                                  <Label htmlFor={`supplier-name-${index}`} className="text-xs">供应商名称</Label>
                                  <Input id={`supplier-name-${index}`} value={supplier.supplierName} onChange={(e) => setSupplierInfos(prev => prev.map((s, i) => i === index ? { ...s, supplierName: e.target.value } : s))} placeholder="供应商公司名称" className="mt-1" />
                                </div>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                <div>
                                  <Label htmlFor={`supplier-keywords-${index}`} className="text-xs">关键词 <span className="text-gray-400">(可选)</span></Label>
                                  <Input id={`supplier-keywords-${index}`} value={supplier.keywords} onChange={(e) => setSupplierInfos(prev => prev.map((s, i) => i === index ? { ...s, keywords: e.target.value } : s))} placeholder="如：优质、环保等" className="mt-1" />
                                </div>
                                <div>
                                  <Label htmlFor={`supplier-person1-${index}`} className="text-xs">关键人物1 <span className="text-gray-400">(可选)</span></Label>
                                  <Input id={`supplier-person1-${index}`} value={supplier.keyPerson1} onChange={(e) => setSupplierInfos(prev => prev.map((s, i) => i === index ? { ...s, keyPerson1: e.target.value } : s))} placeholder="负责人姓名" className="mt-1" />
                                </div>
                                <div>
                                  <Label htmlFor={`supplier-person2-${index}`} className="text-xs">关键人物2 <span className="text-gray-400">(可选)</span></Label>
                                  <Input id={`supplier-person2-${index}`} value={supplier.keyPerson2} onChange={(e) => setSupplierInfos(prev => prev.map((s, i) => i === index ? { ...s, keyPerson2: e.target.value } : s))} placeholder="联系人姓名" className="mt-1" />
                                </div>
                                <div>
                                  <Label htmlFor={`supplier-person3-${index}`} className="text-xs">关键人物3 <span className="text-gray-400">(可选)</span></Label>
                                  <Input id={`supplier-person3-${index}`} value={supplier.keyPerson3} onChange={(e) => setSupplierInfos(prev => prev.map((s, i) => i === index ? { ...s, keyPerson3: e.target.value } : s))} placeholder="其他关键人" className="mt-1" />
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      {/* Excel 上传功能已移除 */}
                    </div>

                    {/* 下游客户 */}
                    <div>
                      <Label className="text-lg font-semibold">6. 下游客户</Label>
                      <div className="mt-4 space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">直接输入客户信息：</span>
                          <Button type="button" variant="outline" size="sm" onClick={() => setCustomerInfos(prev => [...prev, { productName: '', productCategory: '', customerName: '', keywords: '', keyPerson1: '', keyPerson2: '', keyPerson3: '' }])} className="flex items-center gap-1">
                            <Plus className="h-4 w-4" /> 添加客户
                          </Button>
                        </div>
                        {customerInfos.length === 0 && (
                          <Button type="button" variant="outline" onClick={() => setCustomerInfos(prev => [...prev, { productName: '', productCategory: '', customerName: '', keywords: '', keyPerson1: '', keyPerson2: '', keyPerson3: '' }])} className="w-full h-20 border-dashed">
                            <Plus className="h-6 w-6 mr-2" /> 点击添加第一个客户
                          </Button>
                        )}
                        {customerInfos.map((customer, index) => (
                          <div key={index} className="p-4 border rounded-lg bg-gray-50">
                            <div className="flex justify-between items-center mb-3">
                              <span className="text-sm font-medium">客户 {index + 1}</span>
                              {customerInfos.length > 1 && (
                                <Button type="button" variant="ghost" size="sm" onClick={() => setCustomerInfos(prev => prev.filter((_, i) => i !== index))} className="text-red-600 hover:text-red-800">
                                  <X className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                            <div className="space-y-3">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                  <Label htmlFor={`customer-product-${index}`} className="text-xs">采购类别</Label>
                                  <Input id={`customer-product-${index}`} value={customer.productName} onChange={(e) => setCustomerInfos(prev => prev.map((c, i) => i === index ? { ...c, productName: e.target.value } : c))} placeholder="如：机械设备、电子产品等" className="mt-1" />
                                </div>
                                <div>
                                  <Label htmlFor={`customer-name-${index}`} className="text-xs">客户名称</Label>
                                  <Input id={`customer-name-${index}`} value={customer.customerName} onChange={(e) => setCustomerInfos(prev => prev.map((c, i) => i === index ? { ...c, customerName: e.target.value } : c))} placeholder="客户公司名称" className="mt-1" />
                                </div>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                <div>
                                  <Label htmlFor={`customer-keywords-${index}`} className="text-xs">关键词 <span className="text-gray-400">(可选)</span></Label>
                                  <Input id={`customer-keywords-${index}`} value={customer.keywords} onChange={(e) => setCustomerInfos(prev => prev.map((c, i) => i === index ? { ...c, keywords: e.target.value } : c))} placeholder="如：高端、定制等" className="mt-1" />
                                </div>
                                <div>
                                  <Label htmlFor={`customer-person1-${index}`} className="text-xs">关键人物1 <span className="text-gray-400">(可选)</span></Label>
                                  <Input id={`customer-person1-${index}`} value={customer.keyPerson1} onChange={(e) => setCustomerInfos(prev => prev.map((c, i) => i === index ? { ...c, keyPerson1: e.target.value } : c))} placeholder="负责人姓名" className="mt-1" />
                                </div>
                                <div>
                                  <Label htmlFor={`customer-person2-${index}`} className="text-xs">关键人物2 <span className="text-gray-400">(可选)</span></Label>
                                  <Input id={`customer-person2-${index}`} value={customer.keyPerson2} onChange={(e) => setCustomerInfos(prev => prev.map((c, i) => i === index ? { ...c, keyPerson2: e.target.value } : c))} placeholder="联系人姓名" className="mt-1" />
                                </div>
                                <div>
                                  <Label htmlFor={`customer-person3-${index}`} className="text-xs">关键人物3 <span className="text-gray-400">(可选)</span></Label>
                                  <Input id={`customer-person3-${index}`} value={customer.keyPerson3} onChange={(e) => setCustomerInfos(prev => prev.map((c, i) => i === index ? { ...c, keyPerson3: e.target.value } : c))} placeholder="其他关键人" className="mt-1" />
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      {/* Excel 上传功能已移除 */}
                    </div>
                  </div>
                </div>

                {/* 社会组织身份 */}
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

                {/* 联系方式 */}
                <div className="grid grid-cols-2 gap-4">
                  {/* 电话 - 支持多个 */}
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

                {/* 地域信息 */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="currentCity">现居地</Label>
                    <AutocompleteInput
                      id="currentCity"
                      value={formData.currentCity}
                      onChange={(value) => handleAutocompleteChange('currentCity', value)}
                      placeholder="请输入现居城市"
                      suggestions={cities}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hometown">家乡</Label>
                    <AutocompleteInput
                      id="hometown"
                      value={formData.hometown}
                      onChange={(value) => handleAutocompleteChange('hometown', value)}
                      placeholder="请输入家乡"
                      suggestions={cities}
                    />
                  </div>
                </div>

                {/* 详细地址信息 */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="homeAddress">家庭详细位置 <span className="text-gray-400 text-sm">(可选)</span></Label>
                    <Input
                      id="homeAddress"
                      name="homeAddress"
                      value={formData.homeAddress}
                      onChange={handleInputChange}
                      placeholder="请输入家庭详细地址"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="companyAddress">公司住址 <span className="text-gray-400 text-sm">(可选)</span></Label>
                    <Input
                      id="companyAddress"
                      name="companyAddress"
                      value={formData.companyAddress}
                      onChange={handleInputChange}
                      placeholder="请输入公司详细地址"
                    />
                  </div>
                </div>

                {/* 教育背景 - 分层级 */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>教育背景</Label>
                    <div className="flex gap-2">
                      {!educations.some(e => e.level === '硕士') && (
                        <Button type="button" variant="outline" size="sm" onClick={() => addEducation('硕士')}>
                          <Plus className="h-4 w-4 mr-1" />
                          硕士
                        </Button>
                      )}
                      {!educations.some(e => e.level === '博士') && (
                        <Button type="button" variant="outline" size="sm" onClick={() => addEducation('博士')}>
                          <Plus className="h-4 w-4 mr-1" />
                          博士
                        </Button>
                      )}
                      {!educations.some(e => e.level === 'EMBA') && (
                        <Button type="button" variant="outline" size="sm" onClick={() => addEducation('EMBA')}>
                          <Plus className="h-4 w-4 mr-1" />
                          EMBA
                        </Button>
                      )}
                    </div>
                  </div>
                  {educations.map((edu, index) => (
                    <div key={index} className="p-4 border border-gray-200 rounded-lg space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          {edu.level}
                        </span>
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
                                             <div className="grid grid-cols-2 gap-3">
                         <AutocompleteInput
                           id={`school-${index}`}
                           value={edu.school}
                           onChange={(value) => handleEducationChange(index, 'school', value)}
                           placeholder="请输入院校名称"
                           suggestions={universities}
                         />
                        <Input
                          value={edu.major || ''}
                          onChange={(e) => handleEducationChange(index, 'major', e.target.value)}
                          placeholder="专业"
                        />
                      </div>
                      <Input
                        value={edu.year || ''}
                        onChange={(e) => handleEducationChange(index, 'year', e.target.value)}
                        placeholder="毕业年份"
                      />
                    </div>
                  ))}
                </div>

                {/* 个人特长和爱好 */}
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

                {/* 期望和履历 */}
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

              {/* 上传模式（已移除） */}
              {/**
               * 上传模式移除
               */}
                {/* Excel解析Loading覆盖层 */}
                {loading && (
                  <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center">
                    <div className="bg-white rounded-2xl p-8 shadow-2xl max-w-sm w-full mx-4">
                      <div className="text-center space-y-6">
                        {/* 动画图标 */}
                        <div className="relative">
                          <div className="w-20 h-20 mx-auto bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                            {/* File icon removed */}
                          </div>
                          {/* 旋转圆环 */}
                          <div className="absolute inset-0 w-20 h-20 mx-auto">
                            <div className="w-full h-full border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin"></div>
                          </div>
                          {/* 脉冲效果 */}
                          <div className="absolute inset-0 w-20 h-20 mx-auto">
                            <div className="w-full h-full bg-blue-400 rounded-full opacity-30 animate-ping"></div>
                          </div>
                        </div>
                        
                        {/* 文字描述 */}
                        <div className="space-y-2">
                          <h3 className="text-lg font-semibold text-gray-900">慧慧AI解析中</h3>
                          <p className="text-sm text-gray-600">正在智能解析您的Excel文件...</p>
                        </div>
                        
                        {/* 进度指示器 */}
                        <div className="space-y-2">
                          <div className="flex justify-between text-xs text-gray-500">
                            <span>正在处理</span>
                            <span>请稍候</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full animate-pulse" style={{width: '60%'}}></div>
                          </div>
                        </div>
                        
                        {/* 提示信息 */}
                        <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
                          {/* Sparkles icon removed */}
                          <span>AI正在分析多个公司和职位信息</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* 上传说明已移除 */}

                {/* 上传容器已移除 */}

                {/* 上传按钮已移除 */}

                {/* 解析后的表单预览 */}
                {false && (
                  <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                    <h3 className="font-medium">AI解析结果（可编辑）：</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">姓名：</span> {formData.name}
                      </div>
                      <div>
                        <span className="text-gray-600">公司：</span> {companyPositions[0]?.company}
                      </div>
                      <div>
                        <span className="text-gray-600">职位：</span> {companyPositions[0]?.position}
                      </div>
                      <div>
                        <span className="text-gray-600">行业：</span> {formData.industry}
                      </div>
                      <div>
                        <span className="text-gray-600">电话：</span> {formData.phones[0]}
                      </div>
                      <div>
                        <span className="text-gray-600">邮箱：</span> {formData.email}
                      </div>
                      <div>
                        <span className="text-gray-600">现居地：</span> {formData.currentCity}
                      </div>
                      <div>
                        <span className="text-gray-600">学校：</span> {educations[0]?.school}
                      </div>
                    </div>
                    <Button onClick={handleSubmit} className="w-full">
                      <Save className="mr-2 h-4 w-4" />
                      确认保存并生成关系图谱
                    </Button>
                  </div>
                )}
              {/* 上传模式结束 */}
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 