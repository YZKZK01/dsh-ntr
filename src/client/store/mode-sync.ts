/**
 * Mode sync for the chat rows the composer chip reads (`src/client/store.ts`).
 *
 * `current_mode_update` is state, not transcript content: the chip takes its
 * value from `session/chat-list`, so an agent-driven mode change (codex pushes
 * the update; the plugin pushes one itself after an approved `ExitPlanMode`)
 * must move that row too, or the chip keeps showing the old mode until some
 * unrelated RPC re-reads the list. Kept out of `store.ts` because that file is
 * locked to a line budget; the batch helpers are pure.
 */
import type { SessionView } from '../../protocol.ts'

/**
 * Last well-formed `current_mode_update` in one coalesced batch.
 *
 * Later frames win: a batch can carry several (plan restore then a user pick),
 * and the newest is what the agent is in.
 */
export function currentModeOfBatch(items: ReadonlyArray<{ update: unknown }>): string | undefined {
  let modeId: string | undefined
  for (const item of items) {
    const update = item.update as Record<string, unknown>
    if (update.sessionUpdate !== 'current_mode_update') continue
    if (typeof update.currentModeId === 'string' && update.currentModeId !== '') modeId = update.currentModeId
  }
  return modeId
}

/**
 * Move ONE row's `modes.currentModeId`, keeping the published mode list.
 *
 * The update carries only the id; the available modes were announced by
 * `session/new` (and mirrored here), so replacing the whole `modes` object with
 * an id-only shape would delete the composer's option list.
 */
export function withSessionCurrentMode<T extends { sessionId: string; modes?: SessionView['modes'] }>(
  rows: T[],
  sessionId: string,
  modeId: string,
): T[] {
  let changed = false
  const next = rows.map(row => {
    if (row.sessionId !== sessionId || row.modes === undefined || row.modes.currentModeId === modeId) return row
    changed = true
    return { ...row, modes: { ...row.modes, currentModeId: modeId } }
  })
  return changed ? next : rows
}
