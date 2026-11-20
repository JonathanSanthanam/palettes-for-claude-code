import type { ThemeColors } from 'claude-code'

import { makeColors } from './make-colors.js'

/**
 * The 11 well-known editor palettes, tuned so the desktop app paints them (muted text and dark surfaces are adjusted
 * for contrast). Each mode keeps the colours needed here: page (bg), cards (card), panels (tile, dark only), strong
 * text (ink), muted text (ink2), accent (sage), amber (warm).
 */
type Mode = {
  bg: string
  card: string
  tile: string
  ink: string
  ink2: string
  sage: string
  warm: string
}

export type Palette = {
  id: string
  title: string
  light: Mode
  dark: Mode
  /** The code-highlighting theme, by name: the app keeps its own if it does not know the name. */
  code?: { light?: string; dark?: string }
}

// Colours shared by all the palettes: red, sage green, violet.
const RED = '#b65e57'
const GREEN = '#5f6f5d'
const VIOLET = '#8b6fb3'
const GREEN_ON_DARK = '#8fbf7f'

export const PALETTES: readonly Palette[] = [
  {
    id: 'rosepine',
    title: 'Rosé Pine',
    light: { bg: '#faf4ed', card: '#fffaf3', tile: '#f4ede8', ink: '#575279', ink2: '#797593', sage: '#907aa9', warm: '#c08a3e' },
    dark: { bg: '#191724', card: '#1f1d2e', tile: '#26233a', ink: '#e0def4', ink2: '#908caa', sage: '#ebbcba', warm: '#f6c177' },
    code: { light: 'rose-pine-dawn', dark: 'rose-pine' },
  },
  {
    id: 'gruvbox',
    title: 'Gruvbox',
    light: { bg: '#fbf1c7', card: '#f9f5d7', tile: '#f2e5bc', ink: '#3c3836', ink2: '#7c6f64', sage: '#af3a03', warm: '#c08a3e' },
    dark: { bg: '#282828', card: '#32302f', tile: '#3c3836', ink: '#ebdbb2', ink2: '#bdae93', sage: '#fe8019', warm: '#fabd2f' },
    code: { light: 'gruvbox-light-medium', dark: 'gruvbox-dark-medium' },
  },
  {
    id: 'tokyonight',
    title: 'Tokyo Night',
    light: { bg: '#e1e2e7', card: '#e9e9ed', tile: '#dcdee6', ink: '#343b58', ink2: '#6172b0', sage: '#2e7de9', warm: '#c08a3e' },
    dark: { bg: '#1a1b26', card: '#1f2335', tile: '#24283b', ink: '#c0caf5', ink2: '#a9b1d6', sage: '#7aa2f7', warm: '#ff9e64' },
    code: { dark: 'tokyo-night' },
  },
  {
    id: 'nord',
    title: 'Nord',
    light: { bg: '#e5e9f0', card: '#eceff4', tile: '#e0e5ed', ink: '#2e3440', ink2: '#4c566a', sage: '#5e81ac', warm: '#c08a3e' },
    dark: { bg: '#2e3440', card: '#3b4252', tile: '#434c5e', ink: '#eceff4', ink2: '#d8dee9', sage: '#88c0d0', warm: '#ebcb8b' },
    code: { dark: 'nord' },
  },
  {
    id: 'catppuccin',
    title: 'Catppuccin',
    light: { bg: '#e6e9ef', card: '#eff1f5', tile: '#e9ecf1', ink: '#4c4f69', ink2: '#6c6f85', sage: '#179299', warm: '#c08a3e' },
    dark: { bg: '#1e1e2e', card: '#252536', tile: '#2a2b3d', ink: '#cdd6f4', ink2: '#a6adc8', sage: '#94e2d5', warm: '#fab387' },
    code: { light: 'catppuccin-latte', dark: 'catppuccin-mocha' },
  },
  {
    id: 'kanagawa',
    title: 'Kanagawa',
    light: { bg: '#f2ecbc', card: '#f8f4d8', tile: '#f1edd3', ink: '#545464', ink2: '#9b988c', sage: '#4d699b', warm: '#c08a3e' },
    dark: { bg: '#1f1f28', card: '#2a2a37', tile: '#32323d', ink: '#dcd7ba', ink2: '#9a9787', sage: '#7e9cd8', warm: '#e6c384' },
    code: { light: 'kanagawa-lotus', dark: 'kanagawa-wave' },
  },
  {
    id: 'solarized',
    title: 'Solarized',
    light: { bg: '#fdf6e3', card: '#fffbee', tile: '#f4f2e6', ink: '#073642', ink2: '#768c8a', sage: '#268bd2', warm: '#c08a3e' },
    dark: { bg: '#002b36', card: '#073642', tile: '#113e49', ink: '#eee8d5', ink2: '#9ba69d', sage: '#2aa198', warm: '#b58900' },
    code: { light: 'solarized-light', dark: 'solarized-dark' },
  },
  {
    id: 'ayu',
    title: 'Ayu',
    light: { bg: '#f8f9fa', card: '#ffffff', tile: '#f8f8f8', ink: '#5c6166', ink2: '#a2a5a9', sage: '#e8851a', warm: '#c08a3e' },
    dark: { bg: '#1f2430', card: '#242936', tile: '#2c303c', ink: '#cccac2', ink2: '#8f908f', sage: '#ffcc66', warm: '#ffad66' },
    code: { dark: 'ayu-dark' },
  },
  {
    id: 'everforest',
    title: 'Everforest',
    light: { bg: '#fdf6e3', card: '#fffbef', tile: '#f8f4e9', ink: '#5c6a72', ink2: '#a4a9a5', sage: '#8da101', warm: '#c08a3e' },
    dark: { bg: '#2d353b', card: '#343f44', tile: '#3b4549', ink: '#d3c6aa', ink2: '#999383', sage: '#a7c080', warm: '#dbbc7f' },
    code: { light: 'everforest-light', dark: 'everforest-dark' },
  },
  {
    id: 'flexoki',
    title: 'Flexoki',
    light: { bg: '#fffcf0', card: '#fffef8', tile: '#f4f3ee', ink: '#100f0f', ink2: '#7c7a74', sage: '#bc5215', warm: '#c08a3e' },
    dark: { bg: '#100f0f', card: '#1c1b1a', tile: '#242322', ink: '#cecdc3', ink2: '#8c8a84', sage: '#da702c', warm: '#d0a215' },
  },
  {
    id: 'monokai',
    title: 'Monokai',
    light: { bg: '#faf4f2', card: '#fffaf8', tile: '#f5f0ef', ink: '#29242a', ink2: '#878284', sage: '#e16032', warm: '#c08a3e' },
    dark: { bg: '#2d2a2e', card: '#363337', tile: '#3f3c40', ink: '#fcfcfa', ink2: '#b4b2b3', sage: '#ffd866', warm: '#fc9867' },
    code: { dark: 'monokai' },
  },
]

