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
  // Alan's clock reads 6:32:03 PM EDT, Wednesday 22 September 1982, when you
  // sit down, and runs from there. Everyone gets the same time, wherever
  // they are.

  const EDT = -4 * 60 * 60 * 1000;
  const sitDown = Date.now();
  const filmTime = Date.UTC(1982, 8, 22, 18, 32, 3) - EDT;

  function timestamp(ms) {
    const d = new Date(ms + EDT); // read with the UTC getters, this is EDT
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const two = (n) => String(n).padStart(2, "0");
    const time = `${two(d.getUTCHours())}:${two(d.getUTCMinutes())}:${two(d.getUTCSeconds())}`;
    return `${days[d.getUTCDay()]} ${months[d.getUTCMonth()]} ${two(d.getUTCDate())} ${d.getUTCFullYear()} ${time} GMT-0400 (EDT)`;
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
