# palettes-for-claude-code

Eleven classic editor palettes for the Code tab of the Claude desktop app: Rosé Pine, Gruvbox, Tokyo Night, Nord, Catppuccin, Kanagawa, Solarized, Ayu, Everforest, Flexoki and Monokai, each with a light and a dark variant. The 20 animated backdrops of Anthropic's `theme-examples` come along, and a palette and a backdrop can be combined.

## Install

At the prompt of a terminal session:

```
/plugin install palettes-for-claude-code --marketplace JonathanSanthanam/palettes-for-claude-code
```

Answer `y` to add the marketplace, then pick a scope (user scope loads it in every session).

From a shell:

```
claude plugin install palettes-for-claude-code --marketplace JonathanSanthanam/palettes-for-claude-code
```

In the desktop app, where `/plugin` does not run: click + next to the prompt box, then Plugins, Add marketplace with `JonathanSanthanam/palettes-for-claude-code`, then Add plugin.

It uses the same `/custom-theme` command as `theme-examples`, so uninstall that one first:

```
claude plugin uninstall theme-examples@claude-plugins-official
```

Needs a Claude Code build with mods (function-hook plugins) and the desktop app's Code tab for the colours.

## Use

- `/custom-theme` opens a card listing every palette, with a light and a dark swatch, and every backdrop. Each row has **Apply** (this project), **This session only**, and **Try** (20 seconds).
- `/custom-theme nord` applies a palette or a backdrop by name; add `session` as the last word to keep it to this session (`/custom-theme rose pine session`).
- `/custom-theme list` names them all; `/custom-theme off` removes everything.
- `/fireworks` is kept from `theme-examples`.

The mod stores only the names you pick, per project and per session.

## Credits and licence

A modified copy of Anthropic's [`theme-examples`](https://github.com/anthropics/claude-plugins-official/tree/main/plugins/theme-examples) (Apache-2.0): the palettes, the combined palette-and-backdrop choice and the card were added; see `NOTICE`. The palette names and colours belong to their original projects (Rosé Pine, Gruvbox, Tokyo Night, Nord, Catppuccin, Kanagawa, Solarized, Ayu, Everforest, Flexoki, Monokai); muted text and dark surfaces were adjusted so the app paints every variant with enough contrast. Licensed under Apache-2.0, see `LICENSE`.
