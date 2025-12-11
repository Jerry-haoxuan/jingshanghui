'use client'

import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AutocompleteInput } from '@/components/AutocompleteInput'
import { cities, universities, industries } from '@/lib/locationData'
import { PersonData, updatePerson } from '@/lib/dataStore'
import { Plus, X, Save, Loader2 } from 'lucide-react'

interface PersonEditModalProps {
  person: PersonData | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (updatedPerson: PersonData) => void
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

interface SupplierInfo {
  materialName: string
  materialCategory: string
  supplierName: string
  industryCategory: string
  subTitle: string
  keywords: string
  keyPerson1: string
  keyPerson2: string
  keyPerson3: string
}

interface CustomerInfo {
  productName: string
  productCategory: string
  customerName: string
  industryCategory: string
  subTitle: string
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

// 行业大类选项
const industryCategories = [
  '半导体',
  '人工智能',
  '新能源',
  '生物医药',
  '智能制造',
  '新材料',
  '航空航天',
  '信息技术',
  '互联网',
  '金融科技',
  '电子商务',
  '物联网',
  '云计算',
  '大数据',
  '区块链',
  '新能源汽车',
  '智能硬件',
  '工业互联网',
  '电子加工装配',
  '医疗器械',
  '其他'
]

export default function PersonEditModal({ person, open, onOpenChange, onSave }: PersonEditModalProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    birthDate: '',
    phones: [''],
    email: '',
    hometown: '',
    currentCity: '',
    homeAddress: '', // 家庭详细位置
    companyAddress: '', // 公司住址
    industry: '',
    politicalParty: '',
    socialOrganizations: [''],
    hobbies: '',
    skills: '',
    expectations: '',
    workHistory: '',
    additionalInfo: '',
    // 企业相关字段
    companyIndustry: '',
    companyScale: '',
    companyPositioning: '',
    companyValue: '',
    companyAchievements: '',
    companyDemands: ''
  })

  const [companyPositions, setCompanyPositions] = useState<CompanyPosition[]>([
    { company: '', position: '' }
  ])

  const [educations, setEducations] = useState<Education[]>([])

  // 供应商和客户信息状态
  const [supplierInfos, setSupplierInfos] = useState<SupplierInfo[]>([])
  const [customerInfos, setCustomerInfos] = useState<CustomerInfo[]>([])

