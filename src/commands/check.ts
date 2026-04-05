// check.ts — 检查项目仓库落后远程多少 git 提交
import chalk from 'chalk'
import { existsSync } from 'fs'
import { resolveProjectDir, getBackendDir, getFrontendDir } from '../lib/config.js'
import { run } from '../lib/process.js'
import { t } from '../lib/i18n.js'

interface CheckOptions {
  project?: string
}

async function getRepoBehindCount(repoDir: string): Promise<{ behind: number; branch: string } | null> {
  if (!existsSync(repoDir)) return null

  // fetch latest from remote
  const fetchResult = await run('git', ['fetch'], { cwd: repoDir, spinner: true, label: `${t('checkFetching')} ${repoDir}`, showErrorOutput: false })
  if (fetchResult.exitCode !== 0) return null

  // get current branch name
  const branchResult = await run('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: repoDir, stdio: 'pipe', showErrorOutput: false })
  if (branchResult.exitCode !== 0) return null
  const branch = branchResult.stdout.trim()

  // check if upstream tracking branch exists
  const upstreamResult = await run('git', ['rev-parse', '--abbrev-ref', `${branch}@{upstream}`], { cwd: repoDir, stdio: 'pipe', showErrorOutput: false })
  if (upstreamResult.exitCode !== 0) return null

  // count commits behind
  const countResult = await run('git', ['rev-list', '--count', `HEAD..${branch}@{upstream}`], { cwd: repoDir, stdio: 'pipe', showErrorOutput: false })
  if (countResult.exitCode !== 0) return null

  return { behind: parseInt(countResult.stdout.trim(), 10), branch }
}

export async function checkAction(options: CheckOptions = {}) {
  const projectDir = resolveProjectDir(options.project)
  if (!projectDir || !existsSync(projectDir)) {
    console.log(chalk.red(t('projectDirNotExist')))
    console.log(chalk.dim(t('hintRunCreate')))
    return
  }

  const backendDir = getBackendDir(projectDir)
  const frontendDir = getFrontendDir(projectDir)

  console.log(chalk.bold(t('checkTitle')))
  console.log()

  const dirs = [
    { label: t('labelBackend'), dir: backendDir },
    { label: t('labelFrontend'), dir: frontendDir },
  ]

  for (const { label, dir } of dirs) {
    if (!existsSync(dir)) {
      console.log(`  ${label}: ${chalk.dim(t('checkDirNotFound'))}`)
      continue
    }

    const result = await getRepoBehindCount(dir)
    if (result === null) {
      console.log(`  ${label}: ${chalk.yellow(t('checkFetchFailed'))}`)
    } else if (result.behind === 0) {
      console.log(`  ${label} ${chalk.dim(`(${result.branch})`)}: ${chalk.green(t('checkUpToDate'))}`)
    } else {
      console.log(`  ${label} ${chalk.dim(`(${result.branch})`)}: ${chalk.yellow(`${t('checkBehind')} ${result.behind} ${t('checkCommits')}`)}`)
    }
  }
}
