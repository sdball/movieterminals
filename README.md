# Movie Terminals

Play with recreations of the computer terminals from famous movies:

- **Alien (1979)**: query MU-TH-UR 6000, the Nostromo's computer, through Interface 2037.
- **TRON (1982)**: sit at Alan's ENCOM terminal and try to start the Tron program.

It's a static site: plain HTML, CSS, and JavaScript in `public/`, with no build
step. Pushing to `main` deploys `public/` to GitHub Pages at
[movieterminals.com](https://movieterminals.com/).

## Running locally

```sh
scripts/serve          # http://localhost:8030/
scripts/serve 9000     # or another port
scripts/serve --list   # local Python servers still running
```

With [direnv](https://direnv.net/), `.envrc` puts `scripts/` on your `PATH`, so
`serve` works from anywhere in the repo.

## Layout

```
public/
  index.html                 the lobby
  alien/index.html           the Alien terminal
  alien/reference/           its command reference
  tron-alan/index.html       Alan's terminal from TRON
  tron-alan/reference/       its command reference
  assets/css/site.css        the lobby and the references
  assets/css/terminal.css    shared by the terminals: layout and the CRT look
  assets/css/alien.css       one film's tokens and tweaks
  assets/css/tron-alan.css
  assets/js/vendor/          jQuery 1.4.2 and the jQuery Hotkeys plugin
  assets/js/terminal.js      the terminal engine (keyboard, history, printing)
  assets/js/alien.js         one film's commands
  assets/js/tron-alan.js
scripts/
  serve                      serve public/ locally
  check-links                fail on broken or root-absolute links
```

## Checks

```sh
scripts/check-links
```

CI runs it before each deploy. Every link must be relative, so the site works
at movieterminals.com and at sdball.github.io/movieterminals/, where a link
like `/assets/...` breaks.

## Credits

The terminal engine is the xkcd CLI by [Chromakode](https://chromakode.com),
a jQuery rewrite of CLI2 by Rod McFarland. *Alien* © 20th Century Fox.
*TRON* © Walt Disney Productions.
