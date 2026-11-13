// Lesson 3.4 — Lithium: the lightest metal and the ion that shuttles
(function () {
  const { h, s, fmt, widget, stat, slider, plot, toggle, hbars, rng, fitText } = Course;
  const f = Chem.f;
  const YEL = "#ffd166", RED = "#ff6b6b", BLUE = "#6cb4ff", GRN = "#5fd38d", PUR = "#c3a6ff", MUTED = "#9aa3b5", TEXT = "#e6e9ef", DARK = "#12151c";
  const P = (html) => h("p", { html });
  const takeaway = (html) => h("div", { class: "takeaway", html });
  const formula = (html) => h("div", { class: "formula", style: "font-family:inherit", html });
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;

  // ---------------------------------------------------------------- numbers (all from Chem)
  const EL = Chem.elements;
  const LI_CAP = Chem.capacity(1, EL.Li.mass);            // 3862 mAh/g
  const MOL = 0.1;                                         // running example: 0.100 mol of lithium
  const LI_G = MOL * EL.Li.mass;                           // 0.694 g
  const AH = (MOL * Chem.F) / 3600;                        // 2.68 Ah
  const C6_M = 6 * EL.C.mass;                              // 72.07 g per mole of C6
  const GR_CAP = Chem.capacity(1, C6_M);                   // 372 mAh per gram of graphite
  const RTF = (Chem.R * Chem.T0) / Chem.F;                 // 25.7 mV
  const M_LCO = EL.Li.mass + EL.Co.mass + 2 * EL.O.mass;                                   // 97.87
  const M_NMC = EL.Li.mass + 0.8 * EL.Ni.mass + 0.1 * EL.Mn.mass + 0.1 * EL.Co.mass + 2 * EL.O.mass; // NMC811: 97.28
  const M_LFP = EL.Li.mass + EL.Fe.mass + EL.P.mass + 4 * EL.O.mass;                       // 157.76
  const M_MNO2 = EL.Mn.mass + 2 * EL.O.mass;

  // Potential of each host against lithium metal as a function of the cell's state of charge s (0 … 1).
  // SIMPLIFIED curves, shaped like measured ones: a plateau or slope plus a Nernst-like term in the seat occupancy.
  const sc = (x) => clamp(x, 0.003, 0.997);
  const Ua = (x) => 0.085 + 0.4 * RTF * Math.log((1 - sc(x)) / sc(x)) + 0.6 * Math.exp(-clamp(x, 0, 1) / 0.03);
  const over = (x) => 3 * Math.max(0, x - 1);
  const CATH = {
    LCO: { key: "LCO", name: "LCO", formula: "LiCoO2", M: M_LCO, use: 0.5, metal: "Co", ox0: 3, col: "#5f86d6", vmax: 4.2, vmin: 3.0, rows: 4, cols: 6,
      U: (x) => 3.72 + 0.48 * clamp(x, 0, 1) ** 2 - 0.8 * Math.exp(-clamp(x, 0, 1) / 0.03) + over(x),
      cost: "cobalt: scarce and expensive", safety: "can release oxygen when overcharged or overheated", life: "roughly 500–1000 cycles", used: "phones, laptops" },
    NMC: { key: "NMC", name: "NMC", formula: "Li(Ni,Mn,Co)O2", M: M_NMC, use: 0.65, metal: "Ni/Mn/Co", short: "metals", ox0: 3, col: "#4fb3a5", vmax: 4.2, vmin: 3.0, rows: 3, cols: 6,
      U: (x) => 3.55 + 0.65 * clamp(x, 0, 1) ** 1.3 - 0.8 * Math.exp(-clamp(x, 0, 1) / 0.03) + over(x),
      cost: "mostly nickel, little cobalt: cheaper than LCO", safety: "same weakness as LCO, a little milder", life: "roughly 1000–2000 cycles", used: "long-range electric cars, power tools" },
    LFP: { key: "LFP", name: "LFP", formula: "LiFePO4", M: M_LFP, use: 0.94, metal: "Fe", ox0: 2, col: "#93b06f", vmax: 3.65, vmin: 2.5, rows: 3, cols: 4,
      U: (x) => 3.43 + 0.5 * RTF * Math.log(sc(x) / (1 - sc(x))) - 0.8 * Math.exp(-clamp(x, 0, 1) / 0.03) + 0.5 * Math.exp(-(1 - clamp(x, 0, 1)) / 0.02) + over(x),
      cost: "iron and phosphate: cheap and abundant", safety: "holds its oxygen: the safest of the three", life: "roughly 2000–5000+ cycles", used: "home storage, buses, standard-range cars" },
    MnO2: { key: "MnO2", name: "MnO₂", formula: "MnO2", M: M_MNO2, use: 1, metal: "Mn", ox0: 3, col: "#a58463", rows: 3, cols: 4, U: () => 3.0 },
  };
  for (const k of ["LCO", "NMC", "LFP"]) {
    const c = CATH[k];
    c.cap = Chem.capacity(1, c.M) * c.use;                 // usable mAh per gram of cathode
    c.V = (x) => c.U(x) - Ua(x);                           // cell voltage against graphite
    let a = 0; const N = 400; c.E = [0];                   // cumulative ∫V ds (for energy stored)
    for (let i = 1; i <= N; i++) { a += c.V((i - 0.5) / N) / N; c.E.push(a); }
    c.Vavg = a;
    c.grams = (MOL / c.use) * c.M;                         // cathode mass that holds our 0.100 mol of cyclable Li
  }
  const oxOf = (c, x) => c.ox0 + c.use * clamp(x, 0, 1);

  const style = () => h("style", {}, `
    .li-legend { display:flex; flex-wrap:wrap; gap:4px 14px; margin-top:8px; font-size:13px; }
    .li-legend i { display:inline-block; width:10px; height:10px; border-radius:50%; margin-right:5px; }
    .li-status { min-height:48px; margin-top:10px; padding:8px 12px; border-left:3px solid var(--blue); background:var(--panel2); border-radius:6px; font-size:15px; line-height:1.4; }
    .li-status.bad { border-left-color:var(--red); }
    .li-status.good { border-left-color:var(--green); }
    .li-eq { font-size:16px; line-height:1.7; margin-top:10px; }
    .li-eq span { color:var(--muted); font-size:13px; }
    .li-cards { display:grid; grid-template-columns:auto 1fr; gap:4px 12px; font-size:14px; margin-top:10px; }
    .li-cards div:nth-child(odd) { color:var(--muted); }
    .li-blocks { display:flex; align-items:flex-end; gap:18px; flex-wrap:wrap; margin:10px 0 2px; min-height:120px; }
    .li-blocks .b { display:flex; flex-direction:column; align-items:center; gap:4px; font-size:13px; color:var(--muted); }
    .li-blocks .b i { display:block; border-radius:3px; }
  `);
  const legend = (extra) => h("div", { class: "note li-legend", html:
    `<span><i style="background:${YEL}"></i>electron</span><span><i style="background:${RED}"></i>Li⁺ (cation)</span><span><i style="background:${BLUE}"></i>PF₆⁻ (anion)</span>${extra ? `<span>${extra}</span>` : ""}` });

  function T(g, x, y, str, a = {}) {
    const t = s("text", { x, y, "text-anchor": a.anchor || "middle", style: `font-size:calc(${a.size || 11}px * var(--c-k, 1));fill:${a.fill || MUTED};font-weight:${a.weight || 400}` });
    t.textContent = str; g.append(t); return t;
  }
  const mix = (c1, c2, t) => {
    const p = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
    const a = p(c1), b = p(c2);
    return "#" + a.map((v, i) => Math.round(lerp(v, b[i], t)).toString(16).padStart(2, "0")).join("");
  };

  // =====================================================================================
  // The cell picture: a negative electrode (lithium metal or graphite host) on the left, a cathode host on
  // the right, electrolyte and separator between, a wire with a device on top. Twelve lithium "dots" can be
  // moved one at a time: the ion flies through the electrolyte while an electron takes the wire. One timer.
  // =====================================================================================
  function makeCell(o) {
    const W = 400, H = 262, AX0 = 30, AX1 = 150, CX0 = 250, CX1 = 370, Y0 = 78, Y1 = 222, NM = 12;
    const svg = s("svg", { viewBox: o.solo ? "14 8 252 254" : `0 0 ${W} ${H}`, width: "100%", style: `display:block;margin:0 auto;max-width:${o.solo ? 420 : 600}px` });
    const G = {}; ["bk", "an", "ca", "wire", "pl", "ions", "fly", "txt"].forEach((k) => { G[k] = s("g"); svg.append(G[k]); });
    const rnd = rng(o.seed || 11);
    const cell = { svg, n: o.n0 || 0, plated: 0, anode: o.anode || "graphite", cath: o.cath || "LCO" };
    let aSlots = [], cSlots = [], aDots = [], cDots = [], layers = [], flights = [], lastDir = 0, timer = null, dead = false;
    let aShown = [], cShown = [];

    // --- static parts
    G.bk.append(s("rect", { x: AX1, y: Y0, width: CX0 - AX1, height: Y1 - Y0, fill: "#6cb4ff", opacity: 0.07 }));
    G.bk.append(s("path", { d: `M${AX0 - 6} ${Y0 - 6} H${(o.solo ? 262 : CX1) + 6} V${Y1 + 6} H${AX0 - 6} Z`, fill: "none", stroke: "#3a4254", "stroke-width": 1.5 }));
    G.bk.append(s("line", { x1: 200, x2: 200, y1: Y0, y2: Y1, stroke: "#8c96a8", "stroke-width": 2, "stroke-dasharray": "3 5" }));
    T(G.txt, 200, Y1 + 18, "electrolyte", { size: 10.5 });
    T(G.txt, 200, Y1 + 31, "dashed: separator", { size: 10.5 });
    G.wire.append(s("path", { d: `M90 ${Y0} V34 H${o.solo ? 262 : 170} M230 34 H310 V${Y0}`, fill: "none", stroke: "#c9a35a", "stroke-width": 2.5 }));
    let devT = null;
    if (!o.solo) {
      G.wire.append(s("rect", { x: 162, y: 20, width: 76, height: 28, rx: 6, fill: "#1d2230", stroke: "#6b7689" }));
      devT = T(G.wire, 200, 38, o.device || "open switch", { size: 11.5, fill: TEXT });
    }
    const eT = [T(G.txt, 126, 27, "", { fill: YEL, size: 12 }), o.solo ? null : T(G.txt, 274, 27, "", { fill: YEL, size: 12 })];
    const liT = T(G.txt, 200, Y0 - 12, "", { fill: RED, size: 12 });
    const aName = T(G.txt, 90, Y1 + 18, "", { fill: TEXT, size: 11 }), aRole = T(G.txt, 90, Y1 + 32, "", { fill: YEL, size: 10.5 });
    const cName = o.solo ? null : T(G.txt, 310, Y1 + 18, "", { fill: TEXT, size: 11 }), cRole = o.solo ? null : T(G.txt, 310, Y1 + 32, "", { fill: YEL, size: 10.5 });

    // --- electrolyte ions that drift about (the salt stays: one Li⁺ leaves as another enters)
    const drift = [];
    for (let i = 0; i < 10; i++) {
      const cat = i % 2 === 0, x = 160 + rnd() * 80, y = Y0 + 10 + rnd() * (Y1 - Y0 - 20);
      const e = s("circle", { cx: x, cy: y, r: cat ? 3.5 : 5, fill: cat ? RED : BLUE, opacity: 0.55 });
      G.ions.append(e); drift.push({ e, x, y });
    }

    // --- negative electrode
    function buildAnode() {
      G.an.innerHTML = ""; aSlots = []; aDots = []; layers = [];
      if (cell.anode === "metal") {
        G.an.append(s("rect", { x: AX0, y: Y0, width: AX1 - AX0, height: Y1 - Y0, fill: "none", stroke: "#56606f", "stroke-dasharray": "4 4" }));
        for (let c = 0; c < 3; c++) for (let r = 0; r < 4; r++) aSlots.push({ x: 50 + c * 40, y: 96 + r * 36, r });
        aSlots.forEach((p) => {
          const g = s("g");
          g.append(s("rect", { x: p.x - 20, y: p.y - 18, width: 40, height: 36, fill: "#93a59d", stroke: "#6d7d76" }));
          const t = s("text", { x: p.x, y: p.y + 4, "text-anchor": "middle", style: `font-size:calc(11px * var(--c-k, 1));fill:${DARK};font-weight:600` }); t.textContent = "Li"; g.append(t);
          G.an.append(g); aDots.push(g);
        });
      } else {
        for (let i = 0; i < 5; i++) { const l = s("line", { x1: AX0 + 3, x2: AX1 - 2, y1: 0, y2: 0, stroke: "#7a8496", "stroke-width": 5, "stroke-dasharray": "9 2" }); G.an.append(l); layers.push(l); }
        for (const r of [0, 2, 1, 3]) for (let c = 0; c < 3; c++) aSlots.push({ x: 58 + c * 32, y: 0, r });   // every second gallery first ("staging")
        aSlots.forEach((p) => { const d = s("circle", { cx: p.x, cy: 0, r: 6.5, fill: RED }); G.an.append(d); aDots.push(d); });
      }
    }
    // --- cathode host
    function buildCathode() {
      G.ca.innerHTML = ""; cSlots = []; cDots = [];
      if (o.solo) { for (let i = 0; i < NM; i++) cSlots.push({ x: 268, y: Y0 + 20 + ((i * 37) % 100) }); cDots = cSlots.map(() => null); return; }
      const c = CATH[cell.cath], rows = c.rows, cols = c.cols, gap = (Y1 - Y0 - 12) / rows;
      for (let i = 0; i <= rows; i++) G.ca.append(s("line", { x1: CX0 + 2, x2: CX1 - 3, y1: Y0 + 6 + i * gap, y2: Y0 + 6 + i * gap, stroke: c.col, "stroke-width": 5, "stroke-dasharray": cols === 4 ? "14 3" : "9 2" }));
      const xs = (j) => (cols === 6 ? 262 + j * 19.2 : 268 + j * 28), ys = (i) => Y0 + 6 + (i + 0.5) * gap;
      if (cols === 4) for (let i = 0; i < rows; i++) for (let j = 0; j <= cols; j++) G.ca.append(s("line", { x1: xs(j) - 14, x2: xs(j) - 14, y1: ys(i) - gap / 2 + 3, y2: ys(i) + gap / 2 - 3, stroke: c.col, "stroke-width": 2, opacity: 0.55 }));
      const mov = [];
      for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) {
        const locked = c.key === "LCO" ? (i + j) % 2 === 1 : c.key === "NMC" ? j % 3 === 2 : false;
        if (locked) G.ca.append(s("circle", { cx: xs(j), cy: ys(i), r: 4.5, fill: RED, opacity: 0.38 }));
        else mov.push({ x: xs(j), y: ys(i) });
      }
      mov.sort((a, b) => a.x - b.x || a.y - b.y);              // nearest the electrolyte leaves first
      cSlots = mov;
      cSlots.forEach((p) => { const d = s("circle", { cx: p.x, cy: p.y, r: 6.5, fill: RED }); G.ca.append(d); cDots.push(d); });
    }
    function layout() {                                        // graphite swells where a gallery is occupied
      if (cell.anode === "metal") return;
      const occ = [0, 0, 0, 0]; aSlots.forEach((p, i) => { if (aShown[i]) occ[p.r]++; });
      const hs = occ.map((k) => (k ? 35 : 29)), tot = hs.reduce((a, b) => a + b, 0);
      let y = (Y0 + Y1) / 2 - tot / 2; const gy = [];
      const frac = aShown.filter(Boolean).length / NM, col = mix("#7a8496", "#e3b94f", frac);
      layers.forEach((l, i) => { l.setAttribute("y1", y); l.setAttribute("y2", y); l.setAttribute("stroke", col); if (i < 4) { gy.push(y + hs[i] / 2); y += hs[i]; } });
      aSlots.forEach((p, i) => { p.y = gy[p.r]; aDots[i].setAttribute("cy", p.y); });
      cell.swell = occ.filter(Boolean).length / 4;
    }
    function draw() {
      layout();
      aDots.forEach((d, i) => (d.style.display = aShown[i] ? "" : "none"));
      cDots.forEach((d, i) => { if (d) d.style.display = cShown[i] ? "" : "none"; });
    }
    function snap() {                                          // finish everything instantly
      flights.forEach((fl) => fl.el.remove()); flights = [];
      aShown = aSlots.map((_, i) => i < cell.n); cShown = cSlots.map((_, i) => i >= cell.n);
      draw();
    }
    const pathAt = (pts, t) => {
      const L = []; let tot = 0;
      for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); L.push(d); tot += d; }
      let d = t * tot;
      for (let i = 0; i < L.length; i++) { if (d <= L[i] || i === L.length - 1) { const k = L[i] ? clamp(d / L[i], 0, 1) : 1; return [lerp(pts[i][0], pts[i + 1][0], k), lerp(pts[i][1], pts[i + 1][1], k)]; } d -= L[i]; }
      return pts[pts.length - 1];
    };
    // dir = +1: one lithium goes cathode → negative electrode (charge); −1: back again (discharge)
    cell.move = (dir) => {
      if (dir !== lastDir) snap();
      lastDir = dir;
      if (dir > 0 && cell.n >= NM) return false;
      if (dir < 0 && cell.n <= 0) return false;
      const k = dir > 0 ? cell.n : cell.n - 1, a = aSlots[k], c = cSlots[k];
      cell.n += dir;
      const ay = cell.anode === "metal" ? a.y : a.y || 150;
      const ion = dir > 0 ? [[c.x, c.y], [CX0, c.y], [AX1, ay], [a.x, ay]] : [[a.x, ay], [AX1, ay], [CX0, c.y], [c.x, c.y]];
      const el = dir > 0 ? [[310, Y0], [310, 34], [90, 34], [90, Y0]] : [[90, Y0], [90, 34], [310, 34], [310, Y0]];
      if (dir > 0) cShown[k] = false; else aShown[k] = false;
      draw();
      const e1 = s("circle", { r: 6.5, fill: RED, stroke: "#fff", "stroke-width": 1 }), e2 = s("circle", { r: 4, fill: YEL });
      G.fly.append(e1, e2);
      flights.push({ el: e1, pts: ion, t: 0, done: () => { if (dir > 0) aShown[k] = true; else cShown[k] = true; draw(); } });
      flights.push({ el: e2, pts: el, t: 0, done: null });
      return true;
    };
    cell.set = (n) => { cell.n = clamp(n, 0, NM); lastDir = 0; snap(); };
    cell.setCath = (k) => { cell.cath = k; buildCathode(); snap(); };
    cell.setPlated = (k, x0) => {
      cell.plated = k; G.pl.innerHTML = "";
      const AX1 = x0 || 150;
      const ys = [150, 112, 190, 132], len = [[14], [24, 12], [40, 22, 12], [56, 34, 20, 12]][clamp(k, 1, 4) - 1];
      if (k > 0) len.forEach((L, i) => G.pl.append(s("path", { d: `M${AX1 - 1} ${ys[i] - 5} L${AX1 + L} ${ys[i]} L${AX1 - 1} ${ys[i] + 5} Z`, fill: L > 50 ? RED : "#b9c7c0", stroke: "#6d7d76" })));
    };
    cell.labels = (mode, aText, cText, device) => {
      const d = mode === "discharge", c = mode === "charge";
      eT[0].textContent = d ? "e⁻ →" : c ? "← e⁻" : ""; if (eT[1]) eT[1].textContent = eT[0].textContent;
      liT.textContent = d ? "Li⁺ →" : c ? "← Li⁺" : "";
      aName.textContent = aText || ""; if (cName) cName.textContent = cText || "";
      aRole.textContent = d ? "− · oxidation (anode)" : c ? "− · reduction" : "− electrode";
      if (cRole) cRole.textContent = d ? "+ · reduction (cathode)" : c ? "+ · oxidation" : "+ electrode";
      if (devT && device) devT.textContent = device;
    };
    function tick() {
      if (dead) return;
      drift.forEach((p) => {
        p.x = clamp(p.x + (rnd() - 0.5) * 2.4, 157, 243); p.y = clamp(p.y + (rnd() - 0.5) * 2.4, Y0 + 7, Y1 - 7);
        p.e.setAttribute("cx", p.x.toFixed(1)); p.e.setAttribute("cy", p.y.toFixed(1));
      });
      for (const fl of flights) {
        fl.t += o.speed || 0.05;
        const [x, y] = pathAt(fl.pts, Math.min(1, fl.t));
        fl.el.setAttribute("cx", x.toFixed(1)); fl.el.setAttribute("cy", y.toFixed(1));
        if (fl.t >= 1) { fl.el.remove(); fl.gone = true; fl.done && fl.done(); }
      }
      flights = flights.filter((fl) => !fl.gone);
      cell.onTick && cell.onTick();
      timer = setTimeout(tick, 40);
    }
    cell.stop = () => { dead = true; clearTimeout(timer); };
    buildAnode(); buildCathode(); snap(); cell.labels("idle");
    timer = setTimeout(tick, 40);
    fitText(svg, 11.5, 1.3);
    return cell;
  }

  const steps = [];

  // ---------------------------------------------------------------- 1
  steps.push({
    title: "Why lithium: top of the ladder, lightest metal",
    short: "Why lithium",
    newConcepts: ["liwin"],
    render(el) {
      el.append(style(),
        P("Zinc, lead, cadmium, nickel: every battery so far used a fairly heavy metal and gave 1.2 to 2 V. To do better you need an anode that scores on two numbers you already own."),
        P(`<b>Push.</b> On the <em>potential ladder</em> (from <em>Electrode potentials</em>) the strongest electron-giver sits at the very top: lithium, E° = ${fmt.n(Chem.E0by.Li.E)} V. Zinc is at ${fmt.n(Chem.E0by.Zn.E)} V, so against the same cathode a lithium anode gives ${fmt.n(Chem.E0by.Zn.E - Chem.E0by.Li.E)} V more.`),
        P(`<b>Weight.</b> <em>Specific capacity</em> (from <em>Charge, energy and capacity</em>) is electrons per gram. Lithium is the lightest metal, ${EL.Li.mass} g/mol, and gives one electron per atom: about ${Math.round(LI_CAP / 10) * 10} mAh/g. Zinc gives two electrons but weighs ${EL.Zn.mass} g/mol: ${Math.round(Chem.capacity(2, EL.Zn.mass))} mAh/g.`),
        P(`This lesson's running example is <b>0.100 mol of lithium</b>. It mirrors the 6.54 g zinc strip (0.100 mol) of earlier lessons. Click a metal to see how much of it supplies 0.100 mol of electrons.`));
      const ids = ["Li", "Na", "Mg", "Al", "Zn", "Cd", "Pb"];
      const D = ids.map((id) => { const c = Chem.E0by[id], e = EL[id]; return { id, E: c.E, n: c.n, M: e.mass, cap: Chem.capacity(c.n, e.mass), g: (MOL * e.mass) / c.n, name: e.name }; });
      let sel = 0;
      const hbE = hbars(D.map((d) => d.id), { max: 3.2, fmtv: (v) => "−" + v.toFixed(2) + " V", labelWidth: 34, onclick: (i) => pick(i) });
      const hbC = hbars(D.map((d) => d.id), { max: 4000, fmtv: (v) => Math.round(v) + " mAh/g", labelWidth: 34, onclick: (i) => pick(i) });
      const blocks = h("div", { class: "li-blocks" });
      const sG = stat("grams for 0.100 mol e⁻", "y"), sV = stat("volts above zinc", "b"), sW = stat("Wh per g vs a +1.00 V cathode", "g");
      const note = h("div", { class: "li-status" });
      const bt = toggle("anode metal:", D.map((d, i) => [i, d.id]), 0, (i) => pick(i));
      const side = (g) => Math.sqrt(g) * 34;
      function pick(i) {
        sel = i; bt.set(i); const d = D[i];
        const cols = D.map((_, j) => (j === i ? YEL : "#4a5568"));
        hbE.update(D.map((x) => -x.E), cols); hbC.update(D.map((x) => x.cap), cols); hbE.mark(i); hbC.mark(i);
        sG.set(fmt.n(d.g, d.g < 1 ? 3 : 2) + " g"); sV.set((d.E <= Chem.E0by.Zn.E ? "+" : "−") + fmt.n(Math.abs(Chem.E0by.Zn.E - d.E)) + " V"); sW.set(fmt.n((d.cap * (1 - d.E)) / 1000, 1));
        blocks.innerHTML = "";
        [D[0], d].forEach((x, j) => { if (j === 1 && i === 0) return; blocks.append(h("div", { class: "b" }, h("i", { style: `width:${side(x.g)}px;height:${side(x.g)}px;background:${j === 0 ? GRN : MUTED}` }), `${x.id}: ${fmt.n(x.g, x.g < 1 ? 3 : 2)} g`)); });
        note.innerHTML = i === 0 ? `Lithium: <b>${fmt.n(LI_G, 3)} g</b> carries 0.100 mol of electrons, which is ${fmt.n(AH)} Ah. That is about the charge in one laptop-size lithium cell.`
          : `${d.name[0].toUpperCase() + d.name.slice(1)} gives ${d.n} electron${d.n > 1 ? "s" : ""} per atom of ${d.M} g/mol, so 0.100 mol of electrons needs ${fmt.n(d.g, 2)} g: <b>${fmt.n(d.g / LI_G, 1)}× the mass</b> of lithium, and it sits ${fmt.n(d.E - Chem.E0by.Li.E)} V lower on the ladder.`;
      }
      el.append(widget("Seven anode metals, numbers from the course table",
        bt, h("div", { class: "note", style: "margin-top:10px" }, "Height on the ladder (−E°, longer = stronger giver)"), hbE,
        h("div", { class: "note" }, "Specific capacity"), hbC,
        h("div", { class: "note" }, "Squares drawn to scale: mass that supplies 0.100 mol of electrons"), blocks,
        h("div", { class: "readout" }, sG, sV, sW), note));
      pick(0);
      el.append(
        P("Why is lithium on top although caesium loses its electron more easily in the gas phase? <em>Hydration</em> (from <em>The activity series</em>): the tiny Li⁺ ion is wrapped by solvent so tightly that the energy paid back is large. Aluminium and magnesium look good here too; their catch (an oxide skin, sluggish 2+ and 3+ ions) is for <em>Beyond lithium-ion</em>."),
        takeaway("Lithium has the most negative E° (−3.04 V) and the lowest molar mass of any metal (6.94 g/mol): the most push and the most electrons per gram, about 3860 mAh/g."));
    },
    check: {
      type: "number", q: "The zinc strip needed 3.27 g to supply 0.100 mol of electrons (two per atom). How many <b>grams of lithium</b> (6.94 g/mol, one electron per atom) supply the same 0.100 mol?",
      answer: 0.694, tolerance: 0.006, hint: "One electron per atom: 0.100 mol of electrons needs 0.100 mol of lithium. Multiply by the molar mass.",
      why: "0.100 mol × 6.94 g/mol = 0.694 g: less than a quarter of the zinc, and at three volts more push.",
    },
  });

  // ---------------------------------------------------------------- 2
  steps.push({
    title: "Why water is impossible",
    short: "No water allowed",
    newConcepts: ["window", "nonaq"],
    render(el) {
      el.append(style(),
        P("Every cell so far had water in it: zinc sulfate solution, sulfuric acid, potassium hydroxide solution. Water is not just a bystander. It has two rungs of its own on the ladder:"),
        formula(`${f("2H^+ + 2e- -> H2")} <small>an electrode more negative than this rung can push electrons onto water: hydrogen gas forms</small>${f("O2 + 4H^+ + 4e- -> 2H2O")} <small>an electrode more positive than this rung can pull electrons out of water: oxygen gas forms</small>`),
        P(`In 1 mol/L acid the rungs are at ${fmt.n(Chem.E0by.H.E)} V and +${fmt.n(Chem.E0by.O2.E)} V. Both half-reactions contain H⁺, so by the <em>Nernst equation</em> both slide by 59 mV for every tenfold change in [H⁺]. They slide together: the gap stays <b>1.23 V</b>. That gap is the <b>water stability window</b>. Between its edges water survives. Outside, it is torn into H₂ and O₂.`),
        P("Place the two electrodes of a cell on the ladder and see whether water can live between them."));
      const W = 400, H = 292, yOf = (E) => 26 + ((E + 3.3) / 5.5) * 240;
      const svg = s("svg", { viewBox: `0 0 ${W} ${H}`, width: "100%", style: "display:block;margin:0 auto;max-width:600px" });
      svg.append(s("line", { x1: 52, x2: 52, y1: yOf(-3.3), y2: yOf(2.2), class: "axis" }));
      for (let v = -3; v <= 2; v++) { svg.append(s("line", { x1: 48, x2: 52, y1: yOf(v), y2: yOf(v), class: "axis" })); T(svg, 44, yOf(v) + 4, (v < 0 ? "−" : v > 0 ? "+" : "") + Math.abs(v) + " V", { anchor: "end" }); }
      T(svg, 60, 13, "more negative: stronger electron-givers", { anchor: "start", size: 10.5 });
      T(svg, 60, 287, "more positive: stronger electron-takers", { anchor: "start", size: 10.5 });
      const band = s("rect", { x: 58, width: 232, y: 0, height: 10, fill: BLUE, opacity: 0.2 }); svg.append(band);
      const eH = s("line", { x1: 58, x2: 290, stroke: BLUE, "stroke-width": 1.5 }), eO = s("line", { x1: 58, x2: 290, stroke: BLUE, "stroke-width": 1.5 }); svg.append(eH, eO);
      const tH = T(svg, 64, 0, "", { anchor: "start", fill: BLUE }), tW = T(svg, 174, 0, "water is stable in here", { fill: BLUE, size: 10.5 }), tO = T(svg, 64, 0, "", { anchor: "start", fill: BLUE });
      fitText(svg, 11.5, 1.3);
      const lN = s("line", { x1: 58, x2: 300, stroke: GRN, "stroke-width": 3 }), lP = s("line", { x1: 58, x2: 300, stroke: PUR, "stroke-width": 3 }); svg.append(lN, lP);
      const tN = T(svg, 306, 0, "", { anchor: "start", fill: GRN, weight: 600 }), tP = T(svg, 306, 0, "", { anchor: "start", fill: PUR, weight: 600 });
      const tN2 = T(svg, 306, 0, "− electrode", { anchor: "start", fill: GRN, size: 10 }), tP2 = T(svg, 306, 0, "+ electrode", { anchor: "start", fill: PUR, size: 10 });
      let neg = -0.76, pos = 0.34, c = 1e-7;
      const sV = stat("cell voltage", "y"), sWin = stat("water window", "b"), sOut = stat("outside the window by", "r");
      const verdict = h("div", { class: "li-status" });
      const sv = (v) => (v < 0 ? "−" : "+") + fmt.n(Math.abs(v));
      function upd() {
        const EH = Chem.nernst(Chem.E0by.H.E, 2, 1 / (c * c)), EO = Chem.nernst(Chem.E0by.O2.E, 4, 1 / c ** 4);
        band.setAttribute("y", yOf(EH)); band.setAttribute("height", yOf(EO) - yOf(EH));
        [[eH, EH], [eO, EO], [lN, neg], [lP, pos]].forEach(([l, v]) => { l.setAttribute("y1", yOf(v)); l.setAttribute("y2", yOf(v)); });
        tH.setAttribute("y", yOf(EH) + 13); tH.textContent = `H₂ edge ${sv(EH)} V`; tO.setAttribute("y", yOf(EO) - 5); tO.textContent = `O₂ edge ${sv(EO)} V`;
        tW.setAttribute("y", yOf((EH + EO) / 2) + 4); tW.setAttribute("x", 222);
        tN.setAttribute("y", yOf(neg) - 2); tN.textContent = sv(neg) + " V"; tN2.setAttribute("y", yOf(neg) - 14);
        tP.setAttribute("y", yOf(pos) + 12); tP.textContent = sv(pos) + " V"; tP2.setAttribute("y", yOf(pos) + 24);
        const a = Math.max(0, EH - neg), b = Math.max(0, pos - EO);
        sV.set(fmt.n(pos - neg) + " V"); sWin.set(`${sv(EH)} … ${sv(EO)} V`); sOut.set(fmt.n(a) + " / " + fmt.n(b) + " V");
        const msg = (d, gas, where) => d <= 0 ? "" : d <= 0.6
          ? `The ${where} electrode is ${fmt.n(d)} V outside: on paper water gives ${gas} here. A cell can live with this only where the gas forms slowly on the surface (zinc, cadmium, lead), and it bubbles as soon as it is pushed: the <em>gassing</em> of an overcharged lead–acid cell. `
          : `The ${where} electrode is <b>${fmt.n(d)} V outside the window</b>: water is torn apart and ${gas} pours off. No trick saves this. `;
        const t = msg(a, "H₂", "negative") + msg(b, "O₂", "positive");
        verdict.className = "li-status " + (a > 0.6 || b > 0.6 ? "bad" : a + b === 0 ? "good" : "");
        verdict.innerHTML = t || "Both electrodes sit inside the window: water is stable between them.";
      }
      const slN = slider({ name: "− electrode", min: -3.2, max: 0, step: 0.01, value: neg, fmtv: (v) => sv(v) + " V", nameWidth: 150, oninput: (v) => { neg = v; upd(); } });
      const slP = slider({ name: "+ electrode", min: 0, max: 2, step: 0.01, value: pos, fmtv: (v) => sv(v) + " V", nameWidth: 150, oninput: (v) => { pos = v; upd(); } });
      const slC = slider({ name: "[H⁺] in the water", min: 1e-14, max: 1, log: true, steps: 14, value: c, nameWidth: 150, fmtv: (v) => fmt.pow10(Math.pow(10, Math.round(Math.log10(v)))) + " mol/L", oninput: (v) => { c = Math.pow(10, Math.round(Math.log10(v))); upd(); } });
      const preset = (n, p, cc) => () => { neg = n; pos = p; c = cc; slN.set(n); slP.set(p); slC.set(cc); upd(); };
      const E = Chem.E0by;
      el.append(widget("The ladder with water's two rungs (blue band). Givers on top, as always",
        svg, slN, slP, slC,
        h("div", { class: "btns" },
          h("button", { onclick: preset(E.Zn.E, E.Cu.E, 1e-7) }, "Daniell cell"),
          h("button", { onclick: preset(E["Cd(OH)2"].E, E.NiOOH.E, 1e-14) }, "NiCd (in base)"),
          h("button", { onclick: preset(E.PbSO4.E, E.PbO2.E, 1) }, "Lead–acid (in acid)"),
          h("button", { class: "primary", onclick: preset(E.Li.E, 0.96, 1e-7) }, "Lithium + a 4 V cathode")),
        h("div", { class: "readout" }, sV, sWin, sOut), verdict,
        h("div", { class: "note", style: "margin-top:8px" }, "The 0.6 V line between “slow gas” and “torn apart” is a rule of thumb, not a law: how slowly gas forms depends on the surface.")));
      upd();
      el.append(
        P(`Lithium metal does not even wait for a circuit. It sits more than 2 V above water's hydrogen edge and reacts on contact: <code style="font-family:inherit">${f("2Li + 2H2O -> 2LiOH + H2")}</code>.`),
        P(`So a lithium cell needs a <b>non-aqueous electrolyte</b>: an inorganic lithium salt dissolved in a liquid that is not water. The usual salt is ${f("LiPF6")}, which <em>dissociates</em> into ${f("Li^+")} and the polyatomic anion ${f("PF6^-")} (P is +5, each F −1). The solvent's makeup belongs to organic chemistry; here it only matters that it dissolves the salt, lets ions move, and has a window of more than 4 V instead of 1.23 V.`),
        takeaway("Water only survives 1.23 V between its hydrogen and oxygen edges. A 3–4 V lithium cell needs a non-aqueous electrolyte: a lithium salt such as LiPF₆ in a water-free solvent."));
    },
    check: {
      type: "number", q: `Lithium (E° = −3.04 V) touches water. In the basic solution it makes, water's hydrogen edge is at −0.83 V. How many volts of push does ${f("2Li + 2H2O -> 2LiOH + H2")} have? (E°cell = E°cathode − E°anode)`,
      answer: 2.21, tolerance: 0.02, hint: "Water is being reduced (cathode, −0.83 V); lithium is oxidised (anode, −3.04 V). Take the difference.",
      why: "−0.83 − (−3.04) = 2.21 V. Strongly positive, so lithium reacts with water by itself, with nothing connected.",
    },
  });

  // ---------------------------------------------------------------- 3
  steps.push({
    title: "The lithium coin cell",
    short: "Lithium coin cell",
    newConcepts: ["limetal"],
    render(el) {
      const mLi = 225 / LI_CAP * 1000; // mg of Li for 225 mAh
      el.append(style(),
        P("The simplest lithium battery takes the metal as it is. Look at the coin cell on a computer mainboard or in a car key, labelled CR2032. Inside: a disc of <b>lithium metal</b>, a separator soaked in non-aqueous electrolyte, and a pellet of manganese dioxide, the same MnO₂ that was the <em>depolariser</em> of the zinc cells."),
        formula(`<span class="bl">anode (−)</span> ${f("Li -> Li^+ + e-")}<br><span class="hl">cathode (+)</span> ${f("MnO2 + Li^+ + e- -> LiMnO2")}<small>manganese goes from +4 to +3; overall Li + MnO₂ → LiMnO₂, about 3.0 V</small>`),
        P("Notice what the cathode does. The Li⁺ ion that left the metal crosses the electrolyte and moves <i>into</i> the MnO₂ solid, while the electron arrives through the wire and lowers a manganese from +4 to +3. Keep that picture; it returns in step 5."),
        P(`A CR2032 stores about 225 mAh. At ${Math.round(LI_CAP)} mAh/g that is roughly ${Math.round(mLi)} mg of lithium. The picture shows it as 12 atoms.`));
      const cell = makeCell({ anode: "metal", cath: "MnO2", n0: 12, device: "car key", seed: 5 });
      const sQ = stat("charge delivered", "y"), sLi = stat("lithium metal left", "g"), sMn = stat("Mn oxidation number", "p"), sV = stat("voltage (nominal)", "b");
      const status = h("div", { class: "li-status" });
      let auto = null, mode = "idle";
      function upd() {
        const used = 12 - cell.n;
        sQ.set(Math.round((used / 12) * 225) + " mAh"); sLi.set(Math.round((cell.n / 12) * mLi) + " mg");
        sMn.set("+" + fmt.n(4 - used / 12)); sV.set(cell.n > 0 ? "3.0 V" : "0 V");
        cell.labels(mode, "lithium metal", `MnO₂ · Mn +${fmt.n(4 - used / 12)}`, mode === "discharge" ? "car key: on" : "car key");
      }
      const say = (t, cls) => { status.className = "li-status " + (cls || ""); status.innerHTML = t; };
      function one() {
        mode = "discharge"; cell.setPlated(0);
        if (!cell.move(-1)) { say("The lithium is used up. This is a <em>primary cell</em> (from <em>Zinc</em>): you throw it away.", ""); mode = "idle"; upd(); return false; }
        say("One lithium atom leaves its electron in the metal (it goes round through the wire) and crosses as Li⁺ into the MnO₂ host. One manganese drops from +4 to +3.", ""); upd(); return true;
      }
      const stopAuto = () => { clearInterval(auto); auto = null; };
      el.append(widget("A lithium–manganese dioxide coin cell (12 atoms stand for ~58 mg of lithium)",
        cell.svg, legend("grey blocks = lithium metal atoms"),
        h("div", { class: "btns" },
          h("button", { class: "primary", onclick: () => { stopAuto(); one(); } }, "Use one lithium atom"),
          h("button", { onclick: () => { stopAuto(); auto = setInterval(() => { if (!one()) stopAuto(); }, 320); } }, "Run it flat"),
          h("button", { onclick: () => { stopAuto(); mode = "idle"; cell.setPlated(cell.n < 12 ? 3 : 0, 30 + 40 * Math.ceil(cell.n / 4)); say(cell.n < 12 ? "Forcing current backwards does bring lithium back, but not as a smooth disc. It returns as moss and needles on the surface. That is the next step's problem." : "Nothing to recharge yet: use some lithium first.", cell.n < 12 ? "bad" : ""); upd(); } }, "Try to recharge it"),
          h("button", { onclick: () => { stopAuto(); mode = "idle"; cell.setPlated(0); cell.set(12); say("A fresh cell: all lithium is metal, every manganese is +4."); upd(); } }, "New cell")),
        h("div", { class: "readout" }, sQ, sLi, sMn, sV), status));
      say("A fresh cell: all lithium is metal, every manganese is +4."); upd();
      el.append(
        P("Three volts from one cell, twice an alkaline cell, and a <em>self-discharge</em> of about 1% per year, so it lasts ten years in a drawer. The voltage is not computed from the aqueous E° table: that table is for ions in water, and there is no water here."),
        takeaway("A lithium-metal primary cell (Li–MnO₂) oxidises lithium metal and tucks the Li⁺ into solid MnO₂ (Mn +4 → +3): about 3 V, light, long-lived, not rechargeable."));
      return () => { stopAuto(); cell.stop(); };
    },
    check: {
      type: "number", q: `A CR2032 coin cell delivers <b>225 mAh</b>. Lithium's specific capacity is ${Math.round(LI_CAP)} mAh/g. About how many <b>milligrams</b> of lithium metal does the discharge consume?`,
      answer: 58.3, tolerance: 2, shown: "58", hint: `Grams = mAh ÷ (mAh per gram) = 225 ÷ ${Math.round(LI_CAP)}. Then × 1000 for milligrams.`,
      why: `225 ÷ ${Math.round(LI_CAP)} = 0.058 g = 58 mg. A sliver of metal runs a car key for years.`, backTo: 0,
    },
  });

  // ---------------------------------------------------------------- 4
  steps.push({
    title: "Recharging lithium metal: dendrites",
    short: "Dendrites",
    newConcepts: ["dendrite"],
    render(el) {
      el.append(style(),
        P(`A <em>secondary</em> (rechargeable) cell must run its reaction backwards. For the lithium electrode that means plating the metal back: ${f("Li^+ + e- -> Li")}. The lead and cadmium electrodes managed their reverse reactions for hundreds of cycles. Lithium metal does not.`),
        P("The trouble is geometry. Ions arriving from the electrolyte reach a bump on the surface a little sooner than the flat metal around it. The bump grows, which makes it stick out more, which brings it even more ions. A flat surface is unstable: plated lithium grows into needles and moss. A metal needle like this is a <b>dendrite</b>."),
        P("A dendrite that grows through the separator touches the cathode. Now electrons have a path <i>inside</i> the cell: a short circuit. The cell dumps its energy as heat, and the non-aqueous solvent, unlike water, burns."));
      const R = 24, G = 20, N = 96, W = 400, H = 196, X0 = 84, CW = 8, RH = 6, YT = 22;
      const svg = s("svg", { viewBox: `0 0 ${W} ${H}`, width: "100%", style: "display:block;margin:0 auto;max-width:600px" });
      svg.append(s("rect", { x: 20, y: YT, width: X0 - 20, height: R * RH, fill: "#93a59d" }));
      svg.append(s("rect", { x: X0, y: YT, width: G * CW, height: R * RH, fill: BLUE, opacity: 0.07 }));
      svg.append(s("rect", { x: X0 + 9 * CW, y: YT, width: 2 * CW, height: R * RH, fill: "#8c96a8", opacity: 0.25 }));
      const cat = s("rect", { x: X0 + G * CW, y: YT, width: W - 20 - X0 - G * CW, height: R * RH, fill: "#a58463" }); svg.append(cat);
      const rects = Array.from({ length: R }, (_, i) => { const r = s("rect", { x: X0, y: YT + i * RH + 0.5, width: 0, height: RH - 1, fill: "#c5d2cb" }); svg.append(r); return r; });
      T(svg, 52, YT + 76, "Li", { fill: DARK, weight: 700, size: 13 }); T(svg, 52, YT + 90, "metal", { fill: DARK, size: 10.5 });
      T(svg, (X0 + G * CW + W - 20) / 2, YT + 80, "cathode", { fill: DARK, weight: 700, size: 12 });
      T(svg, X0 + 10 * CW, 14, "separator", { size: 10.5 }); T(svg, X0 + 10 * CW, YT + R * RH + 15, "electrolyte", { size: 10.5 });
      const flash = T(svg, 200, YT + R * RH + 15, "", { fill: RED, weight: 700, size: 12 });
      fitText(svg, 11.5, 1.3);
      let hgt, rnd, cyc, shorted, busy = null, speed = 1, queue = [];
      const sC = stat("full cycles", ""), sT = stat("tallest needle (gap = 20)", "y"), sS = stat("state", "g");
      const status = h("div", { class: "li-status" });
      function draw() {
        hgt.forEach((v, i) => { rects[i].setAttribute("width", v * CW); rects[i].setAttribute("fill", v >= G ? RED : "#c5d2cb"); });
        const mx = Math.max(...hgt);
        sC.set(String(cyc)); sT.set(String(mx)); sS.set(shorted ? "SHORT" : "ok");
        cat.setAttribute("fill", shorted ? "#c0504a" : "#a58463"); flash.textContent = "";
      }
      function reset() { clearTimeout(busy); busy = null; queue = []; hgt = new Array(R).fill(0); rnd = rng(3); cyc = 0; shorted = false; draw(); status.className = "li-status"; status.innerHTML = "A fresh, flat lithium surface. Charge it (plate lithium onto it), then discharge (strip it off again)."; }
      function plateOne() {
        const beta = 0.04 + 0.1 * speed, w = hgt.map((v) => Math.exp(beta * v)), S = w.reduce((a, b) => a + b, 0);
        let u = rnd() * S, i = 0; while (i < R - 1 && u > w[i]) { u -= w[i]; i++; }
        hgt[i]++; if (hgt[i] >= G) shorted = true;
      }
      function stripOne() { const idx = []; hgt.forEach((v, i) => v > 0 && idx.push(i)); if (!idx.length) return false; hgt[idx[Math.floor(rnd() * idx.length)]]--; return true; }
      function run() {
        if (busy || !queue.length) return;
        const job = queue.shift(); let k = 0;
        const tick = () => {
          busy = null;
          if (shorted) { queue = []; finish(); return; }
          for (let j = 0; j < 6 && k < N && !shorted; j++, k++) { if (job === "plate") plateOne(); else if (!stripOne()) k = N; }
          draw();
          if (k < N && !shorted) busy = setTimeout(tick, 20);
          else { if (job === "strip") cyc++; draw(); finish(); run(); }
        };
        tick();
      }
      function finish() {
        const mx = Math.max(...hgt);
        if (shorted) { status.className = "li-status bad"; status.innerHTML = `<b>Short circuit.</b> A needle crossed the separator and touched the cathode in cycle ${cyc + 1}. The stored energy now turns into heat inside the cell.`; flash.textContent = ""; }
        else if (!queue.length) { status.className = "li-status"; status.innerHTML = mx === 0 ? "Stripped clean: this time the surface went back to flat." : mx >= 8 ? `The tallest needle is ${mx} of 20 steps across the gap. Stripping removed little of it, so the next charge starts from a rough surface.` : `Plated layer, tallest point ${mx} of 20. Each charge adds on top of whatever roughness is left.`; }
      }
      const add = (...jobs) => { if (shorted) return; queue.push(...jobs); run(); };
      el.append(widget("Toy model of plating: each new atom prefers spots that already stick out (seeded random; not a physical simulation)",
        svg,
        slider({ name: "charging speed", min: 0.2, max: 3, step: 0.1, value: 1, nameWidth: 110, fmtv: (v) => (v < 0.7 ? "slow" : v < 1.8 ? "normal" : "fast") + " ×" + v.toFixed(1), oninput: (v) => (speed = v) }),
        h("div", { class: "btns" },
          h("button", { class: "primary", onclick: () => add("plate") }, "Charge (plate lithium)"),
          h("button", { onclick: () => add("strip") }, "Discharge (strip it)"),
          h("button", { onclick: () => add("plate", "strip", "plate", "strip", "plate", "strip", "plate", "strip", "plate", "strip") }, "5 full cycles"),
          h("button", { onclick: reset }, "New cell")),
        h("div", { class: "readout" }, sC, sT, sS), status));
      reset();
      el.append(
        P("Try five cycles slowly, then a new cell at full speed. Faster charging means ions are grabbed by the first metal they meet, so tips win more strongly. The real effect is the same: fast charging favours dendrites."),
        P("This is history, not theory. Rechargeable lithium-metal cells went on sale in the late 1980s and were recalled in 1989 after fires. The fix was to stop plating lithium metal at all."),
        takeaway("Plated lithium does not grow back flat: it grows needles (dendrites) that can pierce the separator and short the cell. That rules out plain lithium metal as a rechargeable anode."));
      return () => { clearTimeout(busy); };
    },
    check: {
      type: "choice", q: "Why is a dendrite that reaches the cathode so dangerous?",
      options: ["It is a metal path inside the cell: electrons flow through it directly, and the cell's energy becomes heat", "It uses up the Li⁺ ions in the electrolyte, so the voltage slowly drops to zero", "It makes the anode heavier, which lowers the specific capacity"],
      answer: 0, wrongHints: { 1: "Plating takes Li⁺ out of the electrolyte only while the cathode puts the same number back in. The danger is the metal bridge itself: think of the short circuit in the Daniell cell capstone.", 2: "The needle is the same lithium that was there before, only in a worse shape. What matters is what it touches." },
      why: "A cell works only because electrons must take the outside wire. A metal needle through the separator is an internal wire: a short circuit, with all the energy released as heat in a flammable liquid.",
    },
  });

  // ---------------------------------------------------------------- 5
  steps.push({
    title: "Intercalation: lithium as a guest",
    short: "Intercalation",
    newConcepts: ["intercal", "host"],
    render(el) {
      el.append(style(),
        P("If lithium metal cannot be trusted, never make lithium metal. Give each lithium a seat inside another solid instead."),
        P("Graphite, the form of carbon in a pencil, is built of flat sheets of carbon atoms stacked like paper. The sheets are strong; the gaps between them are roomy. A Li⁺ ion arriving from the electrolyte can slide into a gap and sit there. The electron that belongs with it arrives through the wire and spreads over the carbon sheets. Charge is balanced, and no metal has formed."),
        P("Sliding a guest into a solid that keeps its structure is called <b>intercalation</b>. The solid is the <b>host lattice</b>. The guest can slide out again just as easily, so the reaction is reversible almost by construction. You have seen a cousin of this: the <em>metal hydride</em> of the NiMH cell stored hydrogen atoms inside an alloy. And the MnO₂ of the coin cell was a host too."),
        P("Push lithium in and watch the host."));
      const cell = makeCell({ solo: true, anode: "graphite", n0: 0, seed: 9 });
      const sX = stat("x in LiₓC₆", "y"), sN = stat("seats taken", "b"), sSw = stat("stack thickness", "g"), sB = stat("carbon sheets rebuilt", "");
      const status = h("div", { class: "li-status" });
      const say = (t, cls) => { status.className = "li-status " + (cls || ""); status.innerHTML = t; };
      let auto = null; const stopAuto = () => { clearInterval(auto); auto = null; };
      function upd(mode) {
        sX.set(fmt.n(cell.n / 12)); sN.set(cell.n + " / 12"); sB.set("0");
        const gal = new Set(); for (let i = 0; i < cell.n; i++) gal.add([0, 2, 1, 3][Math.floor(i / 3)]);
        sSw.set("+" + fmt.n(gal.size * 2.6, 1) + "%");
        cell.labels(mode || "idle", `graphite · LiₓC₆, x = ${fmt.n(cell.n / 12)}`);
      }
      function ins() {
        if (!cell.move(1)) { cell.setPlated(Math.min(3, cell.plated + 1)); say("Every seat is taken (x = 1, one lithium per six carbons). A lithium forced in now has nowhere to sit: it plates on the surface as metal, and you are back at dendrites.", "bad"); upd("charge"); return false; }
        say(cell.n <= 6 ? "Li⁺ slides into a gap, its electron arrives through the wire. Lithium fills every second gap first." : cell.n < 12 ? "Now the gaps in between fill up. The sheets move about 10% apart where lithium sits (drawn larger than life), and nothing else changes." : "Full: LiC₆. The grey graphite has turned golden, which is the real colour of LiC₆."); upd("charge"); return true;
      }
      function out() {
        cell.setPlated(0);
        if (!cell.move(-1)) { say("Empty: plain graphite again, exactly as it started."); upd("idle"); return false; }
        say("A Li⁺ slides out into the electrolyte and its electron leaves through the wire. The sheets close up again."); upd("discharge"); return true;
      }
      el.append(widget("A graphite host seen edge-on: five carbon sheets, four gaps, twelve seats (sheet swelling exaggerated 2×)",
        cell.svg, legend("grey bars = carbon sheets"),
        h("div", { class: "btns" },
          h("button", { class: "primary", onclick: () => { stopAuto(); ins(); } }, "Push one Li⁺ in"),
          h("button", { onclick: () => { stopAuto(); out(); } }, "Pull one out"),
          h("button", { onclick: () => { stopAuto(); auto = setInterval(() => { if (cell.n >= 12 || !ins()) stopAuto(); }, 300); } }, "Fill it"),
          h("button", { onclick: () => { stopAuto(); auto = setInterval(() => { if (!out()) stopAuto(); }, 300); } }, "Empty it")),
        h("div", { class: "readout" }, sX, sN, sSw, sB), status));
      say("Empty graphite. The sheets are 0.335 nm apart."); upd("idle");
      el.append(
        formula(`${f("C6 + Li^+ + e- <-> LiC6")}<small>→ charging (lithium goes in) · ← discharging (lithium comes out). Lithium stays Li⁺ inside; the carbon sheets carry the electron.</small>`),
        P("Compare the electrodes of earlier lessons. Zinc became ZnO, lead became PbSO₄, cadmium became Cd(OH)₂: every cycle tore one crystal down and built another. Here the sheets just breathe by about 10%. That is why intercalation electrodes survive thousands of cycles."),
        takeaway("Intercalation: Li⁺ slides into empty seats of a host lattice, with the electron going to the host, and the host keeps its structure. No lithium metal, no rebuilding."));
      return () => { stopAuto(); cell.stop(); };
    },
    check: {
      type: "choice", q: "The zinc of an alkaline cell ends up as ZnO, the lead of a car battery as PbSO₄. What is different when graphite takes up lithium?",
      options: ["The carbon sheets stay as they are: Li⁺ only occupies the gaps between them and can slide out again", "Graphite dissolves into the electrolyte as carbon ions while lithium metal takes its place", "Lithium and carbon form a brand-new crystal that is rebuilt from scratch on every charge"],
      answer: 0, wrongHints: { 1: "Nothing dissolves and no lithium metal forms: avoiding metal is the whole point. Watch the grey bars while you fill the host.", 2: "That describes the zinc and lead electrodes. Count how many carbon sheets were rebuilt in the widget." },
      why: "The host keeps its structure and the guest moves in and out of ready-made seats. Nothing is torn down, which is why this reverses so cleanly.",
    },
  });

  // ---------------------------------------------------------------- 6
  steps.push({
    title: "The graphite anode: what the host costs",
    short: "Graphite anode LiC₆",
    newConcepts: ["graphite"],
    render(el) {
      el.append(style(),
        P("A host is dead weight: carbon that carries no charge of its own. How much does safety cost?"),
        P(`Graphite is full at one lithium per six carbon atoms, <b>${f("LiC6")}</b>. Apply the <em>specific capacity</em> formula to the host: one electron per ${f("C6")}, and six carbons weigh 6 × ${EL.C.mass} = ${fmt.n(C6_M)} g/mol.`),
        formula(`capacity = <span class="hl">n × F</span> / (3.6 × <span class="bl">M</span>) = 1 × ${Chem.F} / (3.6 × ${fmt.n(C6_M)}) = <span class="hl">${Math.round(GR_CAP)} mAh/g</span><small>per gram of graphite. Lithium metal: ${Math.round(LI_CAP)} mAh/g.</small>`),
        P(`Ten times worse than the bare metal, and on charge per gram alone now behind zinc and cadmium. But the push is almost untouched: a lithium inside graphite sits only about 0.1 V below lithium metal on the ladder, and energy is charge × voltage. Move the slider to see what a host with more or fewer carbons per lithium would do to our 0.100 mol example.`));
      let nC = 6;
      const blocks = h("div", { class: "li-blocks" });
      const sCap = stat("capacity of the host", "y"), sM = stat("host for 0.100 mol Li", "b"), sTot = stat("anode mass, host + lithium", "g"), sR = stat("anode mass vs bare lithium", "r");
      const note = h("div", { class: "li-status" });
      const names = ["lithium metal", "this host", "zinc", "cadmium", "lead"], volts = [3.8, 3.7, 1.5, 1.2, 2.05];
      const hb = hbars(names, { max: 4000, fmtv: (v) => Math.round(v) + " mAh/g", labelWidth: 96 });
      const hbE = hbars(names.map((n, i) => `${n} × ${volts[i]} V`), { max: 15, fmtv: (v) => fmt.n(v, 2) + " Wh/g", labelWidth: 150 });
      function upd() {
        const M = nC * EL.C.mass, cap = Chem.capacity(1, M), g = MOL * M, side = (x) => Math.sqrt(x) * 26;
        sCap.set(Math.round(cap) + " mAh/g"); sM.set(fmt.n(g) + " g"); sTot.set(fmt.n(g + LI_G) + " g"); sR.set(fmt.n((g + LI_G) / LI_G, 1) + "×");
        const caps = [LI_CAP, cap, Chem.capacity(2, EL.Zn.mass), Chem.capacity(2, EL.Cd.mass), Chem.capacity(2, EL.Pb.mass)], cols = [GRN, YEL, "#4a5568", "#4a5568", "#4a5568"];
        hb.update(caps, cols); hbE.update(caps.map((c, i) => (c * volts[i]) / 1000), cols);
        blocks.innerHTML = "";
        blocks.append(h("div", { class: "b" }, h("i", { style: `width:${side(LI_G)}px;height:${side(LI_G)}px;background:${GRN}` }), `Li: ${fmt.n(LI_G, 3)} g`),
          h("div", { class: "b" }, h("i", { style: `width:${side(g)}px;height:${side(g)}px;background:#7a8496` }), `carbon host: ${fmt.n(g)} g`));
        note.className = "li-status " + (nC === 6 ? "good" : "");
        note.innerHTML = nC === 6 ? `<b>Real graphite: LiC₆.</b> Our 0.100 mol of lithium (${fmt.n(LI_G, 3)} g, ${fmt.n(AH)} Ah) needs ${fmt.n(g)} g of graphite to sit in.`
          : nC < 6 ? `Hypothetical. Graphite cannot take more than one lithium per six carbons: beyond that the extra lithium plates as metal. Finding hosts with more seats per gram is what anode research is about.`
          : nC === 12 ? `LiC₁₂ is real: it is graphite at half charge, with every second gap filled (you saw that order in the last step).` : `A host with only one seat per ${nC} carbons: more dead weight per electron.`;
      }
      el.append(widget("Carbon atoms per lithium seat (6 is real graphite)",
        slider({ name: "C per Li", min: 2, max: 12, step: 1, value: 6, fmtv: (v) => "LiC" + String(v).replace(/\d/g, (d) => "₀₁₂₃₄₅₆₇₈₉"[d]), oninput: (v) => { nC = v; upd(); } }),
        h("div", { class: "note", style: "margin-top:10px" }, "Charge per gram of anode material"), hb,
        h("div", { class: "note" }, "Energy per gram of anode = mAh/g × the voltage of its usual cell (lithium-ion 3.7 V, alkaline 1.5 V, NiCd 1.2 V, lead–acid 2.05 V)"), hbE,
        h("div", { class: "note" }, "Squares drawn to scale: the lithium and the host that seats it"), blocks,
        h("div", { class: "readout" }, sCap, sM, sTot, sR), note));
      upd();
      el.append(
        P(`So the host costs most of lithium's capacity advantage: ${Math.round(GR_CAP)} mAh/g is less than zinc's ${Math.round(Chem.capacity(2, EL.Zn.mass))}. What survives is the voltage. Each of those milliamp-hours leaves at about 3.7 V instead of 1.2 to 2 V, so per gram of anode graphite still carries more energy than cadmium or lead, about as much as zinc, and unlike zinc it can be cycled thousands of times.`),
        takeaway(`The graphite anode stores one lithium per six carbons (LiC₆): ${Math.round(GR_CAP)} mAh/g, a tenth of lithium metal, at almost the same potential and without plating metal.`));
    },
    check: {
      type: "number", q: `Half-charged graphite is ${f("LiC12")}: one lithium per twelve carbons (12 × 12.011 = 144.13 g/mol). What is its capacity in <b>mAh per gram of carbon</b>? (F = 96485 C/mol)`,
      answer: Chem.capacity(1, 12 * EL.C.mass), tolerance: 2, shown: "186", hint: "capacity = n × F / (3.6 × M) with n = 1 and M = 144.13. Or: twice the carbon per electron means half of 372.",
      why: "96485 / (3.6 × 144.13) = 186 mAh/g, exactly half of LiC₆: the same charge spread over twice the host.", backTo: 4,
    },
  });

  // ---------------------------------------------------------------- 7
  steps.push({
    title: "A second host: LiCoO₂ and the rocking chair",
    short: "LiCoO₂ + rocking chair",
    newConcepts: ["layered", "rocking"],
    render(el) {
      el.append(style(),
        P(`The lithium needs somewhere to go when it leaves the graphite. Make the cathode a host too. The classic one is lithium cobalt oxide, ${f("LiCoO2")}, <b>LCO</b>: sheets of cobalt and oxygen with lithium in the gaps. It is a <b>layered oxide</b>. <em>Oxidation numbers</em> (from <em>Oxidation and reduction</em>): Li +1, O −2 twice, so cobalt is <b>+3</b>.`),
        P("Pull a Li⁺ out of the oxide and one cobalt must give up an electron to keep the books balanced: Co +3 → +4. Put the Li⁺ back and the cobalt takes an electron again."),
        formula(`<span class="hl">+ electrode</span> ${f("LiCoO2 <-> ")}Li<sub>1−x</sub>${f("CoO2 + ")}x${f("Li^+ + ")}x${f("e-")}<br><span class="bl">− electrode</span> ${f("C6 + ")}x${f("Li^+ + ")}x${f("e- <-> ")}Li<sub>x</sub>${f("C6")}<small>→ charging · ← discharging. About 3.7 V on average, 4.2 V when full.</small>`),
        P("Now both electrodes are hosts and the same Li⁺ ions swing from one to the other and back: the <b>rocking-chair mechanism</b>. This is the lithium-<i>ion</i> cell. Cells are built empty, with all the lithium in the oxide. Charge it."));
      const cell = makeCell({ anode: "graphite", cath: "LCO", n0: 0, seed: 21 });
      const sN = stat("Li in graphite", "y"), sCo = stat("average Co oxidation number", "p"), sLi = stat("oxidation number of Li", "g"), sE = stat("electrons moved through wire", "b");
      const status = h("div", { class: "li-status" });
      const say = (t, cls) => { status.className = "li-status " + (cls || ""); status.innerHTML = t; };
      let auto = null, moved = 0; const stopAuto = () => { clearInterval(auto); auto = null; };
      function upd(mode) {
        sN.set(cell.n + " / 12"); sCo.set("+" + fmt.n(3 + cell.n / 24)); sLi.set("+1"); sE.set(String(moved));
        cell.labels(mode || "idle", `graphite · x = ${fmt.n(cell.n / 12)}`, `Li₁₋ₓCoO₂ · Co +${fmt.n(3 + cell.n / 24)}`, mode === "charge" ? "charger" : mode === "discharge" ? "phone: on" : "open switch");
      }
      function chg() {
        if (!cell.move(1)) { say("Charged: graphite is full (LiC₆) and the oxide is down to Li<sub>0.5</sub>CoO₂, average cobalt +3.5. The dim dots are the half of the lithium that must stay, or the oxide's sheets collapse.", "good"); upd("idle"); return false; }
        moved++; say("The charger pulls an electron out of the oxide (a cobalt goes +3 → +4) and pushes it to the graphite. A Li⁺ leaves the oxide and crosses the electrolyte to join it. This is uphill: energy goes in."); upd("charge"); return true;
      }
      function dis() {
        if (!cell.move(-1)) { say("Discharged: every lithium is back in the oxide, all cobalt is +3 again. Both hosts look exactly as they did at the start."); upd("idle"); return false; }
        moved++; say("Downhill, by itself: graphite gives up an electron to the wire (oxidation, so it is the <em>anode</em>) and releases a Li⁺. Both end up in the oxide, where a cobalt drops +4 → +3 (reduction, the <em>cathode</em>)."); upd("discharge"); return true;
      }
      el.append(widget("A lithium-ion cell: graphite | electrolyte | LiCoO₂ (12 moving lithium = our 0.100 mol)",
        cell.svg, legend("dim dots = lithium that stays in the oxide"),
        h("div", { class: "btns" },
          h("button", { class: "primary", onclick: () => { stopAuto(); chg(); } }, "Charge: move one Li⁺"),
          h("button", { onclick: () => { stopAuto(); dis(); } }, "Discharge: move one Li⁺"),
          h("button", { onclick: () => { stopAuto(); auto = setInterval(() => { if (!chg()) stopAuto(); }, 280); } }, "Charge fully"),
          h("button", { onclick: () => { stopAuto(); auto = setInterval(() => { if (!dis()) stopAuto(); }, 280); } }, "Discharge fully")),
        h("div", { class: "readout" }, sN, sCo, sLi, sE), status));
      say("As built: empty graphite on the left, full LiCoO₂ on the right, nothing stored yet."); upd("idle");
      el.append(
        P("Watch the third readout. <b>Lithium is never oxidised or reduced.</b> It is Li⁺ in the oxide, Li⁺ in the electrolyte and Li⁺ between the carbon sheets. The electrons are traded between cobalt and the carbon sheets; lithium only keeps each host neutral. And the electrolyte is not used up, as in the nickel cells: one Li⁺ enters it for each one that leaves."),
        P("A naming habit: graphite is called “the anode” and the oxide “the cathode” in both directions, after their roles on discharge. The idea came together between the 1970s and 1991, when the first lithium-ion cells were sold; Whittingham, Goodenough and Yoshino shared the 2019 Nobel Prize in Chemistry for it."),
        takeaway("Rocking chair: Li⁺ shuttles between two hosts, graphite and a layered oxide such as LiCoO₂, while the electrons go round the wire. Cobalt (+3 ⇌ +4) and the carbon sheets do the redox; lithium stays +1."));
      return () => { stopAuto(); cell.stop(); };
    },
    check: {
      type: "choice", q: "A charged lithium-ion cell powers a phone (discharge). Which way do things move?",
      options: ["Li⁺ through the electrolyte and electrons through the wire both go from graphite to the oxide", "Li⁺ goes from graphite to the oxide; electrons go the other way, from the oxide to graphite", "Electrons travel through the electrolyte together with the Li⁺ ions"],
      answer: 0, wrongHints: { 1: "Then the oxide would collect positive ions while losing negative electrons, and charge would pile up. Each Li⁺ arriving in the oxide needs an electron arriving there too.", 2: "Electrons never cross the electrolyte: if they could, there would be no current in the wire. Ions inside, electrons outside (from The galvanic cell)." },
      why: "On discharge graphite is the anode: it releases an electron into the wire and a Li⁺ into the electrolyte. Both arrive at the oxide by different routes, and a cobalt takes the electron.", backTo: 4,
    },
  });

  // ---------------------------------------------------------------- 8
  steps.push({
    title: "Cathode families: LCO, NMC, LFP",
    short: "LCO, NMC, LFP",
    newConcepts: ["nmc", "lfp"],
    render(el) {
      el.append(style(),
        P("Graphite is the anode of nearly every lithium-ion cell. The cathode is where the chemistries differ, and it is named on the label. All of them work the same way: a host with seats for Li⁺ and a <em>transition metal</em> that changes oxidation number."),
        P(`<b>NMC</b>, ${f("LiNi")}<sub>x</sub>Mn<sub>y</sub>Co<sub>z</sub>${f("O2")}, is LCO with most of the cobalt replaced by nickel and manganese: the same layered oxide, cheaper, and more of its lithium can leave. Nickel does most of the electron work, manganese stays at +4 and steadies the sheets.`),
        P(`<b>LFP</b>, ${f("LiFePO4")}, is not layered. Its host is a rigid framework of iron and phosphate ions (${f("PO4^3-")}, a <em>polyatomic ion</em>) with tunnels for Li⁺. Oxidation numbers: Li +1, P +5, four O at −2, so iron is +2. On charge: ${f("LiFePO4 -> FePO4 + Li^+ + e-")}, iron +2 → +3.`),
        P("Pick a cathode. All numbers are for the cathode against graphite, with our 0.100 mol of moving lithium."));
      const keys = ["LCO", "NMC", "LFP"];
      const cell = makeCell({ anode: "graphite", cath: "LCO", n0: 6, seed: 4 });
      const pl = plot({ xmin: 0, xmax: 1, ymin: 2.4, ymax: 4.4, height: 220, narrow: true, minFont: 10, xlabel: "state of charge", ylabel: "cell voltage (V)", xticks: [0, 0.25, 0.5, 0.75, 1], yticks: [2.5, 3, 3.5, 4], xfmt: (v) => Math.round(v * 100) + "%" });
      const hbV = hbars(keys, { max: 4.2, fmtv: (v) => fmt.n(v) + " V", labelWidth: 44 });
      const hbC = hbars(keys, { max: 280, series: ["#4a5568", YEL], fmtv: (v) => Math.round(v), labelWidth: 44 });
      const hbW = hbars(keys, { max: 800, fmtv: (v) => Math.round(v) + " Wh/kg", labelWidth: 44 });
      const hbG = hbars(keys, { max: 22, fmtv: (v) => fmt.n(v, 1) + " g", labelWidth: 44 });
      const cards = h("div", { class: "li-cards" });
      let sel = "LCO";
      function upd() {
        const c = CATH[sel], cols = keys.map((k) => (k === sel ? CATH[k].col : "#4a5568"));
        cell.setCath(sel); cell.set(6);
        cell.labels("idle", "graphite, half full", `${c.name} · ${c.short || c.metal} +${fmt.n(oxOf(c, 0.5))}`, "half charged");
        pl.clear();
        keys.forEach((k) => { if (k !== sel) pl.fn((x) => CATH[k].V(clamp(x, 0.012, 0.99)), "#4a5568"); });
        pl.fn((x) => c.V(clamp(x, 0.012, 0.99)), c.col);
        pl.hline(c.Vavg, c.col, "average " + fmt.n(c.Vavg) + " V", { pos: "left", halo: true });
        hbV.update(keys.map((k) => CATH[k].Vavg), cols); hbV.mark(keys.indexOf(sel));
        hbC.update([keys.map((k) => Chem.capacity(1, CATH[k].M)), keys.map((k) => CATH[k].cap)]); hbC.mark(keys.indexOf(sel));
        hbW.update(keys.map((k) => CATH[k].cap * CATH[k].Vavg), cols); hbW.mark(keys.indexOf(sel));
        hbG.update(keys.map((k) => CATH[k].grams), cols); hbG.mark(keys.indexOf(sel));
        cards.innerHTML = "";
        [["host", sel === "LFP" ? "phosphate framework with tunnels" : "layered oxide: sheets with Li between"],
          ["redox", sel === "LCO" ? "Co +3 ⇌ +4" : sel === "NMC" ? "mostly Ni (up to +4), some Co +3 ⇌ +4; Mn stays +4" : "Fe +2 ⇌ +3"],
          ["Li that may leave", `about ${Math.round(c.use * 100)}%` + (sel === "LFP" ? " (the framework stands without it)" : " (the rest props the sheets apart)")],
          ["raw materials", c.cost], ["when abused", c.safety], ["cycle life", c.life + " (approximate)"], ["typical use", c.used]]
          .forEach(([k, v]) => cards.append(h("div", {}, k), h("div", { html: v })));
      }
      el.append(widget("Three cathode hosts against the same graphite anode",
        toggle("cathode:", keys.map((k) => [k, k]), "LCO", (k) => { sel = k; upd(); }),
        cell.svg, cards,
        h("div", { class: "note", style: "margin-top:12px" }, "Voltage against state of charge (simplified curves, shaped like measured ones)"), pl,
        h("div", { class: "note" }, "Average cell voltage"), hbV,
        h("div", { html: `<span class="note">Capacity, mAh per gram of cathode: <span style="color:#8a94a6">if every Li left</span> · <span style="color:${YEL}">usable</span></span>` }), hbC,
        h("div", { class: "note" }, "Energy per kg of cathode material (usable mAh/g × average V)"), hbW,
        h("div", { class: "note" }, `Cathode needed for our 0.100 mol (${fmt.n(AH)} Ah); the graphite side is ${fmt.n(MOL * C6_M)} g in all three`), hbG));
      upd();
      el.append(
        P("Two shapes to notice. The layered oxides slope: voltage tells you the <em>state of charge</em>. LFP is flat at about 3.3 V nearly all the way, a <em>flat discharge curve</em> like NiMH: steady, but hard to read a fuel gauge from."),
        P("And one trade. NMC packs the most energy per kilogram. LFP gives up some voltage, but its oxygen is locked inside phosphate ions, so it does not feed a fire, and iron costs little. A whole cell (both hosts, electrolyte, foils, case) reaches very roughly 150–200 Wh/kg with LFP and 200–300 with NMC as of 2026; <em>Real batteries</em> explains the gap to the numbers above."),
        takeaway("Same rocking chair, different cathode host: LCO and NMC are layered oxides (Co, Ni: about 3.7 V, most energy), LFP is an iron phosphate framework (Fe +2 ⇌ +3: about 3.3 V, flat, cheap, safest)."));
      return () => cell.stop();
    },
    check: {
      type: "choice", q: `An LFP cell is charged: ${f("LiFePO4 -> FePO4 + Li^+ + e-")}. Which atom's oxidation number changes?`,
      options: ["Iron: +2 in LiFePO₄, +3 in FePO₄", "Lithium: it is oxidised from 0 to +1 as it leaves", "Phosphorus: it drops from +5 to +4 to make up for the lost Li⁺"],
      answer: 0, wrongHints: { 1: "Lithium is already Li⁺ (+1) inside the host and stays +1 in the electrolyte. Something else must supply the electron: redo the sum for FePO₄ with P +5 and O −2.", 2: "The host loses a positive ion and an electron. Losing an electron raises an oxidation number, and phosphate stays as it is: P +5, O −2." },
      why: "In FePO₄: P +5 and four O at −2 leave +3 for iron. Iron gave the electron (+2 → +3); lithium was +1 before and after.", backTo: 6,
    },
  });

  // ---------------------------------------------------------------- 9
  steps.push({
    title: "The SEI: a skin that makes it all possible",
    short: "SEI layer",
    newConcepts: ["sei"],
    render(el) {
      el.append(style(),
        P("One thing does not add up. Charged graphite sits about 0.1 V from lithium metal: nearly the strongest reducing agent there is. The non-aqueous electrolyte has a wide window, but not that wide. Below roughly 1 V against lithium the solvent takes electrons and falls apart. Charged graphite should destroy its own electrolyte, as lithium destroys water."),
        P("It does, once. During the very first charge the electrolyte is reduced at the graphite surface, and the products are solids that stick there: lithium salts such as LiF and Li₂CO₃ among them. They form a film a few nanometres thick, the <b>solid electrolyte interphase</b>, or <b>SEI</b>."),
        P("The film has exactly the right pair of properties. <b>Li⁺ ions can pass through it. Electrons cannot.</b> With no electrons reaching the electrolyte, the reaction that built the film stops. The film protects the electrolyte from the graphite."),
        P("The price: the lithium locked in the film is gone for good, typically 5–10% on the first charge, and the film keeps thickening slowly. That is one main reason a lithium-ion cell fades with age."));
      const W = 400, H = 150;
      const svg = s("svg", { viewBox: `0 0 ${W} ${H}`, width: "100%", style: "display:block;margin:0 auto;max-width:600px" });
      svg.append(s("rect", { x: 130, y: 20, width: 250, height: 100, fill: BLUE, opacity: 0.07 }));
      for (let i = 0; i < 4; i++) svg.append(s("line", { x1: 20, x2: 130, y1: 28 + i * 28, y2: 28 + i * 28, stroke: "#e3b94f", "stroke-width": 5, "stroke-dasharray": "9 2" }));
      for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) svg.append(s("circle", { cx: 42 + j * 34, cy: 42 + i * 28, r: 6, fill: RED }));
      const film = s("rect", { x: 130, y: 20, width: 0, height: 100, fill: "#b8a98a", opacity: 0.85 }); svg.append(film);
      T(svg, 75, 136, "charged graphite", { fill: TEXT }); const filmT = T(svg, 150, 14, "", { fill: "#d8c9a8" }); T(svg, 300, 136, "electrolyte", {});
      const ePart = s("circle", { r: 4, fill: YEL }), iPart = s("circle", { r: 6, fill: RED, stroke: "#fff", "stroke-width": 1 }); svg.append(ePart, iPart);
      fitText(svg, 11.5, 1.3);
      const eMark = T(svg, 0, 62, "", { fill: YEL, weight: 700, size: 12 }), iMark = T(svg, 0, 100, "", { fill: RED, weight: 700, size: 12 });
      let mode = "real", cyc = 300, t = 0, timer = null;
      const model = (m, n) => {                                                 // TOY numbers: % of lithium lost to the film
        if (n < 1) return 0;
        return clamp(m === "leak" ? 8 + 0.08 * n : m === "block" ? 8 : 8 + 0.27 * Math.sqrt(n), 0, 100);
      };
      const usable = (m, n) => (m === "block" && n >= 1 ? 0 : 100 - model(m, n));
      const pl = plot({ xmin: 0, xmax: 2000, ymin: 0, ymax: 100, height: 200, narrow: true, minFont: 10, xlabel: "charge–discharge cycles", ylabel: "usable capacity (%)", xticks: [0, 500, 1000, 1500, 2000], yticks: [0, 20, 40, 60, 80, 100] });
      const mk = pl.marker(YEL);
      const sT = stat("film thickness (toy)", "y"), sL = stat("lithium lost to the film", "r"), sU = stat("usable capacity", "g");
      const status = h("div", { class: "li-status" });
      function upd() {
        const lost = model(mode, cyc), d = lost * 1.5, wpx = clamp(d * 1.6, 0, 200);
        film.setAttribute("width", wpx); filmT.textContent = cyc < 1 ? "" : "SEI film"; filmT.setAttribute("x", 130 + Math.max(24, wpx / 2));
        sT.set(Math.round(d) + " nm"); sL.set(fmt.n(lost, 1) + "%"); sU.set(fmt.n(usable(mode, cyc), 1) + "%");
        pl.clear();
        const pts = (m) => Array.from({ length: 201 }, (_, i) => [i * 10, usable(m, i * 10)]);
        pl.line(pts("real"), mode === "real" ? GRN : "#4a5568"); pl.line(pts("leak"), mode === "leak" ? RED : "#4a5568", true);
        if (mode === "block") pl.line(pts("block"), RED);
        mk.move(cyc, usable(mode, cyc));
        status.className = "li-status " + (mode === "real" ? "good" : "bad");
        status.innerHTML = cyc < 1 ? "Before the first charge: bare graphite, no film. Electrons from the charged graphite could reach the solvent freely."
          : mode === "real" ? `Real SEI: electrons are stopped at the film, Li⁺ passes. Growth slows as the film thickens (roughly with the square root of time), so after ${cyc} cycles ${fmt.n(usable(mode, cyc), 0)}% of the capacity is left.`
          : mode === "leak" ? `If the film let electrons through, electrolyte would keep being reduced at full speed on its outer face. The film never stops growing, and the lithium is ${lost >= 100 ? "all gone" : "draining away"}.`
          : "If the film stopped Li⁺ as well, the graphite would be sealed off: no ion could get in or out, and the cell would deliver nothing after its first charge.";
      }
      function anim() {
        t = (t + 0.02) % 1;
        const wpx = +film.getAttribute("width"), has = cyc >= 1;
        const eStop = has && mode !== "leak", iStop = has && mode === "block";
        const ex = eStop ? (t < 0.5 ? lerp(96, 126, t * 2) : lerp(126, 96, (t - 0.5) * 2)) : lerp(96, 130 + wpx + 26, t);
        ePart.setAttribute("cx", ex); ePart.setAttribute("cy", 56);
        eMark.setAttribute("x", eStop ? 118 : 130 + wpx + 34); eMark.textContent = eStop ? (t > 0.5 ? "✗" : "") : t > 0.85 ? "✶" : "";
        const ix = iStop ? (t < 0.5 ? lerp(360, 130 + wpx + 8, t * 2) : lerp(130 + wpx + 8, 360, (t - 0.5) * 2)) : lerp(360, 112, t);
        iPart.setAttribute("cx", ix); iPart.setAttribute("cy", 96);
        iMark.setAttribute("x", 130 + wpx + 20); iMark.textContent = iStop && t > 0.5 ? "✗" : "";
        timer = setTimeout(anim, 40);
      }
      el.append(widget("The graphite surface, magnified. Yellow: an electron trying to leave the graphite. Red: a Li⁺ trying to enter",
        svg,
        toggle("the film:", [["real", "real SEI"], ["leak", "leaks electrons"], ["block", "blocks Li⁺ too"]], "real", (m) => { mode = m; upd(); }),
        slider({ name: "cycles", min: 0, max: 2000, step: 10, value: cyc, fmtv: (v) => (v < 1 ? "before first charge" : String(v)), nameWidth: 60, oninput: (v) => { cyc = v; upd(); } }),
        pl, h("div", { class: "readout" }, sT, sL, sU), status,
        h("div", { class: "note", style: "margin-top:8px" }, "Toy model: 8% first-cycle loss and the growth rates are illustrative round numbers, not data for a particular cell.")));
      upd(); anim();
      el.append(
        P("So the lithium-ion cell runs outside its electrolyte's window on purpose, behind a skin it grows for itself. Aluminium does something similar with its oxide skin in air (see <em>Corrosion</em>)."),
        takeaway("The SEI is a thin film of lithium salts formed on graphite in the first charge. It passes Li⁺ and blocks electrons, so it stops electrolyte breakdown; its slow growth eats lithium and ages the cell."));
      return () => clearTimeout(timer);
    },
    check: {
      type: "choice", q: "What must a good SEI film do?",
      options: ["Let Li⁺ ions through but stop electrons", "Let electrons through but stop Li⁺ ions", "Stop both, so that nothing can react at the graphite surface"],
      answer: 0, wrongHints: { 1: "Electrons reaching the electrolyte are exactly what destroys it, and Li⁺ must get into the graphite or the cell cannot charge. Try the “leaks electrons” setting.", 2: "A film that stops Li⁺ seals the anode off: no ions in or out, no cell. Try the “blocks Li⁺ too” setting." },
      why: "It is a solid electrolyte: an ion path, not an electron path, just like the liquid electrolyte behind it. Blocking electrons ends the film-forming reaction; passing Li⁺ keeps the rocking chair moving.",
    },
  });

  // ---------------------------------------------------------------- 10
  steps.push({
    title: "Capstone: run the rocking chair",
    short: "Capstone: rocking chair",
    newConcepts: [],
    render(el) {
      el.append(style(),
        P(`Everything together. A graphite anode, a cathode host of your choice, a non-aqueous electrolyte between them and our 0.100 mol of lithium (${fmt.n(LI_G, 3)} g, ${fmt.n(AH)} Ah) rocking back and forth.`),
        P("The voltage is read from how full each host is: the cathode's potential minus the graphite's, each a function of the fraction of seats taken. It is the <em>Nernst equation</em>'s idea with seat occupancy in place of concentration. The cell is ideal here: no losses of any kind."));
      const keys = ["LCO", "NMC", "LFP"];
      let ck = "LCO", soc = 0.3, mode = "stop", I = 2.7, protect = true, hurt = false;
      const cell = makeCell({ anode: "graphite", cath: ck, n0: Math.round(soc * 12), seed: 33, speed: 0.07 });
      const pl = plot({ xmin: 0, xmax: 1.12, ymin: 2, ymax: 4.8, height: 230, narrow: true, minFont: 10, xlabel: "state of charge", ylabel: "cell voltage (V)", xticks: [0, 0.25, 0.5, 0.75, 1], yticks: [2, 2.5, 3, 3.5, 4, 4.5], xfmt: (v) => Math.round(v * 100) + "%" });
      const mk = pl.marker(YEL);
      const sV = stat("cell voltage", "y"), sS = stat("state of charge", "b"), sQ = stat("charge in graphite", ""), sE = stat("energy stored", "g"), sOx = stat("oxidation number", "p");
      const status = h("div", { class: "li-status" });
      const say = (t, cls) => { const c = "li-status " + (cls || ""); if (status.className !== c) status.className = c; if (status.innerHTML !== t) status.innerHTML = t; };
      const Vof = (x) => CATH[ck].V(clamp(x, 0.004, 1.12));
      function curves() {
        pl.clear();
        keys.forEach((k) => { if (k !== ck) pl.line(Array.from({ length: 101 }, (_, i) => [i / 100, CATH[k].V(clamp(i / 100, 0.012, 1))]), "#4a5568"); });
        const c = CATH[ck];
        pl.line(Array.from({ length: 113 }, (_, i) => [i / 100, c.V(clamp(i / 100, 0.012, 1.12))]).filter((p) => p[0] <= 1), c.col);
        pl.line(Array.from({ length: 13 }, (_, i) => [1 + i / 100, c.V(1 + i / 100)]), RED, true);
        pl.hline(c.vmax, "#8a94a6", "charge limit " + c.vmax + " V", { pos: "left", halo: true });
        pl.hline(c.vmin, "#8a94a6", "cut-off " + c.vmin + " V", { pos: "right", halo: true, below: true });
        pl.vline(1, "#8a94a6", "full", { halo: true });
      }
      function readout() {
        const c = CATH[ck], x = clamp(soc, 0, 1), v = Vof(soc);
        mk.move(soc, clamp(v, 2, 4.8));
        sV.set(fmt.n(v) + " V"); sS.set(Math.round(soc * 100) + "%"); sQ.set(fmt.n(x * AH) + " Ah");
        const ei = x * 400, e0 = c.E[Math.floor(ei)], e1 = c.E[Math.min(400, Math.floor(ei) + 1)];
        sE.set(fmt.n(lerp(e0, e1, ei - Math.floor(ei)) * AH, 1) + " Wh");
        sOx.setLabel(`average ${c.metal} oxidation number`); sOx.set("+" + fmt.n(oxOf(c, soc)));
        cell.labels(mode === "stop" ? "idle" : mode, `graphite · x = ${fmt.n(x)}`, `${c.name} · ${c.short || c.metal} +${fmt.n(oxOf(c, soc))}`, mode === "charge" ? "charger" : mode === "discharge" ? "load" : "open switch");
        const pk = soc > 1.005 && ck !== "LFP" ? Math.min(4, 1 + Math.floor((soc - 1) / 0.03)) : 0;
        if (pk !== cell.plated) cell.setPlated(pk);
      }
      function setMode(m) { mode = m; mt.set(m); }
      function step() {
        const c = CATH[ck];
        if (mode !== "stop") {
          const dir = mode === "charge" ? 1 : -1;
          soc = clamp(soc + dir * I * 0.0012, 0, 1.12);
          const v = Vof(soc);
          if (protect && dir > 0 && (soc >= 1 || v >= c.vmax)) { soc = Math.min(soc, 1); setMode("stop"); say(`Full. The protection circuit stopped the charge at ${c.vmax} V: graphite is at LiC₆ and ${ck === "LFP" ? "nearly all lithium has left the FePO₄ framework" : "the oxide has given all the lithium it safely can"}.`, "good"); }
          else if (protect && dir < 0 && (soc <= 0 || v <= c.vmin)) { setMode("stop"); say(`Empty. Cut-off at ${c.vmin} V: the lithium is back in the cathode host and the voltage is falling off a cliff.`, ""); }
          else if (dir < 0 && soc <= 0) { setMode("stop"); say("Completely empty: not one lithium left in the graphite. Real cells are damaged by going this low, which is why a cut-off exists.", "bad"); }
          else if (soc > 1.005) {
            hurt = true;
            say(ck === "LFP" ? "<b>Overcharge.</b> There is no lithium left to pull out of FePO₄, so the voltage shoots up until the electrolyte itself is oxidised at the cathode. The phosphate holds on to its oxygen, so this is the least violent of the three, but the cell is being damaged."
              : `<b>Overcharge.</b> The charger is pulling out lithium the oxide needs to stay standing; the stripped oxide can release oxygen and heat. And the graphite is already full, so the extra lithium <b>plates as metal</b>: dendrites.${cell.plated >= 4 ? " One has reached the separator." : ""}`, "bad");
            if (soc >= 1.12) setMode("stop");
          }
          else say(dir > 0 ? `Charging: the charger drives electrons from ${c.metal === "Fe" ? "iron" : "the oxide"} to the graphite, and Li⁺ follows through the electrolyte. Uphill: the voltage you must supply rises as the seats fill.` : `Discharging: graphite is the anode. Electrons go through the load, Li⁺ through the electrolyte, and both meet in the ${c.name} host.`, "");
          const target = Math.round(clamp(soc, 0, 1) * 12);
          if (cell.n < target) cell.move(1); else if (cell.n > target) cell.move(-1);
        }
        readout();
      }
      cell.onTick = step;
      const mt = toggle("", [["charge", "Charge"], ["stop", "Stop"], ["discharge", "Discharge"]], "stop", (m) => { mode = m; if (m === "stop") say("Stopped. With the switch open nothing moves: the lithium stays where it is and the voltage holds.", ""); });
      const ct = toggle("cathode:", keys.map((k) => [k, k]), ck, (k) => { ck = k; cell.setCath(k); cell.set(Math.round(clamp(soc, 0, 1) * 12)); curves(); readout(); });
      const pt = toggle("protection circuit:", [[true, "on"], [false, "off"]], true, (v) => { protect = v; });
      el.append(widget("Rocking-chair simulator (one hour of cell time runs in a few seconds)",
        h("div", { style: "display:flex;flex-wrap:wrap;gap:0 18px" }, ct, pt),
        cell.svg, legend("12 red dots = 0.100 mol of lithium"),
        mt,
        slider({ name: "current", min: 0.5, max: 8, step: 0.1, value: I, fmtv: (v) => v.toFixed(1) + " A", nameWidth: 60, oninput: (v) => (I = v) }),
        h("div", { class: "btns" },
          h("button", { onclick: () => { soc = 0.3; hurt = false; setMode("stop"); cell.set(Math.round(soc * 12)); cell.setPlated(0); say("A cell at 30% charge. Choose Charge or Discharge.", ""); readout(); } }, "Reset to 30%")),
        h("div", { class: "readout" }, sV, sS, sQ, sE, sOx), status, pl,
        h("div", { class: "note", style: "margin-top:6px" }, "Curves are simplified models shaped like measured ones; grey = the other two cathodes; red dashes = overcharge.")));
      curves(); say("A cell at 30% charge. Choose Charge or Discharge.", ""); readout();
      el.append(
        P("What to look for, each from an earlier step:"),
        h("ul", {},
          h("li", { html: `Charge to full and read <em>energy stored</em>: ${fmt.n(AH)} Ah × the average voltage. With LCO that is about ${fmt.n(CATH.LCO.Vavg * AH, 1)} Wh from ${fmt.n(LI_G, 3)} g of lithium. The 6.54 g zinc strip in the Daniell cell gave 5.9 Wh (<b>step 1</b>).` }),
          h("li", { html: "The cell voltage is 3 to 4 V at every point: about three water windows stacked. Nothing here could run in water (<b>step 2</b>)." }),
          h("li", { html: "Graphite turns from grey to gold and swells slightly as it fills, and shrinks back. No sheet is rebuilt (<b>steps 5 and 6</b>)." }),
          h("li", { html: "The dots that move are always Li⁺. The oxidation number that changes belongs to cobalt, nickel or iron (<b>steps 7 and 8</b>)." }),
          h("li", { html: "Switch to LFP: the voltage is lower and flat, then drops off a cliff at both ends (<b>step 8</b>)." }),
          h("li", { html: "Turn the protection circuit off and keep charging past 100% with LCO: lithium metal plates on the full graphite, the needles of <b>step 4</b>. This is why every lithium-ion pack has a circuit watching each cell's voltage." })),
        P("The simulator leaves out what makes real cells fall short of these numbers: resistance, heat and rate. That is the next lesson, <em>Real batteries</em>."),
        takeaway("A lithium-ion cell is two host lattices and a shuttling Li⁺: the lightest, most willing electron-giver, kept away from water and never allowed to become metal."));
      return () => cell.stop();
    },
  });

  Course.run({
    id: "lithium-ion",
    section: "3. Batteries, element by element",
    title: "Lithium: the lightest metal and the ion that shuttles",
    concepts: {
      liwin: "lithium: lowest E°, lightest metal", window: "water stability window", nonaq: "non-aqueous electrolyte",
      limetal: "lithium-metal primary cell (Li–MnO₂)", dendrite: "dendrite", intercal: "intercalation", host: "host lattice",
      graphite: "graphite anode (LiC₆)", layered: "layered oxide cathode (LiCoO₂, LCO)", rocking: "rocking-chair mechanism",
      nmc: "NMC (mixed layered oxide)", lfp: "LFP (LiFePO₄)", sei: "SEI layer",
    },
    sources: [
      { title: "OpenStax Chemistry 2e, §17.5 Batteries and Fuel Cells", url: "https://openstax.org/books/chemistry-2e/pages/17-5-batteries-and-fuel-cells", note: "lithium-ion cell: LiCoO₂ / graphite half-reactions, about 3.7 V" },
      { title: "Goodenough & Park (2013), The Li-Ion Rechargeable Battery: A Perspective, J. Am. Chem. Soc. 135, 1167", url: "https://doi.org/10.1021/ja3091438", note: "electrolyte window, why the SEI is needed, LCO / LFP host voltages" },
      { title: "Nobel Prize in Chemistry 2019: scientific background, Lithium-Ion Batteries", url: "https://www.nobelprize.org/prizes/chemistry/2019/advanced-information/", note: "history: Whittingham, Goodenough (LiCoO₂, 1980), Yoshino; Sony 1991; lithium-metal cell fires" },
      { title: "Wikipedia: Lithium-ion battery", url: "https://en.wikipedia.org/wiki/Lithium-ion_battery", note: "LiC₆ 372 mAh/g, LiPF₆ electrolyte, cathode families and typical voltages" },
      { title: "Wikipedia: Lithium iron phosphate", url: "https://en.wikipedia.org/wiki/Lithium_iron_phosphate", note: "LiFePO₄ ⇌ FePO₄, 170 mAh/g theoretical, about 3.4 V against lithium, flat curve" },
      { title: "Wikipedia: Solid electrolyte interphase", url: "https://en.wikipedia.org/wiki/Solid_electrolyte_interphase", note: "composition (LiF, Li₂CO₃ …), ion-conducting and electron-blocking film" },
      { title: "Wikipedia: Button cell (CR2032, lithium–manganese dioxide)", url: "https://en.wikipedia.org/wiki/Button_cell", note: "3 V nominal, about 225 mAh" },
      { title: "Peled (1979), The Electrochemical Behavior of Alkali and Alkaline Earth Metals in Nonaqueous Battery Systems, J. Electrochem. Soc. 126, 2047", url: "https://doi.org/10.1149/1.2128859", note: "the original SEI model" },
    ],
    steps,
  });
})();
