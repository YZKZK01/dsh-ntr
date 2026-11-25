/**
 * The ACP `plan` mode as ONE shared vocabulary for both halves.
 *
 * The agent's mode list is its own (`session/new` / `agent/catalog`), and this
 * module invents nothing about it: it only names the two facts both halves must
 * agree on for the plan-approval flow to be a single source of truth.
 *
 *  - {@link PLAN_MODE_ID}: the mode id every shipped ACP agent uses for plan
 *    mode (codebuddy, codex; the ACP spec has no constant for it, the agents'
 *    own catalogs all spell it `plan`).
 *  - {@link isPlanExitToolName}: whether a permission ask is the agent's
 *    "leave plan mode" request (`ExitPlanMode` / `exit_plan_mode` / a localized
 *    title that still contains both words). That ask is special-cased by the
 *    host (answering it *is* a mode change: it restores the mode the user was
 *    in before plan) and by the browser (its card says so in plain words), so
 *    both sides must classify it identically. The match is deliberately
 *    tolerant of separators and case, and deliberately refuses names that only
 *    mention entering plan (`EnterPlanMode` carries no exit verb).
 *
 * Pure constants and pure functions only: no Node built-ins, no ACP SDK
 * runtime values (module purity, `src/protocol/`).
 */

/** The mode id agents publish for plan mode. */
export const PLAN_MODE_ID = 'plan'

/**
 * Names that mean "the agent wants to LEAVE plan mode".
 *
 * `title` (what `permissionToolName` prefers) is agent-controlled prose, so the
 * test is on two words in one of the two orders, not on an exact id:
 * `ExitPlanMode`, `exit_plan_mode`, `exit-plan`, `plan_exit`, `Leave plan mode`.
 * A name that says only `plan` (a plan UPDATE tool) or `enter plan` is NOT an
 * exit ask — the approved direction matters, because answering this ask moves
 * the session's mode.
 */
export function isPlanExitToolName(name: string): boolean {
  if (typeof name !== 'string' || name === '') return false
  return /exit[\s_.\-\/]*plan|leave[\s_.\-\/]*plan|plan[\s_.\-\/]*(?:exit|leave)/i.test(name)
}
