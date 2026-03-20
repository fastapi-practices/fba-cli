// plugin/remove.ts — 插件移除
import * as clack from '@clack/prompts'
import chalk from 'chalk'
import { t } from '../../lib/i18n.js'
import { requireProjectDir } from '../../lib/errors.js'
import { scanInstalledPlugins, removeFrontendPlugin, removeBackendPlugin, runPnpmInstall } from '../../lib/plugin-install.js'

/**
 * fba plugin remove — 移除插件
 */
export async function pluginRemoveAction(options: { project?: string }) {
  const projectDir = requireProjectDir(options.project)

  const plugins = scanInstalledPlugins(projectDir)
  if (plugins.length === 0) {
    clack.log.info(t('pluginListEmpty'))
    return
  }

  // 选择要移除的插件
  const toRemove = await clack.multiselect({
    message: `${t('pluginRemoveConfirm')} ${chalk.dim(t('multiselectHint'))}`,
    options: plugins.map((p, i) => ({
      value: i,
      label: `${p.info.summary || p.name}`,
      hint: `${p.type} | v${p.info.version} | @${p.info.author}`,
    })),
    required: false,
  })
  if (clack.isCancel(toRemove) || toRemove.length === 0) return

  // 确认
  const confirmed = await clack.confirm({ message: t('pluginRemoveConfirm') })
  if (clack.isCancel(confirmed) || !confirmed) return

  let removedWeb = false
  for (const idx of toRemove) {
    const plugin = plugins[idx as number]
    if (!plugin) continue
    let ok = false

    if (plugin.type === 'web') {
      ok = await removeFrontendPlugin(plugin.dir)
      if (ok) removedWeb = true
    } else {
      ok = await removeBackendPlugin(projectDir, plugin.name)
    }

    if (ok) {
      clack.log.success(chalk.green(`✓ ${plugin.info.summary || plugin.name} ${t('pluginRemoveSuccess')}`))
    } else {
      clack.log.error(chalk.red(`✗ ${plugin.info.summary || plugin.name}`))
    }
  }

  // 如果移除了前端插件，询问 pnpm install
  if (removedWeb) {
    const doPnpm = await clack.confirm({ message: t('pluginPnpmInstall') })
    if (!clack.isCancel(doPnpm) && doPnpm) {
      await runPnpmInstall(projectDir)
    }
  }
}
