## 介绍

我想要实现一个cli工具，用于创建、管理、配置和运行fastapi-best-architecture

## 功能描述

提供简单的tui工具，用于管理
初次使用创建~/.fba.json，用于存储一些基本信息
初次使用，先选择语言
命令启动，默认读取~/.fba.json，没有创建，则标志着第一次使用
除create外，所有的命令启动，在没有指定-p的时候，都使用全局中的current所指向的项目目录

### 默认行为为create

- 进入输出FAB assics 字符 logo和介绍，欢迎语，回车开始检测环境
- 检测环境主要有：python，pnpm，uv，npm
- 缺失询问是否进入环境安装
  - 确认后，选择安装缺失的环境，默认all
- 然后输入项目名称
- 前端文件夹名，留空默认仓库名
- 后端文件夹名，留空默认仓库名
- 创建项目文件夹
- 克隆项目(如果指定了前后端文件夹名则使用前后端文件夹名)
- 是否创建开发环境(redis，postgres, rabitmq，每个项目都是可选(多选项)，默认all)
  - 是则检测docker 环境是否正常
    - 正常下一步
    - 否则提示信息，跳出创建生成环境这一步
  - 环境正常后开始创建，本环节所有输入信息都先记录，后面需要写入env
    - 需要输入一些redis，postgres的基本选项，留空使用默认
    - 输入完毕后，创建infra目录
    - copy 或创建设施docker compose文件(基于选取的服务)，并写入前面的配置内容到.env
- 然后是一些基本配置项目(postgres，redis如果上面进行了设置，则基础，不用输入)
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
  # [ App ] task
  # Celery
  CELERY_BROKER_REDIS_DATABASE=1
  # Rabbitmq
  CELERY_RABBITMQ_HOST='127.0.0.1'
  CELERY_RABBITMQ_PORT=5672
  CELERY_RABBITMQ_USERNAME='guest'
  CELERY_RABBITMQ_PASSWORD='guest'
- 将设置写入到.env
  - env在：项目目录/后端文件夹/backend/.env
- 项目运行配置
  - 前端端口(写入前端.env.devploment), 地址：项目目录/前端文件夹/apps/web-antdv-next/.env.development
  - 后端端口(写入项目配置: 项目目录/.fba.json)
- 写入基本信息到项目配置，比如：前后端地址
- 开始准备初始化项目，输出提示
  - 启动开发设施(将cwd切换到：项目目录/infra/，使用docker compose up -d 启动，启动失败退出), 需要有进度动画
- 初始化前端环境(可选)
  - cwd切换到前端目录，执行pnpm i (进度展示)，失败退出到下一步
- 初始换python环境(可选)(失败进行到下一步)
  - cwd切换到后端目录，使用uv创建.venv虚拟环境
  - uv sync同步依赖
  - uv fab init：初始化项目

- 安装第三方插件(是/否)
  - 请求插件市场：https://raw.githubusercontent.com/fastapi-practices/plugins/refs/heads/master/plugins-data.ts，解析插件列表
  - 列出插件列表(支持搜索，过滤)
  - 选择插件
  - 安装，前端插件自行实现安装逻辑，后端插件调用uv fab add(所以后端插件必须后端项目环境初始化成功才行)

- 所有结束，输出提示，安装成功
- 并将项目目录写入到全局.fab.json，如果是第一个项目的话，就设为默认项目(决定以后的直接启动等功能)

### dev

描述：用于启动服务
参数：
[--host HOST] 提供服务的主机 IP 地址，对于本地开发，请使用 127.0.0.1。要启用公共访问，例如在局域网中，请使用 0.0.0.0 (Default: 127.0.0.1)
[--port PORT] 提供服务的主机端口号 (Default: 8000)
[--no-reload] 禁用在（代码）文件更改时自动重新加载服务器 (Default: False)
[--workers WORKERS] 使用多个工作进程，必须与 --no-reload 同时使用 (Default: 1)
默认port使用项目目录下.fab.json中的server_port
如果有infra(开发设施的话)，启动前需要检查设施是否启动，设施目录在：项目目录/infra
项目后端目录为项目目录+ 项目目录下的.fba.json中的backend_name
执行：然后切换cwd到项目后端目录，调用uv run fba run 传递参数(其他参数在没有传的时候这里也不传，但是--port必须传)

### dev:web

描述：用于启动web服务
参数：
--host 提供服务的主机 IP 地址，对于本地开发，请使用 127.0.0.1。要启用公共访问，例如在局域网中，请使用 0.0.0.0 (Default: 127.0.0.1)
--port 提供服务的主机端口号 (Default: ENV)

项目前端目录为项目目录+ 项目目录下的.fba.json中的frontend_name
执行：然后cwd切换到项目前端目录

### dev:celery

