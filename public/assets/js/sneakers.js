/*
  Sneakers (1992): Janek's black box, on the team's bench.

  The page is a workbench. On the left, the team's monitor runs a probe
  monitor program; on the right is the open box. Drag the logic probe onto
  the pins of the big chip, U1 (or click a pin, or Tab to the chip and use
  the arrow keys), and the monitor shows what that pin reads in hex, the
  way Whistler reads it in the film. The team talks in the captions
  under the box, and Bishop works the letter tiles.

  Act 1, here: find the contact that makes the box talk. Most pins read as
  what they are (ground, power, a clock, address lines counting). One side's
  pins mostly read "kind of like the same thing", and one in the middle of
  them is the decryption pin: on it, the screen runs with formulas. Go past
  it to the next pin and Whistler wants it back; stay on it and the box is
  live. Which side, and where on it, is settled by the first pin you touch:
  the side opposite, so you go through two others on the way, either way
  around.

  Act 2: once the box talks, Carl's little black book opens under it.
  Dial a number from it (click it, or type it, bare or as ATDT 7035550142)
  and the monitor connects to the far end's screen, encrypted. Put the
  probe back on the decryption pin and the screen churns into the clear:
  the Federal Reserve's transfer node, the New England power grid, Bay
  Area air traffic control, each as the film shows it. The team won't let
  you touch anything. Hang up on air traffic control (Escape, ATH, "turn
  it off") and the scene ends.

  window.term is the terminal, and window.bench the box:
  bench.touch(n) puts the probe on pin n, bench.decryption is the pin
  once it's been placed, bench.live() skips ahead to the box talking, and
  bench.link is the call in progress.
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
    keys: new Set(),    // the pins that read alike
    sinceKeys: 0,       // contacts since finding the pins that read alike
    quad: 0,            // the quadrant probed last
    inQuad: 0,          // contacts in a row in that quadrant
    sawMagic: false,    // went from the decryption pin to another
    live: false,        // the box is talking
    said: new Set(),    // one-time lines already said
    cracked: new Set(), // the places decrypted so far: fed, grid, atc
  };

  // ---------- The team ----------
  // Captions under the box, one at a time. say() queues lines (and pauses,
  // and things to do between them); chat() is for asides that can be
  // dropped when the team is already talking. A line is [who, text], and
  // its text can be an array of strings and nodes. A function in the queue
  // runs when its turn comes, and if it returns a line, that's said: a line
  // that only makes sense if things haven't moved on.

  const captions = document.getElementById("captions");
  let queue = Promise.resolve();
  let queued = 0;

  function caption(who, text) {
    for (const old of captions.querySelectorAll("p:not(.old)")) old.classList.add("old");
    captions.append(el("p", null, el("span", { class: "who" }, who), el("span", null, text)));
    while (captions.children.length > 5) captions.firstElementChild.remove();
  }

  async function speak([who, text]) {
    caption(who, text);
    const length = [text].flat().reduce((sum, part) => sum + (part.textContent ?? part).length, 0);
    await sleep(900 + length * 40);
  }

  function say(...items) {
    queued++;
    queue = queue.then(async () => {
      for (const item of items) {
        if (typeof item === "number") await sleep(item);
        else if (typeof item === "function") {
          const line = await item();
          if (Array.isArray(line)) await speak(line);
        } else await speak(item);
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
  const SIDES = { 1: "left", 2: "bottom", 3: "right", 4: "top" };
  const range = (from, to) => Array.from({ length: to - from + 1 }, (_, i) => from + i);

  // what each side carries, in order around the chip; the key side is the
  // one that matters, its decryption pin set among the eight that read alike
  function sides() {
    const keys = range(0, 7).map((i) => ["key", `K${i}`]);
    keys.splice(1 + rand(7), 0, ["magic", "?"]); // never first or last of them
    return [
      [["ctrl", "RESET"], ...range(0, 7).map((i) => ["addr", `A${i}`]), ["vcc", "VCC"], ["gnd", "GND"], ["clk", "CLK"]],
      [...range(0, 7).map((i) => ["data", `D${i}`]), ["ctrl", "RD"], ["ctrl", "WR"], ["vcc", "VCC"], ["gnd", "GND"]],
      [["gnd", "GND"], ["vcc", "VCC"], ...keys, ["sync", "SYNC"]],
      [["nc", "NC"], ...range(8, 15).map((i) => ["addr", `A${i}`]), ["ctrl", "INT"], ["ctrl", "CS"], ["nc", "NC"]],
    ];
  }
  const KEY_SIDE = 2; // its place in sides()

  // Nothing's wired until the first contact: then the key side goes
  // opposite it, and the others follow around in order.
  let keyQuad = 0;
  function wire(first) {
    keyQuad = ((first + 1) % 4) + 1;
    const layout = sides();
    const turn = keyQuad - 1 - KEY_SIDE;
    for (const pin of PINS) {
      const [kind, name] = layout[(((pin.quad - 1 - turn) % 4) + 4) % 4][(pin.n - 1) % 12];
      Object.assign(pin, { kind, name });
    }
  }

  const PINS = range(0, 47).map((i) => {
    const { x, y, size, inset, pitch, leg } = CHIP;
    const quad = Math.floor(i / 12) + 1;
    const k = i % 12;
    const pin = { n: i + 1, quad, kind: null, name: "" };
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
  const WIDE = 40; // about half the screen across
  const LINES_PER_SECOND = 40;

  // a few tokens at the left, one pushed toward the right, and whatever
  // runs past the edge cut off
  function formulaLine() {
    const pick = () => FORMULAS[rand(FORMULAS.length)];
    const left = Array.from({ length: rand(5) ? 2 + rand(2) : 1 }, pick).join("  ");
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
    if (!keyQuad) wire(pin.quad);
    showStatus();
    const bytes = reading(pin);
    setLights(lightsFor(pin, bytes), pin.kind === "magic");
    // on a call, the screen is the far end's
    if (link || dialing) return onTheLine(pin);
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

    // too long in a quadrant with nothing in it, and Whistler wants another
    if (pin.quad !== story.quad) [story.quad, story.inQuad] = [pin.quad, 0];
    story.inQuad++;
    if (pin.quad !== keyQuad && story.inQuad === 5) say(["WHISTLER", "Try another quadrant."]);

    if (story.probes === 3 && !story.keys.size) once("one more", ["WHISTLER", "Give me another one."]);
    // Bishop tries an anagram every so often while the probing goes on
    if (story.probes === ANAGRAM_AT[0]) anagram("monterey");
    if (story.probes === ANAGRAM_AT[1]) anagram("socrates");
    if (story.probes >= 14 && !story.keys.size) once("nudge", ["WHISTLER", `Work your way around to the ${SIDES[keyQuad]} side, Mother.`]);
    if (story.sinceKeys >= 8) once("middle", ["WHISTLER", "Somewhere in the middle of that row, Mother."]);
  }

  function lifted() {
    showStatus();
    setLights([]);
    clearTimeout(dwell);
    cancelAnimationFrame(noise);
  }

  function showStatus() {
    status.textContent = contact ? `PIN ${String(contact.n).padStart(2, "0")}  QUAD ${contact.quad}` : "NO CONTACT";
  }

  const FIRST_READ = {
    gnd: "Ground. Nothing there.",
    vcc: "That's just power.",
    clk: "Clock.",
    addr: "Looks like an address line.",
    data: "Data. Noise, mostly.",
    ctrl: "High, with a blip now and then. Some kind of strobe.",
    nc: "Nothing. It's floating.",
    sync: "That's a pulse.",
  };

  // move the probe, gliding unless motion is reduced; the promise says
  // whether it got there (another move, or a drag, can cut it short)
  let gliding = 0;
  let settle = null;

  function stopGlide() {
    cancelAnimationFrame(gliding);
    settle?.(false);
    settle = null;
  }

  function glide(x, y) {
    stopGlide();
    const from = { ...tip };
    const ms = reduceMotion.matches ? 0 : 200;
    const start = performance.now();
    return new Promise((resolve) => {
      settle = resolve;
      const stepFrame = (now) => {
        const k = ms ? Math.min(1, (now - start) / ms) : 1;
        const ease = 1 - (1 - k) ** 3;
        draw(from.x + (x - from.x) * ease, from.y + (y - from.y) * ease);
        if (k < 1) gliding = requestAnimationFrame(stepFrame);
        else {
          settle = null;
          resolve(true);
        }
      };
      gliding = requestAnimationFrame(stepFrame);
    });
  }

  function goTo(pin) {
    if (contact && contact !== pin) touch(null);
    return glide(pin.cx, pin.cy).then((arrived) => { if (arrived) touch(pin); });
  }

  // set the probe down on the table
  function putDown() {
    touch(null);
    return glide(HOME.x, HOME.y);
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
    stopGlide();
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
    // a dab of paint off the end of the pin, so Mother won't lose it again
    const magic = PINS.find((pin) => pin.kind === "magic");
    const [dx, dy] = { 1: [-9, 0], 2: [0, 9], 3: [9, 0], 4: [0, -9] }[magic.quad];
    magic.node.append(svg("circle", { class: "dab", cx: magic.cx + dx, cy: magic.cy + dy, r: 3 }));
    say(
      ["WHISTLER", "Holy cow."],
      ["WHISTLER", "What the hell is this?"],
      600,
      () => arrange("TOO MANY SECRETS"),
      1400,
      () => { document.title = "TOO MANY SECRETS · Sneakers | Movie Terminals"; },
      ["BISHOP", "Too many secrets."],
      ["WHISTLER", "Bish, I think you better come over here."],
      800,
      ["BISHOP", "Carl, you got your little black book?"],
      ["CARL", "Yes."],
      () => openBook(),
      ["BISHOP", "Give me the number for something impossible to access."],
      () => { named = "fed"; },
      ["CARL", "Okay. What about this? Federal Reserve Transfer Node, Culpeper, Virginia."],
      ["MOTHER", "Yeah, sure. Good luck. Nine hundred billion a day goes through there."],
      ["BISHOP", "That'll do. Punch it in."],
    );
  }

  // Bishop's anagrams of SETEC ASTRONOMY, the two he says aloud in the
  // film, after this many pins
  const ANAGRAM_AT = [4, 12];
  const ANAGRAMS = {
    monterey: ["MONTEREYS COAST", ["BISHOP", "Monterey's coast. Does Monterey's coast mean anything to you guys?"], ["ALL", "No."]],
    socrates: ["MY SOCRATES NOTE", ["BISHOP", "How about my Socrates note?"], ["CARL", "No."], ["MOTHER", "Uh-uh."]],
  };

  function anagram(name) {
    const [phrase, ...lines] = ANAGRAMS[name];
    once(name,
      () => { if (!story.live) arrange(phrase); },
      1200,
      ...lines,
      1500,
      () => { if (!story.live) scatter(); },
    );
  }

  // ---------- Act 2: Carl's little black book ----------
  // Two pages, a name and a number each. Every number is fictional
  // (555-01xx), with 1992's area codes: Culpeper was 703 until 1995, and
  // Oakland, where the Bay Area's approach control sat, 510 since 1991.

  const BOOK = [
    { id: "fed", page: 0, name: "Fed Reserve transfer node", note: "Culpeper VA", number: "703-555-0142" },
    { id: "pizza", page: 0, name: "Gino's Pizza", note: "open til 2", number: "415-555-0117" },
    { id: "grid", page: 0, name: "Nat'l power grid", note: "DOE", number: "202-555-0128" },
    { id: "mom", page: 1, name: "Mom", note: "call Sun!", number: "415-555-0163" },
    { id: "atc", page: 1, name: "Air traffic control", note: "Bay TRACON", number: "510-555-0174" },
    { id: "bbs", page: 1, name: "Cheshire Cat BBS", note: "2400 8N1", number: "415-555-0189" },
  ];
  const digitsOf = (text) => text.replace(/\D/g, "");

  const book = document.getElementById("book");
  const form = document.getElementById("inputline");
  let running = false; // a number from the book is being typed in

  for (const [i, page] of [...book.querySelectorAll(".page")].entries()) {
    for (const entry of BOOK.filter((e) => e.page === i)) {
      entry.node = el("button", { type: "button", class: "entry", "aria-label": `${entry.name}, ${entry.note}: ${entry.number}` },
        el("span", { class: "name" }, entry.name),
        el("span", { class: "number" }, entry.number, el("span", { class: "note" }, entry.note)));
      entry.node.addEventListener("click", () => dialFromBook(entry));
      page.append(entry.node);
    }
  }

  function openBook() {
    book.hidden = false;
  }

  // the place Carl named last, for "punch it in"; the book doesn't mark
  // it, so finding the number is up to you
  let named = null;

  // a click on a number types it in, if the command line is free
  function dialFromBook(entry) {
    if (running || form.classList.contains("waiting") || form.classList.contains("held")) return;
    running = true;
    t.run(`ATDT ${digitsOf(entry.number)}`).finally(() => (running = false));
  }

  // ---------- The modem ----------
  // ATDT and the number (or just the number) dials; ATH, +++, Escape, or
  // the far end's own way out hangs up.

  const monitor = document.getElementById("monitor");
  const DIALED = /^(?:atd[tp]?|dial|call)?\s*([\d\s()+-]+)$/;
  const HANG_UP = new Set(["ath", "ath0", "+++", "hang up", "hangup", "esc", "escape", "exit", "quit", "bye", "logoff", "disconnect", "turn it off", "off"]);

  let link = null;     // the call: { target, ready, decoding, decoded, ... }
  let dialing = false; // between ATDT and CONNECT

  function dialed(line) {
    const match = DIALED.exec(line);
    const digits = match && digitsOf(match[1]);
    return digits && digits.length >= 7 ? digits : null;
  }

  // the book's entry for a number: all ten digits, with a 1 first, or the
  // last seven
  function lookUp(digits) {
    return BOOK.find((entry) => {
      const number = digitsOf(entry.number);
      return digits === number || digits === `1${number}` || digits === number.slice(3);
    });
  }

  async function dial(t, digits) {
    if (link) hangUp(t, false);
    stopOutput();
    t.clear();
    t.print(`ATDT${digits}`);
    if (!story.live) {
      await t.sleep(400);
      t.print("NO DIALTONE", "");
      return;
    }
    const entry = lookUp(digits);
    dialing = true;
    putDown();
    try {
      status.textContent = "DIALING";
      await t.sleep(500 + digits.length * 110);
      if (!entry && Math.random() < 0.3) {
        t.print("BUSY", "");
        return;
      }
      status.textContent = "RINGING";
      const rings = entry ? { voice: 2, bbs: 1 }[KINDS[entry.id]] ?? 1 : 4;
      for (let ring = 0; ring < rings; ring++) {
        t.print("RINGING");
        await t.sleep(1300);
      }
      const kind = entry && KINDS[entry.id];
      if (kind === "voice" || !entry) {
        t.print("NO CARRIER", "");
        if (entry) once(entry.id, ...ANSWERED[entry.id]);
        else once("wrong number", ["CARL", "Wrong number. Not mine."]);
        return;
      }
      t.print("CONNECT 2400");
      await t.sleep(600);
      if (kind === "bbs") return await bbs(t);
      await connect(t, TARGETS[entry.id]);
    } finally {
      dialing = false;
      if (!link) showStatus();
    }
  }

  const KINDS = { fed: "target", grid: "target", atc: "target", pizza: "voice", mom: "voice", bbs: "bbs" };
  const ANSWERED = {
    pizza: [["CARL", "That's the pizza place."], ["MOTHER", "Get a large. Pepperoni."]],
    mom: [["CARL", "Oh, no. That was my mom."], ["MOTHER", "Call her back, Carl. Sunday."]],
  };

  // Carl's bulletin board: no encryption, and no free lines
  async function bbs(t) {
    await t.type([
      "",
      "      C H E S H I R E   C A T   B B S",
      "      Node 2 of 2     2400 baud     est. 1988",
      "",
      "  All nodes are busy. Please call back later.",
      "",
    ], { by: "line", lineDelay: 160 });
    await t.sleep(500);
    t.print("NO CARRIER", "");
    once("bbs", ["WHISTLER", "A bulletin board, Carl?"], ["CARL", "It's not even encrypted. Sorry."]);
  }

  // the far end answers: its screen takes over the monitor, encrypted
  async function connect(t, target) {
    const call = (link = { target, ready: false, decoding: false, decoded: false });
    monitor.dataset.remote = target.id;
    t.setPrompt("");
    t.clear();
    status.textContent = "CONNECT 2400";
    await (target.id === "fed" ? fedCipher(t) : streamCipher(t, call));
    if (link !== call) return;
    call.ready = true;
    target.connected();
    // if nobody's on that last contact in a while, Whistler says so
    call.nudge = setTimeout(() => {
      if (link === call && !call.decoding) once(`${target.id} nudge`, ["WHISTLER", "That last contact, Mother."]);
    }, 9000);
    if (contact?.kind === "magic") decode();
  }

  function hangUp(t, carrier = true) {
    const call = link;
    if (!call) {
      t.print("OK");
      return true;
    }
    link = null;
    clearTimeout(call.nudge);
    clearInterval(call.sweep);
    bracket(false);
    delete monitor.dataset.remote;
    t.setPrompt("> ");
    t.clear();
    if (carrier) t.print("NO CARRIER", "");
    showStatus();
    if (call.target.id === "atc" && call.decoded) ending();
    return true;
  }

  // the probe while on a call: that last contact decrypts, the rest don't
  function onTheLine(pin) {
    if (!link?.ready) return;
    if (pin.kind === "magic") return decode();
    if (!link.decoded && !link.decoding) once(`${link.target.id} wrong`, ["WHISTLER", "No. The last contact, Mother."]);
  }

  // ---------- The churn ----------
  // The film's decryption: each character cycles through junk until its
  // own moment, all across the screen at once, then locks into place.

  const CIPHER = "!\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~ÇüéâäàåçêëèïîìÄÅÉæÆôöòûùÿÖÜ¢£¥ƒáíóúñÑªº¿¬½¼¡«»";
  const GLYPHS = CIPHER + "░▒▓│┤╡╢╖╕╣║╗╝╜╛┐└┴┬├─┼╞╟╚╔╩╦╠═╬╧╨╤╥╙╘╒╓╫╪┘┌█▄▌▐▀αßΓπΣσµτΦΘΩδ∞φε∩≡±≥≤⌠⌡÷≈°∙·√ⁿ²■";
  const pick = (chars) => chars[rand(chars.length)];
  const CHURN_MS = 4000;

  // a line as cells, one per character but the spaces; final(ch) is what
  // each settles on
  function cellsOf(text, cells, final) {
    const p = el("p");
    for (const part of text.split(/( +)/)) {
      if (!part) continue;
      if (part[0] === " ") p.append(part);
      else for (const ch of part) {
        const node = el("span", { class: "cell" }, ch);
        p.append(node);
        cells.push({ node, ch: final(ch) });
      }
    }
    if (!text) p.append(" ");
    return p;
  }

  // Any key or click skips to the end, as with the engine's output, and
  // with reduced motion there's no churn at all. alive() says whether the
  // call's still up; onProgress gets 0 to 1.
  function churn(cells, alive, onProgress) {
    return new Promise((resolve) => {
      for (const cell of cells) Object.assign(cell, { at: 150 + Math.random() * (CHURN_MS - 150), next: 0, done: false });
      let skip = reduceMotion.matches;
      const skipIt = (e) => { if (!["Shift", "Control", "Alt", "Meta"].includes(e.key)) skip = true; };
      addEventListener("keydown", skipIt, true);
      addEventListener("pointerdown", skipIt, true);
      const start = performance.now();
      const frame = (now) => {
        const elapsed = now - start;
        const over = skip || elapsed >= CHURN_MS || !alive();
        for (const cell of cells) {
          if (cell.done) continue;
          if (over || elapsed >= cell.at) {
            cell.node.textContent = cell.ch;
            cell.node.classList.add("locked");
            cell.done = true;
          } else if (now >= cell.next) {
            cell.node.textContent = pick(GLYPHS);
            cell.next = now + 40 + Math.random() * 120;
          }
        }
        onProgress?.(over ? 1 : elapsed / CHURN_MS);
        if (!over) return void requestAnimationFrame(frame);
        removeEventListener("keydown", skipIt, true);
        removeEventListener("pointerdown", skipIt, true);
        resolve();
      };
      requestAnimationFrame(frame);
    });
  }

  // put the probe on that last contact during a call
  async function decode() {
    const call = link;
    if (!call?.ready || call.decoding || call.decoded) return;
    call.decoding = true;
    clearTimeout(call.nudge);
    call.target.decoding?.();
    await (call.target.id === "fed" ? decodeFed(call) : decodeArt(call));
    if (link !== call) return;
    call.decoded = true;
    story.cracked.add(call.target.id);
    call.target.decoded(call);
  }

  // ---------- The Federal Reserve ----------
  // Pale green ciphertext, then the film's text screen, 80 columns across,
  // whose last line becomes the command line: [ ] Select Option.

  const pad = (n) => " ".repeat(n);
  const FED = [
    `DATANET PROC RECORD:  45-3456-W-3452${pad(28)}Transnet on/xc-3`,
    "",
    `${pad(25)}FEDERAL RESERVE TRANSFER NODE`,
    "",
    `${pad(29)}National Headquarters`,
    "",
    `${pad(6)}************  Remote Systems Network Input Station    ************`,
    `${pad(6)}${"=".repeat(66)}`,
    "",
    `${pad(9)}[1] Interbank Funds Transfer  (Code Prog: 485-GWU)`,
    `${pad(9)}[2] International Telelink Access  (Code Lim: XRP-262)`,
    `${pad(9)}[3] Remote Facsimile Send/Receive  (Code Tran:  2LZP-517)`,
    `${pad(9)}[4] Regional Bank Interconnect  (Security Code:  47-B34)`,
    `${pad(9)}[5] Update System Parameters  (Entry Auth. Req.)`,
    `${pad(9)}[6] Remote Operator Logon/Logoff`,
    "",
    `${pad(6)}${"=".repeat(66)}`,
    "",
    `${pad(22)}[ ] Select Option or ESC to Abort`,
  ];
  const SELECT = FED.at(-1).indexOf("[");

  // runs of junk, the shape of a screen, as the film shows it before the decode
  async function fedCipher(t) {
    const shape = [[0, 34, 30, 14], [0, 26], [], [14, 22], [], [0, 58], [2, 61], [0, 55], [0, 63], [3, 52], [0, 60], [0, 44], [], [8, 48], [], [20, 30]];
    const junk = (n) => Array.from({ length: n }, () => (rand(7) ? pick(CIPHER) : " ")).join("");
    const lines = shape.map(([at, length, gap, more]) =>
      at == null ? "" : el("p", { class: "cipher" }, pad(at) + junk(length) + (gap ? pad(gap) + junk(more) : "")));
    await t.type(lines, { by: "line", lineDelay: 90 });
  }

  async function decodeFed(call) {
    t.hold(); // the command line comes back as the screen's last line
    t.clear();
    const cells = [];
    const lines = FED.map((line) => cellsOf(line, cells, (ch) => ch));
    for (const cell of cells) cell.node.textContent = "";
    t.print(...lines);
    await churn(cells, () => link === call);
    if (link === call) {
      lines.at(-1).remove();
      bracket(true);
    }
    t.release();
  }

  // the command line inside the brackets, growing with what's typed
  const field = form.querySelector(".field");
  const tail = form.querySelector(".prompt-tail");
  const command = document.getElementById("command");
  let fitting = 0;

  function bracket(on) {
    cancelAnimationFrame(fitting);
    if (on) {
      monitor.dataset.bracket = "";
      t.setPrompt(pad(SELECT) + "[");
      tail.textContent = FED.at(-1).slice(SELECT + 2);
      const fit = () => {
        field.style.setProperty("--chars", command.value.length + 1);
        fitting = requestAnimationFrame(fit);
      };
      fit();
    } else {
      delete monitor.dataset.bracket;
      tail.textContent = "";
      field.style.removeProperty("--chars");
    }
  }

  const FED_CHOICES = {
    1: ["BISHOP", "Nobody moves any money."],
    2: ["CARL", "Who are we gonna call, Switzerland?"],
    3: ["WHISTLER", "Fax them what? Our phone number?"],
    4: ["CREASE", "That's people's savings, Mother. Leave it."],
    5: ["BISHOP", "Don't touch the parameters."],
    6: ["WHISTLER", "Log on and there's a record we were here."],
  };

  // ---------- The grid and air traffic control ----------
  // Blue ciphertext streams down the whole screen; on the decode it clears
  // away, a character at a time, as the picture comes up behind it.

  async function streamCipher(t, call) {
    const box = el("div", { class: "remote-screen" });
    const junk = el("div", { class: "junk", "aria-hidden": "true" });
    box.append(junk);
    t.print(box);
    const style = getComputedStyle(monitor);
    const size = parseFloat(style.fontSize);
    const cols = Math.max(20, Math.floor(junk.clientWidth / (size * parseFloat(style.getPropertyValue("--advance")))));
    const count = Math.max(8, Math.floor(junk.clientHeight / (size * parseFloat(style.getPropertyValue("--leading")))));
    Object.assign(call, { box, junk, rows: [] });
    for (let i = 0; i < count && link === call; i++) {
      const row = Array.from({ length: cols }, () => (rand(6) ? pick(CIPHER) : " ")).join("");
      call.rows.push(row);
      junk.append(el("p", null, row));
      await t.sleep(70);
    }
  }

  async function decodeArt(call) {
    const art = call.target.draw(call);
    art.classList.add("art");
    art.style.opacity = 0;
    call.box.prepend(art);
    const cells = [];
    call.junk.replaceChildren(...call.rows.map((row) => cellsOf(row, cells, () => " ")));
    // the picture flickers up as the junk goes
    await churn(cells, () => link === call, (k) => {
      art.style.opacity = k >= 1 ? 1 : Math.max(0, Math.min(1, (k - 0.15) / 0.6)) * (0.7 + Math.random() * 0.3);
    });
    call.junk.remove();
  }

  // ---------- Drawing ----------

  // a seeded random, so the drawn screens come out the same every time
  function seeded(seed) {
    return () => {
      seed = (seed + 0x6d2b79f5) | 0;
      let r = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  }

  // longitude and latitude onto a box, at the right shape for the latitude
  function projection({ x, y, width, height, west, north, south }) {
    const tall = north - south;
    const wide = (tall * width) / height / Math.cos((((north + south) / 2) * Math.PI) / 180);
    return ([lon, lat]) => [x + ((lon - west) / wide) * width, y + ((north - lat) / tall) * height];
  }

  const pathOf = (points, project, close = false) =>
    points.map((point, i) => `${i ? "L" : "M"}${project(point).map((n) => n.toFixed(1)).join(" ")}`).join(" ") + (close ? " Z" : "");

  function label(x, y, text, className, attrs = {}) {
    const node = svg("text", { x, y, class: className, ...attrs });
    node.textContent = text;
    return node;
  }

  // something on a drawn screen to click (or focus and press Enter)
  function hot(attrs, act, ...children) {
    const node = svg("g", { class: "hot", tabindex: "0", role: "button", ...attrs });
    node.dataset.act = act;
    node.append(...children);
    return node;
  }

  function onAct(art, handle) {
    art.addEventListener("click", (e) => {
      const node = e.target.closest("[data-act]");
      if (node) handle(node.dataset.act, node);
    });
    art.addEventListener("keydown", (e) => {
      const node = e.target.closest?.("[data-act]");
      if (!node || (e.key !== "Enter" && e.key !== " ")) return;
      e.preventDefault();
      e.stopPropagation(); // keep Space from going to the command line
      handle(node.dataset.act, node);
    });
  }

  // New England, roughly, for the power grid: the coast from New York
  // around to Maine, Long Island and the islands, two rivers, the states
  const NEW_ENGLAND = {
    coast: [[-74.9, 40.4], [-74.0, 40.4], [-74.02, 40.7], [-73.8, 40.82], [-73.68, 40.96], [-73.54, 41.03], [-73.41, 41.08], [-73.18, 41.15], [-72.92, 41.25], [-72.68, 41.27], [-72.36, 41.28], [-72.09, 41.32], [-71.95, 41.33], [-71.86, 41.31], [-71.49, 41.36], [-71.45, 41.45], [-71.43, 41.57], [-71.4, 41.7], [-71.4, 41.82], [-71.36, 41.78], [-71.27, 41.67], [-71.15, 41.7], [-71.2, 41.6], [-71.2, 41.46], [-71.08, 41.5], [-70.92, 41.6], [-70.8, 41.65], [-70.7, 41.75], [-70.62, 41.73], [-70.67, 41.53], [-70.6, 41.55], [-70.28, 41.63], [-70.07, 41.67], [-69.95, 41.67], [-69.93, 41.8], [-69.97, 41.93], [-70.03, 42.02], [-70.15, 42.07], [-70.24, 42.06], [-70.18, 42.03], [-70.08, 41.95], [-70.03, 41.9], [-70.05, 41.77], [-70.2, 41.74], [-70.32, 41.72], [-70.5, 41.77], [-70.62, 41.92], [-70.68, 42.03], [-70.72, 42.2], [-70.8, 42.25], [-70.9, 42.3], [-71.0, 42.27], [-71.05, 42.35], [-70.97, 42.38], [-70.92, 42.43], [-70.87, 42.47], [-70.83, 42.5], [-70.85, 42.55], [-70.66, 42.6], [-70.6, 42.66], [-70.77, 42.7], [-70.8, 42.82], [-70.8, 42.92], [-70.74, 43.0], [-70.73, 43.07], [-70.6, 43.15], [-70.58, 43.25], [-70.45, 43.36], [-70.35, 43.45], [-70.2, 43.56], [-70.24, 43.66], [-70.17, 43.8], [-69.95, 43.85], [-69.82, 43.85], [-69.63, 43.85], [-69.5, 43.84], [-69.35, 43.98], [-69.1, 44.1], [-69.06, 44.2], [-69.0, 44.42], [-68.8, 44.45], [-68.6, 44.4], [-68.3, 44.3], [-68.0, 44.4], [-67.6, 44.5], [-66.9, 44.8]],
    beyond: [[-66.9, 45.5], [-74.9, 45.5]],
    islands: [
      [[-74.0, 40.58], [-73.6, 40.58], [-73.2, 40.63], [-72.8, 40.75], [-72.4, 40.85], [-71.86, 41.07], [-72.1, 41.03], [-72.3, 41.15], [-72.6, 41.0], [-73.0, 40.95], [-73.5, 40.9], [-73.78, 40.8], [-73.95, 40.72]],
      [[-70.83, 41.35], [-70.6, 41.47], [-70.45, 41.4], [-70.6, 41.34]],
      [[-70.25, 41.3], [-70.0, 41.29], [-69.97, 41.25], [-70.15, 41.24]],
    ],
    rivers: [
      [[-74.02, 40.7], [-73.93, 41.0], [-73.95, 41.3], [-73.97, 41.7], [-73.9, 42.0], [-73.8, 42.4], [-73.75, 42.65], [-73.68, 43.0], [-73.6, 43.3], [-73.75, 43.6], [-73.9, 44.0]],
      [[-72.35, 41.28], [-72.6, 41.55], [-72.65, 41.77], [-72.6, 42.1], [-72.58, 42.5], [-72.5, 42.75], [-72.42, 43.15], [-72.3, 43.6], [-72.05, 44.1], [-71.7, 44.5]],
    ],
    borders: [
      [[-73.66, 41.0], [-73.52, 41.1], [-73.48, 41.65], [-73.5, 42.05], [-73.27, 42.75], [-73.25, 43.57], [-73.4, 43.7], [-73.35, 44.5]],
      [[-73.5, 42.05], [-71.8, 42.02], [-71.79, 41.33]],
      [[-71.8, 42.02], [-71.38, 42.02], [-71.38, 41.9], [-71.34, 41.73], [-71.12, 41.5]],
      [[-73.27, 42.75], [-72.46, 42.73], [-71.3, 42.7], [-71.05, 42.84], [-70.82, 42.87]],
      [[-70.7, 43.08], [-70.97, 43.35], [-70.99, 43.8], [-71.08, 44.5]],
    ],
  };

  // the panel's nodes, and where the first seven are
  const GRID_NODES = [
    ["PROVIDENCE NODE", [-71.41, 41.82]], ["MANSFIELD NODE", [-72.23, 41.79]], ["SPRINGFIELD NODE", [-72.59, 42.1]],
    ["AMHERST NODE", [-72.52, 42.37]], ["PORTLAND NODE", [-70.26, 43.66]], ["MANCHESTER NODE", [-71.46, 42.99]],
    ["ALBANY NODE", [-73.76, 42.65]], ["AREA SUBSTATION"], ["REGIONAL NETWORK"], ["SYSTEM SHUTDOWN"],
  ];
  const FEEDERS = [[6, 2], [2, 1], [1, 0], [2, 3], [3, 5], [5, 4], [0, 5]];
  const GRID_BUTTONS = ["REPORTS", "STAT SHUT-DOWN", "POWER CALIBRATE", "CONTROL FUNCTIONS", "EXIT"];

  function drawGrid() {
    const art = svg("svg", { viewBox: "0 0 800 600", class: "grid", role: "group", "aria-label": "U. S. Department of Energy, New England States Power Distribution Grid: emergency shutdown options" });
    art.append(
      svg("rect", { class: "frame", x: 5, y: 5, width: 790, height: 590, rx: 8 }),
      label(400, 50, "U. S. Department of Energy", "title"),
      label(400, 80, "New England States Power Distribution Grid", "subtitle"),
      label(400, 116, "EMERGENCY SHUTDOWN OPTIONS", "alarm"),
      svg("line", { class: "frame", x1: 5, y1: 132, x2: 795, y2: 132 }),
    );

    // the map
    const box = { x: 228, y: 146, width: 550, height: 374 };
    const project = projection({ ...box, west: -74.75, north: 44.3, south: 40.5 });
    const map = svg("g", { class: "map", "aria-hidden": "true" });
    const clip = svg("clipPath", { id: "grid-map" });
    clip.append(svg("rect", box));
    const land = svg("clipPath", { id: "grid-land" });
    const shapes = [pathOf([...NEW_ENGLAND.coast, ...NEW_ENGLAND.beyond], project, true), ...NEW_ENGLAND.islands.map((island) => pathOf(island, project, true))];
    for (const d of shapes) land.append(svg("path", { d }));
    map.append(clip, land);
    const inside = svg("g", { "clip-path": "url(#grid-map)" });
    for (let y = box.y + 8; y < box.y + box.height; y += 12) inside.append(svg("line", { class: "sea", x1: box.x, y1: y, x2: box.x + box.width, y2: y }));
    for (const d of shapes) inside.append(svg("path", { class: "land", d }));

    // the lines: a maze of them, on land only
    const random = seeded(1992);
    let maze = "";
    for (let i = 0; i < 620; i++) {
      let x = box.x + random() * box.width;
      let y = box.y + random() * box.height;
      maze += `M${x.toFixed(0)} ${y.toFixed(0)}`;
      let across = random() < 0.5;
      for (let leg = 0; leg < 2 + Math.floor(random() * 3); leg++) {
        const run = (6 + random() * 22) * (random() < 0.5 ? -1 : 1);
        if (across) x += run;
        else y += run;
        maze += `${across ? "H" : "V"}${(across ? x : y).toFixed(0)}`;
        across = !across;
      }
    }
    inside.append(svg("path", { class: "maze", d: maze, "clip-path": "url(#grid-land)" }));
    for (const d of shapes) inside.append(svg("path", { class: "coast", d }));
    for (const river of NEW_ENGLAND.rivers) inside.append(svg("path", { class: "coast", d: pathOf(river, project) }));
    for (const border of NEW_ENGLAND.borders) inside.append(svg("path", { class: "border", d: pathOf(border, project) }));

    // the feeders, square-cornered, between the nodes
    const at = GRID_NODES.map(([, place]) => place && project(place));
    for (const [a, b] of FEEDERS) inside.append(svg("path", { class: "feeder", d: `M${at[a][0]} ${at[a][1]} H${at[b][0]} V${at[b][1]}` }));
    const dots = at.map((point) => point && svg("rect", { class: "node", x: point[0] - 4, y: point[1] - 4, width: 8, height: 8 }));
    inside.append(...dots.filter(Boolean));
    map.append(inside, svg("rect", { class: "frame", ...box }));

    // the panel of nodes, each a checkbox
    const panel = svg("g", { class: "panel" });
    panel.append(svg("rect", { class: "frame", x: 22, y: 146, width: 192, height: 374, rx: 3 }), svg("rect", { class: "frame thin", x: 28, y: 152, width: 180, height: 362, rx: 2 }));
    GRID_NODES.forEach(([name], i) => {
      const y = 182 + i * 34;
      const row = hot({ role: "checkbox", "aria-checked": "false", "aria-label": name }, `node ${i}`,
        svg("rect", { class: "row", x: 32, y: y - 17, width: 172, height: 26 }),
        svg("rect", { class: "box", x: 38, y: y - 12, width: 14, height: 14 }),
        svg("path", { class: "tick", d: `M40 ${y - 5} l4 4 l7 -9` }),
        label(60, y, name, "label"));
      row.dot = dots[i];
      panel.append(row);
    });

    // the buttons along the bottom
    const buttons = svg("g", { class: "buttons" });
    const widths = [118, 156, 158, 186, 120];
    let x = 22;
    GRID_BUTTONS.forEach((name, i) => {
      buttons.append(hot({ "aria-label": name }, name, svg("rect", { x, y: 532, width: widths[i] - 8, height: 46, rx: 4 }), label(x + (widths[i] - 8) / 2, 561, name, "button-label")));
      x += widths[i];
    });

    art.append(map, panel, buttons);
    onAct(art, (act, node) => gridAct(act, node));
    return art;
  }

  function gridAct(act, node) {
    if (act.startsWith("node ")) {
      const on = node.getAttribute("aria-checked") !== "true";
      node.setAttribute("aria-checked", String(on));
      node.dot?.classList.toggle("picked", on);
      if (act === "node 9" && on) {
        say(["BISHOP", "Mother. Uncheck it."], () => {
          node.setAttribute("aria-checked", "false");
        });
      }
      return;
    }
    if (act === "EXIT") return hangUp(t);
    say(GRID_OBJECTIONS[act]);
  }

  const GRID_OBJECTIONS = {
    "REPORTS": ["WHISTLER", "Don't print anything, Mother. Paper trail."],
    "STAT SHUT-DOWN": ["BISHOP", "Hey! Nobody shuts down anything."],
    "POWER CALIBRATE": ["CREASE", "Don't touch it, Mother."],
    "CONTROL FUNCTIONS": ["WHISTLER", "Easy, Mother. Easy."],
  };

  // the Bay Area for air traffic control: the shores, and the fixes and
  // airways on the film's scope
  const BAY = {
    shores: [
      [[-122.85, 37.95], [-122.69, 37.9], [-122.58, 37.86], [-122.53, 37.815], [-122.48, 37.83], [-122.48, 37.86], [-122.5, 37.88], [-122.45, 37.87], [-122.47, 37.91], [-122.48, 37.94], [-122.48, 37.97], [-122.5, 38.02], [-122.45, 38.08], [-122.35, 38.1], [-122.25, 38.06], [-122.22, 38.06], [-122.1, 38.05], [-121.95, 38.05], [-121.8, 38.06]],
      [[-122.22, 38.04], [-122.3, 38.01], [-122.35, 37.97], [-122.39, 37.91], [-122.33, 37.9], [-122.31, 37.87], [-122.3, 37.83], [-122.3, 37.8], [-122.28, 37.77], [-122.24, 37.75], [-122.22, 37.71], [-122.19, 37.69], [-122.15, 37.63], [-122.12, 37.58], [-122.06, 37.52], [-122.0, 37.47], [-121.97, 37.43], [-122.02, 37.42], [-122.05, 37.43], [-122.11, 37.46], [-122.15, 37.48], [-122.2, 37.52], [-122.25, 37.56], [-122.3, 37.58], [-122.35, 37.6], [-122.37, 37.62], [-122.38, 37.66], [-122.39, 37.69], [-122.36, 37.72], [-122.38, 37.76], [-122.39, 37.79], [-122.41, 37.81], [-122.45, 37.81], [-122.48, 37.81], [-122.51, 37.78], [-122.51, 37.73], [-122.5, 37.68], [-122.5, 37.6], [-122.52, 37.55], [-122.47, 37.49], [-122.45, 37.45], [-122.41, 37.37], [-122.41, 37.27], [-122.33, 37.15]],
    ],
    fixes: {
      SFO: [-122.375, 37.619], OAK: [-122.221, 37.721], SJC: [-121.929, 37.363], SUNOL: [-121.89, 37.59], ALTAM: [-121.71, 37.76],
      OSI: [-122.27, 37.39], SUTRO: [-122.45, 37.755], BERKS: [-122.27, 37.88], COLLI: [-122.3, 38.12], SALAD: [-121.98, 37.97],
      DECOT: [-122.05, 37.66], IMPLY: [-121.82, 37.68], MABRY: [-121.75, 37.5], MISON: [-121.84, 37.45], FAITH: [-121.76, 37.3],
      BRIJJ: [-122.17, 37.5], SEEMS: [-122.68, 37.33], GOBBS: [-122.74, 37.72], COMMO: [-122.52, 37.98],
    },
    airways: [
      ["V87", "COMMO", "BERKS", "OAK", "DECOT", "MABRY"], ["V107", "GOBBS", "SUTRO", "SFO", "BRIJJ", "MISON", "FAITH"], ["V109", "SALAD", "ALTAM"],
      ["V195", "OAK", "SUNOL"], ["V334", "SUNOL", "IMPLY", "ALTAM"], ["V27", "SEEMS", "OSI", "SJC"], ["V6", "COLLI", "SALAD"],
    ],
  };

  // the flight strips down the side, as the film has them
  const STRIPS = [
    [["5:36", "110"], ["T/O SFO MABRY", "Ctr"]],
    [["DAL27", "L24"], ["ACTIVE"]],
    [["7:06", "70"], ["T/O OAK SUNOL", "Ctr"]],
    [["N9249N", "737"], ["ACTIVE"]],
    [["7:12", "120"], ["ALTAM SUNOL", "SJC Twr"]],
    [["N92IN", "V1730"], ["ACTIVE"]],
    [["8:18", "90"], ["T/O SJC SUNOL", "ALTAM Ctr"]],
  ];

  // targets, their data blocks, and where they're headed each sweep
  const PLANES = [
    { tag: "DAL27", alt: "100 21", x: 500, y: 430, dx: -3, dy: -2, color: "green" },
    { tag: "N9249N", alt: "100 18", x: 300, y: 515, dx: 2, dy: -3, color: "white" },
    { tag: "N92IN", alt: "120 25", x: 470, y: 250, dx: 3, dy: 1, color: "green" },
  ];

  function drawAtc(call) {
    const art = svg("svg", { viewBox: "0 0 800 600", class: "atc", role: "img", "aria-label": "Air traffic control radar: the San Francisco Bay, its fixes and airways, three aircraft, and the flight strips" });
    const project = projection({ x: 0, y: 0, width: 600, height: 600, west: -122.8, north: 38.15, south: 37.15 });
    const scope = svg("g");
    const clip = svg("clipPath", { id: "atc-scope" });
    clip.append(svg("rect", { x: 0, y: 0, width: 600, height: 600 }));
    scope.append(clip);
    const inside = svg("g", { "clip-path": "url(#atc-scope)" });
    const [cx, cy] = project(BAY.fixes.SFO);
    for (let r = 90; r <= 450; r += 90) inside.append(svg("circle", { class: "ring", cx, cy, r }));
    inside.append(
      svg("path", { class: "boundary", d: "M60 70 L240 0" }),
      svg("path", { class: "boundary", d: "M110 170 Q150 400 215 600" }),
      svg("path", { class: "boundary", d: "M500 8 Q560 300 590 560 L520 600" }),
    );
    for (const [name, ...fixes] of BAY.airways) {
      const points = fixes.map((fix) => project(BAY.fixes[fix]));
      inside.append(svg("path", { class: "airway", d: points.map(([x, y], i) => `${i ? "L" : "M"}${x} ${y}`).join(" ") }));
      // the airway's name a third of the way along its first leg
      const [[ax, ay], [bx, by]] = points;
      inside.append(label(ax + (bx - ax) * 0.35 + 6, ay + (by - ay) * 0.35 - 6, name, "victor"));
    }
    for (const shore of BAY.shores) inside.append(svg("path", { class: "coast", d: pathOf(shore, project) }));
    for (const [name, place] of Object.entries(BAY.fixes)) {
      const [x, y] = project(place);
      inside.append(svg("path", { class: "fix", d: `M${x} ${y - 4} L${x + 4} ${y + 3} L${x - 4} ${y + 3} Z` }), label(x + 7, y - 6, name, "fix-name"));
    }
    call.planes = PLANES.map((plane) => {
      const g = svg("g", { class: `plane ${plane.color}` });
      g.append(
        svg("path", { class: "blip", d: "M-5 0 H5 M0 -5 V5" }),
        svg("line", { class: "leader", x1: 6, y1: -4, x2: 18, y2: -14 }),
        label(20, -20, plane.tag, ""), label(20, 2, plane.alt, ""),
      );
      inside.append(g);
      return { ...plane, g };
    });
    scope.append(inside);

    const strips = svg("g", { class: "strips" });
    strips.append(svg("rect", { class: "column", x: 608, y: 4, width: 188, height: 592 }));
    STRIPS.forEach(([[top, bottom], route], i) => {
      const y = 12 + i * 80;
      strips.append(
        svg("rect", { class: "strip", x: 614, y, width: 176, height: 74 }),
        svg("line", { class: "split", x1: 682, y1: y, x2: 682, y2: y + 74 }),
        label(648, y + 30, top, "", { "text-anchor": "middle" }),
        label(648, y + 60, bottom, "", { "text-anchor": "middle" }),
      );
      if (route.length === 1) strips.append(label(736, y + 45, route[0], "", { "text-anchor": "middle" }));
      else strips.append(label(688, y + 30, route[0], ""), label(688, y + 60, route[1], ""));
    });
    art.append(scope, strips);
    placePlanes(call);
    return art;
  }

  function placePlanes(call) {
    for (const plane of call.planes) plane.g.setAttribute("transform", `translate(${plane.x} ${plane.y})`);
  }

  // the scope updates each sweep
  function sweep(call) {
    if (reduceMotion.matches) return;
    call.sweep = setInterval(() => {
      for (const plane of call.planes) Object.assign(plane, { x: plane.x + plane.dx, y: plane.y + plane.dy });
      placePlanes(call);
    }, 4000);
  }

  // ---------- The three places, and what the team says ----------

  const calling = (id) => link?.target.id === id;
  const NEXT = { fed: "Federal Reserve Transfer Node.", grid: "National power grid.", atc: "Air traffic control system." };

  function whatElse() {
    const next = ["fed", "grid", "atc"].find((id) => !story.cracked.has(id));
    if (!next) return [];
    return [["BISHOP", story.cracked.size === 1 ? "Carl, what else you got?" : "Carl, what else?"], () => { named = next; }, ["CARL", NEXT[next]]];
  }

  const TARGETS = {
    fed: {
      id: "fed",
      connected: () => once("fed connected", ["MOTHER", "You won't get in. It's encrypted."], 400, () => (calling("fed") && !link.decoding ? ["WHISTLER", "Mother. That last contact."] : null)),
      decoded: () => once("fed decoded", ["MOTHER", "Take a look at this, boys."], ["MOTHER", "Anybody want to shut down the Federal Reserve?"],
        ["BISHOP", "Hey, hey, hey! Don't screw around with that thing!"], ...whatElse()),
      choose(line) {
        if (!Object.hasOwn(FED_CHOICES, line)) return false;
        say(FED_CHOICES[line]);
        return true;
      },
    },
    grid: {
      id: "grid",
      draw: drawGrid,
      connected: () => {},
      decoding: () => once("grid decoding", ["MOTHER", "Okay, here we come..."], ["MOTHER", "Rolling."]),
      decoded: () => once("grid decoded", ["CARL", "Wow."], ["BISHOP", "Unbelievable."], ["MOTHER", "Anybody want to black out New England?"], ...whatElse()),
    },
    atc: {
      id: "atc",
      draw: drawAtc,
      connected: () => once("atc connected", ["BISHOP", "Okay. Mother."]),
      decoded: (call) => {
        sweep(call);
        once("atc decoded",
          ["LIZ", "Oh my God."],
          ["CREASE", "How is this possible?"],
          ["WHISTLER", "Cryptography systems are based on mathematical problems so complex they cannot be solved without a key."],
          ["LIZ", "Janek must have figured out a way to solve those problems without the key..."],
          ["LIZ", "...and he hardwired it into that chip."],
          () => (calling("atc") ? ["CREASE", "All right. Turn it off."] : null),
          1500,
          () => (calling("atc") ? ["MOTHER", "Anybody want to crash a couple of passenger jets?"] : null),
          () => (calling("atc") ? ["CREASE", "I said turn it off!"] : null),
        );
      },
    },
  };

  // off, at last
  function ending() {
    once("ending",
      800,
      ["CARL", "So it's a code breaker."],
      ["BISHOP", ["No. It's ", el("em", null, "the"), " code breaker."]],
      1600,
      ["BISHOP", "No more secrets."],
      () => { document.title = "NO MORE SECRETS · Sneakers | Movie Terminals"; },
    );
  }

  // what's typed during a call goes to the far end, or hangs up, or dials
  // again; the probe commands still move the probe
  function remote(t, line) {
    if (HANG_UP.has(line)) return hangUp(t);
    const digits = dialed(line);
    if (digits) return dial(t, digits);
    const [name, ...args] = line.split(" ");
    if (["next", "back", "pin", "quad"].includes(name)) return commands[name](quiet, args) || true;
    if (Object.hasOwn(PHRASES, line)) return PHRASES[line](t) || true;
    if (link.decoded && link.target.choose?.(line)) return true;
    beep();
    return true;
  }

  // the screen's way of saying no
  function beep() {
    monitor.classList.remove("beep");
    void monitor.offsetWidth;
    monitor.classList.add("beep");
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
        "  ATDT N    dial number N, or click one in Carl's book",
        "  ATH       hang up (or Escape)",
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
    "punch it in": (t) => {
      const entry = BOOK.find((e) => e.id === named);
      return story.live && entry ? dial(t, digitsOf(entry.number)) : false;
    },
    "carl what else you got": () => carlWhatElse(),
    "what else you got": () => carlWhatElse(),
    "carl what else": () => carlWhatElse(),
    "what else": () => carlWhatElse(),
  };

  function carlWhatElse() {
    if (!story.live) return false;
    const next = whatElse();
    say(...(next.length ? next.slice(1) : [["CARL", "That's everything I've got."]]));
    return true;
  }

  function fallback(t, line) {
    if (link) return remote(t, line);
    if (Object.hasOwn(PHRASES, line)) {
      const result = PHRASES[line](t);
      if (result !== false) return result || true;
    }
    const digits = dialed(line);
    if (digits) return dial(t, digits);
    if (HANG_UP.has(line)) return hangUp(t);
    return false;
  }

  // during a call, every line goes to the far end
  const routed = Object.fromEntries(Object.entries(commands).map(([name, run]) =>
    [name, (t, args, line) => (link ? remote(t, line) : run(t, args, line))]));

  // ---------- The terminal ----------

  const t = Terminal.create({
    prompt: "> ",
    commands: routed,
    fallback,
    echo: () => !link,
    onEscape: (t) => link && hangUp(t),
    unrecognized: () => "Bad command or file name",
    filters: [(line) => line.toLowerCase().replace(/[.,!?]/g, "").replace(/\s+/g, " ").trim()],
    cps: 120,
    name: "sneakers",
  });
  const quiet = Object.assign(Object.create(t), { print: beep, error: beep });
  window.term = t;
  window.bench = {
    touch: (n) => goTo(pinAt(n)),
    lift: () => touch(null),
    get decryption() { return PINS.find((pin) => pin.kind === "magic")?.n; },
    live() {
      if (!keyQuad) wire(1);
      goLive();
    },
    get link() { return link; },
    story,
  };

  // the footer's keys, by click or by key (the footer's gone during a call)
  const ACTIONS = {
    next: () => step(1),
    reboot: () => link || commands.reboot(t),
    help: () => link || commands.help(t),
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
      () => { if (!story.live) scatter(); },
    );
  });
})();