  // 当person变化时更新表单数据
  useEffect(() => {
    if (person) {
      setFormData({
        name: person.name || '',
        birthDate: person.birthDate || '',
        phones: person.phones && person.phones.length > 0 ? person.phones : [''],
        email: person.email || '',
        hometown: person.hometown || '',
        currentCity: person.currentCity || '',
        homeAddress: person.homeAddress || '', // 家庭详细位置
        companyAddress: person.companyAddress || '', // 公司住址
        industry: person.industry || '',
        politicalParty: person.politicalParty || '',
        socialOrganizations: person.socialOrganizations && person.socialOrganizations.length > 0 ? person.socialOrganizations : [''],
        hobbies: person.hobbies || '',
        skills: person.skills || '',
        expectations: person.expectations || '',
        workHistory: person.workHistory || '',
        additionalInfo: person.additionalInfo || '',
        // 企业相关字段
        companyIndustry: (person as any).companyIndustry || '',
        companyScale: (person as any).companyScale || '',
        companyPositioning: (person as any).companyPositioning || '',
        companyValue: (person as any).companyValue || '',
        companyAchievements: (person as any).companyAchievements || '',
        companyDemands: (person as any).companyDemands || ''
      })

      // 设置公司职位
      if (person.allCompanies && person.allCompanies.length > 0) {
        setCompanyPositions(person.allCompanies)
      } else if (person.company || person.position) {
        setCompanyPositions([{ company: person.company || '', position: person.position || '' }])
      } else {
        setCompanyPositions([{ company: '', position: '' }])
      }

      // 设置教育背景
      if (person.educations && person.educations.length > 0) {
        setEducations(person.educations.map(edu => ({
          level: edu.level as '本科' | '硕士' | '博士' | 'EMBA',
          school: edu.school,
          major: edu.major || '',
          year: edu.year || ''
        })))
      } else if (person.school) {
        setEducations([{ level: '本科', school: person.school, major: '', year: '' }])
      } else {
        setEducations([])
      }

      // 初始化供应商和客户数据 - 从企业信息中获取（异步加载云端数据）
      const loadCompanyData = async () => {
        try {
          const { loadCompaniesFromCloudIfAvailable, getCompanies } = await import('@/lib/dataStore')
          
          // 优先从云端加载，如果失败则使用本地数据
          const cloudCompanies = await loadCompaniesFromCloudIfAvailable()
          const companies = cloudCompanies !== null ? cloudCompanies : getCompanies()
          
          console.log('[PersonEditModal] 加载企业数据:', companies.length, '个企业')
          
          const mainCompany = person.allCompanies?.[0]?.company || person.company
          if (mainCompany) {
            // 使用标准化名称进行查找，确保找到正确的企业
            const normalizeCompanyName = (name: string): string => {
              return name.trim()
                .replace(/\s+/g, ' ') // 多个空格替换为单个空格
                .replace(/[（(].*?[）)]/g, '') // 移除括号内容
                .trim()
            }
            
            const normalizedMainCompany = normalizeCompanyName(mainCompany)
            const companyData = companies.find((c: any) => 
              normalizeCompanyName(c.name) === normalizedMainCompany
            )
            
            if (companyData) {
              console.log('[PersonEditModal] 找到匹配企业:', companyData.name, '供应商:', companyData.suppliers?.length || 0, '客户:', companyData.customers?.length || 0)
              
              // 转换供应商数据：支持旧格式（字符串数组）和新格式（对象数组）
              if (companyData.suppliers && companyData.suppliers.length > 0) {
                console.log('[PersonEditModal] 原始供应商数据:', companyData.suppliers)
                const convertedSuppliers = companyData.suppliers.map((s: any, idx: number) => {
                  console.log(`[PersonEditModal] 供应商 ${idx + 1} 类型:`, typeof s, '值:', s)
                  
                  // 如果是JSON字符串，先解析
                  if (typeof s === 'string') {
                    try {
                      const parsed = JSON.parse(s)
                      if (typeof parsed === 'object' && parsed.supplierName) {
                        // 是JSON字符串，解析后使用
                        return {
                          materialName: parsed.materialName || '',
                          materialCategory: parsed.materialCategory || '',
                          supplierName: parsed.supplierName || '',
                          industryCategory: parsed.industryCategory || '',
                          subTitle: parsed.subTitle || '',
                          keywords: parsed.keywords || '',
                          keyPerson1: parsed.keyPerson1 || '',
                          keyPerson2: parsed.keyPerson2 || '',
                          keyPerson3: parsed.keyPerson3 || ''
                        }
                      }
                    } catch (e) {
                      // 不是JSON，当作普通字符串（供应商名称）
                      console.log(`[PersonEditModal] 供应商 ${idx + 1} 是普通字符串`)
                    }
                    // 旧格式：字符串（供应商名称）
                    return {
                      materialName: '',
                      materialCategory: '',
                      supplierName: s,
                      industryCategory: '',
                      subTitle: '',
                      keywords: '',
                      keyPerson1: '',
                      keyPerson2: '',
                      keyPerson3: ''
                    }
                  } else if (typeof s === 'object' && s !== null) {
                    // 新格式：对象（确保所有字段都存在）
                    return {
                      materialName: s.materialName || '',
                      materialCategory: s.materialCategory || '',
                      supplierName: s.supplierName || '',
                      industryCategory: s.industryCategory || '',
                      subTitle: s.subTitle || '',
                      keywords: s.keywords || '',
                      keyPerson1: s.keyPerson1 || '',
                      keyPerson2: s.keyPerson2 || '',
                      keyPerson3: s.keyPerson3 || ''
                    }
                  } else {
                    // 未知格式，返回空对象
                    console.warn(`[PersonEditModal] 未知的供应商数据格式:`, s)
                    return {
                      materialName: '',
                      materialCategory: '',
                      supplierName: '',
                      industryCategory: '',
                      subTitle: '',
                      keywords: '',
                      keyPerson1: '',
                      keyPerson2: '',
                      keyPerson3: ''
                    }
                  }
                })
                console.log('[PersonEditModal] 转换后的供应商数据:', convertedSuppliers)
                setSupplierInfos(convertedSuppliers)
              } else {
                setSupplierInfos([])
              }
              
              // 转换客户数据：支持旧格式（字符串数组）和新格式（对象数组）
              if (companyData.customers && companyData.customers.length > 0) {
                console.log('[PersonEditModal] 原始客户数据:', companyData.customers)
                const convertedCustomers = companyData.customers.map((c: any, idx: number) => {
                  console.log(`[PersonEditModal] 客户 ${idx + 1} 类型:`, typeof c, '值:', c)
                  
                  // 如果是JSON字符串，先解析
                  if (typeof c === 'string') {
                    try {
                      const parsed = JSON.parse(c)
                      if (typeof parsed === 'object' && parsed.customerName) {
                        // 是JSON字符串，解析后使用
                        return {
                          productName: parsed.productName || '',
                          productCategory: parsed.productCategory || '',
                          customerName: parsed.customerName || '',
                          industryCategory: parsed.industryCategory || '',
                          subTitle: parsed.subTitle || '',
                          keywords: parsed.keywords || '',
                          keyPerson1: parsed.keyPerson1 || '',
                          keyPerson2: parsed.keyPerson2 || '',
                          keyPerson3: parsed.keyPerson3 || ''
                        }
                      }
                    } catch (e) {
                      // 不是JSON，当作普通字符串（客户名称）
                      console.log(`[PersonEditModal] 客户 ${idx + 1} 是普通字符串`)
                    }
                    // 旧格式：字符串（客户名称）
                    return {
                      productName: '',
                      productCategory: '',
                      customerName: c,
                      industryCategory: '',
                      subTitle: '',
                      keywords: '',
                      keyPerson1: '',
                      keyPerson2: '',
                      keyPerson3: ''
                    }
                  } else if (typeof c === 'object' && c !== null) {
                    // 新格式：对象（确保所有字段都存在）
                    return {
                      productName: c.productName || '',
                      productCategory: c.productCategory || '',
                      customerName: c.customerName || '',
                      industryCategory: c.industryCategory || '',
                      subTitle: c.subTitle || '',
                      keywords: c.keywords || '',
                      keyPerson1: c.keyPerson1 || '',
                      keyPerson2: c.keyPerson2 || '',
                      keyPerson3: c.keyPerson3 || ''
                    }
                  } else {
                    // 未知格式，返回空对象
                    console.warn(`[PersonEditModal] 未知的客户数据格式:`, c)
                    return {
                      productName: '',
                      productCategory: '',
                      customerName: '',
                      industryCategory: '',
                      subTitle: '',
                      keywords: '',
                      keyPerson1: '',
                      keyPerson2: '',
                      keyPerson3: ''
                    }
                  }
                })
                console.log('[PersonEditModal] 转换后的客户数据:', convertedCustomers)
                setCustomerInfos(convertedCustomers)
              } else {
                setCustomerInfos([])
              }
              
              // 填充企业信息字段到表单
              setFormData(prev => ({
                ...prev,
                companyIndustry: companyData.industry || prev.companyIndustry || '',
                companyScale: companyData.scale || prev.companyScale || '',
                companyPositioning: companyData.positioning || prev.companyPositioning || '',
                companyValue: companyData.value || prev.companyValue || '',
                companyAchievements: companyData.achievements || prev.companyAchievements || '',
                companyDemands: companyData.demands || prev.companyDemands || ''
              }))
            } else {
              console.warn('[PersonEditModal] 未找到匹配企业:', mainCompany, '标准化后:', normalizedMainCompany)
              console.log('[PersonEditModal] 可用企业列表:', companies.map((c: any) => ({
                name: c.name,
                normalized: normalizeCompanyName(c.name)
              })))
              setSupplierInfos([])
              setCustomerInfos([])
            }
          } else {
            setSupplierInfos([])
            setCustomerInfos([])
          }
        } catch (e) {
          console.error('[PersonEditModal] 初始化企业信息失败:', e)
          setSupplierInfos([])
          setCustomerInfos([])
        }
      }
      
      loadCompanyData()
    }
  }, [person])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handlePhoneChange = (index: number, value: string) => {
    const newPhones = [...formData.phones]
    newPhones[index] = value
    setFormData(prev => ({
      ...prev,
      phones: newPhones
    }))
  }