描述：用于启动celery服务
参数：
worker 从当前主机启动 Celery worker 服务
beat 从当前主机启动 Celery beat 服务  
 flower 从当前主机启动 Celery flower 服务

项目后端目录为项目目录+ 项目目录下的.fba.json中的backend_name
执行：然后切换cwd到项目后端目录，调用uv run fba celery [subcommand]

### plugin

插件管理
支持插件市场

#### 插件市场

读取：https://raw.githubusercontent.com/fastapi-practices/plugins/refs/heads/master/plugins-data.ts

````ts
export const validTags = [
  "ai",
  "mcp",
  "agent",
  "auth",
  "storage",
  "notification",
  "task",
  "payment",
  "other"
] as const

export const validDatabases = [
  "mysql",
  "postgresql"
] as const

// 插件类型：web 前端插件 / server 后端插件
export const validTypes = [
  "web",
  "server"
] as const

export type ValidTag = typeof validTags[number]
export type ValidDatabase = typeof validDatabases[number]
export type ValidType = typeof validTypes[number]

export interface PluginTomlPlugin {
  icon: string
  summary: string
  version: string
  description: string
  author: string
  type: ValidType
  tags?: ValidTag[]
  database?: ValidDatabase[]
}

export interface GitModule {
  path: string
  url: string
  branch: string
}

export interface PluginData {
  plugin: PluginTomlPlugin
  git: GitModule
}

