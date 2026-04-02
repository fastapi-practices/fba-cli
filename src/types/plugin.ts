// 插件类型定义

/** 插件市场远程插件数据 */
export interface PluginData {
  plugin: PluginMarketInfo
  git: GitModule
}

export interface PluginMarketInfo {
  icon: string
  summary: string
  version: string
  description: string
  author: string
  type: PluginType
  tags?: PluginTag[]
  database?: DatabaseType[]
}

export interface GitModule {
  path: string
  url: string
  branch: string
}

/** 本地 plugin.toml 中的插件信息 */
export interface PluginInfo {
  icon: string
  summary: string
  version: string
  description: string
  author: string
  type: PluginType
  tags: PluginTag[]
  database?: DatabaseType[]
}

/** 后端应用级 plugin.toml */
export interface BackendAppPluginToml {
  plugin: PluginInfo
  app: { router: string[] }
  settings?: Record<string, unknown>
}

/** 后端扩展级 plugin.toml */
export interface BackendExtPluginToml {
  plugin: PluginInfo
  app: { extend: string }
  api: Record<string, { prefix: string; tags: string }>
  settings?: Record<string, unknown>
}

/** 前端 plugin.toml */
export interface FrontendPluginToml {
  plugin: PluginInfo
}

export type PluginType = 'web' | 'server'
export type PluginTag = 'ai' | 'mcp' | 'agent' | 'auth' | 'storage' | 'notification' | 'task' | 'payment' | 'other'
export type DatabaseType = 'mysql' | 'postgresql'
export type ServerPluginLevel = 'app' | 'ext'

export const PLUGIN_WEB_SUFFIX = '_ui'

export const VALID_TAGS: PluginTag[] = ['ai', 'mcp', 'agent', 'auth', 'storage', 'notification', 'task', 'payment', 'other']
export const VALID_DATABASES: DatabaseType[] = ['mysql', 'postgresql']

/** 根据名称后缀推断插件类型：以 _ui 结尾为 web 插件，否则为 server 插件 */
export function inferPluginType(name: string): PluginType {
  return name.endsWith(PLUGIN_WEB_SUFFIX) ? 'web' : 'server'
}

/** 确保 web 插件名称以 _ui 结尾，返回是否进行了自动追加 */
export function ensureWebPluginName(name: string): { name: string; appended: boolean } {
  if (name.endsWith(PLUGIN_WEB_SUFFIX)) return { name, appended: false }
  return { name: `${name}${PLUGIN_WEB_SUFFIX}`, appended: true }
}

/** 去掉 web 插件名称的 _ui 后缀，用于 git clone 目标目录名 */
export function stripWebPluginSuffix(name: string): string {
  return name.endsWith(PLUGIN_WEB_SUFFIX)
    ? name.slice(0, -PLUGIN_WEB_SUFFIX.length)
    : name
}

/** 已安装的本地插件信息 */
export interface InstalledPlugin {
  name: string
  dir: string
  type: PluginType
  info: PluginInfo
}
