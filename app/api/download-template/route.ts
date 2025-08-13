import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'

export async function GET(request: NextRequest) {
  try {
    // 模板数据：表头、说明、示例
    const templateData = [
      [
        '姓名', '出生年月日', '电话1', '电话2', '电话3', '邮箱',
        '公司1', '职位1', '公司2', '职位2', '公司3', '职位3', '行业',
        '党派', '社会组织1', '社会组织2', '社会组织3',
        '现居地', '家乡',
        '本科院校', '本科专业', '本科毕业年份',
        '硕士院校', '硕士专业', '硕士毕业年份',
        '博士院校', '博士专业', '博士毕业年份',
        'EMBA院校', 'EMBA毕业年份',
        'EMBA院校2', 'EMBA毕业年份2',
        'EMBA院校3', 'EMBA毕业年份3',
        '个人爱好', '擅长能力', '期望获得', '工作履历', '备注'
      ],
      [
        '必填', '可选(YYYY-MM-DD)', '必填', '可选', '可选', '必填',
        '必填', '可选', '可选', '可选', '可选', '可选', '可选',
        '可选', '可选', '可选', '可选',
        '可选', '可选',
        '可选', '可选', '可选',
        '可选', '可选', '可选',
        '可选', '可选', '可选',
        '可选', '可选',
        '可选', '可选', '可选', '可选', '可选', '可选', '可选', '可选', '可选'
      ],
      [
        '张三', '1990-01-15', '13800138000', '021-12345678', '', 'zhangsan@example.com',
        '科技创新有限公司', '产品经理', '创业咨询公司', '顾问', '', '', '互联网/电子商务',
        '中国共产党', '中国青年企业家协会', '产品经理联盟', '',
        '北京市', '杭州市',
        '清华大学', '计算机科学与技术', '2012',
        '斯坦福大学', '工商管理', '2014',
        '', '', '',
        '', '',
        '', '',
        '', '',
        '摄影,旅行,阅读', '产品设计,团队管理,数据分析', '希望通过精尚慧平台拓展人脉，寻找合作伙伴和投资机会',
        '2012-2015 腾讯产品助理；2015-2018 阿里巴巴高级产品经理；2018至今 自主创业',
        '连续创业者，专注互联网产品设计'
      ]
    ]

    // 党派选项数据
    const partyData = [
      ['党派选项'],
      ['中国共产党'],
      ['中国民主同盟'],
      ['中国民主建国会'],
      ['中国民主促进会'],
      ['中国农工民主党'],
      ['中国致公党'],
      ['九三学社'],
      ['台湾民主自治同盟'],
      ['无党派人士'],
      ['群众']
    ]

    // 使用说明数据
    const helpData = [
      ['精尚慧个人信息导入模板使用说明'],
      [''],
      ['1. 必填字段：姓名、电话1、邮箱、公司1'],
      ['2. 党派选择：请参考"党派选项"工作表'],
      ['3. 日期格式：YYYY-MM-DD（如：1990-01-15）'],
      ['4. 多个爱好用逗号分隔（如：摄影,旅行,阅读）'],
      ['5. 请删除示例数据行，填入真实数据后上传'],
      [''],
      ['📋 设置党派下拉选择的方法：'],
      ['1) 选中党派列的单元格范围（如N3:N100）'],
      ['2) 在Excel中点击"数据"→"数据有效性"'],
      ['3) 选择"序列"，来源填入：党派选项!$A$2:$A$11'],
      ['4) 确定后即可在党派列看到下拉选择'],
      [''],
      ['技术支持：请联系平台管理员']
    ]

    // 创建工作簿
    const workbook = XLSX.utils.book_new()
    
    // 创建主工作表
    const mainSheet = XLSX.utils.aoa_to_sheet(templateData)
    mainSheet['!cols'] = [
      { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 20 },
      { wch: 20 }, { wch: 15 }, { wch: 20 }, { wch: 15 }, { wch: 20 }, { wch: 15 }, { wch: 15 },
      { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 15 },
      { wch: 10 }, { wch: 10 },
      { wch: 15 }, { wch: 12 }, { wch: 8 },
      { wch: 15 }, { wch: 12 }, { wch: 8 },
      { wch: 15 }, { wch: 12 }, { wch: 8 },
      { wch: 15 }, { wch: 8 },
      { wch: 15 }, { wch: 8 },
      { wch: 15 }, { wch: 8 },
      { wch: 20 }, { wch: 20 }, { wch: 30 }, { wch: 30 }, { wch: 20 }
    ]
    
    // 创建党派选项工作表
    const partySheet = XLSX.utils.aoa_to_sheet(partyData)
    partySheet['!cols'] = [{ wch: 15 }]
    
    // 创建使用说明工作表
    const helpSheet = XLSX.utils.aoa_to_sheet(helpData)
    helpSheet['!cols'] = [{ wch: 50 }]
    
    // 添加工作表到工作簿
    XLSX.utils.book_append_sheet(workbook, mainSheet, '个人信息模板')
    XLSX.utils.book_append_sheet(workbook, partySheet, '党派选项')
    XLSX.utils.book_append_sheet(workbook, helpSheet, '使用说明')

    // 生成Excel文件
    const buffer = XLSX.write(workbook, { 
      type: 'buffer', 
      bookType: 'xlsx'
    })

    // 返回文件
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="精尚慧个人信息模板.xlsx"',
        'Cache-Control': 'no-cache'
      }
    })

  } catch (error) {
    console.error('Excel生成错误:', error)
    return NextResponse.json(
      { error: '生成模板失败', details: error instanceof Error ? error.message : '未知错误' },
      { status: 500 }
    )
  }
} 