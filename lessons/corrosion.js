// Lesson 4.3 — Corrosion: the battery you did not want
(function () {
  const { h, s, widget, stat, slider, toggle, plot, rng, narrow } = Course;
  const f = Chem.f;
  const E = (id) => Chem.E0by[id].E;
  const YEL = "#ffd166", RED = "#ff6b6b", BLUE = "#6cb4ff", GRN = "#5fd38d", MUTED = "#9aa3b5", TEXT = "#e6e9ef", DARK = "#12151c";
  const IRON = "#77818f", RUST = "#b5562b", WATER = "#4d8fd6", O2COL = "#d5dbe6", H2COL = "#1a1f29";
  const P = (html) => h("p", { html });
  const takeaway = (html) => h("div", { class: "takeaway", html });
  const formula = (html) => h("div", { class: "formula", html });
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const sv = (v) => (v > 0.0049 ? "+" : v < -0.0049 ? "−" : "") + Math.abs(v).toFixed(2);   // signed number, real minus sign
  const tstat = (label, cls) => { const t = stat(label, cls); t.querySelector(".v").style.cssText = "font-family:inherit;font-size:17px;line-height:1.3;padding-top:3px"; return t; };

  // ---- data (potentials and masses from Chem) ----
  const E_FE = E("Fe"), E_O2 = E("O2/OH"), E_H = E("H");
  const M_FE = Chem.elements.Fe.mass, M_O = Chem.elements.O.mass;
  const NAIL_G = 5.58;                                  // the running example: one iron nail, 0.100 mol
  const MET = {
    Mg: { name: "magnesium", col: "#cfd6e0" }, Zn: { name: "zinc", col: "#aeb9c9" }, Fe: { name: "iron", col: IRON },
    Sn: { name: "tin", col: "#e3e6ec" }, Cu: { name: "copper", col: "#d18a52" }, Ag: { name: "silver", col: "#f3f5f8" },
  };
  for (const k in MET) Object.assign(MET[k], { sym: k, E: E(k) });

  const style = h("style", {}, `
    .cor-status { min-height:52px; margin-top:10px; padding:8px 12px; border-left:3px solid var(--blue); background:var(--panel2); border-radius:6px; font-size:15px; line-height:1.45; }
    .cor-status b { color: var(--yellow); font-weight:600; }
    .cor-legend { display:flex; flex-wrap:wrap; gap:4px 14px; margin-top:8px; font-size:13px; color:var(--muted); }
    .cor-legend i { display:inline-block; width:10px; height:10px; border-radius:50%; margin-right:5px; }
    .cor-list { list-style:none; padding:0; margin:10px 0 0; font-size:15px; }
    .cor-list li { padding:2px 0; }
    .cor-ok { color: var(--green); } .cor-no { color: var(--red); }
    .cor-ox { display:flex; gap:8px; align-items:center; flex-wrap:wrap; margin-top:10px; font-size:14px; color:var(--muted); }
    .cor-ox .box { padding:3px 12px; border-radius:6px; border:1px solid var(--line); font-family:var(--mono); color:var(--muted); }
    .cor-ox .box.on { border-color: var(--yellow); color: var(--yellow); background:#2e2a18; }
    .cor-eq { font-size:19px; text-align:center; padding:10px 6px; margin-top:10px; background:var(--panel2); border-radius:8px; }
    .cor-sub { font-size:12px; text-transform:uppercase; letter-spacing:.08em; color:var(--muted); margin:16px 0 2px; }
  `);
  document.head.append(style);

  const legend = (items) => h("div", { class: "cor-legend", html: items.map(([t, c]) => `<span><i style="background:${c}${c === H2COL ? ";box-shadow:0 0 0 1.5px " + O2COL : ""}"></i>${t}</span>`).join("") });
  const LEG = [["electron", YEL], ["metal ion (+)", RED], ["OH⁻ (−)", BLUE], ["O₂ molecule", O2COL]];

  const FS = narrow(1, 1.18);                            // SVG text is scaled down on phones: compensate a little

  function loop(fn, ms = 40) {
    let t = null, dead = false;
    const run = () => { if (dead) return; fn(); t = setTimeout(run, ms); };
    t = setTimeout(run, ms);
    return () => { dead = true; clearTimeout(t); };
  }

  // =====================================================================================
  // A small SVG stage with particles that really travel along paths. One timer drives it.
  // =====================================================================================
  const KIND = {
    e: { r: 3.4, fill: YEL, cls: "e" },
    cat: { r: 9, fill: RED, cls: "ion" },
    an: { r: 8.5, fill: BLUE, cls: "ion" },
    o2: { r: 8.5, fill: O2COL, cls: "mol", label: "O₂" },
    h2: { r: 7.5, fill: H2COL, stroke: O2COL, cls: "mol", label: "H₂", lfill: TEXT },
    rust: { r: 3, fill: RUST, cls: "mol" },
  };
  const plen = (path) => path.slice(1).reduce((a, p, i) => a + Math.hypot(p[0] - path[i][0], p[1] - path[i][1]), 0);
  function makeStage(W, H, maxW) {
    const svg = s("svg", { viewBox: `0 0 ${W} ${H}`, width: "100%", style: `display:block;margin:0 auto;max-width:${maxW || 640}px` });
    const st = { svg, W, H };
    for (const k of ["bg", "mid", "part", "fg"]) { st[k] = s("g"); svg.append(st[k]); }
    let parts = [], sched = [], n = 0, hl = "all";
    const place = (p) => p.g.setAttribute("transform", `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})`);
    const show = (p) => p.g.setAttribute("opacity", p.delay > 0 ? 0 : hl === "all" || hl === p.cls ? 1 : 0.12);
    st.spawn = (kind, path, o = {}) => {
      const K = KIND[kind], g = s("g");
      g.append(s("circle", { r: K.r, fill: K.fill, stroke: K.stroke || DARK, "stroke-width": 0.7 }));
      const lab = o.label || K.label;
      if (lab) { const t = s("text", { "text-anchor": "middle", dy: "0.36em", style: `font-size:${narrow(7.4, 8.4)}px;font-weight:700;fill:${K.lfill || DARK}` }); t.textContent = lab; g.append(t); }
      const p = { g, cls: K.cls, path, seg: 0, x: path[0][0], y: path[0][1], speed: o.speed || 2.2, delay: o.delay || 0, done: o.done, stay: o.stay };
      st.part.append(g); parts.push(p); place(p); show(p); return p;
    };
    st.kill = (p) => { if (p && !p.dead) { p.dead = true; p.g.remove(); } };
    st.after = (k, fn) => sched.push({ at: n + k, fn });
    st.tick = () => {
      n++;
      if (sched.length) { const due = sched.filter((e) => e.at <= n); sched = sched.filter((e) => e.at > n); due.forEach((e) => e.fn()); }
      for (const p of parts.slice()) {
        if (p.dead || p.arrived) continue;
        if (p.delay > 0) { if (--p.delay <= 0) show(p); continue; }
        let step = p.speed;
        while (step > 0 && p.seg < p.path.length - 1) {
          const [tx, ty] = p.path[p.seg + 1], dx = tx - p.x, dy = ty - p.y, d = Math.hypot(dx, dy);
          if (d <= step) { p.x = tx; p.y = ty; p.seg++; step -= d; } else { p.x += (dx / d) * step; p.y += (dy / d) * step; step = 0; }
        }
        place(p);
        if (p.seg >= p.path.length - 1) { p.arrived = true; if (!p.stay) st.kill(p); if (p.done) p.done(p); }
      }
      parts = parts.filter((p) => !p.dead);
    };
    st.clearParts = () => { parts.forEach((p) => { p.dead = true; p.g.remove(); }); parts = []; sched = []; };
    st.setHl = (m) => { hl = m; parts.forEach(show); };
    st.T = (g, x, y, str, o = {}) => {
      const t = s("text", { x, y, "text-anchor": o.anchor || "middle", style: `font-size:${((o.size || 12) * FS).toFixed(1)}px;fill:${o.fill || TEXT};font-weight:${o.weight || 400}` });
      t.textContent = str; g.append(t); return t;
    };
    st.R = (g, x, y, w, hh, a = {}) => { const r = s("rect", Object.assign({ x, y, width: Math.max(0, w), height: Math.max(0, hh) }, a)); g.append(r); return r; };
    return st;
  }
  // One round of a corrosion cell: metal ions leave, nE electrons run along ePath, the takers (O₂ or H⁺) wait at the
  // cathodic site, and when everything has arrived the products appear. Stoichiometry is the caller's job.
  function round(st, o) {
    const sp = o.speed || 2.4, nE = o.nE || 4, takers = o.takers || [];
    (o.ions || []).forEach((io, i) => st.spawn("cat", io.path, { label: io.label, speed: sp * 0.45, delay: i * 7 }));
    const tE = plen(o.ePath) / sp + 5 * (nE - 1);
    let pending = nE + takers.length;
    const held = [];
    const fin = () => {
      if (--pending > 0) return;
      held.forEach((p) => st.kill(p));
      (o.products || []).forEach((pr) => st.spawn(pr.kind, pr.path, { label: pr.label, speed: sp * 0.4, delay: pr.delay || 0 }));
      if (o.onDone) o.onDone();
    };
    for (let i = 0; i < nE; i++) st.spawn("e", o.ePath.map(([x, y]) => [x, y + (i - (nE - 1) / 2) * 1.5]), { speed: sp, delay: i * 5, done: fin });
    takers.forEach((tk, j) => {
      const tT = plen(tk.path) / (sp * 0.6);
      held.push(st.spawn(tk.kind, tk.path, { label: tk.label, speed: sp * 0.6, delay: Math.max(0, Math.round(tE - tT)) + j * 4, stay: true, done: fin }));
    });
  }
  const ohFan = (x, y, dir, up = -1) => [0, 1, 2, 3].map((j) => ({ kind: "an", label: "OH", delay: j * 3, path: [[x, y], [x + dir * (14 + 13 * j), y + up * (16 + 9 * (j % 2))], [x + dir * (22 + 16 * j), y + up * (34 + 10 * (j % 2))]] }));

  const steps = [];

  // ---------------------------------------------------------------- 1
  steps.push({
    title: "A nail in a glass of water",
    short: "Who takes the electrons?",
    newConcepts: ["corrosion", "o2red"],
    render(el) {
      el.append(
        P(`Leave an iron nail in a glass of tap water. A few days later it wears an orange-brown crust and the nail underneath is a little thinner. Our nail weighs <b>${NAIL_G} g</b>, which is 0.100 mol of iron atoms (<em>moles = grams / molar mass</em>, from <em>Ions, salts and electrolytes</em>).`),
        P(`Metal that stops being metal means iron atoms became ions: <code style="font-family:inherit">${f("Fe -> Fe^2+ + 2e-")}</code>. That is an <em>oxidation</em> (from <em>Oxidation and reduction</em>), and an oxidation never happens alone. <b>Something in the glass must take those electrons.</b>`),
        P(`The <em>potential ladder</em> from <em>Electrode potentials</em> says who can. Electrons fall from a rung to any rung below it, and the size of the drop is <em>E°cell = E°(taker) − E°(giver)</em>. Positive means it goes by itself. Try the four suspects:`)
      );
      const W = narrow(520, 380), H = 258, st = makeStage(W, H, 620);
      const R = [["Na", "from dissolved salt"], ["H2O/H2", "water itself"], ["Fe", "the nail"], ["H", "acid (scarce in plain water)"], ["O2/OH", "oxygen from the air, dissolved"]];
      const y = (i) => 40 + i * 49, ex = W * narrow(0.69, 0.73);
      R.forEach(([id, who], i) => {
        const c = Chem.E0by[id], nail = id === "Fe";
        st.bg.append(s("line", { x1: 12, x2: W - 12, y1: y(i), y2: y(i), stroke: nail ? YEL : "#3a4356", "stroke-width": nail ? 2.5 : 2 }));
        st.T(st.bg, 16, y(i) - 8, Chem.half(c), { anchor: "start", size: 13, fill: nail ? YEL : TEXT, weight: nail ? 600 : 400 });
        st.T(st.bg, W - 14, y(i) - 8, sv(c.E) + " V", { anchor: "end", size: 13, fill: nail ? YEL : TEXT });
        st.T(st.bg, 16, y(i) + 14, who, { anchor: "start", size: 11, fill: MUTED });
      });
      const arrow = s("line", { x1: ex + 22, x2: ex + 22, y1: y(2), y2: y(2), "stroke-width": 2, "stroke-dasharray": "5 4" });
      const head = s("polygon", {});
      const aLab = st.T(st.fg, ex - 16, 0, "", { anchor: "end", size: 12, weight: 600 }); aLab.classList.add("c-halo");
      st.fg.append(arrow, head);
      const e1 = s("circle", { r: 4.5, fill: YEL, stroke: DARK }), e2 = s("circle", { r: 4.5, fill: YEL, stroke: DARK });
      st.fg.append(e1, e2);
      const sE = stat("E°cell = E°(taker) − E°(iron)", "y"), sV = tstat("verdict", "");
      const status = h("div", { class: "cor-status" });
      const TXT = {
        Na: "Uphill by more than two volts. Sodium ions gave their electron away long ago and will not take iron's. <b>Salt is not what eats the nail</b> (it helps in another way: step 4).",
        "H2O/H2": "Uphill, at least under standard conditions. Water without air barely touches iron: a nail in boiled, sealed water stays bright for weeks.",
        H: `Downhill. Acid does dissolve iron, with hydrogen gas bubbling off (<em>The activity series</em>). But plain water holds only about one ten-millionth of a mole of H⁺ per litre, far too little to explain a rusty nail.`,
        "O2/OH": "Downhill by almost a volt. <b>Oxygen from the air, dissolved in the water, takes the electrons.</b> This is the reaction behind nearly all rusting.",
      };
      let pick = "Na", t = 0;
      function upd() {
        const i = R.findIndex((r) => r[0] === pick), dE = E(pick) - E_FE, down = dE > 0, col = down ? GRN : RED;
        arrow.setAttribute("y2", y(i) + (down ? -9 : 9)); arrow.setAttribute("stroke", col);
        const ty = y(i), d = down ? -1 : 1;
        head.setAttribute("points", `${ex + 22},${ty} ${ex + 17},${ty + d * 10} ${ex + 27},${ty + d * 10}`); head.setAttribute("fill", col);
        aLab.setAttribute("y", (y(2) + y(i)) / 2 + 4); aLab.textContent = sv(dE) + " V"; aLab.style.fill = col;
        sE.set(`${sv(E(pick))} − (${sv(E_FE)}) = ${sv(dE)} V`);
        sV.set(down ? "spontaneous: the nail corrodes" : "not spontaneous: nothing happens");
        sV.querySelector(".v").style.color = col;
        status.innerHTML = TXT[pick];
        t = 0;
      }
      sE.querySelector(".v").style.fontSize = "18px";
      const stop = loop(() => {
        t = (t + 1) % 110;
        const i = R.findIndex((r) => r[0] === pick), y0 = y(2) - 5, y1 = y(i) - 5, down = E(pick) > E_FE, u = Math.min(1, t / 70);
        const yy = down ? y0 + (y1 - y0) * u * u : y0 + (y1 - y0) * 0.45 * Math.sin(Math.PI * u);
        e1.setAttribute("cx", ex - 6); e2.setAttribute("cx", ex + 6); e1.setAttribute("cy", yy); e2.setAttribute("cy", yy);
      });
      el.append(widget("Iron's two electrons on the potential ladder (rungs not to scale)",
        toggle("Who takes them?", [["Na", "Na⁺"], ["H2O/H2", "H₂O"], ["H", "H⁺"], ["O2/OH", "O₂"]], pick, (v) => { pick = v; upd(); }),
        st.svg, h("div", { class: "readout" }, sE, sV), status));
      upd();
      el.append(
        P("Only one ordinary ingredient of the glass sits below iron on the ladder: oxygen. Its half-reaction is worth knowing by heart, because it is the electron taker whenever a metal meets damp air:"),
        formula(`<span class="hl">${f("O2")}</span> + ${f("2H2O")} + <span class="hl">4e⁻</span> → ${f("4OH^-")}<small>oxygen reduction: each O goes from oxidation number 0 in O₂ to −2 in OH⁻, so one O₂ molecule takes four electrons</small>`),
        P(`A metal being eaten by its surroundings in this way is called <b>corrosion</b>. (E° assumes <em>standard conditions</em>, here 1 mol/L of OH⁻. Plain water has far less, which makes the real drop even larger; the lesson <em>Concentration and the Nernst equation</em> shows how to correct for that.)`),
        takeaway(`Corrosion is a metal being oxidised by its surroundings. For iron in water the electron taker is dissolved oxygen: ${f("O2 + 2H2O + 4e- -> 4OH^-")}.`)
      );
      return stop;
    },
    check: {
      type: "number",
      q: `Treat rusting as a cell: iron is the giver (E° = ${sv(E_FE)} V), oxygen the taker (E° = ${sv(E_O2)} V). What is E°cell, in volts?`,
      answer: +(E_O2 - E_FE).toFixed(2), tolerance: 0.006,
      hint: "E°cell = E°(taker) − E°(giver), and subtracting a negative number adds.",
      why: `${sv(E_O2)} − (${sv(E_FE)}) = ${sv(E_O2 - E_FE)} V. Positive, so iron and damp air react by themselves.`,
    },
  });

  // ---------------------------------------------------------------- 2
  steps.push({
    title: "One piece of metal, two jobs",
    short: "Anodic and cathodic sites",
    newConcepts: ["sites", "corrcell"],
    render(el) {
      el.append(
        P("In the <em>Daniell cell</em> (from <em>The galvanic cell</em>) the two half-reactions sat in two beakers, joined by a wire. On the nail they sit a few millimetres apart <b>on the same piece of metal</b>. Watch a single drop of water on an iron plate."),
        P("Under the middle of the drop, iron atoms leave as Fe²⁺. Their electrons cannot follow them into the water, so they travel <b>through the metal</b> to the rim of the drop, where oxygen from the air has the shortest way in. There an O₂ molecule takes them and becomes OH⁻.")
      );
      const W = narrow(520, 400), H = 262, cx = W / 2, rx = W * 0.37, base = 170, st = makeStage(W, H);
      st.R(st.bg, 8, base, W - 16, 84, { fill: IRON, rx: 3 });
      st.bg.append(s("path", { d: `M${cx - rx} ${base} A${rx} 100 0 0 1 ${cx + rx} ${base} Z`, fill: WATER, "fill-opacity": 0.2, stroke: WATER, "stroke-opacity": 0.7 }));
      const pit = s("path", { fill: DARK, opacity: 0.85 }); st.mid.append(pit);
      st.T(st.bg, 14, 18, "air", { anchor: "start", fill: MUTED });
      const gPlain = s("g"), gNames = s("g"); st.fg.append(gPlain, gNames);
      st.T(gPlain, cx, base - 78, "water drop", { fill: MUTED });
      st.T(gPlain, W - 16, base + 72, "iron", { anchor: "end", fill: DARK, weight: 700 });
      st.T(gNames, cx, base - 78, "ion path: the water", { fill: BLUE, weight: 600 });
      st.T(gNames, cx, base + 38, "anodic site", { fill: DARK, weight: 700 });
      st.T(gNames, cx, base + 53, "iron dissolves", { fill: DARK, size: 11 });
      for (const d of [-1, 1]) {
        st.T(gNames, cx + d * rx * 0.86, base + 38, "cathodic site", { fill: DARK, weight: 700 });
        st.T(gNames, cx + d * rx * 0.86, base + 53, "O₂ is reduced", { fill: DARK, size: 11 });
      }
      st.T(gNames, cx, base + 75, "electron path: the iron itself", { fill: DARK, size: 11, weight: 700 });
      gNames.setAttribute("display", "none");
      const sFe = stat("Fe²⁺ released", "r"), sEl = stat("electrons through the metal", "y"), sO = stat("O₂ consumed", ""), sOH = stat("OH⁻ made", "b");
      let nFe = 0, nE = 0, nO = 0, nOH = 0, side = 1, busy = false, running = true, wait = 10, rounds = 0;
      const rustN = { "-1": 0, 1: 0 };
      const draw = () => {
        sFe.set(String(nFe)); sEl.set(String(nE)); sO.set(String(nO)); sOH.set(String(nOH));
        const d = Math.min(26, rounds * 1.3);
        pit.setAttribute("d", `M${cx - 20} ${base} A20 ${Math.max(0.1, d)} 0 0 0 ${cx + 20} ${base} Z`);
      };
      function go() {
        if (busy) return;
        busy = true; side = -side; const sd = side, xc = cx + sd * rx * 0.86;
        nFe += 2; rounds++; draw();
        round(st, {
          ions: [0, 1].map((k) => ({ label: "Fe", path: [[cx - 8 + 16 * k, base - 6], [cx + sd * rx * 0.2, base - 46 - 12 * k], [cx + sd * rx * (0.42 + 0.08 * k), base - 14]] })),
          ePath: [[cx, base + 14], [xc, base + 18], [xc, base + 6]],
          takers: [{ kind: "o2", path: [[cx + sd * (rx + 24), 34], [cx + sd * rx * 0.93, base - 34], [xc, base - 10]] }],
          products: [0, 1, 2, 3].map((j) => ({ kind: "an", label: "OH", delay: j * 4, path: [[xc, base - 11], [cx + sd * rx * (0.74 - 0.05 * j), base - 26 - 5 * (j % 2)], [cx + sd * rx * (0.56 - 0.04 * j), base - 12]] })),
          onDone: () => {
            nE += 4; nO += 1; nOH += 4; draw();
            st.after(46, () => {
              for (let k = 0; k < 2; k++) {
                const m = rustN[sd]++; if (m > 44) break;
                st.mid.append(s("circle", { cx: cx + sd * rx * (0.4 + 0.02 * (m % 9)), cy: base - 3 - 5 * Math.floor(m / 9), r: 3.2, fill: RUST }));
              }
              busy = false; wait = 14;
            });
          },
        });
      }
      const runBtn = h("button", { onclick: () => { running = !running; runBtn.textContent = running ? "Pause" : "Run"; } }, "Pause");
      const stop = loop(() => { st.tick(); if (running && !busy && --wait <= 0) go(); });
      el.append(widget("A drop of water on iron, seen from the side (2 Fe atoms, 4 electrons and 1 O₂ per round)",
        st.svg, legend(LEG.concat([["solid that forms where Fe²⁺ meets OH⁻", RUST]])),
        h("div", { class: "btns" }, h("button", { class: "primary", onclick: go }, "One round"), runBtn),
        toggle("Show", [["all", "everything"], ["e", "electrons only"], ["ion", "ions only"]], "all", (v) => st.setHl(v)),
        toggle("Labels", [[0, "plain"], [1, "as a galvanic cell"]], 0, (v) => { gNames.setAttribute("display", v ? "" : "none"); gPlain.setAttribute("display", v ? "none" : ""); }),
        h("div", { class: "readout" }, sFe, sEl, sO, sOH)));
      draw();
      el.append(
        P("Switch the labels to <em>as a galvanic cell</em>. The spot where metal dissolves is an <b>anodic site</b> (<em>anode</em> = where oxidation happens). The spot where oxygen is reduced is a <b>cathodic site</b>. The metal between them plays the wire, and the water plays the <em>salt bridge</em>: ions drift through it and keep both sites neutral."),
        P("Together they form a <b>corrosion cell</b>: a galvanic cell that is short-circuited from birth. Its electrons do no work on the way, so all the energy ends up as a little heat. Which spots become anodic is decided by small differences: less oxygen (as here), a scratch, an impurity, a bent or hammered region."),
        takeaway("Rusting is a short-circuited galvanic cell on one piece of metal: iron dissolves at anodic sites, oxygen takes the electrons at cathodic sites, the metal is the wire and the water is the ion path.")
      );
      return stop;
    },
    check: {
      type: "choice",
      q: "A drop of salty water sits on a steel plate for a week. Where is the deepest hole in the steel?",
      options: ["At the rim of the drop, where the most oxygen reaches the steel", "Under the middle of the drop, where the least oxygen reaches the steel", "Nowhere in particular: the loss is spread evenly under the drop"],
      answer: 1,
      wrongHints: {
        0: "Oxygen does its work at the rim, but its work is taking electrons. The metal that supplies them dissolves somewhere else. Watch where the red Fe²⁺ dots come from.",
        2: "The two half-reactions happen at different spots. Only the anodic site loses metal.",
      },
      why: "Under the middle. The oxygen-rich rim is the cathodic site and stays intact; the oxygen-poor middle is the anodic site and supplies the electrons by dissolving.",
    },
  });

  // ---------------------------------------------------------------- 3
  steps.push({
    title: "From dissolved iron to rust",
    short: "Rust chemistry",
    newConcepts: ["rust"],
    render(el) {
      el.append(
        P("Fe²⁺ drifts away from the anodic site, OH⁻ from the cathodic site. Where they meet, opposite charges pack into a solid, just as Na⁺ and Cl⁻ did in <em>Ions, salts and electrolytes</em>. <em>Charge balance</em> fixes the formula: one 2+ ion needs two 1− ions, so it is Fe(OH)₂, iron(II) hydroxide. The (II) is iron's <em>oxidation number</em>."),
        P("It does not stay that way. Oxygen takes <b>one more electron</b> from each iron, lifting it from +2 to +3. The product is <b>rust</b>: Fe₂O₃·xH₂O, iron(III) oxide with a variable amount of water (the x) locked into the solid. Walk through the four stages:")
      );
      const ST = [
        { name: "iron metal", eq: "Fe", ox: 0, e: 0, col: IRON, note: "In the nail: neutral atoms, oxidation number 0." },
        { name: "dissolved Fe²⁺", eq: "Fe -> Fe^2+ + 2e-", ox: 2, e: 2, col: RED, note: "At an anodic site. Oxidation: two electrons leave through the metal, the ion leaves through the water." },
        { name: "iron(II) hydroxide", eq: "Fe^2+ + 2OH^- -> Fe(OH)2", ox: 2, e: 2, col: "#9fc7a8", note: "Fe²⁺ meets OH⁻ from a cathodic site and a pale green solid forms. No electron moves: iron stays at +2, so this stage is not redox." },
        { name: "rust", eq: "4Fe(OH)2 + O2 -> 2Fe2O3·H2O + 2H2O", ox: 3, e: 3, col: RUST, note: "Oxygen takes one more electron per iron (+2 → +3). Red-brown rust, written here with x = 1." },
      ];
      const W = narrow(520, 380), st = makeStage(W, 96, 620), xs = ST.map((_, i) => W * (0.125 + 0.25 * i));
      const ARROW = ["−2e⁻", "+2OH⁻", "−1e⁻ to O₂"], NR = narrow(23, 19);
      const nodes = ST.map((d, i) => {
        const c = s("circle", { cx: xs[i], cy: 36, r: NR, fill: d.col, stroke: DARK, "stroke-width": 3 }); st.mid.append(c);
        st.T(st.mid, xs[i], 40, ["Fe", "Fe²⁺", "Fe(OH)₂", "rust"][i], { size: i === 2 ? narrow(9.5, 7.6) : 11, fill: DARK, weight: 700 });
        st.T(st.mid, xs[i], 80, d.name, { size: narrow(11, 9.4), fill: MUTED });
        if (i < 3) {
          st.bg.append(s("line", { x1: xs[i] + NR + 5, x2: xs[i + 1] - NR - 11, y1: 36, y2: 36, stroke: "#4a5568", "stroke-width": 2 }));
          st.bg.append(s("polygon", { points: `${xs[i + 1] - NR - 4},36 ${xs[i + 1] - NR - 12},32 ${xs[i + 1] - NR - 12},40`, fill: "#4a5568" }));
          st.T(st.bg, (xs[i] + xs[i + 1]) / 2, 27, ARROW[i], { size: narrow(10, 8.6), fill: i === 1 ? BLUE : YEL });
        }
        return c;
      });
      const eq = h("div", { class: "cor-eq" }), note = h("div", { class: "cor-status" });
      const boxes = [0, 2, 3].map((v) => h("span", { class: "box" }, v ? "+" + v : "0"));
      const sLost = stat("electrons lost per iron atom so far", "y");
      let cur = 0;
      const tg = toggle("Stage", ST.map((d, i) => [i, `${i + 1}. ${d.name}`]), 0, (v) => { cur = v; upd(); });
      function upd() {
        const d = ST[cur];
        nodes.forEach((c, i) => { c.setAttribute("stroke", i === cur ? YEL : DARK); c.setAttribute("opacity", i <= cur ? 1 : 0.35); });
        eq.textContent = f(d.eq);
        note.innerHTML = d.note + (cur === 3 ? `<br>All stages added up: <b>${f("4Fe + 3O2 + 2H2O -> 2Fe2O3·H2O")}</b>. Electron ledger: 4 Fe × 3 e⁻ = 12 e⁻ = 3 O₂ × 4 e⁻.` : "");
        boxes.forEach((b, i) => b.classList.toggle("on", [0, 2, 3][i] === d.ox));
        sLost.set(String(d.e));
      }
      el.append(widget("One iron atom's way out of the nail", tg, st.svg, eq,
        h("div", { class: "cor-ox" }, "oxidation number of Fe:", ...boxes), h("div", { class: "readout" }, sLost), note));
      upd();

      // the nail, by mass
      const nFe = NAIL_G / M_FE, M_OX = 2 * M_FE + 3 * M_O;
      const NW = narrow(520, 380), nail = makeStage(NW, 84, 620);
      const shell = nail.R(nail.mid, 40, 0, NW - 110, 0, { fill: RUST, rx: 4 }), core = nail.R(nail.mid, 40, 0, NW - 110, 0, { fill: IRON, rx: 2 });
      const headS = nail.R(nail.mid, 0, 0, 0, 0, { fill: RUST, rx: 3 }), headC = nail.R(nail.mid, 0, 0, 0, 0, { fill: IRON, rx: 2 });
      const s1 = stat("iron metal left", ""), s2 = stat("rust formed (weighed dry, as Fe₂O₃)", "r"), s3 = stat("oxygen taken out of the air", "b");
      function nailUpd(p) {
        const tc = 22 * Math.sqrt(1 - p), ts = p > 0 ? 22 * Math.sqrt(1 - p + 2.14 * p) : 0;
        core.setAttribute("y", 42 - tc / 2); core.setAttribute("height", tc);
        shell.setAttribute("y", 42 - ts / 2); shell.setAttribute("height", ts);
        headC.setAttribute("x", 28); headC.setAttribute("width", 12); headC.setAttribute("y", 42 - tc); headC.setAttribute("height", 2 * tc);
        headS.setAttribute("x", 28 - (ts - tc) / 2); headS.setAttribute("width", p > 0 ? 12 + (ts - tc) : 0); headS.setAttribute("y", 42 - ts * 0.92); headS.setAttribute("height", 1.84 * ts);
        s1.set((NAIL_G * (1 - p)).toFixed(2) + " g"); s2.set(((nFe * p) / 2 * M_OX).toFixed(2) + " g"); s3.set((nFe * p * 0.75 * 2 * M_O).toFixed(2) + " g");
      }
      el.append(widget(`The ${NAIL_G} g nail (0.100 mol Fe): let it rust`,
        slider({ name: "rusted", min: 0, max: 1, step: 0.01, value: 0.3, fmtv: (x) => Math.round(x * 100) + "%", oninput: nailUpd }),
        nail.svg, h("div", { class: "readout" }, s1, s2, s3),
        h("p", { class: "note", style: "margin:10px 0 0", html: "Drawn with dry Fe₂O₃ taking 2.14 times the volume of the iron it replaces (measured ratio for this oxide); real, water-holding rust is bulkier still." })));
      nailUpd(0.3);
      el.append(
        P("Two things to notice. The rust weighs <b>more</b> than the iron it came from: the extra mass is oxygen pulled out of the air. And it takes up more than twice the room, so it cracks, flakes and stays porous. Water and oxygen keep reaching fresh metal underneath, which means <b>rusting never stops by itself</b>. Keep that in mind for step 8."),
        takeaway(`Rust chemistry: ${f("Fe -> Fe^2+")} at the anodic site, ${f("Fe^2+ + 2OH^- -> Fe(OH)2")} where the ions meet, then oxygen lifts iron to +3: Fe₂O₃·xH₂O, a porous crust that protects nothing.`)
      );
    },
    check: {
      type: "number",
      q: "Four iron atoms go all the way from metal (0) to rust (+3). How many O₂ molecules are needed to take their electrons?",
      answer: 3, tolerance: 0,
      hint: "Count electrons: 4 atoms × 3 electrons each. One O₂ takes 4 (step 1).",
      why: "4 × 3 = 12 electrons, and each O₂ takes 4, so 3 O₂. That is the 4 : 3 in 4Fe + 3O₂ + 2H₂O → 2Fe₂O₃·H₂O.",
      backTo: 0,
    },
  });

  // ---------------------------------------------------------------- 4
  steps.push({
    title: "Three ingredients: water, oxygen, and why salt hurts",
    short: "Water, oxygen, salt",
    newConcepts: ["needs", "barrier"],
    render(el) {
      el.append(
        P("A corrosion cell needs the same four parts as any <em>galvanic cell</em>: something to oxidise (the iron), something to take the electrons (oxygen), an electron path (the metal) and an <b>ion path</b> between the two sites. The ion path has to be an <em>electrolyte</em> (from <em>Ions, salts and electrolytes</em>): a liquid with mobile ions."),
        P("Take one part away and the cell is dead. This is the classic school experiment: a nail in a test tube, and you decide what else gets in.")
      );
      const W = narrow(440, 340), H = 250, cx = W / 2, st = makeStage(W, H, 460);
      const gScene = s("g"); st.bg.append(gScene);
      const r = rng(11);
      let water = true, oxy = true, salt = false, days = 10, free = [];
      const sRate = tstat("speed of rusting", "y"), sAmt = stat("rust so far (toy units)", "r");
      const items = [0, 1, 2, 3].map(() => h("li", {}));
      const list = h("ul", { class: "cor-list" }, ...items);
      const status = h("div", { class: "cor-status" });
      const rate = () => (water && oxy ? (salt ? 3 : 1) : 0);
      function build() {
        gScene.innerHTML = ""; st.clearParts(); free.forEach((p) => p.g.remove()); free = [];
        const T = (x, y, t, o) => st.T(gScene, x, y, t, o);
        if (water) gScene.append(s("path", { d: `M${cx - 45} 84 V196 A45 35 0 0 0 ${cx + 45} 196 V84 Z`, fill: WATER, "fill-opacity": 0.24 }));
        gScene.append(s("path", { d: `M${cx - 46} 24 V196 A46 36 0 0 0 ${cx + 46} 196 V24`, fill: "none", stroke: "#6b7689", "stroke-width": 2 }));
        if (!oxy) {
          st.R(gScene, cx - 42, 12, 84, 16, { fill: "#8a6a4a", rx: 3 }); T(cx + 54, 24, "sealed", { anchor: "start", fill: MUTED, size: 11 });
          if (water) { st.R(gScene, cx - 45, 74, 90, 10, { fill: "#d9b44a", "fill-opacity": 0.55 }); T(cx + 54, 83, "oil layer", { anchor: "start", fill: MUTED, size: 11 }); T(cx - 54, 130, "boiled water", { anchor: "end", fill: MUTED, size: 11 }); T(cx - 54, 144, "(air driven out)", { anchor: "end", fill: MUTED, size: 10 }); }
        } else T(cx + 54, 40, "open to the air", { anchor: "start", fill: MUTED, size: 11 });
        if (!water) {
          T(cx - 54, 130, "dry air", { anchor: "end", fill: MUTED, size: 11 });
          if (salt) { for (let i = 0; i < 9; i++) st.R(gScene, cx - 30 + i * 7, 216 - (i % 2) * 5, 5, 5, { fill: "#eef1f6" }); T(cx + 54, 218, "dry salt crystals", { anchor: "start", fill: MUTED, size: 11 }); }
        } else if (oxy) T(cx - 54, 130, salt ? "salt water" : "tap water", { anchor: "end", fill: MUTED, size: 11 });
        // nail and its rust
        const a = clamp((rate() * days) / 30, 0, 1);
        st.R(gScene, cx - 5, 60, 10, 142, { fill: IRON, rx: 2 }); st.R(gScene, cx - 12, 53, 24, 7, { fill: IRON, rx: 2 });
        if (a > 0) {
          st.R(gScene, cx - 5 - 3 * a, 88, 10 + 6 * a, 114, { fill: RUST, "fill-opacity": Math.min(0.95, 0.25 + a), rx: 3 });
          const rr = rng(5);
          for (let i = 0; i < Math.round(a * 26); i++) gScene.append(s("circle", { cx: cx + (rr() - 0.5) * (30 + 30 * a), cy: 205 + rr() * 20, r: 2 + rr() * 2, fill: RUST }));
        }
        // free particles that wander
        const add = (kind, label, box) => { const p = st.spawn(kind, [[box[0] + r() * (box[2] - box[0]), box[1] + r() * (box[3] - box[1])]], { label, stay: true }); p.box = box; p.vx = (r() - 0.5) * 0.8; p.vy = (r() - 0.5) * 0.8; free.push(p); };
        const wl = [cx - 34, 98, cx - 12, 200], wr = [cx + 12, 98, cx + 34, 200];
        if (oxy) { add("o2", null, [cx - 34, 36, cx - 12, water ? 70 : 190]); add("o2", null, [cx + 12, 36, cx + 34, water ? 70 : 190]); }
        if (oxy && water) { add("o2", null, wl); add("o2", null, wr); }
        if (salt && water) { add("cat", "Na", wl); add("cat", "Na", wr); add("an", "Cl", wl); add("an", "Cl", wr); }
      }
      function upd() {
        build();
        const rt = rate();
        sRate.set(rt === 0 ? "stopped" : rt === 1 ? "1× (slow and steady)" : "about 3× (toy figure)");
        sAmt.set((rt * days / 10).toFixed(1));
        const li = (i, ok, txt) => { items[i].className = ok ? "cor-ok" : "cor-no"; items[i].textContent = (ok ? "✓ " : "✗ ") + txt; };
        li(0, true, "something to oxidise: the iron");
        li(1, true, "electron path between the sites: the iron itself");
        li(2, oxy, oxy ? "electron taker: O₂" : "electron taker: none (no oxygen)");
        li(3, water, water ? (salt ? "ion path: salt water, a good electrolyte" : "ion path: tap water, a weak electrolyte (few ions)") : "ion path: none (no liquid, so no mobile ions)");
        status.innerHTML = !water ? (salt ? "Dry salt on dry iron does nothing: in a crystal the ions are locked in place, so it is not an electrolyte. Add water and it becomes the worst case." : "Bone-dry air: oxygen is there, but with no water there is nowhere for Fe²⁺ and OH⁻ to move. Desert cars and museum pieces survive this way.")
          : !oxy ? "Water but no oxygen: nothing takes the electrons, so practically no iron leaves. Iron objects buried in airless mud can survive for centuries."
          : salt ? "Everything is present, and Na⁺ and Cl⁻ carry charge between the sites easily. The cell runs several times faster, and anodic and cathodic sites can sit far apart."
          : "Everything is present. Tap water has few ions, so the cell runs, but slowly.";
      }
      const stop = loop(() => {
        for (const p of free) {
          p.x += p.vx; p.y += p.vy;
          if (p.x < p.box[0] || p.x > p.box[2]) p.vx = -p.vx;
          if (p.y < p.box[1] || p.y > p.box[3]) p.vy = -p.vy;
          p.g.setAttribute("transform", `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})`);
        }
      }, 50);
      el.append(widget("A nail in a test tube: choose what gets in, then wait",
        toggle("Water", [[0, "none (dry)"], [1, "water"]], 1, (v) => { water = !!v; upd(); }),
        toggle("Air", [[0, "no oxygen"], [1, "oxygen"]], 1, (v) => { oxy = !!v; upd(); }),
        toggle("Salt", [[0, "no salt"], [1, "salt (NaCl)"]], 0, (v) => { salt = !!v; upd(); }),
        slider({ name: "days", min: 0, max: 30, step: 1, value: days, fmtv: (x) => String(x), oninput: (v) => { days = v; upd(); } }),
        st.svg, legend([["O₂", O2COL], ["Na⁺", RED], ["Cl⁻", BLUE], ["rust", RUST]]),
        h("div", { class: "readout" }, sRate, sAmt), list, status));
      upd();
      el.append(
        P("Salt adds no new reaction: step 1 showed that Na⁺ cannot take iron's electrons. It makes the water a much better electrolyte, so charge moves between the sites with ease. That is why cars rust where roads are salted and why the sea is the harshest place for steel. <i>Water</i> includes the thin invisible film that humid air leaves on metal."),
        P("The same list gives the cheapest protection, a <b>barrier coating</b>: paint, grease, enamel or plastic keeps water and oxygen off the metal, so no cell can form. It works for as long as the coating has no hole."),
        takeaway("Rusting needs iron, oxygen and an electrolyte together. Remove water or oxygen and it stops; add salt and it speeds up. A barrier coating works by keeping two of the three away.")
      );
      return stop;
    },
    check: {
      type: "choice",
      q: "A nail is put into salt water that was boiled to drive out the dissolved air, and the tube is sealed under a layer of oil. What does it look like after a month?",
      options: ["Almost unchanged: nothing in the tube can take iron's electrons", "Heavily rusted: salt water is the most corrosive case", "Heavily rusted: with no O₂ around, Na⁺ takes the electrons instead"],
      answer: 0,
      wrongHints: {
        1: "Salt water is the worst case only when oxygen is present. Salt improves the ion path; it does not supply an electron taker.",
        2: "Look at the ladder in step 1: Na⁺ sits far above iron, so that transfer is more than 2 V uphill.",
      },
      why: "Almost unchanged. The ion path is excellent, but with no oxygen there is no cathodic reaction, and a cell with only one half-reaction cannot run.",
      backTo: 0,
    },
  });

  // ---------------------------------------------------------------- 5
  steps.push({
    title: "Two metals touching: galvanic corrosion",
    short: "Galvanic corrosion",
    newConcepts: ["galvcorr", "area"],
    render(el) {
      el.append(
        P("So far the anodic and cathodic sites were on one metal and differed only by accident. Now bolt <b>two different metals</b> together and wet them. The <em>potential ladder</em> hands out the roles at once: the metal with the more negative E° gives electrons, exactly as in a <em>galvanic cell</em>."),
        P("That metal becomes one big anodic site and dissolves <b>faster than it would alone</b>. The other becomes the cathodic site: oxygen is reduced on its surface with borrowed electrons, and it stops corroding. This is <b>galvanic corrosion</b>.")
      );
      const W = narrow(520, 400), H = 236, st = makeStage(W, H), top = 104, x0 = 12, x1 = W - 12;
      st.R(st.bg, x0, 34, x1 - x0, top - 34, { fill: WATER, "fill-opacity": 0.2 });
      st.T(st.bg, x0 + 4, 28, "salt water", { anchor: "start", fill: MUTED, size: 11 });
      const bl = st.R(st.bg, x0, top, 10, 90, {}), br = st.R(st.bg, x0, top, 10, 90, {});
      const eaten = st.R(st.mid, 0, top, 0, 0, { fill: "#1b2636" });
      const lab = [0, 1].map(() => [st.T(st.fg, 0, 212, "", { weight: 600 }), st.T(st.fg, 0, 228, "", { size: 11, fill: MUTED }), st.T(st.fg, 0, top + 62, "", { fill: DARK, weight: 700, size: 11 })]);
      const sA = tstat("corrodes (anode)", "r"), sC = tstat("protected (cathode)", "g"), sG = stat("E° gap", "y"), sX = stat("attack on the anode", "r");
      const status = h("div", { class: "cor-status" });
      let a = "Fe", b = "Cu", share = 0.5, busy = false, wait = 5, depth = 0, C = null;
      function upd() {
        st.clearParts(); busy = false; wait = 5; depth = 0;
        const J = x0 + share * (x1 - x0);
        bl.setAttribute("width", J - x0); bl.setAttribute("fill", MET[a].col);
        br.setAttribute("x", J); br.setAttribute("width", x1 - J); br.setAttribute("fill", MET[b].col);
        [[a, (x0 + J) / 2], [b, (J + x1) / 2]].forEach(([m, x], i) => {
          const edge = i === 0 ? Math.max(x, x0 + 44) : Math.min(x, x1 - 44);
          lab[i][0].setAttribute("x", edge); lab[i][0].textContent = MET[m].name;
          lab[i][1].setAttribute("x", edge); lab[i][1].textContent = `E° = ${sv(MET[m].E)} V`;
          lab[i][2].setAttribute("x", edge);
        });
        eaten.setAttribute("height", 0);
        if (a === b) {
          C = null; lab[0][2].textContent = ""; lab[1][2].textContent = "";
          sA.set("–"); sC.set("–"); sG.set("0.00 V"); sX.set("×1.0");
          status.innerHTML = "Same metal on both sides: no gap on the ladder, so no galvanic pair. Each piece does whatever that metal does alone.";
          return;
        }
        const aLeft = MET[a].E < MET[b].E, an = aLeft ? a : b, ca = aLeft ? b : a, sAn = aLeft ? share : 1 - share, k = 1 + (1 - sAn) / sAn;
        const xa0 = aLeft ? x0 : J, xa1 = aLeft ? J : x1, xA = (xa0 + xa1) / 2, xC = aLeft ? (J + x1) / 2 : (x0 + J) / 2, gap = MET[ca].E - MET[an].E;
        C = { an, ca, xA, xC, J, xa0, xa1, k, gap, dir: aLeft ? 1 : -1 };
        lab[aLeft ? 0 : 1][2].textContent = "anode"; lab[aLeft ? 1 : 0][2].textContent = "cathode";
        sA.set(MET[an].name); sC.set(MET[ca].name); sG.set(gap.toFixed(2) + " V"); sX.set("×" + k.toFixed(1));
        status.innerHTML = `${MET[an].name[0].toUpperCase() + MET[an].name.slice(1)} is higher on the ladder (${sv(MET[an].E)} V), so it gives the electrons and dissolves. Oxygen is reduced on the ${MET[ca].name}, which only lends its surface. `
          + (sAn < 0.3 ? `The anode is small and the cathode large: all the oxygen caught by the big surface is paid for by a little metal, <b>about ${k.toFixed(1)} times</b> the attack it would suffer alone.` : sAn > 0.7 ? "The anode is large and the cathode small: the extra loss is spread thin and hardly matters." : "With equal areas the anode pays for its own oxygen and its neighbour's: roughly twice the attack.");
      }
      function go() {
        if (!C || busy || depth >= 58) return;
        busy = true;
        const { xA, xC, J, dir, an } = C, yb = top + depth;
        round(st, {
          speed: 2 + C.gap * 0.7,
          ions: [0, 1].map((q) => ({ label: an, path: [[xA - 7 + 14 * q, yb - 6], [xA - 16 + 32 * q, 62], [xA - 22 + 44 * q, 44]] })),
          ePath: [[xA, yb + 12], [J, top + 40], [xC, top + 22], [xC, top + 6]],
          takers: [{ kind: "o2", path: [[xC + dir * 26, 40], [xC, top - 10]] }],
          products: ohFan(xC, top - 11, dir),
          onDone: () => {
            depth = Math.min(58, depth + 300 / (C.xa1 - C.xa0));
            eaten.setAttribute("x", C.xa0); eaten.setAttribute("width", C.xa1 - C.xa0); eaten.setAttribute("height", depth);
            if (depth >= 58) status.innerHTML = `<b>The ${MET[an].name} is nearly eaten through.</b> Change something to start again.`;
            busy = false; wait = clamp(Math.round(34 / C.k), 3, 30);
          },
        });
      }
      const stop = loop(() => { st.tick(); if (!busy && --wait <= 0) go(); });
      const opts = Object.keys(MET).map((k) => [k, k]);
      el.append(widget("Two metals in contact under salt water (E° from the course table)",
        toggle("Left metal", opts, a, (v) => { a = v; upd(); }),
        toggle("Right metal", opts, b, (v) => { b = v; upd(); }),
        toggle("Left metal covers", [[0.15, "15% of the surface"], [0.5, "half"], [0.85, "85%"]], share, (v) => { share = v; upd(); }),
        st.svg, legend(LEG), h("div", { class: "readout" }, sA, sC, sG, sX), status,
        h("p", { class: "note", style: "margin:10px 0 0", html: "The attack figure is a simple model: it assumes oxygen supply sets the pace and every bit of wet surface catches the same amount of it." })));
      upd();
      el.append(
        P("Notice what the cathode metal does chemically: nothing. None of its ions are in the water, so nothing plates out. It only offers surface for oxygen. That is why <b>area</b> matters: every square centimetre of cathode collects oxygen, and all those electrons come out of the anode. A small anode joined to a large cathode is eaten fast; a large anode with a small cathode barely notices."),
        P("A famous case: the Statue of Liberty is a copper skin on an iron frame. The shellac-soaked insulating layer between them wore out, the iron became the anode, and in the 1980s restoration the corroded iron bars were replaced with stainless steel. (E° ranks metals well enough for us. Engineers use a ranking measured in real seawater, the <i>galvanic series</i>, which differs here and there because of surface films: step 8.)"),
        takeaway("Galvanic corrosion: when two metals touch in an electrolyte, the one higher on the ladder (more negative E°) becomes the anode and corrodes faster, the other is protected. Small anode + large cathode is the dangerous combination.")
      );
      return stop;
    },
    check: {
      type: "choice",
      q: "A boat builder can use iron plates held by copper rivets, or copper plates held by iron rivets. Both boats go into the sea. Which fails first?",
      options: ["Iron plates with copper rivets: there is far more iron to corrode", "Copper plates with iron rivets: a tiny anode pays for a huge cathode", "Both at the same time: the E° gap is 0.78 V either way"],
      answer: 1,
      wrongHints: {
        0: "Iron is the anode in both boats. With big plates the loss is spread over a large area; think about what happens when the anode is small.",
        2: "The gap decides who is the anode, and it is iron both times. How fast a given spot is eaten also depends on the areas.",
      },
      why: "Copper plates with iron rivets. Iron is the anode either way, but as small rivets it must supply all the oxygen landing on the big copper surface, and the rivets disappear.",
    },
  });

  // ---------------------------------------------------------------- 6
  steps.push({
    title: "A metal that dies for the steel",
    short: "Sacrificial zinc",
    newConcepts: ["sacrificial", "galvanising"],
    render(el) {
      el.append(
        P(`Galvanic corrosion protects one metal at the cost of the other. So turn it around. If iron touches a metal <b>higher</b> on the ladder, iron is the cathode, and the cathode does not corrode. Zinc (${sv(MET.Zn.E)} V) and magnesium (${sv(MET.Mg.E)} V) both sit above iron (${sv(E_FE)} V).`),
        P("A piece of such a metal, attached to steel on purpose so that it dissolves in the steel's place, is a <b>sacrificial anode</b>. Its most common form is a thin zinc coat over the whole steel surface, usually made by dipping the steel into molten zinc: <b>galvanising</b>. Buckets, lamp posts, car bodies and roofing nails are galvanised."),
        P("Compare zinc with two other coatings. Then scratch each one down to the steel.")
      );
      const W = narrow(520, 400), H = 196, cx = W / 2, st = makeStage(W, H), x0 = 12, x1 = W - 12, cy0 = 92, top = 104;
      const wfill = { fill: WATER, "fill-opacity": 0.2 };
      st.R(st.bg, x0, 26, x1 - x0, cy0 - 26, wfill);
      st.T(st.bg, x0 + 4, 20, "rain water with dissolved air", { anchor: "start", fill: MUTED, size: 11 });
      st.R(st.bg, x0, top, x1 - x0, 86, { fill: IRON });
      st.T(st.fg, x1 - 6, top + 76, "steel (iron)", { anchor: "end", fill: DARK, weight: 700 });
      const gCoat = s("g"); st.mid.append(gCoat);
      const pit = st.R(st.mid, cx - 20, top, 40, 0, { fill: "#1b2636" });
      const gRust = s("g"); st.mid.append(gRust);
      const COAT = { bare: { name: "bare steel" }, paint: { name: "paint", col: "#c0453a" }, tin: { name: "tin", col: MET.Sn.col, E: MET.Sn.E }, zinc: { name: "zinc", col: MET.Zn.col, E: MET.Zn.E } };
      const sD = tstat("dissolving now", "r"), sI = tstat("the steel", ""), sG = stat("E° of coating vs E° of iron", "y"), sFe = stat("Fe²⁺ lost", "r"), sZn = stat("Zn²⁺ lost", "");
      const status = h("div", { class: "cor-status" });
      const r = rng(3);
      let coat = "zinc", scratched = false, busy = false, wait = 6, zw = 26, depth = 0, nRust = 0, nFe = 0, nZn = 0, side = 1;
      const zincGone = () => zw >= 88;
      const mode = () => (coat === "bare" ? "bare" : !scratched ? (coat === "zinc" ? "zincIntact" : "blocked") : coat === "zinc" && zincGone() ? "paint" : coat);
      function drawCoat() {
        gCoat.innerHTML = "";
        if (coat === "bare") { st.R(gCoat, x0, cy0, x1 - x0, 12, wfill); return; }
        const g = scratched ? (coat === "zinc" ? zw : 26) : 0, col = COAT[coat].col;
        if (g > 0) { st.R(gCoat, x0, cy0, cx - g - x0, 12, { fill: col }); st.R(gCoat, cx + g, cy0, x1 - cx - g, 12, { fill: col }); st.R(gCoat, cx - g, cy0, 2 * g, 12, wfill); }
        else st.R(gCoat, x0, cy0, x1 - x0, 12, { fill: col });
        st.T(gCoat, x0 + 5, cy0 + 9.5, COAT[coat].name + " coat", { anchor: "start", size: 10, fill: coat === "paint" ? "#fff" : DARK, weight: 700 });
      }
      function text() {
        const m = mode();
        sFe.set(String(nFe)); sZn.set(String(nZn));
        sG.set(COAT[coat].E == null ? "–" : `${sv(COAT[coat].E)} vs ${sv(E_FE)} V`);
        sD.set(m === "blocked" ? "nothing" : m === "zinc" || m === "zincIntact" ? "zinc" : "iron");
        sI.set(m === "blocked" || m === "zincIntact" ? "sealed off" : m === "zinc" ? "bare but intact (cathode)" : m === "tin" ? "pitting fast" : "rusting");
        status.innerHTML = {
          bare: "Bare steel: anodic and cathodic sites all over, as on the nail.",
          blocked: coat === "paint" ? "Intact paint is a barrier: water and oxygen never reach the iron, so no cell forms." : "Intact tin is a barrier, like paint. Tin itself barely reacts with damp air.",
          zincIntact: "Intact zinc is a barrier too. The zinc surface itself weathers, but very slowly: its own corrosion products form a tight skin.",
          paint: coat === "zinc" ? "<b>The zinc near the scratch is used up.</b> From here on the bare iron has no bodyguard and rusts like any other." : "Paint is only a barrier. At the scratch a normal corrosion cell starts, and the rust creeps sideways under the paint and lifts it.",
          tin: `Tin (${sv(MET.Sn.E)} V) is <b>below</b> iron on the ladder, so the iron is the anode: a tiny one, next to a large tin cathode. The scratch is eaten faster than bare steel would be.`,
          zinc: `Zinc (${sv(MET.Zn.E)} V) is <b>above</b> iron, so zinc is the anode. It dissolves next to the scratch and sends its electrons into the steel; oxygen is reduced on the bare iron, which stays whole.`,
        }[m];
      }
      function upd() {
        st.clearParts(); gRust.innerHTML = ""; busy = false; wait = 6; zw = 26; depth = 0; nRust = 0; nFe = 0; nZn = 0;
        pit.setAttribute("height", 0); pit.setAttribute("x", coat === "bare" ? cx - W * 0.2 - 20 : cx - 20);
        drawCoat(); text();
      }
      const up2 = (x, yy, lab) => [0, 1].map((k) => ({ label: lab, path: [[x - 7 + 14 * k, yy], [x - 14 + 28 * k, 60], [x - 20 + 40 * k, 40]] }));
      function go() {
        if (busy) return;
        const m = mode();
        if (m === "blocked") { const x = x0 + 30 + r() * (x1 - x0 - 100); st.spawn("o2", [[x, 32], [x + 14, cy0 - 10], [x + 42, 30]], { speed: 1.5 }); wait = 34; return; }
        busy = true; side = -side;
        const sd = side, fin = (w, fn) => () => { if (fn) fn(); text(); busy = false; wait = w; };
        const dig = (d) => { depth = Math.min(54, depth + d); pit.setAttribute("height", depth); };
        if (m === "bare") {
          const xa = cx - W * 0.2, xc = cx + W * 0.2; nFe += 2;
          round(st, { ions: up2(xa, top - 6 + depth, "Fe"), ePath: [[xa, top + 14 + depth], [xc, top + 20], [xc, top + 6]], takers: [{ kind: "o2", path: [[xc + 24, 34], [xc, top - 10]] }], products: ohFan(xc, top - 11, 1), onDone: fin(16, () => dig(0.5)) });
        } else if (m === "paint") {
          nFe += 2;
          round(st, { ions: up2(cx - 10, top - 6 + depth, "Fe"), ePath: [[cx - 10, top + 10 + depth], [cx + 11, top + 14], [cx + 11, top + 5]], takers: [{ kind: "o2", path: [[cx + 30, 34], [cx + 11, top - 10]] }], products: ohFan(cx + 11, top - 11, 1),
            onDone: fin(14, () => { dig(1); if (nRust < 24) { const k = nRust++; gRust.append(s("circle", { cx: cx + (k % 2 ? 1 : -1) * (22 + 3.2 * Math.floor(k / 2)), cy: top - 1.5, r: 3.2, fill: RUST })); } }) });
        } else if (m === "tin") {
          const xc = cx + sd * W * 0.27; nFe += 2;
          round(st, { speed: 3.1, ions: up2(cx, top - 6 + depth, "Fe"), ePath: [[cx, top + 10 + depth], [cx + sd * 40, top + 18], [xc, top + 12], [xc, cy0 + 4]], takers: [{ kind: "o2", path: [[xc + sd * 22, 32], [xc, cy0 - 10]] }], products: ohFan(xc, cy0 - 11, sd), onDone: fin(3, () => dig(3.4)) });
        } else if (m === "zinc") {
          const ze = cx + sd * (zw + 5), xi = cx + sd * 10; nZn += 2;
          round(st, { ions: up2(ze, cy0 - 6, "Zn"), ePath: [[ze, cy0 + 6], [ze - sd * 3, top + 12], [xi, top + 12], [xi, top + 4]], takers: [{ kind: "o2", path: [[xi, 34], [xi, top - 10]] }], products: ohFan(xi, top - 11, -sd),
            onDone: fin(12, () => { zw = Math.min(88, zw + 1.6); drawCoat(); }) });
        } else {
          const xa = cx - W * 0.22, xc = cx + W * 0.22; nZn += 2;
          round(st, { speed: 1.6, ions: up2(xa, cy0 - 6, "Zn"), ePath: [[xa, cy0 + 6], [xc, cy0 + 7], [xc, cy0 + 4]], takers: [{ kind: "o2", path: [[xc + 24, 32], [xc, cy0 - 10]] }], products: ohFan(xc, cy0 - 11, 1), onDone: fin(70) });
        }
        text();
      }
      const stop = loop(() => { st.tick(); if (!busy && --wait <= 0) go(); });
      el.append(widget("Coated steel in the rain, seen from the side",
        toggle("Coating", [["bare", "none"], ["paint", "paint"], ["tin", "tin"], ["zinc", "zinc (galvanised)"]], coat, (v) => { coat = v; upd(); }),
        toggle("Surface", [[0, "intact"], [1, "scratched"]], 0, (v) => { scratched = !!v; upd(); }),
        st.svg, legend(LEG.concat([["rust", RUST]])), h("div", { class: "readout" }, sD, sI, sG, sFe, sZn), status));
      upd();
      el.append(
        P("Paint and tin are only barriers, and tin is a treacherous one: once scratched, it makes things worse than no coating at all. Zinc is a barrier <b>and</b> a bodyguard. A scratch does not matter until the zinc around it is used up, which on a thick coat takes many years."),
        takeaway("A sacrificial anode is a metal above iron on the ladder (zinc, magnesium) connected to the steel: it gives the electrons, so the iron does not have to. Galvanising is a sacrificial zinc coat that keeps working when scratched.")
      );
      return stop;
    },
    check: {
      type: "choice",
      q: `Two steel sheets are scratched through to the steel and left in the rain. One is tin-plated (tin: ${sv(MET.Sn.E)} V), one is galvanised (zinc: ${sv(MET.Zn.E)} V). Iron is at ${sv(E_FE)} V. Where does the iron rust?`,
      options: ["In both scratches: any hole lets water and oxygen reach the iron", "Only in the galvanised sheet: zinc is the more reactive metal, so that pair corrodes harder", "Only in the tin-plated sheet: there iron is the higher metal and has to give the electrons"],
      answer: 2,
      wrongHints: {
        0: "Water and oxygen do reach the iron in both. But oxygen takes its electrons from whichever connected metal gives them most readily. Compare each coating's E° with iron's.",
        1: "The galvanised pair does corrode harder, but ask which of its two metals dissolves. The one with the more negative E° is the anode.",
      },
      why: "Only the tin-plated one. Iron sits above tin, so iron is the anode there. Zinc sits above iron, so in the galvanised sheet the zinc dissolves and the iron is the protected cathode.",
      backTo: 4,
    },
  });

  // ---------------------------------------------------------------- 7
  steps.push({
    title: "Cathodic protection: feed the steel electrons",
    short: "Cathodic protection",
    newConcepts: ["cathprot", "impressed"],
    render(el) {
      el.append(
        P("The sacrificial anode shows a general principle. Iron corrodes only when <b>it</b> has to supply the electrons that oxygen takes. Supply them from somewhere else and the whole steel surface becomes a cathodic site: nothing dissolves. This is <b>cathodic protection</b>, and there are two ways to deliver the electrons."),
        h("ol", {},
          h("li", { html: "A <em>sacrificial anode</em> wired to the steel: magnesium blocks buried beside a pipeline, zinc blocks bolted to a ship. The cell runs by itself. The block is used up and has to be replaced." }),
          h("li", { html: "An outside source of direct current, like a battery charger. Its <b>negative</b> terminal goes to the steel, its positive terminal to an anode that does not dissolve (graphite, or titanium with a special coating). This is <b>impressed current</b>. Nothing is sacrificed except electrical energy, and the dose is adjustable. (Driving reactions with an outside source is the subject of <em>Electrolysis</em>.)" })),
        P("Here is a buried steel pipeline. Moist soil is its electrolyte.")
      );
      const W = narrow(540, 400), H = 252, st = makeStage(W, H, 660), gy = 58, px0 = 12, px1 = W * 0.6, py = 150, ph = 38;
      st.R(st.bg, 0, gy, W, H - gy, { fill: "#7a5a3a", "fill-opacity": 0.22 });
      st.bg.append(s("line", { x1: 0, x2: W, y1: gy, y2: gy, stroke: "#6b7689", "stroke-width": 1.5 }));
      st.T(st.bg, 8, gy + 16, "moist soil (the electrolyte)", { anchor: "start", fill: MUTED, size: 11 });
      st.R(st.bg, px0, py, px1 - px0, ph, { fill: IRON, rx: 19 });
      st.T(st.fg, px1 - 20, py + ph - 7, "steel pipe", { anchor: "end", fill: DARK, weight: 700, size: 11 });
      const gDyn = s("g"); st.mid.append(gDyn);
      const xa = W * 0.84, xcab = W * 0.48, xp = W * 0.27, xA = W * 0.09;
      const P_SRC = [[xa, 146], [xa, 30], [xcab, 30], [xcab, py + 13], [xp, py + 13], [xp, py + 5]];
      const sWho = tstat("electrons for the oxygen come from", "y"), sPct = stat("iron lost, vs unprotected", "r"), sFe = stat("Fe²⁺ lost so far", "r"), sV = tstat("verdict", "");
      const status = h("div", { class: "cor-status" });
      let mode = "none", dose = 100, mgLeft = 100, accS = 0, accH = 0, busy = false, wait = 6, nFe = 0;
      function drawDyn() {
        gDyn.innerHTML = "";
        if (mode === "none") return;
        gDyn.append(s("path", { d: `M${xcab} ${py} V30 H${xa} V140`, fill: "none", stroke: "#b9c2d3", "stroke-width": 2.5 }));
        if (mode === "mg") {
          const w = 44 * Math.max(0.2, mgLeft / 100);
          st.R(gDyn, xa - w / 2, 140, w, 62, { fill: MET.Mg.col, rx: 3, opacity: mgLeft > 0 ? 1 : 0.25 });
          st.T(gDyn, xa, 218, "magnesium block", { size: 11, fill: MUTED });
          st.T(gDyn, xa, 233, mgLeft > 0 ? Math.round(mgLeft) + "% left" : "used up", { size: 11, fill: mgLeft > 0 ? TEXT : RED, weight: 600 });
          st.T(gDyn, (xcab + xa) / 2, 22, "cable", { size: 10, fill: MUTED });
        } else {
          st.R(gDyn, xa - 9, 140, 18, 62, { fill: "#3a3f4a", stroke: "#c3a6ff", rx: 3 });
          st.T(gDyn, xa, 218, "inert anode", { size: 11, fill: MUTED });
          const bx = (xcab + xa) / 2;
          st.R(gDyn, bx - 32, 16, 64, 28, { fill: "#212734", stroke: "#b9c2d3", rx: 5 });
          st.T(gDyn, bx, 35, "−  DC  +", { fill: GRN, weight: 700, size: 12 });
        }
      }
      function text() {
        const pct = mode === "none" ? 100 : mode === "mg" ? (mgLeft > 0 ? 0 : 100) : Math.max(0, 100 - dose);
        sPct.set(pct + "%"); sFe.set(String(nFe));
        sWho.set(mode === "none" || (mode === "mg" && mgLeft <= 0) ? "the pipe's own iron" : mode === "mg" ? "the magnesium block" : dose <= 0 ? "the pipe's own iron" : dose < 100 ? `the source (${dose}%) and the iron (${100 - dose}%)` : "the DC source");
        const v = mode === "none" ? ["corroding", RED] : mode === "mg" ? (mgLeft > 0 ? ["protected", GRN] : ["anode gone: corroding", RED]) : dose < 100 ? ["under-protected", RED] : dose <= 130 ? ["protected", GRN] : ["over-protected", YEL];
        sV.set(v[0]); sV.querySelector(".v").style.color = v[1];
        status.innerHTML = mode === "none" ? "No protection. Iron leaves at anodic sites on the pipe, and the electrons travel through the steel to where oxygen arrives."
          : mode === "mg" ? (mgLeft > 0 ? `Magnesium is ${(E_FE - MET.Mg.E).toFixed(2)} V above iron on the ladder. It dissolves as Mg²⁺, and its electrons run through the cable to the pipe. The pipe is all cathode.` : "<b>The block is used up.</b> The pipe supplies the electrons again. Real anodes are sized for years or decades and checked on a schedule.")
          : dose < 100 ? "The source delivers fewer electrons than the oxygen takes, so iron still supplies the rest. Slower corrosion, but not zero."
          : dose <= 130 ? "The source delivers what the oxygen takes. The anode does not dissolve: there, water is oxidised to O₂ instead."
          : `More electrons than the oxygen can take. The surplus splits water on the steel: <b>${f("2H2O + 2e- -> H2 + 2OH^-")}</b>. That wastes energy, and the hydrogen can lift coatings and make some steels brittle.`;
      }
      function upd() { st.clearParts(); busy = false; wait = 6; accS = 0; accH = 0; drawDyn(); text(); }
      function go() {
        if (busy) return;
        busy = true;
        let src = "fe";
        if (mode === "mg" && mgLeft > 0) src = "mg";
        if (mode === "dc") { accS += Math.min(1, dose / 100); if (accS >= 0.999) { accS -= 1; src = "dc"; } }
        const o = { speed: src === "fe" ? 2.6 : 5.5, takers: [{ kind: "o2", path: [[xp - 40, gy + 14], [xp, py - 10]] }], products: ohFan(xp, py - 11, 1), onDone: () => { busy = false; wait = 12; text(); } };
        if (src === "fe") { nFe += 2; o.ions = [0, 1].map((k) => ({ label: "Fe", path: [[xA - 5 + 12 * k, py - 6], [xA - 2 + 14 * k, 112], [xA + 2 + 16 * k, 86]] })); o.ePath = [[xA + 4, py + 13], [xp, py + 13], [xp, py + 5]]; }
        else if (src === "mg") {
          mgLeft = Math.max(0, mgLeft - 8); drawDyn(); o.ePath = P_SRC;
          o.ions = [0, 1].map((k) => ({ label: "Mg", path: [[xa - 30, 160 + 18 * k], [xa - 54, 152 + 14 * k], [xa - 74, 128 + 16 * k]] }));
        } else { o.ePath = P_SRC; o.products = o.products.concat([{ kind: "o2", delay: 10, path: [[xa - 20, 176], [xa - 28, 120], [xa - 24, gy + 12]] }]); }
        round(st, o);
        if (mode === "dc") {
          accH += Math.max(0, dose / 100 - 1);
          if (accH >= 0.999) { accH -= 1; st.after(18, () => round(st, { speed: 5.5, nE: 2, ePath: P_SRC, products: [{ kind: "h2", path: [[xp + 78, py - 9], [xp + 84, 104], [xp + 80, gy + 12]] }, { kind: "an", label: "OH", path: [[xp + 78, py - 10], [xp + 96, py - 30], [xp + 104, py - 48]] }, { kind: "an", label: "OH", delay: 4, path: [[xp + 78, py - 10], [xp + 62, py - 30], [xp + 58, py - 50]] }] })); }
        }
        text();
      }
      const stop = loop(() => { st.tick(); if (!busy && --wait <= 0) go(); });
      const tg = toggle("Protection", [["none", "none"], ["mg", "magnesium anode"], ["dc", "impressed current"]], mode, (v) => { mode = v; upd(); });
      el.append(widget("A buried steel pipe: who pays for the oxygen's electrons?",
        tg,
        slider({ name: "DC dose", min: 0, max: 200, step: 10, value: dose, fmtv: (x) => x + "%", oninput: (v) => { dose = v; if (mode !== "dc") { mode = "dc"; tg.set("dc"); } upd(); } }),
        h("div", { class: "note" }, "Dose = electrons the source delivers, as a share of what the arriving oxygen takes."),
        st.svg, legend(LEG.concat([["H₂ bubble", H2COL]])),
        h("div", { class: "btns" }, h("button", { onclick: () => { mgLeft = 100; if (mode === "mg") upd(); } }, "Fit a new magnesium block")),
        h("div", { class: "readout" }, sWho, sPct, sFe, sV), status));
      upd();
      el.append(
        P("Both methods need the electrolyte to reach the steel <b>and</b> the anode, so that ions can close the loop: they work in soil and under water, not on a car body in air. And the dose matters. Too little, and the iron still pays part of the bill. Too much, and the surplus electrons split water on the steel into hydrogen gas."),
        takeaway("Cathodic protection makes the whole structure a cathode by feeding it electrons, either from a sacrificial anode or from a DC source through an inert anode (impressed current). Iron that never has to give electrons cannot corrode.")
      );
      return stop;
    },
    check: {
      type: "choice",
      q: "An engineer wires up impressed-current protection for a steel tank but swaps the two cables: the <b>positive</b> terminal of the DC source goes to the tank. What happens?",
      options: ["The tank is protected just the same: the direction of the current does not matter", "The tank corrodes faster than with no protection: the source pulls electrons out of the iron", "Nothing: with the cables swapped, no current flows"],
      answer: 1,
      wrongHints: {
        0: "Direction is the whole point. Protection means electrons flow <i>into</i> the steel. Which terminal of a source pushes electrons out?",
        2: "The circuit is still closed through the soil. The current simply runs the other way round. Think about what that does to the iron.",
      },
      why: "It corrodes faster. Electrons leave a source at its negative terminal. With the positive terminal on the tank, the source pulls electrons out of the steel, which forces Fe → Fe²⁺ + 2e⁻: the tank becomes the anode.",
    },
  });

  // ---------------------------------------------------------------- 8
  steps.push({
    title: "Passivation: the metals that should not survive",
    short: "Passivation",
    newConcepts: ["passivation", "stainless"],
    render(el) {
      el.append(
        P(`Now a puzzle. Aluminium has E° = ${sv(E("Al"))} V, far above zinc and iron on the ladder. By the numbers it should corrode faster than either. So should chromium (${sv(E("Cr"))} V) and titanium (about −1.6 V, a textbook value that is not in our table). Yet aluminium window frames, chrome taps and titanium implants last for decades.`),
        P("The ladder is right: these metals react with oxygen at once. The difference is the <b>product</b>. Rust is porous and flakes off (step 3). Their oxides, Al₂O₃, Cr₂O₃ and TiO₂, form a film only a few nanometres thick that is dense, grips the metal and lets neither water nor oxygen through. After the first instant the reaction has sealed itself in. This is <b>passivation</b>. Scratch the film and the bare metal underneath reacts and repairs it."),
        formula(`${f("4Al + 3O2 -> 2Al2O3")}<small>aluminium goes 0 → +3 and oxygen 0 → −2: 12 electrons change hands, and the product stays put as a skin</small>`)
      );
      const W = narrow(520, 400), H = 232, cx = W / 2, st = makeStage(W, H), x0 = 12, x1 = W - 12, top = 120;
      const envR = st.R(st.bg, x0, 20, x1 - x0, top - 20, { fill: WATER, "fill-opacity": 0.1 });
      const envT = st.T(st.bg, x0 + 4, 34, "", { anchor: "start", fill: MUTED, size: 11 });
      const metal = st.R(st.bg, x0, top, x1 - x0, 94, { fill: IRON });
      const mLab = st.T(st.fg, x1 - 6, top + 84, "", { anchor: "end", fill: DARK, weight: 700 });
      const gFilm = s("g"); st.mid.append(gFilm);
      const pitEl = s("path", { fill: "#1b2636" }); st.mid.append(pitEl);
      const M = {
        Fe: { name: "iron", col: IRON, E: sv(E_FE) + " V", oxide: "rust, Fe₂O₃·xH₂O", lab: "Fe" },
        Al: { name: "aluminium", col: "#c9d2dc", E: sv(E("Al")) + " V", oxide: "Al₂O₃", lab: "Al" },
        SS: { name: "steel + chromium", col: "#b4bcc8", E: sv(E("Cr")) + " V (Cr)", oxide: "Cr₂O₃", lab: "Fe" },
        Ti: { name: "titanium", col: "#a9b0bb", E: "about −1.6 V", oxide: "TiO₂", lab: "Ti" },
      };
      const NC = Math.floor((x1 - x0) / 12), cw = (x1 - x0) / NC, xp = x0 + (x1 - x0) * 0.27, r = rng(9);
      const sE = tstat("E° (metal ion + e⁻ → metal)", "y"), sOx = tstat("oxide", ""), sFilm = tstat("the oxide layer", ""), sLost = stat("metal lost (toy units)", "r");
      const status = h("div", { class: "cor-status" });
      let m = "Al", cr = 18, sea = false, age = 0, lost = 0, gapW = 0, pit = 0, hts = [], was = null, healed = false;
      const passive = () => m === "Al" || m === "Ti" || (m === "SS" && cr >= 10.5);
      const pits = () => passive() && sea && m !== "Ti";
      function drawFilm() {
        gFilm.innerHTML = "";
        if (passive()) {
          const holes = [];
          if (gapW > 0.5) holes.push([cx - gapW, cx + gapW]);
          if (pits()) holes.push([xp - 6, xp + 6]);
          holes.sort((a, b) => a[0] - b[0]);
          let x = x0;
          for (const [a, b] of holes.concat([[x1, x1]])) { if (a > x) st.R(gFilm, x, top - 5, a - x, 5, { fill: "#8fe3ff", opacity: Math.min(1, age / 14) }); x = b; }
          pitEl.setAttribute("d", pits() && pit > 0 ? `M${xp - 7} ${top} A7 ${pit} 0 0 0 ${xp + 7} ${top} Z` : "");
        } else {
          const rec = Math.min(30, lost * 0.1);
          st.R(gFilm, x0, top, x1 - x0, rec, { fill: "#6e3b22" });
          hts.forEach((hh, i) => { if (hh > 0) st.R(gFilm, x0 + i * cw + 1, top - hh, cw - 2.5, hh, { fill: RUST, rx: 2 }); });
          pitEl.setAttribute("d", "");
        }
      }
      function text(extra) {
        sE.set(M[m].E); sOx.set(passive() ? M[m].oxide : "rust, Fe₂O₃·xH₂O");
        sFilm.set(passive() ? "a few nanometres, dense, self-healing" : m === "SS" ? "patchy: too little chromium" : "thick, porous, flaking");
        sLost.set(lost.toFixed(1));
        status.innerHTML = extra || (!passive()
          ? (m === "SS" ? `With ${cr}% chromium the oxide cannot cover the surface, and the steel rusts like plain iron. The film closes up at about 10.5% chromium.` : "Rust lets water and oxygen through and flakes off, so fresh iron keeps being exposed. The loss grows without limit" + (sea ? ", faster in salt water." : "."))
          : pits() ? `Chloride ions from the salt break the film at weak spots faster than it can heal. There the bare metal is a tiny anode next to a huge passive cathode, and corrosion drills a narrow pit (step 5's area rule).`
          : m === "Ti" && sea ? "Titanium's film holds even in seawater, which is why it is used for ship and desalination-plant parts."
          : `Oxygen bounces off the finished film. The metal lost a few atomic layers in the first instant and nothing since.` + (m === "SS" ? ` (${cr}% chromium: enough for a continuous Cr₂O₃ film.)` : ""));
      }
      function reset() {
        st.clearParts(); age = 0; lost = 0; gapW = 0; pit = 0; healed = false; hts = Array(NC).fill(0);
        metal.setAttribute("fill", M[m].col); mLab.textContent = m === "SS" ? `steel with ${cr}% chromium` : M[m].name;
        envR.setAttribute("fill-opacity", sea ? 0.24 : 0.1); envT.textContent = sea ? "seawater (chloride) with dissolved air" : "damp air";
        was = passive(); drawFilm(); text();
      }
      function upd() { if (was !== passive()) return reset(); mLab.textContent = m === "SS" ? `steel with ${cr}% chromium` : M[m].name; text(); }
      function scratch() {
        if (passive()) { gapW = 22; healed = false; drawFilm(); text("Scratched: bare metal meets oxygen, reacts at once, and the film grows back over the gap."); }
        else { for (let i = 0; i < NC; i++) if (Math.abs(x0 + (i + 0.5) * cw - cx) < 40) hts[i] = 0; drawFilm(); text("You scraped some rust off. That only exposes fresh iron, and the rusting carries on from there."); }
      }
      const stop = loop(() => {
        st.tick(); age++;
        if (!passive()) {
          const k = sea ? 3 : 1;
          if (age % 3 === 0) {
            for (let j = 0; j < 2 * k; j++) {
              const i = r.int(NC); hts[i] += 2 + r() * 3; lost += 0.2;
              if (hts[i] > 44) { hts[i] = 8; const x = x0 + (i + 0.5) * cw; st.spawn("rust", [[x, top - 44], [x + 26, 62], [x + 44, 24]], { speed: 1.4 }); }
            }
            drawFilm(); sLost.set(lost.toFixed(1));
          }
          if (age % 12 === 0) { const x = x0 + 14 + r() * (x1 - x0 - 28); st.spawn("o2", [[x, 26], [x, top + 2]], { speed: 1.8 }); }
          return;
        }
        if (age === 1) { lost = 1; sLost.set("1.0"); }
        if (age <= 15) drawFilm();
        if (gapW > 0) {
          gapW = Math.max(0, gapW - 0.45); lost += 0.004;
          if (age % 5 === 0) st.spawn("o2", [[cx + (r() - 0.5) * 60, 28], [cx + (r() - 0.5) * gapW, top - 4]], { speed: 2.6 });
          drawFilm();
          if (gapW === 0 && !healed) { healed = true; sLost.set(lost.toFixed(1)); text("Healed. On real aluminium or stainless steel this takes a fraction of a second."); }
        } else if (age % 14 === 0) { const x = x0 + 14 + r() * (x1 - x0 - 60); st.spawn("o2", [[x, 26], [x + 10, top - 14], [x + 36, 26]], { speed: 1.8 }); }
        if (pits() && age % 26 === 0) {
          pit = Math.min(40, pit + 0.9); lost += 0.3; sLost.set(lost.toFixed(1)); drawFilm();
          st.spawn("cat", [[xp, top - 2], [xp - 10, 76], [xp - 18, 40]], { label: M[m].lab, speed: 1.1 });
        }
      });
      const tgM = toggle("Metal", [["Fe", "iron"], ["Al", "aluminium"], ["SS", "steel + chromium"], ["Ti", "titanium"]], m, (v) => { m = v; reset(); });
      el.append(widget("A metal surface meets oxygen, seen from the side (film thickness hugely exaggerated)",
        tgM,
        slider({ name: "chromium", min: 0, max: 20, step: 0.5, value: cr, fmtv: (x) => x + "%", oninput: (v) => { cr = v; if (m !== "SS") { m = "SS"; tgM.set("SS"); reset(); } else upd(); } }),
        toggle("Surroundings", [[0, "damp air"], [1, "seawater (chloride)"]], 0, (v) => { sea = !!v; reset(); }),
        st.svg, legend([["O₂", O2COL], ["protective oxide film", "#8fe3ff"], ["rust", RUST], ["metal ion leaving", RED]]),
        h("div", { class: "btns" }, h("button", { class: "primary", onclick: scratch }, "Scratch the surface")),
        h("div", { class: "readout" }, sE, sOx, sFilm, sLost), status));
      reset();
      el.append(
        P("<b>Stainless steel</b> borrows this trick: iron with at least about 10.5% chromium (kitchen steel has around 18%) grows a chromium oxide film over its whole surface. Move the chromium slider across that line. The weak point of aluminium and stainless steel is chloride, which breaks the film in small spots; titanium's film withstands even seawater."),
        takeaway("Passivation: some metals with very negative E° protect themselves, because their oxide forms a thin, dense, self-healing film instead of a porous crust. E° says whether a metal wants to corrode; the film decides whether it can.")
      );
      return stop;
    },
    check: {
      type: "choice",
      q: `Aluminium (E° = ${sv(E("Al"))} V) sits far above iron (${sv(E_FE)} V) on the ladder. Why does a bare aluminium ladder outlast a bare steel one in the rain?`,
      options: ["Its E° is misleading: in practice aluminium is a noble metal that does not react with oxygen", "Aluminium reacts with oxygen at once, and the oxide it forms seals the surface against further attack", "Aluminium is lighter, so there are fewer atoms per gram to oxidise"],
      answer: 1,
      wrongHints: {
        0: "Aluminium is one of the most eager electron givers there is. Scratch it and the fresh metal oxidises within moments. So what stops the reaction from going on?",
        2: "Mass has nothing to do with it. Compare what the oxide layers of the two metals look like in the widget.",
      },
      why: "It reacts instantly, and that is what saves it: Al₂O₃ forms a dense film a few nanometres thick that keeps water and oxygen away from the metal. Rust is porous and cannot do that.",
      backTo: 2,
    },
  });

  // ---------------------------------------------------------------- 9
  steps.push({
    title: "The same chemistry, turned useful",
    short: "Lemon and seawater cells",
    newConcepts: ["usefulcell"],
    render(el) {
      el.append(
        P("Every corrosion cell so far wasted its energy as heat, because the electron path was the metal itself. Pull the anodic and the cathodic site apart, join them with a wire, and <b>the same chemistry is a battery</b>."),
        P(`The lemon battery: push a galvanised nail (zinc) and a copper coin into a lemon. Zinc dissolves, <code style="font-family:inherit">${f("Zn -> Zn^2+ + 2e-")}</code>. The electrons take the wire to the copper, where H⁺ from the sour juice takes them: <code style="font-family:inherit">${f("2H^+ + 2e- -> H2")}</code>. The copper is not used up. As in step 5, it only lends its surface.`),
        P("In seawater there is hardly any H⁺, and dissolved oxygen is the taker, exactly as in rusting. Magnesium batteries that switch on when seawater floods them work this way and power life-jacket lights and sea buoys (some carry a metal salt as the electron taker instead of relying on oxygen).")
      );
      const W = narrow(520, 400), H = 252, cx = W / 2, st = makeStage(W, H), xA = cx - W * 0.17, xC = cx + W * 0.17;
      const gBox = s("g"); st.bg.append(gBox);
      st.mid.append(s("path", { d: `M${xA} 74 V28 H${xC} V74`, fill: "none", stroke: "#b9c2d3", "stroke-width": 2.5 }));
      const glow = s("circle", { cx, cy: 28, r: 20, fill: RED, opacity: 0 }), led = s("circle", { cx, cy: 28, r: 10, fill: "#3a2020", stroke: "#b9c2d3", "stroke-width": 1.5 });
      st.mid.append(glow, led);
      st.T(st.mid, cx, 54, "LED", { size: 10, fill: MUTED });
      const anode = st.R(st.mid, xA - 8, 72, 16, 128, { rx: 2 });
      st.R(st.mid, xC - 8, 72, 16, 128, { fill: MET.Cu.col, rx: 2 });
      const aSym = st.T(st.fg, xA - 14, 92, "", { anchor: "end", weight: 700 });
      st.T(st.fg, xC + 14, 92, "Cu", { anchor: "start", weight: 700 });
      const chainT = st.T(st.fg, W - 8, 16, "", { anchor: "end", fill: YEL, weight: 600 });
      const AN = { Mg: "magnesium ribbon", Zn: "galvanised nail (zinc)", Fe: "iron nail" };
      const sE = stat("E° per cell", "y"), sTot = stat("chain total", "g"), sLed = tstat("LED (needs about 1.8 V)", ""), sUsed = stat("metal ions lost", "r");
      const status = h("div", { class: "cor-status" });
      let an = "Zn", liq = "lemon", nCell = 1, busy = false, wait = 6, used = 0;
      const volts = () => (liq === "lemon" ? E_H : E_O2) - MET[an].E;
      function upd() {
        st.clearParts(); busy = false; wait = 6; used = 0;
        gBox.innerHTML = "";
        if (liq === "lemon") {
          gBox.append(s("ellipse", { cx, cy: 168, rx: W * 0.38, ry: 68, fill: "#e9d44a", "fill-opacity": 0.2, stroke: "#e9d44a", "stroke-opacity": 0.7 }));
          st.T(gBox, cx, 226, "lemon juice: plenty of H⁺", { fill: MUTED, size: 11 });
        } else {
          st.R(gBox, cx - W * 0.38, 112, W * 0.76, 124, wfill);
          gBox.append(s("path", { d: `M${cx - W * 0.38} 100 V236 H${cx + W * 0.38} V100`, fill: "none", stroke: "#6b7689", "stroke-width": 2 }));
          st.T(gBox, cx, 228, "seawater: dissolved O₂", { fill: MUTED, size: 11 });
        }
        anode.setAttribute("fill", MET[an].col); aSym.textContent = an;
        text();
      }
      const wfill = { fill: WATER, "fill-opacity": 0.2 };
      function text() {
        const v = volts(), tot = v * nCell, lit = tot >= 1.8;
        const w = Math.max(5, 16 - used * 0.22); anode.setAttribute("x", xA - w / 2); anode.setAttribute("width", w);
        sE.set(v.toFixed(2) + " V"); sTot.set(`${nCell} × ${v.toFixed(2)} = ${tot.toFixed(2)} V`); sTot.querySelector(".v").style.fontSize = "18px";
        sLed.set(lit ? "lit" : "dark"); sLed.querySelector(".v").style.color = lit ? RED : MUTED;
        sUsed.set(String(used));
        glow.setAttribute("opacity", lit ? 0.35 : 0); led.setAttribute("fill", lit ? RED : "#3a2020");
        chainT.textContent = nCell > 1 ? `× ${nCell} cells in a chain` : "";
        status.innerHTML = `Anode, the ${AN[an]}: <b>${f(`${an} -> ${an}^2+ + 2e-`)}</b>. On the copper: <b>${liq === "lemon" ? f("2H^+ + 2e- -> H2") : f("O2 + 2H2O + 4e- -> 4OH^-")}</b>. `
          + `E°cell = ${sv(liq === "lemon" ? E_H : E_O2)} − (${sv(MET[an].E)}) = ${v.toFixed(2)} V` + (an === "Fe" && liq === "sea" ? ": step 1's rusting cell, now with a wire in the middle." : ".");
      }
      function go() {
        if (busy) return;
        busy = true;
        const sp = 3.6 + volts() * 0.9, ePath = [[xA, 120], [xA, 28], [xC, 28], [xC, 120], [xC - 5, 152]];
        const done = (k) => () => { used += k; text(); busy = false; wait = clamp(Math.round(22 / volts()), 6, 50); };
        if (liq === "lemon") {
          round(st, { speed: sp, nE: 2, ePath, ions: [{ label: an, path: [[xA + 9, 150], [xA + 34, 170], [xA + 52, 192]] }],
            takers: [0, 1].map((j) => ({ kind: "cat", label: "H", path: [[xC - 62, 150 + 26 * j], [xC - 18, 144 + 19 * j]] })),
            products: [{ kind: "h2", path: [[xC - 20, 152], [xC - 26, 124], [xC - 22, 108]] }], onDone: done(1) });
        } else {
          round(st, { speed: sp, nE: 4, ePath, ions: [0, 1].map((k) => ({ label: an, path: [[xA + 9, 140 + 24 * k], [xA + 34, 160 + 20 * k], [xA + 52, 186 + 16 * k]] })),
            takers: [{ kind: "o2", path: [[xC - 66, 196], [xC - 18, 152]] }], products: ohFan(xC - 18, 152, -1, 1), onDone: done(2) });
        }
      }
      const stop = loop(() => { st.tick(); if (!busy && --wait <= 0) go(); });
      el.append(widget("A corrosion cell with the wire on the outside",
        toggle("Anode", [["Mg", "magnesium ribbon"], ["Zn", "galvanised nail (zinc)"], ["Fe", "iron nail"]], an, (v) => { an = v; upd(); }),
        toggle("Liquid", [["lemon", "lemon juice"], ["sea", "seawater"]], liq, (v) => { liq = v; upd(); }),
        toggle("Cells in a chain", [[1, "1"], [2, "2"], [3, "3"], [4, "4"]], 1, (v) => { nCell = v; text(); }),
        st.svg, legend([["electron", YEL], ["metal ion or H⁺ (+)", RED], ["OH⁻ (−)", BLUE], ["O₂", O2COL], ["H₂ bubble", H2COL]]),
        h("div", { class: "readout" }, sE, sTot, sLed, sUsed), status));
      upd();
      el.append(
        P("The E° figures are standard-condition estimates. A real zinc and copper lemon reads about 0.9 V on a voltmeter, and magnesium cells stay well below their E° value because magnesium also passivates a little. Both deliver only a small <em>current</em>: plenty of push, little flow. Voltages of cells in a chain add up (<em>Electrode potentials</em>), which is why it takes about three lemons to light an LED."),
        P("Either way, look at the anode: it gets thinner. The energy of this battery is the energy of a metal corroding."),
        takeaway("A battery with a metal anode is corrosion under control: the same two half-reactions, with the anodic and cathodic sites pulled apart so that the electrons have to take the wire.")
      );
      return stop;
    },
    check: {
      type: "number",
      q: `A seawater cell has a magnesium anode (E° = ${sv(MET.Mg.E)} V) and reduces dissolved oxygen on its other electrode (E° = ${sv(E_O2)} V). What is E°cell, in volts?`,
      answer: +(E_O2 - MET.Mg.E).toFixed(2), tolerance: 0.006,
      hint: "The same sum as for the rusting nail in step 1, with magnesium in iron's place.",
      why: `${sv(E_O2)} − (${sv(MET.Mg.E)}) = ${(E_O2 - MET.Mg.E).toFixed(2)} V, more than three times the push of the rusting nail. Real cells deliver well under this, but it shows why magnesium makes a strong anode.`,
      backTo: 0,
    },
  });

  // ---------------------------------------------------------------- 10
  steps.push({
    title: "Capstone: protect the ship's hull",
    short: "Capstone: the ship's hull",
    newConcepts: [],
    render(el) {
      el.append(
        P("A steel ship is the hardest case there is: salt water all around, a bronze propeller (mostly copper) bolted to the steel, and paint that gets scraped on every quay. Set up the hull, then let 20 years pass. You can change anything while the clock runs."),
        P("The pictures show who gives and who takes the electrons. The numbers are a <b>toy model</b> hung on rough real figures: bare steel loses about 0.1 mm a year in the sea, about half that in a river, and very little in air.")
      );
      const W = narrow(560, 400), H = 262, st = makeStage(W, H, 680);
      st.svg.setAttribute("viewBox", `0 46 ${W} ${H - 46}`);
      const gEnv = s("g"), gHull = s("g"); st.bg.append(gEnv); st.mid.append(gHull);
      const ENV = { dock: { base: 0.01, wet: false, name: "dry dock: air" }, river: { base: 0.05, wet: true, name: "river: fresh water" }, sea: { base: 0.12, wet: true, name: "sea: salt water" } };
      const S = { env: "sea", prop: "bronze", paint: "scratched", prot: "none", dose: 100, anode: 100, year: 0, loss: 0, hist: [[0, 0]] };
      const bot = 204, xs = W * 0.3, xz = [W * 0.46, W * 0.62], xi = W * 0.54, xprop = W - 40, PAINT = "#b23a30";
      function model() {
        const env = ENV[S.env], x = S.paint === "none" ? 1 : S.paint === "scratched" ? 0.03 : 0, pc = S.prop === "bronze" ? 0.05 : 0;
        const out = { wet: env.wet, x, pc, eff: 0, over: false, anodeRate: 0, D: 0, rate: 0, who: "nothing", notes: [] }, N = out.notes;
        if (!env.wet) {
          out.rate = x > 0 ? env.base : 0; out.who = x > 0 ? "bare steel, slowly" : "nothing";
          N.push(x > 0 ? "Out of the water only the thin film of moisture from the air is left: bare steel rusts slowly." : "Out of the water and fully painted: nothing happens.");
          if (S.prot !== "none") N.push("Anodes and impressed current do nothing here: with no water around the hull there is no ion path to close their circuit.");
          if (pc && x > 0) N.push("The bronze propeller is harmless in air for the same reason.");
          return out;
        }
        const unprot = x > 0 ? env.base * (1 + pc / x) : 0;
        out.D = (env.base / 0.12) * (x + pc);
        if (x === 0) N.push(pc ? "Intact paint: no steel touches the water, so the bronze propeller finds no anode to feed on." : "Intact paint: no steel touches the water. No cell.");
        else if (x === 1) N.push(pc ? "The threat: a bare hull has anodic and cathodic sites all over the steel. The bronze adds a little extra demand, spread over a huge anode." : "The threat: a bare hull has anodic and cathodic sites all over the steel, as on the nail.");
        else N.push(pc ? `The threat: scraped patches next to bare bronze. Left alone, the oxygen caught by the whole propeller is paid for by a few small patches of steel, <b>about ${(1 + pc / x).toFixed(1)} times</b> the normal attack there.` : "The threat: a normal corrosion cell at each scraped patch.");
        const has = (S.prot === "zn" || S.prot === "mg") && S.anode > 0;
        if (S.prot === "zn") {
          if (!has) N.push("<b>The zinc anodes are used up</b>: the hull is on its own again.");
          else { out.eff = S.env === "sea" ? 1 : 0.4; out.anodeRate = 4 + 150 * out.D * out.eff; N.push(S.env === "sea" ? "Zinc anodes give the electrons instead of the steel, and are being used up." : "Zinc helps only partly in fresh water: it conducts poorly, and zinc's small push over iron drives too little current through it. Magnesium, with its bigger push, is the usual choice there."); }
        }
        if (S.prot === "mg") {
          if (!has) N.push("<b>The magnesium anodes are used up</b>: the hull is on its own again.");
          else { out.eff = 1; out.over = S.env === "sea"; out.anodeRate = S.env === "sea" ? 15 + 450 * out.D : 6 + 200 * out.D; N.push(S.env === "sea" ? `Magnesium protects, but in well-conducting seawater its ${(E_FE - MET.Mg.E).toFixed(1)} V push over iron drives far more current than needed: the blocks vanish fast and the surplus makes hydrogen on the steel.` : "Magnesium anodes have enough push for poorly conducting fresh water. The steel is protected."); }
        }
        if (S.prot === "dc") {
          out.eff = Math.min(1, S.dose / 100); out.over = S.dose > 130;
          N.push(S.dose < 100 ? `Impressed current at ${S.dose}% of what the oxygen takes: the steel still supplies the rest.` : out.over ? "Impressed current far above the need: the steel is safe, but the surplus makes hydrogen there, which lifts paint." : "Impressed current matched to the need: the whole hull is a cathode, and nothing is used up except electrical energy.");
        }
        out.rate = unprot * (1 - out.eff);
        out.who = out.eff >= 1 && (has || S.prot === "dc") ? (S.prot === "dc" ? "nothing (inert anode)" : S.prot === "zn" ? "zinc anodes" : "magnesium anodes")
          : unprot === 0 ? (has ? "anodes, very slowly" : "nothing") : out.eff > 0 ? (S.prot === "dc" ? "hull steel, more slowly" : "zinc anodes and hull steel") : "hull steel";
        return out;
      }
      function drawScene() {
        gEnv.innerHTML = ""; gHull.innerHTML = "";
        const wet = ENV[S.env].wet;
        if (wet) st.R(gEnv, 0, 100, W, H - 100, { fill: S.env === "sea" ? WATER : "#5aa58a", "fill-opacity": 0.2 });
        else { gEnv.append(s("line", { x1: 0, x2: W, y1: 240, y2: 240, stroke: "#6b7689", "stroke-width": 2 })); for (const x of [W * 0.3, W * 0.62]) st.R(gEnv, x - 12, bot + 4, 24, 34, { fill: "#4a5568" }); }
        st.T(gEnv, 8, 256, ENV[S.env].name, { anchor: "start", fill: MUTED, size: 11 });
        gHull.append(s("polygon", { points: `26,62 ${W - 40},62 ${W - 64},${bot} 86,${bot}`, fill: "#59616e", stroke: S.paint === "none" ? "#aab3c0" : PAINT, "stroke-width": S.paint === "none" ? 2 : 5, "stroke-linejoin": "round" }));
        st.T(gHull, W * 0.3, 88, S.paint === "none" ? "steel hull, unpainted" : "steel hull, painted", { fill: TEXT, size: 11 });
        if (S.paint === "scratched") { gHull.append(s("line", { x1: xs - 16, x2: xs + 16, y1: bot, y2: bot, stroke: "#aab3c0", "stroke-width": 6 })); st.T(gHull, xs, bot - 10, "scraped patch", { fill: TEXT, size: 10 }); }
        gHull.append(s("line", { x1: W - 62, x2: xprop, y1: 188, y2: 188, stroke: "#aab3c0", "stroke-width": 3 }));
        gHull.append(s("ellipse", { cx: xprop, cy: 188, rx: 5, ry: 19, fill: S.prop === "bronze" ? "#c98a4b" : PAINT }));
        st.T(gHull, W - 6, 256, S.prop === "bronze" ? "bare bronze propeller" : "painted steel propeller", { anchor: "end", fill: MUTED, size: 11 });
        if (S.prot === "zn" || S.prot === "mg") {
          const w = 34 * Math.sqrt(Math.max(0, S.anode) / 100);
          xz.forEach((x) => { st.R(gHull, x - 17, bot + 3, 34, 9, { fill: "none", stroke: "#6b7689", "stroke-dasharray": "2 2" }); st.R(gHull, x - w / 2, bot + 3, w, 9, { fill: MET[S.prot === "zn" ? "Zn" : "Mg"].col }); });
          st.T(gHull, (xz[0] + xz[1]) / 2, bot - 10, S.prot === "zn" ? "zinc anodes" : "magnesium anodes", { fill: TEXT, size: 10 });
        }
        if (S.prot === "dc") {
          gHull.append(s("path", { d: `M${xi + 22} 132 V${bot + 6}`, fill: "none", stroke: "#b9c2d3", "stroke-width": 2 }));
          st.R(gHull, xi - 32, 108, 64, 26, { fill: "#212734", stroke: "#b9c2d3", rx: 5 });
          st.T(gHull, xi, 126, "−  DC  +", { fill: GRN, weight: 700, size: 12 });
          st.R(gHull, xi + 10, bot + 3, 24, 8, { fill: "#3a3f4a", stroke: "#c3a6ff" });
          st.T(gHull, xi + 22, bot - 10, "inert anode", { fill: TEXT, size: 10 });
        }
      }
      const pl = plot({ xmin: 0, xmax: 20, ymin: 0, ymax: 7, width: narrow(560, 400), height: 200, xlabel: "years", ylabel: "steel lost at the worst spot (mm)", xticks: [0, 5, 10, 15, 20], yticks: [0, 2, 4, 6], minFont: 10 });
      const sY = stat("year", ""), sL = stat("steel lost (plate is 10 mm)", "r"), sR = stat("rate now", "y"), sW = tstat("what is dissolving", ""), sA = stat("anodes left", "g");
      const status = h("div", { class: "cor-status" });
      let busy = false, wait = 6, acc = 0, accH = 0, flip = 0, simOn = false;
      function text() {
        const m = model();
        sY.set(S.year.toFixed(1)); sL.set(S.loss.toFixed(2) + " mm"); sR.set(m.rate.toFixed(3) + " mm/yr"); sW.set(m.who);
        sA.set(S.prot === "zn" || S.prot === "mg" ? Math.round(S.anode) + "%" : "–");
        status.innerHTML = m.notes.join(" ");
        pl.clear(); pl.hline(2.5, MUTED, "a quarter of the plate gone", { pos: "left" }); pl.line(S.hist, RED);
      }
      function upd() { st.clearParts(); busy = false; wait = 6; acc = 0; accH = 0; drawScene(); text(); }
      function go() {
        const m = model();
        if (!m.wet || m.D <= 0) { wait = 20; return; }
        let src = "hull";
        if (m.eff > 0) { acc += m.eff; if (acc >= 0.999) { acc -= 1; src = S.prot; } }
        if (src === "hull" && m.x === 0) { wait = 20; return; }
        busy = true; flip = 1 - flip;
        const bronze = m.pc > 0, xcat = xs + 10;
        const xsrc = src === "hull" ? (bronze ? xs : xs - 10) : src === "dc" ? xi + 22 : xz[flip];
        const o = { speed: 3.6, onDone: () => { busy = false; wait = clamp(Math.round(2.5 / m.D), 5, 36); } };
        o.ePath = [[xsrc, bot - 5], [xsrc, 180]].concat(bronze ? [[W - 74, 180], [W - 62, 188], [xprop - 3, 188]] : [[xcat, 180], [xcat, bot - 5]]);
        o.takers = [{ kind: "o2", path: bronze ? [[W - 8, 250], [xprop + 13, 198]] : [[xcat + 30, 254], [xcat + 3, bot + 13]] }];
        o.products = bronze ? ohFan(xprop + 13, 199, -1, 1) : ohFan(xcat + 3, bot + 14, 1, 1);
        if (src !== "dc") { const lab = src === "hull" ? "Fe" : src === "zn" ? "Zn" : "Mg", y0 = src === "hull" ? bot + 10 : bot + 20; o.ions = [0, 1].map((k) => ({ label: lab, path: [[xsrc - 6 + 12 * k, y0], [xsrc - 16 + 30 * k - 14, y0 + 24], [xsrc - 22 + 40 * k - 26, 256]] })); }
        round(st, o);
        if (m.over) { accH += 0.5; if (accH >= 0.999) { accH -= 1; st.after(30, () => st.spawn("h2", bronze ? [[xprop + 12, 180], [xprop + 20, 140], [xprop + 16, 106]] : [[xcat + 22, bot + 12], [W * 0.16, bot + 12], [40, 110]], { speed: 1.3 })); } }
      }
      const runBtn = h("button", { class: "primary", onclick: () => { if (S.year >= 19.99) resetSim(); simOn = !simOn; runBtn.textContent = simOn ? "Pause the clock" : "Run to year 20"; } }, "Run to year 20");
      function resetSim() { S.year = 0; S.loss = 0; S.anode = 100; S.hist = [[0, 0]]; }
      let tickN = 0;
      const stop = loop(() => {
        st.tick(); tickN++;
        if (!busy && --wait <= 0) go();
        if (simOn) {
          const m = model(), dt = 0.1, before = S.anode;
          S.loss = Math.min(10, S.loss + m.rate * dt);
          if (m.anodeRate) S.anode = Math.max(0, S.anode - m.anodeRate * dt);
          S.year = Math.min(20, S.year + dt); S.hist.push([S.year, S.loss]);
          if (S.year >= 19.99) { simOn = false; runBtn.textContent = "Run to year 20"; }
          if (before !== S.anode && (tickN % 4 === 0 || S.anode === 0)) drawScene();
          text();
        }
      });
      const tgP = toggle("Protection", [["none", "none"], ["zn", "zinc anodes"], ["mg", "magnesium anodes"], ["dc", "impressed current"]], S.prot, (v) => { S.prot = v; S.anode = 100; upd(); });
      el.append(widget("Protect the hull (toy model on rough real figures)",
        toggle("Where", [["dock", "dry dock"], ["river", "river"], ["sea", "sea"]], S.env, (v) => { S.env = v; upd(); }),
        toggle("Propeller", [["steel", "painted steel"], ["bronze", "bare bronze"]], S.prop, (v) => { S.prop = v; upd(); }),
        toggle("Paint", [["none", "none"], ["intact", "intact"], ["scratched", "scraped in places"]], S.paint, (v) => { S.paint = v; upd(); }),
        tgP,
        slider({ name: "DC dose", min: 0, max: 200, step: 10, value: S.dose, fmtv: (x) => x + "%", oninput: (v) => { S.dose = v; if (S.prot === "dc") upd(); } }),
        st.svg, legend(LEG.concat([["H₂ bubble", H2COL]])),
        h("div", { class: "btns" }, runBtn,
          h("button", { onclick: () => { S.anode = 100; upd(); } }, "Fit new anodes"),
          h("button", { onclick: () => { simOn = false; runBtn.textContent = "Run to year 20"; resetSim(); upd(); } }, "Reset the clock")),
        h("div", { class: "readout" }, sY, sL, sR, sW, sA), pl, status));
      upd();
      el.append(
        P("Things to try, each from an earlier step:"),
        h("ul", {},
          h("li", { html: "<b>Dry dock.</b> No electrolyte around the hull, so hardly any corrosion, and anodes cannot help either (step 4)." }),
          h("li", { html: "<b>Sea, scraped paint, bare bronze, no protection.</b> The worst line on the chart: a large bronze cathode feeding on small steel anodes (step 5). Now remove the paint altogether: the rate at the worst spot <i>drops</i>, because the anode became large." }),
          h("li", { html: "<b>Zinc anodes in the sea.</b> The steel loss stops, and the electrons and ions now leave from the zinc (step 6). Run the clock until the anodes are gone and watch the line bend upward again. Then try the same anodes on an unpainted hull: how long do they last?" }),
          h("li", { html: "<b>River.</b> Zinc protects only partly; magnesium does the job. Take magnesium to sea and it is gone in a couple of years." }),
          h("li", { html: "<b>Impressed current.</b> Find the dose that just stops the loss, then overdo it (step 7)." }),
          h("li", { html: "Real ships combine the cheap methods: paint as the barrier, so little steel is exposed, plus anodes or impressed current for the patches the paint misses. Bronze propellers survive untouched for the reason copper did in step 5, and stainless or titanium fittings rely on step 8." })),
        takeaway("Corrosion is a galvanic cell you did not ask for. Every protection method breaks one part of it: block the electrolyte and oxygen (paint), supply the electrons from elsewhere (sacrificial anode, impressed current), or let the metal seal itself (passivation).")
      );
      return stop;
    },
  });

  Course.run({
    id: "corrosion", section: "4. Running it backwards, and other ways to get current", title: "Corrosion: the battery you did not want",
    concepts: {
      corrosion: "corrosion", o2red: "oxygen reduction (O₂ + 2H₂O + 4e⁻ → 4OH⁻)", sites: "anodic / cathodic site", corrcell: "corrosion cell",
      rust: "rust chemistry (Fe₂O₃·xH₂O)", needs: "rusting needs water + oxygen", barrier: "barrier coating (paint)",
      galvcorr: "galvanic corrosion", area: "small anode, large cathode", sacrificial: "sacrificial anode", galvanising: "galvanising",
      cathprot: "cathodic protection", impressed: "impressed current", passivation: "passivation (oxide film)", stainless: "stainless steel",
      usefulcell: "corrosion as a battery",
    },
    sources: [
      { title: "OpenStax, Chemistry 2e, section 17.6: Corrosion", url: "https://openstax.org/books/chemistry-2e/pages/17-6-corrosion", note: "rusting as anodic and cathodic regions on one piece of iron, galvanising, stainless steel, sacrificial anodes; it writes the oxygen half-reaction in its acid form (O₂ + 4H⁺ + 4e⁻ → 2H₂O), this lesson uses the neutral-water form" },
      { title: "LibreTexts, Chemistry: The Central Science (Brown et al.), 20.8: Corrosion", url: "https://chem.libretexts.org/Bookshelves/General_Chemistry/Map%3A_Chemistry_-_The_Central_Science_(Brown_et_al.)/20%3A_Electrochemistry/20.08%3A_Corrosion", note: "the water-drop corrosion cell, tin plate versus galvanised steel, sacrificial anodes" },
      { title: "Wikipedia: Galvanic corrosion", url: "https://en.wikipedia.org/wiki/Galvanic_corrosion", note: "two metals in contact, the galvanic series in seawater, the small-anode area effect, the Statue of Liberty" },
      { title: "Wikipedia: Galvanic anode", url: "https://en.wikipedia.org/wiki/Galvanic_anode", note: "zinc for salt water, magnesium for soil and fresh water (bigger driving voltage), magnesium's fast self-corrosion and hydrogen risk in seawater" },
      { title: "Wikipedia: Cathodic protection", url: "https://en.wikipedia.org/wiki/Cathodic_protection", note: "galvanic anodes (zinc, magnesium, aluminium) versus impressed current, choice of anode by water type, overprotection and hydrogen" },
      { title: "Wikipedia: Passivation (chemistry)", url: "https://en.wikipedia.org/wiki/Passivation_(chemistry)", note: "nanometre-thick oxide films on aluminium, chromium (stainless steel) and titanium" },
      { title: "Wikipedia: Pilling–Bedworth ratio", url: "https://en.wikipedia.org/wiki/Pilling%E2%80%93Bedworth_ratio", note: "oxide-to-metal volume ratio: 2.14 for Fe₂O₃ on iron, the figure used for the swelling nail" },
      { title: "Wikipedia: Stainless steel", url: "https://en.wikipedia.org/wiki/Stainless_steel", note: "minimum chromium content of about 10.5% for the passive film; chloride pitting" },
      { title: "Wikipedia: Lemon battery", url: "https://en.wikipedia.org/wiki/Lemon_battery", note: "zinc and copper in lemon juice, typically 0.9 V and about 1 mA per cell, hydrogen evolution on the copper, three lemons for a red LED" },
    ],
    steps,
  });
})();
