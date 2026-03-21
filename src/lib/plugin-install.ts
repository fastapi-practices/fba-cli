// plugin-install.ts — 插件安装与管理逻辑
import { existsSync, readdirSync, readFileSync } from 'fs'
import { join, basename } from 'path'
import { parse as parseToml } from 'smol-toml'
import { run } from './process.js'
import { gitClone, removeGitDir } from './git.js'
import { getFrontendPluginDir, getBackendPluginDir, getBackendDir, getFrontendDir } from './config.js'
import type { InstalledPlugin, PluginInfo, PluginData } from '../types/plugin.js'
import { inferPluginType } from '../types/plugin.js'

/**
 * 扫描已安装的插件（通过名称后缀 _ui 判断类型）
 */
export function scanInstalledPlugins(projectDir: string): InstalledPlugin[] {
  const plugins: InstalledPlugin[] = []

  // 扫描前端插件
  const frontendPluginDir = getFrontendPluginDir(projectDir)
  if (existsSync(frontendPluginDir)) {
    for (const dir of safeReadDir(frontendPluginDir)) {
      const tomlPath = join(frontendPluginDir, dir, 'plugin.toml')
      const info = readPluginToml(tomlPath)
      if (info) {
        plugins.push({ name: dir, dir: join(frontendPluginDir, dir), type: inferPluginType(dir), info })
      }
    }
  }

  // 扫描后端插件
  const backendPluginDir = getBackendPluginDir(projectDir)
  if (existsSync(backendPluginDir)) {
    for (const dir of safeReadDir(backendPluginDir)) {
      const tomlPath = join(backendPluginDir, dir, 'plugin.toml')
      const info = readPluginToml(tomlPath)
      if (info) {
        plugins.push({ name: dir, dir: join(backendPluginDir, dir), type: inferPluginType(dir), info })
      }
    }
  }

  return plugins
}

/**
 * 安全读取目录子文件夹
 */
function safeReadDir(dir: string): string[] {
  try {
    return readdirSync(dir, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name)
  } catch {
    return []
  }
}

/**
 * 读取 plugin.toml 中的插件信息
 */
function readPluginToml(path: string): PluginInfo | null {
  if (!existsSync(path)) return null
  try {
    const content = readFileSync(path, 'utf-8')
    const parsed = parseToml(content) as any
    return parsed.plugin ?? null
  } catch {
    return null
  }
}

/**
 * 安装前端插件 (git clone)
 */
export async function installFrontendPlugin(
  projectDir: string,
  repoUrl: string,
  pluginName: string,
  branch?: string,
): Promise<boolean> {
  const pluginDir = join(getFrontendPluginDir(projectDir), pluginName)
  if (existsSync(pluginDir)) {
    return false // 已存在
  }
  return gitClone(repoUrl, pluginDir, { branch, label: `Installing ${pluginName}` })
}

/**
 * 安装后端插件 (通过 uv run fba add)
 */
export async function installBackendPlugin(
  projectDir: string,
  options: {
    repoUrl?: string
    path?: string
    noSql?: boolean
    dbType?: string
    pkType?: string
  },
): Promise<boolean> {
  const backendDir = getBackendDir(projectDir)
  const args = ['run', 'fba', 'add']

  if (options.repoUrl) args.push('--repo-url', options.repoUrl)
  if (options.path) args.push('--path', options.path)
  if (options.noSql) args.push('--no-sql')
  if (options.dbType) args.push('--db-type', options.dbType)
  if (options.pkType) args.push('--pk-type', options.pkType)

  const result = await run('uv', args, {
    cwd: backendDir,
    spinner: true,
    label: 'Installing backend plugin',
  })
  return result.exitCode === 0
}

/**
 * 从插件市场数据安装多个插件（通过名称后缀 _ui 判断类型）
 */
export async function installFromMarket(
  projectDir: string,
  plugins: PluginData[],
): Promise<{ success: string[]; failed: string[] }> {
  const success: string[] = []
  const failed: string[] = []

  for (const p of plugins) {
    const name = basename(p.git.path) || p.plugin.summary
    const type = inferPluginType(name)

    let ok: boolean
    if (type === 'web') {
      ok = await installFrontendPlugin(projectDir, p.git.url, name, p.git.branch)
    } else {
      ok = await installBackendPlugin(projectDir, { repoUrl: p.git.url })
    }

    if (ok) success.push(name)
    else failed.push(name)
  }

  return { success, failed }
}

/**
 * 移除前端插件
 */
export async function removeFrontendPlugin(pluginDir: string): Promise<boolean> {
  try {
    const { rmSync } = await import('fs')
    rmSync(pluginDir, { recursive: true, force: true })
    return true
  } catch {
    return false
  }
}

/**
 * 移除后端插件
 */
export async function removeBackendPlugin(
  projectDir: string,
  pluginName: string,
  noSql?: boolean,
): Promise<boolean> {
  const backendDir = getBackendDir(projectDir)
  const args = ['run', 'fba', 'remove', pluginName]
  if (noSql) args.push('--no-sql')

  const result = await run('uv', args, {
    cwd: backendDir,
    spinner: true,
    label: `Removing ${pluginName}`,
  })
  return result.exitCode === 0
}

/**
 * 在前端目录执行 pnpm install
 */
export async function runPnpmInstall(projectDir: string): Promise<boolean> {
  const frontendDir = getFrontendDir(projectDir)
  const result = await run('pnpm', ['install'], {
    cwd: frontendDir,
    spinner: true,
    label: 'pnpm install',
  })
  return result.exitCode === 0
}
