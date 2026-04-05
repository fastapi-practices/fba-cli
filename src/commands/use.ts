// use.ts — 切换默认项目
import { resolve } from 'path'
import * as clack from '@clack/prompts'
import chalk from 'chalk'
import { readGlobalConfig, setCurrentProject, findProjectDirUpwards } from '../lib/config.js'
import { t } from '../lib/i18n.js'

export async function useAction(dir?: string) {
  const config = readGlobalConfig()

  // fba use . 或 fba use <dir>：从指定目录向上查找项目
  if (dir) {
    const startDir = resolve(dir)
    const projectDir = findProjectDirUpwards(startDir)
    if (!projectDir) {
      console.log(chalk.red(t('useNotFbaProject')))
      return
    }

    const entry = config.projects.find(p => p.path === projectDir)
    if (!entry) {
      console.log(chalk.red(t('useNotRegistered')))
      console.log(chalk.dim(t('useHintAdd')))
      return
    }

    setCurrentProject(projectDir)
    console.log(chalk.green(`${t('projectSwitched')} ${entry.name}`))
    return
  }

  // 交互式选择
  if (config.projects.length === 0) {
    console.log(chalk.dim(t('projectListEmpty')))
    return
  }

  const project = await clack.select({
    message: t('projectSelect'),
    options: config.projects.map(p => ({
      value: p.path,
      label: p.name,
      hint: p.path,
    })),
  })

  if (clack.isCancel(project)) return

  setCurrentProject(project as string)
  const name = config.projects.find(p => p.path === project)?.name ?? project
  console.log(chalk.green(`${t('projectSwitched')} ${name}`))
}
