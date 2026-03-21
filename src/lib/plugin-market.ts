// plugin-market.ts — 插件市场数据获取 & 解析
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'
import { ofetch } from 'ofetch'
import { basename } from 'path'
import type { PluginData } from '../types/plugin.js'
import { inferPluginType } from '../types/plugin.js'

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
