// palettes-for-claude-code: modified from theme-examples (Anthropic, Apache-2.0) on 2026-11-20 to add the palette choice.
export type ThemeChoice = {
  /** The animated backdrop the session shows, by its own choice or the project's; absent, none. */
  applied?: string
  /** The palette that colours the app, by the session's or the project's choice; absent, none. */
  palette?: string
  /**
   * Whose choice the backdrop and palette are: the session's or the project's. The session's stays at every later
   * start; the others follow the project.
   */
  scope?: 'session' | 'project'
  /** A backdrop or palette on trial, until it is applied or the trial ends. */
  preview?: string
  /** The card sits above the prompt: the surface does not draw placed rows yet. */
  cardInBand?: boolean
  /** The placed card has been closed: whoever draws it passes until the command opens it again. */
  cardAway?: boolean
}

declare module 'claude-code' {
  interface PluginState {
    'palettes-for-claude-code': { choice: Shaped<ThemeChoice> }
  }
}