  const addPhone = () => {
    setFormData(prev => ({
      ...prev,
      phones: [...prev.phones, '']
    }))
  }

  const removePhone = (index: number) => {
    if (formData.phones.length > 1) {
      const newPhones = formData.phones.filter((_, i) => i !== index)
      setFormData(prev => ({
        ...prev,
        phones: newPhones
      }))
    }
  }

  const handleSocialOrgChange = (index: number, value: string) => {
    const newOrgs = [...formData.socialOrganizations]
    newOrgs[index] = value
    setFormData(prev => ({
      ...prev,
      socialOrganizations: newOrgs
    }))
  }

  const addSocialOrg = () => {
    setFormData(prev => ({
      ...prev,
      socialOrganizations: [...prev.socialOrganizations, '']
    }))
  }

  const removeSocialOrg = (index: number) => {
    if (formData.socialOrganizations.length > 1) {
      const newOrgs = formData.socialOrganizations.filter((_, i) => i !== index)
      setFormData(prev => ({
        ...prev,
        socialOrganizations: newOrgs
      }))
    }
  }

  const handleCompanyChange = (index: number, field: 'company' | 'position', value: string) => {
    const newPositions = [...companyPositions]
    newPositions[index][field] = value
    setCompanyPositions(newPositions)
  }

