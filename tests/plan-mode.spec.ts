/**
 * The shared `plan` vocabulary (src/protocol/plan-mode.ts).
 *
 * Both halves use these helpers to decide whether a permission ask is the
 * agent asking to LEAVE plan mode: the host turns an allow answer into a mode
 * restore, the browser labels the card and the mode chip. A wrong answer here
 * would either switch a mode on an ordinary tool grant (false positive) or leave
 * the chip stuck on "plan" after an approved exit (false negative), so both
 * directions are pinned.
 */
import { describe, expect, it } from 'vitest'
import { PLAN_MODE_ID, isPlanExitToolName } from '../src/protocol.ts'

describe('PLAN_MODE_ID', () => {
  it('is the id every shipped agent catalog uses', () => {
    expect(PLAN_MODE_ID).toBe('plan')
  })
})

describe('isPlanExitToolName: exit/leave + plan, either order', () => {
  it('recognizes the shipped agent spellings', () => {
    expect(isPlanExitToolName('ExitPlanMode')).toBe(true)
    expect(isPlanExitToolName('exit_plan_mode')).toBe(true)
    expect(isPlanExitToolName('exit-plan')).toBe(true)
    expect(isPlanExitToolName('Exit Plan Mode')).toBe(true)
    expect(isPlanExitToolName('Leave plan mode')).toBe(true)
    expect(isPlanExitToolName('plan_exit')).toBe(true)
  })

  it('accepts a localized title that still contains both words', () => {
    expect(isPlanExitToolName('退出计划模式 (ExitPlanMode)')).toBe(true)
  })

  it('refuses names that only mention plan or only mention entering it', () => {
    expect(isPlanExitToolName('plan')).toBe(false)
    expect(isPlanExitToolName('EnterPlanMode')).toBe(false)
    expect(isPlanExitToolName('plan_update')).toBe(false)
    expect(isPlanExitToolName('UpdatePlan')).toBe(false)
    expect(isPlanExitToolName('Read')).toBe(false)
    expect(isPlanExitToolName('')).toBe(false)
  })

  it('does not need to guess from a bare kind', () => {
    // A tool with no exit verb is an ordinary grant even if it is a "plan" tool:
    // the plugin must never turn an unrelated approval into a mode change.
    expect(isPlanExitToolName('task_plan')).toBe(false)
  })
})
