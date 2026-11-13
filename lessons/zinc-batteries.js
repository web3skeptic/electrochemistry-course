// Lesson 3.1 — Zinc: from Volta's pile to the alkaline cell
(function () {
  const { h, s, fmt, widget, stat, slider, plot, toggle, hbars, rng, narrow } = Course;
  const f = Chem.f;
  const YEL = "#ffd166", RED = "#ff6b6b", BLUE = "#6cb4ff", GRN = "#5fd38d", MUTED = "#9aa3b5", TEXT = "#e6e9ef", DARK = "#12151c";
  const ZINC = "#aeb9c9", COPPER = "#d18a52", ORANGE = "#ff9f5a", PUR = "#c3a6ff", BRASS = "#c9a24a", STEEL = "#8f99ab";
  const P = (html) => h("p", { html });
  const takeaway = (html) => h("div", { class: "takeaway", html });
  const formula = (html) => h("div", { class: "formula", style: "font-family:inherit", html });
  const note = (html, style) => h("div", { class: "note", style: style || "margin-top:8px", html });
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const sg = (v) => (v < 0 ? "−" : "+") + Math.abs(v).toFixed(2);   // signed potential with a real minus sign

  // ---- numbers (from Chem wherever it has them) ----
  const E_ZN = Chem.E0by.Zn.E;            // −0.76 V   Zn²⁺ + 2e⁻ → Zn
  const E_H = Chem.E0by.H.E;              //  0.00 V   2H⁺ + 2e⁻ → H₂
  const E_ZNO = Chem.E0by.ZnO.E;          // −1.26 V   ZnO + H₂O + 2e⁻ → Zn + 2OH⁻
  const E_O2 = Chem.E0by["O2/OH"].E;      // +0.40 V   O₂ + 2H₂O + 4e⁻ → 4OH⁻
  const E_MNO2_BASE = 0.15;               // 2MnO₂ + H₂O + 2e⁻ → Mn₂O₃ + 2OH⁻ (OpenStax Chemistry 2e, 17.5; not in Chem.E0)
  const E_AG2O = 0.34;                    // Ag₂O + H₂O + 2e⁻ → 2Ag + 2OH⁻ (CRC Handbook: 0.342 V; not in Chem.E0)
  const E_VOLTA = E_H - E_ZN;             // 0.76 V
  const E_ALK = E_MNO2_BASE - E_ZNO;      // 1.41 V
  const E_AIR = E_O2 - E_ZNO;             // 1.66 V
  const E_SILVER = E_AG2O - E_ZNO;        // 1.60 V
  const M_ZN = Chem.elements.Zn.mass;
  const M_MNO2 = Chem.elements.Mn.mass + 2 * Chem.elements.O.mass;   // 86.94 g/mol
  const CAP_ZN = Chem.capacity(2, M_ZN);        // 820 mAh/g
  const CAP_MNO2 = Chem.capacity(1, M_MNO2);    // 308 mAh/g
  const mAh = (v) => Math.round(v).toLocaleString("en-US").replace(/,/g, "\u00a0") + "\u00a0mAh";

  const style = h("style", {}, `
    .zb-legend { display:flex; flex-wrap:wrap; gap:4px 14px; margin-top:8px; font-size:13px; color:var(--muted); }
    .zb-legend i { display:inline-block; width:10px; height:10px; border-radius:50%; margin-right:5px; }
    .zb-status { min-height:46px; margin-top:10px; padding:8px 12px; border-left:3px solid var(--blue); background:var(--panel2); border-radius:6px; font-size:15px; }
    .zb-two { display:grid; grid-template-columns:minmax(0,5fr) minmax(0,6fr); gap:14px; align-items:center; margin-top:10px; }
    @media (max-width: 700px) { .zb-two { grid-template-columns:1fr; } }
    .zb-tb td, .zb-tb th { white-space:nowrap; }
  `);
  const legend = (items) => h("div", { class: "zb-legend", html: items.map(([c, t]) => `<span><i style="background:${c}"></i>${t}</span>`).join("") });
  const status = () => h("div", { class: "zb-status" });

  // ---- small SVG helpers ----
  function T(g, x, y, str, a = {}) {
    const t = s("text", { x, y, "text-anchor": a.anchor || "middle", style: `font-size:${a.size || 12}px;fill:${a.fill || TEXT};font-weight:${a.weight || 400}` });
    t.textContent = str; g.append(t); return t;
  }
  const rect = (g, x, y, w, hh, a) => { const r = s("rect", Object.assign({ x, y, width: Math.max(0, w), height: Math.max(0, hh) }, a)); g.append(r); return r; };
  function pathAt(pts) {       // u in [0,1] → [x, y] along a polyline
    const seg = []; let total = 0;
    for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(d); total += d; }
    return (u) => {
      let d = (((u % 1) + 1) % 1) * total;
      for (let i = 0; i < seg.length; i++) {
        if (d <= seg[i]) { const k = d / seg[i]; return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * k, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * k]; }
        d -= seg[i];
      }
      return pts[pts.length - 1];
    };
  }
  const polyline = (g, pts, a) => { const p = s("polyline", Object.assign({ points: pts.map((q) => q.join(",")).join(" "), fill: "none", stroke: "#b9c2d3", "stroke-width": 2.5, "stroke-linejoin": "round", "stroke-linecap": "round" }, a)); g.append(p); return p; };
  function mix(a, b, t) {      // blend two #rrggbb colours
    const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16)), pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
    return "#" + pa.map((v, i) => Math.round(v + (pb[i] - v) * t).toString(16).padStart(2, "0")).join("");
  }

  // =====================================================================================
  // Volta / Leclanché wet cell: zinc plate + (copper plate | carbon rod in MnO₂) in one jar.
  // Toy model: bubble coverage c of the copper chokes the voltage; MnO₂ mode makes no gas.
  // =====================================================================================
  function voltaCell(o = {}) {
    const W = 360, H = 246;
    const svg = s("svg", { viewBox: `0 0 ${W} ${H}`, width: "100%", style: "display:block;margin:0 auto;max-width:470px" });
    const G = () => { const g = s("g"); svg.append(g); return g; };
    const gBk = G(), gPot = G(), gIon = G(), gEl = G(), gBub = G(), gWire = G(), gE = G(), gTxt = G();
    const rnd = rng(o.seed || 11);
    const st = { mode: o.mode || "bare", on: false, c: 0, V: 0, I: 0, g: 1, pairs: 0, t: 0 };
    rect(gBk, 72, 112, 216, 113, { fill: "#9fb4d6", opacity: 0.09 });
    gBk.append(s("path", { d: "M70 96 V226 H290 V96", fill: "none", stroke: "#6b7689", "stroke-width": 2 }));
    const pot = rect(gPot, 226, 120, 54, 98, { fill: "#2a2623", stroke: "#8a7a66", "stroke-width": 1.2, "stroke-dasharray": "3 2", rx: 3 });
    const potLab = T(gTxt, 318, 150, "", { size: 10, fill: MUTED });
    const potLab2 = T(gTxt, 318, 163, "", { size: 10, fill: MUTED });
    const zn = rect(gEl, 96, 56, 22, 150, { rx: 2, fill: ZINC });
    const right = rect(gEl, 242, 56, 22, 150, { rx: 2, fill: COPPER });
    T(gEl, 107, 82, "Zn", { fill: DARK, weight: 700 });
    const rLab = T(gEl, 253, 82, "Cu", { fill: DARK, weight: 700 });
    T(gTxt, 82, 54, "−", { size: 17, weight: 700 }); T(gTxt, 278, 54, "+", { size: 17, weight: 700 });
    const cap = T(gTxt, 180, 242, "", { size: 11, fill: MUTED });
    const WP = [[107, 56], [107, 26], [253, 26], [253, 56]];
    polyline(gWire, WP);
    const bulb = s("circle", { cx: 180, cy: 26, r: 12, fill: YEL, "fill-opacity": 0.06, stroke: "#b9c2d3", "stroke-width": 1.5 }); gWire.append(bulb);
    const bulbBg = s("circle", { cx: 180, cy: 26, r: 12, fill: DARK }); gWire.insertBefore(bulbBg, bulb);
    T(gWire, 180, 52, "bulb", { size: 10, fill: MUTED });
    const flowTxt = T(gWire, 180, 9, "", { size: 11, fill: YEL, weight: 600 });
    const at = pathAt(WP);
    const eDots = Array.from({ length: 7 }, () => { const c = s("circle", { r: 3.4, fill: YEL, stroke: DARK, "stroke-width": 0.6 }); gE.append(c); return c; });
    let phase = 0, ions = [], znIons = [], floaters = [], lastPair = 0;
    const slots = Array.from({ length: 16 }, (_, i) => ({ x: i % 2 ? 268 : 238, y: 124 + ((i * 37) % 80) }));
    const bubbles = slots.map((p) => { const c = s("circle", { cx: p.x, cy: p.y, r: 4.6, fill: "#dfe9ff", "fill-opacity": 0.25, stroke: "#dfe9ff", "stroke-width": 1, opacity: 0 }); gBub.append(c); return c; });

    function mkIon(label, q, r, x, y) {
      const g = s("g");
      g.append(s("circle", { r, fill: q > 0 ? RED : BLUE }));
      const t = s("text", { "text-anchor": "middle", dy: "0.36em", style: `font-size:${r > 8 ? 7 : 5.6}px;font-weight:700;fill:${DARK}` }); t.textContent = label; g.append(t);
      gIon.append(g);
      return { g, q, r, x, y, vx: (rnd() - 0.5) * 0.8, vy: (rnd() - 0.5) * 0.8 };
    }
    const box = () => ({ x0: 124, x1: st.mode === "bare" ? 236 : 222, y0: 120, y1: 218 });
    function build() {
      gIon.innerHTML = ""; ions = []; znIons = [];
      const b = box(), bare = st.mode === "bare";
      const rx = () => b.x0 + 8 + rnd() * (b.x1 - b.x0 - 16), ry = () => b.y0 + 8 + rnd() * (b.y1 - b.y0 - 16);
      for (let i = 0; i < 8; i++) { const p = mkIon(bare ? "H" : "NH₄", 1, bare ? 6 : 7.5, rx(), ry()); p.cat = true; ions.push(p); }
      for (let i = 0; i < (bare ? 4 : 6); i++) ions.push(mkIon(bare ? "SO₄" : "Cl", bare ? -2 : -1, bare ? 9 : 6.5, rx(), ry()));
      right.setAttribute("fill", bare ? COPPER : "#474d5a"); right.setAttribute("stroke", bare ? "none" : "#8a93a6");
      rLab.textContent = bare ? "Cu" : "C"; rLab.style.fill = bare ? DARK : TEXT;
      pot.setAttribute("opacity", bare ? 0 : 1);
      potLab.textContent = bare ? "" : "MnO₂ +"; potLab2.textContent = bare ? "" : "carbon";
      cap.textContent = bare ? "zinc and copper plates in dilute sulfuric acid" : "zinc plate, carbon rod packed in MnO₂, NH₄Cl solution";
    }
    function place(p) { p.g.setAttribute("transform", `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})`); }
    function draw() {
      const w = Math.max(12, 22 - 0.1 * st.pairs);
      zn.setAttribute("x", 107 - w / 2); zn.setAttribute("width", w);
      const nb = st.mode === "bare" ? Math.round(st.c * 16) : 0;
      bubbles.forEach((b, i) => b.setAttribute("opacity", i < nb ? 1 : 0));
      bulb.setAttribute("fill-opacity", st.on ? 0.08 + 0.9 * Math.min(1, st.V * st.V) : 0.06);
      eDots.forEach((c, i) => { const [x, y] = at(phase + i / 7); c.setAttribute("cx", x); c.setAttribute("cy", y); c.setAttribute("opacity", st.on ? 1 : 0); });
      flowTxt.textContent = st.on ? "e⁻ →" : "switch open";
      flowTxt.style.fill = st.on ? YEL : MUTED;
      ions.concat(znIons).forEach(place);
      floaters.forEach((fl) => { fl.el.setAttribute("cx", fl.x); fl.el.setAttribute("cy", fl.y); });
    }
    function tick(dt) {
      const bare = st.mode === "bare", E = bare ? E_VOLTA : 1.5;
      const Eoc = bare ? E * (1 - 0.8 * st.c) : E;
      if (st.on) { st.V = Eoc / (1 + (bare ? 0.05 : 0.08) * st.g); st.I = st.g * st.V; } else { st.V = Eoc; st.I = 0; }
      if (bare) st.c = clamp(st.c + dt * (0.13 * st.I * (1 - st.c) - 0.03 * st.c), 0, 1);
      st.pairs += st.I * dt * 1.2; st.t += dt; phase += st.I * dt * 0.3;
      const b = box();
      for (const p of ions) {
        p.vx = clamp(p.vx + (rnd() - 0.5) * 0.2, -0.8, 0.8); p.vy = clamp(p.vy + (rnd() - 0.5) * 0.2, -0.8, 0.8);
        p.x += p.vx + (p.cat && st.on ? st.I * 0.7 : 0); p.y += p.vy;
        if (p.cat && st.on && p.x > b.x1 - p.r) { p.x = b.x0 + p.r + rnd() * 30; p.y = b.y0 + 10 + rnd() * (b.y1 - b.y0 - 20); }
        if (p.x < b.x0 + p.r) { p.x = b.x0 + p.r; p.vx = Math.abs(p.vx); } if (p.x > b.x1 - p.r) { p.x = b.x1 - p.r; p.vx = -Math.abs(p.vx); }
        if (p.y < b.y0 + p.r) { p.y = b.y0 + p.r; p.vy = Math.abs(p.vy); } if (p.y > b.y1 - p.r) { p.y = b.y1 - p.r; p.vy = -Math.abs(p.vy); }
      }
      if (Math.floor(st.pairs) > lastPair) {
        lastPair = Math.floor(st.pairs);
        const p = mkIon("Zn", 2, 9, 128, b.y0 + 12 + rnd() * (b.y1 - b.y0 - 24)); p.vx = 0.5; znIons.push(p);
        if (znIons.length > 6) znIons.shift().g.remove();
        if (bare) { const sl = slots[Math.floor(rnd() * 16)]; const el = s("circle", { r: 3.6, fill: "none", stroke: "#dfe9ff", "stroke-width": 1 }); gBub.append(el); floaters.push({ el, x: sl.x, y: sl.y }); }
      }
      for (const p of znIons) {
        p.vx = clamp(p.vx + (rnd() - 0.5) * 0.2, -0.6, 0.6); p.vy = clamp(p.vy + (rnd() - 0.5) * 0.2, -0.6, 0.6); p.x += p.vx; p.y += p.vy;
        if (p.x < b.x0 + p.r) { p.x = b.x0 + p.r; p.vx = Math.abs(p.vx); } if (p.x > b.x1 - p.r) { p.x = b.x1 - p.r; p.vx = -Math.abs(p.vx); }
        if (p.y < b.y0 + p.r) { p.y = b.y0 + p.r; p.vy = Math.abs(p.vy); } if (p.y > b.y1 - p.r) { p.y = b.y1 - p.r; p.vy = -Math.abs(p.vy); }
      }
      floaters = floaters.filter((fl) => { fl.y -= 1.3; if (fl.y < 114) { fl.el.remove(); return false; } return true; });
      draw();
    }
    function reset() {
      st.on = false; st.c = 0; st.pairs = 0; st.t = 0; lastPair = 0; phase = 0;
      floaters.forEach((fl) => fl.el.remove()); floaters = [];
      build(); tick(0);
    }
    reset();
    return { svg, st, tick, reset, wipe() { st.c = 0; }, setOn(v) { st.on = v; }, setMode(m) { st.mode = m; reset(); } };
  }

  // =====================================================================================
  // AA cell cutaway (lengthwise section). kind: "zc" (zinc–carbon) or "alk" (alkaline).
  // =====================================================================================
  const AA_PARTS = {
    zc: [
      { key: "cap", short: "metal cap", title: "metal cap: + terminal", sub: "sits on the carbon rod", px: 111, py: 25, ly: 24 },
      { key: "rod", short: "carbon rod", title: "carbon rod", sub: "inert: only collects electrons", px: 104, py: 74, ly: 74 },
      { key: "mix", short: "MnO₂ mix", title: "MnO₂ + carbon powder", sub: "cathode: takes the electrons", px: 124, py: 124, ly: 124 },
      { key: "paste", short: "paste", title: "moist paste (electrolyte)", sub: "NH₄Cl + ZnCl₂ in water", px: 137.5, py: 174, ly: 174 },
      { key: "can", short: "zinc can", title: "zinc can: − terminal", sub: "anode, fuel and container", px: 146, py: 226, ly: 226 },
    ],
    alk: [
      { key: "can", short: "steel can", title: "steel can: + terminal", sub: "inert: container and collector", px: 146.5, py: 58, ly: 28 },
      { key: "ring", short: "MnO₂ ring", title: "MnO₂ + graphite ring", sub: "cathode: takes the electrons", px: 136, py: 80, ly: 80 },
      { key: "sep", short: "separator", title: "separator", sub: "soaked in KOH: ions pass", px: 129.5, py: 132, ly: 132 },
      { key: "core", short: "zinc gel", title: "zinc powder in KOH gel", sub: "anode: gives the electrons", px: 114, py: 184, ly: 184 },
      { key: "pin", short: "brass pin", title: "brass pin to the − end", sub: "collects the electrons", px: 101, py: 236, ly: 236 },
    ],
  };
  const AA_INFO = {
    zc: {
      all: "Pick a part to see what it does.",
      cap: "The metal cap is the <b>+</b> terminal. It only passes electrons from the outside wire into the carbon rod.",
      rod: "Carbon conducts electrons but does not react here. It hands the arriving electrons to the black mix around it, the job the copper plate had in Volta's cell.",
      mix: `Manganese dioxide is the electron-taker (the depolariser): ${f("2MnO2 + 2NH4^+ + 2e- -> Mn2O3 + 2NH3 + H2O")}. Carbon powder is mixed in because ${f("MnO2")} conducts badly.`,
      paste: `Ammonium chloride and zinc chloride dissolved in a little water, thickened to a paste: the electrolyte. Ions move through it (cations towards the mix), and it supplies the ${f("NH4^+")} that the cathode uses up.`,
      can: `The can is the anode and the <b>−</b> terminal: ${f("Zn -> Zn^2+ + 2e-")}. It is also the container, so the cell slowly eats its own wall.`,
    },
    alk: {
      all: "Pick a part to see what it does.",
      can: "The steel can is only a container and an electron collector for the ring pressed against it. It is the <b>+</b> terminal (the bump on top is part of the can) and it is not consumed.",
      ring: `Manganese dioxide mixed with graphite, pressed into a thick ring: ${f("2MnO2 + H2O + 2e- -> Mn2O3 + 2OH^-")}. It makes ${f("OH^-")}.`,
      sep: `A thin porous sheet soaked in KOH solution. It keeps zinc and ${f("MnO2")} from touching (which would short-circuit the cell) but lets ${f("OH^-")} ions through: the job of the salt bridge in the Daniell cell.`,
      core: `Zinc powder suspended in a KOH gel: ${f("Zn + 2OH^- -> ZnO + H2O + 2e-")}. It uses up the ${f("OH^-")} the ring makes. As the cell runs, grey zinc turns into white zinc oxide.`,
      pin: "A brass pin sits in the zinc gel and leads the electrons to the flat <b>−</b> end. An insulating seal keeps it apart from the can.",
    },
  };
  function aaCell(kind, o = {}) {
    const W = o.compact ? 345 : narrow(430, 345), H = 300, cx = 100;
    const svg = s("svg", { viewBox: `0 0 ${W} ${H}`, width: "100%", style: `display:block;margin:0 auto;max-width:${o.compact ? 400 : 520}px` });
    const gWire = s("g"); svg.append(gWire);
    const parts = {}, labs = {};
    const Pg = (key) => parts[key] || (parts[key] = svg.appendChild(s("g")));
    const el = {};
    if (kind === "zc") {
      el.can = rect(Pg("can"), 52, 44, 96, 226, { fill: ZINC, rx: 3 });
      el.paste = rect(Pg("paste"), 61, 46, 78, 215, { fill: "#cfc8a4" });
      el.mix = rect(Pg("mix"), 65, 50, 70, 207, { fill: "#23232b" });
      rect(Pg("seal"), 52, 40, 96, 10, { fill: "#6b5a45", rx: 2 });
      rect(Pg("rod"), 93, 30, 14, 200, { fill: "#474d5a", stroke: "#8a93a6", "stroke-width": 1 });
      rect(Pg("cap"), 88, 19, 24, 12, { fill: BRASS, rx: 3 });
    } else {
      rect(Pg("can"), 52, 40, 96, 228, { fill: STEEL, rx: 3 });
      rect(Pg("can"), 88, 26, 24, 15, { fill: STEEL, rx: 3 });
      el.ring = rect(Pg("ring"), 56, 44, 88, 216, { fill: "#23232b" });
      rect(Pg("sep"), 72, 50, 56, 210, { fill: "#d8d2b8" });
      el.core = rect(Pg("core"), 75, 53, 50, 207, { fill: ZINC });
      rect(Pg("seal"), 52, 260, 96, 8, { fill: "#6b5a45" });
      rect(Pg("pin"), 60, 268, 80, 6, { fill: "#c8ccd4", rx: 2 });
      rect(Pg("pin"), 97.5, 95, 5, 174, { fill: BRASS });
    }
    const gIon = s("g"); svg.append(gIon);
    const gLab = s("g"); svg.append(gLab);
    T(gLab, 74, 33, "+", { size: 17, weight: 700 }); T(gLab, 74, 289, "−", { size: 17, weight: 700 });
    for (const p of AA_PARTS[kind]) {
      const g = s("g"); gLab.append(g); labs[p.key] = g;
      g.append(s("line", { x1: p.px, y1: p.py, x2: 180, y2: p.ly - 4, stroke: MUTED, "stroke-width": 0.9 }));
      g.append(s("circle", { cx: p.px, cy: p.py, r: 2, fill: TEXT }));
      T(g, 185, p.ly, p.title, { anchor: "start", size: 11.5, weight: 600 });
      T(g, 185, p.ly + 13, p.sub, { anchor: "start", size: 10.5, fill: MUTED });
    }
    // optional outside circuit: electrons leave the − end (bottom), pass the load, return to the + end (top)
    let at = null, eDots = [], bulb = null;
    if (o.circuit) {
      const WP = [[cx, 274], [cx, 294], [14, 294], [14, 8], [cx, 8], [cx, kind === "zc" ? 19 : 26]];
      polyline(gWire, WP); at = pathAt(WP);
      gWire.append(s("circle", { cx: 14, cy: 150, r: 10, fill: DARK }));
      bulb = s("circle", { cx: 14, cy: 150, r: 10, fill: YEL, "fill-opacity": 0.06, stroke: "#b9c2d3", "stroke-width": 1.5 }); gWire.append(bulb);
      T(gWire, 27, 154, "load", { anchor: "start", size: 10, fill: MUTED });
      eDots = Array.from({ length: 12 }, () => { const c = s("circle", { r: 3.2, fill: YEL, stroke: DARK, "stroke-width": 0.6 }); gWire.append(c); return c; });
    }
    const iDots = Array.from({ length: 6 }, () => { const c = s("circle", { r: 3, fill: kind === "zc" ? RED : BLUE, opacity: 0 }); gIon.append(c); return c; });
    let depth = 0, flow = 0, phase = 0, wall = 9;
    const api = {
      svg, kind,
      setDepth(d) {
        depth = clamp(d, 0, 1);
        if (kind === "zc") {
          wall = 9 - 5.5 * depth;
          el.paste.setAttribute("x", 52 + wall); el.paste.setAttribute("width", 96 - 2 * wall); el.paste.setAttribute("height", 224 - wall);
          el.mix.setAttribute("fill", mix("#23232b", "#6a4a35", depth));
        } else {
          el.ring.setAttribute("fill", mix("#23232b", "#6a4a35", depth));
          el.core.setAttribute("fill", mix(ZINC, "#f1efe6", depth));
        }
      },
      highlight(key) {
        for (const k in parts) parts[k].setAttribute("opacity", key === "all" || k === key ? 1 : 0.2);
        for (const k in labs) labs[k].setAttribute("opacity", key === "all" || k === key ? 1 : 0.25);
      },
      setFlow(v) { flow = v; api.tick(0); },
      tick(dt) {
        phase += flow * dt;
        eDots.forEach((c, i) => { const [x, y] = at(phase * 0.35 + i / 12); c.setAttribute("cx", x); c.setAttribute("cy", y); c.setAttribute("opacity", flow > 0 ? 1 : 0); });
        if (bulb) bulb.setAttribute("fill-opacity", flow > 0 ? 0.25 + 0.7 * Math.min(1, flow) : 0.06);
        iDots.forEach((c, i) => {
          const u = (((phase * 0.6 + i / 6) % 1) + 1) % 1, left = i % 2 === 0;
          const a = kind === "zc" ? 52 + wall + 1 : 71, b = kind === "zc" ? 52 + wall + 15 : 86;
          const x = a + (b - a) * u;
          c.setAttribute("cx", left ? x : 200 - x); c.setAttribute("cy", 78 + i * 31);
          c.setAttribute("opacity", flow > 0 ? Math.sin(Math.PI * u) : 0);
        });
      },
    };
    api.setDepth(0); api.tick(0);
    return api;
  }

  const steps = [];

  // ---------------------------------------------------------------- 1
  steps.push({
    title: "Volta's pile: the first battery",
    short: "Volta's pile",
    newConcepts: ["pile"],
    render(el) {
      el.append(style,
        P(`The <em>Daniell cell</em> you have been using (from <em>The galvanic cell</em>) dates from 1836. The first battery is older and cruder. In 1800 Alessandro Volta took a zinc disc, a copper disc, and between them a piece of cardboard soaked in salt water or dilute acid. There is <b>no copper sulfate anywhere</b>.`),
        P(`Zinc is the giver, as it will be in this whole lesson: ${f("Zn -> Zn^2+ + 2e-")}. But who takes the electrons? Not copper metal: a metal has nothing to gain from extra electrons. And there are no ${f("Cu^2+")} ions. The only taker around is the ${f("H^+")} of the acid (an <em>acid</em>, from <em>The activity series</em>, is water with ${f("H^+")} in it). The copper is just a surface where it happens:`),
        formula(`at the copper: ${f("2H^+")} + <span class="hl">2e⁻</span> → ${f("H2")}<small>E°cell = E°cathode − E°anode = ${E_H.toFixed(2)} − (${sg(E_ZN)}) = ${E_VOLTA.toFixed(2)} V (from <em>Electrode potentials</em>)</small>`));
      const cell = voltaCell({ seed: 5 });
      const sE = stat("electrons through the wire", "y"), sZn = stat("zinc atoms dissolved", "r"), sH = stat("H₂ molecules made", "b");
      const btn = h("button", { class: "primary", onclick: () => { cell.setOn(!cell.st.on); btn.textContent = cell.st.on ? "Open the switch" : "Close the switch"; } }, "Close the switch");
      const upd = () => { const n = Math.floor(cell.st.pairs); sE.set(String(2 * n)); sZn.set(String(n)); sH.set(String(n)); };
      const iv = setInterval(() => { cell.tick(0.05); upd(); }, 50);
      el.append(widget("One Volta cell (toy scale: one dot is not one ion)", cell.svg,
        h("div", { class: "btns" }, btn, h("button", { onclick: () => { cell.reset(); btn.textContent = "Close the switch"; upd(); } }, "Reset")),
        h("div", { class: "readout" }, sE, sZn, sH),
        legend([[YEL, "electron"], [RED, "positive ion"], [BLUE, "negative ion (spectator)"], ["#dfe9ff", "hydrogen bubble"]])));
      upd();
      el.append(P(`${E_VOLTA.toFixed(2)} V is not much. Volta's trick was to stack many such pairs, each zinc touching the copper of the pair below, so that every pair adds its push (the same adding-up you saw when chaining cell voltages in <em>Electrode potentials</em>). He called it a <b>pile</b>.`));
      // pile builder
      const PW = narrow(430, 345), PH = 210;
      const svg = s("svg", { viewBox: `0 0 ${PW} ${PH}`, width: "100%", style: "display:block;margin:0 auto;max-width:520px" });
      const gS = s("g"); svg.append(gS);
      const sV = stat("pile voltage", "y"), sN = stat("pairs", "");
      const drawPile = (n) => {
        gS.innerHTML = "";
        const u = Math.min(15, 174 / n), x0 = 60, w = 110, base = 196;
        for (let i = 0; i < n; i++) {
          const y = base - (i + 1) * u;
          rect(gS, x0, y + (2 * u) / 3, w, u / 3 + 0.3, { fill: ZINC });
          rect(gS, x0, y + u / 3, w, u / 3 + 0.3, { fill: "#5f7fa8" });
          rect(gS, x0, y, w, u / 3 + 0.3, { fill: COPPER });
        }
        const top = base - n * u;
        T(gS, x0 + w + 12, base - 2, "− end (zinc)", { anchor: "start", size: 11.5 });
        T(gS, x0 + w + 12, Math.min(top + 9, base - 18), "+ end (copper)", { anchor: "start", size: 11.5 });
        T(gS, x0 + w + 12, 100 > top + 26 && 100 < base - 30 ? 100 : -50, `${n} × ${E_VOLTA.toFixed(2)} V`, { anchor: "start", size: 12, fill: YEL, weight: 600 });
        sV.set((n * E_VOLTA).toFixed(1) + " V"); sN.set(String(n));
      };
      el.append(widget("Build a pile",
        svg, slider({ name: "pairs of discs", min: 1, max: 40, step: 1, value: 6, fmtv: (x) => x, oninput: drawPile, nameWidth: 110 }),
        h("div", { class: "readout" }, sN, sV),
        legend([[ZINC, "zinc"], ["#5f7fa8", "wet cardboard"], [COPPER, "copper"]]),
        note(`${E_VOLTA.toFixed(2)} V per pair is the standard value for zinc and ${f("H^+")} in acid. Volta's salt-water pairs gave roughly the same, a little under a volt each.`)));
      drawPile(6);
      el.append(
        P("Leave the switch closed for a while and watch the bulb and the copper plate. Something is going wrong. That is the next step."),
        takeaway(`A <b>voltaic pile</b> is a stack of zinc | wet card | copper cells. Zinc gives the electrons, ${f("H^+")} takes them on the copper surface, and each pair adds about ${E_VOLTA.toFixed(2)} V.`));
      return () => clearInterval(iv);
    },
    check: {
      type: "choice",
      q: "Volta's cell contains zinc, copper and dilute acid, but no copper salt. What takes the electrons that arrive at the copper disc?",
      options: [`${f("H^+")} ions from the acid, which leave as ${f("H2")} gas`, `The copper metal, which turns into ${f("Cu^2+")}`, `${f("Zn^2+")} ions that drifted over from the zinc`],
      answer: 0,
      wrongHints: {
        1: `Turning into ${f("Cu^2+")} would mean <i>losing</i> electrons, not taking them. The copper stays as it is.`,
        2: `${f("Zn^2+")} taking electrons back is the zinc reaction in reverse: that pair would give 0 V, not ${E_VOLTA.toFixed(2)} V.`,
      },
      why: `${f("2H^+ + 2e- -> H2")}. Copper is only the surface where the electrons meet the ${f("H^+")}.`,
    },
  });

  // ---------------------------------------------------------------- 2
  steps.push({
    title: "Why the pile faded: polarisation",
    short: "Polarisation",
    newConcepts: ["polar"],
    render(el) {
      el.append(style,
        P("Volta's pile started the age of electricity, and it had an annoying habit: it gave a strong current for a moment, then faded. Close the switch and watch the voltage the bulb gets."));
      const cell = voltaCell({ seed: 8 });
      const pl = plot({ xmin: 0, xmax: 60, ymin: 0, ymax: 1, width: 520, height: 190, narrow: true, minFont: 10, xlabel: "time (s, toy clock)", ylabel: "cell voltage (V)", xticks: [0, 20, 40, 60], yticks: [0, 0.25, 0.5, 0.75, 1] });
      const sV = stat("cell voltage", "y"), sC = stat("copper covered by bubbles", "b"), sI = stat("current (toy units)", "");
      let hist = [], k = 0;
      const btn = h("button", { class: "primary", onclick: () => { cell.setOn(!cell.st.on); btn.textContent = cell.st.on ? "Open the switch (rest)" : "Close the switch"; } }, "Close the switch");
      const redraw = () => {
        pl.clear(); pl.hline(E_VOLTA, MUTED, `E° = ${E_VOLTA.toFixed(2)} V`, { pos: "right" });
        pl.line(hist.map((v, i) => [i * 0.25, v]), YEL);
        sV.set(cell.st.V.toFixed(2) + " V"); sC.set(fmt.pct(cell.st.c)); sI.set(cell.st.I.toFixed(2));
      };
      const iv = setInterval(() => {
        cell.tick(0.05);
        if (++k % 5 === 0) { hist.push(cell.st.V); if (hist.length > 240) hist.shift(); redraw(); }
      }, 50);
      el.append(widget("Run the Volta cell (toy model of the bubble film)", cell.svg,
        slider({ name: "bulb", min: 0.3, max: 2.5, step: 0.1, value: 1, fmtv: (x) => (x < 0.7 ? "small (light load)" : x < 1.6 ? "medium" : "big (heavy load)"), oninput: (v) => (cell.st.g = v), nameWidth: 50 }),
        h("div", { class: "btns" }, btn,
          h("button", { onclick: () => cell.wipe() }, "Wipe the bubbles off the copper"),
          h("button", { onclick: () => { cell.reset(); hist = []; btn.textContent = "Close the switch"; redraw(); } }, "Reset")),
        h("div", { class: "readout" }, sV, sC, sI), pl));
      redraw();
      el.append(
        P(`Every ${f("H2")} molecule is born on the copper surface, and many bubbles cling to it. A covered patch is cut off from the acid: no ${f("H^+")} can reach it. With fewer open sites, electrons queue up on the copper, and the push that the bulb sees drops. <b>Nothing has run out.</b> Wipe the bubbles off, or just let the cell rest, and the voltage comes back.`),
        P("This sag has a name: <b>polarisation</b>. A cell is polarised when its voltage falls <i>because it is delivering current</i>: products pile up at an electrode (or the reactants there run short) faster than they can get out of the way. Try the big bulb: the harder you pull, the worse it gets."),
        P(`The pile had two more flaws. Zinc sits above hydrogen in the <em>activity series</em>, so it fizzes away in the acid even with the switch open. And the weight of the stack squeezed the liquid out of the cardboard.`),
        takeaway("<b>Polarisation</b>: the voltage of a working cell sags because reaction products build up at an electrode. In Volta's cell the product is a film of hydrogen bubbles on the copper."));
      return () => clearInterval(iv);
    },
    check: {
      type: "choice",
      q: "A Volta cell lights a bulb, which fades within a minute. You open the switch, brush the bubbles off the copper and close it again: the bulb is bright. What does that tell you?",
      options: ["The zinc and the acid were nearly used up, and brushing stirred in fresh ones", "Nothing was used up: the copper surface was blocked by its own product", "Brushing rubbed fresh electrons onto the copper"],
      answer: 1,
      wrongHints: {
        0: "If the reactants were gone, brushing a plate could not bring them back. Look at the zinc plate: it has barely changed.",
        2: "Electrons come from the zinc, through the wire. Brushing only uncovers the surface where they are handed on.",
      },
      why: "The fade was polarisation, not exhaustion. Clearing the hydrogen film uncovers the copper again.",
    },
  });

  // ---------------------------------------------------------------- 3
  steps.push({
    title: "A better taker: manganese dioxide",
    short: "The depolariser",
    newConcepts: ["depol"],
    render(el) {
      el.append(style,
        P(`The cure for hydrogen polarisation: <b>do not make hydrogen</b>. Offer the electrons a taker that is keener than ${f("H^+")}, that is a solid so it stays put at the electrode, and that turns into another solid instead of a gas.`),
        P(`In 1866 Georges Leclanché found one: <b>manganese dioxide</b>, ${f("MnO2")}, a black mineral powder. Its manganese has <em>oxidation number</em> +4 (from <em>Oxidation and reduction</em>) and gladly takes one electron to become +3. He packed it around a carbon rod. Carbon conducts electrons and reacts with nothing here: it is the inert surface that copper was in Volta's cell. For the liquid he used ammonium chloride, ${f("NH4Cl")}, in water. It dissolves into ${f("Cl^-")} and the ammonium ion ${f("NH4^+")}, a polyatomic cation that you can picture as an ${f("NH3")} molecule holding one extra ${f("H^+")}.`),
        formula(`${f("2MnO2 + 2NH4^+")} + <span class="hl">2e⁻</span> → ${f("Mn2O3 + 2NH3 + H2O")}<small>Mn: +4 → +3. The ${f("H^+")} carried by the ammonium ends up in water, not in ${f("H2")} gas.</small>`));
      const cell = voltaCell({ seed: 21 });
      const pl = plot({ xmin: 0, xmax: 60, ymin: 0, ymax: 2, width: 520, height: 210, narrow: true, minFont: 10, xlabel: "time (s, toy clock)", ylabel: "cell voltage (V)", xticks: [0, 20, 40, 60], yticks: [0, 0.5, 1, 1.5, 2] });
      pl.legend([["bare copper, acid", COPPER], ["carbon in MnO₂", GRN]], { pos: "right" });
      const sV = stat("cell voltage", "y"), sC = stat("bubble cover", "b");
      const hist = { bare: [], mno2: [] }; let k = 0;
      const btn = h("button", { class: "primary", onclick: () => { cell.setOn(!cell.st.on); btn.textContent = cell.st.on ? "Open the switch" : "Close the switch"; } }, "Close the switch");
      // ladder
      const LW = narrow(430, 345), LH = 150;
      const lad = s("svg", { viewBox: `0 0 ${LW} ${LH}`, width: "100%", style: "display:block;margin:6px auto 0;max-width:520px" });
      const gL = s("g"); lad.append(gL);
      const rungs = [
        { y: 22, t: `${f("Zn^2+ + 2e- -> Zn")}`, v: sg(E_ZN) + " V" },
        { y: 72, t: `${f("2H^+ + 2e- -> H2")}`, v: E_H.toFixed(2) + " V" },
        { y: 122, t: `${f("MnO2")} in the salt solution`, v: "≈ +0.75 V" },
      ];
      const drawLadder = () => {
        gL.innerHTML = "";
        const bare = cell.st.mode === "bare", tgt = bare ? 1 : 2;
        rungs.forEach((r, i) => {
          const on = i === 0 || i === tgt;
          gL.append(s("line", { x1: 70, x2: LW - 78, y1: r.y, y2: r.y, stroke: on ? TEXT : "#4a5568", "stroke-width": on ? 2 : 1.2 }));
          T(gL, 150, r.y - 6, r.t, { anchor: "start", size: 12, fill: on ? TEXT : MUTED });
          T(gL, LW - 4, r.y + 4, r.v, { anchor: "end", size: 12, fill: on ? TEXT : MUTED });
        });
        const y1 = rungs[tgt].y;
        gL.append(s("line", { x1: 100, x2: 100, y1: 26, y2: y1 - 6, stroke: YEL, "stroke-width": 2.5 }));
        gL.append(s("path", { d: `M94 ${y1 - 10} L100 ${y1 - 1} L106 ${y1 - 10} Z`, fill: YEL }));
        T(gL, 4, (22 + y1) / 2 + 4, bare ? `${E_VOLTA.toFixed(2)} V` : "≈ 1.5 V", { anchor: "start", size: 14, fill: YEL, weight: 700 });
        T(gL, 4, (22 + y1) / 2 + 19, "e⁻ fall", { anchor: "start", size: 10.5, fill: MUTED });
      };
      const redraw = () => {
        pl.clear();
        pl.line(hist.bare.map((v, i) => [i * 0.25, v]), COPPER); pl.line(hist.mno2.map((v, i) => [i * 0.25, v]), GRN);
        sV.set(cell.st.V.toFixed(2) + " V"); sC.set(cell.st.mode === "bare" ? fmt.pct(cell.st.c) : "none");
      };
      const tg = toggle("Positive electrode", [["bare", "bare copper in acid (Volta)"], ["mno2", "carbon rod in MnO₂ (Leclanché)"]], "bare", (m) => {
        cell.setMode(m); hist[m] = []; btn.textContent = "Close the switch"; drawLadder(); redraw();
      });
      const iv = setInterval(() => {
        cell.tick(0.05);
        if (++k % 5 === 0) { const a = hist[cell.st.mode]; if (cell.st.on || a.length) { a.push(cell.st.V); if (a.length > 240) a.shift(); } redraw(); }
      }, 50);
      el.append(widget("Same zinc, two different electron-takers (toy model)", tg, cell.svg,
        h("div", { class: "btns" }, btn, h("button", { onclick: () => { cell.reset(); hist.bare = []; hist.mno2 = []; btn.textContent = "Close the switch"; redraw(); } }, "Reset both traces")),
        h("div", { class: "readout" }, sV, sC), pl,
        note("The potential ladder (most negative on top, electrons fall downwards):", "margin-top:14px"), lad));
      drawLadder(); redraw();
      el.append(
        P(`Run both and compare the traces. With ${f("MnO2")} there are no bubbles and the voltage holds. And there is a bonus: ${f("MnO2")} sits lower on the <em>potential ladder</em> than ${f("H^+")}, so the electrons fall further: about 1.5 V instead of ${E_VOLTA.toFixed(2)} V. (The +0.75 V is a measured, approximate value for this mildly acidic salt solution, not a standard potential.)`),
        P(`A substance added to stop hydrogen polarisation was called a <b>depolariser</b>, and the name stuck. In modern words ${f("MnO2")} is simply the cell's <em>oxidising agent</em>: the cathode reactant.`),
        takeaway(`A <b>depolariser</b> is a solid oxidising agent packed around the positive electrode. ${f("MnO2")} takes the electrons (Mn +4 → +3) so that no hydrogen forms, and it raises the voltage to about 1.5 V.`));
      return () => clearInterval(iv);
    },
    check: {
      type: "number",
      q: `In ${f("MnO2")} manganese has oxidation number +4. What is the oxidation number of manganese in the product ${f("Mn2O3")}?`,
      answer: 3, tolerance: 0.01,
      hint: "Oxygen counts as −2 and the compound is neutral: 2 × Mn + 3 × (−2) = 0.",
      why: "+3. Each manganese atom went from +4 to +3: it gained one electron, so it was reduced.",
    },
  });

  // ---------------------------------------------------------------- 4
  steps.push({
    title: "The dry cell: zinc–carbon",
    short: "Zinc–carbon dry cell",
    newConcepts: ["zncarbon", "dry"],
    render(el) {
      el.append(style,
        P("Leclanché's cell was a glass jar of liquid: fine for a doorbell, useless in a pocket. In 1886 Carl Gassner changed two things. He thickened the ammonium chloride solution into a moist <b>paste</b>, and he made the zinc electrode the <b>container</b>. Nothing can spill, and the cell works in any position: a <b>dry cell</b>. (Not truly dry: ions can only move if some water is left.)"),
        P("The result is the <b>zinc–carbon cell</b>, still sold today as the cheapest AA. Here it is cut open lengthwise."));
      const cell = aaCell("zc", { circuit: true });
      const info = status();
      const sZ = stat("zinc wall left", "r"), sM = stat("MnO₂ left", "b");
      let depth = 0;
      const tg = toggle("Show", [["all", "everything"]].concat(AA_PARTS.zc.map((p) => [p.key, p.short])), "all", (k) => { cell.highlight(k); info.innerHTML = AA_INFO.zc[k]; });
      info.innerHTML = AA_INFO.zc.all;
      const upd = (d) => {
        depth = d; cell.setDepth(d); cell.setFlow(d > 0 && d < 1 ? 0.8 : 0);
        sZ.set(fmt.pct(1 - (5.5 / 9) * d)); sM.set(fmt.pct(1 - d));
      };
      const iv = setInterval(() => cell.tick(0.05), 50);
      el.append(widget("Zinc–carbon AA cell, cut open (schematic, colours exaggerated)", tg, cell.svg, info,
        slider({ name: "discharged", min: 0, max: 1, step: 0.01, value: 0, fmtv: fmt.pct, oninput: upd, nameWidth: 90 }),
        h("div", { class: "readout" }, sZ, sM),
        legend([[YEL, "electrons in the outside wire"], [RED, "positive ions moving through the paste to the mix"]])));
      upd(0);
      el.append(
        formula(`zinc can (anode, −): ${f("Zn")} → ${f("Zn^2+")} + <span class="hl">2e⁻</span><br>black mix (cathode, +): ${f("2MnO2 + 2NH4^+")} + <span class="hl">2e⁻</span> → ${f("Mn2O3 + 2NH3 + H2O")}<br><span class="bl">overall:</span> ${f("Zn + 2MnO2 + 2NH4^+ -> Zn^2+ + Mn2O3 + 2NH3 + H2O")}<small>about 1.5 V when new. Simplified textbook equations: the real products are messier (the ${f("Zn^2+")} and ${f("NH3")} end up bound together in solid salts).</small>`),
        P(`Drag the slider. The <em>anode</em> is the can itself, so discharging the cell thins its own wall. Notice also that the overall reaction <b>uses up</b> ${f("NH4^+")} from the paste: the electrolyte here is a reactant, not just a path for ions.`),
        takeaway("A <b>dry cell</b> holds its electrolyte as a paste. The <b>zinc–carbon cell</b>: zinc can (anode, −), MnO₂ + carbon mix around a carbon rod (cathode, +), NH₄Cl/ZnCl₂ paste between them, about 1.5 V."));
      return () => clearInterval(iv);
    },
    check: {
      type: "choice",
      q: "Old zinc–carbon cells left in a torch are notorious for leaking paste. Which part has failed, and why?",
      options: ["The carbon rod: it is slowly oxidised and crumbles", "The zinc can: it is the anode, so the cell's own reaction eats through its wall", "The metal cap: the + terminal dissolves as electrons arrive"],
      answer: 1,
      wrongHints: {
        0: "The carbon rod is inert: it only passes electrons on. Look for the part that appears in the anode half-reaction.",
        2: "Electrons arriving cannot dissolve a metal: dissolving a metal means it gives electrons away. Which part does that?",
      },
      why: `${f("Zn -> Zn^2+ + 2e-")} happens at the can wall. The container is also the fuel, so a drained cell has a thin, holed can.`,
    },
  });

  // ---------------------------------------------------------------- 5
  steps.push({
    title: "A one-way trip: primary cells and what they hold",
    short: "Primary cells",
    newConcepts: ["primary"],
    render(el) {
      el.append(style,
        P("A zinc–carbon cell is sold full and thrown away empty. Such a use-once cell is a <b>primary cell</b>. A cell that can be refilled by pushing current through it backwards is a <b>secondary</b> (rechargeable) cell; the first one is the subject of the next lesson, <em>Lead</em>."),
        P("Why not just recharge this one? You can force electrons backwards, but the zinc does not rebuild a neat can: it grows back as loose moss and needles, the products have wandered off into the paste, and gas forms inside a sealed can. The chemistry runs one way in practice."),
        P(`So a primary cell holds exactly as much charge as the chemicals packed into it. You know how to count that from <em>Charge, energy and capacity</em>: <em>specific capacity</em> in mAh per gram. A mole of zinc (${fmt.n(M_ZN)} g) gives 2 moles of electrons: <b>${Math.round(CAP_ZN)} mAh/g</b>, the same number as for the 6.54 g zinc strip. A mole of ${f("MnO2")} (${fmt.n(M_MNO2)} g) takes only 1 mole of electrons: <b>${Math.round(CAP_MNO2)} mAh/g</b>. Electrons given must equal electrons taken, so the side that runs out first sets the capacity.`));
      let gZn = 3.5, gMn = 6, used = 0, timer = null;
      const bars = hbars(["zinc can give", "MnO₂ can take"], { max: 5000, fmtv: mAh, labelWidth: 120 });
      const sCap = stat("cell capacity", "y"), sLim = stat("runs out first", "r"), sLeft = stat("left over, stranded", "");
      const out = status();
      const upd = () => {
        const qz = gZn * CAP_ZN, qm = gMn * CAP_MNO2, cap = Math.min(qz, qm);
        bars.update([qz - used, qm - used], [ZINC, "#8a6b52"], used > 0 ? [qz, qm] : null);
        sCap.set(mAh(cap));
        const zinc = qz < qm;
        sLim.set(Math.abs(qz - qm) < 15 ? "both together" : zinc ? "zinc" : "MnO₂");
        sLeft.set(Math.abs(qz - qm) < 15 ? "nothing" : zinc ? fmt.n((qm - qz) / CAP_MNO2, 1) + " g MnO₂" : fmt.n((qz - qm) / CAP_ZN, 1) + " g zinc");
        out.innerHTML = used <= 0 ? `Balanced recipe: ${fmt.n((2 * M_MNO2) / M_ZN)} g of ${f("MnO2")} for every gram of zinc (2 ${f("MnO2")} per Zn). The cathode is the heavy part of this battery.`
          : used < cap ? `Draining: both sides lose charge at the same rate, electron for electron. ${mAh(used)} delivered so far.`
          : `<b>Dead.</b> ${mAh(cap)} delivered. ${Math.abs(qz - qm) < 15 ? "Both sides ran out together: nothing wasted." : (zinc ? "The zinc is gone" : `The ${f("MnO2")} is used up`) + ", and what is left of the other side can never be used."} A primary cell stops here.`;
      };
      const stop = () => { if (timer) { clearInterval(timer); timer = null; } };
      const sZ = slider({ name: "zinc", min: 1, max: 6, step: 0.1, value: gZn, fmtv: (x) => x.toFixed(1) + " g", oninput: (v) => { gZn = v; stop(); used = 0; upd(); }, nameWidth: 60 });
      const sMn = slider({ name: "MnO₂", min: 2, max: 16, step: 0.1, value: gMn, fmtv: (x) => x.toFixed(1) + " g", oninput: (v) => { gMn = v; stop(); used = 0; upd(); }, nameWidth: 60 });
      el.append(widget("Fill a cell, then drain it", sZ, sMn, bars,
        h("div", { class: "btns" },
          h("button", { class: "primary", onclick: () => { stop(); used = 0; timer = setInterval(() => { const cap = Math.min(gZn * CAP_ZN, gMn * CAP_MNO2); used = Math.min(cap, used + 60); upd(); if (used >= cap) stop(); }, 30); } }, "Drain the cell"),
          h("button", { onclick: () => { stop(); used = 0; gMn = clamp(+(gZn * 2 * M_MNO2 / M_ZN).toFixed(1), 2, 16); sMn.set(gMn); upd(); } }, "Balance the MnO₂ to the zinc"),
          h("button", { onclick: () => { stop(); used = 0; upd(); } }, "Refill")),
        h("div", { class: "readout" }, sCap, sLim, sLeft), out));
      upd();
      el.append(
        P("These are ceilings. A real cell delivers less, because not every grain can be reached before the voltage sags too far, as the rest of this lesson shows."),
        takeaway(`A <b>primary cell</b> is used once; a <b>secondary cell</b> can be recharged. A primary cell's capacity is fixed by its contents: zinc ${Math.round(CAP_ZN)} mAh/g, ${f("MnO2")} ${Math.round(CAP_MNO2)} mAh/g, and the smaller total wins.`));
      return stop;
    },
    check: {
      type: "choice",
      q: `A cell is packed with 4.0 g of zinc (${Math.round(CAP_ZN)} mAh/g) and 9.0 g of ${f("MnO2")} (${Math.round(CAP_MNO2)} mAh/g). Which runs out first?`,
      options: ["The zinc: there are fewer grams of it", `The ${f("MnO2")}: it can take fewer electrons than the zinc can give`, "Both at the same moment: every cell is built balanced"],
      answer: 1,
      wrongHints: {
        0: "Grams are not the count that matters: electrons are. Multiply each mass by its mAh/g.",
        2: "Only if the masses are in the ratio 2.66 : 1. Check: 4.0 g of zinc would need 10.6 g of MnO₂.",
      },
      why: `Zinc: 4.0 × ${Math.round(CAP_ZN)} ≈ ${Math.round(4 * CAP_ZN / 10) * 10} mAh. ${f("MnO2")}: 9.0 × ${Math.round(CAP_MNO2)} ≈ ${Math.round(9 * CAP_MNO2 / 10) * 10} mAh. The ${f("MnO2")} side is smaller, so it sets the capacity and some zinc is stranded.`,
    },
  });

  // ---------------------------------------------------------------- 6
  steps.push({
    title: "The alkaline cell: turned inside out",
    short: "The alkaline cell",
    newConcepts: ["alkaline"],
    render(el) {
      el.append(style,
        P(`In the 1950s Lewis Urry, an engineer at Eveready, rebuilt the cell around the same two chemicals, zinc and ${f("MnO2")}. It went on sale in 1959 and is the AA you most likely have at home. Three things changed:`),
        h("ul", {},
          h("li", { html: `<b>The electrolyte</b> is concentrated potassium hydroxide, KOH: ${f("K^+")} and ${f("OH^-")} in water, a <em>basic solution</em> (from <em>Balancing redox equations</em>). "Alkaline" is another word for basic.` }),
          h("li", { html: "<b>The zinc</b> is a powder held in a gel in the middle, not a can." }),
          h("li", { html: `<b>The layout</b> is inside out: the ${f("MnO2")} is a ring on the outside, pressed against a steel can that takes no part in the reaction.` })));
      const cell = aaCell("alk", { circuit: true });
      const info = status();
      const sZ = stat("zinc left", "r"), sO = stat("OH⁻ in the cell", "b");
      const tg = toggle("Show", [["all", "everything"]].concat(AA_PARTS.alk.map((p) => [p.key, p.short])), "all", (k) => { cell.highlight(k); info.innerHTML = AA_INFO.alk[k]; });
      info.innerHTML = AA_INFO.alk.all;
      const upd = (d) => { cell.setDepth(d); cell.setFlow(d > 0 && d < 1 ? 0.8 : 0); sZ.set(fmt.pct(1 - d)); sO.set("unchanged"); };
      const iv = setInterval(() => cell.tick(0.05), 50);
      el.append(widget("Alkaline AA cell, cut open (schematic, colours exaggerated)", tg, cell.svg, info,
        slider({ name: "discharged", min: 0, max: 1, step: 0.01, value: 0, fmtv: fmt.pct, oninput: upd, nameWidth: 90 }),
        h("div", { class: "readout" }, sZ, sO),
        legend([[YEL, "electrons in the outside wire"], [BLUE, "OH⁻ moving from the ring to the zinc"]])));
      upd(0);
      el.append(
        P("You already balanced its two half-reactions in <em>Balancing redox equations</em>:"),
        formula(`zinc gel (anode, −): ${f("Zn + 2OH^-")} → ${f("ZnO + H2O")} + <span class="hl">2e⁻</span><br>ring (cathode, +): ${f("2MnO2 + H2O")} + <span class="hl">2e⁻</span> → ${f("Mn2O3 + 2OH^-")}<br><span class="bl">overall:</span> ${f("Zn + 2MnO2 -> ZnO + Mn2O3")}<small>E°cell = E°cathode − E°anode = +${E_MNO2_BASE.toFixed(2)} − (${sg(E_ZNO)}) = ${E_ALK.toFixed(2)} V</small>`),
        P(`The ${sg(E_ZNO)} V is the course table's value for zinc in base; +${E_MNO2_BASE.toFixed(2)} V is a textbook value for ${f("MnO2")} in base. A fresh real cell reads 1.5 to 1.6 V, because battery-grade ${f("MnO2")} is a keener taker than the textbook solid. The label says 1.5 V.`),
        P(`Look at the overall reaction: <b>no ${f("OH^-")} in it</b>. The ring makes exactly the ${f("OH^-")} that the zinc uses, and the ions just travel across the separator. Unlike in zinc–carbon, the electrolyte is not used up.`),
        takeaway(`The <b>alkaline cell</b>: zinc powder (anode, −) and an ${f("MnO2")} ring (cathode, +) in KOH. ${f("Zn + 2MnO2 -> ZnO + Mn2O3")}, about 1.5 V, and the electrolyte is not consumed.`));
      return () => clearInterval(iv);
    },
    check: {
      type: "number",
      q: `Work out the standard voltage of the alkaline cell from its two half-cells: zinc in base E° = ${sg(E_ZNO)} V, ${f("MnO2")} in base E° = +${E_MNO2_BASE.toFixed(2)} V. (in volts)`,
      answer: +E_ALK.toFixed(2), tolerance: 0.011,
      hint: "E°cell = E°cathode − E°anode. The zinc is the anode, and subtracting a negative number adds.",
      why: `${E_MNO2_BASE.toFixed(2)} − (${sg(E_ZNO)}) = ${E_ALK.toFixed(2)} V. Zinc is a stronger giver in base than in acid (${sg(E_ZNO)} V against ${sg(E_ZN)} V), which helps.`,
    },
  });

  // ---------------------------------------------------------------- 7
  steps.push({
    title: "Why powder beats a can",
    short: "Why alkaline lasts",
    newConcepts: [],
    render(el) {
      const V_ZN = 3.5 / 7.14;      // cm³ of zinc in 3.5 g (density 7.14 g/cm³)
      const CAN = 18;               // cm², inner wall of an AA zinc can (estimate from 14.5 mm × 50.5 mm outer size)
      el.append(style,
        P("An alkaline AA lasts several times longer than a zinc–carbon AA, most of all in devices that pull a large current. The biggest reason is geometry."),
        P(`The reaction only happens where zinc touches electrolyte: at the <b>surface</b>. In a zinc–carbon AA that surface is the inner wall of the can, roughly ${CAN} cm². An alkaline AA holds about 3.5 g of zinc as a powder, and a powder is nearly all surface. Shrink the grains and see.`));
      const cv = h("canvas", { width: 680, height: 220, style: "width:100%;display:block;border-radius:8px;background:#161a22" });
      const ctx = cv.getContext("2d");
      let r = 100, load = 500;   // µm, mA
      const sA = stat("zinc surface", "y"), sX = stat("compared with the can wall", "g");
      const bars = hbars(["zinc–carbon: can wall", "alkaline: powder"], { max: 60, fmtv: (v) => (v < 10 ? v.toFixed(1) : Math.round(v)) + " mA/cm²", labelWidth: 150 });
      const area = () => (3 * V_ZN) / (r * 1e-4);
      const draw = () => {
        ctx.clearRect(0, 0, 680, 220); ctx.fillStyle = ZINC;
        const rp = (r / 1000) * (680 / 6), d = rp * 2.08;
        if (rp < 3) { for (let y = 2; y < 220; y += d) for (let x = 2; x < 680; x += d) ctx.fillRect(x, y, rp * 1.7, rp * 1.7); }
        else { let row = 0; for (let y = rp + 2; y - rp < 220; y += d * 0.88, row++) for (let x = rp + 2 + (row % 2 ? rp : 0); x - rp < 680; x += d) { ctx.beginPath(); ctx.arc(x, y, rp, 0, 7); ctx.fill(); } }
        const A = area();
        sA.set((A < 100 ? A.toFixed(1) : Math.round(A)) + " cm²"); sX.set("× " + (A / CAN < 10 ? (A / CAN).toFixed(1) : Math.round(A / CAN)));
        bars.update([load / CAN, load / A], [ORANGE, GRN]);
      };
      el.append(widget("3.5 g of zinc as grains (idealised spheres; the window is 6 mm wide)", cv,
        slider({ name: "grain radius", min: 20, max: 3000, value: r, log: true, fmtv: (x) => (x >= 1000 ? (x / 1000).toFixed(1) + " mm" : Math.round(x) + " µm"), oninput: (v) => { r = v; draw(); }, nameWidth: 100 }),
        slider({ name: "current drawn", min: 10, max: 1000, value: load, log: true, fmtv: (x) => Math.round(x) + " mA", oninput: (v) => { load = v; draw(); }, nameWidth: 100 }),
        h("div", { class: "readout" }, sA, sX),
        note("Current that each cm² of zinc surface must deliver:", "margin-top:12px"), bars));
      draw();
      el.append(
        P("Real alkaline zinc powder has grains from tens to a few hundred micrometres across, so its surface is ten or more times that of a can wall. Each square centimetre then has to deliver only a small trickle of current, and products clear away as fast as they form. Squeeze a big current through a small surface and they pile up: <em>polarisation</em>, from step 2, in a new costume."),
        P("Two more reasons add to it:"),
        h("ul", {},
          h("li", { html: `<b>The electrolyte is not used up.</b> Zinc–carbon consumes its ${f("NH4^+")}, and the paste near the electrodes runs short under load. In the alkaline cell ${f("OH^-")} is only passed along, and KOH solution carries ions much better than the paste.` }),
          h("li", { html: `<b>More fits in.</b> No carbon rod, no thick can wall to keep in reserve: an alkaline AA holds more ${f("MnO2")} and uses nearly all of its zinc.` })),
        takeaway("Reactions happen at surfaces. Zinc powder has far more surface than a zinc can, so an alkaline cell polarises less and keeps its voltage at currents where zinc–carbon collapses."));
    },
    check: {
      type: "number",
      q: "A camera draws 900 mA. Spread over a zinc can wall of 18 cm², that is 50 mA per cm². Zinc powder with a surface of 300 cm² delivers the same 900 mA. How many mA per cm² is that?",
      answer: 3, tolerance: 0.05,
      hint: "Same current, more area: divide 900 mA by 300 cm².",
      why: "900 / 300 = 3 mA per cm², about 17 times gentler on every bit of zinc surface than the can wall.",
    },
  });

  // ---------------------------------------------------------------- 8
  steps.push({
    title: "Zinc–air: leave the cathode outside",
    short: "Zinc–air",
    newConcepts: ["znair"],
    render(el) {
      el.append(style,
        P(`Step 5 showed that ${f("MnO2")} is the heavy, bulky half of the cell: 2.66 g for every gram of zinc. What if the electron-taker did not have to be carried at all? The best common oxidising agent is all around you: <b>oxygen</b>.`),
        P("A <b>zinc–air cell</b> is a button filled almost completely with zinc gel in KOH. The cathode is only a thin sheet of porous carbon behind a few small holes. Oxygen from the air meets water and the arriving electrons there:"),
        formula(`zinc (anode, −): ${f("Zn + 2OH^-")} → ${f("ZnO + H2O")} + <span class="hl">2e⁻</span><br>air cathode (+): ${f("O2 + 2H2O")} + <span class="hl">4e⁻</span> → ${f("4OH^-")}<br><span class="bl">overall:</span> ${f("2Zn + O2 -> 2ZnO")}<small>E°cell = +${E_O2.toFixed(2)} − (${sg(E_ZNO)}) = ${E_AIR.toFixed(2)} V. A working cell gives about 1.4 V: oxygen is a slow taker (more in <em>Hydrogen and fuel cells</em>).</small>`));
      const W = narrow(430, 345), H = 232, WX = W - 22;
      const svg = s("svg", { viewBox: `0 0 ${W} ${H}`, width: "100%", style: "display:block;margin:0 auto;max-width:520px" });
      const g0 = s("g"); svg.append(g0);
      const WP = [[180, 60], [180, 26], [WX, 26], [WX, 112], [300, 112]];
      polyline(g0, WP);
      rect(g0, WX - 17, 54, 34, 26, { rx: 5, fill: "#212734", stroke: "#b9c2d3", "stroke-width": 1.5 });
      const dev = T(g0, WX, 71, "off", { size: 11.5, fill: MUTED });
      rect(g0, 60, 72, 8, 89, { fill: STEEL }); rect(g0, 292, 72, 8, 89, { fill: STEEL });
      rect(g0, 68, 60, 7, 92, { fill: "#6b5a45" }); rect(g0, 285, 60, 7, 92, { fill: "#6b5a45" });
      rect(g0, 75, 60, 210, 12, { fill: "#c8ccd4", rx: 2 });
      const gel = rect(g0, 75, 72, 210, 64, { fill: ZINC });
      rect(g0, 75, 136, 210, 5, { fill: "#d8d2b8" });
      rect(g0, 75, 141, 210, 11, { fill: "#30333c" });
      rect(g0, 60, 152, 240, 9, { fill: STEEL });
      [120, 180, 240].forEach((x) => rect(g0, x - 5, 152, 10, 9, { fill: "#161a22" }));
      const gelTxt = T(g0, 180, 108, "zinc powder in KOH gel", { size: 12, fill: DARK, weight: 600 });
      T(g0, 150, 53, "− cap", { size: 11.5 }); T(g0, 318, 132, "+", { size: 16, weight: 700 }); T(g0, 30, 149, "air", { size: 11.5, fill: MUTED }); T(g0, 30, 162, "cathode", { size: 11.5, fill: MUTED });
      g0.append(s("line", { x1: 50, y1: 147, x2: 76, y2: 147, stroke: MUTED, "stroke-width": 0.9 }));
      const tab = rect(g0, 84, 162, 192, 6, { fill: ORANGE, rx: 2 });
      const tabTxt = T(g0, 180, 181, "sticker (tab) seals the air holes", { size: 11, fill: ORANGE });
      const gO = s("g"); svg.append(gO); const gE = s("g"); svg.append(gE);
      const rnd = rng(3), at = pathAt(WP);
      const eDots = Array.from({ length: 9 }, () => { const c = s("circle", { r: 3.2, fill: YEL, stroke: DARK, "stroke-width": 0.6 }); gE.append(c); return c; });
      const o2 = Array.from({ length: 8 }, () => {
        const g = s("g"); g.append(s("circle", { cx: -3, r: 3.4, fill: GRN }), s("circle", { cx: 3, r: 3.4, fill: GRN })); gO.append(g);
        return { g, x: 40 + rnd() * (W - 80), y: 190 + rnd() * 32, vx: (rnd() - 0.5), vy: (rnd() - 0.5) };
      });
      const st = { sealed: true, load: false, x: 0, o2: 0.5, V: 0, phase: 0 };
      const Q = 600;  // mAh, typical size-675 hearing-aid cell (approximate)
      const sV = stat("voltage", "y"), sQ = stat("charge delivered", "b"), sM = stat("mass gained from the air", "g");
      const out = status();
      const tick = (dt) => {
        if (!st.sealed) st.o2 = Math.min(1, st.o2 + dt * 2); else if (st.load && st.x < 1) st.o2 = Math.max(0, st.o2 - dt * 0.22);
        const air = Math.min(1, st.o2 / 0.3);
        st.V = st.x >= 1 ? 0 : (st.load ? 1.3 - 0.06 * st.x : 1.4) * air;
        const running = st.load && st.V > 0.9;
        if (running) st.x = Math.min(1, st.x + dt / 14);
        st.phase += running ? dt * 0.35 : 0;
        eDots.forEach((c, i) => { const [x, y] = at(st.phase + i / 9); c.setAttribute("cx", x); c.setAttribute("cy", y); c.setAttribute("opacity", running ? 1 : 0); });
        for (const m of o2) {
          m.vx = clamp(m.vx + (rnd() - 0.5) * 0.25, -1, 1); m.vy = clamp(m.vy + (rnd() - 0.5) * 0.25 - (!st.sealed && running ? 0.06 : 0), -1, 1);
          m.x += m.vx; m.y += m.vy;
          const top = st.sealed ? 190 : 172;
          if (!st.sealed && running && m.y < 176) { const hx = [120, 180, 240].find((x) => Math.abs(m.x - x) < 22); if (hx != null) { m.x = 30 + rnd() * (W - 60); m.y = 224; } }
          if (m.y < top) { m.y = top; m.vy = Math.abs(m.vy); } if (m.y > 226) { m.y = 226; m.vy = -Math.abs(m.vy); }
          if (m.x < 12) { m.x = 12; m.vx = Math.abs(m.vx); } if (m.x > W - 12) { m.x = W - 12; m.vx = -Math.abs(m.vx); }
          m.g.setAttribute("transform", `translate(${m.x.toFixed(1)} ${m.y.toFixed(1)})`);
        }
        gel.setAttribute("fill", mix(ZINC, "#f1efe6", st.x));
        gelTxt.textContent = st.x >= 1 ? "all zinc oxide now" : st.x > 0.5 ? "zinc + zinc oxide in KOH gel" : "zinc powder in KOH gel";
        tab.setAttribute("opacity", st.sealed ? 1 : 0); tabTxt.textContent = st.sealed ? "sticker (tab) seals the air holes" : "O₂ from the air enters through the holes"; tabTxt.style.fill = st.sealed ? ORANGE : GRN;
        dev.textContent = running ? "on" : "off"; dev.style.fill = running ? GRN : MUTED;
        const q = st.x * Q, mO = ((q * 3.6) / Chem.F / 4) * 2 * Chem.elements.O.mass;
        sV.set(st.V.toFixed(2) + " V"); sQ.set(mAh(q)); sM.set("+" + mO.toFixed(3) + " g");
        out.innerHTML = st.x >= 1 ? `<b>Empty.</b> Every zinc atom is now ZnO. The cell took ${mO.toFixed(2)} g of oxygen out of the air and is that much heavier.`
          : st.load && st.sealed && air < 1 ? "The hearing aid is burning the little oxygen trapped inside. With the holes sealed, the cathode starves and the voltage collapses: polarisation again, this time from a missing reactant."
          : st.load && st.sealed ? "Running on the bit of air sealed inside. That will not last."
          : running ? "Oxygen flows in as fast as it is used. The voltage stays almost flat until the zinc is gone."
          : st.sealed ? "Sealed: no oxygen, no reaction. This is how the cell waits on the shelf for years." : "Open and waiting. From now on the cell slowly dries out or soaks up moisture, used or not: it lasts a few weeks.";
      };
      const iv = setInterval(() => tick(0.05), 50);
      const tgT = toggle("Sticker", [[true, "on (sealed)"], [false, "peeled off"]], true, (v) => (st.sealed = v));
      const tgL = toggle("Hearing aid", [[false, "off"], [true, "on"]], false, (v) => (st.load = v));
      el.append(widget("A zinc–air button cell, cut open (schematic; toy clock)", tgT, tgL, svg,
        h("div", { class: "btns" }, h("button", { onclick: () => { st.x = 0; st.o2 = 0.5; st.sealed = true; st.load = false; tgT.set(true); tgL.set(false); } }, "New cell")),
        h("div", { class: "readout" }, sV, sQ, sM), out,
        legend([[GRN, "O₂ molecule"], [YEL, "electron"]])));
      tick(0);
      const cmp = hbars(["alkaline button: zinc + MnO₂ inside", "zinc–air: zinc only"], { max: 700, fmtv: mAh, labelWidth: 170 });
      cmp.update([150, Q], [ORANGE, GRN]);
      el.append(widget("Same size of can (11.6 mm × 5.4 mm), typical data-sheet capacities (approximate)", cmp),
        P("With no cathode material to store, the same little can holds about four times the charge. That is why hearing aids, which must be tiny and run all day, use zinc–air. The price: the cell needs air, cannot deliver large currents (oxygen has to seep in), and once the sticker is off its life is counted in weeks."),
        takeaway(`A <b>zinc–air cell</b> stores only the zinc. The oxidising agent is ${f("O2")} from the air, reduced on a thin porous carbon cathode: ${f("2Zn + O2 -> 2ZnO")}, about 1.4 V in use.`));
      return () => clearInterval(iv);
    },
    check: {
      type: "choice",
      q: "You weigh a zinc–air cell on a very fine balance, use it until it is empty, and weigh it again. What do you find?",
      options: ["It is lighter: the zinc has been used up", "It is heavier: oxygen atoms from the air are now inside, bound in ZnO", "Exactly the same: only electrons left the cell, and they came back"],
      answer: 1,
      wrongHints: {
        0: "The zinc atoms are all still in the can, as ZnO. Nothing leaves. But does anything come in?",
        2: `That is true for a sealed cell like the alkaline AA. This cell has holes, and one of its reactants comes through them.`,
      },
      why: `${f("2Zn + O2 -> 2ZnO")}: every 65.4 g of zinc picks up 16.0 g of oxygen. A sealed cell keeps its mass; a zinc–air cell gains about a quarter of its zinc's mass.`,
    },
  });

  // ---------------------------------------------------------------- 9
  steps.push({
    title: "Silver oxide: the flat-voltage button cell",
    short: "Silver oxide",
    newConcepts: ["agox"],
    render(el) {
      el.append(style,
        P(`One more member of the zinc family sits in most watches. Keep the alkaline cell's zinc and KOH, and swap the ${f("MnO2")} for <b>silver oxide</b>, ${f("Ag2O")}. Silver is a <em>noble metal</em> (from <em>The activity series</em>): its ion is a keen electron-taker.`),
        formula(`${f("Zn + Ag2O -> ZnO + 2Ag")}<small>Ag: +1 → 0, Zn: 0 → +2. E°cell = +${E_AG2O.toFixed(2)} − (${sg(E_ZNO)}) = ${E_SILVER.toFixed(2)} V; sold as 1.55 V. (+${E_AG2O.toFixed(2)} V for ${f("Ag2O")} in base is a handbook value, not in the course table.)</small>`),
        P("Its special talent is a voltage that barely moves until the cell is empty. Compare three button cells of the same size:"));
      const CELLS = [
        { name: "alkaline (MnO₂)", col: ORANGE, Q: 150, V: (x) => 1.55 - 0.55 * x - 0.6 * Math.exp((x - 1) / 0.025) },
        { name: "silver oxide", col: BLUE, Q: 150, V: (x) => 1.57 - 0.03 * x - 0.6 * Math.exp((x - 1) / 0.025) },
        { name: "zinc–air", col: GRN, Q: 600, V: (x) => 1.32 - 0.06 * x - 0.6 * Math.exp((x - 1) / 0.025) },
      ];
      let cut = 1.2, mode = "pct";
      const holder = h("div");
      const bars = hbars(CELLS.map((c) => c.name), { max: 600, fmtv: mAh, labelWidth: 130 });
      const usable = (c) => { let x = 0; while (x < 1 && c.V(x) >= cut) x += 0.002; return x; };
      const draw = () => {
        const pct = mode === "pct";
        const pl = plot({ xmin: 0, xmax: pct ? 100 : 600, ymin: 0.9, ymax: 2.1, width: 520, height: 240, narrow: true, minFont: 10,
          xlabel: pct ? "charge delivered (% of the cell's capacity)" : "charge delivered (mAh)", ylabel: "voltage (V)",
          xticks: pct ? [0, 25, 50, 75, 100] : [0, 150, 300, 450, 600], yticks: [0.9, 1.2, 1.5, 1.8, 2.1], clip: true });
        pl.hline(cut, RED);
        CELLS.forEach((c) => {
          const pts = []; for (let x = 0; x <= 1.0001; x += 0.005) pts.push([pct ? x * 100 : x * c.Q, c.V(x)]);
          pl.line(pts, c.col);
          const u = usable(c); pl.dot(pct ? u * 100 : u * c.Q, Math.max(cut, c.V(Math.min(u, 1))), c.col, 4);
        });
        pl.legend(CELLS.map((c) => [c.name, c.col]), { pos: "right" });
        holder.innerHTML = ""; holder.append(pl);
        bars.update(CELLS.map((c) => usable(c) * c.Q), CELLS.map((c) => c.col), CELLS.map((c) => c.Q));
      };
      el.append(widget("Discharge curves at a light load (schematic shapes; capacities are typical data-sheet values)",
        toggle("Horizontal axis", [["pct", "% of capacity"], ["mah", "mAh"]], "pct", (m) => { mode = m; draw(); }), holder,
        slider({ name: "device stops below", min: 0.9, max: 1.5, step: 0.01, value: cut, fmtv: (x) => x.toFixed(2) + " V", oninput: (v) => { cut = v; draw(); }, nameWidth: 130 }),
        note("Charge the device can actually use (dashed outline = what the cell holds):", "margin-top:12px"), bars));
      draw();
      el.append(
        P(`Raise the cut-off to 1.4 V, as an old quartz watch or a light meter might demand: the alkaline button is "dead" with most of its charge still inside, and the silver cell does not care.`),
        P(`Why is silver so flat? Remember the <em>Nernst equation</em>: voltage moves only when the <em>reaction quotient Q</em> moves, and Q counts dissolved things, not pure solids (the metal strips never appeared in it). In ${f("Zn + Ag2O -> ZnO + 2Ag")} all four substances are separate pure solids and ${f("OH^-")} cancels out. Q has nothing in it that can change, so the voltage stays put until one solid is gone. ${f("MnO2")} behaves differently: hydrogen slips into the solid as it is reduced, the solid's composition shifts gradually, and its pull on electrons slides down with it.`),
        P("Silver is expensive, so this chemistry is only used where the cell is tiny."),
        takeaway(`<b>Silver oxide cell</b>: ${f("Zn + Ag2O -> ZnO + 2Ag")}, 1.55 V, flat until empty because every reactant and product is a separate pure solid. Used in watches.`));
    },
    check: {
      type: "choice",
      q: "An alkaline button and a silver oxide button hold the same charge. A device that stops below 1.4 V runs far longer on the silver one. Why?",
      options: ["Silver oxide gives its electrons a much higher starting voltage, about 3 V", "Its voltage stays near 1.55 V until the end, while the alkaline cell's voltage slides below 1.4 V early", "Silver conducts better than manganese, so less charge is lost as heat"],
      answer: 1,
      wrongHints: {
        0: `Both start close to 1.55 V. Compare the <i>shapes</i> of the curves, not their starting points.`,
        2: "The charge is not lost: it is still in the alkaline cell, at a voltage the device cannot use. Look at where each curve crosses the cut-off line.",
      },
      why: "Same charge, different curve shape. A sloping curve crosses the cut-off early and strands the rest; a flat one delivers nearly everything.",
    },
  });

  // ---------------------------------------------------------------- 10
  steps.push({
    title: "Capstone: one AA, two chemistries, four devices",
    short: "Capstone: drain an AA",
    newConcepts: [],
    render(el) {
      // Toy model. Open-circuit voltage slides with depth x (MnO₂ changes composition), then falls off a cliff.
      // Under a current I the voltage drops by a polarisation term that grows with I and with depth.
      // Parameters are tuned by hand to land in the range of published AA data sheets; they are not measurements.
      const CELL = {
        zc: { name: "zinc–carbon", col: ORANGE, Q: 1000, E0: 1.60, a: 0.55, r0: 1.05, r1: 0.6 },
        alk: { name: "alkaline", col: GRN, Q: 2850, E0: 1.58, a: 0.45, r0: 0.45, r1: 0.4 },
      };
      const LOADS = [[25, "remote control", "25 mA"], [250, "torch", "250 mA"], [500, "toy motor", "500 mA"], [1000, "camera flash", "1 A"]];
      const Eoc = (c, x) => c.E0 - c.a * x - 0.5 * Math.exp((x - 1) / 0.03);
      const Vat = (c, x, I) => Eoc(c, x) - (I / 1000) * (c.r0 + c.r1 * x);
      el.append(style,
        P("Everything together. Below is one AA cell, cut open, wired to a device. Pick the chemistry and the device, then run it. The chart plots voltage against the charge delivered so far, so a longer line is a longer-lasting cell."),
        P("The model is a toy with hand-tuned numbers, built from this lesson's ideas: the voltage of a resting cell slides down as the " + f("MnO2") + " is used (step 9), a current pulls it down further by <em>polarisation</em> (steps 2 and 7), and the device gives up when the voltage falls below its cut-off."));
      const st = { kind: "alk", I: 250, cut: 0.9, x: 0, running: false, runs: [], seg: null, mWh: 0, hrs: 0, q0: 0 };
      const holder = h("div");
      let cell = null;
      const mount = () => { cell = aaCell(st.kind, { circuit: true, compact: true }); holder.innerHTML = ""; holder.append(cell.svg); cell.setDepth(st.x); };
      const pl = plot({ xmin: 0, xmax: 3000, ymin: 0.6, ymax: 1.7, width: 400, height: 280, minFont: 10, xlabel: "charge delivered by this cell (mAh)", ylabel: "voltage at the device (V)", xticks: [0, 1000, 2000, 3000], yticks: [0.6, 0.8, 1.0, 1.2, 1.4, 1.6], clip: true });
      pl.legend([["alkaline", GRN], ["zinc–carbon", ORANGE], ["earlier cells", MUTED, true]], { pos: "right" });
      const sV = stat("voltage", "y"), sQ = stat("delivered", "b"), sT = stat("running time", ""), sE = stat("energy", "g"), sU = stat("chemicals used", "r");
      const out = status();
      const tb = h("table", { class: "small zb-tb" });
      const tHead = "<tr><th>cell</th><th>device</th><th class='num'>charge</th><th class='num'>time</th><th class='num'>energy</th><th>ended because</th></tr>";
      tb.innerHTML = tHead;
      const hm = (hh) => (hh >= 10 ? Math.round(hh) + " h" : hh >= 1 ? hh.toFixed(1) + " h" : Math.round(hh * 60) + " min");
      const redraw = () => {
        const c = CELL[st.kind];
        pl.clear(); pl.hline(st.cut, RED, "device cut-off", { pos: "right" });
        st.runs.forEach((r) => { pl.line(r.pts, CELL[r.kind].col, r !== st.seg && r.old); if (r.pts.length) { const p = r.pts[r.pts.length - 1]; pl.dot(p[0], p[1], CELL[r.kind].col, 3.5); } });
        const V = st.running ? Vat(c, st.x, st.I) : Eoc(c, st.x);
        sV.set(Math.max(0, V).toFixed(2) + " V"); sV.setLabel(st.running ? "voltage under load" : "voltage at rest");
        sQ.set(mAh(st.x * c.Q)); sT.set(hm(st.hrs)); sE.set((st.mWh / 1000).toFixed(2) + " Wh"); sU.set(fmt.pct(Math.min(1, st.x)));
        cell.setDepth(st.x);
      };
      const addRow = (r, why) => {
        const row = h("tr", {}, h("td", { style: `color:${CELL[r.kind].col}` }, CELL[r.kind].name), h("td", {}, r.dev), h("td", { class: "num" }, mAh(r.q)), h("td", { class: "num" }, hm(r.hrs)), h("td", { class: "num" }, (r.mWh / 1000).toFixed(2) + " Wh"), h("td", {}, why));
        tb.append(row); while (tb.rows.length > 9) tb.deleteRow(1);
      };
      let timer = null;
      const stop = () => { if (timer) { clearInterval(timer); timer = null; } st.running = false; if (cell) cell.setFlow(0); };
      const finish = (why, msg) => {
        const sg = st.seg; stop(); st.seg = null;
        if (sg) addRow({ kind: st.kind, dev: sg.dev, q: sg.q, hrs: sg.hrs, mWh: sg.mWh }, why);
        out.innerHTML = msg; redraw();
      };
      const run = () => {
        if (st.running) return;
        const c = CELL[st.kind], L = LOADS.find((l) => l[0] === st.I), dev = `${L[1]}, ${L[2]}`;
        if (st.x >= 0.999) { out.innerHTML = "This cell is completely empty. Put in a <b>new cell</b>."; return; }
        st.seg = { kind: st.kind, dev, pts: [], q: 0, hrs: 0, mWh: 0 }; st.runs.push(st.seg);
        if (Vat(c, st.x, st.I) < st.cut) {
          return finish("too much sag", `The ${L[1]} does not even start: at ${L[2]} this ${c.name} cell sags to ${Math.max(0, Vat(c, st.x, st.I)).toFixed(2)} V, below the cut-off, although it still rests at ${Eoc(c, st.x).toFixed(2)} V and has ${fmt.pct(1 - st.x)} of its chemicals left. Try a gentler device with the same cell.`);
        }
        st.running = true; cell.setFlow(0.3 + 0.7 * Math.sqrt(st.I / 1000));
        out.innerHTML = `Running the ${L[1]} at ${L[2]} from a ${c.name} cell…`;
        timer = setInterval(() => {
          for (let k = 0; k < 4; k++) {
            const V = Vat(c, st.x, st.I);
            if (V < st.cut || st.x >= 1) {
              const empty = st.x > 0.93;
              return finish(empty ? "cell empty" : "voltage too low", empty
                ? `The ${L[1]} stops after ${hm(st.seg.hrs)} of this run: the cell is spent, ${fmt.pct(Math.min(1, st.x))} of its chemicals used.`
                : `The ${L[1]} stops after ${hm(st.seg.hrs)}, but only ${fmt.pct(st.x)} of the chemicals are used. The cell is polarised, not empty: it rests at ${Eoc(c, st.x).toFixed(2)} V. Switch to a gentler device and press Run again with the <b>same cell</b>.`);
            }
            const dq = c.Q / 400;
            st.seg.pts.push([st.x * c.Q, V]);
            st.x += dq / c.Q; st.seg.q += dq; st.seg.hrs += dq / st.I; st.seg.mWh += V * dq; st.hrs += dq / st.I; st.mWh += V * dq;
          }
          cell.tick(0.03); redraw();
        }, 30);
      };
      const fresh = (clear) => {
        stop(); st.seg = null; st.x = 0; st.mWh = 0; st.hrs = 0;
        if (clear) { st.runs = []; tb.innerHTML = tHead; } else st.runs.forEach((r) => (r.old = true));
        out.innerHTML = `A new ${CELL[st.kind].name} AA, resting at ${Eoc(CELL[st.kind], 0).toFixed(2)} V. Pick a device and press Run.`;
        redraw();
      };
      const tgK = toggle("Cell", [["alk", "alkaline"], ["zc", "zinc–carbon"]], st.kind, (k) => { stop(); st.kind = k; mount(); fresh(false); });
      const tgL = toggle("Device", LOADS.map((l) => [l[0], `${l[1]} <span style="opacity:.7">${l[2]}</span>`]), st.I, (v) => { if (st.running) finish("switched device", "Device changed mid-run. Press Run to continue with the same cell."); st.I = v; });
      mount();
      el.append(widget("AA discharge bench (toy model, hand-tuned to typical data-sheet behaviour)", tgK, tgL,
        slider({ name: "device cut-off", min: 0.8, max: 1.3, step: 0.01, value: st.cut, fmtv: (x) => x.toFixed(2) + " V", oninput: (v) => { st.cut = v; if (!st.running) redraw(); }, nameWidth: 110 }),
        h("div", { class: "btns" },
          h("button", { class: "primary", onclick: run }, "Run until the device stops"),
          h("button", { onclick: () => fresh(false) }, "New cell"),
          h("button", { onclick: () => fresh(true) }, "Clear chart and table")),
        h("div", { class: "zb-two" }, holder, h("div", {}, pl)), h("div", { class: "readout" }, sV, sQ, sT, sE, sU),
        out, h("div", { class: "tablewrap", style: "margin-top:12px" }, tb)));
      fresh(true);
      el.append(
        P("Things to try, each from an earlier step:"),
        h("ul", {},
          h("li", { html: "<b>Remote control, both cells.</b> At a trickle of current both deliver nearly everything they hold, and the gap is just what is packed inside (step 5): roughly 2&nbsp;800 mAh against 1&nbsp;000 mAh. Published data sheets give about 2&nbsp;500 to 2&nbsp;900 mAh for alkaline AAs at 25 mA, and about 400 to 1&nbsp;100 mAh for zinc–carbon." }),
          h("li", { html: "<b>Toy motor, both cells.</b> Now the gap is about ten to one. The zinc–carbon cell polarises: small zinc surface, an electrolyte that is being used up (steps 4 and 7)." }),
          h("li", { html: "<b>Camera flash.</b> The zinc–carbon cell cannot start it at all. The alkaline cell gives up with most of its chemicals unused." }),
          h("li", { html: "<b>Then move that “dead” alkaline cell to the remote control</b> (do not press New cell). It runs for days more. A device's “empty” is a voltage, not an empty cell (step 9)." }),
          h("li", { html: "<b>Raise the cut-off</b> to 1.2 V and repeat. Fussy devices strand more charge, because the curves slope." })),
        P("What this toy leaves out: cells recover when rested, cold slows everything, and the losses under load have more than one cause. <em>Real batteries: resistance, rate and energy density</em> takes that apart. And every cell here is a primary cell: in the next lesson, <em>Lead</em>, the reaction finally runs backwards."),
        takeaway("One anode metal, zinc, and five ways to take its electrons: H⁺ (Volta), MnO₂ in a salt paste (zinc–carbon), MnO₂ in KOH (alkaline), O₂ from the air, and Ag₂O. What a cell delivers depends on what is packed inside and on how hard you pull."));
      return stop;
    },
  });

  Course.run({
    id: "zinc-batteries",
    section: "3. Batteries, element by element",
    title: "Zinc: from Volta's pile to the alkaline cell",
    concepts: {
      pile: "voltaic pile",
      polar: "polarisation",
      depol: "depolariser (MnO₂)",
      zncarbon: "zinc–carbon (Leclanché) cell",
      dry: "dry cell",
      primary: "primary vs secondary cell",
      alkaline: "alkaline Zn–MnO₂ cell",
      znair: "zinc–air cell",
      agox: "silver oxide cell",
    },
    sources: [
      { title: "OpenStax Chemistry 2e, 17.5 Batteries and Fuel Cells", url: "https://openstax.org/books/chemistry-2e/pages/17-5-batteries-and-fuel-cells", note: "dry cell and alkaline cell half-reactions; E° = +0.15 V for MnO₂/Mn₂O₃ in base; primary vs secondary" },
      { title: "Wikipedia: Voltaic pile", url: "https://en.wikipedia.org/wiki/Voltaic_pile", note: "Volta 1800, zinc/copper/brine construction, hydrogen at the copper, polarisation and the other flaws" },
      { title: "Wikipedia: Leclanché cell", url: "https://en.wikipedia.org/wiki/Leclanch%C3%A9_cell", note: "1866 wet cell: zinc, MnO₂ + carbon, ammonium chloride" },
      { title: "Wikipedia: Zinc–carbon battery", url: "https://en.wikipedia.org/wiki/Zinc%E2%80%93carbon_battery", note: "Gassner's dry cell (1886), construction, about 1.5 V, why the can leaks" },
      { title: "Wikipedia: Alkaline battery", url: "https://en.wikipedia.org/wiki/Alkaline_battery", note: "Lewis Urry / Eveready, on sale 1959; construction; 1.5–1.65 V fresh; capacity falls with load" },
      { title: "Wikipedia: AA battery", url: "https://en.wikipedia.org/wiki/AA_battery", note: "typical capacities: zinc–carbon about 400–900 mAh (more for 'heavy duty' types), alkaline about 1 700–2 850 mAh" },
      { title: "Energizer E91 (alkaline AA) product data sheet", url: "https://data.energizer.com/pdfs/e91.pdf", note: "capacity against discharge current, the basis for the capstone's ballpark numbers" },
      { title: "Wikipedia: Zinc–air battery", url: "https://en.wikipedia.org/wiki/Zinc%E2%80%93air_battery", note: "reactions, 1.65 V theoretical and about 1.4 V in use, hearing-aid cells, tab seal" },
      { title: "Wikipedia: Silver oxide battery", url: "https://en.wikipedia.org/wiki/Silver_oxide_battery", note: "Zn + Ag₂O → ZnO + 2Ag, 1.55 V, flat discharge curve" },
    ],
    steps,
  });
})();
