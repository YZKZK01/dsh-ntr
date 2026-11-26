/**
 * Bilingual copy for the agent-mode chip and the plan-approval lines
 * (src/client/mode-labels.ts).
 *
 * The labels follow the same contract as the permission card: the AGENT's own
 * name is the fallback in both languages, and Chinese is an addition only where
 * the plugin knows the mode. These cases pin the mappings the shipped agents
 * publish, the fallback for an unknown mode, and the two plan-approval lines the
 * user asked to be bilingual.
 */
import { describe, expect, it } from 'vitest'
import {
  bilingualModeName,
  bilingualModeOption,
  modeLabelZh,
  planApprovalHint,
  planApprovalPendingLabel,
} from '../src/client/mode-labels.ts'

describe('modeLabelZh', () => {
  it('covers the seven WorkBuddy mode ids', () => {
    expect(modeLabelZh('default')).toBe('默认')
    expect(modeLabelZh('acceptEdits')).toBe('接受编辑')
    expect(modeLabelZh('plan')).toBe('计划')
    expect(modeLabelZh('auto')).toBe('自动')
    expect(modeLabelZh('dontAsk')).toBe('不再询问')
    expect(modeLabelZh('bypassPermissions')).toBe('绕过权限')
    expect(modeLabelZh('fullAccess')).toBe('完全权限')
  })

  it('matches case-insensitively and trims', () => {
    expect(modeLabelZh(' FullAccess ')).toBe('完全权限')
    expect(modeLabelZh('ACCEPTEDITS')).toBe('接受编辑')
  })

  it('also covers the codex vocabulary the same control serves', () => {
    expect(modeLabelZh('read-only')).toBe('只读')
    expect(modeLabelZh('workspace-write')).toBe('工作区可写')
    expect(modeLabelZh('agent-full-access')).toBe('代理完全权限')
  })

  it('returns undefined for a mode this bundle has never seen', () => {
    expect(modeLabelZh('someFutureMode')).toBeUndefined()
    expect(modeLabelZh('')).toBeUndefined()
  })
})

describe('bilingualModeName: the agent name stays the fallback', () => {
  it('shows the Chinese reading only when the UI prefers it', () => {
    expect(bilingualModeName('fullAccess', 'Full Access', true)).toBe('完全权限')
    expect(bilingualModeName('fullAccess', 'Full Access', false)).toBe('Full Access')
  })

  it('keeps the agent-owned name for an unknown id, in both languages', () => {
    expect(bilingualModeName('newMode', 'New Mode', true)).toBe('New Mode')
    expect(bilingualModeName('newMode', 'New Mode', false)).toBe('New Mode')
  })

  it('falls back to the id when the agent published no name', () => {
    expect(bilingualModeName('acceptEdits', undefined, false)).toBe('acceptEdits')
    expect(bilingualModeName('acceptEdits', '  ', false)).toBe('acceptEdits')
    expect(bilingualModeName('acceptEdits', undefined, true)).toBe('接受编辑')
  })
})

describe('bilingualModeOption: the menu row carries both languages', () => {
  it('draws the Chinese reading with the agent name in parentheses', () => {
    expect(bilingualModeOption('acceptEdits', 'Accept Edits', true)).toBe('接受编辑（Accept Edits）')
    expect(bilingualModeOption('plan', 'Plan', true)).toBe('计划（Plan）')
    expect(bilingualModeOption('fullAccess', 'Full Access', true)).toBe('完全权限（Full Access）')
  })

  it('keeps only the agent name on an English UI or an unknown id', () => {
    expect(bilingualModeOption('acceptEdits', 'Accept Edits', false)).toBe('Accept Edits')
    expect(bilingualModeOption('newMode', 'New Mode', true)).toBe('New Mode')
  })

  it('does not repeat a name the agent already localized', () => {
    expect(bilingualModeOption('plan', '计划', true)).toBe('计划')
  })
})

describe('plan-approval lines', () => {
  it('names the parked exit ask in both languages', () => {
    expect(planApprovalPendingLabel(true)).toBe('待批准退出')
    expect(planApprovalPendingLabel(false)).toBe('exit pending')
  })

  it('says what approving does and what the deadline does, in both languages', () => {
    expect(planApprovalHint(true)).toContain('回到进入计划前的模式')
    expect(planApprovalHint(true)).toContain('时限')
    expect(planApprovalHint(false)).toContain('restores the mode')
    expect(planApprovalHint(false)).toContain('deadline')
  })
})
