/**
 * Bilingual copy for the permission card (src/client/permission-labels.ts).
 *
 * The card renders the agent's own option names, which CodeBuddy ships in
 * English (`Always Allow` / `Allow` / `Reject`), next to its own localized
 * cancel/countdown. These cases pin the half that the agent cannot supply: the
 * `kind` mapping, the name fallback for agents that omit `kind`, the
 * localized-name passthrough, and the order both languages are drawn in.
 */
import { describe, expect, it } from 'vitest'
import {
  bilingualLiteral,
  bilingualPermissionOption,
  hasCjk,
  permissionOptionZh,
} from '../src/client/permission-labels.ts'

describe('permissionOptionZh: kind is the stable half', () => {
  it('maps every ACP permission kind', () => {
    expect(permissionOptionZh('Always Allow', 'allow_always')).toBe('始终允许')
    expect(permissionOptionZh('Allow', 'allow_once')).toBe('本次允许')
    expect(permissionOptionZh('Reject', 'reject_once')).toBe('拒绝本次')
    expect(permissionOptionZh('Always Reject', 'reject_always')).toBe('始终拒绝')
  })

  it('falls back to the common English names when kind is absent or unknown', () => {
    expect(permissionOptionZh('Always Allow', undefined)).toBe('始终允许')
    expect(permissionOptionZh('  allow  ', undefined)).toBe('本次允许')
    expect(permissionOptionZh('Deny', 'some_future_kind')).toBe('拒绝本次')
    expect(permissionOptionZh('Cancel', 'some_future_kind')).toBe('取消')
  })

  it('returns undefined rather than guessing for an unknown name and kind', () => {
    expect(permissionOptionZh('Proceed', undefined)).toBeUndefined()
    expect(permissionOptionZh('Proceed', 'future_kind')).toBeUndefined()
  })
})

describe('bilingualPermissionOption: agent wording is kept', () => {
  it('appends the missing half after the agent name in a Chinese UI', () => {
    expect(bilingualPermissionOption('Always Allow', 'allow_always', true)).toBe('始终允许（Always Allow）')
    expect(bilingualPermissionOption('Allow', 'allow_once', true)).toBe('本次允许（Allow）')
  })

  it('puts the agent name first in an English UI', () => {
    expect(bilingualPermissionOption('Always Allow', 'allow_always', false)).toBe('Always Allow（始终允许）')
  })

  it('leaves a name the agent already localized verbatim', () => {
    expect(hasCjk('始终允许')).toBe(true)
    expect(bilingualPermissionOption('始终允许', 'allow_always', false)).toBe('始终允许')
    expect(bilingualPermissionOption('本次允许', 'allow_once', true)).toBe('本次允许')
  })

  it('leaves an unknown option verbatim instead of inventing a translation', () => {
    expect(bilingualPermissionOption('Proceed', undefined, true)).toBe('Proceed')
    expect(bilingualPermissionOption('Proceed', 'future_kind', false)).toBe('Proceed')
  })
})

describe('bilingualLiteral: the card own copy', () => {
  it('draws the neighbouring locale half in both directions', () => {
    expect(bilingualLiteral('取消', 'Cancel', true)).toBe('取消（Cancel）')
    expect(bilingualLiteral('取消', 'Cancel', false)).toBe('Cancel（取消）')
    expect(bilingualLiteral('剩余 22s', '22s left', false)).toBe('22s left（剩余 22s）')
  })
})
