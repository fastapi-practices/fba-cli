// plugin-market.ts — 插件市场数据获取 & 解析
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'
import { ofetch } from 'ofetch'
import { basename } from 'path'
import type { PluginData } from '../types/plugin.js'
import { inferPluginType, PLUGIN_WEB_SUFFIX, stripWebPluginSuffix } from '../types/plugin.js'
import type { InstalledPlugin } from '../types/plugin.js'

const PLUGIN_DATA_URL =
  'https://raw.githubusercontent.com/fastapi-practices/plugins/refs/heads/master/plugins-data.ts'

const CACHE_PATH = join(homedir(), '.fba-plugins-cache.json')

// ─── 缓存 ───

function readCache(): PluginData[] | null {
  if (!existsSync(CACHE_PATH)) return null
  try {
    return JSON.parse(readFileSync(CACHE_PATH, 'utf-8')) as PluginData[]
  } catch {
    return null
  }
}

function writeCache(data: PluginData[]): void {
  try {
    writeFileSync(CACHE_PATH, JSON.stringify(data), 'utf-8')
  } catch {
    // 缓存写入失败不影响主流程
  }
}

// ─── 数据获取 ───

/**
 * 从远程获取并解析插件市场数据，失败时回退到本地缓存
 *
 * @returns `{ data, fromCache }` — fromCache 为 true 时说明使用了缓存
 */
export async function fetchPluginMarketData(): Promise<{ data: PluginData[]; fromCache: boolean }> {
  try {
    const content = await ofetch(PLUGIN_DATA_URL, { responseType: 'text' })

    const match = content.match(/pluginDataList[^=]*=\s*(\[[\s\S]*\])/)
    if (!match?.[1]) {
      throw new Error('pluginDataList not found')
    }

    const data = JSON.parse(match[1]) as PluginData[]
    writeCache(data)
    return { data, fromCache: false }
  } catch {
    const cached = readCache()
    if (cached) return { data: cached, fromCache: true }
    throw new Error('Failed to fetch plugin market data and no local cache available')
  }
}

/**
 * 按 type 过滤插件（基于 git.path 名称推断类型）
 */
export function filterByType(plugins: PluginData[], type: string): PluginData[] {
  if (!type || type === 'all') return plugins
  return plugins.filter(p => {
    const name = basename(p.git.path)
    return inferPluginType(name) === type
  })
}

/**
 * 根据市场插件的 git.path 推断插件类型
 */
export function getMarketPluginType(p: PluginData): 'web' | 'server' {
  return inferPluginType(basename(p.git.path))
}

/**
 * 在市场数据中查找已选插件的未选配套插件（前端 ↔ 后端）
 *
 * 排除：已被用户选中的、本地已安装的
 */
export function findCounterparts(
  selected: PluginData[],
  allPlugins: PluginData[],
  installedPlugins: InstalledPlugin[],
): PluginData[] {
  const selectedPaths = new Set(selected.map(p => basename(p.git.path)))
  const installedNames = new Set(installedPlugins.map(p => p.name))

  const counterparts: PluginData[] = []
  const seen = new Set<string>()

  for (const sel of selected) {
    const name = basename(sel.git.path)
    const type = inferPluginType(name)

    // server → 找 name_ui ; web → 找去掉 _ui
    const counterpartName = type === 'server'
      ? `${name}${PLUGIN_WEB_SUFFIX}`
      : stripWebPluginSuffix(name)

    if (selectedPaths.has(counterpartName)) continue
    if (installedNames.has(counterpartName)) continue
    // 前端插件本地目录名是去掉 _ui 的
    if (type === 'server' && installedNames.has(stripWebPluginSuffix(counterpartName))) continue
    if (seen.has(counterpartName)) continue

    const match = allPlugins.find(p => basename(p.git.path) === counterpartName)
    if (match) {
      counterparts.push(match)
      seen.add(counterpartName)
    }
  }

  return counterparts
}
