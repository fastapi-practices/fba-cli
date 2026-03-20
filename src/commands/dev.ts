// dev.ts — dev / dev:web / dev:celery 命令
import * as clack from '@clack/prompts'
import chalk from 'chalk'
import { existsSync } from 'fs'
import { join } from 'path'
import { readProjectConfig, getInfraDir } from '../lib/config.js'
import { requireProjectDir, requireBackendDir, requireFrontendDir, warn } from '../lib/errors.js'
import { isComposeRunning, composeUp } from '../lib/docker.js'
import { runInherited } from '../lib/process.js'
import { t } from '../lib/i18n.js'

/**
 * fba dev — 启动后端
 */
export async function devAction(options: {
  host?: string
  port?: string
  noReload?: boolean
  workers?: string
  project?: string
}) {
  const projectDir = requireProjectDir(options.project)
  const config = readProjectConfig(projectDir)
  const backendDir = requireBackendDir(projectDir)

  // 检查基础设施
  if (config.infra) {
    const infraDir = getInfraDir(projectDir)
    if (existsSync(infraDir)) {
      const running = await isComposeRunning(infraDir)
      if (!running) {
        clack.log.info(chalk.yellow(t('infraNotRunningStarting')))
        const ok = await composeUp(infraDir, t('initInfra'))
        if (!ok) {
          warn(t('infraStartHint'), `cd infra && docker compose up -d`)
        }
      }
    }
  }

  // 构建参数
  const args = ['run', 'fba', 'run']
  const port = options.port ?? String(config.server_port)
  args.push('--port', port)
  if (options.host) args.push('--host', options.host)
  if (options.noReload) args.push('--no-reload')
  if (options.workers) args.push('--workers', options.workers)

  console.log(chalk.cyan(`\n  ${t('devStartingBackend')} ${port}...\n`))
  const exitCode = await runInherited('uv', args, backendDir)
  process.exit(exitCode)
}

/**
 * fba dev:web — 启动前端
 */
export async function devWebAction(options: {
  host?: string
  port?: string
  project?: string
}) {
  const projectDir = requireProjectDir(options.project)
  const frontendDir = requireFrontendDir(projectDir)

  const args = ['dev']
  if (options.host) args.push('--host', options.host)
  if (options.port) args.push('--port', options.port)

  console.log(chalk.cyan(`\n  ${t('devStartingFrontend')}\n`))
  const exitCode = await runInherited('pnpm', args, frontendDir)
  process.exit(exitCode)
}

/**
 * fba dev:celery — 启动 Celery
 */
export async function devCeleryAction(subcommand: string, options: { project?: string }) {
  const valid = ['worker', 'beat', 'flower']
  if (!valid.includes(subcommand)) {
    const { fatal } = await import('../lib/errors.js')
    fatal(
      `${t('invalidSubcommand')}: ${subcommand}`,
      `${t('validOptions')}: ${valid.join(', ')}`,
    )
  }

  const projectDir = requireProjectDir(options.project)
  const backendDir = requireBackendDir(projectDir)

  console.log(chalk.cyan(`\n  ${t('devStartingCelery')} ${subcommand}...\n`))
  const exitCode = await runInherited('uv', ['run', 'fba', 'celery', subcommand], backendDir)
  process.exit(exitCode)
}
