'use client'

import React, { useState, useCallback } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Upload, FileText, ArrowLeft, Save, Loader2, Sparkles, Brain, Download, Plus, X } from 'lucide-react'
import { useDropzone } from 'react-dropzone'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { DEEPSEEK_CONFIG } from '@/lib/config'
import { AutocompleteInput } from '@/components/AutocompleteInput'
import { cities, universities, industries } from '@/lib/locationData'
import { ExcelDataTable } from '@/components/ExcelDataTable'
import { addPerson } from '@/lib/dataStore'
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
  const [formData, setFormData] = useState({
    name: '',
    birthDate: '', // 新增：出生年月日
    phones: [''], // 改为数组支持多个电话
    email: '',
    hometown: '',
    currentCity: '',
    industry: '',
    politicalParty: '', // 新增：党派
    socialOrganizations: [''], // 新增：社会组织身份（支持多个）
    hobbies: '', // 新增：个人爱好
    skills: '', // 新增：擅长能力
    expectations: '', // 新增：想从精尚慧获得什么
    workHistory: '',
    additionalInfo: ''
  })
  
  // 公司职位数组（支持多个）
  const [companyPositions, setCompanyPositions] = useState<CompanyPosition[]>([
    { company: '', position: '' }
  ])
  
  // 教育背景数组
  const [educations, setEducations] = useState<Education[]>([
    { level: '本科', school: '', major: '', year: '' }
  ])
  
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [showBatchData, setShowBatchData] = useState(false)
  const [batchData, setBatchData] = useState<BatchData[]>([])

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
    // 验证必填字段
    if (!formData.name || companyPositions[0].company === '' || formData.phones[0] === '') {
      alert('请填写所有必填字段（姓名、公司、电话）')
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
        industry: formData.industry,
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
      
      // 2. 使用AI自动梳理关系网络
      await updateRelationshipNetwork(newPerson)
      
      setAiProcessing(false)
      setLoading(false)
      
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
      setUploadedFile(acceptedFiles[0])
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.ms-excel': ['.xls'], // 支持Excel
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] // 支持Excel
    },
    maxFiles: 1
  })

  const handleFileUpload = async () => {
    if (!uploadedFile) return
    
    setLoading(true)
    
    // 检查是否是Excel文件
    const fileName = uploadedFile.name.toLowerCase()
    const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls')
    
    if (isExcel) {
      // 处理Excel文件
      try {
        const formData = new FormData()
        formData.append('file', uploadedFile)
        
        const response = await fetch('/api/parse-excel', {
          method: 'POST',
          body: formData
        })
        
        const result = await response.json()
        
        if (result.success && result.data) {
          setBatchData(result.data)
          setShowBatchData(true)
          setLoading(false)
        } else {
          alert(result.error || '解析Excel文件失败')
          setLoading(false)
        }
      } catch (error) {
        console.error('Excel处理错误:', error)
        alert('处理Excel文件时出错')
        setLoading(false)
      }
    } else {
      // 处理其他文件类型（PDF、Word等）
      setAiProcessing(true)
      
      const fileContent = await uploadedFile.text()
      
      const prompt = `请从以下文件内容中提取人物信息，包括姓名、公司、职位、学校、电话、邮箱、现居地、家乡、行业、工作经历等，并以JSON格式返回：\n\n${fileContent}`
      const aiResult = await callDeepSeekAPI(prompt)
      
      if (aiResult) {
        try {
          const extractedData = JSON.parse(aiResult)
          setFormData(prev => ({
            ...prev,
            name: extractedData.name || '',
            phones: [extractedData.phone || ''],
            email: extractedData.email || '',
            hometown: extractedData.hometown || '',
            currentCity: extractedData.currentCity || '',
            industry: extractedData.industry || '',
            workHistory: extractedData.workHistory || '',
            additionalInfo: ''
          }))
          
          if (extractedData.company || extractedData.position) {
            setCompanyPositions([{
              company: extractedData.company || '',
              position: extractedData.position || ''
            }])
          }
          
          if (extractedData.school) {
            setEducations([{
              level: '本科',
              school: extractedData.school,
              major: '',
              year: ''
            }])
          }
        } catch (e) {
          // 设置模拟数据
          setFormData(prev => ({
            ...prev,
            name: '从文件中提取的姓名',
            phones: ['从文件中提取的电话'],
            email: '从文件中提取的邮箱',
            hometown: '从文件中提取的家乡',
            currentCity: '从文件中提取的现居地',
            industry: '从文件中提取的行业',
            workHistory: '从文件中提取的工作经历',
            additionalInfo: ''
          }))
          
          setCompanyPositions([{
            company: '从文件中提取的公司',
            position: '从文件中提取的职位'
          }])
          
          setEducations([{
            level: '本科',
            school: '从文件中提取的学校',
            major: '',
            year: ''
          }])
        }
      }
      
      setAiProcessing(false)
      setLoading(false)
    }
  }

  // 批量保存后的处理
  const handleBatchSave = () => {
    setShowBatchData(false)
    setBatchData([])
    setUploadedFile(null)
    router.push('/dashboard')
  }

  // 取消批量导入
  const handleBatchCancel = () => {
    setShowBatchData(false)
    setBatchData([])
  }

  // AI处理中界面
  if (aiProcessing) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-96">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center space-y-4">
              <div className="relative">
                <Brain className="h-16 w-16 text-purple-500 animate-pulse" />
                <Sparkles className="h-6 w-6 text-yellow-400 absolute -top-2 -right-2 animate-spin" />
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

  // 显示批量数据编辑表格
  if (showBatchData && batchData.length > 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container max-w-full py-8 px-4">
          <Link href="/dashboard">
            <Button variant="ghost" className="mb-6">
              <ArrowLeft className="mr-2 h-4 w-4" />
              返回控制台
            </Button>
          </Link>

          <Card>
            <CardHeader>
              <CardTitle>批量导入数据预览</CardTitle>
              <CardDescription>
                请检查从Excel文件中提取的数据，您可以编辑或删除任何记录
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ExcelDataTable
                data={batchData}
                onSave={handleBatchSave}
                onCancel={handleBatchCancel}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

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
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="form">手动填写</TabsTrigger>
                <TabsTrigger value="upload">上传文件</TabsTrigger>
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
                        <Label htmlFor={`company-${index}`}>公司 {index === 0 ? '*' : ''}</Label>
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

                {/* 行业和党派 */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="industry">行业</Label>
                    <AutocompleteInput
                      id="industry"
                      value={formData.industry}
                      onChange={(value) => handleAutocompleteChange('industry', value)}
                      placeholder="请选择或输入行业"
                      suggestions={industries}
                    />
                  </div>
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

              {/* 上传模式 */}
              <TabsContent value="upload" className="space-y-6 relative">
                {/* Excel解析Loading覆盖层 */}
                {loading && (
                  <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center">
                    <div className="bg-white rounded-2xl p-8 shadow-2xl max-w-sm w-full mx-4">
                      <div className="text-center space-y-6">
                        {/* 动画图标 */}
                        <div className="relative">
                          <div className="w-20 h-20 mx-auto bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                            <FileText className="h-10 w-10 text-white" />
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
                          <Sparkles className="h-3 w-3" />
                          <span>AI正在分析多个公司和职位信息</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <p className="text-sm text-blue-800">
                    <Sparkles className="inline h-4 w-4 mr-1" />
                    慧慧AI将智能解析您上传的文件：
                  </p>
                  <ul className="text-xs text-blue-700 mt-2 ml-5 list-disc">
                    <li>Excel文件：批量导入多条数据，支持编辑确认后保存</li>
                    <li>PDF/Word文件：提取单个人物信息</li>
                  </ul>
                  <div className="mt-3 pt-3 border-t border-blue-200 flex items-center justify-between">
                    <p className="text-xs text-blue-700">
                      Excel格式要求：必须包含姓名、公司、电话、邮箱列
                    </p>
                    <a
                      href="/person-template.xlsx"
                      download="精尚慧个人信息模板.xlsx"
                      className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                    >
                      <Download className="h-3 w-3" />
                      下载模板
                    </a>
                  </div>
                </div>

                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors
                    ${isDragActive ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-primary'}`}
                >
                  <input {...getInputProps()} />
                  <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  {uploadedFile ? (
                    <>
                      <p className="text-lg font-medium mb-2">已选择文件：</p>
                      <p className="text-sm text-gray-600 flex items-center justify-center">
                        <FileText className="mr-2 h-4 w-4" />
                        {uploadedFile.name}
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-lg font-medium mb-2">
                        {isDragActive ? '松开以上传文件' : '拖拽文件到这里，或点击选择'}
                      </p>
                      <p className="text-sm text-gray-600">
                        支持 PDF、Word、Excel 格式的文件
                      </p>
                    </>
                  )}
                </div>

                {uploadedFile && (
                  <Button 
                    onClick={handleFileUpload}
                    disabled={loading}
                    className="w-full"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        慧慧AI解析中...
                      </>
                    ) : (
                      <>
                        <Brain className="mr-2 h-4 w-4" />
                        开始智能解析
                      </>
                    )}
                  </Button>
                )}

                {/* 解析后的表单预览 */}
                {formData.name && uploadedFile && !loading && (
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
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 