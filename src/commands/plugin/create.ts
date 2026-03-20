// plugin/create.ts — 插件创建（基于本地模板）
import * as clack from '@clack/prompts'
import chalk from 'chalk'
import { join } from 'path'
import { existsSync } from 'fs'
import { t } from '../../lib/i18n.js'
import { requireProjectDir } from '../../lib/errors.js'
import { getFrontendPluginDir, getBackendPluginDir } from '../../lib/config.js'
import { renderTemplate, type TemplateVars } from '../../lib/template.js'
import { gitInit } from '../../lib/git.js'
import { VALID_TAGS, VALID_DATABASES, type ServerPluginLevel } from '../../types/plugin.js'
import { parse as parseToml, stringify as stringifyToml } from 'smol-toml'
import { readFileSync, writeFileSync } from 'fs'

/**
 * fba plugin create — 创建新插件
 */
export async function pluginCreateAction(options: { project?: string }) {
  const projectDir = requireProjectDir(options.project)

  clack.intro(chalk.bgCyan(' Plugin Create '))

  const config = await clack.group({
    type: () => clack.select({
      message: t('pluginCreateType'),
      options: [
        { value: 'web', label: t('pluginTypeWeb') },
        { value: 'server', label: t('pluginTypeServer') },
        { value: 'all', label: t('pluginTypeAll') },
      ],
    }),
    serverType: ({ results }) => {
      if (results.type === 'web') return Promise.resolve(undefined)
      return clack.select({
        message: t('pluginCreateServerType'),
        options: [
          { value: 'app', label: t('pluginServerApp') },
          { value: 'ext', label: t('pluginServerExt') },
        ],
      }) as Promise<ServerPluginLevel | undefined>
    },
    name: () => clack.text({
      message: t('pluginCreateName'),
      validate: (v) => !v?.trim() ? t('pluginRequired') : undefined,
    }),
    summary: () => clack.text({ message: t('pluginCreateSummary'), defaultValue: '' }),
    version: () => clack.text({ message: t('pluginCreateVersion'), defaultValue: '0.0.1' }),
    description: () => clack.text({ message: t('pluginCreateDescription'), defaultValue: '' }),
    author: () => clack.text({ message: t('pluginCreateAuthor'), defaultValue: '' }),
    tags: () => clack.multiselect({
      message: `${t('pluginCreateTags')} ${chalk.dim(t('multiselectHint'))}`,
      options: VALID_TAGS.map(tag => ({ value: tag, label: tag })),
      initialValues: ['other'],
      required: false,
    }),
    database: () => clack.multiselect({
      message: `${t('pluginCreateDatabase')} ${chalk.dim(t('multiselectHint'))}`,
      options: VALID_DATABASES.map(db => ({ value: db, label: db })),
      initialValues: ['mysql', 'postgresql'],
      required: false,
    }),
  }, { onCancel: () => process.exit(0) })

  const vars: TemplateVars = {
    name: config.name,
    summary: config.summary,
    version: config.version,
    description: config.description,
    author: config.author,
  }

  const typesToCreate: Array<'web' | 'server'> = config.type === 'all'
    ? ['web', 'server']
    : [config.type as 'web' | 'server']

  for (const pluginType of typesToCreate) {
    const targetDir = pluginType === 'web'
      ? join(getFrontendPluginDir(projectDir), config.name)
      : join(getBackendPluginDir(projectDir), config.name)

    if (existsSync(targetDir)) {
      clack.log.warn(chalk.yellow(`${t('pluginDirExists')}: ${targetDir}`))
      continue
    }

    const createSpinner = clack.spinner()
    createSpinner.start(`${t('pluginCreating')} ${pluginType}: ${config.name}`)

    try {
      // 1. 渲染模板
      await renderTemplate(
        pluginType === 'web' ? 'web' : 'server',
        targetDir,
        vars,
        pluginType === 'server' ? { serverType: config.serverType as ServerPluginLevel } : undefined,
      )

      // 2. 更新 plugin.toml 中的用户输入
      const tomlPath = join(targetDir, 'plugin.toml')
      if (existsSync(tomlPath)) {
        const tomlContent = readFileSync(tomlPath, 'utf-8')
        const parsed = parseToml(tomlContent) as any
        if (parsed.plugin) {
          parsed.plugin.summary = config.summary
          parsed.plugin.version = config.version
          parsed.plugin.description = config.description
          parsed.plugin.author = config.author
          parsed.plugin.tags = config.tags
          if (config.database.length > 0) {
            parsed.plugin.database = config.database
          }
        }
        writeFileSync(tomlPath, stringifyToml(parsed), 'utf-8')
      }

      // 3. 初始化 Git
      await gitInit(targetDir)

      createSpinner.stop(`${pluginType} ${t('pluginCreated')}`)
    } catch (e: any) {
      createSpinner.stop(`${t('pluginCreateFailed')}: ${e.message}`)
    }
  }

  clack.outro(chalk.green(t('pluginCreateSuccess')))
}
