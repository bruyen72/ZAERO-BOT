// 🧪 TESTE DE COMANDOS - Verifica se todos carregam corretamente
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

console.log('🧪 TESTANDO CARREGAMENTO DE COMANDOS...\n')

const commandsPath = path.join(__dirname, 'commands')
let totalCommands = 0
let errorCommands = 0
const errors = []

// Função recursiva para ler comandos
async function testDirectory(dir, depth = 0) {
  const files = fs.readdirSync(dir)
  const indent = '  '.repeat(depth)

  for (const file of files) {
    const fullPath = path.join(dir, file)
    const stat = fs.statSync(fullPath)

    if (stat.isDirectory()) {
      console.log(`${indent}📁 ${file}/`)
      await testDirectory(fullPath, depth + 1)
    } else if (file.endsWith('.js') && !file.includes('.bak')) {
      totalCommands++
      const relativePath = path.relative(commandsPath, fullPath)

      try {
        const module = await import(`file://${fullPath}`)
        const cmdData = module.default

        if (!cmdData) {
          throw new Error('Módulo não exporta default')
        }

        if (!cmdData.command) {
          throw new Error('Falta propriedade "command"')
        }

        if (!cmdData.run || typeof cmdData.run !== 'function') {
          throw new Error('Falta função "run"')
        }

        const commands = Array.isArray(cmdData.command) ? cmdData.command : [cmdData.command]
        console.log(`${indent}✅ ${file.padEnd(30)} → ${commands.join(', ')}`)

      } catch (err) {
        errorCommands++
        console.log(`${indent}❌ ${file.padEnd(30)} → ERRO: ${err.message}`)
        errors.push({ file: relativePath, error: err.message })
      }
    }
  }
}

// Executa teste
await testDirectory(commandsPath)

// Resultado
console.log('\n' + '='.repeat(80))
console.log('📊 RESULTADO DO TESTE')
console.log('='.repeat(80))
console.log(`✅ Comandos OK: ${totalCommands - errorCommands}`)
console.log(`❌ Comandos com erro: ${errorCommands}`)
console.log(`📦 Total testado: ${totalCommands}`)

if (errors.length > 0) {
  console.log('\n⚠️ ERROS ENCONTRADOS:\n')
  errors.forEach(({ file, error }) => {
    console.log(`   ❌ ${file}`)
    console.log(`      → ${error}\n`)
  })
  process.exit(1)
} else {
  console.log('\n🎉 TODOS OS COMANDOS ESTÃO OK! Pronto para deploy!')
  process.exit(0)
}
