import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // 动态导入XLSX以避免SSR问题
    const XLSX = await import('xlsx')
    
    // 创建客户模板数据
    const customerTemplate = [
      {
        '序号': 1,
        '产品名称': '机械设备',
        '产品类别': '工业设备',
        '客户名称': '示例制造有限公司'
      },
      {
        '序号': 2,
        '产品名称': '电子产品',
        '产品类别': '消费电子',
        '客户名称': '示例科技股份有限公司'
      },
      {
        '序号': 3,
        '产品名称': '化工产品',
        '产品类别': '化工材料',
        '客户名称': '示例化工集团有限公司'
      }
    ]

    // 创建工作簿
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(customerTemplate)
    
    // 设置列宽
    ws['!cols'] = [
      { wch: 8 },  // 序号列
      { wch: 20 }, // 产品名称列
      { wch: 20 }, // 产品类别列
      { wch: 30 }  // 客户名称列
    ]
    
    XLSX.utils.book_append_sheet(wb, ws, '客户模板')

    // 生成Excel文件
    const excelBuffer = XLSX.write(wb, { 
      type: 'array', 
      bookType: 'xlsx' 
    })

    // 转换为Uint8Array
    const buffer = new Uint8Array(excelBuffer)

    // 返回文件
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="customer-template.xlsx"',
      },
    })
  } catch (error) {
    console.error('生成客户模板失败:', error)
    return NextResponse.json({ error: '生成模板失败' }, { status: 500 })
  }
} 