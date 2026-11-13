// Lesson 0.2 — The periodic table: who gives, who takes
(function () {
  const { h, s, fmt, widget, stat, slider, plot, barChart, toggle, hbars, isNarrow, narrow } = Course;
  const E = Chem.elements, f = Chem.f;
  const BLUE = "#6cb4ff", YEL = "#ffd166", PUR = "#c3a6ff", GRN = "#5fd38d", RED = "#ff6b6b", GREY = "#4a5568";
  const LINE = "#2e3646", TEXT = "#e6e9ef", MUTED = "#9aa3b5", PANEL2 = "#212734", DARK = "#10141c";
  const P = (html) => h("p", { html });
  const takeaway = (html) => h("div", { class: "takeaway", html });
  const formula = (html) => h("div", { class: "formula", html });
  const note = (html, style) => h("div", { class: "note", html, style: style || false });

  // ---------------------------------------------------------------- shared data
  const NOBLE = ["He", "Ne", "Ar", "Kr"];
  const NONMETAL = ["H", "C", "N", "O", "F", "P", "S", "Cl", "Se", "Br", "I"];
  const SEMI = ["B", "Si", "Ge", "As"];
  const cls = (sym) => (NOBLE.includes(sym) ? "noble" : NONMETAL.includes(sym) ? "nonmetal" : SEMI.includes(sym) ? "semi" : "metal");
  const CLS_NAME = { metal: "metal", nonmetal: "non-metal", semi: "borderline (semimetal)", noble: "noble gas" };
  const CLS_COL = { metal: GRN, nonmetal: PUR, semi: "#7d8799", noble: BLUE };
  const isTransition = (sym) => E[sym].group >= 3 && E[sym].group <= 12;
  // most common simple ions (first entry = the usual one). Consistent with the species in Chem.E0.
  const TYP = {
    H: ["H^+"], Li: ["Li^+"], Na: ["Na^+"], K: ["K^+"], Cs: ["Cs^+"], Be: ["Be^2+"], Mg: ["Mg^2+"], Ca: ["Ca^2+"], Ba: ["Ba^2+"],
    Al: ["Al^3+"], Ga: ["Ga^3+"], Sc: ["Sc^3+"], Ti: ["Ti^4+"], V: ["V^3+", "V^2+"], Cr: ["Cr^3+"], Mn: ["Mn^2+"], Fe: ["Fe^2+", "Fe^3+"],
    Co: ["Co^2+"], Ni: ["Ni^2+"], Cu: ["Cu^2+", "Cu^+"], Zn: ["Zn^2+"], Ag: ["Ag^+"], Cd: ["Cd^2+"], Sn: ["Sn^2+", "Sn^4+"], Pb: ["Pb^2+"],
    Pt: ["Pt^2+"], Au: ["Au^3+"], Hg: ["Hg^2+"],
    N: ["N^3-"], P: ["P^3-"], O: ["O^2-"], S: ["S^2-"], Se: ["Se^2-"], F: ["F^-"], Cl: ["Cl^-"], Br: ["Br^-"], I: ["I^-"],
  };
  const typCharge = (sym) => { if (!TYP[sym]) return 0; const m = TYP[sym][0].match(/\^(\d*)([+-])/); return (m[2] === "+" ? 1 : -1) * (+m[1] || 1); };
  const ion = (sym, q) => f(sym + "^" + (Math.abs(q) === 1 ? "" : Math.abs(q)) + (q > 0 ? "+" : "-"));
  const chargeTxt = (q) => (q === 0 ? "0" : Math.abs(q) + (q > 0 ? "+" : "−"));
  const cap = (str) => str[0].toUpperCase() + str.slice(1);
  const Name = (sym) => cap(E[sym].name);
  const coreCharge = (sym) => E[sym].Z - E[sym].shells.slice(0, -1).reduce((a, b) => a + b, 0);
  const same = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);
  const nobleLike = (shells) => { const n = NOBLE.find((x) => same(E[x].shells, shells)); return n ? E[n].name : null; };
  const VCOL = ["#5fd38d", "#9bd66b", "#d4d35f", "#ffd166", "#ffa861", "#ff7f7f", "#d79bff", "#6cb4ff"];
  // successive ionisation energies, kJ/mol (NIST values as tabulated on Wikipedia's data page; first ones match Chem.elements)
  const SUCC = { Na: [496, 4562, 6910, 9543], Mg: [738, 1451, 7733, 10543], Al: [578, 1817, 2745, 11577] };

  // ---------------------------------------------------------------- small helpers
  function txt(x, y, str, o = {}) {
    const t = s("text", { x, y, "text-anchor": o.anchor || "middle" });
    t.textContent = str; t.style.fontSize = (o.size || 12) + "px";
    if (o.fill) t.style.fill = o.fill; if (o.weight) t.style.fontWeight = o.weight;
    t.style.pointerEvents = "none";
    return t;
  }
  function timers() {
    const ids = new Set();
    const api = {
      after(ms, fn) { const id = setTimeout(() => { ids.delete(id); fn(); }, ms); ids.add(id); return id; },
      tween(ms, fn, done) { const t0 = Date.now(); const tick = () => { const t = Math.min(1, (Date.now() - t0) / ms); fn(t); if (t < 1) api.after(16, tick); else if (done) done(); }; tick(); },
      stop() { ids.forEach(clearTimeout); ids.clear(); },
    };
    return api;
  }
  const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
  const lerp = (a, b, t) => a + (b - a) * t;
  function mix(c1, c2, t) {
    const p = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
    const a = p(c1), b = p(c2);
    return "#" + a.map((v, i) => Math.round(lerp(v, b[i], t)).toString(16).padStart(2, "0")).join("");
  }
  const mkSvg = (W, H, maxw) => s("svg", { viewBox: `0 0 ${W} ${H}`, width: "100%", style: `display:block;margin:0 auto;max-width:${maxw || W}px` });

  // Shell-model atom: nucleus (+Z), rings, yellow electrons. Returns outer-electron positions.
  function drawAtom(g, cx, cy, sym, o = {}) {
    const el = E[sym], shells = o.shells || el.shells, n = shells.length;
    const rmax = o.rmax || 78, r0 = o.r0 || 13, gap = Math.min(24, (rmax - r0) / n);
    g.append(s("circle", { cx, cy, r: r0, fill: "#4a2326", stroke: RED, "stroke-width": 1.5 }));
    g.append(txt(cx, cy + 4, "+" + el.Z, { size: 10, fill: "#ffd9d9", weight: 600 }));
    const outer = [];
    let R = r0;
    shells.forEach((cnt, k) => {
      const r = r0 + gap * (k + 0.8), last = k === n - 1; R = r;
      g.append(s("circle", { cx, cy, r, fill: "none", stroke: last ? "#75632a" : LINE, "stroke-width": 1.2 }));
      const er = cnt > 10 ? 2.1 : 3.3;
      for (let i = 0; i < cnt; i++) {
        const a = -Math.PI / 2 + (2 * Math.PI * i) / cnt + k * 0.4;
        const c = s("circle", { cx: cx + r * Math.cos(a), cy: cy + r * Math.sin(a), r: er, fill: YEL, opacity: last ? 1 : 0.4 });
        g.append(c); if (last) outer.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a), node: c });
      }
    });
    return { outer, R };
  }

  // Periodic-table grid. layout "main": 8 columns (groups 1, 2, 13–18); "full": 18 columns.
  function ptable({ syms, layout = "main", onclick }) {
    const full = layout === "full", nar = isNarrow();
    const cw = full ? (nar ? 22 : 31) : 54, ch = full ? (nar ? 27 : 38) : 44, gapX = full ? 0 : 30, L = 16, Tp = 16;
    const periods = [...new Set(syms.map((x) => E[x].period))].sort((a, b) => a - b);
    const colOf = (g) => (full ? g - 1 : g <= 2 ? g - 1 : g - 11);
    const xOf = (g) => L + colOf(g) * cw + (!full && g > 2 ? gapX : 0);
    const yOf = (p) => Tp + periods.indexOf(p) * ch;
    const W = L + (full ? 18 : 8) * cw + gapX + 2, H = Tp + periods.length * ch + 3;
    const svg = mkSvg(W, H, full ? 760 : 560);
    (full ? Array.from({ length: 18 }, (_, i) => i + 1) : [1, 2, 13, 14, 15, 16, 17, 18]).forEach((g) => svg.append(txt(xOf(g) + cw / 2, 11, g, { size: full ? (nar ? 7.5 : 9) : 11 })));
    periods.forEach((p) => svg.append(txt(8, yOf(p) + ch / 2 + 4, p, { size: full ? (nar ? 7.5 : 9) : 11 })));
    if (!full) svg.append(txt(xOf(2) + cw + gapX / 2, Tp + (periods.length * ch) / 2 + 4, "⋯", { size: 16 }));
    const cells = {};
    syms.forEach((sym) => {
      const e = E[sym], x = xOf(e.group), y = yOf(e.period);
      const r = s("rect", { x: x + 1, y: y + 1, width: cw - 2, height: ch - 2, rx: full ? 3 : 5, fill: PANEL2, stroke: LINE, "stroke-width": 1 });
      const big = full ? (nar ? 10.5 : 13) : 16, hasSub = !(full && nar);
      const t = txt(x + cw / 2, y + (hasSub ? ch * 0.48 : ch * 0.62), sym, { size: big, fill: TEXT, weight: 600 });
      const sub = txt(x + cw / 2, y + ch - (full ? 6 : 7), "", { size: full ? 8.5 : 10 });
      if (onclick) { r.style.cursor = "pointer"; r.addEventListener("click", () => onclick(sym)); }
      svg.append(r, t); if (hasSub) svg.append(sub);
      cells[sym] = { r, t, sub };
    });
    // fn(sym) → { fill, sub, dark (dark text), dim }
    svg.paint = (fn) => syms.forEach((sym) => {
      const c = cells[sym], o = fn(sym) || {};
      c.r.setAttribute("fill", o.fill || PANEL2);
      c.t.style.fill = o.dark ? DARK : o.dim ? "#667086" : TEXT;
      c.sub.textContent = o.sub == null ? "" : o.sub; c.sub.style.fill = o.dark ? "#1d2633" : o.dim ? MUTED : "#d5dae4";
    });
    svg.select = (map) => syms.forEach((sym) => {
      const col = map[sym];
      cells[sym].r.setAttribute("stroke", col || LINE); cells[sym].r.setAttribute("stroke-width", col ? 2.4 : 1);
    });
    return svg;
  }
  const MAIN20 = Object.values(E).filter((e) => e.Z <= 20).sort((a, b) => a.Z - b.Z).map((e) => e.sym);
  const ALL = Object.values(E).sort((a, b) => a.Z - b.Z).map((e) => e.sym);

  const steps = [];

  // ---------------------------------------------------------------- 1
  steps.push({
    title: "Sixteen atoms in a row, and a pattern that repeats",
    short: "A repeating pattern",
    newConcepts: ["period"],
    render(el) {
      el.append(
        P("In <em>Atoms, electrons and charge</em> you met two atoms with opposite habits. Sodium has one <em>valence electron</em> (an electron in its outermost shell) and gives it away easily. Chlorine has seven and grabs an eighth. Both end up with a <em>full shell</em>."),
        P("This lesson asks: <b>can you tell who gives and who takes without drawing every atom?</b> Yes, if you sort the atoms the right way."),
        P("Below are the 16 atoms from lithium (3 protons) to argon (18), in order of <em>atomic number</em>. The colour and the small number show the valence electrons. The count climbs 1, 2, 3 … 8, then <b>starts over</b>. So cut the line into rows. Find the row length that puts atoms with the same count under each other.")
      );
      const list = ALL.filter((x) => E[x].Z >= 3 && E[x].Z <= 18);
      const C = 40, L = 62, W = L + 12 * C + 4, H = 4 * 46 + 6;
      const svg = mkSvg(W, H, 600);
      const sMatch = stat("columns where everyone matches", "y"), sRows = stat("rows", "");
      const msg = note("", "min-height:44px;margin-top:10px");
      let w = 6;
      function draw() {
        svg.innerHTML = "";
        const rows = Math.ceil(16 / w);
        let match = 0;
        for (let c = 0; c < w; c++) {
          const col = list.filter((_, i) => i % w === c).map((x) => E[x].valence);
          if (col.length > 1 && col.every((v) => v === col[0])) match++;
        }
        const good = w === 8;
        for (let r = 0; r < rows; r++) svg.append(txt(L - 8, r * 46 + 28, good ? "period " + (r + 2) : "row " + (r + 1), { anchor: "end", size: 12, fill: good ? YEL : MUTED }));
        list.forEach((sym, i) => {
          const x = L + (i % w) * C, y = Math.floor(i / w) * 46 + 3, v = E[sym].valence;
          svg.append(s("rect", { x: x + 1.5, y: y + 1.5, width: C - 3, height: 40, rx: 5, fill: VCOL[v - 1] }));
          svg.append(txt(x + C / 2 - 3, y + 25, sym, { size: 15, fill: DARK, weight: 700 }));
          svg.append(txt(x + C - 6, y + 36, v, { size: 9.5, fill: DARK, anchor: "end" }));
        });
        sMatch.set(match + " of " + w); sRows.set(String(rows));
        msg.innerHTML = good
          ? `<span style="color:var(--green)">Rows of 8: every column is one colour.</span> Li sits on Na (1 valence electron each), F sits on Cl (7 each). Each row is one outer shell being filled, from 1 electron to 8.`
          : "The colours are scattered: atoms stacked in a column have different numbers of valence electrons. Try another row length.";
      }
      el.append(widget("Fold the line: choose the row length",
        slider({ name: "row length", nameWidth: 110, min: 4, max: 12, step: 1, value: w, fmtv: (v) => v, oninput: (v) => { w = Math.round(v); draw(); } }),
        svg, h("div", { class: "readout" }, sMatch, sRows), msg));
      draw();
      el.append(
        P("Each row of this folded line is called a <b>period</b>. A new period begins whenever a new shell begins, so <b>the period number is the number of shells that hold electrons</b>. Hydrogen and helium form the short period 1 (the first shell holds only 2). Lithium to neon is period 2, sodium to argon period 3, and potassium (shells 2, 8, 8, 1) opens period 4."),
        takeaway("Sorted by atomic number, the valence-electron count repeats every 8 atoms. Each repeat is a period: one outer shell filling up.")
      );
    },
    check: {
      type: "number", q: "Calcium has 20 electrons in shells 2, 8, 8, 2. Which period is it in?",
      answer: 4, tolerance: 0, hint: "Count the shells that hold electrons.", why: "Period 4: four occupied shells. It sits right after potassium.",
    },
  });

  // ---------------------------------------------------------------- 2
  steps.push({
    title: "Columns: the same outer shell again and again",
    short: "Groups",
    newConcepts: ["group", "noble"],
    render(el) {
      el.append(
        P("Fold the whole list of atoms that way and you get the <b>periodic table</b>. Rows are periods. The columns are the interesting part: every atom in a column has the <b>same number of valence electrons</b>, only one shell further out each time. A column is called a <b>group</b>."),
        P("Groups are numbered 1 to 18. The jump from 2 to 13 is not a typo: from period 4 on, ten more columns squeeze into the gap (marked ⋯; they come back in step 8). For the columns shown here the rule is simple:"),
        formula('groups 1–2: valence electrons = <span class="hl">group</span> &nbsp;·&nbsp; groups 13–18: valence electrons = <span class="hl">group − 10</span>')
      );
      const GROUPS = [1, 2, 13, 14, 15, 16, 17, 18];
      let g = 1, sym = "Na";
      const atom = mkSvg(200, 190, 230);
      const info = note("", "min-height:66px;margin-top:8px");
      const tab = ptable({ syms: MAIN20, onclick: (x) => { sym = x; g = E[x].group; tg.set(g); draw(); } });
      function draw() {
        tab.paint((x) => (E[x].group === g ? { fill: VCOL[(g <= 2 ? g : g - 10) - 1], dark: true, sub: E[x].shells.join(",") } : { dim: true, sub: "" }));
        tab.select({ [sym]: "#ffffff" });
        atom.innerHTML = "";
        drawAtom(atom, 100, 86, sym, { rmax: 76 });
        atom.append(txt(100, 182, `${E[sym].name}: shells ${E[sym].shells.join(", ")}`, { size: 12.5, fill: TEXT }));
        const members = MAIN20.filter((x) => E[x].group === g), v = g <= 2 ? g : g - 10;
        let extra = "";
        if (g === 1) extra = " Hydrogen sits on top with its single electron, though it behaves differently from the rest (step 7).";
        if (g === 18) extra = " Their outer shell is <b>full</b> (helium's first shell is full with just 2, which is why it stands here and not in group 2). Nothing to give, no room to take: these are the <b>noble gases</b>, which hardly react with anything.";
        info.innerHTML = `<b>Group ${g}</b>: ${members.map((x) => `${x} (${E[x].shells.join(", ")})`).join(" · ")}.<br>${g === 18 ? "A full outer shell" : `Every one ends in <b>${v}</b>: ${v} valence electron${v > 1 ? "s" : ""}`}.${extra}`;
      }
      const tg = toggle("group", GROUPS.map((x) => [x, String(x)]), g, (v) => { g = v; sym = MAIN20.find((x) => E[x].group === g && E[x].period === 3); draw(); });
      el.append(widget("The first 20 elements. Pick a group, or click any element",
        tg,
        h("div", { style: "display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-top:10px" },
          h("div", { style: "flex:1 1 330px;min-width:0" }, tab), h("div", { style: "flex:1 1 180px;min-width:0" }, atom)),
        info));
      draw();
      el.append(
        P("Sodium is in group 1 and chlorine in group 17: one electron past a full shell, and one electron short of it. <b>Group 18</b> is the finish line both are heading for. Its members, the <b>noble gases</b> (helium, neon, argon …), already have the full shell. The address of an atom in the table tells you how far it is from that goal."),
        takeaway("A group is a column: same number of valence electrons, so similar chemistry. Group 18, the noble gases, has full outer shells and stays out of the electron trade.")
      );
    },
    check: {
      type: "number", q: "Selenium is in <b>group 16</b>. How many valence electrons does it have?",
      answer: 6, tolerance: 0, hint: "For groups 13–18, subtract 10 from the group number.", why: "16 − 10 = 6, the same as oxygen and sulfur above it.",
    },
  });

  // ---------------------------------------------------------------- 3
  steps.push({
    title: "Two families at opposite edges",
    short: "Alkali metals, halogens",
    newConcepts: ["alkali", "halogen"],
    render(el) {
      el.append(
        P("If a column shares its valence count, then whatever sodium does, its whole column should do. And it does."),
        P("<b>Group 1</b> below hydrogen (lithium, sodium, potassium …) is the family of the <b>alkali metals</b>: soft, silvery solids, each with <b>one electron beyond a full shell</b>. (What makes something a “metal” is the subject of step 7.)"),
        P("<b>Group 17</b> (fluorine, chlorine, bromine …) is the family of the <b>halogens</b>: each is <b>one electron short of a full shell</b>."),
        P("You already watched sodium hand its electron to chlorine. Now swap in any relative from either family and run it again.")
      );
      const T = timers();
      let m = "Na", x = "Cl", done = false;
      const W = 460, H = 222, svg = mkSvg(W, H, 580);
      const eq = h("div", { class: "formula", style: "font-size:19px;margin:10px 0 0" });
      function draw() {
        svg.innerHTML = "";
        const sa = done ? E[m].shells.slice(0, -1) : E[m].shells, sb = done ? [...E[x].shells.slice(0, -1), 8] : E[x].shells;
        const A = drawAtom(svg, 115, 92, m, { shells: sa }), B = drawAtom(svg, 345, 92, x, { shells: sb });
        svg.append(txt(115, 192, done ? `${ion(m, 1)}: shells ${sa.join(", ")}` : `${m}: shells ${sa.join(", ")}`, { size: 13, fill: done ? RED : TEXT, weight: 600 }));
        svg.append(txt(345, 192, done ? `${ion(x, -1)}: shells ${sb.join(", ")}` : `${x}: shells ${sb.join(", ")}`, { size: 13, fill: done ? BLUE : TEXT, weight: 600 }));
        svg.append(txt(115, 210, done ? `same shells as ${nobleLike(sa)}` : "1 valence electron", { size: 11.5 }));
        svg.append(txt(345, 210, done ? `same shells as ${nobleLike(sb)}` : "7 valence electrons", { size: 11.5 }));
        eq.innerHTML = done ? `${m} + ${x} → <span style="color:var(--red)">${ion(m, 1)}</span> + <span style="color:var(--blue)">${ion(x, -1)}</span>` : `${m} + ${x} → <span class="hl">?</span>`;
        return { A, B };
      }
      function run() {
        T.stop(); done = false;
        const { A, B } = draw();
        const e0 = A.outer[0]; e0.node.setAttribute("opacity", 0);
        const fly = s("circle", { r: 4.2, fill: YEL, cx: e0.x, cy: e0.y }); svg.append(fly);
        const tx = 345 - B.R, ty = 92;
        T.tween(1100, (t) => { const k = ease(t); fly.setAttribute("cx", lerp(e0.x, tx, k)); fly.setAttribute("cy", lerp(e0.y, ty, k) - 34 * Math.sin(Math.PI * k)); }, () => { done = true; draw(); });
      }
      const reset = () => { T.stop(); done = false; draw(); };
      el.append(widget("One alkali metal meets one halogen",
        toggle("alkali metal", ["Li", "Na", "K"].map((v) => [v, v]), m, (v) => { m = v; reset(); }),
        toggle("halogen", ["F", "Cl", "Br"].map((v) => [v, v]), x, (v) => { x = v; reset(); }),
        svg, eq,
        h("div", { class: "btns" }, h("button", { class: "primary", onclick: run }, "Let them meet"), h("button", { onclick: reset }, "Reset"))));
      draw();
      el.append(
        P("Nine possible pairs, one story: the alkali metal becomes a 1+ <em>cation</em>, the halogen a 1− <em>anion</em>, and each <em>ion</em> ends up with the shells of the nearest noble gas. (Bromine's third shell shows 18 electrons: in period 4 the simple 2-8-8 picture needs an extension, see step 8.)"),
        takeaway("Alkali metals (group 1) have one electron too many, halogens (group 17) one too few. Any alkali metal can hand its electron to any halogen.")
      );
      return () => T.stop();
    },
    check: {
      type: "choice", q: "Which pair should behave most like sodium + chlorine?",
      options: ["Potassium + bromine", "Sodium + neon", "Chlorine + fluorine"],
      answer: 0,
      wrongHints: { 1: "Neon is in group 18: its shell is already full, so it has no use for sodium's electron.", 2: "Both are halogens. Each wants one more electron and neither has a spare one to give." },
      why: "Potassium is in sodium's group (one spare electron) and bromine is in chlorine's (one missing). Same columns, same story.",
    },
  });

  // ---------------------------------------------------------------- 4
  steps.push({
    title: "The price of an electron",
    short: "Ionisation energy",
    newConcepts: ["ie"],
    render(el) {
      el.append(
        P("“Gives easily” needs a number. An electron is held by its attraction to the protons, so pulling one off always <b>costs energy</b>. Chemists measured that cost for every element: take a single atom, with no neighbours, and remove its most loosely held electron."),
        P("The cost is called the <b>ionisation energy</b>. It is quoted in kJ/mol: kilojoules for one fixed, enormous batch of atoms (the batch, a <em>mole</em>, is defined in the next lesson). Here you only need to compare the numbers. Pick an atom and pay the price.")
      );
      const T = timers();
      let sym = "Na", pulled = false;
      const nar = isNarrow(), W = nar ? 400 : 560, H = 215, L = 44, B = 24, Tp = 14, bw = (W - L - 6) / 20, YM = 2500;
      const Y = (v) => Tp + (1 - v / YM) * (H - Tp - B);
      const chart = mkSvg(W, H, 640);
      [0, 500, 1000, 1500, 2000, 2500].forEach((v) => {
        chart.append(s("line", { x1: L, x2: W - 4, y1: Y(v), y2: Y(v), stroke: v ? "#232a37" : LINE }));
        chart.append(txt(L - 6, Y(v) + 4, v, { anchor: "end", size: nar ? 10 : 11 }));
      });
      const bars = {}; const valLab = txt(0, 0, "", { size: nar ? 11 : 12, fill: YEL, weight: 700 });
      MAIN20.forEach((x, i) => {
        const bx = L + i * bw, v = E[x].ie1;
        const r = s("rect", { x: bx + bw * 0.14, width: bw * 0.72, y: Y(v), height: Y(0) - Y(v), rx: 2.5 });
        const lab = txt(bx + bw / 2, H - 8, x, { size: nar ? 10 : 11.5, fill: TEXT });
        const hit = s("rect", { x: bx, width: bw, y: 0, height: H, fill: "transparent", style: "cursor:pointer" });
        hit.addEventListener("click", () => pick(x));
        chart.append(r, lab, hit); bars[x] = { r, lab, cx: bx + bw / 2 };
      });
      chart.append(valLab);
      const baseCol = (x) => (E[x].group === 18 ? PUR : E[x].group === 1 && x !== "H" ? GRN : "#3f587a");
      const atom = mkSvg(300, 176, 360);
      const sCost = stat("energy paid", "y"), sFull = stat("ionisation energy", "b");
      const meter = h("div", { style: "height:12px;background:var(--panel2);border-radius:6px;overflow:hidden;margin-top:10px" });
      const fill = h("div", { style: `height:100%;width:0;background:${YEL};border-radius:6px` }); meter.append(fill);
      const eq = h("div", { class: "formula", style: "font-size:18px;margin:10px 0 0" });
      function drawAtomView(k) {
        atom.innerHTML = "";
        const e = E[sym];
        let sh = e.shells.slice();
        if (pulled) { sh[sh.length - 1]--; if (sh[sh.length - 1] === 0 && sh.length > 1) sh.pop(); }
        const A = drawAtom(atom, 92, 82, sym, { shells: sh, rmax: 70 });
        atom.append(txt(92, 170, pulled ? `${ion(sym, 1)}  (shells ${sh.join(", ")})` : `${sym}  (shells ${sh.join(", ")})`, { size: 12.5, fill: pulled ? RED : TEXT, weight: 600 }));
        if (pulled) { atom.append(s("circle", { cx: 268, cy: 82, r: 4.5, fill: YEL })); atom.append(txt(268, 104, "free e⁻", { size: 11.5, fill: YEL })); }
        return A;
      }
      function readout(frac) {
        const e = E[sym];
        sFull.set(e.ie1 + " kJ/mol"); sCost.set(Math.round(e.ie1 * frac) + " kJ/mol");
        fill.style.width = (100 * frac * e.ie1) / 2372 + "%";
        eq.innerHTML = `${sym} → <span style="color:var(--red)">${ion(sym, 1)}</span> + e⁻ <small>costs ${e.ie1} kJ/mol${sym === "Na" ? "" : ` · that is ${(e.ie1 / E.Na.ie1).toFixed(1)}× sodium's price`}</small>`;
      }
      function paint() {
        MAIN20.forEach((x) => { bars[x].r.setAttribute("fill", x === sym ? YEL : baseCol(x)); bars[x].lab.style.fill = x === sym ? YEL : TEXT; });
        valLab.setAttribute("x", Math.min(W - 18, Math.max(L + 16, bars[sym].cx))); valLab.setAttribute("y", Y(E[sym].ie1) - 5); valLab.textContent = E[sym].ie1;
      }
      function pick(x) { T.stop(); sym = x; pulled = false; tg.set(x); paint(); drawAtomView(); readout(0); }
      function pull() {
        T.stop(); pulled = false;
        const A = drawAtomView(); readout(0);
        const e0 = A.outer[0]; e0.node.setAttribute("opacity", 0);
        const fly = s("circle", { r: 4.5, fill: YEL, cx: e0.x, cy: e0.y }); atom.append(fly);
        const dur = 500 + (E[sym].ie1 / 2372) * 1600;
        T.tween(dur, (t) => { const k = ease(t); fly.setAttribute("cx", lerp(e0.x, 268, k)); fly.setAttribute("cy", lerp(e0.y, 82, k)); readout(t); }, () => { pulled = true; drawAtomView(); readout(1); });
      }
      const tg = toggle("atom", ["Na", "Mg", "Cl", "Ar", "K", "He"].map((v) => [v, v]), sym, pick);
      el.append(widget("First ionisation energy of elements 1–20 (click a bar or a button)",
        chart, note('<span style="color:#5fd38d">■</span> alkali metals &nbsp; <span style="color:#c3a6ff">■</span> noble gases &nbsp; <span style="color:#ffd166">■</span> selected', "margin:2px 0 8px"),
        tg, atom, meter, h("div", { class: "readout" }, sCost, sFull),
        h("div", { class: "btns" }, h("button", { class: "primary", onclick: pull }, "Pull one electron off")), eq));
      pick("Na");
      el.append(
        P("Look at the shape of the chart. The <b>valleys are the alkali metals</b>: sodium's electron costs 496. The <b>peaks are the noble gases</b>: a full shell is the most expensive thing to break into. Chlorine, one step before a peak, costs 1251. And the saw-tooth repeats once per period, just like the valence count did."),
        takeaway("Ionisation energy is the cost of removing one electron from an atom. Low cost = easy giver (alkali metals); high cost = holds on tight (halogens, noble gases).")
      );
      return () => T.stop();
    },
    check: {
      type: "number", q: "Use the chart: roughly how many times more energy does it take to pull an electron off chlorine than off sodium? (one decimal)",
      answer: 2.5, tolerance: 0.11, hint: "Divide chlorine's ionisation energy (1251) by sodium's (496).", why: "1251 / 496 ≈ 2.5. Chlorine holds its outer electrons two and a half times as tightly as sodium holds its one.",
    },
  });

  // ---------------------------------------------------------------- 5
  steps.push({
    title: "Why the price rises across and falls down",
    short: "The two trends",
    newConcepts: ["core"],
    render(el) {
      el.append(
        P("Why is chlorine's electron so much dearer than sodium's? Stand where an outer electron stands and look inward. You see the nucleus, wrapped in the full inner shells. Those inner electrons cancel part of the nuclear <em>charge</em>."),
        P("For sodium: 11 protons minus 10 inner electrons leaves a net pull of <b>+1</b>. For chlorine: 17 − 10 = <b>+7</b>, at about the same distance. This leftover is the <b>core charge</b> (a simplified model: it treats the inner shells as a perfect shield)."),
        formula('core charge = <span class="hl">protons</span> − <span class="bl">inner-shell electrons</span>'),
        P("Two things set the price of an outer electron: <b>how big the core charge is</b>, and <b>how far out the electron sits</b>. Walk along a period, then down a group, and watch which one changes.")
      );
      const WALKS = { period: ["Na", "Mg", "Al", "Si", "P", "S", "Cl", "Ar"], group: ["Li", "Na", "K", "Cs"] };
      let walk = "period", i = 0;
      const W = 380, H = 170, pic = mkSvg(W, H, 520);
      const pl = plot({ xmin: 0, xmax: 7, ymin: 0, ymax: 1600, height: 210, narrow: true, minFont: 10, ylabel: "ionisation energy (kJ/mol)", xlabel: "", xticks: [0, 1, 2, 3, 4, 5, 6, 7], yticks: [0, 500, 1000, 1500], xfmt: (k) => WALKS[walk][k] || "", margins: { left: 56, right: 18 } });
      const mk = pl.marker(YEL);
      const sEl = stat("atom", ""), sCore = stat("core charge", "r"), sSh = stat("occupied shells", "b"), sIE = stat("ionisation energy", "y");
      const expl = note("", "min-height:44px;margin-top:10px");
      function drawPic() {
        pic.innerHTML = "";
        const sym = WALKS[walk][i], e = E[sym], n = e.shells.length, c = coreCharge(sym), cx = 64, cy = 85;
        for (let k = 1; k <= n; k++) pic.append(s("circle", { cx, cy, r: 46 * k + 6, fill: "none", stroke: k === n ? "#75632a" : LINE, "stroke-width": 1.2, "stroke-dasharray": k === n ? "" : "3 4" }));
        const rc = 20 + 3 * (n - 1), ex = cx + 46 * n + 6;
        pic.append(s("circle", { cx, cy, r: rc, fill: "#4a2326", stroke: RED, "stroke-width": 1.5 }));
        pic.append(txt(cx, cy + 6, "+" + c, { size: 18, fill: "#ffd9d9", weight: 700 }));
        pic.append(txt(cx, cy + rc + 16, "core", { size: 11 }));
        pic.append(s("line", { x1: ex - 9, x2: cx + rc + 10, y1: cy, y2: cy, stroke: RED, "stroke-width": 1 + c * 1.1, "stroke-linecap": "round", opacity: 0.75 }));
        pic.append(s("path", { d: `M${cx + rc + 3},${cy} l12,-8 v16 z`, fill: RED, opacity: 0.9 }));
        pic.append(s("circle", { cx: ex, cy, r: 6, fill: YEL }));
        if (ex < W - 40) pic.append(txt(ex, cy - 13, "outer e⁻", { size: 11, fill: YEL }));
        pic.append(txt(W - 6, 16, `${e.name}: ${e.Z} protons − ${e.Z - c} inner electrons = +${c}`, { anchor: "end", size: 12, fill: TEXT }));
        pic.append(txt(W - 6, H - 8, `outer electron in shell ${n}`, { anchor: "end", size: 12 }));
      }
      function draw() {
        const list = WALKS[walk]; i = Math.max(0, Math.min(list.length - 1, i));
        const sym = list[i], e = E[sym];
        pl.clear(); pl.line(list.map((x, k) => [k, E[x].ie1]), BLUE);
        list.forEach((x, k) => pl.dot(k, E[x].ie1, BLUE, 4));
        mk.move(i, e.ie1);
        sEl.set(sym); sCore.set("+" + coreCharge(sym)); sSh.set(String(e.shells.length)); sIE.set(String(e.ie1));
        expl.innerHTML = walk === "period"
          ? "<b>Across period 3</b> the outer electrons stay in shell 3, while the core charge climbs from +1 to +8. Stronger pull at the same distance: the price climbs from 496 to 1521. (The small dips at Al and S come from finer structure inside a shell, which the simple shell model leaves out.)"
          : "<b>Down group 1</b> the core charge is +1 every time, but each period adds a shell, so the outer electron sits farther from it. Weaker grip: the price falls from 520 to 376. (Rubidium, between K and Cs, is not in this course's data set.)";
        drawPic();
      }
      const sl = slider({ name: "position", min: 0, max: 7, step: 1, value: 0, fmtv: (v) => WALKS[walk][Math.min(WALKS[walk].length - 1, Math.round(v))], oninput: (v) => { i = Math.round(v); draw(); } });
      const tg = toggle("walk", [["period", "across period 3 (Na → Ar)"], ["group", "down group 1 (Li → Cs)"]], walk, (v) => {
        walk = v; i = 0; const n = WALKS[v].length - 1;
        sl.input.max = n; sl.set(0);
        pl.setRange({ xmax: n, xticks: WALKS[v].map((_, k) => k) }); draw();
      });
      el.append(widget("What the outer electron feels", tg, sl, pic, h("div", { class: "readout" }, sEl, sCore, sSh, sIE), pl, expl));
      draw();
      el.append(
        P("Put the two walks together and the table becomes a map. <b>Electrons are cheapest at the bottom left</b> (caesium, 376) and <b>dearest at the top right</b> (helium, 2372). Sodium is near the cheap corner, chlorine near the expensive one."),
        takeaway("Ionisation energy rises left → right across a period (bigger core charge, same shell) and falls top → bottom down a group (same core charge, farther out).")
      );
    },
    check: {
      type: "choice", q: "Rubidium sits in group 1 between potassium (419 kJ/mol) and caesium (376 kJ/mol). Which ionisation energy is the best guess for it?",
      options: ["About 400 kJ/mol", "About 500 kJ/mol", "About 1200 kJ/mol"],
      answer: 0,
      wrongHints: { 1: "That would be more than potassium, which is above it. Going down a group the outer electron gets farther out and cheaper.", 2: "That is halogen territory. Rubidium has a core charge of only +1, like every member of group 1." },
      why: "Down a group the price keeps falling, so rubidium lands between its neighbours. The measured value is 403 kJ/mol.",
      backTo: 3,
    },
  });

  // ---------------------------------------------------------------- 6
  steps.push({
    title: "Tug of war: electronegativity",
    short: "Electronegativity",
    newConcepts: ["en"],
    render(el) {
      el.append(
        P("Ionisation energy describes an atom alone. But electrons change hands when <b>two atoms meet</b>, and then the question is which of them pulls harder on the electrons between them."),
        P("That pulling strength has its own score, <b>electronegativity</b>. It runs on a scale without units (the Pauling scale) from about 0.8 to 4.0. The reasons are the ones you just saw: a big core charge close to the outer shell pulls hard. So the score <b>rises to the right and falls going down</b>, with fluorine (3.98) as champion and caesium (0.79) at the bottom."),
        P("Put an electron between two atoms and see where it ends up.")
      );
      const T = timers();
      const LIST = ["K", "Na", "Li", "Mg", "Al", "Zn", "S", "Cl", "O", "F"];
      let a = "Na", b = "Cl", pos = 0;
      const W = 460, H = 150, svg = mkSvg(W, H, 580);
      const x0 = 118, x1 = 342, mid = (x0 + x1) / 2, cy = 62;
      const mkSel = (val, on) => { const sel = h("select", { style: "font:inherit;background:var(--panel2);color:var(--text);border:1px solid var(--line);border-radius:6px;padding:4px 8px" }); LIST.forEach((x) => sel.append(h("option", { value: x }, `${x} · ${E[x].name}`))); sel.value = val; sel.onchange = () => on(sel.value); return sel; };
      const selA = mkSel(a, (v) => { a = v; go(); }), selB = mkSel(b, (v) => { b = v; go(); });
      const sA = stat("left atom", ""), sB = stat("right atom", ""), sD = stat("difference", "y");
      const verdict = note("", "min-height:66px;margin-top:10px");
      const bars = hbars(LIST.map((x) => `${x} <span style="color:var(--muted)">${E[x].name}</span>`), { max: 4, fmtv: (v) => v.toFixed(2), labelWidth: 120 });
      let eDot;
      function drawStatic() {
        svg.innerHTML = "";
        svg.append(s("rect", { x: x0, y: cy - 5, width: x1 - x0, height: 10, rx: 5, fill: PANEL2, stroke: LINE }));
        svg.append(s("line", { x1: mid, x2: mid, y1: cy - 14, y2: cy + 14, stroke: MUTED, "stroke-dasharray": "3 3" }));
        svg.append(txt(mid, cy + 30, "even pull", { size: 11 }));
        [[a, 62], [b, W - 62]].forEach(([x, cx]) => {
          const col = CLS_COL[cls(x)];
          svg.append(s("circle", { cx, cy, r: 34, fill: "#1b2230", stroke: col, "stroke-width": 2 }));
          svg.append(txt(cx, cy + 7, x, { size: 21, fill: TEXT, weight: 700 }));
          svg.append(txt(cx, cy + 56, "pull " + E[x].en.toFixed(2), { size: 13, fill: col, weight: 600 }));
          svg.append(txt(cx, cy + 74, E[x].name, { size: 11.5 }));
        });
        eDot = s("circle", { cx: mid + pos, cy, r: 8, fill: YEL, stroke: "#7a5d10", "stroke-width": 1 }); svg.append(eDot);
      }
      function go() {
        T.stop(); selA.value = a; selB.value = b;
        const d = E[b].en - E[a].en, target = Math.max(-1, Math.min(1, d / 3.2)) * (x1 - x0) / 2, from = pos;
        drawStatic();
        T.tween(500, (t) => { pos = lerp(from, target, ease(t)); eDot.setAttribute("cx", mid + pos); });
        sA.set(`${a}  ${E[a].en.toFixed(2)}`); sB.set(`${b}  ${E[b].en.toFixed(2)}`); sD.set(Math.abs(d).toFixed(2));
        const win = d > 0 ? b : a, lose = d > 0 ? a : b, ad = Math.abs(d);
        verdict.innerHTML = ad < 0.4
          ? `<b>Even match.</b> ${a === b ? "Two identical atoms pull equally" : `${Name(a)} and ${E[b].name} pull almost equally`}, so the electron stays in the middle. Nobody gives, nobody takes.`
          : ad < 1.7
            ? `<b>Lopsided.</b> ${Name(win)} pulls harder, so the electron spends most of its time on that side, but ${E[lose].name} has not let go completely.`
            : `<b>One-sided.</b> ${Name(win)} pulls so much harder that it is simplest to say it <b>took</b> the electron: ${E[lose].name} is left as a cation, ${E[win].name} becomes an anion.`;
        const mark = LIST.map((x, k) => (x === a || x === b ? k : -1)).filter((k) => k >= 0);
        bars.update(LIST.map((x) => E[x].en), LIST.map((x) => (x === a || x === b ? YEL : CLS_COL[cls(x)]))); bars.mark(mark);
      }
      const preset = (x, y) => () => { a = x; b = y; go(); };
      el.append(widget("Who gets the electron?",
        h("div", { style: "display:flex;gap:10px;justify-content:space-between;flex-wrap:wrap;margin-bottom:8px" }, selA, selB),
        svg, h("div", { class: "readout" }, sA, sB, sD), verdict,
        h("div", { class: "btns" },
          h("button", { onclick: preset("Cl", "Cl") }, "Cl vs Cl"), h("button", { onclick: preset("Na", "K") }, "Na vs K"),
          h("button", { onclick: preset("Al", "Cl") }, "Al vs Cl"), h("button", { onclick: preset("Li", "F") }, "Li vs F"),
          h("button", { class: "primary", onclick: preset("Na", "Cl") }, "Na vs Cl")),
        h("div", { style: "margin-top:14px" }, note("Electronegativity of the ten atoms on offer (yellow = the two in the ring)", "margin-bottom:6px"), bars)));
      go();
      el.append(
        P("The three verdicts are a rough guide, not a law: the boundaries (around 0.4 and 1.7–2.0) are rules of thumb. But the direction is reliable: <b>electrons drift toward the more electronegative atom</b>, and a big gap means a complete handover. Sodium and chlorine differ by 2.23, one of the larger gaps you can pick here. The noble gases have no score in this table: they almost never get into the ring."),
        takeaway("Electronegativity is how hard an atom pulls on electrons when it meets another atom. It is highest at the top right (F) and lowest at the bottom left (Cs); a big gap means the electron changes owner.")
      );
      return () => T.stop();
    },
    check: {
      type: "choice", q: "Bromine sits directly below chlorine (electronegativity 3.16) in group 17. Its electronegativity is most likely…",
      options: ["2.96: a little lower, the outer shell is one step farther out", "3.16: the same, because the group is the same", "3.50: higher, because bromine has more protons"],
      answer: 0,
      wrongHints: { 1: "Same group means the same core charge, but the outer shell is farther from it in bromine. Distance weakens the pull.", 2: "The extra protons are cancelled by extra inner electrons: the core charge is still +7. What changes is the distance." },
      why: "Down a group the pull weakens. Bromine's Pauling value is 2.96.",
      backTo: 4,
    },
  });

  // ---------------------------------------------------------------- 7
  steps.push({
    title: "Metals and non-metals: two camps",
    short: "Metals vs non-metals",
    newConcepts: ["metal", "nonmetal"],
    render(el) {
      el.append(
        P("You now have two numbers per element: the price of its electron (<em>ionisation energy</em>) and its pull on other atoms' electrons (<em>electronegativity</em>). Plot one against the other and the elements split into two camps."),
        P("The camp with <b>cheap electrons and a weak pull</b> are the <b>metals</b>. Their outer electrons are held so loosely that they give them up in reactions. The same loose electrons are why metals are shiny and carry electric current (more in <em>Ions, salts and electrolytes</em>). Most elements are metals."),
        P("The camp with <b>dear electrons and a strong pull</b> are the <b>non-metals</b>. Their outer shell is close to full, so they take electrons to finish it. Slide the dividing line to separate the camps.")
      );
      const base = ALL.filter((x) => E[x].Z <= 36 && cls(x) !== "noble");
      const heavy = ALL.filter((x) => E[x].Z > 36);
      const LABELS = ["Na", "Mg", "Al", "Zn", "H", "C", "N", "O", "F", "Cl", "S", "Cs", "Au", "Pt", "Pb", "Hg"];
      const nar = isNarrow();
      let cut = 1.2, withHeavy = false;
      const pl = plot({ xmin: 0.6, xmax: 4.2, ymin: 300, ymax: 1800, height: nar ? 300 : 290, narrow: true, minFont: 10, xlabel: "electronegativity (pull)", ylabel: "ionisation energy (kJ/mol)", xticks: [1, 2, 3, 4], yticks: [500, 1000, 1500], margins: { left: 56, right: 14 } });
      const sM = stat("metals left of the line", "g"), sN = stat("non-metals right of it", "p"), sBad = stat("on the wrong side", "r");
      const msg = note("", "min-height:44px;margin-top:10px");
      function draw() {
        const list = withHeavy ? base.concat(heavy) : base;
        pl.clear();
        pl.area([[0.6, 1800], [cut, 1800]], GRN, 0.07, 300); pl.area([[cut, 1800], [4.2, 1800]], PUR, 0.07, 300);
        pl.vline(cut, YEL, "line at " + cut.toFixed(2), { pos: cut > 3.2 ? "left" : "right", halo: true });
        let m = 0, mOK = 0, n = 0, nOK = 0; const wrong = [];
        list.forEach((x) => {
          const c = cls(x), e = E[x];
          if (c === "metal") { m++; if (e.en < cut) mOK++; else wrong.push(x); }
          if (c === "nonmetal") { n++; if (e.en >= cut) nOK++; else wrong.push(x); }
          pl.dot(e.en, e.ie1, CLS_COL[c], 4.2);
        });
        list.filter((x) => LABELS.includes(x)).forEach((x) => { const t = txt(pl.X(E[x].en) + 6, pl.Y(E[x].ie1) - 6, x, { anchor: "start", size: 10.5, fill: TEXT }); t.classList.add("c-halo"); pl.layer.append(t); });
        sM.set(`${mOK} of ${m}`); sN.set(`${nOK} of ${n}`); sBad.set(String(wrong.length));
        msg.innerHTML = wrong.length === 0
          ? `<span style="color:var(--green)">Clean split.</span> Every metal is on the weak-pull side and every non-metal on the strong-pull side. A pull of about 2 is the border.`
          : `On the wrong side: ${wrong.slice(0, 12).join(", ")}${wrong.length > 12 ? " …" : ""}.` + (withHeavy && cut > 1.95 && cut < 2.2 ? " Heavy metals such as gold and platinum pull almost like non-metals: they are metals that hate to give. That will matter in <em>The activity series</em>." : "");
      }
      const sl = slider({ name: "border", min: 0.8, max: 4, step: 0.05, value: cut, fmtv: (v) => v.toFixed(2), oninput: (v) => { cut = v; draw(); } });
      const tg = toggle("elements", [[0, "H to Kr"], [1, "+ heavy elements (Ag … Pb)"]], 0, (v) => { withHeavy = !!v; draw(); });
      el.append(widget("Every element with an electronegativity value, as one dot",
        note('<span style="color:#5fd38d">●</span> metal &nbsp; <span style="color:#c3a6ff">●</span> non-metal &nbsp; <span style="color:#7d8799">●</span> borderline (B, Si, Ge, As)', "margin-bottom:6px"),
        pl, sl, tg, h("div", { class: "readout" }, sM, sN, sBad), msg));
      draw();
      el.append(
        P("On the table, the camps are regions. <b>Metals fill the left and the bottom</b>; <b>non-metals sit in the upper right</b> corner, plus hydrogen: one electron like the alkali metals, but held tightly (1312 kJ/mol), so it is a non-metal. A few elements along the border, like silicon, are in between (see <em>Silicon and light</em>). The noble gases are non-metals too, but they stay out of the trade."),
        takeaway("Metals: low ionisation energy, low electronegativity, they give electrons. Non-metals: high on both, they take electrons. Left and bottom of the table versus upper right.")
      );
    },
    check: {
      type: "choice", q: "An unknown element has ionisation energy 550 kJ/mol and electronegativity 1.0. What is it most likely to do in a reaction?",
      options: ["Give electrons and become a cation: it is a metal", "Take electrons and become an anion: it is a non-metal", "Nothing: it is a noble gas"],
      answer: 0,
      wrongHints: { 1: "Non-metals have a strong pull (above about 2) and expensive electrons (roughly 1000 kJ/mol and up). This one is low on both.", 2: "Noble gases have the most expensive electrons of all, 1350 kJ/mol and more. 550 is cheap." },
      why: "Cheap electron, weak pull: a metal, and metals give. (The numbers are close to calcium's: 590 and 1.00.)",
    },
  });

  // ---------------------------------------------------------------- 8
  steps.push({
    title: "How many electrons? The typical ion charge",
    short: "Typical ion charge",
    newConcepts: ["ioncharge", "transition"],
    render(el) {
      el.append(
        P("Metals give, non-metals take. But <b>how many</b>? Look at what each further electron costs. Magnesium has 2 valence electrons:")
      );
      let who = "Mg";
      const bc = barChart({ labels: ["1st", "2nd", "3rd", "4th"], max: 12500, height: 150, fmtv: (v) => String(v), narrow: true, minFont: 10 });
      const cliff = note("", "min-height:44px;margin-top:6px");
      function drawSucc() {
        const v = E[who].valence, arr = SUCC[who];
        bc.update(arr, arr.map((_, k) => (k < v ? GRN : RED)));
        cliff.innerHTML = `<b>${Name(who)}</b> (shells ${E[who].shells.join(", ")}): the first ${v === 1 ? "electron is" : v + " electrons are"} valence electrons (green). Electron number ${v + 1} would have to come out of the full shell underneath (red), and costs <b>${(arr[v] / arr[v - 1]).toFixed(1)}×</b> as much as the one before. Chemistry stops at the cliff: <b>${ion(who, v)}</b>.`;
      }
      el.append(widget("Cost of removing each successive electron (kJ/mol)",
        toggle("atom", ["Na", "Mg", "Al"].map((x) => [x, x]), who, (v) => { who = v; drawSucc(); }), bc, cliff));
      drawSucc();
      el.append(
        P("So a metal gives <b>its valence electrons and no more</b>. A non-metal goes the other way and takes just enough to <b>fill its shell</b>. Either way the atom lands on a noble-gas shell pattern, and the charge it carries then is its <b>typical ion charge</b>:"),
        h("div", { class: "tablewrap", style: "margin:12px 0 18px" }, (() => {
          const tb = h("table", { class: "small compact" });
          tb.append(h("tr", {}, h("th", {}, "group"), ...[1, 2, 13, 15, 16, 17, 18].map((g) => h("th", { class: "num" }, String(g)))));
          tb.append(h("tr", {}, h("td", {}, "typical charge"), ...["1+", "2+", "3+", "3−", "2−", "1−", "none"].map((c, k) => h("td", { class: "num", style: `color:${k < 3 ? RED : k < 6 ? BLUE : MUTED}` }, c))));
          tb.append(h("tr", {}, h("td", {}, "example"), ...["Na^+", "Mg^2+", "Al^3+", "N^3-", "O^2-", "Cl^-", "Ar"].map((x) => h("td", { class: "num", style: "font-family:inherit;font-size:15px" }, f(x)))));
          return tb;
        })()),
        P("Group 14 is missing on purpose: giving 4 or taking 4 are both too expensive, so carbon and silicon rarely form simple ions. Predict, then reveal:")
      );
      const T = timers();
      const PICK = ["Li", "K", "Ca", "Al", "Zn", "Fe", "N", "O", "S", "Cl"];
      let sym = "Ca", shown = false;
      const W = narrow(460, 340), H = 200, svg = mkSvg(W, H, 580), ax = narrow(110, 80), ar = narrow(76, 62), lx = narrow(222, 166);
      const ionShells = (x) => { const q = typCharge(x), sh = E[x].shells.slice(); if (q > 0) sh.pop(); else sh[sh.length - 1] -= q; return sh; };
      function draw() {
        svg.innerHTML = "";
        const e = E[sym], q = typCharge(sym), sh = shown ? ionShells(sym) : e.shells;
        const A = drawAtom(svg, ax, 90, sym, { shells: sh, rmax: ar });
        svg.append(txt(ax, 190, shown ? `${ion(sym, q)}: shells ${sh.join(", ")}` : `${sym}: shells ${sh.join(", ")}`, { size: 13, fill: shown ? (q > 0 ? RED : BLUE) : TEXT, weight: 600 }));
        const L = (y, str, o) => svg.append(txt(lx, y, str, Object.assign({ anchor: "start", size: narrow(12.5, 11.5) }, o || {})));
        L(40, `${Name(sym)}, group ${e.group}`, { fill: TEXT, size: 14, weight: 600 });
        L(60, `${CLS_NAME[cls(sym)]} · ${e.valence} outer electron${e.valence > 1 ? "s" : ""}`);
        if (!shown) { L(100, "Typical ion?", { fill: YEL, size: 15, weight: 600 }); L(120, "Decide, then press Reveal."); }
        else {
          const n = Math.abs(q), nb = nobleLike(sh);
          L(96, q > 0 ? `${sym} → ${ion(sym, q)} + ${n === 1 ? "" : n}e⁻` : `${sym} + ${n === 1 ? "" : n}e⁻ → ${ion(sym, q)}`, { fill: q > 0 ? RED : BLUE, size: 16, weight: 700 });
          L(118, q > 0 ? `gives ${n} electron${n > 1 ? "s" : ""}` : `takes ${n} electron${n > 1 ? "s" : ""}`);
          L(138, nb ? `now has ${nb}'s shells` : sym === "Zn" ? "third shell is full (18)" : "outer 2 electrons gone");
          if (sym === "Fe") L(158, `also common: ${f("Fe^3+")}`, { fill: YEL });
        }
        return A;
      }
      function reveal() {
        T.stop(); shown = false;
        const A = draw(), q = typCharge(sym), n = Math.abs(q), dots = [];
        for (let k = 0; k < n; k++) {
          const src = q > 0 ? A.outer[k] : { x: ax + A.R * Math.cos(-0.3 + k * 0.5), y: 90 + A.R * Math.sin(-0.3 + k * 0.5) };
          if (q > 0) src.node.setAttribute("opacity", 0);
          const c = s("circle", { r: 4.2, fill: YEL, cx: src.x, cy: src.y }); svg.append(c); dots.push({ c, src, far: { x: lx - 14, y: 150 + k * 12 } });
        }
        T.tween(900, (t) => { const k = ease(t); dots.forEach((d) => { const a = q > 0 ? d.src : d.far, b = q > 0 ? d.far : d.src; d.c.setAttribute("cx", lerp(a.x, b.x, k)); d.c.setAttribute("cy", lerp(a.y, b.y, k)); }); }, () => { shown = true; draw(); });
      }
      el.append(widget("From atom to its typical ion",
        toggle("atom", PICK.map((x) => [x, x]), sym, (v) => { T.stop(); sym = v; shown = false; draw(); }),
        svg, h("div", { class: "btns" }, h("button", { class: "primary", onclick: reveal }, "Reveal the ion"))));
      draw();
      el.append(
        P("Zinc and iron come from the ten columns that were hidden in step 2: groups 3–12, the <b>transition metals</b>. From period 4 on, the third shell grows from 8 towards 18 electrons (the 2-8-8 picture was a simplification), while the outer shell keeps just 1 or 2. Those outer ones go first, so <b>2+ is the commonest charge</b>: " + f("Zn^2+") + ", " + f("Fe^2+") + ", " + f("Cu^2+") + ". But the growing inner shell lies close in energy, so many transition metals have a second option: " + f("Fe^3+") + ", " + f("Cu^+") + ". Zinc sticks to 2+."),
        takeaway("Typical ion charge: metals lose all their valence electrons (groups 1, 2, 13 → 1+, 2+, 3+); non-metals gain enough to fill the shell (groups 15, 16, 17 → 3−, 2−, 1−). Transition metals are mostly 2+, often with a second charge.")
      );
      return () => T.stop();
    },
    check: {
      type: "number", q: "Barium is in group 2 of period 6. What is the charge of its typical ion? (type the number of + charges)",
      answer: 2, tolerance: 0, hint: "Group 1 and 2 metals give exactly their valence electrons.", why: "Barium gives its 2 valence electrons and becomes " + f("Ba^2+") + ", just like magnesium and calcium above it.",
      backTo: 1,
    },
  });

  // ---------------------------------------------------------------- 9
  steps.push({
    title: "Capstone: the map, and an electron trade",
    short: "Capstone: giver + taker",
    newConcepts: [],
    render(el) {
      el.append(
        P("Here is the whole map: every element this course uses, at its address. Colour it by any property from this lesson and look for the pattern: the same diagonal runs through all of them, from the givers at the bottom left to the takers at the top right."),
        P("Then run the experiment. <b>Pick a giver and a taker</b> from the table and let them meet. Try to break it: two metals, two non-metals, a noble gas, the roles reversed, gold.")
      );
      const T = timers();
      let mode = "class", giver = "Na", taker = "Cl", slot = "giver", ran = false;
      const ieT = (x) => (E[x].ie1 - 376) / (2372 - 376), enT = (x) => (E[x].en - 0.79) / (3.98 - 0.79);
      const PAINT = {
        class: (x) => ({ fill: mix("#1b2230", CLS_COL[cls(x)], 0.55), sub: { metal: "metal", nonmetal: "non-m", semi: "semi", noble: "noble" }[cls(x)] }),
        valence: (x) => (isTransition(x) ? { fill: "#2a3140", sub: "" } : { fill: VCOL[E[x].valence - 1], dark: true, sub: E[x].valence + " e⁻" }),
        ie: (x) => ({ fill: mix("#1d3a5c", YEL, Math.pow(ieT(x), 0.7)), dark: ieT(x) > 0.3, sub: E[x].ie1 }),
        en: (x) => (E[x].en == null || cls(x) === "noble" ? { fill: "#1b2230", dim: true, sub: "–" } : { fill: mix("#1d3a5c", YEL, enT(x)), dark: enT(x) > 0.42, sub: E[x].en.toFixed(2) }),
        ion: (x) => { const q = typCharge(x); return q === 0 ? { fill: "#1b2230", dim: true, sub: "–" } : { fill: q > 0 ? mix("#3a2226", RED, 0.25 + 0.16 * q) : mix("#1d2c44", BLUE, 0.2 + 0.2 * -q), sub: chargeTxt(q), dark: q <= -2 }; },
      };
      const LEGEND = {
        class: '<span style="color:#5fd38d">■</span> metal &nbsp; <span style="color:#c3a6ff">■</span> non-metal &nbsp; <span style="color:#7d8799">■</span> borderline &nbsp; <span style="color:#6cb4ff">■</span> noble gas',
        valence: "Valence electrons for groups 1, 2 and 13–18: one colour per column. Transition metals (grey) keep 1–2 outer electrons.",
        ie: "Ionisation energy, kJ/mol: dark = cheap electron, yellow = expensive. Cheapest: Cs (376). Dearest: He (2372).",
        en: "Electronegativity: dark = weak pull, yellow = strong pull. Noble gases have no value in this table.",
        ion: '<span style="color:#ff6b6b">■</span> cation (gave electrons) &nbsp; <span style="color:#6cb4ff">■</span> anion (took electrons) &nbsp; darker = no simple ion',
      };
      const legend = note("", "min-height:22px;margin:8px 0");
      const info = note("", "min-height:44px;margin-top:8px");
      const tab = ptable({ syms: ALL, layout: "full", onclick: (x) => { if (slot === "giver") { giver = x; slot = "taker"; } else { taker = x; slot = "giver"; } slotTg.set(slot); setup(); } });
      const describe = (x) => { const e = E[x], q = TYP[x]; return `<b>${e.name}</b> (${x}, Z = ${e.Z}): group ${e.group}, period ${e.period}, ${CLS_NAME[cls(x)]} · ionisation energy ${e.ie1} kJ/mol · electronegativity ${e.en == null || cls(x) === "noble" ? "–" : e.en.toFixed(2)} · typical ion ${q ? q.map(f).join(" or ") : "none"}`; };
      function paintTable() {
        tab.paint(PAINT[mode]); tab.select({ [giver]: RED, [taker]: giver === taker ? "#ffffff" : BLUE });
        legend.innerHTML = LEGEND[mode];
        info.innerHTML = `<span style="color:var(--red)">Giver</span> ${describe(giver)}<br><span style="color:var(--blue)">Taker</span> ${describe(taker)}`;
      }
      // ---- the experiment
      const W = narrow(420, 320), H = 204, svg = mkSvg(W, H, 540);
      const sIE = stat("giver: ionisation energy", "r"), sEN = stat("taker: electronegativity", "b"), sGap = stat("electronegativity gap", "y"), sMoved = stat("electrons moved", "g");
      const verdict = note("", "min-height:88px;margin-top:10px");
      const gcd = (a, b) => (b ? gcd(b, a % b) : a);
      const takes = (x) => (x === "H" ? 1 : cls(x) === "nonmetal" && x !== "C" ? -typCharge(x) : 0);
      const gives = (x) => (cls(x) === "metal" ? typCharge(x) : 0);
      function plan() {
        const gc = cls(giver), tc = cls(taker), gv = gives(giver), tk = takes(taker);
        const gap = E[giver].en != null && E[taker].en != null && gc !== "noble" && tc !== "noble" ? E[taker].en - E[giver].en : null;
        let kind, text;
        const gn = E[giver].name, tn = E[taker].name, Gn = gn[0].toUpperCase() + gn.slice(1), Tn = tn[0].toUpperCase() + tn.slice(1);
        if (gc === "noble" || tc === "noble") { kind = "none"; const nb = gc === "noble" ? Gn : Tn; text = `<b>No deal.</b> ${nb} is a noble gas: its outer shell is full. It has nothing to give and no room to take.`; }
        else if (gv && tk) kind = "ok";
        else if (gc === "metal" && tc === "metal") { kind = "none"; text = `<b>Two givers, no taker.</b> ${Gn} and ${tn} both hold their outer electrons loosely and neither pulls hard enough to keep an extra one. No ions form.`; }
        else if (gc !== "metal" && gives(taker) && takes(giver)) { kind = "swap"; text = `<b>Wrong way round.</b> ${Gn} pulls harder (${E[giver].en.toFixed(2)} against ${E[taker].en.toFixed(2)}), so it will not hand an electron to ${tn}. Swap the roles and it works.`; }
        else if (gc === "nonmetal" && tc === "nonmetal") { kind = "none"; text = `<b>Two takers.</b> Both pull hard${gap != null ? ` (gap only ${Math.abs(gap).toFixed(2)})` : ""} and neither lets go. Instead of trading, non-metals <b>share</b> electrons: a different kind of bond, covered in <em>Silicon and light</em>.`; }
        else { kind = "none"; const fence = [giver, taker].find((x) => cls(x) === "semi" || x === "C") || giver; text = `<b>No clean trade.</b> ${E[fence].name[0].toUpperCase() + E[fence].name.slice(1)} sits on the fence: it would have to move ${fence === "B" ? 3 : fence === "As" ? 3 : 4} electrons to reach a full shell, which costs too much either way. Elements like this share electrons instead (see <em>Silicon and light</em>).`; }
        let nG = 1, nT = 1;
        if (kind === "ok") { const l = (gv * tk) / gcd(gv, tk); nG = l / gv; nT = l / tk; }
        return { kind, text, gv, tk, nG, nT, gap };
      }
      let scene = null;
      function drawScene(after) {
        svg.innerHTML = "";
        const p = plan();
        const col = (c) => { const sp = Math.min(60, 168 / c), r = Math.min(23, sp * 0.36); return { ys: Array.from({ length: c }, (_, i) => H / 2 - 14 + (i - (c - 1) / 2) * sp), r }; };
        const G = col(p.nG), Tk = col(p.nT), gx = narrow(92, 72), tx = W - gx;
        const eG = [], slots = [];
        const disc = (x, cx, cy, r, role) => {
          const c = cls(x), isIon = after && p.kind === "ok";
          const stroke = isIon ? (role === "g" ? RED : BLUE) : CLS_COL[c];
          svg.append(s("circle", { cx, cy, r, fill: isIon ? mix("#1b2230", stroke, 0.3) : "#1b2230", stroke, "stroke-width": 2 }));
          const label = isIon ? (role === "g" ? ion(x, p.gv) : ion(x, -p.tk)) : x;
          svg.append(txt(cx, cy + r * 0.24, label, { size: Math.max(11, r * 0.66), fill: TEXT, weight: 700 }));
        };
        const ring = (cx, cy, r, n, total, k0) => Array.from({ length: n }, (_, i) => { const a = Math.PI * (k0 || 0) + (2 * Math.PI * i) / total; return { x: cx + (r + 8) * Math.cos(a), y: cy + (r + 8) * Math.sin(a) }; });
        G.ys.forEach((cy) => {
          disc(giver, gx, cy, G.r, "g");
          const n = p.kind === "ok" ? p.gv : cls(giver) === "metal" ? Math.max(1, gives(giver)) : E[giver].valence;
          ring(gx, cy, G.r, n, Math.max(n, 3), 0).forEach((pt) => { const c = s("circle", { cx: pt.x, cy: pt.y, r: 3.6, fill: YEL }); if (!(after && p.kind === "ok")) svg.append(c); eG.push({ pt, c }); });
        });
        Tk.ys.forEach((cy) => {
          disc(taker, tx, cy, Tk.r, "t");
          const tc = cls(taker);
          const have = tc === "metal" ? Math.max(1, gives(taker)) : E[taker].valence, room = p.kind === "ok" ? p.tk : 0, total = have + room;
          const pts = ring(tx, cy, Tk.r, total, Math.max(total, 3), 1);
          pts.forEach((pt, i) => {
            if (i < room) { const filled = after && p.kind === "ok"; svg.append(s("circle", { cx: pt.x, cy: pt.y, r: 3.6, fill: filled ? YEL : "none", stroke: filled ? "none" : "#8a7a45", "stroke-dasharray": filled ? "" : "2 2", "stroke-width": 1.2 })); slots.push(pt); }
            else svg.append(s("circle", { cx: pt.x, cy: pt.y, r: 3.6, fill: YEL, opacity: 0.55 }));
          });
        });
        svg.append(txt(gx, H - 4, `giver: ${p.nG > 1 ? p.nG + " × " : ""}${E[giver].name}`, { size: 12, fill: RED }));
        svg.append(txt(tx, H - 4, `taker: ${p.nT > 1 ? p.nT + " × " : ""}${E[taker].name}`, { size: 12, fill: BLUE }));
        scene = { p, eG, slots };
      }
      function setup() {
        T.stop(); ran = false; paintTable(); drawScene(false);
        const p = scene.p;
        sIE.set(E[giver].ie1 + ""); sEN.set(E[taker].en == null || cls(taker) === "noble" ? "–" : E[taker].en.toFixed(2));
        sGap.set(p.gap == null ? "–" : (p.gap >= 0 ? "" : "−") + Math.abs(p.gap).toFixed(2)); sMoved.set("0");
        verdict.innerHTML = `Ready: <b>${E[giver].name}</b> offers, <b>${E[taker].name}</b> receives. Predict what happens, then run it.`;
      }
      function run() {
        T.stop(); drawScene(false); sMoved.set("0");
        const { p, eG, slots } = scene;
        if (p.kind === "ok") {
          const N = eG.length;
          T.tween(700 + 260 * N, (t) => {
            let moved = 0;
            eG.forEach((e, i) => {
              const k = ease(Math.max(0, Math.min(1, (t * (N + 2) - i) / 3))), to = slots[i];
              e.c.setAttribute("cx", lerp(e.pt.x, to.x, k)); e.c.setAttribute("cy", lerp(e.pt.y, to.y, k) - 22 * Math.sin(Math.PI * k));
              if (k >= 1) moved++;
            });
            sMoved.set(String(moved));
          }, () => {
            ran = true; drawScene(true); sMoved.set(String(N));
            const gI = ion(giver, p.gv), tI = ion(taker, -p.tk), g = p.gap;
            const strength = g == null ? "" : g >= 1.7 ? " The electronegativity gap is large, so this is a clean handover." : g >= 1.0 ? " The gap is moderate: the taker wins, but the giver keeps some hold on the electrons." : ` The gap is small (${g.toFixed(2)}): ${E[giver].name} is a reluctant giver and holds on to much of what it “gave”.`;
            const extra = taker === "H" ? " (Yes, hydrogen can take: with a strong giver it fills its first shell and becomes " + f("H^-") + ".)" : giver === "Au" || giver === "Pt" ? " That reluctance is why gold and platinum stay shiny: see <em>The activity series</em>." : "";
            verdict.innerHTML = `<b>Trade done.</b> ${p.nG > 1 ? p.nG + " " : ""}${E[giver].name} atom${p.nG > 1 ? "s give" : " gives"} ${p.gv} electron${p.gv > 1 ? "s" : ""}${p.nG > 1 ? " each" : ""}; ${p.nT > 1 ? "each of " + p.nT + " " : ""}${E[taker].name} atom${p.nT > 1 ? "s" : ""} takes ${p.tk}. Result: <span style="color:var(--red)">${p.nG > 1 ? p.nG + " " : ""}${gI}</span> and <span style="color:var(--blue)">${p.nT > 1 ? p.nT + " " : ""}${tI}</span>. Electrons given = electrons taken = ${N}.${strength}${extra} How such ions stack into a solid is the next lesson, <em>Ions, salts and electrolytes</em>.`;
          });
        } else {
          const e = eG[0], to = { x: W / 2, y: H / 2 - 14 };
          T.tween(900, (t) => { const k = Math.sin(Math.PI * t) * 0.9; e.c.setAttribute("cx", lerp(e.pt.x, to.x, k)); e.c.setAttribute("cy", lerp(e.pt.y, to.y, k)); }, () => { ran = true; verdict.innerHTML = p.text; });
        }
      }
      const preset = (g, t) => () => { giver = g; taker = t; slot = "giver"; slotTg.set(slot); setup(); run(); };
      const slotTg = toggle("a click on the table sets the", [["giver", "giver"], ["taker", "taker"]], slot, (v) => { slot = v; });
      const modeTg = toggle("colour by", [["class", "metal / non-metal"], ["valence", "valence electrons"], ["ie", "ionisation energy"], ["en", "electronegativity"], ["ion", "typical ion"]], mode, (v) => { mode = v; paintTable(); });
      el.append(widget("The periodic table (periods 5 and 6 show only the elements this course uses)", modeTg, legend, tab, slotTg, info));
      el.append(widget("The experiment: one giver, one taker",
        svg, h("div", { class: "readout" }, sIE, sEN, sGap, sMoved),
        h("div", { class: "btns" },
          h("button", { class: "primary", onclick: run }, "Let them meet"),
          h("button", { onclick: () => { const g = giver; giver = taker; taker = g; setup(); } }, "Swap roles")),
        verdict,
        h("div", { class: "btns" },
          h("button", { onclick: preset("Li", "F") }, "Li + F"), h("button", { onclick: preset("Mg", "Cl") }, "Mg + Cl"),
          h("button", { onclick: preset("Zn", "O") }, "Zn + O"), h("button", { onclick: preset("Al", "O") }, "Al + O"),
          h("button", { onclick: preset("Na", "K") }, "Na + K"), h("button", { onclick: preset("Cl", "Na") }, "Cl gives to Na?"),
          h("button", { onclick: preset("Ne", "Cl") }, "Ne + Cl"), h("button", { onclick: preset("Au", "Cl") }, "Au + Cl"),
          h("button", { onclick: preset("Na", "Cl") }, "Na + Cl"))));
      setup();
      el.append(
        P("What to look for, each from an earlier step:"),
        h("ul", {},
          h("li", { html: "Colour by <b>valence electrons</b>: one colour per column (<b>step 2</b>). Colour by <b>ionisation energy</b> or <b>electronegativity</b>: both brighten towards the top right (<b>steps 5 and 6</b>)." }),
          h("li", { html: "A trade happens only between a <b>metal</b> and a <b>non-metal</b> (<b>step 7</b>). Lithium, sodium and zinc give; oxygen, fluorine and chlorine take." }),
          h("li", { html: "The number of electrons moved follows the <b>typical ion charges</b> (<b>step 8</b>). When giver and taker disagree, as with Mg + Cl or Al + O, the atoms team up until electrons given equal electrons taken." }),
          h("li", { html: "The electronegativity gap tells you how one-sided the trade is. Li + F (3.00) is about as lopsided as chemistry gets, which is a first hint of why lithium and fluorine sit at the two ends of the voltage table you will meet in <em>Electrode potentials</em>." })),
        takeaway("An element's address predicts its trade: metals at the left and bottom give their valence electrons, non-metals at the top right take enough to fill their shell, noble gases abstain. Every battery in this course is built on such a pair.")
      );
      return () => T.stop();
    },
  });

  Course.run({
    id: "periodic-trends",
    section: "0. Atoms that give and take electrons",
    title: "The periodic table: who gives, who takes",
    concepts: {
      period: "period", group: "group", noble: "noble gas", alkali: "alkali metal", halogen: "halogen",
      ie: "ionisation energy", core: "core charge (simplified)", en: "electronegativity",
      metal: "metal", nonmetal: "non-metal", ioncharge: "typical ion charge", transition: "transition metal",
    },
    sources: [
      { title: "OpenStax Chemistry 2e, §2.5 The Periodic Table", url: "https://openstax.org/books/chemistry-2e/pages/2-5-the-periodic-table", note: "groups, periods, metals / non-metals, the named families" },
      { title: "OpenStax Chemistry 2e, §6.5 Periodic Variations in Element Properties", url: "https://openstax.org/books/chemistry-2e/pages/6-5-periodic-variations-in-element-properties", note: "ionisation-energy trends, shielding and effective nuclear charge, successive ionisation energies" },
      { title: "OpenStax Chemistry 2e, §7.2 Covalent Bonding", url: "https://openstax.org/books/chemistry-2e/pages/7-2-covalent-bonding", note: "Pauling electronegativity, its trends, and the rough difference guide for when an electron is transferred" },
      { title: "OpenStax Chemistry 2e, §2.6 Ionic and Molecular Compounds", url: "https://openstax.org/books/chemistry-2e/pages/2-6-ionic-and-molecular-compounds", note: "typical ion charges by group; transition metals with several charges" },
      { title: "Wikipedia: Ionization energies of the elements (data page)", url: "https://en.wikipedia.org/wiki/Ionization_energies_of_the_elements_(data_page)", note: "first and successive ionisation energies (Na, Mg, Al cliffs; Rb 403 kJ/mol)" },
      { title: "Wikipedia: Electronegativity", url: "https://en.wikipedia.org/wiki/Electronegativity", note: "Pauling scale values" },
    ],
    steps,
  });
})();
