import fs from 'fs'
import path from 'path'
import chalk from 'chalk'
import { fileURLToPath, pathToFileURL } from 'url'
import { parse } from '@babel/parser'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const commandsFolder = path.join(__dirname, '../../commands')

global.comandos = new Map()
global.plugins = {}

function getPluginName(fullPath) {
  return path
    .relative(commandsFolder, fullPath)
    .replace(/\\/g, '/')
    .replace(/\.js$/, '')
}

function parseFileOrNull(fullPath) {
  const code = fs.readFileSync(fullPath)
  parse(code.toString(), {
    sourceType: 'module',
    plugins: ['topLevelAwait']
  })
}

async function buildCommandIndex(dir = commandsFolder) {
  const plugins = {}
  const comandos = new Map()
  const duplicates = new Map()

  const items = fs.readdirSync(dir)
  for (const fileOrFolder of items) {
    const fullPath = path.join(dir, fileOrFolder)

    if (fs.lstatSync(fullPath).isDirectory()) {
      const sub = await buildCommandIndex(fullPath)

      for (const [k, v] of Object.entries(sub.plugins)) {
        plugins[k] = v
      }
      for (const [k, v] of sub.comandos.entries()) {
        if (comandos.has(k)) {
          duplicates.set(k, [comandos.get(k).pluginName, v.pluginName])
          continue
        }
        comandos.set(k, v)
      }
      for (const [k, v] of sub.duplicates.entries()) {
        duplicates.set(k, v)
      }
      continue
    }

    if (!fileOrFolder.endsWith('.js')) continue

    try {
      parseFileOrNull(fullPath)
    } catch (err) {
      console.error(chalk.red(`[CommandLoader] Erro de sintaxe em ${fileOrFolder}:\n${err.message}`))
      continue
    }

    try {
      const moduleUrl = `${pathToFileURL(path.resolve(fullPath)).href}?update=${Date.now()}`
      const imported = await import(moduleUrl)
      const comando = imported.default
      const pluginName = getPluginName(fullPath)

      plugins[pluginName] = imported
      if (!comando?.command || typeof comando.run !== 'function') continue

      comando.command.forEach((cmd) => {
        const key = String(cmd).toLowerCase()
        if (comandos.has(key)) {
          duplicates.set(key, [comandos.get(key).pluginName, pluginName])
          return
        }

        comandos.set(key, {
          pluginName,
          run: comando.run,
          category: comando.category || 'uncategorized',
          isOwner: comando.isOwner || false,
          isAdmin: comando.isAdmin || false,
          botAdmin: comando.botAdmin || false,
          before: imported.before || null,
          after: imported.after || null,
          info: comando.info || {}
        })
      })
    } catch (e) {
      console.error(chalk.red(`[CommandLoader] Erro no plugin ${fileOrFolder}:`), e)
    }
  }

  return { plugins, comandos, duplicates }
}

async function seeCommands() {
  const { plugins, comandos, duplicates } = await buildCommandIndex(commandsFolder)

  global.plugins = plugins
  global.comandos = comandos

  const pluginCount = Object.keys(plugins).length
  const cmdCount = comandos.size
  console.log(chalk.green(`[CommandLoader] ${cmdCount} comandos carregados de ${pluginCount} plugins`))

  const criticalCmds = ['sticker', 's', 'beijo', 'lickass', 'menu']
  console.log(chalk.magentaBright('[ CHECK DE COMANDOS CRITICOS ]'))
  criticalCmds.forEach((cmd) => {
    const exists = comandos.has(cmd)
    const color = exists ? chalk.green : chalk.red
    console.log(` ${cmd.padEnd(10)}: ${color(exists ? 'OK' : 'NAO ENCONTRADO')}`)
  })
  console.log(chalk.magentaBright('----------------------------------'))

  const categories = new Map()
  for (const [cmd, data] of comandos) {
    const cat = data.category || 'uncategorized'
    if (!categories.has(cat)) categories.set(cat, [])
    categories.get(cat).push(cmd)
  }
  for (const [cat, cmds] of categories) {
    console.log(chalk.cyan(`  [${cat}] ${cmds.length} comandos`))
  }

  if (duplicates.size > 0) {
    for (const [cmd, [first, second]] of duplicates.entries()) {
      console.warn(chalk.yellow(`[CommandLoader] Comando duplicado '${cmd}' ignorado em '${second}'. Mantido: '${first}'.`))
    }
  }
}

globalThis.reload = async (_ev, filename) => {
  if (!filename.endsWith('.js')) return

  const normalizedName = filename.replace(/\\/g, '/')
  const fullPath = path.resolve(commandsFolder, normalizedName)

  if (!fs.existsSync(fullPath)) {
    console.log(chalk.yellow(`[CommandLoader] Plugin removido: ${filename}`))
    await seeCommands()
    return
  }

  try {
    parseFileOrNull(fullPath)
  } catch (err) {
    console.error(chalk.red(`[CommandLoader] Erro de sintaxe em '${filename}'\n${err.message}`))
    return
  }

  try {
    await seeCommands()
  } catch (e) {
    console.error(chalk.red(`[CommandLoader] Erro ao recarregar ${filename}:\n`), e)
  }
}

Object.freeze(globalThis.reload)

try {
  fs.watch(commandsFolder, { recursive: true }, (event, filename) => {
    if (filename) globalThis.reload(event, filename)
  })
} catch {
  fs.watch(commandsFolder, (event, filename) => {
    if (filename) globalThis.reload(event, filename)
  })
}

export default seeCommands
