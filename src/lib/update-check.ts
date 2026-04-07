// update-check — 异步检查 npm 上的最新版本，不阻塞 CLI 正常使用
import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'
import chalk from 'chalk'
import { t } from './i18n.js'

const CACHE_DIR = join(homedir(), '.fba-cli')
const CACHE_FILE = join(CACHE_DIR, 'update-check.json')
const CHECK_INTERVAL = 1000 * 60 * 60 * 4 // 4 hours
const PACKAGE_NAME = '@fba/cli'

interface CacheData {
  latest: string
  checkedAt: number
}

function readCache(): CacheData | null {
  try {
    return JSON.parse(readFileSync(CACHE_FILE, 'utf-8')) as CacheData
  } catch {
    return null
  }
}

function writeCache(data: CacheData) {
  try {
    mkdirSync(CACHE_DIR, { recursive: true })
    writeFileSync(CACHE_FILE, JSON.stringify(data))
  } catch {
    // ignore
  }
}

async function fetchLatestVersion(): Promise<string | null> {
  try {
    const res = await fetch(`https://registry.npmjs.org/${PACKAGE_NAME}/latest`, {
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return null
    const data = (await res.json()) as { version?: string }
    return data.version ?? null
  } catch {
    return null
  }
}

function compareVersions(current: string, latest: string): boolean {
  const parse = (v: string) => v.split('.').map(Number)
  const c = parse(current)
  const l = parse(latest)
  for (let i = 0; i < 3; i++) {
    if ((l[i] ?? 0) > (c[i] ?? 0)) return true
    if ((l[i] ?? 0) < (c[i] ?? 0)) return false
  }
  return false
}

function printNotification(current: string, latest: string) {
  const message = t('updateAvailable')
    .replace('{current}', current)
    .replace('{latest}', latest)
  const hint = t('updateHint')
  const box =
    `\n${chalk.yellow('┌──────────────────────────────────────────┐')}` +
    `\n${chalk.yellow('│')}  ${message.padEnd(40)}${chalk.yellow('│')}` +
    `\n${chalk.yellow('│')}  ${hint.padEnd(40)}${chalk.yellow('│')}` +
    `\n${chalk.yellow('└──────────────────────────────────────────┘')}\n`
  console.error(box)
}

/**
 * 异步检查更新。在 CLI 启动时调用，完全不阻塞。
 * 如果有缓存命中则同步注册 exit 回调打印通知；
 * 否则发起网络请求，请求完成后打印通知（如果 CLI 还没退出的话）。
 */
export function checkForUpdate(currentVersion: string): void {
  // 先检查缓存
  const cache = readCache()
  if (cache && Date.now() - cache.checkedAt < CHECK_INTERVAL) {
    if (compareVersions(currentVersion, cache.latest)) {
      process.on('exit', () => printNotification(currentVersion, cache.latest))
    }
    return
  }

  // 异步获取最新版本，请求完成后注册 exit 钩子
  fetchLatestVersion().then((latest) => {
    if (!latest) return
    writeCache({ latest, checkedAt: Date.now() })
    if (compareVersions(currentVersion, latest)) {
      process.on('exit', () => printNotification(currentVersion, latest))
    }
  })
}