  const addCompany = () => {
    setCompanyPositions([...companyPositions, { company: '', position: '' }])
  }

  const removeCompany = (index: number) => {
    if (companyPositions.length > 1) {
      setCompanyPositions(companyPositions.filter((_, i) => i !== index))
    }
  }

  const handleEducationChange = (index: number, field: keyof Education, value: string) => {
    const newEducations = [...educations]
    newEducations[index] = { ...newEducations[index], [field]: value }
    setEducations(newEducations)
  }

  const addEducation = () => {
    setEducations([...educations, { level: '本科', school: '', major: '', year: '' }])
  }

  const removeEducation = (index: number) => {
    setEducations(educations.filter((_, i) => i !== index))
  }

  // 供应商处理函数
  const addSupplier = () => {
    setSupplierInfos([...supplierInfos, {
      materialName: '',
      materialCategory: '',
      supplierName: '',
      industryCategory: '',
      subTitle: '',
      keywords: '',
      keyPerson1: '',
      keyPerson2: '',
      keyPerson3: ''
    }])
  }

  const removeSupplier = (index: number) => {
    setSupplierInfos(supplierInfos.filter((_, i) => i !== index))
  }

  // 客户处理函数
  const addCustomer = () => {
    setCustomerInfos([...customerInfos, {
      productName: '',
      productCategory: '',
      customerName: '',
      industryCategory: '',
      subTitle: '',
      keywords: '',
      keyPerson1: '',
      keyPerson2: '',
      keyPerson3: ''
    }])
  }

  const removeCustomer = (index: number) => {
    setCustomerInfos(customerInfos.filter((_, i) => i !== index))
  }

