// Lesson 3.6: Beyond lithium-ion: sodium, sulfur, solid state and flow
(function () {
  const { h, s, fmt, widget, stat, slider, plot, toggle, hbars, rng, narrow } = Course;
  const f = Chem.f, EL = Chem.elements, E0 = Chem.E0by, cap = Chem.capacity, F = Chem.F;
  const YEL = "#ffd166", BLUE = "#6cb4ff", RED = "#ff6b6b", GRN = "#5fd38d", PUR = "#c3a6ff", MUTED = "#8b95a7", TEXT = "#e6e9ef", DARK = "#161a22", LINE = "#6b7689";

  // ---------- small helpers ----------
  const P = (html) => h("p", { html });
  const takeaway = (html) => h("div", { class: "takeaway", html });
  const formula = (html) => h("div", { class: "formula", html });
  const note = (html, style) => h("div", { class: "note", html, style: style || "margin-top:8px" });
  const num = (x) => Math.round(x).toLocaleString("en-US");
  const sgn = (x, d = 2) => (x < 0 ? "−" : "+") + Math.abs(x).toFixed(d);
  function T(g, x, y, str, a = {}) {
    const t = s("text", { x, y, "text-anchor": a.anchor || "middle", style: `font-size:${a.size || 12}px;fill:${a.fill || TEXT};font-weight:${a.weight || 400}` });
    t.textContent = str; g.append(t); return t;
  }
  const mkSvg = (W, H, maxw) => s("svg", { viewBox: `0 0 ${W} ${H}`, width: "100%", style: `display:block;margin:0 auto;max-width:${maxw || 640}px` });
  function loop(fn, ms = 33) {
    let t = null, dead = false;
    const tick = () => { if (dead) return; fn(); t = setTimeout(tick, ms); };
    t = setTimeout(tick, ms);
    return () => { dead = true; clearTimeout(t); };
  }
  const hex = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
  const mix = (a, b, t) => { const A = hex(a), B = hex(b); return "rgb(" + A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(",") + ")"; };
  // a stat tile whose value is a formula or a sentence (sans font, smaller)
  const fstat = (label, cls, size) => { const st = stat(label, cls); const v = st.querySelector(".v"); v.style.fontFamily = "inherit"; v.style.fontSize = (size || 18) + "px"; return st; };
  function scorecard(name, rows) {
    const tb = h("table", { class: "small" }, h("tr", {}, h("th", {}, ""), h("th", { html: "Li-ion today<br>(graphite | LiFePO₄)" }), h("th", { html: name })));
    rows.forEach(([a, b, c]) => tb.append(h("tr", {}, h("td", { html: a }), h("td", { html: b }), h("td", { html: c, style: "color:var(--yellow)" }))));
    return h("div", { class: "widget" }, h("div", { class: "widget-label" }, "Scorecard against the benchmark"), h("div", { class: "tablewrap" }, tb));
  }

  // ---------- shared data ----------
  // Crustal abundance, ppm by mass = grams per tonne of average continental crust (CRC Handbook values).
  // role: g = metal that gives electrons (anode / charge carrier), c = metal used inside cathodes, t = taker (non-metal)
  const AB = [["O", "t", 461000], ["Al", "g", 82300], ["Fe", "c", 56300], ["Ca", "g", 41500], ["Na", "g", 23600], ["Mg", "g", 23300], ["K", "g", 20900],
    ["Mn", "c", 950], ["S", "t", 350], ["Cl", "t", 145], ["V", "c", 120], ["Ni", "c", 84], ["Zn", "g", 70], ["Co", "c", 25], ["Li", "g", 20], ["Pb", "g", 14]];
  const PPM = Object.fromEntries(AB.map((a) => [a[0], a[2]]));
  const M = (sym) => EL[sym].mass;
  const M_FEPO4 = M("Fe") + M("P") + 4 * M("O");               // 150.82 g/mol: the host frame
  const CAP_LFP = cap(1, M_FEPO4 + M("Li"));                   // 170 mAh/g
  const CAP_NFP = cap(1, M_FEPO4 + M("Na"));                   // 154 mAh/g
  const CAP_C6 = cap(1, 6 * M("C"));                           // 372 mAh/g of graphite
  const CAP_LI = cap(1, M("Li")), CAP_NA = cap(1, M("Na"));
  const CAP_S = cap(2, M("S"));                                // 1672 mAh/g of sulfur
  const M_LI2S = 2 * M("Li") + M("S");
  const CAP_LI2S = cap(2, M_LI2S);                             // 1167 mAh/g of Li2S
  const V_LIS = 2.2;                                           // average Li–S cell voltage (approximate)
  const BENCH_V = 3.3;                                         // graphite | LiFePO4, approximate
  const BENCH_WHKG = BENCH_V * cap(1, 6 * M("C") + M("Li") + M_FEPO4); // ≈ 385 Wh/kg, active materials only
  const V_FLOW = E0["VO2/VO"].E - E0["V3/V2"].E;              // 1.26 V

  const steps = [];

  // ================================================================ 1
  steps.push({
    title: "A third number on the scorecard: how much is there?",
    short: "Abundance",
    newConcepts: ["abundance"],
    render(el) {
      el.append(
        P(`The lithium-ion cell (from <em>Lithium: the lightest metal</em>) is the best rechargeable battery we mass-produce. No wonder: lithium is the strongest giver on the potential ladder (E° = −3.04 V) and the lightest metal, so one gram of it moves ${num(CAP_LI)} mAh of charge (<em>Charge, energy and capacity</em>).`),
        P("So why look further? Because volts and mAh/g are not the whole story. A power grid, or a billion cars, needs millions of tonnes of battery material. The next question is blunt: <b>how much of the element is there?</b>"),
        P("Geologists answer it like this: grind up one tonne of average rock from the Earth's crust and weigh each element in it. That figure, in grams per tonne (the same thing as parts per million, ppm), is the <b>crustal abundance</b>. Click an element:")
      );
      const toLog = (v) => Math.log10(v) / 6;
      const col = { g: GRN, c: PUR, t: BLUE };
      const bars = hbars(AB.map(([sym]) => `<b>${sym}</b> ${EL[sym].name}`), { max: 1, labelWidth: 118, fmtv: (v) => num(Math.pow(10, v * 6)), onclick: (i) => pick(i) });
      const sG = stat("grams in 1 tonne of rock", "y"), sR = stat("rock that holds 100 g of it", "b"), sX = stat("compared with lithium", "g");
      const what = note("", "min-height:22px;margin-top:10px");
      const roleTxt = { g: "a metal that gives electrons (anode or charge carrier)", c: "a metal used inside cathode hosts", t: "a non-metal that takes electrons" };
      function pick(i) {
        const [sym, role, ppm] = AB[i];
        bars.mark(i);
        sG.set(num(ppm) + " g");
        const t = 100 / ppm;
        sR.set(t >= 1 ? fmt.n(t, t < 10 ? 1 : 0) + " t" : fmt.n(t * 1000, t * 1000 < 10 ? 1 : 0) + " kg");
        const k = ppm / PPM.Li;
        sX.set(k >= 1 ? "× " + num(k) : "× " + fmt.n(k, 2));
        what.innerHTML = `<b style="color:${col[role]}">${EL[sym].name}</b>: ${roleTxt[role]}.`;
      }
      bars.update(AB.map((a) => toLog(a[2])), AB.map((a) => col[a[1]]));
      el.append(widget("Grams of each element in one tonne of average crust (bar length is logarithmic: each sixth of the track is ×10)",
        bars, what, h("div", { class: "readout" }, sG, sR, sX),
        note(`<span style="color:${GRN}">green</span> = metals that give electrons · <span style="color:${PUR}">purple</span> = metals inside cathodes · <span style="color:${BLUE}">blue</span> = takers`)));
      pick(AB.findIndex((a) => a[0] === "Li"));
      el.append(
        P("A 1 kWh lithium-ion pack (a large e-bike battery) shuttles about 80 g of lithium: all the lithium in <b>4 tonnes</b> of average rock. Many lithium-ion cathodes also need cobalt or nickel, which are just as thin on the ground. Sodium, magnesium, aluminium, iron and sulfur are hundreds to thousands of times more common."),
        P("A caveat: abundance is not price. Mines dig ores and brines, where nature has already concentrated an element, and some abundant elements are costly to purify. But at very large scale and over decades, the common elements are the ones that stay cheap. So every challenger in this lesson is scored on three numbers: <b>volts</b>, <b>mAh/g</b>, and now <b>ppm</b>."),
        takeaway("Crustal abundance = grams of an element per tonne of average rock (ppm). Lithium: 20. Sodium: 23,600. A battery for the whole planet has to be made of what the planet has.")
      );
    },
    check: {
      type: "number",
      q: "Sodium: 23,600 g per tonne of crust. Lithium: 20 g per tonne. Roughly how many times more abundant is sodium?",
      answer: 1180, tolerance: 60, hint: "Divide one by the other: 23,600 / 20.",
      why: "23,600 / 20 = 1180. For every lithium atom's worth of mass in the crust there is over a thousand times as much sodium.",
    },
  });

  // ================================================================ 2
  steps.push({
    title: "Sodium-ion: the same rocking chair, a bigger passenger",
    short: "Sodium-ion",
    newConcepts: ["naion"],
    render(el) {
      el.append(
        P("The obvious first challenger sits right below lithium in group 1 (<em>The periodic table</em>): sodium. One valence electron, happily given away: " + f("Na -> Na^+ + e-") + ". So copy the lithium-ion design exactly. Two hosts, and an ion that slides between them without rebuilding them (<em>intercalation</em> and the <em>rocking-chair mechanism</em>, from the lithium lesson), but let " + f("Na^+") + " ride instead of " + f("Li^+") + ". That is the <b>sodium-ion cell</b>."),
        P("Three things change, and you can predict all of them from the periodic table. Sodium is one period further down, so its ion is <b>bigger</b> and <b>heavier</b>, and its E° is 0.33 V less negative, so the cell has a little <b>less push</b>. Switch the passenger and run the cell:")
      );
      // ---- rocking-chair scene
      const W = narrow(520, 380), H = 236, hw = narrow(150, 112), top = 78, hh = 124, xa = 24, xc = W - 24 - hw;
      const svg = mkSvg(W, H), g0 = s("g"), gI = s("g"), gE = s("g"); svg.append(g0, gI, gE);
      [xa, xc].forEach((x, k) => {
        g0.append(s("rect", { x, y: top, width: hw, height: hh, fill: k ? "#3a2f4a" : "#2b3140", stroke: LINE, rx: 4 }));
        for (let i = 0; i <= 4; i++) g0.append(s("line", { x1: x + 6, x2: x + hw - 6, y1: top + 10 + i * 26, y2: top + 10 + i * 26, stroke: k ? PUR : "#9aa4b5", "stroke-width": 3, "stroke-linecap": "round", opacity: 0.8 }));
      });
      const wireY = 30, ax = xa + hw / 2, cx = xc + hw / 2;
      g0.append(s("path", { d: `M${ax} ${top} V${wireY} H${cx} V${top}`, fill: "none", stroke: "#b9c2d3", "stroke-width": 2.5 }));
      g0.append(s("rect", { x: W / 2 - 34, y: wireY - 13, width: 68, height: 26, rx: 5, fill: "#212734", stroke: "#b9c2d3", "stroke-width": 1.5 }));
      const devTxt = T(g0, W / 2, wireY + 4, "resting", { size: 12, fill: MUTED });
      T(g0, ax - hw / 2 + 12, top - 8, "−", { size: 16, fill: TEXT, weight: 700 });
      T(g0, cx + hw / 2 - 12, top - 8, "+", { size: 16, fill: TEXT, weight: 700 });
      const capA = T(g0, ax, top + hh + 17, "", { size: 12, fill: MUTED });
      T(g0, cx, top + hh + 17, f("FePO4 frame"), { size: 12, fill: MUTED });
      const capE = T(g0, W / 2, top + hh + 17, "", { size: 11, fill: MUTED });
      const slotOf = (side, i) => ({ x: (side ? xc : xa) + hw * (i % 2 ? 0.7 : 0.3), y: top + 23 + Math.floor(i / 2) * 26 });
      const ions = [];
      for (let i = 0; i < 8; i++) {
        const c = s("circle", { r: 6.5, fill: RED, stroke: DARK, "stroke-width": 0.8 });
        gI.append(c); ions.push({ c, side: 0, slot: i });
      }
      const place = (o, x, y) => { o.c.setAttribute("cx", x.toFixed(1)); o.c.setAttribute("cy", y.toFixed(1)); };
      ions.forEach((o) => { const p = slotOf(0, o.slot); place(o, p.x, p.y); });
      const eDot = s("circle", { r: 4, fill: YEL, stroke: DARK, "stroke-width": 0.6, visibility: "hidden" }); gE.append(eDot);
      const wirePts = [[ax, top], [ax, wireY], [cx, wireY], [cx, top]];
      function along(t) {
        const L = wirePts.slice(1).map((p, i) => Math.hypot(p[0] - wirePts[i][0], p[1] - wirePts[i][1])), tot = L.reduce((a, b) => a + b, 0);
        let d = t * tot;
        for (let i = 0; i < L.length; i++) { if (d <= L[i] || i === L.length - 1) { const k = Math.min(1, d / L[i]); return [wirePts[i][0] + (wirePts[i + 1][0] - wirePts[i][0]) * k, wirePts[i][1] + (wirePts[i + 1][1] - wirePts[i][1]) * k]; } d -= L[i]; }
      }
      let mode = null, flight = null, moved = 0, ion = "Li";
      const sSoc = stat("state of charge", "g"), sE = stat("electrons through the wire", "y"), sV = stat("typical cell voltage", "b");
      const upd = () => {
        const n = ions.filter((o) => o.side === 0 && o !== (flight && flight.o)).length + (flight && flight.to === 0 ? 0 : 0);
        sSoc.set(Math.round((ions.filter((o) => o.side === 0).length / 8) * 100) + "%");
        sE.set(String(moved));
        devTxt.textContent = mode === "dis" ? "load" : mode === "chg" ? "charger" : "resting";
        devTxt.style.fill = mode ? YEL : MUTED;
        return n;
      };
      function next() {
        const from = mode === "dis" ? 0 : 1, to = 1 - from;
        const src = ions.filter((o) => o.side === from);
        if (!src.length) { mode = null; flight = null; eDot.setAttribute("visibility", "hidden"); upd(); return; }
        const o = src[src.length - 1];
        const used = new Set(ions.filter((q) => q.side === to).map((q) => q.slot));
        let slot = 0; while (used.has(slot)) slot++;
        flight = { o, a: slotOf(from, o.slot), b: slotOf(to, slot), to, slot, t: 0 };
        eDot.setAttribute("visibility", "visible");
      }
      const stop = loop(() => {
        if (!flight) { if (mode) next(); return; }
        flight.t = Math.min(1, flight.t + 0.045);
        const k = flight.t, e = k * k * (3 - 2 * k);
        place(flight.o, flight.a.x + (flight.b.x - flight.a.x) * e, flight.a.y + (flight.b.y - flight.a.y) * e);
        const p = along(flight.to === 1 ? k : 1 - k);
        eDot.setAttribute("cx", p[0].toFixed(1)); eDot.setAttribute("cy", p[1].toFixed(1));
        if (k >= 1) { flight.o.side = flight.to; flight.o.slot = flight.slot; flight = null; moved++; eDot.setAttribute("visibility", "hidden"); upd(); }
      });
      // ---- comparison table + host mass bar
      const D = {
        Li: { name: "lithium", r: 76, capM: CAP_LI, capH: CAP_LFP, V: "≈ 3.3 V", host: "graphite", rr: 6.5 },
        Na: { name: "sodium", r: 102, capM: CAP_NA, capH: CAP_NFP, V: "≈ 3.1 V", host: "hard carbon", rr: 8.7 },
      };
      const tb = h("table", { class: "small" });
      const massBar = h("div", { style: "display:flex;height:22px;border-radius:5px;overflow:hidden;margin-top:6px;font-size:12px;line-height:22px;color:#161a22;font-weight:600" });
      const massNote = note("");
      function setIon(k) {
        ion = k; const d = D[k];
        ions.forEach((o) => o.c.setAttribute("r", d.rr));
        capA.textContent = d.host; capE.textContent = f(k + "^+") + " electrolyte";
        sV.set(d.V);
        const cell = (a, b, key) => h("tr", {}, h("td", { html: a }), ...["Li", "Na"].map((q) => h("td", { class: "num", style: q === k ? "color:var(--yellow);font-weight:700" : "", html: b(q) })));
        tb.innerHTML = "";
        tb.append(h("tr", {}, h("th", {}, ""), h("th", { class: "num" }, "Li"), h("th", { class: "num" }, "Na")),
          cell("molar mass (g/mol)", (q) => M(q).toFixed(2)),
          cell("ion radius (pm)", (q) => String(D[q].r)),
          cell("E° of the metal (V)", (q) => sgn(E0[q].E)),
          cell("crust (ppm)", (q) => num(PPM[q])),
          cell("mAh/g, bare metal", (q) => num(D[q].capM)),
          cell("mAh/g inside the " + f("FePO4") + " host", (q) => num(D[q].capH)));
        const tot = M_FEPO4 + M(k);
        massBar.innerHTML = "";
        massBar.append(h("div", { style: `width:${(M_FEPO4 / 174) * 100}%;background:${PUR};padding-left:8px;white-space:nowrap;overflow:hidden` }, f("FePO4") + " frame " + M_FEPO4.toFixed(1) + " g"),
          h("div", { style: `width:${(M(k) / 174) * 100}%;background:${RED};text-align:center;white-space:nowrap;overflow:hidden` }, k));
        massNote.innerHTML = `One mole of filled host weighs ${M_FEPO4.toFixed(1)} + ${M(k).toFixed(2)} = <b>${tot.toFixed(1)} g</b> and holds one mole of electrons: ${num(F)} / (3.6 × ${tot.toFixed(1)}) = <b>${num(cap(1, tot))} mAh/g</b>. The passenger is only ${fmt.pct(M(k) / tot)} of the load.`;
        upd();
      }
      const tg = toggle("passenger:", [["Li", f("Li^+")], ["Na", f("Na^+")]], "Li", setIon);
      const bD = h("button", { class: "primary", onclick: () => { mode = "dis"; upd(); } }, "Discharge");
      const bC = h("button", { onclick: () => { mode = "chg"; upd(); } }, "Charge");
      el.append(widget("One dot = one ion; each ion that crosses sends one electron around the wire",
        tg, svg, h("div", { class: "btns" }, bD, bC), h("div", { class: "readout" }, sSoc, sE, sV),
        h("div", { class: "tablewrap", style: "margin-top:14px" }, tb), massBar, massNote));
      setIon("Li");
      el.append(
        P(`Look at the last two table rows. As bare metals, sodium stores 3.3 times less charge per gram than lithium. Inside a host the gap shrinks to about 10%, because the host frame is most of the mass either way. (The iron phosphate frame is used here for a like-for-like comparison. Commercial sodium-ion cathodes are mostly layered oxides and other frames, built on the same principle.)`),
        P("The size matters more than the mass. " + f("Na^+") + " is too big to slide between graphite's layers the way " + f("Li^+") + " does, so sodium-ion cells use a disordered carbon called <em>hard carbon</em> (named only) with roomier gaps, about 300 mAh/g."),
        P("<b>State of play, as of 2026:</b> sodium-ion cells are in mass production in China, with makers quoting up to about 175 Wh/kg, in the range of lithium iron phosphate cells. They go into small cars, scooters and grid storage. No lithium, no cobalt, no nickel."),
        scorecard("Sodium-ion", [
          ["cell voltage", "≈ 3.3 V", "≈ 3.1 V"],
          ["cathode capacity", num(CAP_LFP) + " mAh/g", num(CAP_NFP) + " mAh/g (same frame)"],
          ["anode capacity", num(CAP_C6) + " mAh/g (graphite)", "≈ 300 mAh/g (hard carbon)"],
          ["scarcest carrier", "Li, 20 ppm", "Na, 23,600 ppm"],
          ["the catch", "scarce elements", "somewhat heavier and bulkier per Wh"],
        ]),
        takeaway("A sodium-ion cell is a lithium-ion cell with a bigger, heavier, 1000× more abundant passenger. It loses a little voltage and capacity, because the host, not the ion, carries most of the weight.")
      );
      return stop;
    },
    check: {
      type: "choice",
      q: "Sodium metal stores 3.3× less charge per gram than lithium metal. Yet the sodium-filled cathode host stores only about 10% less than the lithium-filled one. Why?",
      options: [
        "Most of each gram is the host frame, which is the same for both; the ion is a small part of the mass",
        "A sodium ion carries two charges, which makes up for its mass",
        "The sodium cell runs at a higher voltage, which raises its mAh/g",
      ],
      answer: 0,
      wrongHints: {
        1: "Sodium is in group 1, like lithium: it gives exactly one electron and becomes Na⁺.",
        2: "The sodium cell has slightly less voltage, not more. And voltage does not enter mAh/g at all: capacity counts electrons per gram.",
      },
      why: "Right. One electron per formula unit either way; the frame weighs about 151 g/mol and the passenger adds 7 g (Li) or 23 g (Na).",
    },
  });

  // ================================================================ 3
  steps.push({
    title: "Lithium–sulfur: throw the host away",
    short: "Lithium–sulfur",
    newConcepts: ["lis"],
    render(el) {
      el.append(
        P(`Step 2 showed the weak spot of every intercalation cathode: the frame. In ${f("LiFePO4")}, about 150 g of iron, phosphorus and oxygen are needed to hold one mole of electrons. What if the cathode were just a light element that takes electrons <em>itself</em>, with no frame?`),
        P("Sulfur is the candidate: group 16, six valence electrons, two short of a full shell (<em>Atoms, electrons and charge</em>), so each atom takes two electrons and becomes " + f("S^2-") + ". It is light (32.06 g/mol), abundant (350 ppm) and a waste product of oil refining. Pair it with a lithium metal anode and you have the <b>lithium–sulfur cell</b>."),
        P("Solid sulfur is made of rings of eight atoms, " + f("S8") + ". During discharge, electrons arriving through the wire cut the ring into chains, then cut the chains shorter and shorter. Each cut costs two electrons, and two " + f("Li^+") + " arrive through the electrolyte to balance the new charges. Feed the ring electrons:")
      );
      const W = narrow(520, 380), H = 150;
      const svg = mkSvg(W, H), g = s("g"); svg.append(g);
      const sN = stat("electrons taken by one ring", "y"), sOx = stat("average oxidation number of S", "b"), sC = stat("stored per gram of sulfur", "g");
      const stateBox = note("", "min-height:44px;margin-top:10px");
      const cmp = hbars([f("LiFePO4") + " host", "sulfur, so far"], { max: 1700, labelWidth: 120, fmtv: (v) => num(v) + " mAh/g" });
      function chains(n) { const k = n / 2, base = Math.floor(8 / k), extra = 8 % k; return Array.from({ length: k }, (_, i) => base + (i < extra ? 1 : 0)); }
      function draw(n) {
        g.innerHTML = "";
        const cy = 72, r = 10;
        const atom = (x, y) => { g.append(s("circle", { cx: x, cy: y, r, fill: YEL, stroke: DARK, "stroke-width": 1 })); T(g, x, y + 3.5, "S", { size: 10, fill: DARK, weight: 700 }); };
        const bond = (x1, y1, x2, y2) => g.append(s("line", { x1, y1, x2, y2, stroke: "#c9b25a", "stroke-width": 4, "stroke-linecap": "round" }));
        if (n === 0) {
          const pts = Array.from({ length: 8 }, (_, i) => [W / 2 + 42 * Math.cos((i / 8) * 2 * Math.PI), cy + 42 * Math.sin((i / 8) * 2 * Math.PI)]);
          pts.forEach((p, i) => { const q = pts[(i + 1) % 8]; bond(p[0], p[1], q[0], q[1]); });
          pts.forEach((p) => atom(p[0], p[1]));
          T(g, W / 2, cy + 4, f("S8"), { size: 13, fill: MUTED });
        } else {
          const ch = chains(n), sp = 26, gap = 18;
          const total = (8 - ch.length) * sp + (ch.length - 1) * (gap + sp);
          let x = (W - total) / 2;
          ch.forEach((len) => {
            const x0 = x, x1 = x + (len - 1) * sp;
            if (len > 1) bond(x0, cy, x1, cy);
            for (let i = 0; i < len; i++) atom(x0 + i * sp, cy);
            const mx = (x0 + x1) / 2;
            [-28, 28].forEach((dy) => { g.append(s("circle", { cx: mx, cy: cy + dy, r: 6.5, fill: RED, stroke: DARK, "stroke-width": 0.8 })); });
            T(g, mx, cy + 56, f((len > 1 ? "S" + len : "S") + "^2-"), { size: 11, fill: BLUE });
            x = x1 + sp + gap;
          });
          T(g, W / 2, 16, "red = " + f("Li^+") + " that came through the electrolyte", { size: 11, fill: MUTED });
        }
        sN.set(n + " of 16"); sOx.set(n === 0 ? "0" : "−" + fmt.n(n / 8, 2).replace(/\.?0+$/, "")); sC.set(num((n / 16) * CAP_S) + " mAh");
        cmp.update([CAP_LFP, (n / 16) * CAP_S], [PUR, YEL]);
        stateBox.innerHTML = n === 0 ? "<b>" + f("S8") + " ring:</b> solid sulfur, oxidation number 0. Nothing stored yet."
          : n <= 6 ? `<b style="color:${BLUE}">Long chains (lithium polysulfides, such as ${f("Li2S8")} and ${f("Li2S4")}):</b> these <b>dissolve</b> in the electrolyte. Remember that; it is the subject of the next step.`
          : n < 16 ? "<b>Short chains:</b> these are solids again and settle on the cathode. The last cuts are the slowest."
          : "<b>" + f("8 Li2S") + ":</b> every sulfur atom has its two electrons (oxidation number −2). The ring took 16 electrons in all.";
      }
      const sl = slider({ name: "electrons", min: 0, max: 16, step: 2, value: 0, fmtv: (v) => v + " e⁻", oninput: draw });
      el.append(widget("One sulfur ring during discharge (simplified: a real cell holds a mixture of chain lengths at any moment)", svg, sl, h("div", { class: "readout" }, sN, sOx, sC), stateBox, h("div", { style: "margin-top:10px" }, cmp)));
      draw(0);
      el.append(
        formula(`<span class="bl">${f("16Li -> 16Li^+ + 16e-")}</span> &nbsp;·&nbsp; <span class="hl">${f("S8 + 16e- -> 8S^2-")}</span><br>${f("S8 + 16Li -> 8Li2S")}<small>anode (oxidation) · cathode (reduction) · overall. Two electrons per sulfur atom: 2 × 96,485 / (3.6 × 32.06) = ${num(CAP_S)} mAh per gram of sulfur.</small>`),
        P(`That is ten times the capacity of the ${f("LiFePO4")} host. There is a price: sulfur is a weaker taker than the metal-oxide cathodes, so the cell gives only about <b>${V_LIS} V</b> instead of 3.3 V. It still wins on energy, because energy = charge × voltage and the charge is so much larger.`),
        P("Sulfur also does not conduct electrons at all, so real cathodes are sulfur melted into porous carbon, which adds dead weight. And unlike an intercalation host, the cathode is torn down and rebuilt on every cycle: a ring, then liquid, then a different solid. This is a <em>conversion</em> rather than an intercalation."),
        scorecard("Lithium–sulfur", [
          ["cell voltage", "≈ 3.3 V", "≈ " + V_LIS + " V"],
          ["cathode capacity", num(CAP_LFP) + " mAh/g", num(CAP_S) + " mAh/g of S"],
          ["anode", "graphite, " + num(CAP_C6) + " mAh/g", "lithium metal, " + num(CAP_LI) + " mAh/g"],
          ["theoretical Wh/kg (active materials)", "≈ " + num(BENCH_WHKG), "≈ 2,600"],
          ["scarcest element", "Li, 20 ppm", "Li, 20 ppm (sulfur: 350)"],
        ]),
        takeaway(`Lithium–sulfur replaces the heavy host with bare sulfur: ${f("S8 + 16Li -> 8Li2S")}, two electrons per S atom, ${num(CAP_S)} mAh/g at about ${V_LIS} V.`)
      );
    },
    check: {
      type: "number",
      q: `Count the lithium as well. The discharged product ${f("Li2S")} weighs ${M_LI2S.toFixed(2)} g/mol and holds 2 electrons: that is ${num(CAP_LI2S)} mAh per gram of ${f("Li2S")}. At about ${V_LIS} V, what is the theoretical specific energy in Wh/kg?`,
      answer: Math.round(CAP_LI2S * V_LIS), tolerance: 40,
      hint: "From Charge, energy and capacity: mAh/g × V = Wh/kg.",
      why: `${num(CAP_LI2S)} mAh/g × ${V_LIS} V ≈ ${num(CAP_LI2S * V_LIS)} Wh/kg, about seven times the ${num(BENCH_WHKG)} Wh/kg that the same counting gives for graphite | ${f("LiFePO4")}.`,
    },
  });

  // ================================================================ 4
  steps.push({
    title: "The polysulfide shuttle: a leak inside the cell",
    short: "Polysulfide shuttle",
    newConcepts: ["shuttle"],
    render(el) {
      el.append(
        P("If lithium–sulfur is seven times better on paper, why is it not in your phone? Go back to the long chains in step 3. They <b>dissolve</b>. A dissolved polysulfide is a mobile anion, free to wander through the electrolyte, and nothing tells it to stay on the cathode side."),
        P("Watch what happens while the cell is being charged. At the cathode, short chains are joined back into long ones, giving their electrons to the wire as they should. But a long chain can drift across to the lithium anode. Lithium metal is the strongest reducing agent there is (<em>Electrode potentials</em>): it hands electrons straight to the chain and cuts it short again. The short chain drifts back to the cathode, is lengthened again, and the loop repeats."),
        P("Each round trip carries two electrons from anode to cathode <b>inside the cell, bypassing the wire</b>. This is the <b>polysulfide shuttle</b>. Turn up how much polysulfide is dissolved:")
      );
      const W = narrow(520, 380), H = 200, x0 = 46, x1 = W - 66, y0 = 34, y1 = 176;
      const svg = mkSvg(W, H), gB = s("g"), gP = s("g"); svg.append(gB, gP);
      gB.append(s("rect", { x: x0, y: y0, width: x1 - x0, height: y1 - y0, fill: "#9fb4d6", opacity: 0.07 }));
      gB.append(s("rect", { x: 16, y: y0 - 6, width: 30, height: y1 - y0 + 12, fill: "#aeb6c2", rx: 2 }));
      gB.append(s("rect", { x: x1, y: y0 - 6, width: 50, height: y1 - y0 + 12, fill: "#3b3f46", stroke: "#c9b25a", rx: 2 }));
      T(gB, 31, y1 + 20, "Li (−)", { size: 11, fill: MUTED }); T(gB, x1 + 25, y1 + 20, "S + carbon (+)", { size: 11, fill: MUTED });
      T(gB, 31, (y0 + y1) / 2 + 4, "Li", { size: 12, fill: DARK, weight: 700 });
      T(gB, x1 + 25, (y0 + y1) / 2 + 4, "S", { size: 13, fill: YEL, weight: 700 });
      T(gB, (x0 + x1) / 2, 16, "big dark dot = long chain · small pale dot = short chain", { size: 11, fill: MUTED });
      const barrier = s("line", { x1: x1 - 50, x2: x1 - 50, y1: y0, y2: y1, stroke: GRN, "stroke-width": 3, "stroke-dasharray": "6 4", visibility: "hidden" }); gB.append(barrier);
      const R = rng(11);
      let parts = [], N = 12, wall = false, chargeIn = 0, wasted = 0, stuck = 0, running = true;
      const sIn = stat("electrons from the charger", "y"), sW = stat("carried back by the shuttle", "r"), sCE = stat("coulombic efficiency", "g"), sL = stat("sulfur stuck on the anode", "p");
      const LONG = "#3f7fd0", SHORT = "#b9dcff";
      function paint(p) { p.c.setAttribute("r", p.long ? 7 : 4.5); p.c.setAttribute("fill", p.long ? LONG : SHORT); }
      function reset() {
        gP.innerHTML = ""; parts = []; chargeIn = 0; wasted = 0; stuck = 0;
        const lo = wall ? x1 - 44 : x0 + 8;
        for (let i = 0; i < N; i++) {
          const c = s("circle", { stroke: DARK, "stroke-width": 0.7 });
          const a = R() * 2 * Math.PI, p = { c, x: lo + R() * (x1 - 8 - lo), y: y0 + 8 + R() * (y1 - y0 - 16), vx: Math.cos(a) * 2.4, vy: Math.sin(a) * 2.4, long: R() < 0.5 };
          gP.append(c); paint(p); parts.push(p);
        }
        show();
      }
      function show() {
        parts.forEach((p) => { p.c.setAttribute("cx", p.x.toFixed(1)); p.c.setAttribute("cy", p.y.toFixed(1)); });
        sIn.set(String(Math.floor(chargeIn))); sW.set(String(wasted));
        sCE.set(chargeIn < 1 ? "–" : fmt.pct(Math.max(0, 1 - wasted / chargeIn)));
        sL.set(stuck + " of " + N);
      }
      const stop = loop(() => {
        if (!running) return;
        chargeIn += 0.25;
        const lo = wall ? x1 - 44 : x0;
        for (const p of parts) {
          if (p.dead) continue;
          p.vx += (R() - 0.5) * 0.5; p.vy += (R() - 0.5) * 0.5;
          const v = Math.hypot(p.vx, p.vy) || 1; p.vx *= 2.4 / v; p.vy *= 2.4 / v;
          p.x += p.vx; p.y += p.vy;
          if (p.y < y0 + 7) { p.y = y0 + 7; p.vy = Math.abs(p.vy); } if (p.y > y1 - 7) { p.y = y1 - 7; p.vy = -Math.abs(p.vy); }
          if (p.x > x1 - 7) { p.x = x1 - 7; p.vx = -Math.abs(p.vx); if (!p.long) { p.long = true; paint(p); } }
          if (p.x < lo + 7) {
            p.x = lo + 7; p.vx = Math.abs(p.vx);
            if (!wall && p.long) {
              p.long = false; wasted += 2; paint(p);
              if (R() < 0.05) { p.dead = true; stuck++; p.x = x0 + 3; p.c.setAttribute("fill", "#77808f"); p.c.setAttribute("r", 4); }
            }
          }
        }
        show();
      }, 33);
      const sl = slider({ name: "dissolved polysulfide", nameWidth: 110, min: 0, max: 30, step: 1, value: N, fmtv: (v) => v + " chains", oninput: (v) => { N = v; reset(); } });
      const tg = toggle("", [[false, "bare cathode"], [true, "barrier layer that holds polysulfides back"]], false, (v) => { wall = v; barrier.setAttribute("visibility", v ? "visible" : "hidden"); reset(); });
      const bRun = h("button", { onclick: () => { running = !running; bRun.textContent = running ? "Pause" : "Resume"; } }, "Pause");
      el.append(widget("Charging a lithium–sulfur cell: the charger pushes electrons in at a steady rate (toy model)", svg, sl, tg,
        h("div", { class: "btns" }, bRun, h("button", { onclick: reset }, "Restart the charge")), h("div", { class: "readout" }, sIn, sW, sCE, sL)));
      reset();
      el.append(
        P("Three kinds of damage come out of this one leak. The <em>coulombic efficiency</em> (charge out / charge in, from <em>Real batteries</em>) drops, and with enough dissolved polysulfide the cell <b>never finishes charging</b>: the shuttle undoes the work as fast as the charger does it. Left on a shelf, the cell <em>self-discharges</em> by the same route. And some sulfur ends up stuck on the anode as solid " + f("Li2S") + ", out of reach for good, so capacity fades with every cycle."),
        P("The fixes all aim to keep the chains at home: sulfur locked inside tiny carbon pores, barrier layers, protective films on the lithium (an inorganic salt, lithium nitrate " + f("LiNO3") + ", is a standard additive), or an electrolyte that polysulfides cannot dissolve in. The radical version of that last idea is the next step."),
        P("<b>State of play, as of 2026:</b> lithium–sulfur cells are made on pilot lines and sold in small numbers where low weight matters most (drones, aerospace). Nobody mass-produces them yet; cycle life is the hurdle."),
        takeaway("Dissolved polysulfides ferry electrons from the lithium anode back to the sulfur cathode inside the cell. That shuttle wastes charge, drains the resting cell and slowly loses sulfur.")
      );
      return stop;
    },
    check: {
      type: "choice",
      q: "A lithium–sulfur cell takes in 1000 mAh while charging but gives back only 800 mAh. Nothing leaked out of the case. Where did the other 200 mAh of electrons go?",
      options: [
        "Polysulfides carried them from the anode back to the cathode through the electrolyte, bypassing the wire",
        "They were lost as heat in the cell's internal resistance",
        "Sulfur can only ever hold 800 mAh, so the rest was never accepted",
      ],
      answer: 0,
      wrongHints: {
        1: "Internal resistance costs volts, not coulombs: every electron still arrives, just with less energy. That lowers energy efficiency, not coulombic efficiency.",
        2: "The charger really did push 1000 mAh through. The question is which path those electrons took afterwards.",
      },
      why: "Right: an internal short circuit made of dissolved molecules. Coulombic efficiency here is 800 / 1000 = 80%.",
      backTo: 2,
    },
  });

  // ================================================================ 5
  steps.push({
    title: "Solid electrolytes: a crystal that lets one ion through",
    short: "Solid electrolytes",
    newConcepts: ["solid"],
    render(el) {
      el.append(
        P(`Lithium metal is the anode everyone wants: ${num(CAP_LI)} mAh/g against ${num(CAP_C6)} for graphite. The lithium lesson explained why we do not use it: on recharge the metal grows back as needles, <em>dendrites</em>, which cross the liquid electrolyte and short the cell. And step 4 just added a second complaint about liquids: things dissolve in them and wander.`),
        P("So make the electrolyte a <b>solid</b>. Remember what an electrolyte has to do (<em>Ions, salts and electrolytes</em>): carry ions, and <i>not</i> carry electrons. In a normal salt crystal the ions are locked in place, which is why dry salt did not light the bulb. But some crystals are built differently: a rigid frame of heavy atoms with tunnels through it, and in the tunnels, lithium ions with <b>empty sites next to them</b>. An ion can hop into the empty site, the next one hops into the site it left, and charge moves through a solid."),
        P("That is a <b>solid electrolyte</b>. Try it. The frame (blue) never moves. Only " + f("Li^+") + " (red) hops, pushed left to right by the cell:")
      );
      const cols = narrow(14, 10), rows = 5, sp = 30, W = cols * sp + 80, H = rows * sp + 50, ox = 40, oy = 22;
      const svg = mkSvg(W, H), gF = s("g"), gI = s("g"); svg.append(gF, gI);
      gF.append(s("rect", { x: 6, y: oy - 8, width: 26, height: rows * sp + 16, fill: "#aeb6c2", rx: 2 }));
      gF.append(s("rect", { x: W - 32, y: oy - 8, width: 26, height: rows * sp + 16, fill: "#3a2f4a", stroke: PUR, rx: 2 }));
      T(gF, 19, H - 6, "Li (−)", { size: 10, fill: MUTED }); T(gF, W - 19, H - 6, "(+)", { size: 10, fill: MUTED });
      for (let r = 0; r <= rows; r++) for (let c = 0; c <= cols; c++) gF.append(s("circle", { cx: ox + c * sp, cy: oy + r * sp, r: 6, fill: BLUE, opacity: 0.45 }));
      const R = rng(5);
      let occ = [], ions = [], vac = 0.2, win = [], crossings = 0;
      const sRate = stat("Li⁺ crossing per second", "y"), sEl = stat("electrons crossing the crystal", "g"), sVac = stat("empty sites", "b");
      const pos = (o) => { o.c.setAttribute("cx", ox + sp / 2 + o.col * sp); o.c.setAttribute("cy", oy + sp / 2 + o.row * sp); };
      function rebuild() {
        gI.innerHTML = ""; ions = []; win = []; crossings = 0;
        occ = Array.from({ length: rows }, () => Array(cols).fill(null));
        const all = []; for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) all.push([r, c]);
        for (let i = all.length - 1; i > 0; i--) { const j = R.int(i + 1); [all[i], all[j]] = [all[j], all[i]]; }
        const n = Math.round(all.length * (1 - vac));
        all.slice(0, n).forEach(([row, col]) => { const c = s("circle", { r: 7.5, fill: RED, stroke: DARK, "stroke-width": 0.8 }); gI.append(c); const o = { c, row, col }; occ[row][col] = o; ions.push(o); pos(o); });
        sVac.set(rows * cols - n + " of " + rows * cols); sEl.set("0"); sRate.set("0.0");
      }
      const stop = loop(() => {
        let net = 0;
        for (let k = 0; k < Math.max(1, ions.length / 3); k++) {
          if (!ions.length) break;
          const o = ions[R.int(ions.length)], u = R();
          let row = o.row, col = o.col, cross = 0;
          if (u < 0.6) col++; else if (u < 0.75) row--; else if (u < 0.9) row++; else col--;
          if (row < 0 || row >= rows) continue;
          if (col >= cols) { col = 0; cross = 1; } else if (col < 0) { col = cols - 1; cross = -1; }
          if (occ[row][col]) continue;
          occ[o.row][o.col] = null; o.row = row; o.col = col; occ[row][col] = o; pos(o); net += cross;
        }
        win.push(net); if (win.length > 50) win.shift();
        sRate.set(fmt.n(Math.max(0, win.reduce((a, b) => a + b, 0)) / (win.length * 0.04), 1));
      }, 40);
      const sl = slider({ name: "empty sites", nameWidth: 96, min: 0, max: 0.6, step: 0.05, value: vac, fmtv: fmt.pct, oninput: (v) => { vac = v; rebuild(); } });
      el.append(widget("Hopping through a crystal (toy model; ions leaving on the right are replaced from the lithium metal on the left)", svg, sl, h("div", { class: "readout" }, sRate, sVac, sEl),
        note("Set the empty sites to 0%: a perfect, full lattice is an insulator. Nothing can move because nothing has anywhere to go.")));
      rebuild();
      // ---- real conductivities
      const cond = [["liquid Li-ion electrolyte", 10, MUTED], [f("Li10GeP2S12") + " (a sulfide)", 12, YEL], [f("Li6PS5Cl") + " (a sulfide)", 3, YEL], [f("Li7La3Zr2O12") + " (an oxide ceramic)", 0.5, GRN]];
      const cb = hbars(cond.map((c) => c[0]), { max: 1, labelWidth: narrow(210, 140), fmtv: (v) => "≈ " + +Math.pow(10, v * 4 - 2).toPrecision(2) + " mS/cm" });
      cb.update(cond.map((c) => (Math.log10(c[1]) + 2) / 4), cond.map((c) => c[2]));
      el.append(widget("How well real materials conduct Li⁺ at room temperature (approximate; logarithmic bars from 0.01 to 100 mS/cm)", cb));
      el.append(
        P("Since 2011 a few sulfide crystals have matched liquid electrolytes for " + f("Li^+") + " conduction. A solid does not burn, cannot dissolve polysulfides, and can be a hard wall in front of lithium metal. Drop graphite for lithium metal and the same cathode gives much more energy per kilogram:")
      );
      // ---- anode swap
      const gA = stat("anode per Ah", "b"), gT = stat("anode + cathode per Ah", "y"), gW = stat("theoretical Wh/kg", "g");
      const an = { C: { g: 1000 / CAP_C6, V: 3.3 }, Li: { g: 1000 / CAP_LI, V: 3.4 } };
      const setA = (k) => { const a = an[k], tot = a.g + 1000 / CAP_LFP; gA.set(fmt.n(a.g, 2) + " g"); gT.set(fmt.n(tot, 2) + " g"); gW.set("≈ " + num((a.V * 1000) / tot)); };
      el.append(widget("Swap the anode (cathode: " + f("LiFePO4") + ", " + fmt.n(1000 / CAP_LFP, 2) + " g per Ah; active materials only)",
        toggle("anode:", [["C", "graphite host " + f("LiC6")], ["Li", "lithium metal"]], "C", setA), h("div", { class: "readout" }, gA, gT, gW)));
      setA("C");
      el.append(
        P("The catches are mechanical. Two solids touch only where they touch, and the lithium anode shrinks and regrows on every cycle, so the contact keeps trying to open up. Ceramics are brittle, and lithium has turned out to creep through cracks and grain boundaries, so dendrites are reduced, not abolished. Sulfide electrolytes react with moist air and give off toxic hydrogen sulfide, " + f("H2S") + ", so factories must be extremely dry."),
        P("<b>State of play, as of 2026:</b> no car with an all-solid-state battery is on sale. Several makers run pilot lines and target 2027–2028. “Semi-solid” cells, which still contain some liquid or gel, are in a few production cars in China."),
        takeaway("A solid electrolyte is a rigid crystal frame with empty sites that one ion can hop through. It conducts ions but not electrons, which could finally make the lithium metal anode safe to use.")
      );
      return stop;
    },
    check: {
      type: "choice",
      q: "A new ceramic conducts Li⁺ very well. It also conducts electrons a little. Is it a good solid electrolyte?",
      options: [
        "No: electrons would leak through it inside the cell, discharging it without using the wire",
        "Yes: more conduction of any kind means less internal resistance",
        "Yes, as long as it is hard enough to block dendrites",
      ],
      answer: 0,
      wrongHints: {
        1: "Think of the galvanic cell: the whole trick is that electrons have no path except the wire. An electrolyte that carries electrons is a short circuit.",
        2: "Hardness helps against dendrites, but an electron path through the electrolyte is a leak regardless. (Electrons inside the ceramic also let lithium metal form there.)",
      },
      why: "Right. Ions through the electrolyte, electrons through the wire: the same rule as in the Daniell cell. The shuttle in step 4 broke this rule too, just with molecules as the carriers.",
      backTo: 3,
    },
  });

  // ================================================================ 6
  steps.push({
    title: "Multivalent ions: two or three electrons per passenger",
    short: "Multivalent ions",
    newConcepts: ["multi"],
    render(el) {
      el.append(
        P("Recall the capacity formula from <em>Charge, energy and capacity</em>: mAh/g = n·F / (3.6·M), with n the electrons each atom gives. Lithium and sodium give one. Their neighbours to the right give more (<em>typical ion charges</em>, from the periodic table): magnesium gives two and becomes " + f("Mg^2+") + ", aluminium gives three and becomes " + f("Al^3+") + ". Ions with more than one charge are called <b>multivalent ions</b>."),
        P("Both metals are light, cheap, and over a thousand times more abundant than lithium. They are also dense, so per <i>litre</i> of metal (volumetric capacity, from <em>Real batteries</em>) they beat lithium easily. On paper, a magnesium or aluminium battery looks excellent."),
        P("The trouble starts when the ion has to move through a solid host. Each hop means squeezing past the host's anions, and a 2+ or 3+ ion is gripped by them far harder than a 1+ ion. Pick a passenger and watch it cross a host channel:")
      );
      const D = [
        { k: "Li", z: 1, rho: 0.534, r: 76, p: 0.08 }, { k: "Na", z: 1, rho: 0.968, r: 102, p: 0.05 },
        { k: "Mg", z: 2, rho: 1.738, r: 72, p: 0.004 }, { k: "Al", z: 3, rho: 2.70, r: 53.5, p: 0.0005 },
      ];
      D.forEach((d) => { d.cap = cap(d.z, M(d.k)); d.vol = d.cap * d.rho; d.ion = f(d.k + "^" + (d.z > 1 ? d.z : "") + "+"); });
      const W = narrow(520, 380), H = 120, sp = 40, wells = Math.floor((W - 40) / sp), xw = (i) => (W - wells * sp) / 2 + sp / 2 + i * sp;
      const svg = mkSvg(W, H), gF = s("g"), gI = s("g"); svg.append(gF, gI);
      for (let i = 0; i <= wells; i++) [34, 86].forEach((y) => gF.append(s("circle", { cx: xw(i) - sp / 2, cy: y, r: 11, fill: BLUE, opacity: 0.55 })));
      T(gF, W / 2, 14, "blue = the host's fixed anions · the ions move left to right", { size: 11, fill: MUTED });
      let cur = D[0], ions = [], delivered = 0, ticks = 0;
      const R = rng(3);
      const sZ = stat("electrons per ion", "y"), sD = stat("electrons delivered", "g"), sSp = stat("hop rate vs Li⁺ (toy)", "r");
      const tb = h("table", { class: "small compact" });
      function build() {
        gI.innerHTML = ""; ions = []; delivered = 0; ticks = 0;
        for (let i = 0; i < wells; i += 3) {
          const g = s("g"), rr = 5 + cur.r / 17;
          g.append(s("circle", { r: rr, fill: RED, stroke: DARK, "stroke-width": 0.8 }));
          const t = s("text", { "text-anchor": "middle", dy: "0.35em", style: `font-size:8px;font-weight:700;fill:${DARK}` }); t.textContent = cur.z > 1 ? cur.z + "+" : "+"; g.append(t);
          gI.append(g); ions.push({ g, w: i, x: xw(i) });
        }
        sZ.set(String(cur.z)); sSp.set("× " + +(cur.p / D[0].p).toPrecision(2)); sD.set("0");
        tb.innerHTML = "";
        tb.append(h("tr", {}, h("th", {}, "ion"), h("th", { class: "num" }, "e⁻ per ion"), h("th", { class: "num" }, "mAh/g"), h("th", { class: "num" }, "mAh/cm³"), h("th", { class: "num" }, "E° (V)"), h("th", { class: "num" }, "radius (pm)"), h("th", { class: "num" }, "crust (ppm)")));
        D.forEach((d) => tb.append(h("tr", { style: d === cur ? "background:#2e2a18" : "" }, h("td", { html: d.ion }), h("td", { class: "num" }, String(d.z)), h("td", { class: "num" }, num(d.cap)), h("td", { class: "num" }, num(d.vol)), h("td", { class: "num" }, sgn(E0[d.k].E)), h("td", { class: "num" }, String(d.r)), h("td", { class: "num" }, num(PPM[d.k])))));
      }
      const stop = loop(() => {
        ticks++;
        const taken = new Set(ions.map((o) => o.w));
        for (const o of ions) {
          const nx = (o.w + 1) % wells;
          if (!taken.has(nx) && R() < cur.p) { taken.delete(o.w); taken.add(nx); if (nx === 0) { delivered += cur.z; o.x = xw(0) - sp; } o.w = nx; }
          o.x += (xw(o.w) - o.x) * 0.25;
          o.g.setAttribute("transform", `translate(${o.x.toFixed(1)} 60)`);
        }
        if (ticks % 10 === 0) sD.set(String(delivered));
      }, 33);
      const tg = toggle("passenger:", D.map((d) => [d.k, d.ion]), "Li", (k) => { cur = D.find((d) => d.k === k); build(); });
      el.append(widget("A channel through a host crystal. Hop rates are illustrative: the real slow-down depends on the host and is typically several powers of ten",
        tg, svg, h("div", { class: "readout" }, sZ, sD, sSp), h("div", { class: "tablewrap", style: "margin-top:12px" }, tb)));
      build();
      el.append(
        P(f("Mg^2+") + " is almost the same size as " + f("Li^+") + " (72 vs 76 pm) but carries twice the charge, so the pull between it and the host is roughly twice as strong, and the energy hill for each hop is far higher. Each ion that arrives delivers two electrons, but so few arrive that the current is tiny. " + f("Al^3+") + ", smaller and triply charged, is worse still."),
        P("There is a second catch at the metal itself. On lithium, the <em>SEI layer</em> (lithium lesson) lets " + f("Li^+") + " through. The surface films that form on magnesium and aluminium let nothing through, so ordinary electrolytes simply block the anode."),
        P("<b>State of play, as of 2026:</b> research. A rechargeable magnesium prototype was shown in 2000 (magnesium metal against a molybdenum sulfide host, about 1.1 V), and no magnesium or aluminium cell has reached the market as a rechargeable battery since. One multivalent ion does work today: " + f("Zn^2+") + " in water, in the zinc cells of <em>Zinc: from Volta's pile to the alkaline cell</em>, where the zinc dissolves and re-forms instead of squeezing through a host."),
        takeaway("Multivalent ions (Mg²⁺, Al³⁺) carry two or three electrons each and come from abundant metals, but their high charge makes them crawl through solids. More electrons per ion is not more current.")
      );
      return stop;
    },
    check: {
      type: "number",
      q: "Calcium is another candidate: it gives 2 electrons (Ca²⁺) and weighs 40.08 g/mol. What is its theoretical capacity in mAh/g? (F = 96,485 C/mol)",
      answer: Math.round(cap(2, M("Ca"))), tolerance: 15,
      hint: "mAh/g = n·F / (3.6·M) with n = 2 and M = 40.08.",
      why: `2 × 96,485 / (3.6 × 40.08) ≈ ${num(cap(2, M("Ca")))} mAh/g: more than sodium's ${num(CAP_NA)}, even though a calcium atom is heavier, because each atom gives two electrons.`,
    },
  });

  // ================================================================ 7
  const VCOL = { 2: "#a678e0", 3: "#4fae6a", 4: "#3f8fe0", 5: "#e8cf4a" };
  const VSP = { 2: "V^2+", 3: "V^3+", 4: "VO^2+", 5: "VO2^+" };
  const VNAME = { 2: "violet", 3: "green", 4: "blue", 5: "yellow" };
  const E_V43 = 0.34; // VO²⁺ + 2H⁺ + e⁻ → V³⁺ + H₂O, CRC Handbook (not in Chem.E0)
  steps.push({
    title: "Vanadium: one element, four oxidation states",
    short: "Vanadium's four states",
    newConcepts: ["vox"],
    render(el) {
      el.append(
        P("The last design in this lesson throws out something more basic than the host: the solid electrode itself. To see how, first meet its element."),
        P("Vanadium is a <em>transition metal</em> (<em>The periodic table</em>) with shells 2, 8, 11, 2. It can give up two, three, four or five of its outer electrons, and all four resulting ions are stable dissolved in acid, each with its own colour. You met an element with two neighbouring states in solution before, " + f("Fe^2+") + " and " + f("Fe^3+") + ". Vanadium has four."),
        P("The two highest states are so strongly charged that they pull an oxygen atom off a water molecule and keep it: " + f("V^4+") + " exists in water as " + f("VO^2+") + ", and " + f("V^5+") + " as " + f("VO2^+") + ". The oxidation number of vanadium (<em>Oxidation and reduction</em>) is still +4 and +5. Take electrons away one at a time:")
      );
      const W = narrow(520, 380), H = 256, axX = narrow(190, 112), vx = narrow(30, 6), vw = narrow(56, 44);
      const svg = mkSvg(W, H), gS = s("g"), gL = s("g"), gM = s("g"); svg.append(gS, gL, gM);
      const Y = (E) => 30 + ((E + 0.5) / 1.9) * 196;
      // vial
      const liq = s("rect", { x: vx, y: 78, width: vw, height: 112, rx: 6 }); gS.append(liq);
      gS.append(s("path", { d: `M${vx - 4} 44 V184 Q${vx - 4} 196 ${vx + 8} 196 H${vx + vw - 8} Q${vx + vw + 4} 196 ${vx + vw + 4} 184 V44`, fill: "none", stroke: "#b9c2d3", "stroke-width": 2.5 }));
      const spTxt = T(gS, vx + vw / 2, 222, "", { size: 16, fill: TEXT, weight: 700 }), colTxt = T(gS, vx + vw / 2, 240, "", { size: 12, fill: MUTED });
      // ladder
      gL.append(s("line", { x1: axX, x2: axX, y1: Y(-0.5), y2: Y(1.4), stroke: LINE, "stroke-width": 1.5 }));
      const rungs = [
        { E: E0["V3/V2"].E, t: f("V^3+ + e- -> V^2+"), lo: 2 },
        { E: E_V43, t: f("VO^2+ + 2H^+ + e- -> V^3+ + H2O"), lo: 3 },
        { E: E0["VO2/VO"].E, t: f("VO2^+ + 2H^+ + e- -> VO^2+ + H2O"), lo: 4 },
      ];
      const small = narrow(11.5, 12);
      rungs.forEach((r) => {
        r.line = s("line", { x1: axX, x2: W - 8, y1: Y(r.E), y2: Y(r.E), stroke: TEXT, "stroke-width": 2 }); gL.append(r.line);
        r.txt = T(gL, axX + 6, Y(r.E) - 5, r.t + "   " + sgn(r.E) + " V", { size: small, anchor: "start" });
      });
      [[0, f("2H^+ + 2e- -> H2") + "   0.00 V"], [E0.O2.E, f("O2 + 4H^+ + 4e- -> 2H2O") + "   +1.23 V"]].forEach(([E, t]) => {
        gL.append(s("line", { x1: axX, x2: W - 8, y1: Y(E), y2: Y(E), stroke: MUTED, "stroke-width": 1, "stroke-dasharray": "4 4" }));
        T(gL, W - 8, Y(E) + 13, t, { size: narrow(10, 11), fill: MUTED, anchor: "end" });
      });
      T(gL, axX, 14, "E° ladder (negative at the top)", { size: 11, fill: MUTED, anchor: "start" });
      const spE = { 2: -0.42, 3: 0.06, 4: 0.67, 5: 1.3 };
      const dots = {};
      [2, 3, 4, 5].forEach((k) => {
        dots[k] = s("circle", { cx: axX - 16, cy: Y(spE[k]), r: 7, fill: VCOL[k], stroke: DARK, "stroke-width": 1 }); gM.append(dots[k]);
        T(gM, axX - 28, Y(spE[k]) + 4, "+" + k, { size: 12, fill: VCOL[k], anchor: "end", weight: 700 });
      });
      let ox = 2;
      const sSp = fstat("species in the vial", "y", 20), sOx = stat("oxidation number of V", "b"), sLeft = stat("outer electrons given up", "g");
      const eq = h("div", { class: "formula", style: "min-height:58px" });
      const bOx = h("button", { class: "primary", onclick: () => move(1) }, "Take one electron away (oxidise)");
      const bRed = h("button", { onclick: () => move(-1) }, "Give one back (reduce)");
      const ups = { 2: "V^2+ -> V^3+ + e-", 3: "V^3+ + H2O -> VO^2+ + 2H^+ + e-", 4: "VO^2+ + H2O -> VO2^+ + 2H^+ + e-" };
      function show(last) {
        liq.setAttribute("fill", VCOL[ox]); liq.setAttribute("opacity", 0.85);
        spTxt.textContent = f(VSP[ox]); colTxt.textContent = VNAME[ox];
        [2, 3, 4, 5].forEach((k) => { dots[k].setAttribute("r", k === ox ? 10 : 6); dots[k].setAttribute("stroke", k === ox ? TEXT : DARK); dots[k].setAttribute("stroke-width", k === ox ? 2.5 : 1); });
        rungs.forEach((r) => { const on = last != null && r.lo === last; r.line.setAttribute("stroke", on ? YEL : TEXT); r.txt.style.fill = on ? YEL : TEXT; });
        sSp.set(f(VSP[ox])); sOx.set("+" + ox); sLeft.set(ox + " of 5");
        bOx.disabled = ox === 5; bRed.disabled = ox === 2;
        if (last == null) eq.innerHTML = `<small>Start: ${f("V^2+")}, violet. Vanadium has given up 2 of its 5 outer electrons.</small>`;
        else {
          const up = last < ox || (last === ox && false);
          const r = rungs.find((q) => q.lo === last);
          eq.innerHTML = `<span class="hl" style="font-family:inherit">${up ? f(ups[last]) : r.t}</span><small>${up ? "oxidation" : "reduction"} across the rung at E° = ${sgn(r.E)} V. Atoms and charge balance on both sides.</small>`;
        }
      }
      function move(d) { const from = ox; ox = Math.max(2, Math.min(5, ox + d)); if (ox !== from) show(Math.min(from, ox)); }
      el.append(widget("A vial of vanadium ions in dilute sulfuric acid", svg, h("div", { class: "btns" }, bOx, bRed), h("div", { class: "readout" }, sSp, sOx, sLeft), eq));
      show(null);
      el.append(
        P("Three rungs on the potential ladder (<em>Electrode potentials</em>), all from one element. Now build a cell from two of them, using E°cell = E°cathode − E°anode:")
      );
      const pairs = [[0, 1], [1, 2], [0, 2]];
      const out = h("div", { class: "formula", style: "min-height:58px" });
      const setPair = (i) => {
        const [a, c] = pairs[i], A = rungs[a], C = rungs[c];
        out.innerHTML = `E°cell = <span class="hl">${sgn(C.E)}</span> − (<span class="bl">${sgn(A.E)}</span>) = <b>${(C.E - A.E).toFixed(2)} V</b><small>anode (upper rung, runs backwards as oxidation): ${f(VSP[A.lo])} → ${f(VSP[A.lo + 1])} · cathode (lower rung): ${f(VSP[C.lo + 1])} → ${f(VSP[C.lo])}</small>`;
      };
      el.append(widget("Pick two rungs", toggle("", [[0, "top + middle"], [1, "middle + bottom"], [2, "top + bottom"]], 2, setPair), out));
      setPair(2);
      el.append(
        P(`The outer pair gives <b>${V_FLOW.toFixed(2)} V</b>, and both rungs sit close to the stretch between the two dashed lines, the <em>water stability window</em> from the lithium lesson. So this cell can run in plain water with sulfuric acid. (The top rung is 0.26 V outside the window, which means a charged cell can slowly make hydrogen gas. On carbon electrodes that reaction is sluggish enough to live with.)`),
        takeaway(`Vanadium is stable in water in four oxidation states: ${f("V^2+")} (+2), ${f("V^3+")} (+3), ${f("VO^2+")} (+4) and ${f("VO2^+")} (+5). The two outer couples are ${V_FLOW.toFixed(2)} V apart: a whole cell from one element.`)
      );
    },
    check: {
      type: "number",
      q: `What is the oxidation number of vanadium in the yellow ion ${f("VO2^+")}?`,
      answer: 5, tolerance: 0, hint: "Each oxygen counts −2, and the numbers must add up to the ion's charge, +1.",
      why: "V + 2 × (−2) = +1, so V = +5: all five outer electrons given up.",
    },
  });

  // ================================================================ 8
  steps.push({
    title: "The redox flow battery: energy in tanks, power in a stack",
    short: "Redox flow battery",
    newConcepts: ["flow"],
    render(el) {
      el.append(
        P("In every battery so far, the charge is stored <i>in the electrodes</i>. Want twice the energy? Build twice the electrodes, with twice the separators, cases and wiring."),
        P("Step 7 offers another way. Both vanadium couples are <b>dissolved ions</b>. Neither half-reaction needs a solid that is consumed or grown. So keep the two solutions in two <b>tanks</b>, and pump them past inert carbon electrodes, which only hand electrons over. The electrodes sit in a <b>stack</b>, with a membrane between the two liquids that lets " + f("H^+") + " through to close the circuit (the job the <em>salt bridge</em> did in the Daniell cell). This is a <b>redox flow battery</b>."),
        formula(`<span class="bl">− tank: ${f("V^2+ -> V^3+ + e-")}</span><br><span class="hl">+ tank: ${f("VO2^+ + 2H^+ + e- -> VO^2+ + H2O")}</span><small>discharge. Charging runs both backwards. E° = ${sgn(E0["VO2/VO"].E)} − (${sgn(E0["V3/V2"].E)}) = ${V_FLOW.toFixed(2)} V</small>`),
        P("Now size the two parts separately:")
      );
      const W = narrow(540, 380), H = 262, tw = narrow(120, 92), cxm = W / 2, base = 248;
      const svg = mkSvg(W, H), gB = s("g"), gP = s("g"), gT = s("g"); svg.append(gB, gP, gT);
      const C = 1.6; // mol/L vanadium, typical
      let vol = 1000, pw = 10, soc = 1, mode = "stop", hours = 0, ph = 0;
      const tankL = s("rect", { x: 10, width: tw, rx: 4, stroke: "#b9c2d3", "stroke-width": 2 }), tankR = s("rect", { x: W - 10 - tw, width: tw, rx: 4, stroke: "#b9c2d3", "stroke-width": 2 });
      const stack = s("rect", { rx: 3, fill: "#2b3140", stroke: "#b9c2d3", "stroke-width": 2 }), memb = s("line", { stroke: TEXT, "stroke-width": 1.5, "stroke-dasharray": "4 3" });
      const halfL = s("rect", { opacity: 0.55 }), halfR = s("rect", { opacity: 0.55 });
      const pipes = s("path", { fill: "none", stroke: "#6b7689", "stroke-width": 3 });
      const wire = s("path", { fill: "none", stroke: "#b9c2d3", "stroke-width": 2.5 });
      gB.append(pipes, tankL, tankR, stack, halfL, halfR, memb, wire);
      gB.append(s("rect", { x: cxm - 34, y: 6, width: 68, height: 24, rx: 5, fill: "#212734", stroke: "#b9c2d3", "stroke-width": 1.5 }));
      const dev = T(gT, cxm, 22, "", { size: 12, fill: MUTED });
      const tL = T(gT, 10 + tw / 2, 0, "", { size: 12, fill: DARK, weight: 700 }), tR = T(gT, W - 10 - tw / 2, 0, "", { size: 12, fill: DARK, weight: 700 });
      T(gT, 10 + tw / 2, base + 12, "− tank", { size: 11, fill: MUTED }); T(gT, W - 10 - tw / 2, base + 12, "+ tank", { size: 11, fill: MUTED });
      const stTxt = T(gT, cxm, base + 12, "stack", { size: 11, fill: MUTED });
      const dotsP = Array.from({ length: 12 }, (_, i) => { const c = s("circle", { r: 3, fill: i < 6 ? "#d9c7ff" : "#fff3b0" }); gP.append(c); return c; });
      const eDots = Array.from({ length: 3 }, () => { const c = s("circle", { r: 3.6, fill: YEL, stroke: DARK, "stroke-width": 0.6 }); gP.append(c); return c; });
      const hDots = Array.from({ length: 3 }, () => { const c = s("circle", { r: 3.2, fill: RED }); gP.append(c); return c; });
      let geo = {};
      function layout() {
        const th = 50 + 130 * (vol / 2000), sh = 40 + 110 * (pw / 50), sw = narrow(84, 64);
        const ty = base - th, sy = base - sh - 20, sx = cxm - sw / 2;
        [tankL, tankR].forEach((t) => { t.setAttribute("y", ty); t.setAttribute("height", th); });
        stack.setAttribute("x", sx); stack.setAttribute("y", sy); stack.setAttribute("width", sw); stack.setAttribute("height", sh);
        halfL.setAttribute("x", sx + 2); halfL.setAttribute("y", sy + 2); halfL.setAttribute("width", sw / 2 - 2); halfL.setAttribute("height", sh - 4);
        halfR.setAttribute("x", cxm); halfR.setAttribute("y", sy + 2); halfR.setAttribute("width", sw / 2 - 2); halfR.setAttribute("height", sh - 4);
        memb.setAttribute("x1", cxm); memb.setAttribute("x2", cxm); memb.setAttribute("y1", sy); memb.setAttribute("y2", sy + sh);
        const lx = 10 + tw, rx = W - 10 - tw, yt = sy + 10, yb = sy + sh - 10;
        geo = { L: [[lx, yt], [sx, yt], [sx, yb], [lx, yb]], Rr: [[rx, yt], [sx + sw, yt], [sx + sw, yb], [rx, yb]], sx, sw, sy, sh,
          wireP: [[sx + sw / 4, sy], [sx + sw / 4, 18], [sx + sw * 0.75, 18], [sx + sw * 0.75, sy]] };
        pipes.setAttribute("d", `M${lx} ${yt} H${sx} M${sx} ${yb} H${lx} M${rx} ${yt} H${sx + sw} M${sx + sw} ${yb} H${rx}`);
        wire.setAttribute("d", `M${geo.wireP[0][0]} ${sy} V18 H${geo.wireP[2][0]} V${sy}`);
        tL.setAttribute("y", ty + th / 2 + 4); tR.setAttribute("y", ty + th / 2 + 4);
        stTxt.setAttribute("y", sy + sh + 14);
      }
      const sE = stat("energy when full", "y"), sP = stat("power", "b"), sT = stat("run time at this power", "g"), sS = stat("state of charge", "p"), sH = stat("simulated time", "");
      const energy = () => (C * vol * F * V_FLOW) / 3.6e6; // kWh
      function paint() {
        tankL.setAttribute("fill", mix(VCOL[3], VCOL[2], soc)); tankR.setAttribute("fill", mix(VCOL[4], VCOL[5], soc));
        halfL.setAttribute("fill", mix(VCOL[3], VCOL[2], soc)); halfR.setAttribute("fill", mix(VCOL[4], VCOL[5], soc));
        tL.textContent = soc > 0.5 ? f("V^2+") : f("V^3+"); tR.textContent = soc > 0.5 ? f("VO2^+") : f("VO^2+");
        dev.textContent = mode === "dis" ? "load" : mode === "chg" ? "charger" : "off"; dev.style.fill = mode === "stop" ? MUTED : YEL;
        sE.set(fmt.n(energy(), 1) + " kWh"); sP.set(pw + " kW"); sT.set(fmt.n(energy() / pw, 1) + " h"); sS.set(Math.round(soc * 100) + "%"); sH.set(fmt.n(hours, 1) + " h");
      }
      const seg = (pts, t) => { const n = pts.length - 1, k = Math.min(n - 1e-6, Math.max(0, t * n)), i = Math.floor(k), u = k - i; return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * u, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * u]; };
      const stop = loop(() => {
        const on = mode !== "stop";
        if (on) {
          ph = (ph + 0.012) % 1;
          const dt = 0.02, d = (pw * dt) / energy();
          if (mode === "dis") { soc -= d; if (soc <= 0) { soc = 0; mode = "stop"; tg.set("stop"); } }
          else { soc += d; if (soc >= 1) { soc = 1; mode = "stop"; tg.set("stop"); } }
          hours += dt; paint();
        }
        dotsP.forEach((c, i) => { const p = seg(i < 6 ? geo.L : geo.Rr, (ph + (i % 6) / 6) % 1); c.setAttribute("cx", p[0]); c.setAttribute("cy", p[1]); c.setAttribute("visibility", on ? "visible" : "hidden"); });
        const dir = mode === "dis" ? 1 : -1;
        eDots.forEach((c, i) => { const t = (ph * 2 + i / 3) % 1, p = seg(geo.wireP, dir > 0 ? t : 1 - t); c.setAttribute("cx", p[0]); c.setAttribute("cy", p[1]); c.setAttribute("visibility", on ? "visible" : "hidden"); });
        hDots.forEach((c, i) => { const t = (ph * 2 + i / 3) % 1, u = dir > 0 ? t : 1 - t; c.setAttribute("cx", geo.sx + geo.sw * (0.3 + 0.4 * u)); c.setAttribute("cy", geo.sy + geo.sh * (0.3 + 0.2 * i)); c.setAttribute("visibility", on ? "visible" : "hidden"); });
      }, 40);
      const tg = toggle("", [["dis", "Discharge"], ["stop", "Stop"], ["chg", "Charge"]], "stop", (v) => { mode = v; if (v === "dis" && soc <= 0) { mode = "stop"; tg.set("stop"); } if (v === "chg" && soc >= 1) { mode = "stop"; tg.set("stop"); } paint(); });
      el.append(widget(`All-vanadium flow battery, ${C} mol/L vanadium in each tank (yellow = electrons, red = H⁺ crossing the membrane; cell voltage held at E° for simplicity)`, svg,
        slider({ name: "each tank", nameWidth: 84, min: 100, max: 2000, step: 100, value: vol, fmtv: (v) => num(v) + " L", oninput: (v) => { vol = v; layout(); paint(); } }),
        slider({ name: "stack", nameWidth: 84, min: 1, max: 50, step: 1, value: pw, fmtv: (v) => v + " kW", oninput: (v) => { pw = v; layout(); paint(); } }),
        tg, h("div", { class: "readout" }, sE, sP, sT, sS, sH)));
      layout(); paint();
      el.append(
        P(`<b>Energy lives in the tanks.</b> Each vanadium ion stores one electron, so a tank holds (mol/L × litres) moles of electrons, and energy = charge × voltage (<em>Charge, energy and capacity</em>). At ${C} mol/L and 1000 L: 1600 mol × 96,485 C/mol × ${V_FLOW.toFixed(2)} V = 195 MJ = <b>${fmt.n((C * 1000 * F * V_FLOW) / 3.6e6, 0)} kWh</b>. <b>Power lives in the stack:</b> more electrode area lets more ions react per second. Need the same power for twice as long? Buy a bigger tank, nothing else.`),
        P("Two more gifts. Nothing solid swells, cracks or grows dendrites, so these batteries last well over 10,000 cycles. And the membrane always leaks a little, but since <b>both tanks hold the same element</b>, a stray ion on the wrong side is not a contaminant. It costs a bit of charge and is put right on the next cycle. That is why four oxidation states in one element are so valuable."),
        P(`The catch: water holds only so much vanadium, so the energy is dilute, about 54 kWh in 2000 litres, roughly ${fmt.n((C * F * V_FLOW) / 3.6e3 / 2, 0)} Wh per litre before pumps and stack are counted. A lithium-ion cell stores ten or more times that. And vanadium (120 ppm) is not cheap. So flow batteries are for things that do not move.`),
        P("<b>State of play, as of 2026:</b> commercial for grid storage. A 100 MW / 400 MWh vanadium system has run in Dalian, China, since 2022, and a 200 MW / 1,000 MWh one in Xinjiang was reported in operation at the end of 2025."),
        scorecard("Vanadium flow", [
          ["cell voltage", "≈ 3.3 V", V_FLOW.toFixed(2) + " V (E°)"],
          ["where the charge sits", "in solid hosts", "in dissolved ions, in tanks"],
          ["energy per litre", "hundreds of Wh/L", "≈ 15–25 Wh/L in practice"],
          ["cycle life", "thousands of cycles", "well over 10,000"],
          ["scarcest element", "Li, 20 ppm", "V, 120 ppm"],
        ]),
        takeaway("A redox flow battery stores charge as dissolved ions in two tanks and converts it in a separate stack. Tank size sets the energy (kWh), stack size sets the power (kW), independently.")
      );
      return stop;
    },
    check: {
      type: "number",
      q: `A flow battery has two tanks of 500 L each, with 1.6 mol/L vanadium, and runs at ${V_FLOW.toFixed(2)} V. How much energy does it store, in kWh? (F = 96,485 C/mol; 1 kWh = 3.6 MJ)`,
      answer: 27, tolerance: 0.6,
      hint: "Moles of electrons = 1.6 mol/L × 500 L (one electron per vanadium ion; the other tank is the other half of the same reaction). Then joules = coulombs × volts.",
      why: "800 mol × 96,485 C/mol = 77.2 MC; × 1.26 V = 97.3 MJ; ÷ 3.6 = 27 kWh. Half the tank of the widget's default, half the energy, whatever the stack.",
    },
  });

  // ================================================================ 9
  steps.push({
    title: "Hot cells: when the electrodes themselves are liquid",
    short: "Molten-electrode cells",
    newConcepts: ["molten"],
    render(el) {
      el.append(
        P("Put three ideas from this lesson together: <b>sodium</b> as the giver (step 2), <b>sulfur</b> as the taker (step 3), and a <b>solid electrolyte</b> between them so no polysulfide can shuttle (steps 4 and 5). That cell exists, and it is older than lithium-ion. It is the <b>sodium–sulfur cell</b>."),
        P("Its solid electrolyte is a ceramic tube of <em>sodium beta-alumina</em>, an aluminium oxide with layers of mobile " + f("Na^+") + ". Sodium is inside the tube, sulfur outside. On discharge, " + f("Na -> Na^+ + e-") + ", the ion hops through the ceramic, and on the far side sulfur takes the electrons: overall " + f("2Na + 4S -> Na2S4") + ", about 2.0 V."),
        P("Step 5's catch was that two solids make poor contact. This design answers it by making both electrodes <b>liquid</b>: a liquid wets the ceramic perfectly and can never crack. The price is heat. Everything, including the sodium polysulfide product, has to stay molten. Find the temperature where each cell comes alive:")
      );
      const CELLS = {
        nas: { name: "sodium–sulfur", V: "≈ 2.0 V", op: 320, horiz: true, ion: "Na⁺",
          layers: [{ n: "sodium (−)", mp: 98, col: "#c9ced8" }, { n: "ceramic", mp: null, col: "#8fa3c4" }, { n: "sulfur (+)", mp: 115, col: "#e8cf4a" }],
          extra: { n: "the product " + f("Na2S4"), mp: 285 } },
        lmb: { name: "liquid metal", V: "≈ 0.4 V", op: 700, horiz: false, ion: "Mg²⁺",
          layers: [{ n: "magnesium (−), floats", mp: 650, col: "#c9ced8" }, { n: "molten salt electrolyte", mp: 400, col: "#8fd3c0" }, { n: "antimony (+), sinks", mp: 631, col: "#9aa0ad" }],
          extra: null },
      };
      const W = narrow(520, 380), H = 190;
      const svg = mkSvg(W, H), gB = s("g"), gI = s("g"); svg.append(gB, gI);
      let key = "nas", Tc = 20, running = false, ph = 0, rects = [];
      const sT = stat("temperature", "y"), sV = stat("cell voltage when running", "b"), sSt = fstat("status", "g", 16);
      const msg = note("", "min-height:44px;margin-top:10px");
      const ionDots = Array.from({ length: 5 }, () => { const c = s("circle", { r: 4.5, fill: RED, stroke: DARK, "stroke-width": 0.6 }); return c; });
      function build() {
        gB.innerHTML = ""; gI.innerHTML = ""; ionDots.forEach((c) => gI.append(c));
        const c = CELLS[key], x0 = 20, y0 = 16, w = W - 40, hh = H - 32;
        const fr = c.horiz ? [0.37, 0.26, 0.37] : [0.34, 0.32, 0.34];
        let a = 0;
        rects = c.layers.map((L, i) => {
          const r = c.horiz ? { x: x0 + a * w, y: y0, w: fr[i] * w, h: hh } : { x: x0, y: y0 + a * hh, w, h: fr[i] * hh };
          a += fr[i];
          r.el = s("rect", { x: r.x, y: r.y, width: r.w, height: r.h, fill: L.col, stroke: DARK, "stroke-width": 1.5 }); gB.append(r.el);
          r.t1 = T(gB, r.x + r.w / 2, r.y + r.h / 2 - 10, L.n, { size: 12, fill: DARK, weight: 700 });
          r.t2 = T(gB, r.x + r.w / 2, r.y + r.h / 2 + 5, "", { size: 11.5, fill: DARK });
          r.t3 = T(gB, r.x + r.w / 2, r.y + r.h / 2 + 19, "", { size: 11, fill: DARK });
          return r;
        });
        sV.set(c.V);
        upd();
      }
      function upd() {
        const c = CELLS[key];
        const frozen = [];
        c.layers.forEach((L, i) => {
          const liquidState = L.mp == null ? null : Tc >= L.mp;
          rects[i].el.setAttribute("opacity", liquidState === false ? 0.38 : 1);
          rects[i].t2.textContent = L.mp == null ? "solid," : liquidState ? "liquid" : "solid";
          rects[i].t3.textContent = L.mp == null ? "by design" : liquidState ? "" : "melts at " + L.mp + " °C";
          if (liquidState === false) frozen.push(L.n.replace(/ \(.*/, ""));
        });
        const exFrozen = c.extra && Tc < c.extra.mp;
        running = !frozen.length && !exFrozen;
        sT.set(Tc + " °C"); sSt.set(running ? "running" : "no current"); sSt.querySelector(".v").style.color = running ? GRN : RED;
        msg.innerHTML = running
          ? `<b style="color:${GRN}">Everything that must flow is liquid.</b> ${c.ion} ions cross the middle layer and electrons take the wire. ${key === "nas" ? "Real cells are held at 300–350 °C by their own insulation and waste heat." : "The three liquids stay stacked by density alone, like oil on water: no separator, nothing solid to wear out."}`
          : frozen.length ? `<b style="color:${RED}">Frozen:</b> ${frozen.join(", ")}. A solid electrode touches the electrolyte only at a few points, and its ions and atoms cannot be stirred to the surface. The push (voltage) is still there. The flow (current) is not.`
          : `<b style="color:${RED}">Almost:</b> sodium and sulfur are liquid, but ${c.extra.n} freezes below about ${c.extra.mp} °C. The first bit of discharge coats the ceramic with a solid crust and the cell chokes.`;
        ionDots.forEach((d) => d.setAttribute("visibility", running ? "visible" : "hidden"));
      }
      const stop = loop(() => {
        if (!running) return;
        ph = (ph + 0.02) % 1;
        const m = rects[1], c = CELLS[key];
        ionDots.forEach((d, i) => {
          const t = (ph + i / 5) % 1;
          if (c.horiz) { d.setAttribute("cx", m.x - 12 + (m.w + 24) * t); d.setAttribute("cy", m.y + m.h * (0.15 + 0.175 * i)); }
          else { d.setAttribute("cx", m.x + m.w * (0.12 + 0.19 * i)); d.setAttribute("cy", m.y - 8 + (m.h + 16) * t); }
        });
      }, 40);
      const sl = slider({ name: "temperature", nameWidth: 96, min: 20, max: 750, step: 5, value: Tc, fmtv: (v) => v + " °C", oninput: (v) => { Tc = v; upd(); } });
      const setT = (v) => { Tc = v; sl.set(v); upd(); };
      const tg = toggle("cell:", [["nas", "sodium–sulfur"], ["lmb", "liquid metal (Mg | salt | Sb)"]], "nas", (k) => { key = k; build(); });
      el.append(widget("Heat the cell until it works (melting points are real; dots are ions crossing the electrolyte)", tg, svg, sl,
        h("div", { class: "btns" }, h("button", { onclick: () => setT(20) }, "Room temperature"), h("button", { class: "primary", onclick: () => setT(CELLS[key].op) }, "Operating temperature")),
        h("div", { class: "readout" }, sT, sV, sSt), msg,
        note("In the sodium–sulfur cell the middle layer is the beta-alumina ceramic: a solid that conducts " + f("Na^+") + ".")));
      build();
      el.append(
        P("The second cell in the widget drops the solid electrolyte too. In a <b>liquid-metal battery</b> a light liquid metal floats on a molten salt, which floats on a dense liquid metal. The 2012 laboratory version shown here used magnesium, a molten chloride salt and antimony at 700 °C: magnesium gives two electrons at the top, " + f("Mg^2+") + " crosses the salt (a multivalent ion moves easily in a liquid, unlike in step 6's solids), and it dissolves into the antimony at the bottom. The voltage is low, about 0.4 V, because both electrodes are metals and antimony is only a mild taker."),
        P("<b>State of play, as of 2026:</b> sodium–sulfur batteries have been sold for grid storage since the early 2000s, mainly from Japan. Liquid-metal batteries (later versions use a calcium alloy and antimony near 500 °C) have reached demonstration projects but not volume production. Neither will ever sit in a phone: a battery that must stay at 300 °C makes sense only when it is large, well insulated and used every day."),
        takeaway("High-temperature cells keep their electrodes molten: perfect contact, nothing to crack, abundant elements (Na, S). The sodium–sulfur cell combines a sodium anode, a sulfur cathode and a solid Na⁺ conductor at about 300 °C.")
      );
      return stop;
    },
    check: {
      type: "choice",
      q: "A sodium–sulfur battery is switched off and cools to 20 °C. Why can it no longer deliver current?",
      options: [
        "Sodium, sulfur and the product are frozen solid: ions and atoms can no longer get to and across the ceramic",
        "Cold sodium no longer wants to give up its electron, so the voltage falls to zero",
        "The reaction 2Na + 4S → Na₂S₄ becomes non-spontaneous at room temperature",
      ],
      answer: 0,
      wrongHints: {
        1: "Sodium is a strong giver at any temperature (E° = −2.71 V is quoted at 25 °C). The push is still there.",
        2: "Sodium and sulfur react eagerly even when cold. The direction is fine; it is the transport that stops.",
      },
      why: "Right. Voltage is push, current is flow (The galvanic cell). Freezing leaves the push and removes the flow.",
      backTo: 4,
    },
  });

  // ================================================================ 10 (capstone)
  steps.push({
    title: "Capstone: the element chooser",
    short: "Capstone: element chooser",
    newConcepts: [],
    render(el) {
      el.append(
        P("Time to do what battery chemists do on the back of an envelope. Pick an element that gives electrons and one that takes them, let them combine into their simplest compound, and score the pair with everything you have earned: voltage, mAh/g, Wh/kg, ppm, and the catch."),
        P("The voltage here comes from <em>ΔG = −nFE</em> (<em>Charge, energy and capacity</em>) turned around: E = −ΔG / (n·F), where ΔG is the tabulated energy released when the two elements combine into the solid product. That is the right number for a cell with no water in it. Masses count the whole discharged product, so the taker's weight is included.")
      );
      // anodes: charge z; cathodes: charge q, formula symbol
      const AN = [
        { k: "Li", z: 1, catch: "Scarce (20 ppm). Regrows as dendrites; reacts with water and air; needs a non-aqueous or solid electrolyte." },
        { k: "Na", z: 1, catch: "Soft metal that melts at 98 °C and reacts violently with water. Dendrites, like lithium." },
        { k: "K", z: 1, catch: "Even more reactive than sodium, and heavy for one electron (39 g/mol)." },
        { k: "Mg", z: 2, catch: "Mg²⁺ crawls through solids, and the film on the metal blocks it (step 6)." },
        { k: "Ca", z: 2, catch: "Ca²⁺ is doubly charged and large; no good electrolyte lets it plate and strip yet." },
        { k: "Al", z: 3, catch: "Al³⁺ is nearly immobile in solids, and the metal hides under an oxide skin (step 6)." },
        { k: "Zn", z: 2, catch: "Heavy, and a weak giver (E° = −0.76 V): low voltage. But it works in water, as in the zinc lesson." },
      ];
      const CA = [
        { k: "S", q: 2, name: "sulfur", half: "S + 2e- -> S^2-", catch: "Insulating solid; intermediate polysulfides dissolve and shuttle (step 4)." },
        { k: "O", q: 2, name: "oxygen (from air)", half: "O2 + 4e- -> 2O^2-", catch: "The cell must breathe: the solid product clogs the air electrode, the reaction is sluggish, and moisture and CO₂ from the air get in. Oxygen itself is free and not carried, but the product stays in the cell." },
        { k: "Cl", q: 1, name: "chlorine", half: "Cl2 + 2e- -> 2Cl^-", catch: "A toxic, corrosive gas that has to be stored somehow. Crust figure is low (145 ppm), but the sea is full of chloride." },
      ];
      // ΔG°f of the solid product, kJ/mol (CRC Handbook / LibreTexts table). Four sulfides: literature cell voltages (approximate).
      const DG = { Li2O: -561.2, Na2O: -375.5, K2O: -322.1, MgO: -569.3, CaO: -603.3, Al2O3: -1582.3, ZnO: -320.5,
        LiCl: -384.4, NaCl: -384.1, KCl: -408.5, MgCl2: -591.8, CaCl2: -748.8, AlCl3: -628.8, ZnCl2: -369.4, MgS: -341.8, CaS: -477.4, ZnS: -201.3 };
      const VAPPROX = { Li2S: 2.2, Na2S: 1.85, K2S: 1.88, Al2S3: 1.25 };
      const STATUS = {
        "Li-S": "Lithium–sulfur: pilot production and niche products, no mass production (2026).",
        "Na-S": "Sold for grid storage since the early 2000s as a 300 °C cell. That cell stops at Na₂S₄ (about 2.0 V) instead of going all the way to Na₂S.",
        "Zn-O": "The zinc–air cell from the zinc lesson: on sale for decades in hearing aids, as a primary cell in a water-based electrolyte (1.66 V on the ladder, about 1.4 V in use).",
        "Li-O": "Lithium–air: laboratory cells only. The highest number on the chart, and the hardest cell to make breathe.",
        "Al-O": "Aluminium–air: primary cells exist for niche uses. Recharging means making aluminium metal again, which cannot be done in water.",
        "Mg-S": "Research cells only.", "Ca-S": "Research cells only.", "K-S": "Research cells only.", "Al-S": "Research cells only.",
        "Na-Cl": "Sodium and chlorine: the grain of table salt from the very first lesson, as a 3.98 V cell. A relative with a nickel chloride cathode instead of chlorine gas runs at about 300 °C, in small numbers.",
        "Zn-Cl": "Zinc–chlorine batteries were built for grid trials in the 1970s and 80s, then abandoned: storing the chlorine was the problem.",
      };
      const gcd = (a, b) => (b ? gcd(b, a % b) : a);
      function pair(A, C) {
        const g = gcd(A.z, C.q), a = C.q / g, b = A.z / g, n = a * A.z;
        const key = A.k + (a > 1 ? a : "") + C.k + (b > 1 ? b : "");
        const mass = a * M(A.k) + b * M(C.k);
        const approx = !(key in DG);
        const V = approx ? VAPPROX[key] : -DG[key] * 1000 / (n * F);
        const capP = cap(n, mass);
        const scarce = C.k === "O" ? A.k : PPM[A.k] < PPM[C.k] ? A.k : C.k;
        // overall equation with integer coefficients: elements S (atoms), O2 and Cl2 (molecules)
        let eqn;
        if (C.k === "S") eqn = `${a > 1 ? a : ""}${A.k} + ${b > 1 ? b : ""}S -> ${key}`;
        else { const odd = b % 2 === 1, m = odd ? 2 : 1, co = (x) => (x > 1 ? x : ""); eqn = `${co(a * m)}${A.k} + ${co((b * m) / 2)}${C.k}2 -> ${co(m)}${key}`; }
        return { A, C, key, n, mass, V, approx, capP, wh: capP * V, scarce, ppm: PPM[scarce], eqn };
      }
      const ALL = []; AN.forEach((A) => CA.forEach((C) => ALL.push(pair(A, C))));
      let ai = 0, ci = 0;
      const sV = stat("theoretical voltage", "y"), sC = stat("mAh per g of product", "b"), sW = stat("theoretical Wh/kg", "g"), sA = stat("scarcest element", "p"), sN = stat("electrons per formula unit", "");
      const eq = h("div", { class: "formula" });
      const catchBox = h("div", { style: "margin-top:12px;line-height:1.5" });
      const pl = plot({ xmin: 10, xmax: 300000, ymin: 0, ymax: 5600, xlog: true, height: 280, narrow: true, minFont: 10, xticks: [10, 100, 1000, 10000, 100000], yticks: [0, 1000, 2000, 3000, 4000, 5000],
        xfmt: (v) => num(v), xlabel: "scarcest element in the cell (ppm of the crust)", ylabel: "theoretical Wh/kg", margins: { left: 56 } });
      const lab = (x, y, str, fill, dy, anchor) => { const t = s("text", { x: pl.X(x) + (anchor === "end" ? -9 : 9), y: pl.Y(y) + (dy || 4), "text-anchor": anchor || "start", style: `font-size:12px;fill:${fill};font-weight:700` }); t.textContent = str; pl.layer.append(t); };
      function draw() {
        const p = ALL.find((q) => q.A === AN[ai] && q.C === CA[ci]);
        sV.set((p.approx ? "≈ " : "") + p.V.toFixed(2) + " V"); sC.set(num(p.capP)); sW.set((p.approx ? "≈ " : "") + num(p.wh)); sA.set(p.scarce + ", " + num(p.ppm) + " ppm"); sN.set(String(p.n));
        const anHalf = `${p.A.k} -> ${p.A.k}^${p.A.z > 1 ? p.A.z : ""}+ + ${p.A.z > 1 ? p.A.z : ""}e-`;
        eq.innerHTML = `<span style="font-family:inherit">${f(p.eqn)}</span><small><span class="bl" style="font-family:inherit">anode: ${f(anHalf)}</span> &nbsp;·&nbsp; <span class="hl" style="font-family:inherit">cathode: ${f(p.C.half)}</span><br>`
          + (p.approx ? `voltage: approximate literature value for this cell` : `E = ${num(-DG[p.key] * 1000)} J / (${p.n} × 96,485 C) = ${p.V.toFixed(2)} V`)
          + ` · ${p.n} × 96,485 / (3.6 × ${p.mass.toFixed(2)}) = ${num(p.capP)} mAh/g</small>`;
        const st = STATUS[p.A.k + "-" + p.C.k] || "No practical cell as of 2026.";
        catchBox.innerHTML = `<div><b style="color:${GRN}">${EL[p.A.k].name}:</b> ${p.A.catch}</div><div style="margin-top:6px"><b style="color:${BLUE}">${p.C.name}:</b> ${p.C.catch}</div><div style="margin-top:6px"><b style="color:${YEL}">This pair:</b> ${st}</div>`;
        pl.clear();
        pl.hline(BENCH_WHKG, PUR, "Li-ion benchmark, same counting: " + num(BENCH_WHKG), { pos: "right" });
        const colC = { S: YEL, O: RED, Cl: GRN };
        ALL.forEach((q) => { if (q !== p) pl.dot(q.ppm, q.wh, colC[q.C.k], 4); });
        pl.dot(PPM.Li, BENCH_WHKG, PUR, 5);
        pl.dot(p.ppm, p.wh, TEXT, 8); pl.dot(p.ppm, p.wh, colC[p.C.k], 5.5);
        lab(p.ppm, p.wh, f(p.key), TEXT, p.wh > 5000 ? 18 : -8, p.ppm > 20000 ? "end" : "start");
      }
      const tA = toggle("gives electrons:", AN.map((a, i) => [i, a.k]), 0, (i) => { ai = i; draw(); });
      const tC = toggle("takes electrons:", CA.map((c, i) => [i, c.k === "S" ? "S" : f(c.k + "2") + (c.k === "O" ? " (air)" : "")]), 0, (i) => { ci = i; draw(); });
      el.append(widget("Pick a giver and a taker", tA, tC, eq, h("div", { class: "readout" }, sV, sN, sC, sW, sA), catchBox));
      el.append(widget("All 21 pairs: energy against abundance (up and to the right is the dream)", pl,
        note(`<span style="color:${YEL}">●</span> with sulfur · <span style="color:${RED}">●</span> with oxygen · <span style="color:${GRN}">●</span> with chlorine · <span style="color:${PUR}">●</span> today's Li-ion (graphite | ${f("LiFePO4")})`)));
      draw();
      el.append(
        P("Things to try, each from an earlier step:"),
        h("ul", {},
          h("li", { html: "<b>Li + S</b> is step 3: about 2,600 Wh/kg on paper, seven times the benchmark. Its catch is step 4." }),
          h("li", { html: "Swap Li for <b>Na</b> with sulfur. Voltage and capacity both fall, but the scarcest element is now sulfur at 350 ppm. That is the trade steps 1 and 2 were about, and step 9's hot cell is its commercial form." }),
          h("li", { html: "Find the top right corner: <b>Al, Mg and Ca with oxygen</b>. Abundant, light, several electrons per atom, thousands of Wh/kg. Then read the catches: these are exactly the multivalent ions of step 6. The chart tells you how much energy is there. It says nothing about how fast, or how many times, you can get it out." }),
          h("li", { html: "<b>Zn + O₂</b> is real and has been for decades, at only 1.66 V. Zinc is the one giver on the list that tolerates water, which is why the course's first batteries were all zinc." }),
          h("li", { html: "<b>Na + Cl₂</b>: the sodium and chlorine atoms from the first lesson, 3.98 V apart." })),
        P("These are ceilings for the bare reaction. A real cell also carries electrolyte, carbon, foils and a case, and (from <em>Real batteries</em>) typically delivers a quarter to a half of the theoretical figure. That is how the " + num(BENCH_WHKG) + " Wh/kg benchmark becomes the 160–200 Wh/kg of a real lithium iron phosphate cell."),
        takeaway("Every battery is a giver, a taker and a way to keep ions and electrons on separate paths. Volts, mAh/g and ppm tell you what a pair of elements could do. The catch, almost always a matter of moving ions through or past a solid, decides whether it does.")
      );
    },
  });

  Course.run({
    id: "beyond-lithium",
    section: "3. Batteries, element by element",
    title: "Beyond lithium-ion: sodium, sulfur, solid state and flow",
    concepts: {
      abundance: "crustal abundance (ppm)", naion: "sodium-ion cell", lis: "lithium–sulfur cell", shuttle: "polysulfide shuttle",
      solid: "solid electrolyte", multi: "multivalent ion", vox: "vanadium oxidation states", flow: "redox flow battery", molten: "molten-electrode (high-temperature) cell",
    },
    sources: [
      { title: "OpenStax Chemistry 2e, 17.5 Batteries and Fuel Cells", url: "https://openstax.org/books/chemistry-2e/pages/17-5-batteries-and-fuel-cells", note: "background on battery types and cell reactions" },
      { title: "Wikipedia: Abundance of elements in Earth's crust", url: "https://en.wikipedia.org/wiki/Abundance_of_elements_in_Earth%27s_crust", note: "CRC Handbook column: ppm by mass used in steps 1 and 10" },
      { title: "LibreTexts: T1 Standard Thermodynamic Quantities", url: "https://chem.libretexts.org/Ancillary_Materials/Reference/Reference_Tables/Thermodynamics_Tables/T1%3A_Standard_Thermodynamic_Quantities", note: "ΔG°f of the oxides, chlorides and sulfides behind the capstone voltages (E = −ΔG/nF)" },
      { title: "Wikipedia: Sodium-ion battery", url: "https://en.wikipedia.org/wiki/Sodium-ion_battery", note: "hard carbon anodes, cathode families, commercial status" },
      { title: "Wikipedia: Lithium–sulfur battery", url: "https://en.wikipedia.org/wiki/Lithium%E2%80%93sulfur_battery", note: "S₈ + 16Li → 8Li₂S, 1672 mAh/g, polysulfide shuttle, about 2.2 V and 2,600 Wh/kg theoretical" },
      { title: "Kamaya et al. (2011), A lithium superionic conductor, Nature Materials 10, 682", url: "https://doi.org/10.1038/nmat3066", note: "Li₁₀GeP₂S₁₂, 12 mS/cm at room temperature" },
      { title: "Aurbach et al. (2000), Prototype systems for rechargeable magnesium batteries, Nature 407, 724", url: "https://doi.org/10.1038/35037553", note: "Mg metal against a Mo₆S₈ host, about 1.1 V" },
      { title: "Wikipedia: Vanadium redox battery", url: "https://en.wikipedia.org/wiki/Vanadium_redox_battery", note: "half-reactions, colours, 1.26 V, 15–25 Wh/L, cycle life" },
      { title: "Wikipedia: Sodium–sulfur battery", url: "https://en.wikipedia.org/wiki/Sodium%E2%80%93sulfur_battery", note: "beta-alumina electrolyte, 300–350 °C, about 2 V" },
      { title: "Bradwell et al. (2012), Magnesium–antimony liquid metal battery, J. Am. Chem. Soc. 134, 1895", url: "https://doi.org/10.1021/ja209759s", note: "Mg | molten chloride salt | Sb at 700 °C" },
      { title: "Energy-Storage.news: Rongke Power vanadium flow battery projects", url: "https://www.energy-storage.news/rongke-power-completes-grid-forming-175mw-700mwh-vanadium-flow-battery-in-china-worlds-largest", note: "scale of grid flow batteries, 2022–2025" },
      { title: "CarNewsChina (2025): CATL sodium-ion battery readies for mass production", url: "https://carnewschina.com/2025/09/18/catl-says-next-gen-sodium-ion-battery-supports-500-km-range-readies-for-2026-mass-production", note: "maker's figure of up to 175 Wh/kg for sodium-ion cells" },
    ],
    steps,
  });
})();
