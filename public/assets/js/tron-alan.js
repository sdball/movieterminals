/*
  Alan's terminal at ENCOM in TRON (1982). The film shows it only briefly,
  so most of this imagines ENCOM's developer terminals as a Unix of the
  "future".

  In the film, Dillinger has suspended all Group 7 access: someone with
  Group 7 clearance has been breaking into the system. Alan's screen calls
  it PRIORITY ACCESS 7. Here it's a Unix group, group7, marked suspended in
  /etc/group, and Flynn's old account is in it. (Flynn's plan is to forge a
  Group 6 access; that's the lab scene, the second ending below.)

  The puzzle: the MCP emptied Alan's address file, so Tron won't start.
  Lora copied it into the laser lab this morning. Alan can't list the lab
  directory, but he can read a file there if he knows its name.

    mail                      Lora has a copy of TRON in the laser lab
    query lora                today's log is log.0922 (or talk lora,
                              or ps aux: she's editing it)
    cat /lab/laser/log.0922   she copied it to addr.bak
    cp /lab/laser/addr.bak tron.addr
    service start tron        Tron runs, and the MCP ends the session

  date gives the log's name too (SEPT 22, so 0922). Poking at what the MCP
  guards raises its suspicion; at the top it logs Alan out, and he keeps
  what he's done.

  Off the path, for the curious: /usr/adm/messages (Flynn's dial-ins and
  CLU's end) and /tmp/core (what CLU was looking for). Who really wrote
  Space Paranoids is in the games' version strings, but the MCP has sealed
  them for Dillinger: the games run, and nothing reads them. Proving it is
  the whole film, so it waits until the MCP is offline: then the games
  lose guarded and become rwxr-xr-x, and what shows who wrote them.

  A second ending, for anyone who types Flynn's lines from the lab scene:
  the MCP takes over, and the laser digitizes you.
*/

