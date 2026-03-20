// config-set.ts — 配置设置（列表选择）
import * as clack from '@clack/prompts'
import chalk from 'chalk'
import { readGlobalConfig, writeGlobalConfig } from '../lib/config.js'
import { setLanguage, t } from '../lib/i18n.js'
import { getDefaultShell } from '../lib/platform.js'
import {
  NPM_REGISTRIES,
  PYPI_REGISTRIES,
  getRegistryLabel,
  selectNpmRegistry,
  selectPypiRegistry,
} from '../lib/registry.js'

interface ConfigOption {
  key: string
  label: string
  current: () => string
  set: () => Promise<void>
}

export async function configSetAction() {
  const config = readGlobalConfig()

  const options: ConfigOption[] = [
    {
      key: 'language',
      label: t('configLanguageLabel'),
      current: () => config.language === 'zh' ? '中文' : 'English',
      set: async () => {
        const lang = await clack.select({
          message: t('configSelectLanguage'),
          options: [
            { value: 'zh', label: '中文' },
            { value: 'en', label: 'English' },
          ],
          initialValue: config.language,
        })
        if (clack.isCancel(lang)) return
        config.language = lang as 'zh' | 'en'
        setLanguage(config.language)
        writeGlobalConfig(config)
        clack.log.success(chalk.green(`${t('configLanguageSet')} ${lang === 'zh' ? '中文' : 'English'}`))
      },
    },
    {
      key: 'shell',
      label: t('configShellLabel'),
      current: () => config.shell ?? `${t('configEnvDefault')} (${getDefaultShell()})`,
      set: async () => {
        const shell = await clack.text({
          message: t('configShellPath'),
          placeholder: getDefaultShell(),
          defaultValue: '',
        })
        if (clack.isCancel(shell)) return
        config.shell = (shell as string).trim() || undefined
        writeGlobalConfig(config)
        clack.log.success(chalk.green(`${t('configShellSet')} ${config.shell ?? t('configEnvDefault')}`))
      },
    },
    {
      key: 'current',
      label: t('configDefaultProject'),
      current: () => {
        const p = config.projects.find(p => p.path === config.current)
        return p ? p.name : config.current ?? 'none'
      },
      set: async () => {
        if (config.projects.length === 0) {
          clack.log.info(t('configNoProjects'))
          return
        }
        const project = await clack.select({
          message: t('configSelectDefault'),
          options: config.projects.map(p => ({
            value: p.path,
            label: p.name,
            hint: p.path,
          })),
        })
        if (clack.isCancel(project)) return
        config.current = project as string
        writeGlobalConfig(config)
        const name = config.projects.find(p => p.path === project)?.name ?? project
        clack.log.success(chalk.green(`${t('configDefaultSet')} ${name}`))
      },
    },
    {
      key: 'npmRegistry',
      label: t('registryNpmLabel'),
      current: () => getRegistryLabel(NPM_REGISTRIES, config.npmRegistry),
      set: async () => {
        const url = await selectNpmRegistry(config.npmRegistry)
        if (clack.isCancel(url)) return
        config.npmRegistry = url as string
        writeGlobalConfig(config)
        clack.log.success(chalk.green(`${t('registryNpmSet')} ${getRegistryLabel(NPM_REGISTRIES, config.npmRegistry)}`))
      },
    },
    {
      key: 'pypiRegistry',
      label: t('registryPypiLabel'),
      current: () => getRegistryLabel(PYPI_REGISTRIES, config.pypiRegistry),
      set: async () => {
        const url = await selectPypiRegistry(config.pypiRegistry)
        if (clack.isCancel(url)) return
        config.pypiRegistry = url as string
        writeGlobalConfig(config)
        clack.log.success(chalk.green(`${t('registryPypiSet')} ${getRegistryLabel(PYPI_REGISTRIES, config.pypiRegistry)}`))
      },
    },
  ]

  // 展示可设置的选项
  const selected = await clack.select({
    message: t('configSelectSetting'),
    options: options.map(o => ({
      value: o.key,
      label: o.label,
      hint: o.current(),
    })),
  })

  if (clack.isCancel(selected)) return

  const opt = options.find(o => o.key === selected)
  if (opt) await opt.set()
}
