// dev.ts — dev 命令组：server / web / celery / all / 自定义
import * as clack from '@clack/prompts'
import chalk from 'chalk'
import { existsSync } from 'fs'
import { join, resolve } from 'path'
import { readProjectConfig, getInfraDir, getBackendDir, getFrontendDir } from '../lib/config.js'
import { requireProjectDir, requireBackendDir, requireFrontendDir, warn, fatal } from '../lib/errors.js'
import { isComposeRunning, composeUp } from '../lib/docker.js'
import { runInherited } from '../lib/process.js'
import { t } from '../lib/i18n.js'
import type { DevEntry } from '../types/config.js'
import type { DevProcessDef } from '../lib/dev-all.js'

interface DevDirs {
  project: string
  backend: string
  frontend: string
  infra: string
}

function resolveDevVars(template: string, dirs: DevDirs): string {
  return template
    .replace(/<ProjectDir>/g, dirs.project)
    .replace(/<BackendDir>/g, dirs.backend)
    .replace(/<FrontendDir>/g, dirs.frontend)
    .replace(/<InfraDir>/g, dirs.infra)
}

function buildDevDirs(projectDir: string): DevDirs {
  return {
    project: projectDir,
    backend: getBackendDir(projectDir),
    frontend: getFrontendDir(projectDir),
    infra: getInfraDir(projectDir),
  }
}

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

/**
 * fba dev <name> — 运行自定义开发命令
 */
export async function devCustomAction(
  name: string,
  entry: DevEntry,
  options: { project?: string },
) {
  const projectDir = requireProjectDir(options.project)
  const dirs = buildDevDirs(projectDir)
  const cmd = resolveDevVars(entry.cmd, dirs)
  const cwd = entry.cwd ? resolveDevVars(entry.cwd, dirs) : projectDir

  console.log(chalk.cyan(`\n  ${t('devCustomStarting')} ${name}...\n`))

  const exitCode = await runInherited('sh', ['-c', cmd], cwd, { env: entry.envs })
  process.exit(exitCode)
}

/**
 * fba dev all — 同时启动所有开发服务（内置 + 自定义），按键切换输出流
 *
 * 自动包含:
 *   - server: uv run fba run (如果后端目录存在)
 *   - web:    pnpm dev       (如果前端目录存在)
 * devs 中的同名条目会覆盖内置默认值。
 */
export async function devAllAction(options: { project?: string }) {
  const projectDir = requireProjectDir(options.project)
  const config = readProjectConfig(projectDir)

  const defsMap = new Map<string, DevProcessDef>()

  const backendDir = getBackendDir(projectDir)
  if (existsSync(backendDir)) {
    defsMap.set('server', {
      name: 'server',
      cmd: `uv run fba run --port ${config.server_port}`,
      cwd: backendDir,
    })
  }

  const frontendDir = getFrontendDir(projectDir)
  if (existsSync(frontendDir)) {
    defsMap.set('web', {
      name: 'web',
      cmd: 'pnpm dev',
      cwd: frontendDir,
    })
  }

  if (config.devs) {
    const dirs = buildDevDirs(projectDir)
    for (const [name, entry] of Object.entries(config.devs)) {
      defsMap.set(name, {
        name,
        cmd: resolveDevVars(entry.cmd, dirs),
        cwd: entry.cwd ? resolveDevVars(entry.cwd, dirs) : projectDir,
        envs: entry.envs,
      })
    }
  }

  const defs = Array.from(defsMap.values())

  if (defs.length === 0) {
    fatal(
      t('devAllNoDevs'),
      t('devAllHintConfig'),
    )
  }

  const { runDevMultiplexer } = await import('../lib/dev-all.js')
  await runDevMultiplexer(defs)
}
