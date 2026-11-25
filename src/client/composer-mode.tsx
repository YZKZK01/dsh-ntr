/**
 * ACP-native mode control for the conversation composer
 * (`conversation.input.left` — the seat the slot contract reserves for a small
 * native control).
 *
 * THE TWO MODE CONTROLS NEVER SHARE A SCREEN (audit finding F27): the ACP-mode
 * gate that lets this entry render also occupies the host's Access mode seat
 * with a claim that renders nothing (`createPermissionSeatClaim` in
 * model-seat.tsx) — the host's write policy (仅可查看 / 工作区内修改 / 完全权限)
 * says nothing about an external agent process, so showing it next to an ACP
 * conversation only misleads. This select is therefore NOT "complementary" to
 * the Access mode: in the only conversation where it appears, the Access mode is
 * hidden and this IS the mode switch. What it switches is the agent's own
 * `session/set_mode` vocabulary (`plan`, `acceptEdits`, …). An ordinary
 * conversation renders nothing here at all — the entry is registered
 * unconditionally and gates itself (see `isAcp` below).
 *
 * The host supplies the data by chat session id (`session/chat-list`), so the
 * control renders nothing until an ACP agent has actually run in this
 * conversation, and nothing at all for an agent that declares no modes.
 */

import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import { isPlanExitToolName } from '../protocol.ts'
import type { AcpSessionHook } from './acp-ui.tsx'
import { bilingualModeName, planApprovalHint, planApprovalPendingLabel } from './mode-labels.ts'
import { permissionsForSession } from './store.ts'
import type { AcpStore } from './store.ts'

/**
 * The props this occupant actually receives: our injected face (which carries
 * the chat session id, like every other entry in this plugin) plus the
 * framework's session standard kit, of which only `useSession` is read.
 *
 * `conversation.input.left` declares no `owner` share — the composer bar calls
 * `renderSlot('conversation.input.left', {})` — so the ONLY props that exist are
 * the standard kit (session-scope `sessionId` + the bound `use<Name>` selector
 * hooks + `useProjection`/`inputActions`) and whatever our `inject` returns. The
 * session id deliberately rides the injected face rather than the standard kit:
 * the kit's top-level `sessionId` is a newer renderer addition, while the
 * positional inject argument (`binding.key`) is the contract every version in
 * play honors. Inventing a prop here is a render crash, not a silent undefined.
 */
export interface ComposerModeProps {
  /** Injected face: the chat session id this control belongs to. */
  sessionId: string
  /** Framework-bound conversation snapshot hook (`SessionStandardProps.useSession`). */
  useSession: AcpSessionHook
  acp: AcpStore
}

function useUi(acp: AcpStore) {
  return useSyncExternalStore(cb => acp.subscribe(cb), () => acp.getSnapshot())
}

/**
 * The mode select's tooltip (audit finding F27). It must not call the host's
 * Access mode "complementary": the ACP-mode gate that puts this select on screen
 * also hides that control (`createPermissionSeatClaim` renders nothing in the
 * permission seat), so in the conversation where this appears the Access mode is
 * gone and this select is the mode switch the user actually has.
 */
export function agentModeTitle(agentId: string | undefined, acp: AcpStore): string {
  return acp.label(
    `agent 模式（${agentId ?? 'agent'}）：由 agent 自己定义。NTR 会话里 DSH 的 Access mode 不显示，模式就在此切换。`,
    `agent mode (${agentId ?? 'agent'}): defined by the agent. In an NTR conversation the DSH access mode is not shown, so this is where the mode is switched.`,
  )
}

/**
 * Whether this conversation is one the agent-mode control may serve.
 *
 * An EXPLICIT non-ACP verdict outranks a lingering session row: switching a
 * conversation off the NTR preset does not close its ACP session, so "a row
 * exists" alone would keep this control on an ordinary conversation — the same
 * precedence the agent tag, the context ring and the released banner already
 * apply. Only while the host has not answered (`undefined`) does a bound
 * session count as proof, which is what keeps the control available before the
 * host's first `session/chat-list` answer lands.
 */
export function agentModeVisible(
  acpMode: boolean | undefined,
  hasBoundSession: boolean,
): boolean {
  if (acpMode === false) return false
  return acpMode === true || hasBoundSession
}

/**
 * The mode the select shows as in force.
 *
 * A LIVE session is the authority (it is what the agent runs right now). A
 * RELEASED row only describes the mode the agent was parked ON, so a newer
 * pick — which `applyChatChoice` will apply on the next resume — outranks it
 * (and the parked row still beats the catalog default). Same precedence as
 * the model and thought level in `describeRoute`: a pre-switch on a parked
 * session must be visible or the control reads as dead.
 */
