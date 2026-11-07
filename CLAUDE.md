# CLAUDE.md

Read README.md first. It covers the layout, running locally, and the checks.
This file covers what the README doesn't.

## Ground rules

- No build step, no dependencies, no package.json. Plain HTML, CSS, and JS in
  `public/`; scripts use only the standard library.
- Links are relative, so the site works at movieterminals.com and at
  sdball.github.io/movieterminals/ (where `href="/..."` would break).
  `scripts/check-links` enforces this, and CI runs it before deploying.
- Pushing to `main` deploys to GitHub Pages at movieterminals.com. The custom
  domain is set in the repo's Pages settings, not with a CNAME file.
- Earlier history includes Jekyll and fly.io versions of the site. The
  fly.io setup (Dockerfile, fly.toml) was replaced by GitHub Pages.

## Priorities

The terminals should look as good as possible on laptop-sized screens and up.
Phones should work but are second; don't trade desktop quality for them.

## The terminals

Each terminal page loads, in order: `vendor/jquery-1.4.2.js`,
`vendor/jquery.hotkeys.js`, `terminal.js` (the engine), then its film's script.
The film's script makes a shell with `Object.create(TerminalShell)`, sets
`Terminal.config` (prompt, colors, typing speed), and adds commands.

- `TerminalShell.commands` is one shared object, so commands a film adds also
  show up in the default `help`. Alien replaces `help`; TRON uses the default.
- Alien replaces `Terminal.processInputBuffer` to clear the screen on every
  command, the way the movie does, and lowercases input with a filter. Most of
  its commands are matched as whole phrases in `muthur.script.commands` and
  `muthur.fallback`, not by first word.
- `print("")` appends an empty `<div>`, and `terminal.css` gives a div a 1em
  bottom margin, so that's how blank lines happen. Keep that rule.
- The engine sets the cursor's colors inline from `Terminal.config.fg_color`
  and `bg_color`. Keep those matching the film's CSS tokens.
- jQuery 1.4.2 is old but works. Replacing it is in the idea list, not
  something to do in passing.

## Styles

- Terminals: `terminal.css` holds the layout and the CRT look (scanlines,
  vignette, glow, a power-on animation). A film's stylesheet only sets tokens
  on `:root` (`--phosphor`, `--glow`, `--font`, `--size`, ...) and adds its
  own tweaks.
- Lobby and references: `site.css`, with color tokens on `:root` and a dark
  theme under `prefers-color-scheme` and `[data-theme]`. Use the tokens, not
  literal colors. A film's accent comes from a `.alien` or `.tron` class.
- Respect `prefers-reduced-motion`: animations go inside
  `@media (prefers-reduced-motion: no-preference)`.

## Ideas

`todo/` and `completed/` are local only, ignored through `.git/info/exclude`.
See `todo/README.md`.

## Commits

Short imperative subjects in sentence case, no prefixes. Run
`scripts/check-links` before committing.
