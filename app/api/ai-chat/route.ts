import { NextRequest, NextResponse } from 'next/server'
import { analyzeAllRelationships, getPersonRelationships, recommendConnections } from '@/lib/relationshipAnalyzer'
import { PersonData, CompanyData } from '@/lib/dataStore'
import { deterministicAliasName, shouldAliasName, findPersonByAliasName, findPeopleByAliasName } from '@/lib/deterministicNameAlias'

// DeepSeek API配置
// 管理者版本和会员版本使用不同的API密钥
// 使用您提供的API密钥
const DEEPSEEK_API_KEY_MANAGER = process.env.NEXT_PUBLIC_DEEPSEEK_API_KEY_MANAGER || 'sk-393da700b1f64e94bd73ee12b450651a'
const DEEPSEEK_API_KEY_MEMBER = process.env.NEXT_PUBLIC_DEEPSEEK_API_KEY_MEMBER || 'sk-73f01c8df5354bc1a01a218ef6f27c16'
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions'

// 调试：打印当前使用的API密钥（仅显示前后几位）
console.log('Manager API Key:', DEEPSEEK_API_KEY_MANAGER.substring(0, 6) + '...' + DEEPSEEK_API_KEY_MANAGER.substring(DEEPSEEK_API_KEY_MANAGER.length - 4))
console.log('Member API Key:', DEEPSEEK_API_KEY_MEMBER.substring(0, 6) + '...' + DEEPSEEK_API_KEY_MEMBER.substring(DEEPSEEK_API_KEY_MEMBER.length - 4))

