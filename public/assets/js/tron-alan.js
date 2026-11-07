/*
  Alan's terminal at ENCOM in TRON (1982). The film shows it only briefly,
  so most of this imagines ENCOM's developer terminals as a Unix of the
  "future".
*/

(function () {
  "use strict";

  const ROY = "My new control system isn't a mind reader. -Roy";

  // ---------- Files ----------

  const home = {
    path: "/home/alan1/projects/tron",
    files: {
      "tron.c": ["FILE LISTING UNAVAILABLE", "PROGRAM LOCKED BY MCP"],
    },
  };

  // ---------- The clock ----------
  // Alan's screen reads "SEPT 22, 18:32:21PM" when you sit down, and the
  // clock runs from there. ENCOM was filmed in California, so it's Pacific
  // Daylight Time, Wednesday 22 September 1982. Everyone gets the same time,
  // wherever they are. The film's format puts PM after a 24-hour time;
  // keep that.

  const PDT = -7 * 60 * 60 * 1000;
  const sitDown = Date.now();
  const filmTime = Date.UTC(1982, 8, 22, 18, 32, 21) - PDT;

  function timestamp(ms) {
    const d = new Date(ms + PDT); // read with the UTC getters, this is PDT
    const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUNE", "JULY", "AUG", "SEPT", "OCT", "NOV", "DEC"];
    const two = (n) => String(n).padStart(2, "0");
    const h = d.getUTCHours();
    const time = `${two(h)}:${two(d.getUTCMinutes())}:${two(d.getUTCSeconds())}${h < 12 ? "AM" : "PM"}`;
    return `${months[d.getUTCMonth()]} ${d.getUTCDate()}, ${time}`;
  }

  // ---------- Commands ----------

  const commands = {
    ls(t, args) {
      for (const name of args) {
        if (!Object.hasOwn(home.files, name)) return t.print(`ls: ${name}: No such file or directory`);
      }
      t.print((args.length ? args : Object.keys(home.files)).join(" "));
    },

    cat(t, [name]) {
      if (!name) return t.print("USAGE: CAT [FILENAME]");
      if (!Object.hasOwn(home.files, name)) return t.print(`cat: ${name}: No such file or directory`);
      t.print(...home.files[name]);
    },

    pwd(t) {
      t.print(home.path);
    },

    service(t, [action, name]) {
      if (action !== "start" && action !== "stop") return t.print("USAGE: SERVICE [START|STOP] [COMMAND]", ROY);
      if (!name) return t.print(`USAGE: SERVICE ${action.toUpperCase()} [COMMAND]`, ROY);
      if (action === "start") {
        if (name === "tron") return t.print("ADDRESS FILE EMPTY", "TRON PROGRAM UNAVAILABLE");
        return t.print(`SERVICE "${name}" NOT REGISTERED`);
      }
      if (name === "mcp") return t.print("UNAUTHORIZED ACCESS", "COMMAND DERESOLVED", "INCIDENT LOGGED");
      if (name === "tron") return t.print('SERVICE "tron" NOT RUNNING');
      t.print(`SERVICE "${name}" NOT REGISTERED`);
    },

    date(t) {
      t.print(timestamp(filmTime + (Date.now() - sitDown)));
    },
  };

  // ---------- The terminal ----------

  const t = Terminal.create({
    prompt: "\n$ ",
    commands,
    typingSpeed: 60,
    cursor: "steady",
  });
  window.term = t;

  t.boot((t) => t.run("service start tron"));
})();
