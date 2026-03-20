// edit.ts — 编辑全局配置
import { getGlobalConfigPath } from '../lib/config.js'
import { runInherited } from '../lib/process.js'
import { getDefaultEditor } from '../lib/platform.js'
import { t } from '../lib/i18n.js'

export async function editAction() {
  const editor = getDefaultEditor()
  const configPath = getGlobalConfigPath()
  console.log(`${t('editOpening')} ${configPath} (${editor})...`)
  await runInherited(editor, [configPath])
}