export async function POST(request: NextRequest) {
  try {
    const { message, history, people, companies, role } = await request.json()
    
    const isMember = role === 'member'
    
    const aliasMode = isMember
    const aliasNameFn = (name: string) => {
      if (!aliasMode) return name
      // 指定人物的别名覆盖（优先级最高）
      const ALIAS_OVERRIDES: Record<string, string> = {
        '徐翔': '宋江',
      }
      // 覆盖优先
      if (ALIAS_OVERRIDES[name]) {
        return ALIAS_OVERRIDES[name]
      }
      // 内部算法复制自 deterministicNameAlias，但不依赖shouldAliasName
      const CHARACTER_NAMES = [
        '宋江','卢俊义','吴用','公孙胜','关胜','林冲','秦明','呼延灼','花荣','柴进','李应','朱仝','鲁智深','武松','董平','张清','杨志','徐宁','索超','戴宗','刘唐','李逵','史进','穆弘','雷横','李俊','阮小二','张横','阮小五','张顺','阮小七','杨雄','石秀','解珍','解宝','燕青','朱武','黄信','孙立','宣赞','郝思文','韩滔','彭玘','单廷圭','魏定国','萧让','裴宣','欧鹏','邓飞','燕顺','孔明','孔亮','项充','李衮','金大坚','马麟','童威','童猛','孟康','侯健','陈达','杨春','郑天寿','陶宗旺','宋清','乐和','龚旺','丁得孙','穆春','曹正','宋万','杜迁','薛永','李忠','周通','汤隆','杜兴','邹润','蔡福','蔡庆','李立','李云','焦挺','石勇','孙新','顾大嫂','张青','孙二娘','王英','扈三娘','鲍旭','樊瑞','郭盛','吕方','杨林','凌振','蒋敬','唐僧','孙悟空','猪八戒','沙僧','观音菩萨','如来佛祖','太上老君','玉皇大帝','王母娘娘','太白金星','托塔天王','哪吒','二郎神','镇元大仙','菩提祖师','东海龙王','南海龙王','西海龙王','北海龙王','文殊菩萨','普贤菩萨','地藏王菩萨','弥勒佛','燃灯古佛','木叉','金吒','红孩儿','牛魔王','铁扇公主','土地公','山神','千里眼','顺风耳','四大天王','赤脚大仙','南极仙翁','福禄寿三星','八仙','嫦娥仙子'
      ]
      const hashString = (str: string) => {
        let hash = 5381
        for (let i = 0; i < str.length; i++) {
          const char = str.charCodeAt(i)
          hash = ((hash << 5) + hash) + char
        }
        return Math.abs(hash)
      }
      const index = hashString(name) % CHARACTER_NAMES.length
      return CHARACTER_NAMES[index]
    }

         // 覆盖同名函数，使后续代码保持兼容
     const shouldAliasName = () => aliasMode
     const deterministicAliasName = aliasNameFn

    // 如果客户端未提供数据或数据为空，尝试从云端（Supabase）加载
    let peopleData: PersonData[] = Array.isArray(people) ? people : []
    let companyData: CompanyData[] = Array.isArray(companies) ? companies : []

    if (peopleData.length === 0 || companyData.length === 0) {
      try {
        const { isSupabaseReady } = await import('@/lib/supabaseClient')
        if (isSupabaseReady) {
          const { listPeopleFromCloud, listCompaniesFromCloud } = await import('@/lib/cloudStore')
          if (peopleData.length === 0) peopleData = await listPeopleFromCloud()
          if (companyData.length === 0) companyData = await listCompaniesFromCloud()
        }
      } catch (e) {
        console.error('[AI Chat] 加载云端数据失败:', e)
      }
    }

    if (peopleData.length === 0 || companyData.length === 0) {
      return NextResponse.json({
        response: '抱歉，我当前无法访问到数据库数据。请检查 Supabase 配置，或稍后重试。'
      })
    }
    
    // 分析所有人物关系
    const allRelationships = analyzeAllRelationships(peopleData)
    const relationshipSummary = allRelationships.length > 0 
      ? allRelationships.map(r => {
          const person1 = peopleData.find((p: any) => p.id === r.source)
          const person2 = peopleData.find((p: any) => p.id === r.target)
          if (person1 && person2) {
            const person1DisplayName = aliasMode 
              ? aliasNameFn(person1.name) 
              : `${person1.name} [${aliasNameFn(person1.name)}]`
            const person2DisplayName = aliasMode 
              ? aliasNameFn(person2.name) 
              : `${person2.name} [${aliasNameFn(person2.name)}]`
            return `${person1DisplayName} 与 ${person2DisplayName} - ${r.relationship}`
          }
          return ''
        }).filter(Boolean).join('\n')
      : '暂无分析出的关系'
    
    // 提取数据库中所有公司名称（包括上下游）
    const databaseCompanyNames = new Set<string>()
    companyData.forEach(c => {
      databaseCompanyNames.add(c.name)
      // 添加上下游公司
      if (c.suppliers) {
        c.suppliers.forEach((s: any) => {
          const name = typeof s === 'string' ? s : (s.supplierName || s.name)
          if (name) databaseCompanyNames.add(name)
        })
      }
      if (c.customers) {
        c.customers.forEach((cust: any) => {
          const name = typeof cust === 'string' ? cust : (cust.customerName || cust.name)
          if (name) databaseCompanyNames.add(name)
        })
      }
    })
    // 从人物信息中提取公司名称
    peopleData.forEach(p => {
      if (p.company) databaseCompanyNames.add(p.company)
    })
    
    const companyNamesList = Array.from(databaseCompanyNames).join('、')

    // 增强的系统提示词
    const systemPrompt = `你是精尚慧平台的AI助理"慧慧"。你是一个专业、友好、智能的人脉助手。

你的角色和能力：
1. 帮助用户查找和了解人脉关系
2. 提供智能的人脉推荐和建议
3. 分析人物之间的潜在联系
4. 给出专业的商务社交建议

⚠️ **重要的搜索限制规则**：
1. 你只能回答关于数据库中公司的问题
2. 当用户询问某个公司时，首先检查该公司是否在以下数据库公司列表中：
   ${companyNamesList}
3. 如果用户询问的公司在数据库中，你需要：
   - 首先展示数据库中已有的信息
   - 然后可以补充你所知道的该公司的公开信息（如业务范围、行业地位等）
4. 如果用户询问的公司不在数据库中，你必须友好地告知：
   "抱歉，【公司名】不在我们的数据库中。目前我只能查询数据库中的公司信息。您可以查询以下公司：[列出3-5个相关公司]"
5. 当数据库信息较少时，可以补充该公司的公开信息，如：
   - 公司主营业务
   - 行业地位
   - 发展历程
   - 主要产品/服务
   但要明确标注"以下为公开信息补充："

回答风格：
- 友好亲切，像朋友一样对话
- 专业但不失活泼
- 提供有价值的洞察
- 主动推荐相关联系人

重要的隐私保护规则：
${aliasMode ? `
- 你正在为会员用户服务，所有人名都已经AI化处理
- 显示的人名都是水浒传/西游记的角色名，这些是真实人物的代号
- 绝对不能透露或推测真实姓名
- 在所有回复中都要使用AI化的名字
- 当用户询问某个AI化名字时，要理解这是在找某个真实的人
- 用户搜索"沙僧"、"宋江"、"孙悟空"等名字时，要在数据库中精确匹配这些AI化名字
- 如果数据库中没有对应的AI化名字，要明确告诉用户当前可搜索的AI化名字列表
` : `
- 你正在为管理员用户服务，可以显示真实姓名
- 提供完整准确的人物信息
- 每个人名后面都会显示方括号中的AI化名字，格式如："张三 [金大坚]"
- 这个方括号中的名字是该人在会员版中的代号，方便管理者与会员沟通时对应
`}

当前数据库中的人物信息（包含${people.length}人）：
${people.map((p: PersonData) => {
  const displayName = aliasMode 
    ? aliasNameFn(p.name) 
    : `${p.name} [${aliasNameFn(p.name)}]`;
  return `
【${displayName}】
- 公司：${p.company}
- 职位：${p.position}
- 现居地：${p.currentCity || p.location || '未知'}
- 家乡：${p.hometown || '未知'}
- 行业：${p.industry || '未知'}
- 电话：${aliasMode ? '仅管理员可见' : (p.phone || '未公开')}
- 邮箱：${aliasMode ? '仅管理员可见' : (p.email || '未公开')}
- 毕业院校：${p.school || '未知'}
- 产品/服务：${p.products || '未知'}
- 标签：${p.tags.join('、') || '暂无'}
- 其他信息：${p.additionalInfo || '暂无'}
`;
}).join('\n')}

公司信息：
${companyData.map((c: CompanyData) => `
【${c.name}】
- 行业：${c.industry}
- 规模：${c.scale}
- 主要产品：${c.products.join('、')}
${c.positioning ? `- 企业定位：${c.positioning}` : ''}
${c.value ? `- 企业价值：${c.value}` : ''}
${c.achievements ? `- 关键成就：${c.achievements}` : ''}
${c.suppliers && c.suppliers.length > 0 ? `- 上游供应商（共${c.suppliers.length}个）：${c.suppliers.join('、')}` : ''}
${c.customers && c.customers.length > 0 ? `- 下游客户（共${c.customers.length}个）：${c.customers.join('、')}` : ''}
- 简介：${c.additionalInfo || '暂无'}
`).join('\n')}

已分析的人物关系：
${relationshipSummary}

智能搜索策略：
1. 优先匹配姓名${aliasMode ? '（AI化名字）' : ''}
2. 其次匹配公司、职位、标签、行业
3. 推荐同公司、同学校、同行业、同城的人
4. 分析潜在的商务合作机会
5. 基于已有关系推荐二度人脉

重要提醒：
- 用户可能刚上传了Excel数据，要准确反映最新的人物信息
- 要真实反映人物之间的关系，不要虚构不存在的关系
- 如果两个人没有共同点（公司、学校、行业、城市等），就说他们暂时没有直接联系
${aliasMode ? `
- 绝对不能暴露真实姓名，所有人名都必须使用AI化的名字
- 不要提及"真实姓名"、"AI化"等概念，要自然地使用AI化名字
- 当用户问到联系方式时，要引导联系管理员` : ''}

记住：你是慧慧，要表现得智能、专业且友好。不仅要回答用户的问题，还要主动提供有价值的人脉建议。

${aliasMode ? `重要的会员服务提醒：
1. 所有人名都是AI化的代号，要自然地使用这些名字
2. 当用户搜索AI化的名字时，要理解这是在找某个人
3. 在回答时自然地使用AI化的名字，不要暴露任何真实信息
4. 在回答中多处提醒用户联系管理员获取真实信息，如："若需了解真实信息和联系方式，请联系精尚慧管理员"` : ''}`

    // 构建对话历史
    const messages = [
      {
        role: 'system',
        content: systemPrompt
      },
      ...history.slice(-5).map((msg: any) => ({  // 只保留最近5条历史
        role: msg.role,
        content: msg.content
      })),
      {
        role: 'user',
        content: message
      }
    ]

    console.log('Calling DeepSeek API with message:', message)

    // 根据角色选择对应的API密钥
    const apiKey = isMember ? DEEPSEEK_API_KEY_MEMBER : DEEPSEEK_API_KEY_MANAGER

    // 调用DeepSeek API
    const response = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: messages,
        temperature: 0.8,  // 提高创造性
        max_tokens: 1500,
        top_p: 0.95
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('DeepSeek API error:', response.status, errorText)
      
      // 如果是认证错误，提示用户
      if (response.status === 401) {
        return NextResponse.json({
          response: '抱歉，AI服务认证失败。不过我可以用本地搜索帮你找人！\n\n' + searchPeople(message, people, companies, role)
        })
      }
      
      // 其他错误使用本地搜索
      return NextResponse.json({
        response: searchPeople(message, people, companies, role)
      })
    }

    const data = await response.json()
    console.log('DeepSeek API response:', data)
    
    let aiResponse = data.choices[0].message.content
    
    // 如果是会员用户，增强隐私提示
    if (aliasMode) {
      // 从回复中提取提到的人名
      const mentionedNames = people
        .map((p: PersonData) => aliasNameFn(p.name))
        .filter((name: string) => aiResponse.includes(name))
      
      // 在回复中间适当位置插入提醒
      if (mentionedNames.length > 0) {
        // 如果回复中包含"联系方式"、"电话"、"邮箱"等词，立即提醒
        if (aiResponse.includes('联系方式') || aiResponse.includes('电话') || aiResponse.includes('邮箱')) {
          aiResponse = aiResponse.replace(
            /联系方式[：:]/g, 
            '联系方式（若需真实联系方式，请联系精尚慧管理员）：'
          )
        }
        
        // 在介绍人物基本信息后添加提醒
        const infoEndPattern = /基本信息】[\s\S]*?\n\n/
        if (infoEndPattern.test(aiResponse)) {
          aiResponse = aiResponse.replace(infoEndPattern, (match: string) => 
            match + '💡 温馨提示：您看到的是AI化保护后的名字，若需了解真实信息，请联系精尚慧管理员。\n\n'
          )
        }
        
        // 末尾再次提醒
        aiResponse += `\n\n📞 如需了解${mentionedNames[0]}的真实信息和联系方式，请联系精尚慧管理员。`
      } else {
        // 通用提醒
        aiResponse += '\n\n💡 提醒：所有人名均已AI化保护，若需了解真实信息和联系方式，请联系精尚慧管理员。'
      }
    }

    return NextResponse.json({
      response: aiResponse
    })

  } catch (error) {
    console.error('AI chat error:', error)
    
    // 使用增强的本地搜索作为备用
    try {
      const requestData = await request.json()
      const { message, people, companies, role } = requestData
      
      if (!people || !companies) {
        return NextResponse.json({
          response: '抱歉，我无法访问数据库。请刷新页面后重试。'
        })
      }
      
      const searchResults = searchPeople(message, people, companies, role)
      
      return NextResponse.json({
        response: searchResults
      })
    } catch (e) {
      return NextResponse.json({
        response: '抱歉，我遇到了一些问题。请稍后再试。'
      })
    }
  }
}

