# FBA CLI 工具设计文档

## 介绍

实现一个 CLI 工具，用于创建、管理、配置和运行 fastapi-best-architecture 项目。

## 功能描述

提供简单的 TUI 工具用于项目管理。

- 初次使用时创建 `~/.fba.json`，用于存储基本信息
- 初次使用时，先选择界面语言
- 命令启动时默认读取 `~/.fba.json`；若文件不存在则视为首次使用
- 除 `create` 命令外，所有命令在未指定 `-p` 参数时，均使用全局配置 `current` 所指向的项目目录

---

## 命令详情

### create（默认行为）

#### 1. 欢迎与环境检测

- 输出 FBA ASCII 字符 Logo、介绍及欢迎语，按回车开始检测环境
- 检测项目：`python`、`pnpm`、`uv`、`npm`
- 若有缺失，询问是否进入环境安装
  - 确认后，选择安装缺失的环境（默认选中全部）

#### 2. 项目配置

- 输入项目名称
- 输入前端文件夹名（留空则使用仓库默认名）
- 输入后端文件夹名（留空则使用仓库默认名）
- 创建项目文件夹
- 克隆前后端仓库（若指定了文件夹名则使用对应名称）

#### 3. 开发设施配置（可选）

可选服务：`Redis`、`PostgreSQL`、`RabbitMQ`（多选，默认全选）

- **选择"是"**：
  1. 检测 Docker 环境是否正常
     - 正常 → 进入下一步
     - 异常 → 输出提示，跳过本步骤
  2. 环境正常后，输入各服务基本配置（留空使用默认值），输入内容暂存，后续写入 `.env`
  3. 创建 `infra` 目录
  4. 复制或创建基础设施 `docker-compose` 文件（根据所选服务生成），并将配置写入 `.env`

#### 4. 基本配置项

若上一步已配置 PostgreSQL / Redis，对应项无需重复输入。

```env
# Database
DATABASE_TYPE='postgresql'
DATABASE_HOST='127.0.0.1'
DATABASE_PORT=5432
DATABASE_USER='postgres'
DATABASE_PASSWORD='123456'

# Redis
REDIS_HOST='127.0.0.1'
REDIS_PORT=6379
REDIS_PASSWORD=''
REDIS_DATABASE=0

# Token
TOKEN_SECRET_KEY='1VkVF75nsNABBjK_7-qz7GtzNy3AMvktc9TCPwKczCk'

# Celery
CELERY_BROKER_REDIS_DATABASE=1

# RabbitMQ
CELERY_RABBITMQ_HOST='127.0.0.1'
CELERY_RABBITMQ_PORT=5672
CELERY_RABBITMQ_USERNAME='guest'
CELERY_RABBITMQ_PASSWORD='guest'
```

- 配置写入路径：`{项目目录}/{后端文件夹名}/backend/.env`

#### 5. 运行配置

- 前端端口：写入 `{项目目录}/{前端文件夹名}/apps/web-antdv-next/.env.development`
- 后端端口：写入 `{项目目录}/.fba.json` 中的 `server_port` 字段
- 将前后端地址等基本信息写入项目配置文件

#### 6. 项目初始化

输出提示，开始初始化：

1. **启动开发设施**（若已配置 infra）
   - 切换 `cwd` 至 `{项目目录}/infra/`
   - 执行 `docker compose up -d`，展示进度动画
   - 启动失败则退出

2. **初始化前端环境**（可选）
   - 切换 `cwd` 至前端目录
   - 执行 `pnpm i`（展示进度），失败则跳至下一步

3. **初始化 Python 环境**（可选，失败则跳至下一步）
   - 切换 `cwd` 至后端目录
   - 使用 `uv` 创建 `.venv` 虚拟环境
   - 执行 `uv sync` 同步依赖
   - 执行 `uv run fba init` 初始化项目

#### 7. 安装第三方插件（是/否）