export const pluginDataList: PluginData[] = [
  {
    "plugin": {
      "icon": "https://wu-clan.github.io/picx-images-hosting/logo/fba.svg",
      "summary": "AI 工具",
      "version": "0.0.1",
      "description": "为系统提供 AI 赋能",
      "author": "wu-clan",
      "type": "web",
      "tags": ["ai", "mcp"],
      "database": ["mysql", "postgresql"]
    },
    "git": {
      "path": "plugins/ai",
      "url": "https://github.com/fastapi-practices/ai.git",
      "branch": "master"
    }
  },
  {
    "plugin": {
      "icon": "https://wu-clan.github.io/picx-images-hosting/logo/fba.svg",
      "summary": "API Key",
      "version": "0.0.1",
      "description": "用户自定义 API Key 管理，支持生成、管理和使用 API Key 进行接口认证",
      "author": "wu-clan",
      "type": "web",
      "tags": ["auth"],
      "database": ["mysql", "postgresql"]
    },
    "git": {
      "path": "plugins/api_key",
      "url": "https://github.com/fastapi-practices/api_key.git",
      "branch": "master"
    }
  },
  {
    "plugin": {
      "icon": "https://wu-clan.github.io/picx-images-hosting/logo/fba.svg",
      "summary": "API Key UI",
      "version": "0.0.1",
      "description": "API Key 前端管理插件，提供列表、搜索、新增、编辑、启停与复制能力",
      "author": "yzbf-lin",
      "type": "web",
      "tags": ["auth"]
    },
    "git": {
      "path": "plugins/api_key_ui",
      "url": "https://github.com/yzbf-lin/api_key_ui.git",
      "branch": "master"
    }
  },
  {
    "plugin": {
      "icon": "https://wu-clan.github.io/picx-images-hosting/logo/fba.svg",
      "summary": "Casbin RBAC",
      "version": "0.0.1",
      "description": "基于 Casbin 实现的 RBAC 访问控制",
      "author": "wu-clan",
      "type": "web",
      "tags": ["auth"],
      "database": ["mysql", "postgresql"]
    },
    "git": {
      "path": "plugins/casbin_rbac",
      "url": "https://github.com/fastapi-practices/casbin_rbac.git",
      "branch": "master"
    }
  },
  {
    "plugin": {
      "icon": "https://wu-clan.github.io/picx-images-hosting/logo/fba.svg",
      "summary": "Casdoor SSO",
      "version": "0.0.3",
      "description": "通过 Casdoor 实现 SSO 单点登录集成",
      "author": "wu-clan",
      "type": "web",
      "tags": ["auth"],
      "database": ["mysql", "postgresql"]
    },
    "git": {
      "path": "plugins/casdoor_sso",
      "url": "https://github.com/fastapi-practices/casdoor_sso.git",
      "branch": "master"
    }
  },
  {
    "plugin": {
      "icon": "https://wu-clan.github.io/picx-images-hosting/logo/fba.svg",
      "summary": "LDAP",
      "version": "0.0.1",
      "description": "通过 LDAP 的方式登录系统",
      "author": "DAVID",
      "type": "web"
    },
    "git": {
      "path": "plugins/ldap_auth",
      "url": "https://github.com/dividduang/ldap_auth.git",
      "branch": "master"
    }
  },
  {
    "plugin": {
      "icon": "https://wu-clan.github.io/picx-images-hosting/logo/fba.svg",
      "summary": "MCP",
      "version": "0.0.3",
      "description": "MCP 服务器管理",
      "author": "wu-clan",
      "type": "web",
      "tags": ["ai", "mcp"],
      "database": ["mysql", "postgresql"]
    },
    "git": {
      "path": "plugins/mcp",
      "url": "https://github.com/fastapi-practices/mcp.git",
      "branch": "master"
    }
  },
  {
    "plugin": {
      "icon": "https://wu-clan.github.io/picx-images-hosting/logo/fba.svg",
      "summary": "OSS",
      "version": "0.0.5",
      "description": "阿里云 OSS 文件上传",
      "author": "wu-clan",
      "type": "web",
      "tags": ["storage"],
      "database": ["mysql", "postgresql"]
    },
    "git": {
      "path": "plugins/oss",
      "url": "https://github.com/fastapi-practices/oss.git",
      "branch": "master"
    }
  },
  {
    "plugin": {
      "icon": "https://wu-clan.github.io/picx-images-hosting/logo/fba.svg",
      "summary": "S3",
      "version": "0.0.1",
      "description": "提供兼容 S3 协议的对象存储能力",
      "author": "wu-clan",
      "type": "web",
      "tags": ["storage"],
      "database": ["mysql", "postgresql"]
    },
    "git": {
      "path": "plugins/s3",
      "url": "https://github.com/fastapi-practices/s3.git",
      "branch": "master"
    }
  },
  {
    "plugin": {
      "icon": "https://wu-clan.github.io/picx-images-hosting/logo/fba.svg",
      "summary": "腾讯云短信服务",
      "version": "0.0.2",
      "description": "使用腾讯云短信服务发送短信验证码",
      "author": "ranyong",
      "type": "web"
    },
    "git": {
      "path": "plugins/sms",
      "url": "https://github.com/RanY-Luck/sms.git",
      "branch": "master"
    }
  },
  {
    "plugin": {
      "icon": "https://wu-clan.github.io/picx-images-hosting/logo/fba.svg",
      "summary": "Task",
      "version": "0.0.1",
      "description": "基于 taskiq 的异步任务队列插件",
      "author": "wu-clan",
      "type": "web",
      "tags": ["task"],
      "database": ["mysql", "postgresql"]
    },
    "git": {
      "path": "plugins/task",
      "url": "https://github.com/fastapi-practices/task.git",
      "branch": "master"
    }
  },
  {
    "plugin": {
      "icon": "https://wu-clan.github.io/picx-images-hosting/logo/fba.svg",
      "summary": "多租户",
      "version": "0.0.1",
      "description": "为系统提供多租户能力，包括租户管理、套餐管理、行级数据隔离",
      "author": "wu-clan",
      "type": "web",
      "tags": ["other"],
      "database": ["mysql", "postgresql"]
    },
    "git": {
      "path": "plugins/tenant",
      "url": "https://github.com/fastapi-practices/tenant.git",
      "branch": "master"
    }
  }
]
```

解析上面的结构，列出插件市场，并支持搜索，过滤

#### plugin add
介绍：添加插件，前后端插件使用不同的逻辑
- 不加参数
  进入则先进入插件市场，选择安装的插件
- 参数
  -b/f 前端插件还是后端插件，必填
  重新格式化命令行选项，移除方括号并调整间距。重新格式化命令行选项，移除方括号并调整间距。-b/f 前端插件还是后端插件，必填
  --path PATH          ZIP 插件的本地完整路径
  --repo-url REPO_URL  Git 插件的仓库地址
  --no-sql             禁用插件 SQL 脚本自动执行 (Default: False) 后端专用
  --db-type DB_TYPE    执行插件 SQL 脚本的数据库类型 Valid options: mysql, postgresql. (Default: postgresql) 后端插件专用
  --pk-type PK_TYPE    执行插件 SQL 脚本数据库主键类型 Valid options: autoincrement, snowflake. (Default: autoincrement) 后端专用
- 插件安装逻辑
  - 前端插件
    前端插件目录在，项目目录/前端名称/apps/web-antdv-next/src/plugins
    前端插件安装逻辑则为，如果是仓库的话(插件市场都是仓库)，就直接拉取到plugins
    如果是zip，则解压到对应位置
    如果安装的插件中有前端插件，则询问用户是否执行pnpm i 安装依赖(因为使用的pnpm-workspace，所以只要在项目目录/前端名称的目录执行即可)
  - 后端插件
    从插件市场获取的，需要自行提取参数。
    然后，cwd切换到项目目录/后端目录。执行 uv fba add ...参数。参数同前面提到的参数，如果有直接透传
  - 直接命令安装，则每次安装一个，按照参数填写即可，通过-b / -f决定安装类型和逻辑
  - 插件市场安装，可以安装多个，前后端逻辑从插件信息中提取(type)

#### plugin remove
描述：移除插件
须实现自动获取插件列表，注意：插件包含plugin.toml(前后端)
选择需要移除的插件(前后端)
然后移除(直接删除，需要确认)
如果移除了前端插件，需要询问用户是否通过pnpm i来移除依赖
后端插件通过在项目后端目录执行: uv run fba remove来实现

#### plugin create
描述：创建插件(当前项目)
- 1: 选择插件类型(web/server/all，all代码前后端都创建(因为有些插件是前后端相互依赖的))
- 2: 如果选择server/all的话，则需要询问server插件类型：应用级插件和扩展级插件
- 3: 输入名称
- 4: 输入插件信息，信息使用toml配置，如下：
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
````

- 5: 创建插件，前后端插件(从模板仓库拉取到指定插件目录，前端插件目录同上，后端只有拓展类插件无须拉取(手动创建)，后端插件目录：项目目录/后端名/backend/plugin/)
- 6: 将插件信息写入到插件目录中的plugin.toml
- 7: 删除插件目录中的.git文件夹，在初始化git默认master分支
- 插件创建成功，输出提示

#### list

列出安装的前后端插件，自行到插件目录进行解析

### list

列出项目，~/.fba.json 中记录的项目列表

### current

输出当前设置的默认项目

### use

设置默认项目
弹出项目选择器用于选择

### edit

编辑~/.fba.json

### go

直接进入到current 项目目录

### fastapi-best-architecture 参考信息

- 前端repo：https://github.com/fastapi-practices/fastapi-best-architecture-ui.git
- 后端repo：https://github.com/fastapi-practices/fastapi-best-architecture.git
- 插件开发文档：https://fastapi-practices.github.io/fastapi_best_architecture_docs/plugin/dev.html
- 文档：https://fastapi-practices.github.io/fastapi_best_architecture_docs/
- 插件模板
  - server: ./templates/server
    因为server有两种，主要是应用级插件和扩展级插件，两者的配置不太一样，所有server模板下有两个plugin.toml
    - plugin.app.toml：应用级插件
    - plugin.ext.toml：扩展级插件
  - web: ./templates/web

### uv run fba 命令：

uv run fba --help

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
    codegen                    代码生成（体验完整功能，请自行部署 fba vben 前端工程）
    alembic                    数据库迁移管理

  Help
    [-h, --help]               Show this message and exit.
    [-v, --version]            Show the version and exit.
    [--completion COMPLETION]  Use --completion generate to print shell-specific completion source. Valid options: generate, complete.
```

