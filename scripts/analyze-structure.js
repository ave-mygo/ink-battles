import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { MongoClient } from 'mongodb'
import toml from 'toml' // 需要 npm install toml

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// --- 配置部分 ---
const CONFIG_FILE_NAME = 'config.toml' // 配置文件名
const OUTPUT_FILE = 'db_structure_report.md' // 输出文件名
const SAMPLE_SIZE = 50 // 每个集合采样多少条数据进行分析

// 1. 读取配置
let config = null
try {
  // 假设 config.toml 在上一级目录，或者根据你的实际结构调整路径
  // 如果脚本在根目录，直接用 path.join(__dirname, CONFIG_FILE_NAME)
  // 如果脚本在 scripts 文件夹，用 path.join(__dirname, "../", CONFIG_FILE_NAME)
  const configPath = path.join(__dirname, CONFIG_FILE_NAME)

  console.log(`📄 正在读取配置文件: ${configPath}`)
  const configContent = await fs.readFile(configPath, 'utf-8')
  config = toml.parse(configContent)
}
catch (error) {
  // 如果找不到文件，尝试在上级目录找（兼容脚本放在子目录的情况）
  try {
    const parentPath = path.join(__dirname, '../', CONFIG_FILE_NAME)
    const configContent = await fs.readFile(parentPath, 'utf-8')
    config = toml.parse(configContent)
    console.log(`📄 已从上级目录读取配置: ${parentPath}`)
  }
  catch {
    console.error('❌ 无法读取配置文件 config.toml。请确保文件存在。')
    console.error('错误详情:', error.message)
    process.exit(1)
  }
}

// 2. 数据库连接参数
const MONGO_HOST = config?.mongodb?.host || '127.0.0.1'
const MONGO_PORT = config?.mongodb?.port || 27017
const MONGO_USER = config?.mongodb?.user
const MONGO_PASS = config?.mongodb?.password

// 优先使用配置中的库名，如果没有则默认为 mx-space
const DB_NAME = config?.mongodb?.database || 'mx-space'

const uri = MONGO_USER && MONGO_PASS
  ? `mongodb://${MONGO_USER}:${MONGO_PASS}@${MONGO_HOST}:${MONGO_PORT}`
  : `mongodb://${MONGO_HOST}:${MONGO_PORT}`

// --- 工具函数 ---

const OBJECT_ID_REGEX = /^[0-9a-f]{24}$/i

/**
 * 判断变量类型
 */
function getType(value) {
  if (value === null)
    return 'null'
  if (value === undefined)
    return 'undefined'
  // 检查是否为 MongoDB ObjectId
  if (value._bsontype === 'ObjectID' || (typeof value === 'object' && value.toString().length === 24 && OBJECT_ID_REGEX.test(value)))
    return 'ObjectId'
  if (value instanceof Date)
    return 'Date'
  if (Array.isArray(value)) {
    if (value.length === 0)
      return 'Array<unknown>'
    return `Array<${getType(value[0])}>`
  }
  if (typeof value === 'object')
    return 'Object'
  return typeof value
}

/**
 * 分析文档结构
 */
function analyzeSchema(docs) {
  const schema = {}

  for (const doc of docs) {
    if (!doc || typeof doc !== 'object')
      continue

    for (const [key, value] of Object.entries(doc)) {
      if (!schema[key]) {
        schema[key] = new Set()
      }
      schema[key].add(getType(value))
    }
  }

  // 格式化输出
  const finalSchema = {}
  for (const [key, types] of Object.entries(schema)) {
    const typesArray = Array.from(types).filter(t => t !== 'undefined')
    const isOptional = types.has('undefined') || types.has('null')

    let typeStr = typesArray.join(' | ')
    if (!typeStr)
      typeStr = 'unknown'

    if (isOptional && !typeStr.includes('null')) {
      typeStr += ' (Optional)'
    }
    finalSchema[key] = typeStr
  }
  return finalSchema
}

// --- 主程序 ---

async function main() {
  console.log(`🔌 正在连接 MongoDB: ${MONGO_HOST}:${MONGO_PORT} ...`)

  const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 5000,
  })

  try {
    await client.connect()
    console.log('✅ 连接成功！')

    const db = client.db(DB_NAME)
    console.log(`🎯 目标数据库: ${DB_NAME}`)

    // 获取所有集合
    const collections = await db.listCollections().toArray()
    const collectionNames = collections.map(c => c.name).sort()

    console.log(`📦 发现 ${collectionNames.length} 个集合`)

    let report = `# Database Structure Report: ${DB_NAME}\n\n`
    report += `Generate Time: ${new Date().toLocaleString()}\n\n`

    for (const colName of collectionNames) {
      console.log(`   -> 分析集合: ${colName}`)

      const collection = db.collection(colName)
      const totalCount = await collection.countDocuments()
      const samples = await collection.find({}).limit(SAMPLE_SIZE).toArray()

      const schema = analyzeSchema(samples)

      report += `## Collection: \`${colName}\`\n\n`
      report += `- **Total Documents**: ${totalCount}\n`
      report += `- **Sample Size**: ${samples.length}\n\n`

      if (Object.keys(schema).length > 0) {
        report += `| Field | Type |\n`
        report += `| --- | --- |\n`
        for (const [field, type] of Object.entries(schema)) {
          report += `| **${field}** | \`${type}\` |\n`
        }
      }
      else {
        report += `*Empty Collection*\n`
      }
      report += `\n---\n\n`
    }

    await fs.writeFile(OUTPUT_FILE, report, 'utf-8')
    console.log(`\n🎉 报告生成成功: ${path.resolve(OUTPUT_FILE)}`)
  }
  catch (err) {
    console.error('❌ 发生错误:', err.message)
  }
  finally {
    await client.close()
    process.exit(0)
  }
}

main()
