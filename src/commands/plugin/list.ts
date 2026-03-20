// plugin/list.ts — 列出已安装插件
import chalk from 'chalk'
import { t } from '../../lib/i18n.js'
import { requireProjectDir } from '../../lib/errors.js'
import { scanInstalledPlugins } from '../../lib/plugin-install.js'

/**
 * fba plugin list — 列出已安装的插件
 */
export async function pluginListAction(options: { project?: string }) {
  const projectDir = requireProjectDir(options.project)

  const plugins = scanInstalledPlugins(projectDir)
  if (plugins.length === 0) {
    console.log(chalk.dim(t('pluginListEmpty')))
    return
  }

  const webCount = plugins.filter(p => p.type === 'web').length
  const serverCount = plugins.filter(p => p.type === 'server').length

  console.log()
  console.log(chalk.bold(` ${t('pluginListTitle')}`))
  console.log(chalk.dim(' ─'.repeat(25)))
  console.log(
    chalk.dim(' ') +
    padRight(t('pluginTableName'), 20) +
    padRight(t('pluginTableType'), 10) +
    padRight(t('pluginTableVersion'), 10) +
    t('pluginTableAuthor')
  )
  console.log(chalk.dim(' ─'.repeat(25)))

  for (const p of plugins) {
    const typeColor = p.type === 'web' ? chalk.cyan : chalk.magenta
    console.log(
      ' ' +
      padRight(p.info.summary || p.name, 20) +
      typeColor(padRight(p.type, 10)) +
      padRight(p.info.version, 10) +
      chalk.dim(p.info.author)
    )
  }

  console.log(chalk.dim(' ─'.repeat(25)))
  console.log(chalk.dim(` ${t('pluginTotal')}: ${plugins.length} ${t('pluginCount')} (${webCount} web, ${serverCount} server)`))
  console.log()
}

function padRight(str: string, len: number): string {
  if (str.length >= len) return str.slice(0, len)
  return str + ' '.repeat(len - str.length)
}
