/**
 * Bilingual copy for the ACP permission card.
 *
 * The ask's options belong to the agent — CodeBuddy ships `Always Allow` /
 * `Allow` / `Reject` — while the card's own copy is localized through
 * `acp.label(zh, en)`. Rendering both left the buttons English next to a Chinese
 * cancel/countdown, so this module supplies the missing half for the options.
 *
 * `kind` is the stable half to read: it is what the answer MEANS
 * (`allow_always` / `allow_once` / `reject_once` / `reject_always`), while
 * `name` is prose that an agent may already have localized. The agent's wording
 * is never replaced — it is kept, and the other language is appended.
 *
 * Pure functions only: the dock and the settings-panel mirror share them, and
 * the tests pin the mapping without a DOM.
 */

/** ACP permission option kinds → the Chinese half. */
export const PERMISSION_KIND_ZH: Readonly<Record<string, string>> = {
  allow_always: '始终允许',
  allow_once: '本次允许',
  reject_once: '拒绝本次',
  reject_always: '始终拒绝',
}

/**
 * Fallback for agents that send no `kind`: match the common English names.
 * A miss falls through to the agent's own text, never to a guess.
 */
const PERMISSION_NAME_ZH: Readonly<Record<string, string>> = {
  'always allow': '始终允许',
  'allow always': '始终允许',
  'allow once': '本次允许',
  allow: '本次允许',
  reject: '拒绝本次',
  'reject once': '拒绝本次',
  deny: '拒绝本次',
  'always deny': '始终拒绝',
  'deny always': '始终拒绝',
  cancel: '取消',
}

/** CJK ideographs (incl. compatibility ideographs): the text is already localized. */
const CJK = /[\u3400-\u9fff\uf900-\ufaff]/

/** True when the text already carries CJK, i.e. the agent localized it itself. */
export function hasCjk(text: string): boolean {
  return CJK.test(text)
}

/** The Chinese half for one option, or undefined when neither kind nor name is known. */
export function permissionOptionZh(name: string, kind: string | undefined): string | undefined {
  if (typeof kind === 'string') {
    const byKind = PERMISSION_KIND_ZH[kind]
    if (byKind !== undefined) return byKind
  }
  return PERMISSION_NAME_ZH[name.trim().toLowerCase()]
}

/**
 * The button text: the agent's own name plus the missing language half.
 * An agent that already localized its name keeps it verbatim.
 */
export function bilingualPermissionOption(name: string, kind: string | undefined, preferZh: boolean): string {
  const zh = permissionOptionZh(name, kind)
  if (zh === undefined || hasCjk(name)) return name
  return preferZh ? `${zh}（${name}）` : `${name}（${zh}）`
}

/** One bilingual pair for the card's own copy (cancel, countdown, expired). */
export function bilingualLiteral(zh: string, en: string, preferZh: boolean): string {
  return preferZh ? `${zh}（${en}）` : `${en}（${zh}）`
}
