// Lesson 2.1 — The galvanic cell: making electrons take the wire
(function () {
  const { h, s, fmt, widget, stat, toggle, rng, narrow } = Course;
  const f = Chem.f;
  const YEL = "#ffd166", RED = "#ff6b6b", BLUE = "#6cb4ff", GRN = "#5fd38d", MUTED = "#9aa3b5", TEXT = "#e6e9ef", DARK = "#12151c";
  const P = (html) => h("p", { html });
  const takeaway = (html) => h("div", { class: "takeaway", html });
  const formula = (html) => h("div", { class: "formula", html });
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // ---- chemistry data (numbers from Chem) ----
  const METAL = {
    Zn: { name: "zinc", col: "#aeb9c9", salt: "ZnSO4", anion: "SO4", tint: null },
    Fe: { name: "iron", col: "#77818f", salt: "FeSO4", anion: "SO4", tint: "#6fd39a" },
    Cu: { name: "copper", col: "#d18a52", salt: "CuSO4", anion: "SO4", tint: "#3f9dff" },
    Ag: { name: "silver", col: "#e9ecf2", salt: "AgNO3", anion: "NO3", tint: null },
  };
  for (const k in METAL) Object.assign(METAL[k], { sym: k, E: Chem.E0by[k].E, n: Chem.E0by[k].n, mass: Chem.elements[k].mass, ion: f(Chem.E0by[k].ox) });
  const ION = {
    Zn: { q: 2, t: "Zn", name: f("Zn^2+") }, Fe: { q: 2, t: "Fe", name: f("Fe^2+") }, Cu: { q: 2, t: "Cu", name: f("Cu^2+") },
    Ag: { q: 1, t: "Ag", name: f("Ag^+") }, K: { q: 1, t: "K", name: f("K^+") },
    SO4: { q: -2, t: "SO₄", name: f("SO4^2-") }, NO3: { q: -1, t: "NO₃", name: f("NO3^-") },
  };
  const DOT = 0.025;            // mol of ions per drawn dot (toy scale for the pictures)
  const M0 = 12;                // starting mass of each electrode, g
  const DH = 218.7;             // kJ released per mol of Zn + Cu²⁺ → Zn²⁺ + Cu (from standard enthalpies of formation)
  const volts = (a, c) => METAL[c].E - METAL[a].E;
  const notation = (a, c) => `${a} | ${METAL[a].ion} || ${METAL[c].ion} | ${c}`;
  const signed = (q) => (q > 0 ? "+" + q : q < 0 ? "−" + -q : "0");

  const legend = (extra) => h("div", { class: "note gc-legend", html:
    `<span><i style="background:${YEL}"></i>electron</span><span><i style="background:${RED}"></i>positive ion (cation)</span><span><i style="background:${BLUE}"></i>negative ion (anion)</span>` +
    `<span>big dot = 2 charges, small dot = 1 charge · one dot = ${DOT} mol${extra ? " · " + extra : ""}</span>` });

  const style = h("style", {}, `
    .gc-legend { display:flex; flex-wrap:wrap; gap:4px 14px; margin-top:8px; font-size:13px; }
    .gc-legend i { display:inline-block; width:10px; height:10px; border-radius:50%; margin-right:5px; }
    .gc-status { min-height:44px; margin-top:10px; padding:8px 12px; border-left:3px solid var(--blue); background:var(--panel2); border-radius:6px; font-size:15px; }
    .gc-bar { height:14px; border-radius:4px; background:var(--panel2); position:relative; overflow:hidden; }
    .gc-bar > div { position:absolute; left:0; top:0; bottom:0; border-radius:4px; transition:width .3s; }
    .gc-barrow { display:grid; grid-template-columns:minmax(120px, 34%) 1fr; gap:10px; align-items:center; margin-top:8px; font-size:14px; }
    .gc-tokens { display:flex; flex-wrap:wrap; gap:6px; justify-content:center; margin:12px 0 4px; }
    .gc-tokens button { font:600 20px var(--mono); padding:8px 12px; min-width:44px; }
    .gc-tokens button.on { border-color:var(--yellow); color:var(--yellow); }
  `);

  // =====================================================================================
  // The cell drawing: one or two beakers, electrodes, optional wire and salt bridge,
  // ions that drift about and electrons that really travel. Everything is driven by one timer.
  // =====================================================================================
  function makeCell(o) {
    const single = !o.R;
    const W = single ? 300 : narrow(460, 380), H = 306;
    const bw = single ? 190 : narrow(190, 172), m = single ? 55 : narrow(15, 8);
    const svg = s("svg", { viewBox: single ? `0 62 ${W} ${H - 62}` : `0 0 ${W} ${H}`, width: "100%", style: `display:block;margin:0 auto;max-width:${single ? 420 : 640}px` });
    const layer = () => { const g = s("g"); svg.append(g); return g; };
    const gBk = layer(), gIon = layer(), gBr = layer(), gEl = layer(), gWire = layer(), gE = layer(), gTxt = layer(), gMark = layer();
    const rnd = rng(o.seed || 7);
    const cell = { svg, wire: !!o.wire, bridge: !!o.bridge, device: o.device || "none", busy: false, units: 0, hl: "all", onTick: null, single, W };
    let cfg = { L: o.L, R: o.R }, gen = 0, sched = [], parts = [], tickN = 0, glow = 0, glowT = 0, bulbEl = null, meterTxt = null, meterStr = "", flowStr = "", roles = ["", ""], markEl = null;

    function T(g, x, y, str, a = {}) {
      const t = s("text", { x, y, "text-anchor": a.anchor || "middle", style: `font-size:${a.size || 12}px;fill:${a.fill || TEXT};font-weight:${a.weight || 400}` });
      t.textContent = str; g.append(t); return t;
    }
    const rect = (g, x, y, w, hh, a) => { const r = s("rect", Object.assign({ x, y, width: Math.max(0, w), height: hh }, a)); g.append(r); return r; };

    function mkBeaker(side, c) {
      const x0 = side < 0 ? m : W - m - bw, x1 = x0 + bw;
      const ex = single ? x0 + 45 : side < 0 ? x0 + 35 : x1 - 35;
      const b = { side, x0, x1, ex, inn: -side, metal: c.metal, sol: c.sol, lost: 0, gain: 0, gl: 0, depMetal: null, net: 0, count: {}, lb: false,
        box: side < 0 ? [ex + 32, x1 - 5] : [x0 + 5, ex - 32], leg: side < 0 ? x1 - 20 : x0 + 20 };
      b.liq = rect(gBk, x0 + 2, 150, bw - 4, 119, { fill: METAL[c.sol].tint || "#9fb4d6", opacity: 0.07 });
      const glass = s("path", { d: `M${x0} 132 V270 H${x1} V132`, fill: "none", stroke: "#6b7689", "stroke-width": 2 }); gBk.append(glass);
      b.strip = rect(gEl, ex - 15, 78, 30, 168, { fill: METAL[c.metal].col, rx: 2 });
      b.depA = rect(gEl, ex, 153, 0, 93, { fill: "#000" }); b.depB = rect(gEl, ex, 153, 0, 93, { fill: "#000" });
      b.sym = T(gEl, ex, 122, c.metal, { size: 12, fill: DARK, weight: 700 });
      b.cap = T(gTxt, (x0 + x1) / 2, 286, `${c.metal} strip in ${f(METAL[c.sol].salt)}`, { size: 12, fill: MUTED });
      b.role = T(gTxt, (x0 + x1) / 2, 301, "", { size: 12, fill: YEL, weight: 600 });
      const n0 = c.dots == null ? 6 : c.dots, an = METAL[c.sol].anion;
      const nAn = n0 * METAL[c.sol].n / -ION[an].q;
      b.count[c.sol] = n0; b.count[an] = nAn;
      for (let i = 0; i < n0; i++) addIon(b, c.sol);
      for (let i = 0; i < nAn; i++) addIon(b, an);
      redraw(b);
      return b;
    }
    function addIon(b, kind, x, y) {
      const K = ION[kind], r = Math.abs(K.q) === 2 ? 9 : 7;
      const g = s("g");
      g.append(s("circle", { r, fill: K.q > 0 ? RED : BLUE }));
      const t = s("text", { "text-anchor": "middle", dy: "0.36em", style: `font-size:${r === 9 ? 7 : 5.6}px;font-weight:700;fill:${DARK}` }); t.textContent = K.t; g.append(t);
      const p = { b, kind, q: K.q, r, g, box: b.box, path: null, vx: (rnd() - 0.5) * 0.7, vy: (rnd() - 0.5) * 0.7,
        x: x != null ? x : b.box[0] + r + rnd() * (b.box[1] - b.box[0] - 2 * r), y: y != null ? y : 158 + r + rnd() * (106 - 2 * r) };
      gIon.append(g); parts.push(p); applyHl(p); place(p); return p;
    }
    function addElectron(x, y, path, speed, cb) {
      const g = s("circle", { r: 3.6, fill: YEL, stroke: DARK, "stroke-width": 0.6 });
      const p = { kind: "e", q: 0, r: 3.6, g, x, y, path, speed, cb, box: null };
      gE.append(g); parts.push(p); applyHl(p); place(p); return p;
    }
    const place = (p) => p.g.setAttribute("transform", `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})`);
    const kill = (p) => { p.dead = true; p.g.remove(); };
    function applyHl(p) {
      const on = cell.hl === "all" || (cell.hl === "e" && p.kind === "e") || (cell.hl === "cat" && p.q > 0) || (cell.hl === "an" && p.q < 0);
      p.g.setAttribute("opacity", on ? 1 : 0.13);
    }
    function redraw(b) {
      const w = Math.max(8, 30 - 3.2 * b.lost), d = 2.6 * b.gain;
      b.strip.setAttribute("x", b.ex - w / 2); b.strip.setAttribute("width", w);
      const col = b.depMetal ? METAL[b.depMetal].col : "#000";
      b.depA.setAttribute("x", b.ex + w / 2); b.depA.setAttribute("width", d); b.depA.setAttribute("fill", col);
      b.depB.setAttribute("x", b.ex - w / 2 - d); b.depB.setAttribute("width", d); b.depB.setAttribute("fill", col);
      b.sym.style.fontSize = (w < 16 ? 8 : 12) + "px";
      const tint = METAL[b.sol].tint;
      b.liq.setAttribute("opacity", tint ? Math.min(0.45, 0.05 + 0.055 * (b.count[b.sol] || 0)) : 0.07);
    }
    function drawWire() {
      gWire.innerHTML = ""; bulbEl = null; meterTxt = null;
      if (single) return;
      const L = cell.L, Rr = cell.R, y = 32, cx = W / 2, sw = cell.device === "short" ? 5 : 2.5, col = "#b9c2d3";
      const line = (x1, y1, x2, y2) => gWire.append(s("line", { x1, y1, x2, y2, stroke: col, "stroke-width": sw, "stroke-linecap": "round" }));
      if (!cell.wire) {
        line(L.ex, 78, L.ex, 54); line(Rr.ex, 78, Rr.ex, 54);
        T(gWire, cx, 40, "no wire", { size: 11, fill: MUTED });
      } else {
        line(L.ex, 78, L.ex, y); line(Rr.ex, 78, Rr.ex, y); line(L.ex, y, Rr.ex, y);
        if (cell.device === "bulb") {
          bulbEl = s("circle", { cx, cy: y, r: 12, fill: YEL, "fill-opacity": 0.08, stroke: "#b9c2d3", "stroke-width": 1.5 }); gWire.append(bulbEl);
          T(gWire, cx, y + 26, "bulb", { size: 10, fill: MUTED });
        } else if (cell.device === "meter") {
          rect(gWire, cx - 32, y - 13, 64, 26, { rx: 5, fill: "#212734", stroke: "#b9c2d3", "stroke-width": 1.5 });
          meterTxt = T(gWire, cx, y + 4.5, meterStr, { size: 13, fill: GRN, weight: 700 });
          T(gWire, cx, y + 26, "voltmeter", { size: 10, fill: MUTED });
        } else if (cell.device === "short") T(gWire, cx, y + 18, "thick bare wire", { size: 10, fill: MUTED });
        if (flowStr) T(gWire, cx, 13, flowStr, { size: 12, fill: YEL, weight: 600 });
      }
    }
    function drawBridge() {
      gBr.innerHTML = "";
      if (single || !cell.bridge) return;
      const a = cell.L.leg, b = cell.R.leg;
      const d = `M${a} 224 V114 Q${a} 100 ${a + 14} 100 H${b - 14} Q${b} 100 ${b} 114 V224`;
      gBr.append(s("path", { d, fill: "none", stroke: "#aab6cc", "stroke-width": 17, opacity: 0.3, "stroke-linecap": "round" }));
      gBr.append(s("path", { d, fill: "none", stroke: "#12151c", "stroke-width": 12, opacity: 0.45, "stroke-linecap": "round" }));
      const n = 6;
      for (let i = 0; i < n; i++) gBr.append(s("circle", { cx: a + 12 + (i + 0.5) * (b - a - 24) / n, cy: 100, r: 3, fill: i % 2 ? BLUE : RED, opacity: 0.85 }));
      T(gBr, W / 2, 87, f("salt bridge: KNO3 solution"), { size: 10.5, fill: MUTED });
    }
    function build() {
      gen++; sched = []; parts = []; cell.busy = false; cell.units = 0; glow = 0;
      for (const g of [gBk, gIon, gEl, gE, gTxt, gMark]) g.innerHTML = "";
      markEl = null;
      cell.L = mkBeaker(-1, cfg.L); cell.R = single ? null : mkBeaker(1, cfg.R);
      drawWire(); drawBridge(); setRoles(roles[0], roles[1]);
    }
    function setRoles(l, r) { roles = [l, r]; cell.L.role.textContent = l || ""; if (cell.R) cell.R.role.textContent = r || ""; }

    function tick() {
      tickN++;
      for (const p of parts.slice()) {
        if (p.dead) continue;
        if (p.path) {
          const [tx, ty] = p.path[0], dx = tx - p.x, dy = ty - p.y, d = Math.hypot(dx, dy);
          if (d <= p.speed) { p.x = tx; p.y = ty; p.path.shift(); if (!p.path.length) { p.path = null; const cb = p.cb; p.cb = null; if (cb) cb(p); } }
          else { p.x += (dx / d) * p.speed; p.y += (dy / d) * p.speed; }
        } else if (p.box) {
          p.vx = clamp(p.vx + (rnd() - 0.5) * 0.12, -0.5, 0.5); p.vy = clamp(p.vy + (rnd() - 0.5) * 0.12, -0.5, 0.5);
          p.x += p.vx; p.y += p.vy;
          const a = p.box[0] + p.r, b = p.box[1] - p.r;
          if (p.x < a) { p.x = a; p.vx = Math.abs(p.vx); } if (p.x > b) { p.x = b; p.vx = -Math.abs(p.vx); }
          if (p.y < 156 + p.r) { p.y = 156 + p.r; p.vy = Math.abs(p.vy); } if (p.y > 266 - p.r) { p.y = 266 - p.r; p.vy = -Math.abs(p.vy); }
        }
        if (!p.dead) place(p);
      }
      parts = parts.filter((p) => !p.dead);
      const due = sched.filter((e) => e.at <= tickN); sched = sched.filter((e) => e.at > tickN);
      due.forEach((e) => e.gen === gen && e.fn());
      if (bulbEl) { glow = cell.busy ? Math.min(glowT, glow + 0.08) : Math.max(0, glow - 0.03); bulbEl.setAttribute("fill-opacity", (0.08 + 0.9 * glow).toFixed(2)); }
      if (cell.onTick) cell.onTick();
    }
    const after = (n, fn) => sched.push({ at: tickN + Math.max(1, Math.round(n)), fn, gen });

    // ions leaving the salt bridge until the beaker is neutral again
    function compensate(b) {
      let i = 0;
      while (b.net !== 0) {
        const kind = b.net > 0 ? "NO3" : "K";
        b.net += b.net > 0 ? -1 : 1; b.count[kind] = (b.count[kind] || 0) + 1;
        const p = addIon(b, kind, b.leg, 118 - 13 * i++);
        p.box = null; p.speed = 2.4; p.path = [[b.leg, 232]]; p.cb = (q) => { q.box = b.box; q.vx = b.inn * -0.4 * (b.side < 0 ? -1 : 1) * (rnd() - 0.5); q.vy = 0.4; };
      }
    }

    // why one unit (2 electrons through the wire) cannot happen right now; null = it can
    cell.block = (d) => {
      if (single) return "single";
      const A = d > 0 ? cell.L : cell.R, C = d > 0 ? cell.R : cell.L;
      if (!cell.wire) return "wire";
      if ((C.count[C.sol] || 0) < 2 / METAL[C.sol].n) return "ions";
      if (A.lost >= 7) return "metal";
      if (!cell.bridge && Math.abs(A.net) >= 6) return "charge";
      return null;
    };
    // one unit: an anode atom leaves as an ion, 2 electrons travel the wire, cathode ions plate out
    cell.fire = (d, k = 1, done) => {
      if (cell.busy || cell.block(d)) return false;
      cell.busy = true;
      const A = d > 0 ? cell.L : cell.R, C = d > 0 ? cell.R : cell.L;
      const nA = 2 / METAL[A.metal].n, nC = 2 / METAL[C.sol].n;
      A.lost++; A.net += 2; A.count[A.metal] = (A.count[A.metal] || 0) + nA; C.gl++; cell.units++;
      C.net -= 2; C.count[C.sol] -= nC;
      for (let i = 0; i < nA; i++) { const p = addIon(A, A.metal, A.ex + A.inn * (Math.max(8, 30 - 3.2 * A.lost) / 2 + 9), 172 + rnd() * 60); p.box = null; p.speed = 1; p.path = [[A.box[A.side < 0 ? 0 : 1] + A.inn * 10, p.y]]; p.cb = (q) => { q.box = A.box; q.vx = A.inn * 0.5; }; }
      redraw(A);
      const victims = parts.filter((p) => p.b === C && p.kind === C.sol && !p.res && !p.dead).slice(0, nC);
      victims.forEach((p) => (p.res = true));
      if (cell.bridge) { compensate(A); compensate(C); }
      glowT = Math.min(1, 0.4 * k + 0.25);
      const path = () => [[A.ex, 32], [C.ex, 32], [C.ex, 150]];
      const arrive = () => {
        let left = victims.length;
        const fin = () => { C.gain++; C.depMetal = C.sol; redraw(C); cell.busy = false; if (done) done(); };
        if (!left) return fin();
        victims.forEach((p) => {
          p.box = null; p.speed = 2.6 * Math.max(0.7, k);
          p.path = [[C.ex + C.inn * (15 + 2.6 * C.gain + p.r), clamp(p.y, 164, 240)]];
          p.cb = (q) => { kill(q); if (!--left) fin(); };
        });
      };
      addElectron(A.ex, 150, path(), 9 * k, kill);
      after(7 / k, () => addElectron(A.ex, 150, path(), 9 * k, (p) => { kill(p); arrive(); }));
      return true;
    };
    // direct reaction in one beaker: the strip's metal is more active than the dissolved ion
    cell.canLocal = (b) => b && b.metal !== b.sol && METAL[b.metal].E < METAL[b.sol].E && (b.count[b.sol] || 0) >= 2 / METAL[b.sol].n && b.lost < 7 && !b.lb;
    cell.local = (b, done) => {
      if (!cell.canLocal(b)) return false;
      b.lb = true;
      const need = 2 / METAL[b.sol].n; b.count[b.sol] -= need;
      const ions = parts.filter((p) => p.b === b && p.kind === b.sol && !p.res && !p.dead).slice(0, need);
      let left = ions.length;
      const w = Math.max(8, 30 - 3.2 * b.lost), sx = b.ex + b.inn * (w / 2 + 2.6 * b.gain);
      ions.forEach((p) => {
        p.res = true; p.box = null; p.speed = 2.2; p.path = [[sx + b.inn * p.r, clamp(p.y, 166, 238)]];
        p.cb = (q) => {
          addElectron(b.ex, q.y - 3, [[sx, q.y - 3]], 0.7, kill);
          addElectron(b.ex, q.y + 3, [[sx, q.y + 3]], 0.7, (e) => {
            kill(e); kill(q);
            if (--left) return;
            b.gain++; b.depMetal = b.sol; b.lost++; b.count[b.metal] = (b.count[b.metal] || 0) + 2 / METAL[b.metal].n;
            for (let i = 0; i < 2 / METAL[b.metal].n; i++) { const z = addIon(b, b.metal, sx + b.inn * 9, q.y); z.vx = b.inn * 0.5; }
            redraw(b); b.lb = false; cell.units++; if (done) done();
          });
        };
      });
      return true;
    };
    cell.rebuild = (c) => { if (c) cfg = Object.assign({}, cfg, c); build(); };
    cell.setWire = (w, dev) => { cell.wire = w; if (dev) cell.device = dev; drawWire(); };
    cell.setBridge = (b) => { cell.bridge = b; drawBridge(); if (b && !single) { compensate(cell.L); compensate(cell.R); } };
    cell.setRoles = setRoles;
    cell.setMeter = (str) => { meterStr = str; if (meterTxt) meterTxt.textContent = str; };
    cell.setFlow = (str) => { if (str !== flowStr) { flowStr = str; drawWire(); } };
    cell.setHl = (m2) => { cell.hl = m2; parts.forEach(applyHl); };
    cell.mark = (key) => {
      if (markEl) { markEl.remove(); markEl = null; }
      const L = cell.L, Rr = cell.R;
      const box = { Ls: [L.ex - 20, 72, 40, 180], Lb: [L.ex + 9, 150, 14, 100], Li: [L.box[0] - 4, 152, L.box[1] - L.box[0] + 6, 116],
        br: [L.leg - 12, 76, Rr.leg - L.leg + 24, 154], Ri: [Rr.box[0] - 2, 152, Rr.box[1] - Rr.box[0] + 6, 116], Rb: [Rr.ex - 23, 150, 14, 100], Rs: [Rr.ex - 20, 72, 40, 180] }[key];
      if (box) markEl = rect(gMark, box[0], box[1], box[2], box[3], { fill: YEL, "fill-opacity": 0.1, stroke: YEL, "stroke-width": 2, rx: 6 });
    };
    cell.after = after;
    cell.stop = () => clearInterval(timer);
    build();
    const timer = setInterval(tick, 33);
    return cell;
  }

  // keeps a two-beaker cell firing whenever it can; opt.dir() → +1 (left is anode), −1, or 0
  function runner(cell, opt) {
    const r = { on: true, cool: 12 };
    cell.onTick = () => {
      if (!r.on || cell.busy) return;
      if (r.cool-- > 0) return;
      const d = opt.dir(), why = d ? cell.block(d) : "same";
      if (why) { r.cool = 6; if (opt.idle) opt.idle(why, d); return; }
      const A = d > 0 ? cell.L : cell.R;
      const k = (opt.speed ? opt.speed() : 1) * (cell.bridge ? 1 : [1, 0.65, 0.4][Math.abs(A.net) / 2] || 0.4);
      if (k <= 0) { r.cool = 6; if (opt.idle) opt.idle("slow", d); return; }
      cell.fire(d, k, () => { r.cool = opt.gap == null ? 8 : opt.gap; if (opt.unit) opt.unit(d); });
      if (opt.unit) opt.unit(d);
    };
    return r;
  }
  const dirOf = (cell) => { const a = METAL[cell.L.metal].E, c = METAL[cell.R.metal].E; return a < c ? 1 : a > c ? -1 : 0; };
  const statusBox = () => h("div", { class: "gc-status" });

  const steps = [];

  // ---------------------------------------------------------------- 1
  steps.push({
    title: "A reaction that wastes its electrons",
    short: "A wasted reaction",
    newConcepts: [],
    render(el) {
      el.append(style,
        P(`In <em>Oxidation and reduction</em> you dipped a zinc strip into blue copper sulfate solution. Zinc sits above copper in the <em>activity series</em>, so the reaction runs by itself: each zinc atom hands two electrons to a copper ion.`),
        formula(`${f("Zn + Cu^2+ -> Zn^2+ + Cu")}<small>oxidation: ${f("Zn -> Zn^2+ + 2e-")} · reduction: ${f("Cu^2+ + 2e- -> Cu")} · ${f("SO4^2-")} is a spectator</small>`),
        P(`Electrons moving from one place to another is exactly what an electric current is. So this beaker should be a power source. Run it and watch <b>where the electrons actually go</b>.`));
      const cell = makeCell({ L: { metal: "Zn", sol: "Cu" }, seed: 3 });
      const sCu = stat(f("Cu^2+ left (dots)"), "b"), sE = stat("electrons handed over", "y"), sW = stat("…of which through a wire", "r"), sT = stat("temperature (approx.)", "g");
      const msg = statusBox();
      let auto = false;
      const upd = () => {
        const u = 6 - cell.L.count.Cu;
        sCu.set(String(cell.L.count.Cu)); sE.set(fmt.n(2 * DOT * u, 2) + " mol"); sW.set("0 mol");
        sT.set(Math.round(20 + u * (DOT * DH * 1000) / (150 * 4.18)) + " °C");
        msg.innerHTML = u === 0 ? "150 mL of 1 mol/L copper sulfate: 6 dots of Cu²⁺. Nothing has reacted yet."
          : cell.L.count.Cu === 0 ? "All the Cu²⁺ is gone. The solution lost its blue colour, the zinc is coated with copper, and the only thing you got out is <b>warm water</b>."
          : "Each Cu²⁺ touches the zinc, two electrons hop across a gap about one atom wide, and that is the whole journey. The energy comes out as heat.";
      };
      cell.onTick = () => { if (auto && !cell.L.lb) { if (!cell.local(cell.L, upd)) auto = false; else upd(); } };
      el.append(widget("Zinc strip in copper sulfate solution",
        cell.svg, legend(),
        h("div", { class: "btns" },
          h("button", { class: "primary", onclick: () => { cell.local(cell.L, upd); upd(); } }, f("Let one dot of Cu^2+ react")),
          h("button", { onclick: () => { auto = true; } }, "Run until it stops"),
          h("button", { onclick: () => { auto = false; cell.rebuild(); upd(); } }, "Reset")),
        h("div", { class: "readout" }, sCu, sE, sW, sT), msg));
      upd();
      el.append(
        P(`All six dots reacting moves 0.30 mol of electrons and releases about 33 kJ, enough to heat the solution by roughly 50 °C if no heat escapes. But every electron went <b>straight from a zinc atom into the copper ion touching it</b>. None of them passed through anything useful.`),
        takeaway("Zinc gives electrons to copper ions spontaneously, but when the two touch, the electrons take the shortest path and the energy is wasted as heat."));
      return cell.stop;
    },
    check: {
      type: "choice",
      q: "The beaker reaction moves plenty of electrons and releases plenty of energy. Why can it not light a bulb as it stands?",
      options: [
        "The electrons hop directly from zinc to the copper ions touching it, so there is no stretch of their path where a bulb could sit",
        "The reaction is too weak: zinc and copper are too close in the activity series",
        "Copper sulfate solution contains no mobile charges, so nothing can flow",
      ],
      answer: 0,
      wrongHints: {
        1: "It is not weak: it released enough heat to warm the water by tens of degrees. Look at where the electrons travel.",
        2: "The solution is full of mobile ions (it is an electrolyte). The problem is the electrons' path, which is one atom long.",
      },
      why: "The giver and the taker are in contact, so the electrons never leave the metal surface. To use them, we must force them to take a longer route.",
    },
  });

  // ---------------------------------------------------------------- 2
  steps.push({
    title: "Pull the reaction apart: two half-cells",
    short: "Two half-cells",
    newConcepts: ["halfcell", "electrode"],
    render(el) {
      el.append(style,
        P(`The fix is almost rude in its simplicity: <b>do not let zinc metal and copper ions touch</b>. The overall reaction is two <em>half-reactions</em> (from <em>Oxidation and reduction</em>), so give each its own beaker.`),
        P(`Below, the zinc strip stays on the left and a copper strip on the right. You choose which solution each one sits in. Find the arrangement where <b>nothing reacts directly</b>, yet both ingredients of the reaction (zinc metal to give electrons, Cu²⁺ to take them) are present.`));
      const cell = makeCell({ L: { metal: "Zn", sol: "Cu" }, R: { metal: "Cu", sol: "Zn" }, seed: 11 });
      const msg = statusBox();
      let sol = { L: "Cu", R: "Zn" };
      const upd = () => {
        const l = sol.L, r = sol.R;
        msg.innerHTML = l === "Cu"
          ? `Left: zinc is touching Cu²⁺ again, so the electrons hop directly and are wasted, as in step 1.${r === "Zn" ? " Right: copper is below zinc in the activity series, so it does nothing to Zn²⁺." : ""}`
          : r === "Zn" ? "Nothing reacts, but there is no Cu²⁺ anywhere now. Zinc has electrons to give and nobody to take them."
          : "<b>This is it.</b> Nothing reacts directly: zinc sits among its own ions, copper among its own. The giver (Zn) and the taker (Cu²⁺) are both present, in separate beakers.";
      };
      const set = (side, v) => { sol[side] = v; cell.rebuild({ L: { metal: "Zn", sol: sol.L }, R: { metal: "Cu", sol: sol.R } }); upd(); };
      cell.onTick = () => { if (cell.canLocal(cell.L)) cell.local(cell.L); };
      const opts = [["Zn", f("ZnSO4 solution")], ["Cu", f("CuSO4 solution")]];
      el.append(widget("Choose the solution in each beaker",
        toggle("Left (zinc strip) in", opts, "Cu", (v) => set("L", v)),
        toggle("Right (copper strip) in", opts, "Zn", (v) => set("R", v)),
        cell.svg, legend(), msg));
      upd();
      el.append(
        P(`Each beaker in the winning arrangement is a <b>half-cell</b>: a metal in contact with a solution of its own ions, home to one half-reaction. The piece of metal is called an <b>electrode</b>: it is where electrons will enter or leave the solid.`),
        P(`Right now the two half-cells are just two quiet beakers. Zinc still "wants" to give electrons to Cu²⁺, but there is no route between them. That is the point: we get to build the route.`),
        takeaway("A half-cell is one half-reaction in its own container: an electrode (the metal) dipping into a solution of its ions. Separated, the reactants can no longer short-cut."));
      return cell.stop;
    },
    check: {
      type: "choice",
      q: f("In the zinc half-cell (Zn strip in ZnSO4 solution), why does nothing happen on its own?"),
      options: [
        "Zinc atoms could give up electrons, but nothing in that beaker is able to take them",
        "Zinc is not active enough to react",
        "Zinc sulfate solution does not contain ions",
      ],
      answer: 0,
      wrongHints: {
        1: "Zinc is the more active metal here. It reacted eagerly in step 1. What is missing from its beaker now?",
        2: "It does: Zn²⁺ and SO₄²⁻, moving freely. But can either of them take electrons from zinc metal with any net effect?",
      },
      why: "The taker, Cu²⁺, lives in the other beaker. A half-cell holds only half of the reaction.",
      backTo: 0,
    },
  });

  // ---------------------------------------------------------------- 3
  steps.push({
    title: "Connect a wire: anode and cathode",
    short: "Anode and cathode",
    newConcepts: ["anode", "cathode"],
    render(el) {
      el.append(style,
        P(`Metals conduct electrons (<em>electronic conduction</em>, from <em>Ions, salts and electrolytes</em>). So join the two electrodes with a wire and put a bulb in it. Now zinc's electrons have a route to the copper side, and <b>it runs through the bulb</b>.`),
        P(`Connect the wire and watch the first instant in slow motion.`));
      const cell = makeCell({ L: { metal: "Zn", sol: "Zn" }, R: { metal: "Cu", sol: "Cu" }, device: "bulb", seed: 5 });
      const msg = statusBox();
      let swapped = false, fired = false;
      const zn = () => (swapped ? cell.R : cell.L);
      const go = () => {
        if (!cell.wire || fired) return;
        fired = true;
        const d = swapped ? -1 : 1;
        cell.setFlow(d > 0 ? "e⁻ →" : "← e⁻");
        cell.setRoles(d > 0 ? "anode: oxidation" : "cathode: reduction", d > 0 ? "cathode: reduction" : "anode: oxidation");
        msg.innerHTML = `A zinc atom leaves its two electrons in the strip and goes into solution as Zn²⁺. The electrons travel through the wire and the bulb to the copper strip…`;
        cell.fire(d, 0.5, () => { msg.innerHTML = `…where a Cu²⁺ ion picks them up and becomes copper metal on the strip. The zinc electrode is the <b>anode</b>, the copper electrode is the <b>cathode</b>. Then the flow stops almost at once. Why is the next step.`; });
      };
      const reset = () => { fired = false; cell.setRoles("", ""); cell.setFlow(""); };
      const wireT = toggle("Wire", [[0, "not connected"], [1, "connected"]], 0, (v) => {
        if (!v) { cell.rebuild(); reset(); msg.innerHTML = "Two quiet half-cells again."; }
        cell.setWire(!!v); if (v) go();
      });
      el.append(widget("Zinc half-cell and copper half-cell",
        wireT,
        h("div", { class: "btns" }, h("button", { onclick: () => {
          swapped = !swapped;
          cell.rebuild(swapped ? { L: { metal: "Cu", sol: "Cu" }, R: { metal: "Zn", sol: "Zn" } } : { L: { metal: "Zn", sol: "Zn" }, R: { metal: "Cu", sol: "Cu" } });
          reset(); msg.innerHTML = `Beakers swapped: zinc is now on the ${zn() === cell.L ? "left" : "right"}.`; if (cell.wire) go();
        } }, "Swap the two beakers")),
        cell.svg, legend(), msg));
      msg.innerHTML = "Two quiet half-cells. Connect the wire.";
      el.append(
        P(`The two electrodes get names by <b>what happens on them</b>, not by where they stand:`),
        h("ul", {},
          h("li", { html: `<b>Anode</b>: the electrode where <em>oxidation</em> happens. Here ${f("Zn -> Zn^2+ + 2e-")}. Electrons leave the cell from it.` }),
          h("li", { html: `<b>Cathode</b>: the electrode where <em>reduction</em> happens. Here ${f("Cu^2+ + 2e- -> Cu")}. Electrons arrive at it.` })),
        P(`Swap the beakers: the anode moves with the zinc. In the wire, <b>electrons always run from anode to cathode</b>, from the more active metal to the less active one. On a battery, the anode is the terminal marked − and the cathode the one marked +. A memory aid: <i>an ox, red cat</i> (anode oxidation, reduction cathode).`),
        takeaway("Anode = electrode where oxidation happens, electrons leave it. Cathode = electrode where reduction happens, electrons arrive. In the wire: anode → cathode."));
      return cell.stop;
    },
    check: {
      type: "choice",
      q: f("You build a cell from an iron strip in FeSO4 solution and a copper strip in CuSO4 solution. Iron is above copper in the activity series. Which strip is the anode, and which way do electrons move in the wire?"),
      options: [
        "Iron is the anode; electrons move from iron to copper",
        "Copper is the anode; electrons move from copper to iron",
        "Iron is the anode; electrons move from copper to iron",
      ],
      answer: 0,
      wrongHints: {
        1: "The more active metal is the one that gets oxidised. Oxidation happens at the anode.",
        2: "Right electrode, wrong direction: the anode is where electrons are released, so they flow away from it.",
      },
      why: f("Iron is more active, so it is oxidised (Fe -> Fe^2+ + 2e-): that makes it the anode. The electrons it releases travel through the wire to copper, the cathode."),
    },
  });

  // ---------------------------------------------------------------- 4
  steps.push({
    title: "Why the current stops: charge piles up",
    short: "Charge piles up",
    newConcepts: [],
    render(el) {
      el.append(style,
        P(`Every solution you have met so far was electrically neutral: the charges of its <em>cations</em> and <em>anions</em> cancel. Count what one trip of two electrons does to that balance.`),
        P(`The zinc beaker <b>gains</b> a Zn²⁺ ion, with no new negative ion to match it. The copper beaker <b>loses</b> a Cu²⁺ ion and keeps its SO₄²⁻. One beaker turns positive, the other negative. Push electrons across and watch the ledger.`));
      const cell = makeCell({ L: { metal: "Zn", sol: "Zn" }, R: { metal: "Cu", sol: "Cu" }, wire: true, device: "bulb", seed: 9 });
      cell.setRoles("anode", "cathode");
      const msg = statusBox(), tb = h("table", { class: "small" });
      const bar = h("div", {}), barRow = h("div", { class: "gc-barrow" }, h("span", {}, "pull-back from the piled-up charge"), h("div", { class: "gc-bar" }, bar));
      const pushRow = h("div", { class: "gc-barrow" }, h("span", {}, "zinc's push on the electrons"), h("div", { class: "gc-bar" }, h("div", { style: `width:100%;background:${GRN}` })));
      const row = (name, b) => {
        const pos = Object.keys(b.count).filter((k) => ION[k].q > 0 && b.count[k]), neg = Object.keys(b.count).filter((k) => ION[k].q < 0 && b.count[k]);
        const side = (ks) => ks.map((k) => `${b.count[k]} ${ION[k].name}`).join(", ") || "none";
        const sum = (ks) => ks.reduce((a, k) => a + b.count[k] * ION[k].q, 0);
        return `<tr><td>${name}</td><td>${side(pos)} → <b>${signed(sum(pos))}</b></td><td>${side(neg)} → <b>${signed(sum(neg))}</b></td><td class="num"><b style="color:${b.net ? "var(--red)" : "var(--green)"}">${signed(b.net)}</b></td></tr>`;
      };
      const upd = () => {
        tb.innerHTML = "<tr><th>beaker</th><th>positive charge</th><th>negative charge</th><th class='num'>net</th></tr>" + row("zinc (left)", cell.L) + row("copper (right)", cell.R);
        const k = cell.L.net / 2;
        bar.style.cssText = `width:${Math.min(100, (k / 3) * 100)}%;background:${RED}`;
        msg.innerHTML = k === 0 ? "Both beakers are neutral. Nothing holds the electrons back."
          : k < 3 ? `The left beaker is now ${signed(cell.L.net)}, the right one ${signed(cell.R.net)}. The positive left side attracts the electrons that are trying to leave, and the negative right side repels them. Each trip is harder than the last.`
          : "<b>Stuck.</b> The pull-back now matches zinc's push. The electrons stop, the bulb goes dark, and the cell is dead although almost all the zinc and Cu²⁺ are still there.";
      };
      el.append(widget("Wire connected, beakers otherwise isolated",
        cell.svg, legend(),
        h("div", { class: "btns" },
          h("button", { class: "primary", onclick: () => { const k = cell.L.net / 2; if (cell.fire(1, [1, 0.65, 0.4][k] || 0.4, upd)) upd(); else if (!cell.busy) upd(); } }, "Push 2 more electrons across"),
          h("button", { onclick: () => { cell.rebuild(); cell.setRoles("anode", "cathode"); upd(); } }, "Reset")),
        h("div", { class: "tablewrap", style: "margin-top:12px" }, tb), pushRow, barRow, msg));
      upd();
      el.append(
        P(`This picture is a <b>toy scale</b>, so that you can count dots. In a real beaker the flow stalls after an immeasurably small fraction of one dot: separating charge is enormously hard, and the tiniest imbalance is enough to cancel zinc's push.`),
        P(`So a wire alone is not a circuit. Electrons can leave the zinc beaker only if something else <b>restores the charge balance</b> in both solutions at the same time.`),
        takeaway("Moving electrons one way leaves the anode solution positive and the cathode solution negative. That charge build-up stops the flow almost instantly."));
      return cell.stop;
    },
    check: {
      type: "number",
      q: f("A beaker of solution contains 6 Zn^2+ ions and 4 SO4^2- ions (and water). What is its net charge, in units of one electron's charge?"),
      answer: 4, tolerance: 0.01, shown: "+4",
      hint: "Add up the positive charges (6 ions × 2) and the negative charges (4 ions × 2).",
      why: "6 × (+2) + 4 × (−2) = +12 − 8 = +4. Two Zn²⁺ ions have no partner, so the solution is positive.",
    },
  });

  // ---------------------------------------------------------------- 5
  steps.push({
    title: "The salt bridge: ions close the circuit",
    short: "The salt bridge",
    newConcepts: ["bridge"],
    render(el) {
      el.append(style,
        P(`The cure for the charge pile-up cannot be more electrons: electrons do not swim through water. But solutions have their own charge carriers: <b>ions</b> (<em>ionic conduction</em>). We need a path that lets ions pass between the beakers <b>without letting the two solutions mix</b>, or zinc would meet Cu²⁺ again.`),
        P(`The classic answer is a <b>salt bridge</b>: a tube filled with a solution of a salt that takes no part in the reaction, here potassium nitrate, ${f("KNO3")} (ions ${f("K^+")} and ${f("NO3^-")}), plugged so that it does not drain. The cell below is stuck in the state of the last step. Put the bridge in.`));
      const cell = makeCell({ L: { metal: "Zn", sol: "Zn" }, R: { metal: "Cu", sol: "Cu" }, wire: true, device: "bulb", seed: 13 });
      cell.setRoles("anode", "cathode"); cell.setFlow("e⁻ →");
      const msg = statusBox(), sL = stat("net charge, zinc beaker", "r"), sR = stat("net charge, copper beaker", "b"), sU = stat("electrons through the bulb", "y");
      const upd = (why) => {
        sL.set(signed(cell.L.net)); sR.set(signed(cell.R.net)); sU.set(fmt.n(2 * DOT * cell.units, 2) + " mol");
        if (why === "charge") msg.innerHTML = "No bridge: charge has piled up and holds the electrons back. Stuck.";
        else if (why === "ions") msg.innerHTML = "The Cu²⁺ is used up: nothing is left to take electrons. This time the cell stopped because it is <b>finished</b>, not because it is blocked. Press <i>Start over</i> to refill.";
        else if (cell.bridge) msg.innerHTML = `For every Zn²⁺ that enters the left beaker, two ${f("NO3^-")} come out of the bridge to cancel it. For every Cu²⁺ that leaves the right beaker, two ${f("K^+")} come in to replace its charge. Both beakers stay at zero, so the electrons keep flowing.`;
        else msg.innerHTML = "No bridge: each trip of two electrons adds to the charge imbalance, and each trip is slower than the last.";
      };
      runner(cell, { dir: () => 1, idle: upd, unit: () => upd() });
      const br = toggle("Salt bridge", [[0, "out"], [1, "in"]], 0, (v) => { cell.setBridge(!!v); upd(); });
      el.append(widget("Wire connected. Put the salt bridge in, pull it out again",
        br, cell.svg, legend(),
        h("div", { class: "btns" }, h("button", { onclick: () => { cell.rebuild(); cell.setRoles("anode", "cathode"); upd(); } }, "Start over")),
        h("div", { class: "readout" }, sL, sR, sU), msg));
      upd();
      el.append(
        P(`Now there are two paths and two kinds of carrier. <b>Electrons</b> go through the wire. <b>Ions</b> go through the bridge and the solutions. Each electron that leaves the zinc beaker by the wire is balanced by negative charge arriving (or positive charge leaving) through the solution. No electron ever passes through the bridge.`),
        P(`A tube is not the only way. A porous wall between the two solutions does the same job: ions squeeze through its pores, bulk liquid does not. In a battery this part is called the <b>separator</b>.`),
        takeaway("A salt bridge or porous separator lets ions move between the half-cells. That keeps both solutions neutral and lets the electrons keep flowing in the wire."));
      return cell.stop;
    },
    check: {
      type: "choice",
      q: f("One zinc atom dissolves at the anode and its two electrons leave through the wire. What must come out of the KNO3 salt bridge into the zinc beaker to keep that solution neutral?"),
      options: [f("Two NO3^- ions"), f("Two K^+ ions"), "Two electrons"],
      answer: 0,
      wrongHints: {
        1: "The zinc beaker just gained positive charge (a Zn²⁺). More positive ions would make it worse. K⁺ goes to the other beaker.",
        2: "Electrons do not travel through water or through the bridge. In liquids the charge carriers are ions.",
      },
      why: "The new Zn²⁺ carries +2. Two NO₃⁻ (−1 each) cancel it exactly. Meanwhile two K⁺ enter the copper beaker to replace the Cu²⁺ that plated out.",
      backTo: 3,
    },
  });

  // ---------------------------------------------------------------- 6
  steps.push({
    title: "The whole loop: a galvanic cell",
    short: "The galvanic cell",
    newConcepts: ["galvanic", "daniell"],
    render(el) {
      el.append(style,
        P(`Follow the charge all the way round. Negative charge leaves the zinc electrode as electrons, crosses the wire, enters the copper beaker at the cathode, and is carried back through the solutions and the bridge by ions. It is a <b>closed loop</b>, with different carriers on different stretches.`),
        P(`Highlight one kind of carrier at a time, then cut the loop in different places.`));
      const cell = makeCell({ L: { metal: "Zn", sol: "Zn" }, R: { metal: "Cu", sol: "Cu" }, wire: true, bridge: true, device: "bulb", seed: 21 });
      cell.setRoles("anode (−)", "cathode (+)"); cell.setFlow("e⁻ →");
      const msg = statusBox();
      let hl = "all", cut = "none", flat = 0;
      const text = {
        all: "Everything at once: electrons clockwise through the wire, ions completing the loop below.",
        e: "<b>Electrons</b> exist only in the metal parts: zinc strip → wire → bulb → copper strip. They never enter the liquid.",
        cat: `<b>Positive ions (cations)</b> drift towards the <b>cathode</b> side: new Zn²⁺ spreads out from the anode, ${f("K^+")} leaves the bridge into the copper beaker, Cu²⁺ moves to the cathode and plates out.`,
        an: `<b>Negative ions (anions)</b> drift towards the <b>anode</b> side: ${f("NO3^-")} leaves the bridge into the zinc beaker. Inside the cell, negative charge moves right to left, closing the loop the electrons started.`,
      };
      const upd = (why) => {
        msg.innerHTML = cut === "wire" ? "Wire cut: the electrons have no path. Everything stops at once, ions included."
          : cut === "bridge" && why === "charge" ? "Bridge removed: charge piled up, the electrons stopped. A loop cut anywhere is no loop."
          : cut === "bridge" ? "Bridge removed: the ions have no path, and charge is piling up…"
          : text[hl];
      };
      runner(cell, { dir: () => 1, idle: (why) => { if (why === "ions" && ++flat > 12) { flat = 0; cell.rebuild(); cell.setRoles("anode (−)", "cathode (+)"); cell.setHl(hl); } upd(why); }, unit: () => upd() });
      el.append(widget("A running zinc–copper cell (it refills itself when the Cu²⁺ runs out)",
        toggle("Show", [["all", "everything"], ["e", "electrons"], ["cat", "positive ions"], ["an", "negative ions"]], "all", (v) => { hl = v; cell.setHl(v); upd(); }),
        toggle("Cut", [["none", "nothing"], ["wire", "the wire"], ["bridge", "the salt bridge"]], "none", (v) => { cut = v; cell.setWire(v !== "wire"); cell.setBridge(v !== "bridge"); upd(); }),
        cell.svg, legend(), msg));
      upd();
      el.append(
        P(`A device like this, which <b>turns a spontaneous redox reaction into an electric current by making the electrons take an outside path</b>, is a <b>galvanic cell</b> (also called a voltaic cell, after Luigi Galvani and Alessandro Volta). Every battery in the rest of this course is one.`),
        P(`This particular one, zinc in zinc sulfate and copper in copper sulfate, is the <b>Daniell cell</b>, built by John Frederic Daniell in 1836. It powered the early telegraph networks. The chemistry is exactly the reaction of step 1; only the route of the electrons changed.`),
        takeaway("A galvanic cell = two half-cells + a wire for electrons + an ion path. Electrons go anode → cathode outside; anions drift to the anode side and cations to the cathode side inside."));
      return cell.stop;
    },
    check: {
      type: "choice",
      q: "In a running Daniell cell, electrons move through the wire from the zinc side to the copper side. Which way do the negative ions move inside the cell (through the solutions and the bridge)?",
      options: [
        "Towards the zinc (anode) side, completing the loop",
        "Towards the copper (cathode) side, following the electrons",
        "They do not move: only positive ions carry charge in a solution",
      ],
      answer: 0,
      wrongHints: {
        1: "If negative charge went left to right both in the wire and in the liquid, it would pile up on the right. A loop has to come back.",
        2: "Both kinds of ion are mobile and both carry current in a solution. Watch the blue dots leaving the bridge.",
      },
      why: "Negative charge goes zinc → copper in the wire and copper → zinc inside the cell. Anions head for the anode beaker, where new Zn²⁺ needs balancing.",
      backTo: 4,
    },
  });

  // ---------------------------------------------------------------- 7
  steps.push({
    title: "Push and flow: voltage and current",
    short: "Voltage and current",
    newConcepts: ["voltage", "current"],
    render(el) {
      const PAIRS = [["Zn", "Cu"], ["Fe", "Cu"], ["Zn", "Fe"], ["Cu", "Ag"]];
      el.append(style,
        P(`Two different things can be large or small in a cell, and they are easy to mix up.`),
        P(`<b>How hard the cell pushes each electron.</b> That depends on the chemistry: how much more eagerly the anode metal gives electrons than the cathode metal does. This push is the <b>voltage</b>, measured in volts (V) with a voltmeter, an instrument that feels the push while letting almost no electrons through.`),
        P(`<b>How many electrons pass per second.</b> That is the <b>current</b>. It depends on the push <i>and</i> on how easy the outside path is: a thin bulb filament lets few through, a thick wire many.`),
        P(`Think of a waterfall: voltage is its height, current is the litres per second going over it. Try different metal pairs and different things in the wire.`));
      let pair = 0, dev = "meter", flat = 0;
      const cell = makeCell({ L: { metal: "Zn", sol: "Zn" }, R: { metal: "Cu", sol: "Cu" }, wire: true, bridge: true, device: "meter", seed: 17 });
      const sV = stat("push: voltage", "g"), sI = stat("flow: current (toy units)", "y"), msg = statusBox();
      // ladder
      const LW = narrow(460, 380), lad = s("svg", { viewBox: `0 0 ${LW} 96`, width: "100%", style: "display:block;margin:10px auto 0;max-width:640px" });
      const X = (E) => 34 + ((E + 0.9) / 1.85) * (LW - 68);
      const drawLadder = () => {
        lad.innerHTML = "";
        const [a, c] = PAIRS[pair];
        lad.append(s("line", { x1: 20, y1: 56, x2: LW - 20, y2: 56, stroke: "#4a5568", "stroke-width": 2 }));
        const tx = (x, y, str, fill, size, anchor) => { const t = s("text", { x, y, "text-anchor": anchor || "middle", style: `font-size:${size || 12}px;fill:${fill || TEXT};font-weight:600` }); t.textContent = str; lad.append(t); };
        for (const k of ["Zn", "Fe", "Cu", "Ag"]) {
          const on = k === a || k === c;
          lad.append(s("circle", { cx: X(METAL[k].E), cy: 56, r: on ? 9 : 6, fill: on ? METAL[k].col : "#4a5568", stroke: on ? YEL : "none", "stroke-width": 2 }));
          tx(X(METAL[k].E), 78, k, on ? TEXT : MUTED, 13);
        }
        const xa = X(METAL[a].E), xc = X(METAL[c].E);
        lad.append(s("path", { d: `M${xa} 40 V30 H${xc} V40`, fill: "none", stroke: GRN, "stroke-width": 2 }));
        tx((xa + xc) / 2, 22, fmt.n(volts(a, c), 2) + " V", GRN, 14);
        tx(20, 94, "gives electrons easily", MUTED, 10.5, "start"); tx(LW - 20, 94, "holds on to them", MUTED, 10.5, "end");
      };
      const k = () => (dev === "meter" ? 0 : (volts(...PAIRS[pair]) / 1.1) * (dev === "bulb" ? 0.8 : 2.6));
      const upd = () => {
        const [a, c] = PAIRS[pair], v = volts(a, c);
        cell.setMeter(fmt.n(v, 2) + " V");
        sV.set(fmt.n(v, 2) + " V"); sI.set(dev === "meter" ? "≈ 0" : fmt.n(k() * 10, 0));
        cell.setRoles(a + ": anode (−)", c + ": cathode (+)"); cell.setFlow(dev === "meter" ? "" : "e⁻ →");
        msg.innerHTML = dev === "meter" ? `The voltmeter reads the push of this pair: <b>${fmt.n(v, 2)} V</b> (solutions of 1 mol/L, 25 °C). Almost nothing flows, so nothing is used up.`
          : dev === "bulb" ? "A bulb is a hard path: a modest current flows, and the electrons hand their energy to the filament on the way."
          : "A thick wire is an easy path: the same push drives a much larger current. The chemistry runs faster, and the energy just heats the wire and the cell.";
        drawLadder();
      };
      runner(cell, { dir: () => 1, speed: k, gap: 4, idle: (why) => { if (why === "ions" && ++flat > 10) { flat = 0; cell.rebuild(); upd(); } } });
      const setPair = (i) => { pair = i; const [a, c] = PAIRS[i]; cell.rebuild({ L: { metal: a, sol: a }, R: { metal: c, sol: c } }); upd(); };
      el.append(widget("Same cell layout, different metals and different loads",
        toggle("Metals", PAIRS.map(([a, c], i) => [i, `${a} – ${c}`]), 0, setPair),
        toggle("In the wire", [["meter", "voltmeter"], ["bulb", "bulb"], ["short", "thick wire"]], "meter", (v) => { dev = v; cell.setWire(true, v); upd(); }),
        cell.svg, h("div", { class: "readout" }, sV, sI), lad,
        h("div", { class: "note", style: "margin-top:4px" }, "The four metals in activity-series order, spaced by the measured voltages between them."), msg));
      upd();
      el.append(
        P(`Two things to notice. The voltage belongs to the <b>pair of half-cells</b>: the further apart the two metals stand in the <em>activity series</em>, the bigger the push. Swapping the bulb for a thick wire changes the current, not the chemistry's push. And the gaps <b>add up</b> along the line: Zn–Fe (0.32 V) plus Fe–Cu (0.78 V) gives Zn–Cu (1.10 V).`),
        P(`For now, voltage is "push" and current is "flow". What a volt is exactly, and how to count electrons per second, comes in <em>Charge, energy and capacity</em>. Where the numbers on this line come from is the next lesson.`),
        takeaway("Voltage = how hard the cell pushes electrons (set by the pair of half-cells). Current = how many electrons flow per second (set by the push and by how easy the path is)."));
      return cell.stop;
    },
    check: {
      type: "number",
      q: "A Zn–Cu cell reads <b>1.10 V</b> and a Cu–Ag cell reads <b>0.46 V</b>. Silver stands beyond copper on the line. What voltage do you expect from a Zn–Ag cell? (in V)",
      answer: 1.56, tolerance: 0.02, shown: "1.56 V",
      hint: "The gaps add along the line, just as Zn–Fe plus Fe–Cu gave Zn–Cu.",
      why: "1.10 + 0.46 = 1.56 V. Zinc and silver are further apart than either neighbouring pair, so the push is bigger.",
    },
  });

  // ---------------------------------------------------------------- 8
  steps.push({
    title: "Cell notation: a cell in one line",
    short: "Cell notation",
    newConcepts: ["notation"],
    render(el) {
      const PAIRS = [["Zn", "Cu"], ["Fe", "Cu"], ["Cu", "Ag"], ["Zn", "Ag"]];
      el.append(style,
        P(`Drawing two beakers every time gets old. Chemists write a galvanic cell as one line that you read <b>left to right, in the direction the electrons travel</b>: anode first, cathode last.`),
        P(`Click each symbol of the line to see which part of the cell it stands for.`));
      let pair = 0, sel = 0;
      const cell = makeCell({ L: { metal: "Zn", sol: "Zn" }, R: { metal: "Cu", sol: "Cu" }, wire: true, bridge: true, device: "meter", seed: 23 });
      const row = h("div", { class: "gc-tokens" }), msg = statusBox();
      const KEYS = ["Ls", "Lb", "Li", "br", "Ri", "Rb", "Rs"];
      const draw = () => {
        const [a, c] = PAIRS[pair], A = METAL[a], C = METAL[c];
        const toks = [a, "|", A.ion, "||", C.ion, "|", c];
        const info = [
          `<b>${a}</b>: the anode, solid ${A.name}. It is oxidised: ${Chem.half(a, true)}.`,
          `<b>|</b> a single line is a boundary between two phases: here the surface where solid ${A.name} meets the solution.`,
          `<b>${A.ion}</b>: the ions in the anode solution. With the electrode, this is the anode half-cell.`,
          `<b>||</b> a double line is the salt bridge or separator: ions cross, the solutions do not mix.`,
          `<b>${C.ion}</b>: the ions in the cathode solution. They are reduced: ${Chem.half(c)}.`,
          `<b>|</b> phase boundary again: solution meets solid ${C.name}.`,
          `<b>${c}</b>: the cathode, solid ${C.name}, where the new metal plates out.`,
        ];
        row.innerHTML = "";
        toks.forEach((t, i) => row.append(h("button", { type: "button", class: i === sel ? "on" : "", onclick: () => { sel = i; draw(); } }, t)));
        cell.mark(KEYS[sel]); msg.innerHTML = info[sel];
        cell.setMeter(fmt.n(volts(a, c), 2) + " V"); cell.setRoles("anode", "cathode");
      };
      el.append(widget("Click a symbol",
        toggle("Cell", PAIRS.map(([a, c], i) => [i, `${a} – ${c}`]), 0, (i) => { pair = i; const [a, c] = PAIRS[i]; cell.rebuild({ L: { metal: a, sol: a }, R: { metal: c, sol: c } }); draw(); }),
        row, cell.svg, msg));
      draw();
      el.append(
        formula(`<span class="bl">Zn | Zn²⁺</span> <span class="hl">||</span> <span class="bl">Cu²⁺ | Cu</span><small>anode half-cell (oxidation) · salt bridge · cathode half-cell (reduction)</small>`),
        P(`The rules: anode half-cell on the left, cathode half-cell on the right, <code>|</code> between two phases, <code>||</code> for the ion bridge. Spectator ions such as SO₄²⁻ are left out. A fuller version adds states and concentrations: <code>Zn(s) | Zn²⁺(aq, 1 mol/L) || Cu²⁺(aq, 1 mol/L) | Cu(s)</code>, where (s) means solid and (aq) dissolved in water.`),
        P(`Reading it back gives you everything: Zn is oxidised to Zn²⁺, electrons go from Zn to Cu through the wire, Cu²⁺ is reduced to Cu.`),
        takeaway("Cell notation: anode | anode solution || cathode solution | cathode. A single line is a phase boundary, the double line is the salt bridge. Electrons travel from the left end to the right end."));
      return cell.stop;
    },
    check: {
      type: "choice",
      q: f("A cell runs on the reaction Fe + 2Ag^+ -> Fe^2+ + 2Ag. Which line describes it?"),
      options: [f("Fe | Fe^2+ || Ag^+ | Ag"), f("Ag | Ag^+ || Fe^2+ | Fe"), f("Fe | Ag^+ || Fe^2+ | Ag")],
      answer: 0,
      wrongHints: {
        1: "That puts silver on the left, as the anode. In the reaction it is iron that loses electrons, so iron is the anode.",
        2: "Each electrode sits in a solution of its own ions. Iron touching Ag⁺ would be the direct, wasted reaction of step 1.",
      },
      why: "Iron is oxidised (Fe → Fe²⁺ + 2e⁻), so the iron half-cell is the anode and goes on the left. Ag⁺ is reduced to Ag on the right.",
      backTo: 2,
    },
  });

  // ---------------------------------------------------------------- 9
  steps.push({
    title: "Capstone: run a Daniell cell, then break it",
    short: "Capstone: break the cell",
    newConcepts: [],
    render(el) {
      el.append(style,
        P(`Here is the complete cell, with scales under both electrodes. Each half-cell holds 150 mL of 1 mol/L solution of its own metal's salt, and each electrode starts at ${M0} g. It runs as long as it can.`),
        P(`Break it in every way you can think of: open the wire, pull the bridge, short-circuit it, swap the metals, put the same metal on both sides.`));
      let Lm = "Zn", Rm = "Cu", wire = "bulb";
      const cell = makeCell({ L: { metal: Lm, sol: Lm }, R: { metal: Rm, sol: Rm }, wire: true, bridge: true, device: "bulb", seed: 31 });
      const sML = stat("left electrode", "b"), sMR = stat("right electrode", "b"), sE = stat("electrons through the wire", "y"), sV = stat("push when fresh", "g");
      const note = h("div", { class: "formula", style: "margin:12px 0 0" }), msg = statusBox();
      const mass = (b) => M0 - b.lost * DOT * METAL[b.metal].mass * (2 / METAL[b.metal].n) + b.gl * DOT * METAL[b.sol].mass * (2 / METAL[b.sol].n);
      const upd = (why) => {
        const d = dirOf(cell), A = d > 0 ? cell.L : cell.R, C = d > 0 ? cell.R : cell.L;
        sML.setLabel(`left electrode (${Lm})`); sMR.setLabel(`right electrode (${Rm})`);
        sML.set(fmt.n(mass(cell.L), 2) + " g"); sMR.set(fmt.n(mass(cell.R), 2) + " g");
        sE.set(fmt.n(2 * DOT * cell.units, 2) + " mol");
        if (!d) {
          sV.set("0 V"); note.innerHTML = `<small>no cell: both half-cells are identical</small>`; cell.setRoles("", ""); cell.setFlow("");
          msg.innerHTML = "The same metal on both sides: neither electrode gives electrons more eagerly than the other. No push, no current, however good the wire and the bridge.";
          return;
        }
        const a = A.metal, c = C.metal;
        sV.set(fmt.n(volts(a, c), 2) + " V");
        note.innerHTML = `${notation(a, c)}<small>${Chem.half(a, true)} at the anode · ${Chem.half(c)} at the cathode${METAL[c].n === 1 ? " (twice per anode atom)" : ""}</small>`;
        cell.setRoles(d > 0 ? "anode (−)" : "cathode (+)", d > 0 ? "cathode (+)" : "anode (−)");
        const running = !why || why === "run";
        cell.setFlow(running && cell.wire ? (d > 0 ? "e⁻ →" : "← e⁻") : "");
        msg.innerHTML = why === "wire" ? `The wire is open. The push of ${fmt.n(volts(a, c), 2)} V is still there, but the electrons have no path, so nothing reacts and no mass changes. This is a battery on the shelf.`
          : why === "charge" ? `No salt bridge: the ${METAL[a].name} beaker has gone positive (${signed(A.net)}) and the ${METAL[c].name} beaker negative (${signed(C.net)}). The charge build-up cancels the push. Put the bridge back and the backlog of ions clears at once.`
          : why === "ions" ? `All the ${METAL[c].ion} has plated out: nothing is left to take electrons. The cell is flat. ${c === "Ag" ? "Each Ag⁺ takes only one electron, so the silver solution is used up twice as fast as a Cu²⁺ solution. " : ""}Press <i>Fresh cell</i>.`
          : why === "metal" ? `The ${METAL[a].name} anode is almost eaten away. Press <i>Fresh cell</i>.`
          : !cell.bridge ? "Bridge out: charge is piling up, and every trip of the electrons is slower than the last…"
          : wire === "short" ? `<b>Short circuit.</b> No bulb, just a thick wire: the current is as large as the ions can keep up with. The ${METAL[a].name} dissolves fast, and all the energy turns into heat, as in step 1 but by the long route.`
          : `${a} is more active than ${c}, so ${a} is the anode: it dissolves and loses mass. The ${c} cathode gains mass as ${METAL[c].ion} plates out. ${cell.L.metal === a ? "Electrons flow left to right." : "Electrons flow right to left: the anode is defined by the chemistry, not by the side."}`;
      };
      runner(cell, { dir: () => dirOf(cell), speed: () => (wire === "short" ? 2.8 : 0.9), gap: 6, idle: (why) => upd(why), unit: () => upd("run") });
      const fresh = () => { cell.rebuild({ L: { metal: Lm, sol: Lm }, R: { metal: Rm, sol: Rm } }); upd(); };
      const mopts = ["Zn", "Fe", "Cu", "Ag"].map((k) => [k, k]);
      el.append(widget("Daniell cell and its relatives",
        toggle("Left metal", mopts, Lm, (v) => { Lm = v; fresh(); }),
        toggle("Right metal", mopts, Rm, (v) => { Rm = v; fresh(); }),
        toggle("Wire", [["open", "open"], ["bulb", "through a bulb"], ["short", "short circuit"]], "bulb", (v) => { wire = v; cell.setWire(v !== "open", v === "short" ? "short" : "bulb"); upd(v === "open" ? "wire" : null); }),
        toggle("Salt bridge", [[1, "in"], [0, "out"]], 1, (v) => { cell.setBridge(!!v); upd(); }),
        cell.svg, legend(),
        h("div", { class: "btns" }, h("button", { class: "primary", onclick: fresh }, "Fresh cell")),
        h("div", { class: "readout" }, sML, sMR, sE, sV), note, msg));
      upd();
      el.append(
        P(`What to look for, each from an earlier step:`),
        h("ul", {},
          h("li", { html: `<b>Masses.</b> One dot is ${DOT} mol. Each dot of zinc that dissolves takes ${fmt.n(DOT * METAL.Zn.mass, 2)} g off the anode (${DOT} mol × ${METAL.Zn.mass} g/mol, <em>molar mass</em> from <em>Ions, salts and electrolytes</em>) and sends ${2 * DOT} mol of electrons through the wire; the copper they reduce adds ${fmt.n(DOT * METAL.Cu.mass, 2)} g to the cathode.` }),
          h("li", { html: `<b>Open wire</b> or <b>bridge out</b>: the loop of step 6 is cut, so the chemistry stops. The reactants are saved, not lost.` }),
          h("li", { html: `<b>Short circuit</b>: same reaction, same total electrons, but fast and with nothing useful in the path (steps 1 and 7).` }),
          h("li", { html: `<b>Swap the metals</b>: the more active metal is always the anode (step 3), and the further apart the pair, the bigger the push (step 7). Zn–Ag pushes hardest; Cu–Cu does nothing.` }),
          h("li", { html: `<b>The blue colour</b> of a copper solution fades as Cu²⁺ is used up. In this toy the push is shown for a fresh cell only; in a real one it sags as the ions run low, which is the subject of <em>Concentration and the Nernst equation</em>.` })),
        takeaway("A galvanic cell is a spontaneous redox reaction with its two halves separated: electrons take the wire from anode to cathode, ions close the loop, and the chemistry decides the push."));
      return cell.stop;
    },
  });

  Course.run({
    id: "galvanic-cell",
    section: "2. The galvanic cell",
    title: "The galvanic cell: making electrons take the wire",
    concepts: {
      halfcell: "half-cell", electrode: "electrode", anode: "anode (oxidation)", cathode: "cathode (reduction)",
      bridge: "salt bridge / separator", galvanic: "galvanic (voltaic) cell", daniell: "Daniell cell",
      voltage: "voltage (push)", current: "current (flow)", notation: "cell notation",
    },
    sources: [
      { title: "OpenStax, Chemistry 2e, §17.2 Galvanic Cells", url: "https://openstax.org/books/chemistry-2e/pages/17-2-galvanic-cells", note: "half-cells, anode/cathode, salt bridge, cell notation conventions" },
      { title: "OpenStax, Chemistry 2e, Appendix L: Standard Electrode (Half-Cell) Potentials", url: "https://openstax.org/books/chemistry-2e/pages/l-standard-electrode-half-cell-potentials", note: "the potentials behind the voltages shown (taken from assets/chem.js): Zn −0.76, Fe −0.44, Cu +0.34, Ag +0.80 V" },
      { title: "OpenStax, Chemistry 2e, Appendix G: Standard Thermodynamic Properties", url: "https://openstax.org/books/chemistry-2e/pages/g-standard-thermodynamic-properties-for-selected-substances", note: "enthalpies of formation of Zn²⁺(aq) and Cu²⁺(aq): the direct reaction releases about 219 kJ per mole" },
      { title: "Wikipedia: Daniell cell", url: "https://en.wikipedia.org/wiki/Daniell_cell", note: "J. F. Daniell, 1836; about 1.1 V; use in telegraphy; porous-pot separator" },
      { title: "Wikipedia: Galvanic cell", url: "https://en.wikipedia.org/wiki/Galvanic_cell", note: "terminology (galvanic / voltaic), direction of electron and ion flow" },
      { title: "Wikipedia: Salt bridge", url: "https://en.wikipedia.org/wiki/Salt_bridge", note: "inert electrolytes such as KNO₃ used in the bridge" },
    ],
    steps,
  });
})();
