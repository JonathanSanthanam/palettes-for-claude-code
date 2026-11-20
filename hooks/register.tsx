// palettes-for-claude-code: a modified copy of theme-examples (Anthropic, Apache-2.0, v0.4.4). Changed on 2026-11-20: adds
// 11 colour palettes (the app's colours) next to the 20 animated backdrops, with a card and answers that cover both.
import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, ThemeColors, Timer } from 'claude-code'

import {
  NIGHT_GLASS,
  NIGHT_ID,
  SHOW_SUFFIXES,
  WORD,
  nightScene,
  sceneWithFireworks,
  themeIdOfShow,
} from './fireworks'
import { PALETTES, colorsOf, paletteFault } from './palettes'
import type { Palette } from './palettes'
import { keyToWrite, keysToClear, keysToRead, projectKeyFor } from './project-key'
import type { KeptKey, KeyEngine } from './project-key'
import { THEMES, sceneFault, sceneOf } from './themes'
import type { Theme } from './themes'
import type { ThemeChoice } from '../types'

const PLUGIN = 'palettes-for-claude-code'
const CARD = 'theme-card'
// Not `theme`: that is the engine's own command (the terminal colours).
const COMMAND = 'custom-theme'
const PREVIEW_MS = 20_000
const FIREWORKS_COMMAND = 'fireworks'
const SHOW_MS = 7000
// 'off' where the person turned the automatic fireworks off; absent, they are on. One key for all sessions and projects.
const AUTO_KEY = 'fireworks:auto'
const SESSION_PREFIX = 'session:'
// How many session choices the store keeps: beyond that, the one written longest ago goes.
const SESSIONS_KEPT = 200
const UNSHOWN = 'If you do not see the theme, this window may not draw themes yet'
const KEPT_UNSHOWN = `${UNSHOWN}. The choice is saved.`
const SHOW_UNSHOWN = 'If you do not see them, this window may not draw them yet.'
// Module variables start over on every reload: so does a show in progress, and that is fine.
let showEnding: Timer | 'starting' | undefined
let showCount = 0
let previewEnding: Timer | undefined
// The loader reads this reference: the two names stay written out as strings.
const choice = atom({ plugin: 'palettes-for-claude-code', key: 'choice' } as const, {}, {
  shape: 'choice-1',
})

/** What sits behind the chat: a backdrop, a palette, both or neither. */
type Look = { backdrop?: string; palette?: string }
/** A requested change: a value sets it, null removes it, absent leaves it as it is. */
type LookChange = { backdrop?: string | null; palette?: string | null }

/** What a set gives back on every engine, as far as this mod reads it: drawn or not. */
type BackdropAnswer = { isDrawn: boolean }
type BackdropChoice = { id: string; glass: Theme['glass']; colorScheme?: Theme['window'] }
/** The engines this mod meets, for the type check only: the theme noun or the older call may be missing. */
type AnyEngine = {
  theme?: { set(args: unknown): Promise<BackdropAnswer>; clear(): Promise<unknown> }
  // `toast` is here only so this type has a member in common with every engine's ui noun.
  ui: { toast: EngineInterface['ui']['toast']; backdrop?(args: BackdropChoice | undefined): Promise<BackdropAnswer> }
}
// The way of setting a theme that this engine took, learnt at the first set that says so; a reload learns it again.
let taken: 'beside' | 'nested' | 'older' | 'none' | undefined

/**
 * A try may be followed by the next one only where the engine lacks the call (reaching for it throws a TypeError) or
 * refuses the shape as one it does not know: in its own words for that, or by naming the member that this try alone
 * bears, should those words ever move. Any other fault is the caller's to see.
 * NO CALL IS ASKED AFTER AHEAD OF ITS TRY: the engine loads a module only where each call on its handle is called on the
 * spot; one that is read, bound or passed keeps the whole module from loading. So each is made, and its fault judged.
 */
function isNotThisEnginesWay(error: unknown, member?: string): boolean {
  return (
    error instanceof TypeError ||
    (error instanceof Error &&
      (error.message.includes('does not know the attribute') || (member !== undefined && error.message.includes(member))))
  )
}

/**
 * Sets a backdrop by whichever call this engine has: the theme noun with the window's kind beside the backdrop, the
 * theme noun with it inside the backdrop, or the older call on the ui noun. The calls are written out plainly, each in
 * its own try: a call the engine lacks throws as it is reached for, and a shape it does not take it refuses. THE NEWEST FIRST: an engine that
 * wants the kind beside the backdrop takes the one inside it too, and drops it without a word.
 * THE SCENE's NAME GOES UNDER TWO NAMES AT ONCE in the newest shape: the newest engines read `scene`, the ones before
 * them `id`. Each engine's own theme noun lets the members it knows cross and drops any other, so one shape serves both;
 * a backdrop with the one name alone is refused by the engines that read the other, in words that name no unknown attribute.
 * Answers nothing where no way was taken.
 */