// 增强的本地搜索函数
function searchPeople(query: string, people: any[], companies: any[], role: string) {
  const lowerQuery = query.toLowerCase()
  const isMember = role === 'member'
  
  // 本地AI化函数
  const localAliasNameFn = (name: string) => {
    // 指定人物的别名覆盖（优先级最高）
    const ALIAS_OVERRIDES: Record<string, string> = {
      '徐翔': '宋江',
    }
    // 覆盖优先
    if (ALIAS_OVERRIDES[name]) {
      return ALIAS_OVERRIDES[name]
    }
    const CHARACTER_NAMES = ['宋江','卢俊义','吴用','公孙胜','关胜','林冲','秦明','呼延灼','花荣','柴进','李应','朱仝','鲁智深','武松','董平','张清','杨志','徐宁','索超','戴宗','刘唐','李逵','史进','穆弘','雷横','李俊','阮小二','张横','阮小五','张顺','阮小七','杨雄','石秀','解珍','解宝','燕青','朱武','黄信','孙立','宣赞','郝思文','韩滔','彭玘','单廷圭','魏定国','萧让','裴宣','欧鹏','邓飞','燕顺','孔明','孔亮','项充','李衮','金大坚','马麟','童威','童猛','孟康','侯健','陈达','杨春','郑天寿','陶宗旺','宋清','乐和','龚旺','丁得孙','穆春','曹正','宋万','杜迁','薛永','李忠','周通','汤隆','杜兴','邹润','蔡福','蔡庆','李立','李云','焦挺','石勇','孙新','顾大嫂','张青','孙二娘','王英','扈三娘','鲍旭','樊瑞','郭盛','吕方','杨林','凌振','蒋敬','唐僧','孙悟空','猪八戒','沙僧','观音菩萨','如来佛祖','太上老君','玉皇大帝','王母娘娘','太白金星','托塔天王','哪吒','二郎神','镇元大仙','菩提祖师','东海龙王','南海龙王','西海龙王','北海龙王','文殊菩萨','普贤菩萨','地藏王菩萨','弥勒佛','燃灯古佛','木叉','金吒','红孩儿','牛魔王','铁扇公主','土地公','山神','千里眼','顺风耳','四大天王','赤脚大仙','南极仙翁','福禄寿三星','八仙','嫦娥仙子']
    const hashString = (str: string) => {
      let hash = 5381
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i)
        hash = ((hash << 5) + hash) + char
      }
      return Math.abs(hash)
    }
    const index = hashString(name) % CHARACTER_NAMES.length
    return CHARACTER_NAMES[index]
  }
  
  // 获取显示名称的函数
  const getDisplayName = (name: string) => {
    return isMember ? localAliasNameFn(name) : `${name} [${localAliasNameFn(name)}]`
  }
  
  // 使用新的反向查找功能进行精确搜索
  let exactMatch = findPersonByAliasName(query, people)
  
  // 如果没有找到精确匹配，尝试更宽泛的搜索
  if (!exactMatch) {
    exactMatch = people.find(p => {
      const displayName = isMember ? localAliasNameFn(p.name) : p.name
      
      // 搜索时匹配当前用户角色对应的名字显示方式
      return displayName.toLowerCase() === lowerQuery ||
             displayName.toLowerCase().includes(lowerQuery) ||
             (!isMember && (p.name.toLowerCase() === lowerQuery || 
             p.name.toLowerCase().includes(lowerQuery)))
    })
  }
  
  if (exactMatch) {
    // 使用关系分析器获取相关人物
    const { relatedPeople, relationships } = getPersonRelationships(exactMatch.id, people)
    
    const displayName = getDisplayName(exactMatch.name)
    let response = `太好了！我找到了 ${displayName} 的信息！\n\n`
    response += `📋 **基本信息**\n`
    response += `• 姓名：${displayName}\n`
    response += `• 职位：${exactMatch.position}\n`
    response += `• 公司：${exactMatch.company}\n`
    response += `• 现居地：${exactMatch.currentCity || exactMatch.location}\n`
    if (exactMatch.hometown && exactMatch.hometown !== exactMatch.currentCity) {
      response += `• 家乡：${exactMatch.hometown}\n`
    }
    if (exactMatch.industry) {
      response += `• 行业：${exactMatch.industry}\n`
    }
    
    // 会员用户添加隐私提醒
    if (isMember) {
      response += `\n💡 温馨提示：您看到的是AI化保护后的名字，若需了解真实信息，请联系精尚慧管理员。\n`
    }
    
    // 对于会员用户，隐藏联系方式详情
    if (isMember) {
      response += `\n📞 **联系方式**\n`
      response += `• 联系方式：仅管理员可见（若需真实联系方式，请联系精尚慧管理员）\n`
    } else if (exactMatch.phone || exactMatch.email) {
      response += `\n📞 **联系方式**\n`
      if (exactMatch.phone) response += `• 电话：${exactMatch.phone}\n`
      if (exactMatch.email) response += `• 邮箱：${exactMatch.email}\n`
    }
    
    if (exactMatch.school) {
      response += `\n🎓 **教育背景**\n`
      response += `• 毕业院校：${exactMatch.school}\n`
    }
    
    if (exactMatch.tags.length > 0) {
      response += `\n🏷️ **标签**\n`
      response += `• ${exactMatch.tags.join('、')}\n`
    }
    
    if (exactMatch.additionalInfo) {
      response += `\n💡 **其他信息**\n`
      response += `• ${exactMatch.additionalInfo}\n`
    }
    
    // 智能推荐
    if (relatedPeople.length > 0) {
      response += `\n🤝 **${displayName}的人脉关系**\n`
      
      relationships.forEach((rel: any) => {
        const relatedPerson = relatedPeople.find((p: any) => p.id === rel.target || p.id === rel.source)
        if (relatedPerson && relatedPerson.id !== exactMatch.id) {
          const relatedDisplayName = getDisplayName(relatedPerson.name)
          response += `• ${relatedDisplayName} - ${relatedPerson.position} @ ${relatedPerson.company} (${rel.relationship})\n`
        }
      })
      
      // 推荐可能认识的人
      const recommendations = recommendConnections(exactMatch.id, people, 3)
      if (recommendations.length > 0) {
        response += `\n💡 **可能认识的人**\n`
        recommendations.forEach((rec: any) => {
          const recDisplayName = getDisplayName(rec.person.name)
          response += `• ${recDisplayName} - ${rec.person.position} @ ${rec.person.company} (${rec.reason})\n`
        })
      }
    }
    
    // 如果是会员用户，添加联系管理者的提示
    if (isMember) {
      response += `\n\n📞 如需了解${displayName}的真实信息和联系方式，请联系精尚慧管理员。`
    }
    
    return response
  }
  
  // 构建数据库公司名称集合（包括上下游）
  const dbCompanyNames = new Set<string>()
  companies.forEach((c: any) => {
    dbCompanyNames.add(c.name.toLowerCase())
    if (c.suppliers) {
      c.suppliers.forEach((s: any) => {
        const name = typeof s === 'string' ? s : (s.supplierName || s.name)
        if (name) dbCompanyNames.add(name.toLowerCase())
      })
    }
    if (c.customers) {
      c.customers.forEach((cust: any) => {
        const name = typeof cust === 'string' ? cust : (cust.customerName || cust.name)
        if (name) dbCompanyNames.add(name.toLowerCase())
      })
    }
  })
  people.forEach((p: any) => {
    if (p.company) dbCompanyNames.add(p.company.toLowerCase())
  })

  // 搜索公司 - 先检查是否在数据库中
  const companyMatch = companies.find((c: any) => 
    c.name.toLowerCase().includes(lowerQuery)
  )
  
  // 检查用户是否在查询一个看起来像公司名的内容（但不在数据库中）
  const looksLikeCompanyQuery = lowerQuery.includes('公司') || 
    lowerQuery.includes('集团') || 
    lowerQuery.includes('有限') ||
    lowerQuery.includes('股份') ||
    lowerQuery.includes('科技') ||
    lowerQuery.includes('技术')
  
  // 如果看起来在查公司但不在数据库中
  if (looksLikeCompanyQuery && !companyMatch) {
    // 检查是否在上下游公司中
    let foundInUpstream = false
    let upstreamCompanyInfo: { name: string; relatedTo: string; type: string } | null = null
    
    companies.forEach((c: any) => {
      if (c.suppliers) {
        c.suppliers.forEach((s: any) => {
          const name = typeof s === 'string' ? s : (s.supplierName || s.name)
          if (name && name.toLowerCase().includes(lowerQuery)) {
            foundInUpstream = true
            upstreamCompanyInfo = { name, relatedTo: c.name, type: '上游供应商' }
          }
        })
      }
      if (c.customers) {
        c.customers.forEach((cust: any) => {
          const name = typeof cust === 'string' ? cust : (cust.customerName || cust.name)
          if (name && name.toLowerCase().includes(lowerQuery)) {
            foundInUpstream = true
            upstreamCompanyInfo = { name, relatedTo: c.name, type: '下游客户' }
          }
        })
      }
    })
    
    if (foundInUpstream && upstreamCompanyInfo) {
      let response = `我在数据库中找到了 **${upstreamCompanyInfo.name}** 的相关信息！\n\n`
      response += `🔗 **供应链关系**\n`
      response += `• ${upstreamCompanyInfo.name} 是 ${upstreamCompanyInfo.relatedTo} 的${upstreamCompanyInfo.type}\n\n`
      response += `💡 这是一家在我们供应链网络中的企业。如需了解更多详细信息，建议查看 ${upstreamCompanyInfo.relatedTo} 的完整资料。`
      return response
    }
    
    // 完全不在数据库中
    const sampleCompanies = companies.slice(0, 5).map((c: any) => c.name).join('、')
    return `抱歉，您查询的公司不在我们的数据库中。😅\n\n` +
      `⚠️ 目前我只能查询数据库中已录入的公司信息。\n\n` +
      `📋 您可以查询以下公司：\n${sampleCompanies}\n\n` +
      `💡 如需添加新的公司信息，请联系管理员进行录入。`
  }
  
  if (companyMatch) {
    const companyPeople = people.filter(p => p.company === companyMatch.name)
    let response = `我找到了 ${companyMatch.name} 的信息！\n\n`
    response += `🏢 **公司概况**\n`
    response += `• 公司名称：${companyMatch.name}\n`
    response += `• 所属行业：${companyMatch.industry}\n`
    response += `• 公司规模：${companyMatch.scale}\n`
    response += `• 主要产品：${companyMatch.products.join('、')}\n`
    
    // 添加新的企业信息字段
    if (companyMatch.positioning) {
      response += `\n🎯 **企业定位**\n`
      response += `• ${companyMatch.positioning}\n`
    }
    
    if (companyMatch.value) {
      response += `\n💎 **企业价值**\n`
      response += `• ${companyMatch.value}\n`
    }
    
    if (companyMatch.achievements) {
      response += `\n🏆 **关键成就**\n`
      response += `• ${companyMatch.achievements}\n`
    }
    
    // 供应链信息
    if ((companyMatch.suppliers && companyMatch.suppliers.length > 0) || 
        (companyMatch.customers && companyMatch.customers.length > 0)) {
      response += `\n🔗 **供应链关系**\n`
      
      if (companyMatch.suppliers && companyMatch.suppliers.length > 0) {
        response += `• 上游供应商：${companyMatch.suppliers.slice(0, 5).join('、')}`
        if (companyMatch.suppliers.length > 5) {
          response += `等${companyMatch.suppliers.length}个`
        }
        response += '\n'
      }
      
      if (companyMatch.customers && companyMatch.customers.length > 0) {
        response += `• 下游客户：${companyMatch.customers.slice(0, 5).join('、')}`
        if (companyMatch.customers.length > 5) {
          response += `等${companyMatch.customers.length}个`
        }
        response += '\n'
      }
    }
    
    if (companyMatch.additionalInfo) {
      response += `\n📝 **其他信息**\n`
      response += `• ${companyMatch.additionalInfo}\n`
    }
    
    if (companyPeople.length > 0) {
      response += `\n👥 **公司员工**\n`
      companyPeople.forEach(p => {
        const personDisplayName = getDisplayName(p.name)
        response += `• ${personDisplayName} - ${p.position}`
        if (p.tags.length > 0) {
          response += ` (${p.tags.slice(0, 2).join('、')})`
        }
        response += '\n'
      })
      
      response += `\n💡 提示：点击"智能关系网"可以查看更详细的信息哦！`
    }
    
    // 如果是会员用户，添加联系管理者的提示
    if (isMember) {
      response += '\n\n💡 提醒：所有人名均已AI化保护，若需了解真实信息和联系方式，请联系精尚慧管理员。'
    }
    
    return response
  }
  
  // 智能模糊搜索 - 使用增强的反向查找
  const relatedByAliasName = findPeopleByAliasName(query, people)
  const relatedByTag = people.filter(p => 
    p.tags.some((tag: string) => tag.toLowerCase().includes(lowerQuery))
  )
  const relatedByPosition = people.filter(p => 
    p.position.toLowerCase().includes(lowerQuery)
  )
  const relatedByCompany = people.filter(p => 
    p.company.toLowerCase().includes(lowerQuery)
  )
  
  const allRelated = Array.from(new Set([...relatedByAliasName, ...relatedByTag, ...relatedByPosition, ...relatedByCompany]))
  
  if (allRelated.length > 0) {
    let response = `虽然没有找到完全匹配"${query}"的结果，但我发现了一些相关的人脉：\n\n`
    
    // 按相关性分类显示，优先显示AI化名字匹配的结果
    if (relatedByAliasName.length > 0) {
      response += `👤 **相关人物**\n`
      relatedByAliasName.slice(0, 3).forEach(p => {
        const aliasPersonDisplayName = getDisplayName(p.name)
        response += `• ${aliasPersonDisplayName} - ${p.position} @ ${p.company}\n`
      })
      response += '\n'
    }
    
    if (relatedByTag.length > 0) {
      response += `🏷️ **相关标签的人**\n`
      relatedByTag.slice(0, 3).forEach(p => {
        if (!relatedByAliasName.includes(p)) {
          const tagPersonDisplayName = getDisplayName(p.name)
          response += `• ${tagPersonDisplayName} - ${p.position} @ ${p.company}\n`
        }
      })
      response += '\n'
    }
    
    if (relatedByPosition.length > 0 && relatedByPosition.length !== relatedByTag.length) {
      response += `💼 **相关职位的人**\n`
      relatedByPosition.slice(0, 3).forEach(p => {
        if (!relatedByTag.includes(p) && !relatedByAliasName.includes(p)) {
          const posPersonDisplayName = getDisplayName(p.name)
          response += `• ${posPersonDisplayName} - ${p.position} @ ${p.company}\n`
        }
      })
      response += '\n'
    }
    
    response += `💡 小建议：你可以告诉我更具体的信息，比如"找做AI的人"或"清华的校友"，我会给你更精准的推荐！`
    
    // 如果是会员用户，添加联系管理者的提示
    if (isMember) {
      response += '\n\n💡 提醒：所有人名均已AI化保护，若需了解真实信息和联系方式，请联系精尚慧管理员。'
    }
    
    return response
  }
  
  // 没有找到任何结果 - 为会员用户提供更好的提示
  let response = ''
  
  if (isMember) {
    // 会员用户搜索AI化名字但没找到
    response = `抱歉，我没有找到名为"${query}"的联系人。\n\n` +
      `目前我的数据库中有以下人员：\n\n` +
      people.slice(0, 5).map(p => {
        const aliasDisplayName = localAliasNameFn(p.name)
        return `• ${aliasDisplayName} - ${p.position} @ ${p.company}`
      }).join('\n') +
      '\n\n💡 小提示：\n' +
      '1. 请尝试搜索上面列出的名字\n' +
      '2. 或者描述你想找什么类型的人（比如"做AI的"、"金融行业"）\n' +
      '3. 如需添加新的人脉信息，可以联系管理者录入'
  } else {
    // 管理者用户的原始提示
    response = `哎呀，我暂时没有找到与"${query}"相关的信息呢。😅\n\n` +
      `不过我们数据库里有这些优秀的人才：\n\n` +
      people.slice(0, 5).map(p => {
        const displayName = `${p.name} [${localAliasNameFn(p.name)}]`
        return `• ${displayName} - ${p.position} @ ${p.company}`
      }).join('\n') +
      '\n\n你可以：\n' +
      '1. 告诉我具体的姓名\n' +
      '2. 描述你想找什么类型的人（比如"AI专家"、"金融行业"）\n' +
      '3. 或者先去"信息录入"添加新的人脉信息！'
  }
    
  // 如果是会员用户，添加联系管理者的提示
  if (isMember) {
    response += '\n\n💡 提醒：所有人名均已AI化保护，若需了解真实信息和联系方式，请联系精尚慧管理员。'
  }
  
  return response
} 
