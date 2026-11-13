// Lesson 3.5: Real batteries: resistance, rate and energy density
(function () {
  const { h, s, fmt, widget, stat, slider, plot, toggle, hbars, narrow } = Course;
  const f = Chem.f;
  const YEL = "#ffd166", BLUE = "#6cb4ff", RED = "#ff6b6b", GRN = "#5fd38d", PUR = "#c3a6ff", GREY = "#9aa3b5";
  const P = (html) => h("p", { html });
  const takeaway = (html) => h("div", { class: "takeaway", html });
  const formula = (html) => h("div", { class: "formula", html });
  const note = (html) => h("div", { class: "note", html, style: "margin-top:8px" });
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // ---------------------------------------------------------------- formatting
  const volts = (v, d = 2) => v.toFixed(d) + " V";
  const amps = (a) => (a < 0.1 ? a.toFixed(2) : a < 10 ? a.toFixed(1) : a.toFixed(0)) + " A";
  const watts = (w) => (w < 10 ? w.toFixed(2) : w < 100 ? w.toFixed(1) : w.toFixed(0)) + " W";
  const ohms = (r) => (r < 1 ? r.toFixed(3) : r < 10 ? r.toFixed(2) : r.toFixed(1)) + " Ω";
  const big = (x) => (x >= 100 ? Math.round(x).toLocaleString("en-US") : x >= 10 ? x.toFixed(1) : x.toFixed(2));
  function fmtTime(hr) {
    if (!isFinite(hr) || hr <= 0) return "0 s";
    if (hr >= 1.5) return (hr < 10 ? hr.toFixed(1) : hr.toFixed(0)) + " h";
    const m = hr * 60;
    if (m >= 1.5) return (m < 10 ? m.toFixed(1) : m.toFixed(0)) + " min";
    return (m * 60).toFixed(0) + " s";
  }

  // ---------------------------------------------------------------- the running example
  // One cylindrical Li-ion cell of the common 18650 size. Typical rounded figures (not one specific product).
  const CELL = { E: 3.60, r: 0.05, Q: 3.0, m: 0.046, vol: 0.0165 }; // V, Ω, Ah, kg, L

  // Four typical cells for the later steps. Rounded, typical figures; r, the OCV curve shapes and the
  // "reach" coefficient b are a simplified model, not manufacturer data.
  //   ocv(x): resting voltage at depth of discharge x (0 = full, 1 = empty)
  //   b: at C-rate c only the fraction 1 / (1 + b c) of the material is reached before the voltage collapses
  const CHEM = {
    pb: { key: "pb", name: "Lead–acid", unit: "one 2 V cell of a sealed 12 V, 7 Ah block", E: 2.0, Q: 7.0, m: 0.37, vol: 0.153, r: 0.004, cut: 1.75, b: 0.6, maxC: 3, color: GREY,
      ocv: (x) => 2.12 - 0.17 * x - 0.25 * Math.exp(-(1 - x) * 30) },
    nimh: { key: "nimh", name: "NiMH", unit: "one AA cell", E: 1.2, Q: 2.0, m: 0.027, vol: 0.0083, r: 0.025, cut: 1.0, b: 0.05, maxC: 3, color: GRN,
      ocv: (x) => 1.25 + 0.08 * (1 - x) + 0.07 * Math.exp(-x * 15) - 0.35 * Math.exp(-(1 - x) * 25) },
    li: { key: "li", name: "Li-ion (layered oxide)", unit: "one 18650 cell (our running example)", E: CELL.E, Q: CELL.Q, m: CELL.m, vol: CELL.vol, r: CELL.r, cut: 2.5, b: 0.02, maxC: 3, color: YEL,
      ocv: (x) => 3.3 + 0.85 * (1 - x) + 0.05 * Math.exp(-x * 20) - 0.8 * Math.exp(-(1 - x) * 30) },
    lfp: { key: "lfp", name: "Li-ion (LFP)", unit: "one 18650 cell", E: 3.2, Q: 1.5, m: 0.040, vol: 0.0165, r: 0.02, cut: 2.5, b: 0.02, maxC: 5, color: BLUE,
      ocv: (x) => 3.22 + 0.08 * (1 - x) + 0.15 * Math.exp(-x * 25) - 0.8 * Math.exp(-(1 - x) * 30) },
  };
  const CHEMS = [CHEM.pb, CHEM.nimh, CHEM.li, CHEM.lfp];

  // constant-current discharge of one cell: V = OCV(x) − I r, stop at the cut-off voltage
  function discharge(c, I) {
    const u = 1 / (1 + (c.b * I) / c.Q), N = 300, pts = [];
    let ah = 0, wh = 0, heat = 0;
    for (let k = 0; k <= N; k++) {
      const x = k / N, v = c.ocv(x) - I * c.r;
      if (v < c.cut) break;
      pts.push([x * u * c.Q, v]);
      if (k) { const dq = (u * c.Q) / N; ah += dq; wh += dq * v; heat += dq * I * c.r; }
    }
    return { pts, ah, wh, heat, t: ah / I };
  }
  // constant-power discharge of an s × p pack (power P in watts at the pack terminals)
  function runPack(c, sN, pN, Pw) {
    const pc = Pw / (sN * pN), N = 240, pts = [];
    let t = 0, ah = 0, wh = 0, heat = 0, i0 = 0, v0 = 0, collapsed = false;
    for (let k = 0; k <= N; k++) {
      const x = k / N, e = c.ocv(x), disc = e * e - 4 * c.r * pc;
      if (disc < 0) { collapsed = k === 0; break; }
      const i = (e - Math.sqrt(disc)) / (2 * c.r), v = e - i * c.r;
      if (v < c.cut) { collapsed = k === 0; break; }
      if (k === 0) { i0 = i; v0 = v; }
      else { const dq = c.Q / (1 + (c.b * i) / c.Q) / N; t += dq / i; ah += dq; wh += dq * v; heat += dq * i * c.r; }
      pts.push([t, v * sN]);
    }
    return { pts, t, ah: ah * pN, wh: wh * sN * pN, heat: heat * sN * pN, i0, v0, ocv0: c.ocv(0), collapsed };
  }

  // theoretical specific energies (active materials only), from Chem.E0 and molar masses
  const M = (sym) => Chem.elements[sym].mass;
  const TH = (() => {
    const mPb = M("Pb") + (M("Pb") + 2 * M("O")) + 2 * (2 * M("H") + M("S") + 4 * M("O"));
    const ePb = Chem.E0by.PbO2.E - Chem.E0by.PbSO4.E;
    const M_LA = 138.91; // lanthanum (not in Chem.elements)
    const mNi = (M_LA + 5 * M("Ni") + 6 * M("H")) + 6 * (M("Ni") + 2 * M("O") + M("H"));
    const eNi = Chem.E0by.NiOOH.E - Chem.E0by["H2O/H2"].E;
    const mLi = 2 * (0.5 * M("Li") + M("Co") + 2 * M("O")) + (M("Li") + 6 * M("C"));
    return {
      pb: { cap: Chem.capacity(2, mPb), E: ePb, wh: Chem.capacity(2, mPb) * ePb },
      nimh: { cap: Chem.capacity(6, mNi), E: eNi, wh: Chem.capacity(6, mNi) * eNi },
      li: { cap: Chem.capacity(1, mLi), E: 3.8, wh: Chem.capacity(1, mLi) * 3.8 },
    };
  })();

  // ---------------------------------------------------------------- drawing: one cell, a wire, a load, a voltmeter
  const T = (x, y, txt, style, anchor) => { const t = s("text", { x, y, "text-anchor": anchor || "middle", style: style || "" }); t.textContent = txt; return t; };
  function circuitView() {
    const W = narrow(520, 360), H = 238;
    const svg = s("svg", { viewBox: `0 0 ${W} ${H}`, width: "100%", style: "max-width:560px;display:block;margin:0 auto" });
    const cx0 = narrow(50, 14), cw = narrow(260, 212), cy0 = 112, chh = 84, ew = 46;
    const xL = cx0 + ew / 2 + 4, xR = cx0 + cw - ew / 2 - 4, yTop = 36;
    svg.append(s("rect", { x: cx0, y: cy0, width: cw, height: chh, rx: 10, fill: "#1d2330", stroke: "#4a5568", "stroke-width": 1.5 }));
    const glow = s("rect", { x: cx0, y: cy0, width: cw, height: chh, rx: 10, fill: RED, opacity: 0 });
    svg.append(glow);
    svg.append(s("rect", { x: cx0 + 6, y: cy0 + 8, width: ew - 4, height: chh - 16, rx: 4, fill: "#566074" }));
    svg.append(s("rect", { x: cx0 + cw - ew - 2, y: cy0 + 8, width: ew - 4, height: chh - 16, rx: 4, fill: "#6d5a8c" }));
    svg.append(T(cx0 + 4 + ew / 2, cy0 + chh / 2 + 5, "−", "fill:#e6e9ef;font-size:20px;font-weight:700"));
    svg.append(T(cx0 + cw - ew / 2 - 4, cy0 + chh / 2 + 6, "+", "fill:#e6e9ef;font-size:20px;font-weight:700"));
    svg.append(T(cx0 + 4, cy0 + chh + 15, "graphite (anode)", "fill:#9aa3b5;font-size:11px", "start"));
    svg.append(T(cx0 + cw - 4, cy0 + chh + 15, "oxide (cathode)", "fill:#9aa3b5;font-size:11px", "end"));
    svg.append(T(cx0 + cw / 2, cy0 + 15, "electrolyte", "fill:#9aa3b5;font-size:10.5px"));
    const rLabel = T(cx0 + cw / 2, cy0 + chh - 7, "", "fill:#e6e9ef;font-size:11px");
    svg.append(rLabel);
    const wire = s("path", { d: `M${xL},${cy0} L${xL},${yTop} L${xR},${yTop} L${xR},${cy0}`, fill: "none", stroke: "#9aa3b5", "stroke-width": 2 });
    svg.append(wire);
    const segs = [[xL, cy0, xL, yTop], [xL, yTop, xR, yTop], [xR, yTop, xR, cy0]];
    const lens = segs.map((g) => Math.hypot(g[2] - g[0], g[3] - g[1])), Ltot = lens.reduce((a, b) => a + b, 0);
    const at = (t) => { let d = t * Ltot; for (let k = 0; k < 3; k++) { if (d <= lens[k] || k === 2) { const q = d / lens[k], g = segs[k]; return [g[0] + (g[2] - g[0]) * q, g[1] + (g[3] - g[1]) * q]; } d -= lens[k]; } };
    const NE = 8, NI = 6;
    const es = Array.from({ length: NE }, (_, i) => { const c = s("circle", { r: 4, fill: YEL }); svg.append(c); return { c, t: i / NE }; });
    const ix0 = cx0 + ew + 8, ix1 = cx0 + cw - ew - 8;
    const ions = Array.from({ length: NI }, (_, i) => { const c = s("circle", { r: 4.5, fill: RED }); svg.append(c); return { c, t: (i * 0.37) % 1, y: cy0 + 26 + ((i * 17) % 40) }; });
    const lw = narrow(120, 104), lx = (xL + xR) / 2;
    svg.append(s("rect", { x: lx - lw / 2, y: yTop - 16, width: lw, height: 32, rx: 7, fill: "#252c3a", stroke: "#4a5568", "stroke-width": 1.5 }));
    const loadT = T(lx, yTop + 5, "", "fill:#e6e9ef;font-size:12.5px");
    svg.append(loadT);
    const vx = cx0 + cw + narrow(26, 12), vw = Math.min(150, W - vx - 6);
    svg.append(s("rect", { x: vx, y: cy0 + 4, width: vw, height: 64, rx: 8, fill: "#10141c", stroke: YEL, "stroke-width": 1.5 }));
    svg.append(T(vx + vw / 2, cy0 + 22, "voltmeter", "fill:#9aa3b5;font-size:11px"));
    const vT = T(vx + vw / 2, cy0 + 52, "", "fill:" + YEL + ";font-size:" + narrow(22, 19) + "px;font-family:var(--mono)");
    svg.append(vT);
    svg.append(s("circle", { cx: cx0 + 6, cy: H - 9, r: 4, fill: YEL }), T(cx0 + 15, H - 5, "e⁻ in the wire, − to +", "fill:#9aa3b5;font-size:11px", "start"));
    svg.append(s("circle", { cx: cx0 + narrow(170, 150), cy: H - 9, r: 4.5, fill: RED }), T(cx0 + narrow(180, 160), H - 5, "Li⁺ inside, anode to cathode", "fill:#9aa3b5;font-size:11px", "start"));
    let speed = 0, timer = null;
    const place = () => {
      es.forEach((e) => { const [x, y] = at(e.t); e.c.setAttribute("cx", x); e.c.setAttribute("cy", y); e.c.setAttribute("opacity", speed ? 1 : 0); });
      ions.forEach((o) => { o.c.setAttribute("cx", ix0 + (ix1 - ix0) * o.t); o.c.setAttribute("cy", o.y); o.c.setAttribute("opacity", speed ? 1 : 0.45); });
    };
    const tick = () => {
      es.forEach((e) => (e.t = (e.t + speed) % 1)); ions.forEach((o) => (o.t = (o.t + speed * 1.4) % 1));
      place(); timer = setTimeout(tick, 33);
    };
    svg.set = ({ I, V, load, heat = 0, r, d = 2 }) => {
      speed = I > 0 ? 0.0015 + 0.008 * clamp(Math.log10(1 + I) / 1.9, 0, 1) : 0;
      vT.textContent = volts(V, d); loadT.textContent = load || "";
      glow.setAttribute("opacity", clamp(heat, 0, 0.75));
      rLabel.textContent = r != null ? narrow("internal resistance r = ", "r = ") + ohms(r) : "";
      wire.setAttribute("stroke-dasharray", I > 0 ? "" : "4 5");
      place();
    };
    svg.stop = () => clearTimeout(timer);
    place(); tick();
    return svg;
  }

  // ---------------------------------------------------------------- drawing: a pack of s × p cells
  function packView() {
    const W = narrow(520, 360);
    const svg = s("svg", { viewBox: `0 0 ${W} 80`, width: "100%", style: "max-width:560px;display:block;margin:0 auto" });
    svg.draw = ({ sN, pN, color = YEL, level = 1, heat = 0 }) => {
      const ch = pN > 5 ? 11 : pN > 3 ? 15 : 20, gap = pN > 5 ? 4 : 7, top = 12, pad = 30;
      const colW = Math.min(74, (W - 2 * pad) / sN), cwid = colW * 0.66, x0 = (W - colW * sN) / 2;
      const Hh = top * 2 + pN * ch + (pN - 1) * gap;
      svg.setAttribute("viewBox", `0 0 ${W} ${Hh}`); svg.innerHTML = "";
      const ymid = (j) => top + j * (ch + gap) + ch / 2;
      for (let k = 0; k <= sN; k++) {
        const xb = x0 + colW * k;
        if (pN > 1) svg.append(s("line", { x1: xb, x2: xb, y1: ymid(0), y2: ymid(pN - 1), stroke: "#9aa3b5", "stroke-width": 1.5 }));
      }
      for (let k = 0; k < sN; k++) for (let j = 0; j < pN; j++) {
        const xb = x0 + colW * k, xc = xb + (colW - cwid) / 2, y = top + j * (ch + gap);
        svg.append(s("line", { x1: xb, x2: xb + colW, y1: ymid(j), y2: ymid(j), stroke: "#9aa3b5", "stroke-width": 1.5 }));
        svg.append(s("rect", { x: xc, y, width: cwid, height: ch, rx: 3, fill: "#1d2330", stroke: "#4a5568", "stroke-width": 1 }));
        if (level > 0.005) svg.append(s("rect", { x: xc + 1, y: y + 1, width: Math.max(0, (cwid - 2) * level), height: ch - 2, rx: 2, fill: color, opacity: 0.85 }));
        if (heat > 0.01) svg.append(s("rect", { x: xc, y, width: cwid, height: ch, rx: 3, fill: RED, opacity: clamp(heat, 0, 0.8) }));
        svg.append(s("rect", { x: xc + cwid, y: y + ch * 0.28, width: Math.max(1.5, cwid * 0.07), height: ch * 0.44, fill: "#9aa3b5" }));
      }
      svg.append(T(x0 - 14, ymid((pN - 1) / 2) + 6, "−", "fill:#e6e9ef;font-size:18px;font-weight:700"));
      svg.append(T(x0 + colW * sN + 14, ymid((pN - 1) / 2) + 6, "+", "fill:#e6e9ef;font-size:18px;font-weight:700"));
    };
    return svg;
  }
  // filled band between two curves on a plot
  function band(pl, top, bot, color, opacity = 0.3) {
    if (top.length < 2) return;
    const d = "M" + top.map((p) => pl.X(p[0]).toFixed(1) + "," + pl.Y(p[1]).toFixed(1)).join("L") + "L" + bot.slice().reverse().map((p) => pl.X(p[0]).toFixed(1) + "," + pl.Y(p[1]).toFixed(1)).join("L") + "Z";
    pl.layer.append(s("path", { d, fill: color, "fill-opacity": opacity, stroke: "none" }));
  }
  // two-part horizontal bar (HTML)
  function splitBar(labels, colors) {
    const a = h("div", { style: `background:${colors[0]};height:100%;display:flex;align-items:center;justify-content:center;color:#10141c;font-size:12px;font-weight:600;white-space:nowrap;overflow:hidden` });
    const b = h("div", { style: `background:${colors[1]};height:100%;flex:1;display:flex;align-items:center;justify-content:center;color:#10141c;font-size:12px;font-weight:600;white-space:nowrap;overflow:hidden` });
    const box = h("div", { style: "display:flex;height:26px;border-radius:6px;overflow:hidden;margin-top:12px;background:var(--panel2)" }, a, b);
    box.set = (frac, ta, tb) => { a.style.width = clamp(frac, 0, 1) * 100 + "%"; a.textContent = frac > 0.22 ? ta : ""; b.textContent = frac < 0.78 ? tb : ""; };
    return box;
  }

  const steps = [];

  // ---------------------------------------------------------------- 1
  steps.push({
    title: "The voltage you compute and the voltage you get",
    short: "Voltage under load",
    newConcepts: ["ocv", "sag"],
    render(el) {
      el.append(
        P("Every voltage in this course so far, from <em>E°cell</em> (<em>Electrode potentials</em>) to the <em>Nernst equation</em>, was for a cell that is doing nothing: a voltmeter on its terminals and practically no current. This lesson is about what happens when you make the cell work."),
        P("The running example is one cylindrical Li-ion cell of the common “18650” size (18 mm across, 65 mm long), the kind inside laptop packs and e-bikes: graphite anode, layered-oxide cathode, the <em>rocking-chair</em> cell from <em>Lithium</em>. Typical rounded figures: 3.0 Ah, 46 g. Ours is partly discharged and rests at <b>3.60 V</b>."),
        P("Connect something to it and watch the voltmeter.")
      );
      const DEV = [
        { name: "nothing", I: 0, d: 3 }, { name: "small LED", I: 0.02, d: 3 }, { name: "torch", I: 1, d: 3 }, { name: "power drill", I: 10, d: 3 },
      ];
      const view = circuitView();
      const sI = stat("current drawn", "y"), sV = stat("voltmeter reads", "b"), sD = stat("missing vs resting", "r");
      const tb = h("table", { class: "small" });
      const seen = [true, false, false, false];
      const drawTable = () => {
        tb.innerHTML = "<tr><th>connected</th><th class='num'>current</th><th class='num'>reading</th><th class='num'>missing</th></tr>";
        DEV.forEach((dv, i) => {
          const V = CELL.E - dv.I * CELL.r;
          tb.append(h("tr", {}, h("td", {}, dv.name), h("td", { class: "num" }, amps(dv.I)),
            h("td", { class: "num" }, seen[i] ? volts(V, 3) : "?"), h("td", { class: "num" }, seen[i] ? (dv.I * CELL.r * 1000).toFixed(0) + " mV" : "?")));
        });
      };
      const pick = (i) => {
        const dv = DEV[i], V = CELL.E - dv.I * CELL.r;
        seen[i] = true;
        view.set({ I: dv.I, V, load: dv.I ? dv.name : "nothing connected", d: 3 });
        sI.set(amps(dv.I)); sV.set(volts(V, 3)); sD.set((dv.I * CELL.r * 1000).toFixed(0) + " mV");
        drawTable();
      };
      const tg = toggle("Connect:", DEV.map((d, i) => [i, d.name]), 0, pick);
      el.append(widget("One Li-ion cell, a voltmeter, and something to power", tg, view, h("div", { class: "readout" }, sI, sV, sD), h("div", { style: "margin-top:12px" }, tb)));
      pick(0);
      el.append(
        P("The reading with nothing connected is the <b>open-circuit voltage</b>: the circuit is open, no current flows, and the terminals show exactly what the chemistry says (E° corrected by Nernst). The moment current flows, the terminals show <b>less</b>. That lower number is the <b>voltage under load</b>, and the drop is often called <em>sag</em>."),
        P("The cell has not lost charge in the half second it took to connect the drill. Disconnect it and the reading jumps back to 3.60 V. Something inside the cell eats voltage <b>only while current flows</b>, and it eats more the harder you pull."),
        takeaway("Open-circuit voltage is what the chemistry promises at zero current. Under load the terminals show less, and the gap grows with the current.")
      );
      return () => view.stop();
    },
    check: {
      type: "number", q: "At <b>1 A</b> the reading is 0.05 V below the resting voltage. At <b>10 A</b> it is 0.50 V below. What drop do you expect at <b>4 A</b>? (in volts)",
      answer: 0.2, tolerance: 0.011, shown: "0.20",
      hint: "Ten times the current gave ten times the drop. So the drop is a fixed number of volts per ampere.",
      why: "0.20 V. The drop is proportional to the current: 0.05 V for every ampere. That constant gets a name in the next step.",
    },
  });

  // ---------------------------------------------------------------- 2
  steps.push({
    title: "Internal resistance: V = E − I·r",
    short: "Internal resistance",
    newConcepts: ["resistance", "rint"],
    render(el) {
      el.append(
        P("Why would a cell lose voltage in proportion to the current? Because the current has to squeeze through the cell itself. Electrons pass through thin metal foils and grains of electrode material. Li⁺ ions push through the <em>electrolyte</em> and the pores of the separator (<em>ionic conduction</em>, from <em>Ions, salts and electrolytes</em>). None of that is free."),
        P("The measure of “how hard is it to push current through this” is <b>resistance</b>: the volts of push needed per ampere of flow. Its unit is the ohm: <b>1 Ω = 1 volt per ampere</b>. Our cell lost 0.05 V per ampere, so everything inside it adds up to 0.05 Ω. That lumped number is the cell's <b>internal resistance</b>, written r."),
        formula('<span class="hl">V</span> = <span class="bl">E</span> − I · r<small>V = voltage at the terminals, E = open-circuit voltage, I = current, r = internal resistance</small>'),
        P("The device you connect has a resistance too, R. The same push E has to drive the current through both, so <code style='white-space:nowrap'>I = E / (R + r)</code>. A low-resistance device draws a big current, and a big current loses a lot inside the cell.")
      );
      let R = 3.55, r = CELL.r;
      const view = circuitView();
      const pl = plot({ xmin: 0, xmax: 80, ymin: 0, ymax: 4, height: 210, xlabel: "current I (A)", ylabel: "terminal voltage V", xticks: [0, 20, 40, 60, 80], yticks: [0, 1, 2, 3, 3.6], clip: true, narrow: true, minFont: 10 });
      const mk = pl.marker(YEL);
      const bar = splitBar(["at the terminals", "lost inside"], [BLUE, RED]);
      const sI = stat("current I", "y"), sL = stat("lost inside, I × r", "r"), sV = stat("at the terminals", "b");
      const upd = () => {
        const I = CELL.E / (R + r), V = CELL.E - I * r;
        pl.clear();
        pl.hline(CELL.E, GREY, "E = 3.60 V (open circuit)", { pos: "right" });
        pl.line([[0, CELL.E], [CELL.E / r, 0]], BLUE);
        mk.move(Math.min(I, 80), I > 80 ? CELL.E - 80 * r : V);
        view.set({ I, V, load: "R = " + ohms(R), r, heat: (I * I * r) / 400 });
        sI.set(amps(I)); sL.set(volts(I * r)); sV.set(volts(V));
        bar.set(V / CELL.E, "at the terminals " + volts(V), "lost inside " + volts(I * r));
      };
      const sR = slider({ name: "device resistance R", min: 0.005, max: 100, log: true, value: R, nameWidth: 150, fmtv: ohms, oninput: (v) => { R = v; upd(); } });
      const sr = slider({ name: "internal resistance r", min: 0.01, max: 0.2, step: 0.005, value: r, nameWidth: 150, fmtv: ohms, oninput: (v) => { r = v; upd(); } });
      const setR = (v) => { R = v; sR.set(v); upd(); };
      el.append(widget("The same 3.60 V cell, any device you like", view, sR, sr, bar, h("div", { class: "readout" }, sI, sL, sV), pl,
        h("div", { class: "btns" },
          h("button", { onclick: () => setR(100) }, "Tiny load (100 Ω)"),
          h("button", { onclick: () => setR(3.55) }, "Torch (about 1 A)"),
          h("button", { onclick: () => setR(0.31) }, "Drill (about 10 A)"),
          h("button", { onclick: () => setR(0.005) }, "Short circuit (a thick wire)"))));
      upd();
      el.append(
        P("The blue line is the whole formula: it starts at E and falls by r volts for every ampere. Try the short circuit. With almost no resistance outside, the current is limited only by r: about E / r = 72 A, and nearly all 3.60 V is lost inside the cell. Then raise r: an old or cold cell has a higher internal resistance, and the same drill now gets a much lower voltage."),
        takeaway("A real cell behaves like an ideal cell of voltage E with a small resistor r in series. Terminal voltage V = E − I·r.")
      );
      return () => view.stop();
    },
    check: {
      type: "number", q: "A cell rests at <b>3.60 V</b> and has r = <b>0.05 Ω</b>. A motor draws <b>6 A</b>. What voltage does the motor get? (in volts)",
      answer: 3.3, tolerance: 0.011, shown: "3.30",
      hint: "First the loss inside: I × r = 6 × 0.05. Then subtract it from E.", why: "6 A × 0.05 Ω = 0.30 V lost inside, so 3.60 − 0.30 = 3.30 V reaches the motor.", backTo: 0,
    },
  });

  // ---------------------------------------------------------------- 3
  steps.push({
    title: "Where the missing volts go: heat",
    short: "Heat = I²r",
    newConcepts: ["heat"],
    render(el) {
      el.append(
        P("A volt is a <em>joule per coulomb</em> (<em>Charge, energy and capacity</em>). Each coulomb leaves the chemistry carrying E joules. If it arrives at the terminals with only V joules, the other I·r joules were dropped inside the cell. They became <b>heat</b>."),
        P("How much heat per second? <em>Power</em> is volts × amperes. The cell loses I·r volts, at I coulombs per second:"),
        formula('heat = (I · r) · I = <span class="hl">I² · r</span><small>in watts. The device gets V · I. Together they are E · I: what the chemistry releases.</small>'),
        P("The square matters. Twice the current is not twice the heat, it is four times.")
      );
      let I = 1;
      const Imax = CELL.E / CELL.r;
      const view = circuitView();
      const pl = plot({ xmin: 0, xmax: 72, ymin: 0, ymax: 270, height: 220, xlabel: "current I (A)", ylabel: "power (W)", xticks: [0, 18, 36, 54, 72], yticks: [0, 65, 130, 195, 260], narrow: true, minFont: 10 });
      pl.fn((x) => CELL.E * x, GREY, true);
      pl.fn((x) => (CELL.E - x * CELL.r) * x, GRN);
      pl.fn((x) => x * x * CELL.r, RED);
      pl.legend([["chemistry releases, E·I", GREY, true], ["device gets, V·I", GRN], ["heat inside, I²r", RED]]);
      const mkD = pl.marker(GRN), mkH = pl.marker(RED);
      const bar = splitBar(["to the device", "heat"], [GRN, RED]);
      const sV = stat("terminal voltage", "b"), sD = stat("device gets", "g"), sH = stat("heat inside the cell", "r"), sE = stat("share reaching the device", "y");
      const upd = () => {
        const V = CELL.E - I * CELL.r, pd = V * I, ph = I * I * CELL.r;
        mkD.move(I, pd); mkH.move(I, ph);
        view.set({ I, V, load: amps(I), r: CELL.r, heat: ph / 60 });
        sV.set(volts(V)); sD.set(watts(pd)); sH.set(watts(ph)); sE.set(fmt.pct(V / CELL.E));
        bar.set(V / CELL.E, "to the device " + fmt.pct(V / CELL.E), "heat " + fmt.pct(1 - V / CELL.E));
      };
      const sl = slider({ name: "current I", min: 0, max: 72, step: 0.5, value: I, fmtv: amps, oninput: (v) => { I = v; upd(); } });
      const setI = (v) => { I = v; sl.set(v); upd(); };
      el.append(widget("Our cell (E = 3.60 V, r = 0.05 Ω): who gets the power?", view, sl, bar, h("div", { class: "readout" }, sV, sD, sH, sE), pl,
        h("div", { class: "btns" },
          h("button", { onclick: () => setI(1) }, "Torch, 1 A"),
          h("button", { onclick: () => setI(10) }, "Drill, 10 A"),
          h("button", { onclick: () => setI(Imax / 2) }, "Most power possible, 36 A"),
          h("button", { onclick: () => setI(Imax) }, "Short circuit, 72 A"))));
      upd();
      el.append(
        P("Three things to see. At 1 A the heat is 0.05 W: nothing. At 10 A it is 5 W in a 46 g object, which gets hot within minutes. The green curve peaks at 36 A, where V has fallen to E/2: that is the <b>most power the cell can ever deliver</b>, and half of everything is already heat. Beyond the peak, pulling harder gives the device <i>less</i>."),
        P("At the short circuit the device gets nothing and all 259 W heats the cell. For a Li-ion cell that is the route to fire, which is why real packs carry fuses and protection electronics. A cell this size is typically rated for roughly 10 A continuous, far left of the peak."),
        takeaway("The volts lost inside become heat at a rate I²r. Double the current, four times the heat. Low internal resistance is what makes a cell powerful.")
      );
      return () => view.stop();
    },
    check: {
      type: "number", q: "At <b>5 A</b> a cell produces 1.25 W of heat. How many watts of heat at <b>10 A</b>?",
      answer: 5, tolerance: 0.05,
      hint: "Heat goes with the square of the current. The current doubled.", why: "5 W. Heat = I²r, so doubling I multiplies the heat by 4: 1.25 × 4 = 5 W (check: 10² × 0.05 = 5).",
    },
  });

  // ---------------------------------------------------------------- 4
  steps.push({
    title: "Overpotential: what r is hiding",
    short: "Overpotential",
    newConcepts: ["overpotential"],
    render(el) {
      el.append(
        P("One constant r is a convenient lump. Look closer and the missing voltage has three sources, and only one of them is a plain resistor."),
        h("ul", {},
          h("li", { html: "<b>Ohmic loss.</b> Ions through the electrolyte, electrons through foils and particles. A true resistance: a straight line in I." }),
          h("li", { html: "<b>Activation.</b> At rest, each electrode's reaction runs forward and backward equally often (the <em>equilibrium</em> of <em>Nernst</em>). To get a net current you must tilt that balance, and the tilt costs voltage. It rises quickly for the first trickle of current, then only slowly." }),
          h("li", { html: "<b>Ion transport.</b> At high current, ions are used up at the electrode surface faster than they arrive. The concentration right at the surface drops, and by Nernst so does the voltage. Near a limiting current it collapses." })),
        P("The gap between an electrode's voltage while current flows and its equilibrium value is called <b>overpotential</b>. The <em>polarisation</em> that crippled Volta's pile (<em>Zinc</em>) was an extreme case of it.")
      );
      // toy model, parameters chosen to show the three shapes on our cell
      const Rohm = 0.03, I0 = 0.5, ILIM = 20;
      const eta = { ohm: (I) => I * Rohm, act: (I) => 0.0514 * Math.asinh(I / (2 * I0)), tr: (I) => -0.1 * Math.log(1 - Math.min(I, 19.99) / ILIM) };
      const on = { ohm: true, act: true, tr: true };
      let I = 5, dir = 1;
      const COL = { ohm: BLUE, act: PUR, tr: RED }, NAME = { ohm: "ohmic", act: "activation", tr: "ion transport" };
      const pl = plot({ xmin: 0, xmax: 20, ymin: 2.4, ymax: 4.8, height: 250, xlabel: "current I (A)", ylabel: "terminal voltage V", xticks: [0, 5, 10, 15, 20], yticks: [2.4, 3, 3.6, 4.2, 4.8], clip: true, narrow: true, minFont: 10 });
      const mk = pl.marker(YEL);
      const st = { ohm: stat("ohmic", "b"), act: stat("activation", "p"), tr: stat("ion transport", "r") };
      const sV = stat("terminal voltage", "y");
      const draw = () => {
        pl.clear();
        const xs = Array.from({ length: 200 }, (_, k) => (k / 199) * 19.9);
        let prev = xs.map((x) => [x, CELL.E]);
        ["ohm", "act", "tr"].forEach((k) => {
          if (!on[k]) return;
          const next = prev.map(([x, v]) => [x, clamp(v - dir * eta[k](x), 2.4, 4.8)]);
          band(pl, prev, next, COL[k], 0.35); prev = next;
        });
        pl.hline(CELL.E, GREY, "open-circuit voltage 3.60 V", { pos: "right", below: dir > 0 ? false : true });
        pl.line(xs.map((x) => [x, CELL.E - dir * x * CELL.r]), GREY, true, 1.5);
        pl.line(prev, YEL);
        const tot = ["ohm", "act", "tr"].reduce((a, k) => a + (on[k] ? eta[k](I) : 0), 0), V = CELL.E - dir * tot;
        mk.move(I, V);
        ["ohm", "act", "tr"].forEach((k) => st[k].set(on[k] ? (eta[k](I) * 1000).toFixed(0) + " mV" : "off"));
        sV.set(volts(V));
      };
      const btns = ["ohm", "act", "tr"].map((k) => {
        const b = h("button", { class: "on", style: `border-color:${COL[k]}`, onclick: () => { on[k] = !on[k]; b.classList.toggle("on", on[k]); b.style.opacity = on[k] ? 1 : 0.55; b.textContent = NAME[k] + (on[k] ? ": on" : ": off"); draw(); } }, NAME[k] + ": on");
        return b;
      });
      el.append(widget("Three losses stacked under the open-circuit voltage (toy numbers, chosen to show the shapes)",
        toggle("The cell is", [[1, "discharging"], [-1, "being charged"]], 1, (v) => { dir = v; draw(); }),
        h("div", { class: "btns c-seg" }, ...btns), pl,
        slider({ name: "current I", min: 0, max: 19.5, step: 0.1, value: I, fmtv: amps, oninput: (v) => { I = v; draw(); } }),
        h("div", { class: "readout" }, st.ohm, st.act, st.tr, sV),
        note("Yellow: terminal voltage. Dashed grey: the straight line E − I·r with r = 0.05 Ω from step 2.")));
      draw();
      el.append(
        P("Over the middle of the range the yellow curve hugs the dashed line. That is why a single internal resistance works so well in practice: it is the average slope of all three. It fails at the two ends: the quick first dip (activation) and the cliff near the limiting current (transport)."),
        P("Now switch to <em>being charged</em>. The same losses appear with the opposite sign: to push current backwards, the charger must supply <b>more</b> than the open-circuit voltage. Losses cost you on the way in and on the way out."),
        takeaway("Overpotential is the extra voltage needed to make an electrode reaction run at a given rate: ohmic + activation + ion transport. Internal resistance is its straight-line approximation.")
      );
    },
    check: {
      type: "choice", q: "A cell rests at 3.60 V. You charge it at 3 A. While the charging current flows, a voltmeter on its terminals reads…",
      options: ["more than 3.60 V", "exactly 3.60 V", "less than 3.60 V"],
      answer: 0,
      wrongHints: { 1: "3.60 V is the reading at zero current only. Any current, in either direction, has to be pushed through the cell's losses.", 2: "Less than 3.60 V is what you see when the cell delivers current. Charging pushes current the other way, so the sign of the loss flips." },
      why: "More. The charger has to overcome the open-circuit voltage plus the overpotentials: about 3.60 + 3 × 0.05 = 3.75 V with our r.", backTo: 1,
    },
  });

  // ---------------------------------------------------------------- 5
  steps.push({
    title: "C-rate and the capacity you can actually use",
    short: "C-rate, usable capacity",
    newConcepts: ["crate", "usable"],
    render(el) {
      el.append(
        P("10 A is brutal for our 3 Ah cell and nothing for a 60 Ah car battery. To compare cells of different sizes, current is quoted relative to capacity. That is the <b>C-rate</b>: <b>1C</b> is the current that would empty the rated capacity in one hour. For our cell 1C = 3 A, 2C = 6 A (half an hour), 0.2C = 0.6 A (five hours)."),
        formula('C-rate = <span class="hl">current (A)</span> / <span class="bl">capacity (Ah)</span><small>ideal runtime in hours = 1 / C-rate</small>'),
        P("Now discharge the whole cell. The open-circuit voltage is not constant: it slides down as the <em>state of charge</em> falls (<em>Lead</em>), from 4.2 V full to about 3 V empty for this chemistry. The terminal voltage rides below it by I·r. And a device, or the cell's protection circuit, stops at a <b>cut-off voltage</b>, here 2.5 V, because going lower damages the cell.")
      );
      const c = CHEM.li;
      let rate = 1;
      const pl = plot({ xmin: 0, xmax: 3.2, ymin: 2.4, ymax: 4.3, height: 250, xlabel: "charge delivered (Ah)", ylabel: "terminal voltage V", xticks: [0, 1, 2, 3], yticks: [2.5, 3, 3.5, 4, 4.2], clip: true, narrow: true, minFont: 10 });
      const sI = stat("current", "y"), sT = stat("runtime", "b"), sQ = stat("charge delivered", "g"), sW = stat("energy delivered", "p"), sH = stat("lost as heat", "r");
      const ghosts = [0.2, 1, 3, 5].map((cr) => discharge(c, cr * c.Q).pts);
      const ocvPts = Array.from({ length: 151 }, (_, k) => [(k / 150) * c.Q, c.ocv(k / 150)]);
      const upd = () => {
        const d = discharge(c, rate * c.Q);
        pl.clear();
        ghosts.forEach((g) => pl.line(g, "#4a5568", "", 1.5));
        pl.line(ocvPts, GREY, true, 1.5);
        pl.hline(c.cut, RED, "cut-off 2.5 V", { pos: "left" });
        if (d.pts.length > 1) { pl.line(d.pts, YEL); pl.dot(d.pts[d.pts.length - 1][0], d.pts[d.pts.length - 1][1], YEL, 5); }
        sI.set(amps(rate * c.Q)); sT.set(fmtTime(d.t)); sQ.set(d.ah.toFixed(2) + " Ah (" + fmt.pct(d.ah / c.Q) + ")");
        sW.set(d.wh.toFixed(1) + " Wh"); sH.set(d.heat.toFixed(2) + " Wh");
      };
      const sl = slider({ name: "C-rate", min: 0.1, max: 12, log: true, value: rate, fmtv: (v) => (v < 1 ? v.toFixed(2) : v.toFixed(1)) + "C", oninput: (v) => { rate = v; upd(); } });
      const setC = (v) => { rate = v; sl.set(v); upd(); };
      el.append(widget("Discharge curves of our cell (simplified model: resting-voltage curve − I·r, cut off at 2.5 V)", pl, sl,
        h("div", { class: "btns" }, ...[0.2, 1, 3, 5, 8, 12].map((v) => h("button", { onclick: () => setC(v) }, v + "C"))),
        h("div", { class: "readout" }, sI, sT, sQ, sW, sH),
        note("Dashed: open-circuit voltage at each state of charge. Thin grey: 0.2C, 1C, 3C and 5C for comparison.")));
      upd();
      el.append(
        P("A higher rate shifts the whole curve down, so it reaches the cut-off <b>earlier</b>, with lithium still in the graphite. The charge is not destroyed, it is just out of reach at this current: rest the cell, pull gently, and most of it is still there. Past about 11C (34 A × 0.05 Ω = 1.7 V lost) even the full cell starts below the cut-off and the cell delivers nothing at all."),
        P("So “3.0 Ah” is not one number. It is the capacity at a gentle rate, by convention around 0.2C. The capacity you get at your rate is the <b>usable capacity</b>, and the energy falls even faster, because every coulomb also comes out at a lower voltage."),
        takeaway("C-rate = current ÷ capacity. The faster you discharge, the lower the voltage and the sooner the cut-off: usable capacity and energy shrink with rate.")
      );
    },
    check: {
      type: "number", q: "A <b>3.0 Ah</b> cell is discharged at <b>2C</b>. Ignoring losses, how many <b>minutes</b> does it last?",
      answer: 30, tolerance: 0.5,
      hint: "1C empties the cell in one hour. 2C is twice that current.", why: "30 minutes. 2C = 6 A, and 3.0 Ah ÷ 6 A = 0.5 h. In reality a little less, because the cut-off arrives early.",
    },
  });

  // ---------------------------------------------------------------- 6
  steps.push({
    title: "Power versus energy: the Ragone plot",
    short: "Ragone plot",
    newConcepts: ["specpower", "ragone"],
    render(el) {
      el.append(
        P("The last step hides a trade. Pull gently and you collect nearly all the energy, slowly. Pull hard and you get it fast, but less of it. <b>Energy</b> (Wh) is how much work in total. <b>Power</b> (W) is how fast."),
        P("To compare batteries fairly, divide both by mass. You know <em>specific energy</em>, Wh/kg, from <em>Charge, energy and capacity</em>. Its partner is <b>specific power</b>, W/kg. Plot one against the other, each point being one complete discharge at one rate, and you have a <b>Ragone plot</b> (after David Ragone, 1968). Both axes are logarithmic."),
        P("One handy fact: energy ÷ power = time. So every diagonal on this plot is a runtime.")
      );
      const curves = {};
      CHEMS.forEach((c) => {
        const pts = [];
        for (let k = 0; k <= 90; k++) {
          const cr = 0.03 * Math.pow(10, (k / 90) * 3), d = discharge(c, cr * c.Q);
          if (d.ah <= 0 || d.wh / c.m < 4) break;
          pts.push([d.wh / d.t / c.m, d.wh / c.m]);
        }
        curves[c.key] = pts;
      });
      let sel = "li", rate = 1;
      const pl = plot({ xmin: 2, xmax: 4000, ymin: 4, ymax: 400, height: narrow(300, 290), xlabel: "specific power (W/kg)", ylabel: "specific energy (Wh/kg)", xlog: true, ylog: true,
        xticks: [10, 100, 1000], yticks: [10, 100], xfmt: (v) => v, yfmt: (v) => v, clip: true, narrow: true, minFont: 10 });
      const sC = stat("current per cell", "y"), sP = stat("specific power", "r"), sE = stat("specific energy", "g"), sT = stat("runtime", "b");
      const upd = () => {
        const c = CHEM[sel], d = discharge(c, rate * c.Q);
        pl.clear();
        [[10, "10 h"], [1, "1 h"], [0.1, "6 min"], [0.01, "36 s"]].forEach(([t, lab]) => {
          pl.line([[2, 2 * t], [4000, 4000 * t]], "#3a4252", "3 4", 1.2);
          const y = t >= 10 ? 250 : 6, x = y / t;
          if (y > 4.5 && x > 2.5) { const tt = T(pl.X(x), pl.Y(y) - 4, lab, "fill:#7b8496;font-size:10.5px"); pl.layer.append(tt); }
        });
        CHEMS.forEach((k) => pl.line(curves[k.key], k.color, "", k.key === sel ? 3 : 1.6).setAttribute("opacity", k.key === sel ? 1 : 0.55));
        const ok = d.ah > 0;
        if (ok) pl.dot(d.wh / d.t / c.m, d.wh / c.m, "#ffffff", 5.5);
        sC.set(amps(rate * c.Q)); sP.set(ok ? big(d.wh / d.t / c.m) + " W/kg" : "0 W/kg"); sE.set(ok ? big(d.wh / c.m) + " Wh/kg" : "0 Wh/kg"); sT.set(ok ? fmtTime(d.t) : "0 s");
      };
      const tg = toggle("Cell:", CHEMS.map((c) => [c.key, `<span style="color:${c.color}">●</span> ${c.name}`]), sel, (v) => { sel = v; upd(); });
      const sl = slider({ name: "C-rate", min: 0.05, max: 20, log: true, value: rate, fmtv: (v) => (v < 1 ? v.toFixed(2) : v.toFixed(1)) + "C", oninput: (v) => { rate = v; upd(); } });
      el.append(widget("Ragone curves of four typical cells (from this lesson's simplified model; white dot = the chosen rate)", tg, pl, sl, h("div", { class: "readout" }, sC, sP, sE, sT),
        note("Cells: lead–acid, one 2 V cell of a sealed 12 V 7 Ah block; NiMH, one AA; both Li-ion, one 18650. Dotted diagonals: equal runtime.")));
      upd();
      el.append(
        P("The curves run flat, then fall off a cliff (lead–acid, the most rate-sensitive, slopes down from the start). On the flat part, more power costs almost no energy. At the cliff, I·r has eaten so much voltage that the cut-off arrives almost immediately. A cell with lower internal resistance has its cliff further right."),
        P("The picture explains real choices. The layered-oxide cell sits highest: most energy per kilogram. The LFP cell stores about half as much but keeps delivering at rates where the other has collapsed. Lead–acid is far lower on energy, yet it holds up for short bursts, which is all a starter motor asks for."),
        takeaway("Energy is how much, power is how fast. A Ragone plot shows the specific energy a cell still delivers at each specific power; energy ÷ power is the runtime.")
      );
    },
    check: {
      type: "number", q: "A point on a Ragone plot sits at <b>200 Wh/kg</b> and <b>800 W/kg</b>. How many <b>minutes</b> does that discharge last?",
      answer: 15, tolerance: 0.3,
      hint: "Time = energy ÷ power. Mind the units: the result is in hours.", why: "200 Wh/kg ÷ 800 W/kg = 0.25 h = 15 minutes. The kilograms cancel.", backTo: 4,
    },
  });

  // ---------------------------------------------------------------- 7
  steps.push({
    title: "Per kilogram, per litre, and theory versus practice",
    short: "Wh/kg, Wh/L, practice",
    newConcepts: ["practical", "volumetric"],
    render(el) {
      const prac = { pb: (CHEM.pb.E * CHEM.pb.Q) / CHEM.pb.m, nimh: (CHEM.nimh.E * CHEM.nimh.Q) / CHEM.nimh.m, li: (CELL.E * CELL.Q) / CELL.m };
      const pvol = { pb: (CHEM.pb.E * CHEM.pb.Q) / CHEM.pb.vol, nimh: (CHEM.nimh.E * CHEM.nimh.Q) / CHEM.nimh.vol, li: (CELL.E * CELL.Q) / CELL.vol };
      el.append(
        P("In <em>Charge, energy and capacity</em> you computed specific energy from the reaction alone: mAh/g × volts, counting only the reactants. Call that the <b>theoretical</b> specific energy. For lead–acid, Pb + PbO₂ + 2H₂SO₄ weigh 643 g per 2 mol of electrons, and at 2.05 V that gives " + TH.pb.wh.toFixed(0) + " Wh/kg."),
        P("Nobody sells a bag of reactants. A real cell also carries water or solvent, metal grids and foils, a separator, a case, terminals, and spare material that never reacts. The <b>practical</b> specific energy divides by the mass of the whole thing. Our 18650: 3.6 V × 3.0 Ah = 10.8 Wh in 46 g, so " + prac.li.toFixed(0) + " Wh/kg."),
        P("And mass is not always the limit. A phone runs out of <i>room</i> before it gets too heavy. Energy per unit volume, Wh/L, is the <b>volumetric energy density</b>.")
      );
      const KEYS = ["pb", "nimh", "li"], NAMES = ["Lead–acid", "NiMH", "Li-ion"];
      let mode = "kg", need = 500;
      const bars = hbars(NAMES, { series: [GREY, YEL], max: 400, fmtv: (v) => (v ? v.toFixed(0) : "–"), labelWidth: 80 });
      const cap = h("div", { class: "note", style: "margin:8px 0 4px" });
      const res = hbars(NAMES, { series: [BLUE], max: 1, fmtv: (v) => v, labelWidth: 80 });
      const capRes = h("div", { class: "note", style: "margin:14px 0 4px" });
      const upd = () => {
        if (mode === "kg") {
          bars.update([KEYS.map((k) => TH[k].wh), KEYS.map((k) => prac[k])]);
          cap.innerHTML = `Wh/kg. <span style="color:${GREY}">Grey: theoretical</span> (reactants only). <span style="color:${YEL}">Yellow: practical</span> (the whole cell). Practical ÷ theoretical: ` + KEYS.map((k, i) => NAMES[i] + " " + fmt.pct(prac[k] / TH[k].wh)).join(", ") + ".";
        } else {
          bars.update([KEYS.map(() => 0), KEYS.map((k) => pvol[k] * (400 / 700))]);
          bars.querySelectorAll(".v").forEach((v, i) => (v.innerHTML = `<span style="color:${YEL}">${pvol[KEYS[i]].toFixed(0)}</span>`));
          cap.innerHTML = `Wh/L, practical, whole cell (bar scale 0 to 700).`;
        }
        const vals = KEYS.map((k) => need / (mode === "kg" ? prac[k] : pvol[k]));
        const mx = Math.max(...vals);
        res.update(vals.map((v) => v / mx));
        res.querySelectorAll(".v").forEach((v, i) => (v.textContent = big(vals[i]) + (mode === "kg" ? " kg" : " L")));
        capRes.innerHTML = `To store <b>${need >= 1000 ? (need / 1000).toFixed(need >= 10000 ? 0 : 1) + " kWh" : need.toFixed(0) + " Wh"}</b> you need this ${mode === "kg" ? "mass" : "volume"} of cells:`;
      };
      const sl = slider({ name: "energy needed", min: 5, max: 60000, log: true, value: need, nameWidth: 140, fmtv: (v) => (v >= 1000 ? (v / 1000).toFixed(1) + " kWh" : v.toFixed(0) + " Wh"), oninput: (v) => { need = v; upd(); } });
      const setN = (v) => { need = v; sl.set(v); upd(); };
      el.append(widget("Three real objects: a sealed 12 V lead–acid block, an AA NiMH cell, our 18650 (typical, rounded figures)",
        toggle("Compare by", [["kg", "mass (Wh/kg)"], ["L", "volume (Wh/L)"]], mode, (v) => { mode = v; upd(); }),
        cap, bars, capRes, res, sl,
        h("div", { class: "btns" },
          h("button", { onclick: () => setN(15) }, "Phone, 15 Wh"),
          h("button", { onclick: () => setN(500) }, "E-bike, 500 Wh"),
          h("button", { onclick: () => setN(720) }, "Car starter, 720 Wh"),
          h("button", { onclick: () => setN(60000) }, "Electric car, 60 kWh"))));
      upd();
      el.append(
        h("div", { class: "tablewrap", style: "margin:14px 0" }, h("table", { class: "small", html:
          `<tr><th>object</th><th class="num">V × Ah</th><th class="num">mass</th><th class="num">volume</th><th class="num">Wh/kg</th><th class="num">Wh/L</th></tr>
           <tr><td>12 V lead–acid block (6 cells)</td><td class="num">12 × 7.0</td><td class="num">2.2 kg</td><td class="num">0.92 L</td><td class="num">${prac.pb.toFixed(0)}</td><td class="num">${pvol.pb.toFixed(0)}</td></tr>
           <tr><td>AA NiMH cell</td><td class="num">1.2 × 2.0</td><td class="num">27 g</td><td class="num">8.3 mL</td><td class="num">${prac.nimh.toFixed(0)}</td><td class="num">${pvol.nimh.toFixed(0)}</td></tr>
           <tr><td>18650 Li-ion cell</td><td class="num">3.6 × 3.0</td><td class="num">46 g</td><td class="num">16.5 mL</td><td class="num">${prac.li.toFixed(0)}</td><td class="num">${pvol.li.toFixed(0)}</td></tr>` })),
        P("Lead–acid reaches barely a fifth of its theoretical value: the grids are lead, the acid is mostly water, and much of the active material is never used. Li-ion gets closest, around 60%. The theoretical bars use " + f("LaNi5H6") + " as the hydride for NiMH (" + TH.nimh.wh.toFixed(0) + " Wh/kg) and graphite with " + f("LiCoO2") + " cycling half its lithium at about 3.8 V for Li-ion (about " + (Math.round(TH.li.wh / 10) * 10) + " Wh/kg); both are approximate."),
        P("Set the slider to the electric car. In lead–acid, 60 kWh of cells would weigh about 1.6 tonnes, as much as a whole car. That one bar is why electric cars waited for lithium."),
        takeaway("Theoretical Wh/kg counts only the reactants. Practical Wh/kg counts the whole cell and is 20–60% of it. Wh/L matters when space, not weight, is the limit.")
      );
    },
    check: {
      type: "number", q: "A lead–acid car battery stores 12 V × 60 Ah = <b>720 Wh</b>. At a practical <b>40 Wh/kg</b>, how many kilograms does it weigh?",
      answer: 18, tolerance: 0.2,
      hint: "Energy ÷ specific energy = mass.", why: "720 Wh ÷ 40 Wh/kg = 18 kg. The same energy in Li-ion cells at 235 Wh/kg: about 3 kg.",
    },
  });

  // ---------------------------------------------------------------- 8
  steps.push({
    title: "Building a pack: series and parallel",
    short: "Series and parallel",
    newConcepts: ["parallel", "pack"],
    render(el) {
      el.append(
        P("One cell gives 3.6 V and 3 Ah. A drill wants 18 V, a car wants hundreds of volts and hundreds of ampere-hours. You get there by wiring cells together, and there are only two ways."),
        P("<b>In series</b>, plus to minus in a chain, as in the six-cell lead–acid battery (<em>Lead</em>). The same current runs through every cell, so the charge delivered is that of one cell, but each coulomb is lifted by every cell in turn: <b>voltages add</b>."),
        P("<b>In parallel</b>, all the plus terminals joined and all the minus terminals joined. The voltage is that of one cell, but the current splits between the cells: <b>capacities add</b>, and each cell works at a lower C-rate."),
        P("A battery <b>pack</b> usually does both. The shorthand “4s2p” means 4 groups in series, each group 2 cells in parallel.")
      );
      let sN = 3, pN = 2, I = 6;
      const view = packView();
      const sName = stat("pack", "y"), sV = stat("nominal voltage", "b"), sQ = stat("capacity", "g"), sW = stat("energy", "p"), sR = stat("pack resistance", "r");
      const sIc = stat("current per cell", "y"), sVt = stat("voltage under load", "b"), sH = stat("heat in the pack", "r");
      const upd = () => {
        const Rp = (sN * CELL.r) / pN, ic = I / pN;
        view.draw({ sN, pN, color: YEL, heat: (ic * ic * CELL.r) / 12 });
        sName.set(sN + "s" + pN + "p (" + sN * pN + " cells)"); sV.set(volts(sN * CELL.E, 1)); sQ.set((pN * CELL.Q).toFixed(0) + " Ah");
        sW.set((sN * pN * CELL.E * CELL.Q).toFixed(1) + " Wh"); sR.set(ohms(Rp));
        sIc.set(amps(ic) + " (" + (ic / CELL.Q).toFixed(1) + "C)"); sVt.set(volts(sN * (CELL.E - ic * CELL.r))); sH.set(watts(I * I * Rp));
      };
      el.append(widget("Wire up our 3.6 V, 3.0 Ah, 0.05 Ω cells", view,
        slider({ name: "in series (s)", min: 1, max: 6, step: 1, value: sN, nameWidth: 150, fmtv: (v) => v, oninput: (v) => { sN = v; upd(); } }),
        slider({ name: "in parallel (p)", min: 1, max: 4, step: 1, value: pN, nameWidth: 150, fmtv: (v) => v, oninput: (v) => { pN = v; upd(); } }),
        h("div", { class: "readout" }, sName, sV, sQ, sW, sR),
        slider({ name: "current drawn", min: 0, max: 20, step: 0.5, value: I, nameWidth: 150, fmtv: amps, oninput: (v) => { I = v; upd(); } }),
        h("div", { class: "readout" }, sIc, sVt, sH)));
      upd();
      el.append(
        P("Watch the energy tile while you trade s for p: it only counts cells. Six cells hold 6 × 10.8 = 64.8 Wh however you wire them. Wiring decides how that energy is served: as many volts or as many amperes."),
        P("Internal resistance follows the same logic. In series the resistances add (s × r). In parallel the current has p paths, so the group's resistance is r / p. Set 20 A on a 1p pack, then go to 4p: each cell carries a quarter of the current and makes a sixteenth of the heat."),
        takeaway("Series adds voltage, parallel adds capacity. Energy = number of cells × energy per cell, whatever the wiring. Pack resistance = s × r / p.")
      );
    },
    check: {
      type: "choice", q: "You have six identical cells. Pack A is <b>6s1p</b>, pack B is <b>1s6p</b>. Which stores more energy?",
      options: ["Neither: both store the same energy", "A: six times the voltage", "B: six times the capacity"],
      answer: 0,
      wrongHints: { 1: "A does have six times the voltage, but only one cell's capacity. Multiply V × Ah for both packs.", 2: "B does have six times the capacity, but only one cell's voltage. Multiply V × Ah for both packs." },
      why: "The same. A: 21.6 V × 3 Ah. B: 3.6 V × 18 Ah. Both are 64.8 Wh: energy counts cells, not wiring.",
    },
  });

  // ---------------------------------------------------------------- 9
  steps.push({
    title: "What comes back: coulombic and energy efficiency",
    short: "Efficiency",
    newConcepts: ["coulombic", "energyeff"],
    render(el) {
      el.append(
        P("A rechargeable cell is a loop: put charge in, take it out. Two different things can go missing on the way round."),
        P("<b>Electrons.</b> Some of the charging current drives a side reaction instead of the reaction you want: splitting water in a lead–acid cell (<em>gassing</em>), or growing the <em>SEI layer</em> in a Li-ion cell. Those electrons never come back. The share of the charge that does is the <b>coulombic efficiency</b>: Ah out ÷ Ah in."),
        P("<b>Volts.</b> Step 4: you charge above the open-circuit voltage and discharge below it. Even if every electron returns, it returns at a lower voltage than it went in. Energy is charge × voltage, so the <b>energy efficiency</b>, Wh out ÷ Wh in, is always the smaller number:"),
        formula('<span class="hl">energy efficiency</span> = coulombic efficiency × <span class="bl">average discharge V / average charge V</span>')
      );
      const c = CHEM.li;
      let rate = 0.5, ce = 0.999;
      const pl = plot({ xmin: 0, xmax: 100, ymin: 2.4, ymax: 5.4, height: 260, xlabel: "state of charge (%)", ylabel: "terminal voltage V", xticks: [0, 25, 50, 75, 100], yticks: [2.5, 3, 3.5, 4, 4.5, 5], clip: true, narrow: true, minFont: 10 });
      const sAi = stat("charge in", "b"), sAo = stat("charge out", "g"), sCE = stat("coulombic efficiency", "y"), sWi = stat("energy in", "b"), sWo = stat("energy out", "g"), sVE = stat("voltage ratio", "p"), sEE = stat("energy efficiency", "y");
      const bar = splitBar(["comes back", "lost"], [GRN, PUR]);
      const upd = () => {
        // charging passes Qin; the share ce is stored (the rest feeds the side reaction) and comes back on discharge
        const I = rate * c.Q, u = 1 / (1 + (c.b * I) / c.Q), Qst = u * c.Q, Qin = Qst / ce, N = 200;
        const ch = [], dis = []; let whIn = 0, whOut = 0, ahOut = 0;
        for (let k = 0; k <= N; k++) {
          const sc = k / N, vc = c.ocv(1 - sc) + I * c.r, vd = c.ocv(1 - sc) - I * c.r;
          ch.push([sc * 100, vc]); if (k) whIn += (Qin / N) * vc;
          if (vd >= c.cut) { dis.push([sc * 100, vd]); if (k) { whOut += (Qst / N) * vd; ahOut += Qst / N; } }
        }
        pl.clear();
        if (dis.length > 1) band(pl, ch.slice(ch.length - dis.length), dis, RED, 0.3);
        pl.line(ch.map((p, k) => [p[0], c.ocv(1 - k / N)]), GREY, true, 1.3);
        pl.line(ch, BLUE); if (dis.length > 1) pl.line(dis, GRN);
        pl.legend([["charging", BLUE], ["discharging", GRN], ["open circuit", GREY, true]], { pos: "left" });
        sAi.set(Qin.toFixed(2) + " Ah"); sAo.set(ahOut.toFixed(2) + " Ah"); sCE.set((100 * ahOut / Qin).toFixed(1) + "%");
        sWi.set(whIn.toFixed(2) + " Wh"); sWo.set(whOut.toFixed(2) + " Wh");
        const vr = ahOut > 0 ? (whOut / ahOut) / (whIn / Qin) : 0;
        sVE.set((100 * vr).toFixed(1) + "%"); sEE.set((100 * whOut / whIn).toFixed(1) + "%");
        bar.set(ahOut / Qin, "charge that comes back " + (100 * ahOut / Qin).toFixed(1) + "%", "lost " + (100 * (1 - ahOut / Qin)).toFixed(1) + "%");
      };
      const slR = slider({ name: "charge and discharge rate", min: 0.1, max: 3, step: 0.1, value: rate, nameWidth: 150, fmtv: (v) => v.toFixed(1) + "C", oninput: (v) => { rate = v; upd(); } });
      const slC = slider({ name: "coulombic efficiency", min: 0.7, max: 1, step: 0.001, value: ce, nameWidth: 150, fmtv: (v) => (v * 100).toFixed(1) + "%", oninput: (v) => { ce = v; upd(); } });
      const set = (r, e) => { rate = r; ce = e; slR.set(r); slC.set(e); upd(); };
      el.append(widget("One full charge, then one full discharge of our cell (simplified model)", pl, slR, slC, bar,
        h("div", { class: "btns" },
          h("button", { onclick: () => set(0.2, 0.999) }, "Gentle: 0.2C"),
          h("button", { onclick: () => set(2, 0.999) }, "Fast: 2C"),
          h("button", { onclick: () => set(0.5, 0.85) }, "Leaky: 15% of the charge lost to a side reaction")),
        h("div", { class: "readout" }, sAi, sAo, sCE), h("div", { class: "readout" }, sWi, sWo, sVE, sEE),
        note("Charging runs left to right along the blue curve, discharging right to left along the green one. Red band: the voltage gap between charging and discharging, which becomes heat. Bar: the share of the charging electrons that come back. The model charges to full along the top curve; real chargers cap the voltage at 4.2 V and let the current taper.")));
      upd();
      el.append(
        P("At 0.2C the two curves nearly touch and almost all the energy returns. At 2C the same electrons come back, but the red band between the curves is wide: fast charging and fast discharging both cost energy as heat. Now make the cell leaky: the curves stay put, but you must push in more charge than you ever get back, and both efficiencies drop."),
        h("div", { class: "tablewrap", style: "margin:14px 0" }, h("table", { class: "small", html:
          `<tr><th>typical, approximate</th><th class="num">coulombic</th><th class="num">energy (round trip)</th></tr>
           <tr><td>Lead–acid</td><td class="num">about 85–90%</td><td class="num">about 70–85%</td></tr>
           <tr><td>NiMH</td><td class="num">about 70–90%</td><td class="num">about 65–80%</td></tr>
           <tr><td>Li-ion</td><td class="num">above 99%</td><td class="num">about 90–95%</td></tr>` })),
        P("Coulombic efficiency also decides lifetime. In a Li-ion cell the lost electrons took lithium with them into the SEI. At 99.9% per cycle about 60% of the lithium is left after 500 cycles; at 99% less than 1% would be. Good cells do better than 99.9%."),
        takeaway("Coulombic efficiency: what share of the electrons comes back. Energy efficiency: what share of the watt-hours comes back. The second is the first times the voltage ratio.")
      );
    },
    check: {
      type: "number", q: "A cell is charged at an average <b>4.0 V</b> and discharged at an average <b>3.6 V</b>. Every coulomb comes back (coulombic efficiency 100%). What is the energy efficiency, in %?",
      answer: 90, tolerance: 0.5, shown: "90",
      hint: "Same charge in and out, so compare the volts: 3.6 ÷ 4.0.", why: "3.6 ÷ 4.0 = 90%. Same coulombs, but each one comes back with 10% fewer joules. The rest became heat.", backTo: 3,
    },
  });

  // ---------------------------------------------------------------- 10
  steps.push({
    title: "Capstone: design a battery pack",
    short: "Capstone: pack designer",
    newConcepts: [],
    render(el) {
      el.append(
        P("Everything at once. Pick a chemistry, wire cells in series and parallel, and connect a load that draws a constant power. The simulator discharges the pack with this lesson's model: open-circuit curve, minus I·r, cut-off voltage, and less reach at high C-rates."),
        P("<b>Your mission:</b> an e-bike battery. The motor controller wants about 36 V, the motor draws 250 W, the ride should last at least 2 hours, and the cells should weigh no more than 3 kg.")
      );
      let key = "li", sN = 10, pN = 2, Pw = 250, anim = null, frac = 0;
      const view = packView();
      const plBox = h("div");
      const warn = h("div", { class: "note", style: "min-height:22px;color:var(--red);margin-top:8px" });
      const S = {
        pack: stat("pack", "y"), mass: stat("mass of the cells", ""), nom: stat("nominal", "b"),
        cur: stat("current per cell at start", "y"), sag: stat("sag at start", "r"), run: stat("runtime", "g"),
        wh: stat("energy delivered", "g"), heat: stat("heat", "r"), eff: stat("delivered ÷ (delivered + heat)", "p"),
      };
      const mission = h("div", { style: "margin-top:12px;line-height:1.7" });
      let res = null, pl = null, mk = null;
      const tUnit = (t) => (t >= 1.5 ? [1, "hours"] : t * 60 >= 1.5 ? [60, "minutes"] : [3600, "seconds"]);
      const niceMax = (x) => { const p = Math.pow(10, Math.floor(Math.log10(x))); const m = x / p; return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * p; };
      function drawAnim() {
        const c = CHEM[key];
        view.draw({ sN, pN, color: c.color, level: res.collapsed ? 1 : 1 - frac * (res.ah / (pN * c.Q)), heat: res.collapsed ? 0 : clamp((res.i0 * res.i0 * c.r) / c.m / 150, 0, 0.8) });
        if (mk && res.pts.length > 1) { const k = Math.min(res.pts.length - 1, Math.round(frac * (res.pts.length - 1))); mk.move(res.pts[k][0] * mk.k, res.pts[k][1]); }
      }
      function upd() {
        const c = CHEM[key];
        if (anim) { clearTimeout(anim); anim = null; }
        frac = 0;
        res = runPack(c, sN, pN, Pw);
        const n = sN * pN, mass = n * c.m, ok = !res.collapsed && res.pts.length > 1;
        const [k, uname] = tUnit(ok ? res.t : 1), xmax = niceMax(Math.max(ok ? res.t * k : 1, 0.5)), ymax = Math.ceil(sN * res.ocv0 * 1.02), ymin = Math.floor(sN * c.cut * 0.96);
        pl = plot({ xmin: 0, xmax, ymin, ymax, height: 220, xlabel: "time (" + uname + ")", ylabel: "pack voltage (V)", xticks: [0, xmax / 4, xmax / 2, (3 * xmax) / 4, xmax].map((v) => +v.toPrecision(3)), yticks: [ymin, +((ymin + ymax) / 2).toFixed(1), ymax], clip: true, narrow: true, minFont: 10 });
        pl.hline(sN * c.cut, RED, "cut-off " + volts(sN * c.cut, 1), { pos: "left" });
        pl.hline(sN * res.ocv0, GREY, "open circuit, full " + volts(sN * res.ocv0, 1), { pos: "right", below: true });
        if (ok) { pl.line(res.pts.map((p) => [p[0] * k, p[1]]), c.color); mk = pl.marker("#ffffff"); mk.k = k; } else mk = null;
        plBox.innerHTML = ""; plBox.append(pl);
        S.pack.set(sN + "s" + pN + "p, " + n + " cells"); S.mass.set(mass >= 1 ? mass.toFixed(2) + " kg" : (mass * 1000).toFixed(0) + " g");
        S.nom.set(volts(sN * c.E, 1) + ", " + (pN * c.Q).toFixed(1) + " Ah, " + big(n * c.E * c.Q) + " Wh");
        if (ok) {
          S.cur.set(amps(res.i0) + " (" + (res.i0 / c.Q).toFixed(2) + "C)"); S.sag.set(volts(sN * (res.ocv0 - res.v0)) + " of " + volts(sN * res.ocv0, 1));
          S.run.set(fmtTime(res.t)); S.wh.set(big(res.wh) + " Wh"); S.heat.set(big(res.heat) + " Wh, " + watts((res.heat / res.t)) + " avg"); S.eff.set(fmt.pct(res.wh / (res.wh + res.heat)));
        } else { S.cur.set("–"); S.sag.set("–"); S.run.set("0 s"); S.wh.set("0 Wh"); S.heat.set("–"); S.eff.set("–"); }
        const w = [];
        if (!ok) w.push("This pack cannot deliver " + watts(Pw) + ": at that power the voltage falls below the cut-off at once. Add cells or lower the load.");
        else {
          if (res.i0 / c.Q > c.maxC) w.push("Each cell runs at " + (res.i0 / c.Q).toFixed(1) + "C, above the roughly " + c.maxC + "C this kind of cell is typically rated for: it would overheat. Add parallel cells.");
          if (res.ah / (pN * c.Q) < 0.8) w.push("Only " + fmt.pct(res.ah / (pN * c.Q)) + " of the rated capacity is usable at this rate.");
        }
        warn.innerHTML = w.join("<br>");
        // mission: evaluated at a 250 W load
        const m = runPack(c, sN, pN, 250), mok = !m.collapsed && m.pts.length > 1;
        const items = [
          [sN * c.E >= 34 && sN * c.E <= 38, "nominal voltage 34–38 V (now " + volts(sN * c.E, 1) + ")"],
          [mok && m.t >= 2, "runs a 250 W motor for at least 2 h (now " + (mok ? fmtTime(m.t) : "not at all") + ")"],
          [mass <= 3, "cells weigh at most 3 kg (now " + mass.toFixed(2) + " kg)"],
          [mok && m.i0 / c.Q <= c.maxC, "cell current within its rating at 250 W" + (mok ? " (now " + (m.i0 / c.Q).toFixed(2) + "C)" : "")],
        ];
        mission.innerHTML = "<b>E-bike mission</b><br>" + items.map(([y, t]) => `<span style="color:${y ? GRN : RED}">${y ? "✓" : "✗"}</span> ${t}`).join("<br>") + (items.every((i) => i[0]) ? `<br><b style="color:${GRN}">Mission accomplished.</b>` : "");
        drawAnim();
      }
      function run() {
        if (anim || !res || res.collapsed || res.pts.length < 2) return;
        frac = 0;
        const tick = () => { frac = Math.min(1, frac + 0.02); drawAnim(); anim = frac < 1 ? setTimeout(tick, 40) : null; };
        tick();
      }
      const tg = toggle("Chemistry:", CHEMS.map((c) => [c.key, `<span style="color:${c.color}">●</span> ${c.name}`]), key, (v) => { key = v; cellNote.innerHTML = cellText(); upd(); });
      const cellText = () => { const c = CHEM[key]; return `Cell: ${c.unit}. ${volts(c.E, 1)}, ${c.Q.toFixed(1)} Ah, ${c.m >= 0.1 ? c.m.toFixed(2) + " kg" : (c.m * 1000).toFixed(0) + " g"}, r = ${ohms(c.r)}, cut-off ${volts(c.cut)} (typical rounded figures).`; };
      const cellNote = note(cellText());
      const slS = slider({ name: "in series (s)", min: 1, max: 20, step: 1, value: sN, nameWidth: 150, fmtv: (v) => v, oninput: (v) => { sN = v; upd(); } });
      const slP = slider({ name: "in parallel (p)", min: 1, max: 8, step: 1, value: pN, nameWidth: 150, fmtv: (v) => v, oninput: (v) => { pN = v; upd(); } });
      const slW = slider({ name: "load power", min: 1, max: 3000, log: true, value: Pw, nameWidth: 150, fmtv: (v) => watts(v), oninput: (v) => { Pw = v; upd(); } });
      const setW = (v) => { Pw = v; slW.set(v); upd(); };
      el.append(widget("Pack designer", tg, cellNote, view, slS, slP, slW,
        h("div", { class: "btns" },
          h("button", { onclick: () => setW(3) }, "Bike light, 3 W"),
          h("button", { onclick: () => setW(45) }, "Laptop, 45 W"),
          h("button", { onclick: () => setW(250) }, "E-bike motor, 250 W"),
          h("button", { onclick: () => setW(600) }, "Power drill, 600 W"),
          h("button", { class: "primary", onclick: run }, "Run the discharge")),
        warn,
        h("div", { class: "readout" }, S.pack, S.nom, S.mass), h("div", { class: "readout" }, S.cur, S.sag, S.run), h("div", { class: "readout" }, S.wh, S.heat, S.eff),
        plBox, mission));
      upd();
      el.append(
        P("What to look for, each from an earlier step:"),
        h("ul", {},
          h("li", { html: "With a load connected the curve starts below the grey open-circuit line: sag = I·r, <b>steps 1–2</b>. Raise the power and it starts lower still." }),
          h("li", { html: "Double p at the same load: the current per cell halves, the heat drops to about a quarter (<b>step 3</b>), and the runtime more than doubles, because each cell now works at a gentler C-rate (<b>step 5</b>)." }),
          h("li", { html: "Push the power up until the pack “cannot deliver”. That is the peak of the power curve from <b>step 3</b>, and the cliff of the Ragone plot from <b>step 6</b>." }),
          h("li", { html: "Try the mission in lead–acid: 18 cells give 36 V, but they weigh over 6 kg and the 250 W load uses only part of their capacity. Practical Wh/kg decides (<b>step 7</b>)." }),
          h("li", { html: "Trade s against p with the same number of cells: nominal energy stays the same (<b>step 8</b>), but the voltage and the current per cell change." })),
        P("Real pack design adds what this model leaves out: temperature, ageing, cell-to-cell differences, and the electronics that keep every cell inside its limits. But the first sizing pass is exactly this: volts from s, ampere-hours from p, then check C-rate, sag and heat."),
        takeaway("A battery is its chemistry's promise minus its losses: E from the elements, then internal resistance, rate and dead weight decide what you actually get.")
      );
      return () => { if (anim) clearTimeout(anim); };
    },
  });

  Course.run({
    id: "battery-performance",
    section: "3. Batteries, element by element",
    title: "Real batteries: resistance, rate and energy density",
    concepts: {
      ocv: "open-circuit voltage", sag: "voltage under load (sag)", resistance: "resistance (ohm)", rint: "internal resistance, V = E − I·r",
      heat: "resistive heat I²r", overpotential: "overpotential", crate: "C-rate", usable: "usable capacity vs rate (cut-off voltage)",
      specpower: "specific power (W/kg)", ragone: "power vs energy (Ragone plot)", practical: "theoretical vs practical specific energy",
      volumetric: "volumetric energy density (Wh/L)", parallel: "series vs parallel", pack: "battery pack (s × p)",
      coulombic: "coulombic efficiency", energyeff: "energy efficiency",
    },
    sources: [
      { title: "OpenStax Chemistry 2e, §17.5 Batteries and Fuel Cells", url: "https://openstax.org/books/chemistry-2e/pages/17-5-batteries-and-fuel-cells", note: "cell chemistries and nominal voltages" },
      { title: "Wikipedia: Internal resistance", url: "https://en.wikipedia.org/wiki/Internal_resistance", note: "ideal source + series resistor model, V = E − I·r" },
      { title: "Wikipedia: Overpotential", url: "https://en.wikipedia.org/wiki/Overpotential", note: "activation, concentration and resistance overpotential" },
      { title: "Wikipedia: Ragone plot", url: "https://en.wikipedia.org/wiki/Ragone_plot", note: "specific energy vs specific power on log axes, diagonal lines of constant time" },
      { title: "Wikipedia: Peukert's law", url: "https://en.wikipedia.org/wiki/Peukert%27s_law", note: "lead–acid capacity falls with discharge rate; basis for the model's rate coefficient" },
      { title: "Wikipedia: Comparison of commercial battery types", url: "https://en.wikipedia.org/wiki/Comparison_of_commercial_battery_types", note: "practical Wh/kg, Wh/L and charge/discharge efficiency ranges" },
      { title: "Wikipedia: Lithium-ion battery", url: "https://en.wikipedia.org/wiki/Lithium-ion_battery", note: "18650 cell figures, voltage window, efficiency" },
      { title: "Wikipedia: Faraday efficiency", url: "https://en.wikipedia.org/wiki/Faraday_efficiency", note: "coulombic efficiency and how it differs from energy efficiency" },
    ],
    steps,
  });
})();
