// 关系网络管理器 - 用于AI自动梳理关系
import { PersonData, CompanyData, getPeople, getCompanies } from './dataStore'
import { DEEPSEEK_CONFIG } from './config'

export interface RelationshipData {
  id: string
  personId: string
  relatedPersonId?: string
  relatedCompanyId?: string
  relationshipType: 'colleague' | 'schoolmate' | 'industry_partner' | 'business_contact' | 'supplier' | 'customer' | 'superior' | 'subordinate'
  strength: number // 0-1 之间的关系强度
  description: string
  createdAt: Date
  updatedAt: Date
}

const RELATIONSHIPS_KEY = 'ecosystem_relationships'

// 从云端加载关系数据（如果可用）
export const loadRelationshipsFromCloud = async (): Promise<RelationshipData[] | null> => {
  try {
    const { isSupabaseReady } = await import('./supabaseClient')
    if (!isSupabaseReady) {
      console.log('[RelationshipManager] Supabase未配置，使用本地数据')
      return null
    }
    const { listRelationshipsFromCloud } = await import('./cloudStore')
    const relationships = await listRelationshipsFromCloud()
    console.log('[RelationshipManager] 从云端加载关系数据:', relationships.length, '条')
    // 同时缓存到本地
    if (typeof window !== 'undefined') {
      localStorage.setItem(RELATIONSHIPS_KEY, JSON.stringify(relationships))
    }
    return relationships
  } catch (error) {
    console.error('[RelationshipManager] 从云端加载关系数据失败:', error)
    return null
  }
}

// 获取所有关系数据（同步版本，优先使用本地缓存）
export const getRelationships = (): RelationshipData[] => {
  if (typeof window === 'undefined') return []
  const data = localStorage.getItem(RELATIONSHIPS_KEY)
  return data ? JSON.parse(data) : []
}

// 保存关系数据（同步到本地和云端）
export const saveRelationships = (relationships: RelationshipData[]) => {
  if (typeof window === 'undefined') return
  
  // 保存到本地
  localStorage.setItem(RELATIONSHIPS_KEY, JSON.stringify(relationships))
  
  // 异步同步到云端
  ;(async () => {
    try {
      const { isSupabaseReady } = await import('./supabaseClient')
      if (!isSupabaseReady) {
        console.log('[RelationshipManager] Supabase未配置，仅保存到本地')
        return
      }
      const { batchUpsertRelationshipsToCloud } = await import('./cloudStore')
      await batchUpsertRelationshipsToCloud(relationships)
      console.log('[RelationshipManager] 关系数据已同步到云端')
    } catch (error) {
      console.error('[RelationshipManager] 关系数据云端同步失败:', error)
    }
  })()
}

// 调用DeepSeek API分析关系
export const analyzeRelationships = async (newPerson: PersonData): Promise<RelationshipData[]> => {
  const allPeople = getPeople()
  const allCompanies = getCompanies()
  
  // 如果没有配置API密钥，返回基本关系分析
  if (!DEEPSEEK_CONFIG.apiKey) {
    return generateBasicRelationships(newPerson, allPeople, allCompanies)
  }

  try {
    const prompt = `
      请分析以下新增人物与现有人物和公司的关系：
      
      新增人物：${JSON.stringify(newPerson)}
      
      现有人物：${JSON.stringify(allPeople.filter(p => p.id !== newPerson.id))}
      
      现有公司：${JSON.stringify(allCompanies)}
      
             请分析并返回JSON格式的关系数据，包含：
       1. 同事关系（相同公司的人）
       2. 校友关系（相同学校的人）
       3. 行业伙伴关系（相同行业的人）
       4. 业务关系（可能的供应商、客户等）
       5. 上下级关系（同公司不同职位级别的人）
       
       分析时要特别注意：
       - CEO、总经理、董事长等高级管理职位是其他人的上级
       - 经理、主管等中级管理职位可能是某些人的上级
       - 助理、专员等初级职位通常是下级
       
       返回格式：
       {
         "relationships": [
           {
             "relatedPersonId": "person_id",
             "relationshipType": "colleague|schoolmate|industry_partner|business_contact|superior|subordinate",
             "strength": 0.8,
             "description": "关系描述"
           }
         ]
       }
    `

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
            content: '你是一个专业的关系网络分析师，擅长分析人物之间的关系。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 2000
      })
    })

    if (!response.ok) {
      throw new Error('AI分析失败')
    }

    const data = await response.json()
    const aiResult = data.choices[0].message.content

    // 尝试解析AI返回的JSON
    const parsedResult = JSON.parse(aiResult)
    
    // 转换为标准的关系数据格式
    const relationships: RelationshipData[] = parsedResult.relationships.map((rel: any) => ({
      id: `${newPerson.id}_${rel.relatedPersonId}_${Date.now()}`,
      personId: newPerson.id,
      relatedPersonId: rel.relatedPersonId,
      relationshipType: rel.relationshipType,
      strength: rel.strength,
      description: rel.description,
      createdAt: new Date(),
      updatedAt: new Date()
    }))

    return relationships

  } catch (error) {
    console.error('AI关系分析失败:', error)
    // 降级到基本关系分析
    return generateBasicRelationships(newPerson, allPeople, allCompanies)
  }
}

