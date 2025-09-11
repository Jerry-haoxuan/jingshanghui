import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // 动态导入XLSX以避免SSR问题
    const XLSX = await import('xlsx')
    
    // 创建供应商模板数据
    const supplierTemplate = [
      {
        '序号': 1,
        '原材料名称': '钢材',
        '原材料类别': '金属材料',
        '供应商名称': '示例钢铁公司',
        '关键词': '优质',
        '关键人物1': '张经理',
        '关键人物2': '李主管',
        '关键人物3': '王总监'
      },
      {
        '序号': 2,
        '原材料名称': '塑料颗粒',
        '原材料类别': '化工原料',
        '供应商名称': '示例化工有限公司',
        '关键词': '环保',
        '关键人物1': '陈总',
        '关键人物2': '刘经理',
        '关键人物3': '赵主任'
      },
      {
        '序号': 3,
        '原材料名称': '电子元件',
        '原材料类别': '电子材料',
        '供应商名称': '示例电子科技有限公司',
        '关键词': '精密',
        '关键人物1': '吴工程师',
        '关键人物2': '孙经理',
        '关键人物3': '周总'
      }
    ]

    // 创建工作簿
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(supplierTemplate)
    
    // 设置列宽
    ws['!cols'] = [
      { wch: 8 },  // 序号列
      { wch: 20 }, // 原材料名称列
      { wch: 20 }, // 原材料类别列
      { wch: 30 }, // 供应商名称列
      { wch: 15 }, // 关键词列
      { wch: 15 }, // 关键人物1列
      { wch: 15 }, // 关键人物2列
      { wch: 15 }  // 关键人物3列
    ]
    
    XLSX.utils.book_append_sheet(wb, ws, '供应商模板')

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
        'Content-Disposition': 'attachment; filename="supplier-template.xlsx"',
      },
    })
  } catch (error) {
    console.error('生成供应商模板失败:', error)
    return NextResponse.json({ error: '生成模板失败' }, { status: 500 })
  }
} 