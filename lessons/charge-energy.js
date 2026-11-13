// Lesson 2.3: Charge, energy and capacity
// Running example: a 6.54 g zinc strip (0.100 mol) used up in the Daniell cell (Zn | Zn²⁺ || Cu²⁺ | Cu, 1.10 V).
(function () {
  const { h, s, fmt, widget, stat, toggle, hbars, narrow, fitText } = Course;
  // engine slider, but the value column never wraps ("3 100 mAh" stays on one line)
  const slider = (o) => { const r = Course.slider(o); const v = r.querySelector(".val"); if (v) v.style.cssText = "width:auto;min-width:58px;white-space:nowrap"; return r; };
  const F = Chem.F, EL = Chem.elements, E0 = Chem.E0by, cf = Chem.f;
  const YEL = "#ffd166", BLUE = "#6cb4ff", GRN = "#5fd38d", RED = "#ff6b6b", PUR = "#c3a6ff", GREY = "#4a5568", MUT = "#9aa3b5", TXT = "#e6e9ef";

  const P = (html) => h("p", { html });
  const takeaway = (html) => h("div", { class: "takeaway", html });
  const formula = (html) => h("div", { class: "formula", html });
  const note = (html) => h("div", { class: "note", style: "margin-top:8px", html });
  const svgEl = (w, hh) => fitText(s("svg", { viewBox: `0 0 ${w} ${hh}`, width: "100%", style: `display:block;max-width:${Math.round(w * 1.3)}px;margin:0 auto` }), 10, 1.5);
  const add = (parent, tag, attrs, text) => { const e = s(tag, attrs); if (text != null) e.textContent = text; parent.append(e); return e; };

  const SUPS = { "-": "⁻", 0: "⁰", 1: "¹", 2: "²", 3: "³", 4: "⁴", 5: "⁵", 6: "⁶", 7: "⁷", 8: "⁸", 9: "⁹" };
  const sup = (k) => String(k).replace(/./g, (c) => SUPS[c] || c);
  // 12345.6 → "12 346" (thin no-break spaces)
  const big = (x, d = 0) => { const [a, b] = Math.abs(x).toFixed(d).split("."); return (x < 0 ? "−" : "") + a.replace(/\B(?=(\d{3})+(?!\d))/g, " ") + (b ? "." + b : ""); };
  const sci = (x) => {
    if (x === 0) return "0";
    let k = Math.floor(Math.log10(x)), m = x / Math.pow(10, k);
    if (+m.toFixed(2) >= 10) { m /= 10; k += 1; }
    return k === 0 ? m.toFixed(2) : `${m.toFixed(2)}\u00a0×\u00a010${sup(k)}`;
  };
  const auto = (x) => (x === 0 ? "0" : x >= 1e6 || x < 0.01 ? sci(x) : x >= 100 ? big(x) : String(+x.toPrecision(3)));

  // ---- running example numbers (all from Chem) ----
  const M_ZN = EL.Zn.mass;                       // 65.38 g/mol
  const E_DAN = E0.Cu.E - E0.Zn.E;               // 1.10 V
  const STRIP_G = 6.54, STRIP_MOL = 0.1;         // 6.54 g ≈ 0.100 mol Zn
  const STRIP_C = STRIP_MOL * 2 * F;             // 19 297 C
  const STRIP_AH = STRIP_C / 3600;               // 5.36 Ah
  const E_PER_C = 1 / Chem.E_CHARGE;             // 6.24e18 electrons per coulomb
  const cap = (sym, n) => Chem.capacity(n, EL[sym].mass);

  const steps = [];

  // ================================================================ 1
  steps.push({
    title: "Counting electrons: the coulomb",
    short: "The coulomb",
    newConcepts: ["coulomb"],
    render(el) {
      el.append(
        P("In <em>Electrode potentials</em> you predicted that the Daniell cell (zinc in one beaker, copper in the other) pushes with <b>1.10 V</b>. That tells you how hard the cell pushes. It says nothing about <b>how much</b> you get: how long a lamp stays lit, how much zinc you need."),
        P("To answer that, we have to count the electrons that go through the wire. Each <em>electron</em> carries the same tiny <em>charge</em> (from <em>Atoms, electrons and charge</em>), so counting electrons and measuring charge are the same thing. The trouble is the size of the numbers: a torch bulb passes more than a billion billion electrons every second."),
        P("So electricians count in a bigger unit, the way you count bytes in gigabytes. <b>One coulomb (C) is the charge of about 6.24 × 10¹⁸ electrons.</b> Turned around: one electron carries 1.602 × 10⁻¹⁹ C. Drag the slider across 24 orders of magnitude:")
      );
      const W = narrow(560, 380), H = 118, x0 = 26, x1 = W - 26;
      const X = (k) => x0 + ((x1 - x0) * k) / 24;
      const svg = svgEl(W, H);
      add(svg, "line", { x1: x0, x2: x1, y1: 70, y2: 70, stroke: "#2e3646", "stroke-width": 2 });
      for (let k = 0; k <= 24; k += 2) {
        add(svg, "line", { x1: X(k), x2: X(k), y1: 66, y2: 74, stroke: "#2e3646" });
        if (k % 6 === 0) add(svg, "text", { x: X(k), y: 92, "text-anchor": "middle" }, k === 0 ? "1" : "10" + sup(k));
      }
      add(svg, "text", { x: W / 2, y: 112, "text-anchor": "middle" }, "number of electrons (each tick mark = ×100)");
      const marks = [[0, "1 electron", "start"], [Math.log10(E_PER_C), "1 coulomb", "middle"], [Math.log10(Chem.N_A), "1 mole", "end"]];
      marks.forEach(([k, t, a], i) => {
        add(svg, "line", { x1: X(k), x2: X(k), y1: i === 1 ? 24 : 40, y2: 70, stroke: [MUT, YEL, PUR][i], "stroke-dasharray": "3 3" });
        add(svg, "text", { x: X(k) + (a === "start" ? -4 : a === "end" ? 4 : 0), y: i === 1 ? 16 : 34, "text-anchor": a, style: `fill:${[MUT, YEL, PUR][i]}` }, t);
      });
      const dot = add(svg, "circle", { cx: X(0), cy: 70, r: 7, fill: YEL, stroke: "#12151c", "stroke-width": 2 });
      const sN = stat("electrons", "y"), sC = stat("charge in coulombs", "b"), sM = stat("in words", "");
      const words = (n) => (n < 1e3 ? "a handful" : n < 1e6 ? "thousands" : n < 1e9 ? "millions" : n < 1e12 ? "billions" : n < 1e15 ? "trillions" : n < 1e18 ? "millions of billions" : n < 1e21 ? "billions of billions" : "close to a mole");
      const upd = (n) => {
        dot.setAttribute("cx", X(Math.log10(n)));
        sN.set(n < 1000 ? String(Math.round(n)) : sci(n));
        sC.set(auto((n / Chem.N_A) * F) + " C");
        sM.set(words(n));
      };
      const sl = slider({ name: "count", min: 1, max: 1e24, log: true, steps: 480, value: E_PER_C, fmtv: (v) => (v < 1000 ? String(Math.round(v)) : sci(v)), oninput: upd });
      const set = (n) => { sl.set(n); upd(n); };
      el.append(widget("How many electrons make a coulomb?", svg, sl,
        h("div", { class: "readout" }, sN, sC, sM),
        h("div", { class: "btns" },
          h("button", { onclick: () => set(1) }, "One electron"),
          h("button", { class: "primary", onclick: () => set(E_PER_C) }, "Exactly 1 coulomb"),
          h("button", { onclick: () => set(Chem.N_A) }, "One mole of electrons"))));
      upd(E_PER_C);
      el.append(
        P("Press <em>One mole of electrons</em>. A <em>mole</em> (from <em>Ions, salts and electrolytes</em>) is the chemist's counting unit, 6.022 × 10²³ things. A mole of electrons is a lot of coulombs. Remember that number: it gets a name in step 3."),
        P("One detail: the electron's charge is negative. In this lesson we only care about <i>how much</i> charge moved, so we count coulombs as positive amounts."),
        takeaway("The coulomb is the unit of charge: 1 C ≈ 6.24 × 10¹⁸ electrons. Counting coulombs is counting electrons.")
      );
    },
    check: {
      type: "number", q: "A wire has carried <b>2 C</b> from the zinc to the copper. How many electrons is that, in units of 10¹⁸? (For 5 × 10¹⁸, type 5.)",
      answer: 12.5, tolerance: 0.2, shown: "≈ 12.5 × 10¹⁸",
      hint: "One coulomb is about 6.24 × 10¹⁸ electrons. You have two of them.",
      why: "2 × 6.24 × 10¹⁸ ≈ 12.5 × 10¹⁸ electrons. Twice the charge, twice the electrons.",
    },
  });

  // ================================================================ 2
  steps.push({
    title: "Current: coulombs per second",
    short: "The ampere",
    newConcepts: ["ampere"],
    render(el) {
      el.append(
        P("In <em>The galvanic cell</em>, <em>current</em> was just \"how much flows\". Now you can put a number on it. Stand at one point of the wire and count the charge passing by each second."),
        P("<b>One coulomb passing per second is a current of one ampere (A).</b> A water pipe has litres per second; a wire has coulombs per second."),
        P("Below is the wire of the Daniell cell. Electrons leave the zinc <em>anode</em> and arrive at the copper <em>cathode</em>. The yellow gate counts what passes. Change the current while it runs:")
      );
      const W = narrow(560, 380), H = 120, xa = 62, xb = W - 62, y = 46;
      const svg = svgEl(W, H);
      add(svg, "rect", { x: 8, y: 22, width: 54, height: 48, rx: 5, fill: "#3a4558" });
      add(svg, "text", { x: 35, y: 43, "text-anchor": "middle", style: `fill:${TXT}` }, "Zn");
      add(svg, "text", { x: 35, y: 60, "text-anchor": "middle" }, "anode");
      add(svg, "rect", { x: W - 62, y: 22, width: 54, height: 48, rx: 5, fill: "#6b4a2e" });
      add(svg, "text", { x: W - 35, y: 43, "text-anchor": "middle", style: `fill:${TXT}` }, "Cu");
      add(svg, "text", { x: W - 35, y: 60, "text-anchor": "middle" }, "cathode");
      add(svg, "line", { x1: xa, x2: xb, y1: y, y2: y, stroke: "#3a4558", "stroke-width": 12, "stroke-linecap": "butt" });
      const gx = (xa + xb) / 2;
      add(svg, "line", { x1: gx, x2: gx, y1: y - 22, y2: y + 22, stroke: YEL, "stroke-width": 2, "stroke-dasharray": "4 3" });
      const gateT = add(svg, "text", { x: gx, y: y + 40, "text-anchor": "middle", style: `fill:${YEL}` }, "");
      add(svg, "text", { x: gx, y: H - 6, "text-anchor": "middle" }, "electrons → (each dot stands for a huge crowd)");
      const ND = 14, dots = [];
      for (let i = 0; i < ND; i++) dots.push({ p: i / ND, e: add(svg, "circle", { r: 4, cy: y, fill: YEL }) });
      let I = 0.5, t = 0, Q = 0, running = true, timer = null;
      const sI = stat("current", "y"), sT = stat("time", ""), sQ = stat("charge passed", "b"), sE = stat("electrons passed", "");
      const draw = () => {
        dots.forEach((d) => d.e.setAttribute("cx", xa + (xb - xa) * d.p));
        gateT.textContent = `${fmt.n(Q, 1)} C counted`;
        sI.set(fmt.n(I, 1) + " A"); sT.set(fmt.n(t, 0) + " s"); sQ.set(fmt.n(Q, 1) + " C"); sE.set(Q === 0 ? "0" : sci(Q * E_PER_C));
      };
      const SPEED = 5, DT = 0.04;   // 5 simulated seconds per real second
      const tick = () => {
        if (running) {
          const dt = DT * SPEED; t += dt; Q += I * dt;
          dots.forEach((d) => { d.p = (d.p + I * 0.012) % 1; });
          draw();
        }
        timer = setTimeout(tick, DT * 1000);
      };
      const runBtn = h("button", { class: "primary", onclick: () => { running = !running; runBtn.textContent = running ? "Pause" : "Run"; } }, "Pause");
      el.append(widget("The wire of the Daniell cell (running 5× faster than real time)", svg,
        slider({ name: "current", min: 0, max: 2, step: 0.1, value: I, fmtv: (v) => v.toFixed(1) + " A", oninput: (v) => { I = v; draw(); } }),
        h("div", { class: "readout" }, sI, sT, sQ, sE),
        h("div", { class: "btns" }, runBtn, h("button", { onclick: () => { t = 0; Q = 0; draw(); } }, "Reset the counter"))));
      draw(); tick();
      el.append(
        P("At a steady current the counter is simply current × time. Set the current to 0: the electrons stop and the counter freezes, however long you wait."),
        formula('<span class="bl">charge</span> = <span class="hl">current</span> × time<small>coulombs = amperes × seconds, so 1 A = 1 C/s</small>'),
        P("For scale: a small LED draws about 0.02 A, a phone charger delivers 1 to 3 A, a car starter motor a few hundred amperes for a couple of seconds (typical values)."),
        takeaway("Current is the rate of charge flow. 1 ampere = 1 coulomb per second, so charge = current × time.")
      );
      return () => clearTimeout(timer);
    },
    check: {
      type: "number", q: "A Daniell cell drives a steady <b>0.5 A</b> through a lamp for <b>60 s</b>. How many coulombs went through the wire?",
      answer: 30, tolerance: 0.5, hint: "Amperes are coulombs per second. Multiply by the seconds.",
      why: "0.5 C/s × 60 s = 30 C.",
    },
  });

  // ================================================================ 3
  steps.push({
    title: "A mole of electrons: the Faraday constant",
    short: "The Faraday constant",
    newConcepts: ["faraday"],
    render(el) {
      el.append(
        P("Now connect the wire to the chemistry. At the anode, every zinc atom that dissolves leaves two electrons behind: " + `<code>${Chem.half("Zn", true)}</code>` + ". Those are the electrons the gate was counting."),
        P("Chemists count atoms in <em>moles</em>, electricians count charge in coulombs. The bridge between them is the charge of <b>one mole of electrons</b>:"),
        formula(`6.022 × 10²³ electrons × 1.602 × 10⁻¹⁹ C each ≈ <span class="hl">96 485 C</span><small>the Faraday constant, F = 96 485 C per mole of electrons (the rounded factors shown give 96 472; the precise ones give 96 485)</small>`),
        P("So the recipe from metal to charge has two multiplications. Moles of metal × <em>electrons transferred</em> per atom (the n from <em>Balancing redox equations</em>) = moles of electrons. Moles of electrons × F = coulombs. Our running example is a zinc strip of <b>6.54 g</b>, which is 0.100 mol (<em>molar mass</em> 65.38 g/mol). Dissolve it:")
      );
      const metals = { Zn: { n: 2, ion: "Zn^2+" }, Li: { n: 1, ion: "Li^+" }, Al: { n: 3, ion: "Al^3+" } };
      let sym = "Zn", mol = 0.05;
      const W = narrow(560, 380), H = 150;
      const svg = svgEl(W, H);
      const strip = add(svg, "rect", { x: 30, width: 34, rx: 3, fill: "#8fa3bf" });
      const ghost = add(svg, "rect", { x: 30, y: 20, width: 34, height: 110, rx: 3, fill: "none", stroke: "#3a4558", "stroke-dasharray": "4 3" });
      const stripT = add(svg, "text", { x: 47, y: 146, "text-anchor": "middle" }, "");
      const eqT = add(svg, "text", { x: 84, y: 30, style: `fill:${TXT}` }, "");
      add(svg, "text", { x: 84, y: 146 }, "each dot = 0.01 mol of electrons ≈ 965 C");
      const cols = 10, gx0 = 90, gdx = (W - gx0 - 20) / cols, dotsEl = [];
      for (let i = 0; i < 30; i++) dotsEl.push(add(svg, "circle", { cx: gx0 + gdx * (i % cols) + gdx / 2, cy: 54 + Math.floor(i / cols) * 26, r: Math.min(9, gdx / 2 - 3), fill: "none", stroke: "#2e3646" }));
      void ghost;
      const sG = stat("metal dissolved", ""), sMol = stat("moles of metal", ""), sE = stat("moles of electrons", "y"), sQ = stat("charge", "b");
      const upd = () => {
        const m = metals[sym], frac = mol / 0.1, hgt = 110 * (1 - frac);
        strip.setAttribute("y", 20); strip.setAttribute("height", Math.max(0, hgt));
        stripT.textContent = sym;
        eqT.textContent = cf(`${sym} -> ${m.ion} + ${m.n === 1 ? "" : m.n}e-`) + `   (n = ${m.n})`;
        const ne = Math.round((mol * m.n) / 0.01);
        dotsEl.forEach((d, i) => { d.setAttribute("fill", i < ne ? YEL : "none"); d.setAttribute("stroke", i < ne ? YEL : "#2e3646"); });
        sG.set(fmt.n(mol * EL[sym].mass, 2) + " g"); sMol.set(fmt.n(mol, 3) + " mol");
        sE.set(fmt.n(mol * m.n, 3) + " mol"); sQ.set(big(mol * m.n * F) + " C");
      };
      const tg = toggle("metal:", Object.keys(metals).map((k) => [k, `${k} (n = ${metals[k].n})`]), sym, (v) => { sym = v; upd(); });
      el.append(widget("0.100 mol of metal, dissolving", tg, svg,
        slider({ name: "dissolved", min: 0, max: 0.1, step: 0.005, value: mol, fmtv: (v) => v.toFixed(3) + "\u00a0mol", oninput: (v) => { mol = v; upd(); } }),
        h("div", { class: "readout" }, sG, sMol, sE, sQ)));
      upd();
      el.append(
        P(`Dissolve the whole zinc strip: 0.100 mol Zn → 0.200 mol e⁻ → <b>${big(STRIP_C)} C</b>. Switch to aluminium: the same number of atoms gives up three electrons each, so one and a half times the charge. Lithium gives one each, half the charge. The arithmetic also runs backwards: count the coulombs and you know how much metal has dissolved.`),
        formula('<span class="bl">charge</span> = <span class="hl">n</span> × moles of metal × <span class="hl">F</span>'),
        takeaway("One mole of electrons carries F = 96 485 C. Charge = n × moles × F links grams of metal to coulombs in the wire.")
      );
    },
    check: {
      type: "number", q: "A Daniell cell has pushed <b>9 650 C</b> through the wire, which is 0.100 mol of electrons. How many <b>grams</b> of zinc dissolved? (Zn → Zn²⁺ + 2e⁻, 65.38 g/mol)",
      answer: 3.27, tolerance: 0.05, shown: "3.27 g",
      hint: "Each zinc atom supplies 2 electrons, so 0.100 mol of electrons needs only half as many moles of zinc. Then × 65.38 g/mol.",
      why: "0.100 mol e⁻ ÷ 2 = 0.050 mol Zn, and 0.050 × 65.38 = 3.27 g. Charge counts atoms.",
    },
  });

  // ================================================================ 4
  steps.push({
    title: "The volt: energy per coulomb",
    short: "Volt = joule per coulomb",
    newConcepts: ["volt"],
    render(el) {
      el.append(
        P("So far the 1.10 V of the Daniell cell played no part: a coulomb is a coulomb. <em>Voltage</em> was \"the push\" in <em>The galvanic cell</em>. Here is what the push is measured in."),
        P("Think of a waterfall. The amount of water is the charge. The height it falls is the voltage. The work the water can do on a turbine depends on <b>both</b>: twice the water or twice the height gives twice the work."),
        P("Electricity works the same way, and that is the definition of the volt: <b>a cell of 1 volt gives 1 joule of energy to every coulomb it pushes through the circuit.</b> (A joule, J, is the physicist's unit of energy: about what it takes to lift an apple one metre.) In the picture the energy is the area: charge wide, voltage high.")
      );
      const W = narrow(560, 380), H = 190, x0 = 46, x1 = W - 14, y0 = 20, y1 = 150, QMAX = 20000, VMAX = 3;
      const svg = svgEl(W, H);
      add(svg, "rect", { x: x0, y: y0, width: x1 - x0, height: y1 - y0, fill: "none", stroke: "#2e3646" });
      [0, 1, 2, 3].forEach((v) => add(svg, "text", { x: x0 - 6, y: y1 - ((y1 - y0) * v) / VMAX + 4, "text-anchor": "end" }, v + " V"));
      [0, 5000, 10000, 15000, 20000].forEach((q) => add(svg, "text", { x: x0 + ((x1 - x0) * q) / QMAX, y: y1 + 16, "text-anchor": q === 0 ? "start" : q === QMAX ? "end" : "middle" }, big(q)));
      add(svg, "text", { x: (x0 + x1) / 2, y: H - 4, "text-anchor": "middle" }, "charge pushed through the wire (C)");
      const rect = add(svg, "rect", { x: x0, fill: YEL, "fill-opacity": 0.35, stroke: YEL });
      const lab = add(svg, "text", { "text-anchor": "middle", style: `fill:${TXT}` }, "");
      let Q = 5000, V = E_DAN;
      const sQ = stat("charge", "b"), sV = stat("voltage", ""), sE = stat("energy = charge × voltage", "y");
      const upd = () => {
        const w = ((x1 - x0) * Q) / QMAX, hh = ((y1 - y0) * V) / VMAX;
        rect.setAttribute("width", w); rect.setAttribute("height", hh); rect.setAttribute("y", y1 - hh);
        lab.setAttribute("x", x0 + Math.max(w / 2, 44)); lab.setAttribute("y", Math.min(y1 - hh / 2 + 4, y1 - 6));
        const J = Q * V;
        lab.textContent = J >= 1000 ? fmt.n(J / 1000, 1) + " kJ" : fmt.n(J, 0) + " J";
        sQ.set(big(Q) + " C"); sV.set(fmt.n(V, 2) + " V"); sE.set(J >= 1000 ? fmt.n(J / 1000, 2) + " kJ" : fmt.n(J, 0) + " J");
      };
      const slQ = slider({ name: "charge", min: 0, max: QMAX, step: 100, value: Q, fmtv: (v) => big(v) + " C", oninput: (v) => { Q = v; upd(); } });
      const slV = slider({ name: "voltage", min: 0, max: VMAX, step: 0.05, value: V, fmtv: (v) => v.toFixed(2) + " V", oninput: (v) => { V = v; upd(); } });
      const set = (q, v) => { Q = q; V = v; slQ.set(q); slV.set(v); upd(); };
      el.append(widget("Energy is the area: coulombs wide, volts high", svg, slQ, slV,
        h("div", { class: "readout" }, sQ, sV, sE),
        h("div", { class: "btns" },
          h("button", { onclick: () => set(1, 1.1) }, "1 C at 1.10 V"),
          h("button", { class: "primary", onclick: () => set(5000, E_DAN) }, "5 000 C at 1.10 V (Daniell)"),
          h("button", { onclick: () => set(5000, 2.2) }, "Same charge, twice the voltage"))));
      upd();
      el.append(
        formula('<span class="hl">energy</span> = <span class="bl">charge</span> × voltage<small>joules = coulombs × volts, so 1 V = 1 J/C</small>'),
        P("This is why the potential ladder matters for batteries. Two half-cells far apart on the ladder give a high voltage, and then <b>the same electrons deliver more energy</b>. The electrons are counted by the chemistry (step 3). What each one is worth is set by the voltage."),
        takeaway("1 volt = 1 joule per coulomb. Energy delivered = charge × voltage.")
      );
    },
    check: {
      type: "number", q: `Our whole zinc strip releases <b>${big(STRIP_C)} C</b>. In a Daniell cell at a steady <b>1.10 V</b>, how much energy is that, in <b>kJ</b>?`,
      answer: 21.2, tolerance: 0.3, shown: "≈ 21.2 kJ",
      hint: "Joules = coulombs × volts. Then divide by 1000 for kJ.",
      why: `${big(STRIP_C)} C × 1.10 J/C ≈ 21 200 J = 21.2 kJ. About enough to lift a 70 kg person 30 m.`,
      backTo: 2,
    },
  });

  // ================================================================ 5
  steps.push({
    title: "Gibbs energy: where the energy comes from",
    short: "ΔG = −nFE",
    newConcepts: ["gibbs"],
    render(el) {
      el.append(
        P("Those 21.2 kJ did not come from nowhere. Zinc atoms and copper ions together hold more energy than zinc ions and copper atoms. When the reaction runs, the difference is released. In a beaker it comes out as heat. In a cell, the wire lets you collect it as electrical work."),
        P("Chemists have a name for <b>the energy a reaction can hand over as work</b>: its <b>Gibbs energy change, ΔG</b> (Δ means \"change in\"). The sign is bookkeeping from the chemicals' point of view. They <i>lose</i> energy when the reaction goes downhill, so a reaction that can do work has a <b>negative</b> ΔG. That is exactly a <em>spontaneous</em> reaction (from <em>The activity series</em>)."),
        P("You already have the pieces. One mole of reaction moves n moles of electrons, which is n × F coulombs (step 3). Each coulomb delivers E joules (step 4). Multiply, and put the minus sign in front:"),
        formula('<span class="hl">ΔG°</span> = −<span class="bl">n</span> × <span class="bl">F</span> × <span class="hl">E°<sub>cell</sub></span><small>joules per mole of reaction as written; the ° means standard conditions, as for E°</small>')
      );
      const rx = [
        { eq: "Zn + Cu^2+ -> Zn^2+ + Cu", n: 2, E: E0.Cu.E - E0.Zn.E, name: "Zn + Cu²⁺ (Daniell)" },
        { eq: "Zn + 2Ag^+ -> Zn^2+ + 2Ag", n: 2, E: E0.Ag.E - E0.Zn.E, name: "Zn + Ag⁺" },
        { eq: "Cu + 2Ag^+ -> Cu^2+ + 2Ag", n: 2, E: E0.Ag.E - E0.Cu.E, name: "Cu + Ag⁺" },
        { eq: "2Al + 3Cu^2+ -> 2Al^3+ + 3Cu", n: 6, E: E0.Cu.E - E0.Al.E, name: "Al + Cu²⁺" },
        { eq: "Cu + Zn^2+ -> Cu^2+ + Zn", n: 2, E: E0.Zn.E - E0.Cu.E, name: "Cu + Zn²⁺ (backwards)" },
      ];
      const W = narrow(520, 380), H = 250, GT = 300, GB = -1250, yT = 22, yB = 232;
      const Y = (g) => yT + ((GT - g) / (GT - GB)) * (yB - yT);
      const svg = svgEl(W, H);
      [0, -400, -800, -1200].forEach((g) => { add(svg, "line", { x1: 56, x2: W - 10, y1: Y(g), y2: Y(g), stroke: "#232a37" }); add(svg, "text", { x: 50, y: Y(g) + 4, "text-anchor": "end" }, g === 0 ? "0 kJ" : "−" + -g); });
      const xl0 = 62, xl1 = W * 0.4, xr0 = W * 0.66, xr1 = W - 12, AX = W * 0.45;
      add(svg, "line", { x1: xl0, x2: xl1, y1: Y(0), y2: Y(0), stroke: BLUE, "stroke-width": 4 });
      add(svg, "text", { x: (xl0 + xl1) / 2, y: Y(0) - 8, "text-anchor": "middle", style: `fill:${BLUE}` }, "before (reactants)");
      const lev = add(svg, "line", { x1: xr0, x2: xr1, stroke: GRN, "stroke-width": 4 });
      const levT = add(svg, "text", { x: (xr0 + xr1) / 2, "text-anchor": "middle" }, "after (products)");
      const arr = add(svg, "line", { x1: AX, x2: AX, y1: Y(0), stroke: YEL, "stroke-width": 2 });
      const head = add(svg, "path", { fill: YEL });
      const arrT = add(svg, "text", { x: AX + 8, style: `fill:${YEL}` }, "");
      const eqBox = h("div", { class: "mono", style: "text-align:center;margin:8px 0 2px;font-size:16px" });
      const sn = stat("n (mol e⁻ per mol reaction)", "b"), sE = stat("E° cell", ""), sG = stat("ΔG°", "y"), sVd = stat("verdict", "g");
      let cur = 0;
      const upd = () => {
        const r = rx[cur], G = (-r.n * F * r.E) / 1000, yy = Y(G), ax = AX, down = G < 0;
        lev.setAttribute("y1", yy); lev.setAttribute("y2", yy); lev.setAttribute("stroke", down ? GRN : RED);
        levT.setAttribute("y", down ? yy + 17 : yy - 8); levT.setAttribute("style", `fill:${down ? GRN : RED}`);
        arr.setAttribute("y2", yy + (down ? -6 : 6));
        head.setAttribute("d", down ? `M${ax - 5},${yy - 8} L${ax + 5},${yy - 8} L${ax},${yy} Z` : `M${ax - 5},${yy + 8} L${ax + 5},${yy + 8} L${ax},${yy} Z`);
        arrT.setAttribute("y", (Y(0) + yy) / 2 + 4);
        arrT.textContent = down ? "work out" : "work in";
        eqBox.textContent = cf(r.eq);
        sn.set(String(r.n)); sE.set((r.E > 0 ? "+" : "−") + fmt.n(Math.abs(r.E), 2) + " V");
        sG.set((G < 0 ? "−" : "+") + fmt.n(Math.abs(G), 1) + " kJ");
        sVd.set(down ? "spontaneous" : "not spontaneous");
        sVd.className = "stat " + (down ? "g" : "r");
      };
      const tg = toggle("", rx.map((r, i) => [i, r.name]), 0, (v) => { cur = v; upd(); });
      el.append(widget("Energy of the chemicals before and after one mole of reaction", tg, eqBox, svg, h("div", { class: "readout" }, sn, sE, sG, sVd)));
      upd();
      el.append(
        P(`For the Daniell cell: ΔG° = −2 × 96 485 C × 1.10 J/C = <b>−212 kJ</b> per mole of zinc. Our 0.100 mol strip gives a tenth of that, the 21.2 kJ from the last step. Try the others. A bigger E° means a deeper drop. Aluminium with copper ions falls furthest, because E° is large <i>and</i> six moles of electrons move per mole of reaction as written.`),
        P("Run the Daniell reaction backwards: E° is negative, ΔG° is positive, the products sit <i>above</i> the reactants. It will not go by itself. You would have to push 212 kJ in (that is <em>Electrolysis</em>, later). Positive E°, negative ΔG° and \"spontaneous\" are three ways of saying the same thing."),
        P("Note that n counts electrons while E° does not: you never multiply E° by coefficients (<em>Electrode potentials</em>), but doubling an equation doubles n and so doubles ΔG°. Real cells deliver somewhat less than ΔG°: this is the ceiling."),
        takeaway("ΔG° = −nFE° is the most electrical work a reaction can deliver per mole. Negative ΔG° ⇔ positive E° ⇔ spontaneous.")
      );
    },
    check: {
      type: "number", q: "An iron nail in copper sulfate: Fe + Cu²⁺ → Fe²⁺ + Cu, with E°<sub>cell</sub> = 0.34 − (−0.44) = <b>0.78 V</b>. Built as a cell, how many <b>kJ</b> of electrical work can it deliver at most per mole of iron? (Type the amount as a positive number.)",
      answer: 150.5, tolerance: 2, shown: "≈ 150.5 kJ (ΔG° = −150.5 kJ)",
      hint: "n = 2 electrons per iron atom. Work = n × F × E° = 2 × 96 485 × 0.78 joules. Then ÷ 1000.",
      why: "2 × 96 485 C × 0.78 J/C ≈ 150 500 J = 150.5 kJ, so ΔG° = −150.5 kJ per mole of iron.",
      backTo: 3,
    },
  });

  // ================================================================ 6
  steps.push({
    title: "Capacity: the ampere-hour",
    short: "Ah and mAh",
    newConcepts: ["ah"],
    render(el) {
      el.append(
        P(`Look at any battery: it does not say "${big(STRIP_C)} C". It says something like <b>2000 mAh</b>. That is still charge, in a unit chosen so that the question people actually ask ("how long will it last?") is one division.`),
        P("<b>One ampere-hour (Ah) is the charge that a current of 1 A delivers in one hour.</b> An hour is 3600 s, and an ampere is a coulomb per second, so 1 Ah = 3600 C. A milliampere-hour (mAh) is a thousandth of that: 3.6 C. The total charge a cell can deliver before its reactants run out is called its <b>capacity</b>."),
        P("Set a capacity and a current, then drain the cell:")
      );
      const W = narrow(520, 380), H = 96, bx = 30, bw = W - 80, by = 22, bh = 46;
      const svg = svgEl(W, H);
      add(svg, "rect", { x: bx, y: by, width: bw, height: bh, rx: 6, fill: "none", stroke: MUT, "stroke-width": 2 });
      add(svg, "rect", { x: bx + bw, y: by + 13, width: 8, height: bh - 26, rx: 2, fill: MUT });
      const fill = add(svg, "rect", { x: bx + 4, y: by + 4, height: bh - 8, rx: 3, fill: GRN });
      const ft = add(svg, "text", { x: bx + bw / 2, y: by + bh / 2 + 5, "text-anchor": "middle", style: `fill:${TXT}` }, "");
      const tt = add(svg, "text", { x: bx + bw / 2, y: H - 6, "text-anchor": "middle" }, "");
      let capm = 2000, ImA = 500, frac = 1, timer = null;
      const sC = stat("capacity", "b"), sQ = stat("same charge in coulombs", ""), sI = stat("current", ""), sR = stat("runtime = capacity ÷ current", "y");
      const hrs = (x) => (x >= 10 ? fmt.n(x, 0) + " h" : x >= 1 ? fmt.n(x, 1) + " h" : fmt.n(x * 60, 0) + " min");
      const upd = () => {
        const run = capm / ImA;
        fill.setAttribute("width", Math.max(0, (bw - 8) * frac)); fill.setAttribute("fill", frac > 0.2 ? GRN : RED);
        ft.textContent = `${big(capm * frac)} mAh left`;
        tt.textContent = frac >= 1 ? "full" : frac <= 0 ? `empty after ${hrs(run)}` : `${hrs(run * (1 - frac))} at ${big(ImA)} mA`;
        sC.set(big(capm) + " mAh"); sQ.set(big(capm * 3.6) + " C"); sI.set(big(ImA) + " mA"); sR.set(hrs(run));
      };
      const stop = () => { clearTimeout(timer); timer = null; };
      const drain = () => {
        stop(); frac = 1;
        const go = () => { frac = Math.max(0, frac - 0.0125); upd(); if (frac > 0) timer = setTimeout(go, 30); else timer = null; };
        go();
      };
      el.append(widget("A cell and a load", svg,
        slider({ name: "capacity", min: 200, max: 6000, step: 100, value: capm, fmtv: (v) => big(v) + " mAh", oninput: (v) => { capm = v; stop(); frac = 1; upd(); } }),
        slider({ name: "current", min: 50, max: 3000, step: 50, value: ImA, fmtv: (v) => big(v) + " mA", oninput: (v) => { ImA = v; stop(); frac = 1; upd(); } }),
        h("div", { class: "readout" }, sC, sQ, sI, sR),
        h("div", { class: "btns" }, h("button", { class: "primary", onclick: drain }, "Drain it"), h("button", { onclick: () => { stop(); frac = 1; upd(); } }, "Recharge"))));
      upd();
      el.append(
        formula('<span class="hl">1 Ah</span> = 1 A × 3600 s = <span class="bl">3600 C</span><small>1 mAh = 3.6 C; runtime (h) = capacity (Ah) ÷ current (A)</small>'),
        P(`Capacity is pure electron counting, so it comes straight from step 3. Our zinc strip holds ${big(STRIP_C)} C, and dividing by 3600 turns that into ampere-hours. The printed number on a real cell is this same count for whichever reactant runs out first. (Real cells deliver a bit less at high currents: see <em>Real batteries</em>.)`),
        takeaway("Capacity is charge, counted in ampere-hours: 1 Ah = 3600 C, 1 mAh = 3.6 C. Runtime = capacity ÷ current.")
      );
      return stop;
    },
    check: {
      type: "number", q: `Our 6.54 g zinc strip can release <b>${big(STRIP_C)} C</b>. What is that capacity in <b>Ah</b>?`,
      answer: 5.36, tolerance: 0.03, shown: "5.36 Ah",
      hint: "One ampere-hour is 3600 coulombs.", why: `${big(STRIP_C)} C ÷ 3600 C/Ah = 5.36 Ah, or 5360 mAh: about two AA cells' worth of charge from 6.5 g of zinc.`,
    },
  });

  // ================================================================ 7
  steps.push({
    title: "Power and the watt-hour",
    short: "W and Wh",
    newConcepts: ["watt", "wh"],
    render(el) {
      el.append(
        P("Capacity counts electrons. It does not say how much <b>energy</b> the cell holds, because that also depends on how many joules each coulomb carries (step 4). Two cells labelled 2000 mAh can hold very different amounts of energy."),
        P("First, the rate. Volts are joules per coulomb and amperes are coulombs per second. Multiply them and the coulombs cancel: joules per second. That rate of delivering energy is <b>power</b>, and one joule per second is one <b>watt (W)</b>."),
        P("Run one watt for an hour and you have delivered 3600 J. That is one <b>watt-hour (Wh)</b>, the everyday unit of stored energy. Electricity bills count in thousands of them, kWh. And just as charge × voltage gave joules, <b>ampere-hours × volts give watt-hours</b>. The picture from step 4 returns with bigger units:")
      );
      const W = narrow(560, 380), H = 190, x0 = 46, x1 = W - 14, y0 = 20, y1 = 150, AMAX = 6, VMAX = 4;
      const svg = svgEl(W, H);
      add(svg, "rect", { x: x0, y: y0, width: x1 - x0, height: y1 - y0, fill: "none", stroke: "#2e3646" });
      [0, 1, 2, 3, 4].forEach((v) => add(svg, "text", { x: x0 - 6, y: y1 - ((y1 - y0) * v) / VMAX + 4, "text-anchor": "end" }, v + " V"));
      [0, 1, 2, 3, 4, 5, 6].forEach((a) => add(svg, "text", { x: x0 + ((x1 - x0) * a) / AMAX, y: y1 + 16, "text-anchor": a === 0 ? "start" : a === AMAX ? "end" : "middle" }, a));
      add(svg, "text", { x: (x0 + x1) / 2, y: H - 4, "text-anchor": "middle" }, "capacity (Ah)");
      const rect = add(svg, "rect", { x: x0, fill: GRN, "fill-opacity": 0.3, stroke: GRN });
      const lab = add(svg, "text", { "text-anchor": "middle", style: `fill:${TXT}` }, "");
      let A = 5.36, V = E_DAN, I = 0.5;
      const sE = stat("energy = Ah × V", "g"), sJ = stat("same in kJ", ""), sP = stat("power = V × A", "y"), sR = stat("runtime", "");
      const upd = () => {
        const w = ((x1 - x0) * A) / AMAX, hh = ((y1 - y0) * V) / VMAX, Wh = A * V;
        rect.setAttribute("width", w); rect.setAttribute("height", hh); rect.setAttribute("y", y1 - hh);
        lab.setAttribute("x", x0 + Math.max(w / 2, 34)); lab.setAttribute("y", Math.min(y1 - hh / 2 + 4, y1 - 6));
        lab.textContent = fmt.n(Wh, 1) + " Wh";
        sE.set(fmt.n(Wh, 2) + " Wh"); sJ.set(fmt.n(Wh * 3.6, 1) + " kJ"); sP.set(fmt.n(V * I, 2) + " W"); sR.set(fmt.n(A / I, 1) + " h");
      };
      const slA = slider({ name: "capacity", min: 0.5, max: AMAX, step: 0.02, value: A, fmtv: (v) => v.toFixed(2) + " Ah", oninput: (v) => { A = v; upd(); } });
      const slV = slider({ name: "voltage", min: 0.5, max: VMAX, step: 0.05, value: V, fmtv: (v) => v.toFixed(2) + " V", oninput: (v) => { V = v; upd(); } });
      const slI = slider({ name: "current", min: 0.1, max: 3, step: 0.1, value: I, fmtv: (v) => v.toFixed(1) + " A", oninput: (v) => { I = v; upd(); } });
      const set = (a, v) => { A = a; V = v; slA.set(a); slV.set(v); upd(); };
      el.append(widget("Stored energy is the area: ampere-hours wide, volts high", svg, slA, slV, slI,
        h("div", { class: "readout" }, sE, sJ, sP, sR),
        h("div", { class: "btns" },
          h("button", { class: "primary", onclick: () => set(5.36, E_DAN) }, "Zinc strip in a Daniell cell"),
          h("button", { onclick: () => set(5.36, 3.3) }, "Same charge at 3.30 V"),
          h("button", { onclick: () => set(1.78, 3.3) }, "A third of the charge at 3.30 V"))));
      upd();
      el.append(
        formula('<span class="hl">energy (Wh)</span> = <span class="bl">capacity (Ah)</span> × voltage (V)<small>power (W) = voltage (V) × current (A); 1 W = 1 J/s; 1 Wh = 3600 J</small>'),
        P("Our zinc strip in the Daniell cell: 5.36 Ah × 1.10 V = 5.9 Wh, which is the same 21.2 kJ as before (5.9 × 3.6). Triple the voltage and the same electrons carry three times the energy. Or, with the last button, a third of the electrons carry the same energy. The current slider changes only how fast you spend it: more watts, fewer hours, same watt-hours."),
        takeaway("Power (W) = volts × amperes. Stored energy (Wh) = ampere-hours × volts. mAh counts electrons; Wh counts what they can do.")
      );
    },
    check: {
      type: "choice",
      q: "Two cells are both labelled <b>2000 mAh</b>. Cell A runs at 1.2 V, cell B at 3.6 V. Which statement is right?",
      options: ["They store the same energy: the label is the same", "B stores three times the energy: the same charge, with three times the joules per coulomb", "A stores more: at a lower voltage the electrons leave more slowly, so it lasts longer"],
      answer: 1,
      wrongHints: {
        0: "The label counts charge (electrons), not energy. Energy also needs the voltage: Wh = Ah × V.",
        2: "Voltage is not a speed. At the same current both cells last the same time (2000 mAh ÷ current). What differs is the energy each coulomb delivers.",
      },
      why: "A: 2 Ah × 1.2 V = 2.4 Wh. B: 2 Ah × 3.6 V = 7.2 Wh. Same electrons, three times the energy each.",
      backTo: 3,
    },
  });

  // ================================================================ 8
  const ANODES = [["Li", 1], ["Na", 1], ["Mg", 2], ["Al", 3], ["Zn", 2], ["Fe", 2], ["Cd", 2], ["Pb", 2]];
  steps.push({
    title: "Capacity per gram: why light elements win",
    short: "Specific capacity (mAh/g)",
    newConcepts: ["speccap"],
    render(el) {
      el.append(
        P("A battery has to be carried. So the useful question about an electrode material is: <b>how much charge do I get per gram?</b>"),
        P("Take one gram of metal and follow step 3. One gram contains 1/M moles of atoms, where M is the <em>molar mass</em>. Each atom gives n electrons. Each mole of electrons is F coulombs. Divide by 3.6 to turn coulombs into mAh. The result is the <b>theoretical specific capacity</b> (\"specific\" just means \"per unit mass\"):"),
        formula('<span class="hl">specific capacity (mAh/g)</span> = <span class="bl">n</span> × F / (3.6 × <span class="bl">M</span>)<small>n = electrons per atom, M = molar mass in g/mol, F = 96 485 C/mol, 3.6 C = 1 mAh</small>'),
        P("Only two things about the element enter: how many electrons each atom gives, and how heavy the atom is. Click an element:")
      );
      const caps = ANODES.map(([sym, n]) => cap(sym, n));
      const bars = hbars(ANODES.map(([sym, n]) => `${sym} <span style="color:var(--muted);font-size:12px">n=${n}</span>`),
        { series: [BLUE], max: 4000, fmtv: (v) => big(v) + " mAh/g", labelWidth: 70, onclick: (i) => { cur = i; upd(); } });
      let cur = 4;
      const W = narrow(520, 380), colsN = narrow(24, 18), rowsN = narrow(6, 8), cell = (W - 20) / colsN, H = rowsN * cell + 16;
      const svg = svgEl(W, H);
      add(svg, "rect", { x: 4, y: 4, width: W - 8, height: rowsN * cell + 8, rx: 6, fill: "none", stroke: "#2e3646" });
      const dots = [];
      for (let i = 0; i < colsN * rowsN; i++) {
        const cx = 10 + cell * (i % colsN) + cell / 2, cy = 8 + Math.floor(i / colsN) * cell + cell / 2;
        const atom = add(svg, "circle", { cx, cy: cy + 2, r: cell * 0.27, fill: "#8fa3bf" });
        const es = [-1, 0, 1].map((k) => add(svg, "circle", { cx: cx + k * cell * 0.27, cy: cy - cell * 0.33, r: cell * 0.11, fill: YEL }));
        dots.push({ atom, es });
      }
      const cap1 = h("div", { class: "note", style: "text-align:center;margin-top:4px" });
      const calc = h("div", { class: "mono", style: "font-size:14px;line-height:1.7;margin-top:8px;overflow-x:auto;white-space:nowrap" });
      const upd = () => {
        const [sym, n] = ANODES[cur], M = EL[sym].mass, nd = Math.round(1000 / M);
        bars.update(caps, ANODES.map((_, i) => (i === cur ? YEL : BLUE))); bars.mark(cur);
        dots.forEach((d, i) => {
          const on = i < nd;
          d.atom.setAttribute("visibility", on ? "visible" : "hidden");
          // n electrons per atom: 1 → middle dot, 2 → outer two, 3 → all three
          d.es.forEach((e, k) => e.setAttribute("visibility", on && (n === 3 || (n === 2 && k !== 1) || (n === 1 && k === 1)) ? "visible" : "hidden"));
        });
        cap1.textContent = `1 g of ${EL[sym].name}: ${nd} grey dots (each ≈ 6 × 10²⁰ atoms), ${n} electron${n > 1 ? "s" : ""} per atom (yellow)`;
        calc.innerHTML = `1 g ÷ ${M} g/mol = ${(1 / M).toFixed(4)} mol ${sym}<br>× ${n} = ${(n / M).toFixed(4)} mol e⁻<br>× 96 485 = ${big((n * F) / M)} C<br>÷ 3.6 = <b style="color:var(--yellow)">${big(cap(sym, n))} mAh</b>`;
      };
      el.append(widget("One gram of anode metal (theoretical: every atom reacts)", bars, h("div", { style: "margin-top:12px" }, svg), cap1, calc));
      upd();
      el.append(
        P(`Zinc gives ${big(cap("Zn", 2))} mAh/g, which matches our strip: 6.54 g × ${big(cap("Zn", 2))} mAh/g ≈ 5360 mAh. Lead gives two electrons per atom as well, but each atom weighs three times as much: ${big(cap("Pb", 2))} mAh/g. Lithium gives only one electron per atom, but it is the lightest metal there is (6.94 g/mol): <b>${big(cap("Li", 1))} mAh/g</b>, more than four times zinc.`),
        P(`Aluminium takes the other route: it is not especially light per atom, but each atom gives three electrons, so it lands at ${big(cap("Al", 3))} mAh/g. Light atoms and several electrons per atom are the two ways to score, which is why Li, Al, Mg and Zn keep coming up in the rest of the course. These are ceilings: they count the pure element only and assume every atom reacts.`),
        takeaway("Specific capacity = nF / 3.6M mAh/g. Light atoms (Li) and multi-electron atoms (Al, Mg) pack the most charge per gram.")
      );
    },
    check: {
      type: "number", q: "Potassium (K → K⁺ + e⁻) has a molar mass of <b>39.1 g/mol</b>. What is its theoretical specific capacity in <b>mAh/g</b>?",
      answer: 685.5, tolerance: 6, shown: "≈ 685 mAh/g",
      hint: "n × F / (3.6 × M) with n = 1: 96 485 ÷ (3.6 × 39.1).",
      why: "96 485 / (3.6 × 39.1) ≈ 685 mAh/g. Same one electron per atom as lithium, but the atom is 5.6 times heavier, so 5.6 times less charge per gram.",
      backTo: 2,
    },
  });

  // ================================================================ 9
  steps.push({
    title: "Energy per kilogram, and what you must count",
    short: "Specific energy (Wh/kg)",
    newConcepts: ["specenergy"],
    render(el) {
      const M_CU = EL.Cu.mass, M_SO4 = EL.S.mass + 4 * EL.O.mass;
      const WH_MOL = (2 * F * E_DAN) / 3600;   // 58.97 Wh per mole of reaction
      el.append(
        P("Charge per gram is half the story. What you finally want is <b>energy per unit mass: the specific energy, in Wh/kg</b>. From step 7, energy = capacity × voltage, so:"),
        formula('<span class="hl">specific energy (Wh/kg)</span> = <span class="bl">specific capacity (mAh/g)</span> × voltage (V)<small>the units work out without any factor: mAh/g × V = mWh/g = Wh/kg</small>'),
        P(`For zinc in the Daniell cell: ${big(cap("Zn", 2))} mAh/g × 1.10 V ≈ ${big(cap("Zn", 2) * E_DAN)} Wh per kilogram <i>of zinc</i>. That sounds excellent. But zinc alone is not a cell. The electrons need somewhere to go: the copper ions. And those ions come with <em>spectator</em> sulfate ions (from <em>Oxidation and reduction</em>), because you can only buy them as the salt ${cf("CuSO4")}. The energy stays the same; the mass you divide by grows. Count honestly:`)
      );
      const parts = [
        { label: "Zn (anode)", m: M_ZN, color: "#8fa3bf" },
        { label: cf("Cu^2+") + " (cathode reactant)", m: M_CU, color: "#c98b5a" },
        { label: cf("SO4^2-") + " (spectator)", m: M_SO4, color: BLUE },
      ];
      let level = 0;
      const W = narrow(560, 380), H = 92, x0 = 10, x1 = W - 10, TOT = M_ZN + M_CU + M_SO4;
      const svg = svgEl(W, H);
      const segs = parts.map((p) => ({ r: add(svg, "rect", { y: 26, height: 30, rx: 3 }), t: add(svg, "text", { y: 46, "text-anchor": "middle", style: `fill:#12151c;font-weight:600` }, ""), p }));
      const capT = add(svg, "text", { x: x0, y: 16 }, "mass per mole of reaction (2 mol of electrons, 59.0 Wh)");
      const sumT = add(svg, "text", { x: x0, y: 78, style: `fill:${TXT}` }, "");
      void capT;
      const sM = stat("mass counted", ""), sE = stat("energy", "g"), sS = stat("specific energy", "y");
      const upd = () => {
        let x = x0, mass = 0;
        segs.forEach((sg, i) => {
          const w = ((x1 - x0) * sg.p.m) / TOT, on = i <= level;
          sg.r.setAttribute("x", x); sg.r.setAttribute("width", Math.max(0, w - 2));
          sg.r.setAttribute("fill", on ? sg.p.color : "none"); sg.r.setAttribute("stroke", on ? sg.p.color : "#2e3646");
          sg.r.setAttribute("stroke-dasharray", on ? "none" : "4 3");
          sg.t.setAttribute("x", x + w / 2); sg.t.textContent = fmt.n(sg.p.m, 1) + " g";
          sg.t.setAttribute("style", on ? "fill:#12151c;font-weight:600" : `fill:${MUT}`);
          if (on) mass += sg.p.m;
          x += w;
        });
        sumT.textContent = parts.slice(0, level + 1).map((p) => p.label).join(" + ");
        sM.set(fmt.n(mass, 1) + " g"); sE.set(fmt.n(WH_MOL, 1) + " Wh"); sS.set(big(WH_MOL / (mass / 1000)) + " Wh/kg");
      };
      const tg = toggle("count:", [[0, "zinc only"], [1, "+ copper ions"], [2, "+ sulfate"]], 0, (v) => { level = v; upd(); });
      el.append(widget("One mole of Daniell reaction: same energy, more and more mass", tg, svg, h("div", { class: "readout" }, sM, sE, sS),
        note("Still not counted: the water that dissolves the salts, the zinc sulfate solution, the salt bridge, the copper plate and the beakers. A real Daniell cell, weighed as a whole, delivers far less than any of these figures.")));
      upd();
      el.append(
        P("So every Wh/kg figure comes with a question: <b>per kilogram of what?</b> In this course, <i>theoretical</i> specific energy means: per kilogram of the reactants in the cell reaction, at the standard cell voltage. A finished battery, with electrolyte, casing and current collectors, often reaches only a fifth to a half of that (<em>Real batteries</em> has the numbers)."),
        P("The picture also shows the design rule for both electrodes: you want <b>many electrons per gram on each side, and a big voltage between them</b>. A light anode paired with a heavy cathode is still a heavy cell."),
        takeaway("Specific energy (Wh/kg) = specific capacity (mAh/g) × voltage, per kilogram of everything you choose to count. Always ask what was counted.")
      );
    },
    check: {
      type: "number", q: "An anode material stores <b>1000 mAh</b> in 1 g. The cathode needed to accept that much charge weighs <b>3 g</b>. The cell runs at <b>2.0 V</b>. What is the specific energy in <b>Wh/kg</b>, counting both electrodes?",
      answer: 500, tolerance: 5,
      hint: "Energy: 1 Ah × 2.0 V = 2 Wh. Mass counted: 1 g + 3 g. Then scale grams to kilograms.",
      why: "2 Wh in 4 g is 0.5 Wh/g = 500 Wh/kg. Counting the anode alone would have given 2000 Wh/kg: four times too rosy.",
      backTo: 6,
    },
  });

  // ================================================================ 10 (capstone)
  steps.push({
    title: "Capstone: design a gram",
    short: "Design a gram",
    newConcepts: [],
    render(el) {
      el.append(
        P("Everything in one calculator. Pick an anode metal and what takes its electrons, set how many grams of anode you carry, and read off the whole chain: <b>grams → moles → electrons → coulombs → mAh → volts → Wh → Wh/kg</b>."),
        P("The voltage is E°<sub>cell</sub> = E°<sub>cathode</sub> − E°<sub>anode</sub> from the potential ladder, and the masses are the molar masses of the elements. Try to find the pair with the highest specific energy, first counting the anode only, then with the cathode reactant included.")
      );
      const cathodes = [
        { id: "Cu", label: cf("Cu^2+") + " → Cu", mPerE: EL.Cu.mass / 2, what: "copper ions" },
        { id: "Ag", label: cf("Ag^+") + " → Ag", mPerE: EL.Ag.mass, what: "silver ions" },
        { id: "Cl2", label: cf("Cl2") + " gas", mPerE: EL.Cl.mass, what: "chlorine" },
        { id: "O2", label: cf("O2") + " (acid)", mPerE: EL.O.mass / 2, what: "oxygen" },
      ];
      const anodes = ANODES.filter(([sym]) => sym !== "Cd");
      let ai = 4, ci = 0, grams = 1, countCath = 0;
      const calcFor = (i) => {
        const [sym, n] = anodes[i], c = cathodes[ci], M = EL[sym].mass;
        const molE = n / M, V = E0[c.id].E - E0[sym].E, mAh = cap(sym, n), mC = molE * c.mPerE;   // per gram of anode
        return { sym, n, M, molE, V, mAh, mC, whKgA: mAh * V, whKgAC: (mAh * V) / (1 + mC) };
      };
      const lbl = anodes.map(([sym]) => sym);
      const barsC = hbars(lbl, { series: [BLUE], max: 4000, fmtv: (v) => big(v) + " mAh/g", labelWidth: 34, onclick: (i) => pick(i) });
      const barsE = hbars(lbl, { series: [GRN], max: 16000, fmtv: (v) => big(v) + " Wh/kg", labelWidth: 34, onclick: (i) => pick(i) });
      const sMol = stat("moles of electrons", ""), sQ = stat("charge", "b"), sAh = stat("capacity", "b"), sV = stat("E° cell", ""), sWh = stat("energy", "g"), sMass = stat("mass counted", ""), sSE = stat("specific energy", "y"), sG = stat("ΔG° per mole of anode metal", "");
      const halfA = h("div", { class: "mono" }), halfC = h("div", { class: "mono" });
      const rank = note("");
      const W = narrow(560, 380), H = 64;
      const svg = svgEl(W, H);
      const rA = add(svg, "rect", { x: 10, y: 22, height: 26, rx: 3, fill: "#8fa3bf" }), rC = add(svg, "rect", { y: 22, height: 26, rx: 3, fill: "#c98b5a" });
      const tA = add(svg, "text", { y: 16 }, ""), tC = add(svg, "text", { y: 16, "text-anchor": "end" }, "");
      const tB = add(svg, "text", { x: 10, y: 62 }, "");
      const upd = () => {
        const r = calcFor(ai), c = cathodes[ci], all = anodes.map((_, i) => calcFor(i));
        const se = all.map((x) => (countCath ? x.whKgAC : x.whKgA));
        const emax = Math.max(...se);
        barsC.update(all.map((x) => x.mAh), anodes.map((_, i) => (i === ai ? YEL : BLUE))); barsC.mark(ai);
        barsE.update(se.map((v) => (v / emax) * 16000), anodes.map((_, i) => (i === ai ? YEL : GRN)));
        se.forEach((v, i) => { /* show true values, bars scaled to the best */ });
        barsE.querySelectorAll(".v").forEach((e, i) => { e.textContent = big(se[i]) + " Wh/kg"; });
        barsE.mark(ai);
        const molE = r.molE * grams, mC = r.mC * grams, Wh = (r.mAh * grams * r.V) / 1000, mass = grams + (countCath ? mC : 0);
        sMol.set(fmt.n(molE, 4) + " mol"); sQ.set(big(molE * F) + " C"); sAh.set(big(r.mAh * grams) + " mAh");
        sV.set(fmt.n(r.V, 2) + " V"); sWh.set(fmt.n(Wh, 2) + " Wh"); sMass.set(fmt.n(mass, 2) + " g");
        sSE.set(big((Wh / mass) * 1000) + " Wh/kg");
        sG.set("−" + big((r.n * F * r.V) / 1000) + " kJ");
        halfA.textContent = "anode:   " + Chem.half(r.sym, true) + `   (E° = ${fmt.n(E0[r.sym].E, 2).replace("-", "−")} V)`;
        halfC.textContent = "cathode: " + Chem.half(c.id) + `   (E° = +${fmt.n(E0[c.id].E, 2)} V)`;
        const tot = grams + mC, wA = ((W - 20) * grams) / tot;
        rA.setAttribute("width", Math.max(2, wA - 2)); rC.setAttribute("x", 10 + wA); rC.setAttribute("width", Math.max(2, W - 20 - wA));
        rC.setAttribute("fill-opacity", countCath ? 1 : 0.25);
        tA.setAttribute("x", 10); tA.textContent = `${fmt.n(grams, 1)} g ${r.sym}`;
        tC.setAttribute("x", W - 10); tC.textContent = `${fmt.n(mC, 2)} g ${c.what}` + (countCath ? "" : " (not counted)");
        tB.textContent = `${fmt.n(c.mPerE, 1)} g of ${c.what} per mole of electrons`;
        const best = se.indexOf(emax);
        rank.innerHTML = `Best anode for this cathode${countCath ? ", counting both reactants" : ", counting the anode only"}: <b style="color:var(--yellow)">${anodes[best][0]}</b> at ${big(emax)} Wh/kg. ${EL[r.sym].name[0].toUpperCase() + EL[r.sym].name.slice(1)} is at ${Math.round((se[ai] / emax) * 100)}% of that.`;
      };
      const pick = (i) => { ai = i; tgA.set(i); upd(); };
      const tgA = toggle("anode:", anodes.map(([sym], i) => [i, sym]), ai, (v) => { ai = v; upd(); });
      const tgC = toggle("cathode:", cathodes.map((c, i) => [i, c.label]), ci, (v) => { ci = v; upd(); });
      const tgM = toggle("count the mass of:", [[0, "anode only"], [1, "anode + cathode reactant"]], countCath, (v) => { countCath = v; upd(); });
      el.append(widget("Design a gram: pick the elements, read the chain",
        tgA, tgC,
        slider({ name: "anode", min: 0.1, max: 10, step: 0.1, value: grams, fmtv: (v) => v.toFixed(1) + " g", oninput: (v) => { grams = v; upd(); } }),
        h("div", { style: "margin:8px 0;font-size:14px;overflow-x:auto;white-space:nowrap" }, halfA, halfC),
        h("div", { class: "readout" }, sMol, sQ, sAh, sV, sWh),
        h("div", { style: "margin-top:14px" }, tgM), svg,
        h("div", { class: "readout" }, sMass, sSE, sG),
        h("div", { class: "note", style: "margin-top:14px" }, "Specific capacity of each anode (click a bar to select)"), barsC,
        h("div", { class: "note", style: "margin-top:12px" }, "Specific energy with the chosen cathode (bars relative to the best)"), barsE, rank));
      upd();
      el.append(
        P("Things to notice. <b>Lithium wins twice</b>: most electrons per gram <i>and</i> the lowest rung on the ladder, so the highest voltage. Aluminium and magnesium come next on charge per gram. Lead is at the bottom on both counts, which is why a car battery is so heavy. Changing the anode mass scales charge and energy, but never Wh/kg."),
        P("Now count the cathode. With silver ions (107.9 g per mole of electrons) the anode hardly matters any more: the cathode is almost all the mass. Oxygen costs only 8 g per mole of electrons, and a cell that breathes it from the air does not even have to carry it. That is the idea behind <em>zinc–air</em> cells in the next section."),
        P("Keep these as <b>ceilings, not products</b>. They use standard potentials in water, count only the reacting elements, and ignore that lithium, sodium and magnesium attack water (which is why <em>Lithium</em> cells need another solvent). The next lesson, <em>Concentration and the Nernst equation</em>, shows why even the voltage does not stay at E° as a cell runs down."),
        takeaway("Charge = n × moles × F. Energy = charge × voltage. Per gram, that is nF/3.6M mAh/g and, times the cell voltage, Wh/kg. Light atoms, several electrons each and a wide gap on the ladder make a good battery.")
      );
    },
  });

  Course.run({
    id: "charge-energy",
    section: "2. The galvanic cell",
    title: "Charge, energy and capacity",
    concepts: {
      coulomb: "coulomb",
      ampere: "ampere",
      faraday: "Faraday constant",
      volt: "volt = joule per coulomb",
      gibbs: "Gibbs energy ΔG = −nFE",
      ah: "ampere-hour (capacity)",
      watt: "watt (power)",
      wh: "watt-hour (energy)",
      speccap: "specific capacity (mAh/g)",
      specenergy: "specific energy (Wh/kg)",
    },
    sources: [
      { title: "OpenStax Chemistry 2e, 17.4 Potential, Free Energy, and Equilibrium", url: "https://openstax.org/books/chemistry-2e/pages/17-4-potential-free-energy-and-equilibrium", note: "ΔG° = −nFE°cell, the sign convention and its link to spontaneity." },
      { title: "OpenStax Chemistry 2e, 17.7 Electrolysis", url: "https://openstax.org/books/chemistry-2e/pages/17-7-electrolysis", note: "Charge = current × time and the conversion between coulombs, moles of electrons and mass of metal." },
      { title: "NIST CODATA: Faraday constant", url: "https://physics.nist.gov/cgi-bin/cuu/Value?f", note: "F = 96 485.33 C/mol; elementary charge 1.602 176 634 × 10⁻¹⁹ C (exact since the 2019 SI)." },
      { title: "BIPM, The International System of Units (SI brochure, 9th ed.)", url: "https://www.bipm.org/en/publications/si-brochure", note: "Definitions of the ampere, coulomb, volt, joule and watt." },
      { title: "Wikipedia: Ampere-hour", url: "https://en.wikipedia.org/wiki/Ampere-hour", note: "1 Ah = 3600 C; use as a battery capacity unit." },
      { title: "Wikipedia: Faraday constant", url: "https://en.wikipedia.org/wiki/Faraday_constant", note: "F = N_A × e; 26.801 Ah per mole of electrons, the origin of the nF/3.6M formula." },
      { title: "Wikipedia: Specific energy", url: "https://en.wikipedia.org/wiki/Specific_energy", note: "Energy per unit mass, Wh/kg, as used for batteries." },
    ],
    steps,
  });
})();
