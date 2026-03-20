// env-check.ts — 环境检测
import { checkCommand } from './process.js'
import { getPythonCommand } from './platform.js'
import type { EnvCheckResult, EnvCheckSummary } from '../types/env.js'

async function checkTool(
  name: string,
  command: string,
  versionArgs: string[],
  required: boolean,
): Promise<EnvCheckResult> {
  const result = await checkCommand(command, versionArgs)
  return {
    name,
    command,
    found: result.found,
    version: result.version,
    required,
  }
}

/**
 * 检查所有环境依赖
 */
export async function checkEnvironment(): Promise<EnvCheckSummary> {
  const [python, uv, pnpm, npm, docker] = await Promise.all([
    checkTool('Python', getPythonCommand(), ['--version'], false),
    checkTool('uv', 'uv', ['--version'], true),
    checkTool('pnpm', 'pnpm', ['--version'], true),
    checkTool('npm', 'npm', ['--version'], true),
    checkTool('Docker', 'docker', ['info'], false),
  ])

  return { python, uv, pnpm, npm, docker }
}

/**
 * 获取缺失的工具列表
 */
export function getMissingTools(summary: EnvCheckSummary): EnvCheckResult[] {
  return Object.values(summary).filter(r => !r.found)
}

/**
 * 获取缺失的必要工具
 */
export function getMissingRequiredTools(summary: EnvCheckSummary): EnvCheckResult[] {
  return Object.values(summary).filter(r => !r.found && r.required)
}
