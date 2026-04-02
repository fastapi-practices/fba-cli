// go.ts — 进入项目目录 (启动子 shell)
import chalk from 'chalk'
import { existsSync } from 'fs'
import { readGlobalConfig, getBackendDir, getFrontendDir } from '../lib/config.js'
import { t } from '../lib/i18n.js'
import { fatal } from '../lib/errors.js'
import { getDefaultShell, getShellArgs } from '../lib/platform.js'
import { execa } from 'execa'

export async function goAction(options: { shell?: string; s?: boolean; f?: boolean }) {
  const config = readGlobalConfig()

  if (!config.current) {
    fatal(t('projectNoCurrent'), t('hintRunUse'))
  }

  const projectPath = config.current!
  if (!existsSync(projectPath)) {
    fatal(
      `${t('projectDirNotExist')}: ${projectPath}`,
      t('hintRunRemove'),
    )
  }

  let targetDir = projectPath
  let label = t('goEnteringProject')

  if (options.s) {
    targetDir = getBackendDir(projectPath)
    label = t('goEnteringBackend')
    if (!existsSync(targetDir)) {
      fatal(`${t('backendDirNotFound')}\n  ${t('expectedAt')} ${targetDir}`)
    }
  } else if (options.f) {
    targetDir = getFrontendDir(projectPath)
    label = t('goEnteringFrontend')
    if (!existsSync(targetDir)) {
      fatal(`${t('frontendDirNotFound')}\n  ${t('expectedAt')} ${targetDir}`)
    }
  }

  const shell = options.shell || config.shell || getDefaultShell()

  console.log(chalk.cyan(`\n  📂 ${label} ${targetDir}`))
  console.log(chalk.dim(`     ${t('goShell')} ${shell}`))
  console.log(chalk.dim(`     ${t('goExitHint')}\n`))

  try {
    await execa(shell, getShellArgs(), {
      cwd: targetDir,
      stdio: 'inherit',
      env: {
        ...process.env,
        FBA_PROJECT: projectPath,
      },
    })
  } catch {
    // 用户退出子 shell，正常行为
  }
}
