// Lesson 2.2: Electrode potentials: predicting the voltage
(function () {
  const { h, s, widget, stat, slider, toggle, hbars, narrow } = Course;
  const f = Chem.f, E0 = Chem.E0by;
  const YEL = "#ffd166", BLUE = "#6cb4ff", GRN = "#5fd38d", RED = "#ff6b6b", MUTED = "#9aa3b5", LINE = "#2e3646", TEXT = "#e6e9ef";
  const P = (html) => h("p", { html });
  const takeaway = (html) => h("div", { class: "takeaway", html });
  const formula = (html) => h("div", { class: "formula", html });
  const out = () => h("div", { class: "ep-out" });

  document.head.append(h("style", { html: `
    .ep-out { font-family: -apple-system, "Segoe UI", sans-serif; font-variant-numeric: tabular-nums; font-size: 15.5px; background: var(--panel2); border-radius: 8px; padding: 10px 12px; margin-top: 10px; line-height: 1.7; overflow-wrap: anywhere; }
    .ep-out .k { color: var(--muted); font-size: 13.5px; }
    .ep-out .y { color: var(--yellow); } .ep-out .g { color: var(--green); } .ep-out .r { color: var(--red); } .ep-out .b { color: var(--blue); }
    .ep-sel { font: inherit; font-size: 14px; background: var(--panel2); color: var(--text); border: 1px solid var(--line); border-radius: 8px; padding: 6px 8px; max-width: 100%; }
    .ep-pick { display: flex; gap: 8px 14px; flex-wrap: wrap; align-items: center; margin: 6px 0; font-size: 14px; color: var(--muted); }
    .ep-strike { text-decoration: line-through; }
  ` }));

  // ---------- numbers ----------
  const V2 = (x) => (x < -0.004 ? "−" : "") + Math.abs(x).toFixed(2);                                  // −0.76
  const SV = (x) => (Math.abs(x) < 0.005 ? "0.00" : (x > 0 ? "+" : "−") + Math.abs(x).toFixed(2));     // +0.34
  const PAR = (x) => (x < -0.004 ? "(" + V2(x) + ")" : V2(x));                                          // (−0.76)
  const gcd = (a, b) => (b ? gcd(b, a % b) : a);
  const first = (side) => side.split(" + ")[0].replace(/^\d+/, "");      // "2H^+" → "H^+"
  const couple = (c) => f(first(c.ox)) + " / " + f(first(c.red));        // "Zn²⁺ / Zn"

  // ---------- reaction arithmetic ----------
  function terms(side) {
    const m = new Map();
    side.split(" + ").forEach((t) => { const r = /^(\d+)?(.+)$/.exec(t.trim()); m.set(r[2], (m.get(r[2]) || 0) + (r[1] ? +r[1] : 1)); });
    return m;
  }
  // anode entry runs backwards (red → ox), cathode entry forwards (ox → red); electrons cancel.
  function overall(an, ca) {
    const L = (an.n * ca.n) / gcd(an.n, ca.n);
    const left = new Map(), right = new Map();
    const add = (M, side, k) => terms(side).forEach((v, sp) => M.set(sp, (M.get(sp) || 0) + v * k));
    add(left, an.red, L / an.n); add(left, ca.ox, L / ca.n); add(right, an.ox, L / an.n); add(right, ca.red, L / ca.n);
    for (const [sp, v] of [...left]) {
      if (!right.has(sp)) continue;
      const d = Math.min(v, right.get(sp));
      if (v - d) left.set(sp, v - d); else left.delete(sp);
      if (right.get(sp) - d) right.set(sp, right.get(sp) - d); else right.delete(sp);
    }
    let g = 0; [...left.values(), ...right.values()].forEach((v) => (g = gcd(g, v)));
    g = gcd(g, L) || 1;
    const side = (M) => [...M].map(([sp, v]) => (v / g > 1 ? v / g : "") + f(sp)).join(" + ");
    return { text: side(left) + " → " + side(right), n: L / g, ma: L / an.n / g, mc: L / ca.n / g };
  }

  // ---------- drawing helpers ----------
  function txt(x, y, str, o = {}) {
    const t = s("text", { x, y, "text-anchor": o.anchor || "start" });
    t.setAttribute("style", `font-size:${o.size || 12}px;fill:${o.fill || MUTED};${o.mono ? "font-family:ui-monospace,Menlo,monospace;" : ""}${o.bold ? "font-weight:600;" : ""}`);
    t.textContent = str;
    return t;
  }
  function loop(fn, ms = 30) {
    let t = null, alive = true;
    const tick = () => { if (!alive) return; fn(); t = setTimeout(tick, ms); };
    t = setTimeout(tick, ms);
    return () => { alive = false; clearTimeout(t); };
  }
  function arrow(layer, x1, y1, x2, y2, color, width = 2.5) {
    const a = Math.atan2(y2 - y1, x2 - x1), L = 9;
    layer.append(s("line", { x1, y1, x2: x2 - Math.cos(a) * 5, y2: y2 - Math.sin(a) * 5, stroke: color, "stroke-width": width, "stroke-linecap": "round" }));
    const pt = (d, off) => `${x2 - Math.cos(a) * d + Math.sin(a) * off},${y2 - Math.sin(a) * d - Math.cos(a) * off}`;
    layer.append(s("polygon", { points: `${x2},${y2} ${pt(L, 5)} ${pt(L, -5)}`, fill: color }));
  }

  const METAL_COL = { Zn: "#9fb3c8", Fe: "#7d8896", Cu: "#d98e5f", Ag: "#e3e8ee", Pt: "#b9c2cf", Au: "#e6c35c", Mg: "#c9d1da", Al: "#cfd6de", Pb: "#6f7785", Ni: "#aab49f", Li: "#d8dde4", PbO2: "#5b4636", MnO2: "#3c3c44", "NiO(OH)": "#31363d" };
  const SOL_COL = { Cu: "#3d8bff", Fe: "#7fbf8f", Ni: "#58c08a", Zn: "#7d93b5", Ag: "#8a9bb8", H: "#8f99ad" };

  // Two beakers, two electrodes, a wire with a voltmeter, a salt bridge. Electrons (yellow) run along the wire.
  function cellPic() {
    const W = narrow(560, 380), H = 272;
    const svg = s("svg", { viewBox: `0 0 ${W} ${H}`, width: "100%", style: "max-width:620px;display:block;margin:0 auto" });
    const bw = W * 0.34, top = 118, bot = 226, wy = 34, ey = 88;
    const X = { L: W * 0.24, R: W * 0.76 };
    const part = {};
    svg.append(s("path", { d: `M${X.L + bw / 2 - 18},152 V102 H${X.R - bw / 2 + 18} V152`, stroke: "#56617b", "stroke-width": 10, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" }));
    svg.append(txt(W / 2, 93, "salt bridge", { anchor: "middle", size: 10.5 }));
    for (const k of ["L", "R"]) {
      const x = X[k], p = (part[k] = {});
      p.sol = s("rect", { x: x - bw / 2 + 2, y: top + 14, width: bw - 4, height: bot - top - 15, fill: "#5a6f8f", opacity: 0.3 });
      p.el = s("rect", { x: x - 8, y: ey, width: 16, height: 114, rx: 2, fill: "#aaa", stroke: "#0006" });
      p.bub = [0, 1, 2, 3].map((i) => s("circle", { cx: x + 14 + (i % 2) * 7, cy: 180, r: 2.6, fill: "none", stroke: "#cfd8e6", "stroke-width": 1.2 }));
      p.tag = txt(k === "L" ? x - 12 : x + 12, 72, "", { anchor: k === "L" ? "end" : "start", size: 12, fill: TEXT });
      p.cap1 = txt(x, bot + 17, "", { anchor: "middle", size: 12, fill: TEXT });
      p.cap2 = txt(x, bot + 33, "", { anchor: "middle", size: 12 });
      svg.append(p.sol, p.el, ...p.bub, s("path", { d: `M${x - bw / 2},${top} V${bot} H${x + bw / 2} V${top}`, stroke: MUTED, "stroke-width": 2, fill: "none" }), p.tag, p.cap1, p.cap2);
    }
    svg.append(s("path", { d: `M${X.L},${ey} V${wy} H${X.R} V${ey}`, stroke: "#c9a24a", "stroke-width": 2, fill: "none" }));
    const flowTxt = txt((X.L + W / 2 - 48) / 2, wy - 9, "", { anchor: "middle", size: 12, fill: YEL });
    svg.append(flowTxt);
    const dots = Array.from({ length: 6 }, () => s("circle", { r: 3.4, fill: YEL }));
    dots.forEach((d) => svg.append(d));
    svg.append(s("rect", { x: W / 2 - 48, y: wy - 16, width: 96, height: 32, rx: 7, fill: "#212734", stroke: "#c9a24a", "stroke-width": 1.5 }));
    const meter = txt(W / 2, wy + 5.5, "", { anchor: "middle", size: 15, fill: YEL, mono: true, bold: true });
    svg.append(meter);
    const seg = [ey - wy, X.R - X.L, ey - wy], total = seg[0] + seg[1] + seg[2];
    const at = (u) => { let d = u * total; if (d < seg[0]) return [X.L, ey - d]; d -= seg[0]; if (d < seg[1]) return [X.L + d, wy]; d -= seg[1]; return [X.R, wy + d]; };
    let dir = 0, phase = 0, gas = { L: false, R: false }, bphase = 0;
    function place() {
      dots.forEach((d, i) => { const [x, y] = at((((phase + i / dots.length) % 1) + 1) % 1); d.setAttribute("cx", x); d.setAttribute("cy", y); d.setAttribute("display", dir ? "" : "none"); });
      for (const k of ["L", "R"]) part[k].bub.forEach((b, i) => { b.setAttribute("display", gas[k] ? "" : "none"); b.setAttribute("cy", bot - 8 - (((bphase + i * 0.27) % 1) * (bot - top - 28))); });
    }
    return {
      el: svg,
      // side: { col, sol, solOp, gas, cap1, cap2, tag }; dir: +1 = electrons go left → right, −1 = right → left, 0 = none
      set({ L, R, meter: m, dir: d }) {
        for (const [k, o] of [["L", L], ["R", R]]) {
          const p = part[k];
          p.el.setAttribute("fill", o.col || "#a8b3c2"); p.sol.setAttribute("fill", o.sol || "#5a6f8f"); p.sol.setAttribute("opacity", o.solOp == null ? 0.3 : o.solOp);
          p.tag.textContent = o.tag || ""; p.cap1.textContent = o.cap1 || ""; p.cap2.textContent = o.cap2 || ""; gas[k] = !!o.gas;
        }
        meter.textContent = m; dir = d;
        flowTxt.textContent = d > 0 ? "e⁻ →" : d < 0 ? "← e⁻" : "";
        place();
      },
      tick() { phase += dir * 0.006; bphase += 0.012; place(); },
    };
  }
  const metalHalf = (id) => ({ col: METAL_COL[id], sol: SOL_COL[id], solOp: 0.32, cap1: id + " strip", cap2: "in 1 M " + f(E0[id].ox) });
  const SHE = { col: METAL_COL.Pt, sol: SOL_COL.H, solOp: 0.22, gas: true, cap1: "Pt + H₂ gas (1 bar)", cap2: "in 1 M H⁺" };

  // A vertical potential ladder drawn to scale: most negative E° at the top, so electrons fall downwards.
  function ladder({ ids, emin, emax, height, heads = ["takes e⁻", "gives e⁻"] }) {
    const W = narrow(520, 370), H = height, padT = 40, padB = 18;
    const cx = W / 2 + narrow(10, 20), half = narrow(70, 46);
    const svg = s("svg", { viewBox: `0 0 ${W} ${H}`, width: "100%", style: `max-width:${narrow(560, 430)}px;display:block;margin:0 auto` });
    const y = (E) => padT + ((E - emin) / (emax - emin)) * (H - padT - padB);
    for (const x of [cx - half, cx + half]) svg.append(s("line", { x1: x, x2: x, y1: padT - 12, y2: H - padB + 10, stroke: "#46506a", "stroke-width": 3, "stroke-linecap": "round" }));
    heads.forEach((hd, k) => String(hd).split("\n").forEach((ln, j, all) => svg.append(txt(k ? cx + half + 6 : cx - half - 6, (all.length > 1 ? 11 : 18) + j * 13, ln, { anchor: k ? "start" : "end", size: 11.5 }))));
    const rows = {};
    ids.forEach((id) => {
      const c = E0[id], yy = y(c.E);
      const line = s("line", { x1: cx - half, x2: cx + half, y1: yy, y2: yy, stroke: "#6b7896", "stroke-width": 2 });
      const lv = txt(4, yy + 4, "", { size: 11.5, mono: true });
      const lo = txt(cx - half - 6, yy + 4.5, f(first(c.ox)), { anchor: "end", size: 13.5, fill: TEXT });
      const lr = txt(cx + half + 6, yy + 4.5, f(first(c.red)), { size: 13.5, fill: TEXT });
      svg.append(line, lv, lo, lr);
      rows[id] = { line, lv, lo, lr, y: yy };
    });
    const under = s("g"), over = s("g");
    svg.append(under, over);
    const paint = (el, fill) => el.setAttribute("style", el.getAttribute("style").replace(/fill:[^;]+/, "fill:" + fill));
    return {
      el: svg, y, cx, half, W, H, rows, over, under,
      setVals(fn) { ids.forEach((id) => (rows[id].lv.textContent = fn(E0[id].E, id))); },
      // mark({Zn: "ox" | "red" | "both"}, colour)
      mark(m, color = YEL) { ids.forEach((id) => { const r = rows[id], k = m[id]; paint(r.lo, k === "ox" || k === "both" ? color : TEXT); paint(r.lr, k === "red" || k === "both" ? color : TEXT); r.line.setAttribute("stroke", k ? color : "#6b7896"); }); },
      clear() { over.innerHTML = ""; },
    };
  }

  const steps = [];

  // ---------------------------------------------------------------- 1
  steps.push({
    title: "A voltmeter on the Daniell cell",
    short: "Voltages of pairs",
    newConcepts: ["adds"],
    render(el) {
      el.append(
        P("In <em>The galvanic cell</em> you built the Daniell cell: a zinc <em>half-cell</em> and a copper half-cell, joined by a wire and a salt bridge. Electrons leave the zinc <em>anode</em>, cross the wire and arrive at the copper <em>cathode</em>. The push behind them is the <em>voltage</em>. So far that was only a feeling: “more push”."),
        P("Now put a number on it. A voltmeter reads the push in <b>volts (V)</b> while letting only a trickle of electrons through. With both solutions at 1 mol/L (written 1 M), the Daniell cell reads <b>1.10 V</b>."),
        P("Is 1.10 V a property of zinc? Of copper? Build other cells and see. Every half-cell here is a metal strip in a 1 M solution of its own ion.")
      );
      const METALS = ["Zn", "Fe", "Cu", "Ag"];
      const PAIRS = [["Zn", "Fe"], ["Zn", "Cu"], ["Zn", "Ag"], ["Fe", "Cu"], ["Fe", "Ag"], ["Cu", "Ag"]];
      const pic = cellPic();
      let a = "Zn", b = "Cu";
      const seen = new Set();
      const volt = stat("voltmeter", "y"), neg = stat("electrons leave from", "b");
      const tbody = h("tbody");
      const table = h("div", { class: "tablewrap" }, h("table", { class: "small compact" }, h("thead", {}, h("tr", {}, h("th", {}, "pair"), h("th", { class: "num" }, "reading"), h("th", {}, "anode (−)"))), tbody));
      const upd = () => {
        const d = E0[b].E - E0[a].E, an = d > 0 ? a : b;
        pic.set({
          L: { ...metalHalf(a), tag: d === 0 ? "" : d > 0 ? "anode (−)" : "cathode (+)" },
          R: { ...metalHalf(b), tag: d === 0 ? "" : d > 0 ? "cathode (+)" : "anode (−)" },
          meter: Math.abs(d).toFixed(2) + " V", dir: Math.sign(d),
        });
        volt.set(Math.abs(d).toFixed(2) + " V");
        neg.set(d === 0 ? "nowhere" : E0[an].red === "Zn" ? "zinc" : { Fe: "iron", Cu: "copper", Ag: "silver" }[an]);
        if (a !== b) seen.add([a, b].sort((p, q) => METALS.indexOf(p) - METALS.indexOf(q)).join("-"));
        tbody.innerHTML = "";
        PAIRS.forEach(([p, q]) => {
          const ok = seen.has(p + "-" + q);
          tbody.append(h("tr", {}, h("td", {}, `${p} – ${q}`), h("td", { class: "num" }, ok ? (E0[q].E - E0[p].E).toFixed(2) + " V" : "?"), h("td", {}, ok ? p : "?")));
        });
      };
      el.append(widget("Pick a metal for each beaker (M = mol/L)",
        toggle("left:", METALS.map((m) => [m, m]), a, (v) => { a = v; upd(); }),
        toggle("right:", METALS.map((m) => [m, m]), b, (v) => { b = v; upd(); }),
        pic.el, h("div", { class: "readout" }, volt, neg),
        h("div", { class: "note", style: "margin-top:12px" }, "Your lab notebook fills in as you measure:"), table));
      upd();
      el.append(
        P("Two things to notice once the notebook is full. First, the same metal on both sides gives <b>0 V</b>: a half-cell cannot push against itself. Second, the readings <b>chain</b>: Zn–Cu (1.10) plus Cu–Ag (0.46) is exactly Zn–Ag (1.56). Zn–Fe (0.32) plus Fe–Cu (0.78) is Zn–Cu again."),
        P("That is how <b>height differences</b> behave. If the first floor is 3 m above the ground and the second is 3 m above the first, the second is 6 m above the ground. It suggests each half-cell has its own “height”, and a voltmeter reads the gap between two of them."),
        takeaway("A voltage belongs to a pair of half-cells, and the voltages of pairs add up like differences in height.")
      );
      return loop(() => pic.tick());
    },
    check: {
      type: "number",
      q: "A nickel–copper cell reads <b>0.60 V</b> (nickel is the anode). A copper–silver cell reads <b>0.46 V</b> (copper is the anode). What will a nickel–silver cell read, in volts?",
      answer: 1.06, tolerance: 0.006, shown: "1.06",
      hint: "Nickel sits 0.60 V “above” copper, and copper sits 0.46 V “above” silver. How far is nickel above silver?",
      why: "0.60 + 0.46 = 1.06 V. The gaps chain, exactly like Zn–Cu plus Cu–Ag gave Zn–Ag.",
    },
  });

  // ---------------------------------------------------------------- 2
  steps.push({
    title: "Only differences can be measured",
    short: "Only differences",
    newConcepts: ["potential"],
    render(el) {
      el.append(
        P("Give each half-cell one number, so that a cell's voltage is the difference of two numbers. That number is called the half-cell's <b>electrode potential</b>. Here are the four half-cells of step 1 drawn as rungs of a ladder, spaced by the voltages you measured."),
        P("The ladder is drawn so that <b>electrons fall downwards</b>: zinc at the top hands electrons to anything below it. The lower a rung, the harder that half-cell pulls electrons in, and the <b>bigger</b> its number."),
        P("But which rung gets the number 0? A voltmeter has two leads. It can only ever compare two half-cells, never look at one alone. Move the zero around and watch what survives.")
      );
      const ids = ["Zn", "Fe", "Cu", "Ag"];
      const lad = ladder({ ids, emin: -0.95, emax: 1.0, height: 250, heads: ["ion in solution", "metal strip"] });
      const zeroLine = s("line", { x1: lad.cx - lad.half + 3, x2: lad.cx + lad.half - 3, stroke: YEL, "stroke-width": 4, "stroke-dasharray": "6 4" });
      const zeroTxt = txt(lad.W - 6, 0, "◀ zero", { anchor: "end", size: 12, fill: YEL });
      lad.over.append(zeroLine, zeroTxt);
      const o = out();
      let z = E0.Zn.E; // the potential (on the final scale) that we call zero
      const num = (id) => E0[id].E - z;
      const sl = slider({ name: "zero at", min: -0.9, max: 0.9, step: 0.01, value: z, fmtv: (v) => { const hit = ids.find((id) => Math.abs(E0[id].E - v) < 0.006); return hit ? hit : "…"; }, oninput: (v) => { z = v; upd(); } });
      const upd = () => {
        lad.setVals((E) => SV(E - z) + " V");
        const yy = lad.y(z);
        zeroLine.setAttribute("y1", yy); zeroLine.setAttribute("y2", yy); zeroTxt.setAttribute("y", yy + 4);
        const row = (p, q) => `<span class="k">${p}–${q} cell:</span> ${V2(num(q))} − ${PAR(num(p))} = <span class="y">${(num(q) - num(p)).toFixed(2)} V</span>`;
        o.innerHTML = row("Zn", "Cu") + "<br>" + row("Cu", "Ag") + "<br>" + row("Zn", "Ag");
      };
      const setZ = (v) => { z = v; sl.set(v); upd(); };
      el.append(widget("Slide the zero: every number changes, no voltage does", lad.el, sl,
        h("div", { class: "btns" },
          h("button", { onclick: () => setZ(E0.Zn.E) }, "zero at zinc"),
          h("button", { onclick: () => setZ(E0.Cu.E) }, "zero at copper"),
          h("button", { onclick: () => setZ(E0.Ag.E) }, "zero at silver")),
        o));
      upd();
      el.append(
        P("The three cell voltages never move. Sea level works the same way: you may measure heights from the sea, from the valley floor or from the centre of the Earth, and the mountain is still the same amount taller than the hill."),
        P("So the potential of a single half-cell has no absolute value. Everybody simply has to <b>agree on one zero</b>."),
        takeaway("An electrode potential is a number per half-cell. Only differences between potentials are real, so the zero is a free choice.")
      );
    },
    check: {
      type: "number",
      q: "Suppose the world agreed to put the zero at <b>copper</b>. Lower rung = bigger number. What number would <b>zinc</b> get, in volts? (Mind the sign.)",
      answer: -1.10, tolerance: 0.006, shown: "−1.10",
      hint: "The Zn–Cu cell reads 1.10 V, and zinc is above copper on the ladder. Press “zero at copper” to see it.",
      why: "−1.10 V. Zinc sits 1.10 V above the zero rung, and rungs above zero get negative numbers.",
      backTo: 0,
    },
  });

  // ---------------------------------------------------------------- 3
  steps.push({
    title: "The agreed zero: the hydrogen electrode",
    short: "The hydrogen electrode",
    newConcepts: ["she"],
    render(el) {
      el.append(
        P("Chemists did not pick a metal for the zero. They picked <b>hydrogen</b>, the element that already split the <em>activity series</em> in two: metals above it dissolve in acid and release H₂ (from <em>The activity series</em>), metals below it do not."),
        P("Hydrogen is a gas, so you cannot make a strip of it. The half-cell is built like this: a strip of platinum, a <em>noble metal</em> that does not react and only offers a surface where electrons can get on or off, sits in acid with 1 M H⁺ while H₂ gas at a pressure of 1 bar bubbles over it. Its half-reaction can run either way:"),
        formula(`${f("2H^+ + 2e- <-> H2")}<small>the standard hydrogen electrode, SHE. Its potential is <b>0 V by definition</b>.</small>`),
        P("Now any half-cell gets its number by wiring it against the SHE, with the voltmeter's + lead on the half-cell being tested. Try the four from step 1.")
      );
      const pic = cellPic();
      const ids = ["Zn", "Fe", "Cu", "Ag"];
      let m = "Cu";
      const pot = stat("potential vs SHE", "y");
      const o = out();
      const upd = () => {
        const c = E0[m], E = c.E;
        pic.set({ L: { ...SHE, tag: E > 0 ? "anode (−)" : "cathode (+)" }, R: { ...metalHalf(m), tag: E > 0 ? "cathode (+)" : "anode (−)" }, meter: SV(E) + " V", dir: E > 0 ? 1 : -1 });
        pot.setLabel(`potential of ${couple(c)}`); pot.set(SV(E) + " V");
        o.innerHTML = E > 0
          ? `<span class="k">hydrogen electrode (anode, oxidation):</span> ${Chem.half("H", true)}<br><span class="k">${m} electrode (cathode, reduction):</span> ${Chem.half(m)}<br><span class="g">${f(c.ox)} pulls electrons harder than H⁺ does: positive potential.</span>`
          : `<span class="k">${m} electrode (anode, oxidation):</span> ${Chem.half(m, true)}<br><span class="k">hydrogen electrode (cathode, reduction):</span> ${Chem.half("H")}<br><span class="b">${f(c.ox)} pulls electrons more weakly than H⁺ does: negative potential.</span>`;
      };
      el.append(widget("Wire a half-cell against the standard hydrogen electrode",
        toggle("test:", ids.map((id) => [id, couple(E0[id])]), m, (v) => { m = v; upd(); }),
        pic.el, h("div", { class: "readout" }, pot), o));
      upd();
      el.append(
        P("The sign tells you the direction. <b>Positive</b>: the half-cell wins the tug-of-war for electrons against H⁺ and is the cathode. <b>Negative</b>: it loses, its metal gives electrons away, and H⁺ is turned into H₂ at the platinum. That is the same event as a metal fizzing in acid, now with the electrons sent through a wire."),
        h("p", { class: "note", html: "A real hydrogen electrode is fiddly, so labs usually measure against a handier reference half-cell and convert. The zero of every table is still hydrogen." }),
        takeaway(`The standard hydrogen electrode (${f("2H^+ + 2e- <-> H2")} on platinum) is the agreed zero. A half-cell's potential is its voltage against it, with a sign.`)
      );
      return loop(() => pic.tick());
    },
    check: {
      type: "choice",
      q: "The zinc half-cell reads <b>−0.76 V</b> against the hydrogen electrode. What is happening at the platinum strip while the cell runs?",
      options: [`H⁺ ions take electrons and leave as H₂ gas (reduction)`, `H₂ gas gives up electrons and becomes H⁺ (oxidation)`, "Platinum dissolves and supplies the electrons"],
      answer: 0,
      wrongHints: {
        1: "That is what happens against copper or silver. A negative sign means zinc is the one giving electrons, so the hydrogen side must be taking them.",
        2: "Platinum is only a surface. It is chosen precisely because it does not react.",
      },
      why: "Zinc is oxidised and pushes electrons through the wire to the platinum, where H⁺ is reduced to H₂. Zinc dissolving in acid, split into two beakers.",
    },
  });

  // ---------------------------------------------------------------- 4
  steps.push({
    title: "Standard conditions and E°",
    short: "Standard conditions, E°",
    newConcepts: ["stdcond", "e0"],
    render(el) {
      el.append(
        P("There is a catch before these numbers can go in a table. A half-cell's pull on electrons depends on <b>how much of the ion is there to take them</b>. Dilute the Cu²⁺ and fewer ions are waiting at the copper strip: the pull weakens. Change the solutions of the Daniell cell and watch the voltmeter.")
      );
      const pic = cellPic();
      let cz = 1, cc = 1;
      const fm = (x) => (x >= 0.095 ? x.toFixed(2) : x >= 0.0095 ? x.toFixed(3) : x.toFixed(4)) + " M";
      const sE = stat("cell voltage", "y"), sZn = stat("zinc half-cell", "b"), sCu = stat("copper half-cell", "b"), sStd = stat("standard conditions?", "g");
      const upd = () => {
        const eZn = Chem.nernst(E0.Zn.E, 2, 1 / cz), eCu = Chem.nernst(E0.Cu.E, 2, 1 / cc), E = eCu - eZn;
        const std = Math.abs(cz - 1) < 0.02 && Math.abs(cc - 1) < 0.02;
        const op = (c) => 0.08 + 0.5 * (Math.log10(c) + 3) / 3;
        pic.set({
          L: { col: METAL_COL.Zn, sol: SOL_COL.Zn, solOp: op(cz), cap1: "Zn strip", cap2: "in " + fm(cz) + " Zn²⁺", tag: "anode (−)" },
          R: { col: METAL_COL.Cu, sol: SOL_COL.Cu, solOp: op(cc), cap1: "Cu strip", cap2: "in " + fm(cc) + " Cu²⁺", tag: "cathode (+)" },
          meter: E.toFixed(2) + " V", dir: 1,
        });
        sE.set(E.toFixed(3) + " V"); sZn.set(SV(eZn) + " V"); sCu.set(SV(eCu) + " V");
        sStd.set(std ? "yes: E°" : "no"); sStd.className = "stat " + (std ? "g" : "r");
      };
      const s1 = slider({ name: "Zn²⁺", min: 0.001, max: 1, log: true, steps: 300, value: 1, fmtv: fm, oninput: (v) => { cz = v; upd(); } });
      const s2 = slider({ name: "Cu²⁺", min: 0.001, max: 1, log: true, steps: 300, value: 1, fmtv: fm, oninput: (v) => { cc = v; upd(); } });
      el.append(widget("Daniell cell at 25 °C: change the concentrations (idealised solutions)", pic.el, s1, s2,
        h("div", { class: "readout" }, sE, sZn, sCu, sStd),
        h("div", { class: "btns" }, h("button", { onclick: () => { cz = cc = 1; s1.set(1); s2.set(1); upd(); } }, "Back to 1 M / 1 M"))));
      upd();
      el.append(
        P("The shifts are small, a few hundredths of a volt per tenfold dilution, but they are real. (The exact rule is the subject of <em>Concentration and the Nernst equation</em>.) Gas pressure and temperature matter too. So a table is only meaningful if everyone measures under the same <b>standard conditions</b>:"),
        h("ul", {},
          h("li", { html: "every dissolved ion in the half-reaction at <b>1 mol/L</b>" }),
          h("li", { html: "every gas at <b>1 bar</b>" }),
          h("li", { html: "solids and liquids pure; tables are quoted at <b>25 °C</b>" })),
        P("A potential measured this way, against the hydrogen electrode, is marked with a small circle: <b>E°</b>, the <b>standard reduction potential</b>. “Reduction” is a bookkeeping rule: every half-reaction is written as <em>gaining</em> electrons, so all numbers answer the same question, <i>how hard does the left-hand side pull electrons in?</i>"),
        formula(`${Chem.half("Cu")} <span class="hl">E° = +0.34 V</span><br>${Chem.half("Zn")} <span class="hl">E° = −0.76 V</span>`),
        takeaway("E° is a half-cell's potential against the hydrogen electrode under standard conditions (1 mol/L, 1 bar, 25 °C), always written as a reduction.")
      );
      return loop(() => pic.tick());
    },
    check: {
      type: "choice",
      q: `The table says E°(${f("Cu^2+")}/Cu) = +0.34 V. Your beaker holds only <b>0.001 mol/L</b> ${f("Cu^2+")}. The potential of your copper half-cell is…`,
      options: ["lower than +0.34 V: fewer Cu²⁺ ions are there to take electrons", "exactly +0.34 V: E° is a property of copper", "higher than +0.34 V: dilute ions are hungrier"],
      answer: 0,
      wrongHints: {
        1: "E° is the value under standard conditions only. Drag the Cu²⁺ slider down and read the copper half-cell.",
        2: "Each ion pulls the same. There are just fewer of them at the strip, so the half-cell as a whole pulls less. Check with the Cu²⁺ slider.",
      },
      why: "Lower: about +0.25 V. E° only applies at 1 mol/L. Away from standard conditions the potential drifts, a little.",
    },
  });

  // ---------------------------------------------------------------- 5
  steps.push({
    title: "The table is a ladder",
    short: "The potential ladder",
    newConcepts: ["series"],
    render(el) {
      el.append(
        P("Measure every half-cell against hydrogen under standard conditions, sort by E°, and you get the <b>electrochemical series</b>: the <em>activity series</em> with numbers on it. Each row is one half-reaction written as a reduction, <code>oxidised form + electrons → reduced form</code>. Click a row.")
      );
      const SETS = {
        metals: ["Li", "K", "Ca", "Na", "Mg", "Al", "Zn", "Fe", "Ni", "Sn", "Pb", "H", "Cu", "Ag", "Au"],
        all: ["Li", "K", "Ca", "Na", "Mg", "Al", "Zn", "Fe", "Ni", "Sn", "Pb", "H", "Cu", "I2", "Ag", "Br2", "O2", "Cl2", "Au", "F2"],
      };
      const holder = h("div"), o = out();
      let mode = "metals", sel = "Zn", bars = null;
      const describe = () => {
        const c = E0[sel], ox = f(first(c.ox)), red = f(first(c.red));
        const isMetal = /^[A-Z][a-z]?$/.test(c.red);
        let line;
        if (sel === "H") line = `<span class="y">The zero, by definition.</span> Everything above gives electrons to H⁺; everything below takes electrons from H₂.`;
        else if (c.E < 0) line = `<span class="b">${ox} pulls electrons more weakly than H⁺.</span> Against the hydrogen electrode ${red} is the anode: it gives electrons` + (isMetal ? `, so E° says ${red} metal can dissolve in acid and release H₂.` : ".");
        else line = `<span class="g">${ox} pulls electrons harder than H⁺.</span> Against the hydrogen electrode it is the cathode` + (isMetal ? `, so ${red} metal does not dissolve in plain acid.` : `: ${ox} takes electrons from H₂.`);
        o.innerHTML = `${Chem.half(c)} <span class="y">E° = ${SV(c.E)} V</span><br><span style="font-size:14.5px">${line}</span>`;
      };
      const build = () => {
        const ids = SETS[mode];
        if (!ids.includes(sel)) sel = "Zn";
        bars = hbars(ids.map((id) => couple(E0[id])), { signed: true, max: 3.1, fmtv: (v) => SV(v) + " V", labelWidth: narrow(110, 84), onclick: (i) => { sel = ids[i]; bars.mark(i); describe(); } });
        bars.update(ids.map((id) => E0[id].E), ids.map((id) => (E0[id].E < 0 ? BLUE : id === "H" ? YEL : GRN)));
        bars.mark(ids.indexOf(sel));
        holder.innerHTML = ""; holder.append(bars);
        describe();
      };
      el.append(widget("Standard reduction potentials E° (25 °C), strongest electron-givers at the top",
        toggle("show:", [["metals", "metals + hydrogen"], ["all", "add some non-metals"]], mode, (v) => { mode = v; build(); }),
        h("div", { class: "note", style: "margin:8px 0 2px" }, "oxidised form / reduced form · bar = E° (blue negative, green positive)"),
        holder, o));
      build();
      el.append(
        P("Read it as the ladder of step 2. The top rows have very negative E°: their ions barely want electrons, which is the same as saying their <b>metals give electrons away most readily</b>. The bottom rows have large positive E°: their oxidised forms <b>grab electrons hardest</b>."),
        P("The order of the metals is the one you rebuilt from dip experiments in <em>The activity series</em>, with hydrogen at 0 marking the line between metals that fizz in acid and metals that do not. The new part is the spacing: you now know not only that zinc beats copper but <b>by how many volts</b>."),
        h("p", { class: "note", html: "Many textbooks print the table the other way up, most positive at the top. The numbers are the same. This course keeps the givers on top so that electrons fall downwards." }),
        takeaway("The electrochemical series is the activity series with numbers: half-reactions sorted by E°, electron-givers at the negative end, electron-takers at the positive end.")
      );
    },
    check: {
      type: "choice",
      q: `E°(${f("Fe^2+")}/Fe) = −0.44 V and E°(${f("Ni^2+")}/Ni) = −0.26 V. Which <em>displacement</em> experiment shows a reaction?`,
      options: [`An iron strip in ${f("Ni^2+")} solution: nickel metal plates out`, `A nickel strip in ${f("Fe^2+")} solution: iron metal plates out`, "Neither: both potentials are negative, so nothing happens"],
      answer: 0,
      wrongHints: {
        1: "Electrons would have to climb from nickel (−0.26 V) up to the iron rung (−0.44 V). They fall the other way.",
        2: "A negative sign only compares each couple with hydrogen. What matters between iron and nickel is which of the two is higher on the ladder.",
      },
      why: `Iron is the higher rung, so its electrons fall to ${f("Ni^2+")}: ${f("Fe + Ni^2+ -> Fe^2+ + Ni")}. Negative E° values only say both lose to H⁺.`,
    },
  });

  // ---------------------------------------------------------------- 6
  steps.push({
    title: "Predicting a cell's voltage",
    short: "E°cell: cathode − anode",
    newConcepts: ["ecell", "sign"],
    render(el) {
      el.append(
        P("A cell's voltage is the gap between two rungs. So you never need to build the cell: look up two numbers and subtract. For the Daniell cell the electrons fall from the zinc rung (−0.76 V) to the copper rung (+0.34 V), a drop of 1.10 V. Exactly what the voltmeter said in step 1."),
        P("To keep the sign straight, always subtract in the same order: the half-cell where <em>reduction</em> happens (the <em>cathode</em>) minus the half-cell where <em>oxidation</em> happens (the <em>anode</em>)."),
        formula(`E°<sub>cell</sub> = <span class="hl">E°<sub>cathode</sub></span> − <span class="bl">E°<sub>anode</sub></span><small>both taken straight from the table, as reduction potentials. No signs are flipped by hand.</small>`),
        P("Now assign the roles yourself, including the wrong way round.")
      );
      const ids = ["Mg", "Zn", "Fe", "H", "Cu", "Ag"];
      const lad = ladder({ ids, emin: -2.6, emax: 1.0, height: 310 });
      lad.setVals((E) => SV(E) + " V");
      const dot = s("circle", { r: 4.5, fill: YEL });
      let an = "Zn", ca = "Cu", ph = 0;
      const o = out();
      const tA = toggle("anode (oxidation):", ids.map((id) => [id, f(first(E0[id].red))]), an, (v) => { an = v; upd(); });
      const tC = toggle("cathode (reduction):", ids.map((id) => [id, f(first(E0[id].ox))]), ca, (v) => { ca = v; upd(); });
      const upd = () => {
        const a = E0[an], c = E0[ca], E = c.E - a.E;
        lad.clear();
        lad.mark({ [an]: an === ca ? "both" : "red", [ca]: an === ca ? "both" : "ox" });
        const head = `E°cell = ${V2(c.E)} − ${PAR(a.E)} = `;
        if (an === ca) { o.innerHTML = `${head}<span class="y">0.00 V</span><br><span class="k">Same half-cell twice: no gap, no push.</span>`; return; }
        arrow(lad.over, lad.cx, lad.rows[an].y, lad.cx, lad.rows[ca].y, E > 0 ? GRN : RED, 3);
        if (E > 0) lad.over.append(dot);
        const r = overall(a, c);
        o.innerHTML = `${head}<span class="${E > 0 ? "g" : "r"}">${SV(E)} V</span><br>` +
          `<span class="k">as assigned:</span> ${r.text}<br>` +
          (E > 0 ? `<span class="g">Positive: electrons fall from ${f(first(a.red))} to ${f(first(c.ox))}. The reaction runs by itself and the cell delivers ${E.toFixed(2)} V.</span>`
                 : `<span class="r">Negative: electrons would have to climb. This direction does not run by itself; the reverse reaction does, with ${f(first(c.red))} as the anode.</span>`);
      };
      el.append(widget("Choose the anode and the cathode", tA, tC, lad.el,
        h("div", { class: "btns" }, h("button", { onclick: () => { [an, ca] = [ca, an]; tA.set(an); tC.set(ca); upd(); } }, "Swap the roles")), o));
      upd();
      el.append(
        P("The sign is a verdict. <b>Positive E°<sub>cell</sub></b>: the electrons go downhill, the reaction as written is <em>spontaneous</em> (from <em>The activity series</em>) and the cell works as a galvanic cell. <b>Negative E°<sub>cell</sub></b>: you assigned the roles backwards, and nature runs the reverse reaction instead. Zero: nothing to gain either way."),
        takeaway("E°cell = E°cathode − E°anode. Positive means the reaction runs by itself in the direction written; negative means it runs the other way.")
      );
      return loop(() => {
        if (an === ca || E0[ca].E <= E0[an].E) return;
        ph = (ph + 0.02) % 1;
        dot.setAttribute("cx", lad.cx); dot.setAttribute("cy", lad.rows[an].y + (lad.rows[ca].y - lad.rows[an].y - 12) * ph * ph);
      });
    },
    check: {
      type: "number",
      q: `A cell has a magnesium anode and a copper cathode: ${f("Mg | Mg^2+ || Cu^2+ | Cu")}. With E°(${f("Mg^2+")}/Mg) = −2.37 V and E°(${f("Cu^2+")}/Cu) = +0.34 V, what is E°<sub>cell</sub> in volts?`,
      answer: 2.71, tolerance: 0.006, shown: "2.71",
      hint: "Cathode minus anode, and subtracting a negative number adds: 0.34 − (−2.37).",
      why: "0.34 − (−2.37) = +2.71 V. Positive, so magnesium really is the anode and the cell runs as written.",
    },
  });

  // ---------------------------------------------------------------- 7
  steps.push({
    title: "Why you never multiply E°",
    short: "Never multiply E°",
    newConcepts: ["perelectron"],
    render(el) {
      el.append(
        P(`Swap the copper half-cell for silver. Silver ions take one electron each, zinc gives two, so the balanced equation (the <em>half-reaction method</em> from <em>Balancing redox equations</em>) needs the silver half-reaction twice:`),
        formula(`${f("Zn + 2Ag^+ -> Zn^2+ + 2Ag")}`),
        P("The tempting move is to double silver's E° as well: 2 × 0.80 − (−0.76) = 2.36 V. A voltmeter says <b>1.56 V</b>, which is just 0.80 − (−0.76). Why is the coefficient ignored?"),
        P("Because a potential is a <b>height</b>, not an amount. E° says how far <i>each</i> electron falls. Doubling the recipe sends twice as many electrons over the edge, but the edge is no higher. Scale the reaction up and watch what changes.")
      );
      const lad = ladder({ ids: ["Zn", "Ag"], emin: -1.05, emax: 1.05, height: 230 });
      lad.setVals((E) => SV(E) + " V");
      lad.mark({ Zn: "red", Ag: "ox" });
      let k = 1, ph = 0;
      const dots = Array.from({ length: 12 }, () => { const d = s("circle", { r: 3.6, fill: YEL }); lad.over.append(d); return d; });
      const sEq = out();
      const sN = stat("electrons moved", "y"), sV = stat("voltmeter", "g"), sW = stat("work done (electrons × volts)", "p"), sBad = stat("if E° scaled with the recipe", "r");
      sBad.querySelector(".v").classList.add("ep-strike");
      const y0 = lad.rows.Zn.y, y1 = lad.rows.Ag.y;
      const place = () => {
        const n = 2 * k, gap = Math.min(11, (2 * lad.half - 16) / n);
        dots.forEach((d, i) => {
          d.setAttribute("display", i < n ? "" : "none");
          const p = (ph + i * 0.37) % 1;
          d.setAttribute("cx", lad.cx + (i - (n - 1) / 2) * gap); d.setAttribute("cy", y0 + 5 + (y1 - y0 - 10) * p * p);
        });
      };
      const upd = () => {
        const c = (x) => (x > 1 ? x : "");
        sEq.innerHTML = `${c(k)}Zn + ${2 * k}Ag⁺ → ${c(k)}Zn²⁺ + ${2 * k}Ag`;
        sN.set(String(2 * k)); sV.set("1.56 V"); sW.set((2 * k * 1.56).toFixed(2)); sBad.set((k * 2.36).toFixed(2) + " V");
        place();
      };
      el.append(widget("Scale the reaction: more electrons, same drop",
        slider({ name: "recipe ×", min: 1, max: 6, step: 1, value: 1, fmtv: (v) => "× " + v, oninput: (v) => { k = v; upd(); } }),
        sEq, lad.el, h("div", { class: "readout" }, sN, sV, sW, sBad)));
      upd();
      el.append(
        P("The number of electrons grows and so does the total work they can do. The voltage stays put. If it did scale with the recipe, a bucket-sized Daniell cell would give thousands of volts and a thimble-sized one almost none. In reality a small cell and a huge cell of the same chemistry show the <b>same voltage</b>; the huge one just lasts longer."),
        P("The same goes for a waterfall: more water over the edge means more energy in total, but each litre still falls the same height. How total energy follows from <i>electrons × volts</i> is the subject of <em>Charge, energy and capacity</em>."),
        takeaway("E° is a push per electron, not a total. Multiply half-reactions to balance the electrons, but never multiply their E°.")
      );
      return loop(() => { ph = (ph + 0.018) % 1; place(); });
    },
    check: {
      type: "number",
      q: `Aluminium and copper: ${f("2Al + 3Cu^2+ -> 2Al^3+ + 3Cu")}. E°(${f("Al^3+")}/Al) = −1.66 V, E°(${f("Cu^2+")}/Cu) = +0.34 V. What is E°<sub>cell</sub> in volts?`,
      answer: 2.0, tolerance: 0.006, shown: "2.00",
      hint: "Ignore the 2 and the 3. They count electrons, not height. Cathode minus anode.",
      why: "0.34 − (−1.66) = 2.00 V. Six electrons move per reaction as written, and each one falls the same 2.00 V.",
      backTo: 5,
    },
  });

  // ---------------------------------------------------------------- 8
  steps.push({
    title: "The two ends of the ladder",
    short: "Strongest givers, takers",
    newConcepts: ["ends"],
    render(el) {
      el.append(
        P("Each rung holds two species. On the left the oxidised form, which can <b>take</b> electrons and so act as an <em>oxidising agent</em>. On the right the reduced form, which can <b>give</b> electrons and so act as a <em>reducing agent</em> (both from <em>Oxidation and reduction</em>)."),
        P("One rule now covers every redox reaction in the table: <b>a giver reacts with any taker on a lower rung</b>, because then the electrons fall. Pick one of each and test it.")
      );
      const ids = ["Li", "Na", "Zn", "H", "Cu", "Ag", "Cl2", "F2"];
      const lad = ladder({ ids, emin: -3.3, emax: 3.1, height: 380, heads: narrow(["takers (oxidising agents)", "givers (reducing agents)"], ["takers\n(oxidising agents)", "givers\n(reducing agents)"]) });
      lad.setVals((E) => SV(E) + " V");
      let giver = "Zn", taker = "Cu";
      const o = out();
      const upd = () => {
        const g = E0[giver], t = E0[taker], E = t.E - g.E;
        lad.clear(); lad.mark({ [giver]: giver === taker ? "both" : "red", [taker]: giver === taker ? "both" : "ox" });
        if (giver === taker) { o.innerHTML = `<span class="k">${f(first(g.red))} and ${f(first(t.ox))} are the two halves of the same couple: there is no gap to fall through.</span>`; return; }
        arrow(lad.over, lad.cx + lad.half - 4, lad.rows[giver].y, lad.cx - lad.half + 4, lad.rows[taker].y, E > 0 ? GRN : RED, 3);
        o.innerHTML = `E° = ${V2(t.E)} − ${PAR(g.E)} = <span class="${E > 0 ? "g" : "r"}">${SV(E)} V</span><br>` +
          (E > 0 ? `<span class="g">Reacts:</span> ${overall(g, t).text}` : `<span class="r">No reaction:</span> the taker ${f(first(t.ox))} sits above the giver ${f(first(g.red))}, so the electrons would have to climb.`);
      };
      el.append(widget("Giver on the right, taker on the left: does the arrow point down?",
        toggle("giver:", ids.map((id) => [id, f(first(E0[id].red))]), giver, (v) => { giver = v; upd(); }),
        toggle("taker:", ids.map((id) => [id, f(first(E0[id].ox))]), taker, (v) => { taker = v; upd(); }),
        lad.el, o));
      upd();
      el.append(
        P(`Now look at the corners. The best giver of all is at the top right: <b>lithium metal</b> (E° = −3.04 V), the strongest reducing agent in the table. The best taker is at the bottom left: <b>fluorine</b>, ${f("F2")} (E° = +2.87 V), the strongest oxidising agent. That matches <em>The periodic table: who gives, who takes</em>: an <em>alkali metal</em> at one end, the most <em>electronegative</em> <em>halogen</em> at the other.`),
        P(`The opposite corners are the laziest: ${f("Li^+")} is the weakest taker and ${f("F^-")} the weakest giver. A strong giver always leaves behind a weak taker. And the full height of the ladder, 2.87 − (−3.04) = 5.91 V, is the largest E°<sub>cell</sub> this table allows. Batteries chase the top of the ladder for exactly that reason, as <em>Lithium: the lightest metal and the ion that shuttles</em> will show.`),
        takeaway("Givers (reducing agents) get stronger towards the top right, takers (oxidising agents) towards the bottom left. A giver reacts with any taker below it.")
      );
    },
    check: {
      type: "choice",
      q: `You want to turn bromide ions into bromine: ${f("2Br^- -> Br2 + 2e-")}. E°(${f("Br2")}/${f("Br^-")}) = +1.07 V. Which of these can take the electrons?`,
      options: [`${f("Cl2")} (E° = +1.36 V)`, `${f("I2")} (E° = +0.54 V)`, `${f("Cu^2+")} (E° = +0.34 V)`],
      answer: 0,
      wrongHints: {
        1: `${f("I2")} sits above the bromine rung (+0.54 is less than +1.07), so electrons from ${f("Br^-")} would have to climb to reach it.`,
        2: `${f("Cu^2+")} at +0.34 V is far above the bromine rung at +1.07 V. A positive E° alone is not enough: the taker must be lower than the giver.`,
      },
      why: `Only ${f("Cl2")} is below the bromine rung: E° = 1.36 − 1.07 = +0.29 V, so ${f("Cl2 + 2Br^- -> 2Cl^- + Br2")} runs by itself.`,
      backTo: 5,
    },
  });

  // ---------------------------------------------------------------- 9 (capstone)
  steps.push({
    title: "Capstone: the cell builder",
    short: "Capstone: cell builder",
    newConcepts: [],
    render(el) {
      el.append(
        P("Everything in one bench. Pick <b>any two half-cells</b> from the course's table. The builder looks up both E° values, decides which side is the anode (the higher rung, more negative E°), sends the electrons the right way, and writes the balanced overall reaction with the electrons cancelled."),
        P("Where a couple has no solid metal of its own (a gas, or two dissolved ions), the electrode is platinum, as in the hydrogen electrode.")
      );
      const ELECTRODE = { H: "Pt", "H2O/H2": "Pt", ZnO: "Zn", "Cd(OH)2": "Cd", PbSO4: "Pb", AgCl: "Ag", PbO2: "PbO2", NiOOH: "NiO(OH)", MnO2: "MnO2" };
      const GAS = { H: "H2", "H2O/H2": "H2", O2: "O2", "O2/OH": "O2", Cl2: "Cl2", F2: "F2" };
      const info = (c) => {
        const elc = ELECTRODE[c.id] || (/^[A-Z][a-z]?$/.test(c.red) ? c.red : "Pt");
        return { elc, col: METAL_COL[elc] || "#a8b3c2", sol: SOL_COL[c.id] || "#6f84a6", solOp: 0.28, gas: !!GAS[c.id], cap1: f(elc) + " electrode" + (GAS[c.id] ? ", " + f(GAS[c.id]) + " gas" : ""), cap2: couple(c) };
      };
      const optLabel = (c) => `${SV(c.E)} V   ${couple(c)}${c.medium === "base" ? "  (in base)" : c.medium === "acid" ? "  (in acid)" : ""}`;
      const mkSel = (val, on) => {
        const se = h("select", { class: "ep-sel", onchange: () => on(se.value) }, ...Chem.E0.map((c) => h("option", { value: c.id }, optLabel(c))));
        se.value = val; return se;
      };
      let A = "Zn", B = "Cu";
      const selA = mkSel(A, (v) => { A = v; upd(); }), selB = mkSel(B, (v) => { B = v; upd(); });
      const pic = cellPic();
      const sE = stat("E°cell", "y"), sN = stat("electrons per reaction", "b"), sDir = stat("electrons flow", "g");
      const o = out(), notes = h("div", { class: "note", style: "margin-top:10px;min-height:20px" });
      const upd = () => {
        const a = E0[A], b = E0[B], d = b.E - a.E, same = A === B, flat = Math.abs(d) < 0.005;
        const ia = info(a), ib = info(b);
        const tagL = flat ? "" : d > 0 ? "anode (−)" : "cathode (+)", tagR = flat ? "" : d > 0 ? "cathode (+)" : "anode (−)";
        pic.set({ L: { ...ia, tag: tagL }, R: { ...ib, tag: tagR }, meter: Math.abs(d).toFixed(2) + " V", dir: flat ? 0 : Math.sign(d) });
        sE.set(Math.abs(d).toFixed(2) + " V");
        if (flat) {
          sN.set("0"); sDir.set("nowhere");
          o.innerHTML = same ? `<span class="k">The same half-cell twice. No gap between the rungs, no push, no reaction.</span>`
            : `<span class="k">${couple(a)} and ${couple(b)} sit on the same rung (${SV(a.E)} V). At standard conditions neither can push the other.</span>`;
          notes.innerHTML = ""; return;
        }
        const an = d > 0 ? a : b, ca = d > 0 ? b : a, r = overall(an, ca);
        sN.set(String(r.n)); sDir.set(d > 0 ? "left → right" : "right → left");
        const simple = (c) => /^[A-Z][a-z]?$/.test(c.red) && !/ /.test(c.ox);
        const mult = (m) => (m > 1 ? ` <span class="k">(× ${m})</span>` : "");
        o.innerHTML =
          `E°cell = E°cathode − E°anode = ${V2(ca.E)} − ${PAR(an.E)} = <span class="y">${SV(ca.E - an.E)} V</span><br>` +
          `<span class="k">anode, oxidation:</span> ${Chem.half(an, true)}${mult(r.ma)}<br>` +
          `<span class="k">cathode, reduction:</span> ${Chem.half(ca)}${mult(r.mc)}<br>` +
          `<span class="k">overall:</span> <span class="g">${r.text}</span>` +
          (simple(an) && simple(ca) ? `<br><span class="k">cell notation:</span> ${f(an.red)} | ${f(an.ox)} || ${f(ca.ox)} | ${f(ca.red)}` : "");
        const n = [];
        if (r.ma > 1 || r.mc > 1) n.push("The half-reactions were multiplied so the electrons cancel. Their E° values were not.");
        if ((an.medium === "acid" && ca.medium === "base") || (an.medium === "base" && ca.medium === "acid")) n.push("One half-cell is defined in acid (1 M H⁺) and the other in base (1 M OH⁻). The two beakers must hold different solutions, so read the overall equation as bookkeeping; H⁺ and OH⁻ would meet as water.");
        if (an.E < -0.83 || ca.E > 1.23) n.push("E° tells you the push, not whether the cell is practical. Water has rungs of its own (H₂ and O₂ in the list), and a couple beyond them can in principle react with the water. Some do so violently (Li, Na, F₂); others are slow enough to be usable. That problem returns in the lithium lesson.");
        notes.innerHTML = n.join(" ");
      };
      const preset = (a, b) => () => { A = a; B = b; selA.value = a; selB.value = b; upd(); };
      el.append(widget("Cell builder: all " + Chem.E0.length + " half-cells of the course table",
        h("div", { class: "ep-pick" }, "left half-cell", selA),
        h("div", { class: "ep-pick" }, "right half-cell", selB),
        pic.el, h("div", { class: "readout" }, sE, sN, sDir), o, notes,
        h("div", { class: "btns" },
          h("button", { onclick: preset("Zn", "Cu") }, "Daniell"),
          h("button", { onclick: preset("Ag", "Zn") }, "silver + zinc"),
          h("button", { onclick: preset("Al", "Cu") }, "aluminium + copper"),
          h("button", { onclick: preset("H", "O2") }, "hydrogen + oxygen"),
          h("button", { onclick: preset("PbSO4", "PbO2") }, "lead + lead dioxide"),
          h("button", { onclick: preset("Cd(OH)2", "NiOOH") }, "cadmium + nickel"),
          h("button", { onclick: preset("Li", "F2") }, "Li + F₂"))));
      upd();
      el.append(
        P("Things to try, each from an earlier step:"),
        h("ul", {},
          h("li", { html: "<b>Daniell</b>, then swap left and right by hand. The voltage and the reaction do not care which beaker is on which side; only the electron arrow turns round (<b>step 1</b>)." }),
          h("li", { html: "<b>Silver + zinc</b> and <b>aluminium + copper</b>: the half-reactions get multiplied, the E° values do not (<b>step 7</b>)." }),
          h("li", { html: "<b>Hydrogen + oxygen</b> gives 1.23 V and makes nothing but water. <b>Lead + lead dioxide</b> gives 2.05 V, and <b>cadmium + nickel</b> 1.30 V. You will meet all three again as a fuel cell, a car battery and a rechargeable cell." }),
          h("li", { html: "Find two different half-cells that give <b>0.00 V</b>. (Two share the rung at −0.26 V.)" }),
          h("li", { html: "Find the largest voltage the table allows, and check it is the 5.91 V of <b>step 8</b>." })),
        h("p", { class: "note", html: "All of these are standard values: 1 mol/L, 1 bar, 25 °C. A real cell drifts away from them as it runs, and loses some voltage as soon as it delivers real current. Those are the next lessons." }),
        takeaway("Two numbers from one table give the voltage, the direction of the electrons and the reaction of any cell: E°cell = E°cathode − E°anode.")
      );
      return loop(() => pic.tick());
    },
  });

  Course.run({
    id: "electrode-potentials",
    section: "2. The galvanic cell",
    title: "Electrode potentials: predicting the voltage",
    concepts: {
      adds: "cell voltages add up",
      potential: "electrode potential",
      she: "standard hydrogen electrode (SHE)",
      stdcond: "standard conditions",
      e0: "standard reduction potential E°",
      series: "electrochemical series (potential ladder)",
      ecell: "E°cell = E°cathode − E°anode",
      sign: "positive E°cell = spontaneous",
      perelectron: "E° is per electron (never multiplied)",
      ends: "strongest oxidising / reducing agents",
    },
    sources: [
      { title: "OpenStax Chemistry 2e, §17.3 Electrode and Cell Potentials", url: "https://openstax.org/books/chemistry-2e/pages/17-3-electrode-and-cell-potentials", note: "SHE as the zero, E°cell = E°cathode − E°anode, sign and spontaneity, E° not scaled by coefficients" },
      { title: "OpenStax Chemistry 2e, Appendix L: Standard Electrode (Half-Cell) Potentials", url: "https://openstax.org/books/chemistry-2e/pages/l-standard-electrode-half-cell-potentials", note: "table of E° values; the course's rounded values live in assets/chem.js" },
      { title: "Wikipedia: Standard hydrogen electrode", url: "https://en.wikipedia.org/wiki/Standard_hydrogen_electrode", note: "construction (platinum, H₂ at 1 bar, unit-activity H⁺) and the zero-by-definition convention" },
      { title: "Wikipedia: Standard electrode potential (data page)", url: "https://en.wikipedia.org/wiki/Standard_electrode_potential_(data_page)", note: "cross-check of the E° values used here" },
      { title: "Wikipedia: Standard state", url: "https://en.wikipedia.org/wiki/Standard_state", note: "1 bar and 1 mol/L; 25 °C is the usual table temperature rather than part of the standard state" },
      { title: "LibreTexts Chemistry: Standard Potentials", url: "https://chem.libretexts.org/Bookshelves/Analytical_Chemistry/Supplemental_Modules_(Analytical_Chemistry)/Electrochemistry/Redox_Chemistry/Standard_Potentials", note: "why potentials are intensive: a push per unit of charge" },
    ],
    steps,
  });
})();