- 请求插件市场数据：
  `https://raw.githubusercontent.com/fastapi-practices/plugins/refs/heads/master/plugins-data.ts`
- 解析并列出插件列表（支持搜索、过滤）
- 选择目标插件并安装
  - 前端插件：执行对应安装逻辑
  - 后端插件：调用 `uv run fba add`（需后端环境初始化成功）

#### 8. 完成

- 输出安装成功提示
- 将项目目录写入全局 `~/.fba.json`；若为第一个项目，则自动设为默认项目

---

### dev

**描述**：启动后端 API 服务

**参数**：

| 参数                | 说明                                                             | 默认值      |
| ------------------- | ---------------------------------------------------------------- | ----------- |
| `--host HOST`       | 服务监听地址。本地开发用 `127.0.0.1`，局域网访问用 `0.0.0.0`     | `127.0.0.1` |
| `--port PORT`       | 服务监听端口，默认读取 `{项目目录}/.fba.json` 中的 `server_port` | `8000`      |
| `--no-reload`       | 禁用代码变更时自动重载                                           | `false`     |
| `--workers WORKERS` | 工作进程数，须与 `--no-reload` 同时使用                          | `1`         |

**执行逻辑**：

1. 若项目存在 `infra`，启动前检查开发设施（`{项目目录}/infra`）是否已运行
2. 切换 `cwd` 至 `{项目目录}/{backend_name}`
3. 执行 `uv run fba run`，透传相关参数（`--port` 必传，其他参数未传则不传递）

---

### dev:web

**描述**：启动前端 Web 服务

**参数**：

| 参数          | 说明         | 默认值           |
| ------------- | ------------ | ---------------- |
| `--host HOST` | 服务监听地址 | `127.0.0.1`      |
| `--port PORT` | 服务监听端口 | 读取 `.env` 文件 |

**执行逻辑**：

切换 `cwd` 至 `{项目目录}/{frontend_name}`，执行对应启动命令。

---

### dev:celery

**描述**：启动 Celery 相关服务

**子命令**：

| 子命令   | 说明                    |
| -------- | ----------------------- |
| `worker` | 启动 Celery Worker 服务 |
| `beat`   | 启动 Celery Beat 服务   |
| `flower` | 启动 Celery Flower 服务 |

**执行逻辑**：

切换 `cwd` 至 `{项目目录}/{backend_name}`，执行 `uv run fba celery [subcommand]`。

---

### plugin

插件管理命令，支持插件市场。

#### 插件市场

**数据源**：`https://raw.githubusercontent.com/fastapi-practices/plugins/refs/heads/master/plugins-data.ts`

数据结构如下：

```ts
export const validTags = [
  "ai",
  "mcp",
  "agent",
  "auth",
  "storage",
  "notification",
  "task",
  "payment",
  "other",
] as const;

export const validDatabases = ["mysql", "postgresql"] as const;

// 插件类型：web 前端插件 / server 后端插件
export const validTypes = ["web", "server"] as const;

export type ValidTag = (typeof validTags)[number];
export type ValidDatabase = (typeof validDatabases)[number];
export type ValidType = (typeof validTypes)[number];

export interface PluginTomlPlugin {
  icon: string;
  summary: string;
  version: string;
  description: string;
  author: string;
  type: ValidType;
  tags?: ValidTag[];
  database?: ValidDatabase[];
}

export interface GitModule {
  path: string;
  url: string;
  branch: string;
}

export interface PluginData {
  plugin: PluginTomlPlugin;
  git: GitModule;
}

export const pluginDataList: PluginData[] = [
  // ... 插件数据列表
];
```

解析以上数据结构，在 TUI 中展示插件市场列表，并支持关键字搜索与标签过滤。

---

#### plugin add

**描述**：添加插件，前后端插件使用不同安装逻辑

**无参数时**：进入插件市场 TUI，选择要安装的插件