export function modeInForce(
  target: { released?: boolean; modes?: { currentModeId?: string } } | undefined,
  persisted: string | undefined,
  fallback?: string,
  configuredDefault?: string,
): string {
  const live = target !== undefined && target.released !== true ? target.modes?.currentModeId : undefined
  // A configured default is newer intent than the mode a parked row was
  // captured on: the next resume will apply it (`applyAgentDefaultMode`), so
  // showing the parked value would promise something else for the next turn.
  return live ?? persisted ?? configuredDefault ?? target?.modes?.currentModeId ?? fallback ?? ''
}

export function AcpComposerMode({ acp, sessionId, useSession }: ComposerModeProps) {
  const ui = useUi(acp)
  const dshSessionId = String(sessionId)
  // A fresh chat session has no binding until its first turn creates one, so
  // re-read whenever the running flag settles.
  const running = useSession(snapshot => snapshot.running)
  const [switching, setSwitching] = useState(false)
  // The mode menu is a popover, not a native <select>: the native control was a
  // bare OS dropdown inside a DSH-looking bottom bar, and it could not carry the
  // "plan approval pending" state or the check mark that tells the user which
  // mode is in force (user decision: the mode control must look like the rest of
  // the bottom bar and must follow the agent in BOTH directions).
  const [menuOpen, setMenuOpen] = useState(false)
  const container = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    if (!menuOpen) return
    const onPointerDown = (event: MouseEvent): void => {
      if (container.current !== null && event.target instanceof Node && container.current.contains(event.target)) return
      setMenuOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [menuOpen])

  useEffect(() => {
    void acp.loadChatSessions(dshSessionId)
  }, [acp, dshSessionId, running])

  const bound = ui.chatSessionsFor === dshSessionId ? ui.chatSessions : []
  // Prefer the live binding; a released one still describes the conversation.
  const target = bound.find(session => !session.released) ?? bound[0]
  // ISOLATION — this entry is NOT inside the ACP-mode gate (`syncAcpMode` holds
  // the model/permission seats, but `conversation.input.left` is registered
  // unconditionally), so it must gate itself. The `defaultAgent` fallback below
  // would otherwise put an ACP mode select into ORDINARY conversations: the
  // agent id is plugin-global, so "an agent is configured" is not the same
  // question as "this conversation is served by one". A live session is proof
  // only while the host has not answered; an explicit `false` wins over the
  // lingering row a preset switch leaves behind (see `agentModeVisible`).
  const isAcp = agentModeVisible(ui.acpMode[dshSessionId], target !== undefined)
  // The agent this conversation is set up on, live session or not. Before the
  // first message there is no session to read a mode list from, yet the user is
  // already choosing the agent — and the mode is one of the things they may
  // want to choose with it (user report, 2026-10-18: this control vanished on a
  // conversation set up ahead of its first message).
  //
  // The `defaultAgent` fallback applies ONLY inside an ACP-mode conversation.
  // Without that gate an ordinary chat would resolve an agent id it has nothing
  // to do with and read ITS catalog — and reading a catalog can spawn a probe
  // (user report, 2026-10-18: an unrelated agent showed up "已连接").
  const agentId = target?.agentId
    // A locked conversation belongs to this agent even when no session is live
    // (after a restart / agent stop). It must outrank the binding read and the
    // plugin default: reading another agent's catalog here would put THAT
    // agent's modes on a locked conversation.
    ?? ui.chatLockedAgent[dshSessionId]
    ?? ui.chatBoundAgent[dshSessionId]
    ?? ui.chatChoice[dshSessionId]?.agentId
    ?? (isAcp ? ui.defaultAgent : undefined)
  const catalog = agentId === undefined ? undefined : ui.seatCatalogs[agentId]
  useEffect(() => {
    // Nothing to read for a conversation that is not served by an agent, and
    // nothing to read while a live session is already answering (its
    // `session/new` modes outrank the catalog).
    if (!isAcp || agentId === undefined || target !== undefined) return
    void acp.loadAgentCatalog(agentId)
  }, [acp, agentId, isAcp, target])

  // The whole control is ACP-only: a lingering live session row survives a
  // preset switch, so its `availableModes` are NOT a licence to render here.
  // Without this guard an ordinary conversation kept an agent-mode select
  // beside its native controls (reported as "the bottom bar lost its native
  // capabilities").
  if (!isAcp) return null
  const live = target?.modes?.availableModes ?? []
  // TWO sources, one list. A live session's `session/new` answer is the
  // authority on which modes exist and which is in force; the probed catalog
  // carries the same list for the window before one exists (it is what the
  // agent published on ITS throwaway session). A live session always wins.
  const modes = live.length > 0
    ? live
    : (catalog?.mode?.choices ?? []).map(choice => ({ id: choice.id, name: choice.name, description: choice.description }))
  if (modes.length === 0) return null
  // The mode IN FORCE: a live session is the authority, before one exists (or
  // while one is parked) the claims available are the pick this conversation
  // recorded and the agent's own reported current mode (a pick outranks the
  // agent's default, exactly like the model and thought level do in
  // `describeRoute`; the parked row yields to the pick — see `modeInForce`).
  const persisted = ui.chatChoice[dshSessionId]?.agentId === agentId
    ? ui.chatChoice[dshSessionId]?.mode
    : undefined
  // The agent's configured NEW-chat default outranks the catalog's volatile
  // observation; a recorded pick and a live/parked session still win (see
  // `modeInForce`). It is shown only when the list actually offers it — a
  // stale value stays a settings-page warning, never a select value with no
  // matching option.
  const configuredDefault = agentId === undefined
    ? undefined
    : ui.detectedAgents.find(info => info.id === agentId)?.currentConfig?.defaultMode
  const shownDefault = configuredDefault !== undefined && modes.some(mode => mode.id === configuredDefault)
    ? configuredDefault
    : undefined
  const current = modeInForce(
    target,
    persisted,
    catalog?.mode?.currentValue ?? modes[0]?.id,
    shownDefault,
  )

  // Plan-approval state. An `ExitPlanMode` ask IS a mode decision, so the chip
  // must say the agent is waiting to LEAVE plan mode instead of just naming the
  // mode it is frozen in (user decision: choosing a mode and being asked for one
  // must read as the same control).
  const pendingPlanAsk = permissionsForSession(ui.permissions, dshSessionId)
    .some(ask => isPlanExitToolName(ask.toolName))
  const preferZh = acp.prefersZh()
  const currentName = modes.find(mode => mode.id === current)?.name
  const currentLabel = bilingualModeName(current, currentName, preferZh)
  const chipLabel = pendingPlanAsk ? `${currentLabel} · ${planApprovalPendingLabel(preferZh)}` : currentLabel
  const title = pendingPlanAsk ? `${agentModeTitle(agentId, acp)} ${planApprovalHint(preferZh)}` : agentModeTitle(agentId, acp)

  // No visible "Agent mode" caption (user decision, 2026-10-17): the option
  // labels are the agent's own mode names, which read as what they are on their
  // own; the explanation stays in the tooltip. The chip shows the mode IN FORCE
  // and opens a native-looking menu of every mode the agent publishes (all seven
  // WorkBuddy modes included — the list is the agent's, never a plugin subset).
  return (
    <div ref={container} className="ntr-mode">
      <button
        type="button"
        className={`ntr-mode-button${pendingPlanAsk ? ' is-plan-pending' : ''}`}
        aria-label={acp.label('agent 模式', 'agent mode')}
        aria-haspopup="listbox"
        aria-expanded={menuOpen}
        title={title}
        disabled={switching}
        onClick={() => { setMenuOpen(open => !open) }}
      >
        <span className="ntr-mode-value">{chipLabel}</span>
        <span className="ntr-mode-caret" aria-hidden="true">▾</span>
      </button>
      {menuOpen && (
        <div className="ntr-mode-menu" role="listbox" aria-label={acp.label('agent 模式', 'agent mode')}>
          {modes.map(mode => {
            const selected = mode.id === current
            return (
              <button
                key={mode.id}
                type="button"
                role="option"
                aria-selected={selected}
                className={`ntr-mode-option${selected ? ' is-selected' : ''}`}
                title={mode.description}
                onClick={() => {
                  setMenuOpen(false)
                  if (selected) return
                  setSwitching(true)
                  void acp.setChatSessionMode(dshSessionId, mode.id, agentId).finally(() => { setSwitching(false) })
                }}
              >
                <span className="ntr-mode-check" aria-hidden="true">{selected ? '✓' : ''}</span>
                <span className="ntr-mode-option-name">{bilingualModeName(mode.id, mode.name, preferZh)}</span>
                {mode.description !== undefined && mode.description !== '' && (
                  <span className="ntr-mode-option-desc">{mode.description}</span>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
