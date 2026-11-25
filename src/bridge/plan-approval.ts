/**
 * Plan-mode bookkeeping shared by the bridge's `set_mode` and its permission
 * hook.
 *
 * ACP agents own plan mode end to end: the user picks `plan`, the agent asks
 * `ExitPlanMode` when it is ready to leave, and approving that ask restores the
 * mode the AGENT saved when plan was entered. Two gaps make this more than a
 * passthrough:
 *
 *  1. Several shipped agents (codebuddy observed) never publish a
 *     `current_mode_update` after the restore, so a plugin that only mirrors
 *     agent frames keeps showing "plan" after the approval. The bridge must
 *     synthesize the frame from the mode it recorded before plan was entered.
 *  2. A mode PICK made while that ask is parked has to answer the ask (the
 *     agent is blocked on it) and still win over the agent's own restore — the
 *     user's pick is the single source of truth.
 *
 * Kept out of `agent-bridge.ts` because that file is locked to a line budget:
 * every rewrite here is pure state/decision logic on a `LiveSession`, with the
 * bridge passing its broadcast/persist seams as callbacks.
 */
import type { AcpEvent, PermissionOutcome } from '../protocol.ts'
import { PLAN_MODE_ID, isPlanExitToolName } from '../protocol.ts'
import type { PermissionLedger } from '../impl.ts'
import type { LiveSession } from './live-session.ts'
import type { SessionUpdate } from '@agentclientprotocol/sdk'
import { permissionToolName } from './turn-stream.ts'

/** The bridge seams one plan transition needs. */
export interface PlanApprovalSeams {
  /** Send the raw `session/set_mode` request. */
  requestMode(): Promise<void>
  /** Broadcast one host event. */
  broadcast(event: AcpEvent): void
  /** Re-broadcast this session's snapshot (`session/meta`). */
  publishMeta(): void
}

/** The option shape the ledger view and the ACP request share. */
export interface PlanApprovalOption {
  optionId: string
  name?: string
  kind: string
}

/**
 * Change one session's mode, with the plan bookkeeping the raw request lacks.
 *
 * A pick made while `ExitPlanMode` is parked answers that ask first (approving
 * it once) — the agent is blocked on it and may not process a mode request
 * until it is answered — and the pick suppresses the approval's restore so the
 * user's choice is what the session ends on.
 */
export async function applySessionMode(session: LiveSession, modeId: string, seams: PlanApprovalSeams, permissions: PermissionLedger): Promise<void> {
  // Captured BEFORE the request: agents may echo `current_mode_update` as part
  // of handling `set_mode`, so by the time it resolves the mirror can already
  // name the NEW mode. The pre-plan mode is the one in force when plan started.
  const previousModeId = session.modes?.currentModeId
  if (modeId !== PLAN_MODE_ID && previousModeId === PLAN_MODE_ID) {
    settleParkedPlanAsk(permissions, session)
  }
  await seams.requestMode()
  if (modeId === PLAN_MODE_ID) {
    if (previousModeId !== undefined && previousModeId !== '' && previousModeId !== PLAN_MODE_ID) {
      session.prePlanMode = previousModeId
    }
  } else {
    delete session.prePlanMode
  }
  // Well-behaved agents push `current_mode_update`, but the spec does not
  // require it — apply locally so the browser selector never goes stale.
  if (session.modes !== undefined) session.modes = { ...session.modes, currentModeId: modeId }
  seams.publishMeta()
}

/**
 * Answer the parked `ExitPlanMode` ask (approve once) so a user's mode pick can
 * take effect. No-op when no such ask is pending.
 */
function settleParkedPlanAsk(permissions: PermissionLedger, session: LiveSession): void {
  const ask = permissions.pendingViews().find(view =>
    view.sessionId === session.sessionId && isPlanExitToolName(view.toolName))
  if (ask === undefined) return
  const option = ask.options.find(entry => entry.kind === 'allow_once')
    ?? ask.options.find(entry => entry.kind === 'allow_always')
  session.suppressPlanRestore = true
  try {
    permissions.respond(ask.requestId, option === undefined
      ? { outcome: 'cancelled' }
      : { outcome: 'selected', optionId: option.optionId })
  } finally {
    delete session.suppressPlanRestore
  }
}

/**
 * Mirror an APPROVED `ExitPlanMode` ask back to the browser.
 *
 * Only an allow answer leaves plan mode; a rejection keeps the agent in plan and
 * the mode shown is already right. The restored mode is the one recorded when
 * plan was entered, falling back to the agent's own `default` and then to a
 * mode it actually publishes — never a mode the agent does not offer.
 */
export function settleApprovedPlanAsk(
  session: LiveSession,
  toolCall: unknown,
  options: ReadonlyArray<PlanApprovalOption>,
  outcome: PermissionOutcome,
  broadcast: (event: AcpEvent) => void,
  publishMeta: () => void,
  onSettled?: (modeId: string) => void,
): void {
  // Classified from the agent's own title / `_meta.toolName`: this ask is a
  // MODE decision, not an ordinary grant.
  if (!isPlanExitToolName(permissionToolName(toolCall))) return
  if (outcome.outcome !== 'selected' || session.suppressPlanRestore === true) return
  const picked = options.find(option => option.optionId === outcome.optionId)
  if (picked !== undefined && !picked.kind.startsWith('allow')) return
  const available = session.modes?.availableModes ?? []
  const restored = [session.prePlanMode, 'default', available[0]?.id]
    .find(candidate => candidate !== undefined && candidate !== '' && candidate !== PLAN_MODE_ID
      && (available.length === 0 || available.some(mode => mode.id === candidate)))
  if (restored === undefined) return
  delete session.prePlanMode
  announceMode(session, restored, broadcast, publishMeta)
  onSettled?.(restored)
}

/**
 * Broadcast and record one mode the plugin established itself: the same frame
 * shape an agent's own `current_mode_update` would have, appended to the
 * transcript so a reconnecting client replays it, plus the session snapshot
 * that the composer's mode row and the persisted chat choice follow.
 */
export function announceMode(session: LiveSession, modeId: string, broadcast: (event: AcpEvent) => void, publishMeta: () => void): void {
  if (session.modes !== undefined) session.modes = { ...session.modes, currentModeId: modeId }
  const update = { sessionUpdate: 'current_mode_update', currentModeId: modeId } as SessionUpdate
  const seq = session.transcript.append(update)
  broadcast({ type: 'session/update', sessionId: session.sessionId, seq, update })
  publishMeta()
}
