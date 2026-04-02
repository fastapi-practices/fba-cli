// dev-all.ts — 多进程输出流复用器：同时启动所有 dev 命令，按键切换输出流
import { execa } from 'execa'
import chalk from 'chalk'
import { t } from './i18n.js'

const MAX_BUFFER_LINES = 5000

class OutputBuffer {
  private lines: string[] = []
  private partial = ''

  append(data: string) {
    const text = this.partial + data
    const parts = text.split('\n')
    this.partial = parts.pop()!
    this.lines.push(...parts)
    if (this.lines.length > MAX_BUFFER_LINES) {
      this.lines = this.lines.slice(-MAX_BUFFER_LINES)
    }
  }

  getRecent(n: number): string {
    const recent = this.lines.slice(-n)
    let result = recent.join('\n')
    if (this.partial) result += '\n' + this.partial
    return result
  }

  clear() {
    this.lines = []
    this.partial = ''
  }
}

export interface DevProcessDef {
  name: string
  cmd: string
  cwd: string
  envs?: Record<string, string>
}

interface ManagedProcess {
  name: string
  def: DevProcessDef
  child: any
  buffer: OutputBuffer
  status: 'running' | 'exited' | 'crashed'
  exitCode?: number
}

export async function runDevMultiplexer(defs: DevProcessDef[]): Promise<void> {
  const processes: ManagedProcess[] = []
  let activeIndex = 0
  let shuttingDown = false
  const isTTY = !!(process.stdout.isTTY && process.stdin.isTTY)

  function spawnOne(def: DevProcessDef): ManagedProcess {
    const child = execa('sh', ['-c', def.cmd], {
      cwd: def.cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: def.envs,
      reject: false,
    })

    return {
      name: def.name,
      def,
      child,
      buffer: new OutputBuffer(),
      status: 'running',
    }
  }

  function attachOutput(proc: ManagedProcess) {
    const onData = (chunk: Buffer) => {
      if (!processes.includes(proc)) return
      const text = chunk.toString()
      proc.buffer.append(text)
      const idx = processes.indexOf(proc)

      if (isTTY) {
        if (idx === activeIndex) process.stdout.write(chunk)
      } else {
        const prefix = chalk.dim(`[${proc.name}] `)
        for (const line of text.split('\n')) {
          if (line) process.stdout.write(prefix + line + '\n')
        }
      }
    }

    proc.child.stdout?.on('data', onData)
    proc.child.stderr?.on('data', onData)

    proc.child.then(
      (result: any) => {
        if (!processes.includes(proc)) return
        proc.exitCode = result.exitCode ?? 0
        proc.status = result.exitCode === 0 ? 'exited' : 'crashed'
        onProcDone(proc)
      },
      (error: any) => {
        if (!processes.includes(proc)) return
        proc.exitCode = 1
        proc.status = 'crashed'
        proc.buffer.append(`\n${chalk.red(error.message ?? String(error))}\n`)
        onProcDone(proc)
      },
    )
  }

  function onProcDone(proc: ManagedProcess) {
    if (isTTY && processes.indexOf(proc) === activeIndex) {
      const label = proc.status === 'crashed'
        ? chalk.red(`\n  ✗ ${proc.name} exited with code ${proc.exitCode}`)
        : chalk.dim(`\n  ○ ${proc.name} ${t('devAllExited')}`)
      process.stdout.write(label + '\n')
    }

    if (!shuttingDown && processes.every(p => p.status !== 'running')) {
      shutdown()
    }
  }

  // ─── Spawn all ───
  for (const def of defs) {
    const proc = spawnOne(def)
    processes.push(proc)
    attachOutput(proc)
  }

  const names = processes.map(p => p.name).join(', ')
  console.log(chalk.cyan(`\n  ${t('devAllStarting')} ${processes.length} ${t('devAllServices')}: ${names}\n`))

  // Non-TTY: prefixed output, wait for all
  if (!isTTY) {
    await Promise.allSettled(processes.map(p => p.child))
    process.exit(0)
  }

  // TTY: status bar + keyboard switching
  printStatusBar()

  process.stdin.setRawMode(true)
  process.stdin.resume()
  process.stdin.setEncoding('utf8')

  process.stdin.on('data', (key: string) => {
    if (shuttingDown) return

    const num = parseInt(key)
    if (num >= 1 && num <= processes.length && num - 1 !== activeIndex) {
      activeIndex = num - 1
      redraw()
      return
    }

    if (key === 'q' || key === '\x03') {
      shutdown()
      return
    }

    if (key === 'r') {
      restartCurrent()
      return
    }
  })

  process.stdout.on('resize', () => {
    if (!shuttingDown) redraw()
  })

  process.on('SIGTERM', () => shutdown())

  function printStatusBar() {
    const indicators = processes.map((p, i) => {
      const dot = p.status === 'running' ? chalk.green('●')
        : p.status === 'exited' ? chalk.dim('○')
        : chalk.red('✗')
      const name = i === activeIndex ? chalk.bold.white(p.name) : chalk.dim(p.name)
      return `${chalk.dim(`[${i + 1}]`)} ${name} ${dot}`
    }).join('  ')

    const hint = chalk.dim(
      `[1-${processes.length}: ${t('devAllSwitch')} | q: ${t('devAllQuit')} | r: ${t('devAllRestart')}]`,
    )
    const cols = process.stdout.columns ?? 80
    const sep = chalk.dim('─'.repeat(cols))

    process.stdout.write(`  ${indicators}\n  ${hint}\n${sep}\n`)
  }

  function redraw() {
    const rows = process.stdout.rows ?? 24
    process.stdout.write('\x1b[2J\x1b[H')
    printStatusBar()
    const available = Math.max(rows - 5, 10)
    const recent = processes[activeIndex]!.buffer.getRecent(available)
    if (recent) {
      process.stdout.write('\x1b[0m' + recent)
      if (!recent.endsWith('\n')) process.stdout.write('\n')
    }
  }

  async function restartCurrent() {
    const old = processes[activeIndex]!
    if (old.status === 'running') {
      old.child.kill('SIGTERM')
    }
    try { await old.child } catch {}

    const newProc = spawnOne(old.def)
    processes[activeIndex] = newProc
    attachOutput(newProc)
    redraw()
  }

  function shutdown() {
    if (shuttingDown) return
    shuttingDown = true

    if (isTTY) {
      process.stdin.setRawMode(false)
      process.stdin.pause()
    }

    for (const p of processes) {
      if (p.status === 'running') {
        p.child.kill('SIGTERM')
      }
    }

    process.stdout.write('\x1b[0m')
    console.log(chalk.dim(`\n  ${t('devAllStopped')}\n`))
    process.exit(0)
  }

  await new Promise<never>(() => {})
}
