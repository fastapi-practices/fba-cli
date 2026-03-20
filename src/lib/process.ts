// process.ts — 子进程执行封装
import { execa, type Options as ExecaOptions } from 'execa'
import * as clack from '@clack/prompts'
import chalk from 'chalk'

export interface RunOptions {
  cwd?: string
  label?: string
  spinner?: boolean
  env?: Record<string, string>
  stdio?: 'pipe' | 'inherit'
  /** 命令失败时是否自动输出错误信息 (默认 true) */
  showErrorOutput?: boolean
}

/**
 * 截取错误输出的最后几行，避免输出过长
 */
function getErrorTail(output: string, maxLines = 8): string {
  const lines = output.trim().split('\n')
  if (lines.length <= maxLines) return output.trim()
  return '  ...\n' + lines.slice(-maxLines).join('\n')
}

/**
 * 执行命令，可选 spinner 包裹
 * 失败时自动输出错误详情（stderr/stdout 尾部）
 */
export async function run(
  cmd: string,
  args: string[] = [],
  opts: RunOptions = {},
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const s = opts.spinner ? clack.spinner() : null
  const label = opts.label ?? `${cmd} ${args.join(' ')}`.trim()
  s?.start(label)

  try {
    const result = await execa(cmd, args, {
      cwd: opts.cwd,
      stdio: opts.spinner ? 'pipe' : (opts.stdio ?? 'inherit'),
      env: opts.env,
      reject: false,
    })

    if (result.exitCode !== 0) {
      s?.stop(chalk.red(`${label} ✗`))

      // 输出错误详情
      if (opts.showErrorOutput !== false) {
        const errOutput = (result.stderr ?? '').trim() || (result.stdout ?? '').trim()
        if (errOutput) {
          console.error(chalk.dim(`  Command: ${cmd} ${args.join(' ')}`))
          if (opts.cwd) console.error(chalk.dim(`  CWD: ${opts.cwd}`))
          console.error(chalk.dim(`  Exit code: ${result.exitCode}`))
          console.error(chalk.red(getErrorTail(errOutput)))
        }
      }

      return {
        stdout: result.stdout ?? '',
        stderr: result.stderr ?? '',
        exitCode: result.exitCode ?? 1,
      }
    }

    s?.stop(chalk.green(`${label} ✓`))
    return {
      stdout: result.stdout ?? '',
      stderr: result.stderr ?? '',
      exitCode: 0,
    }
  } catch (error: any) {
    s?.stop(chalk.red(`${label} ✗`))

    if (opts.showErrorOutput !== false) {
      console.error(chalk.dim(`  Command: ${cmd} ${args.join(' ')}`))
      console.error(chalk.red(`  ${error.message ?? String(error)}`))
    }

    return {
      stdout: '',
      stderr: error.message ?? String(error),
      exitCode: 1,
    }
  }
}

/**
 * 检查命令是否存在并获取版本
 */
export async function checkCommand(cmd: string, versionArgs: string[] = ['--version']): Promise<{ found: boolean; version?: string }> {
  try {
    const result = await execa(cmd, versionArgs, { stdio: 'pipe', reject: false })
    if (result.exitCode === 0) {
      const version = (result.stdout ?? '').trim().split('\n')[0]
      return { found: true, version }
    }
    return { found: false }
  } catch {
    return { found: false }
  }
}

/**
 * 在指定目录执行命令并透传 stdio
 *
 * Windows 兼容：在 spawn 前将 stdin 从 raw mode 恢复为正常模式，
 * 否则子进程读取 stdin 时会与 Node（clack）争抢 console handle 导致卡死。
 */
export async function runInherited(
  cmd: string,
  args: string[] = [],
  cwd?: string,
): Promise<number> {
  // 保存 stdin 的 raw mode 状态，并恢复为正常模式
  const wasRaw = process.stdin.isRaw
  if (wasRaw && process.stdin.isTTY) {
    process.stdin.setRawMode(false)
  }

  try {
    const result = await execa(cmd, args, { cwd, stdio: 'inherit', reject: false })
    return result.exitCode ?? 1
  } catch {
    return 1
  } finally {
    // 恢复 stdin raw mode 状态
    if (wasRaw && process.stdin.isTTY) {
      process.stdin.setRawMode(true)
    }
  }
}
