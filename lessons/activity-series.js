// Lesson 1.3: The activity series: which metal wins
(function () {
  const { h, s, widget, stat, slider, toggle, hbars, rng } = Course;
  const YEL = "#ffd166", GRN = "#5fd38d", RED = "#ff6b6b", BLUE = "#6cb4ff", MUTED = "#9aa3b5";
  const P = (html) => h("p", { html });
  const takeaway = (html) => h("div", { class: "takeaway", html });
  const formula = (html) => h("div", { class: "formula", html });
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const gcd = (a, b) => (b ? gcd(b, a % b) : a), lcm = (a, b) => (a * b) / gcd(a, b);

  // ---- lesson-specific styles
  document.head.append(h("style", { html: `
    .as-legend { display:flex; flex-wrap:wrap; gap:6px 14px; font-size:13px; color:var(--muted); margin:8px 0 2px; justify-content:center; }
    .as-dot { display:inline-block; width:10px; height:10px; border-radius:50%; margin-right:5px; vertical-align:-1px; }
    .as-status { min-height:44px; margin:8px 0 0; font-size:15px; }
    .as-eq { font-family:var(--mono); font-size:15px; }
    table.as-grid { border-collapse:collapse; margin:6px auto; }
    table.as-grid th, table.as-grid td { text-align:center; padding:3px 3px; font-size:13px; }
    table.as-grid th.as-rl { text-align:right; padding-right:8px; white-space:nowrap; }
    button.as-cell { min-width:36px; padding:4px 0; font-size:14px; }
    .as-corner { font-size:11px !important; font-weight:400; color:var(--muted); line-height:1.2; }
    @media (max-width:600px) { button.as-cell { min-width:31px; } table.as-grid th, table.as-grid td { padding:3px 2px; } table.as-grid th.as-rl { padding-right:5px; } }
    button.as-cell.yes { border-color:var(--green); color:var(--green); background:rgba(95,211,141,.12); }
    button.as-cell.no { color:var(--muted); background:transparent; }
    .as-diag { color:var(--muted); }
    .as-order { display:flex; flex-direction:column; gap:4px; max-width:300px; margin:8px auto; }
    .as-order .as-row { display:flex; align-items:center; gap:8px; background:var(--panel2); border-radius:8px; padding:3px 8px; }
    .as-order .as-row .nm { flex:1; font-weight:600; }
    .as-order .as-row .pos { color:var(--muted); font-size:12px; width:54px; }
    .as-order button { padding:2px 9px; }
    .as-two { display:flex; flex-wrap:wrap; gap:14px; align-items:flex-start; justify-content:center; }
    .as-two > * { flex:1 1 250px; min-width:0; }
  ` }));

  // ---- chemistry data (order and "who wins" come from Chem.E0, so the course agrees with itself)
  const MET = {
    Li: { name: "lithium", col: "#cfd4dc" }, K: { name: "potassium", col: "#c9ced6" }, Ca: { name: "calcium", col: "#d0d2d0" },
    Na: { name: "sodium", col: "#d3d7de" }, Mg: { name: "magnesium", col: "#c2c8cf" }, Al: { name: "aluminium", col: "#b9c0c9" },
    Zn: { name: "zinc", col: "#93a1b0" }, Fe: { name: "iron", col: "#7b838e" }, Ni: { name: "nickel", col: "#a9aa9c" },
    Sn: { name: "tin", col: "#b5b8ba" }, Pb: { name: "lead", col: "#6f7682" }, H: { name: "hydrogen", col: "#aab4c4" },
    Cu: { name: "copper", col: "#c8773a" }, Ag: { name: "silver", col: "#e3e6ec" }, Au: { name: "gold", col: "#e2b53a" },
  };
  const TINT = { Cu: [59, 143, 217, 0.5], Fe: [140, 200, 150, 0.25], Ni: [70, 190, 120, 0.4], Au: [230, 200, 60, 0.35] }; // colour of the ion in water
  const E = (id) => Chem.E0by[id].E;
  const nOf = (id) => (id === "H" ? 1 : Chem.E0by[id].n);           // electrons per atom / per ion
  const ionRaw = (id) => id + "^" + (nOf(id) > 1 ? nOf(id) : "") + "+";
  const ion = (id) => Chem.f(ionRaw(id));
  const SERIES = Object.keys(MET).sort((a, b) => E(a) - E(b));      // Li, K, Ca, Na, Mg, Al, Zn, Fe, Ni, Sn, Pb, H, Cu, Ag, Au
  const METALS = SERIES.filter((id) => id !== "H");
  const reacts = (strip, ionId) => E(strip) < E(ionId);             // the metal higher in the series gives its electrons
  const k = (c) => (c === 1 ? "" : c);
  function eqn(a, b) {                                               // balanced net ionic equation: strip a, ion of b
    const na = nOf(a);
    if (b === "H") { const L = lcm(na, 2); return Chem.f(`${k(L / na)}${a} + ${k(L)}H^+ -> ${k(L / na)}${ionRaw(a)} + ${k(L / 2)}H2`); }
    const nb = nOf(b), L = lcm(na, nb);
    return Chem.f(`${k(L / na)}${a} + ${k(L / nb)}${ionRaw(b)} -> ${k(L / na)}${ionRaw(a)} + ${k(L / nb)}${b}`);
  }

  function T(x, y, txt, o = {}) {
    const t = s("text", { x, y, "text-anchor": o.anchor || "middle", style: `font-size:${o.size || 12}px;fill:${o.fill || MUTED};font-weight:${o.weight || 400}` });
    t.textContent = txt; return t;
  }
  const legend = (items) => h("div", { class: "as-legend" }, ...items.map(([col, txt]) => h("span", {}, h("span", { class: "as-dot", style: `background:${col}` }), txt)));

  // ---- the beaker: a metal strip dipped in a solution of ions. Electrons really hop, ions really move.
  function dipScene() {
    const W = 300, H = 226;
    const svg = s("svg", { viewBox: `0 0 ${W} ${H}`, width: "100%", style: "max-width:380px;display:block;margin:0 auto" });
    const liquid = s("rect", { x: 61, y: 78, width: 178, height: 123, rx: 5 });
    const glass = s("path", { d: "M58 50 V198 Q58 204 64 204 H236 Q242 204 242 198 V50", fill: "none", stroke: "#5a6578", "stroke-width": 2.5 });
    const sTop = s("rect", { x: 137, y: 8, width: 26, height: 72, rx: 2 });
    const sLow = s("rect", { x: 137, y: 79, width: 26, height: 103, rx: 2 });
    const depG = s("g"), partG = s("g");
    const sLab = T(150, 30, "", { size: 12, fill: "#0b1220", weight: 700 });
    const cap = T(150, 220, "", { size: 11 });
    svg.append(liquid, sLow, sTop, depG, partG, glass, sLab, cap);
    let timer = null, parts = [], c = null, st = null, r = rng(11);
    const place = (p) => p.g.setAttribute("transform", `translate(${p.x.toFixed(1)},${p.y.toFixed(1)})`);
    function add(kind, label, x, y) {
      const g = s("g"); let rad = 9;
      if (kind === "e") { rad = 3; g.append(s("circle", { r: 3, fill: YEL })); }
      else if (kind === "an") { rad = 5; g.append(s("circle", { r: 5, fill: "#4f8fd6", opacity: 0.75 })); }
      else if (kind === "bub") { rad = 9; g.append(s("circle", { r: 9, fill: "rgba(255,255,255,.14)", stroke: "#cfd8e6" }), T(0, 3, "H₂", { size: 8, fill: "#e6e9ef" })); }
      else { rad = label.length > 2 ? 10 : 7.5; g.append(s("circle", { r: rad, fill: RED }), T(0, 3, label, { size: 8, fill: "#2a0b0b", weight: 700 })); }
      const p = { g, kind, x, y, vx: r() - 0.5, vy: r() - 0.5, mode: "free", rad };
      place(p); partG.append(g); parts.push(p); return p;
    }
    const freeSpot = (rad) => { const sd = r() < 0.5 ? -1 : 1; return [150 + sd * (22 + rad + r() * (56 - 2 * rad)), 92 + r() * 96]; };
    function paint() {
      const fi = st.left / c.count, fp = c.expect ? st.dissolved / c.expect : 0;
      const ti = c.plain ? null : TINT[c.ionId], tp = c.plain ? null : TINT[c.strip];
      let R = 120 * 0.1, G = 160 * 0.1, B = 200 * 0.1, A = 0.1;
      [[ti, fi], [tp, fp]].forEach(([t, f]) => { if (t) { R += t[0] * t[3] * f; G += t[1] * t[3] * f; B += t[2] * t[3] * f; A += t[3] * f; } });
      liquid.setAttribute("fill", `rgba(${Math.round(R / A)},${Math.round(G / A)},${Math.round(B / A)},${A.toFixed(3)})`);
      const w = 26 - 8 * fp; sLow.setAttribute("x", 150 - w / 2); sLow.setAttribute("width", w);
      if (c.onUpdate) c.onUpdate(st, c);
    }
    function set(strip, ionId, o = {}) {
      stop(); partG.innerHTML = ""; depG.innerHTML = ""; parts = []; r = rng(o.seed || 11);
      const m = nOf(ionId), n = nOf(strip), unit = ionId === "H" ? lcm(n, 2) : lcm(n, m) / m, min = o.count || 8;
      const count = Math.ceil(min / unit) * unit;
      c = { strip, ionId, m, n, count, expect: (count * m) / n, goes: reacts(strip, ionId), speed: o.speed || 1, plain: !!o.plain, onUpdate: o.onUpdate,
        lab: { strip: (o.labels && o.labels.strip) || strip, ion: (o.labels && o.labels.ion) || ion(ionId), prod: (o.labels && o.labels.prod) || ion(strip) } };
      c.period = Math.max(3, Math.round(13 / c.speed)); c.idle = Math.round(50 / c.speed);
      st = { left: count, queued: 0, deposited: 0, dissolved: 0, bubbles: 0, owed: 0, hw: 0, t: 0, tail: 0, done: false, running: false };
      const col = c.plain ? "#8d97a6" : MET[strip].col;
      sTop.setAttribute("fill", col); sLow.setAttribute("fill", col);
      sLab.textContent = c.lab.strip; cap.textContent = o.caption || "";
      const spots = [];
      for (let i = 0; i < count; i++) {
        let best = null, bd = -1;
        for (let t = 0; t < 14; t++) { const q = freeSpot(10), d = Math.min(1e3, ...spots.map((u) => Math.hypot(u[0] - q[0], u[1] - q[1]))); if (d > bd) { bd = d; best = q; } }
        spots.push(best); add("cat", c.lab.ion, best[0], best[1]);
      }
      for (let i = 0; i < 5; i++) { const [x, y] = freeSpot(5); add("an", "", x, y); }
      paint();
    }
    function convert(p) {
      const side = p.x < 150 ? -1 : 1;
      if (c.ionId === "H") { st.hw++; if (st.hw >= 2) { st.hw -= 2; const b = add("bub", "", p.x + side * 4, p.y); b.mode = "rise"; } }
      else {
        depG.append(s("rect", { x: side < 0 ? 131 : 163, y: p.y - 8, width: 6, height: 16, rx: 2, fill: c.plain ? "#39404b" : MET[c.ionId].col, stroke: "rgba(0,0,0,.35)", "stroke-width": 0.6 }));
        st.deposited++;
      }
      p.mode = "dead"; st.left--; st.owed += c.m;
      while (st.owed >= c.n) {
        st.owed -= c.n; st.dissolved++;
        const sd = r() < 0.5 ? -1 : 1, q = add("cat", c.lab.prod, 150 + sd * 26, 96 + r() * 74);
        q.vx = sd * 0.9 * c.speed;
      }
      paint();
    }
    function tick() {
      st.t++; const sp = c.speed, vm = 0.9 * sp;
      for (const p of parts.slice()) {
        if (p.mode === "free") {
          p.vx = clamp(p.vx + (r() - 0.5) * 0.25, -vm, vm); p.vy = clamp(p.vy + (r() - 0.5) * 0.25, -vm, vm);
          p.x += p.vx; p.y += p.vy;
          if (p.x < 64 + p.rad) { p.x = 64 + p.rad; p.vx = Math.abs(p.vx); }
          if (p.x > 236 - p.rad) { p.x = 236 - p.rad; p.vx = -Math.abs(p.vx); }
          if (p.y < 82 + p.rad) { p.y = 82 + p.rad; p.vy = Math.abs(p.vy); }
          if (p.y > 198 - p.rad) { p.y = 198 - p.rad; p.vy = -Math.abs(p.vy); }
          if (p.y < 184 + p.rad && Math.abs(p.x - 150) < 14 + p.rad) { const sd = p.x < 150 ? -1 : 1; p.x = 150 + sd * (14 + p.rad); p.vx = sd * Math.abs(p.vx); }
        } else if (p.mode === "go") {
          const dx = p.tx - p.x, dy = p.ty - p.y, d = Math.hypot(dx, dy), v = 2.4 * sp;
          if (d <= v) {
            p.x = p.tx; p.y = p.ty; p.mode = "wait"; p.w = Math.max(3, Math.round(10 / sp));
            for (let i = 0; i < c.m; i++) { const e = add("e", "", 150, p.ty + (i - (c.m - 1) / 2) * 7); e.mode = "e"; e.life = p.w; e.vx = (p.x - 150) / p.w; }
          } else { p.x += (dx / d) * v; p.y += (dy / d) * v; }
        } else if (p.mode === "e") { p.x += p.vx; if (--p.life <= 0) p.mode = "dead"; }
        else if (p.mode === "wait") { if (--p.w <= 0) convert(p); }
        else if (p.mode === "rise") { p.y -= 1.6 * sp; p.x += r() - 0.5; if (p.y < 76) { p.mode = "dead"; st.bubbles++; paint(); } }
        place(p);
      }
      parts = parts.filter((p) => { if (p.mode === "dead") { p.g.remove(); return false; } return true; });
      if (c.goes && st.queued < c.count && st.t % c.period === 0) {
        const cand = parts.filter((p) => p.kind === "cat" && p.mode === "free" && !p.prod && p.isIon);
        if (cand.length) {
          cand.sort((a, b) => Math.abs(a.x - 150) - Math.abs(b.x - 150));
          const p = cand[0], sd = p.x < 150 ? -1 : 1;
          p.mode = "go"; p.tx = 150 + sd * (13 + p.rad); p.ty = clamp(p.y, 92, 172); st.queued++;
        }
      }
      const busy = parts.some((p) => p.mode !== "free");
      if (!c.goes) { if (st.t > c.idle) st.done = true; }
      else if (st.left === 0 && !busy && ++st.tail > 18) st.done = true;
      if (st.done) { st.running = false; timer = null; if (c.onUpdate) c.onUpdate(st, c); } else timer = setTimeout(tick, 33);
    }
    function run() {
      if (!c || st.running || st.done) return;
      parts.forEach((p) => { if (p.kind === "cat" && p.isIon === undefined) p.isIon = true; });
      st.running = true; timer = setTimeout(tick, 33);
    }
    function stop() { if (timer) clearTimeout(timer); timer = null; if (st) st.running = false; }
    return { el: svg, set, run, start: (a, b, o) => { set(a, b, o); run(); }, stop, state: () => st };
  }

  // ---- the ladder: metals from most to least willing to give electrons
  function ladder(ids, o = {}) {
    const W = o.W || 320, rh = 22, top = 36, H = top + ids.length * rh + 6;
    const svg = s("svg", { viewBox: `0 0 ${W} ${H}`, width: "100%", style: `max-width:${W + 60}px;display:block;margin:0 auto` });
    svg.append(T(8, 12, "↑ gives electrons more easily", { anchor: "start", size: 11 }), T(145, 30, "metal atom", { size: 10 }), T(268, 30, "its ion", { size: 10 }));
    const y = (id) => top + ids.indexOf(id) * rh + rh / 2;
    ids.forEach((id) => {
      const g = s("g", { opacity: o.dim && o.dim.has(id) ? 0.4 : 1 }), yy = y(id);
      const hiS = o.strip === id, hiI = o.ion === id;
      g.append(T(8, yy + 4, MET[id].name, { anchor: "start", size: 12, fill: id === "H" ? BLUE : "#e6e9ef" }));
      g.append(s("rect", { x: 118, y: yy - 9, width: 54, height: 18, rx: 4, fill: MET[id].col, stroke: hiS ? YEL : "none", "stroke-width": 2.5 }));
      g.append(T(145, yy + 4, id === "H" ? "H₂" : id, { size: 12, fill: "#0b1220", weight: 700 }));
      g.append(s("rect", { x: 240, y: yy - 9, width: 56, height: 18, rx: 9, fill: "rgba(255,107,107,.12)", stroke: hiI ? YEL : RED, "stroke-width": hiI ? 2.5 : 1 }));
      g.append(T(268, yy + 4, ion(id), { size: 12, fill: RED, weight: 600 }));
      if (o.note) g.append(T(W - 6, yy + 4, o.note(id) || "", { anchor: "end", size: 11, fill: o.noteFill ? o.noteFill(id) : MUTED }));
      svg.append(g);
    });
    if (o.strip && o.ion && o.strip !== o.ion) {
      const goes = reacts(o.strip, o.ion), col = goes ? GRN : RED, x1 = 175, y1 = y(o.strip), x2 = 237, y2 = y(o.ion);
      const a = Math.atan2(y2 - y1, x2 - x1), hx = x2 - 9 * Math.cos(a), hy = y2 - 9 * Math.sin(a);
      svg.append(s("line", { x1, y1, x2: hx, y2: hy, stroke: col, "stroke-width": 2.5, "stroke-dasharray": goes ? "none" : "5 4" }));
      svg.append(s("path", { d: `M${x2} ${y2} L${hx - 5 * Math.sin(a)} ${hy + 5 * Math.cos(a)} L${hx + 5 * Math.sin(a)} ${hy - 5 * Math.cos(a)} Z`, fill: col }));
      const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
      svg.append(s("circle", { cx: mx, cy: my, r: 9, fill: "#1a1f29", stroke: col }), T(mx, my + 4, goes ? "e⁻" : "✗", { size: 11, fill: goes ? YEL : RED, weight: 700 }));
    }
    return svg;
  }

  // ---- a grid of dips: rows = strips, columns = solutions
  function labGrid({ ids, name = (id) => id, ionName = (id) => ion(id), onDip }) {
    const res = ids.map(() => ids.map(() => null)), cells = ids.map(() => []);
    const tbl = h("table", { class: "as-grid" });
    tbl.append(h("tr", {}, h("th", { class: "as-rl as-corner", html: "ion →<br>strip ↓" }), ...ids.map((id) => h("th", {}, ionName(id)))));
    function mark(i, j) { const b = cells[i][j]; b.textContent = res[i][j] ? "✓" : "✗"; b.className = "as-cell " + (res[i][j] ? "yes" : "no"); }
    function dip(i, j, animate) { res[i][j] = reacts(ids[i], ids[j]); mark(i, j); if (onDip) onDip(i, j, animate); }
    ids.forEach((a, i) => {
      const tr = h("tr", {}, h("th", { class: "as-rl" }, name(a)));
      ids.forEach((b, j) => {
        if (i === j) { tr.append(h("td", { class: "as-diag" }, "–")); return; }
        const bt = h("button", { class: "as-cell", title: `dip ${name(a)} into ${ionName(b)}`, onclick: () => dip(i, j, true) }, "?");
        cells[i][j] = bt; tr.append(h("td", {}, bt));
      });
      tbl.append(tr);
    });
    const count = () => res.flat().filter((v) => v !== null).length;
    const wins = (i) => res[i].filter((v) => v === true).length;
    return { el: h("div", { class: "tablewrap" }, tbl), res, count, wins, total: ids.length * (ids.length - 1),
      runAll() { ids.forEach((_, i) => ids.forEach((_, j) => { if (i !== j && res[i][j] === null) dip(i, j, false); })); },
      reset() { ids.forEach((_, i) => ids.forEach((_, j) => { if (i !== j) { res[i][j] = null; cells[i][j].textContent = "?"; cells[i][j].className = "as-cell"; } })); } };
  }

  const steps = [];

  // ---------------------------------------------------------------- 1
  steps.push({
    title: "Zinc in copper sulfate, and the other way round",
    short: "Zinc wins, copper loses",
    newConcepts: ["displacement"],
    render(el) {
      el.append(
        P(`In <em>Oxidation and reduction</em> you dipped a zinc strip into blue copper sulfate solution. Each zinc atom handed two electrons to a ${Chem.f("Cu^2+")} ion: zinc was <em>oxidised</em> (lost electrons), copper was <em>reduced</em> (gained them), and sulfate just watched as a <em>spectator ion</em>.`),
        formula(`${Chem.f("Zn + Cu^2+ -> Zn^2+ + Cu")}`),
        P("That lesson told you <i>what</i> happens. This one asks a different question: <b>does it also work the other way round?</b> If zinc can push copper out of solution, can copper push zinc out? Try both."));
      const scene = dipScene();
      let strip = "Zn", sol = "Cu";
      const status = h("div", { class: "as-status note" });
      const sDep = stat("atoms coated on the strip", "g"), sDis = stat("strip atoms dissolved", "r");
      const onUpdate = (st, c) => {
        sDep.set(String(st.deposited)); sDis.set(String(st.dissolved));
        if (!st.running && !st.done) status.innerHTML = "Ready. Press <b>Dip the strip</b>.";
        else if (strip === sol) status.innerHTML = `Nothing to swap: the ions in the solution are the same metal as the strip.`;
        else if (!c.goes) status.innerHTML = st.done ? `<b style="color:var(--red)">Nothing happens.</b> The ${ion(sol)} ions bump into the ${MET[strip].name} and leave again. You could wait a year.` : "Watching…";
        else status.innerHTML = st.done ? `<b style="color:var(--green)">Done.</b> Every ${ion(sol)} ion took 2 electrons and became a ${MET[sol].name} atom on the strip. The same number of ${MET[strip].name} atoms left as ${ion(strip)}. The blue colour is gone.`
          : `Electrons (yellow) hop from the strip onto ${ion(sol)} ions. ${MET[sol].name[0].toUpperCase() + MET[sol].name.slice(1)} metal coats the strip; ${ion(strip)} ions drift away.`;
      };
      const prep = () => { scene.set(strip, sol, { count: 10, onUpdate, caption: `${Chem.f(sol + "SO4")} solution` }); sDep.setLabel(`${MET[sol].name} atoms coated on the strip`); sDis.setLabel(`${MET[strip].name} atoms dissolved`); };
      el.append(widget("Pick a strip and a solution, then dip",
        toggle("strip:", [["Zn", "zinc"], ["Cu", "copper"]], strip, (v) => { strip = v; prep(); }),
        toggle("solution:", [["Cu", `copper sulfate, ${Chem.f("CuSO4")}`], ["Zn", `zinc sulfate, ${Chem.f("ZnSO4")}`]], sol, (v) => { sol = v; prep(); }),
        h("div", { class: "btns" }, h("button", { class: "primary", onclick: () => { prep(); scene.run(); } }, "Dip the strip")),
        scene.el,
        legend([[RED, "metal ion (cation)"], ["#4f8fd6", `${Chem.f("SO4^2-")} (spectator)`], [YEL, "electron"]]),
        status, h("div", { class: "readout" }, sDep, sDis)));
      prep();
      el.append(
        P(`Zinc in copper sulfate reacts. Copper in zinc sulfate does nothing at all. When one metal goes into solution as ions and pushes another metal's ions out as solid metal, chemists call it a <b>displacement reaction</b>: zinc <i>displaces</i> copper. Copper cannot displace zinc.`),
        takeaway("A displacement reaction: a metal dissolves as ions and forces another metal's ions to become metal. Between zinc and copper it only runs one way."));
      return () => scene.stop();
    },
    check: {
      type: "choice",
      q: `While the zinc strip sits in ${Chem.f("CuSO4")} solution, the blue colour slowly fades. Why?`,
      options: [
        `The blue ${Chem.f("Cu^2+")} ions are turning into copper metal, and colourless ${Chem.f("Zn^2+")} ions replace them`,
        `The ${Chem.f("SO4^2-")} ions are being used up`,
        "Zinc atoms float off the strip and make the water grey",
      ],
      answer: 0,
      wrongHints: { 1: "Sulfate is a spectator: count the blue dots in the widget before and after. Nothing happens to them.", 2: "Zinc does not leave as atoms. Each one leaves two electrons behind and goes as an ion." },
      why: `Displacement swaps which metal is the ion: ${Chem.f("Cu^2+")} (blue) leaves the solution as metal, ${Chem.f("Zn^2+")} (colourless) takes its place.`,
    },
  });

  // ---------------------------------------------------------------- 2
  steps.push({
    title: "Downhill only: spontaneous reactions",
    short: "Downhill only",
    newConcepts: ["spontaneous"],
    render(el) {
      el.append(
        P("Why one way and not the other? Put a thermometer in the beaker while zinc displaces copper: <b>it warms up.</b> The reaction gives off energy, about 219 kJ of heat for every <em>mole</em> of zinc that dissolves. The electrons end up somewhere they are held more tightly, and the difference comes out as heat."),
        P("Picture a ball on a hill. On the high side: zinc metal and copper ions. On the low side: zinc ions and copper metal. The ball rolls down by itself. It never rolls up by itself."));
      const PAIRS = [
        { a: "Zn", kJ: 219, left: "Zn + Cu^2+", right: "Zn^2+ + Cu", txt: "zinc + copper ions" },
        { a: "Cu", kJ: 146, left: "Cu + 2Ag^+", right: "Cu^2+ + 2Ag", txt: "copper + silver ions" },
        { a: "Mg", kJ: 532, left: "Mg + Cu^2+", right: "Mg^2+ + Cu", txt: "magnesium + copper ions" },
      ];
      let pair = PAIRS[0], timer = null, pos = 0;
      const W = 340, H = 204, yTop = 52;
      const svg = s("svg", { viewBox: `0 0 ${W} ${H}`, width: "100%", style: "max-width:460px;display:block;margin:0 auto" });
      const ground = s("path", { fill: "#212734", stroke: "#5a6578", "stroke-width": 1.5 });
      const lvl = s("line", { x1: 212, x2: 330, y1: yTop, y2: yTop, stroke: "#5a6578", "stroke-dasharray": "4 4" });
      const tL = T(70, 0, "", { size: 12, fill: "#e6e9ef", weight: 600 }), tR = T(270, 0, "", { size: 12, fill: "#e6e9ef", weight: 600 });
      const tDrop = T(271, yTop + 16, "", { size: 11, fill: YEL });
      const ball = s("circle", { r: 9, fill: GRN, stroke: "#0b1220" });
      const push = T(0, 0, "⚡ energy in", { size: 11, fill: YEL, weight: 700 });
      svg.append(ground, lvl, tL, tR, tDrop, push, ball);
      const drop = () => 30 + (pair.kJ / 532) * 96;
      const yAt = (x) => { const u = clamp((x - 130) / 80, 0, 1); return yTop + drop() * u * u * (3 - 2 * u); };
      const sHeat = stat("heat released", "y"), status = h("div", { class: "as-status note" });
      function setBall(t) { pos = t; const x = 70 + t * 200; ball.setAttribute("cx", x); ball.setAttribute("cy", yAt(x) - 10); }
      function draw() {
        let d = `M10 ${H - 2} L10 ${yTop}`;
        for (let x = 10; x <= 330; x += 5) d += ` L${x} ${yAt(x).toFixed(1)}`;
        ground.setAttribute("d", d + ` L330 ${H - 2} Z`);
        const yb = yTop + drop();
        tL.setAttribute("y", yTop + 20); tL.textContent = Chem.f(pair.left);
        tR.setAttribute("y", Math.min(yb + 20, H - 8)); tR.textContent = Chem.f(pair.right);
        tDrop.textContent = `↓ ${pair.kJ} kJ per mole of ${pair.a}`;
        push.setAttribute("opacity", 0); sHeat.setLabel(`heat released (kJ per mole of ${pair.a})`);
      }
      const stop = () => { if (timer) clearTimeout(timer); timer = null; };
      function anim(from, to, n, each, done) {
        stop(); let i = 0;
        const tick = () => { i++; const u = i / n, e = u * u * (3 - 2 * u); each(from + (to - from) * e, u); if (i < n) timer = setTimeout(tick, 22); else { timer = null; done && done(); } };
        tick();
      }
      const reset = (t, msg) => { stop(); draw(); setBall(t); sHeat.set("0"); status.innerHTML = msg; };
      const forward = () => { reset(0, "Rolling…"); anim(0, 1, 45, (t) => { setBall(t); sHeat.set(String(Math.round(pair.kJ * t))); }, () => { status.innerHTML = `<b style="color:var(--green)">Goes by itself.</b> ${Chem.f(pair.left + " -> " + pair.right)}, and ${pair.kJ} kJ per mole of ${pair.a} warms the beaker.`; }); };
      const reverse = () => { reset(1, "Waiting…"); anim(0, 1, 40, (_, u) => { const x = 270 + 5 * Math.sin(u * 18) * (1 - u); ball.setAttribute("cx", x); }, () => { status.innerHTML = `<b style="color:var(--red)">Nothing happens.</b> ${Chem.f(pair.right)} is already at the bottom. No amount of waiting makes it climb.`; }); };
      const force = () => {
        reset(1, "Pumping energy in from outside…"); push.setAttribute("opacity", 1);
        anim(1, 0, 50, (t) => { setBall(t); push.setAttribute("x", 70 + t * 200); push.setAttribute("y", yAt(70 + t * 200) - 26); sHeat.set(String(-Math.round(pair.kJ * (1 - t)))); }, () => {
          push.setAttribute("opacity", 0); status.innerHTML = "Up it goes, but only because energy was fed in (the heat readout went negative). Now let go…";
          timer = setTimeout(() => anim(0, 1, 45, (t) => { setBall(t); sHeat.set(String(Math.round(-pair.kJ * (1 - t)))); }, () => { status.innerHTML = "…and it rolls straight back. The reverse reaction is possible only while something outside pays for it. Doing that on purpose is <em>Electrolysis</em>, later in the course."; }), 500);
        });
      };
      el.append(widget("The energy hill (heights drawn to scale between the three reactions)",
        toggle("reaction:", PAIRS.map((p, i) => [i, p.txt]), 0, (i) => { pair = PAIRS[i]; reset(0, "Pick a start."); }),
        svg,
        h("div", { class: "btns" },
          h("button", { class: "primary", onclick: forward }, "Start at the top"),
          h("button", { onclick: reverse }, "Start at the bottom (the reverse)"),
          h("button", { onclick: force }, "Force it uphill")),
        status, h("div", { class: "readout" }, sHeat)));
      reset(0, "Pick a start.");
      el.append(
        P("A change that goes by itself, with no energy supplied from outside, is called <b>spontaneous</b>. Zinc displacing copper is spontaneous. The reverse is <b>non-spontaneous</b>: not slow, not shy, simply uphill."),
        P(`Two honest footnotes. Heat is a good stand-in for the height of the hill here, but the exact quantity that decides direction is a close relative of it, introduced in <em>Charge, energy and capacity</em>. And "spontaneous" says nothing about speed: some downhill reactions take seconds, some take years.`),
        takeaway("Spontaneous = goes by itself, downhill in energy. The reverse of a spontaneous reaction is non-spontaneous: it needs energy pushed in from outside."));
      return stop;
    },
    check: {
      type: "choice",
      q: "You drop a copper coin into zinc sulfate solution and leave it for a year. What do you find?",
      options: ["The same copper coin in the same solution", "A thin coat of zinc on the coin: the reaction is slow, but a year is long", "About half the zinc ions have plated out: the two directions meet in the middle"],
      answer: 0,
      wrongHints: { 1: "Slow would still mean downhill. This direction is uphill: waiting does not supply energy.", 2: "For this pair the hill is steep. The downhill direction runs essentially to the end; the uphill one does not start." },
      why: "Copper + zinc ions is the bottom of the hill. Nothing rolls up by itself, however long you wait.",
      backTo: 0,
    },
  });

  // ---------------------------------------------------------------- 3
  steps.push({
    title: "A third metal turns two results into a ranking",
    short: "From duels to a ranking",
    newConcepts: ["series"],
    render(el) {
      el.append(
        P("So zinc beats copper. Is copper simply a loser? Bring in a third metal, silver, and run every duel: each strip into each solution. (We use nitrate salts now, because silver nitrate dissolves well. Nitrate is a <em>spectator</em>, just as sulfate was.)"),
        P("Click a <b>?</b> to dip that strip (row) into that solution (column). A ✓ means the strip displaced the metal in the solution."));
      const ids = ["Zn", "Cu", "Ag"], scene = dipScene();
      const status = h("div", { class: "as-status note" }, "Six dips to run.");
      const bars = hbars(ids.map((id) => `${MET[id].name}`), { max: 2, fmtv: (v) => v + (v === 1 ? " win" : " wins"), series: [GRN], labelWidth: 70 });
      const rank = h("div", { class: "as-status", style: "text-align:center" });
      const grid = labGrid({ ids, name: (id) => id, onDip(i, j, animate) {
        const a = ids[i], b = ids[j], goes = reacts(a, b);
        if (animate) scene.start(a, b, { count: 8, speed: 1.6, caption: `${a} strip in ${ion(b)} solution` });
        status.innerHTML = goes ? `<b style="color:var(--green)">${a} displaces ${b}:</b> <span class="as-eq">${eqn(a, b)}</span>` : `<b style="color:var(--red)">${a} in ${ion(b)}: nothing happens.</b>`;
        upd();
      } });
      function upd() {
        bars.update(ids.map((_, i) => grid.wins(i)));
        rank.innerHTML = grid.count() === grid.total ? `Every duel has a winner, and the winners line up: <b>zinc &gt; copper &gt; silver</b>` : `<span class="note">${grid.count()} of ${grid.total} dips done</span>`;
      }
      scene.set("Cu", "Ag", { count: 8, caption: "Cu strip in Ag⁺ solution" });
      el.append(widget("Three metals, six duels",
        grid.el,
        h("div", { class: "btns" }, h("button", { onclick: () => { grid.runAll(); status.textContent = "All six dips done."; } }, "Run the rest"), h("button", { onclick: () => { grid.reset(); scene.stop(); upd(); status.textContent = "Six dips to run."; } }, "Reset")),
        scene.el, status,
        h("div", { class: "note", style: "margin-top:10px" }, "Duels won so far (other metals displaced):"), bars, rank));
      upd();
      el.append(
        P(`Copper loses to zinc but <b>beats silver</b>: ${Chem.f("Cu + 2Ag^+ -> Cu^2+ + 2Ag")} (two silver ions are needed, since each takes only one of copper's two electrons). Winning is not a property of one metal. It is a comparison between two.`),
        P("And the comparisons never contradict each other. Zinc beats copper, copper beats silver, and zinc also beats silver. So the metals can be put in a single line, from the one that gives up electrons most readily to the one that clings to them hardest. That line is the <b>activity series</b> (also called the reactivity series)."),
        takeaway("The activity series ranks metals by how readily they give electrons. A metal displaces every metal that sits below it."));
      return () => scene.stop();
    },
    check: {
      type: "choice",
      q: `Two experiments: iron displaces copper from ${Chem.f("Cu^2+")} solution, and zinc displaces iron from ${Chem.f("Fe^2+")} solution. Without a third experiment: what does a copper strip do in ${Chem.f("Zn^2+")} solution?`,
      options: ["Nothing: zinc is above iron, iron is above copper, so copper is below zinc", "Copper dissolves and zinc plates out", "It cannot be known without running that dip"],
      answer: 0,
      wrongHints: { 1: "That would put copper above zinc. But zinc beats iron, and iron beats copper.", 2: "That is the whole use of a ranking: two results fix the order of all three." },
      why: "The order is zinc, iron, copper. A metal cannot displace one that sits above it.",
    },
  });

  // ---------------------------------------------------------------- 4
  steps.push({
    title: "Reading the series: electrons fall down the ladder",
    short: "Electrons fall down",
    newConcepts: [],
    render(el) {
      el.append(
        P("Chemists ran thousands of such duels. Here is the line for fourteen metals. Read it as a ladder. Each rung has two forms of the same metal: the neutral <b>atom</b> (left) and its <b>ion</b> (right, with the <em>typical ion charge</em> you met in <em>The periodic table</em>)."),
        P("One rule covers every duel: <b>electrons fall from a metal atom to an ion on a lower rung, never upward.</b> Pick any strip and any solution:"));
      const STRIPS = ["Mg", "Al", "Zn", "Fe", "Ni", "Sn", "Pb", "Cu", "Ag", "Au"];
      let strip = "Zn", sol = "Cu";
      const holder = h("div"), out = h("div", { class: "as-status" });
      function upd() {
        holder.innerHTML = ""; holder.append(ladder(METALS, { strip, ion: sol }));
        if (strip === sol) { out.innerHTML = `<span class="note">Same rung: nothing to swap.</span>`; return; }
        const goes = reacts(strip, sol);
        out.innerHTML = goes
          ? `<b style="color:var(--green)">Spontaneous.</b> <span class="as-eq">${eqn(strip, sol)}</span><br><span class="note">${strip} is oxidised (it is the reducing agent); ${ion(sol)} is reduced (it is the oxidising agent). Electrons moved: ${lcm(nOf(strip), nOf(sol))} per equation as written.</span>`
          : `<b style="color:var(--red)">No reaction.</b> <span class="note">${MET[sol].name[0].toUpperCase() + MET[sol].name.slice(1)} sits above ${MET[strip].name}: the electrons would have to climb. (The reverse pair, ${sol} strip in ${ion(strip)}, is the one that goes.)</span>`;
      }
      el.append(widget("The activity series (order taken from the course's table of measured values)",
        toggle("strip:", STRIPS.map((id) => [id, id]), strip, (v) => { strip = v; upd(); }),
        toggle("ions in solution:", STRIPS.map((id) => [id, ion(id)]), sol, (v) => { sol = v; upd(); }),
        holder, out));
      upd();
      el.append(
        P("In the words of <em>Oxidation and reduction</em>: the atoms near the top are the strongest <em>reducing agents</em> (they give electrons to almost anything). The ions near the bottom are the strongest <em>oxidising agents</em> (they take electrons from almost anything)."),
        P(`When the charges differ, count electrons. Aluminium gives 3, a ${Chem.f("Cu^2+")} ion takes 2, so the smallest match is 6 electrons: ${Chem.f("2Al + 3Cu^2+ -> 2Al^3+ + 3Cu")}.`),
        P("The top four (lithium, potassium, calcium, sodium) cannot be tested by dipping: they are so eager that they react violently with the water itself. Their places come from other measurements, which <em>Electrode potentials</em> will explain."),
        takeaway("Metal atom above, ion below: the reaction goes. Metal atom below, ion above: nothing happens. Top = strongest reducing agents; bottom ions = strongest oxidising agents."));
    },
    check: {
      type: "number",
      q: `An aluminium strip (each atom gives 3 electrons) sits in a solution of ${Chem.f("Ag^+")} ions (each takes 1). How many silver atoms are deposited for every aluminium atom that dissolves?`,
      answer: 3, tolerance: 0,
      hint: "Aluminium is above silver, so it goes. Every electron given must be taken by someone.",
      why: `3. ${Chem.f("Al + 3Ag^+ -> Al^3+ + 3Ag")}: three electrons out, three electrons in.`,
    },
  });

  // ---------------------------------------------------------------- 5
  steps.push({
    title: "Hydrogen gets a rung: metals in acid",
    short: "Metals in acid",
    newConcepts: ["acid", "hEvo"],
    render(el) {
      el.append(
        P(`One non-metal belongs on the ladder. A hydrogen atom that loses its only electron is a bare ${Chem.f("H^+")} ion, a cation like the others. Water that is full of ${Chem.f("H^+")} ions is called an <b>acid</b>. Hydrochloric acid, for example, is HCl dissolved in water, where it splits into ${Chem.f("H^+")} and ${Chem.f("Cl^-")} (<em>dissociation</em>, from <em>Ions, salts and electrolytes</em>).`),
        P(`Like ${Chem.f("Cu^2+")}, an ${Chem.f("H^+")} ion can take an electron back. Two of them then pair up into a molecule of hydrogen gas, ${Chem.f("H2")}, which bubbles away:`),
        formula(`${Chem.f("2H^+ + 2e- -> H2")}`),
        P("So acid is just one more solution to dip metals into. Which metals can push hydrogen out?"));
      const scene = dipScene(), list = ["Mg", "Zn", "Fe", "Cu", "Ag"], SPEED = { Mg: 1.7, Zn: 1.1, Fe: 0.75, Cu: 1, Ag: 1 };
      let m = "Zn";
      const LAD = SERIES.filter((id) => !["Li", "K", "Ca", "Na"].includes(id));
      const holder = h("div"), status = h("div", { class: "as-status note" });
      const sB = stat("H₂ molecules released", "g"), sI = stat("metal ions dissolved", "r");
      const onUpdate = (st, c) => {
        sB.set(String(st.bubbles)); sI.set(String(st.dissolved));
        if (!st.running && !st.done) status.innerHTML = "Press <b>Drop it in</b>.";
        else if (c.goes) status.innerHTML = `<b style="color:var(--green)">${MET[m].name[0].toUpperCase() + MET[m].name.slice(1)} is above hydrogen: it dissolves and gas bubbles off.</b> <span class="as-eq">${eqn(m, "H")}</span>`;
        else status.innerHTML = st.done ? `<b style="color:var(--red)">${MET[m].name[0].toUpperCase() + MET[m].name.slice(1)} is below hydrogen: nothing happens.</b> ${Chem.f("H^+")} cannot pull electrons off it.` : "Watching…";
      };
      const prep = () => { scene.set(m, "H", { count: 8, speed: SPEED[m], onUpdate, caption: "hydrochloric acid (H⁺ and Cl⁻ in water)" }); sI.setLabel(`${ion(m)} ions dissolved`); holder.innerHTML = ""; holder.append(ladder(LAD, { strip: m, ion: "H" })); };
      el.append(widget("Drop a metal into hydrochloric acid",
        toggle("metal:", list.map((id) => [id, MET[id].name]), m, (v) => { m = v; prep(); }),
        h("div", { class: "btns" }, h("button", { class: "primary", onclick: () => { prep(); scene.run(); } }, "Drop it in")),
        h("div", { class: "as-two" }, h("div", {}, scene.el, legend([[RED, "cation"], ["#4f8fd6", `${Chem.f("Cl^-")} (spectator)`], [YEL, "electron"]])), holder),
        status, h("div", { class: "readout" }, sB, sI)));
      prep();
      el.append(
        P(`Hydrogen's rung sits between lead and copper. <b>Every metal above it dissolves in acid and releases ${Chem.f("H2")}</b>; chemists call the bubbling <b>hydrogen evolution</b>. Metals below hydrogen (copper, silver, gold) just sit there. This is the same rule as before: electrons fall from the metal atom to an ion on a lower rung, and here that ion is ${Chem.f("H^+")}.`),
        P("The bubbling speed in the picture is a cartoon. Magnesium really does fizz faster than zinc, and zinc faster than iron, but the series only promises <i>whether</i> a metal reacts, not how fast. Lead sits so close above hydrogen that in practice it barely reacts."),
        takeaway(`An acid is a solution rich in ${Chem.f("H^+")}. Metals above hydrogen in the series dissolve in it and release ${Chem.f("H2")} gas; metals below hydrogen do not.`));
      return () => scene.stop();
    },
    check: {
      type: "number",
      q: `Magnesium dissolves in acid: ${Chem.f("Mg + 2H^+ -> Mg^2+ + H2")}. If 0.2 mol of magnesium dissolves completely, how many mol of ${Chem.f("H^+")} ions are used up?`,
      answer: 0.4, tolerance: 0.001,
      hint: `Each magnesium atom gives 2 electrons; each ${Chem.f("H^+")} takes 1.`,
      why: `0.4 mol. Two ${Chem.f("H^+")} per Mg, and 0.2 mol of ${Chem.f("H2")} gas comes off.`,
      backTo: 3,
    },
  });

  // ---------------------------------------------------------------- 6
  steps.push({
    title: "The bottom of the ladder: noble metals",
    short: "Noble metals",
    newConcepts: ["noble"],
    render(el) {
      el.append(
        P("Look at the rungs below hydrogen. Those metals hold their electrons so firmly that ordinary acids, water and air struggle to take them. The ones at the very bottom, <b>silver, gold</b> and platinum (which sits between those two), stay shiny for centuries. They are called <b>noble metals</b>. Copper is a borderline case: below hydrogen, but it slowly tarnishes."),
        P("Because they resist giving electrons, noble metals can lie around in the ground as plain metal: gold nuggets, native silver, native copper. Metals higher up are almost always found as ions locked in compounds (ores). To get the metal, someone has to <b>push the electrons back on</b>, and the higher the rung, the harder that is. Slide through history:"));
      const ERAS = [
        { lab: "5000 BCE", ids: ["Au", "Cu"], txt: "Stone Age: only metals found as metal. Gold and copper nuggets, hammered into shape." },
        { lab: "2000 BCE", ids: ["Ag", "Pb", "Sn"], txt: "Bronze Age: a charcoal fire is enough to win copper, lead, tin and silver from their ores." },
        { lab: "1000 BCE", ids: ["Fe"], txt: "Iron Age: iron needs a much hotter furnace and more charcoal." },
        { lab: "1760", ids: ["Zn", "Ni"], txt: "Zinc (India, around the 13th century; Europe 1746) and nickel (1751): hard to win even with good furnaces." },
        { lab: "1830", ids: ["K", "Na", "Ca", "Mg", "Li", "Al"], txt: "No fire can do it. These had to wait for electric current, or for potassium made with it (1807 to 1825)." },
      ];
      const WHEN = { Au: "native", Cu: "native / ancient", Ag: "ancient", Pb: "ancient", Sn: "ancient", Fe: "c. 1200 BCE", Zn: "c. 1300", Ni: "1751", K: "1807", Na: "1807", Ca: "1808", Mg: "1808", Li: "1821", Al: "1825" };
      const holder = h("div"), info = h("div", { class: "as-status note" }), sN = stat("metals humans can make", "g"), sTop = stat("highest rung reached", "y");
      function upd(i) {
        const known = new Set(ERAS.slice(0, i + 1).flatMap((e) => e.ids));
        const dim = new Set(METALS.filter((id) => !known.has(id)));
        holder.innerHTML = "";
        holder.append(ladder(METALS, { W: 400, dim, note: (id) => WHEN[id], noteFill: (id) => (ERAS[i].ids.includes(id) ? YEL : MUTED) }));
        info.textContent = ERAS[i].txt; sN.set(known.size + " of 14");
        sTop.set(MET[METALS.find((id) => known.has(id))].name);
      }
      el.append(widget("When each metal was first won as a metal (dates approximate; ancient ones are uncertain)",
        slider({ name: "by year", min: 0, max: 4, step: 1, value: 0, fmtv: (i) => ERAS[Math.round(i)].lab, oninput: (v) => upd(Math.round(v)) }),
        holder, info, h("div", { class: "readout" }, sN, sTop)));
      upd(0);
      el.append(
        P("History climbed the ladder from the bottom. The order is rough (lead and tin came early because their ores give up the metal at low temperature), but the trend is clear, and the top rungs were unreachable until electricity arrived. That story is <em>Electrolysis</em>."),
        P(`One caution about "does not dissolve in acid". Hydrochloric acid offers only ${Chem.f("H^+")} as an electron taker. Nitric acid dissolves copper and silver anyway, because its nitrate ion is a stronger oxidising agent than ${Chem.f("H^+")}. Different taker, different rung.`),
        takeaway("Noble metals sit at the bottom of the series: they resist oxidation, survive acids and occur in nature as metal. The higher a metal sits, the harder it is to win from its compounds."));
    },
    check: {
      type: "choice",
      q: "Prospectors find a new metal as shiny nuggets lying in a riverbed, untouched after thousands of years in water and air. Where does it most likely sit in the activity series?",
      options: ["Near the bottom, below hydrogen", "Near the top, with sodium and potassium", "Nowhere in particular: where a metal is found says nothing about the series"],
      answer: 0,
      wrongHints: { 1: "A metal near the top gives its electrons to water and air within seconds. It would never survive as a nugget.", 2: "Surviving as plain metal means nothing around managed to take its electrons. That is exactly what the series ranks." },
      why: "Only a metal that holds its electrons against water, air and natural acids can stay metallic: a noble metal, low in the series.",
    },
  });

  // ---------------------------------------------------------------- 7
  steps.push({
    title: "Why this order? Ionisation energy is not the whole story",
    short: "Why this order?",
    newConcepts: ["budget", "hydration"],
    render(el) {
      const IE = { Li: Chem.elements.Li.ie1, Na: Chem.elements.Na.ie1, K: Chem.elements.K.ie1 };
      const ATOM = { Li: 159, Na: 107, K: 89 }, HYD = { Li: 520, Na: 406, K: 322 }, RAD = { Li: 76, Na: 102, K: 138 };
      el.append(
        P(`You already own a number for "how easily does an atom give an electron": <em>ionisation energy</em> (from <em>The periodic table</em>), the cost of pulling one electron off a lone atom. Lower cost should mean higher on the ladder. Test that on three <em>alkali metals</em>: lithium ${IE.Li}, sodium ${IE.Na}, potassium ${IE.K} kJ/mol. That predicts potassium on top and <b>lithium last</b>. The real series has lithium <b>first</b>.`),
        P("The guess fails because ionisation energy describes a lone atom in empty space. In a beaker, turning metal into dissolved ions takes three moves, and each has a price:"),
        h("ol", {},
          h("li", { html: "<b>Leave the metal.</b> Tear one atom out of the solid piece. Costs energy." }),
          h("li", { html: "<b>Lose the electron.</b> The ionisation energy. Costs energy." }),
          h("li", { html: "<b>Get wrapped in water.</b> Water molecules crowd around the new ion and cling to it. This <i>releases</i> energy." })),
        P("The oxygen end of a water molecule is slightly negative (oxygen has the higher <em>electronegativity</em>), so it is drawn to a cation. This wrapping is called <b>hydration</b>. The smaller the ion, the closer the water gets and the more energy comes back."));
      let mode = 0, sel = "Li", timer = null;
      const ids = ["Li", "Na", "K"];
      const cost = (id) => (mode === 0 ? IE[id] : mode === 1 ? IE[id] + ATOM[id] : IE[id] + ATOM[id] - HYD[id]);
      const bars = hbars(ids.map((id) => MET[id].name), { max: 700, fmtv: (v) => Math.round(v) + " kJ", series: [BLUE], labelWidth: 78 });
      const verdict = h("div", { class: "as-status" });
      const W = 250, H = 180, svg = s("svg", { viewBox: `0 0 ${W} ${H}`, width: "100%", style: "max-width:300px;display:block;margin:0 auto" });
      const sH = stat("energy released by hydration", "g"), sR = stat("ion radius", "");
      function drawIon(d) {
        svg.innerHTML = "";
        const R = RAD[sel] * 0.3, cx = W / 2, cy = H / 2;
        for (let i = 0; i < 6; i++) {
          const a = (i * Math.PI) / 3 + 0.3, dist = R + 12 + d, ox = cx + dist * Math.cos(a), oy = cy + dist * Math.sin(a);
          [-0.6, 0.6].forEach((da) => svg.append(s("circle", { cx: ox + 13 * Math.cos(a + da), cy: oy + 13 * Math.sin(a + da), r: 6, fill: "#dfe6f0", stroke: "#0b1220", "stroke-width": 0.6 })));
          svg.append(s("circle", { cx: ox, cy: oy, r: 11, fill: "#7f93b3", stroke: "#0b1220", "stroke-width": 0.6 }), T(ox, oy + 4, "−", { size: 11, fill: "#0b1220", weight: 700 }));
        }
        svg.append(s("circle", { cx, cy, r: R, fill: RED }), T(cx, cy + 4, ion(sel), { size: 11, fill: "#2a0b0b", weight: 700 }));
      }
      function approach() {
        if (timer) clearTimeout(timer); let i = 0; const n = 22;
        const tick = () => { i++; const u = i / n; drawIon(36 * (1 - u) * (1 - u)); sH.set(Math.round(HYD[sel] * u * (2 - u)) + " kJ/mol"); timer = i < n ? setTimeout(tick, 25) : null; };
        sR.set(RAD[sel] + " pm"); tick();
      }
      function upd() {
        const v = ids.map(cost); bars.update(v);
        const order = ids.slice().sort((a, b) => cost(a) - cost(b)).map((id) => MET[id].name);
        const ok = order[0] === "lithium";
        verdict.innerHTML = `Cheapest first by this count: <b>${order.join(" → ")}</b>. ` + (ok ? `<span style="color:var(--green)">That is the real order in the series.</span>` : `<span style="color:var(--red)">The real series says lithium → potassium → sodium.</span>`);
      }
      el.append(widget("The energy bill for metal → dissolved ion (kJ per mole; lower = gives electrons more readily)",
        toggle("count:", [[0, "ionisation only"], [1, "+ leaving the metal"], [2, "+ hydration"]], 0, (v) => { mode = v; upd(); }),
        bars, verdict,
        h("div", { class: "note", style: "margin-top:12px" }, "Why hydration differs: the same charge on a smaller ball pulls water in closer (ions drawn to scale)."),
        toggle("ion:", ids.map((id) => [id, ion(id)]), sel, (v) => { sel = v; approach(); }),
        svg, legend([[RED, "cation"], ["#7f93b3", "water: oxygen end (slightly −)"], ["#dfe6f0", "water: hydrogen ends"]]),
        h("div", { class: "readout" }, sR, sH)));
      upd(); approach();
      el.append(
        P(`With all three moves counted, lithium's bill is the smallest: its tiny ${Chem.f("Li^+")} ion gets back ${HYD.Li} kJ/mol from hydration, against ${HYD.K} for the much larger ${Chem.f("K^+")}. Lithium tops the series <i>in water</i> because water rewards its ion so well. (The electron's destination adds the same amount to all three bills, so it does not change the order. The values are rounded heats; a full treatment also counts how much disorder changes, which is small here.)`),
        P("The same budget explains zinc and copper. Their ionisation and hydration terms are similar, but copper atoms are bound far more tightly inside the metal (about 338 against 130 kJ/mol to pull one out), so copper is the reluctant giver."),
        takeaway("The series ranks the whole trip from solid metal to hydrated ion: leave the metal, lose electrons, get wrapped in water. Ionisation energy is only the middle term; hydration puts lithium on top."));
      return () => { if (timer) clearTimeout(timer); };
    },
    check: {
      type: "choice",
      q: "Lithium has a higher ionisation energy than sodium, yet lithium sits above sodium in the activity series. What makes up the difference?",
      options: [`The small ${Chem.f("Li^+")} ion releases much more energy when water molecules wrap around it`, "Lithium atoms are lighter, so they leave the metal faster", "Lithium has fewer electron shells, so its outer electron is easier to remove"],
      answer: 0,
      wrongHints: { 1: "The series is about energy, not speed or mass. Look at which term in the bill is biggest for lithium.", 2: "Fewer shells make the electron harder to remove: that is why lithium's ionisation energy is the highest of the three." },
      why: `Hydration. ${Chem.f("Li^+")} is the smallest of the three ions, water gets closest to it, and the energy released (about 520 kJ/mol) more than pays for its higher ionisation energy.`,
    },
  });

  // ---------------------------------------------------------------- 8
  steps.push({
    title: "Predict before you dip",
    short: "Predict, then dip",
    newConcepts: [],
    render(el) {
      el.append(
        P("Time to use the ladder as a prediction machine. Below, a strip and a solution are drawn at random, including acid. Decide first: <b>does it react?</b> Then watch the beaker answer."),
        P("One question settles every case: is the strip's metal <b>above</b> the ion in the solution? Above: electrons fall, the reaction is spontaneous. Below: nothing."));
      const STR = ["Mg", "Zn", "Fe", "Pb", "Cu", "Ag", "Au"], SOL = ["Mg", "Zn", "Fe", "H", "Cu", "Ag"];
      const LAD = SERIES.filter((id) => !["Li", "K", "Ca", "Na", "Al", "Ni", "Sn"].includes(id));
      const r = rng(2026), scene = dipScene();
      let a, b, asked = 0, right = 0, answered = true;
      const q = h("div", { class: "as-status", style: "font-size:16px" }), fb = h("div", { class: "as-status note" }), holder = h("div");
      const sScore = stat("correct predictions", "g");
      function next() {
        do { a = r.pick(STR); b = r.pick(SOL); } while (a === b || (a === "Pb" && b === "H"));
        answered = false; fb.textContent = "";
        q.innerHTML = `A strip of <b>${MET[a].name}</b> goes into ${b === "H" ? "<b>hydrochloric acid</b>" : `a solution of <b>${ion(b)}</b> ions`}.`;
        scene.set(a, b, { count: 8, speed: 1.5, seed: 3 + asked, caption: `${a} strip in ${b === "H" ? "acid (H⁺)" : ion(b) + " solution"}` });
        holder.innerHTML = ""; holder.append(ladder(LAD, {}));
      }
      function answer(guess) {
        if (answered) return; answered = true; asked++;
        const goes = reacts(a, b), ok = guess === goes; if (ok) right++;
        sScore.set(`${right} of ${asked}`);
        fb.innerHTML = `${ok ? `<b style="color:var(--green)">Right.</b>` : `<b style="color:var(--red)">Not this time.</b>`} ` +
          (goes ? `${MET[a].name[0].toUpperCase() + MET[a].name.slice(1)} is above ${MET[b].name}: <span class="as-eq">${eqn(a, b)}</span>` : `${MET[a].name[0].toUpperCase() + MET[a].name.slice(1)} is below ${MET[b].name}: no reaction.`);
        holder.innerHTML = ""; holder.append(ladder(LAD, { strip: a, ion: b }));
        scene.run();
      }
      el.append(widget("Prediction game",
        q,
        h("div", { class: "btns" },
          h("button", { class: "primary", onclick: () => answer(true) }, "It reacts"),
          h("button", { class: "primary", onclick: () => answer(false) }, "Nothing happens"),
          h("button", { onclick: next }, "Next pair")),
        fb,
        h("div", { class: "as-two" }, h("div", {}, scene.el), holder),
        h("div", { class: "readout" }, sScore)));
      sScore.set("0 of 0"); next();
      el.append(
        P("Keep going until you stop needing the ladder. Notice what the series does <i>not</i> tell you: speed. Aluminium is high on the ladder, yet a thin, tight skin of aluminium oxide on its surface keeps most solutions from reaching the metal, so it often sits there unharmed. That protection is picked up again in <em>Corrosion</em>."),
        takeaway("To predict any metal-in-solution reaction, compare two rungs: a metal atom reacts with any ion (including H⁺) that sits below it, and with none that sits above it."));
      return () => scene.stop();
    },
    check: {
      type: "choice",
      q: "You need to store a solution for months in a metal container. Which combination is safe?",
      options: ["Zinc sulfate solution in a copper pot", "Copper sulfate solution in an iron bucket", "Hydrochloric acid in a zinc can"],
      answer: 0,
      wrongHints: { 1: `Iron is above copper: the bucket dissolves as ${Chem.f("Fe^2+")} while copper plates out. Eventually it leaks.`, 2: `Zinc is above hydrogen: the can dissolves and ${Chem.f("H2")} bubbles off.` },
      why: `Copper is below zinc, so ${Chem.f("Zn^2+")} cannot take its electrons. The other two containers are above the ion they hold, and get eaten.`,
      backTo: 3,
    },
  });

  // ---------------------------------------------------------------- 9
  steps.push({
    title: "Capstone: six unknown metals, thirty dips, one series",
    short: "Capstone: mystery lab",
    newConcepts: [],
    render(el) {
      el.append(
        P("Your lab has six metal strips labelled A to F and six bottles, each a nitrate solution of one of those metals. The labels with the real names fell off. <b>Rebuild the activity series from experiments alone.</b>"),
        P("Click a <b>?</b> to dip a strip (row) into a solution (column). ✓ means a coating formed: the strip displaced the dissolved metal. Then put the letters in order, most active on top, and check. You do not need all thirty dips if you reason like step 3."));
      const REAL = ["Mg", "Zn", "Fe", "Pb", "Cu", "Ag"], LET = ["A", "B", "C", "D", "E", "F"];
      const scene = dipScene();
      let seed = 5, ids, letter, grid, order;
      const gridBox = h("div"), status = h("div", { class: "as-status note" }), orderBox = h("div", { class: "as-order" }), verdict = h("div", { class: "as-status" }), reveal = h("div");
      const sDips = stat("dips run", "b"), sYes = stat("reactions seen", "g");
      function setup() {
        const r = rng(seed); ids = REAL.slice();
        for (let i = ids.length - 1; i > 0; i--) { const j = r.int(i + 1); [ids[i], ids[j]] = [ids[j], ids[i]]; }
        if (ids.every((id, i) => id === REAL[i])) ids.reverse();
        letter = Object.fromEntries(ids.map((id, i) => [id, LET[i]]));
        grid = labGrid({ ids, name: (id) => letter[id], ionName: (id) => letter[id] + "ⁿ⁺", onDip(i, j, animate) {
          const a = ids[i], b = ids[j], goes = reacts(a, b);
          if (animate) scene.start(a, b, { count: 6, speed: 2, plain: true, labels: { strip: letter[a], ion: letter[b] + "ⁿ⁺", prod: letter[a] + "ⁿ⁺" }, caption: `strip ${letter[a]} in solution of ${letter[b]}` });
          status.innerHTML = goes ? `<b style="color:var(--green)">Strip ${letter[a]} gets a dark coating in solution ${letter[b]}:</b> ${letter[a]} displaces ${letter[b]}, so ${letter[a]} is above ${letter[b]}.` : `<b style="color:var(--red)">Strip ${letter[a]} in solution ${letter[b]}: nothing.</b> ${letter[a]} is not above ${letter[b]}.`;
          stats();
        } });
        gridBox.innerHTML = ""; gridBox.append(grid.el);
        order = LET.slice(); verdict.innerHTML = ""; reveal.innerHTML = ""; status.textContent = "Thirty possible dips. Start anywhere.";
        scene.set(ids[0], ids[1], { count: 6, plain: true, labels: { strip: "A", ion: "Bⁿ⁺", prod: "Aⁿ⁺" }, caption: "strip A in solution of B" });
        drawOrder(); stats();
      }
      function stats() { sDips.set(`${grid.count()} of 30`); sYes.set(String(grid.res.flat().filter((v) => v === true).length)); }
      function drawOrder(marks) {
        orderBox.innerHTML = "";
        order.forEach((L, i) => {
          const mv = (d) => () => { const j = i + d; if (j < 0 || j >= order.length) return; [order[i], order[j]] = [order[j], order[i]]; verdict.innerHTML = ""; drawOrder(); };
          orderBox.append(h("div", { class: "as-row", style: marks ? `outline:1.5px solid ${marks[i] ? GRN : RED}` : "" },
            h("span", { class: "pos" }, i === 0 ? "most" : i === order.length - 1 ? "least" : ""), h("span", { class: "nm" }, "metal " + L),
            h("button", { title: "move up", onclick: mv(-1) }, "▲"), h("button", { title: "move down", onclick: mv(1) }, "▼")));
        });
      }
      function check() {
        const truth = ids.slice().sort((a, b) => E(a) - E(b)).map((id) => letter[id]);
        const marks = order.map((L, i) => L === truth[i]), n = marks.filter(Boolean).length;
        drawOrder(marks);
        if (n < 6) { verdict.innerHTML = `<b style="color:var(--red)">${n} of 6 in the right place.</b> <span class="note">Tip: count the ✓ in each row. The strip that displaces the most others is on top.</span>`; reveal.innerHTML = ""; return; }
        verdict.innerHTML = `<b style="color:var(--green)">Series reconstructed</b> after ${grid.count()} dips. The labels, restored:`;
        reveal.innerHTML = "";
        reveal.append(h("p", { class: "note", style: "text-align:center", html: truth.map((L) => `${L} = <b style="color:var(--text)">${MET[ids[LET.indexOf(L)]].name}</b>`).join(" &gt; ") }), ladder(REAL, {}));
      }
      el.append(widget("The mystery lab",
        gridBox,
        h("div", { class: "btns" },
          h("button", { onclick: () => { grid.runAll(); status.textContent = "All thirty dips recorded."; } }, "Run all remaining dips"),
          h("button", { onclick: () => { scene.stop(); seed++; setup(); } }, "New mystery set")),
        scene.el, legend([[RED, "metal ion"], ["#4f8fd6", `${Chem.f("NO3^-")} (spectator)`], [YEL, "electron"]]),
        status, h("div", { class: "readout" }, sDips, sYes),
        h("div", { class: "note", style: "margin-top:14px;text-align:center" }, "Your series (use the arrows):"),
        orderBox,
        h("div", { class: "btns", style: "justify-content:center" }, h("button", { class: "primary", onclick: check }, "Check my series")),
        verdict, reveal));
      setup();
      el.append(
        P("What you just used, each from an earlier step:"),
        h("ul", {},
          h("li", { html: "A coating means a <b>displacement reaction</b> ran (step 1), and it only ever runs in the <b>spontaneous</b> direction (step 2): if A coats in B's solution, B never coats in A's." }),
          h("li", { html: "The results never contradict each other, so they collapse into one line: the <b>activity series</b> (steps 3 and 4). Five well-chosen dips between neighbours are enough to confirm an order." }),
          h("li", { html: "Add a bottle of acid and you could also place hydrogen (step 5): two of these six would not bubble. Those are the ones nearest the <b>noble</b> end (step 6)." }),
          h("li", { html: "The order itself comes from the full energy bill of metal → hydrated ion (step 7)." })),
        P("So far the electrons jump straight from strip to ion and their energy is wasted as heat. The next lesson, <em>The galvanic cell</em>, pulls the two metals apart and makes those electrons travel through a wire instead. And <em>Electrode potentials</em> will replace the rungs with numbers, in volts."),
        takeaway("From yes/no dips alone you can rank metals by how readily they give electrons. That ranking, the activity series, predicts every displacement reaction, and it is the skeleton of every battery in this course."));
      return () => scene.stop();
    },
  });

  Course.run({
    id: "activity-series",
    section: "1. Redox: electrons change hands",
    title: "The activity series: which metal wins",
    concepts: {
      displacement: "displacement reaction", spontaneous: "spontaneous reaction", series: "activity series",
      acid: "acid (H⁺ in water)", hEvo: "metals vs acid (H₂ evolution)", noble: "noble metal",
      budget: "energy bill: metal → dissolved ion", hydration: "hydration of an ion",
    },
    sources: [
      { title: "Wikipedia: Reactivity series", url: "https://en.wikipedia.org/wiki/Reactivity_series", note: "the series, reactions with water and acids, and the lithium anomaly" },
      { title: "Wikipedia: Single displacement reaction", url: "https://en.wikipedia.org/wiki/Single_displacement_reaction", note: "metal-in-salt-solution displacement" },
      { title: "OpenStax Chemistry 2e, 17.3 Electrode and Cell Potentials", url: "https://openstax.org/books/chemistry-2e/pages/17-3-electrode-and-cell-potentials", note: "the measured values behind the order used here (the course table in assets/chem.js)" },
      { title: "Wikipedia: Noble metal", url: "https://en.wikipedia.org/wiki/Noble_metal", note: "which metals count as noble, and copper as a borderline case" },
      { title: "Wikipedia: Timeline of chemical element discoveries", url: "https://en.wikipedia.org/wiki/Timeline_of_chemical_element_discoveries", note: "approximate dates of first isolation used in step 6" },
      { title: "Wikipedia: Standard enthalpy of formation (data table)", url: "https://en.wikipedia.org/wiki/Standard_enthalpy_change_of_formation_(data_table)", note: "aqueous-ion enthalpies behind the 219, 146 and 532 kJ/mol heats in step 2" },
      { title: "Atkins & de Paula, Physical Chemistry (data section)", url: "", note: "enthalpies of atomisation (Li 159, Na 107, K 89, Zn 130, Cu 338 kJ/mol) and ion hydration (Li⁺ 520, Na⁺ 406, K⁺ 322 kJ/mol), rounded" },
      { title: "Wikipedia: Hydration energy", url: "https://en.wikipedia.org/wiki/Hydration_energy", note: "why small ions release more energy on hydration" },
    ],
    steps,
  });
})();
