/**
 * Bilingual copy for agent-published labels (src/client/config-labels.ts).
 *
 * The advanced base, the thought picker and the mode menu all render text the
 * AGENT publishes. The regression these cases guard is visible: after the
 * plugin was rebuilt from source, those rows fell back to English inside an
 * otherwise Chinese UI (`Sandbox Environment`, `Multitask`, `High`, …).
 */
import { describe, expect, it } from 'vitest'
import { bilingualDetail, bilingualLabel } from '../src/client/config-labels.ts'

describe('bilingualLabel: agent wording kept, Chinese half appended', () => {
  it('translates the advanced config names this agent publishes', () => {
    expect(bilingualLabel('Sandbox')).toBe('沙箱（Sandbox）')
    expect(bilingualLabel('Sandbox Environment')).toBe('沙箱环境（Sandbox Environment）')
    expect(bilingualLabel('Local Environment')).toBe('本地环境（Local Environment）')
    expect(bilingualLabel('Multitask')).toBe('多任务（Multitask）')
  })

  it('translates thought levels and mode names that arrive through menus', () => {
    expect(bilingualLabel('High')).toBe('高（High）')
    expect(bilingualLabel('X-High')).toBe('极高（X-High）')
    expect(bilingualLabel('Full Access')).toBe('完全访问（Full Access）')
    expect(bilingualLabel("Don't Ask")).toBe('不再询问（Don\'t Ask）')
  })

  it('matches case-insensitively where agents disagree on casing', () => {
    expect(bilingualLabel('SANDBOX')).toBe('沙箱（SANDBOX）')
    expect(bilingualLabel('sandbox')).toBe('沙箱（sandbox）')
  })

  it('keeps an unknown label exactly as the agent sent it', () => {
    expect(bilingualLabel('Future Option')).toBe('Future Option')
    expect(bilingualLabel('')).toBe('')
  })

  it('never double-annotates a name the agent already localized', () => {
    expect(bilingualLabel('沙盒环境')).toBe('沙盒环境')
  })
})

describe('bilingualDetail: long prose is replaced, not appended', () => {
  it('translates the sandbox choice descriptions', () => {
    expect(bilingualDetail('Bash/PowerShell commands run inside the sandbox and require escalation to touch the host'))
      .toBe('命令在沙箱内运行，访问宿主机需要提权')
    expect(bilingualDetail('Commands run with full user permissions (no sandbox isolation)'))
      .toBe('命令以完整用户权限运行（无沙箱隔离）')
  })

  it('translates mode and thought descriptions', () => {
    expect(bilingualDetail('Plan before making changes')).toBe('改动前先做计划')
    expect(bilingualDetail('Greater reasoning depth for complex problems')).toBe('为复杂问题提供更深推理')
  })

  it('returns unknown or empty text untouched', () => {
    expect(bilingualDetail('A description this bundle has never seen')).toBe('A description this bundle has never seen')
    expect(bilingualDetail(undefined)).toBeUndefined()
    expect(bilingualDetail('')).toBe('')
  })

  it('keeps a description the agent already wrote in Chinese', () => {
    expect(bilingualDetail('已在沙箱中运行')).toBe('已在沙箱中运行')
  })
})