  const handleSave = async () => {
    if (!person) return

    // 验证必填字段
    if (!formData.name || companyPositions[0].company === '' || formData.phones[0] === '') {
      alert('请填写姓名、公司和电话等必填字段')
      return
    }

    setLoading(true)

    try {
      // 确保保留原有ID
      console.log('[PersonEditModal] 编辑人物，原始ID:', person.id)
      const updatedPerson: PersonData = {
        ...person,
        id: person.id, // 明确保留原有ID
        name: formData.name,
        birthDate: formData.birthDate,
        phones: formData.phones.filter(phone => phone.trim() !== ''),
        phone: formData.phones[0], // 主要电话
        email: formData.email,
        hometown: formData.hometown,
        currentCity: formData.currentCity,
        homeAddress: formData.homeAddress,
        companyAddress: formData.companyAddress,
        industry: formData.industry,
        politicalParty: formData.politicalParty,
        socialOrganizations: formData.socialOrganizations.filter(org => org.trim() !== ''),
        hobbies: formData.hobbies,
        skills: formData.skills,
        expectations: formData.expectations,
        workHistory: formData.workHistory,
        additionalInfo: formData.additionalInfo,
        allCompanies: companyPositions.filter(cp => cp.company.trim() !== ''),
        company: companyPositions[0].company, // 主要公司
        position: companyPositions[0].position, // 主要职位
        educations: educations.filter(edu => edu.school.trim() !== ''),
        school: educations.length > 0 ? educations[0].school : undefined, // 主要学校（兼容性）
        // 企业相关字段
        companyIndustry: formData.companyIndustry,
        companyScale: formData.companyScale,
        companyPositioning: formData.companyPositioning,
        companyValue: formData.companyValue,
        companyAchievements: formData.companyAchievements,
        companyDemands: formData.companyDemands
      } as any

      // 调用API更新云端和本地数据
      const response = await fetch('/api/update-person', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedPerson)
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.message || '更新失败')
      }

      // 如果云端同步失败但本地更新成功，给出警告
      if (result.cloudError) {
        const errorMsg = result.errorDetails ? 
          `个人信息已更新到本地，但云端同步失败。\n错误详情：${result.errorDetails}` :
          '个人信息已更新到本地，但云端同步失败。请检查网络连接。'
        alert(errorMsg)
        console.error('云端同步失败详情:', result.errorDetails)
      } else {
        alert('个人信息已成功更新并同步到云端！')
      }

      // 同步更新本地存储（确保刷新后仍为原记录的修改）
      try {
        updatePerson((result.data || updatedPerson).id, result.data || updatedPerson)
      } catch (_) {}

      // 同步更新企业的供应商和客户信息
      try {
        const { addOrUpdateCompany } = await import('@/lib/dataStore')
        const { upsertCompanyToCloud } = await import('@/lib/cloudStore')
        const mainCompany = companyPositions[0]?.company?.trim()
        if (mainCompany) {
          // 过滤掉空的供应商和客户
          const validSuppliers = supplierInfos.filter(s => s.supplierName.trim() !== '')
          const validCustomers = customerInfos.filter(c => c.customerName.trim() !== '')
          
          // 构建企业更新数据
          const companyUpdateData = {
            name: mainCompany,
            industry: formData.companyIndustry || '',
            scale: formData.companyScale || '',
            products: (formData.companyPositioning || '').split(/[\n、,，]/).map(s => s.trim()).filter(Boolean),
            positioning: formData.companyPositioning,
            value: formData.companyValue,
            achievements: formData.companyAchievements,
            demands: formData.companyDemands,
            suppliers: validSuppliers,
            customers: validCustomers,
            additionalInfo: ''
          }
          
          // 使用智能添加或更新功能，自动处理去重和合并
          const updatedCompany = addOrUpdateCompany(companyUpdateData as any)
          
          // 同步到云端
          try {
            await upsertCompanyToCloud(updatedCompany)
            console.log('企业信息已智能更新并同步到云端:', updatedCompany.name)
          } catch (cloudError) {
            console.warn('企业信息云端同步失败:', cloudError)
          }
        }
      } catch (e) {
        console.warn('更新企业上下游信息失败（不影响人物信息保存）:', e)
      }

