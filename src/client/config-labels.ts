/**
 * Bilingual copy for the AGENT-PUBLISHED labels this plugin draws.
 *
 * The advanced base, the thought-level picker and the mode menu all render text
 * the agent itself publishes (`configOptions` names, `mode`/`thought_level`
 * names and descriptions, select-choice names). Those arrive in English from
 * codebuddy, so a Chinese UI showed a Chinese shell around English rows. The old
 * hot-patched bundle translated them inline; this module is the canonical place
 * for that mapping, shared by every picker.
 *
 * The agent's own wording is never replaced for LABELS: the Chinese reading is
 * appended (`沙箱（Sandbox）`), the same contract as the permission card. A label
 * the table has never seen stays exactly as the agent sent it — the plugin does
 * not invent translations. DESCRIPTIONS are the exception: they are long prose,
 * so the Chinese sentence replaces the English one when known (the English one
 * would otherwise wrap the row into a paragraph), and unknown text stays as-is.
 *
 * Pure constants and pure functions only (browser half, no Node APIs).
 */
import { hasCjk } from './permission-labels.ts'

/** Chinese reading per agent-published label (matched case-insensitively). */
const LABEL_ZH: Readonly<Record<string, string>> = {
  // ---- Composer mode names (codebuddy / codex) ----
  'always ask': '总是询问',
  'accept edits': '接受编辑',
  plan: '计划',
  auto: '自动',
  "don't ask": '不再询问',
  'bypass permissions': '跳过权限',
  'full access': '完全访问',
  'read-only': '只读',
  'workspace access': '工作区访问',
  'auto review': '自动审查',
  default: '默认',
  // ---- Extra config option names ----
  'permission mode': '权限模式',
  'collaboration mode': '协作模式',
  sandbox: '沙箱',
  'sandbox environment': '沙箱环境',
  'local environment': '本地环境',
  multitask: '多任务',
  'deep thinking': '深度思考',
  // ---- Select choice values / thought levels ----
  low: '低',
  medium: '中',
  high: '高',
  xhigh: '极高',
  'x-high': '极高',
  max: '最大',
  ultra: '极限',
  'on (default)': '默认开启',
  enabled: '默认开启',
  // ---- Permission option names (the dock's table stays authoritative; these
  // cover the same names when they arrive through a config menu instead) ----
  'always allow': '始终允许',
  'allow once': '本次允许',
  allow: '本次允许',
  'reject once': '拒绝本次',
  reject: '拒绝本次',
  'deny always': '始终拒绝',
  deny: '拒绝本次',
  cancel: '取消',
}

/**
 * Chinese reading per agent-published DESCRIPTION.
 *
 * Long prose is translated, not appended: `沙箱（Bash/PowerShell commands …）`
 * would be a three-line row for one radio button.
 */
const DETAIL_ZH: Readonly<Record<string, string>> = {
  // ---- Modes ----
  'Prompts for permission on first use of each tool': '每个工具首次使用时询问权限',
  'Automatically accepts file edit permissions for the session': '本会话自动接受文件编辑权限',
  'Claude can analyze but not modify files or execute commands': '可分析，但不修改文件、不执行命令',
  'Agent can analyze but not modify files or execute commands': '可分析，但不修改文件、不执行命令',
  'An AI reviewer checks each action that would otherwise ask for approval and approves or denies it. A failed review blocks only that action; it never falls back to a prompt or leaves auto mode.': 'AI 审查每个本应询问的操作并自动批准/拒绝；审查失败只拦截该操作',
  'Never shows permission prompts; runs pre-approved and safe actions, denies anything that would require approval': '不显示权限询问；只运行已预批准/安全的操作，其余拒绝',
  'Does not show permission prompts; pre-approved and safe read-only actions run, everything else that would prompt is denied': '不显示权限询问；只运行已预批准/安全的只读操作，其余拒绝',
  'Skips all permission prompts': '跳过所有权限询问',
  'Skips ALL permission checks including dangerous commands for all agents': '跳过所有权限检查（包括危险命令）',
  'Requires approval to edit files and access the internet.': '编辑文件和联网需要审批',
  'Edit workspace files; ask before writing outside the workspace or accessing the network.': '可编辑工作区文件；工作区外写入或联网前询问',
  'Only ask for actions detected as potentially unsafe': '只对检测为可能不安全的操作询问',
  'Unrestricted access to the internet and any file on your computer': '可访问互联网和本机任意文件（无限制）',
  'Plan before making changes': '改动前先做计划',
  // ---- Sandbox / environment options ----
  'Bash/PowerShell commands run inside the sandbox and require escalation to touch the host': '命令在沙箱内运行，访问宿主机需要提权',
  'Commands run with full user permissions (no sandbox isolation)': '命令以完整用户权限运行（无沙箱隔离）',
  // ---- Thought levels ----
  'Deep reasoning': '深度推理',
  'Use the model default effort': '使用模型默认思考等级',
  'Fast responses with lighter reasoning': '快速响应，较轻推理',
  'Balances speed and reasoning depth for everyday tasks': '平衡速度与推理深度',
  'Greater reasoning depth for complex problems': '为复杂问题提供更深推理',
  'Extra high reasoning depth for complex problems': '为复杂问题提供极高推理深度',
  'Maximum reasoning depth for the hardest problems': '为最难问题提供最大推理深度',
  'Maximum reasoning with automatic task delegation': '最大推理并自动委派任务',
}

function lookup(table: Readonly<Record<string, string>>, key: string): string | undefined {
  if (typeof key !== 'string' || key.trim() === '') return undefined
  const exact = table[key]
  if (exact !== undefined) return exact
  return table[key.trim().toLowerCase()]
}

/**
 * The bilingual form of one agent-published label: the Chinese reading with the
 * agent's own wording in parentheses, or the original when the table has no
 * entry (or the agent already localized it).
 */
export function bilingualLabel(name: string, preferZh = true): string {
  if (typeof name !== 'string' || name === '') return name
  if (hasCjk(name)) return name
  const zh = lookup(LABEL_ZH, name)
  if (zh === undefined) return name
  return preferZh ? `${zh}（${name}）` : `${name}（${zh}）`
}

/**
 * The Chinese sentence for one agent-published description, or the original.
 *
 * Descriptions REPLACE rather than append (see the module header): a menu row
 * has one line for the detail, and the long English sentence is exactly what
 * made the mode menu unreadable.
 */
export function bilingualDetail(text: string | undefined): string | undefined {
  if (typeof text !== 'string' || text === '') return text
  if (hasCjk(text)) return text
  return lookup(DETAIL_ZH, text) ?? text
}
