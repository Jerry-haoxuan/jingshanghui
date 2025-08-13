import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json({ error: '没有上传文件' }, { status: 400 })
    }

    // 检查文件类型
    const fileName = file.name.toLowerCase()
    if (!fileName.endsWith('.xlsx') && !fileName.endsWith('.xls')) {
      return NextResponse.json({ error: '请上传Excel文件' }, { status: 400 })
    }

    // 读取文件内容
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    
    // 解析Excel文件
    const workbook = XLSX.read(buffer, { type: 'buffer' })
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    
    // 转换为JSON数据
    const jsonData = XLSX.utils.sheet_to_json(worksheet)
    
    // 检测文件类型：个人信息 vs 供应商/客户
    const firstRow = jsonData[0] as any
    const isSupplierCustomerFormat = firstRow && (
      firstRow['供应商名称'] || 
      firstRow['客户名称'] || 
      (firstRow['序号'] && (firstRow['供应商名称'] || firstRow['客户名称']))
    )
    
    if (isSupplierCustomerFormat) {
      // 处理供应商/客户格式
      const processedData = jsonData.map((row: any, index: number) => {
        const companyName = row['供应商名称'] || row['客户名称'] || row['企业名称'] || row['公司名称'] || row['name'] || row['名称'] || ''
        const nature = row['性质'] || row['国家'] || row['地区'] || ''
        const contact = row['联系人'] || ''
        const phone = row['电话'] || row['联系电话'] || ''
        
        return {
          company: String(companyName).trim(),
          nature: String(nature).trim(),
          contact: String(contact).trim(),
          phone: String(phone).trim(),
          isValid: !!companyName
        }
      })
      
      const validData = processedData.filter(item => item.company && item.company !== '示例供应商A' && item.company !== 'SIG康美包')
      
      if (validData.length === 0) {
        return NextResponse.json({ 
          error: '未能从Excel中提取到有效数据，请检查文件格式', 
          hint: '请确保Excel文件包含供应商名称或客户名称列，且不要使用示例数据' 
        }, { status: 400 })
      }
      
      return NextResponse.json({
        success: true,
        data: validData,
        total: validData.length,
        type: 'supplier_customer'
      })
    } else {
      // 处理个人信息格式（更新以支持新字段）
      const processedData = jsonData.map((row: any, index: number) => {
        // 基本信息
        const name = row['姓名'] || row['名字'] || row['Name'] || row['name'] || ''
        
        // 处理日期格式（Excel日期可能是序列号）
        let birthDate = row['出生年月日'] || row['出生日期'] || row['生日'] || row['BirthDate'] || row['birthDate'] || ''
        if (typeof birthDate === 'number' && birthDate > 0) {
          // Excel日期序列号转换为日期
          const excelDate = new Date((birthDate - 25569) * 86400 * 1000)
          birthDate = excelDate.toISOString().split('T')[0] // YYYY-MM-DD格式
        }
        
        // 联系方式（确保转换为字符串）
        const phone1 = String(row['电话1'] || row['主要电话'] || row['电话'] || row['手机'] || row['Phone'] || row['phone'] || row['联系电话'] || '').trim()
        const phone2 = String(row['电话2'] || row['备用电话'] || row['Phone2'] || row['phone2'] || '').trim()
        const phone3 = String(row['电话3'] || row['其他电话'] || row['Phone3'] || row['phone3'] || '').trim()
        const email = String(row['邮箱'] || row['Email'] || row['email'] || row['电子邮件'] || '').trim()
        
        // 工作信息
        const company1 = row['公司1'] || row['主要公司'] || row['公司'] || row['单位'] || row['Company'] || row['company'] || ''
        const position1 = row['职位1'] || row['主要职位'] || row['职位'] || row['职务'] || row['Position'] || row['position'] || ''
        const company2 = row['公司2'] || row['兼职公司'] || row['Company2'] || row['company2'] || ''
        const position2 = row['职位2'] || row['兼职职位'] || row['Position2'] || row['position2'] || ''
        const company3 = row['公司3'] || row['其他公司'] || row['Company3'] || row['company3'] || ''
        const position3 = row['职位3'] || row['其他职位'] || row['Position3'] || row['position3'] || ''
        const industry = row['行业'] || row['Industry'] || row['industry'] || row['所属行业'] || ''
        
        // 政治面貌和社会身份
        const politicalParty = row['党派'] || row['政治面貌'] || row['党籍'] || row['PoliticalParty'] || row['politicalParty'] || ''
        const socialOrg1 = row['社会组织1'] || row['社会身份1'] || row['组织身份'] || row['SocialOrg1'] || row['socialOrg1'] || ''
        const socialOrg2 = row['社会组织2'] || row['社会身份2'] || row['SocialOrg2'] || row['socialOrg2'] || ''
        const socialOrg3 = row['社会组织3'] || row['社会身份3'] || row['SocialOrg3'] || row['socialOrg3'] || ''
        
        // 地域信息
        const hometown = row['家乡'] || row['籍贯'] || row['Hometown'] || row['hometown'] || ''
        const currentCity = row['现居地'] || row['所在城市'] || row['城市'] || row['City'] || row['city'] || ''
        
        // 教育背景
        const undergraduate = row['本科院校'] || row['本科'] || row['学校'] || row['毕业院校'] || row['School'] || row['school'] || row['大学'] || ''
        const undergraduateMajor = row['本科专业'] || row['专业'] || row['本科学科'] || ''
        const undergraduateYear = row['本科毕业年份'] || row['毕业年份'] || ''
        const master = row['硕士院校'] || row['硕士'] || row['研究生院校'] || ''
        const masterMajor = row['硕士专业'] || row['研究生专业'] || ''
        const masterYear = row['硕士毕业年份'] || row['研究生毕业年份'] || ''
        const phd = row['博士院校'] || row['博士'] || ''
        const phdMajor = row['博士专业'] || ''
        const phdYear = row['博士毕业年份'] || ''
        const emba = row['EMBA院校'] || row['EMBA'] || ''
        const embaYear = row['EMBA毕业年份'] || ''
        const emba2 = row['EMBA院校2'] || ''
        const embaYear2 = row['EMBA毕业年份2'] || ''
        const emba3 = row['EMBA院校3'] || ''
        const embaYear3 = row['EMBA毕业年份3'] || ''
        
        // 个人特征
        const hobbies = row['个人爱好'] || row['兴趣爱好'] || row['爱好'] || row['Hobbies'] || row['hobbies'] || ''
        const skills = row['擅长能力'] || row['专业技能'] || row['能力'] || row['Skills'] || row['skills'] || ''
        const expectations = row['期望获得'] || row['想从精尚慧获得什么'] || row['需求'] || row['Expectations'] || row['expectations'] || ''
        
        // 其他信息
        const workHistory = row['工作履历'] || row['工作经验'] || row['Work History'] || row['work history'] || ''
        const additionalInfo = row['备注'] || row['其他'] || row['Additional Info'] || row['additional info'] || ''

        // 整理电话数组
        const phones = [phone1, phone2, phone3].filter(phone => phone.trim() !== '')
        
        // 整理公司职位数组
        const companies = []
        if (company1.trim()) companies.push({ company: company1.trim(), position: position1.trim() })
        if (company2.trim()) companies.push({ company: company2.trim(), position: position2.trim() })
        if (company3.trim()) companies.push({ company: company3.trim(), position: position3.trim() })
        
        // 整理社会组织数组
        const socialOrganizations = [socialOrg1, socialOrg2, socialOrg3].filter(org => org.trim() !== '')
        
        // 整理教育背景数组
        const educations = []
        if (undergraduate.trim()) {
          educations.push({
            level: '本科',
            school: undergraduate.trim(),
            major: undergraduateMajor.trim(),
            year: undergraduateYear.trim()
          })
        }
        if (master.trim()) {
          educations.push({
            level: '硕士',
            school: master.trim(),
            major: masterMajor.trim(),
            year: masterYear.trim()
          })
        }
        if (phd.trim()) {
          educations.push({
            level: '博士',
            school: phd.trim(),
            major: phdMajor.trim(),
            year: phdYear.trim()
          })
        }
        if (emba.trim()) {
          educations.push({
            level: 'EMBA',
            school: emba.trim(),
            major: '',
            year: embaYear.trim()
          })
        }
        if (emba2.trim()) {
          educations.push({
            level: 'EMBA',
            school: emba2.trim(),
            major: '',
            year: embaYear2.trim()
          })
        }
        if (emba3.trim()) {
          educations.push({
            level: 'EMBA',
            school: emba3.trim(),
            major: '',
            year: embaYear3.trim()
          })
        }
        
        return {
          id: `temp_${index}`, // 临时ID
          name: String(name).trim(),
          birthDate: String(birthDate).trim(),
          phones: phones,
          phone: phones[0] || '', // 主要电话
          email: String(email).trim(),
          companies: companies,
          allCompanies: companies, // 确保设置allCompanies字段
          company: companies[0]?.company || '', // 主要公司
          position: companies[0]?.position || '', // 主要职位
          industry: String(industry).trim(),
          politicalParty: String(politicalParty).trim(),
          socialOrganizations: socialOrganizations,
          hometown: String(hometown).trim(),
          currentCity: String(currentCity).trim(),
          educations: educations,
          school: educations[0]?.school || '', // 主要学校（兼容性）
          hobbies: String(hobbies).trim(),
          skills: String(skills).trim(),
          expectations: String(expectations).trim(),
          workHistory: String(workHistory).trim(),
          additionalInfo: String(additionalInfo).trim(),
          // 保留旧字段以兼容现有数据
          products: '', // 已删除，但保留以兼容
          isValid: !!name // 只要有姓名就认为是有效数据
        }
      })
      
      // 过滤出有效数据（至少有姓名）
      const validData = processedData.filter(item => item.name)
      
      if (validData.length === 0) {
        return NextResponse.json({ 
          error: '未能从Excel中提取到有效数据，请检查文件格式', 
          hint: '请确保Excel文件包含姓名列，且数据行不为空' 
        }, { status: 400 })
      }
      
      return NextResponse.json({
        success: true,
        data: validData,
        total: validData.length,
        invalidCount: processedData.length - validData.length,
        type: 'person'
      })
    }


  } catch (error) {
    console.error('Excel parsing error:', error)
    return NextResponse.json({ 
      error: '解析Excel文件时出错',
      details: error instanceof Error ? error.message : '未知错误'
    }, { status: 500 })
  }
} 