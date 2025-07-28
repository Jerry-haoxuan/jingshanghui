import { PersonData } from './dataStore'

export interface Relationship {
  source: string
  target: string
  relationship: string
  strength: number
  details?: string
}

// 分析两个人之间的关系
export function analyzeRelationship(person1: PersonData, person2: PersonData): Relationship[] {
  const relationships: Relationship[] = []
  
  // 同公司关系
  if (person1.company && person2.company && 
      person1.company.toLowerCase() === person2.company.toLowerCase()) {
    relationships.push({
      source: person1.id,
      target: person2.id,
      relationship: '同事',
      strength: 0.9,
      details: `同在${person1.company}`
    })
  }
  
  // 同学校关系
  if (person1.school && person2.school && 
      person1.school.toLowerCase() === person2.school.toLowerCase()) {
    relationships.push({
      source: person1.id,
      target: person2.id,
      relationship: '校友',
      strength: 0.7,
      details: `同为${person1.school}校友`
    })
  }
  
  // 同行业关系
  if (person1.industry && person2.industry && 
      person1.industry === person2.industry) {
    relationships.push({
      source: person1.id,
      target: person2.id,
      relationship: '同行',
      strength: 0.5,
      details: `都在${person1.industry}行业`
    })
  }
  
  // 同城关系
  if (person1.currentCity && person2.currentCity && 
      person1.currentCity === person2.currentCity) {
    relationships.push({
      source: person1.id,
      target: person2.id,
      relationship: '同城',
      strength: 0.3,
      details: `都在${person1.currentCity}`
    })
  }
  
  // 同乡关系
  if (person1.hometown && person2.hometown && 
      person1.hometown === person2.hometown && 
      person1.hometown !== person1.currentCity) {
    relationships.push({
      source: person1.id,
      target: person2.id,
      relationship: '同乡',
      strength: 0.4,
      details: `都来自${person1.hometown}`
    })
  }
  
  return relationships
}

// 分析所有人物之间的关系网络
export function analyzeAllRelationships(people: PersonData[]): Relationship[] {
  const allRelationships: Relationship[] = []
  const processedPairs = new Set<string>()
  
  // 分析每对人物之间的关系
  for (let i = 0; i < people.length; i++) {
    for (let j = i + 1; j < people.length; j++) {
      const person1 = people[i]
      const person2 = people[j]
      
      // 创建唯一的配对标识，避免重复
      const pairId = [person1.id, person2.id].sort().join('-')
      if (processedPairs.has(pairId)) continue
      
      processedPairs.add(pairId)
      
      // 分析这对人物的关系
      const relationships = analyzeRelationship(person1, person2)
      
      // 如果有多个关系，选择最强的那个
      if (relationships.length > 0) {
        const strongestRelation = relationships.reduce((prev, current) => 
          current.strength > prev.strength ? current : prev
        )
        allRelationships.push(strongestRelation)
      }
    }
  }
  
  return allRelationships
}

// 获取某个人的一级关系网络
export function getPersonRelationships(personId: string, people: PersonData[]): {
  relatedPeople: PersonData[]
  relationships: Relationship[]
} {
  const person = people.find(p => p.id === personId)
  if (!person) return { relatedPeople: [], relationships: [] }
  
  const relationships: Relationship[] = []
  const relatedPeopleIds = new Set<string>()
  
  // 找出所有与此人相关的人
  people.forEach(otherPerson => {
    if (otherPerson.id === personId) return
    
    const relations = analyzeRelationship(person, otherPerson)
    if (relations.length > 0) {
      // 选择最强的关系
      const strongestRelation = relations.reduce((prev, current) => 
        current.strength > prev.strength ? current : prev
      )
      relationships.push(strongestRelation)
      relatedPeopleIds.add(otherPerson.id)
    }
  })
  
  const relatedPeople = people.filter(p => relatedPeopleIds.has(p.id))
  
  return { relatedPeople, relationships }
}

// 基于关系强度推荐可能认识的人
export function recommendConnections(personId: string, people: PersonData[], limit: number = 5): {
  person: PersonData
  reason: string
  score: number
}[] {
  const person = people.find(p => p.id === personId)
  if (!person) return []
  
  // 获取已有的直接关系
  const { relatedPeople } = getPersonRelationships(personId, people)
  const directConnectionIds = new Set(relatedPeople.map(p => p.id))
  directConnectionIds.add(personId) // 排除自己
  
  // 计算与其他人的潜在联系分数
  const recommendations = people
    .filter(p => !directConnectionIds.has(p.id))
    .map(otherPerson => {
      let score = 0
      let reasons: string[] = []
      
      // 二度关系加分
      relatedPeople.forEach(connection => {
        const secondDegreeRelations = analyzeRelationship(connection, otherPerson)
        if (secondDegreeRelations.length > 0) {
          score += 0.3
          reasons.push(`通过${connection.name}可能认识`)
        }
      })
      
      // 同行业但不同公司加分
      if (person.industry === otherPerson.industry && 
          person.company !== otherPerson.company) {
        score += 0.2
        reasons.push(`同在${person.industry}行业`)
      }
      
      // 同城但不同公司加分
      if (person.currentCity === otherPerson.currentCity && 
          person.company !== otherPerson.company) {
        score += 0.1
        reasons.push(`同在${person.currentCity}`)
      }
      
      return {
        person: otherPerson,
        reason: reasons.join('；'),
        score
      }
    })
    .filter(rec => rec.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
  
  return recommendations
} 