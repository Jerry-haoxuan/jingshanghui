import { inflateRawSync, deflateRawSync, crc32 } from 'zlib'

// 给已经用 xlsx-js-style 写好的 xlsx 注入数据验证（下拉）。
// 社区版 SheetJS 写文件时会丢掉 dataValidation，所以生成后再改 zip 里的 worksheet XML。

const LOCAL_SIG = 0x04034b50
const CENTRAL_SIG = 0x02014b50
const EOCD_SIG = 0x06054b50

export type DropdownRule = {
  sheetName: string
  sqref: string
  range: string // 例如 "'下拉选项'!$A$1:$A$70"
  strict?: boolean
}

function readZip(buf: Buffer): Map<string, Buffer> {
  const files = new Map<string, Buffer>()
  let offset = 0
  while (offset + 30 <= buf.length) {
    const sig = buf.readUInt32LE(offset)
    if (sig === CENTRAL_SIG || sig === EOCD_SIG) break
    if (sig !== LOCAL_SIG) break
    const flags = buf.readUInt16LE(offset + 6)
    const method = buf.readUInt16LE(offset + 8)
    const compSize = buf.readUInt32LE(offset + 18)
    const nameLen = buf.readUInt16LE(offset + 26)
    const extraLen = buf.readUInt16LE(offset + 28)
    const name = buf.subarray(offset + 30, offset + 30 + nameLen).toString('utf8')
    const dataStart = offset + 30 + nameLen + extraLen
    if (flags & 0x08) {
      throw new Error(`不支持带 data descriptor 的 zip 条目: ${name}`)
    }
    const compressed = buf.subarray(dataStart, dataStart + compSize)
    const data = method === 0
      ? Buffer.from(compressed)
      : method === 8
        ? Buffer.from(inflateRawSync(compressed))
        : (() => { throw new Error(`不支持的压缩方式 ${method}: ${name}`) })()
    files.set(name, data)
    offset = dataStart + compSize
  }
  return files
}

function writeZip(files: Map<string, Buffer>): Buffer {
  const localParts: Buffer[] = []
  const centralParts: Buffer[] = []
  let offset = 0

  const entries = Array.from(files.entries())
  for (let i = 0; i < entries.length; i++) {
    const [name, data] = entries[i]
    const nameBuf = Buffer.from(name, 'utf8')
    const compressed = Buffer.from(deflateRawSync(data))
    const crc = crc32(data) >>> 0

    const local = Buffer.alloc(30 + nameBuf.length)
    local.writeUInt32LE(LOCAL_SIG, 0)
    local.writeUInt16LE(20, 4)
    local.writeUInt16LE(0, 6)
    local.writeUInt16LE(8, 8)
    local.writeUInt32LE(crc, 14)
    local.writeUInt32LE(compressed.length, 18)
    local.writeUInt32LE(data.length, 22)
    local.writeUInt16LE(nameBuf.length, 26)
    nameBuf.copy(local, 30)

    const central = Buffer.alloc(46 + nameBuf.length)
    central.writeUInt32LE(CENTRAL_SIG, 0)
    central.writeUInt16LE(20, 4)
    central.writeUInt16LE(20, 6)
    central.writeUInt16LE(0, 8)
    central.writeUInt16LE(8, 10)
    central.writeUInt32LE(crc, 16)
    central.writeUInt32LE(compressed.length, 20)
    central.writeUInt32LE(data.length, 24)
    central.writeUInt16LE(nameBuf.length, 28)
    central.writeUInt32LE(offset, 42)
    nameBuf.copy(central, 46)

    localParts.push(local, compressed)
    centralParts.push(central)
    offset += local.length + compressed.length
  }

  const centralStart = offset
  const centralSize = centralParts.reduce((n, b) => n + b.length, 0)
  const count = files.size
  const eocd = Buffer.alloc(22)
  eocd.writeUInt32LE(EOCD_SIG, 0)
  eocd.writeUInt16LE(count, 8)
  eocd.writeUInt16LE(count, 10)
  eocd.writeUInt32LE(centralSize, 12)
  eocd.writeUInt32LE(centralStart, 16)

  return Buffer.concat([...localParts, ...centralParts, eocd])
}

function xmlAttr(xml: string, tag: string, attr: string): string | undefined {
  const re = new RegExp(`<${tag}\\b[^>]*\\b${attr}="([^"]+)"`, 'i')
  const m = xml.match(re)
  return m?.[1]
}

