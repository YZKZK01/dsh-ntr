/**
 * Pending ACP permission asks for the staged DSH conversation, rendered as
 * composer-width entries above the composer card (`conversation.input.dock`).
 * The slot itself spans the conversation column; the dock mirrors the host's
 * InputBar width formula so the cards line up with the input box.
 *
 * The host broadcasts every ask as `permission/request`, carrying the DSH chat
 * session id when the ask belongs to a conversation. This dock is the primary
 * answer surface: it renders exactly the asks whose `dshSessionId` is the
 * conversation it was mounted for, and nothing otherwise. There is no
 * ACP-mode gate — the frame set itself is the gate, so an ordinary
 * conversation shows this card if and only if it actually has an ask.
 *
 * The ask's description and options are the agent's own: buttons appear in the
 * agent's order with the agent's names (including "Always Allow"), and
 * `kind` is not rendered. A separate cancel button answers with no option,
 * which the host forwards as `cancelled`. No Enter/Escape handlers: the
 * composer owns its keyboard, and these are ordinary focusable buttons.
 *
 * Multiple asks stack in ARRIVAL order, oldest first: the question ignored
 * longest stays at the top. The list is capped in height by CSS and scrolls.
 * Asks without a chat identity never appear here — they stay in the
 * settings-panel ledger, the cross-session mirror.
 */

import { useEffect, useState } from 'react'
import { ensureAcpStyle, useUi } from './acp-ui.tsx'
import { planApprovalHint } from './mode-labels.ts'
import { bilingualLiteral, bilingualPermissionOption } from './permission-labels.ts'
import { isPlanExitToolName } from '../protocol.ts'
import {
  deadlineRemainingLabel,
  PERMISSION_DEADLINE_EXPIRED,
  permissionsForSession,
} from './store.ts'
import type { AcpStore, PendingPermission } from './store.ts'

export interface PermissionDockProps {
  /** Injected face: the store plus the chat session id this dock belongs to. */
  acp: AcpStore
  sessionId: string
}

/** Tick interval for the countdown (seconds are all the label shows). */
const COUNTDOWN_TICK_MS = 1000

export function PermissionDock({ acp, sessionId }: PermissionDockProps) {
  ensureAcpStyle()
  const ui = useUi(acp)
  const dshSessionId = String(sessionId)
  const pending = permissionsForSession(ui.permissions, dshSessionId)
  const counting = pending.some(ask => ask.timeoutMode !== 'wait' && ask.deadlineAt !== undefined)
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!counting) return
    setNow(Date.now())
    const timer = setInterval(() => { setNow(Date.now()) }, COUNTDOWN_TICK_MS)
    return () => { clearInterval(timer) }
  }, [counting])
  if (pending.length === 0) return null
  return (
    <div
      className="ntr-permission-dock"
      role="region"
      aria-label={acp.label('待处理的权限请求', 'Pending permission requests')}
    >
      {pending.map(permission => (
        <PermissionAskCard key={permission.requestId} acp={acp} permission={permission} now={now} />
      ))}
    </div>
  )
}

function PermissionAskCard(props: { acp: AcpStore; permission: PendingPermission; now: number }) {
  const { acp, permission, now } = props
  const preferZh = acp.prefersZh()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()
  const remaining = deadlineRemainingLabel(permission.deadlineAt, now, permission.timeoutMode)
  const expired = remaining === PERMISSION_DEADLINE_EXPIRED
  // An `ExitPlanMode` ask is not an ordinary tool grant: approving it CHANGES
  // the mode (the chip in the left corner moves back to the pre-plan mode), and
  // an unanswered one is resolved by the same deadline as any other ask. The
  // card has to say that in so many words — it was reported as "a permission
  // question that silently switched my mode".
  const planApproval = isPlanExitToolName(permission.toolName)
  const respond = (optionId?: string): void => {
    if (busy) return
    setBusy(true)
    setError(undefined)
    void acp.respondPermission(permission.requestId, optionId)
      // `respondPermission` reports to the store's notice too, but that notice
      // lives on the settings page; this card pins the failure where the user
      // is looking.
      .catch((failure: unknown) => {
        setError(failure instanceof Error ? failure.message : String(failure))
      })
      .finally(() => { setBusy(false) })
  }
  return (
    <div className={`ntr-permission-card${planApproval ? ' is-plan-approval' : ''}`}>
      <div className="ntr-permission-head">
        <span className="ntr-permission-tool" title={permission.toolName}>
          {planApproval
            ? bilingualLiteral('计划 · 待批准退出', 'Plan · awaiting exit approval', preferZh)
            : permission.toolName}
        </span>
        {permission.reason !== undefined && (
          <span className="ntr-permission-reason" title={permission.reason}>{permission.reason}</span>
        )}
        {remaining !== undefined && (
          <span className={`ntr-permission-deadline${expired ? ' is-expired' : ''}`}>
            {expired
              ? bilingualLiteral('已超时', 'expired', preferZh)
              : bilingualLiteral(`剩余 ${remaining}`, `${remaining} left`, preferZh)}
          </span>
        )}
      </div>
      {planApproval && (
        <div className="ntr-permission-hint">{planApprovalHint(preferZh)}</div>
      )}
      <div className="ntr-permission-actions">
        {permission.options.map(option => (
          <button
            key={option.optionId}
            type="button"
            className="ntr-permission-option"
            disabled={busy}
            title={bilingualPermissionOption(option.name, option.kind, preferZh)}
            onClick={() => { respond(option.optionId) }}
          >
            {bilingualPermissionOption(option.name, option.kind, preferZh)}
          </button>
        ))}
        <button
          type="button"
          className="ntr-permission-cancel"
          disabled={busy}
          title={bilingualLiteral('取消这次询问（不选择任何选项）', 'Cancel this ask without choosing an option', preferZh)}
          onClick={() => { respond() }}
        >
          {bilingualLiteral('取消', 'Cancel', preferZh)}
        </button>
      </div>
      {error !== undefined && (
        <div className="ntr-permission-error" role="alert">{error}</div>
      )}
    </div>
  )
}
