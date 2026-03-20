// 配置类型定义
import type { DatabaseType } from '../lib/infra.js'

export interface GlobalConfig {
  language: 'zh' | 'en'
  current: string | null
  projects: ProjectEntry[]
  shell?: string                    // 自定义 shell (fba go)
  npmRegistry?: string              // npm/pnpm 镜像源 URL
  pypiRegistry?: string             // PyPI 镜像源 URL
}

export interface ProjectEntry {
  name: string
  path: string
  createdAt: string
}

export interface ProjectConfig {
  name: string
  backend_name: string
  frontend_name: string
  server_port: number
  web_port: number
  infra: boolean
  infra_services: string[]
  db_type?: DatabaseType
}

export const DEFAULT_GLOBAL_CONFIG: GlobalConfig = {
  language: 'zh',
  current: null,
  projects: [],
}

export const DEFAULT_PROJECT_CONFIG: ProjectConfig = {
  name: '',
  backend_name: 'fastapi-best-architecture',
  frontend_name: 'fastapi-best-architecture-ui',
  server_port: 8000,
  web_port: 5173,
  infra: false,
  infra_services: [],
}
