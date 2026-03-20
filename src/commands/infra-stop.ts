// infra-stop.ts — 停止基础设施
import chalk from 'chalk'
import { existsSync } from 'fs'
import { getInfraDir } from '../lib/config.js'
import { requireProjectDir, fatal } from '../lib/errors.js'
import { composeDown, isComposeRunning } from '../lib/docker.js'
import { t } from '../lib/i18n.js'

export async function infraStopAction(options: { project?: string }) {
  const projectDir = requireProjectDir(options.project)
  const infraDir = getInfraDir(projectDir)

  if (!existsSync(infraDir)) {
    fatal(t('infraDirNotFound'), `${t('expectedAt')} ${infraDir}`)
  }

  const running = await isComposeRunning(infraDir)
  if (!running) {
    console.log(chalk.dim(`  ${t('infraNotRunning')}`))
    return
  }

  console.log(chalk.cyan(`\n  ${t('infraStopping')}\n`))
  const ok = await composeDown(infraDir, t('stoppingServices'))
  if (ok) {
    console.log(chalk.green(`  ✓ ${t('infraStopped')}`))
  } else {
    console.log(chalk.red(`  ✗ ${t('infraStopFailed')}`))
    console.log(chalk.dim(`    ${t('tryManualCompose')} cd ${infraDir} && docker compose down`))
  }
}
