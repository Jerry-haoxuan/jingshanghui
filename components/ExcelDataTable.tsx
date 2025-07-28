'use client'

import React, { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { AutocompleteInput } from '@/components/AutocompleteInput'
import { cities, universities, industries } from '@/lib/locationData'
import { Check, X, Edit2, Save, Trash2, AlertCircle } from 'lucide-react'
import { addPerson } from '@/lib/dataStore'
import { updateRelationshipNetwork } from '@/lib/relationshipManager'

interface PersonData {
  id: string
  name: string
  company: string
  position: string
  phone: string
  email: string
  school: string
  hometown: string
  currentCity: string
  industry: string
  products: string
  workHistory: string
  additionalInfo: string
  isValid: boolean
}

interface ExcelDataTableProps {
  data: PersonData[]
  onSave: () => void
  onCancel: () => void
}

export function ExcelDataTable({ data: initialData, onSave, onCancel }: ExcelDataTableProps) {
  const [data, setData] = useState<PersonData[]>(initialData)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingData, setEditingData] = useState<PersonData | null>(null)
  const [saving, setSaving] = useState(false)

  // 开始编辑
  const startEdit = (person: PersonData) => {
    setEditingId(person.id)
    setEditingData({ ...person })
  }

  // 保存编辑
  const saveEdit = () => {
    if (!editingData) return
    
    // 验证必填字段
    const isValid = !!editingData.name && !!editingData.company && 
                   !!editingData.phone && !!editingData.email && !!editingData.products
    
    setData(data.map(item => 
      item.id === editingData.id 
        ? { ...editingData, isValid }
        : item
    ))
    
    setEditingId(null)
    setEditingData(null)
  }

  // 取消编辑
  const cancelEdit = () => {
    setEditingId(null)
    setEditingData(null)
  }

  // 删除行
  const deleteRow = (id: string) => {
    setData(data.filter(item => item.id !== id))
  }

  // 批量保存所有有效数据
  const handleBatchSave = async () => {
    setSaving(true)
    
    try {
      const validData = data.filter(item => item.isValid)
      
      if (validData.length === 0) {
        alert('没有有效的数据可以保存')
        return
      }
      
      // 批量添加人物并更新关系网络
      for (const person of validData) {
        const { id, isValid, ...personData } = person
        const newPerson = addPerson(personData)
        
        // 为每个新增人物更新关系网络
        await updateRelationshipNetwork(newPerson)
      }
      
      alert(`成功导入 ${validData.length} 条数据！AI已自动分析并更新关系网络。`)
      onSave()
    } catch (error) {
      alert('保存数据时出错，请重试')
      console.error(error)
    } finally {
      setSaving(false)
    }
  }

  // 更新编辑中的数据
  const updateEditingData = (field: string, value: string) => {
    if (!editingData) return
    setEditingData({ ...editingData, [field]: value })
  }

  return (
    <div className="space-y-4">
      {/* 统计信息 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-blue-900">
              共解析 {data.length} 条数据
            </p>
            <p className="text-xs text-blue-700 mt-1">
              有效数据: {data.filter(item => item.isValid).length} 条，
              无效数据: {data.filter(item => !item.isValid).length} 条
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-blue-600">
            <AlertCircle className="h-4 w-4" />
            <span>请检查并编辑数据，确保信息准确</span>
          </div>
        </div>
      </div>

      {/* 数据表格 */}
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">状态</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">姓名 *</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">公司 *</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">职位</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">行业</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">电话 *</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">邮箱 *</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">现居地</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">学校</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">产品/服务 *</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {data.map((person) => {
                const isEditing = editingId === person.id
                const currentData = isEditing && editingData ? editingData : person
                
                return (
                  <tr key={person.id} className={person.isValid ? '' : 'bg-red-50'}>
                    <td className="px-4 py-3">
                      {person.isValid ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <X className="h-4 w-4 text-red-500" />
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <Input
                          value={currentData.name}
                          onChange={(e) => updateEditingData('name', e.target.value)}
                          className="w-32"
                        />
                      ) : (
                        <span className="text-sm">{currentData.name || '-'}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <Input
                          value={currentData.company}
                          onChange={(e) => updateEditingData('company', e.target.value)}
                          className="w-40"
                        />
                      ) : (
                        <span className="text-sm">{currentData.company || '-'}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <Input
                          value={currentData.position}
                          onChange={(e) => updateEditingData('position', e.target.value)}
                          className="w-32"
                        />
                      ) : (
                        <span className="text-sm">{currentData.position || '-'}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <AutocompleteInput
                          id={`industry-${person.id}`}
                          value={currentData.industry}
                          onChange={(value) => updateEditingData('industry', value)}
                          suggestions={industries}
                          className="w-40"
                        />
                      ) : (
                        <span className="text-sm">{currentData.industry || '-'}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <Input
                          value={currentData.phone}
                          onChange={(e) => updateEditingData('phone', e.target.value)}
                          className="w-32"
                        />
                      ) : (
                        <span className="text-sm">{currentData.phone || '-'}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <Input
                          value={currentData.email}
                          onChange={(e) => updateEditingData('email', e.target.value)}
                          className="w-40"
                          type="email"
                        />
                      ) : (
                        <span className="text-sm text-xs">{currentData.email || '-'}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <AutocompleteInput
                          id={`city-${person.id}`}
                          value={currentData.currentCity}
                          onChange={(value) => updateEditingData('currentCity', value)}
                          suggestions={cities}
                          className="w-32"
                        />
                      ) : (
                        <span className="text-sm">{currentData.currentCity || '-'}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <AutocompleteInput
                          id={`school-${person.id}`}
                          value={currentData.school}
                          onChange={(value) => updateEditingData('school', value)}
                          suggestions={universities}
                          className="w-40"
                        />
                      ) : (
                        <span className="text-sm">{currentData.school || '-'}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <Textarea
                          value={currentData.products}
                          onChange={(e) => updateEditingData('products', e.target.value)}
                          className="w-48 min-h-[60px]"
                          rows={2}
                        />
                      ) : (
                        <span className="text-sm">{currentData.products || '-'}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {isEditing ? (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={saveEdit}
                              className="h-8 w-8 p-0"
                            >
                              <Save className="h-4 w-4 text-green-600" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={cancelEdit}
                              className="h-8 w-8 p-0"
                            >
                              <X className="h-4 w-4 text-gray-600" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => startEdit(person)}
                              className="h-8 w-8 p-0"
                            >
                              <Edit2 className="h-4 w-4 text-blue-600" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => deleteRow(person.id)}
                              className="h-8 w-8 p-0"
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500">
          * 标记的字段为必填项，请确保填写完整
        </p>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={saving}
          >
            取消
          </Button>
          <Button
            onClick={handleBatchSave}
            disabled={saving || data.filter(item => item.isValid).length === 0}
          >
            {saving ? '保存中...' : `保存有效数据 (${data.filter(item => item.isValid).length}条)`}
          </Button>
        </div>
      </div>
    </div>
  )
} 