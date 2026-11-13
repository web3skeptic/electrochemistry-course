// Lesson 2.4: Concentration and the Nernst equation
(function () {
  const { h, s, fmt, widget, stat, slider, plot, toggle, hbars, rng, narrow, fitText } = Course;
  const f = Chem.f;
  const YEL = "#ffd166", BLUE = "#6cb4ff", RED = "#ff6b6b", GRN = "#5fd38d", PUR = "#c3a6ff", GREY = "#9aa3b5";
  const P = (html) => h("p", { html });
  const takeaway = (html) => h("div", { class: "takeaway", html });
  const formula = (html) => h("div", { class: "formula", html });
  const note = (html) => h("div", { class: "note", html, style: "margin-top:8px" });

  // ---- numbers, all from assets/chem.js
  const E_ZN = Chem.E0by.Zn.E, E_CU = Chem.E0by.Cu.E, E_AG = Chem.E0by.Ag.E;
  const E0 = +(E_CU - E_ZN).toFixed(2);                      // Daniell cell, 1.10 V
  const slopeAt = (T) => (Chem.R * T / Chem.F) * Math.LN10;  // volts per decade per electron
  const S25 = slopeAt(Chem.T0);                              // 0.05916 V
  const LOGK = 2 * E0 / S25;                                 // 37.2
  const KEQ = Math.pow(10, LOGK);
  const Ecell = (zn, cu) => Chem.nernst(E0, 2, zn / cu);

  // ---- formatting
  const SUPC = { "-": "⁻", 0: "⁰", 1: "¹", 2: "²", 3: "³", 4: "⁴", 5: "⁵", 6: "⁶", 7: "⁷", 8: "⁸", 9: "⁹" };
  const sup = (n) => String(n).replace(/[-0-9]/g, (c) => SUPC[c]);
  function sci(x, d = 1) {
    if (!isFinite(x)) return "∞";
    if (x === 0) return "0";
    let e = Math.floor(Math.log10(Math.abs(x)));
    if (e >= -2 && e < 4) return String(+x.toPrecision(d + 1));
    let m = (x / Math.pow(10, e)).toFixed(d);
    if (+m >= 10) { m = (1).toFixed(d); e += 1; }
    return m + "×10" + sup(e);
  }
  const fmtC = (c) => sci(c) + " M";
  const volts = (v, d = 3) => (Math.abs(v) < 0.5 * Math.pow(10, -d) ? 0 : v).toFixed(d).replace("-", "−") + " V";
  const mV = (v, d = 1) => (v >= 0 ? "+" : "−") + Math.abs(v * 1000).toFixed(d) + " mV";
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // ---- a two-beaker cell drawing with jiggling ions and electrons that travel along the wire
  function cellView({ metals = ["Zn", "Cu"], ions = ["Zn^2+", "Cu^2+"], tints = ["#9aa3b5", "#3b8fd9"], seed = 7 } = {}) {
    const W = narrow(520, 380), H = 268;
    const svg = s("svg", { viewBox: `0 0 ${W} ${H}`, width: "100%", style: "max-width:560px;display:block;margin:0 auto" });
    const bw = W * 0.36, x0 = [W * 0.05, W * 0.59], top = 100, bot = 232, liq = 118, wireY = 24, elTop = 64;
    const cx = [x0[0] + bw * 0.3, x0[1] + bw * 0.7];
    const r = rng(seed);
    const text = (x, y, t, anchor = "middle", fill) => { const e = s("text", { x, y, "text-anchor": anchor }); e.textContent = t; if (fill) e.style.fill = fill; svg.append(e); return e; };
    const liquids = [0, 1].map((k) => { const e = s("rect", { x: x0[k], y: liq, width: bw, height: bot - liq, fill: tints[k], "fill-opacity": 0.1 }); svg.append(e); return e; });
    [0, 1].forEach((k) => svg.append(s("path", { d: `M${x0[k]},${top}L${x0[k]},${bot}L${x0[k] + bw},${bot}L${x0[k] + bw},${top}`, fill: "none", stroke: GREY, "stroke-width": 2 })));
    const ba = x0[0] + bw * 0.8, bb = x0[1] + bw * 0.2;
    svg.append(s("path", { d: `M${ba},164L${ba},86L${bb},86L${bb},164`, fill: "none", stroke: GREY, "stroke-opacity": 0.45, "stroke-width": 9, "stroke-linejoin": "round" }));
    text(W / 2, 77, "salt bridge");
    const elec = [0, 1].map((k) => { const e = s("rect", { y: elTop, height: 206 - elTop, rx: 2, fill: metals[k] === "Cu" ? "#c8793a" : "#aab4c4" }); svg.append(e); return e; });
    const setElectrode = (k, w) => { elec[k].setAttribute("x", cx[k] - w / 2); elec[k].setAttribute("width", w); };
    setElectrode(0, 14); setElectrode(1, 14);
    svg.append(s("path", { d: `M${cx[0]},${elTop}L${cx[0]},${wireY}L${cx[1]},${wireY}L${cx[1]},${elTop}`, fill: "none", stroke: GREY, "stroke-width": 2 }));
    // electrons on the wire
    const span = cx[1] - cx[0], up = elTop - wireY, LEN = 2 * up + span;
    const pos = (t) => (t < up ? [cx[0], elTop - t] : t < up + span ? [cx[0] + (t - up), wireY] : [cx[1], wireY + (t - up - span)]);
    const NE = 7;
    const els = Array.from({ length: NE }, (_, i) => { const c = s("circle", { r: 3.6, fill: YEL }); svg.append(c); return { c, t: (i / NE) * LEN }; });
    // meter
    svg.append(s("rect", { x: W / 2 - 50, y: wireY - 16, width: 100, height: 32, rx: 7, fill: "#1a1f29", stroke: YEL, "stroke-width": 1.5 }));
    const meter = text(W / 2, wireY + 6, "", "middle", YEL); meter.style.fontFamily = "var(--mono)"; meter.style.fontSize = "calc(15px * var(--c-k, 1))";
    text(cx[0] - 12, 84, metals[0], "end", "#e6e9ef"); text(cx[1] + 12, 84, metals[1], "start", "#e6e9ef");
    const conc = [0, 1].map((k) => text(x0[k] + bw / 2, 247, "", "middle", "#e6e9ef"));
    const role = [0, 1].map((k) => text(x0[k] + bw / 2, 262, ""));
    // ions
    const NI = 32;
    const dots = [0, 1].map((k) => Array.from({ length: NI }, () => {
      const d = { x: x0[k] + 6 + r() * (bw - 12), y: liq + 7 + r() * (bot - liq - 14), c: s("circle", { r: 3.2, fill: RED }) };
      d.c.setAttribute("cx", d.x); d.c.setAttribute("cy", d.y); svg.append(d.c); return d;
    }));
    const nDots = (c) => (c > 0 ? Math.min(NI, Math.round(24 * Math.pow(c, 0.4))) : 0);
    let flow = 0, timer = null;
    const place = () => els.forEach((e) => { const p = pos(((e.t % LEN) + LEN) % LEN); e.c.setAttribute("cx", p[0]); e.c.setAttribute("cy", p[1]); e.c.setAttribute("opacity", flow ? 1 : 0.22); });
    const tick = () => {
      dots.forEach((arr, k) => arr.forEach((d) => {
        d.x = clamp(d.x + (r() - 0.5) * 3, x0[k] + 5, x0[k] + bw - 5); d.y = clamp(d.y + (r() - 0.5) * 3, liq + 6, bot - 6);
        d.c.setAttribute("cx", d.x.toFixed(1)); d.c.setAttribute("cy", d.y.toFixed(1));
      }));
      if (flow) { els.forEach((e) => (e.t += flow * 5)); place(); }
      timer = setTimeout(tick, 45);
    };
    // o: { c: [left, right] mol/L, E: volts (meter), flow: −1…1 (+ = electrons left → right), roles: [left, right] }
    svg.set = (o) => {
      if (o.c) o.c.forEach((c, k) => {
        const n = nDots(c);
        dots[k].forEach((d, i) => d.c.setAttribute("visibility", i < n ? "visible" : "hidden"));
        liquids[k].setAttribute("fill-opacity", (0.06 + 0.3 * Math.sqrt(Math.min(1, c))).toFixed(3));
        conc[k].textContent = f(ions[k]) + "  " + fmtC(c);
      });
      if (o.E != null) meter.textContent = volts(o.E);
      if (o.flow != null) { flow = Math.abs(o.flow) < 1e-4 ? 0 : Math.sign(o.flow) * (0.25 + 0.75 * Math.min(1, Math.abs(o.flow))); place(); }
      if (o.roles) o.roles.forEach((t, k) => (role[k].textContent = t));
    };
    svg.setElectrode = setElectrode;
    svg.stop = () => clearTimeout(timer);
    fitText(svg, 10, 1.3);
    place(); tick();
    return svg;
  }
  const ROLES = ["anode (−)", "cathode (+)"];
  const fmtS = (c) => (c >= 0.01 ? sci(c) : sci(c, 0)) + " M";   // compact, for slider value columns
  const wideVal = (row) => { const v = row.querySelector(".val"); v.style.width = "86px"; v.style.whiteSpace = "nowrap"; v.style.flexShrink = "0"; return row; };
  const cSlider = (name, value, oninput, min = 1e-4, max = 2) => wideVal(slider({ name, min, max, value, log: true, steps: 430, fmtv: fmtS, oninput }));

  const steps = [];

  // ---------------------------------------------------------------- 1
  steps.push({
    title: "1.10 V is only the starting line",
    short: "Voltage depends on ions",
    newConcepts: ["nonstd", "push"],
    render(el) {
      el.append(
        P(`In <em>Electrode potentials</em> you predicted the voltage of the Daniell cell, zinc in ${f("Zn^2+")} solution wired to copper in ${f("Cu^2+")} solution: E°<sub>cell</sub> = ${E_CU.toFixed(2)} − (${E_ZN.toFixed(2).replace("-", "−")}) = <b>${E0.toFixed(2)} V</b>. That number holds at <em>standard conditions</em>: both ion concentrations exactly 1 mol/L (1 M).`),
        P(`A working cell does not stay there. Every pair of electrons that takes the wire <b>uses up one ${f("Cu^2+")}</b> and <b>adds one ${f("Zn^2+")}</b>: ${f("Zn + Cu^2+ -> Zn^2+ + Cu")}. Any other mix of concentrations is called <b>non-standard conditions</b>, and that is where every real cell spends its life.`),
        P("Does the voltmeter care? Change the two concentrations and watch it.")
      );
      let zn = 1, cu = 1;
      const view = cellView();
      const sE = stat("cell voltage", "y"), sD = stat("compared with 1.10 V", "b");
      const upd = () => {
        const E = Ecell(zn, cu);
        view.set({ c: [zn, cu], E, flow: E / E0, roles: ROLES });
        sE.set(volts(E)); sD.set(mV(E - E0));
      };
      const s1 = cSlider(f("[Zn^2+]"), zn, (v) => { zn = v; upd(); }), s2 = cSlider(f("[Cu^2+]"), cu, (v) => { cu = v; upd(); });
      const preset = (a, b) => { zn = a; cu = b; s1.set(a); s2.set(b); upd(); };
      el.append(widget("Daniell cell: red dots are the metal ions (dot counts are schematic), yellow dots are electrons",
        view, s1, s2,
        h("div", { class: "readout" }, sE, sD),
        h("div", { class: "btns" },
          h("button", { onclick: () => preset(1, 1) }, "Standard: 1 M and 1 M"),
          h("button", { onclick: () => preset(1, 1e-4) }, f("Starve the copper side of Cu^2+")),
          h("button", { onclick: () => preset(2, 1) }, f("Crowd the zinc side with Zn^2+")),
          h("button", { onclick: () => preset(1e-4, 2) }, "Best case for the cell"))));
      upd();
      el.append(
        P(`Two things happen. With fewer ${f("Cu^2+")} ions around the copper, fewer of them reach the metal to take electrons, and the pull on the electrons weakens: the voltage drops. And when ${f("Zn^2+")} piles up around the zinc, the crowd pushes back against more zinc atoms joining it: the voltage drops again.`),
        P(`The pattern in one line: <b>more of what the reaction consumes means more push; more of what it produces means less.</b> A reaction leans away from whatever is piled up. Chemists call this <em>Le Chatelier's principle</em>. Notice also how small the effect is: you changed a concentration ten-thousand-fold and moved the voltage by about a tenth of a volt.`),
        takeaway(`E° is the voltage at 1 M. Away from 1 M the voltage shifts: more reactant ion (${f("Cu^2+")}) raises it, more product ion (${f("Zn^2+")}) lowers it.`)
      );
      return () => view.stop();
    },
    check: {
      type: "choice",
      q: `A Daniell cell has been running a lamp for an hour. Compared with the start, the solutions now hold less ${f("Cu^2+")} and more ${f("Zn^2+")}. What does the voltmeter show?`,
      options: ["Less than at the start: both changes lower the push", "The same: E° is a fixed property of zinc and copper", `More: the extra ${f("Zn^2+")} ions carry extra charge`],
      answer: 0,
      wrongHints: { 1: "E° is fixed, but it is only the voltage at 1 M. Move the sliders away from 1 M and watch the meter.", 2: `${f("Zn^2+")} is what the reaction produces. Piling up product pushes back on the reaction, it does not help it.` },
      why: "Less. Losing reactant ions and gaining product ions both reduce the push. This is why a cell's voltage sags as it runs.",
    },
  });

  // ---------------------------------------------------------------- 2
  steps.push({
    title: "One number for the mix: the reaction quotient Q",
    short: "Reaction quotient Q",
    newConcepts: ["Q"],
    render(el) {
      el.append(
        P(`Two sliders, one voltage. Is there a single number that captures the mix? Try the <em>Both ×10</em> button below: ten times more ${f("Zn^2+")} <i>and</i> ten times more ${f("Cu^2+")}, and the Daniell voltage does not move at all. <b>Only the ratio matters.</b>`),
        P("That ratio has a name, the <b>reaction quotient Q</b>: what the reaction makes, divided by what it uses up."),
        formula(`Q = <span class="bl">[products]</span> / <span class="hl">[reactants]</span> = <span class="bl">${f("[Zn^2+]")}</span> / <span class="hl">${f("[Cu^2+]")}</span><small>square brackets mean "concentration in mol/L" (from <i>Ions, salts and electrolytes</i>), taken as a plain number. Solid Zn and Cu are left out: a solid is equally "concentrated" however much of it there is.</small>`)
      );
      const RX = [
        { name: "Daniell cell", eq: f("Zn + Cu^2+ -> Zn^2+ + Cu"), prod: "Zn^2+", reac: "Cu^2+", pow: 1, E0: E0 },
        { name: "Zinc–silver cell", eq: f("Zn + 2Ag^+ -> Zn^2+ + 2Ag"), prod: "Zn^2+", reac: "Ag^+", pow: 2, E0: +(E_AG - E_ZN).toFixed(2) },
      ];
      let k = 0, a = 0.1, b = 0.1;
      const MIN = 1e-4, MAX = 1;
      const eq = h("div", { class: "formula", style: "margin:10px 0" });
      const sQ = stat("Q", "b"), sE = stat("cell voltage", "y"), sS = stat("E° of this cell", "");
      const msg = h("div", { class: "note", style: "min-height:22px;margin-top:8px" });
      const sa = slider({ name: "product", min: MIN, max: MAX, value: a, log: true, steps: 400, fmtv: fmtS, oninput: (v) => { a = v; msg.textContent = ""; upd(); } });
      const sb = slider({ name: "reactant", min: MIN, max: MAX, value: b, log: true, steps: 400, fmtv: fmtS, oninput: (v) => { b = v; msg.textContent = ""; upd(); } });
      wideVal(sa); wideVal(sb);
      const upd = () => {
        const R = RX[k], Q = a / Math.pow(b, R.pow), E = Chem.nernst(R.E0, 2, Q);
        sa.querySelector(".name").textContent = f("[" + R.prod + "]"); sb.querySelector(".name").textContent = f("[" + R.reac + "]");
        eq.innerHTML = `${R.eq}<small>Q = <span style="color:var(--blue)">${f("[" + R.prod + "]")}</span> / <span style="color:var(--yellow)">${f("[" + R.reac + "]")}${R.pow === 2 ? "²" : ""}</span> = ${sci(a)} / ${R.pow === 2 ? "(" + sci(b) + ")²" : sci(b)} = <b>${sci(Q)}</b></small>`;
        sQ.set(sci(Q)); sE.set(volts(E)); sS.set(R.E0.toFixed(2) + " V");
      };
      const both = (m) => {
        if (a * m < MIN * 0.999 || a * m > MAX * 1.001 || b * m < MIN * 0.999 || b * m > MAX * 1.001) { msg.textContent = "That would leave the slider range. Move a slider toward the middle first."; return; }
        const E1 = Chem.nernst(RX[k].E0, 2, a / Math.pow(b, RX[k].pow));
        a *= m; b *= m; sa.set(a); sb.set(b); upd();
        const E2 = Chem.nernst(RX[k].E0, 2, a / Math.pow(b, RX[k].pow));
        msg.innerHTML = Math.abs(E2 - E1) < 1e-6 ? "Both concentrations changed tenfold. Q did not change, and neither did the voltage." : `Both changed tenfold, but here Q changed too (the reactant is squared), so the voltage moved by ${mV(E2 - E1)}.`;
      };
      const tg = toggle("Reaction:", RX.map((R, i) => [i, R.name]), 0, (v) => { k = v; msg.textContent = ""; upd(); });
      el.append(widget("Set the two ion concentrations, then scale both together", tg, eq, sa, sb,
        h("div", { class: "btns" },
          h("button", { onclick: () => both(0.1) }, "Both ÷10"),
          h("button", { class: "primary", onclick: () => both(10) }, "Both ×10")),
        h("div", { class: "readout" }, sQ, sE, sS), msg));
      upd();
      el.append(
        P(`Now switch to the zinc–silver cell. Its reaction uses <b>two</b> ${f("Ag^+")} for every zinc atom, and the rule is that a species that appears twice counts twice: its concentration is <b>squared</b> in Q. Scaling both solutions no longer cancels.`),
        P("Three landmarks. At standard conditions every concentration is 1, so <b>Q = 1</b>. A fresh cell with plenty of reactant ion has a small Q. As the cell runs, Q only ever grows."),
        note("Simplification: strictly, Q is built from “activities”, effective concentrations. For dilute solutions these are close to the plain mol/L numbers, which is what this course uses."),
        takeaway("Q = product ion concentrations over reactant ion concentrations, each raised to its coefficient. Q = 1 at standard conditions and grows as the cell runs.")
      );
    },
    check: {
      type: "number",
      q: `A Daniell cell has ${f("[Zn^2+]")} = 0.5 M and ${f("[Cu^2+]")} = 0.01 M. What is Q?`,
      answer: 50, tolerance: 0.5,
      hint: `Product over reactant: ${f("[Zn^2+]")} divided by ${f("[Cu^2+]")}.`,
      why: "Q = 0.5 / 0.01 = 50. Much more product ion than reactant ion: this cell is well into its run.",
    },
  });

  // ---------------------------------------------------------------- 3
  steps.push({
    title: "Every tenfold step in Q costs the same voltage",
    short: "59 mV per decade",
    newConcepts: ["decade"],
    render(el) {
      el.append(
        P("How does the voltage depend on Q? Measure it. Start at Q = 1 and press <em>Q ×10</em> a few times, watching how much the voltage falls with each press."),
      );
      let n = 2, Q = 1;
      const pl = plot({ xmin: 1e-6, xmax: 1e6, ymin: 0.7, ymax: 1.5, xlog: true, clip: true, narrow: true, minFont: 10, height: 250,
        xlabel: "Q (each tick is ×100)", ylabel: "cell voltage (V)", xticks: [1e-6, 1e-4, 1e-2, 1, 1e2, 1e4, 1e6], yticks: [0.7, 0.9, 1.1, 1.3, 1.5] });
      const mk = pl.marker();
      const sQ = stat("Q", "b"), sE = stat("cell voltage", "y"), sP = stat("change per ×10 in Q", "r");
      const msg = h("div", { class: "note", style: "min-height:22px;margin-top:8px" });
      const E = (q, nn = n) => Chem.nernst(E0, nn, q);
      const draw = () => {
        pl.clear();
        pl.hline(E0, GREY, "E° = 1.10 V", { pos: "right" });
        [1, 2, 3].forEach((nn) => { if (nn !== n) pl.fn((q) => E(q, nn), "#4a5568", true); });
        pl.fn((q) => E(q), YEL);
        mk.move(Q, E(Q));
        sQ.set(sci(Q)); sE.set(volts(E(Q))); sP.set(mV(-S25 / n));
      };
      const sl = slider({ name: "Q", min: 1e-6, max: 1e6, value: Q, log: true, steps: 240, fmtv: (v) => sci(v, Math.abs(Math.log10(v)) < 2 ? 1 : 0), oninput: (v) => { Q = v; msg.textContent = ""; draw(); } });
      wideVal(sl);
      const times = (m) => {
        const q2 = Q * m;
        if (q2 > 1.001e6 || q2 < 0.999e-6) { msg.textContent = "End of the plotted range."; return; }
        const d = E(q2) - E(Q); Q = q2; sl.set(Q); draw();
        msg.innerHTML = `Q went ${m > 1 ? "up" : "down"} tenfold, to ${sci(Q)}. The voltage ${d < 0 ? "fell" : "rose"} by <b>${Math.abs(d * 1000).toFixed(1)} mV</b>.`;
      };
      const tg = toggle("Electrons per reaction:", [[1, "n = 1"], [2, "n = 2 (Daniell)"], [3, "n = 3"]], 2, (v) => { n = v; msg.textContent = ""; draw(); });
      el.append(widget("Voltage against Q, with Q on a ×10 scale", pl, sl,
        h("div", { class: "btns" },
          h("button", { onclick: () => times(0.1) }, "Q ÷10"),
          h("button", { class: "primary", onclick: () => times(10) }, "Q ×10"),
          h("button", { onclick: () => { Q = 1; sl.set(1); msg.textContent = ""; draw(); } }, "Back to Q = 1")),
        tg, h("div", { class: "readout" }, sQ, sE, sP), msg));
      draw();
      el.append(
        P("Every press costs the same <b>29.6 mV</b>, whether Q goes from 1 to 10 or from 10,000 to 100,000. What counts is not how much Q grows but <b>by what factor</b>. A factor of ten is called a <em>decade</em>, and on a ×10 axis the voltage is a straight line."),
        P(`Now try the other settings of n, the <em>electrons transferred per reaction</em> (from <em>Balancing redox equations</em>). n = 2 is the Daniell cell; n = 1 and n = 3 are imaginary cells with the same E°, for comparison. The slope is 59.2 mV for one electron, half of that for two, a third for three: <b>59.2 mV per decade, divided by n</b>.`),
        P("Why divided? The concentration effect is a fixed amount of energy per reaction. Voltage is energy <i>per unit of charge</i> (<em>volt = joule per coulomb</em>, from <em>Charge, energy and capacity</em>). If the reaction moves n electrons, the same energy is shared between n times more charge."),
        takeaway("At 25 °C, each tenfold increase in Q lowers the cell voltage by 59.2 mV ÷ n. Tenfold decrease: the same amount up.")
      );
    },
    check: {
      type: "number",
      q: `A Daniell cell (E° = ${E0.toFixed(2)} V, n = 2) has Q = 100. What is its voltage, in volts?`,
      answer: 1.04, tolerance: 0.006,
      hint: "Q = 100 is two tenfold steps above Q = 1. Each step costs 29.6 mV.",
      why: "Two decades × 29.6 mV = 59 mV below E°: 1.10 − 0.059 ≈ 1.04 V.",
    },
  });

  // ---------------------------------------------------------------- 4
  steps.push({
    title: "The Nernst equation",
    short: "The Nernst equation",
    newConcepts: ["nernst"],
    render(el) {
      el.append(
        P("“Start at E°, then subtract a fixed amount per decade of Q” is a logarithm. Written down, it is the <b>Nernst equation</b> (Walther Nernst, 1889):"),
        formula(`E = <span class="bl">E°</span> − <span class="hl">(0.0592 V / n)</span> · log₁₀ Q<small>at 25 °C. log₁₀ Q counts the decades: log₁₀ 1 = 0, log₁₀ 100 = 2, log₁₀ 0.001 = −3</small>`),
        P("Where does 59.2 mV come from? From three constants and the temperature:"),
        formula(`E = <span class="bl">E°</span> − <span class="hl">(RT / nF)</span> · ln Q<small>R = ${Chem.R} J/(mol·K) is the gas constant, which converts temperature into energy per mole; T is the temperature in kelvin (°C + 273.15); F = ${Chem.F.toLocaleString("en-US")} C/mol is the <i>Faraday constant</i>; ln is the natural log, and ln Q = 2.303 · log₁₀ Q</small>`),
        P(`RT is the energy of random thermal jostling per mole. Divided by F it becomes a voltage, about 25.7 mV at 25 °C, and × 2.303 gives 59.2 mV. So the concentration effect is <b>thermal</b>: a warmer cell reacts more strongly to Q.`),
        P(`The equation also works for <b>one electrode at a time</b>. For ${f("Cu^2+ + 2e- -> Cu")} the quotient is 1 / ${f("[Cu^2+]")}, so each electrode's potential slides up and down the ladder with its own ion concentration, and the cell voltage is still the gap: cathode − anode.`)
      );
      let zn = 1, cu = 1, tc = 25;
      const W = narrow(520, 380), H = 262, AX = 52, cw = (W - AX - 28 - 20 - 112) / 2;
      const svg = s("svg", { viewBox: `0 0 ${W} ${H}`, width: "100%", style: "max-width:560px;display:block;margin:0 auto" });
      const Y = (v) => 18 + ((0.6 - v) / 1.6) * 226;
      svg.append(s("line", { x1: AX, x2: AX, y1: Y(0.6), y2: Y(-1), class: "axis" }));
      const tx = (x, y, t, anchor = "start", fill) => { const e = s("text", { x, y, "text-anchor": anchor }); e.textContent = t; if (fill) e.style.fill = fill; svg.append(e); return e; };
      for (let v = -1; v <= 0.601; v += 0.4) { tx(AX - 6, Y(v) + 4, (v >= 0 ? "+" : "−") + Math.abs(v).toFixed(1), "end"); svg.append(s("line", { x1: AX - 3, x2: AX, y1: Y(v), y2: Y(v), class: "axis" })); }
      const ylab = s("text", { x: 11, y: H / 2, "text-anchor": "middle", transform: `rotate(-90 11 ${H / 2})` }); ylab.textContent = "potential (V)"; svg.append(ylab);
      const colX = [AX + 28, AX + 28 + cw + 20], AR = W - 100;
      const cols = [{ e0: E_ZN, name: f("Zn^2+/Zn"), color: GREY }, { e0: E_CU, name: f("Cu^2+/Cu"), color: "#e0915a" }].map((c, k) => {
        svg.append(s("line", { x1: colX[k], x2: colX[k] + cw, y1: Y(c.e0), y2: Y(c.e0), stroke: c.color, "stroke-width": 1.5, "stroke-dasharray": "4 4", opacity: 0.6 }));
        const ext = s("line", { x1: colX[k] + cw, x2: AR + 6, stroke: c.color, "stroke-width": 1, "stroke-dasharray": "2 4", opacity: 0.6 }); svg.append(ext);
        const ln = s("line", { x1: colX[k], x2: colX[k] + cw, stroke: c.color, "stroke-width": 4, "stroke-linecap": "round" }); svg.append(ln);
        const l1 = tx(colX[k] + cw / 2, 0, c.name, "middle", "#e6e9ef"), l2 = tx(colX[k] + cw / 2, 0, "", "middle", c.color);
        return { ...c, ext, ln, l1, l2 };
      });
      const arrow = s("line", { x1: AR, x2: AR, stroke: YEL, "stroke-width": 2.5 }); svg.append(arrow);
      const capA = s("polygon", { fill: YEL }), capB = s("polygon", { fill: YEL }); svg.append(capA, capB);
      const g1 = tx(AR + 10, 0, "cell voltage", "start", YEL), g2 = tx(AR + 10, 0, "", "start", YEL);
      g2.style.fontFamily = "var(--mono)"; g2.style.fontSize = "calc(14px * var(--c-k, 1))";
      fitText(svg, 10, 1.25);
      const live = h("div", { class: "formula", style: "margin:10px 0 0;font-size:16px" });
      const sT = stat("RT / F", "b"), sS = stat("per decade, per electron", "r"), sE = stat("cell voltage", "y");
      const upd = () => {
        const T = tc + 273.15, S = slopeAt(T);
        const eZn = E_ZN + (S / 2) * Math.log10(zn), eCu = E_CU + (S / 2) * Math.log10(cu), E = eCu - eZn;
        [eZn, eCu].forEach((e, k) => {
          const c = cols[k], y = Y(e);
          c.ln.setAttribute("y1", y); c.ln.setAttribute("y2", y); c.ext.setAttribute("y1", y); c.ext.setAttribute("y2", y);
          c.l1.setAttribute("y", y + 18); c.l2.setAttribute("y", y + 33);   // labels under the solid line, clear of the dashed E° line
          c.l2.textContent = (e > 0 ? "+" : "") + volts(e);
        });
        const ya = Y(eCu), yb = Y(eZn);
        arrow.setAttribute("y1", ya + 6); arrow.setAttribute("y2", yb - 6);
        capA.setAttribute("points", `${AR},${ya} ${AR - 5},${ya + 9} ${AR + 5},${ya + 9}`);
        capB.setAttribute("points", `${AR},${yb} ${AR - 5},${yb - 9} ${AR + 5},${yb - 9}`);
        g1.setAttribute("y", (ya + yb) / 2 - 4); g2.setAttribute("y", (ya + yb) / 2 + 14); g2.textContent = volts(E);
        const Q = zn / cu;
        live.innerHTML = `E = ${E0.toFixed(2)} − (<span class="hl">${S.toFixed(4)}</span> / 2) · log₁₀(<span class="bl">${sci(Q)}</span>) = <b>${volts(E)}</b><small>Q = ${f("[Zn^2+]")} / ${f("[Cu^2+]")} = ${sci(zn)} / ${sci(cu)}; log₁₀ Q = ${Math.log10(Q).toFixed(2).replace("-", "−")}</small>`;
        sT.set((S / Math.LN10 * 1000).toFixed(1) + " mV"); sS.set((S * 1000).toFixed(1) + " mV"); sE.set(volts(E));
      };
      const s1 = cSlider(f("[Zn^2+]"), zn, (v) => { zn = v; upd(); }, 1e-6, 2), s2 = cSlider(f("[Cu^2+]"), cu, (v) => { cu = v; upd(); }, 1e-6, 2);
      const s3 = slider({ name: "temp.", min: 0, max: 100, step: 1, value: tc, fmtv: (v) => v + " °C", oninput: (v) => { tc = v; upd(); } });
      const preset = (a, b, t) => { zn = a; cu = b; tc = t; s1.set(a); s2.set(b); s3.set(t); upd(); };
      el.append(widget("The potential ladder: dashed = E° (1 M), solid = the real potential at your concentrations", svg, s1, s2, s3, live,
        h("div", { class: "readout" }, sT, sS, sE),
        h("div", { class: "btns" },
          h("button", { onclick: () => preset(1, 1, 25) }, "Standard, 25 °C"),
          h("button", { onclick: () => preset(1, 1e-6, 25) }, f("Cu^2+ a million times thinner")),
          h("button", { onclick: () => preset(1, 1e-6, 100) }, "…and at 100 °C"))));
      upd();
      el.append(
        note("Simplification: E° itself drifts slightly with temperature. Here it is held at its 25 °C value so you see only the RT/nF term."),
        takeaway("Nernst equation: E = E° − (RT/nF) ln Q, which at 25 °C is E° − (0.0592 V / n) log₁₀ Q. It works for a whole cell or a single electrode.")
      );
    },
    check: {
      type: "number",
      q: `A copper electrode (${f("Cu^2+ + 2e- -> Cu")}, E° = +${E_CU.toFixed(2)} V) sits in a solution with ${f("[Cu^2+]")} = 0.01 M at 25 °C. What is its potential, in volts?`,
      answer: 0.281, tolerance: 0.004,
      hint: `Q = 1 / ${f("[Cu^2+]")} = 100, so log₁₀ Q = 2. Then E = 0.34 − (0.0592 / 2) × 2.`,
      why: "E = 0.34 − 0.0296 × 2 = 0.281 V. Fewer ions to take electrons, so the copper electrode sits a little lower on the ladder.",
      backTo: 2,
    },
  });

  // ---------------------------------------------------------------- 5
  steps.push({
    title: "A cell from one metal: the concentration cell",
    short: "Concentration cells",
    newConcepts: ["conccell"],
    render(el) {
      el.append(
        P(`Here is a strange consequence. Put copper in <em>both</em> beakers, with ${f("Cu^2+")} solution in both. Same metal, same ion, so E°<sub>cell</sub> = 0.34 − 0.34 = 0. No cell?`),
        P("Now make one solution more dilute than the other. Each electrode slides along the ladder by its own concentration (last step), the two levels separate, and a voltage appears. This is a <b>concentration cell</b>: the only thing driving it is the difference in concentration."),
        formula(`E = 0 − <span class="hl">(0.0592 V / 2)</span> · log₁₀( <span class="bl">${f("[Cu^2+]")}<sub>dilute</sub> / ${f("[Cu^2+]")}<sub>concentrated</sub></span> )`)
      );
      let a = 0.01, b = 1, run = null;
      const view = cellView({ metals: ["Cu", "Cu"], ions: ["Cu^2+", "Cu^2+"], tints: ["#3b8fd9", "#3b8fd9"], seed: 11 });
      const sE = stat("cell voltage", "y"), sR = stat("concentration ratio", "b"), sW = stat("electrons flow", "");
      const say = h("div", { class: "note", style: "min-height:40px;margin-top:8px" });
      const upd = () => {
        const E = (S25 / 2) * Math.abs(Math.log10(a / b)), same = Math.abs(a - b) <= 1e-9 * Math.max(a, b), dir = same ? 0 : a < b ? 1 : -1;
        view.set({ c: [a, b], E: same ? 0 : E, flow: dir * clamp(E / 0.06, 0.05, 1), roles: same ? ["", ""] : dir > 0 ? ROLES : [ROLES[1], ROLES[0]] });
        sE.set(((same ? 0 : E) * 1000).toFixed(1) + " mV"); sR.set(same ? "1" : sci(Math.max(a, b) / Math.min(a, b)));
        sW.set(same ? "nowhere" : dir > 0 ? "left → right" : "right → left");
        say.innerHTML = same ? "Equal concentrations: Q = 1, E = 0. Nothing left to drive the electrons."
          : `Dilute side (anode): ${f("Cu -> Cu^2+ + 2e-")}, making more ions. Concentrated side (cathode): ${f("Cu^2+ + 2e- -> Cu")}, removing ions. Both changes shrink the difference.`;
      };
      const s1 = cSlider("left", a, (v) => { a = v; stop(); upd(); }), s2 = cSlider("right", b, (v) => { b = v; stop(); upd(); });
      const stop = () => { clearTimeout(run); run = null; };
      const preset = (x, y) => { stop(); a = x; b = y; s1.set(a); s2.set(b); upd(); };
      const go = () => {
        if (run) return;
        const tick = () => {
          const m = (a + b) / 2, d = (b - a) / 2;
          if (Math.abs(d) < 0.004 * m) { a = b = m; run = null; } else { a += d * 0.06; b -= d * 0.06; run = setTimeout(tick, 50); }
          s1.set(a); s2.set(b); upd();
        };
        tick();
      };
      el.append(widget(f("Copper in both beakers. Only the Cu^2+ concentrations differ"), view, s1, s2,
        h("div", { class: "readout" }, sE, sR, sW), say,
        h("div", { class: "btns" },
          h("button", { class: "primary", onclick: go }, "Let it run"),
          h("button", { onclick: () => preset(0.01, 1) }, "Left 100× more dilute"),
          h("button", { onclick: () => preset(1, 0.01) }, "Swap the beakers"),
          h("button", { onclick: () => preset(1e-4, 1) }, "Left 10,000× more dilute"))));
      upd();
      el.append(
        P("Press <em>Let it run</em>. The cell works to erase its own cause: the dilute side dissolves copper, the concentrated side plates it out, and when the two concentrations meet, the voltage is gone. The voltages are small: 29.6 mV for every tenfold difference."),
        P(`Small, but precise, which makes concentration cells good <b>measuring instruments</b>. A pH meter is one: its electrode responds to hydrogen ions, ${f("H^+")}, and reads about 59 mV for every tenfold change in ${f("[H^+]")} (one “pH unit”; ${f("H^+")} carries one charge, so n = 1).`),
        takeaway("A concentration difference alone makes a voltage: (59.2 mV / n) per tenfold difference. Electrons flow in the direction that evens the concentrations out.")
      );
      return () => { stop(); view.stop(); };
    },
    check: {
      type: "number",
      q: `A copper concentration cell has ${f("[Cu^2+]")} = 0.001 M in one beaker and 0.1 M in the other, at 25 °C. What voltage does it give, in <b>mV</b>?`,
      answer: 59.2, tolerance: 1.5,
      hint: "0.001 to 0.1 is two tenfold steps. For n = 2, each step is worth 29.6 mV.",
      why: "Two decades × 29.6 mV ≈ 59 mV. The copper in the 0.001 M beaker is the anode: it dissolves to raise its side's concentration.",
      backTo: 2,
    },
  });

  // ---------------------------------------------------------------- 6
  steps.push({
    title: "A dead cell is a cell at equilibrium",
    short: "Dead cell = equilibrium",
    newConcepts: ["dead"],
    render(el) {
      el.append(
        P("Back to the Daniell cell. The Nernst equation is a tug of war between two terms:"),
        formula(`E = <span class="bl">E°</span> − <span class="hl">(0.0592 V / n) · log₁₀ Q</span><small><span style="color:var(--blue)">E°</span>: the chemistry's built-in push, fixed (zinc gives electrons more readily than copper). <span style="color:var(--yellow)">The Q term</span>: the pushback from the products that have piled up. It grows as the cell runs.</small>`),
        P("As the cell runs, Q climbs and the pushback grows, one more 29.6 mV for every decade. Drag Q upward and see what happens when the pushback catches up with E°.")
      );
      let x = 0;
      const view = cellView({ seed: 5 });
      const bars = hbars(["E° (built-in push)", "Q term (pushback)", "E (what is left)"], { signed: true, max: 1.5, labelWidth: narrow(170, 104), fmtv: (v) => volts(v, 3) });
      const sQ = stat("Q", "b"), sE = stat("cell voltage", "y");
      const say = h("div", { class: "note", style: "min-height:60px;margin-top:8px" });
      const upd = () => {
        const Q = Math.pow(10, x), E = E0 - (S25 / 2) * x, dead = Math.abs(E) < 0.0016;
        bars.update([E0, -(S25 / 2) * x, dead ? 0 : E], [BLUE, YEL, dead ? GREY : E > 0 ? GRN : RED]);
        view.set({ c: x >= 0 ? [1, Math.pow(10, -x)] : [Q, 1], E: dead ? 0 : E, flow: dead ? 0 : E / E0, roles: dead ? ["", ""] : E > 0 ? ROLES : [ROLES[1], ROLES[0]] });
        sQ.set(sci(Q)); sE.set(volts(dead ? 0 : E));
        say.innerHTML = dead ? `<b style="color:var(--text)">E = 0: the cell is dead.</b> Push and pushback cancel exactly. Atoms and ions still swap electrons at both electrodes, but ${f("Zn + Cu^2+ -> Zn^2+ + Cu")} and its reverse now happen equally often, so nothing changes any more. This state is <b>equilibrium</b>.`
          : E > 0 ? `E is positive: the reaction runs forward, ${f("Zn + Cu^2+ -> Zn^2+ + Cu")}, and electrons flow from zinc to copper. That raises Q, so the cell moves to the right on this slider by itself.`
            : `E is negative: there is more product than even equilibrium allows. The reaction would run <b>backwards</b>, ${f("Zn^2+ + Cu -> Zn + Cu^2+")}, electrons flowing from copper to zinc, until Q falls back.`;
      };
      const sl = slider({ name: "Q", min: -4, max: 45, step: 0.1, value: x, fmtv: (v) => sci(Math.pow(10, v), Math.abs(v) < 2 ? 1 : 0), oninput: (v) => { x = v; upd(); } });
      wideVal(sl);
      const jump = (v) => { x = v; sl.set(v); upd(); };
      el.append(widget(`Daniell cell with ${f("[Zn^2+]")} held at 1 M and ${f("[Cu^2+]")} = 1/Q (below Q = 1 the zinc side is diluted instead)`, view, sl, bars,
        h("div", { class: "readout" }, sQ, sE), say,
        h("div", { class: "btns" },
          h("button", { onclick: () => jump(0) }, "Fresh cell (Q = 1)"),
          h("button", { class: "primary", onclick: () => jump(+LOGK.toFixed(1)) }, "Find E = 0"),
          h("button", { onclick: () => jump(42) }, "Overshoot (Q = 10⁴²)"))));
      upd();
      el.append(
        P(`So a “dead” cell is not out of chemicals in the everyday sense, and nothing has broken. <b>It has reached the one value of Q where the two directions balance.</b> From either side, the reaction always moves Q toward that value, and the voltage tells you how far away it still is.`),
        P(`In <em>Charge, energy and capacity</em> you met ΔG = −nFE, the energy a reaction can still deliver as electrical work. E = 0 means ΔG = 0: nothing left to deliver.`),
        takeaway("A cell runs until Q has grown so far that the pushback cancels E°. Then E = 0, nothing changes any more: equilibrium. A dead cell is a cell at equilibrium.")
      );
      return () => view.stop();
    },
    check: {
      type: "choice",
      q: "A Daniell cell has run all the way down and now reads exactly 0 V. Which statement is true?",
      options: [
        "Every reaction at the electrodes has stopped: no atom or ion does anything any more",
        "Forward and reverse reactions happen equally often, so the concentrations no longer change",
        `Q has fallen to 0, because the ${f("Zn^2+")} ions are used up`,
      ],
      answer: 1,
      wrongHints: {
        0: "Individual atoms and ions keep exchanging electrons. What stops is the net change, because both directions run at the same rate.",
        2: `${f("Zn^2+")} is the product: it piles up while the cell runs. Q grows as the cell runs down, it does not shrink.`,
      },
      why: "At equilibrium both directions still run, at equal rates. No net reaction means no net electron flow and no voltage.",
    },
  });

  // ---------------------------------------------------------------- 7
  steps.push({
    title: "E° tells you where equilibrium lies: K",
    short: "K from E°",
    newConcepts: ["K"],
    render(el) {
      el.append(
        P("The value of Q at which a reaction balances is a fixed number for that reaction (at a given temperature). It is called the <b>equilibrium constant K</b>. You can now compute it: set E = 0 and Q = K in the Nernst equation."),
        formula(`0 = <span class="bl">E°</span> − (0.0592 V / n) · log₁₀ K  →  <span class="hl">log₁₀ K = n · E° / 0.0592 V</span><small>at 25 °C</small>`),
        P(`For the Daniell cell: log₁₀ K = 2 × ${E0.toFixed(2)} / 0.0592 = ${LOGK.toFixed(1)}, so <b>K ≈ 10³⁷</b>. At equilibrium there are 10³⁷ ${f("Zn^2+")} ions for every ${f("Cu^2+")}. A beaker holds nowhere near 10³⁷ ions, so in practice not one ${f("Cu^2+")} is left: the reaction “goes to completion”.`),
        P("A modest voltage means an enormous K, because every 29.6 mV of E° is another factor of ten. Pick other metal pairs and look for a small K.")
      );
      const METALS = ["Zn", "Fe", "Cd", "Co", "Ni", "Sn", "Pb", "Cu"];
      let A = "Zn", C = "Cu";
      const eq = h("div", { class: "formula", style: "margin:10px 0" });
      const sE = stat("E°cell", "y"), sL = stat("log₁₀ K", "b"), sK = stat("K", "g");
      const bars = hbars(["", ""], { max: 2, series: [RED], labelWidth: narrow(150, 96), fmtv: (v) => fmtC(v) });
      const say = h("div", { class: "note", style: "min-height:44px;margin-top:8px" });
      const upd = () => {
        const ea = Chem.E0by[A].E, ec = Chem.E0by[C].E, e0 = +(ec - ea).toFixed(2), lk = 2 * e0 / S25, K = Math.pow(10, lk);
        eq.innerHTML = `${f(`${A} + ${C}^2+ -> ${A}^2+ + ${C}`)}<small>E°cell = E°(${C}) − E°(${A}) = ${ec.toFixed(2).replace("-", "−")} − (${ea.toFixed(2).replace("-", "−")}) = ${e0.toFixed(2).replace("-", "−")} V; n = 2; K = ${f(`[${A}^2+]`)} / ${f(`[${C}^2+]`)} at equilibrium</small>`;
        sE.set(volts(e0, 2)); sL.set(lk.toFixed(1).replace("-", "−")); sK.set(sci(K));
        const xr = (K - 1) / (K + 1), ca = 1 + xr, cc = 2 / (K + 1);
        bars.labelAt(0, f(`${A}^2+`) + " (product)"); bars.labelAt(1, f(`${C}^2+`) + " (reactant)");
        bars.update([ca, cc]);
        say.innerHTML = A === C ? "Same metal on both sides: E° = 0 and K = 1. Equilibrium is simply equal concentrations, as in the concentration cell."
          : lk > 6 ? `Start with 1 M of each ion and let it run: essentially all the ${f(C + "^2+")} is consumed before the cell dies.`
            : lk > 0 ? `A small E°, so a small K. This cell dies with <b>plenty of reactant ion still in the beaker</b>: starting from 1 M each, ${fmtC(cc)} of ${f(C + "^2+")} is left over at equilibrium.`
              : `Negative E°cell, K below 1: as written, the reaction prefers to run backwards. Starting from 1 M each, ${f(C)} dissolves and ${f(A)} plates out until the bars below are reached.`;
      };
      const mk = (lab, cur, set) => toggle(lab, METALS.map((m) => [m, m]), cur, (v) => { set(v); upd(); });
      el.append(widget("Pick two metals (all form 2+ ions, so n = 2 and Q is a simple ratio)",
        mk("Gives electrons:", A, (v) => (A = v)), mk("Its ion takes them:", C, (v) => (C = v)), eq,
        h("div", { class: "readout" }, sE, sL, sK),
        h("div", { class: "note", style: "margin-top:12px" }, "Concentrations at equilibrium, starting from 1 M of each ion:"), bars, say));
      upd();
      el.append(
        P(`Try tin giving electrons to ${f("Pb^2+")}: E° is only 0.01 V and K is about 2. That cell stops with almost two thirds of its ${f("Pb^2+")} unused. E° and K are the same information on two scales: <b>E° &gt; 0 ⇔ K &gt; 1</b> (products favoured), and each extra 59.2 mV / n multiplies K by ten.`),
        takeaway("K is the value of Q at equilibrium. At 25 °C, log₁₀ K = n·E° / 0.0592 V: a table of E° values is also a table of equilibrium constants.")
      );
    },
    check: {
      type: "number",
      q: "A two-electron reaction (n = 2) has E°<sub>cell</sub> = 0.0592 V at 25 °C. What is its equilibrium constant K?",
      answer: 100, tolerance: 1,
      hint: "log₁₀ K = n · E° / 0.0592. Then K is 10 to that power.",
      why: "log₁₀ K = 2 × 0.0592 / 0.0592 = 2, so K = 10² = 100. Not even 60 mV, and products already outnumber reactants 100 to 1.",
      backTo: 5,
    },
  });

  // ---------------------------------------------------------------- 8
  steps.push({
    title: "Why the voltage sags slowly, then falls off a cliff",
    short: "Slow sag, then a cliff",
    newConcepts: [],
    render(el) {
      el.append(
        P(`Put the pieces together and follow a Daniell cell through its life. Each reaction turns one ${f("Cu^2+")} into one ${f("Zn^2+")}, so the two concentrations are tied together, and Q = ${f("[Zn^2+]")} / ${f("[Cu^2+]")} rises as the copper ions are consumed.`),
        P("But the voltage only cares about <b>decades</b> of Q. Using up half of the copper ions roughly triples Q: half a decade, about 14 mV. To lose a full 100 mV you need Q to rise more than a thousandfold, and that only happens when the copper ions are nearly gone. Drag the cell through its life:")
      );
      let c0 = 1, z0 = 1, p = 0;
      const pl = plot({ xmin: 0, xmax: 100, ymin: 0.9, ymax: 1.25, clip: true, narrow: true, minFont: 10, height: 250,
        xlabel: "copper ions used up (%)", ylabel: "cell voltage (V)", xticks: [0, 25, 50, 75, 100], yticks: [0.9, 1.0, 1.1, 1.2] });
      const mk = pl.marker();
      const sE = stat("cell voltage", "y"), sD = stat("change since the start", "r"), sQ = stat("Q", "b"), sC = stat(f("Cu^2+ left"), "");
      const at = (pp) => { const cu = c0 * (1 - pp / 100), zn = z0 + c0 * pp / 100; return { cu, zn, Q: zn / cu, E: Ecell(zn, cu) }; };
      const draw = () => {
        pl.clear();
        pl.hline(E0, GREY, "E° = 1.10 V", { pos: "right" });
        const pts = []; for (let i = 0; i <= 400; i++) { const x = i < 380 ? (i / 380) * 99 : 99 + ((i - 380) / 20) * 0.999; pts.push([x, at(x).E]); }
        pl.line(pts, YEL);
        const a = at(p); mk.move(p, Math.max(0.9, a.E));
        sE.set(volts(a.E)); sD.set(mV(a.E - at(0).E)); sQ.set(sci(a.Q)); sC.set(fmtC(a.cu));
      };
      const sp = slider({ name: "used up", min: 0, max: 99.9, step: 0.1, value: p, fmtv: (v) => v.toFixed(1) + " %", oninput: (v) => { p = v; draw(); } });
      const sc = slider({ name: f("start [Cu^2+]"), nameWidth: 150, min: 0.1, max: 2, step: 0.1, value: c0, fmtv: (v) => v.toFixed(1) + " M", oninput: (v) => { c0 = v; draw(); } });
      const sz = slider({ name: f("start [Zn^2+]"), nameWidth: 150, min: 1e-3, max: 2, log: true, steps: 330, value: z0, fmtv: fmtS, oninput: (v) => { z0 = v; draw(); } });
      const setP = (v) => { p = v; sp.set(v); draw(); };
      const preset = (c, z) => { c0 = c; z0 = z; sc.set(c); sz.set(z); draw(); };
      el.append(widget("Voltage over the life of the cell (both beakers the same volume)", pl, sp,
        h("div", { class: "btns" },
          h("button", { onclick: () => setP(0) }, "Fresh"), h("button", { onclick: () => setP(50) }, "50% used"),
          h("button", { onclick: () => setP(90) }, "90% used"), h("button", { onclick: () => setP(99) }, "99% used"), h("button", { onclick: () => setP(99.9) }, "99.9% used")),
        h("div", { class: "readout" }, sE, sD, sQ, sC), sc, sz,
        h("div", { class: "btns" },
          h("button", { onclick: () => preset(1, 1) }, "Textbook start: 1 M and 1 M"),
          h("button", { onclick: () => preset(1.5, 0.01) }, "Strong copper, dilute zinc"))));
      draw();
      el.append(
        P("This is the shape of a battery's life: a long, slowly sagging plateau, then a cliff. The plateau is why a cell is useful (nearly constant voltage while it works) and also why <b>voltage is a poor fuel gauge</b>: at 90% used, the meter has dropped by less than 4%."),
        P(`The second preset shows how to start <em>above</em> E°: plenty of reactant ion and very little product ion gives Q well below 1. The plot stops at 0.9 V, but the cliff does not: it falls all the way to 0 V, where Q = K ≈ 10³⁷.`),
        takeaway("Voltage falls by 29.6 mV per decade of Q, and Q only gains many decades when the reactant ion is almost gone. Hence: long plateau, sudden death.")
      );
    },
    check: {
      type: "number",
      q: `A Daniell cell starts at 1 M and 1 M (E = ${E0.toFixed(2)} V). After 99% of the ${f("Cu^2+")} is used, ${f("[Cu^2+]")} = 0.01 M and ${f("[Zn^2+]")} = 1.99 M. By how many <b>mV</b> has the voltage dropped?`,
      answer: 68, tolerance: 2.5,
      hint: "Q = 1.99 / 0.01 = 199. log₁₀ 199 ≈ 2.3 decades, each worth 29.6 mV.",
      why: "Q = 199, log₁₀ Q ≈ 2.30, and 2.30 × 29.6 mV ≈ 68 mV. 99% of the fuel gone, 6% of the voltage gone.",
      backTo: 2,
    },
  });

  // ---------------------------------------------------------------- 9
  steps.push({
    title: "Capstone: run a Daniell cell until it dies",
    short: "Capstone: run it down",
    newConcepts: [],
    render(el) {
      el.append(
        P(`Everything at once. Two beakers of 100 mL, a zinc strip, a copper strip (assume plenty of zinc metal), and a load drawing a steady current. Each tick of the simulation moves charge through the wire, converts ${f("Cu^2+")} into ${f("Zn^2+")} by <em>Faraday's constant</em> (2 × ${Chem.F.toLocaleString("en-US")} C per mole of copper), recomputes Q and reads the voltage off the Nernst equation.`),
        P("Press <em>Run</em>. The left plot is what a user of the battery sees: voltage against charge delivered. The right plot is what Nernst sees: the same cell sliding down a straight line, decade by decade, toward Q = K.")
      );
      const VOL = 0.1, N = 2, DT = 120;
      let c0 = 1, z0 = 1, I = 1, cu, zn, q, wh, mol, t, hist, cap, dead, gasp, running = false, timer = null;
      const view = cellView({ seed: 3 });
      const plA = plot({ xmin: 0, xmax: 1, ymin: 0, ymax: 1.3, clip: true, width: 400, height: 230, minFont: 10, xlabel: "charge delivered (mAh)", ylabel: "cell voltage (V)", xticks: [0, 1], yticks: [0, 0.5, 1.0], xfmt: (v) => Math.round(v) });
      const plB = plot({ xmin: -3, xmax: 40, ymin: 0, ymax: 1.3, clip: true, width: 400, height: 230, minFont: 10, xlabel: "Q (each tick is ×10¹⁰)", ylabel: "cell voltage (V)", xticks: [0, 10, 20, 30, 40], yticks: [0, 0.5, 1.0], xfmt: (v) => (v === 0 ? "1" : "10" + sup(v)) });
      plB.fn((x) => E0 - (S25 / 2) * x, BLUE);
      plB.vline(LOGK, PUR, "Q = K", { pos: "left" });
      const mkB = plB.marker(YEL);
      const sE = stat("cell voltage", "y"), sQ = stat("Q", "b"), sC = stat(f("[Cu^2+]"), ""), sT = stat("running time", ""),
        sM = stat("charge delivered", "g"), sW = stat("energy delivered", "g"), sG = stat("Zn dissolved / Cu plated", "");
      const status = h("div", { class: "note", style: "min-height:44px;margin-top:8px" });
      const E = () => (dead ? 0 : Ecell(zn, cu));
      const runBtn = h("button", { class: "primary", onclick: () => (running ? pause() : start()) }, "Run");
      const draw = () => {
        const e = E(), Q = zn / cu;
        view.set({ c: [zn, cu], E: e, flow: running && !dead ? clamp(I / 3, 0.15, 1) : 0, roles: ROLES });
        view.setElectrode(0, 14 - 8 * Math.min(1, mol / 0.25)); view.setElectrode(1, 12 + 9 * Math.min(1, mol / 0.25));
        plA.clear(); plA.line(hist, YEL);
        mkB.move(clamp(Math.log10(Q), -3, 40), Math.max(0, e));
        sE.set(volts(e)); sQ.set(sci(Q)); sC.set(fmtC(cu)); sT.set((t / 3600).toFixed(1) + " h");
        sM.set(Math.round(q / 3.6) + " mAh"); sW.set((wh).toFixed(2) + " Wh");
        sG.set((mol * Chem.elements.Zn.mass).toFixed(2) + " g / " + (mol * Chem.elements.Cu.mass).toFixed(2) + " g");
        runBtn.textContent = running ? "Pause" : "Run";
        status.innerHTML = dead ? `<b style="color:var(--text)">Dead: E = 0 and Q = K ≈ ${sci(KEQ)}.</b> Equilibrium. The ${f("Cu^2+")} left is ${fmtC(cu)}, far less than one ion in the beaker. Add copper sulfate crystals to bring it back to life.`
          : gasp ? `<b style="color:var(--text)">The cliff.</b> The copper ions are almost gone, so each tiny bit of charge now multiplies Q. The cell is sliding down the Nernst line about half a decade per tick, while the left plot drops almost vertically.`
            : running ? `Running: ${f("Zn -> Zn^2+ + 2e-")} at the anode, ${f("Cu^2+ + 2e- -> Cu")} at the cathode. The zinc strip thins, the copper strip thickens, the blue of the copper solution fades.`
              : "Paused. Set the starting concentrations and the current, then press Run.";
      };
      const setCap = () => { cap = Math.max(cap, q / 3.6 + cu * VOL * N * Chem.F / 3.6); const r = cap > 2000 ? 1000 : cap > 400 ? 200 : 50, top = Math.ceil(cap / r) * r; plA.setRange({ xmax: top, xticks: [0, top / 2, top] }); };
      const pause = () => { running = false; clearTimeout(timer); timer = null; draw(); };
      const reset = () => { clearTimeout(timer); timer = null; running = false; cu = c0; zn = z0; q = 0; wh = 0; mol = 0; t = 0; dead = false; gasp = false; cap = 0; hist = [[0, Ecell(zn, cu)]]; setCap(); draw(); };
      const stepSim = () => {
        const cuEq = (cu + zn) / (KEQ + 1), e1 = E();
        let d = I * DT / (N * Chem.F * VOL), dt = DT; gasp = false;
        if (d > cu * 0.68) { dt = DT * (cu * 0.68) / d; d = cu * 0.68; gasp = true; }
        if (cu - d <= cuEq) { d = Math.max(0, cu - cuEq); dead = true; }
        cu -= d; zn += d; mol += d * VOL; t += dt;
        const dq = d * N * Chem.F * VOL, e2 = E();
        q += dq; wh += dq * (e1 + e2) / 2 / 3600; hist.push([q / 3.6, e2]);
      };
      const start = () => {
        if (dead || running) return;
        running = true;
        const tick = () => { stepSim(); if (dead) { running = false; timer = null; draw(); return; } draw(); timer = setTimeout(tick, 40); };
        tick();
      };
      const sc = slider({ name: f("start [Cu^2+]"), nameWidth: 150, min: 0.1, max: 2, step: 0.1, value: c0, fmtv: (v) => v.toFixed(1) + " M", oninput: (v) => { c0 = v; reset(); } });
      const sz = slider({ name: f("start [Zn^2+]"), nameWidth: 150, min: 1e-3, max: 2, log: true, steps: 330, value: z0, fmtv: fmtS, oninput: (v) => { z0 = v; reset(); } });
      const si = slider({ name: "current drawn", nameWidth: 150, min: 0.2, max: 5, step: 0.1, value: I, fmtv: (v) => v.toFixed(1) + " A", oninput: (v) => { I = v; if (!running) draw(); } });
      el.append(widget("Daniell cell discharge simulator (100 mL per beaker; simulated time is sped up: 2 minutes per tick)",
        view, status,
        h("div", { class: "btns" }, runBtn,
          h("button", { onclick: reset }, "Reset"),
          h("button", { onclick: () => { cu += 0.5; dead = false; gasp = false; setCap(); draw(); } }, f("Add copper sulfate crystals (+0.5 M Cu^2+)")),
          h("button", { onclick: () => { zn = 0.01; dead = false; gasp = false; setCap(); draw(); } }, f("Swap in fresh zinc solution (0.01 M Zn^2+)"))),
        h("div", { class: "readout" }, sE, sQ, sC, sM, sW, sT, sG),
        h("div", { style: "display:flex;flex-wrap:wrap;gap:8px;margin-top:12px" },
          h("div", { style: "flex:1 1 300px;min-width:0" }, plA), h("div", { style: "flex:1 1 300px;min-width:0" }, plB)),
        sc, sz, si));
      reset(); si.set(1);
      el.append(
        P("What to look for, each from an earlier step:"),
        h("ul", {},
          h("li", { html: "The voltage starts at E° only if both solutions start at 1 M. Start with dilute zinc solution and it starts higher (<b>steps 1 and 2</b>)." }),
          h("li", { html: "On the right plot the cell walks down a straight line: 29.6 mV per decade of Q (<b>steps 3 and 4</b>). On the left plot the same walk looks like a plateau and a cliff, because almost all the charge is delivered in the first two decades (<b>step 8</b>)." }),
          h("li", { html: "The cell dies at E = 0, where Q = K ≈ 10³⁷ (<b>steps 6 and 7</b>). Adding copper sulfate lowers Q again, and the voltage comes back: nothing was broken, the cell was only at equilibrium." }),
          h("li", { html: `The charge delivered is fixed by the moles of ${f("Cu^2+")}, not by the current: 0.1 mol → 0.2 mol of electrons → about 5,360 mAh. A larger current only gets there sooner. In this ideal model the energy is the same too.` }),
          h("li", { html: "Swapping in dilute zinc solution raises the voltage by tens of millivolts but adds no charge: the same trick as the concentration cell (<b>step 5</b>)." })),
        note("Idealised model: the voltage here is the Nernst voltage with no current-dependent losses. A real cell reads lower while it delivers current, more so at high current. That is the subject of <i>Real batteries: resistance, rate and energy density</i>."),
        takeaway("A cell's voltage is E° corrected for how far the mix has moved toward equilibrium. It sags as Q grows, 59.2 mV / n per decade, and reaches zero exactly when Q = K.")
      );
      return () => { clearTimeout(timer); view.stop(); };
    },
  });

  Course.run({
    id: "nernst",
    section: "2. The galvanic cell",
    title: "Concentration and the Nernst equation",
    concepts: {
      nonstd: "non-standard conditions", push: "more reactant ion → more push", Q: "reaction quotient Q",
      decade: "59 mV per decade", nernst: "Nernst equation", conccell: "concentration cell",
      dead: "dead cell = equilibrium", K: "equilibrium constant K from E°",
    },
    sources: [
      { title: "OpenStax Chemistry 2e, §17.4 Potential, Free Energy, and Equilibrium", url: "https://openstax.org/books/chemistry-2e/pages/17-4-potential-free-energy-and-equilibrium", note: "Nernst equation, 0.0592 V/n form, K from E°, concentration cells" },
      { title: "LibreTexts Chemistry: Nernst Equation", url: "https://chem.libretexts.org/Bookshelves/Analytical_Chemistry/Supplemental_Modules_(Analytical_Chemistry)/Electrochemistry/Nernst_Equation", note: "derivation from ΔG = ΔG° + RT ln Q and worked examples" },
      { title: "Wikipedia: Nernst equation", url: "https://en.wikipedia.org/wiki/Nernst_equation", note: "thermal voltage RT/F ≈ 25.7 mV at 25 °C, history (Nernst, 1889), activities vs concentrations" },
      { title: "Wikipedia: Reaction quotient", url: "https://en.wikipedia.org/wiki/Reaction_quotient", note: "definition of Q, pure solids omitted, Q = K at equilibrium" },
      { title: "Wikipedia: Concentration cell", url: "https://en.wikipedia.org/wiki/Concentration_cell", note: "same electrodes, different concentrations" },
      { title: "Wikipedia: Glass electrode", url: "https://en.wikipedia.org/wiki/Glass_electrode", note: "pH electrode: ideal response of about 59 mV per pH unit at 25 °C" },
      { title: "Wikipedia: Daniell cell", url: "https://en.wikipedia.org/wiki/Daniell_cell", note: "the running example; 1.10 V at standard conditions" },
    ],
    steps,
  });
})();
