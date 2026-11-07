/*
  The terminal engine: a screen of output with a command line under it.

  A plain script, no modules and no dependencies. It sets window.Terminal,
  and a film's script makes its terminal with Terminal.create({...}).

  The command line is a real <input>, so phone keyboards, paste, selection,
  and the usual editing keys all work. The browser's caret is hidden and the
  page draws a block cursor at the caret instead, showing the letter under it
  in inverse. (The same approach as the Z-Machine Interpreter in the
  Cabinet of Curiosities.)

  Originally the xkcd CLI by Chromakode, after CLI2 by R. McFarland.

  ---------- Making a terminal ----------

    const t = Terminal.create({
      prompt: "\n$ ",            // text before the input; "\n" starts a new line
      commands: { ls(t, args, line) { ... } },  // looked up by the first word
      fallback(t, line) { ... return true },    // for lines no command took
      unrecognized: (name, line) => `${name}: command not found`,
      filters: [(line) => line.toLowerCase()],  // run on a line before parsing
      clearOnCommand: false,     // wipe the screen on each command (Alien)
      echo: true,                // print the prompt and command after Enter
      typingSpeed: 60,           // ms per character for t.run()
      cursor: "blink",           // or "steady"
    });
    t.boot(async (t) => { ... });  // runs once the screen has powered on

  A command may be async. While it runs the input line is hidden, and it
  comes back when the command finishes, so a command can pace its output:

    async command(t) { t.print("ONE"); await t.sleep(400); t.print("TWO"); }

  ---------- What a terminal can do ----------

    t.print(...lines)   each argument is a line: a string, "" for a blank
                        line, or a DOM node (inline nodes get a <p> of their own)
    t.el(tag, attrs, ...children)   make a DOM node
    t.clear()           wipe the screen
    t.run(text)         type text into the command line, then press Enter
    t.submit(text)      run a line as if it was typed (returns a promise)
    t.sleep(ms)         a promise that resolves after ms
    t.lock()            shut the terminal down for good
    t.setPrompt(text)
*/

