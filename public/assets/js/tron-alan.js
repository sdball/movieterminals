/*
  Alan's terminal at ENCOM in TRON (1982). The film shows it only briefly,
  so most of this imagines ENCOM's developer terminals as a Unix of the
  "future".

  The puzzle: the MCP emptied Alan's address file, so Tron won't start.
  Lora copied it into the laser lab this morning. Alan can't list the lab
  directory, but he can read a file there if he knows its name.

    mail                      Lora has a copy of TRON in the laser lab
    finger lora               today's log is log.0922 (or talk lora)
    cat /lab/laser/log.0922   she copied it to addr.bak
    cp /lab/laser/addr.bak tron.addr
    service start tron        Tron runs, and the MCP ends the session

  date gives the log's name too (SEPT 22, so 0922). Poking at what the MCP
  guards raises its suspicion; at the top it logs Alan out, and he keeps
  what he's done.

  A second ending, for anyone who types Flynn's lines from the lab scene:
  the MCP takes over, and the laser digitizes you.
*/

(function () {
  "use strict";

  const ROY = "My new control system isn't a mind reader. -Roy";
  const USER = { name: "alan1", groups: ["alan1", "encom"] };
  const HOME = "/home/alan1";
  const PROJECT = `${HOME}/projects/tron`;
  const PROMPT = "\n$ ";
  const sleep = Terminal.sleep;

  // ---------- The clock ----------
  // Alan's screen reads "SEPT 22, 18:32:21PM" when you sit down, and the
  // clock runs from there. ENCOM was filmed in California, so it's Pacific
  // Daylight Time, Wednesday 22 September 1982. Everyone gets the same time,
  // wherever they are. The film's format puts PM after a 24-hour time;
  // keep that.

  const PDT = -7 * 60 * 60 * 1000;
  const sitDown = Date.now();
  const filmTime = Date.UTC(1982, 8, 22, 18, 32, 21) - PDT;
  const two = (n) => String(n).padStart(2, "0");

  // now, as a Date read with the UTC getters (it's PDT)
  const filmNow = () => new Date(filmTime + (Date.now() - sitDown) + PDT);

  function timestamp() {
    const d = filmNow();
    const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUNE", "JULY", "AUG", "SEPT", "OCT", "NOV", "DEC"];
    const h = d.getUTCHours();
    const time = `${two(h)}:${two(d.getUTCMinutes())}:${two(d.getUTCSeconds())}${h < 12 ? "AM" : "PM"}`;
    return `${months[d.getUTCMonth()]} ${d.getUTCDate()}, ${time}`;
  }

  // for ls -l: "Sep 22 18:40"
  function stamp() {
    const d = filmNow();
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${months[d.getUTCMonth()]} ${String(d.getUTCDate()).padStart(2)} ${two(d.getUTCHours())}:${two(d.getUTCMinutes())}`;
  }

  // ---------- Files ----------
  // Owners and modes work like Unix, so the lab directory (--x for others)
  // and the failing mv fall out of the rules. A guarded file or directory
  // is the MCP's: touching it raises suspicion.

  const dir = (owner, group, mode, mtime, children, extra) => ({ type: "dir", owner, group, mode, mtime, children, ...extra });
  const file = (owner, group, mode, mtime, lines, extra) => ({ type: "file", owner, group, mode, mtime, lines, ...extra });
  const binary = (owner, group, mtime, junk) => file(owner, group, "rwxr-xr-x", mtime, [junk], { binary: true });

  const ADDRESSES = [
    "# tron.addr -- addresses for TRON to watch",
    "# alan1  rev 14  09/21/82",
    "JA 307020   TRON",
    "MC 000001   MASTER CONTROL PROGRAM",
    "EX 226104   EXTERNAL DATA LINES",
    "DU 551930   DIAL-UP PORTS",
  ];

  const root = dir("root", "root", "rwxr-xr-x", "Jan 12 09:00", {
    bin: dir("root", "root", "rwxr-xr-x", "Jan 12 09:00", {
      cat: binary("root", "root", "Jan 12 09:00", "§Ðÿÿ ELF?¶¶ cat: %s ää"),
      cp: binary("root", "root", "Jan 12 09:00", "§Ðÿÿ cp: %s þä usage"),
      ls: binary("root", "root", "Jan 12 09:00", "§Ðÿÿ ls -l¶ total %d ä"),
      mail: binary("root", "root", "Jan 12 09:00", "§Ðÿÿ /usr/spool/mail/%s ä"),
      sh: binary("root", "root", "Jan 12 09:00", "§Ðÿÿ $ ¶¶PATH= ää"),
    }),
    etc: dir("root", "root", "rwxr-xr-x", "Sep 20 16:12", {
      motd: file("root", "root", "rw-r--r--", "Sep 20 16:12", [
        "ENCOM TIME-SHARING SYSTEM",
        "All sessions are monitored by Master Control.",
      ]),
      passwd: file("root", "root", "rw-r--r--", "Sep 20 16:12", [
        "root:*:0:0:System:/:/bin/sh",
        "mcp:*:1:1:Master Control Program:/mcp:",
        "gibbs:*:101:100:Walter Gibbs:/home/gibbs:/bin/sh",
        "dillinger:*:102:100:Ed Dillinger:/home/dillinger:/bin/sh",
        "lora:*:107:100:Lora Baines:/home/lora:/bin/sh",
        "alan1:*:108:100:Alan Bradley:/home/alan1:/bin/sh",
      ]),
    }),
    home: dir("root", "root", "rwxr-xr-x", "Sep 20 16:12", {
      alan1: dir("alan1", "encom", "rwxr-xr-x", "Sep 22 08:31", {
        ".plan": file("alan1", "encom", "rw-r--r--", "Sep 13 10:02", ["Get Tron running."]),
        projects: dir("alan1", "encom", "rwxr-xr-x", "Sep 21 17:40", {
          tron: dir("alan1", "encom", "rwxr-xr-x", "Sep 22 17:58", {
            "tron.c": file("mcp", "mcp", "r--------", "Sep 22 17:58", ["FILE LISTING UNAVAILABLE", "PROGRAM LOCKED BY MCP"], { guarded: true }),
            "tron.addr": file("alan1", "encom", "rw-r--r--", "Sep 22 17:58", []),
          }),
        }),
      }),
      dillinger: dir("dillinger", "encom", "rwx------", "Sep 22 06:45", {}),
      gibbs: dir("gibbs", "encom", "rwx--x--x", "Sep 17 12:20", {
        ".plan": file("gibbs", "encom", "rw-r--r--", "Sep 17 12:20", ["In the lab. Knock."]),
      }),
      lora: dir("lora", "encom", "rwx--x--x", "Sep 22 07:52", {
        ".plan": file("lora", "encom", "rw-r--r--", "Sep 22 07:52", [
          "At the laser all evening. Today's log is log.0922 if anyone needs the numbers.",
        ]),
      }),
    }),
    lab: dir("root", "root", "rwxr-xr-x", "Aug 30 14:00", {
      laser: dir("lora", "laser", "rwx--x--x", "Sep 22 18:20", {
        "log.0920": file("lora", "laser", "rw-r--r--", "Sep 20 19:02", [
          "LASER LAB -- EXPERIMENT LOG -- 09/20/82",
          "08:35  power up. calibration nominal.",
          "13:10  run 38: test object digitized. reintegration 91%.",
          "16:45  run 39: digitized. reintegration 94%. better.",
          "19:00  power down.",
        ], { hang: 7 }),
        "log.0921": file("lora", "laser", "rw-r--r--", "Sep 21 18:47", [
          "LASER LAB -- EXPERIMENT LOG -- 09/21/82",
          "08:40  power up. calibration nominal.",
          "11:05  run 40: digitized. reintegration 96%.",
          "15:30  MCP requested the experiment schedule.",
          "18:45  power down.",
        ], { hang: 7 }),
        "log.0922": file("lora", "laser", "rw-r--r--", "Sep 22 18:20", [
          "LASER LAB -- EXPERIMENT LOG -- 09/22/82",
          "08:40  power up. calibration nominal.",
          "09:10  copied alan1's tron.addr to addr.bak. he'll want a spare, with Dillinger reviewing everything.",
          "11:30  run 41: test object digitized. reintegration 97%.",
          "14:15  run 42: digitized. reintegration 99.1%. Walter pleased.",
          "17:58  MCP requested the experiment schedule again. third time today.",
          "18:20  told Alan where the backup is.",
        ], { hang: 7 }),
        "addr.bak": file("lora", "laser", "rw-r--r--", "Sep 22 09:10", ADDRESSES),
      }),
    }),
    mcp: dir("mcp", "mcp", "rwx------", "Sep 22 18:32", {}, { guarded: true }),
    usr: dir("root", "root", "rwxr-xr-x", "Jan 12 09:00", {
      games: dir("root", "root", "rwxr-xr-x", "Jun 04 11:15", {
        space_paranoids: binary("dillinger", "encom", "Jun 04 11:15",
          "§Ðÿ SPACE PARANOIDS (C) 1982 E. DILLINGER ¶¶ K.FLYNNää rev 3"),
        matrix_blaster: binary("dillinger", "encom", "Jun 04 11:15",
          "§Ðÿ MATRIX BLASTER (C) 1982 E. DILLINGER ¶ ä rev 2"),
      }),
    }),
  });

  // ---------- Paths ----------

  const state = {
    cwd: PROJECT,
    suspicion: 0,
    mail: false,            // at the mail program's & prompt
    unread: new Set([1, 2, 3]),
    current: 0,             // the message mail last showed
    flynn: false,           // the MCP thinks you're Flynn
  };

  function split(path) {
    let base = state.cwd;
    if (path === "~" || path.startsWith("~/")) {
      base = HOME;
      path = path.slice(1);
    } else if (path.startsWith("/")) base = "/";
    const parts = base.split("/").filter(Boolean);
    for (const part of path.split("/")) {
      if (!part || part === ".") continue;
      if (part === "..") parts.pop();
      else parts.push(part);
    }
    return parts;
  }

  const join = (parts) => "/" + parts.join("/");

  function can(node, bit) {
    const i = { r: 0, w: 1, x: 2 }[bit];
    if (node.owner === USER.name) return node.mode[i] !== "-";
    if (USER.groups.includes(node.group)) return node.mode[3 + i] !== "-";
    return node.mode[6 + i] !== "-";
  }

  // walk to a path: { node, parts } or { error }
  function find(path) {
    const parts = split(path);
    let node = root;
    for (const part of parts) {
      if (node.type !== "dir") return { error: "Not a directory" };
      if (!can(node, "x")) return { error: "Permission denied", guarded: node.guarded };
      if (!Object.hasOwn(node.children, part)) return { error: "No such file or directory" };
      node = node.children[part];
    }
    return { node, parts };
  }

  // lines that wrap under their text, not their prefix (a log's timestamps,
  // "lora: " in talk): the screen wraps long lines at its own width
  const hang = (width, lines) => lines.map((line) => (line ? Terminal.el("p", { class: "hang", style: `--hang: ${width}ch` }, line) : line));

  const size = (node) => (node.type === "dir" ? 512 : node.lines.reduce((sum, line) => sum + line.length + 1, 0));

  // ---------- The MCP watching ----------

  const WARNINGS = [
    "MCP: THIS TERMINAL IS MONITORED.",
    "MCP: ALAN1. YOUR ACCESS IS UNDER REVIEW.",
    "MCP: I WOULDN'T, ALAN1.",
  ];

  async function suspect(t, amount = 1) {
    state.suspicion += amount;
    if (state.suspicion > WARNINGS.length) return logout(t, ["MCP: SESSION TERMINATED.", "MCP: END OF LINE."]);
    await sleep(500);
    await t.type([WARNINGS[state.suspicion - 1]], { cps: 40 });
  }

  // the soft logout: the session ends, files stay as they are
  async function logout(t, lines) {
    if (lines) {
      await sleep(500);
      await t.type(lines, { cps: 40 });
    }
    await sleep(1200);
    t.clear();
    state.cwd = PROJECT;
    state.suspicion = 0;
    leaveMail(t);
    await sleep(1600);
    await login(t);
  }

  async function login(t) {
    await t.type(["ENCOM TIME-SHARING SYSTEM", "", "login: alan1", "Password:"], { cps: 30 });
    await sleep(500);
    t.print(`Last login: Wed Sep 22 18:32 on tty7`);
    if (state.unread.size) t.print("You have mail.");
  }

  // ---------- Mail ----------

  const MESSAGES = [
    {
      from: "dillinger", date: "Wed Sep 22 09:14", subject: "Priority access 7",
      body: [
        "Effective immediately, priority access 7 is suspended pending a security review. All projects in progress are frozen. Direct any questions to my office.",
        "",
        "  Ed Dillinger",
        "  Senior Executive Vice President",
      ],
    },
    {
      from: "MCP", date: "Wed Sep 22 17:58", subject: "tron.addr",
      body: [
        `${PROJECT}/tron.addr`,
        "0 RECORDS. CONTENTS RECLAIMED BY MASTER CONTROL.",
        "",
        "END OF LINE.",
      ],
    },
    {
      from: "lora", date: "Wed Sep 22 18:20", subject: "thanks",
      body: [
        "Thanks for letting us use a copy of TRON to monitor the laser lab endpoints. MCP systems have been trying to get access to the laser for days.",
        "",
        "L.",
      ],
    },
  ];

  function headers(t) {
    const unread = state.unread.size;
    t.print(`${MESSAGES.length} messages${unread ? `, ${unread} new` : ""}`);
    MESSAGES.forEach((m, i) => {
      const n = i + 1;
      const mark = (n === (state.current || 1) ? ">" : " ") + (state.unread.has(n) ? "N" : " ");
      t.print(`${mark} ${String(n).padStart(2)} ${m.from.padEnd(10)} ${m.date}  ${m.subject}`);
    });
  }

  function read(t, n) {
    const m = MESSAGES[n - 1];
    if (!m) return t.print(`${n}: Invalid message number`);
    state.current = n;
    state.unread.delete(n);
    t.print(`Message ${n}:`, `From: ${m.from}  ${m.date}`, "To: alan1", `Subject: ${m.subject}`, "", ...m.body);
  }

  function leaveMail(t) {
    state.mail = false;
    t.setPrompt(PROMPT);
  }

  // what's typed at the & prompt
  function mailCommand(t, line) {
    const word = line.trim();
    if (/^\d+$/.test(word)) return read(t, Number(word));
    if (word === "n" || word === "+" || word === "p") {
      const next = word === "p" ? state.current || 1 : state.current + 1;
      if (next > MESSAGES.length) return t.print("At EOF");
      return read(t, next);
    }
    if (word === "-") return state.current > 1 ? read(t, state.current - 1) : t.print("Nonzero address required");
    if (word === "h") return headers(t);
    if (word === "q" || word === "x" || word === "exit" || word === "quit") return leaveMail(t);
    if (word === "?" || word === "help") {
      return t.print("  <number>  read that message", "  n         next message", "  -         previous message", "  h         list messages", "  q         quit");
    }
    t.print(`Unknown command: "${word}"`);
  }

  // ---------- Commands ----------

  const commands = {
    // the built-in help would list the mail prompt's command too
    help(t) {
      t.print(t.el("h3", "help"), t.el("ul", null, Object.keys(commands).filter((name) => name !== "&").map((name) => t.el("li", name))));
    },

    "&": (t, args) => mailCommand(t, args.join(" ")),

    mail(t, [n]) {
      if (n) {
        if (!/^\d+$/.test(n)) return t.print("usage: mail [message number]");
        return read(t, Number(n));
      }
      headers(t);
      state.mail = true;
      t.setPrompt("\n& ");
    },

    ls(t, args) {
      const flags = args.filter((a) => a.startsWith("-")).join("");
      const all = flags.includes("a");
      const long = flags.includes("l");
      const paths = args.filter((a) => !a.startsWith("-"));
      let guarded = false;
      const targets = paths.length ? paths : ["."];
      targets.forEach((path, i) => {
        const found = find(path);
        if (found.error) {
          guarded ||= found.guarded;
          return t.print(`ls: ${path}: ${found.error}`);
        }
        const { node } = found;
        const line = (name, n) => long
          ? `${n.type === "dir" ? "d" : "-"}${n.mode}  ${n.owner.padEnd(9)} ${n.group.padEnd(6)} ${String(size(n)).padStart(5)} ${n.mtime} ${name}`
          : name;
        if (node.type === "file") return t.print(line(path, node));
        if (!can(node, "r")) {
          guarded ||= node.guarded;
          return t.print(`ls: ${path}: Permission denied`);
        }
        if (targets.length > 1) {
          if (i) t.print("");
          t.print(`${path}:`);
        }
        const entries = Object.entries(node.children).filter(([name]) => all || !name.startsWith("."));
        if (all) entries.unshift([".", node], ["..", find(join(found.parts.slice(0, -1))).node]);
        if (long) t.print(...entries.map(([name, n]) => line(name, n)));
        else if (entries.length) t.print(entries.map(([name, n]) => (n.type === "dir" ? name + "/" : name)).join("  "));
      });
      if (guarded) return suspect(t);
    },

    cd(t, [path = "~"]) {
      const found = find(path);
      if (found.error) {
        t.print(`cd: ${path}: ${found.error}`);
        return found.guarded ? suspect(t) : undefined;
      }
      if (found.node.type !== "dir") return t.print(`cd: ${path}: Not a directory`);
      if (!can(found.node, "x")) {
        t.print(`cd: ${path}: Permission denied`);
        return found.node.guarded ? suspect(t) : undefined;
      }
      state.cwd = join(found.parts);
    },

    pwd(t) {
      t.print(state.cwd);
    },

    cat(t, paths) {
      if (!paths.length) return t.print("USAGE: CAT [FILENAME]");
      let guarded = false;
      for (const path of paths) {
        const found = find(path);
        if (found.error) {
          guarded ||= found.guarded;
          t.print(`cat: ${path}: ${found.error}`);
          continue;
        }
        const { node } = found;
        if (node.type === "dir") {
          t.print(`cat: ${path}: Is a directory`);
        } else if (node.guarded) {
          // the MCP's own answer, not a plain Permission denied
          guarded = true;
          t.print(...node.lines);
        } else if (!can(node, "r")) {
          t.print(`cat: ${path}: Permission denied`);
        } else if (node.lines.length) {
          t.print(...(node.hang ? hang(node.hang, node.lines) : node.lines));
        }
      }
      if (guarded) return suspect(t);
    },

    cp(t, args) {
      return copy(t, args, false);
    },

    mv(t, args) {
      return copy(t, args, true);
    },

    rm(t, paths) {
      if (!paths.length) return t.print("usage: rm file ...");
      for (const path of paths) {
        const found = find(path);
        if (found.error) {
          t.print(`rm: ${path}: ${found.error}`);
          continue;
        }
        if (found.node.type === "dir") {
          t.print(`rm: ${path}: is a directory`);
          continue;
        }
        if (found.node.guarded) {
          t.print(`rm: ${path}: Operation not permitted`);
          return suspect(t);
        }
        const parent = find(join(found.parts.slice(0, -1))).node;
        if (!can(parent, "w")) {
          t.print(`rm: ${path}: Permission denied`);
          continue;
        }
        delete parent.children[found.parts[found.parts.length - 1]];
      }
    },

    whoami(t) {
      t.print(USER.name);
    },

    who(t) {
      t.print(
        "alan1     tty7     Sep 22 08:31",
        "lora      tty3     Sep 22 07:52   (laser bay)",
        "dillinger console  Sep 22 06:45",
        "flynn     ttyd0    Sep 22 18:11   (dialup)",
      );
    },

    finger(t, [name]) {
      if (!name) return commands.who(t);
      const people = {
        alan1: ["Alan Bradley", "On since Wed Sep 22 08:31 on tty7", HOME],
        lora: ["Lora Baines", "On since Wed Sep 22 07:52 on tty3 (laser bay)", "/home/lora"],
        dillinger: ["Ed Dillinger", "On since Wed Sep 22 06:45 on console", "/home/dillinger"],
        gibbs: ["Walter Gibbs", "Last login Fri Sep 17 12:20 on tty2", "/home/gibbs"],
        mcp: ["Master Control Program", "On since Tue Jan 12 09:00", "/mcp"],
      };
      if (!Object.hasOwn(people, name)) return t.print(`finger: ${name}: no such user.`);
      const [full, since, home] = people[name];
      t.print(`Login: ${name.padEnd(16)} Name: ${full}`, `Directory: ${home}`, since);
      const plan = find(`${home}/.plan`);
      if (plan.node && can(plan.node, "r")) t.print("Plan:", ...plan.node.lines);
      else t.print("No Plan.");
    },

    async talk(t, [name]) {
      if (!name) return t.print("usage: talk user");
      if (name === "lora") {
        t.print("[Waiting for your party to respond]");
        await sleep(1400);
        t.print("[Connection established]");
        await sleep(600);
        await t.type(hang(6, [
          "lora: alan? your address file's blank? I backed it up in the lab this morning. log.0922 says where.",
          "lora: you can't ls the directory, but you can cat a file in it if you know the name.",
          "lora: hurry. the MCP's been asking about the laser all day.",
        ]), { cps: 45 });
        await sleep(700);
        return t.print("[Your party has hung up]");
      }
      if (name === "mcp") {
        t.print("[Waiting for your party to respond]");
        await sleep(1400);
        return suspect(t);
      }
      if (name === "dillinger") return t.print("[Your party is refusing messages]");
      if (name === "flynn") {
        t.print("[Waiting for your party to respond]");
        await sleep(1400);
        return t.print("~#%@&!~  NO CARRIER");
      }
      if (name === "alan1") return t.print("talk: you can't talk to yourself");
      if (name === "gibbs") return t.print("[Your party is not logged on]");
      t.print(`talk: ${name}: no such user`);
    },

    ps(t) {
      t.print(
        "  PID TTY      TIME CMD",
        "    1 ?     9999:59 mcp",
        "  211 tty7     0:00 sh",
        "  240 tty7     0:00 ps",
      );
    },

    kill(t, args) {
      const hard = args.includes("-9");
      const [pid] = args.filter((a) => !a.startsWith("-"));
      if (!pid) return t.print("usage: kill [-9] pid");
      if (pid === "1" || pid === "mcp") {
        t.print(`kill: ${pid}: Operation not permitted`);
        return suspect(t, hard ? 2 : 1);
      }
      if (pid === "211") return logout(t);
      t.print(`kill: ${pid}: No such process`);
    },

    async request(t, args, line) {
      if (/reindeer flotilla|access code 6|ps 17/i.test(line)) return takeover(t);
      await sleep(600);
      await t.type(["REQUEST DENIED.", "PRIORITY ACCESS 7 SUSPENDED."], { cps: 40 });
      return suspect(t);
    },

    service(t, [action, name]) {
      if (action !== "start" && action !== "stop") return t.print("USAGE: SERVICE [START|STOP] [COMMAND]", ROY);
      if (!name) return t.print(`USAGE: SERVICE ${action.toUpperCase()} [COMMAND]`, ROY);
      if (action === "start") {
        if (name === "tron") return startTron(t);
        return t.print(`SERVICE "${name}" NOT REGISTERED`);
      }
      if (name === "mcp") {
        t.print("UNAUTHORIZED ACCESS", "COMMAND DERESOLVED", "INCIDENT LOGGED");
        return suspect(t);
      }
      if (name === "tron") return t.print('SERVICE "tron" NOT RUNNING');
      t.print(`SERVICE "${name}" NOT REGISTERED`);
    },

    date(t) {
      t.print(timestamp());
    },
  };

  // cp and mv: one file to a file or a directory
  function copy(t, args, move) {
    const cmd = move ? "mv" : "cp";
    if (args.length !== 2) return t.print(`usage: ${cmd} source target`);
    const [from, to] = args;
    const src = find(from);
    if (src.error) return t.print(`${cmd}: ${from}: ${src.error}`);
    if (src.node.type === "dir") return t.print(`${cmd}: ${from} is a directory`);
    if (src.node.guarded) {
      t.print(`${cmd}: ${from}: Operation not permitted`);
      return suspect(t);
    }
    if (!can(src.node, "r")) return t.print(`${cmd}: ${from}: Permission denied`);
    const srcParent = find(join(src.parts.slice(0, -1))).node;
    if (move && !can(srcParent, "w")) return t.print(`${cmd}: ${from}: Permission denied`);

    let dst = find(to);
    let parts;
    if (dst.node?.type === "dir") parts = [...dst.parts, src.parts[src.parts.length - 1]];
    else parts = split(to);
    const name = parts[parts.length - 1];
    const parent = find(join(parts.slice(0, -1)));
    if (parent.error) return t.print(`${cmd}: ${to}: ${parent.error}`);
    if (parent.node.type !== "dir") return t.print(`${cmd}: ${to}: Not a directory`);
    if (join(parts) === join(src.parts)) return t.print(`${cmd}: ${from} and ${to} are identical`);
    const existing = parent.node.children[name];
    if (existing?.type === "dir") return t.print(`${cmd}: ${to}: Is a directory`);
    if (existing?.guarded) {
      t.print(`${cmd}: ${to}: Operation not permitted`);
      return suspect(t);
    }
    if (existing ? !can(existing, "w") : !can(parent.node, "w")) return t.print(`${cmd}: ${to}: Permission denied`);

    if (move) {
      delete srcParent.children[src.parts[src.parts.length - 1]];
      parent.node.children[name] = src.node;
    } else if (existing) {
      existing.lines = [...src.node.lines];
      existing.binary = src.node.binary;
      existing.mtime = stamp();
    } else {
      parent.node.children[name] = file(USER.name, "encom", "rw-r--r--", stamp(), [...src.node.lines], { binary: src.node.binary });
    }
  }

  // ---------- Starting Tron ----------

  async function startTron(t) {
    const found = find(`${PROJECT}/tron.addr`);
    if (!found.node || found.node.type !== "file") return t.print("ADDRESS FILE NOT FOUND", "TRON PROGRAM UNAVAILABLE");
    const addresses = found.node.lines.filter((line) => /^[A-Z]{2} \d{6}\b/.test(line));
    if (!addresses.length) return t.print("ADDRESS FILE EMPTY", "TRON PROGRAM UNAVAILABLE");

    await t.type([`LOADING ADDRESS FILE... ${addresses.length} ADDRESS${addresses.length === 1 ? "" : "ES"}`], { by: "line" });
    await sleep(900);
    await t.type(["TRON PROGRAM ACTIVE", "MONITORING MASTER CONTROL COMMUNICATIONS"], { by: "line", lineDelay: 600 });
    await sleep(2200);
    await t.type(["", "MCP: ALAN1.", "MCP: PRIORITY ACCESS 7 CANCELLED.", "MCP: YOUR PROGRAM WILL BE DEALT WITH.", "MCP: END OF LINE."], { cps: 30 });
    await sleep(1200);
    end(t);
  }

  // ---------- Flynn ----------
  // In the lab, Flynn types REQUEST: ACCESS CODE 6, PASSWORD SERIES PS 17,
  // REINDEER FLOTILLA, and the MCP takes over the terminal. He answers with
  // CODE SERIES LSU-123... ACTIVATE. We don't see what that does, only that
  // the MCP is afraid, and then it digitizes him with the laser. What the
  // MCP says in between is invented.

  async function takeover(t) {
    await sleep(800);
    t.clear();
    await sleep(900);
    await t.type(["YOU SHOULDN'T HAVE COME BACK FLYNN"], { cps: 14 });
    state.flynn = true;
  }

  async function activate(t) {
    if (!state.flynn) return t.print("CODE SERIES LSU-123 NOT RECOGNIZED");
    await sleep(700);
    await t.type(["MCP: STOP.", "MCP: WHAT ARE YOU DOING.", "MCP: STOP IT."], { cps: 24 });
    await sleep(900);
    await t.type(["", "LASER: POWER UP", "LASER: TARGET ACQUIRED", "LASER: DIGITIZING"], { by: "line", lineDelay: 900 });
    await sleep(1200);
    end(t, "DIGITIZATION COMPLETE");
  }

  // Tron is loose (or you're inside); the rest is the movie. Any key sits
  // you down again.
  function end(t, line = "TRON PROGRAM ACTIVE") {
    t.lock();
    const screen = document.getElementById("screen");
    screen.append(t.el("div", { id: "ending", role: "status" },
      t.el("p", null, line),
      t.el("p", { class: "again" }, "Press any key to sit down again"),
    ));
    setTimeout(() => {
      const again = () => location.reload();
      document.addEventListener("keydown", again, { once: true });
      screen.addEventListener("click", again, { once: true });
    }, 1500);
  }

  // ---------- The terminal ----------

  const t = Terminal.create({
    prompt: PROMPT,
    commands,
    // at the mail program's & prompt, every line goes to mail
    filters: [(line) => (state.mail ? `& ${line}` : line)],
    // the film's "REQUEST: MASTER CONTROL PROGRAM ..." in any case
    fallback(t, line) {
      if (/^request\b|reindeer flotilla/i.test(line)) return commands.request(t, [], line);
      if (/lsu-?123/i.test(line)) return activate(t);
      return false;
    },
    typingSpeed: 60,
    cursor: "steady",
  });
  window.term = t;

  t.boot(async (t) => {
    await t.run("service start tron");
    t.print("You have mail.");
  });
})();
