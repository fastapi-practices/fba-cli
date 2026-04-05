// config.ts — 全局 & 项目配置 CRUD
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs'
import { join, dirname, resolve, parse } from 'path'
import { homedir } from 'os'
import type { GlobalConfig, ProjectConfig, ProjectEntry } from '../types/config.js'
import { DEFAULT_GLOBAL_CONFIG, DEFAULT_PROJECT_CONFIG } from '../types/config.js'

const GLOBAL_CONFIG_PATH = join(homedir(), '.fba.json')

// ─── 全局配置 ───

export function getGlobalConfigPath(): string {
  return GLOBAL_CONFIG_PATH
}

export function globalConfigExists(): boolean {
  return existsSync(GLOBAL_CONFIG_PATH)
}

export function readGlobalConfig(): GlobalConfig {
  if (!globalConfigExists()) {
    return { ...DEFAULT_GLOBAL_CONFIG }
  }
  try {
    const raw = readFileSync(GLOBAL_CONFIG_PATH, 'utf-8')
    return { ...DEFAULT_GLOBAL_CONFIG, ...JSON.parse(raw) }
  } catch {
    return { ...DEFAULT_GLOBAL_CONFIG }
  }
}

export function writeGlobalConfig(config: GlobalConfig): void {
  writeFileSync(GLOBAL_CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8')
}

export function isFirstRun(): boolean {
  return !globalConfigExists()
}

export function addProject(entry: ProjectEntry): void {
  const config = readGlobalConfig()
  const existing = config.projects.findIndex(p => p.path === entry.path)
  if (existing >= 0) {
    config.projects[existing] = entry
  } else {
    config.projects.push(entry)
  }
  // 如果是第一个项目，设为默认
  if (config.projects.length === 1) {
    config.current = entry.path
  }
  writeGlobalConfig(config)
}

export function removeProject(path: string): void {
  const config = readGlobalConfig()
  config.projects = config.projects.filter(p => p.path !== path)
  if (config.current === path) {
    config.current = config.projects[0]?.path ?? null
  }
  writeGlobalConfig(config)
}

export function setCurrentProject(path: string): void {
  const config = readGlobalConfig()
  config.current = path
  writeGlobalConfig(config)
}

export function getCurrentProjectPath(): string | null {
  return readGlobalConfig().current
}

// ─── 项目配置 ───

export function getProjectConfigPath(projectDir: string): string {
  return join(projectDir, '.fba.json')
}

export function readProjectConfig(projectDir: string): ProjectConfig {
  const configPath = getProjectConfigPath(projectDir)
  if (!existsSync(configPath)) {
    return { ...DEFAULT_PROJECT_CONFIG }
  }
  try {
    const raw = readFileSync(configPath, 'utf-8')
    return { ...DEFAULT_PROJECT_CONFIG, ...JSON.parse(raw) }
  } catch {
    return { ...DEFAULT_PROJECT_CONFIG }
  }
}

export function writeProjectConfig(projectDir: string, config: ProjectConfig): void {
  const configPath = getProjectConfigPath(projectDir)
  writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8')
}

// ─── 路径解析 ───

/**
 * 从指定目录向上查找包含 .fba.json 的项目根目录
 */
export function findProjectDirUpwards(startDir?: string): string | null {
  let dir = resolve(startDir ?? process.cwd())
  const root = parse(dir).root
  while (true) {
    if (existsSync(join(dir, '.fba.json'))) return dir
    const parent = dirname(dir)
    if (parent === dir || parent === root) break
    dir = parent
  }
  return null
}

/**
 * 解析项目目录：优先命令行 -p 参数，其次 cwd 向上查找，最后全局 current
 */
export function resolveProjectDir(cliProjectDir?: string): string | null {
  if (cliProjectDir) return cliProjectDir
  const fromCwd = findProjectDirUpwards()
  if (fromCwd) return fromCwd
  return getCurrentProjectPath()
}

/**
 * 获取后端目录路径
 */
export function getBackendDir(projectDir: string): string {
  const config = readProjectConfig(projectDir)
  return join(projectDir, config.backend_name)
}

/**
 * 获取前端目录路径
 */
export function getFrontendDir(projectDir: string): string {
  const config = readProjectConfig(projectDir)
  return join(projectDir, config.frontend_name)
}

/**
 * 获取前端插件目录
 */
export function getFrontendPluginDir(projectDir: string): string {
  const frontendDir = getFrontendDir(projectDir)
  return join(frontendDir, 'apps', 'web-antdv-next', 'src', 'plugins')
}

/**
 * 获取后端插件目录
 */
export function getBackendPluginDir(projectDir: string): string {
  const backendDir = getBackendDir(projectDir)
  return join(backendDir, 'backend', 'plugin')
}

/**
 * 获取 infra 目录
 */
export function getInfraDir(projectDir: string): string {
  return join(projectDir, 'infra')
}