// 判断职位级别
const getPositionLevel = (position: string): number => {
  const lowerPosition = position.toLowerCase()
  
  // 高级管理层 (级别 3)
  if (lowerPosition.includes('ceo') || lowerPosition.includes('总经理') || 
      lowerPosition.includes('董事长') || lowerPosition.includes('总裁') ||
      lowerPosition.includes('创始人') || lowerPosition.includes('president')) {
    return 3
  }
  
  // 中级管理层 (级别 2)
  if (lowerPosition.includes('经理') || lowerPosition.includes('主管') ||
      lowerPosition.includes('总监') || lowerPosition.includes('部长') ||
      lowerPosition.includes('manager') || lowerPosition.includes('director')) {
    return 2
  }
  
  // 初级员工 (级别 1)
  if (lowerPosition.includes('助理') || lowerPosition.includes('专员') ||
      lowerPosition.includes('实习') || lowerPosition.includes('intern') ||
      lowerPosition.includes('assistant') || lowerPosition.includes('specialist')) {
    return 1
  }
  
  // 其他普通员工 (级别 1.5)
  return 1.5
}

// 基本关系分析（不使用AI）
const generateBasicRelationships = (
  newPerson: PersonData, 
  allPeople: PersonData[], 
  allCompanies: CompanyData[]
): RelationshipData[] => {
  const relationships: RelationshipData[] = []

  allPeople.forEach(person => {
    if (person.id === newPerson.id) return

    // 同公司关系 - 检查任意公司匹配
    const commonCompanies = (newPerson.allCompanies || [{company: newPerson.company, position: newPerson.position}]).filter(nc =>
      (person.allCompanies || [{company: person.company, position: person.position}]).some(pc => pc.company === nc.company)
    )
    if (commonCompanies.length > 0) {
      commonCompanies.forEach(common => {
        const newPersonLevel = getPositionLevel(common.position)
        const personCompany = (person.allCompanies || []).find(pc => pc.company === common.company) || {position: person.position}
        const personLevel = getPositionLevel(personCompany.position)
        
        let relType: 'colleague' | 'superior' | 'subordinate' = 'colleague'
        let description = `同在${common.company}工作`
        if (Math.abs(newPersonLevel - personLevel) > 0.5) {
          if (newPersonLevel > personLevel) {
            relType = 'subordinate'
            description = `${person.name}是${newPerson.name}的下属 (${common.company})`
          } else {
            relType = 'superior'
            description = `${person.name}是${newPerson.name}的上级 (${common.company})`
          }
        } else {
          description = `同在${common.company}工作`
        }
        
        relationships.push({
          id: `${newPerson.id}_${person.id}_${relType}_${common.company}`,
          personId: newPerson.id,
          relatedPersonId: person.id,
          relationshipType: relType,
          strength: relType === 'colleague' ? 0.8 : 0.9,
          description,
          createdAt: new Date(),
          updatedAt: new Date()
        })
      })
    }

    // 校友关系 - 检查任意学校匹配
    const newEducations = newPerson.educations || (newPerson.school ? [{school: newPerson.school}] : [])
    const personEducations = person.educations || (person.school ? [{school: person.school}] : [])
    const commonSchools = newEducations.filter(ne => personEducations.some(pe => pe.school === ne.school))
    if (commonSchools.length > 0) {
      commonSchools.forEach(common => {
        relationships.push({
          id: `${newPerson.id}_${person.id}_schoolmate_${common.school}`,
          personId: newPerson.id,
          relatedPersonId: person.id,
          relationshipType: 'schoolmate',
          strength: 0.6,
          description: `同为${common.school}校友`,
          createdAt: new Date(),
          updatedAt: new Date()
        })
      })
    }

    // 行业伙伴关系
    if (person.industry === newPerson.industry && newPerson.industry) {
      relationships.push({
        id: `${newPerson.id}_${person.id}_industry`,
        personId: newPerson.id,
        relatedPersonId: person.id,
        relationshipType: 'industry_partner',
        strength: 0.4,
        description: `同在${newPerson.industry}行业`,
        createdAt: new Date(),
        updatedAt: new Date()
      })
    }
  })

  return relationships
}

