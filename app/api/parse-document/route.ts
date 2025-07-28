import { NextRequest, NextResponse } from 'next/server'

// DeepSeek API配置
const DEEPSEEK_API_KEY = process.env.NEXT_PUBLIC_DEEPSEEK_API_KEY || 'sk-93e0f6f2bb2146a3bae7187ee1c0c84f'
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json({ error: '没有上传文件' }, { status: 400 })
    }

    // 判断文件类型
    const fileName = file.name.toLowerCase()
    const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls')
    
    // 读取文件内容
    const fileBuffer = await file.arrayBuffer()
    const fileContent = Buffer.from(fileBuffer).toString('base64')
    
    // 构建提示词
    const prompt = `请分析以下${isExcel ? 'Excel' : '文档'}内容，提取并返回以下信息：
    - 姓名 (name)
    - 公司 (company)
    - 职位 (position)
    - 电话 (phone)
    - 邮箱 (email)
    - 毕业院校 (school)
    - 家乡 (hometown)
    - 现居地 (currentCity)
    - 行业 (industry)
    - 工作经历 (workHistory)
    - 产品/服务 (products)
    - 其他重要信息 (additionalInfo)
    
    请以JSON格式返回，没有的字段返回空字符串。
    ${isExcel ? '如果是Excel文件，请解析表格中的每一行数据。' : ''}
    
    文档内容（base64编码）：${fileContent}`

    // 调用DeepSeek API
    const response = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: '你是一个专业的文档解析助手，擅长从简历、名片、Excel等文档中提取结构化信息。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 2048
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('DeepSeek API error:', errorText)
      
      // 返回模拟数据以供测试
      return NextResponse.json({
        name: '测试用户',
        company: '测试公司',
        position: '产品经理',
        phone: '13800138000',
        email: 'test@example.com',
        school: '清华大学',
        hometown: '北京市',
        currentCity: '上海市',
        industry: '互联网/电子商务',
        workHistory: '5年互联网产品经验',
        products: 'AI产品',
        additionalInfo: '这是模拟数据，DeepSeek API暂时不可用'
      })
    }

    const data = await response.json()
    
    // 解析DeepSeek返回的内容
    try {
      const content = data.choices[0].message.content
      const parsedData = JSON.parse(content)
      return NextResponse.json(parsedData)
    } catch (parseError) {
      // 如果解析失败，返回默认结构
      return NextResponse.json({
        name: '',
        company: '',
        position: '',
        phone: '',
        email: '',
        school: '',
        hometown: '',
        currentCity: '',
        industry: '',
        workHistory: '',
        products: '',
        additionalInfo: data.choices[0].message.content || ''
      })
    }

  } catch (error) {
    console.error('Document parsing error:', error)
    
    // 返回模拟数据
    return NextResponse.json({
      name: '示例用户',
      company: '示例公司',
      position: '技术总监',
      phone: '13900139000',
      email: 'example@test.com',
      school: '北京大学',
      hometown: '上海市',
      currentCity: '北京市',
      industry: '计算机软件',
      workHistory: '10年技术管理经验',
      products: '企业管理软件',
      additionalInfo: '文档解析遇到问题，返回示例数据'
    })
  }
} 