(function () {
  "use strict";

  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const BLOCKS = new Set(["P", "DIV", "UL", "OL", "PRE", "TABLE", "H1", "H2", "H3", "H4"]);

  function el(tag, attrs, ...children) {
    const node = document.createElement(tag);
    if (typeof attrs === "string" || attrs instanceof Node) children.unshift(attrs);
    else if (attrs) {
      for (const [key, value] of Object.entries(attrs)) {
        if (key === "class") node.className = value;
        else node.setAttribute(key, value);
      }
    }
    for (const child of children.flat()) {
      if (child != null) node.append(child instanceof Node ? child : String(child));
    }
    return node;
  }

  function create(options) {
    const o = {
      prompt: "$ ",
      commands: {},
      fallback: null,
      unrecognized: (name) => `${name}: command not found`,
      filters: [],
      clearOnCommand: false,
      echo: true,
      typingSpeed: 50,
      cursor: "blink",
      ...options,
    };

    const screen = document.getElementById("screen");
    const display = document.getElementById("display");
    const form = document.getElementById("inputline");
    const lead = form.querySelector(".prompt-lead");
    const promptEl = form.querySelector(".prompt");
    const input = document.getElementById("command");
    const cursor = document.getElementById("cursor");

    // the built-in commands, which a film's own commands can replace
    const commands = {
      help(t) {
        t.print(el("h3", "help"), el("ul", null, Object.keys(commands).map((name) => el("li", name))));
      },
      clear(t) {
        t.clear();
      },
      ...o.commands,
    };

    const state = {
      prompt: "",
      ready: false,     // false until boot finishes, and while a command runs
      typing: false,    // t.run() is typing into the input
      locked: false,
      history: [],
      at: 0,            // where up/down is in the history
      draft: "",        // what was typed before walking the history
    };

    const t = {
      el,
      sleep,
      print,
      clear,
      run,
      submit,
      lock,
      setPrompt,
      boot,
      get input() { return input; },
    };

    // ---------- Output ----------

    function print(...lines) {
      if (!lines.length) lines = [""];
      for (const line of lines) {
        if (line instanceof Node) {
          display.append(line.nodeType === 1 && BLOCKS.has(line.tagName) ? line : el("p", null, line));
        } else if (line === "" || line == null) {
          display.append(el("div", { class: "blank" }));
        } else {
          display.append(el("p", null, String(line)));
        }
      }
      toBottom();
    }

    function clear() {
      display.replaceChildren();
    }

    function toBottom() {
      screen.scrollTop = screen.scrollHeight;
    }

    // ---------- The command line ----------

    // Lines before the last "\n" sit above the input; the last line is the
    // input's label, on the same line as what you type.
    function setPrompt(text) {
      state.prompt = text;
      const lines = text.split("\n");
      promptEl.textContent = lines.pop();
      lead.replaceChildren(...lines.map((line) => el("div", null, line || " ")));
    }

    // what the command line is doing: hidden (a command is running), typing
    // on its own (t.run), or waiting for you
    function setReady(ready) {
      state.ready = ready && !state.locked;
      form.classList.toggle("waiting", !state.ready && !state.typing);
      input.readOnly = !state.ready;
      queueCursor();
      toBottom();
    }

    function submit(text) {
      if (state.locked) return Promise.resolve();
      const line = text.trim();
      input.value = "";
      if (line && line !== state.history[state.history.length - 1]) state.history.push(line);
      state.at = state.history.length;
      state.draft = "";

      if (o.clearOnCommand) clear();
      else if (o.echo) display.append(el("p", { class: "command" }, state.prompt + text));
      if (!line) {
        toBottom();
        return Promise.resolve();
      }

      const filtered = o.filters.reduce((acc, filter) => filter(acc), line);
      const [name, ...args] = filtered.split(/\s+/);
      let result;
      try {
        if (Object.hasOwn(commands, name)) result = commands[name](t, args, filtered);
        else if (!(o.fallback && (result = o.fallback(t, filtered)))) print(o.unrecognized(name, filtered));
      } catch (error) {
        printError(error);
      }
      toBottom();
      if (!result || typeof result.then !== "function") return Promise.resolve();

      // an async command: hide the input until it's done
      setReady(false);
      return result.then(
        (value) => { if (value === false) print(o.unrecognized(name, filtered)); },
        printError,
      ).finally(() => setReady(true));
    }

    function printError(error) {
      console.error(error);
      print(el("p", { class: "error" }, `An internal error occurred: ${error}`));
    }

    // type text into the command line a letter at a time, then press Enter
    async function run(text) {
      state.typing = true;
      setReady(false);
      input.value = "";
      for (const ch of text) {
        await sleep(o.typingSpeed);
        input.value += ch;
        input.setSelectionRange(input.value.length, input.value.length);
        restartBlink();
        queueCursor();
      }
      await sleep(o.typingSpeed);
      state.typing = false;
      await submit(input.value);
      setReady(true);
    }

    function lock() {
      state.locked = true;
      setReady(false);
      screen.classList.add("locked");
    }

    // ---------- The cursor ----------
    // The page draws it: a block at the caret, showing the letter under it in
    // inverse, steady while you type and hidden for a selection.

    let cursorFrame = 0;
    function placeCursor() {
      cursorFrame = 0;
      const at = input.selectionStart ?? input.value.length;
      const end = input.selectionEnd ?? at;
      cursor.hidden = at !== end;
      if (cursor.hidden) return;
      cursor.textContent = input.value[at] || " ";
      const cell = cursor.getBoundingClientRect().width;
      const x = Math.max(0, Math.min(at * cell - input.scrollLeft, input.clientWidth - cell));
      cursor.style.transform = `translateX(${x}px)`;
    }

    function queueCursor() {
      if (!cursorFrame) cursorFrame = requestAnimationFrame(placeCursor);
    }

    // start each blink from on, so the cursor stays lit while you type
    function restartBlink() {
      cursor.style.animation = "none";
      void cursor.offsetWidth;
      cursor.style.animation = "";
    }

    for (const type of ["input", "keydown", "keyup", "focus", "blur", "pointerup", "select"]) {
      input.addEventListener(type, queueCursor);
    }
    input.addEventListener("input", restartBlink);
    document.addEventListener("selectionchange", queueCursor);
    addEventListener("resize", queueCursor);
    document.fonts?.ready.then(queueCursor);

    // ---------- Keys ----------

    // the form submits on Enter, including a phone keyboard's send key
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      if (state.ready) submit(input.value);
    });

    input.addEventListener("keydown", (e) => {
      // Shift+arrows and Page Up/Down scroll back through the output
      if ((e.shiftKey && (e.key === "ArrowUp" || e.key === "ArrowDown")) || e.key === "PageUp" || e.key === "PageDown") {
        e.preventDefault();
        const page = e.key.startsWith("Page") ? screen.clientHeight * 0.75 : parseFloat(getComputedStyle(screen).lineHeight) || 24;
        screen.scrollTop += (e.key === "ArrowUp" || e.key === "PageUp" ? -1 : 1) * page;
        return;
      }
      if (!state.ready) return;

      if (e.ctrlKey && !e.metaKey && !e.altKey) {
        // Ctrl+L clears the screen, Ctrl+C abandons the line
        if (e.key === "l") {
          e.preventDefault();
          clear();
          return;
        }
        if (e.key === "c" && input.selectionStart === input.selectionEnd) {
          e.preventDefault();
          if (!o.clearOnCommand) display.append(el("p", { class: "command" }, state.prompt + input.value + "^C"));
          input.value = "";
          state.at = state.history.length;
          toBottom();
          return;
        }
      }

      // walk back and forth through what you typed before
      if (e.key === "ArrowUp" || e.key === "ArrowDown") {
        e.preventDefault();
        const h = state.history;
        if (state.at === h.length) state.draft = input.value;
        state.at = Math.max(0, Math.min(h.length, state.at + (e.key === "ArrowUp" ? -1 : 1)));
        input.value = state.at === h.length ? state.draft : h[state.at];
        requestAnimationFrame(() => {
          input.setSelectionRange(input.value.length, input.value.length);
          queueCursor();
        });
      }
    });

    // typing anywhere on the page goes to the command line
    document.addEventListener("keydown", (e) => {
      if (e.target === input || e.metaKey || e.ctrlKey || e.altKey || e.key.length !== 1) return;
      if (e.target.closest?.("input, textarea, select, [contenteditable]")) return;
      input.focus({ preventScroll: true });
    });

    // a click on the screen goes to the command line, unless you're selecting text
    screen.addEventListener("click", () => {
      if (!String(getSelection())) input.focus({ preventScroll: true });
    });

    // keep the command line in sight when a phone's keyboard opens
    const vv = window.visualViewport;
    function fitViewport() {
      if (!vv) return;
      document.documentElement.style.setProperty("--viewport-height", `${vv.height}px`);
      if (document.activeElement === input) toBottom();
    }
    vv?.addEventListener("resize", fitViewport);
    input.addEventListener("focus", () => setTimeout(fitViewport, 300));

    // ---------- Boot ----------

    // wait for the font and the power-on, run the film's opening, then hand
    // over the keyboard
    async function boot(opening) {
      setReady(false);
      await Promise.race([document.fonts?.ready, sleep(1500)]);
      if (!reduceMotion.matches) await sleep(550);
      if (!matchMedia("(pointer: coarse)").matches) input.focus({ preventScroll: true });
      if (opening) await opening(t);
      setReady(true);
    }

    screen.dataset.cursor = o.cursor;
    form.hidden = false;
    setPrompt(o.prompt);
    setReady(false);
    return t;
  }

  window.Terminal = { create, el, sleep };
})();