// 批量分析所有人员关系
export const analyzeAllRelationships = async (): Promise<void> => {
  try {
    console.log('开始批量分析所有人员关系...')
    
    const allPeople = getPeople()
    const allCompanies = getCompanies()
    let allRelationships: RelationshipData[] = []
    
    // 为每个人分析关系
    for (const person of allPeople) {
      const personRelationships = await analyzeRelationships(person)
      allRelationships = [...allRelationships, ...personRelationships]
    }
    
    // 去重 - 避免双向重复关系
    const uniqueRelationships = allRelationships.filter((rel, index, arr) => {
      return arr.findIndex(r => 
        (r.personId === rel.personId && r.relatedPersonId === rel.relatedPersonId) ||
        (r.personId === rel.relatedPersonId && r.relatedPersonId === rel.personId)
      ) === index
    })
    
    // 保存所有关系
    saveRelationships(uniqueRelationships)
    
    console.log(`批量关系分析完成，共生成${uniqueRelationships.length}个关系`)
    
  } catch (error) {
    console.error('批量关系分析失败:', error)
  }
}

// 强制重新分析关系（清空现有关系后重新分析）
export const forceAnalyzeAllRelationships = async (): Promise<void> => {
  try {
    console.log('开始强制重新分析所有关系...')
    
    // 清空现有关系
    saveRelationships([])
    
    // 重新分析
    await analyzeAllRelationships()
    
  } catch (error) {
    console.error('强制重新分析关系失败:', error)
  }
}

// 更新关系网络
export const updateRelationshipNetwork = async (newPerson: PersonData): Promise<void> => {
  try {
    console.log('开始分析关系网络...')
    
    // 获取新的关系数据
    const newRelationships = await analyzeRelationships(newPerson)
    
    // 获取现有关系数据
    const existingRelationships = getRelationships()
    
    // 合并关系数据（避免重复）
    const updatedRelationships = [...existingRelationships]
    
    newRelationships.forEach(newRel => {
      const exists = existingRelationships.some(existing => 
        existing.personId === newRel.personId && 
        existing.relatedPersonId === newRel.relatedPersonId &&
        existing.relationshipType === newRel.relationshipType
      )
      
      if (!exists) {
        updatedRelationships.push(newRel)
      }
    })
    
    // 保存更新后的关系数据
    saveRelationships(updatedRelationships)
    
    console.log(`关系网络更新完成，新增${newRelationships.length}个关系`)
    
  } catch (error) {
    console.error('关系网络更新失败:', error)
  }
}

// 获取某个人的所有关系
export const getPersonRelationships = (personId: string): RelationshipData[] => {
  const allRelationships = getRelationships()
  return allRelationships.filter(rel => 
    rel.personId === personId || rel.relatedPersonId === personId
  )
} 