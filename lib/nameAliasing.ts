// 名字AI化功能 - 辅助函数

// 保留CHARACTER_NAMES供Context使用
export const CHARACTER_NAMES = [
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
  '鲍旭', '樊瑞', '孔亮', '孔明', '郭盛', '吕方', '邓飞', '杨林', '凌振', '蒋敬',
  
  // 西游记正面人物
  '唐僧', '孙悟空', '猪八戒', '沙僧', '观音菩萨', '如来佛祖', '太上老君', '玉皇大帝', '王母娘娘', '太白金星',
  '托塔天王', '哪吒', '二郎神', '镇元大仙', '菩提祖师', '东海龙王', '南海龙王', '西海龙王', '北海龙王', '文殊菩萨',
  '普贤菩萨', '地藏王菩萨', '弥勒佛', '燃灯古佛', '木叉', '金吒', '红孩儿', '牛魔王', '铁扇公主', '土地公',
  '山神', '太白金星', '千里眼', '顺风耳', '四大天王', '赤脚大仙', '南极仙翁', '福禄寿三星', '八仙', '嫦娥仙子'
];

// 存储真实名字到AI化名字的映射
const nameMapping: Map<string, string> = new Map();
const reverseMapping: Map<string, string> = new Map(); // AI化名字到真实名字的反向映射
let usedNames: Set<string> = new Set();
let isInitialized = false; // 添加初始化标志

// 初始化已使用的名字（从localStorage加载）
const initializeNameMappings = () => {
  if (isInitialized) return; // 如果已经初始化，直接返回
  
  if (typeof window !== 'undefined') {
    const savedMappings = localStorage.getItem('nameAliasMapping');
    if (savedMappings) {
      try {
        const mappings = JSON.parse(savedMappings);
        Object.entries(mappings).forEach(([real, alias]) => {
          nameMapping.set(real, alias as string);
          reverseMapping.set(alias as string, real);
          usedNames.add(alias as string);
        });
      } catch (e) {
        console.error('Failed to parse name mappings:', e);
      }
    }
  }
  isInitialized = true;
};

// 保存映射到localStorage
const saveNameMappings = () => {
  if (typeof window !== 'undefined') {
    const mappings: Record<string, string> = {};
    nameMapping.forEach((alias, real) => {
      mappings[real] = alias;
    });
    localStorage.setItem('nameAliasMapping', JSON.stringify(mappings));
  }
};

// 获取一个未使用的AI化名字
const getUnusedCharacterName = (realName: string): string => {
  // 基于真实姓名生成确定性的索引
  let hash = 0;
  for (let i = 0; i < realName.length; i++) {
    const char = realName.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  // 确保hash为正数
  const positiveHash = Math.abs(hash);
  
  // 尝试找到一个未使用的名字
  let attempts = 0;
  while (attempts < CHARACTER_NAMES.length * 2) {
    const index = (positiveHash + attempts) % CHARACTER_NAMES.length;
    const candidateName = CHARACTER_NAMES[index];
    
    // 如果这个名字还没被使用，或者已经映射给了当前的真实姓名，就使用它
    if (!usedNames.has(candidateName) || reverseMapping.get(candidateName) === realName) {
      return candidateName;
    }
    
    attempts++;
  }
  
  // 如果所有名字都用完了，添加数字后缀
  const baseIndex = positiveHash % CHARACTER_NAMES.length;
  const baseName = CHARACTER_NAMES[baseIndex];
  let counter = 1;
  let newName = '';
  do {
    newName = `${baseName}${counter}`;
    counter++;
  } while (usedNames.has(newName) && reverseMapping.get(newName) !== realName);
  
  return newName;
};

// 将真实名字转换为AI化名字
export const aliasName = (realName: string): string => {
  // 始终确保初始化
  initializeNameMappings();

  // 如果已经有映射，直接返回
  if (nameMapping.has(realName)) {
    return nameMapping.get(realName)!;
  }

  // 创建新的映射
  const aliasedName = getUnusedCharacterName(realName);
  nameMapping.set(realName, aliasedName);
  reverseMapping.set(aliasedName, realName);
  usedNames.add(aliasedName);
  saveNameMappings();

  return aliasedName;
};

// 将AI化名字转换回真实名字
export const getRealName = (aliasedName: string): string => {
  // 始终确保初始化
  initializeNameMappings();
  
  return reverseMapping.get(aliasedName) || aliasedName;
};

// 清除所有名字映射（仅在必要时使用）
export const clearNameMappings = () => {
  nameMapping.clear();
  reverseMapping.clear();
  usedNames.clear();
  isInitialized = false;
  if (typeof window !== 'undefined') {
    localStorage.removeItem('nameAliasMapping');
  }
};

// 批量AI化名字（用于人物列表）
export const aliasNames = (names: string[]): string[] => {
  return names.map(name => aliasName(name));
};

// 检查名字是否需要AI化（基于用户角色）
export const shouldAliasName = (): boolean => {
  if (typeof window !== 'undefined') {
    const userRole = localStorage.getItem('userRole');
    return userRole === 'member';
  }
  return false;
};

// 条件性地AI化名字（根据用户角色）
export const conditionalAliasName = (realName: string): string => {
  return shouldAliasName() ? aliasName(realName) : realName;
};

// 调试函数：获取当前所有的名字映射（仅用于开发调试）
export const debugGetAllMappings = (): { real: string, alias: string }[] => {
  initializeNameMappings();
  const mappings: { real: string, alias: string }[] = [];
  nameMapping.forEach((alias, real) => {
    mappings.push({ real, alias });
  });
  return mappings;
};

// 在模块加载时立即尝试初始化（对于客户端环境）
if (typeof window !== 'undefined') {
  initializeNameMappings();
} 