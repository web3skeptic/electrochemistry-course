// Lesson 3.3 — Nickel: NiCd and NiMH
(function () {
  const { h, s, fmt, widget, stat, slider, plot, toggle, hbars, rng, narrow } = Course;
  const f = Chem.f;
  const YEL = "#ffd166", RED = "#ff6b6b", BLUE = "#6cb4ff", GRN = "#5fd38d", PUR = "#c3a6ff", MUTED = "#9aa3b5", TEXT = "#e6e9ef", DARK = "#12151c";
  const P = (html) => h("p", { html });
  const takeaway = (html) => h("div", { class: "takeaway", html });
  const formula = (html) => h("div", { class: "formula", style: "font-family:inherit", html });
  const note = (html) => h("p", { class: "note", style: "margin:8px 0 0", html });

  // ---- numbers (potentials and masses from Chem; the two marked values are not in the course table) ----
  const EL = Chem.elements;
  const E_NI = Chem.E0by.NiOOH.E;          // +0.49 V  NiO(OH) + H2O + e- -> Ni(OH)2 + OH-
  const E_CD = Chem.E0by["Cd(OH)2"].E;     // -0.81 V
  const E_H = Chem.E0by["H2O/H2"].E;       // -0.83 V
  const E_O2 = Chem.E0by["O2/OH"].E;       // +0.40 V
  const E_FE = -0.88;                      // Fe(OH)2 + 2e- -> Fe + 2OH-, textbook value (about -0.88 to -0.89 V), not in Chem.E0
  const M_NIOH2 = EL.Ni.mass + 2 * (EL.O.mass + EL.H.mass);   // 92.7 g/mol
  const CAP_NI = Chem.capacity(1, M_NIOH2);                    // 289 mAh/g
  const CAP_CD = Chem.capacity(2, EL.Cd.mass);                 // 477 mAh/g
  const M_LA = 138.905;                                        // lanthanum, g/mol (not in Chem.elements)
  const M_LANI5 = M_LA + 5 * EL.Ni.mass;                       // 432.4 g/mol
  const CAP_LANI5H6 = Chem.capacity(6, M_LANI5);               // 372 mAh/g
  const V_GAS = (Chem.R * Chem.T0) / 1e5 * 1000;               // litres per mole of gas at 25 °C, 1 bar (24.8)
  const AA_AH = 2.0;                                           // the running example: an AA cell that stores 2.0 Ah
  const v2 = (x) => (x < 0 ? "−" : "+") + Math.abs(x).toFixed(2);

  // typical curve shapes at light load (simplified sketches of data-sheet curves; x = fraction of capacity used)
  const vNi = (x) => 1.25 - 0.08 * x + 0.12 * Math.exp(-x / 0.05) - 0.25 * Math.exp((x - 1) / 0.035);
  const vAlk = (x) => 1.6 - 0.62 * x - 0.25 * Math.exp((x - 1) / 0.04);

  const style = h("style", {}, `
    .nb-legend { display:flex; flex-wrap:wrap; gap:4px 14px; margin-top:8px; font-size:13px; color:var(--muted); }
    .nb-legend i { display:inline-block; width:11px; height:11px; border-radius:3px; margin-right:5px; vertical-align:-1px; border:1px solid #7d8798; }
    .nb-legend i.dot { border-radius:50%; border:none; }
    .nb-status { min-height:44px; margin-top:10px; padding:8px 12px; border-left:3px solid var(--blue); background:var(--panel2); border-radius:6px; font-size:15px; }
    .nb-eq { font-size:16px; line-height:1.7; margin:8px 0 0; }
    .nb-eq span.lab { color:var(--muted); font-size:13px; display:inline-block; min-width:74px; }
  `);
  style.id = "nb-style";
  if (!document.getElementById("nb-style")) document.head.append(style);

  // ---------- tiny SVG + animation helpers ----------
  const TK = narrow(1, 1.2);   // hand-made SVG text is drawn larger on phones, where the viewBox is scaled down
  function txt(g, x, y, str, a = {}) {
    const t = s("text", { x, y, "text-anchor": a.anchor || "middle", style: `font-size:${((a.size || 12) * (a.fix ? 1 : TK)).toFixed(1)}px;fill:${a.fill || TEXT};font-weight:${a.weight || 400}` });
    t.textContent = str; g.append(t); return t;
  }
  function dot(r, fill, label, opacity) {
    const g = s("g", { opacity: opacity == null ? 1 : opacity });
    g.append(s("circle", { r, fill, stroke: DARK, "stroke-width": 0.6 }));
    if (label) { const t = s("text", { "text-anchor": "middle", dy: "0.36em", style: `font-size:${Math.max(5.5, r * 0.82)}px;font-weight:700;fill:${DARK}` }); t.textContent = label; g.append(t); }
    return g;
  }
  const put = (node, x, y) => node.setAttribute("transform", `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
  function animator() {
    const timers = new Set(); let dead = false;
    const after = (ms, fn) => { if (dead) return; const id = setTimeout(() => { timers.delete(id); if (!dead) fn(); }, ms); timers.add(id); };
    function move(node, pts, ms, done) {
      const seg = []; let total = 0;
      for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(d); total += d; }
      const t0 = Date.now();
      const tick = () => {
        const k = Math.min(1, (Date.now() - t0) / ms); let d = k * total, i = 0;
        while (i < seg.length - 1 && d > seg[i]) { d -= seg[i]; i++; }
        const q = seg[i] ? Math.min(1, d / seg[i]) : 1;
        put(node, pts[i][0] + (pts[i + 1][0] - pts[i][0]) * q, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * q);
        if (k < 1) after(16, tick); else if (done) done();
      };
      tick();
    }
    const loop = (ms, fn) => { const t = () => { fn(); after(ms, t); }; after(ms, t); };
    return { after, move, loop, stop() { dead = true; timers.forEach(clearTimeout); timers.clear(); } };
  }

  // ---------- a small potential ladder (most negative E° on top, as in Electrode potentials) ----------
  // rungs: [{ name, E, col }], drop: [iTop, iBottom, label]
  function ladder(rungs, drop, o = {}) {
    const W = narrow(520, 380), H = o.height || 170, emin = o.min == null ? -1.0 : o.min, emax = o.max == null ? 0.65 : o.max;
    const svg = s("svg", { viewBox: `0 0 ${W} ${H}`, width: "100%", style: "display:block;margin:0 auto;max-width:620px" });
    const Y = (E) => 16 + ((E - emin) / (emax - emin)) * (H - 34);
    const xa = W * 0.5, xb = W * 0.68;
    svg.append(s("line", { x1: xa - 8, x2: xa - 8, y1: 8, y2: H - 8, stroke: "#3a4356", "stroke-width": 2 }));
    txt(svg, xa - 14, 12, narrow("more negative E°: gives electrons", "more negative E°"), { anchor: "end", size: 10.5, fill: MUTED });
    txt(svg, xa - 14, H - 4, narrow("more positive E°: takes electrons", "more positive E°"), { anchor: "end", size: 10.5, fill: MUTED });
    const order = rungs.map((r, i) => i).sort((a, b) => rungs[a].E - rungs[b].E);
    let last = 12;
    order.forEach((i) => { rungs[i]._y = Y(rungs[i].E); });
    order.filter((i) => rungs[i].dim).forEach((i) => svg.append(s("line", { x1: xa - 8, x2: xb, y1: rungs[i]._y, y2: rungs[i]._y, stroke: rungs[i].col || MUTED, "stroke-width": 1.5, "stroke-dasharray": "4 4" })));
    order.forEach((i) => {
      const r = rungs[i], y = r._y, ly = Math.max(y, last + 17); last = ly;
      if (!r.dim) svg.append(s("line", { x1: xa - 8, x2: xb, y1: y, y2: y, stroke: r.col || MUTED, "stroke-width": 3 }));
      if (Math.abs(ly - y) > 1) svg.append(s("line", { x1: xa - 12, x2: xa - 8, y1: ly + 2, y2: y, stroke: r.col || MUTED, "stroke-width": 1 }));
      txt(svg, 6, ly + 4, r.name, { anchor: "start", size: 12, fill: r.col || TEXT, weight: r.dim ? 400 : 600 });
      txt(svg, xb + 6, ly + 4, v2(r.E) + " V", { anchor: "start", size: 12, fill: r.col || TEXT });
    });
    if (drop) {
      const y1 = rungs[drop[0]]._y, y2 = rungs[drop[1]]._y, x = W * 0.87, up = y2 < y1;
      svg.append(s("line", { x1: x, x2: x, y1, y2: y2 + (up ? 7 : -7), stroke: YEL, "stroke-width": 2.5 }));
      svg.append(s("path", { d: up ? `M${x - 6} ${y2 + 9} L${x} ${y2} L${x + 6} ${y2 + 9} Z` : `M${x - 6} ${y2 - 9} L${x} ${y2} L${x + 6} ${y2 - 9} Z`, fill: YEL }));
      txt(svg, x + 9, (y1 + y2) / 2 - 3, "e⁻", { anchor: "start", size: 12, fill: YEL, weight: 700 });
      txt(svg, x + 9, (y1 + y2) / 2 + 12, drop[2], { anchor: "start", size: 12, fill: YEL, weight: 700 });
    }
    return svg;
  }

  // =====================================================================================
  // The sealed cell: negative electrode (left), nickel electrode (right), KOH between them.
  // Each tile of nickel compound holds one electron; one "unit" of reaction moves two.
  // =====================================================================================
  const NI_ON = "#06070a", NI_OFF = "#7fcf8a";
  const NEG = {
    Cd: { title: "NiCd", per: 2, on: "#aeb9c9", off: "#f4f6fa", onName: "Cd metal", offName: f("Cd(OH)2") + " (white solid)", water: 0, E: E_CD, cap: f("Cd <-> Cd(OH)2"),
      an: "Cd + 2OH^- -> Cd(OH)2 + 2e-", all: "Cd + 2NiO(OH) + 2H2O -> Cd(OH)2 + 2Ni(OH)2" },
    Fe: { title: "NiFe", per: 2, on: "#6f7885", off: "#bcd8c4", onName: "Fe metal", offName: f("Fe(OH)2"), water: 0, E: E_FE, cap: f("Fe <-> Fe(OH)2"),
      an: "Fe + 2OH^- -> Fe(OH)2 + 2e-", all: "Fe + 2NiO(OH) + 2H2O -> Fe(OH)2 + 2Ni(OH)2" },
    MH: { title: "NiMH", per: 1, on: "#77819a", off: "#77819a", hd: 1, onName: "alloy holding H (MH)", offName: "empty alloy (M)", water: 1, E: E_H, cap: "MH ⇌ M (alloy)",
      an: "MH + OH^- -> M + H2O + e-", all: "MH + NiO(OH) -> M + Ni(OH)2" },
    H2: { title: f("NiH2"), per: 2, on: "none", off: "none", hd: 2, onName: f("H2 gas under pressure"), offName: "used up", water: 1, E: E_H, cap: f("H2 gas <-> H2O"),
      an: "H2 + 2OH^- -> 2H2O + 2e-", all: "H2 + 2NiO(OH) -> 2Ni(OH)2" },
  };
  const CATH = "NiO(OH) + H2O + e- -> Ni(OH)2 + OH^-";

  function makeCell(negKey, o = {}) {
    const K = NEG[negKey], U = 6;
    const W = narrow(460, 380), H = 262, tw = 22, th = 19, ty0 = 94;
    const xn = narrow(66, 50), xp = W - xn - 2 * tw, yw = 30;
    const svg = s("svg", { viewBox: `0 0 ${W} ${H}`, width: "100%", style: "display:block;margin:0 auto;max-width:620px" });
    const layer = () => { const g = s("g"); svg.append(g); return g; };
    const gBk = layer(), gIon = layer(), gEl = layer(), gE = layer(), gTxt = layer();
    const A = animator(), rnd = rng(o.seed || 11);
    const cell = { svg, u: 0, oh: 8, water: 0, mode: "idle", busy: false, onChange: null, onEnd: null, kind: negKey };

    gBk.append(s("rect", { x: xn - 26, y: 78, width: W - 2 * (xn - 26), height: 150, rx: 10, fill: "#9fb4d6", "fill-opacity": 0.07, stroke: "#6b7689", "stroke-width": 2 }));
    gBk.append(s("line", { x1: W / 2, x2: W / 2, y1: 84, y2: 222, stroke: "#6b7689", "stroke-dasharray": "3 5", "stroke-width": 2 }));
    txt(gTxt, W / 2, 242, "separator, soaked in KOH solution", { size: 11, fill: MUTED });
    txt(gTxt, xn + tw, 256, K.cap, { size: 11.5, fill: MUTED });
    txt(gTxt, xp + tw, 256, f("NiO(OH) <-> Ni(OH)2"), { size: 11.5, fill: MUTED });
    // wire, terminals, device
    const wire = (d) => gBk.append(s("path", { d, fill: "none", stroke: "#8b95a8", "stroke-width": 2.5 }));
    wire(`M${xn + tw} ${ty0 - 2} V${yw} H${W / 2 - 27}`); wire(`M${xp + tw} ${ty0 - 2} V${yw} H${W / 2 + 27}`);
    txt(gTxt, xn + tw - 14, 66, "−", { size: 18, fill: BLUE, weight: 700 });
    txt(gTxt, xp + tw + 14, 66, "+", { size: 18, fill: RED, weight: 700 });
    const bulb = s("circle", { cx: W / 2, cy: yw, r: 12, fill: "#2a303d", stroke: "#8b95a8", "stroke-width": 2 });
    const charger = s("g", { style: "display:none" });
    charger.append(s("rect", { x: W / 2 - 27, y: yw - 12, width: 54, height: 24, rx: 5, fill: "#2a303d", stroke: PUR, "stroke-width": 2 }));
    txt(charger, W / 2, yw + 4, "charger", { size: 11, fill: PUR, weight: 600, fix: 1 });
    gEl.append(bulb, charger);
    const flow = txt(gTxt, W / 2, 62, "", { size: 12, fill: YEL, weight: 600 });

    // tiles
    const negTiles = [], posTiles = [];
    const nNeg = K.per === 2 ? 6 : 12;
    for (let i = 0; i < nNeg; i++) {
      const wide = K.per === 2, col = wide ? 0 : i % 2, row = wide ? i : Math.floor(i / 2);
      const x = xn + col * tw, y = ty0 + row * th, w = wide ? 2 * tw : tw;
      const g = s("g");
      const r = s("rect", { x: x + 1, y: y + 1, width: w - 2, height: th - 2, rx: 3, fill: K.on, stroke: "#7d8798", "stroke-width": 1, "stroke-dasharray": negKey === "H2" ? "3 3" : "" });
      g.append(r);
      const hs = [];
      if (K.hd) for (let k = 0; k < K.hd; k++) { const c = s("circle", { cx: x + w / 2 + (K.hd === 2 ? (k ? 5 : -5) : 0), cy: y + th / 2, r: K.hd === 2 ? 5 : 4.2, fill: GRN, stroke: DARK, "stroke-width": 0.6 }); g.append(c); hs.push(c); }
      gEl.append(g);
      negTiles.push({ set(charged) { r.setAttribute("fill", charged ? K.on : K.off); hs.forEach((c) => c.setAttribute("opacity", charged ? 1 : 0)); } });
    }
    for (let i = 0; i < 12; i++) {
      const x = xp + (1 - (i % 2)) * tw, y = ty0 + Math.floor(i / 2) * th;
      const r = s("rect", { x: x + 1, y: y + 1, width: tw - 2, height: th - 2, rx: 3, fill: NI_ON, stroke: "#7d8798", "stroke-width": 1 });
      gEl.append(r); posTiles.push({ set(charged) { r.setAttribute("fill", charged ? NI_ON : NI_OFF); } });
    }
    const setNeg = (eDone) => negTiles.forEach((t, i) => t.set(i >= eDone / K.per));
    const setPos = (eDone) => posTiles.forEach((t, i) => t.set(i >= eDone));

    // ions
    const bx0 = xn + 2 * tw + 12, bx1 = xp - 12, by0 = 90, by1 = 216;
    const free = [];
    function addIon(kind, x, y) {
      const g = kind === "OH" ? dot(8, BLUE, "OH⁻") : dot(6.5, RED, "K⁺", 0.5);
      const p = { kind, g, x: x == null ? bx0 + rnd() * (bx1 - bx0) : x, y: y == null ? by0 + rnd() * (by1 - by0) : y, vx: (rnd() - 0.5) * 1.2, vy: (rnd() - 0.5) * 1.2 };
      gIon.append(g); put(g, p.x, p.y); free.push(p); return p;
    }
    for (let i = 0; i < 8; i++) { addIon("K"); addIon("OH"); }
    A.loop(50, () => {
      for (const p of free) {
        p.vx += (rnd() - 0.5) * 0.5; p.vy += (rnd() - 0.5) * 0.5;
        p.vx = Math.max(-1.3, Math.min(1.3, p.vx)); p.vy = Math.max(-1.3, Math.min(1.3, p.vy));
        p.x += p.vx; p.y += p.vy;
        if (p.x < bx0) { p.x = bx0; p.vx = Math.abs(p.vx); } if (p.x > bx1) { p.x = bx1; p.vx = -Math.abs(p.vx); }
        if (p.y < by0) { p.y = by0; p.vy = Math.abs(p.vy); } if (p.y > by1) { p.y = by1; p.vy = -Math.abs(p.vy); }
        put(p.g, p.x, p.y);
      }
    });

    const changed = () => cell.onChange && cell.onChange(cell);
    function unit(dir) {
      cell.busy = true;
      const fromNeg = dir > 0;                       // discharge: the negative electrode uses OH⁻ and releases electrons
      const sx = fromNeg ? xn + 2 * tw + 2 : xp - 2, dx = fromNeg ? xp - 2 : xn + 2 * tw + 2;
      const rowY = (k) => ty0 + th * (Math.min(5, Math.max(0, cell.u - (dir > 0 ? 0 : 1))) + 0.5) + (k ? 6 : -6);
      const near = free.filter((p) => p.kind === "OH").sort((a, b) => Math.abs(a.x - sx) - Math.abs(b.x - sx)).slice(0, 2);
      near.forEach((p, k) => { free.splice(free.indexOf(p), 1); A.move(p.g, [[p.x, p.y], [sx, rowY(k)]], 480, () => p.g.remove()); });
      cell.oh -= near.length; changed();
      A.after(500, () => {
        const eNow = 2 * cell.u;
        if (fromNeg) { setNeg(eNow + 2); cell.water += 2 * K.water; } else { setPos(eNow - 2); cell.water += 2; }
        changed();
        const a = [xn + tw, ty0 - 4], b = [xn + tw, yw], c = [xp + tw, yw], d = [xp + tw, ty0 - 4];
        const path = fromNeg ? [a, b, c, d] : [d, c, b, a];
        if (fromNeg) bulb.setAttribute("fill", YEL);
        for (let k = 0; k < 2; k++) A.after(k * 170, () => { const e = dot(4, YEL); gE.append(e); A.move(e, path, 800, () => e.remove()); });
        A.after(1000, () => {
          if (fromNeg) { setPos(eNow + 2); cell.water -= 2; } else { setNeg(eNow - 2); cell.water -= 2 * K.water; }
          for (let k = 0; k < 2; k++) { const p = addIon("OH", dx, rowY(k)); p.vx = fromNeg ? -1.3 : 1.3; }
          cell.oh += 2; cell.u += dir; cell.busy = false; bulb.setAttribute("fill", "#2a303d");
          changed(); next();
        });
      });
    }
    function next() {
      if (cell.busy) return;
      if (cell.mode === "discharge") { if (cell.u < U) unit(1); else { cell.mode = "idle"; show(); cell.onEnd && cell.onEnd("empty"); } }
      else if (cell.mode === "charge") { if (cell.u > 0) unit(-1); else { cell.mode = "idle"; show(); cell.onEnd && cell.onEnd("full"); } }
    }
    function show() {
      charger.style.display = cell.mode === "charge" ? "" : "none"; bulb.style.display = cell.mode === "charge" ? "none" : "";
      flow.textContent = cell.mode === "discharge" ? "e⁻ →  through the device" : cell.mode === "charge" ? "←  e⁻ pushed by the charger" : "";
    }
    cell.setMode = (m) => { cell.mode = m; show(); next(); };
    cell.stop = () => A.stop();
    cell.U = U;
    setNeg(0); setPos(0); show();
    return cell;
  }
  const cellLegend = (k) => {
    const K = NEG[k], sw = (c, t, cls) => `<span><i class="${cls || ""}" style="background:${c === "none" ? "transparent" : c}"></i>${t}</span>`;
    return (K.hd ? sw(GRN, k === "H2" ? f("H2 gas (two H atoms)") : "H atom parked in the alloy", "dot") + (k === "MH" ? sw(K.on, "alloy") : "") : sw(K.on, K.onName) + sw(K.off, K.offName)) +
      sw(NI_ON, "NiO(OH), Ni +3") + sw(NI_OFF, f("Ni(OH)2") + ", Ni +2") + sw(YEL, "electron", "dot") + sw(BLUE, f("OH^-"), "dot") + sw(RED, f("K^+") + " (spectator)", "dot");
  };
  // a cell with Discharge / Pause / Charge buttons; setKind(k) swaps the negative electrode
  function cellPanel(kind, onChange) {
    const holder = h("div"), leg = h("div", { class: "nb-legend" }), status = h("div", { class: "nb-status" });
    let cell = null;
    const msgIdle = "Press <b>Discharge</b> and follow one pair of electrons round the loop.";
    const tg = toggle("", [["discharge", "Discharge"], ["idle", "Pause"], ["charge", "Charge"]], "idle", (m) => {
      if (m === "discharge" && cell.u >= cell.U && !cell.busy) { tg.set("idle"); status.innerHTML = "Already flat: every nickel tile is " + f("Ni(OH)2") + ". Press <b>Charge</b>."; return; }
      if (m === "charge" && cell.u <= 0 && !cell.busy) { tg.set("idle"); status.innerHTML = "Already full. Press <b>Discharge</b>."; return; }
      status.innerHTML = m === "discharge" ? "Discharging: electrons leave the negative electrode, cross the device and enter the nickel electrode. " + f("OH^-") + " drifts the other way inside."
        : m === "charge" ? "Charging: the charger pulls electrons out of the nickel electrode and pushes them into the negative electrode. Every arrow reverses."
        : "Paused. Nothing moves in the wire, so nothing reacts.";
      cell.setMode(m);
    });
    tg.style.marginTop = "8px";
    const panel = { el: h("div", {}, holder, tg, status, leg), get cell() { return cell; } };
    panel.setKind = (k) => {
      if (cell) cell.stop();
      cell = makeCell(k);
      cell.onChange = (c) => onChange && onChange(c);
      cell.onEnd = (what) => { tg.set("idle"); status.innerHTML = what === "empty" ? "Flat: the negative electrode has no more electrons to give and all the nickel is +2. Nothing was lost, so press <b>Charge</b>." : "Full again: every solid is back where it started."; };
      holder.innerHTML = ""; holder.append(cell.svg); leg.innerHTML = cellLegend(k); tg.set("idle"); status.innerHTML = msgIdle;
      onChange && onChange(cell);
    };
    panel.stop = () => cell && cell.stop();
    panel.setKind(kind);
    return panel;
  }

  const steps = [];

  // ---------------------------------------------------------------- 1
  steps.push({
    title: "An electrode that trades one hydrogen",
    short: "The nickel electrode",
    newConcepts: ["nioh"],
    render(el) {
      el.append(
        P(`In <em>Lead: the rechargeable car battery</em> both plates turned into lead sulfate, and the sulfuric acid was used up along the way. Around 1900 a second rechargeable family appeared. It works in <em>potassium hydroxide solution</em>, KOH dissolved in water as ${f("K^+")} and ${f("OH^-")}: the electrolyte of the alkaline cell from <em>Zinc: from Volta's pile to the alkaline cell</em>.`),
        P(`Its positive electrode is a black solid, <b>nickel oxyhydroxide</b>, NiO(OH): layers of nickel and oxygen with one H for every Ni. When an electron arrives from the wire, the solid does not dissolve. It takes one H from a water molecule beside it and becomes green nickel hydroxide, ${f("Ni(OH)2")}. What is left of the water floats away as ${f("OH^-")}.`),
        formula(`${f("NiO(OH) + H2O + e- -> Ni(OH)2 + OH^-")}<small>E° = ${v2(E_NI)} V in the course table. Atoms and charge balance: one negative charge on each side.</small>`),
        P(`Count <em>oxidation numbers</em> (from <em>Oxidation and reduction</em>: O is −2, H is +1). In NiO(OH) nickel must be <b>+3</b>; in ${f("Ni(OH)2")} it is <b>+2</b>. One electron per nickel atom, taken in without the solid falling apart. Pull the electron back out and everything reverses: that is charging.`)
      );
      const W = narrow(520, 380), H = 214, n = 6, tw = (W - 30) / n, y0 = 112, thh = 48, yb = y0 + thh + 8;
      const svg = s("svg", { viewBox: `0 0 ${W} ${H}`, width: "100%", style: "display:block;margin:0 auto;max-width:640px" });
      const gBk = s("g"), gT = s("g"), gP = s("g"); svg.append(gBk, gT, gP);
      const A = animator(), rnd = rng(3);
      gBk.append(s("rect", { x: 15, y: 8, width: W - 30, height: y0 - 8, fill: "#9fb4d6", "fill-opacity": 0.07 }));
      txt(gT, 22, 24, "KOH solution: water, K⁺ and OH⁻", { anchor: "start", size: 11.5, fill: MUTED });
      gBk.append(s("rect", { x: 0, y: y0 + thh + 2, width: W - 15, height: 12, fill: "#566074" }));
      txt(gT, W / 2, y0 + thh + 30, "← metal support, connected to the wire", { size: 11.5, fill: MUTED });
      const L = Array(n).fill(3), tiles = [];
      for (let i = 0; i < n; i++) {
        const x = 15 + i * tw;
        const r = s("rect", { x: x + 2, y: y0, width: tw - 4, height: thh, rx: 4, stroke: "#7d8798", "stroke-width": 1.2 }); gBk.append(r);
        const t1 = txt(gT, x + tw / 2, y0 + 20, "", { size: 11.5, weight: 700, fix: 1 }), t2 = txt(gT, x + tw / 2, y0 + 38, "", { size: 11.5, fix: 1 });
        tiles.push({ cx: x + tw / 2, show(v) { r.setAttribute("fill", v === 3 ? NI_ON : NI_OFF); t1.textContent = v === 3 ? "NiO(OH)" : f("Ni(OH)2"); t2.textContent = v === 3 ? "Ni +3" : "Ni +2"; t1.style.fill = t2.style.fill = v === 3 ? TEXT : DARK; } });
        tiles[i].show(3);
      }
      const s3 = stat("Ni at +3 (charged)", "y"), s2 = stat("Ni at +2 (discharged)", "g"), se = stat("electrons taken in", "b");
      const msg = h("div", { class: "nb-status" });
      const upd = () => { const c2 = L.filter((v) => v === 2).length; s3.set(String(n - c2)); s2.set(String(c2)); se.set(String(c2)); };
      let gen = 0;
      function discharge() {
        const i = L.indexOf(3);
        if (i < 0) { msg.innerHTML = "Every nickel is already +2: this electrode is flat. It cannot take another electron."; return; }
        L[i] = 2; upd(); const g0 = gen, T = tiles[i];
        msg.innerHTML = `An electron comes up from the wire. A water molecule hands over one H and leaves as ${f("OH^-")}.`;
        const e = dot(4.5, YEL), w = dot(9, "#cfd8e6", "H₂O"); gP.append(e, w);
        A.move(e, [[0, yb], [T.cx, yb], [T.cx, y0 + thh - 8]], 700, () => e.remove());
        A.move(w, [[T.cx + (rnd() - 0.5) * 50, 44], [T.cx, y0 - 10]], 700, () => {
          w.remove(); if (g0 !== gen) return; T.show(2);
          const o = dot(9, BLUE, "OH⁻"); gP.append(o);
          A.move(o, [[T.cx, y0 - 10], [T.cx + (rnd() - 0.5) * 40, 44 + rnd() * 30]], 700, () => A.after(900, () => o.remove()));
        });
      }
      function charge() {
        const i = L.lastIndexOf(2);
        if (i < 0) { msg.innerHTML = "Every nickel is already +3: fully charged."; return; }
        L[i] = 3; upd(); const g0 = gen, T = tiles[i];
        msg.innerHTML = `An ${f("OH^-")} arrives and takes the H back, making water. The electron leaves down the wire: nickel is +3 again.`;
        const o = dot(9, BLUE, "OH⁻"); gP.append(o);
        A.move(o, [[T.cx + (rnd() - 0.5) * 50, 44], [T.cx, y0 - 10]], 700, () => {
          o.remove(); if (g0 !== gen) return; T.show(3);
          const w = dot(9, "#cfd8e6", "H₂O"), e = dot(4.5, YEL); gP.append(w, e);
          A.move(w, [[T.cx, y0 - 10], [T.cx + (rnd() - 0.5) * 40, 44 + rnd() * 30]], 700, () => A.after(900, () => w.remove()));
          A.move(e, [[T.cx, y0 + thh - 8], [T.cx, yb], [0, yb]], 700, () => e.remove());
        });
      }
      el.append(widget("Six nickel atoms' worth of electrode, seen from the side",
        svg,
        h("div", { class: "btns" },
          h("button", { class: "primary", onclick: discharge }, "Discharge: push in one electron"),
          h("button", { onclick: charge }, "Charge: pull one electron out"),
          h("button", { onclick: () => { gen++; L.fill(3); tiles.forEach((t) => t.show(3)); gP.innerHTML = ""; upd(); msg.innerHTML = "Fully charged again."; } }, "Reset")),
        h("div", { class: "readout" }, s3, s2, se), msg));
      upd(); msg.innerHTML = "Black tiles are NiO(OH). Push electrons in one at a time.";
      el.append(
        P(`One mole of ${f("Ni(OH)2")} weighs ${M_NIOH2.toFixed(1)} g and holds one mole of electrons, so its <em>specific capacity</em> (from <em>Charge, energy and capacity</em>) is ${CAP_NI.toFixed(0)} mAh/g. This lesson's running example is an <b>AA cell that stores ${AA_AH.toFixed(1)} Ah</b>: it needs about ${(AA_AH * 1000 / CAP_NI).toFixed(1)} g of this green solid.`),
        takeaway(`The nickel electrode: ${f("NiO(OH) + H2O + e- <-> Ni(OH)2 + OH^-")}. Nickel flips between +3 and +2 inside a solid that stays in place.`)
      );
      return () => A.stop();
    },
    check: {
      type: "number", q: `A nickel electrode holds <b>0.050 mol</b> of NiO(OH). How many coulombs can it take in before all of it has become ${f("Ni(OH)2")}? (Faraday constant: 96 485 C per mole of electrons)`,
      answer: 0.05 * Chem.F, tolerance: 30, shown: "4824",
      hint: "Each Ni takes exactly one electron, so 0.050 mol of electrons. Multiply by 96 485 C/mol.",
      why: "0.050 mol of Ni takes 0.050 mol of electrons: 0.050 × 96 485 ≈ 4 824 C (about 1.34 Ah).",
    },
  });

  // ---------------------------------------------------------------- 2
  steps.push({
    title: "Add cadmium: the NiCd cell",
    short: "Cadmium + nickel = NiCd",
    newConcepts: ["nicd"],
    render(el) {
      el.append(
        P(`The nickel electrode takes electrons. It needs a partner that gives them, in the same KOH solution. In 1899 the Swedish engineer Waldemar Jungner chose <b>cadmium</b>, the metal directly below zinc in group 12. Like zinc, it gives two electrons.`),
        P(`In KOH the new ${f("Cd^2+")} does not swim away. It grabs two ${f("OH^-")} at once and stays on the electrode as a white solid:`),
        formula(`${f(NEG.Cd.an)}<small>written as a reduction, this couple sits at E° = ${v2(E_CD)} V</small>`),
        P(`Put the two on the <em>potential ladder</em> (from <em>Electrode potentials</em>, most negative on top). Electrons fall from the cadmium rung to the nickel rung:`)
      );
      el.append(widget("The two rungs of a NiCd cell",
        ladder([{ name: f("Cd(OH)2 / Cd"), E: E_CD, col: BLUE }, { name: f("NiO(OH) / Ni(OH)2"), E: E_NI, col: RED }], [0, 1, (E_NI - E_CD).toFixed(2) + " V"]),
        h("div", { class: "nb-eq", style: "margin-top:12px", html: `E°<sub>cell</sub> = E°<sub>cathode</sub> − E°<sub>anode</sub> = ${v2(E_NI)} − (${v2(E_CD)}) = <b>${(E_NI - E_CD).toFixed(2)} V</b>` })));
      el.append(P(`Real cells are labelled <b>1.2 V</b>: that is the average voltage while current flows. Now the whole cell. Each grey tile is one Cd atom (two electrons); each black tile is one NiO(OH) (one electron).`));
      const sE = stat("electrons delivered", "y"), sC = stat("Cd left", "b"), sN = stat("NiO(OH) left", "r");
      const panel = cellPanel("Cd", (c) => { sE.set(String(2 * c.u)); sC.set(`${6 - c.u} of 6`); sN.set(`${12 - 2 * c.u} of 12`); });
      el.append(widget("A NiCd cell: cadmium (−), nickel oxyhydroxide (+), KOH between them", panel.el, h("div", { class: "readout" }, sE, sC, sN)));
      el.append(
        formula(`${f(NEG.Cd.all)}<small>discharge, left to right; charging runs it right to left</small>`),
        P(`The cadmium electrode is the <em>anode</em> (oxidation, the − terminal); the nickel electrode is the <em>cathode</em> (+). Both products are solids that stay exactly where they formed. That is what makes the reaction reversible, just as lead sulfate did in the lead–acid cell.`),
        takeaway(`NiCd: ${f("Cd")} gives two electrons, two ${f("NiO(OH)")} take one each. E° = ${(E_NI - E_CD).toFixed(2)} V, about 1.2 V in use.`)
      );
      return () => panel.stop();
    },
    check: {
      type: "choice", q: `While a NiCd cell discharges, which way do the ${f("OH^-")} ions travel <b>inside</b> the cell?`,
      options: [`From the nickel electrode, where they are made, to the cadmium electrode, where they are used`, `From the cadmium electrode to the nickel electrode, following the electrons`, `They do not move: ions only move in the wire`],
      answer: 0,
      wrongHints: { 1: `That is the electrons' direction in the wire. Inside the cell the negative ${f("OH^-")} must go the other way to close the loop: anions drift to the anode, as in the Daniell cell.`, 2: "It is the other way round: electrons carry the current in the wire, ions carry it in the electrolyte." },
      why: `The cathode reaction releases ${f("OH^-")} and the anode reaction consumes it, so ${f("OH^-")} drifts from nickel to cadmium: anions go to the anode, exactly as in the Daniell cell.`,
      backTo: 0,
    },
  });

  // ---------------------------------------------------------------- 3
  steps.push({
    title: "The electrolyte is only borrowed",
    short: "KOH is not consumed",
    newConcepts: ["koh"],
    render(el) {
      el.append(
        P(`Look at the two half-reactions side by side and keep score of ${f("OH^-")}:`),
        h("div", { class: "nb-eq", html: `<span class="lab">cadmium</span> ${f(NEG.Cd.an)} &nbsp; <span style="color:var(--red)">uses 2</span><br><span class="lab">nickel</span> ${f("2NiO(OH) + 2H2O + 2e- -> 2Ni(OH)2 + 2OH^-")} &nbsp; <span style="color:var(--green)">returns 2</span>` }),
        P(`For every two electrons, two ${f("OH^-")} disappear at one electrode and two new ones appear at the other. The net change is <b>zero</b>. ${f("K^+")} is a <em>spectator ion</em> throughout. Compare the lead–acid cell, where the same two electrons permanently removed two ${f("H2SO4")} from the acid until recharge.`),
        P(`Run the cell and watch the counters. The lead–acid bar shows what the same number of electrons would have done to a car battery's acid.`)
      );
      const sE = stat("electrons delivered", "y"), sO = stat("OH⁻ in the electrolyte", "b"), sW = stat("H₂O locked into solids", "");
      const bars = hbars([f("NiCd: OH^- left"), f("lead–acid: H2SO4 left")], { max: 16, fmtv: (v) => String(Math.round(v)), labelWidth: 150 });
      const panel = cellPanel("Cd", (c) => { sE.set(String(2 * c.u)); sO.set(String(c.oh)); sW.set(String(Math.max(0, -c.water))); bars.update([c.oh, 16 - 2 * c.u], [BLUE, PUR]); });
      el.append(widget("Same cell, now with a ledger (toy counts: one dot is one ion)", panel.el, h("div", { class: "readout" }, sE, sO, sW), h("div", { style: "margin-top:12px" }, bars)));
      el.append(
        P(`The ${f("OH^-")} count dips by two while a pair is in transit, then comes straight back. Only a little water is tied up in the solids (two ${f("H2O")} per two electrons), and charging releases it.`),
        P(`Three consequences. The cell needs only a thin film of KOH soaked into the separator, so it can be small and <b>sealed</b>. The electrolyte tells you nothing about the <em>state of charge</em>: no hydrometer trick. And the voltage has no reason to sag as the cell empties, which is the next step.`),
        takeaway(`In a nickel cell KOH is the carrier, not a reactant: ${f("OH^-")} used at one electrode is returned at the other.`)
      );
      return () => panel.stop();
    },
    check: {
      type: "choice", q: "A mechanic judges a lead–acid battery by the density of its acid. Would the same trick work on the KOH of a NiCd cell?",
      options: [`No: ${f("OH^-")} used at one electrode is returned at the other, so the KOH is almost the same charged or flat`, "Yes: KOH is used up during discharge just like sulfuric acid", `Yes, but backwards: the KOH gets denser because ${f("Cd(OH)2")} dissolves into it`],
      answer: 0,
      wrongHints: { 1: `Add the two half-reactions: 2 ${f("OH^-")} in at cadmium, 2 ${f("OH^-")} out at nickel. Nothing is used up.`, 2: `${f("Cd(OH)2")} stays on the electrode as a solid; that is why the cell can be recharged.` },
      why: `Right. In lead–acid the acid is a reactant, so its density tracks the state of charge. In NiCd the ${f("OH^-")} cancels out of the overall reaction, so the electrolyte looks the same full or empty.`,
      backTo: 1,
    },
  });

  // ---------------------------------------------------------------- 4
  steps.push({
    title: "A flat discharge curve",
    short: "Flat discharge curve",
    newConcepts: ["flat"],
    render(el) {
      el.append(
        P(`In <em>Concentration and the Nernst equation</em> the Daniell cell's voltage sagged because a dissolved reactant thinned out and a dissolved product piled up: the <em>reaction quotient Q</em> kept moving. In a NiCd cell nothing dissolved changes. One solid turns into another solid at each electrode, and the ${f("OH^-")} stays put. Q barely moves, so the voltage barely moves.`),
        P(`The result is a <b>flat discharge curve</b>: a quick settle to about 1.2 V, a long plateau, then a cliff when the solids run out.`),
        P(`An alkaline single-use cell behaves differently. Its ${f("MnO2")} takes hydrogen into one and the same solid, a little more with every electron, so its potential slides all the way down. It starts near 1.6 V and spends most of its life below 1.3 V.`)
      );
      const pl = plot({ xmin: 0, xmax: 100, ymin: 0.7, ymax: 1.7, height: 250, narrow: true, minFont: 10, xlabel: "charge used (% of the cell's capacity)", ylabel: "cell voltage (V)", xticks: [0, 20, 40, 60, 80, 100], yticks: [0.8, 1.0, 1.2, 1.4, 1.6] });
      let cut = 1.1, used = 0.5;
      const sA = stat("alkaline: usable before cut-off", "y"), sN = stat("NiCd: usable before cut-off", "b"), sVa = stat("alkaline voltage now", "y"), sVn = stat("NiCd voltage now", "b");
      const usable = (v) => { for (let x = 0; x <= 1.0001; x += 0.002) if (v(x) < cut) return x; return 1; };
      const draw = () => {
        pl.clear();
        pl.fn((x) => vAlk(x / 100), YEL); pl.fn((x) => vNi(x / 100), BLUE);
        pl.hline(cut, RED, "device cut-off " + cut.toFixed(2) + " V", { pos: "left", below: true });
        pl.vline(used * 100, MUTED);
        pl.dot(used * 100, vAlk(used), YEL, 5); pl.dot(used * 100, vNi(used), BLUE, 5);
        pl.legend([["alkaline single-use", YEL], ["NiCd", BLUE]], { pos: "right" });
        sA.set(fmt.pct(usable(vAlk))); sN.set(fmt.pct(usable(vNi)));
        sVa.set(vAlk(used).toFixed(2) + " V"); sVn.set(vNi(used).toFixed(2) + " V");
      };
      el.append(widget("Voltage while the cell empties (typical shapes at light load, simplified)",
        pl,
        slider({ name: "charge used", min: 0, max: 1, step: 0.01, value: used, fmtv: fmt.pct, oninput: (v) => { used = v; draw(); } }),
        slider({ name: "device cut-off", min: 0.8, max: 1.4, step: 0.01, value: cut, fmtv: (v) => v.toFixed(2) + " V", oninput: (v) => { cut = v; draw(); } }),
        h("div", { class: "readout" }, sVa, sVn, sA, sN)));
      draw();
      el.append(
        P(`Slide <em>charge used</em> from 20% to 80%: the NiCd reading hardly changes. A voltmeter is a poor fuel gauge for this cell. Then raise the <em>cut-off</em>: a device that gives up at 1.3 V throws away most of an alkaline cell but is no friend of NiCd either. Devices built for "1.5 V" cells usually work down to about 1.0 V, which is why a 1.2 V cell can replace them.`),
        takeaway("Solid → solid at both electrodes, electrolyte unchanged: the voltage stays near 1.2 V until the cell is almost empty.")
      );
    },
    check: {
      type: "choice", q: "A voltmeter on a resting NiCd cell reads <b>1.22 V</b>. How much charge is left?",
      options: ["You cannot tell: anywhere from roughly 15% to 85% gives almost this reading", "About 80%, because 1.22 V is about 80% of 1.5 V", "Almost none: a full cell would read 1.5 V"],
      answer: 0,
      wrongHints: { 1: "Voltage does not scale with charge here. On the plateau the curve is nearly horizontal: move the slider and watch the NiCd reading.", 2: "1.5 V is the alkaline cell's starting voltage. A NiCd cell sits near 1.2 V for most of its discharge." },
      why: "On the plateau the voltage changes by only a few hundredths of a volt between 15% and 85% used, so one reading cannot locate you on it. (Nernst's 'voltage is a poor fuel gauge', in its most extreme form.)",
    },
  });

  // ---------------------------------------------------------------- 5
  steps.push({
    title: "Cadmium's two problems",
    short: "Toxic, and it 'remembers'",
    newConcepts: ["memory"],
    render(el) {
      el.append(
        P(`NiCd cells are tough. They deliver large currents, work at −20 °C and survive a thousand or more recharges. They still start aircraft and feed emergency lighting. Two things pushed them out of household devices.`),
        P(`<b>Cadmium is toxic.</b> It is a heavy metal that builds up in the body and in soil. The EU's 2006 batteries directive banned NiCd from most portable consumer products, and the last big exemption, cordless power tools, ended in 2016.`),
        P(`<b>The memory effect.</b> If a NiCd cell is discharged to exactly the same point and recharged, again and again, the cadmium beyond that point can coarsen into larger crystals. That part then delivers its charge at a lower voltage: the curve grows a step. The charge is still there, but a device that cuts out at 1.1 V sees an empty cell at the step. One or two full discharges followed by a full charge usually bring the fine crystals back.`)
      );
      let habit = 0.4, n = 0;
      const cut = 1.1;
      const pl = plot({ xmin: 0, xmax: 100, ymin: 0.7, ymax: 1.5, height: 240, narrow: true, minFont: 10, xlabel: "charge used (%)", ylabel: "cell voltage (V)", xticks: [0, 20, 40, 60, 80, 100], yticks: [0.8, 1.0, 1.2, 1.4] });
      const sN = stat("identical shallow cycles", "b"), sD = stat("depth of the step", "r"), sU = stat("capacity the device sees", "y");
      const dep = () => 0.16 * (1 - Math.exp(-n / 120));
      const v = (x) => vNi(x) - dep() / (1 + Math.exp(-(x - habit) / 0.012));
      const draw = () => {
        pl.clear();
        pl.fn((x) => vNi(x / 100), "#4a5568", true);
        pl.fn((x) => v(x / 100), BLUE);
        pl.hline(cut, RED, "device cuts out at 1.10 V", { pos: "left", below: true });
        pl.vline(habit * 100, YEL, "habit: recharge here", { pos: habit > 0.55 ? "left" : "right" });
        let u = 1; for (let x = 0.02; x <= 1; x += 0.002) if (v(x) < cut) { u = x; break; }
        pl.dot(u * 100, cut, RED, 5);
        sN.set(String(n)); sD.set((dep() * 1000).toFixed(0) + " mV"); sU.set(fmt.pct(u));
      };
      el.append(widget("A NiCd cell that is always recharged at the same point (illustrative model)",
        pl,
        slider({ name: "habit: use this much, then recharge", nameWidth: 150, min: 0.2, max: 0.8, step: 0.01, value: habit, fmtv: fmt.pct, oninput: (x) => { habit = x; draw(); } }),
        h("div", { class: "btns" },
          h("button", { class: "primary", onclick: () => { n += 100; draw(); } }, "Repeat this shallow cycle 100×"),
          h("button", { onclick: () => { n = 0; draw(); } }, "Full discharge, then full charge")),
        h("div", { class: "readout" }, sN, sD, sU)));
      draw();
      el.append(
        note("How real is it? The strict effect was reported from satellites whose NiCd batteries were cycled identically on every orbit, and it is rare in everyday use. What most users met was a similar voltage drop caused by long overcharging. The step height here follows the usual description of a second plateau roughly 0.1 to 0.15 V lower."),
        takeaway("Memory effect: after many identical partial cycles the unused part of a NiCd cell delivers at a lower voltage. The charge is not lost, and a full cycle largely restores it.")
      );
    },
    check: {
      type: "choice", q: "A NiCd cell with a 'memory' step gets one full discharge and a full charge, and its old runtime returns. What does that tell you about the step?",
      options: ["The cadmium was all still there: only the voltage it delivered at had dropped", "The full discharge created new cadmium to replace what was lost", "The KOH had been used up and the full charge replaced it"],
      answer: 0,
      wrongHints: { 1: "Atoms are conserved: a sealed cell cannot make cadmium. The curve in the widget still reaches 100%, just at a lower voltage.", 2: "KOH is not consumed in this cell (step 3), so there was nothing to replace." },
      why: "Nothing was lost. The curve still runs to 100% of the charge; part of it simply sat below the device's cut-off voltage. Restoring the fine crystals restores the voltage.",
      backTo: 3,
    },
  });

  // ---------------------------------------------------------------- 6
  steps.push({
    title: "Hydrogen, parked in a metal",
    short: "Metal hydride",
    newConcepts: ["mh"],
    render(el) {
      el.append(
        P(`What could replace cadmium? Look one rung above it on the ladder: hydrogen in base, ${f("2H2O + 2e- -> H2 + 2OH^-")}, at ${v2(E_H)} V, next door to cadmium's ${v2(E_CD)} V. Hydrogen as the electron giver would give the same cell voltage with nothing toxic. The trouble is that hydrogen is a gas.`),
        P(`The way out: some alloys soak up hydrogen the way a sponge takes water. The H atoms slip into the gaps between the metal atoms. ${f("LaNi5")} (one lanthanum atom to five nickel) takes up to six: ${f("LaNi5H6")}. A solid like this is a <b>metal hydride</b>, and the alloy is called a hydrogen storage alloy. Write the alloy as M and the filled alloy as MH.`),
        P(`In a cell the hydrogen never appears as gas. During charging, water is split right at the alloy surface and the H atom goes straight in:`),
        formula(`${f("M + H2O + e- -> MH + OH^-")}<small>charging; discharging runs it backwards: ${f("MH + OH^- -> M + H2O + e-")}</small>`),
        P(`Inside the alloy each H is close to neutral: count it as oxidation number 0, as in ${f("H2")}. In water it is +1. So on discharge it is <b>hydrogen that is oxidised</b>. The metal is only the car park.`)
      );
      const W = narrow(460, 380), cols = 9, rows = 4, x0 = 22, dx = (W - 2 * x0) / (cols - 1), dy = 40, y0 = 26, H = y0 + (rows - 1) * dy + 26;
      const svg = s("svg", { viewBox: `0 0 ${W} ${H}`, width: "100%", style: "display:block;margin:0 auto;max-width:560px" });
      const gH = s("g");
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        const la = (c + 2 * r) % 6 === 0;
        svg.append(s("circle", { cx: x0 + c * dx, cy: y0 + r * dy, r: la ? 14 : 10.5, fill: la ? "#8f7fb8" : "#77819a", stroke: DARK, "stroke-width": 1 }));
        const t = txt(svg, x0 + c * dx, y0 + r * dy + 3.5, la ? "La" : "Ni", { size: 9.5, fill: DARK, weight: 700, fix: 1 }); t.setAttribute("pointer-events", "none");
      }
      svg.append(gH);
      const sites = [];
      for (let r = 0; r < rows - 1; r++) for (let c = 0; c < cols - 1; c++) sites.push([x0 + (c + 0.5) * dx, y0 + (r + 0.5) * dy]);
      for (let r = 1; r < rows - 1; r++) for (let c = 0; c < cols - 1; c++) sites.push([x0 + (c + 0.5) * dx, y0 + r * dy]);
      const rnd = rng(5);
      for (let i = sites.length - 1; i > 0; i--) { const j = rnd.int(i + 1); [sites[i], sites[j]] = [sites[j], sites[i]]; }
      const hd = sites.slice(0, 36).map(([x, y]) => { const c = s("circle", { cx: x, cy: y, r: 4.2, fill: GRN, stroke: DARK, "stroke-width": 0.6 }); gH.append(c); return c; });
      const GRAMS = 7, molAlloy = GRAMS / M_LANI5;
      const sC = stat("per gram of alloy", "g"), sQ = stat(`charge in ${GRAMS} g of alloy`, "y"), sG = stat("same hydrogen as loose gas", "b");
      const upd = (x) => {
        const nShow = Math.round(x * 6); hd.forEach((c, i) => c.setAttribute("opacity", i < nShow ? 1 : 0));
        sC.set(Chem.capacity(x, M_LANI5).toFixed(0) + " mAh/g"); sQ.set((x * molAlloy * Chem.F / 3600).toFixed(2) + " Ah"); sG.set((x / 2 * molAlloy * V_GAS).toFixed(2) + " L");
      };
      const sl = slider({ name: "H atoms per LaNi₅", nameWidth: 130, min: 0, max: 6, step: 0.1, value: 4.8, fmtv: (x) => x.toFixed(1), oninput: upd });
      el.append(widget("A slice of hydrogen storage alloy (schematic). Green dots are H atoms in the gaps",
        svg, sl,
        h("div", { class: "btns" },
          h("button", { onclick: () => { sl.set(0); upd(0); } }, "Empty (discharged)"),
          h("button", { onclick: () => { sl.set(4.8); upd(4.8); } }, "Practical alloy (about 300 mAh/g)"),
          h("button", { onclick: () => { sl.set(6); upd(6); } }, f("Full LaNi5H6"))),
        h("div", { class: "readout" }, sC, sQ, sG)));
      upd(4.8);
      el.append(
        P(`Each H carries one electron, so capacity is the same formula as before: ${f("LaNi5H6")} holds 6 mol of electrons per ${M_LANI5.toFixed(0)} g, or ${CAP_LANI5H6.toFixed(0)} mAh/g. About ${GRAMS} g of alloy fits in an AA cell. As loose gas at 1 bar that hydrogen would fill about a litre (a mole of gas takes about ${V_GAS.toFixed(1)} L at 25 °C): roughly a thousand times the alloy's own volume. Real cells use cheaper mixtures of similar metals in place of pure lanthanum.`),
        takeaway(`A metal hydride stores hydrogen atoms between metal atoms. As an electrode: ${f("MH + OH^- <-> M + H2O + e-")}, at about ${v2(E_H)} V.`)
      );
    },
    check: {
      type: "choice", q: "While a metal hydride electrode is being <b>charged</b> in a sealed cell, where do the hydrogen atoms that enter the alloy come from?",
      options: [`From water molecules in the electrolyte: each takes an electron at the alloy surface and splits into H (into the alloy) and ${f("OH^-")}`, "From hydrogen gas pumped into the cell by the charger", "They travel through the wire together with the electrons"],
      answer: 0,
      wrongHints: { 1: `The cell is sealed and the charger only moves electrons. Read the charging equation: ${f("M + H2O + e- -> MH + OH^-")}.`, 2: "Only electrons move in a wire (ionic vs electronic conduction). The H must come from something already inside the cell." },
      why: `${f("M + H2O + e- -> MH + OH^-")}: the electron arrives through the wire, the H comes from water, and the leftover ${f("OH^-")} joins the electrolyte.`,
    },
  });

  // ---------------------------------------------------------------- 7
  steps.push({
    title: "NiMH: the same cell without the cadmium",
    short: "The NiMH cell",
    newConcepts: ["nimh"],
    render(el) {
      el.append(
        P(`Put the hydride electrode opposite the nickel electrode and you have the <b>nickel–metal hydride cell</b>, NiMH, sold since 1989.`),
        h("div", { class: "nb-eq", html: `<span class="lab">alloy (−)</span> ${f(NEG.MH.an)}<br><span class="lab">nickel (+)</span> ${f(CATH)}<br><span class="lab">overall</span> <b>${f(NEG.MH.all)}</b>` }),
        P(`Add the two lines and see what cancels: the ${f("OH^-")} <i>and</i> the water. The electrolyte drops out of the overall reaction completely. All that happens is that <b>one hydrogen atom leaves the alloy and ends up in the nickel compound</b>, while its electron takes the long way round through your device. Charging sends both back.`),
        P(`Voltage: E° = ${v2(E_NI)} − (${v2(E_H)}) = <b>${(E_NI - E_H).toFixed(2)} V</b>, within 0.02 V of NiCd, and the same 1.2 V in use. A NiMH cell can go wherever a NiCd cell went.`)
      );
      const sT = stat("cell", ""), sE = stat("electrons delivered", "y"), sO = stat("OH⁻ in the electrolyte", "b"), sW = stat("H₂O locked into solids", "");
      const eq = h("div", { class: "nb-eq" });
      const panel = cellPanel("MH", (c) => { sT.set(`${NEG[c.kind].title} · E° ${(E_NI - NEG[c.kind].E).toFixed(2)} V`); sE.set(String(2 * c.u)); sO.set(String(c.oh)); sW.set(String(Math.max(0, -c.water))); });
      const pick = toggle("negative electrode:", [["MH", "metal hydride"], ["Cd", "cadmium"]], "MH", (k) => { panel.setKind(k); eq.innerHTML = `<span class="lab">overall</span> ${f(NEG[k].all)}`; });
      eq.innerHTML = `<span class="lab">overall</span> ${f(NEG.MH.all)}`;
      el.append(widget("Swap the negative electrode and compare the ledgers", pick, panel.el, eq, h("div", { class: "readout" }, sT, sE, sO, sW)));
      el.append(
        P(`In the NiMH ledger even the water count returns to zero after each pair of electrons: the alloy side makes the water that the nickel side takes.`),
        P(`Why bother, apart from the cadmium? Per gram the alloy is no better (about 300 mAh/g against cadmium's theoretical ${CAP_CD.toFixed(0)}). The gain is per <i>volume</i>: in practice a hydride electrode packs clearly more charge into the same space, and an AA cell is limited by its volume. A typical AA NiCd stores 0.6 to 1.0 Ah; an AA NiMH stores 1.9 to 2.5 Ah. Typical <em>specific energy</em>: 40–60 Wh/kg for NiCd, 60–120 Wh/kg for NiMH. That put NiMH into the first mass-market hybrid cars (Toyota Prius, 1997).`),
        takeaway(`NiMH: ${f(NEG.MH.all)}. One H per electron moves from alloy to nickel compound; the KOH is untouched. E° = ${(E_NI - E_H).toFixed(2)} V, 1.2 V in use.`)
      );
      return () => panel.stop();
    },
    check: {
      type: "number", q: `Our AA NiMH cell delivers <b>${AA_AH.toFixed(1)} Ah</b> in one full discharge. How many <b>moles of hydrogen atoms</b> moved from the alloy into the nickel compound? (1 Ah = 3600 C; F = 96 485 C/mol)`,
      answer: AA_AH * 3600 / Chem.F, tolerance: 0.002, shown: "0.0746",
      hint: "One H atom moves per electron. Convert 2.0 Ah to coulombs, then divide by the Faraday constant.",
      why: `2.0 Ah = 7200 C; 7200 / 96 485 ≈ 0.075 mol of electrons, and one H moves per electron: 0.075 mol of H, only about 0.075 g of hydrogen.`,
    },
  });

  // ---------------------------------------------------------------- 8
  steps.push({
    title: "Two clocks: self-discharge and cycle life",
    short: "Self-discharge, cycle life",
    newConcepts: ["selfd", "cycle"],
    render(el) {
      el.append(
        P(`A charged nickel cell left in a drawer slowly empties itself. This is <b>self-discharge</b>. The ladder shows one reason: NiO(OH) at ${v2(E_NI)} V sits just below the oxygen rung at ${v2(E_O2)} V, so it can take electrons from the ${f("OH^-")} around it, slowly, with no wire involved:`),
        formula(`${f("4NiO(OH) + 2H2O -> 4Ni(OH)2 + O2")}<small>downhill by ${(E_NI - E_O2).toFixed(2)} V, so it is spontaneous, just slow</small>`)
      );
      el.append(widget("Why a charged nickel electrode cannot rest",
        ladder([{ name: f("O2 / OH^-"), E: E_O2, col: PUR }, { name: f("NiO(OH) / Ni(OH)2"), E: E_NI, col: RED }], [0, 1, (E_NI - E_O2).toFixed(2) + " V"], { min: 0.3, max: 0.6, height: 120 })));
      el.append(P(`In NiMH a trace of hydrogen also escapes the alloy, drifts across and reduces NiO(OH) directly. Nothing is damaged: recharging restores the charge. Typical figures are below; warmth speeds everything up.`));
      // per-month loss at 20 °C (typical, simplified to a constant rate); factor at 45 °C
      const SD = [["alkaline single-use", YEL, 0.0025, 2], ["NiCd", BLUE, 0.10, 2], ["NiMH, classic", GRN, 0.25, 3], ["NiMH, low self-discharge", PUR, 0.02, 3]];
      let months = 3, hot = 0;
      const rate = (row) => 1 - Math.pow(1 - row[2], hot ? row[3] : 1);
      const pl = plot({ xmin: 0, xmax: 24, ymin: 0, ymax: 100, height: 220, narrow: true, minFont: 10, xlabel: "months on the shelf", ylabel: "charge left (%)", xticks: [0, 6, 12, 18, 24], yticks: [0, 25, 50, 75, 100] });
      const bars = hbars(SD.map((r) => r[0]), { max: 1, fmtv: fmt.pct, labelWidth: 170 });
      const draw = () => {
        pl.clear();
        SD.forEach((r) => pl.fn((m) => 100 * Math.pow(1 - rate(r), m), r[1]));
        pl.vline(months, MUTED);
        bars.update(SD.map((r) => Math.pow(1 - rate(r), months)), SD.map((r) => r[1]));
      };
      el.append(widget("Charge left in an unused cell (constant-rate sketch through typical data)",
        pl,
        slider({ name: "months", min: 0, max: 24, step: 1, value: months, fmtv: (x) => x + " mo", oninput: (v) => { months = v; draw(); } }),
        toggle("stored at", [[0, "20 °C"], [1, "45 °C"]], 0, (v) => { hot = v; draw(); }),
        h("div", { style: "margin-top:10px" }, bars)));
      draw();
      el.append(
        P(`Roughly: NiCd loses 10% a month, classic NiMH 20–30%, an alkaline cell 2–3% a <i>year</i>. Low-self-discharge NiMH (2005) keeps 70–85% after a year.`),
        P(`The second clock is wear. Every cycle swells and shrinks the solids, and the alloy slowly corrodes in KOH. <b>Cycle life</b> is the number of full charge–discharge cycles until the cell holds only 80% of its original capacity.`)
      );
      const LIFE = [["NiCd", BLUE, 1000], ["NiMH", GRN, 500]];
      const capAt = (n, N) => Math.max(0.3, 1 - 0.2 * n / N);
      const pc = plot({ xmin: 0, xmax: 1500, ymin: 0, ymax: 100, height: 200, narrow: true, minFont: 10, xlabel: "full cycles", ylabel: "capacity (% of new)", xticks: [0, 500, 1000, 1500], yticks: [0, 20, 40, 60, 80, 100] });
      const c1 = stat("NiCd capacity left", "b"), c2 = stat("NiMH capacity left", "g"), c3 = stat("single-use AAs one NiMH has replaced", "y");
      let cyc = 300;
      const drawC = () => {
        pc.clear();
        pc.hline(80, RED, "end of life by convention: 80%", { pos: "left", below: true });
        LIFE.forEach((r) => pc.fn((n) => 100 * capAt(n, r[2]), r[1]));
        pc.vline(cyc, MUTED);
        LIFE.forEach((r) => pc.dot(cyc, 100 * capAt(cyc, r[2]), r[1], 5));
        c1.set(fmt.pct(capAt(cyc, 1000))); c2.set(fmt.pct(capAt(cyc, 500)));
        let sum = 0; for (let i = 0; i < cyc; i++) sum += capAt(i, 500) * 2.0;
        c3.set("≈ " + Math.round(sum / 2.8));
      };
      el.append(widget("Capacity fade (straight-line sketch: NiCd about 1000 cycles to 80%, NiMH about 500)",
        pc, slider({ name: "cycles", min: 0, max: 1500, step: 10, value: cyc, fmtv: (x) => String(x), oninput: (v) => { cyc = v; drawC(); } }),
        h("div", { class: "readout" }, c1, c2, c3)));
      drawC();
      el.append(takeaway("Self-discharge empties a charged cell on the shelf and is undone by recharging. Cycle life counts the recharges until wear has cost 20% of the capacity, and is not undone."));
    },
    check: {
      type: "number", q: "A classic NiMH cell loses <b>25%</b> of whatever charge it still has every month. Fully charged today: what percentage is left after <b>2 months</b>?",
      answer: 56.25, tolerance: 1, shown: "56",
      hint: "After one month 75% is left. The second month takes 25% of that 75%, not of the original.",
      why: "0.75 × 0.75 = 0.5625: about 56% left. Each month removes a quarter of what remains, so the loss is fastest at the start.",
    },
  });

  // ---------------------------------------------------------------- 9
  steps.push({
    title: "One nickel electrode, four partners",
    short: "NiFe and nickel–hydrogen",
    newConcepts: ["nife", "nih2"],
    render(el) {
      el.append(
        P(`By now the pattern is clear. The nickel electrode stays; the negative electrode is whatever sits high on the ladder and can be kept in KOH. Two more partners were built into real batteries.`),
        P(`<b>Nickel–iron</b> (Edison, 1901) uses plain iron: ${f(NEG.Fe.an)}, at about ${v2(E_FE)} V. It is cheap and almost indestructible: cells have worked for decades. But iron sits slightly <i>above</i> the hydrogen rung, which costs it dearly, as you will see in the check.`),
        P(`<b>Nickel–hydrogen</b> skips the alloy and stores ${f("H2")} gas itself, at up to about 80 bar, in a metal pressure vessel with a platinum-coated electrode. It is bulky, but it survives tens of thousands of cycles. The Hubble Space Telescope ran on its original set from 1990 to 2009.`)
      );
      const INFO = {
        Cd: [["introduced", "1899, Jungner"], ["in use", "about 1.2 V"], ["specific energy", "40–60 Wh/kg"], ["self-discharge", "about 10% a month"], ["life", "1000+ cycles"], ["where", "power tools, aircraft, emergency lights"], ["catch", "cadmium is toxic; memory effect"]],
        MH: [["introduced", "1989"], ["in use", "about 1.2 V"], ["specific energy", "60–120 Wh/kg"], ["self-discharge", "20–30% a month (classic)"], ["life", "500–1000 cycles"], ["where", "AA/AAA cells, hybrid cars"], ["catch", "self-discharge; dislikes overcharging"]],
        Fe: [["introduced", "1901, Edison"], ["in use", "about 1.2 V"], ["specific energy", "19–25 Wh/kg"], ["self-discharge", "20–30% a month"], ["life", "decades"], ["where", "railway signals, mines, off-grid storage"], ["catch", "gives off hydrogen; a third or more of the charge is wasted"]],
        H2: [["introduced", "first flown 1977"], ["in use", "about 1.25 V"], ["specific energy", "55–75 Wh/kg"], ["self-discharge", "high: days to weeks"], ["life", "20 000+ cycles"], ["where", "satellites, Hubble, the space station"], ["catch", "a pressure vessel; expensive"]],
      };
      const lad = h("div"), tb = h("table", { class: "small" }), eq = h("div", { class: "nb-eq" });
      const panel = cellPanel("Fe", null);
      const show = (k) => {
        const K = NEG[k], rungs = [
          { name: f("Fe(OH)2 / Fe"), E: E_FE, col: k === "Fe" ? BLUE : "#566074", dim: k !== "Fe" },
          { name: f("H2O / H2") + (k === "MH" ? "  (H in alloy)" : ""), E: E_H, col: k === "MH" || k === "H2" ? BLUE : "#566074", dim: !(k === "MH" || k === "H2") },
          { name: f("Cd(OH)2 / Cd"), E: E_CD, col: k === "Cd" ? BLUE : "#566074", dim: k !== "Cd" },
          { name: f("NiO(OH) / Ni(OH)2"), E: E_NI, col: RED }];
        const top = k === "Fe" ? 0 : k === "Cd" ? 2 : 1;
        lad.innerHTML = ""; lad.append(ladder(rungs, [top, 3, (E_NI - K.E).toFixed(2) + " V"], { min: -1.0, max: 0.6, height: 190 }));
        eq.innerHTML = `<span class="lab">(−)</span> ${f(K.an)}<br><span class="lab">overall</span> ${f(K.all)}`;
        tb.innerHTML = "";
        tb.append(h("tr", {}, h("th", {}, K.title), h("th", {}, `E° = ${(E_NI - K.E).toFixed(2)} V`)));
        INFO[k].forEach(([a, b]) => tb.append(h("tr", {}, h("td", { style: "color:var(--muted)" }, a), h("td", {}, b))));
      };
      const pick = toggle("negative electrode:", [["Fe", "iron"], ["H2", "hydrogen gas"], ["MH", "metal hydride"], ["Cd", "cadmium"]], "Fe", (k) => { panel.setKind(k); show(k); });
      show("Fe");
      el.append(widget("Choose the partner for the nickel electrode (typical figures)", pick, lad, eq, panel.el, h("div", { class: "tablewrap", style: "margin-top:12px" }, tb)));
      el.append(
        P(`All four land between 1.30 and 1.37 V, because their negative rungs are neighbours. Rungs much higher than these are hard to use in water at all: the water itself would be reduced to hydrogen first. The next lesson, <em>Lithium</em>, deals with that limit.`),
        takeaway("The nickel family keeps one positive electrode and swaps the negative: cadmium, a hydride alloy, iron or hydrogen gas. The voltage is nearly the same; cost, life and nuisance differ.")
      );
      return () => panel.stop();
    },
    check: {
      type: "choice", q: `On the ladder, ${f("Fe(OH)2 / Fe")} (≈ ${v2(E_FE)} V) lies just above ${f("H2O / H2")} (${v2(E_H)} V). While <b>charging</b> a nickel–iron cell, the charger pushes electrons into the iron electrode. What does the ladder predict?`,
      options: [`Some electrons take the easier rung and turn water into ${f("H2")} gas instead of turning ${f("Fe(OH)2")} back into iron`, "Nothing special: all electrons go to the iron compound because it is higher on the ladder", "The iron electrode dissolves into the KOH as it charges"],
      answer: 0,
      wrongHints: { 1: "Higher on the ladder means harder to push electrons onto. Arriving electrons prefer the lower rung, and here water's rung is the lower one.", 2: `Charging turns solid ${f("Fe(OH)2")} back into solid Fe. Nothing dissolves; the issue is a competing reaction.` },
      why: `Reducing water needs a slightly less negative potential than reducing ${f("Fe(OH)2")}, so part of the charging current makes hydrogen gas (the gassing you met in the lead–acid cell). That is why nickel–iron cells charge inefficiently and need topping up with water.`,
    },
  });

  // ---------------------------------------------------------------- 10
  steps.push({
    title: "Capstone: three AA cells, one device",
    short: "Capstone: AA shoot-out",
    newConcepts: [],
    render(el) {
      el.append(
        P(`Everything together. Pick an AA cell and a device, decide how long the cell lay in a drawer after it was charged (or bought), and run it. Then run it again and again and see what the two clocks do.`),
        P(`One thing here belongs to a later lesson: under a heavy load every cell loses some voltage inside itself, and the alkaline cell loses by far the most. The model includes that loss; <em>Real batteries</em> explains it.`)
      );
      // Simplified model tuned to typical data-sheet behaviour: capacity (Ah), voltage lost inside per ampere (ohms),
      // self-discharge per month, cycles to 80% capacity.
      const CELLS = {
        alk: { name: "Alkaline (single-use)", col: YEL, cap: 2.8, ocv: vAlk, r: (x) => 0.15 + 0.7 * x, sd: 0.0025, life: 1, re: false },
        nicd: { name: "NiCd", col: BLUE, cap: 0.9, ocv: vNi, r: () => 0.025, sd: 0.10, life: 1000, re: true },
        nimh: { name: "NiMH", col: GRN, cap: 2.0, ocv: vNi, r: () => 0.035, sd: 0.25, life: 500, re: true },
      };
      const DEV = {
        radio: { name: "Radio, 50 mA", I: 0.05, cut: 0.9 },
        torch: { name: "Torch, 0.5 A", I: 0.5, cut: 0.9 },
        flash: { name: "Camera flash, 1.5 A", I: 1.5, cut: 1.05 },
      };
      let chem = "nimh", dev = "torch", shelf = 0, timer = null;
      let last = {}, cnt = {};
      const resetCounts = () => { last = {}; cnt = { alk: { uses: 0, hours: 0 }, nicd: { uses: 0, hours: 0 }, nimh: { uses: 0, hours: 0 } }; };
      resetCounts();
      const fade = (c, uses) => (c.re ? 1 - 0.2 * ((uses % c.life) / c.life) : 1);
      function simulate(key, uses) {
        const c = CELLS[key], d = DEV[dev], cap = c.cap * fade(c, uses);
        const x0 = 1 - Math.pow(1 - c.sd, shelf), dq = cap / 600;
        const pts = []; let q = 0, wh = 0;
        for (let x = x0; x < 1; x += dq / cap) {
          const v = c.ocv(x) - d.I * c.r(x);
          if (v < d.cut) break;
          pts.push([q / d.I, v]); q += dq; wh += v * dq;
        }
        return { pts, hours: q / d.I, ah: q, wh, cap };
      }
      const hrs = (t) => (t >= 10 ? t.toFixed(0) + " h" : t >= 1 ? t.toFixed(1) + " h" : (t * 60).toFixed(0) + " min");
      const pl = plot({ xmin: 0, xmax: 6, ymin: 0.7, ymax: 1.7, height: 250, narrow: true, minFont: 10, xlabel: "hours in the device", ylabel: "voltage at the terminals (V)", xticks: [0, 2, 4, 6], yticks: [0.8, 1.0, 1.2, 1.4, 1.6] });
      const sRun = stat("this run", "y"), sAh = stat("charge delivered", "b"), sWh = stat("energy delivered", "g"), sUse = stat("runs so far", ""), sBuy = stat("cells bought", "r"), sTot = stat("total running time", "p");
      const status = h("div", { class: "nb-status" });
      const setAxes = () => {
        const xm = (2.8 / DEV[dev].I) * 1.05, step = xm > 40 ? 20 : xm > 4 ? 2 : 0.5, ticks = [];
        for (let t = 0; t <= xm + 1e-9; t += step) ticks.push(+t.toFixed(2));
        pl.setRange({ xmax: xm, xticks: ticks });
      };
      const draw = (partial) => {
        pl.clear();
        pl.hline(DEV[dev].cut, RED, "device cut-off " + DEV[dev].cut.toFixed(2) + " V", { pos: "right", below: true });
        Object.keys(CELLS).forEach((k) => { if (last[k] && k !== chem && last[k].pts.length > 1) pl.line(last[k].pts, CELLS[k].col, true, 1.8); });
        const L = last[chem];
        if (L && L.pts.length > 1) { const pts = partial == null ? L.pts : L.pts.slice(0, Math.max(2, partial)); pl.line(pts, CELLS[chem].col); const e = pts[pts.length - 1]; pl.dot(e[0], e[1], CELLS[chem].col, 4.5); }
        pl.legend(Object.keys(CELLS).map((k) => [CELLS[k].name, CELLS[k].col]), { pos: "right" });
      };
      const stats = () => {
        const L = last[chem], c = CELLS[chem], n = cnt[chem];
        sRun.set(L ? hrs(L.hours) : "–"); sAh.set(L ? L.ah.toFixed(2) + " Ah" : "–"); sWh.set(L ? L.wh.toFixed(2) + " Wh" : "–");
        sUse.set(String(n.uses)); sBuy.set(String(n.uses === 0 ? 0 : c.re ? 1 + Math.floor((n.uses - 1) / c.life) : n.uses)); sTot.set(n.uses ? hrs(n.hours) : "–");
      };
      const say = () => {
        const L = last[chem], c = CELLS[chem];
        if (!L) { status.innerHTML = "Press <b>Run the device</b>."; return; }
        const frac = L.ah / c.cap;
        status.innerHTML = L.hours === 0 ? `The device would not even start: after ${shelf} months on the shelf this ${c.name} cell is below the cut-off.`
          : `${c.name}: ${hrs(L.hours)}, ${fmt.pct(frac)} of its ${c.cap.toFixed(1)} Ah rating reached the device.` + (c.re ? ` Recharged and ready again (cycle ${cnt[chem].uses}; capacity now ${fmt.pct(fade(c, cnt[chem].uses))} of new).` : " That cell is now waste: the next run needs a new one.");
      };
      function run(nTimes) {
        if (timer) { clearTimeout(timer); timer = null; }
        const n = cnt[chem];
        for (let i = 0; i < nTimes; i++) { const r = simulate(chem, n.uses); n.uses++; n.hours += r.hours; last[chem] = r; }
        stats(); say();
        if (nTimes > 1) { draw(); return; }
        const total = last[chem].pts.length; let k = 0;
        const tick = () => { k += Math.max(4, Math.ceil(total / 60)); draw(Math.min(k, total)); timer = k < total ? setTimeout(tick, 16) : null; };
        tick();
      }
      const change = () => { if (timer) { clearTimeout(timer); timer = null; } resetCounts(); setAxes(); draw(); stats(); say(); };
      el.append(widget("AA shoot-out (simplified model, typical figures)",
        toggle("cell:", Object.keys(CELLS).map((k) => [k, CELLS[k].name]), chem, (k) => { chem = k; if (timer) { clearTimeout(timer); timer = null; } draw(); stats(); say(); }),
        toggle("device:", Object.keys(DEV).map((k) => [k, DEV[k].name]), dev, (k) => { dev = k; change(); }),
        slider({ name: "months in a drawer before each run", nameWidth: 150, min: 0, max: 12, step: 1, value: 0, fmtv: (x) => x + " mo", oninput: (v) => { shelf = v; change(); } }),
        h("div", { class: "btns" },
          h("button", { class: "primary", onclick: () => run(1) }, "Run the device"),
          h("button", { onclick: () => run(100) }, "Run it 100 more times"),
          h("button", { onclick: change }, "Reset")),
        pl, h("div", { class: "readout" }, sRun, sAh, sWh, sUse, sBuy, sTot), status));
      setAxes(); draw(); stats(); say();
      el.append(
        P("Things to try, each from an earlier step:"),
        h("ul", {},
          h("li", { html: "<b>Torch, each cell once.</b> The two nickel curves are flat and the alkaline one slides (<b>step 4</b>). Dashed lines keep the other cells' last runs for comparison." }),
          h("li", { html: "<b>Camera flash.</b> The alkaline cell holds the most charge on paper, yet delivers a small part of it before the cut-off. The nickel cells hardly notice the load." }),
          h("li", { html: "<b>Radio, then 6 months in the drawer.</b> Now the alkaline cell wins easily: classic NiMH has lost most of its charge to self-discharge (<b>step 8</b>)." }),
          h("li", { html: "<b>Run it 100 more times</b>, several times over. Count the cells bought, and watch the NiMH capacity creep down toward 80% (<b>step 8</b>). NiCd fades more slowly but starts with less than half the charge (<b>step 7</b>)." }),
          h("li", { html: `<b>Read the energy.</b> Watt-hours are charge × voltage (<em>Charge, energy and capacity</em>): a 2.0 Ah cell at about 1.2 V gives about 2.4 Wh.` })),
        takeaway(`Nickel cells: a solid that flips between Ni +3 and Ni +2, a partner that gives electrons in KOH, an electrolyte that is only borrowed, and a flat 1.2 V. The next lesson replaces the shuttling hydrogen with lithium and leaves water behind.`)
      );
      return () => { if (timer) clearTimeout(timer); };
    },
  });

  Course.run({
    id: "nickel-batteries",
    section: "3. Batteries, element by element",
    title: "Nickel: NiCd and NiMH",
    concepts: {
      nioh: "nickel oxyhydroxide electrode", nicd: "NiCd cell", koh: "electrolyte not consumed (KOH)", flat: "flat discharge curve",
      memory: "memory effect", mh: "metal hydride (hydrogen storage alloy)", nimh: "NiMH cell", selfd: "self-discharge", cycle: "cycle life",
      nife: "nickel–iron (Edison) cell", nih2: "nickel–hydrogen cell",
    },
    sources: [
      { title: "OpenStax Chemistry 2e, 17.5 Batteries and Fuel Cells", url: "https://openstax.org/books/chemistry-2e/pages/17-5-batteries-and-fuel-cells", note: "NiCd half-reactions in base, about 1.2 V, rechargeable (secondary) cells" },
      { title: "Wikipedia: Nickel–cadmium battery", url: "https://en.wikipedia.org/wiki/Nickel%E2%80%93cadmium_battery", note: "Jungner 1899; 40–60 Wh/kg; about 10% self-discharge a month; memory effect and voltage depression; EU directive 2006/66/EC, power-tool exemption ended 2016" },
      { title: "Wikipedia: Nickel–metal hydride battery", url: "https://en.wikipedia.org/wiki/Nickel%E2%80%93metal_hydride_battery", note: "electrode reactions; consumer cells 1989; AA capacities; self-discharge figures; low-self-discharge cells (2005) keeping 70–85% after a year; about 3× faster self-discharge at 45 °C" },
      { title: "Wikipedia: Nickel–iron battery", url: "https://en.wikipedia.org/wiki/Nickel%E2%80%93iron_battery", note: "Edison 1901; 19–25 Wh/kg; 20–30% self-discharge a month; charge efficiency below 65%; hydrogen evolution" },
      { title: "Wikipedia: Nickel–hydrogen battery", url: "https://en.wikipedia.org/wiki/Nickel%E2%80%93hydrogen_battery", note: "hydrogen stored at up to about 83 bar; 20 000+ cycles; first flown 1977; Hubble's original batteries replaced in 2009" },
      { title: "Wikipedia: Memory effect", url: "https://en.wikipedia.org/wiki/Memory_effect", note: "true memory effect vs voltage depression; how deep cycling restores the cell" },
      { title: "Energizer E91 (alkaline AA) product data sheet", url: "https://data.energizer.com/pdfs/e91.pdf", note: "how an alkaline AA cell's delivered capacity collapses at high current: basis of the capstone's alkaline model" },
    ],
    steps,
  });
})();
