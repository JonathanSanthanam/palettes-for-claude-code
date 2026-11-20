import type { On } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'

import { PALETTES } from './palettes'

// Each `on` hook in the test plays the engine's part: a call on `$` receives `{ value }`.
type Seen = { theme: Record<string, unknown>[] }

function engine(on: On): Seen {
  const seen: Seen = { theme: [] }

  mock.store(on)
  mock.clock(on)
  mock.env(on, {})
  on('command.register', (_, e) => ({ value: { command: e.name } }))
  on('ui.place', () => ({ value: { isPlaced: true, requestId: 'card' } }))
  on('ui.toast', () => ({ value: undefined }))
  on('ui.log', () => ({ value: undefined }))
  on('session.root', () => ({ value: '/project' }))
  on('session.cwd', () => ({ value: '/project' }))
  on('session.repo', () => ({ value: null }))
  on('session.id', () => ({ value: 'test-session' }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('theme.set', (_, e) => {
    seen.theme.push(e as Record<string, unknown>)

    return { value: { isDrawn: true, requestId: `theme-${seen.theme.length}` } }
  })
  on('theme.clear', () => ({ value: { isDrawn: false, reason: 'removed' } }))

  return seen
}

async function custom($: Engine, args: string): Promise<string> {
  const answer = await $.command.run({
    command: 'custom-theme',
    args,
    origin: { kind: 'composer' },
    presentation: { isFullscreen: false, columns: 100 },
  })

  return String(answer.text ?? '')
}

test('the card lists the 11 palettes', async ($, on) => {
  engine(on)
  await $.session.start({ cwd: '/project', surface: 'desktop', isInteractive: true })

  expect(await custom($, '')).toBe('Pick one on the card.')

  const ui = await $.ui.mount({
    plugin: 'palettes-for-claude-code',
    component: 'Placed',
    requestId: 'theme-card',
    surface: 'desktop',
    props: { id: 'theme-card', plugin: 'palettes-for-claude-code' },
  })

  expect(await ui.find({ type: 'Text', text: /Palettes/ })).toBeDefined()
  for (const palette of PALETTES) {
    expect(await ui.find({ type: 'Text', text: palette.title }), palette.title).toBeDefined()
  }
  expect(await ui.find({ type: 'Button', key: 'apply-p-nord' })).toBeDefined()
  await ui.unmount()
})

test('/custom-theme nord applies the Nord colours', async ($, on) => {
  const seen = engine(on)
  await $.session.start({ cwd: '/project', surface: 'desktop', isInteractive: true })

  const said = await custom($, 'nord')

  expect(said).toMatch(/Nord/)
  const last = seen.theme.at(-1)
  expect(last?.colors).toBeDefined()
  expect(last?.backdrop).toBeUndefined()
})

test('a palette and a backdrop combine in the same call', async ($, on) => {
  const seen = engine(on)
  await $.session.start({ cwd: '/project', surface: 'desktop', isInteractive: true })

  await custom($, 'nord')
  await custom($, 'honu-lagoon')

  const last = seen.theme.at(-1)
  expect(last?.colors).toBeDefined()
  expect(last?.backdrop).toMatchObject({ scene: 'honu-lagoon' })
})

test('"rose pine session" finds Rosé Pine and applies to the session only', async ($, on) => {
  const seen = engine(on)
  await $.session.start({ cwd: '/project', surface: 'desktop', isInteractive: true })

  const said = await custom($, 'rose pine session')

  expect(said).toMatch(/Rosé Pine/)
  expect(said).toMatch(/session/)
  expect(seen.theme.at(-1)?.colors).toBeDefined()
})

test('a wrong name gets a suggestion', async ($, on) => {
  const seen = engine(on)
  await $.session.start({ cwd: '/project', surface: 'desktop', isInteractive: true })

  const said = await custom($, 'nordd')

  expect(said).toMatch(/The nearest is nord/)
  expect(seen.theme).toHaveLength(0)
})

test('the project choice returns to the next session', async ($, on) => {
  const seen = engine(on)
  await $.session.start({ cwd: '/project', surface: 'desktop', isInteractive: true })
  await custom($, 'gruvbox')
  const before = seen.theme.length

  await $.session.start({ cwd: '/project', surface: 'desktop', isInteractive: true })

  expect(seen.theme.length).toBeGreaterThan(before)
  expect(seen.theme.at(-1)?.colors).toBeDefined()
})
