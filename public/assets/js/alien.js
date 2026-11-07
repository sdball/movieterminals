/*
  MU-TH-UR 6000, the Nostromo's computer in Alien (1979), through
  Interface 2037.

  The screen clears on every query, the way it does in the film, and most
  queries are whole phrases, matched in SCRIPT and in fallback() below.
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

  // ---------- Responses ----------

  function addressMatrix(t) {
    t.print(
      "OVERMONITORING ADDRESS MATRIX",
      "",
      "CRFX         OM2077AM     LALLIGNMENT    SM2093",
      "ATTITUDE     SM2078       PHOTO F        SM2094",
      "WASTE HEAT   2080         MAINS",
      "RAD          2081         IUA            SM2096",
      "VENT         2082AM       2LA            SM2097",
      "NAVIGATION   M2083        3RA            SM2098",
      "TIME         M2084        4LHA           SM2099",
      "GAL POS                   GRAY GRIDS",
      "COMMAND      20865C       INERTIAL DAMP  3002AM",
      el("p", null, el("span", { class: "selection_option" }, "INTERFACE    2037"), "         DECK A         A3003"),
      "ATTN         2087SC       DECK B         A3004",
      "ALERT        2088SC       DECK C         A3005",
      "MATRIAL      2090         LIFE SUPPORT",
      "OVERLOCK     M2091        0%             M3003AM",
      "",
      "",
    );
  }

  function shipStatus(t) {
    t.print(
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
    );
  }

  function theStory(t) {
    t.print("NOSTROMO REROUTED TO NEW CO-ORDINATES.", "", "INVESTIGATE LIFE FORM. GATHER SPECIMEN.", "", "");
  }

  function evaluateProcedures(t) {
    story.proceduresEvaluated = true;
    t.print("UNABLE TO COMPUTE", ins("AVAILABLE DATA INSUFFICIENT"), "", "");
  }

  function parametersUndefined(t) {
    t.print("UNABLE TO COMPUTE", ins("PARAMETERS UNDEFINED"), "", "");
  }

  async function requestOptions(t) {
    if (!story.proceduresEvaluated) return parametersUndefined(t);
    await t.sleep(1000);
    t.print("UNABLE TO COMPUTE", ins("AVAILABLE DATA INSUFFICIENT"), "", "");
  }

  function myChances(t) {
    if (!story.proceduresEvaluated) return parametersUndefined(t);
    t.print(ins("DOES NOT COMPUTE"), "", "");
  }

  function requestScienceClarification(t) {
    story.clarificationRequested = true;
    t.print(ins("UNABLE TO CLARIFY"), "", "");
  }

  function requestEnhancement(t) {
    if (!story.clarificationRequested) return t.print("NO FURTHER ENHANCEMENT", "", "");
    t.print("NO FURTHER ENHANCEMENT", "", "SPECIAL ORDER 937", "", ins("SCIENCE OFFICER EYES ONLY"), "", "");
  }

  function specialOrder937(t) {
    if (!story.commandOverride) return t.print(ins("SCIENCE OFFICER EYES ONLY"), "", "");
    t.print(
      "\n",
      "NOSTROMO REROUTED",
      "TO NEW CO-ORDINATES.",
      "",
      "INVESTIGATE LIFE FORM. GATHER SPECIMEN.",
      "\n\n",
      "PRIORITY ONE",
      "",
      "INSURE RETURN OF ORGANISM FOR ANALYSIS.",
      "",
      "ALL OTHER CONSIDERATIONS SECONDARY.",
      "\n\n",
      "CREW EXPENDABLE.",
      "",
      "",
    );
  }

  function couldNotParse(t) {
    t.print("COULD NOT PARSE COMMAND", "", "");
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
  };

  const ONE_LINERS = {
    "ship registration": "NOSTROMO 182246",
    "ship name": "NOSTROMO 182246",
  };

  const commands = {
    help(t) {
      t.print("", "NOSTROMO INTERFACE 2037", "WEYLAND-YUTANI HUMAN INTERFACE LABS", "", "");
    },

    // EMERGENCY COMMAND OVERRIDE 100375. The film spells it OVERIDE.
    emergency(t, args) {
      const full = args.join(" ");
      if (full === "command override 100375" || full === "command overide 100375") {
        story.commandOverride = true;
      } else if (full === "command override" || full === "command overide") {
        t.print("", "MISSING OVERRIDE ACCESS CODE", "", "");
      } else if (/command overr?ide \d+/.test(full)) {
        t.print("", "INVALID COMMAND OVERRIDE ACCESS", ins("SESSION LOGGED"), "ACCESS LOCKED", "", "");
        t.lock();
      } else {
        couldNotParse(t);
      }
    },
  };

  function fallback(t, line) {
    if (Object.hasOwn(SCRIPT, line)) return SCRIPT[line](t) || true;
    if (Object.hasOwn(ONE_LINERS, line)) {
      t.print("", ONE_LINERS[line], "", "");
      return true;
    }
    if (line === "ship status") {
      shipStatus(t);
      return true;
    }
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
  });
  window.term = t;

  t.boot(async (t) => {
    addressMatrix(t);
    await t.run("WHAT'S THE STORY MOTHER?");
  });
})();
