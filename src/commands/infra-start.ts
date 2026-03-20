// infra-start.ts — 启动基础设施
import chalk from 'chalk'
import { existsSync } from 'fs'
import { getInfraDir } from '../lib/config.js'
import { requireProjectDir, fatal } from '../lib/errors.js'
import { composeUp, isComposeRunning } from '../lib/docker.js'
import { t } from '../lib/i18n.js'

export async function infraStartAction(options: { project?: string }) {
  const projectDir = requireProjectDir(options.project)
  const infraDir = getInfraDir(projectDir)

  if (!existsSync(infraDir)) {
    fatal(t('infraDirNotFound'), `${t('expectedAt')} ${infraDir}`)
  }

  const running = await isComposeRunning(infraDir)
  if (running) {
    console.log(chalk.dim(`  ${t('infraAlreadyRunning')}`))
    return
  }

  console.log(chalk.cyan(`\n  ${t('infraStarting')}\n`))
  const ok = await composeUp(infraDir, t('startingServices'))
  if (ok) {
    console.log(chalk.green(`  ✓ ${t('infraStarted')}`))
  } else {
    console.log(chalk.red(`  ✗ ${t('infraStartFailed')}`))
    console.log(chalk.dim(`    ${t('tryManualCompose')} cd ${infraDir} && docker compose up -d`))
  }
}
