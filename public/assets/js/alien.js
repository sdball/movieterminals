/*
  MU-TH-UR 6000, the Nostromo's computer in Alien (1979).

  It boots to the overmonitoring address matrix. Arrow keys (or a click or
  tap) pick an address. INTERFACE 2037 opens the inquiry prompt, the way
  Dallas does it in the film; the other addresses show a readout. Escape on
  an empty prompt, or ADDRESS MATRIX, goes back.

  At the prompt the screen clears on every query, as in the film, and Mother
  answers a character at a time. Most queries are whole phrases, matched in
  SCRIPT and in fallback() below.
*/

(function () {
  "use strict";

  const { el } = Terminal;
  const ins = (text) => el("ins", text);

  // what has happened so far in the script
  const story = {
    proceduresEvaluated: false,
    clarificationRequested: false,
    commandOverride: false,
  };

  // ---------- The address matrix ----------

  // As the film's screen lays it out: two columns, each a name then an
  // address. The second column starts at character 26.
  const MATRIX = [
    "CRFX         OM2077AM     LALLIGNMENT    SM2093",
    "ATTITUDE     SM2078       PHOTO F        SM2094",
    "WASTE HEAT   2080         MAINS",
    "RAD          2081         IUA            SM2096",
    "VENT         2082AM       2LA            SM2097",
    "NAVIGATION   M2083        3RA            SM2098",
    "TIME         M2084        4LHA           SM2099",
    "GAL POS                   GRAY GRIDS",
    "COMMAND      20865C       INERTIAL DAMP  3002AM",
    "INTERFACE    2037         DECK A         A3003",
    "ATTN         2087SC       DECK B         A3004",
    "ALERT        2088SC       DECK C         A3005",
    "MATRIAL      2090         LIFE SUPPORT",
    "OVERLOCK     M2091        0%             M3003AM",
  ];
  const COLUMN = 26;
  const NAME_WIDTH = [13, 15];

  // each cell: { text, name, address } or null
  const cells = MATRIX.map((row) => [row.slice(0, COLUMN), row.slice(COLUMN)].map((segment, col) => {
    const text = segment.trimEnd();
    if (!text) return null;
    return { text, name: text.slice(0, NAME_WIDTH[col]).trim(), address: text.slice(NAME_WIDTH[col]).trim() };
  }));

  const spot = { row: 9, col: 0 }; // INTERFACE 2037, as the film has it

  function entryButton(cell, row, col) {
    return el("button", {
      type: "button",
      class: "entry",
      tabindex: "-1",
      "data-row": row,
      "data-col": col,
      "aria-label": [cell.name, cell.address].filter(Boolean).join(" "),
    }, cell.text);
  }

  function matrixLines() {
    return cells.map((pair, row) => {
      const p = el("p");
      pair.forEach((cell, col) => {
        if (col === 1) p.append(" ".repeat(Math.max(1, COLUMN - (pair[0]?.text.length ?? 0))));
        if (cell) p.append(entryButton(cell, row, col));
      });
      return p;
    });
  }

  function focusSpot() {
    const buttons = document.querySelectorAll("#display .entry");
    for (const b of buttons) {
      const here = +b.dataset.row === spot.row && +b.dataset.col === spot.col;
      b.tabIndex = here ? 0 : -1;
      b.classList.toggle("selection_option", here);
      if (here) b.focus({ preventScroll: true });
    }
  }

  async function showMatrix(t, { quick = false } = {}) {
    t.hold();
    t.clear();
    const lines = ["OVERMONITORING ADDRESS MATRIX", "", ...matrixLines(), "", ""];
    if (quick) t.print(...lines);
    else await t.type(lines, { by: "line", lineDelay: 45 });
    focusSpot();
  }

  // arrow keys walk the matrix, skipping its gaps
  function move(dRow, dCol) {
    let { row, col } = spot;
    if (dCol) {
      col = Math.max(0, Math.min(1, col + dCol));
      if (col === spot.col) return;
      // the nearest row with something in that column
      for (let d = 0; d < cells.length; d++) {
        if (cells[row + d]?.[col]) { row += d; break; }
        if (cells[row - d]?.[col]) { row -= d; break; }
      }
    } else {
      do row += dRow; while (cells[row] && !cells[row][col]);
      if (!cells[row]) return;
    }
    if (!cells[row]?.[col]) return;
    Object.assign(spot, { row, col });
    focusSpot();
  }

  // ---------- Readouts ----------
  // What each address shows. Anything not here gets a generic readout.

  const READOUTS = {
    NAVIGATION: shipStatusLines,
    "GAL POS": () => ["GALACTIC POSITION", "270%Rx883'P", "", "VELOCITY STATUS", "59.09% SOL"],
    TIME: () => ["ACTUAL TIME:   3 JUN", "FLIGHT TIME:   5 NOV"],
    ATTITUDE: () => ["PITCH    +000.00", "ROLL     +000.00", "YAW      +000.00", "", "ATTITUDE STABLE"],
    "LIFE SUPPORT": () => ["LIFE SUPPORT NOMINAL", "", "CREW COMPLEMENT    7", "OTHER LIFE FORMS   1"],
    COMMAND: () => ["ACCESS RESTRICTED", ins("COMMAND OVERRIDE REQUIRED")],
    ATTN: () => ["NO MESSAGES"],
    ALERT: () => ["NO ALERTS"],
  };

  async function showReadout(t, cell) {
    t.clear();
    const header = [cell.name, cell.address].filter(Boolean).join("    ");
    const body = READOUTS[cell.name]?.() ?? (cell.address ? ["STATUS NOMINAL"] : ["NO DATA"]);
    const wide = cell.name === "NAVIGATION";
    await t.type(wide ? body : [header, "", ...body], wide ? { by: "line", lineDelay: 45 } : {});
    t.print("", "", el("p", null, el("button", { type: "button", class: "entry back selection_option" }, "ADDRESS MATRIX")));
    document.querySelector("#display .back").focus({ preventScroll: true });
  }

  function choose(t, row, col) {
    Object.assign(spot, { row, col });
    const cell = cells[row][col];
    if (cell.name === "INTERFACE") {
      t.clear();
      t.release();
    } else {
      showReadout(t, cell);
    }
  }

  // ---------- Responses ----------

  // Mother answers a character at a time
  const say = (t, ...lines) => t.type(lines);

  function shipStatusLines() {
    return [
      "",
      "INPUTF         POWER/12492.2                 SHIP:",
      "                                             WEYLAN YUTANI",
      "ACTUAL TIME:   3 JUN                         NOSTROMO 180245",
      "FLIGHT TIME:   5 NOV",
      "",
      "###########################################  FUNCTION:",
      "#     I ==I                  -II -        #  TANKER/REFINERY",
      "#               I=.-.----                 #",
      "#  -I.              -II=-                 #  CAPACITY:",
      "#                                . .-.    #  200 000 000 TONNES",
      "#                  #+*$..  I              #",
      "#             . I  -                      #  GALACTIC POSITION:",
      "#        .II I                            #  270%Rx883'P",
      "#                               .- -I     #",
      "#                                   II .I #  VELOCITY STATUS:",
      "###########################################  59.09% SOL",
      "",
      "",
    ];
  }

  async function shipStatus(t) {
    await t.type(shipStatusLines(), { by: "line", lineDelay: 45 });
  }

  async function theStory(t) {
    await say(t, "NOSTROMO REROUTED TO NEW CO-ORDINATES.", "", "INVESTIGATE LIFE FORM. GATHER SPECIMEN.", "", "");
  }

  async function evaluateProcedures(t) {
    story.proceduresEvaluated = true;
    await say(t, "UNABLE TO COMPUTE", ins("AVAILABLE DATA INSUFFICIENT"), "", "");
  }

  async function parametersUndefined(t) {
    await say(t, "UNABLE TO COMPUTE", ins("PARAMETERS UNDEFINED"), "", "");
  }

  async function requestOptions(t) {
    if (!story.proceduresEvaluated) return parametersUndefined(t);
    await t.sleep(1000);
    await say(t, "UNABLE TO COMPUTE", ins("AVAILABLE DATA INSUFFICIENT"), "", "");
  }

  async function myChances(t) {
    if (!story.proceduresEvaluated) return parametersUndefined(t);
    await say(t, ins("DOES NOT COMPUTE"), "", "");
  }

  async function requestScienceClarification(t) {
    story.clarificationRequested = true;
    await say(t, ins("UNABLE TO CLARIFY"), "", "");
  }

  async function requestEnhancement(t) {
    if (!story.clarificationRequested) return say(t, "NO FURTHER ENHANCEMENT", "", "");
    await say(t, "NO FURTHER ENHANCEMENT", "", "SPECIAL ORDER 937", "", ins("SCIENCE OFFICER EYES ONLY"), "", "");
  }

  async function specialOrder937(t) {
    if (!story.commandOverride) return say(t, ins("SCIENCE OFFICER EYES ONLY"), "", "");
    await say(t, "\n", "NOSTROMO REROUTED", "TO NEW CO-ORDINATES.", "", "INVESTIGATE LIFE FORM. GATHER SPECIMEN.", "\n\n");
    await t.sleep(700);
    await say(t, "PRIORITY ONE", "", "INSURE RETURN OF ORGANISM FOR ANALYSIS.", "", "ALL OTHER CONSIDERATIONS SECONDARY.", "\n\n");
    await t.sleep(1400);
    await t.type(["CREW EXPENDABLE."], { cps: 18 });
    t.print("", "");
  }

  async function couldNotParse(t) {
    await say(t, "COULD NOT PARSE COMMAND", "", "");
  }

  // ---------- Queries ----------

  // whole lines from the film, and a few close to them
  const SCRIPT = {
    "what's the story mother?": theStory,
    "request evaluation of current procedures to terminate alien": evaluateProcedures,
    "can we kill the alien?": evaluateProcedures,
    "request options for possible procedure": requestOptions,
    "what are my chances?": myChances,
    "request clarification on science inability to neutralize alien": requestScienceClarification,
    "request enhancement": requestEnhancement,
    "what is special order 937 ?": specialOrder937,
    "what is special order 937?": specialOrder937,
    "ship status": shipStatus,
    "address matrix": showMatrix,
    matrix: showMatrix,
  };

  const ONE_LINERS = {
    "ship registration": "NOSTROMO 182246",
    "ship name": "NOSTROMO 182246",
  };

  const commands = {
    help(t) {
      return say(t, "", "NOSTROMO INTERFACE 2037", "WEYLAND-YUTANI HUMAN INTERFACE LABS", "", "");
    },

    // EMERGENCY COMMAND OVERRIDE 100375. The film spells it OVERIDE.
    async emergency(t, args) {
      const full = args.join(" ");
      if (full === "command override 100375" || full === "command overide 100375") {
        story.commandOverride = true;
      } else if (full === "command override" || full === "command overide") {
        await say(t, "", "MISSING OVERRIDE ACCESS CODE", "", "");
      } else if (/command overr?ide \d+/.test(full)) {
        await say(t, "", "INVALID COMMAND OVERRIDE ACCESS", ins("SESSION LOGGED"), "ACCESS LOCKED", "", "");
        t.lock();
      } else {
        await couldNotParse(t);
      }
    },
  };

  function fallback(t, line) {
    if (Object.hasOwn(SCRIPT, line)) return SCRIPT[line](t) || true;
    if (Object.hasOwn(ONE_LINERS, line)) return say(t, "", ONE_LINERS[line], "", "");
    return false;
  }

  // ---------- The terminal ----------

  const t = Terminal.create({
    prompt: "\nINTERFACE 2037 READY FOR INQUIRY\n\n",
    commands,
    fallback,
    unrecognized: () => "UNABLE TO PARSE INPUT.",
    // The screen shows everything in capitals, so people type in capitals.
    // Match queries without caring about case.
    filters: [(line) => line.toLowerCase()],
    clearOnCommand: true,
    typingSpeed: 80,
    cps: 55,
    onEscape: (t) => showMatrix(t, { quick: true }),
  });
  window.term = t;

  // the matrix and its readouts take the arrow keys, Enter, and Escape
  document.getElementById("display").addEventListener("keydown", (e) => {
    const entry = e.target.closest?.(".entry");
    if (!entry) return;
    const arrows = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
    if (arrows[e.key] && !entry.classList.contains("back")) {
      e.preventDefault();
      move(...arrows[e.key]);
    } else if (e.key === "Escape" && entry.classList.contains("back")) {
      e.preventDefault();
      showMatrix(t, { quick: true });
    }
  });

  document.getElementById("display").addEventListener("click", (e) => {
    const entry = e.target.closest?.(".entry");
    if (!entry) return;
    if (entry.classList.contains("back")) showMatrix(t, { quick: true });
    else choose(t, +entry.dataset.row, +entry.dataset.col);
  });

  t.boot((t) => showMatrix(t));
})();
