// 关系网络管理器 - 用于AI自动梳理关系
import { PersonData, CompanyData } from './dataStore'
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
  // 优先从云端加载数据
  const { loadPeopleFromCloudIfAvailable, loadCompaniesFromCloudIfAvailable, getPeople, getCompanies } = await import('./dataStore')
  
  const cloudPeople = await loadPeopleFromCloudIfAvailable()
  const cloudCompanies = await loadCompaniesFromCloudIfAvailable()
  
  const allPeople = cloudPeople !== null ? cloudPeople : getPeople()
  const allCompanies = cloudCompanies !== null ? cloudCompanies : getCompanies()
  
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
       
       返回格式：
       {
         "relationships": [
           {
             "relatedPersonId": "person_id",
             "relationshipType": "colleague|schoolmate|industry_partner|business_contact",
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

// 基本关系分析（不使用AI）
const generateBasicRelationships = (
  newPerson: PersonData, 
  allPeople: PersonData[], 
  allCompanies: CompanyData[]
): RelationshipData[] => {
  const relationships: RelationshipData[] = []
  
  console.log(`[generateBasicRelationships] 分析 ${newPerson.name} 的关系`)
  console.log(`  - 公司: ${newPerson.company}`)
  console.log(`  - 所有公司: ${JSON.stringify(newPerson.allCompanies)}`)
  console.log(`  - 与其他 ${allPeople.length - 1} 人对比`)

  allPeople.forEach(person => {
    if (person.id === newPerson.id) return

    // 标准化公司名称的函数
    const normalizeCompany = (name: string) => {
      if (!name) return ''
      return name.trim().toLowerCase().replace(/\s+/g, '').replace(/[（）()]/g, '')
    }

    // 同公司关系 - 检查任意公司匹配（忽略大小写和空格）
    const newPersonCompanies = newPerson.allCompanies || [{company: newPerson.company, position: newPerson.position}]
    const personCompanies = person.allCompanies || [{company: person.company, position: person.position}]
    
    console.log(`  对比 ${person.name}: 公司=${person.company}`)
    
    const commonCompanies = newPersonCompanies.filter(nc => {
      if (!nc.company) {
        console.log(`    ${newPerson.name} 的公司为空`)
        return false
      }
      const normalizedNew = normalizeCompany(nc.company)
      console.log(`    标准化后: ${normalizedNew}`)
      const found = personCompanies.some(pc => {
        if (!pc.company) return false
        const normalizedPc = normalizeCompany(pc.company)
        const match = normalizedPc === normalizedNew
        if (match) {
          console.log(`    ✅ 找到匹配: ${nc.company} === ${pc.company}`)
        }
        return match
      })
      return found
    })
    
    console.log(`  共同公司数: ${commonCompanies.length}`)
    if (commonCompanies.length > 0) {
      commonCompanies.forEach(common => {
        // 统一为同事关系，不再区分上下级
        const relType = 'colleague'
        const description = `同在${common.company}工作`
        
        relationships.push({
          id: `${newPerson.id}_${person.id}_${relType}_${common.company}`,
          personId: newPerson.id,
          relatedPersonId: person.id,
          relationshipType: relType,
          strength: 0.8,
          description,
          createdAt: new Date(),
          updatedAt: new Date()
        })
      })
    }

    // 标准化学校名称的函数
    const normalizeSchool = (name: string) => {
      if (!name) return ''
      return name.trim().toLowerCase().replace(/\s+/g, '').replace(/[（）()]/g, '')
    }

    // 校友关系 - 检查任意学校匹配（忽略大小写和空格）
    const newEducations = newPerson.educations || (newPerson.school ? [{school: newPerson.school}] : [])
    const personEducations = person.educations || (person.school ? [{school: person.school}] : [])
    const commonSchools = newEducations.filter(ne => {
      if (!ne.school) return false
      const normalizedNew = normalizeSchool(ne.school)
      return personEducations.some(pe => {
        if (!pe.school) return false
        return normalizeSchool(pe.school) === normalizedNew
      })
    })
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
    
    // 优先从云端加载数据
    const { loadPeopleFromCloudIfAvailable, loadCompaniesFromCloudIfAvailable, getPeople, getCompanies } = await import('./dataStore')
    
    // 尝试从云端加载
    const cloudPeople = await loadPeopleFromCloudIfAvailable()
    const cloudCompanies = await loadCompaniesFromCloudIfAvailable()
    
    // 使用云端数据或本地数据
    const allPeople = cloudPeople !== null ? cloudPeople : getPeople()
    const allCompanies = cloudCompanies !== null ? cloudCompanies : getCompanies()
    
    if (allPeople.length === 0) {
      console.warn('[RelationshipManager] 没有找到人员数据，无法分析关系')
      return
    }
    
    console.log(`[RelationshipManager] 准备分析 ${allPeople.length} 个人员的关系`)
    let allRelationships: RelationshipData[] = []
    
    // 为每个人分析关系
    for (const person of allPeople) {
      const personRelationships = await analyzeRelationships(person)
      allRelationships = [...allRelationships, ...personRelationships]
    }
    
    // 去重 - 避免完全相同的关系，但保留不同类型的关系
    const uniqueRelationships = allRelationships.filter((rel, index, arr) => {
      return arr.findIndex(r => 
        r.personId === rel.personId && 
        r.relatedPersonId === rel.relatedPersonId &&
        r.relationshipType === rel.relationshipType
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