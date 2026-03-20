// go.ts — 进入项目目录 (启动子 shell)
import chalk from 'chalk'
import { existsSync } from 'fs'
import { readGlobalConfig } from '../lib/config.js'
import { t } from '../lib/i18n.js'
import { fatal } from '../lib/errors.js'
import { getDefaultShell, getShellArgs } from '../lib/platform.js'
import { execa } from 'execa'

export async function goAction(options: { shell?: string }) {
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
  // 优先级：命令行 --shell > 全局配置 shell > 平台默认 shell
  const shell = options.shell || config.shell || getDefaultShell()

  console.log(chalk.cyan(`\n  📂 ${t('goEnteringProject')} ${projectPath}`))
  console.log(chalk.dim(`     ${t('goShell')} ${shell}`))
  console.log(chalk.dim(`     ${t('goExitHint')}\n`))

  // 启动交互式子 shell，CWD 设为项目目录
  try {
    await execa(shell, getShellArgs(), {
      cwd: projectPath,
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
