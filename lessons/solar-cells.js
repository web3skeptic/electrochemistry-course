// Lesson 4.4: Silicon and light: electricity without a reaction
// Running example: one 156 mm silicon cell (243 cm², about 10 g) in full sun: 9 A, 0.64 V open circuit, about 4.8 W.
(function () {
  const { h, s, widget, stat, plot, toggle, hbars, rng, fitText } = Course;
  // engine slider, but the value column never wraps ("100% sun" stays on one line)
  const slider = (o) => { const r = Course.slider(o); const v = r.querySelector(".val"); if (v) v.style.cssText = "width:auto;min-width:62px;white-space:nowrap"; return r; };
  const EL = Chem.elements;
  const YEL = "#ffd166", BLUE = "#6cb4ff", GRN = "#5fd38d", RED = "#ff6b6b", PUR = "#c3a6ff", GREY = "#4a5568", MUT = "#9aa3b5", TXT = "#e6e9ef", PANEL = "#1a1f29";

  const P = (html) => h("p", { html });
  const takeaway = (html) => h("div", { class: "takeaway", html });
  const formula = (html) => h("div", { class: "formula", html });
  const note = (html) => h("div", { class: "note", style: "margin-top:8px;min-height:40px", html });
  const svgEl = (w, hh, maxw) => fitText(s("svg", { viewBox: `0 0 ${w} ${hh}`, width: "100%", style: `display:block;max-width:${maxw || Math.round(w * 1.35)}px;margin:0 auto` }), 10, 1.5);
  const add = (parent, tag, attrs, text) => { const e = s(tag, attrs || {}); if (text != null) e.textContent = text; parent.append(e); return e; };
  const txt = (p, x, y, str, o = {}) => add(p, "text", { x, y, "text-anchor": o.anchor || "middle", style: `fill:${o.fill || MUT};font-size:calc(${o.size || 12}px * var(--c-k, 1));${o.bold ? "font-weight:600;" : ""}` }, str);
  const dot = (p, x, y, r = 3.5, fill = YEL) => add(p, "circle", { cx: x, cy: y, r, fill });
  const ring = (p, x, y, r = 4.5) => add(p, "circle", { cx: x, cy: y, r, fill: PANEL, stroke: RED, "stroke-width": 1.8 });
  const at = (e, x, y) => { e.setAttribute("cx", x); e.setAttribute("cy", y); };
  function atom(p, x, y, label, r = 14, o = {}) {
    const c = add(p, "circle", { cx: x, cy: y, r, fill: o.fill || "#2a3242", stroke: o.stroke || "#5b6577", "stroke-width": 1.5 });
    const t = txt(p, x, y + 4, label, { fill: TXT, size: o.size || 12, bold: true });
    return { c, t };
  }
  // stat tile whose value is set in the sans font (Unicode superscripts look gappy in mono)
  const statS = (label, cls, size) => { const st = stat(label, cls); const v = st.querySelector(".v"); v.style.fontFamily = "inherit"; if (size) v.style.fontSize = size + "px"; return st; };
  const SUPS = { "-": "⁻", 0: "⁰", 1: "¹", 2: "²", 3: "³", 4: "⁴", 5: "⁵", 6: "⁶", 7: "⁷", 8: "⁸", 9: "⁹" };
  const sup = (k) => String(k).replace(/./g, (c) => SUPS[c] || c);
  const sci = (x, d = 1) => {
    if (!(x > 0)) return "0";
    let k = Math.floor(Math.log10(x)), m = x / Math.pow(10, k);
    if (+m.toFixed(d) >= 10) { m /= 10; k += 1; }
    return `${m.toFixed(d)} × 10${sup(k)}`;
  };
  // timers with one cleanup
  function mkClock() {
    const iv = new Set(), to = new Set();
    const c = {
      every(ms, fn) { iv.add(setInterval(fn, ms)); },
      after(ms, fn) { const id = setTimeout(() => { to.delete(id); fn(); }, ms); to.add(id); },
      tween(ms, fn, done) { const t0 = Date.now(); const stepf = () => { const t = Math.min(1, (Date.now() - t0) / ms); fn(t); if (t < 1) c.after(16, stepf); else if (done) done(); }; stepf(); },
      stop() { iv.forEach(clearInterval); to.forEach(clearTimeout); iv.clear(); to.clear(); },
    };
    return c;
  }
  const lerp = (a, b, t) => a + (b - a) * t;

  // ---- numbers used throughout ----
  const EV_J = Chem.E_CHARGE;               // 1 eV in joules
  const KJ_PER_EV = Chem.F / 1000;          // 1 eV per electron = 96.485 kJ per mole of electrons
  const HC = 1239.84;                       // photon energy (eV) = HC / wavelength (nm)
  const GAP_SI = 1.12;                      // eV at 300 K
  const GAPS = [["Ge", "germanium", 0.67], ["Si", "silicon", 1.12], ["GaAs", "gallium arsenide", 1.42], ["CdTe", "cadmium telluride", 1.5]];
  const N_AT = 5.0e22;                      // silicon atoms per cm³
  // freed electrons per cm³ in pure silicon (fit of Misiakos & Tsamakis 1993; 9.7 × 10⁹ at 300 K)
  const ni = (T) => 5.29e19 * Math.pow(T / 300, 2.54) * Math.exp(-6726 / T);
  const VT = (Chem.R * Chem.T0) / Chem.F;   // 0.0257 V at 25 °C

  // The sun approximated as a 5778 K glowing body (simplification: real sunlight at the ground has dips from the air).
  const SPEC = (() => {
    const dE = 0.005, n = 2000, kT = 8.617e-5 * 5778;
    const Pw = [], Nn = [];
    for (let i = 0; i <= n; i++) { const E = (i + 0.5) * dE, b = 1 / (Math.exp(E / kT) - 1); Nn.push(E * E * b); Pw.push(E * E * E * b); }
    const cumP = [0], cumN = [0];
    for (let i = 0; i <= n; i++) { cumP.push(cumP[i] + Pw[i] * dE); cumN.push(cumN[i] + Nn[i] * dE); }
    const Pt = cumP[n + 1], Nt = cumN[n + 1], pmax = Math.max(...Pw);
    const idx = (E) => Math.max(0, Math.min(n + 1, Math.round(E / dE)));
    return {
      power: (E) => (E <= 0 ? 0 : (E * E * E) / (Math.exp(E / kT) - 1) / pmax),   // relative power per eV, peak = 1
      below: (Eg) => cumP[idx(Eg)] / Pt,                                           // fraction of power in photons below Eg
      kept: (Eg) => (Eg * (Nt - cumN[idx(Eg)])) / Pt,                              // fraction left if each photon above Eg keeps Eg
      photons: (Eg) => (Nt - cumN[idx(Eg)]) / Pt,                                  // photons above Eg per eV of total energy
      sample: (u) => { const t = u * Nt; let lo = 0, hi = n + 1; while (lo < hi) { const m = (lo + hi) >> 1; if (cumN[m] < t) lo = m + 1; else hi = m; } return lo * dE; },
    };
  })();

  // The running cell: 156 mm × 156 mm silicon, full sun = 1000 W/m².
  const AREA = 0.0243, SUN = 1000, P_IN = AREA * SUN;                   // 24.3 W of light
  const COLLECT = 9.0 / (P_IN * SPEC.photons(GAP_SI));                  // calibrated so silicon gives 9.0 A in full sun
  // Simplified cell model: light current from the spectrum, open-circuit voltage = gap − 0.48 V in full sun,
  // ideal junction curve I(V) = IL − I0·(exp(V/VT) − 1).
  function cellModel(Eg, X) {
    const IL1 = P_IN * SPEC.photons(Eg) * COLLECT, Voc1 = Math.max(0.05, Eg - 0.48);
    const I0 = IL1 / (Math.exp(Voc1 / VT) - 1), IL = IL1 * X;
    const Voc = IL > 0 ? VT * Math.log(IL / I0 + 1) : 0;
    const I = (V) => Math.max(0, IL - I0 * (Math.exp(V / VT) - 1));
    let Vmp = 0, Pmp = 0;
    for (let k = 0; k <= 400; k++) { const V = (Voc * k) / 400, p = V * I(V); if (p > Pmp) { Pmp = p; Vmp = V; } }
    const atLoad = (R) => {
      if (!(IL > 0)) return { V: 0, I: 0 };
      let lo = 0, hi = Voc;
      for (let k = 0; k < 50; k++) { const m = (lo + hi) / 2; if (I(m) - m / R > 0) lo = m; else hi = m; }
      return { V: lo, I: I(lo) };
    };
    return { IL, Voc, I, Vmp, Imp: I(Vmp), Pmp, atLoad };
  }

  function wlColor(nm) {
    if (nm < 380) return "#b79cff";
    if (nm > 750) return nm > 1107 ? "#7d5757" : "#c0564a";
    let r = 0, g = 0, b = 0;
    if (nm < 440) { r = (440 - nm) / 60; b = 1; } else if (nm < 490) { g = (nm - 440) / 50; b = 1; } else if (nm < 510) { g = 1; b = (510 - nm) / 20; }
    else if (nm < 580) { r = (nm - 510) / 70; g = 1; } else if (nm < 645) { r = 1; g = (645 - nm) / 65; } else r = 1;
    const c = (v) => Math.round(255 * (0.25 + 0.75 * v));
    return `rgb(${c(r)},${c(g)},${c(b)})`;
  }
  const wlName = (nm) => (nm < 380 ? "ultraviolet" : nm < 450 ? "violet" : nm < 495 ? "blue" : nm < 570 ? "green" : nm < 590 ? "yellow" : nm < 620 ? "orange" : nm <= 750 ? "red" : "infrared");

  // ---- animated cross-section of a lit cell (steps 7 and 10) ----
  // o.gap() → eV; o.pRound() → chance that a separated electron goes round the wire (else the pair recombines inside);
  // o.onPhoton(E, absorbed)
  function cellScene(clk, o) {
    const W = 400, H = 286, r = rng(5);
    const svg = svgEl(W, H, 560);
    txt(svg, 30, 16, "light ↓", { anchor: "start", fill: YEL });
    add(svg, "rect", { x: 30, y: 70, width: 240, height: 28, fill: "rgba(108,180,255,0.20)" });
    add(svg, "rect", { x: 30, y: 98, width: 240, height: 18, fill: "rgba(255,255,255,0.09)" });
    add(svg, "rect", { x: 30, y: 116, width: 240, height: 110, fill: "rgba(255,107,107,0.13)" });
    add(svg, "rect", { x: 232, y: 62, width: 38, height: 8, fill: "#8a93a6" });
    add(svg, "rect", { x: 30, y: 226, width: 240, height: 8, fill: "#8a93a6" });
    txt(svg, 36, 88, "n-type silicon", { anchor: "start", fill: BLUE });
    txt(svg, 36, 111, "junction", { anchor: "start" });
    txt(svg, 36, 218, "p-type silicon", { anchor: "start", fill: RED });
    txt(svg, 251, 56, "(−)", { fill: TXT, bold: true, size: 13 });
    txt(svg, 251, 252, "(+)", { fill: TXT, bold: true, size: 13 });
    txt(svg, 150, 252, "metal back contact");
    const path = [[270, 66], [352, 66], [352, 230], [270, 230]], seg = [82, 164, 82], L = 328;
    const onPath = (u) => {
      let d = (((u % 1) + 1) % 1) * L;
      for (let i = 0; i < 3; i++) { if (d <= seg[i]) { const t = d / seg[i]; return [lerp(path[i][0], path[i + 1][0], t), lerp(path[i][1], path[i + 1][1], t)]; } d -= seg[i]; }
      return path[3];
    };
    add(svg, "polyline", { points: path.map((p) => p.join(",")).join(" "), fill: "none", stroke: "#566074", "stroke-width": 3 });
    const NW = 12, wdots = [];
    for (let k = 0; k < NW; k++) wdots.push(dot(svg, 0, 0, 3));
    const glow = add(svg, "circle", { cx: 352, cy: 148, r: 24, fill: YEL, "fill-opacity": 0 });
    add(svg, "circle", { cx: 352, cy: 148, r: 14, fill: "#2a3242", stroke: MUT, "stroke-width": 1.5 });
    const bulb = add(svg, "circle", { cx: 352, cy: 148, r: 9, fill: YEL, "fill-opacity": 0 });
    txt(svg, 332, 152, "lamp", { anchor: "end" });
    txt(svg, 362, 104, "e⁻ ↓", { anchor: "start", fill: YEL });
    const gp = add(svg, "g", {});
    let phase = 0, target = 0, lit = 0;
    const parts = [], fx = [];
    const mk = (el, x, y, pts, sp, done) => { const p = { el, x, y, pts, i: 0, sp, done }; el.setAttribute("transform", `translate(${x},${y})`); parts.push(p); return p; };
    function pair(x, y, E) {
      const gap = o.gap(), excess = E - gap;
      fx.push({ el: add(gp, "circle", { cx: x, cy: y, r: 3, fill: "none", stroke: TXT, "stroke-width": 1.5 }), life: 1, grow: 10 });
      if (excess > 0.05) fx.push({ el: add(gp, "circle", { cx: x, cy: y, r: 3, fill: RED, "fill-opacity": 0.35, stroke: "none" }), life: 1, grow: 6 + 9 * Math.min(3, excess) });
      const e = add(gp, "g", {}); dot(e, 0, 0, 3.5);
      const hole = add(gp, "g", {}); ring(hole, 0, 0, 4);
      if (r() < o.pRound()) {
        mk(e, x, y, [[x, 84], [251, 84], [251, 68]], 4, () => { target += 1 / NW; lit = Math.min(1.2, lit + 0.35); });
        mk(hole, x, y, [[x, 222]], 3);
      } else {
        mk(e, x, y, [[x, 84], [x, y]], 3, () => fx.push({ el: add(gp, "circle", { cx: x, cy: y, r: 3, fill: "none", stroke: GREY, "stroke-width": 1.5 }), life: 1, grow: 8 }));
        mk(hole, x, y, [[x, y + 18], [x, y]], 3);
      }
    }
    function fire(E) {
      if (parts.length > 60) return;
      const gap = o.gap(), absorbed = E >= gap, x = 46 + r() * 172, col = wlColor(HC / E);
      const g = add(gp, "g", {});
      add(g, "line", { x1: 0, y1: -12, x2: 0, y2: 0, stroke: col, "stroke-width": 2, "stroke-opacity": 0.6 });
      dot(g, 0, 0, 4, col);
      if (absorbed) { const y = 101 + r() * 12; mk(g, x, 2, [[x, y]], 5, () => pair(x, y, E)); }
      else { g.setAttribute("opacity", 0.75); mk(g, x, 2, [[x, 300]], 5); }
      if (o.onPhoton) o.onPhoton(E, absorbed);
    }
    clk.every(30, () => {
      phase += (target - phase) * 0.18;
      wdots.forEach((d, k) => { const [x, y] = onPath(phase + k / NW); at(d, x, y); });
      lit *= 0.965; glow.setAttribute("fill-opacity", Math.min(0.3, lit * 0.3)); bulb.setAttribute("fill-opacity", Math.min(1, lit));
      for (let k = parts.length - 1; k >= 0; k--) {
        const p = parts[k], [tx, ty] = p.pts[p.i], dx = tx - p.x, dy = ty - p.y, d = Math.hypot(dx, dy);
        if (d <= p.sp) { p.x = tx; p.y = ty; p.i++; } else { p.x += (dx / d) * p.sp; p.y += (dy / d) * p.sp; }
        p.el.setAttribute("transform", `translate(${p.x.toFixed(1)},${p.y.toFixed(1)})`);
        if (p.i >= p.pts.length) { p.el.remove(); parts.splice(k, 1); if (p.done) p.done(); }
      }
      for (let k = fx.length - 1; k >= 0; k--) {
        const f = fx[k]; f.life -= 0.06;
        if (f.life <= 0) { f.el.remove(); fx.splice(k, 1); continue; }
        f.el.setAttribute("r", 3 + (1 - f.life) * f.grow); f.el.setAttribute("opacity", f.life);
      }
    });
    return { svg, fire };
  }

  const steps = [];

  // ================================================================ 1
  steps.push({
    title: "Silicon: four electrons and nobody to give them to",
    short: "Sharing electrons",
    newConcepts: ["covalent"],
    render(el) {
      const clk = mkClock();
      el.append(
        P("Every source of current so far in this course was a <em>redox reaction</em>: one element gives electrons, another takes them, and a cell makes them take the wire. This lesson is about the other great way. A dark-blue square of silicon, 156 mm on a side and weighing about 10 g, lies in the sun and pushes 9 amperes through a wire. No atom is oxidised and nothing is used up. To see how, start with one silicon atom."),
        P(`Silicon is element ${EL.Si.Z}: shells ${EL.Si.shells.join(", ")}, so four <em>valence electrons</em> (group 14 in <em>The periodic table</em>). Sodium reached a <em>full shell</em> by handing one electron to chlorine, because chlorine pulls far harder (<em>electronegativity</em> ${EL.Cl.en} against ${EL.Na.en}). A silicon atom among silicon atoms has no such partner: every neighbour pulls exactly as hard (${EL.Si.en.toFixed(2)}). Giving away four electrons, or taking four, would both cost far too much.`),
        P("So the atoms do something new: they <b>share</b>. Two neighbours each put one electron into the space between them, and <b>both atoms count that pair as their own</b>. The shared pair holds the two atoms together. It is called a <b>covalent bond</b>. Build four of them:")
      );
      const W = 380, H = 300, cx = 190, cy = 150, D = 96, dirs = [[0, -1], [1, 0], [0, 1], [-1, 0]];
      const svg = svgEl(W, H, 440);
      add(svg, "circle", { cx, cy, r: 61, fill: "none", stroke: YEL, "stroke-dasharray": "4 5", "stroke-opacity": 0.55 });
      txt(svg, cx + 47, cy - 47, "counts as its own", { anchor: "start", fill: YEL, size: 11 });
      const pairEls = [], cDots = [], nDots = [];
      dirs.forEach(([dx, dy], k) => {
        const nx = cx + dx * D, ny = cy + dy * D;
        pairEls.push(add(svg, "ellipse", { cx: cx + dx * 48, cy: cy + dy * 48, rx: dx ? 15 : 8, ry: dx ? 8 : 15, fill: YEL, "fill-opacity": 0, stroke: YEL, "stroke-opacity": 0 }));
        atom(svg, nx, ny, "Si", 20);
        dirs.forEach(([ex, ey]) => { const d = dot(svg, nx + ex * 30, ny + ey * 30); if (ex === -dx && ey === -dy) nDots[k] = d; });
        cDots[k] = dot(svg, cx + dx * 30, cy + dy * 30);
      });
      atom(svg, cx, cy, "Si", 20, { stroke: YEL });
      let n = 0, busy = false;
      const sB = stat("shared pairs (bonds)", "b"), sE = stat("electrons the centre atom counts", "y"), sI = stat("ions formed", "g");
      const msg = note("");
      const place = (k, t) => {
        const [dx, dy] = dirs[k];
        at(cDots[k], cx + dx * lerp(30, 41, t), cy + dy * lerp(30, 41, t));
        at(nDots[k], cx + dx * lerp(66, 55, t), cy + dy * lerp(66, 55, t));
        pairEls[k].setAttribute("fill-opacity", 0.12 * t); pairEls[k].setAttribute("stroke-opacity", 0.7 * t);
      };
      const upd = () => {
        sB.set(n + " of 4"); sE.set(String(4 + n)); sI.set("0");
        msg.innerHTML = n === 0 ? "The centre atom has its own 4 valence electrons (yellow dots). The dashed circle marks what it may count."
          : n < 4 ? `${n} shared pair${n > 1 ? "s" : ""}: the centre atom counts 4 of its own plus ${n} borrowed = ${4 + n}. Each neighbour counts the same pair too.`
            : "Four bonds: the centre atom counts <b>8 electrons, a full outer shell</b>, and so will every neighbour once it has bonded to four atoms of its own. Nobody became an ion.";
      };
      const share = () => { if (busy || n >= 4) return; busy = true; const k = n; clk.tween(450, (t) => place(k, t), () => { n++; busy = false; upd(); }); };
      const reset = () => { if (busy) return; n = 0; dirs.forEach((_, k) => place(k, 0)); upd(); };
      el.append(widget("One silicon atom and its four neighbours (yellow dots = valence electrons)", svg,
        h("div", { class: "btns" }, h("button", { class: "primary", onclick: share }, "Share a pair with the next neighbour"), h("button", { onclick: reset }, "Reset")),
        h("div", { class: "readout" }, sB, sE, sI), msg));
      upd();
      el.append(
        P("In a real crystal the four neighbours sit at the corners of a tetrahedron, and each of them bonds to four atoms of its own, on and on: about 5 × 10²² atoms in every cubic centimetre, one giant network with no ions in it. We will draw it flat, as a square grid."),
        takeaway("Silicon has four valence electrons and equal-pulling neighbours, so it shares: each covalent bond is a pair of electrons counted by both atoms, and four bonds give every atom a full shell of 8.")
      );
      return () => clk.stop();
    },
    check: {
      type: "number", q: "Phosphorus sits next to silicon in group 15, with <b>5</b> valence electrons. Each shared pair adds one electron to an atom's count. How many covalent bonds does a phosphorus atom need to count 8?",
      answer: 3, tolerance: 0.01, hint: "It starts with 5 of its own. Each bond lets it count one more.", why: "3. It has 5 and each bond adds 1 borrowed electron: 5 + 3 = 8. Keep this in mind for the step on doping, where a silicon lattice forces phosphorus to make 4.",
    },
  });

  // ================================================================ 2
  steps.push({
    title: "A crystal with no loose electrons",
    short: "Why it barely conducts",
    newConcepts: ["semi"],
    render(el) {
      const clk = mkClock(), r = rng(11);
      el.append(
        P("A current in a solid needs charges that can move. In copper (<em>Ions, salts and electrolytes</em>: electrons carry the current in metals) every atom lets its single outer electron roam, so a copper bar is full of mobile electrons. Now look at the silicon crystal: all four valence electrons of every atom are locked into bonds. Put a voltage across it and nothing is free to move."),
        P("Almost nothing. The atoms of a warm crystal vibrate, and now and then a vibration shakes one electron out of its bond. At room temperature that has happened to about <b>one electron per five trillion atoms</b>. Heat the crystal and the number explodes.")
      );
      const W = 400, H = 206, svg = svgEl(W, H, 560);
      add(svg, "rect", { x: 4, y: 24, width: 12, height: 162, rx: 3, fill: "#566074" }); txt(svg, 10, 17, "−", { fill: TXT, size: 15, bold: true });
      add(svg, "rect", { x: 384, y: 24, width: 12, height: 162, rx: 3, fill: "#566074" }); txt(svg, 390, 17, "+", { fill: TXT, size: 15, bold: true });
      const gCu = add(svg, "g", {}), gSi = add(svg, "g", {});
      const ax = (i) => 46 + 44 * i, ay = (j) => 45 + 40 * j;
      for (let j = 0; j < 4; j++) for (let i = 0; i < 8; i++) {
        if (i < 7) { dot(gSi, (ax(i) + ax(i + 1)) / 2 - 3.5, ay(j), 2.4); dot(gSi, (ax(i) + ax(i + 1)) / 2 + 3.5, ay(j), 2.4); }
        if (j < 3) { dot(gSi, ax(i), (ay(j) + ay(j + 1)) / 2 - 3.5, 2.4); dot(gSi, ax(i), (ay(j) + ay(j + 1)) / 2 + 3.5, 2.4); }
      }
      for (let j = 0; j < 4; j++) for (let i = 0; i < 8; i++) {
        atom(gCu, ax(i), ay(j), "Cu", 11, { size: 10.5, fill: "#3a2f2a", stroke: "#b87333" });
        atom(gSi, ax(i), ay(j), "Si", 11, { size: 10.5 });
      }
      const mkE = (g) => ({ el: dot(g, 0, 0, 3.6), x: 24 + r() * 352, y: 30 + r() * 150 });
      const cuE = [], siE = [];
      for (let k = 0; k < 32; k++) cuE.push(mkE(gCu));
      for (let k = 0; k < 4; k++) siE.push(mkE(gSi));
      let mat = "Si", T = 27, K = 0;
      clk.every(40, () => {
        const list = mat === "Cu" ? cuE : siE.slice(0, K);
        for (const e of list) {
          e.x += 1.8 + (r() - 0.5) * 2; e.y = Math.max(28, Math.min(182, e.y + (r() - 0.5) * 2.6));
          if (e.x > 378) e.x = 22;
          at(e.el, e.x, e.y);
        }
      });
      const sN = statS("mobile electrons per cm³", "y", 19), sPer = statS("that is one per …", "b", 19), sC = statS("conducts, compared with copper", "g", 19);
      const msg = note("");
      const upd = () => {
        gCu.style.display = mat === "Cu" ? "" : "none"; gSi.style.display = mat === "Si" ? "" : "none";
        if (mat === "Cu") {
          sN.set(sci(8.5e22)); sPer.set("1 atom"); sC.set("1 (the reference)");
          msg.innerHTML = "Copper: one roaming electron per atom, drifting toward the + plate. Temperature hardly matters here.";
          return;
        }
        const n = ni(T + 273.15), ratio = 5.96e5 / (EV_J * n * 1800);
        K = Math.max(0, Math.min(4, Math.floor(Math.log10(n) - 11.3)));
        siE.forEach((e, k) => (e.el.style.display = k < K ? "" : "none"));
        sN.set(sci(n)); sPer.set(sci(N_AT / n) + " atoms"); sC.set(sci(ratio, 0) + " times worse");
        msg.innerHTML = (K === 0 ? "Every electron sits in a bond. The freed ones are far too rare to appear among 32 atoms." : `Hot crystal: ${K} dot${K > 1 ? "s" : ""} stand${K > 1 ? "" : "s"} for the electrons shaken out of bonds (not to scale).`) + " Numbers are approximate.";
      };
      const tSl = slider({ name: "temperature", nameWidth: 100, min: -100, max: 300, step: 1, value: T, fmtv: (v) => v + " °C", oninput: (v) => { T = v; upd(); } });
      el.append(widget("The same voltage across a bar of copper and a bar of pure silicon",
        toggle("material", [["Si", "pure silicon"], ["Cu", "copper"]], mat, (v) => { mat = v; upd(); }),
        svg, tSl, h("div", { class: "readout" }, sN, sPer, sC), msg));
      upd();
      el.append(
        P("A material like this is called a <b>semiconductor</b>: its bonds hold every electron, but loosely enough that heat, light or a few foreign atoms can free some. That makes its conductivity a dial you can turn over many powers of ten, which is exactly what the rest of this lesson does. (An insulator such as glass or diamond holds its bond electrons so tightly that practically none ever get free.)"),
        takeaway("Pure silicon barely conducts because its valence electrons are locked in bonds; a semiconductor is a crystal where a modest push can free them.")
      );
      return () => clk.stop();
    },
    check: {
      type: "choice", q: "You heat a bar of pure silicon from 27 °C to 300 °C. What happens to the current it passes at a fixed voltage?",
      options: ["It rises enormously: far more electrons are shaken out of their bonds", "It stays about the same: the number of valence electrons has not changed", "It drops to zero: the vibrating atoms block every electron"],
      answer: 0,
      wrongHints: { 1: "The total number of valence electrons is the same, but only the ones out of a bond can carry current. Move the temperature slider and watch the first readout.", 2: "Vibration does get in the way of moving electrons a little, but in silicon that is swamped by the growth in the number of freed electrons: about 10⁵ times more at 300 °C." },
      why: "It rises by about five powers of ten. In a semiconductor the number of mobile electrons, not their total number, sets the current, and heat frees more of them.",
    },
  });

  // ================================================================ 3
  steps.push({
    title: "The price of a free electron",
    short: "Band gap, electron-volt",
    newConcepts: ["ev", "gap"],
    render(el) {
      const clk = mkClock();
      el.append(
        P("Shaking an electron out of its bond costs a definite amount of energy. For silicon it is 1.8 × 10⁻¹⁹ joules: an awkward number. We need an energy unit sized for one electron."),
        P(`You almost have it. In <em>Charge, energy and capacity</em> a volt was a joule per coulomb: one coulomb pushed through 1 V carries 1 J. Push just <b>one electron</b> through 1 V and it carries 1.602 × 10⁻¹⁹ J. That amount is one <b>electron-volt (eV)</b>. Each electron crossing the Daniell cell's 1.10 V delivers 1.10 eV. A whole mole of electrons with 1 eV each carries F joules, ${KJ_PER_EV.toFixed(1)} kJ.`),
        formula('1 eV = <span class="hl">the charge of one electron</span> × <span class="bl">1 volt</span> = 1.602 × 10⁻¹⁹ J'),
        P("In these units the cost of freeing a bonded electron in silicon is <b>1.12 eV</b>. That number is the crystal's <b>band gap</b>. The name comes from the picture below: a band of energies where electrons sit in bonds, a band where they roam free, and between them a gap in which an electron cannot stay. Hand an electron less than the gap and it falls straight back.")
      );
      const mats = [["Ge", "germanium", 0.67], ["Si", "silicon", 1.12], ["GaAs", "GaAs", 1.42], ["C", "diamond", 5.47]];
      let gap = 1.12, E = 0.5, token = 0;
      const W = 380, H = 250, yB = 212, py = 30, x0 = 70, x1 = 300, xe = 150;
      const svg = svgEl(W, H, 480);
      for (let k = 0; k <= 6; k++) { add(svg, "line", { x1: x0 - 5, x2: x0, y1: yB - k * py, y2: yB - k * py, stroke: MUT }); txt(svg, x0 - 9, yB - k * py + 4, String(k), { anchor: "end" }); }
      txt(svg, 14, 122, "energy of the electron (eV)", {}).setAttribute("transform", "rotate(-90 14 122)");
      add(svg, "line", { x1: x0, x2: x0, y1: 16, y2: yB + 20, stroke: "#2e3646" });
      add(svg, "rect", { x: x0, y: yB, width: x1 - x0, height: 20, fill: "rgba(108,180,255,0.28)" });
      txt(svg, x1 - 6, yB + 14, "held in a bond", { anchor: "end", fill: BLUE });
      const free = add(svg, "rect", { x: x0, y: 16, width: x1 - x0, height: 10, fill: "rgba(255,209,102,0.16)" });
      const freeT = txt(svg, x1 - 6, 30, "free to roam", { anchor: "end", fill: YEL });
      const gapL = add(svg, "line", { x1: x1 + 14, x2: x1 + 14, y1: yB, y2: 100, stroke: MUT, "stroke-width": 1.5 });
      const gapT = txt(svg, x1 + 18, 150, "", { anchor: "start", fill: TXT });
      const gapT2 = txt(svg, x1 + 18, 165, "", { anchor: "start", fill: TXT });
      const kick = add(svg, "line", { x1: xe, x2: xe, y1: yB, y2: yB, stroke: YEL, "stroke-width": 2, "stroke-dasharray": "4 4" });
      const kickT = txt(svg, xe - 8, yB - 10, "", { anchor: "end", fill: YEL });
      const eDot = dot(svg, xe, yB, 5.5);
      const sE = stat("energy handed over", "y"), sJ = statS("in joules", "", 19), sM = stat("per mole of electrons", "b"), sR = statS("outcome", "g", 19);
      const msg = note("");
      const yOf = (e) => yB - e * py;
      const upd = () => {
        token++;
        const yF = yOf(gap);
        free.setAttribute("height", Math.max(4, yF - 16)); freeT.setAttribute("y", Math.max(30, yF - 6));
        gapL.setAttribute("y2", yF); gapT.setAttribute("y", (yB + yF) / 2); gapT2.setAttribute("y", (yB + yF) / 2 + 15);
        gapT.textContent = "gap"; gapT2.textContent = gap.toFixed(2) + " eV";
        kick.setAttribute("y2", yOf(E)); kickT.setAttribute("y", Math.min(yB - 6, yOf(E) + 14)); kickT.textContent = E.toFixed(2) + " eV";
        at(eDot, xe, yB);
        sE.set(E.toFixed(2) + " eV"); sJ.set(sci(E * EV_J, 2) + " J"); sM.set((E * KJ_PER_EV).toFixed(0) + " kJ");
        const ok = E >= gap;
        sR.set(ok ? "freed" : "stays bonded");
        msg.innerHTML = ok ? `Enough: the electron reaches the free band. The ${(E - gap).toFixed(2)} eV above the gap is lost as heat within a moment; it keeps ${gap.toFixed(2)} eV.` : `Not enough: ${E.toFixed(2)} eV is below the ${gap.toFixed(2)} eV gap. The electron cannot stay in between, so it drops back and the energy ends up as heat.`;
      };
      const doKick = () => {
        upd(); const my = token, yE = yOf(E), yF = yOf(gap), ok = E >= gap;
        clk.tween(500, (t) => { if (my === token) at(eDot, xe, lerp(yB, yE, t)); }, () => {
          if (my !== token) return;
          if (!ok) clk.tween(450, (t) => { if (my === token) at(eDot, xe, lerp(yE, yB, t)); });
          else clk.tween(900, (t) => { if (my === token) at(eDot, xe + 60 * t, lerp(yE, yF, Math.min(1, t * 2.5))); });
        });
      };
      const eSl = slider({ name: "kick energy", nameWidth: 100, min: 0, max: 6, step: 0.01, value: E, fmtv: (v) => v.toFixed(2) + " eV", oninput: (v) => { E = v; upd(); } });
      el.append(widget("One electron, one kick: is it enough to leave the bond?",
        toggle("crystal", mats.map((m) => [m[2], `${m[1]} <span style="opacity:.7">${m[2]}</span>`]), gap, (v) => { gap = v; upd(); }),
        svg, eSl, h("div", { class: "btns" }, h("button", { class: "primary", onclick: doKick }, "Kick the electron")),
        h("div", { class: "readout" }, sE, sJ, sM, sR), msg));
      upd();
      el.append(
        P(`Two comparisons. A typical thermal jostle at room temperature is only about 0.026 eV, which is why so few electrons got free in the last step. And pulling an electron completely off a lone silicon atom (its <em>ionisation energy</em>, ${EL.Si.ie1} kJ/mol) costs ${(EL.Si.ie1 / KJ_PER_EV).toFixed(1)} eV: freeing it inside the crystal is seven times cheaper, because it never leaves the solid.`),
        P("Physicists call the lower band the valence band and the upper one the conduction band; “held in a bond” and “free to roam” will do here."),
        takeaway("The band gap is the energy needed to free one bonded electron (1.12 eV in silicon); an electron-volt is the energy one electron gains from one volt.")
      );
      return () => clk.stop();
    },
    check: {
      type: "number", q: `Silicon's band gap is 1.12 eV per electron. How many <b>kJ per mole</b> of freed electrons is that? (1 eV per electron = ${KJ_PER_EV.toFixed(1)} kJ per mole.)`,
      answer: +(1.12 * KJ_PER_EV).toFixed(0), tolerance: 1.5, hint: "Multiply the two numbers: every one of a mole of electrons needs 1.12 eV.",
      why: `1.12 × ${KJ_PER_EV.toFixed(1)} ≈ 108 kJ/mol. For scale: the Daniell cell released 212 kJ per mole of zinc, two electrons each, so 106 kJ per mole of electrons. Chemical and semiconductor energies are the same size.`,
    },
  });

  // ================================================================ 4
  steps.push({
    title: "The seat left behind",
    short: "Holes",
    newConcepts: ["hole"],
    render(el) {
      const clk = mkClock();
      el.append(
        P("When an electron leaves its bond, two things exist that did not before. One is the free electron. The other is the place it left: a bond with one electron missing. The atoms around that bond now have one more <em>proton</em> than electrons between them, so the spot carries a net <em>charge</em> of +1."),
        P("The empty seat does not stay put. An electron from a neighbouring bond can hop into it at almost no cost, since it trades one bond for an identical one. Now the neighbour's bond is the one with a missing electron. <b>The empty seat has moved, and the +1 charge with it.</b>"),
        P("This moving empty seat is treated as a particle in its own right: a <b>hole</b>, charge +1. No positive particle really travels (protons never move). It works like a traffic jam: the cars creep forward, the gap between them travels backward.")
      );
      const W = 400, H = 176, svg = svgEl(W, H, 560);
      const pl = add(svg, "rect", { x: 3, y: 40, width: 11, height: 112, rx: 3, fill: "#566074" }), pr = add(svg, "rect", { x: 386, y: 40, width: 11, height: 112, rx: 3, fill: "#566074" });
      const tl = txt(svg, 9, 32, "", { fill: TXT, size: 15, bold: true }), tr = txt(svg, 391, 32, "", { fill: TXT, size: 15, bold: true });
      const axx = (i) => 39 + 46 * i, bx = (b) => 62 + 46 * b, yA = 112, yT = 106, yBt = 118, yFree = 58;
      txt(svg, 200, 22, "free electrons travel up here, between the atoms", { size: 11 });
      const bot = [];
      for (let b = 0; b < 7; b++) { dot(svg, bx(b), yT, 3); bot.push(dot(svg, bx(b), yBt, 3)); }
      for (let i = 0; i < 8; i++) atom(svg, axx(i), yA, "Si", 13, { size: 11 });
      const holeEl = ring(svg, 0, 0, 5); const holeT = txt(svg, 0, 0, "hole +", { fill: RED, size: 11 });
      const freeEl = dot(svg, 0, 0, 5); const freeT = txt(svg, 0, 0, "e⁻", { fill: YEL, size: 11 });
      const hop = dot(svg, 0, 0, 3); hop.style.display = "none";
      let hole = null, free = null, field = 0, busy = false, nOut = 0, nIn = 0, hid = -1;
      const sF = stat("free electrons", "y"), sH = stat("holes", "r"), sO = stat("left through the + plate", ""), sI = stat("entered from the − plate", "");
      const msg = note("");
      const draw = () => {
        bot.forEach((d, b) => (d.style.display = b === hole || b === hid ? "none" : ""));
        const hv = hole != null; holeEl.style.display = holeT.style.display = hv ? "" : "none";
        if (hv) { at(holeEl, bx(hole), yBt); holeT.setAttribute("x", bx(hole)); holeT.setAttribute("y", yBt + 26); }
        const fv = free != null; freeEl.style.display = freeT.style.display = fv ? "" : "none";
        if (fv) { at(freeEl, free, yFree); freeT.setAttribute("x", free); freeT.setAttribute("y", yFree - 10); }
        tl.textContent = field === 1 ? "−" : field === -1 ? "+" : ""; tr.textContent = field === 1 ? "+" : field === -1 ? "−" : "";
        pl.setAttribute("opacity", field ? 1 : 0.3); pr.setAttribute("opacity", field ? 1 : 0.3);
        sF.set(String(fv ? 1 : 0)); sH.set(String(hv ? 1 : 0)); sO.set(String(nOut)); sI.set(String(nIn));
      };
      const say = (t) => (msg.innerHTML = t);
      const shake = () => {
        if (busy || hole != null || free != null) return;
        busy = true; hole = 3; free = bx(3); draw(); at(freeEl, bx(3), yBt);
        clk.tween(500, (t) => { at(freeEl, bx(3), lerp(yBt, yFree, t)); freeT.setAttribute("y", lerp(yBt, yFree, t) - 10); }, () => { busy = false; draw(); say("One bond broke: a <b>free electron</b> (yellow) and a <b>hole</b> (red ring) were born together. Switch on a voltage."); });
      };
      const recombine = () => {
        if (busy || hole == null || free == null) return;
        busy = true; const x0 = free, x1 = bx(hole);
        clk.tween(600, (t) => at(freeEl, lerp(x0, x1, t), lerp(yFree, yBt, t)), () => { hole = null; free = null; busy = false; draw(); say("The electron dropped back into the empty seat: electron and hole are both gone, and the gap energy came out as heat. The crystal is whole again."); });
      };
      clk.every(750, () => {
        if (!field || busy || (hole == null && free == null)) return;
        busy = true; let pending = 0; const done = () => { if (--pending === 0) { busy = false; draw(); } };
        if (free != null) {
          pending++; const x0 = free, x1 = free + field * 46, exits = x1 < 20 || x1 > 380;
          clk.tween(500, (t) => { const x = lerp(x0, x1, t); at(freeEl, x, yFree); freeT.setAttribute("x", x); }, () => { if (exits) { free = null; nOut++; say("The free electron reached the + plate and left into the wire."); } else free = x1; done(); });
        }
        if (hole != null) {
          pending++; const dst = hole, src = hole - field, fromPlate = src < 0 || src > 6;
          const xs = fromPlate ? (field === 1 ? 14 : 386) : bx(src), xd = bx(dst);
          hid = fromPlate ? -1 : src; hop.style.display = ""; draw();
          clk.tween(500, (t) => at(hop, lerp(xs, xd, t), yBt + 17 * Math.sin(Math.PI * t)), () => {
            hop.style.display = "none"; hid = -1;
            if (fromPlate) { hole = null; nIn++; say("An electron from the − plate filled the last empty seat: the hole is gone. One electron left at +, one entered at −: one electron's worth of charge has passed through the crystal, carried part of the way by the free electron and part by the hole."); }
            else { hole = src; if (free != null || nOut) say("Bond electrons hop <b>toward +</b>, one seat at a time, so the hole drifts <b>toward −</b>."); }
            done();
          });
        }
      });
      const fT = toggle("voltage", [[0, "off"], [1, "+ plate on the right"], [-1, "+ plate on the left"]], 0, (v) => { field = v; draw(); if (v && hole == null && free == null) say("Nothing to move: every electron is in a bond. Shake one free first."); });
      el.append(widget("A row of the crystal: break one bond, then apply a voltage", svg,
        h("div", { class: "btns" }, h("button", { class: "primary", onclick: shake }, "Shake one electron free"), h("button", { onclick: recombine }, "Let them recombine")),
        fT, h("div", { class: "readout" }, sF, sH, sO, sI), msg));
      draw(); say("Every bond is complete. Nothing can carry a current.");
      el.append(
        P("So a broken bond gives the crystal <b>two</b> carriers of current: the free electron drifting toward the + plate, and the hole drifting toward the − plate. And when a free electron meets a hole it drops back into the bond: both vanish and the gap energy comes back out as heat or light. That is called recombination. Remember it: it is the enemy of every solar cell."),
        takeaway("A missing bond electron is a hole: a mobile +1 charge that moves because neighbouring bond electrons hop into it. Electrons and holes are made in pairs and vanish in pairs.")
      );
      return () => clk.stop();
    },
    check: {
      type: "choice", q: "A voltage is applied with the + plate on the right. The free electron drifts right. Which way does the hole move, and why?",
      options: ["Right as well: the hole is attracted to the free electron and follows it", "Left: bond electrons hop rightward into the empty seat, so the seat shifts left", "Nowhere: the silicon atoms cannot leave their places in the crystal"],
      answer: 1,
      wrongHints: { 0: "The two do attract, but the plates push them opposite ways: the hole behaves as a +1 charge, and + charges go toward the − plate.", 2: "True, no atom moves. But the empty seat is not an atom: it relocates every time a neighbouring electron hops into it." },
      why: "Left, toward the − plate. All real motion is electrons hopping toward +; the seat they leave behind therefore travels the other way, exactly like a +1 charge would.",
    },
  });

  // ================================================================ 5
  steps.push({
    title: "Doping: adding carriers on purpose",
    short: "n-type and p-type",
    newConcepts: ["ntype", "ptype"],
    render(el) {
      const clk = mkClock(), r = rng(3);
      el.append(
        P("One mobile charge per five trillion atoms is useless. The fix is to swap a few silicon atoms for its neighbours in the <em>periodic table</em>. This is called doping."),
        P("<b>Phosphorus</b>, group 15, has five valence electrons. In a silicon site it makes the four bonds the lattice demands and has one electron left over (in step 1's check it wanted only three bonds). That fifth electron is held by a mere 0.045 eV, so room-temperature jostling frees it. Left behind is a P⁺ ion, locked in the lattice. Silicon doped this way is <b>n-type</b>: its mobile charges are <b>n</b>egative electrons."),
        P("<b>Boron</b>, group 13, has three valence electrons, so one of its four bonds is an electron short. A neighbouring bond electron hops in, the boron becomes a fixed B⁻ ion, and a hole wanders off. Silicon doped this way is <b>p-type</b>: its mobile charges are <b>p</b>ositive holes.")
      );
      const W = 400, H = 246, svg = svgEl(W, H, 560);
      const ax = (i) => 50 + 60 * i, ay = (j) => 38 + 56 * j;
      const bonds = [];
      for (let j = 0; j < 4; j++) for (let i = 0; i < 6; i++) {
        if (i < 5) bonds.push({ x: ax(i) + 30, y: ay(j), dx: 4.5, dy: 0 });
        if (j < 3) bonds.push({ x: ax(i), y: ay(j) + 28, dx: 0, dy: 4.5 });
      }
      bonds.forEach((b) => { dot(svg, b.x - b.dx, b.y - b.dy, 2.6); dot(svg, b.x + b.dx, b.y + b.dy, 2.6); });
      bonds.forEach((b) => (b.nb = bonds.filter((c) => c !== b && Math.hypot(c.x - b.x, c.y - b.y) < 62)));
      const atoms = [];
      for (let j = 0; j < 4; j++) for (let i = 0; i < 6; i++) atoms.push({ ...atom(svg, ax(i), ay(j), "Si", 14), x: ax(i), y: ay(j) });
      const order = atoms.map((_, k) => k); for (let k = order.length - 1; k > 0; k--) { const m = r.int(k + 1); [order[k], order[m]] = [order[m], order[k]]; }
      const gc = add(svg, "g", {});
      let electrons = [], holes = [], nP = 0, nB = 0, tickN = 0;
      const sE = stat("free electrons", "y"), sH = stat("holes", "r"), sIon = statS("fixed ions in the lattice", "", 19), sQ = stat("net charge of the crystal", "g");
      const msg = note("");
      const upd = () => {
        sE.set(String(electrons.length)); sH.set(String(holes.length)); sIon.set(nP + nB === 0 ? "none" : [nP ? nP + " P⁺" : "", nB ? nB + " B⁻" : ""].filter(Boolean).join(", ")); sQ.set("0");
        msg.innerHTML = nP + nB === 0 ? "Pure silicon: every electron in a bond, no carriers."
          : nP > nB ? `<b>n-type</b>: ${electrons.length} free electron${electrons.length > 1 ? "s" : ""} roam${electrons.length > 1 ? "" : "s"}, balanced by fixed positive ions.${nB ? " (The electrons from " + nB + " phosphorus atom" + (nB > 1 ? "s" : "") + " fell into boron's holes.)" : ""}`
            : nB > nP ? `<b>p-type</b>: ${holes.length} hole${holes.length > 1 ? "s" : ""} hop${holes.length > 1 ? "" : "s"} from bond to bond, balanced by fixed negative ions.${nP ? " (" + nP + " hole" + (nP > 1 ? "s were" : " was") + " filled by phosphorus electrons.)" : ""}`
              : "Equal numbers of both: every phosphorus electron fell into a boron hole. No carriers left, like pure silicon.";
      };
      const addDopant = (kind) => {
        if (nP + nB >= 10) { msg.innerHTML = "10 foreign atoms among 24 is absurdly heavy doping already. Reset to start again."; return; }
        const a = atoms[order[nP + nB]];
        if (kind === "P") {
          nP++; a.t.textContent = "P⁺"; a.c.setAttribute("stroke", RED); a.c.setAttribute("fill", "#3b2428");
          if (holes.length) holes.pop().el.remove(); else electrons.push({ el: dot(gc, a.x + 16, a.y - 16, 4.2), x: a.x + 16, y: a.y - 16 });
        } else {
          nB++; a.t.textContent = "B⁻"; a.c.setAttribute("stroke", BLUE); a.c.setAttribute("fill", "#1f2c40");
          if (electrons.length) electrons.pop().el.remove();
          else { const b = bonds.reduce((best, c) => (Math.hypot(c.x - a.x, c.y - a.y) < Math.hypot(best.x - a.x, best.y - a.y) ? c : best)); holes.push({ el: ring(gc, b.x + b.dx, b.y + b.dy, 4.6), b }); }
        }
        upd();
      };
      const reset = () => { atoms.forEach((a) => { a.t.textContent = "Si"; a.c.setAttribute("stroke", "#5b6577"); a.c.setAttribute("fill", "#2a3242"); }); gc.innerHTML = ""; electrons = []; holes = []; nP = nB = 0; upd(); };
      clk.every(60, () => {
        tickN++;
        for (const e of electrons) { e.x = Math.max(22, Math.min(378, e.x + (r() - 0.5) * 12)); e.y = Math.max(14, Math.min(232, e.y + (r() - 0.5) * 12)); at(e.el, e.x, e.y); }
        if (tickN % 7 === 0) for (const hh of holes) { hh.b = r.pick(hh.b.nb); at(hh.el, hh.b.x + hh.b.dx, hh.b.y + hh.b.dy); }
      });
      el.append(widget("A patch of silicon crystal: swap in foreign atoms", svg,
        h("div", { class: "btns" }, h("button", { class: "primary", onclick: () => addDopant("P") }, "Add a phosphorus atom"), h("button", { class: "primary", onclick: () => addDopant("B") }, "Add a boron atom"), h("button", { onclick: reset }, "Reset to pure silicon")),
        h("div", { class: "readout" }, sE, sH, sIon, sQ), msg));
      upd();
      el.append(P("Watch the last readout: doping never charges the crystal. Every roaming electron has a fixed P⁺ somewhere behind it, every hole a fixed B⁻. Real doping is far lighter than this picture, and still changes everything:"));
      let per = 5e6;
      const sD = statS("carriers per cm³", "y", 19), sX = statS("compared with pure silicon", "g", 19);
      const upd2 = () => { const n = N_AT / per; sD.set(sci(n)); sX.set("× " + sci(n / ni(300), 0)); };
      el.append(widget("How much dopant?",
        slider({ name: "Si atoms per dopant atom", nameWidth: 110, min: 1e3, max: 1e9, log: true, steps: 120, value: per, fmtv: (v) => sci(v, 0), oninput: (v) => { per = v; upd2(); } }),
        h("div", { class: "readout" }, sD, sX),
        note("A typical solar cell uses about one dopant atom per five million silicon atoms. Pure silicon at room temperature has about 10¹⁰ carriers per cm³.")));
      upd2();
      el.append(takeaway("Doping swaps in a few atoms with one electron more (phosphorus: n-type, free electrons) or one fewer (boron: p-type, holes). The crystal stays neutral: each carrier leaves a fixed ion of opposite charge behind."));
      return () => clk.stop();
    },
    check: {
      type: "choice", q: `You dope silicon with a little gallium (group 13, shells ${EL.Ga.shells.join(", ")}). What do you get?`,
      options: ["n-type silicon: gallium's extra electrons roam free", "A positively charged crystal, because holes are positive", "p-type silicon: mobile holes, and fixed Ga⁻ ions"],
      answer: 2,
      wrongHints: { 0: "Count gallium's valence electrons: 3, one fewer than silicon's 4. It has nothing to spare; it is one short.", 1: "Each mobile hole (+1) is matched by a gallium atom that took an extra electron and sits fixed as Ga⁻. The total is still zero." },
      why: "p-type. Gallium has three valence electrons like boron, so one bond is short of an electron: a neighbour's electron fills it (fixed Ga⁻) and a hole wanders off. The crystal stays neutral.",
      backTo: 0,
    },
  });

  // ================================================================ 6
  steps.push({
    title: "Two kinds of silicon meet",
    short: "The p–n junction",
    newConcepts: ["junction", "field"],
    render(el) {
      const clk = mkClock(), r = rng(7);
      el.append(
        P("Take one crystal and dope one side with boron, the other with phosphorus. The boundary between them is a <b>p–n junction</b>. It is the heart of every solar cell."),
        P("Carriers wander at random. The n side is crowded with free electrons and the p side has almost none, so random wandering carries electrons across the boundary. There they meet holes and recombine. Holes wander the other way and meet the same fate."),
        P("But the fixed ions cannot follow. Near the boundary the n side is left with bare P⁺ ions and the p side with bare B⁻ ions: a strip of + facing a strip of −. Any charge between them is pushed. A region where a charge feels a push is an electric field, and this one comes for free: the <b>built-in field</b>. It shoves electrons back toward the n side and holes back toward the p side, so the crossing stops by itself.")
      );
      const W = 400, H = 232, svg = svgEl(W, H, 560);
      txt(svg, 100, 24, "p-type side", { fill: RED }); txt(svg, 300, 24, "n-type side", { fill: BLUE });
      add(svg, "rect", { x: 18, y: 34, width: 182, height: 132, fill: "rgba(255,107,107,0.10)" });
      add(svg, "rect", { x: 200, y: 34, width: 182, height: 132, fill: "rgba(108,180,255,0.10)" });
      const zone = add(svg, "rect", { x: 200, y: 34, width: 0, height: 132, fill: "rgba(255,255,255,0.09)" });
      const mkSite = (side, c, row) => {
        const x = side === "p" ? 185 - 30 * c : 215 + 30 * c, y = 64 + 40 * row;
        const g = add(svg, "g", { opacity: 0.38 });
        add(g, "circle", { cx: x, cy: y, r: 8, fill: side === "p" ? "#1f2c40" : "#3b2428", stroke: side === "p" ? BLUE : RED, "stroke-width": 1.5 });
        txt(g, x, y + 4, side === "p" ? "−" : "+", { fill: TXT, size: 12, bold: true });
        const car = side === "p" ? ring(svg, x, y - 16, 4.4) : dot(svg, x, y - 16, 4);
        return { g, car, hx: x, hy: y - 16, alive: true, moving: false };
      };
      const Ps = [], Ns = [];
      for (let c = 0; c < 6; c++) { Ps.push([0, 1, 2].map((row) => mkSite("p", c, row))); Ns.push([0, 1, 2].map((row) => mkSite("n", c, row))); }
      const divider = add(svg, "rect", { x: 196, y: 30, width: 8, height: 140, fill: "#12151c" });
      const gA = add(svg, "g", { opacity: 0 });
      add(gA, "line", { x1: 150, x2: 250, y1: 184, y2: 184, stroke: YEL, "stroke-width": 2.5 }); add(gA, "polygon", { points: "250,179 260,184 250,189", fill: YEL });
      txt(gA, 142, 188, "electrons pushed", { anchor: "end", fill: YEL });
      add(gA, "line", { x1: 150, x2: 250, y1: 204, y2: 204, stroke: RED, "stroke-width": 2.5 }); add(gA, "polygon", { points: "150,199 140,204 150,209", fill: RED });
      txt(gA, 258, 208, "holes pushed", { anchor: "start", fill: RED });
      const zoneT = txt(svg, 200, 226, "", {});
      const tE = dot(svg, 200, 84, 5.5), tH = ring(svg, 200, 84, 5.5); tE.style.display = tH.style.display = "none";
      let joined = false, depl = 0, gen = 0;
      const sV = stat("voltage across the junction", "y"), sIon = stat("bare fixed ions", "b"), sR = stat("pairs recombined", "r");
      const msg = note("");
      const upd = () => {
        divider.style.display = joined ? "none" : "";
        zone.setAttribute("x", 200 - 30 * depl - (depl ? 0 : 0)); zone.setAttribute("width", 60 * depl);
        gA.setAttribute("opacity", depl ? 0.5 + 0.25 * depl : 0);
        zoneT.textContent = depl ? "middle strip: bare ions, no carriers left, only the field" : "";
        sV.set(["0 V", "≈ 0.35 V", "≈ 0.7 V"][depl]); sIon.set(String(6 * depl)); sR.set(String(3 * depl));
      };
      const deplete = (c, done) => {
        const g = gen;
        [0, 1, 2].forEach((row) => { Ps[c][row].moving = Ns[c][row].moving = true; });
        clk.tween(1000 + 500 * c, (t) => {
          if (g !== gen) return;
          [0, 1, 2].forEach((row) => { const e = Ns[c][row], hh = Ps[c][row]; at(e.car, lerp(e.hx, 204, t), e.hy); at(hh.car, lerp(hh.hx, 196, t), hh.hy); });
        }, () => {
          if (g !== gen) return;
          [0, 1, 2].forEach((row) => { for (const q of [Ns[c][row], Ps[c][row]]) { q.alive = false; q.car.style.display = "none"; q.g.setAttribute("opacity", 1); } });
          depl = c + 1; upd(); done();
        });
      };
      const join = () => {
        if (joined) return; joined = true; upd(); const g = gen;
        msg.innerHTML = "Contact. Electrons from the n side and holes from the p side wander across, meet and recombine …";
        clk.after(300, () => { if (g !== gen) return; deplete(0, () => { msg.innerHTML = "… leaving bare ions behind. Their field already pushes back; fewer carriers make it across."; clk.after(500, () => { if (g !== gen) return; deplete(1, () => { msg.innerHTML = "Balance: the field is now strong enough to turn every wanderer back (watch them try). The junction has built its own voltage, about 0.7 V in silicon. The step sizes here are a cartoon."; }); }); }); });
      };
      clk.every(140, () => { for (const col of [...Ps, ...Ns]) for (const q of col) if (q.alive && !q.moving) at(q.car, q.hx + (r() - 0.5) * 5, q.hy + (r() - 0.5) * 5); });
      clk.every(1500, () => {
        if (depl !== 2) return; const g = gen, row = r.int(3), q = r() < 0.5 ? Ns[2][row] : Ps[2][row], dir = q === Ns[2][row] ? -1 : 1;
        if (q.moving) return; q.moving = true;
        clk.tween(900, (t) => { if (g === gen) at(q.car, q.hx + dir * 34 * Math.sin(Math.PI * t), q.hy); }, () => { q.moving = false; });
      });
      const drop = (kind) => {
        const g = ++gen && gen, e = kind === "e" ? tE : tH, dir = kind === "e" ? 1 : -1;
        gen = g; tE.style.display = tH.style.display = "none"; e.style.display = ""; at(e, 200, 84);
        if (!depl) {
          msg.innerHTML = joined ? "Wait for the junction to form, then try again." : "No junction yet, so no field: the newcomer just jitters about with no preferred direction. Join the pieces first.";
          clk.tween(1200, (t) => { if (g === gen) at(e, 200 + Math.sin(t * 19) * 5, 84 + Math.cos(t * 13) * 5); }, () => { if (g === gen) e.style.display = "none"; });
          return;
        }
        msg.innerHTML = kind === "e" ? "The field sweeps the electron to the <b>n side</b>, toward the bare P⁺ ions. It will not come back." : "The field sweeps the hole to the <b>p side</b>, toward the bare B⁻ ions.";
        clk.tween(1700 / depl, (t) => { if (g === gen) at(e, 200 + dir * (30 * depl + 50) * t * t, 84); }, () => { if (g === gen) clk.after(500, () => { if (g === gen) e.style.display = "none"; }); });
      };
      const reset = () => {
        gen++; joined = false; depl = 0; tE.style.display = tH.style.display = "none";
        for (const col of [...Ps, ...Ns]) for (const q of col) { q.alive = true; q.moving = false; q.car.style.display = ""; q.g.setAttribute("opacity", 0.38); at(q.car, q.hx, q.hy); }
        upd(); msg.innerHTML = "Two separate pieces. Each is neutral: every carrier (ring = hole, yellow dot = electron) sits near a fixed ion of opposite sign.";
      };
      el.append(widget("p-type and n-type silicon: fixed ions (faint circles), holes (red rings), electrons (yellow)", svg,
        h("div", { class: "btns" }, h("button", { class: "primary", onclick: join }, "Join the two pieces"), h("button", { onclick: () => drop("e") }, "Drop a free electron in the middle"), h("button", { onclick: () => drop("h") }, "Drop a hole in the middle"), h("button", { onclick: reset }, "Reset")),
        h("div", { class: "readout" }, sV, sIon, sR), msg));
      reset();
      el.append(
        P("The junction is a one-way slide for charge. An electron that turns up inside it is thrown to the n side, a hole to the p side, and neither can return. In a real cell this layer is thinner than a micrometre. All that is missing now is something that creates electrons and holes right there."),
        takeaway("Where p-type meets n-type, carriers recombine and expose fixed ions; their built-in field pushes electrons to the n side and holes to the p side.")
      );
      return () => clk.stop();
    },
    check: {
      type: "choice", q: "Somehow a bond breaks <b>inside</b> the junction, creating a free electron and a hole. What does the built-in field do with them?",
      options: ["Pushes both to the n side, where the carriers are electrons", "Pushes the electron to the n side and the hole to the p side", "Pushes them back together so they recombine at once"],
      answer: 1,
      wrongHints: { 0: "The two have opposite charges, so the same field pushes them in opposite directions.", 2: "The field does the opposite: it pulls the − electron toward the bare P⁺ ions and the + hole toward the bare B⁻ ions, apart from each other." },
      why: "The electron is pulled toward the bare P⁺ ions on the n side, the hole toward the bare B⁻ ions on the p side. The junction separates every pair that appears in it.",
    },
  });

  // ================================================================ 7
  steps.push({
    title: "Light does the freeing",
    short: "Photovoltaic effect",
    newConcepts: ["photon", "pv"],
    render(el) {
      const clk = mkClock();
      el.append(
        P("Heat frees electrons at random. Light does it one at a time. Light arrives in packets called <b>photons</b>, and each photon carries a fixed energy set by its colour: energy in eV ≈ 1240 ÷ wavelength in nanometres. A red photon (700 nm) carries 1.8 eV, a violet one (400 nm) 3.1 eV, the invisible infrared beyond red less."),
        P("A photon entering silicon with at least the <em>band gap</em>, 1.12 eV, can hand its energy to one bonded electron: <b>one photon in, one electron–hole pair out</b>. Elsewhere in the crystal the pair would soon recombine. At a junction the built-in field throws the electron to the n side and the hole to the p side before they can meet."),
        P("Now the n side holds extra electrons and the p side extra holes. Connect the two with a wire: electrons leave through the n contact (the − terminal), light the lamp, and re-enter at the p contact (+), where they fill the waiting holes. Light in, current out: the <b>photovoltaic effect</b>.")
      );
      let nm = 600;
      const sE = stat("photon energy", "y"), sC = statS("colour", "", 19), sR = statS("in silicon (gap 1.12 eV)", "g", 19), sHt = stat("lost as heat, per photon", "r");
      const msg = note("");
      const scene = cellScene(clk, { gap: () => GAP_SI, pRound: () => 1 });
      const upd = () => {
        const E = HC / nm, ok = E >= GAP_SI;
        sE.set(E.toFixed(2) + " eV"); sC.set(wlName(nm)); sC.querySelector(".v").style.color = wlColor(nm);
        sR.set(ok ? "frees a pair" : "passes through"); sHt.set(ok ? (E - GAP_SI).toFixed(2) + " eV" : "–");
        msg.innerHTML = ok ? `Each ${wlName(nm)} photon makes one pair. The electron goes up to the n contact and round the wire; the hole goes down to the p contact. Of the photon's ${E.toFixed(2)} eV the electron keeps at most 1.12 eV (red flash = the excess turning into heat).`
          : `${E.toFixed(2)} eV is below the gap: the photon cannot free an electron and passes through the silicon. No current, the lamp goes dark.`;
      };
      const sl = slider({ name: "wavelength", nameWidth: 96, min: 300, max: 2000, step: 10, value: nm, fmtv: (v) => v + " nm", oninput: (v) => { nm = v; upd(); } });
      const setNm = (v) => { nm = v; sl.set(v); upd(); };
      clk.every(620, () => scene.fire(HC / nm));
      el.append(widget("A silicon cell in cross-section, lit from above by light of one colour", scene.svg, sl,
        h("div", { class: "btns" }, h("button", { onclick: () => setNm(450) }, "Blue, 450 nm"), h("button", { onclick: () => setNm(700) }, "Red, 700 nm"), h("button", { onclick: () => setNm(1100) }, "Silicon's limit, 1100 nm"), h("button", { onclick: () => setNm(1500) }, "Infrared, 1500 nm"),
          h("button", { class: "primary", onclick: () => scene.fire(HC / nm) }, "Fire one photon")),
        h("div", { class: "readout" }, sE, sC, sR, sHt), msg));
      upd();
      el.append(
        P("Compare this with the Daniell cell. There, zinc atoms were consumed: a 6.54 g strip held 5.36 Ah and then the cell was dead. Here <b>no atom changes</b>. Every electron that leaves at the top comes back at the bottom, and the silicon after a year in the sun is the silicon you started with. A solar cell stores nothing. It is a converter: no light, no current, at once."),
        P("(The effect was first seen by Edmond Becquerel in 1839; the first practical silicon cell, about 6% efficient, came from Bell Labs in 1954.)"),
        takeaway("Photovoltaic effect: a photon with at least the gap energy frees an electron–hole pair, the junction's field separates them, and the electron returns to the hole through your circuit.")
      );
      return () => clk.stop();
    },
    check: {
      type: "number", q: "An orange photon has a wavelength of <b>620 nm</b>. How much energy does it carry, in eV? (energy ≈ 1240 ÷ wavelength in nm)",
      answer: 2, tolerance: 0.03, hint: "Divide 1240 by 620.", why: "1240 ÷ 620 = 2.0 eV. That is above silicon's 1.12 eV gap, so it frees a pair, and 0.88 eV of it ends as heat.",
    },
  });

  // ================================================================ 8
  steps.push({
    title: "Where the sunlight's energy goes",
    short: "Two built-in losses",
    newConcepts: ["losses"],
    render(el) {
      el.append(
        P("Sunlight is a mix of photons, from below 0.5 eV (infrared) to about 4 eV (ultraviolet). A cell has one band gap, and that forces two losses."),
        P("<b>Too little:</b> a photon below the gap frees nothing and passes through. <b>Too much:</b> a photon above the gap still frees just one electron, and that electron slides down to the bottom edge of the free band within about a trillionth of a second, handing the excess to the crystal as heat. Whatever the photon, the electron ends up carrying one gap's worth."),
        P("So a small gap catches nearly every photon but keeps little from each. A large gap keeps a lot per photon but catches few. Slide the gap across the sun's spectrum:")
      );
      let gap = GAP_SI;
      const pl = plot({ xmin: 0, xmax: 4, ymin: 0, ymax: 1.08, height: 230, xlabel: "photon energy (eV)", ylabel: "sunlight power at that energy", xticks: [0, 1, 2, 3, 4], yticks: [], narrow: true, minFont: 10 });
      for (let k = 0; k < 36; k++) { const E = 1.65 + (1.61 * k) / 36; pl.append(s("rect", { x: pl.X(E), y: pl.frame.bottom + 1, width: pl.X(E + 0.05) - pl.X(E), height: 4, fill: wlColor(HC / (E + 0.02)) })); }
      const pl2 = plot({ xmin: 0.4, xmax: 3, ymin: 0, ymax: 0.5, height: 170, xlabel: "band gap (eV)", ylabel: "share kept", xticks: [0.5, 1, 1.5, 2, 2.5, 3], yticks: [0, 0.1, 0.2, 0.3, 0.4, 0.5], yfmt: (v) => Math.round(v * 100) + "%", narrow: true, minFont: 10 });
      pl2.fn((g) => SPEC.kept(g), GRN);
      const mk = pl2.marker(YEL);
      const bars = hbars(["passes through: photons below the gap", "heat: the excess above the gap", "kept: one gap's worth per photon"], { max: 1, fmtv: (v) => (v * 100).toFixed(0) + "%" });
      const msg = note("");
      const pts = (a, b, f) => { const out = []; for (let k = 0; k <= 120; k++) { const E = a + ((b - a) * k) / 120; out.push([E, f(E)]); } return out; };
      const upd = () => {
        pl.clear();
        pl.area(pts(0, gap, SPEC.power), GREY, 0.55);
        pl.area(pts(gap, 4, SPEC.power), RED, 0.45);
        pl.area(pts(gap, 4, (E) => (SPEC.power(E) * gap) / E), PANEL, 1);
        pl.area(pts(gap, 4, (E) => (SPEC.power(E) * gap) / E), GRN, 0.55);
        pl.fn(SPEC.power, MUT);
        pl.vline(gap, YEL, "gap " + gap.toFixed(2) + " eV", { pos: gap > 2.6 ? "left" : "right", halo: true });
        const below = SPEC.below(gap), kept = SPEC.kept(gap);
        bars.update([below, 1 - below - kept, kept], [GREY, RED, GRN]);
        mk.move(gap, kept);
        const near = GAPS.find((g) => Math.abs(g[2] - gap) < 0.006);
        msg.innerHTML = (near ? `<b>${near[1]}</b> (${near[0]}): ` : "") + (gap < 0.8 ? "a small gap catches almost every photon and wastes most of each one as heat." : gap > 1.9 ? "a large gap keeps much of each photon it catches, but most photons fly straight through." : "close to the best compromise between the two losses.");
      };
      const sl = slider({ name: "band gap", min: 0.4, max: 3, step: 0.01, value: gap, fmtv: (v) => v.toFixed(2) + " eV", oninput: (v) => { gap = v; tg.set(v); upd(); } });
      const tg = toggle("crystal", GAPS.map((g) => [g[2], `${g[0]} <span style="opacity:.7">${g[2]}</span>`]), gap, (v) => { gap = v; sl.set(v); upd(); });
      el.append(widget("The sun's spectrum, split three ways by the band gap (grey: passes through, red: heat, green: kept)", pl, sl, tg, bars, pl2, msg,
        note("The sun is approximated here as a glowing body at 5778 K. Real sunlight at the ground has dips where air and water vapour absorb.")));
      upd();
      el.append(
        P("The sweet spot is broad, roughly 1.0 to 1.5 eV, and silicon sits in it. So do the main alternatives. Gallium arsenide (GaAs, 1.42 eV) pairs a group-13 element with a group-15 one; cadmium telluride (CdTe, 1.5 eV) pairs group 12 with group 16. Either way the atoms average four valence electrons each and bond into a silicon-like crystal."),
        P("These two losses alone cap a single-junction cell near 44%. Further unavoidable losses, stated here without derivation, pull the true ceiling down to about 33% (the Shockley–Queisser limit, about 30% for silicon). The best laboratory silicon cells reach about 27%, factory panels 20–24% (as of 2025)."),
        takeaway("One gap, two losses: photons below it pass through, and everything a photon carries above it becomes heat. A gap near 1.1–1.4 eV loses least.")
      );
    },
    check: {
      type: "number", q: "A green photon of <b>2.48 eV</b> is absorbed in silicon (gap <b>1.12 eV</b>) and frees one electron. How many eV of its energy turn into heat straight away?",
      answer: 1.36, tolerance: 0.02, hint: "The electron keeps one gap's worth. The rest is the excess.", why: "2.48 − 1.12 = 1.36 eV: more than half of this photon is lost as heat before the electron has gone anywhere.",
      backTo: 2,
    },
  });

  // ---- shared I–V drawing for steps 9 and 10 ----
  const ivLegend = () => h("div", { class: "note", style: "font-size:13px;margin:2px 0 8px", html: `<span style="color:${BLUE}">━ current (A)</span> · <span style="color:${PUR}">╌ power (W)</span> · <span style="color:${MUT}">┈ your load</span> · <span style="color:${YEL}">● operating point, shaded area = its power</span> · <span style="color:${GRN}">● maximum power point</span>` });
  function drawIV(pl, m, op, o = {}) {
    pl.clear();
    pl.area([[0, op.I], [op.V, op.I]], YEL, 0.2);
    const n = 160, iv = [], pw = [];
    for (let k = 0; k <= n; k++) { const V = (m.Voc * k) / n; iv.push([V, m.I(V)]); pw.push([V, V * m.I(V)]); }
    if (m.IL > 0) { pl.line(pw, PUR, "5 4", 2); pl.line(iv, BLUE); }
    if (o.loadLine) pl.line(o.loadLine, MUT, "2 4", 1.5);
    (o.trace || []).forEach((p) => { pl.dot(p[0], p[1], YEL, 2.5); });
    if (m.IL > 0) { pl.dot(m.Vmp, m.Imp, GRN, 5); }
    pl.dot(op.V, op.I, YEL, 6);
  }

  // ================================================================ 9
  steps.push({
    title: "Voltage, current and the best compromise",
    short: "I–V curve, max power",
    newConcepts: ["iv", "mpp"],
    render(el) {
      el.append(
        P(`Back to the running cell: 156 mm square, 243 cm², in full sun (1000 W per m²), so <b>${P_IN.toFixed(1)} W</b> of light lands on it. What comes out depends on what you connect.`),
        P("<b>Nothing connected</b> (open circuit): electrons pile up on the n side and holes on the p side. That pile-up is a voltage, and it pushes against the built-in field, so the junction separates worse and worse until pairs recombine as fast as light makes them. The balance sits near <b>0.64 V</b>, well below the 1.12 V a gap's worth would suggest. This is why one silicon cell gives about 0.6 V. Current: zero."),
        P("<b>A thick wire</b> (short circuit): every separated electron runs round at once, 9 A, but nothing piles up, so there is no voltage."),
        P("A real load sits in between. Describe it by the volts it needs per ampere (its resistance, in ohms; more in <em>Real batteries</em>). The cell's current plotted against its voltage is its <b>I–V curve</b>. Power is volts × amperes (<em>Charge, energy and capacity</em>): the area of the rectangle under the operating point. The corner where that rectangle is largest is the <b>maximum power point</b>.")
      );
      const m = cellModel(GAP_SI, 1);
      let R = 0.2, mode = "R";
      const pl = plot({ xmin: 0, xmax: 0.8, ymin: 0, ymax: 10, height: 250, xlabel: "voltage across the load (V)", ylabel: "current (A)  ·  power (W)", xticks: [0, 0.2, 0.4, 0.6, 0.8], yticks: [0, 2, 4, 6, 8, 10], narrow: true, minFont: 10 });
      const sV = stat("voltage", "b"), sI = stat("current", "y"), sP = stat("power = V × I", "g"), sEf = stat(`of the ${P_IN.toFixed(1)} W of sunlight`, "");
      const msg = note("");
      const upd = () => {
        const op = mode === "short" ? { V: 0, I: m.IL } : mode === "open" ? { V: m.Voc, I: 0 } : m.atLoad(R);
        const line = mode === "short" ? [[0, 0], [0, 10]] : mode === "open" ? [[0, 0], [0.8, 0]] : [[0, 0], [Math.min(0.8, 10 * R), Math.min(10, 0.8 / R)]];
        drawIV(pl, m, op, { loadLine: line });
        const p = op.V * op.I;
        sV.set(op.V.toFixed(2) + " V"); sI.set(op.I.toFixed(2) + " A"); sP.set(p.toFixed(2) + " W"); sEf.set(((100 * p) / P_IN).toFixed(1) + "%");
        msg.innerHTML = mode === "short" ? "Short circuit: the full 9 A, but at 0 V. The rectangle has no width: <b>no power</b>. All the absorbed light becomes heat in the cell."
          : mode === "open" ? "Open circuit: 0.64 V, but no current. The rectangle has no height: <b>no power</b>. Every pair recombines inside the cell."
            : p > 0.985 * m.Pmp ? `At the maximum power point (green): ${m.Vmp.toFixed(2)} V × ${m.Imp.toFixed(1)} A ≈ ${m.Pmp.toFixed(1)} W. The rectangle cannot get bigger.`
              : op.V < m.Vmp ? "An easy load: nearly all the current, but little voltage. Raise the resistance to widen the rectangle." : "A demanding load: the voltage is near its ceiling and the current collapses, because pairs recombine inside instead of going round.";
      };
      const sl = slider({ name: "load",  min: 0.005, max: 5, log: true, steps: 240, value: R, fmtv: (v) => (v < 0.1 ? v.toFixed(3) : v.toFixed(2)) + " Ω", oninput: (v) => { R = v; mode = "R"; upd(); } });
      const setR = (v) => { R = v; mode = "R"; sl.set(v); upd(); };
      el.append(widget("One silicon cell in full sun: choose the load, read the operating point (yellow dot)", pl, ivLegend(), sl,
        h("div", { class: "btns" }, h("button", { onclick: () => { mode = "short"; upd(); } }, "Short circuit"), h("button", { onclick: () => { mode = "open"; upd(); } }, "Open circuit"), h("button", { class: "primary", onclick: () => setR(m.Vmp / m.Imp) }, "Jump to maximum power")),
        h("div", { class: "readout" }, sV, sI, sP, sEf), msg,
        note("Curve from a simplified ideal-junction model tuned to a typical commercial cell (9 A, 0.64 V).")));
      upd();
      el.append(
        P("The curve is nearly flat, then falls off a cliff: up to about 0.5 V almost every pair still makes it round the circuit, and beyond that recombination takes over quickly. A solar panel wires 60 or more such cells in a chain so that their voltages add to 30–40 V, and its electronics keep adjusting the load to stay on the maximum power point as the light changes."),
        takeaway("A lit cell offers a whole curve of voltage–current pairs, from 9 A at 0 V to 0 A at 0.64 V. Power is the rectangle V × I, and it peaks at the knee: the maximum power point.")
      );
    },
    check: {
      type: "number", q: "You short-circuit the cell in full sun with a thick copper wire. It carries the full <b>9 A</b>. How many watts does the cell deliver to the wire?",
      answer: 0, tolerance: 0.05, hint: "Power = voltage × current. What is the voltage across a wire that needs (almost) no volts per ampere?",
      why: "0 W. Current alone is not power: with no voltage across the load, 9 A × 0 V = 0. The same goes for the open circuit: 0.64 V × 0 A = 0. The useful point lies between.",
    },
  });

  // ================================================================ 10 (capstone)
  steps.push({
    title: "Capstone: a solar cell on the bench",
    short: "Capstone: solar cell",
    newConcepts: [],
    render(el) {
      const clk = mkClock(), r = rng(21);
      el.append(
        P("Everything together. Below is the running cell again, but now you control the three things that matter: <b>how much light</b> falls on it, the <b>band gap</b> of the crystal, and the <b>load</b>. The cross-section shows sunlight as a mix of photons; the plot shows the I–V curve and your operating point; the bars show where the light's energy ends up (<em>lost inside the cell</em> = pairs that recombine, plus the voltage falling short of the gap)."),
        h("ul", {},
          h("li", { html: "Press <em>Trace the I–V curve</em> to sweep the load from short circuit to open circuit, then land on the maximum power point." }),
          h("li", { html: "Halve the light. The current halves, the voltage hardly moves. Is your old load still the best one?" }),
          h("li", { html: "Change the gap: germanium, silicon, gallium arsenide. Watch current trade against voltage, as step 8 promised." }),
          h("li", { html: "Set the light to zero. A battery would keep going on its stored reactants. This does not." }))
      );
      let X = 1, gap = GAP_SI, R = 0.2, m = cellModel(gap, X), op = m.atLoad(R), trace = [], tracing = 0;
      const scene = cellScene(clk, { gap: () => gap, pRound: () => (m.IL > 0 ? op.I / m.IL : 0) });
      clk.every(110, () => { if (r() < X * 0.42) scene.fire(Math.max(0.35, Math.min(4.2, SPEC.sample(r())))); });
      const pl = plot({ xmin: 0, xmax: 0.8, ymin: 0, ymax: 12, height: 250, xlabel: "voltage across the load (V)", ylabel: "current (A)  ·  power (W)", xticks: [0, 0.2, 0.4, 0.6, 0.8], yticks: [0, 4, 8, 12], narrow: true, minFont: 10 });
      const sV = stat("voltage", "b"), sI = stat("current", "y"), sP = stat("power", "g"), sEf = stat("efficiency", "p"), sM = stat("best possible here", "");
      const bars = hbars(["passes through (below the gap)", "heat (photon excess)", "lost inside the cell", "delivered to the load"], { max: 1, fmtv: (f) => (f * P_IN * X).toFixed(1) + " W" });
      const msg = note("");
      let lastGap = null;
      const ranges = () => {
        if (gap === lastGap) return; lastGap = gap;
        const m1 = cellModel(gap, 1.2);
        const xmax = Math.ceil((m1.Voc + 0.04) / 0.2) * 0.2, xs = xmax > 1.21 ? 0.4 : 0.2, xt = [];
        for (let v = 0; v <= xmax + 1e-9; v += xs) xt.push(+v.toFixed(1));
        const top = Math.max(m1.IL, m1.Pmp) * 1.08, ys = top > 16 ? 5 : top > 8 ? 4 : 2, ymax = Math.ceil(top / ys) * ys, yt = [];
        for (let v = 0; v <= ymax + 1e-9; v += ys) yt.push(v);
        pl.setRange({ xmax: +xmax.toFixed(1), ymax, xticks: xt, yticks: yt });
        rng_ = { xmax: +xmax.toFixed(1), ymax };
      };
      let rng_ = { xmax: 0.8, ymax: 12 };
      const upd = (keepOp) => {
        m = cellModel(gap, X); if (!keepOp) op = m.atLoad(R);
        ranges();
        drawIV(pl, m, op, { trace, loadLine: [[0, 0], [Math.min(rng_.xmax, rng_.ymax * R), Math.min(rng_.ymax, rng_.xmax / R)]] });
        const p = op.V * op.I, pin = P_IN * X;
        sV.set(op.V.toFixed(2) + " V"); sI.set(op.I.toFixed(2) + " A"); sP.set(p.toFixed(2) + " W");
        sEf.set(pin > 0 ? ((100 * p) / pin).toFixed(1) + "%" : "–"); sM.set(m.Pmp.toFixed(2) + " W");
        const below = SPEC.below(gap), kept = SPEC.kept(gap), del = pin > 0 ? p / pin : 0;
        bars.update(pin > 0 ? [below, 1 - below - kept, Math.max(0, kept - del), del] : [0, 0, 0, 0], [GREY, RED, PUR, GRN]);
        msg.innerHTML = X === 0 ? "<b>Dark.</b> No photons, no pairs, no voltage, no current: at once. Nothing was stored. The Daniell cell's zinc strip held 5.36 Ah whatever the weather; this cell holds none, but it will never run out either."
          : tracing ? "Tracing: the load is being stepped from a short circuit toward an open circuit …"
            : p > 0.985 * m.Pmp ? `On the maximum power point: ${op.V.toFixed(2)} V × ${op.I.toFixed(2)} A = ${p.toFixed(2)} W, ${((100 * p) / pin).toFixed(1)}% of the ${pin.toFixed(1)} W of light.`
              : `Your load takes ${p.toFixed(2)} W of a possible ${m.Pmp.toFixed(2)} W (green dot). ${op.V < m.Vmp ? "It is too easy: raise the resistance." : "It is too demanding: lower the resistance."}`;
      };
      const stopTrace = () => { tracing++; };
      const slX = slider({ name: "light", min: 0, max: 120, step: 1, value: 100, fmtv: (v) => v + "% sun", oninput: (v) => { X = v / 100; stopTrace(); tracing = 0; trace = []; upd(); } });
      const slG = slider({ name: "band gap", min: 0.6, max: 2.5, step: 0.01, value: gap, fmtv: (v) => v.toFixed(2) + " eV", oninput: (v) => { gap = v; tg.set(v); tracing = 0; trace = []; upd(); } });
      const slR = slider({ name: "load", min: 0.002, max: 50, log: true, steps: 300, value: R, fmtv: (v) => (v < 0.1 ? v.toFixed(3) : v < 10 ? v.toFixed(2) : v.toFixed(0)) + " Ω", oninput: (v) => { R = v; tracing = 0; upd(); } });
      const tg = toggle("crystal", GAPS.map((g) => [g[2], `${g[0]} <span style="opacity:.7">${g[2]}</span>`]), gap, (v) => { gap = v; slG.set(v); tracing = 0; trace = []; upd(); });
      const toMpp = () => { tracing = 0; if (!(m.IL > 0)) { upd(); return; } R = Math.max(0.002, Math.min(50, m.Vmp / m.Imp)); slR.set(R); upd(); };
      const doTrace = () => {
        if (!(m.IL > 0)) { upd(); return; }
        const my = (tracing = Math.random() + 1); trace = []; let k = 0; const N = 48;
        const stepf = () => {
          if (tracing !== my) return;
          const V = m.Voc * (1 - Math.pow(1 - k / N, 2)), I = m.I(V);
          op = { V, I }; trace.push([V, I]); if (V > 0) { R = Math.max(0.002, Math.min(50, V / Math.max(I, 1e-6))); slR.set(R); }
          upd(true);
          if (++k <= N) clk.after(45, stepf); else clk.after(500, () => { if (tracing === my) toMpp(); });
        };
        stepf();
      };
      const night = () => { X = 0; slX.set(0); tracing = 0; trace = []; upd(); };
      const noon = () => { X = 1; slX.set(100); tracing = 0; trace = []; upd(); };
      el.append(widget("Solar cell simulator: 243 cm² cell, sunlight as a mix of photon energies", scene.svg, slX, slG, tg, slR,
        h("div", { class: "btns" }, h("button", { class: "primary", onclick: doTrace }, "Trace the I–V curve"), h("button", { onclick: toMpp }, "Go to maximum power"), h("button", { onclick: night }, "Night (no light)"), h("button", { onclick: noon }, "Full sun")),
        pl, ivLegend(), h("div", { class: "readout" }, sV, sI, sP, sEf, sM), msg, bars,
        note("Simplified model: sun as a 5778 K glowing body, open-circuit voltage = gap − 0.48 V in full sun, ideal junction curve, calibrated so that silicon gives 9 A and 0.64 V. Real cells of other materials differ in detail.")));
      upd();
      el.append(
        P("What you have used: silicon atoms sharing electrons in <em>covalent bonds</em>; a <em>band gap</em> of 1.12 eV to free one; <em>doping</em> to make n-type and p-type; a <em>p–n junction</em> whose built-in field sorts electrons from holes; photons that create the pairs; and an <em>I–V curve</em> with one best point. No element was oxidised or reduced. A galvanic cell spends its reactants and gives a fixed charge; a solar cell spends nothing and gives current for as long as light falls on it. Which is why the two are so often wired together."),
        takeaway("A solar cell is a p–n junction that turns photons into separated electrons and holes. Light sets the current, the band gap sets the voltage, and the load decides how much of the product V × I you actually collect.")
      );
      return () => clk.stop();
    },
  });

  Course.run({
    id: "solar-cells",
    section: "4. Running it backwards, and other ways to get current",
    title: "Silicon and light: electricity without a reaction",
    concepts: {
      covalent: "covalent bond (shared electron pair)",
      semi: "semiconductor",
      ev: "electron-volt (eV)",
      gap: "band gap",
      hole: "hole",
      ntype: "doping: n-type (extra electrons)",
      ptype: "doping: p-type (holes)",
      junction: "p–n junction",
      field: "built-in field",
      photon: "photon (energy by colour)",
      pv: "photovoltaic effect",
      losses: "below-gap and heat losses",
      iv: "I–V curve",
      mpp: "maximum power point",
    },
    sources: [
      { title: "OpenStax University Physics vol. 3, 9.6 Semiconductors and Doping", url: "https://openstax.org/books/university-physics-volume-3/pages/9-6-semiconductors-and-doping", note: "Covalent silicon lattice, band gap, holes, n-type and p-type doping." },
      { title: "OpenStax University Physics vol. 3, 9.7 Semiconductor Devices", url: "https://openstax.org/books/university-physics-volume-3/pages/9-7-semiconductor-devices", note: "The p–n junction, depletion layer and built-in field." },
      { title: "PVEducation (Honsberg & Bowden): Solar Cell Operation", url: "https://www.pveducation.org/pvcdrom/solar-cell-operation/iv-curve", note: "I–V curve, short-circuit current, open-circuit voltage, maximum power point; typical silicon cell values." },
      { title: "Shockley & Queisser, Detailed Balance Limit of Efficiency of p‐n Junction Solar Cells, J. Appl. Phys. 32, 510 (1961)", url: "https://doi.org/10.1063/1.1736034", note: "The 44% 'ultimate efficiency' for a 6000 K black-body sun and the lower detailed-balance limit." },
      { title: "Wikipedia: Shockley–Queisser limit", url: "https://en.wikipedia.org/wiki/Shockley%E2%80%93Queisser_limit", note: "About 33.7% at a 1.34 eV gap for the standard solar spectrum; about 32% for silicon's gap before further losses." },
      { title: "Wikipedia: Band gap", url: "https://en.wikipedia.org/wiki/Band_gap", note: "Band gaps at 300 K: Ge 0.67, Si 1.12, GaAs 1.42, CdTe 1.5, diamond 5.47 eV." },
      { title: "NREL Best Research-Cell Efficiency Chart", url: "https://www.nrel.gov/pv/cell-efficiency.html", note: "Record laboratory efficiencies (crystalline silicon about 27%, as of 2025)." },
      { title: "Misiakos & Tsamakis, Accurate measurements of the silicon intrinsic carrier density from 78 to 340 K, J. Appl. Phys. 74, 3293 (1993)", url: "https://doi.org/10.1063/1.354551", note: "Fit used for freed electrons per cm³ in pure silicon (9.7 × 10⁹ at 300 K); extrapolated above 340 K here." },
    ],
    steps,
  });
})();
