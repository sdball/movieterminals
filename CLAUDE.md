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

`public/assets/js/terminal.js` is the engine: a plain script (no modules, no
dependencies) that sets `window.Terminal`. Its header comment documents the
API. Each terminal page loads it, then its film's script, both with `defer`.
A film's script calls `Terminal.create({...})` with its prompt, commands,
and a fallback, then `t.boot(...)` with its opening.

- The command line is a real `<input>` inside `<form id="inputline">`, so
  phone keyboards, paste, and selection work. The page draws the block
  cursor (`#cursor`) at the caret; the browser's caret is transparent.
- Commands get `(t, args, line)`. A command or fallback can be async: the
  input line hides (but keeps focus, so a phone keyboard stays up) until it
  finishes. Use that with `t.sleep()` to pace output.
- `t.print(...lines)` prints each argument as a line. `""` is a blank line
  (`div.blank`, 1em tall), and an inline node gets its own `<p>`.
- Output can be paced with `t.type(lines, opts)`: a character at a time, or
  a line at a time with `by: "line"`. Any key or click while output runs
  skips to the end, and what was typed waits on the next line (type-ahead).
  With prefers-reduced-motion it prints at once. Use `t.sleep()` for
  dramatic pauses; a skip cuts those short too.
- `t.hold()` hides the command line and leaves the keyboard to the page
  (Alien's address matrix); `t.release()` brings it back.
- Alien boots to the address matrix: each address is a `<button
  class="entry">` with a roving tabindex, and `alien.js` handles the arrow
  keys. INTERFACE 2037 releases to the inquiry prompt; nothing types itself
  there (a decision, not an oversight). Other addresses show a readout from
  `READOUTS`. Escape on an empty prompt (`onEscape`) or ADDRESS MATRIX goes
  back.
- At the prompt Alien clears the screen on every command
  (`clearOnCommand`), lowercases input with a filter, answers through
  `say()` (teletype), and matches most queries as whole phrases in `SCRIPT`
  and `fallback()`, not by first word.
- `?run=COMMAND` (repeatable) runs commands after the opening, and the
  address then drops it; Alien skips the matrix for one. The reference
  pages link complete commands this way. History persists in localStorage
  under each film's `name`.
- Each film's script sets `window.term` to its terminal, which is handy in
  the console: `await term.submit("ship status")`.
- Tab completion is a hook: `onTab(t, before)` gets the line up to the
  caret and returns what it could become; the engine fills in one choice or
  what several share, and lists them on a second Tab (`showCompletions`).
  TRON completes commands, then paths, only in directories Alan can read
  (nothing inside /lab/laser). Alien has no hook yet.
- Keys: Enter submits (the form's submit, so a phone's send key works),
  Tab completes (with `onTab`), up/down walk history, Shift+up/down and
  Page Up/Down scroll, Ctrl+L clears, Ctrl+C abandons the line. Typing
  anywhere on the page goes to the command line, and a click on the screen
  focuses it.
- Before changing the engine, record each terminal's output for a list of
  commands and compare after; the screen's text is easy to read back from
  `#display` in the console.

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
