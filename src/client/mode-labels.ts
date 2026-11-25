/**
 * Bilingual names for the ACP mode control and the plan-approval hint.
 *
 * The agent owns its mode vocabulary (`session/new` publishes id + name), and
 * that name stays the fallback: this module only ADDS a Chinese reading for the
 * ids shipped agents actually use. Nothing here invents modes — a mode this
 * table has never seen is shown under the agent's own name in both languages,
 * which is the only honest label for a value the plugin does not understand.
 *
 * The plan-approval lines are the reason this exists: the exit-plan ask is a
 * mode decision disguised as a permission question, and the user asked for that
 * to be legible in Chinese AND English on the card and on the chip.
 */

/** Chinese reading per agent mode id (lowercased for the match). */
const MODE_ZH: Record<string, string> = {
  default: '默认（每次询问）',
  'always ask': '默认（每次询问）',
  acceptedits: '接受编辑',
  'accept edits': '接受编辑',
  plan: '计划',
  auto: '自动',
  dontask: '不再询问',
  "don't ask": '不再询问',
  bypasspermissions: '绕过权限',
  fullaccess: '完全权限',
  'read-only': '只读',
  'workspace-write': '工作区可写',
  agent: '代理',
  'agent-full-access': '代理完全权限',
}

/** The Chinese name for an agent mode id, when this table knows one. */
export function modeLabelZh(modeId: string): string | undefined {
  if (typeof modeId !== 'string' || modeId === '') return undefined
  return MODE_ZH[modeId.trim().toLowerCase()]
}

/**
 * The one label the mode control shows: Chinese when the UI prefers it AND the
 * id is known, otherwise the agent's own published name (never the bare id if
 * the agent gave a name), otherwise the id.
 */
export function bilingualModeName(modeId: string, agentName: string | undefined, preferZh: boolean): string {
  const own = agentName !== undefined && agentName.trim() !== '' ? agentName : modeId
  if (!preferZh) return own
  return modeLabelZh(modeId) ?? own
}

/**
 * The chip suffix while an `ExitPlanMode` ask is parked: the session is still in
 * plan mode, but the agent asked to leave and is waiting for the user. Saying
 * only "计划" hides that decision; saying "已切换" would be a lie.
 */
export function planApprovalPendingLabel(preferZh: boolean): string {
  return preferZh ? '待批准退出' : 'exit pending'
}

/**
 * One line under a plan-exit card: what approving actually does (it changes the
 * mode back) and what the deadline will do if nobody answers. The mode half is
 * the part users reported missing — an exit-plan ask looked like any other tool
 * permission, so approving it silently moved the mode chip.
 */
export function planApprovalHint(preferZh: boolean): string {
  if (preferZh) return '批准后离开计划模式，回到进入计划前的模式；超时按当前时限自动处理。'
  return 'Approving leaves plan mode and restores the mode you were in before it; an unanswered ask is settled by the current deadline.'
}
