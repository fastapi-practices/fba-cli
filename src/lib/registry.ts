// registry.ts — 包管理器镜像源选择
import * as clack from '@clack/prompts'
import { t } from './i18n.js'

export interface RegistryEntry {
  name: string
  url: string
}

export const NPM_REGISTRIES: RegistryEntry[] = [
  { name: '官方 npmjs', url: 'https://registry.npmjs.org' },
  { name: '淘宝 npmmirror', url: 'https://registry.npmmirror.com' },
  { name: '腾讯云', url: 'https://mirrors.cloud.tencent.com/npm/' },
  { name: '华为云', url: 'https://repo.huaweicloud.com/repository/npm/' },
]

export const PYPI_REGISTRIES: RegistryEntry[] = [
  { name: '官方 PyPI', url: 'https://pypi.org/simple' },
  { name: '清华 TUNA', url: 'https://pypi.tuna.tsinghua.edu.cn/simple' },
  { name: '阿里云', url: 'https://mirrors.aliyun.com/pypi/simple' },
  { name: '腾讯云', url: 'https://mirrors.cloud.tencent.com/pypi/simple' },
  { name: '中科大 USTC', url: 'https://pypi.mirrors.ustc.edu.cn/simple' },
  { name: '豆瓣', url: 'https://pypi.douban.com/simple' },
  { name: '华为云', url: 'https://repo.huaweicloud.com/repository/pypi/simple' },
]

/**
 * 根据 URL 查找预设源的显示名称
 */
export function getRegistryLabel(registries: RegistryEntry[], url: string | undefined): string {
  if (!url) return t('registryDefault')
  const entry = registries.find(r => r.url === url)
  return entry ? entry.name : url
}

/**
 * 交互选择 npm 源
 */
export async function selectNpmRegistry(currentUrl?: string): Promise<string | symbol> {
  return clack.select({
    message: t('registrySelectNpm'),
    options: NPM_REGISTRIES.map(r => ({
      value: r.url,
      label: r.name,
      hint: r.url,
    })),
    initialValue: currentUrl ?? NPM_REGISTRIES[0]!.url,
  })
}

/**
 * 交互选择 PyPI 源
 */
export async function selectPypiRegistry(currentUrl?: string): Promise<string | symbol> {
  return clack.select({
    message: t('registrySelectPypi'),
    options: PYPI_REGISTRIES.map(r => ({
      value: r.url,
      label: r.name,
      hint: r.url,
    })),
    initialValue: currentUrl ?? PYPI_REGISTRIES[0]!.url,
  })
}