**参数列表**：

| 参数                  | 说明                                                                             | 备注     |
| --------------------- | -------------------------------------------------------------------------------- | -------- |
| `-b` / `-f`           | 指定后端插件 / 前端插件                                                          | **必填** |
| `--path PATH`         | ZIP 插件的本地完整路径                                                           |          |
| `--repo-url REPO_URL` | Git 插件的仓库地址                                                               |          |
| `--no-sql`            | 禁用插件 SQL 脚本自动执行（Default: `false`）                                    | 后端专用 |
| `--db-type DB_TYPE`   | SQL 脚本数据库类型，可选：`mysql`、`postgresql`（Default: `postgresql`）         | 后端专用 |
| `--pk-type PK_TYPE`   | SQL 脚本主键类型，可选：`autoincrement`、`snowflake`（Default: `autoincrement`） | 后端专用 |

**安装逻辑**：

- **前端插件**
  - 插件目录：`{项目目录}/{frontend_name}/apps/web-antdv-next/src/plugins`
  - Git 仓库插件：直接克隆至 `plugins` 目录
  - ZIP 插件：解压至对应目录
  - 安装完成后，询问是否执行 `pnpm i` 安装依赖（在 `{项目目录}/{frontend_name}` 下执行即可，pnpm-workspace 会自动处理）

- **后端插件**
  - 从插件市场获取的插件需提取对应参数
  - 切换 `cwd` 至 `{项目目录}/{backend_name}`
  - 执行 `uv run fba add ...`（参数直接透传）

- **直接命令安装**：每次安装一个插件，通过 `-b` / `-f` 决定安装类型与逻辑

- **插件市场安装**：支持批量选择，前后端类型从插件信息的 `type` 字段中提取

---

#### plugin remove

**描述**：移除插件

**逻辑**：

1. 自动扫描插件目录，获取已安装插件列表（前后端插件均包含 `plugin.toml`）
2. 展示可选列表，选择要移除的插件
3. 二次确认后直接删除
4. 若移除了前端插件，询问是否执行 `pnpm i` 同步依赖
5. 后端插件在项目后端目录执行 `uv run fba remove` 移除

---

#### plugin create

**描述**：在当前项目中创建新插件

**步骤**：

1. 选择插件类型：`web` / `server` / `all`（`all` 表示同时创建前后端，适用于相互依赖的插件）
2. 若选择 `server` 或 `all`，则需进一步选择 Server 插件类型：
   - **应用级插件**
   - **扩展级插件**
3. 输入插件名称
4. 输入插件信息（写入 `plugin.toml`）：

```toml
# 插件信息
[plugin]
# 图标（插件仓库内的图标路径或图标链接地址）
icon = 'assets/icon.svg'
# 摘要（简短描述）
summary = ''
# 版本号
version = ''
# 描述
description = ''
# 作者
author = ''
# 标签
# 当前支持：ai、mcp、agent、auth、storage、notification、task、payment、other
tags = ['']
# 数据库支持
# 当前支持：mysql、postgresql
database = ['']
```

5. 创建插件目录：
   - 从模板仓库拉取至对应目录
   - 前端插件目录：`{项目目录}/{frontend_name}/apps/web-antdv-next/src/plugins`
   - 后端插件目录：`{项目目录}/{backend_name}/backend/plugin/`
   - 注意：后端**扩展级插件**无需从模板拉取，手动创建即可
6. 将插件信息写入插件目录中的 `plugin.toml`
7. 删除 `.git` 文件夹，重新初始化 Git 仓库（默认 `master` 分支）
8. 输出创建成功提示

---

#### plugin list

**描述**：列出当前项目已安装的前后端插件

扫描对应插件目录，解析 `plugin.toml` 文件并展示。

---

### list

**描述**：列出 `~/.fba.json` 中记录的所有项目

---

### current

**描述**：输出当前设置的默认项目

---

### use

