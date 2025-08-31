// 确定性名字AI化 - 纯函数实现

// 水浒传和西游记的正面人物名字池
const CHARACTER_NAMES = [
  // 水浒传正面人物
  '宋江', '卢俊义', '吴用', '公孙胜', '关胜', '林冲', '秦明', '呼延灼', '花荣', '柴进',
  '李应', '朱仝', '鲁智深', '武松', '董平', '张清', '杨志', '徐宁', '索超', '戴宗',
  '刘唐', '李逵', '史进', '穆弘', '雷横', '李俊', '阮小二', '张横', '阮小五', '张顺',
  '阮小七', '杨雄', '石秀', '解珍', '解宝', '燕青', '朱武', '黄信', '孙立', '宣赞',
  '郝思文', '韩滔', '彭玘', '单廷圭', '魏定国', '萧让', '裴宣', '欧鹏', '邓飞', '燕顺',
  '孔明', '孔亮', '项充', '李衮', '金大坚', '马麟', '童威', '童猛', '孟康', '侯健',
  '陈达', '杨春', '郑天寿', '陶宗旺', '宋清', '乐和', '龚旺', '丁得孙', '穆春', '曹正',
  '宋万', '杜迁', '薛永', '李忠', '周通', '汤隆', '杜兴', '邹润', '蔡福', '蔡庆',
  '李立', '李云', '焦挺', '石勇', '孙新', '顾大嫂', '张青', '孙二娘', '王英', '扈三娘',
  '鲍旭', '樊瑞', '郭盛', '吕方', '杨林', '凌振', '蒋敬',
  
  // 西游记正面人物
  '唐僧', '孙悟空', '猪八戒', '沙僧', '观音菩萨', '如来佛祖', '太上老君', '玉皇大帝', '王母娘娘', '太白金星',
  '托塔天王', '哪吒', '二郎神', '镇元大仙', '菩提祖师', '东海龙王', '南海龙王', '西海龙王', '北海龙王', '文殊菩萨',
  '普贤菩萨', '地藏王菩萨', '弥勒佛', '燃灯古佛', '木叉', '金吒', '红孩儿', '牛魔王', '铁扇公主', '土地公',
  '山神', '千里眼', '顺风耳', '四大天王', '赤脚大仙', '南极仙翁', '福禄寿三星', '八仙', '嫦娥仙子'
]

// 指定人物的别名覆盖（优先级最高）
const ALIAS_OVERRIDES: Record<string, string> = {
  '徐翔': '如来佛祖',
}

// 简单的字符串哈希函数
function hashString(str: string): number {
  let hash = 5381
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) + hash) + char // hash * 33 + char
  }
  return Math.abs(hash)
}

// 缓存用户角色，避免频繁读取localStorage
let cachedUserRole: string | null = null
let lastCheckTime = 0
const CACHE_DURATION = 5000 // 5秒缓存

// 检查是否需要AI化（基于用户角色）
export function shouldAliasName(): boolean {
  if (typeof window !== 'undefined') {
    const now = Date.now()
    // 如果缓存过期或未初始化，重新读取
    if (!cachedUserRole || now - lastCheckTime > CACHE_DURATION) {
      cachedUserRole = localStorage.getItem('userRole')
      lastCheckTime = now
    }
    return cachedUserRole === 'member'
  }
  return false
}

// 纯确定性的名字AI化函数
export function deterministicAliasName(realName: string): string {
  if (!shouldAliasName()) {
    return realName
  }
  // 覆盖优先
  if (ALIAS_OVERRIDES[realName]) {
    return ALIAS_OVERRIDES[realName]
  }
  
  // 基于名字生成稳定的索引
  const hash = hashString(realName)
  const index = hash % CHARACTER_NAMES.length
  
  // 直接返回对应的AI化名字
  return CHARACTER_NAMES[index]
}

// 强制获取AI别名（不受用户角色影响）
export function forceGetAliasName(realName: string): string {
  // 覆盖优先
  if (ALIAS_OVERRIDES[realName]) {
    return ALIAS_OVERRIDES[realName]
  }
  // 基于名字生成稳定的索引
  const hash = hashString(realName)
  const index = hash % CHARACTER_NAMES.length
  
  // 直接返回对应的AI化名字
  return CHARACTER_NAMES[index]
}

// 清除缓存（在用户角色改变时调用）
export function clearRoleCache(): void {
  cachedUserRole = null
  lastCheckTime = 0
}

// 反向查找：从AI化名字找到可能的真实人物
export function findPersonByAliasName(aliasName: string, people: any[]): any | null {
  if (!shouldAliasName()) {
    // 如果不需要AI化，直接按真实姓名搜索
    return people.find(p => p.name.toLowerCase().includes(aliasName.toLowerCase()))
  }
  
  // 遍历所有人物，找到AI化名字匹配的人
  for (const person of people) {
    const personAliasName = deterministicAliasName(person.name)
    if (personAliasName === aliasName || 
        personAliasName.toLowerCase().includes(aliasName.toLowerCase()) ||
        aliasName.toLowerCase().includes(personAliasName.toLowerCase())) {
      return person
    }
  }
  
  return null
}

// 批量反向查找：找到所有匹配AI化名字的人物
export function findPeopleByAliasName(aliasName: string, people: any[]): any[] {
  if (!shouldAliasName()) {
    // 如果不需要AI化，直接按真实姓名搜索
    return people.filter(p => 
      p.name.toLowerCase().includes(aliasName.toLowerCase()) ||
      p.company.toLowerCase().includes(aliasName.toLowerCase()) ||
      p.position.toLowerCase().includes(aliasName.toLowerCase()) ||
      p.tags.some((tag: string) => tag.toLowerCase().includes(aliasName.toLowerCase()))
    )
  }
  
  // 遍历所有人物，找到AI化名字匹配的人
  const matchedPeople: any[] = []
  for (const person of people) {
    const personAliasName = deterministicAliasName(person.name)
    if (personAliasName === aliasName || 
        personAliasName.toLowerCase().includes(aliasName.toLowerCase()) ||
        aliasName.toLowerCase().includes(personAliasName.toLowerCase())) {
      matchedPeople.push(person)
    }
  }
  
  return matchedPeople
}

// 为了兼容性，提供一个简单的反向查找（仅用于开发调试）
// 注意：这不是完美的反向映射，因为可能存在哈希冲突
export function debugFindPossibleRealNames(aliasName: string): string[] {
  const possibleNames: string[] = []
  
  // 这里仅作为示例，实际应用中应该从数据库获取所有真实姓名
  const testNames = ['张三', '李四', '王五', '赵六', '钱七', '孙八', '周九', '吴十']
  
  for (const name of testNames) {
    if (deterministicAliasName(name) === aliasName) {
      possibleNames.push(name)
    }
  }
  
  return possibleNames
}