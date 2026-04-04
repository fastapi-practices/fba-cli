// add.ts — 添加现有 FBA 项目到管理列表
import * as clack from "@clack/prompts";
import chalk from "chalk";
import { basename, join, resolve } from "path";
import { existsSync, readdirSync, readFileSync, statSync } from "fs";
import { t } from "../lib/i18n.js";
import {
  readGlobalConfig,
  addProject,
  writeProjectConfig,
} from "../lib/config.js";
import type { ProjectConfig } from "../types/config.js";
import type { DatabaseType } from "../lib/infra.js";

// ─── 项目结构探测 ───

interface DetectResult {
  backendName: string | null;
  frontendName: string | null;
  hasInfra: boolean;
  infraServices: string[];
  dbType: DatabaseType | null;
  serverPort: number | null;
  webPort: number | null;
}

function isBackendDir(dir: string): boolean {
  return (
    existsSync(join(dir, "pyproject.toml")) &&
    existsSync(join(dir, "backend")) &&
    statSync(join(dir, "backend")).isDirectory()
  );
}

function isFrontendDir(dir: string): boolean {
  const webAppDir = join(dir, "apps", "web-antdv-next");
  return existsSync(webAppDir) && statSync(webAppDir).isDirectory();
}

function parseBackendEnv(
  backendDir: string,
): { dbType: DatabaseType | null } {
  const envPath = join(backendDir, "backend", ".env");
  if (!existsSync(envPath)) return { dbType: null };

  try {
    const content = readFileSync(envPath, "utf-8");
    const dbTypeMatch = content.match(
      /DATABASE_TYPE\s*=\s*['"]?(\w+)['"]?/,
    );
    const dbType =
      dbTypeMatch?.[1] === "mysql"
        ? "mysql"
        : dbTypeMatch?.[1] === "postgresql"
          ? "postgresql"
          : null;
    return { dbType };
  } catch {
    return { dbType: null };
  }
}

function parseFrontendEnv(
  frontendDir: string,
): { webPort: number | null } {
  const envPath = join(
    frontendDir,
    "apps",
    "web-antdv-next",
    ".env.development",
  );
  if (!existsSync(envPath)) return { webPort: null };

  try {
    const content = readFileSync(envPath, "utf-8");
    const portMatch = content.match(/VITE_PORT\s*=\s*(\d+)/);
    return { webPort: portMatch?.[1] ? parseInt(portMatch[1]) : null };
  } catch {
    return { webPort: null };
  }
}

function parseInfraServices(projectDir: string): string[] {
  const composePath = join(projectDir, "infra", "docker-compose.yml");
  if (!existsSync(composePath)) return [];

  try {
    const content = readFileSync(composePath, "utf-8");
    const services: string[] = [];
    if (content.includes("fba-postgres")) services.push("postgres");
    if (content.includes("fba-mysql")) services.push("mysql");
    if (content.includes("fba-redis")) services.push("redis");
    if (content.includes("fba-rabbitmq")) services.push("rabbitmq");
    return services;
  } catch {
    return [];
  }
}

function detectProject(projectDir: string): DetectResult {
  const result: DetectResult = {
    backendName: null,
    frontendName: null,
    hasInfra: false,
    infraServices: [],
    dbType: null,
    serverPort: null,
    webPort: null,
  };

  // 扫描直接子目录
  let entries: string[];
  try {
    entries = readdirSync(projectDir).filter((name) => {
      const full = join(projectDir, name);
      return !name.startsWith(".") && statSync(full).isDirectory();
    });
  } catch {
    return result;
  }

  for (const entry of entries) {
    const fullPath = join(projectDir, entry);

    if (!result.backendName && isBackendDir(fullPath)) {
      result.backendName = entry;
      const { dbType } = parseBackendEnv(fullPath);
      result.dbType = dbType;
    }

    if (!result.frontendName && isFrontendDir(fullPath)) {
      result.frontendName = entry;
      const { webPort } = parseFrontendEnv(fullPath);
      result.webPort = webPort;
    }
  }

  // fallback: 项目根目录本身就是后端（老项目结构）
  if (!result.backendName && isBackendDir(projectDir)) {
    result.backendName = ".";
    const { dbType } = parseBackendEnv(projectDir);
    result.dbType = dbType;
  }

  // 检测基础设施
  const infraDir = join(projectDir, "infra");
  if (existsSync(infraDir) && statSync(infraDir).isDirectory()) {
    result.hasInfra = true;
    result.infraServices = parseInfraServices(projectDir);
  }

  return result;
}

// ─── 命令入口 ───

export async function addAction() {
  clack.intro(chalk.bgCyan(" fba-cli add "));

  // 1. 输入项目目录
  const projectDirInput = await clack.text({
    message: t("addProjectDir"),
    placeholder: process.cwd(),
    defaultValue: process.cwd(),
    validate: (v) => {
      const dir = v?.trim() ? resolve(v.trim()) : process.cwd();
      if (!existsSync(dir)) return t("projectRootNotExist");
      if (!statSync(dir).isDirectory()) return t("projectRootNotDirectory");
      return undefined;
    },
  });
  if (clack.isCancel(projectDirInput)) {
    clack.outro(chalk.dim("Cancelled"));
    return;
  }

  const projectDir = projectDirInput?.trim()
    ? resolve(String(projectDirInput).trim())
    : process.cwd();

  // 检查是否已注册
  const globalConfig = readGlobalConfig();
  if (globalConfig.projects.some((p) => p.path === projectDir)) {
    clack.log.error(chalk.red(t("addAlreadyRegistered")));
    clack.outro("");
    return;
  }

  // 2. 扫描项目结构
  const spinner = clack.spinner();
  spinner.start(t("addScanning"));
  const detected = detectProject(projectDir);
  spinner.stop(t("addScanning"));

  // 3. 验证结果
  if (!detected.backendName) {
    clack.log.error(chalk.red(t("addNoBackend")));
    clack.outro("");
    return;
  }
  if (!detected.frontendName) {
    clack.log.error(chalk.red(t("addNoFrontend")));
    clack.outro("");
    return;
  }

  // 4. 展示探测结果
  const backendDisplayName =
    detected.backendName === "."
      ? `${basename(projectDir)} ${chalk.dim("(project root)")}`
      : detected.backendName;
  clack.log.step(t("addConfirmDetected"));
  clack.log.info(
    `${chalk.bold(t("addBackendDetected"))}: ${chalk.green(backendDisplayName)}`,
  );
  clack.log.info(
    `${chalk.bold(t("addFrontendDetected"))}: ${chalk.green(detected.frontendName)}`,
  );
  clack.log.info(
    `${chalk.bold(t("addInfraDetected"))}: ${detected.hasInfra ? chalk.green(t("addInfraYes")) : chalk.dim(t("addInfraNo"))}` +
      (detected.infraServices.length > 0
        ? ` (${detected.infraServices.join(", ")})`
        : ""),
  );
  if (detected.dbType) {
    clack.log.info(
      `${chalk.bold(t("addDbTypeDetected"))}: ${chalk.green(detected.dbType)}`,
    );
  }

  const confirmed = await clack.confirm({
    message: t("addConfirmDetected"),
    initialValue: true,
  });
  if (clack.isCancel(confirmed) || !confirmed) {
    clack.outro(chalk.dim("Cancelled"));
    return;
  }

  // 5. 收集需要用户输入的配置
  const userConfig = await clack.group(
    {
      projectName: () =>
        clack.text({
          message: t("addProjectName"),
          placeholder: basename(projectDir),
          defaultValue: basename(projectDir),
          validate: (v) => {
            if (!v?.trim()) return t("projectNameRequired");
            return undefined;
          },
        }),
      dbType: () => {
        if (detected.dbType) return Promise.resolve(detected.dbType);
        return clack.select({
          message: t("dbTypeSelect"),
          options: [
            { value: "postgresql", label: t("infraPostgres") },
            { value: "mysql", label: t("infraMysql") },
          ],
        });
      },
      serverPort: () =>
        clack.text({
          message: t("addServerPort"),
          defaultValue: "8000",
        }),
      webPort: () =>
        clack.text({
          message: t("addWebPort"),
          defaultValue: detected.webPort ? String(detected.webPort) : "5173",
        }),
    },
    {
      onCancel: () => {
        clack.outro(chalk.dim("Cancelled"));
        process.exit(0);
      },
    },
  );

  const projectName = String(userConfig.projectName).trim();
  const dbType = String(userConfig.dbType) as DatabaseType;
  const serverPort = parseInt(String(userConfig.serverPort)) || 8000;
  const webPort = parseInt(String(userConfig.webPort)) || 5173;

  // 6. 写入项目配置
  const projConfig: ProjectConfig = {
    name: projectName,
    backend_name: detected.backendName,
    frontend_name: detected.frontendName,
    server_port: serverPort,
    web_port: webPort,
    infra: detected.hasInfra,
    infra_services: detected.infraServices,
    db_type: dbType,
  };
  writeProjectConfig(projectDir, projConfig);

  // 7. 注册到全局配置
  addProject({
    name: projectName,
    path: projectDir,
    createdAt: new Date().toISOString(),
  });

  // 8. 完成
  clack.log.success(chalk.green.bold(t("addSuccess")));
  clack.note(
    [
      `${chalk.bold(t("addProjectName"))}: ${projectName}`,
      `${chalk.bold(t("addBackendDetected"))}: ${backendDisplayName}`,
      `${chalk.bold(t("addFrontendDetected"))}: ${detected.frontendName}`,
      `${chalk.bold(t("addDbTypeDetected"))}: ${dbType}`,
      `${chalk.bold(t("serverPort"))}: ${serverPort}`,
      `${chalk.bold(t("webPort"))}: ${webPort}`,
    ].join("\n"),
    projectDir,
  );
  clack.outro(chalk.cyan(t("happyCoding")));
}
