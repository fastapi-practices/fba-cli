// remove.ts — 移除注册的项目
import * as clack from '@clack/prompts'
import chalk from 'chalk'
import { readGlobalConfig, removeProject } from '../lib/config.js'
import { t } from '../lib/i18n.js'

export async function removeAction() {
  const config = readGlobalConfig()

  if (config.projects.length === 0) {
    console.log(chalk.dim(t('projectListEmpty')))
    return
  }

  const toRemove = await clack.multiselect({
    message: `选择要移除的项目 / Select projects to remove ${chalk.dim(t('multiselectHint'))}`,
    options: config.projects.map(p => ({
      value: p.path,
      label: p.name,
      hint: p.path + (p.path === config.current ? ' (current)' : ''),
    })),
    required: false,
  })

  if (clack.isCancel(toRemove) || toRemove.length === 0) return

  const confirmed = await clack.confirm({
    message: `确认移除 ${toRemove.length} 个项目？(仅从列表移除，不删除文件)`,
  })
  if (clack.isCancel(confirmed) || !confirmed) return

  for (const path of toRemove) {
    removeProject(path as string)
    const name = config.projects.find(p => p.path === path)?.name ?? path
    clack.log.success(chalk.green(`✓ ${name}`))
  }
}