async function setByAWay(
  $: AnyEngine,
  backdrop: BackdropChoice | undefined,
  colors: ThemeColors | undefined,
): Promise<BackdropAnswer | undefined> {
  if (taken === undefined || taken === 'beside') {
    try {
      const set = await $.theme!.set({
        ...(colors !== undefined && { colors }),
        ...(backdrop !== undefined && { backdrop: { scene: backdrop.id, id: backdrop.id, glass: backdrop.glass } }),
        ...(backdrop?.colorScheme !== undefined && { overrideColorScheme: backdrop.colorScheme }),
      })

      // With no window kind to pass, this shape would be taken again next time: it says nothing about the engine.
      if (backdrop?.colorScheme !== undefined) {
        taken = 'beside'
      }

      return set
    } catch (error) {
      if (!isNotThisEnginesWay(error, 'overrideColorScheme')) throw error
    }
  }

  if (backdrop !== undefined && (taken === undefined || taken === 'nested')) {
    try {
      const set = await $.theme!.set({
        ...(colors !== undefined && { colors }),
        backdrop: {
          id: backdrop.id,
          glass: backdrop.glass,
          ...(backdrop.colorScheme !== undefined && { colorScheme: backdrop.colorScheme }),
        },
      })
      taken = 'nested'

      return set
    } catch (error) {
      if (!isNotThisEnginesWay(error)) throw error
    }
  }

  if (backdrop !== undefined && (taken === undefined || taken === 'older')) {
    try {
      // The older call takes only the id and the glass: no colours.
      const set = await $.ui.backdrop!({ id: backdrop.id, glass: backdrop.glass })
      taken = 'older'

      return set
    } catch (error) {
      if (!isNotThisEnginesWay(error)) throw error
    }
  }

  return undefined
}

/**
 * A learnt way is the only one tried. Where the engine no longer takes it, the ways are tried again from the start; an
 * engine that has none draws nothing, and the answer says so.
 */
async function setLook(
  $: AnyEngine,
  backdrop: BackdropChoice | undefined,
  colors: ThemeColors | undefined,
): Promise<BackdropAnswer> {
  if (taken === 'none') {
    return { isDrawn: false }
  }

  const learnt = taken
  const set = await setByAWay($, backdrop, colors)

  if (set !== undefined) {
    return set
  }

  if (learnt !== undefined) {
    taken = undefined

    const again = await setByAWay($, backdrop, colors)

    if (again !== undefined) {
      return again
    }
  }

  taken = 'none'

  return { isDrawn: false }
}

/** Removes the theme with the call this engine has; an engine that has none stays as it is. */
async function clearBackdrop($: AnyEngine): Promise<void> {
  try {
    await $.theme!.clear()

    return
  } catch (error) {
    if (!isNotThisEnginesWay(error)) throw error
  }

  try {
    await $.ui.backdrop!(undefined)
  } catch (error) {
    if (!isNotThisEnginesWay(error)) throw error
  }
}

/** The scene's name as the engine passes it to the Backdrop hook: `scene` on newer engines, `id` on earlier ones. */
function sceneNameOf(props: { scene?: unknown; id?: unknown }): string | undefined {
  if (typeof props.scene === 'string') {
    return props.scene
  }

  return typeof props.id === 'string' ? props.id : undefined
}

function themeOf(id: string | undefined): Theme | undefined {
  return THEMES.find(theme => theme.id === id)
}

function paletteOf(id: string | undefined): Palette | undefined {
  return PALETTES.find(palette => palette.id === id)
}

