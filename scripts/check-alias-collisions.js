// 只读检查：哪些人的虚拟名撞在一起（在 ECS 服务器上运行，数据库走内网）
//
// 用法（在网站目录下运行，会自动读取 .env.local 里的 DATABASE_URL）：
//   cd /var/www/jingshanghui
//   node scripts/check-alias-collisions.js            # 撞名报告
//   node scripts/check-alias-collisions.js 安道全 薛永  # 另外列出虚拟名是这些名字的人
//
// 只做 SELECT，并把会话设为只读，不会改动任何数据。

const fs = require('fs')
const path = require('path')
const ts = require('typescript')
const { loadEnvConfig } = require('@next/env')
const { Client } = require('pg')

const root = path.join(__dirname, '..')
loadEnvConfig(root)

// 直接复用网站的虚拟名逻辑（lib/deterministicNameAlias.ts），不在这里另抄一份名字池
function loadAliasLib() {
  const file = path.join(root, 'lib/deterministicNameAlias.ts')
  const { outputText } = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2019 },
  })
  const mod = { exports: {} }
  new Function('exports', 'module', 'require', outputText)(mod.exports, mod, require)
  return mod.exports
}

function label(p) {
  return p.company ? `${p.name}（${p.company}）` : p.name
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('没有读到 DATABASE_URL：请在网站目录（有 .env.local 的那个）下运行。')
    process.exit(1)
  }

  const { forceGetAliasName, ALIAS_OVERRIDES, ALIAS_SECONDARY } = loadAliasLib()

  const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: false })
  await client.connect()
  let rows
  try {
    await client.query('SET default_transaction_read_only = on')
    ;({ rows } = await client.query('SELECT id, name, company FROM public.people ORDER BY created_at'))
  } finally {
    await client.end()
  }

  const people = rows.filter(p => p.name && p.name.trim())
  const byAlias = new Map()
  for (const p of people) {
    const alias = forceGetAliasName(p.name)
    if (!byAlias.has(alias)) byAlias.set(alias, [])
    byAlias.get(alias).push(p)
  }

  console.log(`共 ${people.length} 条人物档案，${byAlias.size} 个不同的虚拟名。\n`)

  // 1. 手动指定的名字（主名覆盖 / 又名）被别人占用：最需要处理
  console.log('【一】手动指定的名字是否被别人占用')
  const designated = [
    ...Object.entries(ALIAS_OVERRIDES).map(([owner, alias]) => ({ owner, alias, kind: '主名' })),
    ...Object.entries(ALIAS_SECONDARY).map(([owner, alias]) => ({ owner, alias, kind: '又名' })),
  ]
  let designatedHits = 0
  for (const { owner, alias, kind } of designated) {
    const others = (byAlias.get(alias) || []).filter(p => p.name !== owner)
    if (others.length) {
      designatedHits++
      console.log(`  ✗ 「${alias}」是${owner}的${kind}，但以下的人也显示为「${alias}」：`)
      others.forEach(p => console.log(`      - ${label(p)}`))
    } else {
      console.log(`  ✓ 「${alias}」（${owner}的${kind}）只属于${owner}`)
    }
  }

  // 2. 不同的人哈希到同一个虚拟名（同一个真名重复录入的不算）
  console.log('\n【二】不同的人共用同一个虚拟名')
  const shared = [...byAlias.entries()]
    .map(([alias, list]) => [alias, list, new Set(list.map(p => p.name))])
    .filter(([, , names]) => names.size > 1)
    .sort((a, b) => b[2].size - a[2].size)
  if (!shared.length) console.log('  ✓ 没有')
  for (const [alias, list, names] of shared) {
    const unique = [...names].map(n => list.find(p => p.name === n))
    console.log(`  「${alias}」${names.size} 人：${unique.map(label).join('、')}`)
  }

  // 3. 命令行指定的名字
  const wanted = process.argv.slice(2)
  if (wanted.length) {
    console.log('\n【三】虚拟名为指定名字的人')
    for (const alias of wanted) {
      const list = byAlias.get(alias) || []
      console.log(`  「${alias}」：${list.length ? list.map(label).join('、') : '没有人'}`)
    }
  }

  console.log(`\n小结：手动指定名字被占用 ${designatedHits} 处；共用虚拟名 ${shared.length} 组。`)
}

main().catch(err => {
  console.error('检查失败：', err.message)
  process.exit(1)
})
