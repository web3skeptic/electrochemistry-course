// Lesson 4.1 — Electrolysis: forcing reactions uphill
(function () {
  const { h, s, widget, stat, slider, plot, toggle, hbars, rng, narrow } = Course;
  const f = Chem.f, F = Chem.F;
  const YEL = "#ffd166", RED = "#ff6b6b", BLUE = "#6cb4ff", GRN = "#5fd38d", MUTED = "#9aa3b5", TEXT = "#e6e9ef", DARK = "#12151c", PUR = "#c3a6ff";
  const ZN = "#aeb9c9", CU = "#d18a52", GRAPH = "#59616f", PT = "#cfd5df", FE = "#77818f", AG = "#e9ecf2", NI = "#9fb0a6", AL = "#d9dee8";
  const P = (html) => h("p", { html });
  const takeaway = (html) => h("div", { class: "takeaway", html });
  const formula = (html) => h("div", { class: "formula", html });
  const note = (html) => h("div", { class: "note", style: "margin-top:8px", html });
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const E0 = (id) => Chem.E0by[id].E;
  const M = (sym) => Chem.elements[sym].mass;
  const nf = (x, d = 2) => (x < 0 ? "−" : "") + Math.abs(x).toFixed(d);
  const sv = (x) => (x > 0.0005 ? "+" : x < -0.0005 ? "−" : "") + Math.abs(x).toFixed(2) + " V";
  const big = (x) => Math.round(x).toLocaleString("en-US").replace(/,/g, "\u202f");
  const VM = 24.47;                       // litres per mole of any gas at 25 °C and 1 atm (ideal gas)
  const E_DANIELL = E0("Cu") - E0("Zn");  // 1.10 V
  const EH7 = -0.0592 * 7;                // hydrogen level in neutral water (Nernst, [H⁺] = 10⁻⁷ mol/L): −0.41 V
  const EO7 = E0("O2") + EH7;             // oxygen level in neutral water: +0.82 V
  const M_H2 = 2 * M("H"), M_O2 = 2 * M("O"), M_CL2 = 2 * M("Cl"), M_NAOH = M("Na") + M("O") + M("H"), M_CO2 = M("C") + 2 * M("O");

  const style = h("style", {}, `
    .ely-legend { display:flex; flex-wrap:wrap; gap:4px 14px; margin-top:8px; font-size:13px; }
    .ely-legend i { display:inline-block; width:10px; height:10px; border-radius:50%; margin-right:5px; }
    .ely-status { min-height:48px; margin-top:10px; padding:8px 12px; border-left:3px solid var(--blue); background:var(--panel2); border-radius:6px; font-size:15px; }
    .ely-rx { display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-top:10px; font-size:14px; }
    .ely-rx > div { background:var(--panel2); border-radius:8px; padding:8px 10px; }
    .ely-rx .k { font-size:12px; color:var(--muted); display:block; }
    .ely-rx .r { font-size:15px; }
    @media (max-width:600px) { .ely-rx { grid-template-columns:1fr; } }
    .ely-chain td { font-family:inherit !important; }
    .ely-ok { color:var(--green); } .ely-bad { color:var(--red); }
    .ely-pred { display:flex; flex-wrap:wrap; gap:8px; align-items:center; margin-top:10px; }
    .ely-pred > span { color:var(--muted); font-size:14px; min-width:104px; }
    .ely-pred button.on { background:#2e2a18; border-color:var(--yellow); color:var(--yellow); }
  `);
  const legend = (extra) => h("div", { class: "note ely-legend", html:
    `<span><i style="background:${YEL}"></i>electron</span><span><i style="background:${RED}"></i>positive ion (cation)</span><span><i style="background:${BLUE}"></i>negative ion (anion)</span>${extra ? `<span>${extra}</span>` : ""}` });
  const statusBox = () => h("div", { class: "ely-status" });
  const rxBox = () => {
    const box = h("div", { class: "ely-rx" });
    box.set = (lk, lr, rk, rr) => { box.innerHTML = `<div><span class="k">${lk}</span><span class="r">${lr}</span></div><div><span class="k">${rk}</span><span class="r">${rr}</span></div>`; };
    return box;
  };

  // =====================================================================================
  // The bench: one vessel, two electrodes, a voltage source on top. Electrons really travel
  // along the wire, ions drift in the liquid, gases bubble. One timer drives everything.
  // Convention used in the whole lesson: the source's − terminal is wired to the LEFT electrode.
  // =====================================================================================
  function makeBench(o = {}) {
    const W = 400, H = 298, xL = 122, xR = 278, top = 26, surf = 140, bot = 258;
    const X = { L: xL, R: xR }, ZONE = { L: [58, 194], R: [206, 342], all: [58, 342] };
    const FS = narrow(1, 1.12);
    const svg = s("svg", { viewBox: `${narrow(0, 34)} 0 ${narrow(W, 332)} ${H}`, width: "100%", style: "display:block;margin:0 auto;max-width:560px" });
    const mk = () => { const g = s("g"); svg.append(g); return g; };
    const gLiq = mk(), gIon = mk(), gDiv = mk(), gEl = mk(), gBub = mk(), gTube = mk(), gWire = mk(), gE = mk(), gSrc = mk(), gTxt = mk();
    const rnd = rng(o.seed || 5);
    const B = { svg, dir: 0, rate: 0, bub: { L: null, R: null }, onTick: null, X };
    function T(g, x, y, str, a = {}) {
      const t = s("text", { x, y, "text-anchor": a.anchor || "middle", style: `font-size:${(a.size || 12) * FS}px;fill:${a.fill || TEXT};font-weight:${a.weight || 400}` });
      t.textContent = str; g.append(t); return t;
    }
    const rect = (g, x, y, w, hh, a) => { const r = s("rect", Object.assign({ x, y, width: Math.max(0, w), height: hh }, a)); g.append(r); return r; };

    // vessel
    const liqL = rect(gLiq, 52, surf, 148, bot - surf, { fill: "#9fb4d6", opacity: 0.08 });
    const liqR = rect(gLiq, 200, surf, 148, bot - surf, { fill: "#9fb4d6", opacity: 0.08 });
    gLiq.append(s("path", { d: `M50 116 V${bot + 2} H350 V116`, fill: "none", stroke: "#6b7689", "stroke-width": 2 }));
    B.setLiquid = (col, op, colR, opR) => {
      liqL.setAttribute("fill", col); liqL.setAttribute("opacity", op);
      liqR.setAttribute("fill", colR || col); liqR.setAttribute("opacity", opR == null ? op : opR);
    };
    B.setDivider = (kind, label) => {
      gDiv.innerHTML = "";
      if (!kind) return;
      gDiv.append(s("line", { x1: 200, x2: 200, y1: 124, y2: bot, stroke: kind === "membrane" ? PUR : "#8b95a8", "stroke-width": kind === "membrane" ? 4 : 3, "stroke-dasharray": kind === "membrane" ? "none" : "5 4" }));
      if (label) T(gDiv, 200, 92, label, { size: 11, fill: kind === "membrane" ? PUR : MUTED });
    };

    // electrodes
    const els = {};
    for (const sd of ["L", "R"]) {
      const x = X[sd], e = { w: 22 };
      e.rect = rect(gEl, x - 11, 66, 22, 170, { rx: 2, fill: GRAPH });
      e.dA = rect(gEl, x, surf + 5, 0, 91, { fill: CU }); e.dB = rect(gEl, x, surf + 5, 0, 91, { fill: CU });
      e.sym = T(gEl, x, 102, "", { size: 12, fill: DARK, weight: 700 });
      els[sd] = e;
    }
    B.setElectrode = (sd, a) => {
      const e = els[sd];
      e.rect.setAttribute("fill", a.col); e.sym.textContent = a.sym || ""; e.sym.style.fill = a.symCol || DARK;
    };
    B.setShape = (sd, w, dep, depCol) => {
      const e = els[sd], x = X[sd]; e.w = w;
      e.rect.setAttribute("x", x - w / 2); e.rect.setAttribute("width", w);
      e.sym.style.fontSize = (w < 15 ? 8 : 12) + "px";
      e.dA.setAttribute("x", x + w / 2); e.dA.setAttribute("width", dep || 0);
      e.dB.setAttribute("x", x - w / 2 - (dep || 0)); e.dB.setAttribute("width", dep || 0);
      if (depCol) { e.dA.setAttribute("fill", depCol); e.dB.setAttribute("fill", depCol); }
    };

    // gas-collecting tubes (optional)
    const gasY = { L: surf, R: surf }, tube = {};
    if (o.tubes) for (const sd of ["L", "R"]) {
      const x = X[sd];
      const fill = rect(gTube, x - 23, 59, 46, 0, { fill: "#fff", opacity: 0.22 });
      gTube.append(s("path", { d: `M${x - 24} 216 V58 H${x + 24} V216`, fill: "none", stroke: "#8b95a8", "stroke-width": 1.6 }));
      const lab = T(gTube, sd === "L" ? x - 30 : x + 30, 80, "", { size: 11, anchor: sd === "L" ? "end" : "start" });
      tube[sd] = { fill, lab }; gasY[sd] = 60;
    }
    B.setGas = (sd, frac, col, label) => {
      const t = tube[sd]; if (!t) return;
      const hh = clamp(frac, 0, 1) * 150;
      t.fill.setAttribute("height", hh); t.fill.setAttribute("fill", col); t.lab.textContent = label; t.lab.style.fill = col;
      gasY[sd] = 60 + hh;
    };

    // wire, source, electrons
    gWire.append(s("polyline", { points: `${xL},66 ${xL},${top} ${xR},${top} ${xR},66`, fill: "none", stroke: "#b9c2d3", "stroke-width": 2.5, "stroke-linejoin": "round" }));
    rect(gSrc, 158, 10, 84, 32, { rx: 6, fill: "#212734", stroke: "#b9c2d3", "stroke-width": 1.5 });
    const srcTxt = T(gSrc, 200, 31, "", { size: 14, fill: GRN, weight: 700 });
    const sgnL = T(gSrc, 150, 20, "", { size: 14, fill: TEXT, weight: 700 }), sgnR = T(gSrc, 250, 20, "", { size: 14, fill: TEXT, weight: 700 });
    const flowL = T(gSrc, 140, 44, "", { size: 11, fill: YEL, weight: 600 }), flowR = T(gSrc, 260, 44, "", { size: 11, fill: YEL, weight: 600 });
    B.setSource = (text, sl, sr) => { srcTxt.textContent = text; sgnL.textContent = sl == null ? "−" : sl; sgnR.textContent = sr == null ? "+" : sr; };
    const N = 10, es = [];
    for (let i = 0; i < N; i++) { const c = s("circle", { r: 3.4, fill: YEL, stroke: DARK, "stroke-width": 0.6 }); gE.append(c); es.push(c); }
    const pos = (u) => { const d = u * 236; return d < 40 ? [xL, 66 - d] : d < 196 ? [xL + d - 40, top] : [xR, top + d - 196]; };
    let phase = 0;

    // captions
    const roleL = T(gTxt, 105, 276, "", { size: 12, fill: YEL, weight: 600 }), roleR = T(gTxt, 295, 276, "", { size: 12, fill: YEL, weight: 600 });
    const cap = T(gTxt, 200, 293, "", { size: 11, fill: MUTED });
    B.setRoles = (l, r) => { roleL.textContent = l; roleR.textContent = r; };
    B.setCaption = (t) => { cap.textContent = t; };

    // ions. spec: { t, q, n, zone: "L"|"R"|"all", mode: "sink"|"src"|null, at: "L"|"R", from: "L"|"R", drift: ±1 }
    let ions = [];
    B.kinds = {};
    B.setIons = (specs) => {
      gIon.innerHTML = ""; ions = []; B.kinds = specs;
      for (const key in specs) {
        const k = specs[key], r = Math.abs(k.q) >= 2 ? 9 : 7, z = ZONE[k.zone || "all"];
        for (let i = 0; i < k.n; i++) {
          const g = s("g");
          g.append(s("circle", { r, fill: k.q > 0 ? RED : BLUE }));
          const t = s("text", { "text-anchor": "middle", dy: "0.36em", style: `font-size:${r === 9 ? 7 : 5.8}px;font-weight:700;fill:${DARK}` }); t.textContent = k.t; g.append(t);
          const p = { k, r, g, x: z[0] + r + rnd() * (z[1] - z[0] - 2 * r), y: 150 + r + rnd() * (100 - 2 * r), vx: (rnd() - 0.5) * 0.8, vy: (rnd() - 0.5) * 0.8, out: 0 };
          gIon.append(g); ions.push(p);
        }
      }
    };
    function moveIons(r) {
      for (const p of ions) {
        const k = p.k, z = ZONE[k.zone || "all"];
        if (rnd() < 0.04) { p.vx = (rnd() - 0.5) * 0.9; p.vy = (rnd() - 0.5) * 0.9; }
        let dx = p.vx;
        if (r > 0 && k.mode === "sink") {
          const xe = X[k.at];
          dx += Math.sign(xe - p.x) * (0.35 + 0.5 * r);
          if (Math.abs(p.x - xe) < 13) {
            if (k.from) { const sgn = rnd() < 0.5 ? -1 : 1; p.x = X[k.from] + sgn * 15; }
            else do { p.x = z[0] + p.r + rnd() * (z[1] - z[0] - 2 * p.r); } while (Math.abs(p.x - xe) < 34);
            p.y = 150 + p.r + rnd() * (100 - 2 * p.r);
          }
        } else if (r > 0 && k.mode === "src") {
          const xe = X[k.at];
          if (!p.out) p.out = p.x < xe ? -1 : 1;
          dx += p.out * (0.3 + 0.4 * r);
          if (p.x <= z[0] + p.r + 1 || p.x >= z[1] - p.r - 1) { p.out = rnd() < 0.5 ? -1 : 1; p.x = xe + p.out * 15; p.y = 150 + p.r + rnd() * (100 - 2 * p.r); }
        } else if (r > 0 && k.drift) dx += k.drift * 0.16 * (0.5 + r);
        p.x += dx; p.y += p.vy;
        if (p.x < z[0] + p.r) { p.x = z[0] + p.r; p.vx = Math.abs(p.vx); } else if (p.x > z[1] - p.r) { p.x = z[1] - p.r; p.vx = -Math.abs(p.vx); }
        if (p.y < 150 + p.r) { p.y = 150 + p.r; p.vy = Math.abs(p.vy); } else if (p.y > 250 - p.r) { p.y = 250 - p.r; p.vy = -Math.abs(p.vy); }
        p.g.setAttribute("transform", `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})`);
      }
    }
    let bubs = [];
    function moveBubbles(r) {
      for (const sd of ["L", "R"]) {
        const b = B.bub[sd];
        if (b && r > 0 && bubs.length < 44 && rnd() < Math.min(0.8, b.k * r * 0.45)) {
          const c = s("circle", { r: 2.2 + rnd() * 1.6, fill: b.col, "fill-opacity": b.solid ? 0.95 : 0.3, stroke: b.col, "stroke-width": 1 });
          const p = { c, sd, x: X[sd] + (rnd() < 0.5 ? -1 : 1) * (els[sd].w / 2 + 4), y: surf + 25 + rnd() * 70, v: 1.1 + rnd() };
          gBub.append(c); bubs.push(p);
        }
      }
      bubs = bubs.filter((p) => {
        p.y -= p.v;
        if (p.y < Math.max(gasY[p.sd], o.tubes ? 60 : surf) + 2) { p.c.remove(); return false; }
        p.c.setAttribute("cx", p.x); p.c.setAttribute("cy", p.y); return true;
      });
    }
    function tick() {
      if (B.onTick) B.onTick();
      const r = B.rate, on = B.dir && r > 0;
      if (on) phase += B.dir * (0.003 + 0.01 * Math.min(1.2, r));
      es.forEach((c, i) => { const u = (((phase + i / N) % 1) + 1) % 1, [x, y] = pos(u); c.setAttribute("cx", x.toFixed(1)); c.setAttribute("cy", y.toFixed(1)); });
      gE.setAttribute("opacity", on ? 1 : 0.22);
      const fl = !on ? "" : B.dir > 0 ? "e⁻ →" : "← e⁻";
      if (flowL.textContent !== fl) { flowL.textContent = fl; flowR.textContent = fl; }
      moveIons(on ? r : 0); moveBubbles(on ? r : 0);
    }
    let timer = null;
    const loop = () => { tick(); timer = setTimeout(loop, 40); };
    B.setIons(o.ions || {});
    B.setSource(o.source || "", null, null);
    loop();
    B.stop = () => clearTimeout(timer);
    return B;
  }

  // A potential ladder with evenly spaced rungs (most negative on top, as in Electrode potentials).
  // rungs: [{ lab, E, col, tag }]; arrow: { from: index, to: index, col }.
  function drawLadder(box, rungs, arrow, titleTop, titleBot, two) {
    const W = 380, rh = two ? 40 : 27, H = 34 + rungs.length * rh + (two ? 22 : 14);
    const svg = s("svg", { viewBox: `0 0 ${W} ${H}`, width: "100%", style: "display:block;margin:0 auto;max-width:520px" });
    const T = (x, y, str, a = {}) => { const t = s("text", { x, y, "text-anchor": a.anchor || "start", style: `font-size:${a.size || 12}px;fill:${a.fill || TEXT};font-weight:${a.weight || 400}` }); t.textContent = str; svg.append(t); return t; };
    T(8, 13, titleTop || "gives electrons more easily ↑", { size: 11, fill: MUTED });
    T(8, H - 3, titleBot || "takes electrons more easily ↓", { size: 11, fill: MUTED });
    const ys = rungs.map((_, i) => 34 + i * rh);
    rungs.forEach((r, i) => {
      svg.append(s("line", { x1: 70, x2: 118, y1: ys[i], y2: ys[i], stroke: r.col || "#6b7689", "stroke-width": r.col ? 3 : 2, "stroke-linecap": "round" }));
      T(62, ys[i] + 4, sv(r.E), { anchor: "end", fill: r.col || MUTED, size: 12 });
      T(126, ys[i] + 4, r.lab, { fill: r.col || TEXT, size: 12, weight: r.col ? 600 : 400 });
      if (r.tag) T(two ? 126 : W - 6, ys[i] + (two ? 19 : 4), r.tag, { anchor: two ? "start" : "end", fill: r.col || MUTED, size: 11 });
    });
    if (arrow && arrow.from !== arrow.to) {
      const y1 = ys[arrow.from], y2 = ys[arrow.to], up = y2 < y1, x = 94;
      svg.append(s("line", { x1: x, x2: x, y1: y1 + (up ? -3 : 3), y2: y2 + (up ? 9 : -9), stroke: arrow.col, "stroke-width": 2.5 }));
      svg.append(s("path", { d: up ? `M${x - 5} ${y2 + 10} L${x} ${y2 + 2} L${x + 5} ${y2 + 10} Z` : `M${x - 5} ${y2 - 10} L${x} ${y2 - 2} L${x + 5} ${y2 - 10} Z`, fill: arrow.col }));
      svg.append(s("circle", { cx: x, cy: y1, r: 4, fill: YEL, stroke: DARK, "stroke-width": 0.8 }));
    }
    box.innerHTML = ""; box.append(svg);
  }

  const steps = [];

  // ---------------------------------------------------------------- 1
  steps.push({
    title: "Push a Daniell cell backwards",
    short: "Push the cell backwards",
    newConcepts: ["electrolytic"],
    render(el) {
      el.append(style,
        P(`In <em>The galvanic cell</em> you let a Daniell cell run: zinc dissolved, copper plated out, and the electrons took the wire from zinc to copper. In <em>Electrode potentials</em> you put a number on the push: ${nf(E_DANIELL)} V, the drop from zinc (${sv(E0("Zn"))}) to copper (${sv(E0("Cu"))}) on the ladder. The reverse reaction, ${f("Zn^2+ + Cu -> Zn + Cu^2+")}, never goes by itself: it is uphill.`),
        P(`Now wire an adjustable voltage source into the circuit so that it pushes the electrons <b>the other way</b>: its negative terminal goes on the zinc. Two pushes oppose each other. Raise the source voltage and watch which one wins. The zinc strip is the 6.54 g one from <em>Charge, energy and capacity</em>.`));
      const B = makeBench({ seed: 11 });
      B.setElectrode("L", { sym: "Zn", col: ZN }); B.setElectrode("R", { sym: "Cu", col: CU });
      B.setDivider("porous", "porous wall");
      B.setLiquid("#9fb4d6", 0.07, "#3f9dff", 0.22);
      B.setCaption("zinc in ZnSO₄ solution · copper in CuSO₄ solution");
      const kinds = { Zn: { t: "Zn", q: 2, n: 5, zone: "L", at: "L" }, Cu: { t: "Cu", q: 2, n: 5, zone: "R", at: "R" }, SO4: { t: "SO₄", q: -2, n: 10, zone: "all" } };
      B.setIons(kinds);
      let V = 0, mZn = 6.54, mCu = 6.35, halted = "";
      const sOwn = stat("the cell's own push", "g"), sSrc = stat("the source pushes back", "b"), sNet = stat("net push", "y"), sZn = stat("zinc strip", ""), sCu = stat("copper strip", "");
      const msg = statusBox(), rx = rxBox();
      sOwn.set(nf(E_DANIELL) + " V");
      const shapes = () => { B.setShape("L", clamp(6 + 16 * mZn / 6.54, 6, 30)); B.setShape("R", clamp(6 + 16 * mCu / 6.35, 6, 30)); };
      function apply() {
        const net = E_DANIELL - V, mode = Math.abs(net) < 0.026 ? 0 : net > 0 ? 1 : -1;
        B.setSource(nf(V) + " V");
        B.dir = halted ? 0 : mode; B.rate = halted ? 0 : Math.abs(net) * 0.9 + 0.12;
        kinds.Zn.mode = mode > 0 ? "src" : mode < 0 ? "sink" : null; kinds.Cu.mode = mode > 0 ? "sink" : mode < 0 ? "src" : null; kinds.SO4.drift = -mode;
        sSrc.set(nf(V) + " V"); sNet.set(mode === 0 ? "0 V" : nf(Math.abs(net)) + " V " + (net > 0 ? "→" : "←"));
        sZn.set(nf(mZn) + " g"); sCu.set(nf(mCu) + " g");
        if (halted) { msg.innerHTML = halted; return; }
        if (mode > 0) {
          rx.set("zinc electrode: oxidation", f("Zn -> Zn^2+ + 2e-"), "copper electrode: reduction", f("Cu^2+ + 2e- -> Cu"));
          msg.innerHTML = V < 0.03 ? `Source at 0 V: this is the plain Daniell cell. It discharges at full push: zinc dissolves, copper plates out, electrons go zinc → copper.`
            : `The source pushes back with ${nf(V)} V, but the cell's ${nf(E_DANIELL)} V still wins. It keeps discharging in the usual direction, only more slowly.`;
        } else if (mode < 0) {
          rx.set("zinc electrode: reduction", f("Zn^2+ + 2e- -> Zn"), "copper electrode: oxidation", f("Cu -> Cu^2+ + 2e-"));
          msg.innerHTML = `<b>The source wins by ${nf(-net)} V.</b> Electrons are forced onto the zinc, where Zn²⁺ ions take them and plate on as metal. The copper is drained of electrons and dissolves. The reaction runs uphill.`;
        } else {
          rx.set("zinc electrode", "nothing", "copper electrode", "nothing");
          msg.innerHTML = `<b>Balance.</b> The source pushes exactly as hard as the cell. No electrons move, nothing reacts. (This is also how a careful voltmeter measures ${nf(E_DANIELL)} V without draining the cell.)`;
        }
      }
      B.onTick = () => {
        const net = E_DANIELL - V;
        if (halted || Math.abs(net) < 0.026) return;
        const dn = net * 0.0003;   // toy speed: mol of zinc dissolved per tick
        mZn -= dn * M("Zn"); mCu += dn * M("Cu");
        if (mZn <= 0.05) { mZn = 0.05; halted = "The zinc strip is used up: the cell is flat. Raise the source above 1.10 V to plate the zinc back, or press <i>Fresh cell</i>."; }
        if (mCu <= 0.05) { mCu = 0.05; halted = "The copper strip has dissolved completely: nothing is left to oxidise there. Lower the source below 1.10 V, or press <i>Fresh cell</i>."; }
        shapes(); sZn.set(nf(mZn) + " g"); sCu.set(nf(mCu) + " g");
        if (halted) apply();
      };
      const sl = slider({ name: "source", min: 0, max: 2.2, step: 0.05, value: 0, fmtv: (v) => nf(v) + " V", oninput: (v) => { V = v; if (halted && ((mZn < 1 && V > E_DANIELL) || (mCu < 1 && V < E_DANIELL))) halted = ""; apply(); } });
      const setV = (v) => { V = v; sl.set(v); if (halted && ((mZn < 1 && V > E_DANIELL) || (mCu < 1 && V < E_DANIELL))) halted = ""; apply(); };
      el.append(widget("A Daniell cell with a voltage source wired against it", B.svg, legend("the yellow arrow shows which way the electrons go"), sl,
        h("div", { class: "btns" },
          h("button", { onclick: () => setV(0.5) }, "0.50 V"),
          h("button", { onclick: () => setV(1.1) }, "1.10 V (balance)"),
          h("button", { class: "primary", onclick: () => setV(1.6) }, "1.60 V"),
          h("button", { onclick: () => { mZn = 6.54; mCu = 6.35; halted = ""; shapes(); apply(); } }, "Fresh cell")),
        h("div", { class: "readout" }, sOwn, sSrc, sNet, sZn, sCu), rx, msg));
      shapes(); apply();
      el.append(
        P(`Below ${nf(E_DANIELL)} V the cell still wins. At exactly ${nf(E_DANIELL)} V nothing moves. Above it the source wins: zinc ions are reduced back to metal and copper is oxidised. Electrical energy is being turned back into chemical energy.`),
        P(`Forcing a non-spontaneous redox reaction with an outside voltage is called <b>electrolysis</b>, and a cell run this way is an <b>electrolytic cell</b>. Same parts as a galvanic cell, opposite job.`),
        note(`Simplifications: both solutions are kept near 1 mol/L so the cell's own push stays at ${nf(E_DANIELL)} V, and the speed is a toy scale (more excess voltage, faster reaction).`),
        takeaway(`An outside source that out-pushes a cell drives its reaction backwards: that is electrolysis.`));
      return B.stop;
    },
    check: {
      type: "choice",
      q: `A Daniell cell pushes with ${nf(E_DANIELL)} V. You wire a <b>1.50 V</b> source against it, negative terminal on the zinc. What happens at the zinc electrode?`,
      options: ["Zn²⁺ ions take electrons and plate on as zinc metal", "Zinc keeps dissolving, only more slowly", "Nothing: the two voltages cancel"],
      answer: 0,
      wrongHints: { 1: "That is what happens while the source is weaker than 1.10 V. Here the source is the stronger one.", 2: "They cancel only when the source is exactly 1.10 V. With 1.50 V there is 0.40 V left over, pointing backwards." },
      why: "1.50 V beats 1.10 V, so electrons are forced onto the zinc and Zn²⁺ + 2e⁻ → Zn. The zinc strip grows.",
    },
  });

  // ---------------------------------------------------------------- 2
  steps.push({
    title: "Same names, flipped signs",
    short: "Anode, cathode and signs",
    newConcepts: ["signflip"],
    render(el) {
      el.append(style,
        P(`In <em>The galvanic cell</em> the names followed the chemistry, not the metal: the <em>anode</em> is the electrode where oxidation happens, the <em>cathode</em> is where reduction happens. That definition does not change. But when the source wins, the zinc stops being oxidised and Zn²⁺ is reduced on it instead.`),
        P(`So which electrode is now the anode, and what happens to the + and − signs? Predict for both modes, then read the table.`));
      const B = makeBench({ seed: 21 });
      B.setElectrode("L", { sym: "Zn", col: ZN }); B.setElectrode("R", { sym: "Cu", col: CU });
      B.setDivider("porous", "porous wall"); B.setLiquid("#9fb4d6", 0.07, "#3f9dff", 0.22);
      const kinds = { Zn: { t: "Zn", q: 2, n: 5, zone: "L", at: "L" }, Cu: { t: "Cu", q: 2, n: 5, zone: "R", at: "R" }, SO4: { t: "SO₄", q: -2, n: 10, zone: "all" } };
      B.setIons(kinds);
      let mode = "g";
      const solved = { g: false, e: false };
      const fb = h("div", { class: "note", style: "min-height:22px;margin-top:8px" });
      const tb = h("table", { class: "small ely-chain", style: "margin-top:10px" });
      const ROWS = {
        g: [["half-reaction", f("Zn -> Zn^2+ + 2e-"), f("Cu^2+ + 2e- -> Cu")], ["that is an", "oxidation", "reduction"], ["so it is the", "<b>anode</b>", "<b>cathode</b>"], ["electrons", "leave the cell here", "enter the cell here"], ["sign of the terminal", "<b>−</b>", "<b>+</b>"], ["ions that drift toward it", "anions (SO₄²⁻)", "cations (Cu²⁺)"]],
        e: [["half-reaction", f("Zn^2+ + 2e- -> Zn"), f("Cu -> Cu^2+ + 2e-")], ["that is a", "reduction", "oxidation"], ["so it is the", "<b>cathode</b>", "<b>anode</b>"], ["electrons", "enter the cell here", "leave the cell here"], ["sign of the terminal", "<b>−</b>", "<b>+</b>"], ["ions that drift toward it", "cations (Zn²⁺)", "anions (SO₄²⁻)"]],
      };
      function draw() {
        const g = mode === "g";
        B.setSource(g ? "0.50 V" : "1.60 V"); B.dir = g ? 1 : -1; B.rate = 0.6;
        kinds.Zn.mode = g ? "src" : "sink"; kinds.Cu.mode = g ? "sink" : "src"; kinds.SO4.drift = g ? -1 : 1;
        B.setCaption(g ? "galvanic: the cell wins and delivers energy" : "electrolytic: the source wins and stores energy");
        B.setRoles(solved[mode] ? (g ? "anode (−)" : "cathode (−)") : "?", solved[mode] ? (g ? "cathode (+)" : "anode (+)") : "?");
        tb.innerHTML = "";
        tb.append(h("tr", {}, h("th", {}, g ? "galvanic (discharging)" : "electrolytic (charging)"), h("th", {}, "zinc electrode"), h("th", {}, "copper electrode")));
        ROWS[mode].forEach((r) => tb.append(h("tr", {}, h("td", { html: r[0] }), h("td", { html: solved[mode] ? r[1] : "?" }), h("td", { html: solved[mode] ? r[2] : "?" }))));
      }
      const guess = (m) => {
        const right = (mode === "g") === (m === "Zn");
        if (right) { solved[mode] = true; fb.innerHTML = `<span class="ely-ok">Yes.</span> ${mode === "g" ? "Zinc is being oxidised (Zn → Zn²⁺ + 2e⁻), so zinc is the anode." : "Now copper is the one being oxidised (Cu → Cu²⁺ + 2e⁻), so copper is the anode. Zinc has become the cathode."}`; }
        else fb.innerHTML = `<span class="ely-bad">Not here.</span> Find the electrode that is losing electrons (follow the yellow dots: they leave the cell at the anode).`;
        draw();
      };
      el.append(widget("Which electrode is the anode right now?",
        toggle("Mode", [["g", "galvanic: source at 0.50 V"], ["e", "electrolytic: source at 1.60 V"]], "g", (v) => { mode = v; fb.innerHTML = ""; draw(); }),
        B.svg, legend(),
        h("div", { class: "btns" }, h("button", { onclick: () => guess("Zn") }, "Zinc is the anode"), h("button", { onclick: () => guess("Cu") }, "Copper is the anode")),
        fb, h("div", { class: "tablewrap" }, tb)));
      draw();
      el.append(
        P(`Compare the two tables. <b>What never changes:</b> oxidation at the anode, reduction at the cathode; electrons leave the cell through the anode; anions drift to the anode and cations to the cathode.`),
        P(`<b>What flips is the sign of the anode.</b> In a galvanic cell the anode is negative, because the reaction itself piles electrons up there. In an electrolytic cell the anode is positive, because the source is pulling electrons out of it. Rule for electrolysis: the electrode wired to the source's − terminal is the cathode.`),
        P(`Notice that the zinc electrode is the − terminal in both modes. Only its name changes. That is why a rechargeable battery has + and − printed on it, not “anode” and “cathode”.`),
        takeaway(`Anode = oxidation and cathode = reduction, always. In an electrolytic cell the cathode is the negative electrode and the anode the positive one, the opposite of a galvanic cell.`));
      return B.stop;
    },
    check: {
      type: "choice",
      q: "In an electrolytic cell, the electrode wired to the <b>negative</b> terminal of the source is…",
      options: ["the anode, because the anode is always the negative electrode", "the cathode: the source pushes electrons into it, so reduction happens there", "the anode, because electrons leave the source there"],
      answer: 1,
      wrongHints: { 0: "The anode is negative only in a galvanic cell. The fixed part of the definition is the chemistry: anode = oxidation.", 2: "Electrons do leave the source there, but that means they enter the cell at this electrode. Entering electrons get used in a reduction." },
      why: "The source's − terminal pushes electrons into that electrode. Something in the liquid takes them: a reduction. So it is the cathode.",
    },
  });

  // ---------------------------------------------------------------- 3
  steps.push({
    title: "How many volts is uphill? The decomposition voltage",
    short: "Decomposition voltage",
    newConcepts: ["inert", "decomp"],
    render(el) {
      el.append(style,
        P(`A simpler cell makes the rule visible. Dissolve copper chloride in water: it <em>dissociates</em> (from <em>Ions, salts and electrolytes</em>) into ${f("Cu^2+")} and ${f("2Cl^-")}. Dip in two rods of graphite, a form of carbon that conducts electrons but takes no part in the reaction here. Such a bystander is an <b>inert electrode</b>; platinum is the other classic choice.`),
        P(`Two identical rods in one solution have no push of their own. Turn the source up from zero.`));
      const VD = E0("Cl2") - E0("Cu");   // 1.02 V
      const B = makeBench({ seed: 31 });
      B.setElectrode("L", { sym: "C", col: GRAPH, symCol: TEXT }); B.setElectrode("R", { sym: "C", col: GRAPH, symCol: TEXT });
      B.setLiquid("#3fb9a5", 0.18); B.setCaption("CuCl₂ solution, two graphite rods");
      B.setIons({ Cu: { t: "Cu", q: 2, n: 5, zone: "all", mode: "sink", at: "L" }, Cl: { t: "Cl", q: -1, n: 10, zone: "all", mode: "sink", at: "R" } });
      const pl = plot({ xmin: 0, xmax: 2, ymin: 0, ymax: 1, width: narrow(520, 380), height: 170, xlabel: "source voltage (V)", ylabel: "current (toy units)", xticks: [0, 0.5, 1, 1.5, 2], yticks: [0, 0.5, 1] });
      pl.fn((v) => Math.max(0, v - VD), BLUE); pl.vline(VD, YEL, nf(VD) + " V");
      const mk = pl.marker();
      const msg = statusBox(), rx = rxBox();
      let V = 0, dep = 0;
      function apply() {
        const on = V > VD + 0.004;
        B.setSource(nf(V) + " V"); B.dir = -1; B.rate = on ? (V - VD) * 1.1 + 0.12 : 0;
        B.bub.R = on ? { col: "#cfe86a", k: 1.2 } : null;
        B.setRoles(on ? "cathode (−)" : "(−)", on ? "anode (+)" : "(+)");
        mk.move(V, Math.max(0, V - VD));
        if (on) {
          rx.set("left rod, cathode: reduction", f("Cu^2+ + 2e- -> Cu"), "right rod, anode: oxidation", f("2Cl^- -> Cl2 + 2e-"));
          msg.innerHTML = `Above ${nf(VD)} V: copper plates onto the negative rod and yellow-green chlorine gas bubbles off the positive one. Overall ${f("Cu^2+ + 2Cl^- -> Cu + Cl2")}.`;
        } else {
          rx.set("left rod (−)", "nothing", "right rod (+)", "nothing");
          msg.innerHTML = V < 0.03 ? "No voltage, no reaction. The ions just wander." : `${nf(V)} V is not enough. A whisker of copper and chlorine forms on the rods and pushes back just as hard as the source, so no steady current flows.`;
        }
      }
      B.onTick = () => { if (B.rate > 0 && dep < 9) { dep += B.rate * 0.012; B.setShape("L", 22, dep, CU); } };
      const sl = slider({ name: "source", min: 0, max: 2, step: 0.02, value: 0, fmtv: (v) => nf(v) + " V", oninput: (v) => { V = v; apply(); } });
      el.append(widget("Copper chloride solution between two inert rods", B.svg, legend("yellow-green bubbles = chlorine gas"), sl, pl, rx, msg));
      apply();
      el.append(
        P(`Why ${nf(VD)} V? The first traces of product turn the rods into a copper electrode and a chlorine electrode. Those two form a galvanic cell whose spontaneous reaction, ${f("Cu + Cl2 -> Cu^2+ + 2Cl^-")}, has E°cell = ${nf(E0("Cl2"))} − ${nf(E0("Cu"))} = ${nf(VD)} V (<em>E°cell = E°cathode − E°anode</em>). It pushes back, and the source has to beat it. This minimum is the <b>decomposition voltage</b>:`),
        formula(`V<sub>min</sub> = <span class="hl">E°(couple at the anode)</span> − <span class="bl">E°(couple at the cathode)</span><small>the same two table values as for the galvanic cell, with the roles swapped: V<sub>min</sub> = −E°cell of the reaction you are forcing</small>`),
        P(`On the ladder it is the height the electron must be lifted. Try other pairs:`));
      const CAT = [["Na", f("Na^+ -> Na")], ["Zn", f("Zn^2+ -> Zn")], ["H", f("2H^+ -> H2")], ["Cu", f("Cu^2+ -> Cu")], ["Ag", f("Ag^+ -> Ag")]];
      const AN = [["Zn", f("Zn -> Zn^2+")], ["Cu", f("Cu -> Cu^2+")], ["I2", f("2I^- -> I2")], ["Br2", f("2Br^- -> Br2")], ["O2", f("2H2O -> O2")], ["Cl2", f("2Cl^- -> Cl2")]];
      const IDS = ["Na", "Zn", "H", "Cu", "I2", "Ag", "Br2", "O2", "Cl2"];
      let cat = "Cu", an = "Cl2";
      const lad = h("div"), res = statusBox();
      function drawPick() {
        const rungs = IDS.map((id) => ({ lab: Chem.half(id).replace("→", "⇌"), E: E0(id), col: id === cat && id === an ? PUR : id === cat ? BLUE : id === an ? YEL : null, tag: id === cat && id === an ? "both" : id === cat ? "cathode" : id === an ? "anode" : "" }));
        const d = E0(an) - E0(cat), up = d > 0.0005;
        drawLadder(lad, rungs, { from: IDS.indexOf(an), to: IDS.indexOf(cat), col: up ? RED : GRN });
        res.innerHTML = Math.abs(d) < 0.0005 ? `Same rung on both sides: <b>0 V</b>. No climb at all. Any small voltage moves ${cat === "Cu" ? "copper" : "zinc"} from one electrode to the other (you will use this in step 9).`
          : up ? `The electron is taken from the ${sv(E0(an))} rung and lifted to the ${sv(E0(cat))} rung: <b>uphill by ${nf(d)} V</b>. Electrolysis: the source must supply at least ${nf(d)} V.${cat === "Na" ? " (In water something else gets reduced before Na⁺ does: step 6.)" : ""}`
          : `The electron falls from the ${sv(E0(an))} rung to the ${sv(E0(cat))} rung: <b>downhill by ${nf(-d)} V</b>. No source needed: this is a galvanic cell that delivers ${nf(-d)} V${an === "Zn" && cat === "Cu" ? ", the Daniell cell" : ""}.`;
      }
      el.append(widget("Lift an electron from the anode rung to the cathode rung",
        toggle("Reduce at the cathode", CAT, cat, (v) => { cat = v; drawPick(); }),
        toggle("Oxidise at the anode", AN, an, (v) => { an = v; drawPick(); }),
        lad, res, note("Rungs are evenly spaced, not to scale. Standard values (1 mol/L, 25 °C) from the course table.")));
      drawPick();
      el.append(
        note(`A real cell needs somewhat more than V<sub>min</sub> to run at a useful speed. Step 6 shows where that matters.`),
        takeaway(`The decomposition voltage is the uphill gap on the potential ladder: E° of the anode couple minus E° of the cathode couple.`));
      return B.stop;
    },
    check: {
      type: "number",
      q: `Zinc bromide solution, ${f("ZnBr2")}, between inert electrodes: zinc plates out (E° = ${sv(E0("Zn"))}) and bromine forms (E° = ${sv(E0("Br2"))}). What is the decomposition voltage, in volts?`,
      answer: +(E0("Br2") - E0("Zn")).toFixed(2), tolerance: 0.02,
      hint: "Anode couple minus cathode couple: 1.07 − (−0.76).",
      why: "1.07 − (−0.76) = 1.83 V. Run in reverse, the same pair is a 1.83 V galvanic cell (the zinc–bromine battery).",
    },
  });

  // ---------------------------------------------------------------- 4
  steps.push({
    title: "Counting atoms with an ammeter: Faraday's laws",
    short: "Faraday's laws",
    newConcepts: ["faradaylaws"],
    render(el) {
      el.append(style,
        P(`How much metal do you get? Every ${f("Zn^2+")} ion needs exactly two electrons, so <b>counting electrons counts atoms</b>. And you already know how to count electrons, from <em>Charge, energy and capacity</em>: charge = current × time (1 A = 1 C/s), and a mole of electrons carries F = ${big(F)} C (the <em>Faraday constant</em>).`),
        P(`In that lesson the 6.54 g zinc strip delivered 19\u202f297 C (5.36 Ah) while it dissolved. To plate it back, the same charge has to go the other way. Set the current and the time, and follow the chain.`));
      const MET = [
        { k: "Ag", ion: f("Ag^+"), n: 1, col: AG }, { k: "Cu", ion: f("Cu^2+"), n: 2, col: CU },
        { k: "Zn", ion: f("Zn^2+"), n: 2, col: ZN }, { k: "Al", ion: f("Al^3+"), n: 3, col: AL },
      ];
      let I = 2, tmin = 30, sel = 2;
      const tb = h("table", { class: "small ely-chain" });
      const bars = hbars(MET.map((m) => `${m.k} from ${m.ion}`), { max: 1, fmtv: (v) => nf(v, 2) + " g", onclick: (i) => { sel = i; tg.set(i); upd(); } });
      const tg = toggle("Metal", MET.map((m, i) => [i, `${m.ion} → ${m.k}`]), sel, (v) => { sel = v; upd(); });
      function upd() {
        const m = MET[sel], Q = I * tmin * 60, ne = Q / F, nm = ne / m.n, g = nm * M(m.k);
        tb.innerHTML = "";
        const row = (a, b, c) => tb.append(h("tr", {}, h("td", { html: a }), h("td", { html: b }), h("td", { class: "num", html: c })));
        row("charge", `${nf(I, 2)} A × ${big(tmin * 60)} s`, `${big(Q)} C`);
        row("electrons", `${big(Q)} C ÷ ${big(F)} C/mol`, `${nf(ne, 4)} mol`);
        row(`${m.k} atoms`, `÷ ${m.n} electron${m.n > 1 ? "s" : ""} per ${m.ion}`, `${nf(nm, 4)} mol`);
        row("mass", `× ${nf(M(m.k), 2)} g/mol`, `<b style="color:var(--yellow)">${nf(g, 2)} g</b>`);
        const all = MET.map((x) => (Q / F / x.n) * M(x.k)), top = Math.max(...all, 1e-9);
        bars.update(all.map((v) => v / top * 0.999), MET.map((x, i) => (i === sel ? YEL : "#4a5568")));
        bars.mark(sel);
        MET.forEach((x, i) => { bars.children[i * 3 + 2].textContent = nf(all[i], 2) + " g"; });
      }
      const sI = slider({ name: "current", min: 0.1, max: 10, step: 0.01, value: I, fmtv: (v) => nf(v, 2) + " A", oninput: (v) => { I = v; upd(); } });
      const sT = slider({ name: "time", min: 1, max: 120, step: 1, value: tmin, fmtv: (v) => v + " min", oninput: (v) => { tmin = v; upd(); } });
      el.append(widget("From amperes and seconds to grams", tg, sI, sT, h("div", { class: "tablewrap" }, tb),
        h("div", { class: "note", style: "margin-top:12px" }, "The same charge through four different cells (click a row):"), bars,
        h("div", { class: "btns" },
          h("button", { class: "primary", onclick: () => { I = 5.36; tmin = 60; sel = 2; sI.set(I); sT.set(tmin); tg.set(2); upd(); } }, "Replate the zinc strip: 5.36 A for 60 min"),
          h("button", { onclick: () => { I = 1; tmin = 1; sI.set(I); sT.set(tmin); upd(); } }, "1 A for 1 min"))));
      upd();
      el.append(
        P(`The whole chain in one line:`),
        formula(`mass = <span class="hl">I × t</span> / (<span class="bl">n × F</span>) × M<small>I × t = charge in coulombs · n = electrons per ion · F = ${big(F)} C/mol · M = molar mass in g/mol</small>`),
        P(`Michael Faraday found both regularities in the 1830s, decades before anyone knew of electrons. <b>First law:</b> the mass deposited is proportional to the charge passed (double the current or the time, double the mass). <b>Second law:</b> the same charge deposits different metals in proportion to M/n. Look at the bars: silver always comes out heaviest. One mole of electrons gives 107.9 g of silver but only 9.0 g of aluminium, because each ${f("Al^3+")} needs three electrons and is light.`),
        P(`This is <em>specific capacity</em> read backwards. Aluminium stores 2980 mAh in a gram, so making a gram of aluminium costs at least 2980 mAh.`),
        takeaway(`Faraday's laws: mass = (I·t / nF) × M. The charge counts the electrons, n electrons make one atom.`));
    },
    check: {
      type: "number",
      q: `A current of <b>2.00 A</b> runs for <b>30 minutes</b> through copper sulfate solution (${f("Cu^2+ + 2e- -> Cu")}, M = ${nf(M("Cu"), 2)} g/mol). How many grams of copper are deposited?`,
      answer: +((2 * 1800) / (2 * F) * M("Cu")).toFixed(2), tolerance: 0.02,
      hint: "2.00 A × 1800 s = 3600 C. Divide by 96 485 to get moles of electrons, halve for moles of copper, multiply by 63.55.",
      why: "3600 C ÷ 96 485 = 0.0373 mol of electrons → 0.0187 mol of Cu → 1.19 g.",
    },
  });

  // ---------------------------------------------------------------- 5
  steps.push({
    title: "Splitting water",
    short: "Splitting water",
    newConcepts: ["waterel", "gasvol"],
    render(el) {
      el.append(style,
        P(`The most famous electrolysis needs no metal ions at all. In the cell builder of <em>Electrode potentials</em>, hydrogen and oxygen made a 1.23 V galvanic cell whose product is water. Run it backwards and <b>water is taken apart</b>:`),
        formula(`${f("2H2O -> 2H2 + O2")}<small>uphill by 1.23 V · 4 electrons per O₂ · H goes from +1 to 0 (reduced), O from −2 to 0 (oxidised)</small>`),
        P(`Two platinum electrodes, each under an upturned tube that catches the gas. Choose what is dissolved in the water, then raise the voltage.`));
      const B = makeBench({ seed: 41, tubes: true });
      B.setElectrode("L", { sym: "Pt", col: PT }); B.setElectrode("R", { sym: "Pt", col: PT });
      const MED = {
        pure: { cap: "pure water", eh: EH7, eo: EO7, ions: {}, lr: f("2H2O + 2e- -> H2 + 2OH^-"), rr: f("2H2O -> O2 + 4H^+ + 4e-") },
        acid: { cap: "dilute sulfuric acid (H⁺, SO₄²⁻)", eh: E0("H"), eo: E0("O2"), ions: { H: { t: "H", q: 1, n: 8, zone: "all", mode: "sink", at: "L", from: "R" }, SO4: { t: "SO₄", q: -2, n: 4, zone: "all", drift: 1 } }, lr: f("2H^+ + 2e- -> H2"), rr: f("2H2O -> O2 + 4H^+ + 4e-") },
        base: { cap: "dilute sodium hydroxide (Na⁺, OH⁻)", eh: E0("H2O/H2"), eo: E0("O2/OH"), ions: { Na: { t: "Na", q: 1, n: 7, zone: "all", drift: -1 }, OH: { t: "OH", q: -1, n: 7, zone: "all", mode: "sink", at: "R", from: "L" } }, lr: f("2H2O + 2e- -> H2 + 2OH^-"), rr: f("4OH^- -> O2 + 2H2O + 4e-") },
      };
      let med = "acid", V = 0, nH2 = 0, Q = 0;
      const CAP = 60;   // mL of hydrogen the left tube holds
      const sH = stat("hydrogen (left tube)", "b"), sO = stat("oxygen (right tube)", "r"), sQ = stat("charge passed", "y"), sLv = stat("H₂ level / O₂ level", ""), sI = stat("current (toy)", "g");
      const msg = statusBox(), rx = rxBox();
      const cur = () => (med === "pure" ? 0 : Math.max(0, V - 1.23) * 2);
      function gas() {
        const mlH = nH2 * VM * 1000, mlO = mlH / 2;
        B.setGas("L", mlH / CAP, "#9fd0ff", "H₂ " + nf(mlH, 1) + " mL"); B.setGas("R", mlO / CAP, "#ffb3a8", "O₂ " + nf(mlO, 1) + " mL");
        sH.set(nf(mlH, 1) + " mL"); sO.set(nf(mlO, 1) + " mL"); sQ.set(big(Q) + " C");
      }
      function apply() {
        const m = MED[med], I = cur(), full = nH2 * VM * 1000 >= CAP;
        B.setSource(nf(V) + " V"); B.dir = -1; B.rate = I > 0 && !full ? 0.25 + I * 0.4 : 0;
        B.bub.L = { col: "#9fd0ff", k: 1.6 }; B.bub.R = { col: "#ffb3a8", k: 0.8 };
        B.setRoles("cathode (−)", "anode (+)"); B.setCaption(m.cap);
        sLv.set(sv(m.eh).replace(" V", "") + " / " + sv(m.eo)); sI.set(med === "pure" && V > 1.23 ? "≈ 0 A" : nf(I, 2) + " A");
        rx.set(`cathode: reduction (${sv(m.eh)})`, m.lr, `anode: oxidation (${sv(m.eo)})`, m.rr);
        msg.innerHTML = full ? "The hydrogen tube is full. Compare the two gas columns, then press <i>Empty the tubes</i>."
          : med === "pure" ? (V > 1.23 ? "Enough voltage, but almost nothing happens. Pure water has only 10⁻⁷ mol/L of H⁺ and of OH⁻: far too few ions to carry a real current. It needs an <em style='color:var(--blue);font-style:normal'>electrolyte</em>." : "Pure water, low voltage: nothing.")
          : V <= 1.23 ? `Below 1.23 V nothing happens, whatever is dissolved.`
          : `Above 1.23 V both electrodes fizz. Four electrons make two H₂ molecules on the left for every one O₂ on the right. The ${med === "acid" ? "sulfate" : "sodium"} ions only carry current: they are <em style='color:var(--blue);font-style:normal'>spectator ions</em>.`;
      }
      B.onTick = () => {
        const I = cur();
        if (I <= 0 || nH2 * VM * 1000 >= CAP) return;
        const dQ = I * 2.4;   // one tick = 2.4 s of bench time (1 real second ≈ 1 minute)
        Q += dQ; nH2 += dQ / (2 * F);
        gas();
        if (nH2 * VM * 1000 >= CAP) apply();
      };
      const setMed = (v) => { med = v; B.setIons(MED[v].ions); apply(); };
      const sl = slider({ name: "source", min: 0, max: 2.5, step: 0.01, value: 0, fmtv: (v) => nf(v) + " V", oninput: (v) => { V = v; apply(); } });
      el.append(widget("Water electrolysis with gas-collecting tubes (1 second ≈ 1 minute)",
        toggle("In the water", [["pure", "nothing (pure water)"], ["acid", "a little sulfuric acid"], ["base", "a little sodium hydroxide"]], med, setMed),
        B.svg, legend("H = H⁺, OH = OH⁻"), sl,
        h("div", { class: "btns" }, h("button", { class: "primary", onclick: () => { V = 2; sl.set(2); apply(); } }, "Set 2.00 V"), h("button", { onclick: () => { nH2 = 0; Q = 0; gas(); apply(); } }, "Empty the tubes")),
        h("div", { class: "readout" }, sH, sO, sQ, sI, sLv), rx, msg));
      setMed(med); gas();
      el.append(
        P(`<b>Twice as much hydrogen as oxygen</b>, always. Equal numbers of gas molecules fill equal volumes, whatever the gas: about 24.5 litres per mole at 25 °C and normal air pressure. So the 2 : 1 ratio of molecules in ${f("2H2 + O2")} shows up directly as a 2 : 1 ratio of volumes.`),
        P(`Switch between acid and base. The half-reactions are written differently (with ${f("H^+")} or with ${f("OH^-")}, as in <em>Balancing redox equations</em>), and both electrode levels move, but they move together. This is the <em>Nernst equation</em> at work: 59 mV per tenfold change in ${f("[H^+]")} for each. <b>The gap stays 1.23 V.</b>`),
        note(`The current here is a toy function of the voltage. Industrial electrolysers run at roughly 1.8 to 2 V per cell to get a useful rate. The reverse device, which makes current from H₂ and O₂, is the subject of <i>Hydrogen and fuel cells</i>.`),
        takeaway(`Water electrolysis: 2H₂O → 2H₂ + O₂ needs at least 1.23 V and a dissolved electrolyte, and gives hydrogen at the cathode and half that volume of oxygen at the anode.`));
      return B.stop;
    },
    check: {
      type: "number",
      q: "You run a water electrolysis until the cathode tube holds <b>30 mL</b> of hydrogen. How many mL of oxygen are in the anode tube?",
      answer: 15, tolerance: 0.2,
      hint: "2H₂O → 2H₂ + O₂: count the gas molecules on the right-hand side.",
      why: "15 mL. Two H₂ form for every O₂, and equal numbers of gas molecules take equal volumes.",
    },
  });

  // ---------------------------------------------------------------- 6
  steps.push({
    title: "Salt water: who gets the electron?",
    short: "Competing reactions",
    newConcepts: ["compete", "sluggish"],
    render(el) {
      el.append(style,
        P(`Dissolve table salt and electrolyse it. You might expect sodium metal and chlorine. But step 5 showed that <b>water itself can react at both electrodes</b>. So each electrode now has two candidates, and only one wins:`),
        h("ul", {},
          h("li", { html: `<b>Cathode:</b> the candidate that is <b>easiest to reduce</b> wins: the one lowest on the ladder (most positive E).` }),
          h("li", { html: `<b>Anode:</b> the candidate that is <b>easiest to oxidise</b> wins: the one highest on the ladder (least positive E).` })),
        P(`Water's two rungs in a neutral solution are ${sv(EH7)} (hydrogen) and ${sv(EO7)} (oxygen), from step 5. Predict both products, then check. Start with <em>ideal</em>, then switch to <em>real electrodes</em>.`));
      const H_EXTRA = 0.2, O_EXTRA = 0.6, CL_EXTRA = 0.05, H_ON_ZN = 0.75;   // typical extra volts for sluggish gas evolution (toy, order of magnitude)
      const ECl = (c) => Chem.nernst(E0("Cl2"), 2, c * c);
      const O2 = { lab: f("O2 + 4H^+ + 4e- <-> 2H2O"), E: EO7, extra: O_EXTRA, prod: "oxygen gas", gas: 1 };
      const H2 = (x) => ({ lab: f("2H2O + 2e- <-> H2 + 2OH^-"), E: EH7, extra: x == null ? H_EXTRA : x, prod: "hydrogen gas", gas: 1 });
      const SO4 = { lab: f("S2O8^2- + 2e- <-> 2SO4^2-"), E: 2.01, extra: 0, prod: "peroxodisulfate (from sulfate)" };
      const SOL = {
        CuSO4: { name: f("CuSO4"), cat: [{ lab: Chem.half("Cu").replace("→", "⇌"), E: E0("Cu"), extra: 0, prod: "copper metal" }, H2()], an: [O2, SO4], overall: f("2Cu^2+ + 2H2O -> 2Cu + O2 + 4H^+"), say: "Copper ions are far easier to reduce than water, so copper plates out. Sulfate is almost impossible to oxidise, so water is oxidised instead and the solution turns acidic." },
        NaClc: { name: "NaCl, concentrated", cat: [{ lab: Chem.half("Na").replace("→", "⇌"), E: E0("Na"), extra: 0, prod: "sodium metal" }, H2()], an: [O2, { lab: f("Cl2 + 2e- <-> 2Cl^-") + " (5 mol/L)", E: ECl(5), extra: CL_EXTRA, prod: "chlorine gas", gas: 1 }], overall: f("2Cl^- + 2H2O -> Cl2 + H2 + 2OH^-"), say: "Na⁺ never stands a chance: water is reduced 2.3 V earlier. At the anode the table favours oxygen, yet real cells give chlorine, because oxygen is so slow to form. Na⁺ and the new OH⁻ stay behind as sodium hydroxide." },
        NaCld: { name: "NaCl, very dilute", cat: [{ lab: Chem.half("Na").replace("→", "⇌"), E: E0("Na"), extra: 0, prod: "sodium metal" }, H2()], an: [O2, { lab: f("Cl2 + 2e- <-> 2Cl^-") + " (0.01 mol/L)", E: ECl(0.01), extra: CL_EXTRA, prod: "chlorine gas", gas: 1 }], overall: f("2H2O -> 2H2 + O2") + " (mostly)", say: "With little chloride around, its rung sits lower (Nernst: less reactant ion, less push) and few Cl⁻ ions reach the anode. Mostly oxygen forms." },
        KI: { name: "KI", cat: [{ lab: Chem.half("K").replace("→", "⇌"), E: E0("K"), extra: 0, prod: "potassium metal" }, H2()], an: [O2, { lab: Chem.half("I2").replace("→", "⇌"), E: E0("I2"), extra: 0, prod: "iodine" }], overall: f("2I^- + 2H2O -> I2 + H2 + 2OH^-"), say: "Iodide is easier to oxidise than water even on paper, so brown iodine appears at the anode. At the cathode water wins over K⁺ by a wide margin." },
        Na2SO4: { name: f("Na2SO4"), cat: [{ lab: Chem.half("Na").replace("→", "⇌"), E: E0("Na"), extra: 0, prod: "sodium metal" }, H2()], an: [O2, SO4], overall: f("2H2O -> 2H2 + O2"), say: "Neither ion can compete with water, at either electrode. The salt is a pure spectator and only the water is split: this is why step 5 could add an electrolyte without changing the products." },
        ZnSO4: { name: f("ZnSO4"), cat: [{ lab: Chem.half("Zn").replace("→", "⇌"), E: E0("Zn"), extra: 0, prod: "zinc metal" }, H2(H_ON_ZN)], an: [O2, SO4], overall: f("2Zn^2+ + 2H2O -> 2Zn + O2 + 4H^+"), say: "On paper water should be reduced before Zn²⁺. But hydrogen is especially slow to form on a zinc surface, so zinc plates anyway. This is the reason the zinc in step 1 could be plated back at all." },
      };
      let key = "NaClc", real = false, gc = -1, ga = -1;
      const lad = h("div"), res = statusBox();
      const eff = (c, side) => c.E + (real ? (side === "cat" ? -c.extra : c.extra) : 0);
      const winner = (S, side) => { const a = eff(S[side][0], side), b = eff(S[side][1], side); return side === "cat" ? (a > b ? 0 : 1) : (a < b ? 0 : 1); };
      const pc = h("div", { class: "ely-pred" }), pa = h("div", { class: "ely-pred" });
      const bc = [0, 1].map((i) => h("button", { onclick: () => { gc = i; draw(); } }, "")), ba = [0, 1].map((i) => h("button", { onclick: () => { ga = i; draw(); } }, ""));
      pc.append(h("span", {}, "At the cathode:"), ...bc); pa.append(h("span", {}, "At the anode:"), ...ba);
      function draw() {
        const S = SOL[key], done = gc >= 0 && ga >= 0, wc = winner(S, "cat"), wa = winner(S, "an");
        bc.forEach((b, i) => { b.textContent = S.cat[i].prod; b.classList.toggle("on", gc === i); });
        ba.forEach((b, i) => { b.textContent = S.an[i].prod; b.classList.toggle("on", ga === i); });
        const rungs = [];
        S.cat.forEach((c, i) => rungs.push({ lab: c.lab, E: eff(c, "cat"), col: done && i === wc ? BLUE : null, tag: (done && i === wc ? "wins · " : "") + "cathode" + (real && c.extra ? ` (−${nf(c.extra, 2)})` : "") }));
        S.an.forEach((c, i) => rungs.push({ lab: c.lab, E: eff(c, "an"), col: done && i === wa ? YEL : null, tag: (done && i === wa ? "wins · " : "") + "anode" + (real && c.extra ? ` (+${nf(c.extra, 2)})` : "") }));
        rungs.sort((a, b) => a.E - b.E);
        drawLadder(lad, rungs, null, "cathode candidates: the lowest one wins", "anode candidates: the highest one wins", true);
        if (!done) { res.innerHTML = "Pick one product for each electrode."; return; }
        const okc = gc === wc, oka = ga === wa;
        res.innerHTML = `Cathode: <b>${S.cat[wc].prod}</b> ${okc ? '<span class="ely-ok">✓</span>' : '<span class="ely-bad">✗</span>'} · Anode: <b>${S.an[wa].prod}</b> ${oka ? '<span class="ely-ok">✓</span>' : '<span class="ely-bad">✗</span>'}` +
          `<div style="margin-top:4px">${real ? S.say + " Overall: " + S.overall : "That is what the table alone predicts. Now switch to <i>real electrodes</i>: gases need extra voltage, and the answer may change."}</div>`;
      }
      el.append(widget("Two candidates at each electrode (inert electrodes, neutral solution)",
        toggle("Solution", Object.keys(SOL).map((k) => [k, SOL[k].name]), key, (v) => { key = v; gc = ga = -1; draw(); }),
        toggle("Electrodes", [[0, "ideal (table values only)"], [1, "real (gases are sluggish)"]], 0, (v) => { real = !!v; draw(); }),
        lad, pc, pa, res));
      draw();
      el.append(
        P(`Options at one electrode like these are <b>competing electrode reactions</b>. The table decides most cases: in water you can never plate out sodium, potassium, magnesium or aluminium, because water is reduced long before their ions.`),
        P(`The close calls are decided by speed. Making a gas molecule on a solid surface takes several awkward steps, so a gas only forms at a useful rate when the electrode is pushed <b>beyond</b> its table value: roughly ${nf(O_EXTRA, 1)} V extra for oxygen, less for chlorine, and for hydrogen anything from almost nothing (on platinum) to about ${nf(H_ON_ZN, 2)} V (on zinc). These extras are typical sizes, not constants: they depend on the electrode material and the current. Their proper name is <i>overpotential</i>, treated in <i>Real batteries</i>.`),
        takeaway(`In water, each electrode takes the easiest reaction on offer, and water is always one of the candidates. Sluggish gas formation can tip a close race: brine gives hydrogen and chlorine, not sodium and not oxygen.`));
    },
    check: {
      type: "choice",
      q: `You electrolyse a solution of aluminium sulfate, ${f("Al2(SO4)3")}, with inert electrodes. ${f("Al^3+")} sits at ${sv(E0("Al"))}; sulfate is almost impossible to oxidise. What do you collect?`,
      options: ["Aluminium metal at the cathode, oxygen at the anode", "Hydrogen at the cathode, oxygen at the anode: only the water is split", "Aluminium at the cathode and sulfur at the anode"],
      answer: 1, backTo: 4,
      wrongHints: { 0: `Compare the cathode candidates: Al³⁺ at ${sv(E0("Al"))} against water at about ${sv(EH7)}. Which is lower on the ladder, and so easier to reduce?`, 2: "Neither ion wins its race. Water is far easier to reduce than Al³⁺ and far easier to oxidise than sulfate." },
      why: `Water is reduced more than a volt before Al³⁺ would be, and oxidised long before sulfate. You get H₂ and O₂. To make aluminium, the water has to go (step 8).`,
    },
  });

  // ---------------------------------------------------------------- 7
  steps.push({
    title: "Chlor-alkali: three products from brine",
    short: "The chlor-alkali process",
    newConcepts: ["chloralkali"],
    render(el) {
      const VD = E0("Cl2") - E0("H2O/H2");   // 2.19 V
      const VCELL = 3.1;                     // typical membrane-cell voltage (approximate)
      el.append(style,
        P(`The concentrated-brine result of step 6 is one of the largest electrochemical industries on Earth, the <b>chlor-alkali process</b>:`),
        formula(`${f("2NaCl + 2H2O -> Cl2 + H2 + 2NaOH")}<small>anode: ${f("2Cl^- -> Cl2 + 2e-")} · cathode: ${f("2H2O + 2e- -> H2 + 2OH^-")} · V<sub>min</sub> = ${nf(E0("Cl2"))} − (${nf(E0("H2O/H2"))}) = ${nf(VD)} V</small>`),
        P(`All three products sell: chlorine (water treatment, plastics), sodium hydroxide (soap, paper, aluminium ore processing) and hydrogen. But there is a catch. Chlorine and hydroxide react with each other on contact. So the cell is split by a <em>separator</em>, here a membrane that lets only cations through. Take it out and see what you make instead.`));
      const B = makeBench({ seed: 51 });
      B.setElectrode("L", { sym: "Ni", col: NI }); B.setElectrode("R", { sym: "Ti", col: "#8f9bb0" });
      B.setSource(nf(VCELL, 1) + " V"); B.setRoles("cathode (−)", "anode (+)");
      let mem = 1, kA = 10;
      const msg = statusBox(), tb = h("table", { class: "small ely-chain" });
      function setup() {
        B.setDivider(mem ? "membrane" : null, mem ? "cation membrane" : "");
        B.setLiquid("#9fb4d6", 0.09, mem ? "#b9d86a" : "#9fb4d6", mem ? 0.12 : 0.09);
        B.setCaption(mem ? "left: water → NaOH solution · right: brine (NaCl)" : "one stirred pot of brine");
        B.setIons(mem ? { Na: { t: "Na", q: 1, n: 9, zone: "all", drift: -1 }, Cl: { t: "Cl", q: -1, n: 6, zone: "R", mode: "sink", at: "R" }, OH: { t: "OH", q: -1, n: 5, zone: "L", mode: "src", at: "L" } }
          : { Na: { t: "Na", q: 1, n: 9, zone: "all", drift: -1 }, Cl: { t: "Cl", q: -1, n: 6, zone: "all", mode: "sink", at: "R" }, OH: { t: "OH", q: -1, n: 5, zone: "all", mode: "sink", at: "R", from: "L" } });
        B.dir = -1; B.rate = 0.75;
        B.bub.L = { col: "#9fd0ff", k: 1.2 }; B.bub.R = mem ? { col: "#cfe86a", k: 1.2 } : null;
        msg.innerHTML = mem ? `<b>With the membrane.</b> Cl⁻ is oxidised to chlorine on the right. Water is reduced on the left, leaving OH⁻. Na⁺ ions cross the membrane toward the cathode and pair up with the OH⁻: pure sodium hydroxide solution on the left, chlorine gas on the right, hydrogen on top.`
          : `<b>No membrane.</b> The OH⁻ made at the cathode drifts to the anode, as anions do, and meets the fresh chlorine: ${f("Cl2 + 2OH^- -> Cl^- + ClO^- + H2O")}. No chlorine gas escapes. You have made sodium hypochlorite, household bleach (which is exactly how bleach is made).`;
        calc();
      }
      function calc() {
        const ne = kA * 1000 * 86400 / F, kWh = VCELL * kA * 24;
        tb.innerHTML = "";
        tb.append(h("tr", {}, h("th", {}, `per day at ${kA} kA`), h("th", { class: "num" }, "amount"), h("th", {}, "from")));
        const row = (a, b, c) => tb.append(h("tr", {}, h("td", { html: a }), h("td", { class: "num", html: b }), h("td", { html: c })));
        row("electrons", big(ne) + " mol", `${kA} 000 A × 86 400 s ÷ F`);
        if (mem) {
          row("chlorine", big(ne / 2 * M_CL2 / 1000) + " kg", "1 Cl₂ per 2 e⁻");
          row("sodium hydroxide", big(ne * M_NAOH / 1000) + " kg", "1 OH⁻ per e⁻");
        } else row("sodium hypochlorite (bleach)", big(ne / 2 * (M("Na") + M("Cl") + M("O")) / 1000) + " kg", "1 ClO⁻ per 2 e⁻");
        row("hydrogen", nf(ne / 2 * M_H2 / 1000, 1) + " kg", "1 H₂ per 2 e⁻");
        row("electricity", big(kWh) + " kWh", `${nf(VCELL, 1)} V × ${kA} kA × 24 h`);
        if (mem) row("electricity per tonne of chlorine", big(kWh / (ne / 2 * M_CL2 / 1e6)) + " kWh", "does not depend on the current");
      }
      el.append(widget("A chlor-alkali membrane cell",
        toggle("Separator", [[1, "cation membrane in"], [0, "membrane out"]], 1, (v) => { mem = v; setup(); }),
        B.svg, legend("blue bubbles = H₂ · yellow-green = Cl₂"), msg,
        slider({ name: "current", min: 1, max: 20, step: 1, value: kA, fmtv: (v) => v + " kA", oninput: (v) => { kA = v; calc(); } }),
        h("div", { class: "tablewrap" }, tb)));
      setup();
      el.append(
        P(`The table is Faraday's law at factory scale. The cell needs ${nf(VD)} V on paper and runs at about 3 V in practice, so close to 30% of the electricity ends up as heat. The world makes on the order of 100 million tonnes of chlorine a year this way (about 97 million in 2022), and every tonne comes with about 1.1 tonnes of sodium hydroxide whether the market wants it or not: the ratio is fixed by the equation.`),
        note(`The anode is titanium with a metal-oxide coating chosen to make chlorine easily and oxygen badly (step 6 again). The ${nf(VCELL, 1)} V is a typical figure, not a constant.`),
        takeaway(`Chlor-alkali: electrolysing brine gives chlorine at the anode, hydrogen and hydroxide at the cathode. A cation membrane lets Na⁺ carry the current while keeping the products apart.`));
      return B.stop;
    },
    check: {
      type: "choice",
      q: "In the membrane cell, what carries the current <b>through the membrane</b>, and in which direction?",
      options: ["Electrons, from the anode side to the cathode side", "Cl⁻ ions, from the cathode side to the anode side", "Na⁺ ions, from the anode side to the cathode side"],
      answer: 2, backTo: 1,
      wrongHints: { 0: "Electrons travel only in the wires and the electrodes. Inside the liquid, and through the membrane, charge is carried by ions.", 1: "Chloride starts on the anode side and is used up there. The membrane blocks anions, which is the whole point: it keeps OH⁻ away from the chlorine." },
      why: "Na⁺. Cations drift toward the cathode in any cell, and this membrane lets only cations pass. They meet the OH⁻ made at the cathode: sodium hydroxide.",
    },
  });

  // ---------------------------------------------------------------- 8
  steps.push({
    title: "No water, no competition: molten salts",
    short: "Molten salts: Na and Al",
    newConcepts: ["molten", "hallheroult"],
    render(el) {
      const capAl = Chem.capacity(3, M("Al"));   // mAh/g = Ah/kg
      el.append(style,
        P(`Step 6 left a problem. Sodium, magnesium, aluminium: the metals highest on the ladder can never be plated from water, because water is reduced first. The way out is to <b>remove the water</b>. An ionic solid has mobile ions when dissolved <i>or when melted</i> (the molten NaCl of the conductivity tester in <em>Ions, salts and electrolytes</em>). In a melt the only candidates are the salt's own ions. This is <b>molten-salt electrolysis</b>.`));
      const B = makeBench({ seed: 61 });
      B.setElectrode("L", { sym: "Fe", col: FE }); B.setElectrode("R", { sym: "C", col: GRAPH, symCol: TEXT });
      B.setRoles("cathode (−)", "anode (+)");
      const msg = statusBox(), rx = rxBox();
      function setSalt(m) {
        B.dir = -1; B.rate = 0.7;
        if (m) {
          B.setSource("7 V"); B.setLiquid("#ff9a3c", 0.3); B.setCaption("molten NaCl (+ CaCl₂), about 600 °C");
          B.setIons({ Na: { t: "Na", q: 1, n: 9, zone: "all", mode: "sink", at: "L" }, Cl: { t: "Cl", q: -1, n: 9, zone: "all", mode: "sink", at: "R" } });
          B.bub.L = { col: AL, k: 0.7, solid: true }; B.bub.R = { col: "#cfe86a", k: 1.2 };
          rx.set("cathode: reduction", f("Na^+ + e- -> Na") + " (liquid metal)", "anode: oxidation", f("2Cl^- -> Cl2 + 2e-"));
          msg.innerHTML = `<b>Molten.</b> No water in sight, so Na⁺ is the only thing at the cathode that can take electrons. Silvery droplets of liquid sodium float up; chlorine leaves at the anode. This is the Downs cell (1924). Calcium chloride is mixed in to lower the melting point from 801 °C to about 600 °C. The 25 °C table suggests a minimum near ${nf(E0("Cl2") - E0("Na"))} V; the cell is run at about 7 V.`;
        } else {
          B.setSource("3 V"); B.setLiquid("#9fb4d6", 0.09); B.setCaption("NaCl dissolved in water, 25 °C");
          B.setIons({ Na: { t: "Na", q: 1, n: 8, zone: "all", drift: -1 }, Cl: { t: "Cl", q: -1, n: 8, zone: "all", mode: "sink", at: "R" }, OH: { t: "OH", q: -1, n: 3, zone: "L", mode: "src", at: "L" } });
          B.bub.L = { col: "#9fd0ff", k: 1.2 }; B.bub.R = { col: "#cfe86a", k: 1.2 };
          rx.set("cathode: reduction", f("2H2O + 2e- -> H2 + 2OH^-"), "anode: oxidation", f("2Cl^- -> Cl2 + 2e-"));
          msg.innerHTML = `<b>In water.</b> Step 7 again: water takes the electrons, hydrogen bubbles off, and the sodium stays in solution as Na⁺.`;
        }
      }
      el.append(widget("The same salt, with and without water",
        toggle("Sodium chloride", [[0, "dissolved in water"], [1, "molten"]], 0, setSalt), B.svg,
        legend("blue bubbles = H₂ · yellow-green = Cl₂ · silver drops = liquid sodium"), rx, msg));
      setSalt(0);
      el.append(
        P(`<b>Aluminium</b> is the big one. Its ore gives aluminium oxide, ${f("Al2O3")}, which melts only at 2072 °C. In 1886 Charles Hall and Paul Héroult independently found the trick: dissolve the oxide in molten cryolite, ${f("Na3AlF6")}, which works near 960 °C. This is the <b>Hall–Héroult process</b>, and it is still how all primary aluminium is made.`),
        formula(`${f("2Al2O3 + 3C -> 4Al + 3CO2")}<small>cathode: ${f("Al^3+ + 3e- -> Al")} (liquid, sinks) · anode: ${f("C + 2O^2- -> CO2 + 4e-")} (the carbon blocks burn away) · 12 electrons per equation</small>`));

      // --- Hall–Héroult pot: schematic + production calculator
      const W = 400, H = 232;
      const svg = s("svg", { viewBox: `${narrow(0, 34)} 0 ${narrow(W, 332)} ${H}`, width: "100%", style: "display:block;margin:0 auto;max-width:560px" });
      const T = (x, y, str, a = {}) => { const t = s("text", { x, y, "text-anchor": a.anchor || "middle", style: `font-size:${a.size || 11}px;fill:${a.fill || TEXT};font-weight:${a.weight || 400}` }); t.textContent = str; svg.append(t); return t; };
      svg.append(s("path", { d: "M40 70 V206 H360 V70 H336 V182 H64 V70 Z", fill: "#3a404c", stroke: "#6b7689", "stroke-width": 1.5 }));
      svg.append(s("rect", { x: 64, y: 84, width: 272, height: 98, fill: "#ff9a3c", opacity: 0.28 }));
      const pool = s("rect", { x: 64, y: 164, width: 272, height: 18, fill: AL }); svg.append(pool);
      svg.append(s("line", { x1: 90, x2: 310, y1: 26, y2: 26, stroke: "#b9c2d3", "stroke-width": 4 }));
      const anodes = [118, 226].map((x) => {
        svg.append(s("line", { x1: x + 28, x2: x + 28, y1: 26, y2: 50, stroke: "#b9c2d3", "stroke-width": 4 }));
        const r = s("rect", { x, y: 50, width: 56, height: 84, fill: "#22262e", stroke: "#6b7689", "stroke-width": 1.2, rx: 2 }); svg.append(r); return r;
      });
      const gP = s("g"); svg.append(gP);
      T(200, 16, "carbon anodes (+): burn to CO₂", { fill: YEL, weight: 600 });
      const poolTxt = T(200, 177, "liquid aluminium", { size: 10, fill: DARK, weight: 700 });
      T(200, 200, "carbon lining = cathode (−)", { fill: YEL, weight: 600 });
      T(200, 224, "bath: molten cryolite + dissolved Al₂O₃, about 960 °C", { size: 10, fill: MUTED });
      const prnd = rng(8);
      let parts = [], burn = 0, kA = 300, Vc = 4.2;
      const mkIon = (kind) => {
        const g = s("g"); g.append(s("circle", { r: 6.5, fill: kind === "Al" ? RED : BLUE }));
        const t = s("text", { "text-anchor": "middle", dy: "0.36em", style: `font-size:6px;font-weight:700;fill:${DARK}` }); t.textContent = kind; g.append(t); gP.append(g);
        const p = { kind, g, x: 72 + prnd() * 256, y: 140 + prnd() * 16 }; parts.push(p); return p;
      };
      for (let i = 0; i < 4; i++) mkIon("Al");
      for (let i = 0; i < 6; i++) mkIon("O");
      let bubs = [], timer = null;
      const tick = () => {
        const sp = 0.3 + kA / 600;
        burn = (burn + sp * 0.02) % 26;
        anodes.forEach((r) => r.setAttribute("height", 84 - burn));
        const ab = 134 - burn;   // anode bottom
        pool.setAttribute("y", 164 - burn * 0.3); pool.setAttribute("height", 18 + burn * 0.3);
        for (const p of parts) {
          if (p.kind === "Al") { p.y += sp * 0.45; p.x += (prnd() - 0.5) * 1.2; if (p.y > 160 - burn * 0.3) { p.y = ab + 6 + prnd() * 8; p.x = 72 + prnd() * 256; } }
          else {
            const ax = Math.abs(p.x - 146) < Math.abs(p.x - 254) ? 146 : 254;
            p.x += Math.sign(ax - p.x) * sp * 0.4 + (prnd() - 0.5); p.y -= sp * 0.35;
            if (p.y < ab + 8) {
              if (bubs.length < 30) { const c = s("circle", { r: 2.6, fill: "#fff", "fill-opacity": 0.25, stroke: "#dfe5ee", "stroke-width": 1 }); gP.append(c); bubs.push({ c, x: ax + (prnd() < 0.5 ? -33 : 33), y: ab - 4 }); }
              p.y = 150 + prnd() * 8; p.x = 72 + prnd() * 256;
            }
          }
          p.x = clamp(p.x, 72, 328);
          p.g.setAttribute("transform", `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})`);
        }
        bubs = bubs.filter((b) => { b.y -= 1.3; if (b.y < 84) { b.c.remove(); return false; } b.c.setAttribute("cx", b.x); b.c.setAttribute("cy", b.y); return true; });
        timer = setTimeout(tick, 40);
      };
      tick();
      const sAl = stat("aluminium per day", "y"), sE = stat("electricity per kg", "b"), sC = stat("carbon burned per day", ""), sCO = stat("CO₂ from the anodes", "r"), sCan = stat("one 15 g drink can", "g");
      function calc() {
        const ne = kA * 1000 * 86400 / F, kgAl = ne / 3 * M("Al") / 1000, kwhkg = capAl * Vc / 1000;
        sAl.set(big(kgAl) + " kg"); sE.set(nf(kwhkg, 1) + " kWh"); sC.set(big(ne / 4 * M("C") / 1000) + " kg"); sCO.set(big(ne / 4 * M_CO2 / 1000) + " kg/day"); sCan.set(big(kwhkg * 15) + " Wh");
      }
      el.append(widget("One aluminium pot (schematic; ideal case: every electron makes aluminium)", svg,
        legend("Al = Al³⁺, O = O²⁻, white bubbles = CO₂"),
        slider({ name: "current", min: 100, max: 600, step: 10, value: kA, fmtv: (v) => v + " kA", oninput: (v) => { kA = v; calc(); } }),
        slider({ name: "voltage", min: 3.8, max: 5, step: 0.05, value: Vc, fmtv: (v) => nf(v) + " V", oninput: (v) => { Vc = v; calc(); } }),
        h("div", { class: "readout" }, sAl, sE, sC, sCO, sCan)));
      calc();
      el.append(
        P(`Move the current slider: the output changes but the electricity per kilogram does not. It is set by the voltage alone, because the charge per kilogram is fixed: ${big(capAl)} Ah, aluminium's <em>specific capacity</em>. Three electrons for a light atom, and each must be pushed through about 4 V. Real smelters use around 13 to 15 kWh per kilogram. People call aluminium <b>solid electricity</b>, and it is why recycling a can (which only needs melting) saves about 95% of the energy.`),
        note(`The pot is drawn with hanging anodes and the liquid metal as the real cathode surface at the bottom. Hundreds of such pots are wired in series, so the same current runs through all of them.`),
        takeaway(`Metals that water would beat to the electrons are made from melts. Hall–Héroult: Al₂O₃ dissolved in molten cryolite, 3 electrons per atom, about 4 V, hundreds of kiloamperes.`));
      return () => { B.stop(); clearTimeout(timer); };
    },
    check: {
      type: "number",
      q: `Making aluminium takes ${big(Chem.capacity(3, M("Al")))} Ah of charge per kilogram (3 electrons per atom). A pot runs at <b>4.2 V</b>. How many <b>kWh</b> of electricity per kilogram is that, if every electron makes aluminium?`,
      answer: +(Chem.capacity(3, M("Al")) * 4.2 / 1000).toFixed(1), tolerance: 0.2,
      hint: "Energy (Wh) = charge (Ah) × voltage (V), from Charge, energy and capacity. Then divide by 1000 for kWh.",
      why: "2980 Ah × 4.2 V ≈ 12 500 Wh = 12.5 kWh for one kilogram. Real smelters need a little more (13 to 15 kWh).",
    },
  });

  // ---------------------------------------------------------------- 9
  steps.push({
    title: "Moving metal: refining and plating",
    short: "Refining and plating",
    newConcepts: ["refining", "plating"],
    render(el) {
      el.append(style,
        P(`So far the anode was an inert bystander. Make the anode out of a metal that <b>can</b> be oxidised, and the easiest oxidation on offer is often the anode itself. In step 3 you saw the limiting case: copper dissolving at one electrode and plating at the other has a decomposition voltage of <b>0 V</b>. Nothing is created, metal is only moved.`),
        P(`That is how copper is purified. Copper from the smelter is about 99% pure, not good enough for wires. Cast it into an anode, hang it in acidified copper sulfate opposite a thin sheet of pure copper, and apply a small voltage. This is <b>electrorefining</b>. Each impurity has its own rung on the ladder, and that decides its fate. Try 0.30 V first, then be greedy.`));
      const EL = { Cu: { E: E0("Cu"), col: CU }, Fe: { E: E0("Fe"), col: "#6d7d94" }, Ni: { E: E0("Ni"), col: "#8fd3a8" }, Ag: { E: E0("Ag"), col: "#f4f6fa" }, Au: { E: E0("Au"), col: "#ffd84a" } };
      const W = 400, H = 262, ROWS = 12, COLS = 5, AX = 262, CX = 96, Y0 = 62, D = 11;
      const svg = s("svg", { viewBox: `${narrow(0, 34)} 0 ${narrow(W, 332)} ${H}`, width: "100%", style: "display:block;margin:0 auto;max-width:560px" });
      const T = (x, y, str, a = {}) => { const t = s("text", { x, y, "text-anchor": a.anchor || "middle", style: `font-size:${a.size || 11}px;fill:${a.fill || TEXT};font-weight:${a.weight || 400}` }); t.textContent = str; svg.append(t); return t; };
      svg.append(s("rect", { x: 42, y: 52, width: 316, height: 176, fill: "#3f9dff", opacity: 0.13 }));
      svg.append(s("path", { d: "M40 40 V230 H360 V40", fill: "none", stroke: "#6b7689", "stroke-width": 2 }));
      svg.append(s("polyline", { points: `${CX - 3},${Y0 - 6} ${CX - 3},16 ${AX + 30},16 ${AX + 30},${Y0 - 6}`, fill: "none", stroke: "#b9c2d3", "stroke-width": 2.5 }));
      svg.append(s("rect", { x: 162, y: 3, width: 76, height: 26, rx: 6, fill: "#212734", stroke: "#b9c2d3", "stroke-width": 1.5 }));
      const srcT = T(200, 21, "", { size: 13, fill: GRN, weight: 700 });
      T(152, 13, "−", { size: 14, weight: 700 }); T(248, 13, "+", { size: 14, weight: 700 });
      svg.append(s("rect", { x: CX - 6, y: Y0 - 6, width: 6, height: ROWS * D + 4, fill: CU }));
      T(CX - 3, 246, "cathode (−)", { fill: YEL, weight: 600 }); T(AX + 30, 246, "impure anode (+)", { fill: YEL, weight: 600 });
      T(200, 258, "CuSO₄ + H₂SO₄ solution", { size: 10, fill: MUTED });
      const solT = T(200, 46, "", { size: 10, fill: RED });
      const gA = s("g"), gC = s("g"), gS = s("g"), gF = s("g"); svg.append(gA, gC, gS, gF);
      const dot = (g, x, y, k, r = 4.8) => { const c = s("circle", { cx: x, cy: y, r, fill: EL[k].col, stroke: DARK, "stroke-width": 0.5 }); g.append(c); return c; };
      let V = 0, queue, plated, slime, inSol, fly, acc, seed = 3, timer = null, done = false;
      const sPur = stat("purity of the new cathode", "g"), sSl = stat("in the slime", "y"), sSo = stat("left dissolved", "r"), sLv = stat("anode / cathode level (toy)", "");
      const msg = statusBox();
      function build() {
        const r = rng(seed), kinds = [];
        for (let i = 0; i < ROWS * COLS; i++) kinds.push("Cu");
        [["Fe", 3], ["Ni", 3], ["Ag", 3], ["Au", 1]].forEach(([k, n]) => { let c = 0; while (c < n) { const i = r.int(ROWS * COLS); if (kinds[i] === "Cu") { kinds[i] = k; c++; } } });
        gA.innerHTML = gC.innerHTML = gS.innerHTML = gF.innerHTML = "";
        queue = []; plated = []; slime = []; inSol = { Fe: 0, Ni: 0 }; fly = []; acc = 0; done = false;
        for (let c = 0; c < COLS; c++) for (let rr = 0; rr < ROWS; rr++) { const k = kinds[c * ROWS + rr], x = AX + c * D + 5, y = Y0 + rr * D; queue.push({ k, x, y, c: dot(gA, x, y, k) }); }
        stats();
      }
      function stats() {
        const cu = plated.filter((k) => k === "Cu").length;
        sPur.set(plated.length ? nf(100 * cu / plated.length, 1) + " %" : "–");
        const cnt = (arr, k) => arr.filter((x) => x === k).length;
        sSl.set(slime.length ? ["Ag", "Au"].filter((k) => cnt(slime, k)).map((k) => cnt(slime, k) + " " + k).join(", ") : "nothing yet");
        const so = ["Fe", "Ni"].filter((k) => inSol[k]).map((k) => inSol[k] + " " + k + "²⁺");
        sSo.set(so.length ? so.join(", ") : "nothing yet"); solT.textContent = so.length ? "dissolved: " + so.join(", ") : "";
        sLv.set(sv(E0("Cu") + V / 2).replace(" V", "") + " / " + sv(E0("Cu") - V / 2));
      }
      function status() {
        srcT.textContent = nf(V) + " V";
        const aL = E0("Cu") + V / 2, cL = E0("Cu") - V / 2;
        msg.innerHTML = done ? "The anode is used up. Check the purity, the slime and the solution, then cast a new anode."
          : V < 0.04 ? "No voltage: nothing moves. Both electrodes are copper in the same solution, so there is no push either way."
          : aL > EL.Ag.E && cL < EL.Ni.E ? `<b>Far too greedy.</b> At ${nf(V)} V the anode is pulled so positive that silver dissolves too, and the cathode is pushed so negative that ${cL < EL.Fe.E ? "nickel and iron ions plate" : "nickel ions plate"} along with the copper. The product is no purer than the anode.`
          : aL > EL.Ag.E ? `<b>Too greedy.</b> The anode is now positive enough (${sv(aL)}) to oxidise silver (${sv(EL.Ag.E)}). Ag⁺ is even easier to reduce than Cu²⁺, so it plates straight onto the cathode.`
          : `<b>Selective.</b> Anode level ${sv(aL)}: copper, nickel and iron (all above it on the ladder) dissolve; silver and gold cannot be oxidised and drop off as <i>anode slime</i>. Cathode level ${sv(cL)}: only Cu²⁺ is easy enough to reduce. Fe²⁺ and Ni²⁺ stay dissolved.`;
        stats();
      }
      function step() {
        const aL = E0("Cu") + V / 2, cL = E0("Cu") - V / 2;
        if (V >= 0.04 && !done) {
          acc += 0.1 + V * 0.35;
          while (acc >= 1 && queue.length) {
            acc -= 1;
            const a = queue.shift(); a.c.remove();
            if (EL[a.k].E >= aL) { const i = slime.length; slime.push(a.k); dot(gS, AX + 4 + (i % 6) * 9, 223 - Math.floor(i / 6) * 8, a.k, 4); }
            else if (a.k === "Cu" || EL[a.k].E > cL) { const i = plated.length + fly.length; fly.push({ k: a.k, x: a.x, y: a.y, tx: CX + 5 + Math.floor(i / ROWS) * D, ty: Y0 + (i % ROWS) * D, c: dot(gF, a.x, a.y, a.k, 3.6) }); }
            else inSol[a.k]++;
            stats();
          }
          if (!queue.length && !fly.length) { done = true; status(); }
        }
        fly = fly.filter((p) => {
          const dx = p.tx - p.x, dy = p.ty - p.y, d = Math.hypot(dx, dy);
          if (d < 5) { p.c.remove(); dot(gC, p.tx, p.ty, p.k); plated.push(p.k); stats(); return false; }
          p.x += dx / d * 4.5; p.y += dy / d * 4.5; p.c.setAttribute("cx", p.x); p.c.setAttribute("cy", p.y); return true;
        });
        timer = setTimeout(step, 45);
      }
      const sl = slider({ name: "voltage", min: 0, max: 2, step: 0.02, value: 0, fmtv: (v) => nf(v) + " V", oninput: (v) => { V = v; status(); } });
      const setV = (v) => { V = v; sl.set(v); status(); };
      el.append(widget("Copper refining, atom by atom (impurities exaggerated: 10 atoms in 60)", svg,
        h("div", { class: "note ely-legend", html: Object.keys(EL).map((k) => `<span><i style="background:${EL[k].col}"></i>${k} (${sv(EL[k].E)})</span>`).join("") }),
        sl,
        h("div", { class: "btns" },
          h("button", { class: "primary", onclick: () => setV(0.3) }, "0.30 V (as in a refinery)"),
          h("button", { onclick: () => setV(1.0) }, "1.00 V"), h("button", { onclick: () => setV(1.7) }, "1.70 V"),
          h("button", { onclick: () => { seed++; build(); status(); } }, "Cast a new anode")),
        h("div", { class: "readout" }, sPur, sSl, sSo, sLv), msg,
        note("Toy model: the cell voltage is split evenly between the two electrodes around copper's own +0.34 V. Real refineries run near 0.3 V and reach about 99.99% copper; the slime is processed for its silver and gold.")));
      build(); status(); step();
      el.append(
        P(`<b>Electroplating</b> is the same cell with a different aim: the object to be coated is the cathode, and the anode is a bar of the coating metal (silver on cutlery, nickel or chromium on steel, zinc on car bodies). Faraday's law sets the thickness: mass = I·t·M / nF, and thickness = mass ÷ (density × area).`));
      const PM = [{ k: "Ag", n: 1, rho: 10.49 }, { k: "Cu", n: 2, rho: 8.96 }, { k: "Ni", n: 2, rho: 8.90 }, { k: "Zn", n: 2, rho: 7.14 }];
      let pm = 0, I = 1, tm = 10, A = 100;
      const sM = stat("metal deposited", "y"), sTh = stat("layer thickness", "g"), sJ = stat("current per cm²", "b");
      const updP = () => {
        const m = PM[pm], g = I * tm * 60 / (m.n * F) * M(m.k);
        sM.set(nf(g, 3) + " g"); sTh.set(nf(g / (m.rho * A) * 1e4, 1) + " µm"); sJ.set(nf(I / A * 1000, 1) + " mA");
      };
      el.append(widget("Plating calculator",
        toggle("Coating metal", PM.map((m, i) => [i, `${m.k} (${nf(m.rho, 2)} g/cm³)`]), 0, (v) => { pm = v; updP(); }),
        slider({ name: "current", min: 0.1, max: 5, step: 0.1, value: I, fmtv: (v) => nf(v, 1) + " A", oninput: (v) => { I = v; updP(); } }),
        slider({ name: "time", min: 1, max: 60, step: 1, value: tm, fmtv: (v) => v + " min", oninput: (v) => { tm = v; updP(); } }),
        slider({ name: "area", min: 10, max: 500, step: 10, value: A, fmtv: (v) => v + " cm²", oninput: (v) => { A = v; updP(); } }),
        h("div", { class: "readout" }, sM, sTh, sJ)));
      updP();
      el.append(takeaway(`With a reactive anode, electrolysis moves metal from anode to cathode. Refining uses a tiny voltage so that only copper makes the trip; plating uses the same cell to coat the cathode.`));
      return () => clearTimeout(timer);
    },
    check: {
      type: "choice",
      q: `A copper anode contains a little <b>iron</b> (E° = ${sv(E0("Fe"))}) and a little <b>silver</b> (E° = ${sv(E0("Ag"))}). It is refined at 0.3 V. Where do the two impurities end up?`,
      options: ["Iron dissolves and stays in the solution as Fe²⁺; silver never dissolves and falls into the slime", "Both plate onto the cathode together with the copper", "Silver dissolves and stays in the solution; iron falls into the slime"],
      answer: 0, backTo: 5,
      wrongHints: { 1: "At 0.3 V the cathode is only slightly more negative than copper's own level. Is that enough to reduce Fe²⁺ at −0.44 V? And does silver ever get into the solution?", 2: "The other way round. Iron sits above copper on the ladder: it is oxidised even more easily than copper. Silver sits below: it resists oxidation." },
      why: "Iron is easier to oxidise than copper, so it dissolves, but Fe²⁺ is much harder to reduce than Cu²⁺, so it stays in solution. Silver is harder to oxidise than copper: it is left behind as slime.",
    },
  });

  // ---------------------------------------------------------------- 10
  steps.push({
    title: "Capstone: the electrolysis bench",
    short: "Capstone: the bench",
    newConcepts: [],
    render(el) {
      el.append(style,
        P(`Everything at once. Pick what is in the vessel, set the source voltage, the current and the time. <b>Predict</b> what appears at each electrode, then run the experiment. The bench reports the products, how much of each (Faraday's laws), and where the electrical energy went.`));
      const GAS = { H2: "#9fd0ff", O2: "#ffb3a8", Cl2: "#cfe86a", CO2: "#dfe5ee" };
      const CELLS = {
        cuso4: { name: "CuSO₄ solution, graphite rods", cap: "CuSO₄ solution · graphite / graphite", Vmin: E0("O2") - E0("Cu"), L: { sym: "C", col: GRAPH, symCol: TEXT }, R: { sym: "C", col: GRAPH, symCol: TEXT }, tint: ["#3f9dff", 0.2],
          ions: { Cu: { t: "Cu", q: 2, n: 5, zone: "all", mode: "sink", at: "L" }, SO4: { t: "SO₄", q: -2, n: 5, zone: "all", drift: 1 }, H: { t: "H", q: 1, n: 3, zone: "R", mode: "src", at: "R" } },
          cat: ["copper metal", "hydrogen gas", "sulfur"], an: ["oxygen gas", "sulfur dioxide", "the rod dissolves"], ok: [0, 0], dep: CU, bubR: ["O2", 0.6],
          rc: f("Cu^2+ + 2e- -> Cu"), ra: f("2H2O -> O2 + 4H^+ + 4e-"),
          prod: [{ lab: "copper on the cathode", n: 2, M: M("Cu") }, { lab: "oxygen at the anode", n: 4, M: M_O2, gas: 1 }], why: "Cu²⁺ is far easier to reduce than water; sulfate cannot compete with water at the anode (step 6)." },
        cucu: { name: "CuSO₄ solution, copper electrodes", cap: "CuSO₄ solution · copper / copper", Vmin: 0, L: { sym: "Cu", col: CU }, R: { sym: "Cu", col: CU }, tint: ["#3f9dff", 0.2],
          ions: { Cu: { t: "Cu", q: 2, n: 6, zone: "all", mode: "sink", at: "L", from: "R" }, SO4: { t: "SO₄", q: -2, n: 6, zone: "all", drift: 1 } },
          cat: ["copper metal", "hydrogen gas", "nothing"], an: ["oxygen gas", "the copper anode dissolves", "sulfur dioxide"], ok: [0, 1], dep: CU, shrinkR: 1,
          rc: f("Cu^2+ + 2e- -> Cu"), ra: f("Cu -> Cu^2+ + 2e-"),
          prod: [{ lab: "copper on the cathode", n: 2, M: M("Cu") }, { lab: "copper lost by the anode", n: 2, M: M("Cu") }], why: "Oxidising the copper anode is easier than oxidising water: metal is simply moved across, with no minimum voltage (step 9)." },
        water: { name: "dilute H₂SO₄, platinum", cap: "dilute sulfuric acid · platinum / platinum", Vmin: E0("O2") - E0("H"), L: { sym: "Pt", col: PT }, R: { sym: "Pt", col: PT }, tint: ["#9fb4d6", 0.08],
          ions: { H: { t: "H", q: 1, n: 8, zone: "all", mode: "sink", at: "L", from: "R" }, SO4: { t: "SO₄", q: -2, n: 4, zone: "all", drift: 1 } },
          cat: ["sulfur", "hydrogen gas", "platinum dissolves"], an: ["sulfur dioxide", "hydrogen gas", "oxygen gas"], ok: [1, 2], bubL: ["H2", 1.4], bubR: ["O2", 0.7],
          rc: f("2H^+ + 2e- -> H2"), ra: f("2H2O -> O2 + 4H^+ + 4e-"),
          prod: [{ lab: "hydrogen at the cathode", n: 2, M: M_H2, gas: 1 }, { lab: "oxygen at the anode", n: 4, M: M_O2, gas: 1 }], why: "Only water reacts; the acid supplies ions to carry the current (step 5). Hydrogen volume is twice the oxygen volume." },
        brine: { name: "concentrated NaCl solution", cap: "brine with a cation membrane · steel / coated titanium", Vmin: E0("Cl2") - E0("H2O/H2"), L: { sym: "Fe", col: FE }, R: { sym: "Ti", col: "#8f9bb0" }, tint: ["#9fb4d6", 0.09], div: ["membrane", "membrane"],
          ions: { Na: { t: "Na", q: 1, n: 8, zone: "all", drift: -1 }, Cl: { t: "Cl", q: -1, n: 6, zone: "R", mode: "sink", at: "R" }, OH: { t: "OH", q: -1, n: 4, zone: "L", mode: "src", at: "L" } },
          cat: ["sodium metal", "hydrogen gas", "chlorine gas"], an: ["oxygen gas", "sodium metal", "chlorine gas"], ok: [1, 2], bubL: ["H2", 1.2], bubR: ["Cl2", 1.2],
          rc: f("2H2O + 2e- -> H2 + 2OH^-"), ra: f("2Cl^- -> Cl2 + 2e-"),
          prod: [{ lab: "hydrogen at the cathode", n: 2, M: M_H2, gas: 1 }, { lab: "chlorine at the anode", n: 2, M: M_CL2, gas: 1 }, { lab: "NaOH left in the cathode liquid", n: 1, M: M_NAOH }], why: "Water beats Na⁺ to the electrons; chlorine beats oxygen because oxygen is sluggish (steps 6 and 7)." },
        melt: { name: "molten NaCl", cap: "molten NaCl, about 600 °C · iron / graphite", Vmin: E0("Cl2") - E0("Na"), approx: 1, L: { sym: "Fe", col: FE }, R: { sym: "C", col: GRAPH, symCol: TEXT }, tint: ["#ff9a3c", 0.3],
          ions: { Na: { t: "Na", q: 1, n: 9, zone: "all", mode: "sink", at: "L" }, Cl: { t: "Cl", q: -1, n: 9, zone: "all", mode: "sink", at: "R" } },
          cat: ["hydrogen gas", "sodium metal", "chlorine gas"], an: ["chlorine gas", "oxygen gas", "sodium metal"], ok: [1, 0], bubL: [null, 0.7, AL], bubR: ["Cl2", 1.2],
          rc: f("Na^+ + e- -> Na"), ra: f("2Cl^- -> Cl2 + 2e-"),
          prod: [{ lab: "liquid sodium at the cathode", n: 1, M: M("Na") }, { lab: "chlorine at the anode", n: 2, M: M_CL2, gas: 1 }], why: "No water, so Na⁺ is the only candidate at the cathode (step 8). The threshold shown is the estimate from the 25 °C table." },
        alu: { name: "Al₂O₃ in molten cryolite", cap: "Al₂O₃ in molten cryolite, about 960 °C · carbon / carbon", Vmin: 1.2, approx: 1, L: { sym: "C", col: GRAPH, symCol: TEXT }, R: { sym: "C", col: "#22262e", symCol: TEXT }, tint: ["#ff9a3c", 0.3],
          ions: { Al: { t: "Al", q: 3, n: 5, zone: "all", mode: "sink", at: "L" }, O: { t: "O", q: -2, n: 7, zone: "all", mode: "sink", at: "R" } },
          cat: ["aluminium metal", "sodium metal", "hydrogen gas"], an: ["oxygen gas only", "fluorine gas", "CO₂: the carbon anode burns"], ok: [0, 2], dep: AL, bubR: ["CO2", 1], shrinkR: 1,
          rc: f("Al^3+ + 3e- -> Al"), ra: f("C + 2O^2- -> CO2 + 4e-"),
          prod: [{ lab: "liquid aluminium at the cathode", n: 3, M: M("Al") }, { lab: "CO₂ at the anode", n: 4, M: M_CO2, gas: 1 }, { lab: "carbon anode burned", n: 4, M: M("C") }], why: "Hall–Héroult (step 8). The carbon anode takes part, which lowers the minimum to roughly 1.2 V; real pots run near 4.2 V." },
        silver: { name: "AgNO₃ solution, silver anode, steel spoon", cap: "AgNO₃ solution · steel spoon / silver bar", Vmin: 0, L: { sym: "", col: FE }, R: { sym: "Ag", col: AG }, tint: ["#9fb4d6", 0.08],
          ions: { Ag: { t: "Ag", q: 1, n: 8, zone: "all", mode: "sink", at: "L", from: "R" }, NO3: { t: "NO₃", q: -1, n: 8, zone: "all", drift: 1 } },
          cat: ["hydrogen gas", "iron dissolves", "silver metal on the spoon"], an: ["the silver bar dissolves", "oxygen gas", "nitrogen gas"], ok: [2, 0], dep: AG, shrinkR: 1,
          rc: f("Ag^+ + e- -> Ag"), ra: f("Ag -> Ag^+ + e-"),
          prod: [{ lab: "silver on the spoon", n: 1, M: M("Ag") }, { lab: "silver lost by the anode", n: 1, M: M("Ag") }], why: "Electroplating (step 9): the spoon is the cathode, the silver bar is a reactive anode that keeps the solution topped up." },
      };
      const B = makeBench({ seed: 71 });
      let key = "cuso4", V = 3, I = 2, tmin = 30, gc = -1, ga = -1, prog = 0, running = false, ran = false;
      const pc = h("div", { class: "ely-pred" }), pa = h("div", { class: "ely-pred" });
      const bc = [0, 1, 2].map((i) => h("button", { onclick: () => { gc = i; marks(); } }, "")), ba = [0, 1, 2].map((i) => h("button", { onclick: () => { ga = i; marks(); } }, ""));
      pc.append(h("span", {}, "At the cathode (−):"), ...bc); pa.append(h("span", {}, "At the anode (+):"), ...ba);
      const sQ = stat("charge passed", "y"), sNe = stat("electrons", "b"), sE = stat("energy from the source", "g"), sMin = stat("minimum needed", "p"), sHeat = stat("lost as heat", "r");
      const tb = h("table", { class: "small ely-chain" }), msg = statusBox(), rx = rxBox();
      const marks = () => { bc.forEach((b, i) => b.classList.toggle("on", gc === i)); ba.forEach((b, i) => b.classList.toggle("on", ga === i)); };
      function setup() {
        const C = CELLS[key];
        B.setElectrode("L", C.L); B.setElectrode("R", C.R); B.setShape("L", 22, 0, C.dep); B.setShape("R", 22, 0);
        B.setLiquid(C.tint[0], C.tint[1]); B.setDivider(C.div ? C.div[0] : null, C.div ? C.div[1] : ""); B.setCaption(C.cap); B.setIons(C.ions);
        B.setRoles("cathode (−)", "anode (+)"); B.dir = -1; B.rate = 0; B.bub.L = B.bub.R = null;
        bc.forEach((b, i) => (b.textContent = C.cat[i])); ba.forEach((b, i) => (b.textContent = C.an[i]));
        gc = ga = -1; prog = 0; running = false; ran = false; marks(); show();
        msg.innerHTML = "Predict a product for each electrode, check the voltage, then press <i>Run</i>.";
        rx.set("cathode", "?", "anode", "?");
      }
      function show() {
        const C = CELLS[key], works = V > C.Vmin + 0.004 && V > 0.04;
        const Q = works ? I * tmin * 60 * prog : 0, ne = Q / F;
        B.setSource(nf(V) + " V");
        sQ.set(big(Q) + " C"); sNe.set(nf(ne, 4) + " mol"); sE.set(nf(V * Q / 3600, 2) + " Wh"); sMin.set(nf(C.Vmin * Q / 3600, 2) + " Wh"); sHeat.set(nf((V - C.Vmin) * Q / 3600, 2) + " Wh");
        tb.innerHTML = "";
        tb.append(h("tr", {}, h("th", {}, "product"), h("th", { class: "num" }, "moles"), h("th", { class: "num" }, "mass"), h("th", { class: "num" }, "gas volume")));
        C.prod.forEach((p) => { const mol = ne / p.n; tb.append(h("tr", {}, h("td", {}, p.lab), h("td", { class: "num" }, nf(mol, 4)), h("td", { class: "num" }, nf(mol * p.M, 3) + " g"), h("td", { class: "num" }, p.gas ? nf(mol * VM, 2) + " L" : "–"))); });
        if (C.dep) B.setShape("L", 22, works ? Math.min(9, prog * (1.5 + I * tmin / 110)) : 0, C.dep);
        if (C.shrinkR) B.setShape("R", works ? Math.max(8, 22 - prog * (1.5 + I * tmin / 110)) : 22, 0);
      }
      function finish() {
        const C = CELLS[key], works = V > C.Vmin + 0.004 && V > 0.04;
        running = false; ran = true; B.rate = 0;
        const verdict = (g, ok, list) => (g < 0 ? `no prediction (it is <b>${list[ok]}</b>)` : g === ok ? `<span class="ely-ok">✓ ${list[ok]}</span>` : `<span class="ely-bad">✗ you said ${list[g]}</span>, it is <b>${list[ok]}</b>`);
        if (!works) { msg.innerHTML = `<b>Nothing happens.</b> ${nf(V)} V is below the decomposition voltage of ${C.approx ? "about " : ""}${nf(C.Vmin)} V for this cell, so no steady current flows and no charge passes. Raise the voltage and run again.`; return; }
        msg.innerHTML = `Cathode: ${verdict(gc, C.ok[0], C.cat)} · Anode: ${verdict(ga, C.ok[1], C.an)}<div style="margin-top:4px">${C.why} Minimum voltage ${C.approx ? "≈ " : ""}${nf(C.Vmin)} V; the rest of your ${nf(V)} V is turned into heat.</div>`;
      }
      let timer = null;
      B.onTick = () => {
        if (!running) return;
        prog = Math.min(1, prog + 0.014); show();
        if (prog >= 1) finish();
      };
      function run() {
        const C = CELLS[key], works = V > C.Vmin + 0.004 && V > 0.04;
        prog = 0; show();
        rx.set("cathode: reduction", works ? C.rc : "nothing", "anode: oxidation", works ? C.ra : "nothing");
        if (!works) { B.rate = 0; finish(); return; }
        running = true; ran = false; B.rate = 0.35 + I / 12;
        const mkb = (b) => (b ? { col: b[2] || GAS[b[0]], k: b[1], solid: !!b[2] } : null);
        B.bub.L = mkb(C.bubL); B.bub.R = mkb(C.bubR);
        msg.innerHTML = "Running…";
      }
      const onParam = () => { if (ran || running) { running = false; ran = false; B.rate = 0; prog = 0; msg.innerHTML = "Settings changed. Press <i>Run</i> again."; } show(); };
      el.append(widget("Electrolysis bench: predict, then run",
        toggle("In the vessel", Object.keys(CELLS).map((k) => [k, CELLS[k].name]), key, (v) => { key = v; setup(); }),
        B.svg, legend("bubbles = gas · silver drops = liquid sodium"),
        slider({ name: "voltage", min: 0, max: 8, step: 0.05, value: V, fmtv: (v) => nf(v) + " V", oninput: (v) => { V = v; onParam(); } }),
        slider({ name: "current", min: 0.5, max: 10, step: 0.5, value: I, fmtv: (v) => nf(v, 1) + " A", oninput: (v) => { I = v; onParam(); } }),
        slider({ name: "time", min: 1, max: 120, step: 1, value: tmin, fmtv: (v) => v + " min", oninput: (v) => { tmin = v; onParam(); } }),
        pc, pa,
        h("div", { class: "btns" }, h("button", { class: "primary", onclick: run }, "Run")),
        rx, msg, h("div", { class: "tablewrap", style: "margin-top:10px" }, tb), h("div", { class: "readout" }, sQ, sNe, sE, sMin, sHeat),
        note("Simplifications: voltage and current are set separately (in a real cell the current rises with the excess voltage), every electron goes into the main reaction, and gas volumes are for 25 °C and normal pressure (24.5 L/mol).")));
      setup();
      el.append(
        P(`What to look for, each from an earlier step:`),
        h("ul", {},
          h("li", { html: `<b>Too little voltage, no product at all</b> (step 3). Molten NaCl needs about 4 V; the two cells with a reactive anode need almost none (step 9).` }),
          h("li", { html: `<b>Left is always the cathode</b>: it is wired to the source's − terminal, electrons arrive there, cations drift there (step 2).` }),
          h("li", { html: `<b>Same charge, different amounts</b> (step 4). Keep 2 A for 30 min and switch cells: 0.0373 mol of electrons gives 4.02 g of silver, 1.19 g of copper, but only 0.34 g of aluminium.` }),
          h("li", { html: `<b>Water as a competitor</b> (steps 5 to 7): brine gives hydrogen and chlorine, never sodium. Melt the same salt and sodium appears (step 8).` }),
          h("li", { html: `<b>Energy</b> = voltage × charge (<em>Charge, energy and capacity</em>). Only V<sub>min</sub> × charge is stored in the products; every volt above that is heat. Run the water cell at 1.5 V and at 3 V and compare.` })),
        takeaway(`Electrolysis is a galvanic cell run uphill: the ladder gives the minimum voltage and picks the products, and Faraday's laws turn amperes and seconds into grams.`));
      return () => { B.stop(); clearTimeout(timer); };
    },
  });

  Course.run({
    id: "electrolysis",
    section: "4. Running it backwards, and other ways to get current",
    title: "Electrolysis: forcing reactions uphill",
    concepts: {
      electrolytic: "electrolysis / electrolytic cell", signflip: "electrolytic cell: cathode −, anode +",
      inert: "inert electrode", decomp: "decomposition voltage",
      faradaylaws: "Faraday's laws: m = ItM / nF",
      waterel: "water electrolysis (1.23 V, 2 : 1)", gasvol: "gas volume ∝ moles (24.5 L/mol)",
      compete: "competing electrode reactions", sluggish: "sluggish gases need extra voltage",
      chloralkali: "chlor-alkali process",
      molten: "molten-salt electrolysis", hallheroult: "Hall–Héroult process (aluminium)",
      refining: "electrorefining (anode slime)", plating: "electroplating",
    },
    sources: [
      { title: "OpenStax, Chemistry 2e, §17.7 Electrolysis", url: "https://openstax.org/books/chemistry-2e/pages/17-7-electrolysis", note: "molten NaCl (Downs cell), electrolysis of water and of aqueous NaCl with the role of overpotential, Faraday-law calculations, electroplating" },
      { title: "OpenStax, Chemistry 2e, Appendix L: Standard Electrode (Half-Cell) Potentials", url: "https://openstax.org/books/chemistry-2e/pages/l-standard-electrode-half-cell-potentials", note: "the potentials used (via assets/chem.js); S₂O₈²⁻/SO₄²⁻ = +2.01 V" },
      { title: "Wikipedia: Faraday's laws of electrolysis", url: "https://en.wikipedia.org/wiki/Faraday%27s_laws_of_electrolysis", note: "first and second law, published by Faraday in 1833–34" },
      { title: "Wikipedia: Electrolysis of water", url: "https://en.wikipedia.org/wiki/Electrolysis_of_water", note: "1.23 V minimum, half-reactions in acid and base, 2 : 1 gas volumes, practical cell voltages" },
      { title: "Wikipedia: Chloralkali process", url: "https://en.wikipedia.org/wiki/Chloralkali_process", note: "membrane cell, Na⁺ crossing the membrane, hypochlorite if the products mix, about 97 million tonnes of chlorine in 2022" },
      { title: "Wikipedia: Downs cell", url: "https://en.wikipedia.org/wiki/Downs_cell", note: "NaCl/CaCl₂ melt near 600 °C, iron cathode and carbon anode, 4.07 V in theory and up to about 8 V in practice, patented 1924" },
      { title: "Wikipedia: Hall–Héroult process", url: "https://en.wikipedia.org/wiki/Hall%E2%80%93H%C3%A9roult_process", note: "1886, cryolite bath at 940–980 °C, carbon anodes consumed to CO₂, cell voltage under 5 V, about 15 kWh per kg" },
      { title: "Wikipedia: Electrowinning (and electrorefining)", url: "https://en.wikipedia.org/wiki/Electrowinning", note: "copper electrorefining: impure anode, pure cathode, anode slime carrying silver and gold" },
    ],
    steps,
  });
})();
