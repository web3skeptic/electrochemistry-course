// Lesson 4.2 — Hydrogen and fuel cells
(function () {
  const { h, s, fmt, widget, stat, slider, toggle, plot, hbars, rng } = Course;
  const f = Chem.f, F = Chem.F;
  const YEL = "#ffd166", RED = "#ff6b6b", BLUE = "#6cb4ff", GRN = "#5fd38d", PUR = "#c3a6ff", MUTED = "#9aa3b5", TEXT = "#e6e9ef", DARK = "#12151c", OXY = "#c9cfdb";
  const P = (html) => h("p", { html });
  const takeaway = (html) => h("div", { class: "takeaway", html });
  const formula = (html) => h("div", { class: "formula", style: "font-family:inherit", html });
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // ---- numbers (all derived from Chem where it has them) ----
  const E_ID = Chem.E0by.O2.E - Chem.E0by.H.E;                 // 1.23 V, ideal H2/O2 cell
  const M_H2 = 2 * Chem.elements.H.mass;                       // 2.016 g/mol
  const M_ZN = Chem.elements.Zn.mass;
  const DG = (2 * F * E_ID) / 1000;                            // 237 kJ of electrical work per mol H2 (ΔG = −nFE)
  const DH = 285.8;                                            // kJ of heat per mol H2 burned to liquid water (standard enthalpy of formation of H2O(l))
  const E_TN = (DH * 1000) / (2 * F);                          // 1.48 V: the voltage if all of DH came out as electricity
  const KWH_KG = DH / M_H2 / 3.6;                              // 39.4 kWh per kg of hydrogen (liquid-water basis)
  const AH = (mol) => (mol * 2 * F) / 3600;                    // Ah carried by `mol` of H2 (or of Zn): 2 electrons each

  // ---- polarisation model (simplified textbook form, typical PEM-cell parameters; i in A/cm²) ----
  //   V = 1.23 − A·ln((i + i_leak)/i0) − R·i + B·ln(1 − i/iL)
  const PM = { A: 0.03, B: 0.05, leak: 0.003 };
  const BASE = { i0: 1e-6, R: 0.07, iL: 1.6, act: true, ohm: true, conc: true };
  function cellV(i, o) {
    const act = o.act ? Math.max(0, PM.A * Math.log((i + PM.leak) / o.i0)) : 0;
    const ohm = o.ohm ? o.R * i : 0;
    let conc = o.conc ? (i < o.iL ? -PM.B * Math.log(1 - i / o.iL) : Infinity) : 0;
    const a = Math.min(act, E_ID), b = Math.min(ohm, E_ID - a);
    conc = Math.min(conc, E_ID - a - b);
    return { act: a, ohm: b, conc, V: Math.max(0, E_ID - a - b - conc) };
  }

  const style = h("style", {}, `
    .fc-legend { display:flex; flex-wrap:wrap; gap:4px 14px; margin-top:8px; font-size:13px; }
    .fc-legend i { display:inline-block; width:10px; height:10px; border-radius:50%; margin-right:5px; }
    .fc-status { min-height:44px; margin-top:10px; padding:8px 12px; border-left:3px solid var(--blue); background:var(--panel2); border-radius:6px; font-size:15px; }
    .fc-split { display:flex; height:30px; border-radius:6px; overflow:hidden; margin:10px 0 4px; font-size:13px; font-weight:600; color:#12151c; }
    .fc-split > div { display:flex; align-items:center; justify-content:center; white-space:nowrap; overflow:hidden; transition:width .15s; }
    .fc-info td:first-child { color:var(--muted); white-space:nowrap; }
    .fc-info td { vertical-align:top; }
    .fc-sub { font-size:14px; color:var(--muted); margin:14px 0 2px; }
  `);
  document.head.append(style);
  const legend = (items) => h("div", { class: "note fc-legend", html: items.map(([c, t]) => `<span><i style="background:${c}"></i>${t}</span>`).join("") });
  const LEG = { h2: [GRN, "hydrogen (H₂ = two joined dots)"], o2: [OXY, "oxygen (O₂)"], e: [YEL, "electron"], cat: [RED, "positive ion"], an: [BLUE, "negative ion"] };

  function T(g, x, y, str, a = {}) {
    const t = s("text", { x, y, "text-anchor": a.anchor || "middle", style: `font-size:${a.size || 12}px;fill:${a.fill || TEXT};font-weight:${a.weight || 400}` });
    t.textContent = str; g.append(t); return t;
  }
  const rect = (g, x, y, w, hh, a) => { const r = s("rect", Object.assign({ x, y, width: Math.max(0, w), height: Math.max(0, hh) }, a)); g.append(r); return r; };
  const line = (g, x1, y1, x2, y2, a) => { const l = s("line", Object.assign({ x1, y1, x2, y2, stroke: "#b9c2d3", "stroke-width": 2, "stroke-linecap": "round" }, a)); g.append(l); return l; };

  // particle shapes shared by the drawings
  function shape(kind) {
    const g = s("g");
    const c = (cx, cy, r, fill) => g.append(s("circle", { cx, cy, r, fill, stroke: DARK, "stroke-width": 0.5 }));
    const t = (str, size) => { const e = s("text", { "text-anchor": "middle", dy: "0.35em", style: `font-size:${size}px;font-weight:700;fill:${DARK}` }); e.textContent = str; g.append(e); };
    if (kind === "H2") { c(-3.3, 0, 3.8, GRN); c(3.3, 0, 3.8, GRN); }
    else if (kind === "O2") { c(-4.6, 0, 5.6, OXY); c(4.6, 0, 5.6, OXY); }
    else if (kind === "H2O") { c(-4.6, 3.2, 3, GRN); c(4.6, 3.2, 3, GRN); c(0, -1, 5.2, OXY); }
    else if (kind === "Hp") { c(0, 0, 4.8, RED); t("+", 8); }
    else if (kind === "OH") { c(0, 0, 7.4, BLUE); t("OH⁻", 6); }
    else if (kind === "O2m") { c(0, 0, 7.4, BLUE); t("O²⁻", 6); }
    else c(0, 0, 3.4, YEL);
    return g;
  }
  // a tiny particle engine: particles walk along waypoints, then call back
  function engine(layers) {
    let parts = [];
    const place = (p) => p.g.setAttribute("transform", `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})`);
    const en = {
      get n() { return parts.length; },
      add(kind, x, y, path, speed, cb) {
        const p = { kind, x, y, path: path.slice(), speed, cb, g: shape(kind) };
        (kind === "e" ? layers.e : layers.ion).append(p.g); parts.push(p); place(p); return p;
      },
      kill(p) { p.dead = true; p.g.remove(); },
      clear() { parts.forEach((p) => { p.dead = true; p.g.remove(); }); parts = []; },
      tick() {
        for (const p of parts.slice()) {
          if (p.dead || !p.path.length) continue;
          const [tx, ty] = p.path[0], dx = tx - p.x, dy = ty - p.y, d = Math.hypot(dx, dy);
          if (d <= p.speed) { p.x = tx; p.y = ty; p.path.shift(); if (!p.path.length && p.cb) { const cb = p.cb; p.cb = null; cb(p); } }
          else { p.x += (dx / d) * p.speed; p.y += (dy / d) * p.speed; }
          if (!p.dead) place(p);
        }
        parts = parts.filter((p) => !p.dead);
      },
    };
    return en;
  }

  // =====================================================================================
  // The fuel-cell drawing: hydrogen channel | anode | electrolyte | cathode | oxygen channel,
  // with a wire and a bulb on top. Three electrolyte types, which differ in the ion that crosses.
  // =====================================================================================
  const TYPES = {
    acid: { tint: BLUE, top: "membrane: only H⁺ gets through", arrow: "H⁺ →", acol: RED },
    alk: { tint: PUR, top: "KOH solution: OH⁻ carries the charge", arrow: "← OH⁻", acol: BLUE },
    sofc: { tint: "#e9ecf2", top: "hot ceramic: O²⁻ hops through", arrow: "← O²⁻", acol: BLUE },
  };
  function makeFC(o = {}) {
    const W = 400, H = 246, XA0 = 112, XA1 = 134, XC0 = 266, XC1 = 288, YT = 74, YB = 204, XA = 123, XC = 277, WY = 30;
    const svg = s("svg", { viewBox: `0 0 ${W} ${H}`, width: "100%", style: "display:block;margin:0 auto;max-width:600px" });
    const gBg = s("g"), gIon = s("g"), gEl = s("g"), gE = s("g"), gTx = s("g");
    svg.append(gBg, gIon, gEl, gE, gTx);
    const rnd = rng(o.seed || 5), en = engine({ ion: gIon, e: gE });
    const fc = { svg, type: o.type || "acid", c: { h2: 0, o2: 0, e: 0, w: 0 }, onCount: o.onCount, auto: false, waiting: 0 };
    let parked = { hp: [], ee: [], o2: null, ready: false }, busy = false, glow = 0, autoT = 0, bulb = null, elRect = null, tTop = null, tArrow = null;
    const emit = () => { fc.waiting = parked.hp.length; fc.onCount && fc.onCount(fc.c, fc); };
    const cy = (y) => clamp(y, YT + 9, YB - 9);

    (function draw() {
      rect(gBg, 22, YT, 90, YB - YT, { fill: GRN, opacity: 0.07 });
      rect(gBg, XC1, YT, 90, YB - YT, { fill: "#9fb4d6", opacity: 0.08 });
      elRect = rect(gBg, XA1, YT, XC0 - XA1, YB - YT, { fill: BLUE, opacity: 0.14 });
      rect(gBg, 22, YT, 356, YB - YT, { fill: "none", stroke: "#6b7689", "stroke-width": 1.5, rx: 3 });
      for (const x of [XA0, XC0]) {
        rect(gEl, x, YT, 22, YB - YT, { fill: "#4b5463" });
        for (let y = YT + 7; y < YB; y += 9) for (const dx of [3, 19]) gEl.append(s("circle", { cx: x + dx, cy: y, r: 1.7, fill: "#e9ecf2", opacity: 0.85 }));
      }
      line(gEl, XA, YT, XA, WY); line(gEl, XC, YT, XC, WY); line(gEl, XA, WY, XC, WY);
      bulb = s("circle", { cx: 200, cy: WY, r: 10, fill: YEL, "fill-opacity": 0.08, stroke: "#b9c2d3", "stroke-width": 1.5 }); gEl.append(bulb);
      T(gTx, 200, 13, "e⁻ →", { fill: YEL, weight: 600 });
      T(gTx, 67, YT - 8, "H₂ in", { size: 12, fill: GRN, weight: 600 });
      T(gTx, 333, YT - 8, "O₂ in (air)", { size: 12, fill: OXY, weight: 600 });
      T(gTx, XA, 220, "anode (−)", { size: 12, weight: 600 }); T(gTx, XA, 236, "oxidation", { size: 11.5, fill: MUTED });
      T(gTx, XC, 220, "cathode (+)", { size: 12, weight: 600 }); T(gTx, XC, 236, "reduction", { size: 11.5, fill: MUTED });
      tArrow = T(gTx, 200, 222, "", { size: 13, weight: 700 });
      tTop = T(gTx, 200, YT - 8, "", { size: 0 });
    })();
    function restyle() {
      const t = TYPES[fc.type];
      elRect.setAttribute("fill", t.tint);
      tArrow.textContent = t.arrow; tArrow.style.fill = t.acol;
    }
    function ensureO2() {
      if (parked.o2) return;
      const y = 104 + rnd() * 70;
      parked.ready = false;
      parked.o2 = en.add("O2", 372, y, [[XC1 + 13, y]], 1.6, () => { parked.ready = true; tryWater(); });
    }
    function tryWater() {
      if (!(parked.o2 && parked.ready && parked.hp.length >= 4 && parked.ee.length >= 4)) return;
      const y = parked.o2.y;
      parked.hp.splice(0, 4).forEach(en.kill); parked.ee.splice(0, 4).forEach(en.kill); en.kill(parked.o2); parked.o2 = null;
      fc.c.o2++; fc.c.w += 2;
      [-9, 9].forEach((dy) => en.add("H2O", XC1 + 13, cy(y + dy), [[336, cy(y + dy + 14)], [372, 196]], 1.2, en.kill));
      emit(); ensureO2();
    }
    // acid cell: one H2 at a time, so the learner can count
    fc.feed = () => {
      if (fc.type !== "acid") return fc.cycle();
      ensureO2();
      const y = 92 + rnd() * 94;
      en.add("H2", 28, y, [[XA0 - 8, y]], 1.6, (p) => {
        en.kill(p); fc.c.h2++; emit();
        [-6, 6].forEach((dy) => {
          const yy = cy(y + dy);
          en.add("Hp", XA1 + 6, yy, [[XC0 - 6, yy]], 1.5, (q) => { parked.hp.push(q); emit(); tryWater(); });
          en.add("e", XA, yy, [[XA, WY], [XC, WY], [XC, yy]], 5, (q) => { parked.ee.push(q); fc.c.e++; glow = 1; emit(); tryWater(); });
        });
      });
    };
    // alkaline / solid-oxide: one whole round 2H2 + O2 → 2H2O
    fc.cycle = () => {
      if (fc.type === "acid") { fc.feed(); return; }
      if (busy) return; busy = true;
      const alk = fc.type === "alk";
      let n = 0, m = 0;
      const arrived = () => { if (++n === 3) fire(); };
      const h2 = [112, 164].map((y) => en.add("H2", 28, y, [[XA0 - 8, y]], 1.6, arrived));
      const o2 = en.add("O2", 372, 138, [[XC1 + 13, 138]], 1.6, arrived);
      function fire() {
        en.kill(o2); fc.c.o2++; emit();
        const ys = alk ? [98, 124, 150, 176] : [118, 156];
        ys.forEach((y) => en.add(alk ? "OH" : "O2m", XC0 - 9, y, [[XA1 + 9, y]], 1.4, (q) => { en.kill(q); if (++m === ys.length) water(); }));
        [96, 122, 148, 174].forEach((y) => en.add("e", XA, y, [[XA, WY], [XC, WY], [XC, y]], 5, (q) => { en.kill(q); fc.c.e++; glow = 1; emit(); }));
      }
      function water() {
        h2.forEach(en.kill); fc.c.h2 += 2; fc.c.w += 2;
        [118, 158].forEach((y) => en.add("H2O", XA0 - 11, y, [[62, y + 12], [28, 196]], 1.2, en.kill));
        if (alk) [108, 168].forEach((y) => { const p = en.add("H2O", XA1 + 9, y, [[XC0 - 9, y]], 1.7, en.kill); p.g.setAttribute("opacity", 0.5); });
        emit(); busy = false;
      }
    };
    fc.reset = () => { en.clear(); parked = { hp: [], ee: [], o2: null, ready: false }; busy = false; fc.c = { h2: 0, o2: 0, e: 0, w: 0 }; glow = 0; emit(); if (fc.type === "acid") ensureO2(); };
    fc.setType = (t) => { fc.type = t; restyle(); fc.reset(); };
    fc.tick = () => {
      en.tick();
      glow = Math.max(0, glow - 0.02); bulb.setAttribute("fill-opacity", (0.08 + 0.92 * glow).toFixed(2));
      if (fc.auto) {
        if (fc.type === "acid") { if (++autoT >= 38 && en.n < 40) { autoT = 0; fc.feed(); } }
        else fc.cycle();
      }
    };
    restyle(); if (fc.type === "acid") ensureO2();
    return fc;
  }

  const steps = [];

  // ---------------------------------------------------------------- 1
  steps.push({
    title: "A cell that is fed instead of used up",
    short: "A cell that is fed",
    newConcepts: ["fuelcell"],
    render(el) {
      el.append(
        P("Every cell so far carried its reactants inside. The <em>Daniell cell</em> (from <em>The galvanic cell</em>) dissolves its zinc anode, and in <em>Charge, energy and capacity</em> you counted what a 6.54 g zinc strip holds: 0.200 mol of electrons, <b>5.36 Ah</b>. When the zinc is gone the cell is finished."),
        P("Now change one thing. Keep the galvanic cell, but make both reactants <b>gases that flow in from outside</b>: hydrogen from a tank on one side, oxygen from the air on the other. The electrodes are no longer eaten. They are just the surfaces where the gases react."),
        P("That device is a <b>fuel cell</b>: a galvanic cell that is fed instead of discharged. Below, both cells drive the same bulb. The tank holds 0.20 g of hydrogen, which happens to carry exactly as many electrons as the zinc strip. Run them, then try the valve and the refill button.")
      );
      const svg = s("svg", { viewBox: "0 0 400 178", width: "100%", style: "display:block;margin:0 auto;max-width:600px" });
      const g = s("g"); svg.append(g);
      T(g, 100, 14, "Daniell cell: sealed", { weight: 600 });
      T(g, 300, 14, "Fuel cell: fed from a tank", { weight: 600 });
      // Daniell
      line(g, 75, 62, 75, 38); line(g, 125, 62, 125, 38); line(g, 75, 38, 125, 38);
      const bulbZ = s("circle", { cx: 100, cy: 38, r: 9, fill: YEL, "fill-opacity": 0.08, stroke: "#b9c2d3", "stroke-width": 1.5 }); g.append(bulbZ);
      rect(g, 50, 70, 100, 70, { fill: BLUE, opacity: 0.1 });
      g.append(s("path", { d: "M50 60 V140 H150 V60", fill: "none", stroke: "#6b7689", "stroke-width": 2 }));
      const zn = rect(g, 66, 58, 18, 74, { fill: "#aeb9c9", rx: 1.5 });
      const cu = rect(g, 116, 58, 18, 74, { fill: "#d18a52", rx: 1.5 });
      T(g, 75, 154, "Zn", { size: 12, fill: MUTED }); T(g, 125, 154, "Cu", { size: 12, fill: MUTED });
      const tZ = T(g, 100, 172, "", { size: 12 });
      // fuel cell
      rect(g, 222, 56, 44, 84, { fill: "none", stroke: "#6b7689", "stroke-width": 2, rx: 12 });
      const lvl = rect(g, 225, 59, 38, 78, { fill: GRN, opacity: 0.45, rx: 9 });
      T(g, 244, 154, "H₂ tank", { size: 12, fill: MUTED });
      line(g, 266, 98, 300, 98, { "stroke-width": 3 });
      const valve = s("circle", { cx: 283, cy: 98, r: 6.5, fill: GRN, stroke: DARK, "stroke-width": 1 }); g.append(valve);
      rect(g, 300, 62, 12, 76, { fill: "#4b5463" }); rect(g, 312, 62, 18, 76, { fill: BLUE, opacity: 0.25 }); rect(g, 330, 62, 12, 76, { fill: "#4b5463" });
      line(g, 306, 62, 306, 38); line(g, 336, 62, 336, 38); line(g, 306, 38, 336, 38);
      const bulbF = s("circle", { cx: 321, cy: 38, r: 9, fill: YEL, "fill-opacity": 0.08, stroke: "#b9c2d3", "stroke-width": 1.5 }); g.append(bulbF);
      T(g, 372, 94, "O₂", { size: 12, fill: OXY, weight: 600 }); T(g, 372, 108, "← air", { size: 11, fill: MUTED });
      T(g, 321, 154, "cell", { size: 12, fill: MUTED });
      const tF = T(g, 300, 172, "", { size: 12 });

      const CAP = 0.1; // mol of Zn in the strip = mol of H2 in a full tank
      let znMol = CAP, tank = CAP, qZ = 0, qF = 0, running = false, open = true;
      const sZ = stat("Daniell cell delivered", "b"), sF = stat("fuel cell delivered", "g");
      const status = h("div", { class: "fc-status" });
      const runBtn = h("button", { class: "primary", onclick: () => { running = !running; draw(); } }, "Run both cells");
      const valveTg = toggle("hydrogen valve", [["open", "open"], ["closed", "closed"]], "open", (v) => { open = v === "open"; draw(); });
      function draw() {
        const fz = znMol / CAP;
        zn.setAttribute("width", (2 + 16 * fz).toFixed(1)); zn.setAttribute("x", (75 - (2 + 16 * fz) / 2).toFixed(1));
        cu.setAttribute("width", (18 + 8 * (1 - fz)).toFixed(1)); cu.setAttribute("x", (125 - (18 + 8 * (1 - fz)) / 2).toFixed(1));
        const ft = tank / CAP;
        lvl.setAttribute("y", (59 + 78 * (1 - ft)).toFixed(1)); lvl.setAttribute("height", (78 * ft).toFixed(1));
        valve.setAttribute("fill", open ? GRN : RED);
        const zOn = running && znMol > 0, fOn = running && open && tank > 0;
        bulbZ.setAttribute("fill-opacity", zOn ? 0.95 : 0.08); bulbF.setAttribute("fill-opacity", fOn ? 0.95 : 0.08);
        tZ.textContent = `zinc left: ${fmt.n(znMol * M_ZN, 2)} g`; tF.textContent = `H₂ in tank: ${fmt.n(tank * M_H2, 2)} g`;
        sZ.set(fmt.n(qZ, 2) + " Ah"); sF.set(fmt.n(qF, 2) + " Ah");
        runBtn.textContent = running ? "Pause" : "Run both cells";
        status.innerHTML = !running ? "Paused. Both cells are ready to push electrons through their bulbs."
          : znMol <= 0 && fOn ? `The zinc strip is gone after ${fmt.n(AH(CAP), 2)} Ah: the Daniell cell is dead. The fuel cell's electrodes look exactly as they did at the start.`
          : !open ? "Valve closed: no hydrogen reaches the electrode, and the current stops at once. Nothing is stored inside the cell itself."
          : tank <= 0 ? "Tank empty. The fuel cell is not worn out, only hungry: press <em>Refill</em>."
          : "Same current from both. The zinc strip thins; in the fuel cell only the tank level drops.";
      }
      const timer = setInterval(() => {
        if (!running) return;
        const dMol = (0.06 * 3600) / (2 * F); // 0.06 Ah per tick
        if (znMol > 0) { const d = Math.min(dMol, znMol); znMol -= d; qZ += AH(d); }
        if (open && tank > 0) { const d = Math.min(dMol, tank); tank -= d; qF += AH(d); }
        draw();
      }, 100);
      el.append(widget("Same bulb, same current, two kinds of cell",
        svg, h("div", { class: "readout" }, sZ, sF),
        h("div", { class: "btns" }, runBtn,
          h("button", { onclick: () => { tank = CAP; draw(); } }, "Refill the tank"),
          h("button", { onclick: () => { znMol = CAP; tank = CAP; qZ = 0; qF = 0; running = false; draw(); } }, "Reset")),
        valveTg, status));
      draw();
      el.append(
        P("The Daniell cell is both the engine and the fuel tank, so its size fixes its charge. In a fuel cell the two are separate: <b>the cell sets how fast you can draw current, the tank sets how long.</b>"),
        takeaway("A fuel cell is a galvanic cell whose reactants are fed in from outside. Its electrodes are not consumed, so it runs for as long as it is supplied.")
      );
      return () => clearInterval(timer);
    },
    check: {
      type: "choice",
      q: "A fuel cell has delivered 5.36 Ah and is still running. What has changed inside its electrodes?",
      options: ["Nothing: they are only the surface where the gases react; the electrons came from hydrogen out of the tank", "The anode has lost 6.54 g, like the zinc strip", "They now hold 5.36 Ah less stored charge than before"],
      answer: 0,
      wrongHints: { 1: "That is the Daniell cell, whose anode is the reactant. In a fuel cell the reactant is the gas, not the electrode.", 2: "A fuel cell stores nothing. Close the valve in the widget and watch how quickly the current stops." },
      why: "Nothing. The hydrogen was the reactant; the electrodes are just the place where it reacts.",
    },
  });

  // ---------------------------------------------------------------- 2
  steps.push({
    title: "Water electrolysis, run backwards",
    short: "Electrolysis in reverse",
    newConcepts: ["hor", "orr"],
    render(el) {
      el.append(
        P(`In <em>Electrolysis</em> you forced current through water and split it, ${f("2H2O -> 2H2 + O2")}, paying at least 1.23 V. Play that film backwards. Hydrogen and oxygen <em>want</em> to become water: the reverse reaction is <em>spontaneous</em> (downhill, from <em>The activity series</em>). A fuel cell keeps the two gases apart, so the electrons have to take the wire. William Grove built the first one in 1839.`),
        P("At the hydrogen electrode each molecule gives up two electrons and leaves as two H⁺ ions. Hydrogen's <em>oxidation number</em> goes 0 → +1: oxidation, so this is the <em>anode</em>, the (−) terminal."),
        formula(`<span class="bl">hydrogen oxidation:</span> ${f("H2 -> 2H^+ + 2e-")}`),
        P("The H⁺ ions cross the acid electrolyte, the electrons go round through the wire, and both meet oxygen at the other electrode. Oxygen goes 0 → −2: reduction, the <em>cathode</em>, (+)."),
        formula(`<span class="hl">oxygen reduction:</span> ${f("O2 + 4H^+ + 4e- -> 2H2O")}`),
        P("One O₂ needs <b>four</b> electrons, one H₂ supplies only two. Send hydrogen in one molecule at a time and watch what the oxygen waits for.")
      );
      const sH = stat("H₂ used", "g"), sE = stat("e⁻ through the wire", "y"), sO = stat("O₂ used", ""), sW = stat("H₂O made", "b"), sQ = stat("H⁺ waiting at the cathode", "r");
      const fc = makeFC({ type: "acid", seed: 11, onCount: (c, me) => { sH.set(String(c.h2)); sE.set(String(c.e)); sO.set(String(c.o2)); sW.set(String(c.w)); sQ.set(String(me.waiting)); } });
      const runBtn = h("button", { onclick: () => { fc.auto = !fc.auto; runBtn.textContent = fc.auto ? "Pause the stream" : "Stream hydrogen"; } }, "Stream hydrogen");
      el.append(widget("A hydrogen–oxygen cell with an acid electrolyte",
        fc.svg, legend([LEG.h2, LEG.o2, LEG.e, [RED, "H⁺ ion"]]),
        h("div", { class: "btns" },
          h("button", { class: "primary", onclick: () => fc.feed() }, "Send in one H₂"), runBtn,
          h("button", { onclick: () => { fc.auto = false; runBtn.textContent = "Stream hydrogen"; fc.reset(); } }, "Reset")),
        h("div", { class: "readout" }, sH, sE, sO, sW, sQ)));
      fc.reset();
      const timer = setInterval(fc.tick, 30);
      el.append(
        P("Scale the hydrogen half by two so the electrons cancel (the <em>half-reaction method</em> from <em>Balancing redox equations</em>) and add:"),
        formula(`${f("2H2 + O2 -> 2H2O")}<small>4 electrons through the wire per O₂, 2 per H₂. The only exhaust is water.</small>`),
        takeaway("Anode (−): H₂ → 2H⁺ + 2e⁻. Cathode (+): O₂ + 4H⁺ + 4e⁻ → 2H₂O. Electrons take the wire, H⁺ takes the electrolyte, water comes out.")
      );
      return () => clearInterval(timer);
    },
    check: {
      type: "number", q: "A fuel cell has just made <b>6</b> water molecules. How many electrons went through the wire?",
      answer: 12, tolerance: 0, hint: "Each O₂ takes 4 electrons and gives 2 H₂O.", why: "12. Two electrons per water molecule: 6 H₂O needs 3 O₂, and 3 × 4 = 12 (or 6 H₂ × 2).",
    },
  });

  // ---------------------------------------------------------------- 3
  steps.push({
    title: "The ideal voltage: 1.23 V, and what a gram is worth",
    short: "Ideal voltage: 1.23 V",
    newConcepts: ["ideal"],
    render(el) {
      el.append(
        P("How hard does this cell push? Look both half-reactions up on the <em>potential ladder</em> (from <em>Electrode potentials</em>). The hydrogen electrode is a familiar rung: it <i>is</i> the <em>standard hydrogen electrode</em>, the zero of the whole scale, here simply run as an anode. Oxygen sits at +1.23 V."),
        formula(`E°cell = E°cathode − E°anode = <span class="hl">${fmt.n(Chem.E0by.O2.E)}</span> − <span class="bl">${fmt.n(Chem.E0by.H.E)}</span> = <b>${fmt.n(E_ID)} V</b>`),
        P("This is the <b>ideal voltage</b> of a hydrogen–oxygen cell, and the same 1.23 V that electrolysis had to pay. Because hydrogen is the zero, any oxidising agent you feed the cathode gives a cell voltage equal to its own E°. Try some."),
        P("Now the charge. Every H₂ gives 2 electrons and weighs almost nothing: 2.016 g per mole.")
      );
      // ladder
      const OX = [["O2", "oxygen"], ["Br2", "bromine"], ["Ag", "silver ions"], ["Cu", "copper ions"]];
      const svg = s("svg", { viewBox: "0 0 400 176", width: "100%", style: "display:block;margin:0 auto;max-width:600px" });
      const gS = s("g"), gD = s("g"); svg.append(gS, gD);
      const yOf = (E) => 20 + E * 116;
      const rungs = {};
      [["H", ""], ...OX].forEach(([id]) => {
        const c = Chem.E0by[id], y = yOf(c.E);
        const ln = line(gS, 172, y, 232, y, { stroke: MUTED, "stroke-width": 2 });
        const lab = T(gS, 166, y + 4.5, Chem.half(c), { anchor: "end", size: 13, fill: MUTED });
        const val = T(gS, 238, y + 4.5, (c.E > 0 ? "+" : "") + fmt.n(c.E) + " V", { anchor: "start", size: 13, fill: MUTED });
        rungs[id] = { ln, lab, val, y };
      });
      let ox = "O2", mol = 0.1;
      const sG = stat("hydrogen", "g"), sC = stat("charge", "y"), sV = stat("cell voltage", "b"), sW = stat("energy", "p"), sZ = stat("zinc for the same charge", "");
      const tb = h("table", { class: "small" });
      function draw() {
        const E = Chem.E0by[ox].E - Chem.E0by.H.E;
        for (const id in rungs) { const on = id === "H" || id === ox, r = rungs[id]; r.ln.setAttribute("stroke", on ? TEXT : "#4a5568"); r.lab.style.fill = on ? TEXT : "#667085"; r.val.style.fill = on ? TEXT : "#667085"; }
        gD.innerHTML = "";
        const y0 = rungs.H.y, y1 = rungs[ox].y;
        line(gD, 202, y0 + 3, 202, y1 - 4, { stroke: YEL, "stroke-width": 2.5 });
        gD.append(s("path", { d: `M196 ${y1 - 9} L202 ${y1 - 2} L208 ${y1 - 9}`, fill: "none", stroke: YEL, "stroke-width": 2.5, "stroke-linecap": "round" }));
        T(gD, 304, (y0 + y1) / 2 - 3, "electrons fall", { anchor: "start", size: 13, fill: YEL });
        T(gD, 304, (y0 + y1) / 2 + 15, fmt.n(E) + " V", { anchor: "start", size: 15, fill: YEL, weight: 700 });
        const molE = 2 * mol, C = molE * F, ah = C / 3600, wh = ah * E;
        sG.set(fmt.n(mol * M_H2, 2) + " g"); sC.set(fmt.n(ah, 2) + " Ah"); sV.set(fmt.n(E) + " V"); sW.set(fmt.n(wh, 1) + " Wh"); sZ.set(fmt.n(mol * M_ZN, 1) + " g");
        tb.innerHTML = "";
        [[`${fmt.n(mol, 2)} mol of H₂ weighs`, `${fmt.n(mol * M_H2, 3)} g`],
          ["× 2 electrons each", `${fmt.n(molE, 2)} mol e⁻`],
          ["× Faraday constant", `${Math.round(C).toLocaleString("en-US")} C`],
          ["÷ 3600", `${fmt.n(ah, 2)} Ah`],
          [`× ${fmt.n(E)} V`, `${fmt.n((C * E) / 1000, 1)} kJ = ${fmt.n(wh, 1)} Wh`]].forEach(([a, b]) => tb.append(h("tr", {}, h("td", {}, a), h("td", { class: "num" }, b))));
      }
      el.append(widget("Hydrogen at the anode, your choice at the cathode",
        svg, toggle("cathode is fed", OX.map(([id, nm]) => [id, nm]), ox, (v) => { ox = v; draw(); }),
        slider({ name: "mol H₂", min: 0.05, max: 1, step: 0.05, value: mol, fmtv: (x) => fmt.n(x, 2), oninput: (v) => { mol = v; draw(); } }),
        h("div", { class: "tablewrap", style: "margin-top:10px" }, tb),
        h("div", { class: "readout" }, sG, sC, sV, sW, sZ)));
      draw();
      el.append(
        P(`At 0.10 mol the charge is 5.36 Ah again: the same as the 6.54 g zinc strip, from <b>0.20 g</b> of hydrogen. As a <em>specific capacity</em> that is ${Math.round(Chem.capacity(2, M_H2)).toLocaleString("en-US")} mAh per gram of hydrogen against ${Math.round(Chem.capacity(2, M_ZN))} for zinc. And the oxygen is not carried at all: it comes from the air.`),
        P(`One mole of H₂ at the ideal voltage delivers ${f("2")} × ${F.toLocaleString("en-US")} C × 1.23 V. That is the <em>Gibbs energy</em>, ΔG° = −nFE°, from <em>Charge, energy and capacity</em>.`),
        takeaway("An ideal hydrogen–oxygen cell gives 1.23 V. Hydrogen carries 2 electrons per 2 grams, about 32 times more charge per gram than zinc.")
      );
    },
    check: {
      type: "number", q: "How much electrical energy can <b>1 mol</b> of H₂ deliver at the ideal 1.23 V? Answer in <b>kJ</b> (F = 96 485 C/mol).",
      answer: 237, tolerance: 2, hint: "Energy = charge × voltage, and 1 mol of H₂ moves 2 mol of electrons.", why: "2 × 96 485 C × 1.23 V = 237 000 J = 237 kJ. This is −ΔG° for making one mole of water.",
    },
  });

  // ---------------------------------------------------------------- 4
  steps.push({
    title: "Why nothing happens without platinum",
    short: "Catalyst and its surface",
    newConcepts: ["catalyst", "tpb"],
    render(el) {
      el.append(
        P("Mix hydrogen and oxygen in a jar at room temperature and nothing happens for years, although 237 kJ per mole is waiting to be released. Downhill is not enough. The two atoms of H₂ hold each other tightly, and so do the two atoms of O₂. Those bonds must be loosened first, and that costs energy before any is paid back: a <b>barrier</b> on the way down."),
        P("A <b>catalyst</b> is a surface that offers an easier route. On platinum, an H₂ molecule lands and its atoms let go of each other to hold on to the metal instead, ready to leave as H⁺. The catalyst is not used up, and it changes neither the start nor the end of the journey.")
      );
      // ---- widget A: the energy hill
      const W = 400, Hh = 200, X0 = 28, X1 = 372, YS = 118, YE = 172;
      const svg = s("svg", { viewBox: `0 0 ${W} ${Hh}`, width: "100%", style: "display:block;margin:0 auto;max-width:600px" });
      const gC = s("g"), gB = s("g"), gT = s("g"); svg.append(gC, gB, gT);
      let b = 9;
      const hump = () => 10 + 10 * b; // px
      const yAt = (x) => {
        const u = clamp((x - 120) / 170, 0, 1);
        return YS + (YE - YS) * (u * u * (3 - 2 * u)) - hump() * Math.pow(Math.sin(Math.PI * u), 2);
      };
      const curve = s("path", { fill: "none", stroke: BLUE, "stroke-width": 2.5 }); gC.append(curve);
      const tBar = T(gT, 205, 12, "", { size: 12, fill: BLUE });
      T(gT, 70, YS + 20, "H₂ + O₂", { size: 13 });
      T(gT, 332, YE + 20, "H₂O", { size: 13 });
      line(gT, 372, YS, 300, YS, { stroke: MUTED, "stroke-width": 1, "stroke-dasharray": "3 3" });
      line(gT, 380, YS + 2, 380, YE - 2, { stroke: YEL, "stroke-width": 2 });
      T(gT, 374, YS - 20, "drop: 237 kJ/mol", { anchor: "end", size: 12, fill: YEL });
      T(gT, 374, YS - 6, "= 1.23 V, fixed", { anchor: "end", size: 12, fill: YEL });
      const rnd = rng(3);
      const balls = Array.from({ length: 9 }, (_, i) => { const c = s("circle", { r: 4.5, fill: GRN, stroke: DARK, "stroke-width": 0.5 }); gB.append(c); return { c, x: 36 + i * 9.5, home: 36 + i * 9.5, st: "idle", t: 0 }; });
      let crossed = 0, recent = [];
      const sR = stat("crossings in the last 5 s", "g"), sD = stat("energy released per mol H₂", "y"), sV = stat("ideal voltage", "b");
      sD.set(fmt.n(DG, 0) + " kJ"); sV.set(fmt.n(E_ID) + " V");
      function drawCurve() {
        let d = ""; for (let x = X0; x <= X1; x += 4) d += (x === X0 ? "M" : "L") + x + "," + yAt(x).toFixed(1);
        curve.setAttribute("d", d);
        tBar.textContent = b >= 8 ? "barrier: far too high at room temperature" : b >= 4 ? "barrier: lower, a few get over" : "barrier: low, the reaction runs";
        tBar.setAttribute("y", clamp(YS - hump() - 8, 12, 100));
      }
      const setB = (v) => { b = v; bSl.set(v); pre.set(v === 9 ? 9 : v === 5 ? 5 : v === 1.5 ? 1.5 : -1); drawCurve(); };
      const bSl = slider({ name: "barrier", min: 1, max: 10, step: 0.5, value: b, fmtv: (x) => fmt.n(x, 1), oninput: (v) => { b = v; pre.set(-1); drawCurve(); } });
      const pre = toggle("electrode surface", [[9, "bare carbon"], [5, "nickel"], [1.5, "platinum"]], 9, setB);
      let tk = 0;
      const timerA = setInterval(() => {
        tk++;
        const p = 0.5 * Math.exp(-0.95 * b);
        balls.forEach((o) => {
          if (o.st === "idle") { o.x = o.home + Math.sin(tk / 5 + o.home) * 1.5; if (rnd() < p) o.st = "go"; }
          else if (o.st === "go") { o.x += 5; if (o.x >= 300 + (o.home - 36) * 0.7) { o.st = "done"; o.t = 0; crossed++; recent.push(tk); } }
          else if (++o.t > 30) { o.st = "idle"; o.x = o.home; }
          o.c.setAttribute("cx", o.x.toFixed(1)); o.c.setAttribute("cy", (yAt(o.x) - 6).toFixed(1));
          o.c.setAttribute("fill", o.st === "done" ? OXY : GRN);
        });
        recent = recent.filter((t) => tk - t < 125);
        sR.set(String(recent.length));
      }, 40);
      el.append(widget("The same hill, three surfaces (barrier heights are toy numbers)", svg, pre, bSl, h("div", { class: "readout" }, sR, sD, sV)));
      drawCurve();
      el.append(
        P("Lower the barrier and the reaction speeds up enormously. The drop on the right does not move: <b>a catalyst changes how fast, never how much.</b> No catalyst can lift the cell above 1.23 V."),
        P("Being a good surface is not enough, though. For H₂ → 2H⁺ + 2e⁻ to keep going at a platinum grain, three things must touch it at once: a <b>pore</b> that brings the gas, the <b>electrolyte</b> that carries the H⁺ away (<em>ionic conduction</em>), and <b>carbon</b> that carries the electrons to the wire (<em>electronic conduction</em>, both from <em>Ions, salts and electrolytes</em>). That meeting line is the <b>three-phase boundary</b>. Take one away:")
      );
      // ---- widget B: three-phase boundary
      const sv2 = s("svg", { viewBox: "0 0 400 170", width: "100%", style: "display:block;margin:0 auto;max-width:600px" });
      const gBg = s("g"), gIon = s("g"), gFx = s("g"), gE2 = s("g"), gTx = s("g"); sv2.append(gBg, gIon, gFx, gE2, gTx);
      const pore = rect(gBg, 0, 0, 190, 170, { fill: GRN, opacity: 0.06 });
      const carbon = s("path", { fill: "#4b5463" }); const lyte = s("path", { fill: BLUE, opacity: 0.28 }); gBg.append(carbon, lyte);
      gFx.append(s("circle", { cx: 190, cy: 85, r: 17, fill: "#e9ecf2", stroke: DARK, "stroke-width": 1 }));
      T(gFx, 190, 89.5, "Pt", { size: 13, fill: DARK, weight: 700 });
      const tPore = T(gTx, 78, 20, "", { size: 12, fill: GRN, weight: 600 });
      const tCar = T(gTx, 392, 20, "", { anchor: "end", size: 12, weight: 600 });
      const tLy = T(gTx, 392, 160, "", { anchor: "end", size: 12, fill: BLUE, weight: 600 });
      const en = engine({ ion: gIon, e: gE2 });
      const on = { gas: true, ion: true, el: true };
      let split = 0, tk2 = 0;
      const sS = stat("H₂ split at this grain", "g");
      const st2 = h("div", { class: "fc-status" });
      function draw2() {
        pore.setAttribute("fill", on.gas ? GRN : BLUE); pore.setAttribute("opacity", on.gas ? 0.06 : 0.3);
        tPore.textContent = on.gas ? "gas pore: H₂ arrives" : "pore flooded with water"; tPore.style.fill = on.gas ? GRN : BLUE;
        const xc = on.el ? 178 : 250, xl = on.ion ? 178 : 250;
        carbon.setAttribute("d", `M${xc} 0 H400 V78 H${xc + 26} Z`);
        lyte.setAttribute("d", `M${xl + 26} 92 H400 V170 H${xl} Z`);
        tCar.textContent = on.el ? "carbon: electrons → wire" : "carbon does not touch"; tCar.style.fill = on.el ? TEXT : RED;
        tLy.textContent = on.ion ? "electrolyte: H⁺ → cathode" : "electrolyte does not touch"; tLy.style.fill = on.ion ? BLUE : RED;
        st2.innerHTML = !on.gas ? "No gas reaches the platinum. This really happens: the water a cell makes can flood its own pores."
          : !on.ion && !on.el ? "The H₂ lands, but neither product can leave. The grain is dead weight."
          : !on.ion ? "The electrons could leave, but the H⁺ ions have nowhere to go. Positive charge would pile up on the grain, so the reaction stops at once."
          : !on.el ? "The H⁺ could leave, but the electrons are stranded on an island of platinum. Negative charge piles up and the reaction stops."
          : "All three meet here: gas in, H⁺ out through the electrolyte, electrons out through the carbon.";
        sS.set(String(split));
      }
      const timerB = setInterval(() => {
        en.tick(); tk2++;
        if (tk2 % 34 !== 1 || !on.gas || en.n > 30) return;
        const y = 60 + (tk2 % 3) * 25;
        en.add("H2", 10, y, [[166, 85]], 2.2, (p) => {
          if (on.ion && on.el) {
            en.kill(p); split++; sS.set(String(split));
            [-9, 9].forEach((d) => {
              en.add("Hp", 200, 100, [[230, 122 + d], [396, 132 + d]], 2, en.kill);
              en.add("e", 198, 72, [[230, 46 + d], [396, 38 + d]], 4, en.kill);
            });
          } else { p.path = [[60, y + 40], [10, y + 50]]; p.cb = en.kill; }
        });
      }, 30);
      const mk = (label, key) => toggle(label, [[1, "connected"], [0, "cut off"]], 1, (v) => { on[key] = !!v; draw2(); });
      el.append(widget("One grain of platinum, zoomed in (anode side)", sv2,
        mk("gas pore", "gas"), mk("electrolyte (ion path)", "ion"), mk("carbon (electron path)", "el"),
        h("div", { class: "readout" }, sS), st2));
      draw2();
      el.append(
        P("Platinum is rare and expensive, so real electrodes use it as specks a few nanometres wide, spread over porous carbon and soaked with electrolyte: as much three-phase boundary per gram as possible."),
        takeaway("A catalyst lowers the barrier, not the energy drop: faster, never more volts. It only works where gas, ion path and electron path all meet: the three-phase boundary.")
      );
      return () => { clearInterval(timerA); clearInterval(timerB); };
    },
    check: {
      type: "choice",
      q: "Someone invents a catalyst ten times better than platinum. What happens to the ideal voltage of the hydrogen–oxygen cell?",
      options: ["It stays 1.23 V: the catalyst changes the speed, not the energy drop", "It rises well above 1.23 V", "It falls, because an easier reaction releases less energy"],
      answer: 0,
      wrongHints: { 1: "Look at the right-hand drop in the hill widget while you change the barrier. Does it move?", 2: "The start (H₂ + O₂) and the end (H₂O) are the same substances whatever the route, so the energy between them is the same." },
      why: "1.23 V is set by where the reaction starts and ends. The catalyst only lowers the hill in between.",
    },
  });

  // ---------------------------------------------------------------- 5
  steps.push({
    title: "Three fuel cells: which ion crosses?",
    short: "Which ion crosses?",
    newConcepts: ["pem", "variants"],
    render(el) {
      el.append(
        P("The overall reaction is always 2H₂ + O₂ → 2H₂O, and the electrons always go anode → cathode through the wire. What differs between fuel-cell families is the <em>electrolyte</em>, and with it <b>the ion that closes the circuit inside</b>."),
        P("The cell you have used so far is the <b>proton-exchange membrane (PEM) cell</b>. Its electrolyte is a thin solid sheet that lets H⁺ through and blocks electrons and gas (H⁺ is a bare proton, hence the name). It runs warm, not hot, and starts in seconds: the choice for vehicles. The price is platinum on both electrodes."),
        P("Two other electrolytes move a <em>negative</em> ion the other way: hydroxide OH⁻ in an <b>alkaline</b> cell, oxide O²⁻ in a <b>solid-oxide</b> cell. Switch between them and watch three things: which ion moves, in which direction, and on which side the water appears.")
      );
      const INFO = {
        acid: { ion: f("H^+") + ", anode → cathode", an: "2H2 -> 4H^+ + 4e-", ca: "O2 + 4H^+ + 4e- -> 2H2O", water: "at the cathode (oxygen side)", el: "a solid membrane that conducts only H⁺", temp: "about 60–80 °C", cat: "platinum on both electrodes", use: "cars, buses, portable power",
          ev: `${fmt.n(Chem.E0by.O2.E)} − ${fmt.n(Chem.E0by.H.E)} = ${fmt.n(E_ID)} V` },
        alk: { ion: f("OH^-") + ", cathode → anode", an: "2H2 + 4OH^- -> 4H2O + 4e-", ca: "O2 + 2H2O + 4e- -> 4OH^-", water: "at the anode (hydrogen side); the cathode takes half of it back", el: "potassium hydroxide, KOH, dissolved in water", temp: "about 60–250 °C, depending on design", cat: "nickel or silver can do the job",
          use: "the Apollo and Space Shuttle spacecraft", ev: `${fmt.n(Chem.E0by["O2/OH"].E)} − (${fmt.n(Chem.E0by["H2O/H2"].E).replace("-", "−")}) = ${fmt.n(Chem.E0by["O2/OH"].E - Chem.E0by["H2O/H2"].E)} V` },
        sofc: { ion: f("O^2-") + ", cathode → anode", an: "2H2 + 2O^2- -> 2H2O + 4e-", ca: "O2 + 4e- -> 2O^2-", water: "at the anode (hydrogen side), as steam", el: `a ceramic: ${f("ZrO2")} with some ${f("Y2O3")} mixed in`, temp: "about 600–1000 °C", cat: "nickel anode, oxide cathode: no platinum",
          use: "stationary power plants", ev: "about 1.0 V (the ideal voltage is lower when this hot)" },
      };
      const tb = h("table", { class: "small fc-info" });
      const fc = makeFC({ type: "acid", seed: 23 });
      fc.auto = true;
      const sum = h("div", { class: "fc-status" });
      function show(t) {
        const I = INFO[t];
        tb.innerHTML = "";
        [["ion that crosses", I.ion], ["anode (−)", f(I.an)], ["cathode (+)", f(I.ca)], ["water appears", I.water], ["electrolyte", I.el], ["temperature", I.temp], ["catalyst", I.cat], ["ideal voltage", I.ev], ["used in", I.use]]
          .forEach(([a, b]) => tb.append(h("tr", {}, h("td", {}, a), h("td", {}, b))));
        sum.innerHTML = t === "acid" ? "Positive H⁺ moves <b>with</b> the electrons' direction of travel, anode → cathode, so it meets them again at the oxygen side. Water forms there."
          : t === "alk" ? "Oxygen picks up the electrons first and becomes OH⁻. The negative ion drifts back to the anode, where it meets hydrogen. Water forms on the hydrogen side."
          : "Oxygen becomes O²⁻ and hops through the hot ceramic from one empty oxygen seat to the next. Water forms on the hydrogen side.";
      }
      const tg = toggle("electrolyte", [["acid", "PEM (H⁺)"], ["alk", "alkaline (OH⁻)"], ["sofc", "solid oxide (O²⁻)"]], "acid", (t) => { fc.setType(t); show(t); });
      const runBtn = h("button", { onclick: () => { fc.auto = !fc.auto; runBtn.textContent = fc.auto ? "Pause" : "Run"; } }, "Pause");
      el.append(widget("Same gases, same wire, three electrolytes",
        tg, fc.svg, legend([LEG.h2, LEG.o2, LEG.e, LEG.cat, LEG.an]), h("div", { class: "btns" }, runBtn), sum,
        h("div", { class: "tablewrap", style: "margin-top:10px" }, tb)));
      show("acid");
      const timer = setInterval(fc.tick, 30);
      el.append(
        P("The pattern matches every cell since <em>The galvanic cell</em>: inside the cell, <b>cations drift toward the cathode and anions toward the anode</b>, so the charge that the electrons carry round the outside is carried back through the inside. The alkaline half-reactions are the acid ones rewritten with OH⁻ (<em>balancing in base</em>), and the two E° values from the table still differ by 1.23 V."),
        P("Each family pays for its ion. An alkaline cell is spoiled by the CO₂ in ordinary air, which reacts with the hydroxide, so Apollo carried pure oxygen (and the crew drank the water). Oxide ions only move through a ceramic that is glowing hot, which makes a solid-oxide cell slow to start but so fast at its electrodes that it needs no platinum."),
        takeaway("PEM: H⁺ crosses, anode → cathode, water at the cathode. Alkaline (OH⁻) and solid oxide (O²⁻): a negative ion crosses cathode → anode, water at the anode.")
      );
      return () => clearInterval(timer);
    },
    check: {
      type: "choice",
      q: "A new fuel cell has an electrolyte that carries only a <b>negative</b> ion, from the oxygen electrode to the hydrogen electrode. Where does the water form?",
      options: ["At the hydrogen electrode (the anode)", "At the oxygen electrode (the cathode)", "In the middle of the electrolyte"],
      answer: 0,
      wrongHints: { 1: "That is the PEM cell, where H⁺ travels to the oxygen. Here the oxygen travels (as an ion) to the hydrogen.", 2: "The ion reacts only where it can hand over electrons: at an electrode surface, not inside the electrolyte." },
      why: "The oxygen arrives at the anode inside the ion and meets hydrogen there, as in the alkaline and solid-oxide cells.",
    },
  });

  // ---------------------------------------------------------------- 6
  steps.push({
    title: "Why a real cell gives 0.7 V, not 1.23 V",
    short: "Real cells: about 0.7 V",
    newConcepts: ["overpotential", "polcurve"],
    render(el) {
      el.append(
        P("Connect a voltmeter to a working PEM cell and you read about 0.7 V. The missing half volt is the price of making the reaction run <i>fast</i>. Each electron still releases 1.23 V worth of energy, but part of it is spent inside the cell and comes out as heat. That lost voltage is called <b>overpotential</b>."),
        P("To compare cells of different sizes, current is counted per square centimetre of electrode: A/cm². Three losses grow with it:"),
        h("ul", {},
          h("li", { html: "<b>Slow reactions.</b> Oxygen reduction needs four electrons and a strong O=O bond broken; even on platinum it is sluggish. Some voltage is used up pushing it over its barrier. This loss appears at once, then grows slowly." }),
          h("li", { html: "<b>Ion traffic.</b> H⁺ has to be pushed through the membrane. Twice the current costs twice the push." }),
          h("li", { html: "<b>Gas starvation.</b> At high current the oxygen cannot reach the platinum as fast as it is consumed, and the voltage collapses." })),
        P("Plot voltage against current density and you get the cell's fingerprint, its <b>polarisation curve</b>. Switch the losses on and off to see which one shapes which part.")
      );
      const o = Object.assign({}, BASE);
      let cur = 0.6;
      const pl = plot({ xmin: 0, xmax: 1.6, ymin: 0, ymax: 1.3, height: 250, narrow: true, minFont: 10, xlabel: "current density (A/cm²)", ylabel: "cell voltage (V)", xticks: [0, 0.4, 0.8, 1.2, 1.6], yticks: [0, 0.2, 0.4, 0.6, 0.8, 1, 1.23] });
      const hb = hbars(["slow reactions", "ion traffic", "gas starvation", "<b>left for the wire</b>"], { max: E_ID, fmtv: (v) => fmt.n(v, 2) + " V", labelWidth: 130 });
      const sV = stat("cell voltage", "y"), sL = stat("lost as heat", "r");
      function draw() {
        pl.clear();
        const pts = []; for (let i = 0; i <= 1.6001; i += 0.01) pts.push([i, cellV(i, o).V]);
        pl.area(pts, RED, 0.16, E_ID);
        pl.hline(E_ID, MUTED, "ideal 1.23 V", { pos: "right", below: true });
        pl.line(pts, BLUE);
        const r = cellV(cur, o);
        pl.dot(cur, r.V, YEL, 5);
        hb.update([r.act, r.ohm, r.conc, r.V], [RED, RED, RED, YEL]);
        sV.set(fmt.n(r.V, 2) + " V"); sL.set(fmt.n(E_ID - r.V, 2) + " V");
      }
      const mk = (label, key) => toggle(label, [[1, "on"], [0, "off"]], 1, (v) => { o[key] = !!v; draw(); });
      el.append(widget("Polarisation curve of one PEM cell (simplified model, typical numbers)",
        pl, slider({ name: "A/cm²", min: 0, max: 1.6, step: 0.01, value: cur, fmtv: (x) => fmt.n(x, 2), oninput: (v) => { cur = v; draw(); } }),
        mk("slow reactions", "act"), mk("ion traffic", "ohm"), mk("gas starvation", "conc"),
        h("div", { class: "fc-sub" }, "Where the 1.23 V goes at this current (red area in the plot = heat):"), hb,
        h("div", { class: "readout" }, sV, sL)));
      draw();
      el.append(
        P("Notice the left end. Even at zero current the cell reads only about 1.0 V, because a trace of hydrogen leaks through the membrane and keeps the slow oxygen reaction busy. Then comes a long, gently sloping middle where cells are actually run, and a cliff at the right."),
        P("None of this breaks step 4. The catalyst cannot raise the 1.23 V ceiling; a better one makes the <i>slow reactions</i> bar shorter. (Voltage that depends on current is the subject of <em>Real batteries</em>; the same three losses appear there.)"),
        takeaway("Overpotential is voltage spent inside the cell to make the reactions and the ions move fast enough. The polarisation curve shows what is left: about 1.0 V at rest, about 0.7 V at work, then a cliff.")
      );
    },
    check: {
      type: "number", q: "At 1 A/cm² a cell loses <b>0.41 V</b> to slow reactions, <b>0.07 V</b> to ion traffic and <b>0.05 V</b> to gas starvation. What voltage does it deliver?",
      answer: 0.7, tolerance: 0.011, hint: "Start from the ideal 1.23 V and subtract every loss.", why: "1.23 − 0.41 − 0.07 − 0.05 = 0.70 V. The other 0.53 V per electron becomes heat.",
    },
  });

  // ---------------------------------------------------------------- 7
  steps.push({
    title: "Efficiency: volts are the score",
    short: "Efficiency vs an engine",
    newConcepts: ["efficiency", "carnot"],
    render(el) {
      el.append(
        P(`How good is 0.7 V? Burn one mole of hydrogen in a flame and you get <b>${fmt.n(DH, 0)} kJ</b>, all of it as heat. A fuel cell takes the same 2 mol of electrons per mole of H₂ whatever its voltage, so the electrical energy it delivers is simply charge × voltage (from <em>Charge, energy and capacity</em>):`),
        formula(`electricity per mol H₂ = 2 × F × V <small>at 1.23 V: ${fmt.n(DG, 0)} kJ · at 0.70 V: ${fmt.n((2 * F * 0.7) / 1000, 0)} kJ · the rest of the ${fmt.n(DH, 0)} kJ leaves as heat</small>`),
        P(`If the whole ${fmt.n(DH, 0)} kJ came out as electricity, the cell would read ${fmt.n(DH, 0)} 000 J ÷ (2 × 96 485 C) = <b>${fmt.n(E_TN)} V</b>. So the <b>efficiency</b> of a fuel cell can be read straight off a voltmeter:`),
        formula(`efficiency = <span class="hl">cell voltage</span> / ${fmt.n(E_TN)} V`),
        P(`Even the ideal cell reaches only 1.23 / ${fmt.n(E_TN)} = ${fmt.pct(E_ID / E_TN)}: <em>Gibbs energy</em> is the part of the energy that can become work, and here it is ${fmt.n(DG, 0)} of ${fmt.n(DH, 0)} kJ.`),
        P("An engine takes a detour: burn the fuel, then turn the <i>heat</i> into motion. That route has its own ceiling, the <b>heat-engine (Carnot) limit</b>, set only by the hot and cold temperatures, counted from absolute zero in kelvin (°C + 273): limit = 1 − T<sub>cold</sub> / T<sub>hot</sub>. A fuel cell never makes the detour, so the limit does not apply to it.")
      );
      let V = 0.7, Th = 600;
      const split = h("div", { class: "fc-split" }), eBox = h("div", { style: `background:${YEL}` }), hBox = h("div", { style: `background:${RED}` });
      split.append(eBox, hBox);
      const hb = hbars(["fuel cell, ideal (1.23 V)", "fuel cell at your voltage", "heat-engine limit at your temperature", "typical petrol car engine"], { max: 1, fmtv: (v) => fmt.pct(v), labelWidth: 150 });
      const sE = stat("electricity", "y"), sH = stat("heat", "r"), sEf = stat("efficiency", "g");
      function draw() {
        const el_ = (2 * F * V) / 1000, eff = V / E_TN, car = 1 - 298.15 / (Th + 273.15);
        eBox.style.width = (eff * 100).toFixed(1) + "%"; hBox.style.width = ((1 - eff) * 100).toFixed(1) + "%";
        eBox.textContent = "electricity"; hBox.textContent = "heat";
        hb.update([E_ID / E_TN, eff, car, 0.3], [MUTED, YEL, BLUE, MUTED]);
        sE.set(fmt.n(el_, 0) + " kJ"); sH.set(fmt.n(DH - el_, 0) + " kJ"); sEf.set(fmt.pct(eff));
      }
      el.append(widget(`Where the ${fmt.n(DH, 0)} kJ from one mole of hydrogen goes`,
        slider({ name: "cell V", min: 0.3, max: 1.23, step: 0.01, value: V, fmtv: (x) => fmt.n(x, 2) + " V", oninput: (v) => { V = v; draw(); } }),
        split, h("div", { class: "readout" }, sE, sH, sEf),
        h("div", { class: "fc-sub" }, "Against an engine whose hot side is at (cold side 25 °C):"),
        slider({ name: "hot side", min: 100, max: 2000, step: 25, value: Th, fmtv: (x) => x + " °C", oninput: (v) => { Th = v; draw(); } }),
        hb));
      draw();
      el.append(
        P("The engine's limit is a ceiling for a perfect machine; a real petrol engine in a car turns roughly 25–35% of its fuel's heat into motion. A fuel cell at 0.7 V is already near 47%, at room temperature and with no moving parts. And unlike an engine it gets <i>more</i> efficient when you ask less of it: lower current, higher voltage."),
        h("p", { class: "note", html: `Convention check: the ${fmt.n(DH, 0)} kJ counts the water leaving as liquid. Many data sheets count it leaving as steam (242 kJ, 1.25 V), which makes the same cell look about a fifth better: 0.70 V becomes 56%.` }),
        takeaway(`A fuel cell's efficiency is its voltage divided by ${fmt.n(E_TN)} V: at most ${fmt.pct(E_ID / E_TN)}, about half in practice. It skips the heat detour, so the heat-engine limit does not bind it.`)
      );
    },
    check: {
      type: "number", q: `A cell runs at <b>0.74 V</b>. What fraction of the hydrogen's ${fmt.n(DH, 0)} kJ comes out as electricity? (in %)`,
      answer: 0.5, alsoPercent: true, tolerance: 0.006, shown: "50%", hint: `Divide by the voltage that would mean "all of it": ${fmt.n(E_TN)} V.`, why: `0.74 / ${fmt.n(E_TN)} = 0.50. Half electricity, half heat.`, backTo: 5,
    },
  });

  // ---------------------------------------------------------------- 8
  steps.push({
    title: "0.7 V is useless alone: the stack",
    short: "The stack",
    newConcepts: ["stack"],
    render(el) {
      el.append(
        P("No chemistry can lift a hydrogen–oxygen cell above about 1 V, and a motor wants hundreds. The fix is the oldest one in electricity, Volta's: pile cells up. Press the cathode of one cell against the anode of the next, so every electron must pass through all of them in turn and gets a 0.7 V push each time. That is a <b>fuel-cell stack</b>."),
        h("ul", {},
          h("li", { html: "<b>Voltage</b> = number of cells × volts per cell. (Pushes in a chain add, like the cell voltages in <em>Electrode potentials</em>.)" }),
          h("li", { html: "<b>Current</b> is the same in every cell, and it is set by the electrode area: A/cm² × cm²." }),
          h("li", { html: "<b>Power</b> = voltage × current (the <em>watt</em>, from <em>Charge, energy and capacity</em>)." })),
        P("The thin plate between two neighbours does two jobs: it conducts the electrons from one cell to the next, and grooves on its two faces deliver hydrogen to one side and air to the other. Below, every cell works at the point you found in step 6: 0.70 V at 1.0 A/cm².")
      );
      const VC = 0.7, IC = 1.0;
      let N = 40, A = 100, dead = false;
      const svg = s("svg", { viewBox: "0 0 400 150", width: "100%", style: "display:block;margin:0 auto;max-width:600px" });
      const g = s("g"); svg.append(g);
      const sV = stat("stack voltage", "b"), sI = stat("current", "y"), sP = stat("power", "g");
      const note = h("div", { class: "fc-status" });
      function draw() {
        g.innerHTML = "";
        const hh = 26 + 84 * Math.sqrt(A / 400), w = 16 + (300 - 16) * Math.sqrt(N / 400), x0 = 200 - w / 2, y0 = 78 - hh / 2;
        rect(g, x0 - 8, y0 - 4, 8, hh + 8, { fill: "#8a94a6", rx: 2 }); rect(g, x0 + w, y0 - 4, 8, hh + 8, { fill: "#8a94a6", rx: 2 });
        rect(g, x0, y0, w, hh, { fill: BLUE, opacity: 0.22 });
        const lines = Math.min(N, 75);
        for (let k = 0; k <= lines; k++) { const x = x0 + (w * k) / lines; line(g, x, y0, x, y0 + hh, { stroke: "#4b5463", "stroke-width": lines > 40 ? 1.2 : 2, "stroke-linecap": "butt" }); }
        if (dead) { const x = x0 + w * 0.5; rect(g, x - 3, y0, 6, hh, { fill: RED }); }
        T(g, x0 - 14, 82, "−", { size: 18, weight: 700, anchor: "end" }); T(g, x0 + w + 14, 82, "+", { size: 18, weight: 700, anchor: "start" });
        T(g, 200, 13, `${N} cell${N > 1 ? "s" : ""} in a row`, { size: 12, fill: MUTED });
        T(g, 200, 146, `each plate ${A} cm² (about ${fmt.n(Math.sqrt(A), 0)} × ${fmt.n(Math.sqrt(A), 0)} cm)`, { size: 12, fill: MUTED });
        const Vs = N * VC, I = dead ? 0 : A * IC, Pw = Vs * I;
        sV.set(fmt.n(Vs, Vs < 100 ? 1 : 0) + " V"); sI.set(fmt.n(I, 0) + " A"); sP.set(Pw >= 1000 ? fmt.n(Pw / 1000, 1) + " kW" : fmt.n(Pw, 0) + " W");
        note.innerHTML = dead ? "One starved cell cannot pass current, and the same electrons must go through every cell: <b>the whole stack stalls</b>. (In practice the starved cell is also damaged, so stacks watch every cell's voltage.)"
          : Pw >= 80000 ? "That is car territory: a fuel-cell car's stack has a few hundred cells and delivers on the order of 100 kW."
          : Pw >= 800 ? "Enough for a house. More cells raise the voltage, bigger plates raise the current; the power is their product."
          : "A small stack. More cells raise the voltage, bigger plates raise the current.";
      }
      const tg = toggle("one cell in the middle", [[0, "healthy"], [1, "starved of hydrogen"]], 0, (v) => { dead = !!v; draw(); });
      el.append(widget("Build a stack (each cell: 0.70 V at 1.0 A/cm²)", svg,
        slider({ name: "cells", min: 1, max: 400, step: 1, value: N, fmtv: (x) => x, oninput: (v) => { N = v; draw(); } }),
        slider({ name: "area cm²", min: 25, max: 400, step: 25, value: A, fmtv: (x) => x, oninput: (v) => { A = v; draw(); } }),
        tg, h("div", { class: "readout" }, sV, sI, sP), note));
      draw();
      el.append(takeaway("A stack is many cells in a row: voltages add, the current is the same in all of them and scales with plate area. One failing cell stops the whole stack."));
    },
    check: {
      type: "number", q: "Each cell gives <b>0.70 V</b>. How many cells in a row does a <b>280 V</b> stack need?",
      answer: 400, tolerance: 0.5, hint: "Voltages in a row add up.", why: "280 V ÷ 0.70 V = 400 cells.",
    },
  });

  // ---------------------------------------------------------------- 9
  steps.push({
    title: "The catch: storing hydrogen, and the round trip",
    short: "Storage and round trip",
    newConcepts: ["density", "roundtrip"],
    render(el) {
      const dens = (P_) => (P_ * 1e5) / ((1 + 0.00064 * P_) * Chem.R * Chem.T0) * M_H2 / 1000; // g/L, with a rough real-gas correction
      el.append(
        P(`Per kilogram, nothing chemical beats hydrogen: about <b>${fmt.n(KWH_KG, 0)} kWh</b> of heat per kg (that is the ${fmt.n(DH, 0)} kJ/mol again; 1 kWh = 1000 Wh), three times petrol. But hydrogen is a gas of the lightest molecule there is. At room pressure one litre holds ${fmt.n(dens(1), 2)} g. The real question is <b>energy per litre</b>, and the only ways to raise it are brute force: squeeze the gas to hundreds of bar, or chill it to −253 °C until it turns liquid.`)
      );
      let Pb = 1, liquid = false;
      const perKg = hbars(["hydrogen", "petrol", "Li-ion cell"], { max: 40, fmtv: (v) => fmt.n(v, v < 1 ? 2 : 0) + " kWh/kg", labelWidth: 110 });
      perKg.update([KWH_KG, 13, 0.25], [GRN, MUTED, BLUE]);
      const perL = hbars(["hydrogen", "petrol", "Li-ion cell"], { max: 10, fmtv: (v) => fmt.n(v, v < 0.1 ? 4 : 2) + " kWh/L", labelWidth: 110 });
      const sD = stat("hydrogen per litre", "g"), sT = stat("volume holding 5 kg of H₂", "y");
      const pSl = slider({ name: "pressure", min: 1, max: 700, log: true, steps: 200, value: Pb, fmtv: (x) => Math.round(x) + " bar", oninput: (v) => { Pb = v; if (liquid) { liquid = false; st.set(0); } draw(); } });
      const st = toggle("stored as", [[0, "compressed gas at 25 °C"], [1, "liquid at −253 °C"]], 0, (v) => { liquid = !!v; draw(); });
      function draw() {
        const d = liquid ? 70.8 : dens(Pb), L = 5000 / d;
        perL.update([(d / 1000) * KWH_KG, 9.5, 0.7], [GRN, MUTED, BLUE]);
        sD.set(fmt.n(d, d < 1 ? 3 : 1) + " g"); sT.set(L >= 1000 ? fmt.n(L / 1000, 1) + " m³" : fmt.n(L, 0) + " L");
      }
      el.append(widget("Energy per kilogram and per litre (heat of burning; petrol and Li-ion figures are approximate)",
        h("div", { class: "fc-sub" }, "per kilogram"), perKg, h("div", { class: "fc-sub" }, "per litre"), perL,
        pSl, h("div", { class: "btns" },
          h("button", { onclick: () => { Pb = 1; pSl.set(1); liquid = false; st.set(0); draw(); } }, "1 bar (a balloon)"),
          h("button", { onclick: () => { Pb = 350; pSl.set(350); liquid = false; st.set(0); draw(); } }, "350 bar (buses)"),
          h("button", { onclick: () => { Pb = 700; pSl.set(700); liquid = false; st.set(0); draw(); } }, "700 bar (cars)")),
        st, h("div", { class: "readout" }, sD, sT)));
      draw();
      el.append(
        P("A fuel-cell car carries 5–6 kg of hydrogen at 700 bar, in tanks that weigh more than fifteen times their contents. Even then a litre holds about a sixth of the energy of a litre of petrol, though still more than a litre of battery. Hydrogen is light, not compact."),
        P("Second catch: hydrogen is not found, it is made, most cleanly by <em>water electrolysis</em>. An electrolyser followed by a fuel cell is a battery in two boxes. Its <b>round-trip efficiency</b> needs no new idea. Each electron pushed in at the electrolyser makes hydrogen that gives back exactly one electron in the fuel cell (<em>Faraday's laws</em>), so the charge out equals the charge in, and energy = charge × voltage:"),
        formula(`round trip = <span class="hl">fuel-cell voltage</span> / <span class="bl">electrolyser voltage</span>`),
        P("Overpotential hurts twice. The fuel cell delivers <i>less</i> than 1.23 V, and for the same reasons the electrolyser needs <i>more</i>.")
      );
      let Vin = 1.9, Vout = 0.7;
      const pl = plot({ xmin: 0, xmax: 3, ymin: 0, ymax: 2.5, height: 210, narrow: true, minFont: 10, xlabel: "", ylabel: "volts per electron", xticks: [], yticks: [0, 0.5, 1, 1.23, 1.5, 2, 2.5], margins: { bottom: 26 } });
      const sR = stat("round-trip efficiency", "g"), sO = stat("out of 100 Wh put in", "y"), sHt = stat("lost as heat", "r");
      function draw2() {
        pl.clear();
        pl.area([[0.35, Vin], [1.35, Vin]], BLUE, 0.75); pl.area([[1.65, Vout], [2.65, Vout]], YEL, 0.75);
        pl.hline(E_ID, MUTED, "ideal 1.23 V", { pos: "right" });
        const lab = (x, y, t, c) => { const e = s("text", { x: pl.X(x), y: pl.Y(y) - 6, "text-anchor": "middle", style: `fill:${c};font-weight:600` }); e.textContent = t; pl.layer.append(e); };
        lab(0.85, Vin, `electrolyser: pay ${fmt.n(Vin, 2)} V`, BLUE); lab(2.15, Vout, `fuel cell: get ${fmt.n(Vout, 2)} V`, YEL);
        const r = Vout / Vin;
        sR.set(fmt.pct(r)); sO.set(fmt.n(100 * r, 0) + " Wh"); sHt.set(fmt.n(100 * (1 - r), 0) + " Wh");
      }
      el.append(widget("Electricity → hydrogen → electricity, counted per electron",
        pl,
        slider({ name: "V paid", min: 1.23, max: 2.4, step: 0.01, value: Vin, fmtv: (x) => fmt.n(x, 2), oninput: (v) => { Vin = v; draw2(); } }),
        slider({ name: "V back", min: 0.3, max: 1.23, step: 0.01, value: Vout, fmtv: (x) => fmt.n(x, 2), oninput: (v) => { Vout = v; draw2(); } }),
        h("div", { class: "readout" }, sR, sO, sHt)));
      draw2();
      el.append(
        P("Typical values, about 1.9 V in and 0.7 V out, return a little over a third, before the energy spent on compressing the gas. A rechargeable battery returns around 90%. Push both sliders to 1.23 V: only a cell with no overpotential at all would give everything back, and it would have to run infinitely slowly."),
        P("So hydrogen is a poor place to keep electricity for a day, and an interesting one where batteries struggle: months of storage, or long range with a five-minute refill."),
        takeaway("Hydrogen holds the most energy per kilogram and, as a gas, very little per litre. Electrolyser + fuel cell returns fuel-cell volts ÷ electrolyser volts: roughly a third.")
      );
    },
    check: {
      type: "number", q: "An electrolyser runs at <b>1.80 V</b> per cell and the fuel cell that uses its hydrogen at <b>0.72 V</b>. What is the round-trip efficiency? (in %)",
      answer: 0.4, alsoPercent: true, tolerance: 0.006, shown: "40%", hint: "Same charge in and out, so compare the volts.", why: "0.72 / 1.80 = 0.40. Sixty percent of the electricity became heat along the way.", backTo: 6,
    },
  });

  // ---------------------------------------------------------------- 10
  steps.push({
    title: "Capstone: run a fuel-cell stack",
    short: "Capstone: run a stack",
    newConcepts: [],
    render(el) {
      el.append(
        P("Everything together. Below is one PEM cell's polarisation curve, and a stack built from copies of that cell. You choose how the cell is made, how hard to drive it, and how big the stack is. The job: <b>reach the target power</b>, then see what it costs in hydrogen and heat."),
        P("The yellow curve is new but contains nothing new: power per cm² = volts × A/cm². It rises while the current grows faster than the voltage falls, peaks, and then drops off the cliff.")
      );
      const o = Object.assign({}, BASE);
      let cur = 0.6, N = 100, A = 200, target = 100000;
      const pl = plot({ xmin: 0, xmax: 2.6, ymin: 0, ymax: 1.3, height: 260, narrow: true, minFont: 10, xlabel: "current density (A/cm²)", ylabel: "volts · W/cm²", xticks: [0, 0.5, 1, 1.5, 2, 2.5], yticks: [0, 0.2, 0.4, 0.6, 0.8, 1, 1.23] });
      const sV = stat("cell voltage", "b"), sPd = stat("power per cm²", "y"), sEf = stat("efficiency", "g");
      const sSV = stat("stack voltage", "b"), sSI = stat("stack current", ""), sSP = stat("stack power", "y"), sH2 = stat("hydrogen used", "g"), sHt = stat("heat to remove", "r");
      const status = h("div", { class: "fc-status" });
      const bar = h("div", { class: "fc-split", style: "height:22px" }), barIn = h("div", { style: `background:${GRN}` }), barRest = h("div", { style: "background:var(--panel2);color:var(--muted)" });
      bar.append(barIn, barRest);
      const kw = (w) => (Math.abs(w) >= 1000 ? fmt.n(w / 1000, w >= 100000 ? 0 : 1) + " kW" : fmt.n(w, 0) + " W");
      function draw() {
        pl.clear();
        const pts = [], pw = []; let best = [0, 0];
        for (let i = 0; i <= 2.6001; i += 0.01) { const v = cellV(i, o).V; pts.push([i, v]); pw.push([i, v * i]); if (v * i > best[1]) best = [i, v * i]; }
        pl.hline(E_ID, MUTED, "ideal 1.23 V", { pos: "left", below: true });
        pl.line(pts, BLUE); pl.line(pw, YEL);
        pl.vline(cur, "#667085");
        pl.legend([["cell voltage (V)", BLUE], ["power (W/cm²)", YEL]], { pos: "right" });
        const r = cellV(cur, o), V = r.V;
        pl.dot(cur, V, BLUE, 5); pl.dot(cur, V * cur, YEL, 5);
        const Vs = N * V, I = cur * A, Pw = Vs * I, gs = (N * I) / (2 * F) * M_H2, heat = N * I * (E_TN - V);
        sV.set(fmt.n(V, 2) + " V"); sPd.set(fmt.n(V * cur, 2) + " W"); sEf.set(V > 0 && cur > 0 ? fmt.pct(V / E_TN) : "–");
        sSV.set(fmt.n(Vs, 0) + " V"); sSI.set(fmt.n(I, 0) + " A"); sSP.set(kw(Pw)); sH2.set(fmt.n(gs * 3.6, gs * 3.6 < 1 ? 3 : 2) + " kg/h"); sHt.set(V > 0 ? kw(heat) : "–");
        const frac = clamp(Pw / target, 0, 1);
        barIn.style.width = (frac * 100).toFixed(1) + "%"; barRest.style.width = ((1 - frac) * 100).toFixed(1) + "%";
        barIn.textContent = frac > 0.25 ? kw(Pw) : ""; barRest.textContent = frac < 0.75 ? "target " + kw(target) : "";
        const nearPeak = cur > best[0] * 0.92;
        status.innerHTML = V <= 0 ? "<b>Starved.</b> You are asking for more current than the oxygen supply can feed: the voltage has collapsed and the cell delivers nothing. Back off, or feed pure oxygen."
          : Pw >= target ? `<b>Target reached</b> at ${fmt.pct(V / E_TN)} efficiency, with ${kw(heat)} of heat to carry away. ${nearPeak ? "You got there by driving each cell near its power peak: small stack, thirsty and hot. Try more cells at a lower current instead." : V / E_TN >= 0.5 ? "A big stack driven gently: more platinum and plates to buy, less hydrogen to burn." : "Try reaching the same power with more cells at a lower current and compare the hydrogen use."}`
          : cur > best[0] * 1.02 ? "You are past the power peak: more current now gives <i>less</i> power and more heat. Nothing is gained on this side of the peak."
          : `${kw(Pw)} of ${kw(target)}. Raise the current, add cells (more volts) or enlarge the plates (more amps).`;
      }
      const tgt = toggle("target", [[1000, "1 kW: a home unit"], [100000, "100 kW: a car"]], target, (v) => { target = v; draw(); });
      const mk = (label, opts, fn) => toggle(label, opts, 0, (v) => { fn(v); draw(); });
      el.append(widget("One cell's polarisation curve, and the stack built from it (simplified model)",
        pl,
        slider({ name: "A/cm²", min: 0, max: 2.6, step: 0.01, value: cur, fmtv: (x) => fmt.n(x, 2), oninput: (v) => { cur = v; draw(); } }),
        h("div", { class: "readout" }, sV, sPd, sEf),
        h("div", { class: "fc-sub" }, "How the cell is made"),
        mk("catalyst", [[0, "platinum"], [1, "none (bare carbon)"]], (v) => { o.i0 = v ? 1e-9 : 1e-6; }),
        mk("membrane", [[0, "thin"], [1, "thick"]], (v) => { o.R = v ? 0.2 : 0.07; }),
        mk("cathode is fed", [[0, "air"], [1, "pure oxygen"]], (v) => { o.iL = v ? 2.5 : 1.6; }),
        h("div", { class: "fc-sub" }, "The stack"),
        slider({ name: "cells", min: 1, max: 500, step: 1, value: N, fmtv: (x) => x, oninput: (v) => { N = v; draw(); } }),
        slider({ name: "area cm²", min: 25, max: 400, step: 25, value: A, fmtv: (x) => x, oninput: (v) => { A = v; draw(); } }),
        tgt, bar,
        h("div", { class: "readout" }, sSV, sSI, sSP, sH2, sHt), status));
      draw();
      el.append(
        P("Things to try, each from an earlier step:"),
        h("ul", {},
          h("li", { html: "Set the current to 0. The cell shows about 1.0 V, not 1.23 V, and delivers no power at all (<b>step 6</b>)." }),
          h("li", { html: "Take the platinum away. The whole curve drops by about 0.2 V, but the 1.23 V line stays where it is: slower, not less energetic (<b>step 4</b>)." }),
          h("li", { html: "Thicken the membrane: the middle of the curve gets steeper, because the H⁺ ions have further to go (<b>steps 5 and 6</b>)." }),
          h("li", { html: "Feed pure oxygen: the cliff moves to the right. Air is four-fifths nitrogen, which only gets in the way (<b>step 6</b>)." }),
          h("li", { html: "Reach 100 kW twice: once with few cells near the power peak, once with many cells at 0.75 V or more. Compare efficiency, hydrogen use and heat (<b>steps 7 and 8</b>). Every fuel-cell designer makes this trade between the cost of the stack and the cost of the fuel." }),
          h("li", { html: "At 100 kW, read the hydrogen flow. A car's 5.6 kg tank lasts about an hour at full power, which a car needs only in bursts (<b>step 9</b>)." })),
        takeaway("A fuel cell is a galvanic cell with its fuel outside: 1.23 V in theory, about 0.7 V at a useful current, stacked by the hundred. Its voltage is its efficiency, and gentle driving is efficient driving.")
      );
    },
  });

  Course.run({
    id: "fuel-cells",
    section: "4. Running it backwards, and other ways to get current",
    title: "Hydrogen and fuel cells",
    concepts: {
      fuelcell: "fuel cell", hor: "hydrogen oxidation reaction", orr: "oxygen reduction reaction", ideal: "ideal voltage 1.23 V",
      catalyst: "catalyst", tpb: "three-phase boundary", pem: "proton-exchange membrane (PEM) cell", variants: "alkaline and solid-oxide fuel cells",
      overpotential: "overpotential", polcurve: "polarisation curve", efficiency: "efficiency = V / 1.48 V", carnot: "heat-engine (Carnot) limit",
      stack: "fuel-cell stack", density: "energy per kg vs per litre", roundtrip: "round-trip efficiency",
    },
    sources: [
      { title: "OpenStax Chemistry 2e, §17.5 Batteries and Fuel Cells", url: "https://openstax.org/books/chemistry-2e/pages/17-5-batteries-and-fuel-cells", note: "hydrogen fuel cell half-reactions and the 1.23 V cell potential" },
      { title: "Larminie & Dicks, Fuel Cell Systems Explained (2nd ed., Wiley, 2003)", url: "https://doi.org/10.1002/9781118878330", note: "efficiency as V / 1.48 V, and the form of the polarisation model: activation (logarithmic), ohmic (linear) and mass-transport losses" },
      { title: "U.S. Department of Energy: Types of Fuel Cells", url: "https://www.energy.gov/eere/fuelcells/types-fuel-cells", note: "PEM, alkaline and solid-oxide cells: electrolytes, operating temperatures, catalysts, uses" },
      { title: "U.S. Department of Energy: Hydrogen Storage", url: "https://www.energy.gov/eere/fuelcells/hydrogen-storage", note: "energy per mass vs per volume, 350 and 700 bar tanks, liquid hydrogen" },
      { title: "NIST Chemistry WebBook: thermophysical properties of fluid systems (hydrogen)", url: "https://webbook.nist.gov/chemistry/fluid/", note: "hydrogen density: about 0.08 g/L at 1 bar, 39 g/L at 700 bar and 25 °C, 70.8 g/L as a liquid" },
      { title: "Wikipedia: Alkaline fuel cell", url: "https://en.wikipedia.org/wiki/Alkaline_fuel_cell", note: "Apollo and Space Shuttle fuel cells, drinking water, sensitivity to CO₂" },
      { title: "Wikipedia: Solid oxide fuel cell", url: "https://en.wikipedia.org/wiki/Solid_oxide_fuel_cell", note: "yttria-stabilised zirconia electrolyte, oxide-ion conduction, 600–1000 °C" },
      { title: "Wikipedia: Toyota Mirai", url: "https://en.wikipedia.org/wiki/Toyota_Mirai", note: "a production fuel-cell car: 330-cell stack, about 5.6 kg of hydrogen at 700 bar" },
    ],
    steps,
  });
})();