      // 调用回调函数
      onSave(result.data || updatedPerson)
      onOpenChange(false)
    } catch (error: any) {
      console.error('保存失败:', error)
      let errorMsg = error?.message || '保存失败，请重试'
      
      // 如果是网络错误，提供更友好的提示
      if (error?.message?.includes('Failed to fetch')) {
        errorMsg = '网络连接失败，请检查网络后重试'
      }
      
      alert(`保存失败：${errorMsg}`)
    } finally {
      setLoading(false)
    }
  }

  if (!person) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>编辑个人信息 - {person.name}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basic">基本信息</TabsTrigger>
            <TabsTrigger value="work">工作信息</TabsTrigger>
            <TabsTrigger value="education">教育背景</TabsTrigger>
            <TabsTrigger value="other">其他信息</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">姓名 *</Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div>
                <Label htmlFor="birthDate">出生年月日</Label>
                <Input
                  id="birthDate"
                  name="birthDate"
                  value={formData.birthDate}
                  onChange={handleInputChange}
                  placeholder="如：1990-01-01"
                />
              </div>
            </div>

            {/* 电话号码 */}
            <div>
              <Label>电话号码 *</Label>
              {formData.phones.map((phone, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <Input
                    value={phone}
                    onChange={(e) => handlePhoneChange(index, e.target.value)}
                    placeholder={`电话 ${index + 1}`}
                    required={index === 0}
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
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addPhone}
              >
                <Plus className="mr-2 h-4 w-4" />
                添加电话
              </Button>
            </div>

            <div>
              <Label htmlFor="email">邮箱</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="hometown">家乡</Label>
                <AutocompleteInput
                  id="hometown"
                  value={formData.hometown}
                  onChange={(value) => setFormData(prev => ({ ...prev, hometown: value }))}
                  suggestions={cities}
                  placeholder="选择或输入家乡"
                />
              </div>
              <div>
                <Label htmlFor="currentCity">现居地</Label>
                <AutocompleteInput
                  id="currentCity"
                  value={formData.currentCity}
                  onChange={(value) => setFormData(prev => ({ ...prev, currentCity: value }))}
                  suggestions={cities}
                  placeholder="选择或输入现居地"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="homeAddress">家庭详细位置</Label>
                <Input
                  id="homeAddress"
                  name="homeAddress"
                  value={formData.homeAddress}
                  onChange={handleInputChange}
                  placeholder="详细家庭地址（可选）"
                />
              </div>
              <div>
                <Label htmlFor="companyAddress">公司住址</Label>
                <Input
                  id="companyAddress"
                  name="companyAddress"
                  value={formData.companyAddress}
                  onChange={handleInputChange}
                  placeholder="详细公司地址（可选）"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="industry">行业</Label>
              <AutocompleteInput
                id="industry"
                value={formData.industry}
                onChange={(value) => setFormData(prev => ({ ...prev, industry: value }))}
                suggestions={industries}
                placeholder="选择或输入行业"
              />
            </div>
          </TabsContent>

          <TabsContent value="work" className="space-y-4">
            {/* 公司职位信息 */}
            <div>
              <Label>公司职位信息 *</Label>
              {companyPositions.map((cp, index) => (
                <div key={index} className="grid grid-cols-2 gap-2 mb-2">
                  <div>
                    <Input
                      value={cp.company}
                      onChange={(e) => handleCompanyChange(index, 'company', e.target.value)}
                      placeholder={`公司 ${index + 1}`}
                      required={index === 0}
                    />
                    {index === 0 && (
                      <span className="text-xs text-gray-500 mt-1">为防止企业多名重名，请按照企查查报备的公司名进行填写</span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={cp.position}
                      onChange={(e) => handleCompanyChange(index, 'position', e.target.value)}
                      placeholder={`职位 ${index + 1}`}
                    />
                    {companyPositions.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeCompany(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addCompany}
              >
                <Plus className="mr-2 h-4 w-4" />
                添加公司
              </Button>
            </div>

            {/* 企业信息 */}
            <div className="space-y-4 border-t pt-4">
              <h3 className="text-base font-semibold">企业信息</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="companyIndustry">所属行业</Label>
                  <AutocompleteInput
                    id="companyIndustry"
                    value={formData.companyIndustry}
                    onChange={(value) => setFormData(prev => ({ ...prev, companyIndustry: value }))}
                    placeholder="请选择或输入企业所属行业"
                    suggestions={industries}
                  />
                </div>
                <div>
                  <Label htmlFor="companyScale">企业规模</Label>
                  <select
                    id="companyScale"
                    name="companyScale"
                    value={formData.companyScale}
                    onChange={handleInputChange}
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
                <div>
                  <Label htmlFor="companyPositioning">企业定位（我们是做什么的）</Label>
                  <Textarea
                    id="companyPositioning"
                    name="companyPositioning"
                    value={formData.companyPositioning}
                    onChange={handleInputChange}
                    placeholder="简要描述企业定位，可用 '、' 分隔主要产品/服务"
                    rows={3}
                  />
                </div>
                <div>
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
                <div>
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
                <div>
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
            </div>

            {/* 企业上下游关系 */}
            <div className="space-y-4 border-t pt-4">
              <h4 className="text-base font-semibold">企业上下游关系</h4>
              
              {/* 上游供应商 */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>上游供应商</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addSupplier}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    添加供应商
                  </Button>
                </div>
                {supplierInfos.map((supplier, index) => (
                  <div key={index} className="p-3 border rounded-lg bg-gray-50 mb-3">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-medium text-gray-600">供应商 {index + 1}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeSupplier(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="mb-2">
                      <Input
                        value={supplier.supplierName}
                        onChange={(e) => setSupplierInfos(prev => prev.map((s, i) => 
                          i === index ? { ...s, supplierName: e.target.value } : s
                        ))}
                        placeholder="供应商名称"
                        className="text-sm"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs text-gray-600 mb-1 block">行业大类</Label>
                        <select
                          value={supplier.industryCategory}
                          onChange={(e) => setSupplierInfos(prev => prev.map((s, i) => 
                            i === index ? { ...s, industryCategory: e.target.value } : s
                          ))}
                          className="w-full h-9 px-2 rounded-md border border-gray-300 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">请选择行业大类</option>
                          {industryCategories.map((category) => (
                            <option key={category} value={category}>{category}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <Label className="text-xs text-gray-600 mb-1 block">核心业务类别</Label>
                        <Input
                          value={supplier.subTitle}
                          onChange={(e) => setSupplierInfos(prev => prev.map((s, i) =>
                            i === index ? { ...s, subTitle: e.target.value } : s
                          ))}
                          placeholder="例如：芯片封装、AI算法、云计算"
                          className="text-sm h-9"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* 下游客户 */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>下游客户</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addCustomer}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    添加客户
                  </Button>
                </div>
                {customerInfos.map((customer, index) => (
                  <div key={index} className="p-3 border rounded-lg bg-gray-50 mb-3">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-medium text-gray-600">客户 {index + 1}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeCustomer(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="mb-2">
                      <Input
                        value={customer.customerName}
                        onChange={(e) => setCustomerInfos(prev => prev.map((c, i) => 
                          i === index ? { ...c, customerName: e.target.value } : c
                        ))}
                        placeholder="客户名称"
                        className="text-sm"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs text-gray-600 mb-1 block">行业大类</Label>
                        <select
                          value={customer.industryCategory}
                          onChange={(e) => setCustomerInfos(prev => prev.map((c, i) => 
                            i === index ? { ...c, industryCategory: e.target.value } : c
                          ))}
                          className="w-full h-9 px-2 rounded-md border border-gray-300 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">请选择行业大类</option>
                          {industryCategories.map((category) => (
                            <option key={category} value={category}>{category}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <Label className="text-xs text-gray-600 mb-1 block">核心业务类别</Label>
                        <Input
                          value={customer.subTitle}
                          onChange={(e) => setCustomerInfos(prev => prev.map((c, i) =>
                            i === index ? { ...c, subTitle: e.target.value } : c
                          ))}
                          placeholder="例如：芯片封装、AI算法、云计算"
                          className="text-sm h-9"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="workHistory">工作经历</Label>
              <Textarea
                id="workHistory"
                name="workHistory"
                value={formData.workHistory}
                onChange={handleInputChange}
                rows={4}
                placeholder="详细的工作经历..."
              />
            </div>
          </TabsContent>

          <TabsContent value="education" className="space-y-4">
            {/* 教育背景 */}
            <div>
              <Label>教育背景</Label>
              {educations.map((edu, index) => (
                <div key={index} className="grid grid-cols-4 gap-2 mb-2">
                  <select
                    value={edu.level}
                    onChange={(e) => handleEducationChange(index, 'level', e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="本科">本科</option>
                    <option value="硕士">硕士</option>
                    <option value="博士">博士</option>
                    <option value="EMBA">EMBA</option>
                  </select>
                  <AutocompleteInput
                    id={`school-${index}`}
                    value={edu.school}
                    onChange={(value) => handleEducationChange(index, 'school', value)}
                    suggestions={universities}
                    placeholder="学校"
                  />
                  <Input
                    value={edu.major || ''}
                    onChange={(e) => handleEducationChange(index, 'major', e.target.value)}
                    placeholder="专业"
                  />
                  <div className="flex gap-2">
                    <Input
                      value={edu.year || ''}
                      onChange={(e) => handleEducationChange(index, 'year', e.target.value)}
                      placeholder="毕业年份"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeEducation(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addEducation}
              >
                <Plus className="mr-2 h-4 w-4" />
                添加教育背景
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="other" className="space-y-4">
            <div>
              <Label htmlFor="politicalParty">党派</Label>
              <select
                id="politicalParty"
                name="politicalParty"
                value={formData.politicalParty}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="">请选择</option>
                {politicalParties.map(party => (
                  <option key={party} value={party}>{party}</option>
                ))}
              </select>
            </div>

            {/* 社会组织身份 */}
            <div>
              <Label>社会组织身份</Label>
              {formData.socialOrganizations.map((org, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <Input
                    value={org}
                    onChange={(e) => handleSocialOrgChange(index, e.target.value)}
                    placeholder={`社会组织 ${index + 1}`}
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
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addSocialOrg}
              >
                <Plus className="mr-2 h-4 w-4" />
                添加组织身份
              </Button>
            </div>

            <div>
              <Label htmlFor="hobbies">个人爱好</Label>
              <Textarea
                id="hobbies"
                name="hobbies"
                value={formData.hobbies}
                onChange={handleInputChange}
                rows={2}
                placeholder="个人爱好..."
              />
            </div>

            <div>
              <Label htmlFor="skills">擅长能力</Label>
              <Textarea
                id="skills"
                name="skills"
                value={formData.skills}
                onChange={handleInputChange}
                rows={2}
                placeholder="擅长的能力..."
              />
            </div>

            <div>
              <Label htmlFor="expectations">期望从精尚慧获得什么</Label>
              <Textarea
                id="expectations"
                name="expectations"
                value={formData.expectations}
                onChange={handleInputChange}
                rows={2}
                placeholder="期望获得的帮助..."
              />
            </div>

            <div>
              <Label htmlFor="additionalInfo">其他信息</Label>
              <Textarea
                id="additionalInfo"
                name="additionalInfo"
                value={formData.additionalInfo}
                onChange={handleInputChange}
                rows={3}
                placeholder="其他补充信息..."
              />
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            保存
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}