(function () {
  "use strict";

  const ROY = "My new control system isn't a mind reader. -Roy";
  const HOME = "/home/alan1";
  const PROJECT = `${HOME}/projects/tron`;
  const PROMPT = "\n$ ";
  const HOST = "encom";
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
  const booted = Date.UTC(1982, 0, 12, 9, 0, 0); // read with the UTC getters, like filmNow()
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

  // files and directories (see Files, below)
  const dir = (owner, group, mode, mtime, children, extra) => ({ type: "dir", owner, group, mode, mtime, children, ...extra });
  const file = (owner, group, mode, mtime, lines, extra) => ({ type: "file", owner, group, mode, mtime, lines, ...extra });
  const dev = (owner, group, mode, major, minor, extra) => ({ type: "dev", owner, group, mode, mtime: "Jan 12 09:00", major, minor, lines: [], ...extra });

  // ---------- Users and groups ----------
  // /etc/passwd and /etc/group are made from these, and id, groups, and
  // query read them. A suspended group still lists its members, but
  // doesn't count for them: that's Dillinger's freeze.
  //
  // In 1982 /etc/passwd holds the password hashes themselves (DES crypt:
  // two characters of salt, eleven of hash), readable by everyone. "*" never
  // matches, so the MCP, which never logs in, can't, and neither can Flynn
  // since he was fired. But the night before, he made himself three more
  // accounts (see The staff), and that's who keeps dialing in with Group 7
  // clearance. The cast's hashes are real; they're for anyone who cracks
  // them.
  //
  // Access groups go by department: group2 is the executives, up to group7,
  // Software, which Dillinger has frozen. There's no group1: gid 1 is the
  // MCP's.

  const SUSPENDED = "group 7 (priority access 7), SUSPENDED";

  const USERS = {
    root: { hash: "RqqxOAuYFSQT.", uid: 0, gid: 0, full: "System", home: "/", since: "Last login Tue Jan 12 09:00 on console" },
    mcp: { uid: 1, gid: 1, full: "Master Control Program", home: "/mcp", shell: "", since: "On since Tue Jan 12 09:00", access: "ALL" },
    gibbs: { hash: "wGpl7nTXNzEig", uid: 101, gid: 100, full: "Walter Gibbs", dept: "Laser Lab", phone: 4500, home: "/home/gibbs", since: "Last login Fri Sep 17 12:20 on tty2", access: "group 6" },
    dillinger: { hash: "x7uzr8GKPNuI6", uid: 102, gid: 100, full: "Ed Dillinger", dept: "Executive", phone: 1000, home: "/home/dillinger", since: "On since Wed Sep 22 06:45 on console", access: "group 2, group 6" },
    roy: { hash: "RosfPDhCfgdHY", uid: 104, gid: 100, full: "Roy Abernathy", dept: "Systems", phone: 4300, home: "/home/roy", since: "Last login Wed Sep 22 16:40 on tty5", access: "group 6" },
    lora: { hash: "Lbciv4XkOnpeY", uid: 107, gid: 100, full: "Lora Baines", dept: "Laser Lab", phone: 4512, home: "/home/lora", since: "On since Wed Sep 22 07:52 on tty3 (laser bay)", access: SUSPENDED },
    alan1: { hash: "a1EyoPqmaMO0U", uid: 108, gid: 100, full: "Alan Bradley", dept: "Software", phone: 4471, home: HOME, since: "On since Wed Sep 22 08:31 on tty7", access: SUSPENDED },
    flynn: { uid: 109, gid: 7, full: "Kevin Flynn", dept: "Software", phone: 4440, home: "/home/flynn", since: "Last login Thu Jun 03 23:58 on ttyd0 (dialup)", access: "group 7, ACCOUNT CLOSED 06/04/82" },
  };

  const GROUP_TABLE = [
    { name: "root", gid: 0, members: ["root"] },
    { name: "mcp", gid: 1, members: ["mcp"] },
    { name: "group2", gid: 2, members: ["dillinger"] },
    { name: "group3", gid: 3, members: [] },
    { name: "group4", gid: 4, members: [] },
    { name: "group5", gid: 5, members: [] },
    { name: "group6", gid: 6, members: ["dillinger", "gibbs", "roy"] },
    { name: "group7", gid: 7, members: ["alan1", "lora"], suspended: true },
    { name: "encom", gid: 100, members: [] },
    { name: "laser", gid: 110, members: ["lora", "gibbs"] },
  ];

  const groupById = (gid) => GROUP_TABLE.find((g) => g.gid === gid);
  const groupByName = (name) => GROUP_TABLE.find((g) => g.name === name);

  // ---------- The staff ----------
  // ENCOM's other 150 employees, made up the same way on every visit: a
  // seeded random number generator over names of the period. They fill
  // /etc/passwd, /etc/group, /home, and last, so grep has something to dig
  // through. Accounts are a first name and a number, like alan1 (so there's
  // an alan2).

  function seeded(seed) {
    return () => {
      seed = (seed + 0x6d2b79f5) | 0;
      let x = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
      return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
    };
  }
  const random = seeded(1982);
  const pick = (list) => list[Math.floor(random() * list.length)];
  const between = (lo, hi) => lo + Math.floor(random() * (hi - lo + 1));
  function shuffle(list) {
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    return list;
  }

  const FIRST = [
    "Barbara", "Betty", "Bill", "Bob", "Brenda", "Carol", "Charles", "Cheryl", "Chris", "Cindy",
    "Dan", "Dave", "Debbie", "Dennis", "Diane", "Don", "Donna", "Doug", "Frank", "Gail",
    "Gary", "Gerald", "Glenn", "Greg", "Harold", "Howard", "Jack", "Jan", "Janet", "Jeff",
    "Jerry", "Jim", "Joan", "Joe", "John", "Judy", "Karen", "Kathy", "Ken", "Larry",
    "Laura", "Linda", "Lynn", "Marcia", "Marilyn", "Mark", "Martin", "Mary", "Mike", "Nancy",
    "Neil", "Pam", "Pat", "Paul", "Peggy", "Phil", "Ray", "Rick", "Rita", "Ron",
    "Ruth", "Sandy", "Sharon", "Sheila", "Steve", "Sue", "Terry", "Tom", "Vicki", "Wayne",
    "Wendy", "Stan", "Carl", "Gloria", "Irene", "Lois", "Norman", "Ted",
  ];

  const LAST = [
    "Abbott", "Alvarez", "Andersen", "Arnold", "Baker", "Barrett", "Becker", "Bishop", "Boyd", "Brennan",
    "Burke", "Calloway", "Carver", "Castillo", "Chang", "Chen", "Cohen", "Cole", "Conrad", "Crane",
    "Delgado", "Dixon", "Doyle", "Dunn", "Ellis", "Engel", "Farrell", "Fischer", "Fleming", "Foster",
    "Garza", "Gilbert", "Goldberg", "Gordon", "Greene", "Hale", "Hammond", "Harper", "Hayes", "Hoffman",
    "Holt", "Ito", "Jacobs", "Jensen", "Kaplan", "Keller", "Kim", "Kowalski", "Lambert", "Larsen",
    "Lee", "Lowell", "Lund", "Mahoney", "Marsh", "Mendoza", "Meyer", "Miller", "Moreno", "Nakamura",
    "Novak", "Olsen", "Ortega", "Park", "Pierce", "Porter", "Quinn", "Ramirez", "Reed", "Reyes",
    "Rhodes", "Rossi", "Russo", "Sato", "Schultz", "Shapiro", "Sherman", "Silva", "Snyder", "Sorensen",
    "Stein", "Sullivan", "Tanaka", "Thornton", "Torres", "Vance", "Vogel", "Wagner", "Walsh", "Watts",
    "Weiss", "Whitman", "Wong", "Yamamoto", "Young", "Zimmerman",
  ];

  // [department, access group, how many]
  const DEPARTMENTS = [
    ["Executive", "group2", 6],
    ["Accounting", "group3", 12],
    ["Legal", "group3", 5],
    ["Personnel", "group3", 7],
    ["Marketing", "group4", 14],
    ["Sales", "group4", 12],
    ["Facilities", "group4", 8],
    ["Hardware", "group5", 16],
    ["Games", "group5", 22],
    ["Systems", "group6", 14],
    ["Laser Lab", "group6", 6],
    ["Software", "group7", 28],
  ];

  // each one goes in someone's .plan, once
  const PLANS = [
    "Out until the 27th.",
    "Lunch.",
    "Stop querying me. I'm working.",
    "Quarterly figures due Friday.",
    "Ask me about the softball team.",
    "If I'm not here, I'm at Flynn's.",
    "Group 7 frozen. Guess I'll finally clean my desk.",
    "Group 7 frozen. Nobody will say why.",
    "Who keeps booking the laser at 3 a.m.?",
    "The MCP asked for my schedule twice today. Why does a computer want my schedule?",
    "Anyone else's files go missing this week? Mine came back with a note from the MCP.",
    "Moving to the 6th floor Monday.",
    "Cafeteria closes at 7. Plan accordingly.",
    "Testing the new disc game. Do not disturb.",
    "Light cycle prototype: ask in the games lab.",
    "Read the security memo. Then read it again.",
    "Gone fishing. Really.",
    "Dillinger's office: by appointment only.",
    "Working late. Again.",
    "On vacation. The MCP has my number.",
    "New extension, see the phone list.",
    "I miss the old system. It never said END OF LINE.",
    "Remember when Flynn ran the games lab? Those were good days.",
    "Space Paranoids high score, 3rd floor break room. Come and get it.",
    "Don't send requests to the MCP after six. It knows.",
    "Ordered 40 new terminals. Where do they all go?",
    "The arcade cabinets on 4 need quarters, not memos.",
    "My terminal printed my name this morning. I didn't type anything.",
  ];

  const SALT = "./0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  const fakeHash = () => Array.from({ length: 13 }, () => pick(SALT)).join("");

  // the days wtmp covers (it begins Fri Sep 17), and before
  const DAYS = ["Fri Sep 17", "Mon Sep 20", "Tue Sep 21", "Wed Sep 22"];
  const EARLIER = ["Mon Sep 13", "Tue Sep 14", "Wed Sep 15", "Thu Sep 16"];
  const hhmm = (minutes) => `${two(Math.floor(minutes / 60))}:${two(minutes % 60)}`;

  // logins for last: { who, tty, from, day (index in DAYS), start, end }
  // in minutes, end null while logged in
  const LOGINS = [
    { who: "sam1", tty: "ttyd0", from: "dialup", day: 3, start: 18 * 60 + 11, end: null },
    { who: "alan1", tty: "tty7", from: "", day: 3, start: 8 * 60 + 31, end: null },
    { who: "lora", tty: "tty3", from: "laser bay", day: 3, start: 7 * 60 + 52, end: null },
    { who: "dillinger", tty: "console", from: "", day: 3, start: 6 * 60 + 45, end: null },
    { who: "roy", tty: "tty5", from: "", day: 3, start: 16 * 60 + 40, end: 17 * 60 + 55 },
    { who: "lou1", tty: "ttyd0", from: "dialup", day: 2, start: 23 * 60 + 41, end: 23 * 60 + 46 },
    { who: "lora", tty: "tty3", from: "laser bay", day: 2, start: 8 * 60 + 38, end: 18 * 60 + 50 },
    { who: "alan1", tty: "tty7", from: "", day: 2, start: 8 * 60 + 29, end: 17 * 60 + 44 },
    { who: "dillinger", tty: "console", from: "", day: 2, start: 7 * 60 + 2, end: 19 * 60 + 30 },
    { who: "kurt1", tty: "ttyd0", from: "dialup", day: 2, start: 2 * 60 + 10, end: 2 * 60 + 58 },
    { who: "lou1", tty: "ttyd0", from: "dialup", day: 1, start: 23 * 60 + 15, end: 23 * 60 + 20 },
    { who: "lora", tty: "tty3", from: "laser bay", day: 1, start: 8 * 60 + 31, end: 19 * 60 + 6 },
    { who: "alan1", tty: "tty7", from: "", day: 1, start: 8 * 60 + 30, end: 18 * 60 + 2 },
    { who: "dillinger", tty: "console", from: "", day: 1, start: 6 * 60 + 58, end: 20 * 60 + 15 },
    { who: "gibbs", tty: "tty2", from: "", day: 0, start: 12 * 60 + 20, end: 16 * 60 + 5 },
  ];

  // what ps aux shows; the evening's staff add their own
  const PROCESSES = [
    { user: "mcp", pid: 1, tty: "?", time: "9999:59", cmd: "mcp" },
    { user: "dillinger", pid: 96, tty: "console", time: "0:04", cmd: "sh" },
    { user: "lora", pid: 118, tty: "tty3", time: "0:12", cmd: "vi /lab/laser/log.0922" },
    { user: "sam1", pid: 187, tty: "ttyd0", time: "0:01", cmd: "sh" },
    { user: "alan1", pid: 211, tty: "tty7", time: "0:00", cmd: "sh" },
  ];

  // legitimate dial-ins, for /usr/adm/messages
  const DIALINS = [];

  const STAFF_HOMES = {};
  {
    const generated = [];
    const taken = new Set(Object.keys(USERS));
    const names = new Set(Object.values(USERS).map((u) => u.full));
    const counts = { alan: 1 };
    const phones = new Set(Object.values(USERS).map((u) => u.phone));
    const people = shuffle(DEPARTMENTS.flatMap(([dept, group, n]) => Array.from({ length: n }, () => ({ dept, group }))));
    const planned = new Map(shuffle(people.slice()).slice(0, PLANS.length).map((p, i) => [p, PLANS[i]]));
    const ttys = ["tty0", "tty1", "tty4", "tty5", "tty6", "tty8", "tty9", "ttya", "ttyb", "ttyc"];
    let uid = 110;
    people.forEach((person, i) => {
      // two more Alans, after Alan Bradley
      let first;
      let full;
      do {
        first = i === 23 || i === 97 ? "Alan" : pick(FIRST);
        full = `${first} ${pick(LAST)}`;
      } while (names.has(full));
      names.add(full);
      const base = first.toLowerCase().slice(0, 7);
      counts[base] = (counts[base] || 0) + 1;
      const name = base + counts[base];
      taken.add(name);
      generated.push(name);
      let phone;
      do phone = between(4000, 4999); while (phones.has(phone));
      phones.add(phone);
      uid += between(1, 3);

      // the last few days at a terminal, for last; most of ENCOM doesn't
      // log in every day
      let latest = null;
      DAYS.forEach((_, day) => {
        if (random() > 0.12) return;
        const start = between(7 * 60 + 30, 15 * 60);
        const closing = day === 3 ? 18 * 60 + 25 : 21 * 60;
        const end = Math.min(start + between(20, 9 * 60), between(start + 20, closing));
        const login = { who: name, tty: pick(ttys), from: "", day, start, end };
        LOGINS.push(login);
        latest = login;
      });
      const since = latest
        ? `Last login ${DAYS[latest.day]} ${hhmm(latest.start)} on ${latest.tty}`
        : `Last login ${pick(EARLIER)} ${hhmm(between(8 * 60, 17 * 60))} on ${pick(ttys)}`;
      const mtime = latest ? `Sep ${DAYS[latest.day].slice(-2)} ${hhmm(latest.end)}` : `Sep ${between(13, 16)} ${hhmm(between(8 * 60, 17 * 60))}`;

      USERS[name] = {
        hash: fakeHash(), uid, gid: 100, full, dept: person.dept, phone, home: `/home/${name}`, since,
        access: person.group === "group7" ? SUSPENDED : `group ${person.group.slice(-1)}`,
      };
      groupByName(person.group).members.push(name);
      if (person.dept === "Laser Lab") groupByName("laser").members.push(name);

      const mode = pick(["rwxr-xr-x", "rwxr-xr-x", "rwx--x--x", "rwx--x--x", "rwx------"]);
      const plan = planned.get(person);
      STAFF_HOMES[name] = dir(name, "encom", mode, mtime, plan ? { ".plan": file(name, "encom", "rw-r--r--", mtime, [plan]) } : {});
    });

    // Flynn's way back in: three accounts he made the night before he was
    // fired, before his access was taken away. They're the last uids in the
    // file, one after another, with his old extension and one password.
    // He takes turns with them on ttyd0.
    [["sam1", "Sam Ostrander", "sMMRmDSQUg.Yk"], ["lou1", "Lou Clement", "L1RVqiR9NXgHU"], ["kurt1", "Kurt Wexler", "kUchfwBOdAzJM"]]
      .forEach(([name, full, hash], i) => {
        USERS[name] = { hash, uid: uid + 1 + i, gid: 100, full, dept: "Software", phone: 4440, home: `/home/${name}`, access: SUSPENDED };
        groupByName("group7").members.push(name);
        STAFF_HOMES[name] = dir(name, "encom", "rwx------", `Jun 03 23:${50 + i * 2}`, {});
      });

    // this evening: people working late at the hardwired terminals, and a
    // few dialed in from home
    const hardwired = ["tty0", "tty1", "tty2", "tty4", "tty5", "tty6", "tty8", "tty9", "ttya", "ttyb", "ttyc", "ttye", "ttyf", "ttyg", "ttyh", "ttyi", "ttyj", "ttyk"];
    const commands = ["sh", "sh", "sh", "sh", "vi notes", "mail", "cc -O disc.c", "nroff -ms memo", "ed report", "more /etc/motd"];
    const pids = new Set(PROCESSES.map((p) => p.pid).concat(240));
    shuffle(generated.slice()).slice(0, hardwired.length + 3).forEach((name, i) => {
      for (let j = LOGINS.length - 1; j >= 0; j--) if (LOGINS[j].who === name && LOGINS[j].day === 3) LOGINS.splice(j, 1);
      const dialup = i >= hardwired.length;
      const tty = dialup ? `ttyd${i - hardwired.length + 1}` : hardwired[i];
      const start = dialup ? between(17 * 60 + 30, 18 * 60 + 30) : between(13 * 60, 18 * 60 + 20);
      LOGINS.push({ who: name, tty, from: dialup ? "dialup" : "", day: 3, start, end: null });
      if (dialup) DIALINS.push({ who: name, tty, day: 3, start });
      let pid;
      do pid = between(120, 239); while (pids.has(pid));
      pids.add(pid);
      PROCESSES.push({ user: name, pid, tty, time: `0:${two(between(0, 40))}`, cmd: pick(commands) });
    });

    // and other nights' dial-ins, so ttyd0 isn't the only one
    for (let i = 0; i < 8; i++) {
      const who = pick(generated);
      const day = between(0, 2);
      const start = between(19 * 60, 22 * 60 + 30);
      const tty = pick(["ttyd1", "ttyd2", "ttyd3"]);
      LOGINS.push({ who, tty, from: "dialup", day, start, end: start + between(10, 90) });
      DIALINS.push({ who, tty, day, start });
    }

    // query's line, from each one's latest login
    for (const [name, u] of Object.entries(USERS)) {
      const latest = LOGINS.filter((l) => l.who === name).sort((a, b) => b.day - a.day || b.start - a.start)[0];
      if (!latest) continue;
      const where = `${DAYS[latest.day]} ${hhmm(latest.start)} on ${latest.tty}${latest.from ? ` (${latest.from})` : ""}`;
      u.since = latest.end === null ? `On since ${where}` : `Last login ${where}`;
    }
  }

  const online = (name) => LOGINS.some((l) => l.who === name && l.end === null);

  // the groups that count for a user: the login group, then the others
  // they're in that aren't suspended
  function groupsOf(name) {
    const primary = groupById(USERS[name].gid);
    const rest = GROUP_TABLE.filter((g) => g !== primary && !g.suspended && g.members.includes(name));
    return [primary, ...rest];
  }

  const USER = { name: "alan1", groups: groupsOf("alan1").map((g) => g.name) };

  // ---------- What's installed ----------
  // help lists these, and /bin and /usr/encom/bin hold them. ENCOM's own
  // commands are customizations; everything else is standard issue.


  const GROUPS = [
    {
      title: "ENCOM COMMANDS", where: "/usr/encom/bin", key: "ENCOM", described: true,
      commands: [
        ["request", "ask the Master Control Program for something", "request [what you want]"],
        ["service", "start or stop a service", "service start|stop [service]"],
      ],
    },
    {
      title: "SYSTEM COMMANDS", where: "/bin", key: "SYSTEM",
      commands: [
        ["cal", "a calendar", "cal [[month] year]"],
        ["cat", "print files", "cat file ..."],
        ["chmod", "change a file's mode", "chmod mode file (mode in octal: 644)"],
        ["cp", "copy a file", "cp from to"],
        ["date", "the date and time", "date"],
        ["env", "your environment", "env"],
        ["file", "guess what a file holds", "file file ..."],
        ["grep", "search files for a pattern", "grep [-i] [-n] [-v] pattern file ..."],
        ["groups", "the groups you're in", "groups [user]"],
        ["head", "the first lines of a file", "head [-n] file"],
        ["hostname", "this system's name", "hostname"],
        ["id", "your user and group IDs", "id [user]"],
        ["kill", "stop a process", "kill [-9] pid"],
        ["last", "who's logged in lately", "last [user]"],
        ["ls", "list a directory", "ls [-a] [-l] [path ...]"],
        ["mail", "read your mail", "mail [message number]"],
        ["man", "the manual", "man command"],
        ["mkdir", "make a directory", "mkdir directory"],
        ["mv", "move a file", "mv from to"],
        ["newgrp", "change to another group", "newgrp group"],
        ["ps", "list processes", "ps [aux]"],
        ["query", "look up a user, plan and all (ENCOM's finger)", "query [user]"],
        ["rm", "remove files", "rm file ..."],
        ["rmdir", "remove an empty directory", "rmdir directory"],
        ["strings", "the text in a binary file", "strings file"],
        ["su", "become another user", "su [user]"],
        ["tail", "the last lines of a file", "tail [-n] file"],
        ["talk", "talk to someone who's logged in", "talk user"],
        ["touch", "make a file, or update its time", "touch file"],
        ["uname", "the system's name and version", "uname [-a]"],
        ["uptime", "how long the system's been up", "uptime"],
        ["wc", "count lines, words, and characters", "wc file ..."],
        ["what", "find version (SCCS) strings in a file", "what file ..."],
        ["who", "who's logged in", "who"],
        ["whoami", "who you are", "whoami"],
      ],
    },
    {
      title: "SHELL BUILT-INS",
      commands: [
        ["cd", "change directory", "cd [path]"],
        ["clear", "clear the screen", "clear"],
        ["echo", "print its arguments, with $VARIABLES filled in", "echo [words]"],
        ["exit", "log out", "exit"],
        ["help", "this list, or help [command]", "help [command]"],
        ["history", "what you've typed", "history [count]"],
        ["logout", "log out", "logout"],
        ["pwd", "print the current directory", "pwd"],
      ],
    },
  ];

  const entryFor = (name) => GROUPS.flatMap((g) => g.commands).find(([n]) => n === name);

  // a directory's worth of programs, from a group above
  function programs(key, group, mtime, extra = []) {
    const names = [...GROUPS.find((g) => g.key === key).commands.map(([name]) => name), ...extra].sort();
    return Object.fromEntries(names.map((name) => {
      const usage = entryFor(name)?.[2] || name;
      return [name, file("root", group, "rwxr-xr-x", mtime,
        [`§Ðÿÿ ${name}¶¶ usage: ${name} ää`],
        { binary: true, strings: [`usage: ${usage}`, `@(#)${name}.c 4.1 (ENCOM) 01/12/82`] })];
    }));
  }

  // ---------- Files ----------
  // Owners and modes work like Unix, so the lab directory (--x for others)
  // and the failing mv fall out of the rules. A guarded file or directory
  // is the MCP's: touching it raises suspicion. A guarded file answers with
  // its sealed lines, if it has them, instead of its contents.

  const ADDRESSES = [
    "# tron.addr -- addresses for TRON to watch",
    "# alan1  rev 14  09/21/82",
    "JA 307020   TRON",
    "MC 000001   MASTER CONTROL PROGRAM",
    "EX 226104   EXTERNAL DATA LINES",
    "DU 551930   DIAL-UP PORTS",
  ];

  // Space Paranoids says Dillinger; its version strings say otherwise
  const GAMES = {
    space_paranoids: {
      title: "SPACE PARANOIDS",
      strings: [
        "SPACE PARANOIDS",
        "(C) 1982 E. DILLINGER",
        "INSERT COIN",
        "HIGH SCORES",
        "@(#)paranoids.c 3.1 11/02/81 kflynn",
        "@(#)recognizer.c 1.4 10/19/81 kflynn",
        "@(#)tanks.c 2.2 12/15/81 kflynn",
        "@(#)credits.c 3.2 06/04/82 dillinger",
      ],
      junk: "§Ðÿ SPACE PARANOIDS (C) 1982 E. DILLINGER ¶¶ käflynnää rev 3",
    },
    matrix_blaster: {
      title: "MATRIX BLASTER",
      strings: [
        "MATRIX BLASTER",
        "(C) 1982 E. DILLINGER",
        "INSERT COIN",
        "@(#)blaster.c 2.0 08/27/81 kflynn",
        "@(#)credits.c 3.2 06/04/82 dillinger",
      ],
      junk: "§Ðÿ MATRIX BLASTER (C) 1982 E. DILLINGER ¶ ä rev 2",
    },
  };

  // the comment field is BSD's: name, office, phone
  const passwd = Object.entries(USERS)
    .sort(([, a], [, b]) => a.uid - b.uid)
    .map(([name, u]) => {
      const gecos = [u.full, u.dept, u.phone && `x${u.phone}`].filter(Boolean).join(",");
      return `${name}:${u.hash || "*"}:${u.uid}:${u.gid}:${gecos}:${u.home}:${u.shell ?? "/bin/sh"}`;
    });
  const groupFile = GROUP_TABLE.map((g) => `${g.name}:${g.suspended ? "*SUSPENDED*" : "*"}:${g.gid}:${g.members.join(",")}`);

  const root = dir("root", "root", "rwxr-xr-x", "Jan 12 09:00", {
    bin: dir("root", "root", "rwxr-xr-x", "Jan 12 09:00", programs("SYSTEM", "root", "Jan 12 09:00", ["sh"])),
    dev: dir("root", "root", "rwxr-xr-x", "Sep 22 18:11", {
      console: dev("dillinger", "encom", "rw--w----", 0, 0),
      laser0: dev("root", "laser", "rw-rw----", 14, 0),
      mem: dev("mcp", "mcp", "r--------", 3, 0, { guarded: true, lines: ["MEMORY RESERVED FOR MASTER CONTROL"] }),
      null: dev("root", "root", "rw-rw-rw-", 3, 2),
      tty3: dev("lora", "encom", "rw--w----", 1, 3),
      tty7: dev("alan1", "encom", "rw--w----", 1, 7),
      ttyd0: dev("sam1", "encom", "rw--w----", 2, 0),
    }),
    etc: dir("root", "root", "rwxr-xr-x", "Sep 22 06:52", {
      group: file("root", "root", "rw-r--r--", "Sep 22 06:52", groupFile),
      motd: file("root", "root", "rw-r--r--", "Sep 20 16:12", [
        "ENCOM TIME-SHARING SYSTEM",
        "All sessions are monitored by Master Control.",
      ]),
      passwd: file("root", "root", "rw-r--r--", "Jun 04 11:15", passwd),
    }),
    home: dir("root", "root", "rwxr-xr-x", "Jun 04 11:15", {
      alan1: dir("alan1", "encom", "rwxr-xr-x", "Sep 22 08:31", {
        ".plan": file("alan1", "encom", "rw-r--r--", "Sep 13 10:02", ["Get Tron running."]),
        ".profile": file("alan1", "encom", "rw-r--r--", "Mar 02 09:40", [
          "PATH=:/usr/encom/bin:/bin:/usr/games",
          "TERM=vt100",
          "export PATH TERM",
          "cat /etc/motd",
        ], { kind: "commands text" }),
        projects: dir("alan1", "encom", "rwxr-xr-x", "Sep 21 17:40", {
          tron: dir("alan1", "group7", "rwxrwx---", "Sep 22 17:58", {
            NOTES: file("alan1", "group7", "rw-rw-r--", "Sep 22 08:40", [
              "TRON -- an independent security program",
              "",
              "Tron monitors all contacts between our system and other",
              "systems. It runs independently of the MCP, and it can",
              "watchdog the MCP as well.",
              "",
              "Addresses go in tron.addr, one a line: XX NNNNNN  NAME",
              "Start it with: service start tron",
              "",
              "9/22  Group 7 frozen. Dillinger is \"reviewing\" it.",
              "      Lora says she has a spare of tron.addr.",
            ]),
            "tron.c": file("mcp", "mcp", "r--------", "Sep 22 17:58", ["FILE LISTING UNAVAILABLE", "PROGRAM LOCKED BY MCP"], { guarded: true }),
            "tron.addr": file("alan1", "group7", "rw-rw-r--", "Sep 22 17:58", []),
          }),
        }),
      }),
      dillinger: dir("dillinger", "encom", "rwx------", "Sep 22 06:45", {}),
      // Flynn's, until Dillinger had it
      flynn: dir("dillinger", "encom", "rwx------", "Jun 04 11:15", {}),
      roy: dir("roy", "encom", "rwxr-xr-x", "Sep 22 17:55", {
        ".plan": file("roy", "encom", "rw-r--r--", "Sep 22 17:55", ["My new control system isn't a mind reader. Say what you mean."]),
      }),
      ...STAFF_HOMES,
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
    // CLU's last moments, left behind
    tmp: dir("root", "root", "rwxrwxrwt", "Sep 21 23:46", {
      core: file("lou1", "encom", "rw-r--r--", "Sep 21 23:46", ["ÿÿ§ CLU ¶ääÐ ÿ FIND ¶ äää DEREZÿÿ"], {
        binary: true,
        kind: "core file from 'clu'",
        strings: [
          "CLU  (C) K. FLYNN",
          "PRIORITY: TOP. FIND THAT FILE.",
          "SEARCH: SPACE PARANOIDS, ORIGINAL SOURCE, FLYNN 1981",
          "SEARCH: /usr/games ... NOT HERE",
          "SEARCH: /home/dillinger ... DENIED",
          "ACCESS: GROUP 7",
          "SECTOR 7: RECOGNIZER",
          "MCP: UNAUTHORIZED PROGRAM. WHO IS YOUR USER?",
          "CLU: YOU AREN'T MAKING ME TALK.",
          "MCP: DEREZZ.",
        ],
      }),
    }),
    usr: dir("root", "root", "rwxr-xr-x", "Jan 12 09:00", {
      adm: dir("root", "root", "rwxr-xr-x", "Sep 22 18:11", {
        messages: file("root", "root", "rw-r--r--", "Sep 22 18:11", [
          "Sep 20 23:15:40 encom login: DIALUP ttyd0, lou1",
          "Sep 20 23:20:02 encom mcp: ttyd0 disconnected",
          "Sep 21 02:10:44 encom login: DIALUP ttyd0, kurt1",
          "Sep 21 02:58:03 encom mcp: ttyd0: search of /usr/games refused",
          "Sep 21 23:41:12 encom login: DIALUP ttyd0, lou1",
          "Sep 21 23:44:30 encom mcp: unauthorized program clu in sector 7, user unknown",
          "Sep 21 23:46:02 encom mcp: clu derezzed; core dumped",
          "Sep 22 06:52:15 encom mcp: dillinger: all group7 access suspended",
          "Sep 22 06:52:16 encom mcp: group7 projects frozen: tron (alan1)",
          "Sep 22 17:58:00 encom mcp: /home/alan1/projects/tron/tron.addr reclaimed",
          "Sep 22 17:58:40 encom mcp: laser0: experiment schedule requested",
          "Sep 22 18:11:09 encom login: DIALUP ttyd0, sam1",
          "Sep 22 18:11:10 encom mcp: ttyd0 watched",
        ].concat(DIALINS.map(({ who, tty, day, start }) =>
          `Sep ${DAYS[day].slice(-2)} ${hhmm(start)}:${two(between(0, 59))} encom login: DIALUP ${tty}, ${who}`)).sort(), { hang: 22 }),
        wtmp: file("root", "root", "rw-r--r--", "Sep 22 18:11", ["¶tty7ääalan1ÿÿ¶ttyd0ääsam1ÿÿ¶consoleädillingerÿ"], { binary: true, kind: "data" }),
      }),
      encom: dir("root", "encom", "rwxr-xr-x", "Aug 02 15:30", {
        bin: dir("root", "encom", "rwxr-xr-x", "Aug 02 15:30", programs("ENCOM", "encom", "Aug 02 15:30")),
      }),
      // run them, but don't read them: execute-only, and the MCP's
      games: dir("root", "root", "rwxr-xr-x", "Jun 04 11:15", Object.fromEntries(Object.entries(GAMES).map(([name, game]) =>
        [name, file("dillinger", "encom", "rwx--x--x", "Jun 04 11:15", [game.junk], {
          binary: true,
          strings: game.strings,
          guarded: true,
          sealed: ["LISTING UNAVAILABLE", "SEALED BY MASTER CONTROL FOR E. DILLINGER"],
        })]))),
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

  const parentOf = (found) => find(join(found.parts.slice(0, -1))).node;
  const baseName = (parts) => parts[parts.length - 1];

  // the shell expands * and ? anywhere in a path, in directories it can
  // read; otherwise the word stays as typed (so /lab/laser/* finds nothing,
  // as it should). /home/*/.plan works.
  function glob(word) {
    if (!/[*?]/.test(word)) return word;
    let paths = [word.startsWith("/") ? "/" : ""];
    for (const part of word.split("/").filter(Boolean)) {
      const next = [];
      for (const base of paths) {
        if (!/[*?]/.test(part)) {
          next.push(base + part + "/");
          continue;
        }
        const found = find(base || ".");
        if (found.error || found.node.type !== "dir" || !can(found.node, "r")) continue;
        const re = new RegExp("^" + part.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\?/g, ".") + "$");
        for (const name of Object.keys(found.node.children).sort()) {
          if (re.test(name) && (!name.startsWith(".") || part.startsWith("."))) next.push(base + name + "/");
        }
      }
      paths = next;
    }
    const matches = paths.map((path) => path.slice(0, -1)).filter((path) => !find(path).error);
    return matches.length ? matches.join(" ") : word;
  }

  // lines that wrap under their text, not their prefix (a log's timestamps,
  // "lora: " in talk): the screen wraps long lines at its own width
  const hang = (width, lines) => lines.map((line) => (line ? Terminal.el("p", { class: "hang", style: `--hang: ${width}ch` }, line) : line));

  const size = (node) => {
    if (node.type === "dir") return 512;
    if (node.type === "dev") return `${node.major}, ${node.minor}`;
    return node.lines.reduce((sum, line) => sum + line.length + 1, 0);
  };

  // how many characters fit across the screen, at most 80 like a real
  // terminal
  function screenWidth() {
    const display = document.getElementById("display");
    if (!display) return 80;
    const probe = Terminal.el("span", { style: "position: absolute; visibility: hidden" }, "0000000000");
    display.append(probe);
    const ch = probe.getBoundingClientRect().width / 10;
    probe.remove();
    const style = getComputedStyle(display);
    const inner = display.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
    return ch ? Math.max(20, Math.min(80, Math.floor(inner / ch))) : 80;
  }

  // names in columns, down then across, like ls
  function columns(names, width = screenWidth()) {
    if (!names.length) return [];
    const w = Math.max(...names.map((n) => n.length)) + 2;
    const across = Math.max(1, Math.floor((width + 2) / w));
    const rows = Math.ceil(names.length / across);
    const lines = [];
    for (let r = 0; r < rows; r++) {
      let line = "";
      for (let c = 0; c * rows + r < names.length; c++) line += names[c * rows + r].padEnd(w);
      lines.push(line.trimEnd());
    }
    return lines;
  }

  // a file's lines, for cat and the like: { lines } or { error } (printed)
  function readFile(t, cmd, path) {
    const found = find(path);
    if (found.error) {
      t.print(`${cmd}: ${path}: ${found.error}`);
      return { guarded: found.guarded };
    }
    const { node } = found;
    if (node.type === "dir") {
      t.print(`${cmd}: ${path}: Is a directory`);
      return {};
    }
    if (node.guarded) {
      // the MCP's own answer, not a plain Permission denied
      t.print(...(node.sealed || node.lines));
      return { guarded: true };
    }
    if (!can(node, "r")) {
      t.print(`${cmd}: ${path}: Permission denied`);
      return {};
    }
    return { node, lines: node.lines };
  }

  // -n 5 or -5 for head and tail
  function countArg(args, fallback = 10) {
    let n = fallback;
    const paths = [];
    for (let i = 0; i < args.length; i++) {
      if (args[i] === "-n") n = Number(args[++i]);
      else if (/^-\d+$/.test(args[i])) n = Number(args[i].slice(1));
      else paths.push(args[i]);
    }
    return { n: Number.isFinite(n) && n >= 0 ? n : fallback, paths };
  }

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
    t.print("Last login: Wed Sep 22 08:31 on tty7", ...root.children.etc.children.motd.lines);
    if (state.unread.size) t.print("You have mail.");
  }

  // ---------- Mail ----------

  const MESSAGES = [
    {
      from: "dillinger", date: "Wed Sep 22 09:14", subject: "Group 7 access",
      body: [
        "Effective immediately, all Group 7 access is suspended pending a security review. Someone with Group 7 clearance has been breaking into the system. All projects in progress are frozen. Direct any questions to my office.",
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

  // ---------- The calendar ----------

  const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const center = (text, width) => " ".repeat(Math.max(0, Math.floor((width - text.length) / 2))) + text;

  // a month as 8 lines of 20 characters. September 1752 is short eleven
  // days, the way cal has always printed it.
  function month(year, m, withYear) {
    const title = withYear ? `${MONTHS[m]} ${year}` : MONTHS[m];
    const lines = [center(title, 20).padEnd(20), " S  M Tu  W Th  F  S"];
    const first = new Date(0);
    first.setUTCFullYear(year, m, 1);
    const last = new Date(0);
    last.setUTCFullYear(year, m + 1, 0);
    let days = Array.from({ length: last.getUTCDate() }, (_, i) => i + 1);
    let start = first.getUTCDay();
    if (year === 1752 && m === 8) {
      days = days.filter((d) => d < 3 || d > 13);
      start = 2;
    }
    let week = "   ".repeat(start);
    days.forEach((d, i) => {
      week += String(d).padStart(2) + " ";
      if ((start + i + 1) % 7 === 0 || i === days.length - 1) {
        lines.push(week.trimEnd().padEnd(20));
        week = "";
      }
    });
    while (lines.length < 8) lines.push(" ".repeat(20));
    return lines;
  }

  function year(y) {
    const across = screenWidth() >= 64 ? 3 : screenWidth() >= 42 ? 2 : 1;
    const width = across * 20 + (across - 1) * 2;
    const lines = [center(String(y), width), ""];
    for (let m = 0; m < 12; m += across) {
      const row = Array.from({ length: Math.min(across, 12 - m) }, (_, i) => month(y, m + i, false));
      if (m) lines.push("");
      for (let i = 0; i < 8; i++) lines.push(row.map((mo) => mo[i]).join("  ").trimEnd());
    }
    return lines.map((line) => line || "");
  }

  // ---------- Commands ----------

  const ENV = {
    HOME,
    LOGNAME: "alan1",
    PATH: ":/usr/encom/bin:/bin:/usr/games",
    SHELL: "/bin/sh",
    TERM: "vt100",
    USER: "alan1",
  };

  const commands = {
    // ENCOM's commands with what they do, everything else by name
    help(t, [name]) {
      if (name) {
        const entry = entryFor(name);
        if (!entry) return t.print(`help: no help for ${name}`);
        return t.print(`${name}: ${entry[1]}`, `usage: ${entry[2]}`);
      }
      const width = screenWidth();
      GROUPS.forEach((group, i) => {
        if (i) t.print("");
        t.print(group.where ? `${group.title}  (${group.where})` : group.title);
        if (group.described) t.print(...hang(11, group.commands.map(([n, what]) => `  ${n.padEnd(9)}${what}`)));
        else t.print(...columns(group.commands.map(([n]) => n), width - 2).map((line) => "  " + line));
      });
      t.print("", "GAMES  (/usr/games)", ...columns(Object.keys(GAMES).sort(), width - 2).map((line) => "  " + line));
      t.print("", "help [command] or man [command] for more.");
    },

    man(t, [name]) {
      if (!name) return t.print("What manual page do you want?");
      const entry = entryFor(name);
      if (!entry) return t.print(`No manual entry for ${name}.`);
      const section = GROUPS.find((g) => g.commands.includes(entry)).key === "ENCOM" ? "1E" : "1";
      t.print(`${name.toUpperCase()}(${section})`, "", "NAME", `     ${name} - ${entry[1]}`, "", "SYNOPSIS", `     ${entry[2]}`);
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
      const type = { dir: "d", file: "-", dev: "c" };
      targets.forEach((path, i) => {
        const found = find(path);
        if (found.error) {
          guarded ||= found.guarded;
          return t.print(`ls: ${path}: ${found.error}`);
        }
        const { node } = found;
        const line = (name, n) => long
          ? `${type[n.type]}${n.mode}  ${n.owner.padEnd(9)} ${n.group.padEnd(6)} ${String(size(n)).padStart(5)} ${n.mtime} ${name}`
          : name;
        if (node.type !== "dir") return t.print(line(path, node));
        if (!can(node, "r")) {
          guarded ||= node.guarded;
          return t.print(`ls: ${path}: Permission denied`);
        }
        if (targets.length > 1) {
          if (i) t.print("");
          t.print(`${path}:`);
        }
        const entries = Object.entries(node.children)
          .filter(([name]) => all || !name.startsWith("."))
          .sort(([a], [b]) => (a < b ? -1 : 1));
        if (all) entries.unshift([".", node], ["..", find(join(found.parts.slice(0, -1))).node]);
        if (long) t.print(...entries.map(([name, n]) => line(name, n)));
        else t.print(...columns(entries.map(([name, n]) => (n.type === "dir" ? name + "/" : name))));
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
        const got = readFile(t, "cat", path);
        guarded ||= got.guarded;
        if (got.lines?.length) t.print(...(got.node.hang ? hang(got.node.hang, got.lines) : got.lines));
      }
      if (guarded) return suspect(t);
    },

    head(t, args) {
      return ends(t, "head", args, (lines, n) => lines.slice(0, n));
    },

    tail(t, args) {
      return ends(t, "tail", args, (lines, n) => (n ? lines.slice(-n) : []));
    },

    wc(t, paths) {
      if (!paths.length) return t.print("usage: wc file ...");
      let guarded = false;
      const total = [0, 0, 0];
      let counted = 0;
      for (const path of paths) {
        const got = readFile(t, "wc", path);
        guarded ||= got.guarded;
        if (!got.lines) continue;
        const counts = [
          got.lines.length,
          got.lines.reduce((sum, line) => sum + line.split(/\s+/).filter(Boolean).length, 0),
          size(got.node),
        ];
        counts.forEach((c, i) => (total[i] += c));
        counted++;
        t.print(counts.map((c, i) => String(c).padStart(i ? 8 : 7)).join("") + " " + path);
      }
      if (counted > 1) t.print(total.map((c, i) => String(c).padStart(i ? 8 : 7)).join("") + " total");
      if (guarded) return suspect(t);
    },

    grep(t, args) {
      const flags = new Set();
      while (args[0]?.startsWith("-") && args[0].length > 1) for (const f of args.shift().slice(1)) flags.add(f);
      const [rawPattern, ...paths] = args;
      if (!rawPattern) return t.print("usage: grep [-i] [-n] [-v] pattern file ...");
      if (!paths.length) return t.print("grep: no files (there's no pipe on this terminal; name a file)");
      const pattern = rawPattern.replace(/^(["'])(.*)\1$/, "$2");
      let re;
      try {
        re = new RegExp(pattern, flags.has("i") ? "i" : "");
      } catch {
        re = new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), flags.has("i") ? "i" : "");
      }
      let guarded = false;
      const out = [];
      for (const path of paths) {
        const found = find(path);
        if (found.node?.type === "dir") continue;
        const got = readFile(t, "grep", path);
        guarded ||= got.guarded;
        if (!got.lines) continue;
        // a binary file: grep its strings, the way you'd want it to
        const lines = got.node.binary ? got.node.strings || [] : got.lines;
        lines.forEach((line, i) => {
          if (re.test(line) === flags.has("v")) return;
          out.push(`${paths.length > 1 ? path + ":" : ""}${flags.has("n") ? i + 1 + ":" : ""}${line}`);
        });
      }
      if (out.length) t.print(...out);
      if (guarded) return suspect(t);
    },

    file(t, paths) {
      if (!paths.length) return t.print("usage: file file ...");
      for (const path of paths) {
        const found = find(path);
        if (found.error) {
          t.print(`${path}: cannot open`);
          continue;
        }
        const n = found.node;
        let what;
        if (n.type === "dir") what = "directory";
        else if (n.type === "dev") what = `character special (${n.major}/${n.minor})`;
        else if (n.guarded || !can(n, "r")) what = "cannot open";
        else if (n.kind) what = n.kind;
        else if (n.binary) what = "executable";
        else if (!n.lines.length) what = "empty";
        else what = "ascii text";
        t.print(`${path}:`.padEnd(Math.max(path.length + 2, 16)) + what);
      }
    },

    strings(t, paths) {
      if (!paths.length) return t.print("usage: strings file ...");
      let guarded = false;
      for (const path of paths) {
        const got = readFile(t, "strings", path);
        guarded ||= got.guarded;
        if (!got.lines) continue;
        const lines = got.node.binary ? got.node.strings || [] : got.lines;
        if (lines.length) t.print(...lines);
      }
      if (guarded) return suspect(t);
    },

    // SCCS version strings: the @(#) lines in a file
    what(t, paths) {
      if (!paths.length) return t.print("usage: what file ...");
      let guarded = false;
      for (const path of paths) {
        const found = find(path);
        if (found.node?.guarded) {
          guarded = true;
          t.print(`${path}:`, ...(found.node.sealed || found.node.lines));
          continue;
        }
        if (found.error || found.node.type !== "file" || !can(found.node, "r")) {
          guarded ||= found.guarded;
          t.print(`${path}: can't open`);
          continue;
        }
        const n = found.node;
        t.print(`${path}:`, ...(n.binary ? n.strings || [] : n.lines)
          .filter((line) => line.includes("@(#)"))
          .map((line) => "        " + line.split("@(#)")[1]));
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
        const parent = parentOf(found);
        if (!can(parent, "w")) {
          t.print(`rm: ${path}: Permission denied`);
          continue;
        }
        delete parent.children[baseName(found.parts)];
      }
    },

    touch(t, paths) {
      if (!paths.length) return t.print("usage: touch file ...");
      for (const path of paths) {
        const found = find(path);
        if (found.node) {
          if (found.node.guarded) {
            t.print(`touch: ${path}: Operation not permitted`);
            return suspect(t);
          }
          if (!can(found.node, "w")) t.print(`touch: ${path}: Permission denied`);
          else found.node.mtime = stamp();
          continue;
        }
        const made = make(t, "touch", path);
        if (made) made.parent.children[made.name] = file(USER.name, made.parent.group, "rw-r--r--", stamp(), []);
      }
    },

    mkdir(t, paths) {
      if (!paths.length) return t.print("usage: mkdir directory ...");
      for (const path of paths) {
        if (find(path).node) {
          t.print(`mkdir: ${path}: File exists`);
          continue;
        }
        const made = make(t, "mkdir", path);
        if (made) made.parent.children[made.name] = dir(USER.name, made.parent.group, "rwxr-xr-x", stamp(), {});
      }
    },

    rmdir(t, paths) {
      if (!paths.length) return t.print("usage: rmdir directory ...");
      for (const path of paths) {
        const found = find(path);
        if (found.error) {
          t.print(`rmdir: ${path}: ${found.error}`);
          continue;
        }
        if (found.node.type !== "dir") {
          t.print(`rmdir: ${path}: Not a directory`);
          continue;
        }
        if (found.node.guarded || !found.parts.length) {
          t.print(`rmdir: ${path}: Operation not permitted`);
          if (found.node.guarded) return suspect(t);
          continue;
        }
        if (Object.keys(found.node.children).length) {
          t.print(`rmdir: ${path}: Directory not empty`);
          continue;
        }
        const parent = parentOf(found);
        if (!can(parent, "w")) {
          t.print(`rmdir: ${path}: Permission denied`);
          continue;
        }
        if (join(found.parts) === state.cwd) state.cwd = join(found.parts.slice(0, -1));
        delete parent.children[baseName(found.parts)];
      }
    },

    chmod(t, [mode, ...paths]) {
      if (!mode || !paths.length || !/^0?[0-7]{3}$/.test(mode)) return t.print("usage: chmod mode file ... (mode in octal, like 644)");
      const bits = [...mode.slice(-3)].map((d) => {
        const n = Number(d);
        return (n & 4 ? "r" : "-") + (n & 2 ? "w" : "-") + (n & 1 ? "x" : "-");
      }).join("");
      for (const path of paths) {
        const found = find(path);
        if (found.error) {
          t.print(`chmod: ${path}: ${found.error}`);
          continue;
        }
        if (found.node.guarded) {
          t.print(`chmod: ${path}: Not owner`);
          return suspect(t);
        }
        if (found.node.owner !== USER.name) {
          t.print(`chmod: ${path}: Not owner`);
          continue;
        }
        found.node.mode = bits;
      }
    },

    whoami(t) {
      t.print(USER.name);
    },

    id(t, [name = USER.name]) {
      if (!Object.hasOwn(USERS, name)) return t.print(`id: ${name}: no such user`);
      const u = USERS[name];
      const g = groupById(u.gid);
      const groups = groupsOf(name).map((gr) => `${gr.gid}(${gr.name})`).join(",");
      t.print(`uid=${u.uid}(${name}) gid=${g.gid}(${g.name}) groups=${groups}`);
    },

    groups(t, [name = USER.name]) {
      if (!Object.hasOwn(USERS, name)) return t.print(`groups: ${name}: no such user`);
      t.print(groupsOf(name).map((g) => g.name).join(" "));
    },

    // the one Flynn needs; the MCP is watching for anyone who tries
    newgrp(t, [name]) {
      if (!name) return;
      const g = groupByName(name);
      if (!g) return t.print(`newgrp: ${name}: Unknown group`);
      if (USER.groups.includes(name)) return;
      if (g.suspended) {
        t.print(`newgrp: ${name}: suspended`);
        return suspect(t);
      }
      t.print("newgrp: Sorry");
      if (name === "group6" || name === "mcp" || name === "root") return suspect(t);
    },

    async su(t, [name = "root"]) {
      if (!Object.hasOwn(USERS, name)) return t.print(`su: Unknown login: ${name}`);
      if (name === USER.name) return;
      t.print("Password:");
      await sleep(1600);
      t.print("Sorry");
      if (name === "root" || name === "mcp" || name === "dillinger") return suspect(t);
    },

    // everyone still logged in, by terminal
    who(t) {
      t.print(...LOGINS
        .filter((l) => l.end === null)
        .sort((a, b) => (a.tty < b.tty ? -1 : 1))
        .map((l) => `${l.who.padEnd(9)} ${l.tty.padEnd(8)} Sep 22 ${hhmm(l.start)}${l.from ? `   (${l.from})` : ""}`));
    },

    last(t, [name]) {
      const lines = LOGINS
        .filter((l) => !name || l.who === name)
        .sort((a, b) => b.day - a.day || b.start - a.start)
        .map((l) => {
          const until = l.end === null
            ? "still logged in"
            : `- ${hhmm(l.end)}  (${hhmm((l.end - l.start + 1440) % 1440)})`;
          return `${l.who.padEnd(9)} ${l.tty.padEnd(8)} ${l.from.padEnd(10)} ${DAYS[l.day]} ${hhmm(l.start)}   ${until}`;
        });
      t.print(...lines, "", "wtmp begins Fri Sep 17 00:00");
    },

    query(t, [name]) {
      if (!name) return commands.who(t);
      if (!Object.hasOwn(USERS, name) || name === "root") return t.print(`query: ${name}: no such user.`);
      const u = USERS[name];
      t.print(`Login: ${name.padEnd(16)} Name: ${u.full}`, `Directory: ${u.home}`);
      if (u.dept) t.print(`Office: ${u.dept}, x${u.phone}`);
      t.print(`Access: ${u.access}`, u.since);
      const plan = find(`${u.home}/.plan`);
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
      // Flynn, on a noisy line from the arcade
      if (name === "sam1") {
        t.print("[Waiting for your party to respond]");
        await sleep(1400);
        return t.print("~#%@&!~  NO CARRIER");
      }
      if (name === "alan1") return t.print("talk: you can't talk to yourself");
      if (!Object.hasOwn(USERS, name)) return t.print(`talk: ${name}: no such user`);
      if (!online(name)) return t.print("[Your party is not logged on]");
      // everyone else is busy
      t.print("[Waiting for your party to respond]");
      await sleep(1600);
      t.print("[Ringing your party again]");
      await sleep(1600);
      t.print("[Your party is not responding]");
    },

    // plain ps is Alan's (and the MCP, which is everywhere); ps aux,
    // ps -ef, and the like are everyone's
    ps(t, args, line) {
      const flags = args.join("").replace(/-/g, "");
      if (/[aex]/.test(flags)) {
        const row = (p) => `${p.user.padEnd(9)}${String(p.pid).padStart(5)} ${p.tty.padEnd(7)}${p.time.padStart(6)} ${p.cmd}`;
        return t.print(
          "USER       PID TTY      TIME COMMAND",
          ...[...PROCESSES, { user: "alan1", pid: 240, tty: "tty7", time: "0:00", cmd: line }]
            .sort((a, b) => a.pid - b.pid)
            .map(row),
        );
      }
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
      // everyone else's processes are theirs
      if (PROCESSES.some((p) => String(p.pid) === pid)) {
        t.print(`kill: ${pid}: Operation not permitted`);
        if (pid !== "118") return;
        return (async () => {
          await sleep(1200);
          await t.type(hang(6, ["lora: alan, did you just try to kill my editor?"]), { cps: 45 });
        })();
      }
      t.print(`kill: ${pid}: No such process`);
    },

    async request(t, args, line) {
      if (/reindeer flotilla|access code 6|ps 17/i.test(line)) return takeover(t);
      await sleep(600);
      await t.type(["REQUEST DENIED.", "GROUP 7 ACCESS SUSPENDED."], { cps: 40 });
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

    cal(t, args) {
      const nums = args.map(Number);
      if (args.length > 2 || nums.some((n) => !Number.isInteger(n))) return t.print("usage: cal [[month] year]");
      if (!args.length) {
        const d = filmNow();
        return t.print(...month(d.getUTCFullYear(), d.getUTCMonth(), true).filter((line) => line.trim()));
      }
      const y = nums[nums.length - 1];
      if (y < 1 || y > 9999) return t.print(`cal: ${y}: bad year`);
      if (args.length === 1) return t.print(...year(y));
      if (nums[0] < 1 || nums[0] > 12) return t.print(`cal: ${nums[0]}: bad month`);
      t.print(...month(y, nums[0] - 1, true).filter((line) => line.trim()));
    },

    uptime(t) {
      const d = filmNow();
      const up = d - booted;
      const days = Math.floor(up / 86400000);
      const h = Math.floor((up % 86400000) / 3600000);
      const m = Math.floor((up % 3600000) / 60000);
      const hour = d.getUTCHours();
      const clock = `${hour % 12 || 12}:${two(d.getUTCMinutes())}${hour < 12 ? "am" : "pm"}`;
      t.print(`${clock.padStart(8)}  up ${days} days, ${String(h).padStart(2)}:${two(m)},  ${LOGINS.filter((l) => l.end === null).length} users,  load average: 4.12, 3.98, 3.75`);
    },

    uname(t, args) {
      t.print(args.some((a) => /a/.test(a)) ? `ENCOM ${HOST} 3.2 #7 vax` : "ENCOM");
    },

    hostname(t) {
      t.print(HOST);
    },

    env(t) {
      t.print(...Object.entries(ENV).map(([k, v]) => `${k}=${v}`));
    },

    echo(t, args) {
      const text = args.join(" ")
        .replace(/\$\{(\w+)\}|\$(\w+)/g, (_, a, b) => (Object.hasOwn(ENV, a || b) ? ENV[a || b] : ""))
        .replace(/["']/g, "");
      t.print(text);
    },

    history(t, [count = "20"]) {
      const n = Math.max(1, Number(count) || 20);
      const lines = t.history;
      const from = Math.max(0, lines.length - n);
      t.print(...lines.slice(from).map((line, i) => `${String(from + i + 1).padStart(5)}  ${line}`));
    },

    exit(t) {
      return logout(t);
    },

    logout(t) {
      return logout(t);
    },
  };

  // head and tail: the ends of each file
  function ends(t, cmd, args, take) {
    const { n, paths } = countArg(args);
    if (!paths.length) return t.print(`usage: ${cmd} [-n] file ...`);
    let guarded = false;
    paths.forEach((path, i) => {
      const got = readFile(t, cmd, path);
      guarded ||= got.guarded;
      if (!got.lines) return;
      if (paths.length > 1) {
        if (i) t.print("");
        t.print(`==> ${path} <==`);
      }
      const lines = take(got.lines, n);
      if (lines.length) t.print(...(got.node.hang ? hang(got.node.hang, lines) : lines));
    });
    if (guarded) return suspect(t);
  }

  // a new file or directory's parent: { parent, name } or nothing (and an
  // error printed)
  function make(t, cmd, path) {
    const parts = split(path);
    if (!parts.length) {
      t.print(`${cmd}: ${path}: File exists`);
      return null;
    }
    const parent = find(join(parts.slice(0, -1)));
    if (parent.error) {
      t.print(`${cmd}: ${path}: ${parent.error}`);
      return null;
    }
    if (parent.node.type !== "dir") {
      t.print(`${cmd}: ${path}: Not a directory`);
      return null;
    }
    if (!can(parent.node, "w")) {
      t.print(`${cmd}: ${path}: Permission denied`);
      return null;
    }
    return { parent: parent.node, name: baseName(parts) };
  }

  // cp and mv: one file to a file or a directory. A new file takes its
  // directory's group, as on BSD.
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
    if (src.node.type === "dev") return t.print(`${cmd}: ${from}: not a regular file`);
    if (!can(src.node, "r")) return t.print(`${cmd}: ${from}: Permission denied`);
    const srcParent = parentOf(src);
    if (move && !can(srcParent, "w")) return t.print(`${cmd}: ${from}: Permission denied`);

    const dst = find(to);
    let parts;
    if (dst.node?.type === "dir") parts = [...dst.parts, baseName(src.parts)];
    else parts = split(to);
    const name = baseName(parts);
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
    if (existing?.type === "dev") return t.print(`${cmd}: ${to}: Permission denied`);
    if (existing ? !can(existing, "w") : !can(parent.node, "w")) return t.print(`${cmd}: ${to}: Permission denied`);

    if (move) {
      delete srcParent.children[baseName(src.parts)];
      parent.node.children[name] = src.node;
    } else if (existing) {
      existing.lines = [...src.node.lines];
      existing.binary = src.node.binary;
      existing.strings = src.node.strings;
      existing.kind = src.node.kind;
      existing.mtime = stamp();
    } else {
      parent.node.children[name] = file(USER.name, parent.node.group, "rw-r--r--", stamp(), [...src.node.lines],
        { binary: src.node.binary, strings: src.node.strings, kind: src.node.kind });
    }
  }

  // ---------- Running a program by name or path ----------
  // The games are on the PATH; anything else runs by its path, like
  // /bin/ls or ./space_paranoids. The games want an arcade cabinet.

  async function play(t, name) {
    await t.type([GAMES[name].title, "(C) 1982 E. DILLINGER", "", "INSERT COIN"], { by: "line", lineDelay: 500 });
  }

  function execute(t, line) {
    const [word, ...args] = line.trim().split(/\s+/);
    if (!word.includes("/")) return Object.hasOwn(GAMES, word) ? play(t, word) : false;
    const found = find(word);
    if (found.error) {
      t.print(`${word}: not found`);
      return found.guarded ? suspect(t) : true;
    }
    const { node } = found;
    if (node.type !== "file" || !can(node, "x")) {
      t.print(`${word}: cannot execute`);
      return node.guarded ? suspect(t) : true;
    }
    const name = baseName(found.parts);
    if (node.strings && Object.hasOwn(GAMES, name) && node.strings === GAMES[name].strings) return play(t, name);
    if (Object.hasOwn(commands, name) && name !== "&") return commands[name](t, args, line) ?? true;
    return true; // sh, say: a new shell, and here you are
  }

  // ---------- Starting Tron ----------

  async function startTron(t) {
    const found = find(`${PROJECT}/tron.addr`);
    if (!found.node || found.node.type !== "file") return t.print("ADDRESS FILE NOT FOUND", "TRON PROGRAM UNAVAILABLE");
    if (!can(found.node, "r")) return t.print("ADDRESS FILE UNREADABLE", "TRON PROGRAM UNAVAILABLE");
    const addresses = found.node.lines.filter((line) => /^[A-Z]{2} \d{6}\b/.test(line));
    if (!addresses.length) return t.print("ADDRESS FILE EMPTY", "TRON PROGRAM UNAVAILABLE");

    await t.type([`LOADING ADDRESS FILE... ${addresses.length} ADDRESS${addresses.length === 1 ? "" : "ES"}`], { by: "line" });
    await sleep(900);
    await t.type(["TRON PROGRAM ACTIVE", "MONITORING MASTER CONTROL COMMUNICATIONS"], { by: "line", lineDelay: 600 });
    await sleep(2200);
    await t.type(["", "MCP: ALAN1.", "MCP: GROUP 7 ACCESS CANCELLED.", "MCP: YOUR PROGRAM WILL BE DEALT WITH.", "MCP: END OF LINE."], { cps: 30 });
    await sleep(1200);
    end(t);
  }

  // ---------- Flynn ----------
  // In the lab, Flynn types REQUEST: ACCESS CODE 6, PASSWORD SERIES PS 17,
  // REINDEER FLOTILLA, and the MCP takes over the terminal. He's after a
  // Group 6 access, around Dillinger's Group 7 freeze. He answers with
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
    filters: [
      // the shell expands * and ?, except at mail's & prompt
      (line) => (state.mail ? line : line.trim().split(/\s+/).map((word, i) => (i ? glob(word) : word)).join(" ")),
      // at the mail program's & prompt, every line goes to mail
      (line) => (state.mail ? `& ${line}` : line),
    ],
    // the film's "REQUEST: MASTER CONTROL PROGRAM ..." in any case, Flynn's
    // code, and programs run by path
    fallback(t, line) {
      if (/^request\b|reindeer flotilla/i.test(line)) return commands.request(t, [], line);
      if (/lsu-?123/i.test(line)) return activate(t);
      return execute(t, line);
    },
    unrecognized: (name) => `${name}: not found`,
    typingSpeed: 60,
    cursor: "steady",
    name: "tron-alan",
  });
  window.term = t;

  // help and the commands should list the same things
  const listed = new Set(GROUPS.flatMap((g) => g.commands.map(([name]) => name)));
  const defined = new Set([...Object.keys(commands).filter((name) => name !== "&"), "clear"]);
  for (const name of listed) if (!defined.has(name)) console.warn(`help lists ${name}, which isn't a command`);
  for (const name of defined) if (!listed.has(name)) console.warn(`${name} isn't in help`);

  t.boot(async (t) => {
    await t.run("service start tron");
    t.print("You have mail.");
  });
})();