/** A typed name, a title and an id all become a key: lower case, every other character a hyphen. */
function keyOf(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

/** The backdrop the person named: by id or title, any case, with spaces or hyphens. */
function themeNamed(text: string): Theme | undefined {
  const key = keyOf(text)

  return THEMES.find(theme => theme.id === key || keyOf(theme.title) === key)
}

/** The palette the person named: "rosepine", "rose pine", "Rosé Pine" and "tokyo night" all work. */
function paletteNamed(text: string): Palette | undefined {
  const key = keyOf(text)
  const joined = key.replace(/-/g, '')

  return PALETTES.find(palette => palette.id === joined || keyOf(palette.title) === key)
}

/** How many one-letter edits turn one word into the other. */
function editsBetween(from: string, to: string): number {
  let row = Array.from({ length: to.length + 1 }, (_, column) => column)

  for (let line = 1; line <= from.length; line += 1) {
    const next = [line]

    for (let column = 1; column <= to.length; column += 1) {
      const swap = (row[column - 1] ?? 0) + (from[line - 1] === to[column - 1] ? 0 : 1)

      next.push(Math.min(swap, (row[column] ?? 0) + 1, (next[column - 1] ?? 0) + 1))
    }

    row = next
  }

  return row[to.length] ?? 0
}

/** All the names that can be typed: palettes first, then backdrops. */
const NAMES: readonly string[] = [...PALETTES.map(palette => palette.id), ...THEMES.map(theme => theme.id)]

/**
 * The name nearest to a misspelt one: first one a few letters away, then the longest one the text starts with, then the
 * first one that starts with the text; otherwise none.
 */
function nearestName(text: string): string | undefined {
  const key = keyOf(text)

  if (key === '') return undefined

  const byEdits = NAMES.map(name => ({ name, edits: editsBetween(key, name) })).sort(
    (one, other) => one.edits - other.edits,
  )
  const nearest = byEdits[0]

  if (nearest !== undefined && nearest.edits <= Math.max(2, Math.floor(key.length / 3))) {
    return nearest.name
  }

  const startsIt = NAMES.filter(name => key.startsWith(name)).sort((one, other) => other.length - one.length)

  return startsIt[0] ?? NAMES.find(name => name.startsWith(key))
}

/** The two window kinds, in the order the list and the card show them. */
const WINDOWS = ['dark', 'light'] as const
const WINDOW_WORD = { dark: 'dark', light: 'light' } as const

/** The backdrops made for one window kind, one line each: the name to type, the title, what it is, the twin. */
function rowsFor(window: Theme['window']): string[] {
  return THEMES.filter(theme => theme.window === window).map(theme => {
    const twin = themeOf(theme.twin)

    return `  ${theme.id}: ${theme.title}. ${theme.blurb}${twin === undefined ? '' : ` (for ${WINDOW_WORD[twin.window]} windows: ${twin.id})`}`
  })
}

/** The full list: palettes and backdrops, by the name to type. */
function themeList(): string {
  return [
    `Palettes (${PALETTES.length}), they change the app's colours:`,
    ...PALETTES.map(palette => `  ${palette.id}: ${palette.title}`),
    `Animated backdrops (${THEMES.length}), behind the chat:`,
    ...WINDOWS.flatMap(window => [`For ${WINDOW_WORD[window]} windows:`, ...rowsFor(window)]),
    `/${COMMAND} <name> applies it to the project; add "session" to apply it to this session only. A palette and a backdrop combine. /${COMMAND} off removes everything.`,
  ].join('\n')
}

function isEmpty(look: Look): boolean {
  return look.backdrop === undefined && look.palette === undefined
}

function sameLook(one: Look, other: Look): boolean {
  return one.backdrop === other.backdrop && one.palette === other.palette
}

/** What the session has applied, trials left out. */
function appliedLook(now: ThemeChoice): Look {
  return { backdrop: now.applied, palette: now.palette }
}

/** What the session shows: the applied look, with the backdrop or palette on trial in its place. */
function shownLook(now: ThemeChoice): Look {
  const look = appliedLook(now)

  if (themeOf(now.preview) !== undefined) return { ...look, backdrop: now.preview }
  if (paletteOf(now.preview) !== undefined) return { ...look, palette: now.preview }

  return look
}

/** A change laid over what is there. */
function changed(look: Look, change: LookChange): Look {
  const backdrop = change.backdrop === undefined ? look.backdrop : (change.backdrop ?? undefined)
  const palette = change.palette === undefined ? look.palette : (change.palette ?? undefined)

  return { backdrop, palette }
}

/**
 * Shows the backdrop and palette behind the chat, in a single call as the app wants, or with nothing removes the theme.
 * Removing clears any theme, even another mod's: so `show` gets an empty look only at the person's request, or to
 * remove a theme of this mod, never on a window it has left bare.
 */
async function show($: EngineInterface, look: Look): Promise<BackdropAnswer | undefined> {
  const theme = themeOf(look.backdrop)
  const palette = paletteOf(look.palette)

  if (theme === undefined && palette === undefined) {
    await clearBackdrop($)

    return undefined
  }

  return setLook(
    $,
    theme === undefined ? undefined : { id: theme.id, glass: theme.glass, colorScheme: theme.window },
    palette === undefined ? undefined : colorsOf(palette),
  )
}

const PROJECT_PREFIX = 'project:'

// The key made for a root is kept beside that root and made again only when the root has moved. A reload starts it over.
let keptProjectKey: KeptKey | null = null
// The end last told to the log: told again only when it changes, so a turn's start adds no line.
let toldKeyStep: string | undefined

/**
 * Says which end of the seven steps gave the project's key, or that the making failed: no path and no key.
 * TO THE DEBUG LOG ALONE: with no option the engine's log call appends a line to the person's transcript.
 * The engine leads every such line with the plugin's name: the text does not say it again.
 */
async function tellKeyStep($: EngineInterface, step: string): Promise<void> {
  if (step === toldKeyStep) {
    return
  }

  toldKeyStep = step

  try {
    await $.ui.log(`the project's key came by ${step}`, { to: 'debug' })
  } catch {
    // An engine without that call, or one that refuses it: nothing more to tell.
  }
}

/** The engine's four calls as the key's maker asks them: the repository's root alone, and the stat's `dir` as its `directory`. */
function keyEngineOf($: EngineInterface): KeyEngine {
  return {
    root: () => $.session.root(),
    cwd: () => $.session.cwd(),
    repo: async () => (await $.session.repo())?.root ?? null,
    stat: async path => {
      const { kind, realPath } = await $.fs.stat(path, { resolve: true })
      const told = kind === 'dir' ? 'directory' : kind

      return realPath === undefined ? { kind: told } : { kind: told, realPath }
    },
  }
}

/** The keys a project's choice is read under, in order; the one it is written under; the ones a clear takes away. */
type ProjectKeys = { read: string[]; write: string; clear: string[] }

/**
 * One choice per project: a session in a linked git worktree shares the key of the matching folder in the main tree.
 * A fault nobody foresaw in the making ends where each foreseen one does: in the key every earlier version used.
 */
async function projectKeys($: EngineInterface): Promise<ProjectKeys> {
  try {
    const found = await projectKeyFor(keyEngineOf($), PROJECT_PREFIX, keptProjectKey)

    keptProjectKey = found.kept
    await tellKeyStep($, found.answer.step)

    return { read: keysToRead(found.answer), write: keyToWrite(found.answer), clear: keysToClear(found.answer) }
  } catch {
    const today = `${PROJECT_PREFIX}${await $.session.root()}`

    await tellKeyStep($, 'fault')

    return { read: [today], write: today, clear: [today] }
  }
}

/** What the store keeps for a session: its backdrop and its palette, null where it chose none. */
type SessionChoice = { theme: string | null; palette?: string | null }

/** An id an engine may not offer: a fault counts as no answer. */
async function orNothing(ask: () => Promise<string | undefined>): Promise<string | undefined> {
  try {
    return await ask()
  } catch {
    return undefined
  }
}

/**
 * The key a session's own choice is stored under: one per row a person sees in the desktop app, else one per
 * Claude Code session. An empty id counts as none. With neither id there is no key, and the choice lasts as long
 * as this process does.
 */
async function sessionKey($: EngineInterface): Promise<string | undefined> {
  const id =
    // The desktop app's own name for its row, unpromised: it outlives /clear and an archive. Unset (the terminal, another app), the next line serves.
    (await orNothing(() => $.env.get('CLAUDE_CODE_HOST_SESSION_ID'))) ||
    (await orNothing(() => $.session.id()))

  return id === undefined || id === '' ? undefined : `${SESSION_PREFIX}${id}`
}

/** What a store holds, read as a look: only ids that still exist. Nothing if there is nothing valid. */
function lookFromStored(stored: unknown): Look | undefined {
  if (typeof stored === 'string') {
    return themeOf(stored) === undefined ? undefined : { backdrop: stored }
  }

  if (typeof stored !== 'object' || stored === null) {
    return undefined
  }

  const record = stored as { theme?: unknown; backdrop?: unknown; palette?: unknown }
  const backdropId = typeof record.backdrop === 'string' ? record.backdrop : record.theme
  const backdrop = typeof backdropId === 'string' && themeOf(backdropId) !== undefined ? backdropId : undefined
  const palette = typeof record.palette === 'string' && paletteOf(record.palette) !== undefined ? record.palette : undefined
  const isRecord = 'theme' in record || 'backdrop' in record || 'palette' in record

  return isRecord ? { backdrop, palette } : undefined
}

/** The choice saved for a session, or nothing: no choice, or its name no longer exists. Empty = chose nothing. */
async function sessionChoice($: EngineInterface, key: string): Promise<Look | undefined> {
  return lookFromStored(await $.store.get(key))
}

/**
 * Saves a session's choice. The key is deleted first, so the store's order is that of the latest writes and the cap
 * drops the session that chose longest ago. If the second write fails, what was there is put back.
 */
async function keepForSession($: EngineInterface, key: string, look: Look): Promise<void> {
  const kept: SessionChoice = { theme: look.backdrop ?? null, palette: look.palette ?? null }
  const stood = await $.store.get(key)

  await $.store.delete(key)

  try {
    await $.store.set(key, kept)
  } catch (error) {
    if (stood !== undefined) {
      try {
        await $.store.set(key, stood)
      } catch {
        // The first error is the one to report.
      }
    }

    throw error
  }

  try {
    const keys = (await $.store.keys()).filter(name => name.startsWith(SESSION_PREFIX))

    for (const oldest of keys.slice(0, Math.max(0, keys.length - SESSIONS_KEPT))) {
      await $.store.delete(oldest)
    }
  } catch {
    // The next choice tries again.
  }
}

/**
 * THE ONLY WAY this mod changes the theme behind the chat: nothing else calls `show`.
 * It asks the engine for the theme and only then saves the choice with `keep`. If `keep` fails, the window goes back to
 * what it was, so what is seen and what is said agree, and the first error goes on.
 */
async function showThenKeep(
  $: EngineInterface,
  look: Look,
  keep?: () => Promise<unknown>,
): Promise<BackdropAnswer | undefined> {
  const stood = await read($, choice)
  const set = await show($, look)

  try {
    await keep?.()
  } catch (error) {
    try {
      await show($, shownLook(stood))
    } catch {
      // The first error is the one to report.
    }

    throw error
  }

  return set
}

/**
 * Applies a look to this session and, with `forProject`, to every later session of the project.
 * A session-only choice goes under its own key; a project choice removes the session's key.
 */
async function apply($: EngineInterface, look: Look, forProject: boolean): Promise<BackdropAnswer | undefined> {
  return showThenKeep($, look, async () => {
    const own = await sessionKey($)

    if (own !== undefined) {
      await (forProject ? $.store.delete(own) : keepForSession($, own, look))
    }

    if (forProject) {
      const keys = await projectKeys($)

      if (isEmpty(look)) {
        for (const key of keys.clear) {
          await $.store.delete(key)
        }
      } else {
        await $.store.set(keys.write, { backdrop: look.backdrop ?? null, palette: look.palette ?? null })
      }
    }

    await update($, choice, (was): ThemeChoice => ({
      cardInBand: was.cardInBand,
      cardAway: was.cardAway,
      applied: look.backdrop,
      palette: look.palette,
      scope: forProject ? 'project' : 'session',
    }))
  })
}

/** The words of an error. */
function reasonOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

/**
 * Runs a step that must never cost the person their start-up or their prompt: its error goes into a dim line of the
 * transcript, which does not reach the model.
 */
async function quietly($: EngineInterface, step: () => Promise<void>): Promise<void> {
  try {
    await step()
  } catch (error) {
    try {
      await $.ui.log(`a background step failed, the window stays as it is (${reasonOf(error)})`)
    } catch {
      // An engine without this call: nothing more to tell.
    }
  }
}

/** What is said where a theme is set but no surface draws it. */
function unshownNote(isSaved: boolean): string {
  return isSaved ? KEPT_UNSHOWN : `${UNSHOWN}.`
}

/** What became of a choice: the error in one sentence; or nothing, and whether no surface draws it. */
type Picked = { fault: string } | { fault: undefined; isUnshown: boolean }

/** The name to say for a change: the new palette or backdrop, or "The theme". */
function changeTitle(change: LookChange): string {
  return paletteOf(change.palette ?? undefined)?.title ?? themeOf(change.backdrop ?? undefined)?.title ?? 'The theme'
}

/**
 * Applies the change the person chose on top of what the session has, or says in one sentence why it cannot be done.
 * Then nothing is saved and what was there stays. Removing promises nothing to see: it is never "not shown".
 */
async function applyOrSay($: EngineInterface, change: LookChange, forProject: boolean): Promise<Picked> {
  const theme = themeOf(change.backdrop ?? undefined)
  const palette = paletteOf(change.palette ?? undefined)
  const sceneProblem = theme === undefined ? undefined : sceneFault(theme)
  const paletteProblem = palette === undefined ? undefined : paletteFault(palette)

  if (theme !== undefined && sceneProblem !== undefined) {
    return { fault: `${theme.title} cannot be drawn: ${sceneProblem}` }
  }

  if (palette !== undefined && paletteProblem !== undefined) {
    return { fault: `${palette.title} cannot be painted: ${paletteProblem}` }
  }

  const look = changed(appliedLook(await read($, choice)), change)

  try {
    const set = await apply($, look, forProject)

    return { fault: undefined, isUnshown: !isEmpty(look) && set?.isDrawn === false }
  } catch (error) {
    return {
      fault: isEmpty(look)
        ? `The theme cannot be removed: ${reasonOf(error)}`
        : `${changeTitle(change)} cannot be applied: ${reasonOf(error)}`,
    }
  }
}

/** The project's saved choice. The first key that has one wins. */
async function projectChoice($: EngineInterface): Promise<Look> {
  for (const key of (await projectKeys($)).read) {
    const look = lookFromStored(await $.store.get(key))

    if (look !== undefined && !isEmpty(look)) {
      return look
    }
  }

  return {}
}

/**
 * Brings a session to the choice it is due: at start-up and at the start of every turn, so a session left open while
 * another changed the project picks up the change on the next turn. A session with a choice of its own stays as it is;
 * one whose choice an earlier process saved takes it back; the others follow the project.
 */
async function followChoice($: EngineInterface): Promise<void> {
  const now = await read($, choice)
  const project = await projectChoice($)
  const applied = appliedLook(now)
  const isOwn =
    now.scope === 'session' || (now.scope === undefined && !isEmpty(applied) && !sameLook(applied, project))

  if (now.preview !== undefined || showEnding !== undefined) {
    return
  }

  const key = await sessionKey($)
  const kept = key === undefined ? undefined : await sessionChoice($, key)

  if (isOwn) {
    if (key !== undefined && kept === undefined) {
      await keepForSession($, key, applied)
    }

    return
  }

  if (kept !== undefined) {
    const take = (): Promise<unknown> =>
      update($, choice, (was): ThemeChoice => ({ ...was, applied: kept.backdrop, palette: kept.palette, scope: 'session' }))

    // Nothing chosen and nothing shown: the engine is asked nothing, or removing would clear another mod's theme.
    await (isEmpty(kept) && isEmpty(applied) ? take() : showThenKeep($, kept, take))

    return
  }

  if (sameLook(applied, project)) {
    return
  }

  // Ask first: a theme the engine refuses is not counted as applied, and the next turn tries again.
  await showThenKeep($, project, () =>
    update($, choice, (was): ThemeChoice => ({ ...was, applied: project.backdrop, palette: project.palette, scope: 'project' })),
  )
}

/** Ends a trial, if it was not applied in the meantime: back to what the session shows. */
async function endPreview($: EngineInterface, id: string): Promise<void> {
  previewEnding = undefined

  const later = await read($, choice)

  if (later.preview === id) {
    await showThenKeep($, appliedLook(later), () => update($, choice, was => ({ ...was, preview: undefined })))
  }
}

/** Ends a show: back to the session's theme, or to nothing. */
async function endFireworks($: EngineInterface): Promise<void> {
  try {
    const later = await read($, choice)

    await showThenKeep($, shownLook(later))
  } finally {
    showEnding = undefined
  }
}

/**
 * Seven seconds of fireworks: over the session's backdrop if there is one, otherwise over a night sky, with the palette
 * kept. ONE SHOW AT A TIME: a word or a command that arrives during a show does nothing.
 */
async function fireworks($: EngineInterface): Promise<string> {
  if (showEnding !== undefined) {
    return 'The fireworks are already running.'
  }

  showEnding = 'starting'
  showCount += 1

  const suffix = SHOW_SUFFIXES[showCount % SHOW_SUFFIXES.length] ?? SHOW_SUFFIXES[0]
  let set: BackdropAnswer

  try {
    const shown = shownLook(await read($, choice))
    const theme = themeOf(shown.backdrop)
    const palette = paletteOf(shown.palette)

    set = await setLook(
      $,
      theme === undefined
        ? { id: NIGHT_ID, glass: NIGHT_GLASS }
        : { id: `${theme.id}${suffix}`, glass: theme.glass, colorScheme: theme.window },
      palette === undefined ? undefined : colorsOf(palette),
    )
  } catch (error) {
    showEnding = undefined

    return `The fireworks cannot be shown: ${reasonOf(error)}`
  }

  showEnding = $.clock.after(SHOW_MS, () => void quietly($, () => endFireworks($)))

  return set?.isDrawn === false ? `Fireworks. ${SHOW_UNSHOWN}` : 'Fireworks.'
}

/** Whether a show starts by itself on the word: yes, unless the person turned it off. When in doubt, no. */
async function goesOffByItself($: EngineInterface): Promise<boolean> {
  try {
    return (await $.store.get(AUTO_KEY)) !== 'off'
  } catch {
    return false
  }
}

/** `/fireworks` alone starts a show; `auto off` and `auto on` write the key. */
async function fireworksCommand($: EngineInterface, args: string): Promise<string> {
  const words = args.trim().toLowerCase().split(/\s+/).join(' ')

  if (words === '') {
    return fireworks($)
  }

  if (words !== 'auto off' && words !== 'auto on') {
    return 'Try /fireworks, /fireworks auto off or /fireworks auto on.'
  }

  try {
    await (words === 'auto off' ? $.store.set(AUTO_KEY, 'off') : $.store.delete(AUTO_KEY))
  } catch (error) {
    return `Cannot save: ${reasonOf(error)}`
  }

  return words === 'auto off'
    ? 'The fireworks no longer start by themselves. /fireworks still starts them.'
    : 'The fireworks start again when Claude says "merged".'
}

type CardElements = Pick<ReturnType<EngineInterface['ui']['resolve']>, 'Box' | 'Text' | 'Button'>

/** Closes the card, placed or above the prompt, until the command opens it again. */
async function putCardAway($: EngineInterface): Promise<void> {
  await update($, choice, was => ({ ...was, cardInBand: false, cardAway: true }))
}

/** A choice on the card: applied, and the card closes like a menu. If it cannot be done, it says so and the card stays. */
async function pick($: EngineInterface, change: LookChange, forProject: boolean): Promise<void> {
  const picked = await applyOrSay($, change, forProject)

  if (picked.fault !== undefined) {
    void $.ui.toast(picked.fault)

    return
  }

  if (picked.isUnshown) {
    void $.ui.toast(unshownNote(forProject))
  }

  await putCardAway($)
}

/** Tries a backdrop or a palette for twenty seconds, saving nothing. */
async function tryOut($: EngineInterface, id: string, title: string, change: LookChange): Promise<void> {
  let set: BackdropAnswer | undefined

  try {
    const look = changed(appliedLook(await read($, choice)), change)

    set = await showThenKeep($, look, () => update($, choice, was => ({ ...was, preview: id })))
  } catch (error) {
    void $.ui.toast(`${title} cannot be shown: ${reasonOf(error)}`)

    return
  }

  previewEnding?.cancel()
  previewEnding = $.clock.after(PREVIEW_MS, () => void quietly($, () => endPreview($, id)))

  if (set?.isDrawn === false) {
    void $.ui.toast(unshownNote(false))
  }
}

/** The three buttons of an entry: apply to the project, this session only, try. */
function buttons(
  $: EngineInterface,
  { Box, Button }: CardElements,
  now: ThemeChoice,
  item: { id: string; title: string; prefix: string; change: LookChange; isApplied: boolean },
) {
  const applyWord = item.isApplied && now.scope !== 'session' ? 'Applied' : 'Apply'
  const sessionWord = item.isApplied && now.scope === 'session' ? '✓ This session' : 'This session only'
  const previewWord = now.preview === item.id ? 'Trying' : 'Try'

  return (
    <Box flexDirection="row" gap={1}>
      <Button key={`apply-${item.prefix}-${item.id}`} label={applyWord} onPress={() => pick($, item.change, true)}>
        {applyWord}
      </Button>
      <Button key={`session-${item.prefix}-${item.id}`} label={sessionWord} onPress={() => pick($, item.change, false)}>
        {sessionWord}
      </Button>
      <Button
        key={`preview-${item.prefix}-${item.id}`}
        label={previewWord}
        onPress={() => tryOut($, item.id, item.title, item.change)}
      >
        {previewWord}
      </Button>
    </Box>
  )
}

/**
 * The card. At the top Remove all and Close, so it closes without scrolling. Then the palettes, each with its light and
 * dark colours in small, and below them the animated backdrops by window kind. A palette and a backdrop combine:
 * choosing one does not remove the other.
 */
function card($: EngineInterface, elements: CardElements, now: ThemeChoice) {
  const { Box, Text, Button } = elements

  return (
    <Box flexDirection="column" borderStyle="round" paddingX={1} gap="md">
      <Box flexDirection="row" gap={1}>
        <Text bold>Custom themes</Text>
        <Button key="off" label="Remove all" onPress={() => pick($, { backdrop: null, palette: null }, true)}>
          Remove all
        </Button>
        <Button key="close" label="Close" role="dismiss" autoFocus onPress={() => putCardAway($)}>
          Close
        </Button>
      </Box>
      <Box key="group-palettes" flexDirection="column" gap="md">
        <Box flexDirection="row" flexWrap="wrap" justifyContent="space-between" columnGap="md" rowGap="xs">
          <Text key="head-palettes" size="heading" bold>
            Palettes
          </Text>
          <Button key="off-palette" label="No palette" onPress={() => pick($, { palette: null }, true)}>
            No palette
          </Button>
        </Box>
        <Text dimColor>Palettes change the app's colours. The first swatch is light, the second dark.</Text>
        {PALETTES.map(palette => {
          const isApplied = now.palette === palette.id

          return (
            <Box key={`palette-${palette.id}`} flexDirection="column" gap="xs">
              <Box flexDirection="row" flexWrap="wrap" justifyContent="space-between" columnGap="md" rowGap="xs">
                <Box flexDirection="row" gap={1}>
                  <Text bold={isApplied}>
                    {isApplied ? '✓ ' : ''}
                    {palette.title}
                  </Text>
                  <Text backgroundColor={palette.light.bg} color={palette.light.ink}>
                    {' Aa '}
                  </Text>
                  <Text color={palette.light.sage}>●</Text>
                  <Text backgroundColor={palette.dark.bg} color={palette.dark.ink}>
                    {' Aa '}
                  </Text>
                  <Text color={palette.dark.sage}>●</Text>
                </Box>
                {buttons($, elements, now, {
                  id: palette.id,
                  title: palette.title,
                  prefix: 'p',
                  change: { palette: palette.id },
                  isApplied,
                })}
              </Box>
            </Box>
          )
        })}
      </Box>
      <Box key="group-backdrops" flexDirection="column" gap="md">
        <Box flexDirection="row" flexWrap="wrap" justifyContent="space-between" columnGap="md" rowGap="xs">
          <Text key="head-backdrops" size="heading" bold>
            Animated backdrops
          </Text>
          <Button key="off-backdrop" label="No backdrop" onPress={() => pick($, { backdrop: null }, true)}>
            No backdrop
          </Button>
        </Box>
        {WINDOWS.map(window => (
          <Box key={`group-${window}`} flexDirection="column" gap="md">
            <Text key={`head-${window}`} bold>{`For ${WINDOW_WORD[window]} windows`}</Text>
            {THEMES.filter(theme => theme.window === window).map(theme => {
              const twin = themeOf(theme.twin)
              const isApplied = now.applied === theme.id

              return (
                <Box key={`theme-${theme.id}`} flexDirection="column" gap="xs">
                  <Box flexDirection="row" flexWrap="wrap" justifyContent="space-between" columnGap="md" rowGap="xs">
                    <Text bold={isApplied}>
                      {isApplied ? '✓ ' : ''}
                      {theme.title}
                    </Text>
                    {buttons($, elements, now, {
                      id: theme.id,
                      title: theme.title,
                      prefix: 'b',
                      change: { backdrop: theme.id },
                      isApplied,
                    })}
                  </Box>
                  <Text dimColor>{theme.blurb}</Text>
                  {twin === undefined
                    ? []
                    : [<Text key={`twin-${theme.id}`} dimColor>{`For ${WINDOW_WORD[twin.window]} windows: ${twin.title}`}</Text>]}
                </Box>
              )
            })}
          </Box>
        ))}
      </Box>
    </Box>
  )
}

/** The answer to a choice the command carried out. */
function pickedText(change: LookChange, forProject: boolean): string {
  const where = forProject
    ? 'applied to the project. The project\'s other open sessions pick it up on their next turn.'
    : 'applied to this session only.'
  const palette = paletteOf(change.palette ?? undefined)

  if (palette !== undefined) {
    return `Palette ${palette.title} ${where}`
  }

  const theme = themeOf(change.backdrop ?? undefined)

  if (theme === undefined) {
    return forProject ? 'Done for the project.' : 'Done for this session.'
  }

  const twin = themeOf(theme.twin)

  return (
    `Backdrop ${theme.title} ${where} Made for ${WINDOW_WORD[theme.window]} windows` +
    `${twin === undefined ? '' : ` (for ${WINDOW_WORD[twin.window]} windows: ${twin.id})`}.`
  )
}

const SESSION_WORDS = ['session']
const PROJECT_WORDS = ['project']

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    // A refused name must not cost the session its theme: carry on without the command.
    try {
      await $.command.register({
        name: COMMAND,
        description: 'Pick a colour palette or an animated backdrop. Without a name it opens the card with the list.',
      })
    } catch (error) {
      void $.ui.toast(`palettes-for-claude-code: /${COMMAND} is not available (${String(error)})`)
    }

    try {
      await $.command.register({
        name: FIREWORKS_COMMAND,
        description: 'Fireworks. "auto off" turns the automatic ones off, "auto on" turns them back on.',
      })
    } catch (error) {
      void $.ui.toast(`palettes-for-claude-code: /${FIREWORKS_COMMAND} is not available (${String(error)})`)
    }

    // A trial left in the state has lost its timer after a reload: remove it.
    if ((await read($, choice)).preview !== undefined) {
      await update($, choice, was => ({ ...was, preview: undefined }))
    }

    await quietly($, () => followChoice($))
    await quietly($, async () => {
      const shown = appliedLook(await read($, choice))

      if (themeOf(shown.backdrop) !== undefined || paletteOf(shown.palette) !== undefined) {
        await showThenKeep($, shown)
      }
    })

    return next(e)
  })

  // The start of a turn: an open session picks up the change another one made to the project.
  on('prompt.submit', async ($, e, next) => {
    await quietly($, () => followChoice($))

    return next(e)
  })

  on('command.run', { command: COMMAND }, async ($, e) => {
    const words = e.args.trim().split(/\s+/).filter(word => word !== '')
    const last = words.at(-1)?.toLowerCase() ?? ''
    // The scope word is the last of two or more, and only these: every other word is part of the name.
    const isScoped = words.length > 1 && [...SESSION_WORDS, ...PROJECT_WORDS].includes(last)
    const forProject = !(isScoped && SESSION_WORDS.includes(last))
    const name = (isScoped ? words.slice(0, -1) : words).join(' ')
    const key = keyOf(name)

    if (name === '') {
      const placed = await $.ui.place({ id: CARD })

      await update($, choice, was => ({ ...was, cardInBand: !placed.isPlaced, cardAway: false }))

      return { text: 'Pick one on the card.' }
    }

    if (key === 'list') {
      return { text: themeList() }
    }

    const offs: Record<string, LookChange> = {
      off: { backdrop: null, palette: null },
      'off-palette': { palette: null },
      'palette-off': { palette: null },
      'off-backdrop': { backdrop: null },
      'backdrop-off': { backdrop: null },
    }
    const off = offs[key]

    if (off !== undefined) {
      const cleared = await applyOrSay($, off, forProject)

      if (cleared.fault !== undefined) {
        return { text: cleared.fault }
      }

      const what = off.palette === undefined ? 'Backdrop removed' : off.backdrop === undefined ? 'Palette removed' : 'Theme removed'

      return {
        text: forProject
          ? `${what} for this project. The other open sessions remove it on their next turn.`
          : `${what} for this session only. The project keeps its own for the other sessions.`,
      }
    }

    const palette = paletteNamed(name)
    const theme = palette === undefined ? themeNamed(name) : undefined

    if (palette === undefined && theme === undefined) {
      const nearest = nearestName(name)

      return {
        text:
          `No palette or backdrop is called "${name}". ` +
          (nearest === undefined ? '' : `The nearest is ${nearest}. `) +
          `/${COMMAND} list names them all; "session" as the last word applies to this session only.`,
      }
    }

    const change: LookChange = palette !== undefined ? { palette: palette.id } : { backdrop: theme?.id }
    const picked = await applyOrSay($, change, forProject)

    if (picked.fault !== undefined) {
      return { text: picked.fault }
    }

    const said = pickedText(change, forProject)

    return { text: picked.isUnshown ? `${said} ${unshownNote(forProject)}` : said }
  })

  on('command.run', { command: FIREWORKS_COMMAND }, async ($, e) => ({ text: await fireworksCommand($, e.args) }))

  // Every block of the model's reply passes through here once, as text, before it is saved.
  on('session.append', { door: 'response' }, async ($, e, next) => {
    const said = e.message.content.some(
      block => block.type === 'text' && typeof block.text === 'string' && WORD.test(block.text),
    )

    if (said && (await goesOffByItself($))) {
      await fireworks($)
    }

    return next(e)
  })

  on('ui.render', { component: 'Backdrop' }, ($, e, next) => {
    // Only a window has room behind the chat, and only its table has `Svg`.
    if (e.props.plugin !== PLUGIN || e.surface !== 'desktop') {
      return next(e)
    }

    const name = sceneNameOf(e.props)

    if (name === undefined) {
      return next(e)
    }

    const { Svg } = $.ui.resolve(e)

    if (name === NIGHT_ID) {
      return <Svg isInteractive alt="Fireworks over a night sky" source={nightScene()} />
    }

    const showOf = themeOf(themeIdOfShow(name))

    if (showOf !== undefined) {
      return (
        <Svg isInteractive alt={`Fireworks over ${showOf.title}`} source={sceneWithFireworks(showOf, sceneOf(showOf))} />
      )
    }

    const theme = themeOf(name)

    if (theme === undefined) {
      return next(e)
    }

    return <Svg isInteractive alt={`${theme.title}: ${theme.blurb}`} source={sceneOf(theme)} />
  })

  on('ui.render', { component: 'Placed' }, async ($, e, next) => {
    if (e.props.plugin !== PLUGIN || e.props.id !== CARD) {
      return next(e)
    }

    const now = await read($, choice)

    if (now.cardAway === true) {
      return next(e)
    }

    return card($, $.ui.resolve(e), now)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const now = await read($, choice)

    if (now.cardInBand !== true) {
      return next(e)
    }

    return card($, $.ui.resolve(e), now)
  })
}
