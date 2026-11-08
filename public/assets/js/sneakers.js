/*
  Sneakers (1992): Janek's black box, on the team's bench.

  The page is a workbench. On the left, the team's monitor runs a probe
  monitor program; on the right is the open box. Drag the logic probe onto
  the pins of the big chip, U1 (or click a pin, or Tab to the chip and use
  the arrow keys), and the monitor shows what that pin reads in hex, the
  way Whistler reads it in the film. The team talks in the captions
  under the box, and Bishop works the letter tiles.

  Act 1, here: find the contact that makes the box talk. Most pins read as
  what they are (ground, power, a clock, address lines counting). The right
  side's pins mostly read "kind of like the same thing", and the one in the
  middle of them, pin 31, is the one: on it, the screen runs with formulas.
  Go past it to the next pin and Whistler wants it back; stay on it and the
  box is live. Act 2, Carl's black book and dialing out, comes next.

  window.term is the terminal, and window.bench the box:
  bench.touch(31) puts the probe on pin 31.
*/

(function () {
  "use strict";

  const { el, reduceMotion } = Terminal;
  const NS = "http://www.w3.org/2000/svg";
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const rand = (n) => Math.floor(Math.random() * n);
  const hex = (byte) => byte.toString(16).padStart(2, "0");

  function svg(tag, attrs = {}) {
    const node = document.createElementNS(NS, tag);
    for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
    return node;
  }

  // what has happened so far
  const story = {
    probes: 0,          // contacts made
    kinds: new Set(),   // kinds of pin Whistler has named
    keys: new Set(),    // the right side's pins that read alike
    sinceKeys: 0,       // contacts since finding the pins that read alike
    sawMagic: false,    // went from the decryption pin to another
    live: false,        // the box is talking
    said: new Set(),    // one-time lines already said
  };

  // ---------- The team ----------
  // Captions under the box, one at a time. say() queues lines (and pauses,
  // and things to do between them); chat() is for asides that can be
  // dropped when the team is already talking.

  const captions = document.getElementById("captions");
  let queue = Promise.resolve();
  let queued = 0;

  function caption(who, text) {
    for (const old of captions.querySelectorAll("p:not(.old)")) old.classList.add("old");
    captions.append(el("p", null, el("span", { class: "who" }, who), text));
    while (captions.children.length > 5) captions.firstElementChild.remove();
  }

  function say(...items) {
    queued++;
    queue = queue.then(async () => {
      for (const item of items) {
        if (typeof item === "number") await sleep(item);
        else if (typeof item === "function") await item();
        else {
          const [who, text] = item;
          caption(who, text);
          await sleep(900 + text.length * 40);
        }
      }
    }).finally(() => queued--);
    return queue;
  }

  const chat = (who, text) => (queued ? undefined : say([who, text]));

  function once(key, ...items) {
    if (story.said.has(key)) return;
    story.said.add(key);
    say(...items);
  }

  // ---------- Letter tiles ----------
  // SETEC ASTRONOMY in tiles, which Bishop pushes around into anagrams.

  const POINTS = { S: 1, E: 1, T: 1, C: 3, A: 1, R: 1, O: 1, N: 1, M: 3, Y: 4 };
  const tray = document.getElementById("tiles");
  const tiles = [..."SETECASTRONOMY"].map((letter) => {
    const tile = el("span", { class: "tile", "aria-hidden": "true" }, letter, el("sub", null, POINTS[letter]));
    tile.dataset.letter = letter;
    tray.append(tile);
    return tile;
  });
  let spelled = "SETEC ASTRONOMY"; // or null, scattered

  function tileSize() {
    return Math.max(18, Math.min(40, Math.floor(tray.clientWidth / 17)));
  }

  function place(tile, x, y, turn = 0) {
    tile.style.transform = `translate(${x}px, ${y}px) rotate(${turn}deg)`;
  }

  function arrange(phrase) {
    spelled = phrase;
    const size = tileSize();
    tray.style.setProperty("--tile", `${size}px`);
    const step = size * 1.06;
    const left = (tray.clientWidth - phrase.length * step) / 2;
    const free = [...tiles];
    [...phrase].forEach((letter, i) => {
      if (letter === " ") return;
      const tile = free.splice(free.findIndex((t) => t.dataset.letter === letter), 1)[0];
      place(tile, left + i * step, (tray.clientHeight - size) / 2, (Math.random() - 0.5) * 3);
    });
    tray.setAttribute("aria-label", `Letter tiles spelling ${phrase}`);
  }

  function scatter() {
    spelled = null;
    const size = tileSize();
    tray.style.setProperty("--tile", `${size}px`);
    const w = tray.clientWidth - size;
    const h = tray.clientHeight - size;
    for (const tile of tiles) place(tile, Math.random() * w, Math.random() * h, (Math.random() - 0.5) * 70);
    tray.setAttribute("aria-label", "Letter tiles, scattered: SETEC ASTRONOMY");
  }

  addEventListener("resize", () => (spelled ? arrange(spelled) : scatter()));

  // ---------- The chip ----------
  // U1 has 48 pins, 12 a side, numbered counterclockwise from the top left
  // the usual way: down the left (quadrant 1), along the bottom (2), up the
  // right (3), and back along the top (4).

  const CHIP = { x: 155, y: 130, size: 150, inset: 14.5, pitch: 11, leg: 14 };
  const FUNCTIONS = [
    ["ctrl", "RESET"], ...[0, 1, 2, 3, 4, 5, 6, 7].map((i) => ["addr", `A${i}`]),
    ["vcc", "VCC"], ["gnd", "GND"], ["clk", "CLK"],
    ...[0, 1, 2, 3, 4, 5, 6, 7].map((i) => ["data", `D${i}`]),
    ["ctrl", "RD"], ["ctrl", "WR"], ["vcc", "VCC"], ["gnd", "GND"],
    // the right side: the pin that matters, in the middle of eight that read alike
    ["gnd", "GND"], ["vcc", "VCC"], ...[0, 1, 2, 3].map((i) => ["key", `K${i}`]),
    ["magic", "?"], ...[4, 5, 6, 7].map((i) => ["key", `K${i}`]), ["sync", "SYNC"],
    ["nc", "NC"], ...[8, 9, 10, 11, 12, 13, 14, 15].map((i) => ["addr", `A${i}`]),
    ["ctrl", "INT"], ["ctrl", "CS"], ["nc", "NC"],
  ];

  const PINS = FUNCTIONS.map(([kind, name], i) => {
    const { x, y, size, inset, pitch, leg } = CHIP;
    const quad = Math.floor(i / 12) + 1;
    const k = i % 12;
    const pin = { n: i + 1, quad, kind, name };
    // where the leg sits, and where the probe touches it (near its outer end)
    if (quad === 1) Object.assign(pin, { cx: x - leg + 4, cy: y + inset + k * pitch, leg: [x - leg, y + inset + k * pitch - 2.5, leg, 5] });
    if (quad === 2) Object.assign(pin, { cx: x + inset + k * pitch, cy: y + size + leg - 4, leg: [x + inset + k * pitch - 2.5, y + size, 5, leg] });
    if (quad === 3) Object.assign(pin, { cx: x + size + leg - 4, cy: y + size - inset - k * pitch, leg: [x + size, y + size - inset - k * pitch - 2.5, leg, 5] });
    if (quad === 4) Object.assign(pin, { cx: x + size - inset - k * pitch, cy: y - leg + 4, leg: [x + size - inset - k * pitch - 2.5, y - leg, 5, leg] });
    return pin;
  });

  const board = document.getElementById("board");
  const pinLayer = document.getElementById("pins");
  for (const pin of PINS) {
    const [lx, ly, lw, lh] = pin.leg;
    const across = lw > lh; // a leg on the left or right side
    const hit = across
      ? { x: lx - 6, y: pin.cy - CHIP.pitch / 2, width: lw + 12, height: CHIP.pitch }
      : { x: pin.cx - CHIP.pitch / 2, y: ly - 6, width: CHIP.pitch, height: lh + 12 };
    pin.node = svg("g", { class: "pin", tabindex: pin.n === 1 ? "0" : "-1", role: "button", "aria-label": `Pin ${pin.n}, quadrant ${pin.quad}` });
    pin.node.append(svg("rect", { class: "leg", x: lx, y: ly, width: lw, height: lh, rx: 1 }), svg("rect", { class: "hit", ...hit }));
    pin.node.dataset.n = pin.n;
    pinLayer.append(pin.node);
  }

  // the daughterboard's lights, blinking away
  const lights = document.getElementById("lights");
  for (let row = 0; row < 6; row++) {
    for (let col = 0; col < 8; col++) {
      const light = svg("circle", { cx: 374 + col * 12, cy: 252 + row * 14, r: 3 });
      if (Math.random() < 0.45) light.classList.add("on");
      light.style.setProperty("--delay", `${(-Math.random() * 2).toFixed(2)}s`);
      light.style.setProperty("--rate", `${(1 + Math.random() * 1.6).toFixed(2)}s`);
      lights.append(light);
    }
  }

  // ---------- What a pin reads ----------
  // Four rows of 8 bytes, each byte 8 samples of the pin, newest bit last.
  // The decryption pin reads no rows: it fills the screen with formulas.

  const KEY = [0x3a, 0x91, 0xc4, 0x5e, 0x0b, 0x77, 0xe2, 0x18, 0x6d, 0xa5, 0x2f, 0xd0, 0x84, 0x49, 0xbe, 0x13];
  const ROWS = 4;

  const row = (f) => Array.from({ length: 8 }, (_, i) => f(i));
  const rows = (f) => Array.from({ length: ROWS }, (_, r) => f(r));

  function reading(pin) {
    const bit = +pin.name.slice(1);
    switch (pin.kind) {
      case "gnd": return rows(() => row(() => 0x00));
      case "vcc": return rows(() => row(() => 0xff));
      case "nc": return rows(() => row(() => rand(256)));
      case "clk": {
        const byte = Math.random() < 0.5 ? 0x55 : 0xaa;
        return rows(() => row(() => byte));
      }
      case "addr": {
        // a counter's bit: 55 for A0, 33 for A1, 0f for A2, then runs
        const base = rand(1 << 16);
        return rows((r) => row((i) => {
          let byte = 0;
          for (let s = 0; s < 8; s++) byte = (byte << 1) | (((base + (r * 8 + i) * 8 + s) >> bit) & 1);
          return byte;
        }));
      }
      case "data": return rows(() => row(() => rand(256)));
      case "ctrl": return rows(() => row(() => (Math.random() < 0.25 ? 0xff & ~(1 << rand(8)) : 0xff)));
      case "sync": return rows(() => {
        const at = rand(8);
        return row((i) => (i === at ? 0x80 : 0x00));
      });
      case "key": {
        // the same sixteen bytes on every pin, each a step further along
        const turned = KEY.slice(bit).concat(KEY.slice(0, bit));
        return rows((r) => turned.slice((r % 2) * 8, (r % 2) * 8 + 8));
      }
    }
    return [];
  }

  // which of the probe's lights come on
  function lightsFor(pin, eights) {
    if (pin.kind === "magic") return ["hi", "lo", "pulse"];
    if (pin.kind === "nc") return [];
    const bytes = eights.flat();
    if (bytes.every((b) => b === 0)) return ["lo"];
    if (bytes.every((b) => b === 0xff)) return ["hi"];
    return ["pulse"];
  }

  // ---------- The monitor ----------

  const status = document.getElementById("status");
  const display = document.getElementById("display");

  // As in the film, the screen shows the pin under the probe and nothing
  // else, typed out fast, a character at a time (about a row every quarter
  // second). A new contact starts over.
  const ROW_CPS = 150;
  let typing = 0;

  function showRows(pin, bytes) {
    stopOutput();
    t.clear();
    const lines = bytes.map((eight, i) => {
      const at = `0075:${(0x1050 + i * 8).toString(16).padStart(4, "0")}`;
      return `${at}  ${eight.slice(0, 4).map(hex).join(" ")}  ${eight.slice(4).map(hex).join(" ")}`;
    });
    if (reduceMotion.matches) {
      t.print(...lines.map((line) => el("p", { class: "row" }, line)));
      return;
    }
    const start = performance.now();
    let node = null;
    let at = 0; // characters shown so far, across the rows
    const total = lines.reduce((sum, line) => sum + line.length, 0);
    const frame = (now) => {
      const due = Math.min(total, Math.floor(((now - start) * ROW_CPS) / 1000));
      for (; at < due; at++) {
        let i = at;
        let r = 0;
        while (i >= lines[r].length) i -= lines[r++].length;
        if (i === 0) display.append((node = el("p", { class: "row" })));
        node.textContent += lines[r][i];
      }
      typing = at < total ? requestAnimationFrame(frame) : 0;
    };
    typing = requestAnimationFrame(frame);
  }

  // the decryption pin: formulas, scrolling for as long as the probe is on
  // it, the way the film's screen runs (from its close-up)
  const FORMULAS = [
    "cab=(1625.443)*f", "o=q146r4", "o=q146mr4", "pl=(2.33)*123/112", "epo=76ac891/3", "epo=76ac89",
    "bl+rjg-(fg+78a)=q143.6+ap", "bl+rjg-(frj-(", "mnop=fred/14cb", "9eac/112=32#11", "cap=dw", "ud=pac",
    "oolp=ca[b]", "dsr0-s", "ncp=pas", "56t=q{ab*cd}", "3kwlj=dkjl", "ac=q146.67123", "anmp=90-13=(13",
    "g cao=[de]", "e11,13,53=q134w", "1,13,53=q134.998a", "67.8/1124ap[des]", "dqert=00x", "c=q146.67123",
    "o=[a]", "blac=ploo", "cab=(1", "asiu",
  ];
  const WIDE = 34; // the film's block is about a third of the screen across
  const LINES_PER_SECOND = 40;

  // a few tokens at the left, one pushed toward the right, and whatever
  // runs past the edge cut off
  function formulaLine() {
    const pick = () => FORMULAS[rand(FORMULAS.length)];
    const left = Array.from({ length: 1 + rand(3) }, pick).join("  ");
    const right = pick();
    const gap = Math.max(2, WIDE - left.length - right.length + rand(7) - 2);
    return el("p", { class: "junk" }, (left + " ".repeat(gap) + right).slice(0, WIDE));
  }

  let noise = 0;
  function startNoise() {
    stopOutput();
    t.clear();
    if (reduceMotion.matches) {
      // a screenful that holds still
      t.print(...Array.from({ length: 24 }, formulaLine));
      return;
    }
    const start = performance.now();
    let shown = 0;
    const frame = (now) => {
      const due = Math.floor(((now - start) * LINES_PER_SECOND) / 1000) + 1;
      if (due > shown) {
        t.print(...Array.from({ length: due - shown }, formulaLine));
        shown = due;
        while (display.children.length > 80) display.firstElementChild.remove();
      }
      noise = requestAnimationFrame(frame);
    };
    noise = requestAnimationFrame(frame);
  }

  // stop whatever the screen is in the middle of
  function stopOutput() {
    cancelAnimationFrame(noise);
    cancelAnimationFrame(typing);
    noise = typing = 0;
  }

  // ---------- The probe ----------

  const probe = document.getElementById("probe");
  const cable = document.getElementById("cable");
  const ANGLE = 28;
  const LENGTH = 242;
  const HOME = { x: 300, y: 456 };
  const SNAP = 8;
  const tip = { ...HOME };
  let contact = null;   // the pin the probe is on
  let current = null;   // the last pin touched, for next and back
  let dwell = 0;

  // held over the board, the probe leans at ANGLE; set down on the table
  // below it, it lies nearly flat
  function draw(x, y) {
    tip.x = x;
    tip.y = y;
    const angle = ANGLE - Math.max(0, Math.min(1, (y - 400) / 40)) * (ANGLE - 4);
    probe.setAttribute("transform", `translate(${x} ${y}) rotate(${angle})`);
    const a = (angle * Math.PI) / 180;
    const ex = x + Math.cos(a) * LENGTH;
    const ey = y + Math.sin(a) * LENGTH;
    cable.setAttribute("d", `M${ex} ${ey} Q${ex + Math.cos(a) * 70} ${ey + Math.sin(a) * 70} 700 ${Math.max(ey + 40, 540)}`);
  }

  function nearest(x, y) {
    let best = null;
    let bestDistance = SNAP;
    for (const pin of PINS) {
      const d = Math.hypot(pin.cx - x, pin.cy - y);
      if (d < bestDistance) [best, bestDistance] = [pin, d];
    }
    return best;
  }

  function setLights(on, wild = false) {
    for (const led of probe.querySelectorAll(".led")) led.classList.toggle("on", on.some((name) => led.classList.contains(name)));
    probe.classList.toggle("wild", wild);
  }

  // the probe lands on a pin, or comes off one
  function touch(pin) {
    if (pin === contact) return;
    const was = contact;
    contact = pin;
    was?.node.classList.remove("touched");
    if (was) lifted(was);
    if (!pin) return;
    const before = current;
    current = pin;
    pin.node.classList.add("touched");
    for (const other of PINS) other.node.tabIndex = other === pin ? 0 : -1;
    landed(pin, before);
  }

  function landed(pin, before) {
    status.textContent = `PIN ${String(pin.n).padStart(2, "0")}  QUAD ${pin.quad}`;
    const bytes = reading(pin);
    setLights(lightsFor(pin, bytes), pin.kind === "magic");
    if (pin.kind === "magic") startNoise();
    else showRows(pin, bytes);
    story.probes++;
    if (story.live) return;

    // stay on it, and it dawns on them; move on, and Whistler wants it back
    if (pin.kind === "magic") {
      dwell = setTimeout(goLive, story.sawMagic ? 1500 : 2500);
      return;
    }
    if (before?.kind === "magic" && !story.sawMagic) {
      story.sawMagic = true;
      say(["WHISTLER", "Whoa. What was that? Go back one."]);
      return;
    }
    if (pin.kind === "key") {
      story.keys.add(pin.n);
      const found = story.keys.size;
      if (found === 1) once("stay", ["WHISTLER", "Hold on. Stay in that quadrant."]);
      if (found === 2) once("same", ["WHISTLER", "It's kind of like the same thing."]);
    } else if (!story.kinds.has(pin.kind)) {
      story.kinds.add(pin.kind);
      chat("WHISTLER", FIRST_READ[pin.kind]);
    }
    if (story.keys.size) story.sinceKeys++;

    if (story.probes === 3 && !story.keys.size) once("one more", ["WHISTLER", "Give me another one."]);
    if (story.probes === 5) socrates();
    if (story.probes >= 14 && !story.keys.size) once("nudge", ["WHISTLER", "Work your way around to the right side, Mother."]);
    if (story.sinceKeys >= 8) once("middle", ["WHISTLER", "Somewhere in the middle of that row, Mother."]);
  }

  function lifted(pin) {
    status.textContent = "NO CONTACT";
    setLights([]);
    clearTimeout(dwell);
    cancelAnimationFrame(noise);
  }

  const FIRST_READ = {
    gnd: "Ground. Nothing there.",
    vcc: "That's just power.",
    clk: "Clock. Ticking along.",
    addr: "It's counting. Address line.",
    data: "Data. Noise, mostly.",
    ctrl: "High, with a blip now and then. Some kind of strobe.",
    nc: "Nothing. It's floating.",
    sync: "A pulse, every so often.",
  };

  // move the probe to a pin, gliding there unless motion is reduced
  let glide = 0;
  function goTo(pin) {
    cancelAnimationFrame(glide);
    if (contact && contact !== pin) touch(null);
    const from = { ...tip };
    const ms = reduceMotion.matches ? 0 : 200;
    const start = performance.now();
    return new Promise((resolve) => {
      const stepFrame = (now) => {
        const k = ms ? Math.min(1, (now - start) / ms) : 1;
        const ease = 1 - (1 - k) ** 3;
        draw(from.x + (pin.cx - from.x) * ease, from.y + (pin.cy - from.y) * ease);
        if (k < 1) glide = requestAnimationFrame(stepFrame);
        else {
          touch(pin);
          resolve();
        }
      };
      glide = requestAnimationFrame(stepFrame);
    });
  }

  const pinAt = (n) => PINS[((n - 1) % 48 + 48) % 48];
  const step = (by) => goTo(current ? pinAt(current.n + by) : PINS[0]);

  // dragging the probe
  let drag = null;

  function toBoard(e) {
    const point = new DOMPoint(e.clientX, e.clientY).matrixTransform(board.getScreenCTM().inverse());
    return { x: point.x, y: point.y };
  }

  probe.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    cancelAnimationFrame(glide);
    const p = toBoard(e);
    drag = { dx: p.x - tip.x, dy: p.y - tip.y };
    probe.setPointerCapture(e.pointerId);
    board.classList.add("dragging");
  });

  probe.addEventListener("pointermove", (e) => {
    if (!drag) return;
    const p = toBoard(e);
    const x = Math.max(10, Math.min(630, p.x - drag.dx));
    const y = Math.max(10, Math.min(494, p.y - drag.dy));
    const pin = nearest(x, y);
    draw(pin ? pin.cx : x, pin ? pin.cy : y);
    touch(pin);
  });

  for (const kind of ["pointerup", "pointercancel"]) {
    probe.addEventListener(kind, () => {
      drag = null;
      board.classList.remove("dragging");
    });
  }

  // clicking a pin, or the arrow keys on one
  pinLayer.addEventListener("click", (e) => {
    const node = e.target.closest(".pin");
    if (node) goTo(pinAt(+node.dataset.n));
  });

  // the arrow keys follow the side you're on: down the left, along the
  // bottom, up the right, back along the top
  const AHEAD = { 1: "ArrowDown", 2: "ArrowRight", 3: "ArrowUp", 4: "ArrowLeft" };
  const BEHIND = { 1: "ArrowUp", 2: "ArrowLeft", 3: "ArrowDown", 4: "ArrowRight" };

  pinLayer.addEventListener("keydown", (e) => {
    const node = e.target.closest(".pin");
    if (!node) return;
    const pin = pinAt(+node.dataset.n);
    let to = null;
    if (e.key === AHEAD[pin.quad]) to = pinAt(pin.n + 1);
    else if (e.key === BEHIND[pin.quad]) to = pinAt(pin.n - 1);
    else if (e.key === "Home") to = PINS[0];
    else if (e.key === "End") to = PINS[47];
    else if (e.key === "Enter" || e.key === " ") {
      // keep Space from going to the command line
      e.preventDefault();
      e.stopPropagation();
      if (contact === pin) touch(null);
      goTo(pin);
      return;
    } else return;
    e.preventDefault();
    to.node.focus();
    goTo(to);
  });

  // ---------- The box talks ----------

  function goLive() {
    if (story.live) return;
    story.live = true;
    board.classList.add("live");
    say(
      ["WHISTLER", "Holy cow."],
      ["MOTHER", "What the hell is this?"],
      600,
      () => arrange("TOO MANY SECRETS"),
      1400,
      () => { document.title = "TOO MANY SECRETS · Sneakers | Movie Terminals"; },
      ["BISHOP", "Too many secrets."],
      ["WHISTLER", "Bish, I think you better come over here."],
    );
  }

  function socrates() {
    once("socrates",
      () => arrange("MY SOCRATES NOTE"),
      1200,
      ["BISHOP", "How about my Socrates note?"],
      ["CARL", "No."],
      ["MOTHER", "Uh-uh."],
      1500,
      () => { if (!story.live) scatter(); },
    );
  }

  // ---------- Commands ----------

  const commands = {
    help(t) {
      t.print(
        "PROBE MONITOR 2.1",
        "",
        "  Touch the probe to a pin on U1: drag it there, click a pin,",
        "  or Tab to the chip and use the arrow keys.",
        "",
        "  next      the next pin (ALT-N)",
        "  back      the pin before",
        "  pin N     pin N, 1 to 48",
        "  quad N    the first pin of quadrant N, 1 to 4",
        "  reboot    clear the screen (ALT-R)",
        "",
      );
    },
    next: () => step(1),
    back: () => step(-1),
    pin(t, [n]) {
      if (!(+n >= 1 && +n <= 48)) return t.print("PIN 1 TO 48");
      return goTo(pinAt(+n));
    },
    quad(t, [n]) {
      if (!(+n >= 1 && +n <= 4)) return t.print("QUAD 1 TO 4");
      return goTo(pinAt((n - 1) * 12 + 1));
    },
    reboot(t) {
      stopOutput();
      t.clear();
    },
  };
  commands.clear = commands.reboot;

  // what the team says in the film works too
  const PHRASES = {
    "give me another one": () => step(1),
    "give me another": () => step(1),
    "another one": () => step(1),
    "go back one": () => step(-1),
    "go back": () => step(-1),
    "back one": () => step(-1),
    "try another quadrant": () => goTo(pinAt(current ? Math.ceil(current.n / 12) * 12 + 1 : 1)),
    "another quadrant": () => goTo(pinAt(current ? Math.ceil(current.n / 12) * 12 + 1 : 1)),
    "stay in that quadrant": () => goTo(current ? pinAt(current.n % 12 === 0 ? current.n - 11 : current.n + 1) : PINS[0]),
  };

  function fallback(t, line) {
    if (Object.hasOwn(PHRASES, line)) return PHRASES[line]() || true;
    return false;
  }

  // ---------- The terminal ----------

  const t = Terminal.create({
    prompt: "> ",
    commands,
    fallback,
    unrecognized: () => "Bad command or file name",
    filters: [(line) => line.toLowerCase().replace(/[.,!?]/g, "").replace(/\s+/g, " ").trim()],
    cps: 120,
    name: "sneakers",
  });
  window.term = t;
  window.bench = { touch: (n) => goTo(pinAt(n)), lift: () => touch(null), story };

  // the footer's keys, by click or by key
  const ACTIONS = {
    next: () => step(1),
    reboot: () => commands.reboot(t),
    help: () => commands.help(t),
  };

  document.getElementById("keys").addEventListener("click", (e) => {
    const button = e.target.closest("button[data-action]");
    if (button) ACTIONS[button.dataset.action]();
  });

  document.addEventListener("keydown", (e) => {
    let action = null;
    if (e.altKey && !e.ctrlKey && !e.metaKey && e.code === "KeyN") action = "next";
    else if (e.altKey && !e.ctrlKey && !e.metaKey && e.code === "KeyR") action = "reboot";
    else if (e.key === "F1") action = "help";
    if (!action) return;
    e.preventDefault();
    ACTIONS[action]();
  });

  // ---------- The opening ----------

  draw(HOME.x, HOME.y);
  arrange("SETEC ASTRONOMY");

  t.boot(async (t) => {
    say(["WHISTLER", "Carl, could you get me some cable and an I/O interface, please?"]);
    await t.type([
      "PROBE MONITOR 2.1",
      "",
      "I/O INTERFACE ........ OK",
      "CABLE ................ OK",
      "DEVICE ............... NO RESPONSE",
      "",
      "SEG 0075  READY FOR PROBE",
      "",
    ], { by: "line", lineDelay: 260 });
    say(
      ["WHISTLER", "All right, Mother. Start anywhere on the big chip."],
      () => scatter(),
      1800,
      () => arrange("MONTEREYS COAST"),
      1200,
      ["BISHOP", "Monterey's coast. Does Monterey's coast mean anything to you guys?"],
      ["ALL", "No."],
      1500,
      () => { if (!story.live) scatter(); },
    );
  });
})();
