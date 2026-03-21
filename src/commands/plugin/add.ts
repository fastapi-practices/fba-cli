// plugin/add.ts — 插件添加
import * as clack from '@clack/prompts'
import chalk from 'chalk'
import { basename } from 'path'
import { t } from '../../lib/i18n.js'
import { requireProjectDir, fatal } from '../../lib/errors.js'
import { fetchPluginMarketData, filterByType, getMarketPluginType } from '../../lib/plugin-market.js'
import { installFromMarket, installFrontendPlugin, installBackendPlugin, runPnpmInstall } from '../../lib/plugin-install.js'
import type { PluginData } from '../../types/plugin.js'
import { inferPluginType } from '../../types/plugin.js'

/**
 * fba plugin add — 添加插件
 */
export async function pluginAddAction(options: {
  b?: boolean
  f?: boolean
  path?: string
  repoUrl?: string
  noSql?: boolean
  dbType?: string
  pkType?: string
  project?: string
}) {
  const projectDir = requireProjectDir(options.project)

  // 带参数模式
  if (options.repoUrl || options.path) {
    if (!options.b && !options.f) {
      fatal(t('pluginMustSpecifyType'), t('pluginSpecifyHint'))
    }

    if (options.f) {
      // 前端插件安装
      const name = options.repoUrl?.split('/').pop()?.replace('.git', '') ?? 'plugin'
      const ok = await installFrontendPlugin(
        projectDir,
        options.repoUrl ?? '',
        name,
      )
      if (ok) {
        clack.log.success(chalk.green(`${t('pluginInstallSuccess')}: ${name}`))
        const doPnpm = await clack.confirm({ message: t('pluginPnpmInstall') })
        if (!clack.isCancel(doPnpm) && doPnpm) {
          await runPnpmInstall(projectDir)
        }
      } else {
        clack.log.error(chalk.red(t('pluginInstallFail')))
      }
    } else {
      // 后端插件安装
      const ok = await installBackendPlugin(projectDir, {
        repoUrl: options.repoUrl,
        path: options.path,
        noSql: options.noSql,
        dbType: options.dbType,
        pkType: options.pkType,
      })
      if (ok) clack.log.success(chalk.green(t('pluginInstallSuccess')))
      else clack.log.error(chalk.red(t('pluginInstallFail')))
    }
    return
  }

  // 无参数 → 进入插件市场
  await pluginMarketFlow(projectDir)
}

/**
 * 插件市场选择 & 安装流程
 */
export async function pluginMarketFlow(projectDir: string) {
  const loadSpinner = clack.spinner()
  loadSpinner.start(t('pluginMarketTitle'))

  let plugins: PluginData[]
  try {
    const result = await fetchPluginMarketData()
    plugins = result.data
    if (result.fromCache) {
      loadSpinner.stop(`${t('pluginMarketTitle')} (${plugins.length} ${t('pluginCount')})`)
      clack.log.warn(chalk.yellow(t('pluginMarketCacheUsed')))
    } else {
      loadSpinner.stop(`${t('pluginMarketTitle')} (${plugins.length} ${t('pluginCount')})`)
    }
  } catch (e: any) {
    loadSpinner.stop(chalk.red(`${t('pluginLoadFailed')}: ${e.message}`))
    return
  }

  // 类型过滤
  const typeFilter = await clack.select({
    message: t('pluginFilter'),
    options: [
      { value: 'all', label: t('pluginFilterAll') },
      { value: 'web', label: t('pluginFilterFrontend') },
      { value: 'server', label: t('pluginFilterBackend') },
    ],
  })
  if (clack.isCancel(typeFilter)) return

  const filtered = filterByType(plugins, typeFilter as string)

  // 多选插件
  const selected = await clack.multiselect({
    message: `${t('pluginSearch')} ${chalk.dim(t('multiselectHint'))}`,
    options: filtered.map((p, i) => ({
      value: i,
      label: `${p.plugin.summary}`,
      hint: `v${p.plugin.version} | ${getMarketPluginType(p)} | @${p.plugin.author}`,
    })),
    required: false,
  })
  if (clack.isCancel(selected) || selected.length === 0) return

  const selectedPlugins = selected
    .map(i => filtered[i as number])
    .filter((p): p is PluginData => p !== undefined)

  // 安装
  clack.log.step(t('pluginInstalling'))
  const installResult = await installFromMarket(projectDir, selectedPlugins)

  for (const name of installResult.success) {
    clack.log.success(chalk.green(`✓ ${name}`))
  }
  for (const name of installResult.failed) {
    clack.log.error(chalk.red(`✗ ${name}`))
  }

  // 如果安装了前端插件，询问 pnpm install
  const hasWebPlugins = selectedPlugins.some(p => getMarketPluginType(p) === 'web')
  if (hasWebPlugins && installResult.success.length > 0) {
    const doPnpm = await clack.confirm({ message: t('pluginPnpmInstall') })
    if (!clack.isCancel(doPnpm) && doPnpm) {
      await runPnpmInstall(projectDir)
    }
  }
}
