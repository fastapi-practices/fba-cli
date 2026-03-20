// env-install.ts — 缺失环境安装
import { run } from './process.js'
import { getUvInstaller } from './platform.js'
import { t } from './i18n.js'
import type { EnvCheckResult } from '../types/env.js'

/**
 * 安装缺失的工具
 */
export async function installTool(tool: EnvCheckResult): Promise<boolean> {
  const installCommands: Record<string, { cmd: string; args: string[] }> = {
    pnpm: { cmd: 'npm', args: ['install', '-g', 'pnpm'] },
    uv: getUvInstaller(),
  }

  const installer = installCommands[tool.command]
  if (!installer) {
    return false
  }

  const result = await run(installer.cmd, installer.args, {
    spinner: true,
    label: `${t('installingTool')} ${tool.name}`,
  })

  return result.exitCode === 0
}