function mapSheetPaths(files: Map<string, Buffer>): Map<string, string> {
  const workbook = files.get('xl/workbook.xml')
  const rels = files.get('xl/_rels/workbook.xml.rels')
  if (!workbook || !rels) throw new Error('xlsx 缺少 workbook 文件')
  const wbXml = workbook.toString('utf8')
  const relXml = rels.toString('utf8')

  const ridToTarget = new Map<string, string>()
  const relRe = /<Relationship\b[^>]*>/g
  let relMatch: RegExpExecArray | null
  while ((relMatch = relRe.exec(relXml))) {
    const tag = relMatch[0]
    const id = xmlAttr(tag, 'Relationship', 'Id')
    const type = xmlAttr(tag, 'Relationship', 'Type') || ''
    const target = xmlAttr(tag, 'Relationship', 'Target')
    if (id && target && type.includes('worksheet')) {
      const path = target.startsWith('/') ? target.slice(1) : `xl/${target.replace(/^\.\//, '')}`
      ridToTarget.set(id, path)
    }
  }

  const nameToPath = new Map<string, string>()
  const sheetRe = /<sheet\b[^>]*\/?>/g
  let sheetMatch: RegExpExecArray | null
  while ((sheetMatch = sheetRe.exec(wbXml))) {
    const tag = sheetMatch[0]
    const name = xmlAttr(tag, 'sheet', 'name')
    const rid = xmlAttr(tag, 'sheet', 'r:id')
    if (name && rid) {
      const path = ridToTarget.get(rid)
      if (path) nameToPath.set(name, path)
    }
  }
  return nameToPath
}

function hideSheet(files: Map<string, Buffer>, sheetName: string) {
  const workbook = files.get('xl/workbook.xml')
  if (!workbook) return
  let xml = workbook.toString('utf8')
  xml = xml.replace(/<sheet\b[^>]*\/?>/g, (tag) => {
    const name = xmlAttr(tag, 'sheet', 'name')
    if (name !== sheetName) return tag
    if (/\bstate=/.test(tag)) return tag.replace(/\bstate="[^"]*"/, 'state="hidden"')
    return tag.replace(/\/?>$/, ' state="hidden"/>').replace(' state="hidden"/>/>', ' state="hidden"/>')
  })
  files.set('xl/workbook.xml', Buffer.from(xml, 'utf8'))
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function buildDataValidationsXml(rules: DropdownRule[]): string {
  const body = rules.map(rule => {
    const errorAttrs = rule.strict
      ? ` showErrorMessage="1" errorStyle="stop" errorTitle="请从下拉列表选择" error="该列请从下拉箭头中选择，没有完全匹配的请选「其他」。"`
      : ` showErrorMessage="0"`
    return `<dataValidation type="list" allowBlank="1" showDropDown="0" showInputMessage="1" promptTitle="下拉选择" prompt="请点击单元格右侧箭头选择。"${errorAttrs} sqref="${escapeXml(rule.sqref)}"><formula1>${escapeXml(rule.range)}</formula1></dataValidation>`
  }).join('')
  return `<dataValidations count="${rules.length}">${body}</dataValidations>`
}

function injectIntoWorksheet(xml: string, dvXml: string): string {
  if (xml.includes('<dataValidations')) {
    return xml.replace(/<dataValidations[\s\S]*?<\/dataValidations>/, dvXml)
  }
  if (xml.includes('</sheetData>')) {
    return xml.replace('</sheetData>', `</sheetData>${dvXml}`)
  }
  return xml.replace('</worksheet>', `${dvXml}</worksheet>`)
}

export function addExcelDropdowns(xlsxBuffer: Buffer, rules: DropdownRule[], hiddenSheetName?: string): Buffer {
  const files = readZip(xlsxBuffer)
  const sheetPaths = mapSheetPaths(files)
  const grouped = new Map<string, DropdownRule[]>()
  for (const rule of rules) {
    const list = grouped.get(rule.sheetName) || []
    list.push(rule)
    grouped.set(rule.sheetName, list)
  }
  const groupedEntries = Array.from(grouped.entries())
  for (let i = 0; i < groupedEntries.length; i++) {
    const [sheetName, sheetRules] = groupedEntries[i]
    const path = sheetPaths.get(sheetName)
    if (!path) throw new Error(`找不到工作表: ${sheetName}`)
    const sheet = files.get(path)
    if (!sheet) throw new Error(`找不到工作表文件: ${path}`)
    const next = injectIntoWorksheet(sheet.toString('utf8'), buildDataValidationsXml(sheetRules))
    files.set(path, Buffer.from(next, 'utf8'))
  }
  if (hiddenSheetName) hideSheet(files, hiddenSheetName)
  return writeZip(files)
}