**描述**：设置默认项目

弹出项目选择器，选择目标项目后更新 `~/.fba.json` 中的 `current` 字段。

---

### edit

**描述**：编辑 `~/.fba.json` 全局配置文件

---

### go

**描述**：切换终端工作目录至 `current` 指向的项目目录

---

## 参考信息

### fastapi-best-architecture 相关链接

| 资源         | 地址                                                                                 |
| ------------ | ------------------------------------------------------------------------------------ |
| 前端仓库     | `https://github.com/fastapi-practices/fastapi-best-architecture-ui.git`              |
| 后端仓库     | `https://github.com/fastapi-practices/fastapi-best-architecture.git`                 |
| 插件开发文档 | `https://fastapi-practices.github.io/fastapi_best_architecture_docs/plugin/dev.html` |
| 项目文档     | `https://fastapi-practices.github.io/fastapi_best_architecture_docs/`                |

### 插件模板

```
templates/
├── server/
│   ├── plugin.app.toml   # 应用级插件模板配置
│   └── plugin.ext.toml   # 扩展级插件模板配置
└── web/                  # 前端插件模板
```

### uv run fba 命令参考

```shell
Usage: fba-cli [--sql PATH] {init,run,add,remove,format,celery,codegen,alembic} [-h] [-v] [--completion COMPLETION]

  一个高效的 fba 命令行界面

  Options
    [--sql PATH]               在事务中执行 SQL 脚本

  Subcommands
    init                       初始化 fba 项目
    run                        运行 API 服务
    add                        新增插件
    remove                     移除插件
    format                     格式化代码
    celery                     运行 Celery 服务
    codegen                    代码生成
    alembic                    数据库迁移管理

  Help
    [-h, --help]               显示帮助信息并退出
    [-v, --version]            显示版本号并退出
    [--completion COMPLETION]  使用 --completion generate 输出 Shell 补全脚本
```

```shell
Usage: fba-cli run [--host HOST] [--port PORT] [--no-reload] [--workers WORKERS] [-h]

  运行 API 服务

  Options
    [--host HOST]        服务监听地址（本地开发：127.0.0.1，局域网访问：0.0.0.0）(Default: 127.0.0.1)
    [--port PORT]        服务监听端口 (Default: 8000)
    [--no-reload]        禁用代码变更时自动重载 (Default: False)
    [--workers WORKERS]  工作进程数，须与 --no-reload 同时使用 (Default: 1)
```

```shell
Usage: fba-cli add [--path PATH] [--repo-url REPO_URL] [--no-sql] [--db-type DB_TYPE] [--pk-type PK_TYPE] [-h]

  新增插件

  Options
    [--path PATH]          ZIP 插件的本地完整路径
    [--repo-url REPO_URL]  Git 插件的仓库地址
    [--no-sql]             禁用插件 SQL 脚本自动执行 (Default: False)
    [--db-type DB_TYPE]    SQL 脚本数据库类型，可选：mysql、postgresql (Default: postgresql)
    [--pk-type PK_TYPE]    SQL 脚本主键类型，可选：autoincrement、snowflake (Default: autoincrement)
```

```shell
Usage: fba-cli remove [--no-sql] [PLUGIN] [-h]

  移除插件

  Options
    [--no-sql]    禁用插件销毁 SQL 脚本自动执行 (Default: False)

  Arguments
    [PLUGIN]      要移除的插件名称
```

```shell
Usage: fba-cli celery {worker,beat,flower} [-h]

  运行 Celery 服务

  Subcommands
    worker        启动 Celery Worker 服务
    beat          启动 Celery Beat 服务
    flower        启动 Celery Flower 服务
```

---

## 技术栈

- **运行时**：Bun.js（兼容 Node.js）
- **语言**：TypeScript
- **发布**：支持发布至 npm
- **呈现方式**：CLI 命令行 + 部分 TUI 交互界面