/** The three channels of a #rrggbb colour, 0 to 255. */
function channels(hex: string): [number, number, number] {
  const value = Number.parseInt(hex.slice(1), 16)

  return [(value >> 16) & 255, (value >> 8) & 255, value & 255]
}

/** The relative luminance (WCAG) of a colour. */
function luminance(hex: string): number {
  const [r, g, b] = channels(hex).map(channel => {
    const c = channel / 255

    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })

  return 0.2126 * (r ?? 0) + 0.7152 * (g ?? 0) + 0.0722 * (b ?? 0)
}

/** The contrast between two colours, 1 to 21. */
export function contrast(one: string, other: string): number {
  const [high, low] = [luminance(one), luminance(other)].sort((a, b) => b - a)

  return ((high ?? 0) + 0.05) / ((low ?? 0) + 0.05)
}

/** A colour part of the way between: `t` 0 is `from`, 1 is `to`. */
function mix(from: string, to: string, t: number): string {
  const a = channels(from)
  const b = channels(to)

  return `#${a
    .map((channel, index) => Math.round(channel + ((b[index] ?? 0) - channel) * t).toString(16).padStart(2, '0'))
    .join('')}`
}

// Muted text must read well on the page: below this threshold the app refuses the whole theme.
const MUTED_TARGET = 5.2

/**
 * The palette's muted text, moved toward the strong text just enough to read on the page. Some palettes (Kanagawa, Ayu,
 * Everforest) have a grey so pale that the app would not paint the theme.
 */
function readableMuted(mode: Mode): string {
  for (let step = 0; step <= 20; step += 1) {
    const candidate = mix(mode.ink2, mode.ink, step / 20)

    if (contrast(candidate, mode.bg) >= MUTED_TARGET) return candidate
  }

  return mode.ink
}

const BLOCKING = "Desktop won't paint"

/**
 * What makeColors makes of a palette: the colours for the app and the lines about contrast.
 * Where the app would refuse the theme because of the dark mode's text (in Everforest the text is too dim on the amber
 * that highlights comments), the text is lightened in small steps until the theme passes.
 */
export function buildPalette(palette: Palette): { theme: ThemeColors; problems: string[] } {
  let made = buildWith(palette, palette.dark.ink)

  for (let step = 1; step <= 6 && made.problems.some(line => line.startsWith(BLOCKING)); step += 1) {
    made = buildWith(palette, mix(palette.dark.ink, '#ffffff', step * 0.1))
  }

  return made
}

function buildWith(palette: Palette, darkInk: string): { theme: ThemeColors; problems: string[] } {
  const { light, dark } = palette

  return makeColors({
    label: palette.title,
    roles: { danger: RED, success: GREEN, pro: VIOLET },
    light: {
      roles: { accent: light.sage, warning: light.warm },
      gray: {
        anchors: {
          'surface-0': light.bg,
          'surface-1': light.card,
          'text-primary': light.ink,
          'text-muted': readableMuted(light),
        },
      },
    },
    dark: {
      // The green is dark: dark mode needs a lighter one, or the "success" texts cannot be read.
      roles: { accent: dark.sage, warning: dark.warm, success: GREEN_ON_DARK },
      gray: {
        // Panels and menus stay close to the page: lighter, the app does not paint coloured text on them.
        anchors: {
          'surface-0': dark.bg,
          'surface-1': mix(dark.bg, dark.card, 0.4),
          'surface-2': mix(dark.bg, dark.card, 0.7),
          'surface-3': mix(dark.bg, dark.card, 0.7),
          'text-primary': darkInk,
          'text-muted': readableMuted({ ...dark, ink: darkInk }),
        },
      },
    },
    ...(palette.code !== undefined && { codeTheme: palette.code }),
  })
}

const built = new Map<string, ThemeColors>()

/** A palette's colours, made the first time they are needed. */
export function colorsOf(palette: Palette): ThemeColors {
  const ready = built.get(palette.id)
  if (ready !== undefined) return ready
  const { theme } = buildPalette(palette)
  built.set(palette.id, theme)
  return theme
}

/** The line that would stop Desktop for this palette, if there is one. */
export function paletteFault(palette: Palette): string | undefined {
  try {
    return buildPalette(palette).problems.find(line => line.startsWith(BLOCKING))
  } catch (error) {
    return error instanceof Error ? error.message : String(error)
  }
}