```shell
Usage: fba-cli run [--host HOST] [--port PORT] [--no-reload] [--workers WORKERS] [-h]

  运行 API 服务

  Options
    [--host HOST]        提供服务的主机 IP 地址，对于本地开发，请使用 127.0.0.1。要启用公共访问，例如在局域网中，请使用 0.0.0.0 (Default: 127.0.0.1)
    [--port PORT]        提供服务的主机端口号 (Default: 8000)
    [--no-reload]        禁用在（代码）文件更改时自动重新加载服务器 (Default: False)
    [--workers WORKERS]  使用多个工作进程，必须与 --no-reload 同时使用 (Default: 1)

  Help
```

```shell
Usage: fba-cli add [--path PATH] [--repo-url REPO_URL] [--no-sql] [--db-type DB_TYPE] [--pk-type PK_TYPE] [-h]

  新增插件

  Options
    [--path PATH]          ZIP 插件的本地完整路径
    [--repo-url REPO_URL]  Git 插件的仓库地址
    [--no-sql]             禁用插件 SQL 脚本自动执行 (Default: False)
    [--db-type DB_TYPE]    执行插件 SQL 脚本的数据库类型 Valid options: mysql, postgresql. (Default: postgresql)
    [--pk-type PK_TYPE]    执行插件 SQL 脚本数据库主键类型 Valid options: autoincrement, snowflake. (Default: autoincrement)

  Help
    [-h, --help]           Show this message and exit.
```

```shell
Usage: fba-cli remove [--no-sql] [PLUGIN] [-h]

  移除插件

  Options
    [--no-sql]    禁用插件销毁 SQL 脚本自动执行 (Default: False)

  Arguments
    [PLUGIN]      要移除的插件名称

  Help
    [-h, --help]  Show this message and exit.
```

```
Usage: fba-cli celery {worker,beat,flower} [-h]

  运行 Celery 服务

  Subcommands
    worker        从当前主机启动 Celery worker 服务
    beat          从当前主机启动 Celery beat 服务
    flower        从当前主机启动 Celery flower 服务

  Help
    [-h, --help]  Show this message and exit.
```

### 技术栈

- bunjs(兼容nodejs)
- typescript
- 支持发布到npm

### 呈现方式

cli 命令行+部分tui
