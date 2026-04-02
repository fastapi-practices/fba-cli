#!/usr/bin/env node
// index.ts — FBA CLI 入口：Commander 命令路由
import { readFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import { Command } from 'commander'
import chalk from 'chalk'
import { readGlobalConfig } from './lib/config.js'
import { initI18nFromConfig, t } from './lib/i18n.js'

const currentDir = dirname(fileURLToPath(import.meta.url))
const packageJsonPath = resolve(currentDir, '..', 'package.json')
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8')) as { version?: string }
const cliVersion = packageJson.version ?? '0.1.0'

// 全局未捕获错误处理
process.on('uncaughtException', (err) => {
  console.error(chalk.red(`\n  ✗ Unexpected error: ${err.message}`))
  if (process.env.DEBUG) console.error(err.stack)
  process.exit(1)
})
process.on('unhandledRejection', (reason) => {
  console.error(chalk.red(`\n  ✗ Unexpected error: ${reason}`))
  process.exit(1)
})

// 初始化 i18n
const globalConfig = readGlobalConfig()
initI18nFromConfig(globalConfig)

const program = new Command()

program
  .name('fba-cli')
  .description(t('cliDescription'))
  .version(cliVersion)
  .option('-p, --project <dir>', t('optProject'))
  .option('--lang <lang>', t('optLang'))

// ─── create (default) ───
program
  .command('create', { isDefault: true })
  .description(t('cmdCreate'))
  .action(async () => {
    const { createAction } = await import('./commands/create.js')
    await createAction()
  })

// ─── add ───
program
  .command('add')
  .description(t('cmdAdd'))
  .action(async () => {
    const { addAction } = await import('./commands/add.js')
    await addAction()
  })

// ─── dev ───
program
  .command('dev')
  .description(t('cmdDev'))
  .option('--host <host>', t('optHost'), '127.0.0.1')
  .option('--port <port>', t('optPort'))
  .option('--no-reload', t('optNoReload'))
  .option('--workers <n>', t('optWorkers'))
  .action(async (options) => {
    const { devAction } = await import('./commands/dev.js')
    await devAction({ ...options, project: program.opts().project })
  })

// ─── dev:web ───
program
  .command('dev:web')
  .description(t('cmdDevWeb'))
  .option('--host <host>', t('optHost'))
  .option('--port <port>', t('optPort'))
  .action(async (options) => {
    const { devWebAction } = await import('./commands/dev.js')
    await devWebAction({ ...options, project: program.opts().project })
  })

// ─── dev:celery ───
program
  .command('dev:celery <subcommand>')
  .description(t('cmdDevCelery'))
  .action(async (subcommand) => {
    const { devCeleryAction } = await import('./commands/dev.js')
    await devCeleryAction(subcommand, { project: program.opts().project })
  })

// ─── plugin ───
const pluginCmd = program
  .command('plugin')
  .description(t('cmdPlugin'))

pluginCmd
  .command('add')
  .description(t('cmdPluginAdd'))
  .option('-b', t('optBackendPlugin'))
  .option('-f', t('optFrontendPlugin'))
  .option('--repo-url <url>', t('optRepoUrl'))
  .option('--path <path>', t('optPath'))
  .option('--no-sql', t('optNoSql'))
  .option('--db-type <type>', t('optDbType'))
  .option('--pk-type <type>', t('optPkType'))
  .action(async (options) => {
    const { pluginAddAction } = await import('./commands/plugin/add.js')
    await pluginAddAction({ ...options, project: program.opts().project })
  })

pluginCmd
  .command('remove')
  .description(t('cmdPluginRemove'))
  .action(async () => {
    const { pluginRemoveAction } = await import('./commands/plugin/remove.js')
    await pluginRemoveAction({ project: program.opts().project })
  })

pluginCmd
  .command('create')
  .description(t('cmdPluginCreate'))
  .action(async () => {
    const { pluginCreateAction } = await import('./commands/plugin/create.js')
    await pluginCreateAction({ project: program.opts().project })
  })

pluginCmd
  .command('list')
  .description(t('cmdPluginList'))
  .action(async () => {
    const { pluginListAction } = await import('./commands/plugin/list.js')
    await pluginListAction({ project: program.opts().project })
  })

// ─── project management ───
program
  .command('list')
  .description(t('cmdList'))
  .action(async () => {
    const { listAction } = await import('./commands/list.js')
    await listAction()
  })

program
  .command('remove')
  .description(t('cmdRemove'))
  .action(async () => {
    const { removeAction } = await import('./commands/remove.js')
    await removeAction()
  })

program
  .command('current')
  .description(t('cmdCurrent'))
  .action(async () => {
    const { currentAction } = await import('./commands/current.js')
    await currentAction()
  })

program
  .command('use')
  .description(t('cmdUse'))
  .action(async () => {
    const { useAction } = await import('./commands/use.js')
    await useAction()
  })

program
  .command('edit')
  .description(t('cmdEdit'))
  .action(async () => {
    const { editAction } = await import('./commands/edit.js')
    await editAction()
  })

program
  .command('go')
  .description(t('cmdGo'))
  .option('-s', t('optGoServer'))
  .option('-f', t('optGoFrontend'))
  .option('--shell <shell>', t('optShell'))
  .action(async (options) => {
    const { goAction } = await import('./commands/go.js')
    await goAction(options)
  })

// ─── infra ───
const infraCmd = program
  .command('infra')
  .description(t('cmdInfra'))

infraCmd
  .command('stop')
  .description(t('cmdInfraStop'))
  .action(async () => {
    const { infraStopAction } = await import('./commands/infra-stop.js')
    await infraStopAction({ project: program.opts().project })
  })

infraCmd
  .command('start')
  .description(t('cmdInfraStart'))
  .action(async () => {
    const { infraStartAction } = await import('./commands/infra-start.js')
    await infraStartAction({ project: program.opts().project })
  })

// ─── config ───
const configCmd = program
  .command('config')
  .description(t('cmdConfig'))

configCmd
  .command('set')
  .description(t('cmdConfigSet'))
  .action(async () => {
    const { configSetAction } = await import('./commands/config-set.js')
    await configSetAction()
  })

// ─── Run ───
program.parse()
