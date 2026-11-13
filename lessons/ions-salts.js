// Lesson 0.3: Ions, salts and electrolytes
(function () {
  const { h, s, fmt, widget, stat, slider, toggle, rng } = Course;
  const E = Chem.elements, f = Chem.f;
  const RED = "var(--red)", BLUE = "var(--blue)", YEL = "var(--yellow)", GRN = "var(--green)", MUT = "var(--muted)";
  const P = (html) => h("p", { html });
  const takeaway = (html) => h("div", { class: "takeaway", html });
  const formula = (html) => h("div", { class: "formula", html });
  const note = (html, style) => h("div", { class: "note", style: style || "margin-top:8px", html });

  // ---------- small local SVG helpers ----------
  function svg(w, hh, maxw) { return s("svg", { viewBox: `0 0 ${w} ${hh}`, width: "100%", style: `display:block;margin:0 auto;max-width:${maxw || 560}px` }); }
  function add(parent, tag, attrs) { const e = s(tag, attrs || {}); parent.append(e); return e; }
  function txt(parent, x, y, str, o = {}) {
    const t = add(parent, "text", { x, y, "text-anchor": o.anchor || "middle", style: `fill:${o.fill || MUT};font-size:${o.size || 12}px;font-weight:${o.weight || 400}` });
    t.textContent = str; return t;
  }
  function ion(parent, x, y, r, label, color, size) {
    const g = add(parent, "g", { transform: `translate(${x},${y})` });
    g.c = add(g, "circle", { r, style: `fill:${color};fill-opacity:.22;stroke:${color};stroke-width:1.5` });
    g.t = label ? txt(g, 0, (size || 11) * 0.36, label, { fill: color, size: size || 11, weight: 600 }) : null;
    g.move = (nx, ny) => g.setAttribute("transform", `translate(${nx.toFixed(1)},${ny.toFixed(1)})`);
    return g;
  }
  function ticker() {
    const ids = new Set();
    return { every(fn, ms) { const id = setInterval(fn, ms); ids.add(id); return id; }, clear(id) { clearInterval(id); ids.delete(id); }, stop() { ids.forEach(clearInterval); ids.clear(); } };
  }
  const SUPS = { "-": "⁻", 0: "⁰", 1: "¹", 2: "²", 3: "³", 4: "⁴", 5: "⁵", 6: "⁶", 7: "⁷", 8: "⁸", 9: "⁹" };
  function sci(x, d = 2) {
    if (!x) return "0";
    let e = Math.floor(Math.log10(Math.abs(x))), m = x / Math.pow(10, e);
    if (+m.toFixed(d) >= 10) { m /= 10; e++; }
    return m.toFixed(d) + " × 10" + String(e).replace(/./g, (c) => SUPS[c]);
  }
  const gcd = (a, b) => (b ? gcd(b, a % b) : a);
  const M_NACL = E.Na.mass + E.Cl.mass; // 58.44 g/mol

  const steps = [];

  // ================================================================ 1
  steps.push({
    title: "After the electron jumps, the ions stick",
    short: "Opposite ions stick",
    newConcepts: ["ionicbond"],
    render(el) {
      const T = ticker();
      el.append(
        P("In <em>Atoms, electrons and charge</em> sodium handed its one <em>valence electron</em> to chlorine. Sodium became the <em>cation</em> Na⁺, chlorine the <em>anion</em> Cl⁻, both with full shells. <em>The periodic table</em> explained why: sodium, an alkali metal, lets go cheaply, and chlorine, a halogen, pulls hard. The story stopped there. This lesson is about what happens next."),
        P("What happens next is simple: <b>opposite charges attract.</b> The two ions pull on each other and stick together. Hand over the electron, then try to pull the ions apart with the slider.")
      );
      const PAIRS = [
        { min: 282, a: { l: "Na^+", q: 1, r: 102, col: RED }, b: { l: "Cl^-", q: -1, r: 181, col: BLUE } },
        { a: { l: "Mg^2+", q: 2, r: 72, col: RED }, b: { l: "O^2-", q: -2, r: 140, col: BLUE } },
        { a: { l: "Na^+", q: 1, r: 102, col: RED }, b: { l: "Na^+", q: 1, r: 102, col: RED } },
        { a: { l: "Cl^-", q: -1, r: 181, col: BLUE }, b: { l: "Cl^-", q: -1, r: 181, col: BLUE } },
      ];
      const KC = 8.988e9, F0 = (KC * Chem.E_CHARGE * Chem.E_CHARGE) / Math.pow(282e-12, 2); // 2.90e-9 N
      let pi = 0, d = 282, moved = false, anim = 0, animId = null;
      const sv = svg(400, 190);
      const lab = txt(sv, 200, 20, "", { size: 13 });
      const arrow = (col) => ({ l: add(sv, "line", { style: `stroke:${col};stroke-width:3` }), p: add(sv, "polygon", { style: `fill:${col}` }) });
      const arA = arrow(YEL), arB = arrow(YEL);
      const setArrow = (ar, x0, x1, y) => {
        const vis = Math.abs(x1 - x0) >= 2; ar.l.style.display = ar.p.style.display = vis ? "" : "none";
        if (!vis) return;
        const sg = Math.sign(x1 - x0), hd = Math.min(8, Math.abs(x1 - x0));
        ar.l.setAttribute("x1", x0); ar.l.setAttribute("y1", y); ar.l.setAttribute("x2", x1 - sg * hd); ar.l.setAttribute("y2", y);
        ar.p.setAttribute("points", `${x1},${y} ${x1 - sg * hd},${y - 5} ${x1 - sg * hd},${y + 5}`);
      };
      const gA = ion(sv, 0, 0, 20, "Na", GRN, 13), gB = ion(sv, 0, 0, 20, "Cl", GRN, 13);
      const eDot = add(sv, "circle", { r: 4.5, style: `fill:${YEL}` });
      const sD = stat("distance between centres", "b"), sF = stat("force", "y"), sR = stat("compared with touching Na⁺ Cl⁻", "");
      const paint = (g, col, label) => { g.c.setAttribute("style", `fill:${col};fill-opacity:.22;stroke:${col};stroke-width:1.5`); g.t.setAttribute("style", `fill:${col};font-size:13px;font-weight:600`); g.t.textContent = label; };
      function draw() {
        const p = PAIRS[pi], k = 0.2, y = 118;
        const neutral = pi === 0 && !moved;
        const ra = pi === 0 ? 186 + (102 - 186) * anim : p.a.r, rb = pi === 0 ? 99 + (181 - 99) * anim : p.b.r;
        const de = Math.max(d, p.min || p.a.r + p.b.r), sep = de * k, xa = 200 - sep / 2, xb = 200 + sep / 2;
        gA.move(xa, y); gB.move(xb, y); gA.c.setAttribute("r", ra * k); gB.c.setAttribute("r", rb * k);
        paint(gA, neutral ? GRN : p.a.col, neutral ? "Na" : f(p.a.l)); paint(gB, neutral ? GRN : p.b.col, neutral ? "Cl" : f(p.b.l));
        eDot.style.display = neutral ? "" : "none";
        const ex0 = xa + ra * k - 7, ex1 = xb - rb * k + 7;
        eDot.setAttribute("cx", ex0 + (ex1 - ex0) * anim); eDot.setAttribute("cy", y - 14 * Math.sin(Math.PI * anim));
        const F = neutral ? 0 : (KC * p.a.q * p.b.q * Chem.E_CHARGE * Chem.E_CHARGE) / Math.pow(de * 1e-12, 2); // < 0 = attraction
        const rel = Math.abs(F) / F0, attract = F < 0;
        let L = Math.min(62, 50 * rel); if (attract) L = Math.min(L, sep / 2 - 3);
        setArrow(arA, xa, xa + (attract ? L : -L), 52); setArrow(arB, xb, xb + (attract ? -L : L), 52);
        lab.textContent = neutral ? "two neutral atoms: no net pull yet" : attract ? "opposite charges: they pull together" : "same charge: they push apart";
        sD.set(Math.round(de) + " pm");
        sF.set(neutral ? "≈ 0" : (Math.abs(F) * 1e9).toFixed(2) + " nN " + (attract ? "pull" : "push"));
        sR.set(neutral ? "–" : fmt.pct(rel));
      }
      const pairTg = toggle("Ions:", PAIRS.map((p, i) => [i, f(p.a.l) + " and " + f(p.b.l)]), 0, (v) => { stopAnim(); pi = v; if (v !== 0) { moved = true; anim = 1; } draw(); });
      const sl = slider({ name: "distance", min: 200, max: 1200, step: 2, value: d, fmtv: (x) => Math.round(x) + " pm", oninput: (v) => { d = v; draw(); } });
      function stopAnim() { if (animId) { T.clear(animId); animId = null; } }
      function transfer() {
        if (moved || animId) return;
        pi = 0; pairTg.set(0);
        animId = T.every(() => { anim = Math.min(1, anim + 0.04); if (anim >= 1) { moved = true; stopAnim(); } draw(); }, 30);
      }
      el.append(widget("Sodium and chlorine, drawn to scale (1 pm = a millionth of a millionth of a metre)", sv, sl, pairTg,
        h("div", { class: "btns" },
          h("button", { class: "primary", onclick: transfer }, "Hand over the electron"),
          h("button", { onclick: () => { d = 282; sl.set(282); draw(); } }, "Let them touch (282 pm)"),
          h("button", { onclick: () => { d = 564; sl.set(564); draw(); } }, "Twice as far (564 pm)"),
          h("button", { onclick: () => { stopAnim(); moved = false; anim = 0; pi = 0; pairTg.set(0); draw(); } }, "Give the electron back")),
        h("div", { class: "readout" }, sD, sF, sR),
        note("Notice the sizes change too: Na⁺ lost its whole outer shell and shrinks, Cl⁻ gained an electron and swells. Ion radii used: Na⁺ 102 pm, Cl⁻ 181 pm, Mg²⁺ 72 pm, O²⁻ 140 pm.")));
      draw();
      el.append(
        P("Two things to notice. The pull dies off quickly with distance. And it grows with the size of the charges: Mg²⁺ and O²⁻ carry two charges each, so at the same distance they pull 2 × 2 = 4 times harder. Two ions with the same sign push each other away."),
        formula('force ∝ <span class="hl">charge₁ × charge₂</span> / <span class="bl">distance²</span><small>Coulomb\'s law: the same electric force that holds an electron to its nucleus</small>'),
        P("This attraction between a cation and an anion is called an <b>ionic bond</b>. There is no hook and nothing is shared. It is plain electric attraction between a giver that gave and a taker that took."),
        takeaway("After a metal atom gives electrons to a non-metal atom, the two ions attract each other. That attraction is the ionic bond.")
      );
      return () => T.stop();
    },
    check: {
      type: "number", q: "Na⁺ and Cl⁻ touch at 282 pm. You pull them to <b>twice</b> that distance. The pull drops to what percentage of its original value?",
      answer: 0.25, alsoPercent: true, tolerance: 0.005, shown: "25%",
      hint: "The force goes with 1 / distance². Use the “Twice as far” button and read the third tile.", why: "25%. Distance × 2 means force ÷ 2² = ÷ 4.",
    },
  });

  // ================================================================ 2
  steps.push({
    title: "Not a pair: a crystal lattice",
    short: "The crystal lattice",
    newConcepts: ["lattice"],
    render(el) {
      const T = ticker();
      el.append(
        P("An Na⁺ ion does not pull in one direction only. It pulls on <i>every</i> Cl⁻ nearby, and each Cl⁻ pulls on every Na⁺ nearby. Put a huge number of both together (a grain of table salt holds around 10¹⁸ of each) and they settle into the arrangement where every ion is surrounded by ions of the opposite sign. That regular, repeating pattern is a <b>crystal lattice</b>."),
        P("Click any ion: its nearest neighbours get a yellow ring. This is one flat slice; in the real three-dimensional crystal there is also a neighbour above and one below, so every Na⁺ touches 6 Cl⁻ and every Cl⁻ touches 6 Na⁺.")
      );
      let n = 6, sel = [2, 2], shift = 0, lift = 0, sheared = false, animId = null;
      const C = 36, sv = svg(300, 270, 420);
      const gLines = add(sv, "g"), gIons = add(sv, "g"), gMarks = add(sv, "g");
      const sNa = stat("Na⁺ ions", "r"), sCl = stat("Cl⁻ ions", "b"), sQ = stat("total charge", "g"), sN = stat("opposite neighbours of the selected ion", "y");
      const pos = (i, j) => { const top = j < n / 2; return [150 - (n * C) / 2 + C / 2 + i * C + (top ? shift * C : 0) - (shift * C) / 2, 142 - (n * C) / 2 + C / 2 + j * C + (top ? -lift : lift)]; };
      function draw() {
        gLines.innerHTML = ""; gIons.innerHTML = ""; gMarks.innerHTML = "";
        const [si, sj] = sel, [sx, sy] = pos(si, sj), sNaIon = (si + sj) % 2 === 0;
        let opp = 0, same = 0;
        for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
          const na = (i + j) % 2 === 0, [x, y] = pos(i, j);
          const g = ion(gIons, x, y, na ? 13 : 22, f(na ? "Na^+" : "Cl^-"), na ? RED : BLUE, 11);
          g.style.cursor = "pointer"; g.addEventListener("click", () => { sel = [i, j]; draw(); });
          const dist = Math.hypot(x - sx, y - sy);
          if (i === si && j === sj) g.c.setAttribute("style", g.c.getAttribute("style") + `;stroke:${YEL};stroke-width:3;fill-opacity:.6`);
          else if (dist < C * 1.1) {
            if (na !== sNaIon) opp++; else same++;
            add(gLines, "circle", { cx: x, cy: y, r: (na ? 13 : 22) + 4, style: `fill:none;stroke:${na !== sNaIon ? YEL : RED};stroke-width:2.5${na !== sNaIon ? "" : ";stroke-dasharray:4 3"}` });
          }
        }
        if (sheared && shift >= 1) for (let i = 0; i < n - 1; i++) { const [x, y] = pos(i + 1, n / 2); txt(gMarks, x, y - C / 2 - lift + 5, "↕", { fill: RED, size: 15, weight: 700 }); }
        sNa.set(String((n * n) / 2)); sCl.set(String((n * n) / 2)); sQ.set("0");
        sN.set(opp + (same ? ` (and ${same} same-sign!)` : "") + (!sheared && opp === 4 ? " here, 6 in 3-D" : ""));
      }
      function stopAnim() { if (animId) { T.clear(animId); animId = null; } }
      function hit() {
        if (sheared) return; sheared = true;
        animId = T.every(() => {
          if (shift < 1) shift = Math.min(1, shift + 0.08); else if (lift < 9) lift += 1; else stopAnim();
          draw();
        }, 30);
      }
      function reset() { stopAnim(); sheared = false; shift = 0; lift = 0; draw(); }
      el.append(widget("A slice through a sodium chloride crystal (to scale: centres 282 pm apart)", sv,
        slider({ name: "size", min: 2, max: 6, step: 2, value: n, fmtv: (x) => x + " × " + x, oninput: (v) => { n = v; sel = n > 2 ? [n / 2 - 1, n / 2] : [0, 1]; reset(); } }),
        h("div", { class: "btns" },
          h("button", { class: "primary", onclick: hit }, "Hit it: shift the top half one place"),
          h("button", { onclick: reset }, "Repair the crystal")),
        h("div", { class: "readout" }, sNa, sCl, sQ, sN)));
      sel = [2, 3]; draw();
      el.append(
        P("So there is no separate “Na–Cl pair” anywhere in the crystal. Every ion belongs to all its neighbours. The formula <b>NaCl</b> only states the ratio: one Na⁺ for every Cl⁻, which makes the whole crystal neutral. Chemists call any substance built this way, a lattice of cations and anions, a <b>salt</b>. Table salt is just the most famous one."),
        P("Now hit the crystal. Shifting one half by a single position puts Na⁺ next to Na⁺ and Cl⁻ next to Cl⁻. The attraction turns into repulsion and the crystal splits. That is why salts are hard but brittle: they shatter instead of bending."),
        takeaway("Ions do not pair up. They pack into a crystal lattice in which each ion is surrounded by opposite ions; a substance built like this is a salt.")
      );
      return () => T.stop();
    },
    check: {
      type: "choice", q: "A grain of salt contains about 6 × 10¹⁷ Na⁺ ions. What does the formula NaCl tell you about it?",
      options: ["It is made of 6 × 10¹⁷ separate Na–Cl pairs, each Na⁺ bonded to exactly one Cl⁻", "It also contains 6 × 10¹⁷ Cl⁻ ions: the formula is the ratio 1 : 1", "Each crystal contains one sodium and one chlorine"],
      answer: 1,
      wrongHints: { 0: "Click an ion in the widget: it is held by several opposite neighbours at once (6 in the real crystal), not by one partner.", 2: "The formula does not count the ions in a crystal, only their ratio. A grain holds an astronomical number of each." },
      why: "The formula of a salt is a ratio. One Cl⁻ per Na⁺ keeps the crystal neutral, but no ion has a single partner.",
    },
  });

  // ---------- formula builder (steps 3 and 4) ----------
  function builder(cations, anions, init, onchange) {
    let ci = init.ci, ai = init.ai, nc = init.nc, na = init.na;
    const MAXN = 4, sv = svg(400, 168); sv.setAttribute("viewBox", "32 0 336 168");
    const gBeam = add(sv, "g");
    add(sv, "polygon", { points: "200,100 186,128 214,128", style: "fill:var(--panel2);stroke:var(--line)" });
    const tPos = txt(sv, 60, 160, "", { fill: RED, size: 14, weight: 600 }), tNeg = txt(sv, 340, 160, "", { fill: BLUE, size: 14, weight: 600 }), tNet = txt(sv, 200, 160, "", { size: 14, weight: 600 });
    const verdict = h("div", { style: "min-height:52px;margin-top:8px;font-size:16px" });
    const nC = h("span", { class: "mono", style: "min-width:92px;text-align:center;display:inline-block" }), nA = h("span", { class: "mono", style: "min-width:92px;text-align:center;display:inline-block" });
    const plain = (c, a, x, y) => c.sym + (x > 1 ? x : "") + (a.poly && y > 1 ? "(" + a.sym + ")" : a.sym) + (y > 1 ? y : "");
    function draw() {
      const c = cations[ci], a = anions[ai], pos = nc * c.q, neg = na * a.q, net = pos - neg;
      const ang = Math.max(-9, Math.min(9, -net * 3));
      gBeam.innerHTML = ""; gBeam.setAttribute("transform", `rotate(${ang},200,98)`);
      add(gBeam, "line", { x1: 28, y1: 98, x2: 372, y2: 98, style: "stroke:var(--muted);stroke-width:4;stroke-linecap:round" });
      for (let i = 0; i < nc; i++) ion(gBeam, 172 - i * 38, 78, 17, f(c.l), RED, 11);
      for (let i = 0; i < na; i++) ion(gBeam, 228 + i * 38, 78, 17, f(a.l), BLUE, a.poly ? 10 : 11);
      tPos.textContent = "+" + pos; tNeg.textContent = "−" + neg; tNet.textContent = "net " + (net > 0 ? "+" : net < 0 ? "−" : "") + Math.abs(net);
      tNet.style.fill = net === 0 && nc && na ? GRN : MUT;
      nC.textContent = nc + " × " + f(c.l); nA.textContent = na + " × " + f(a.l);
      const g = gcd(nc, na);
      if (!nc || !na) verdict.innerHTML = "Put at least one of each ion on the scale.";
      else if (net > 0) verdict.innerHTML = `Net charge <b style="color:${RED}">+${net}</b>: too positive. Add ${f(a.l)} or remove ${f(c.l)}.`;
      else if (net < 0) verdict.innerHTML = `Net charge <b style="color:${BLUE}">−${-net}</b>: too negative. Add ${f(c.l)} or remove ${f(a.l)}.`;
      else if (g > 1) verdict.innerHTML = `Neutral, but a formula uses the smallest whole-number ratio. Divide both counts by ${g}: <b style="color:${GRN}">${f(plain(c, a, nc / g, na / g))}</b>.`;
      else verdict.innerHTML = `<span style="color:${GRN}">✓ Neutral.</span> Formula: <b style="font-size:22px;color:var(--yellow)">${f(plain(c, a, nc, na))}</b> &nbsp;${c.name} ${a.name}`;
      onchange && onchange(c, a);
    }
    const stepper = (get, set, span) => h("div", { style: "display:flex;gap:6px;align-items:center" },
      h("button", { onclick: () => { set(Math.max(0, get() - 1)); draw(); } }, "−"), span,
      h("button", { onclick: () => { set(Math.min(MAXN, get() + 1)); draw(); } }, "+"));
    const box = h("div", {},
      toggle("Cation:", cations.map((c, i) => [i, f(c.l)]), ci, (v) => { ci = v; draw(); }),
      toggle("Anion:", anions.map((a, i) => [i, f(a.l)]), ai, (v) => { ai = v; draw(); }),
      h("div", { style: "display:flex;gap:10px 28px;flex-wrap:wrap;justify-content:center;margin:14px 0 4px" }, stepper(() => nc, (v) => (nc = v), nC), stepper(() => na, (v) => (na = v), nA)),
      sv, verdict,
      h("div", { class: "btns" }, h("button", { onclick: () => { const c = cations[ci], a = anions[ai], g = gcd(c.q, a.q); nc = a.q / g; na = c.q / g; draw(); } }, "Balance it for me")));
    draw();
    return box;
  }

  // ================================================================ 3
  steps.push({
    title: "Charge balance writes the formula",
    short: "Formulas from charges",
    newConcepts: ["formula"],
    render(el) {
      el.append(
        P("A crystal as a whole is neutral: the positive charges and the negative charges must cancel exactly. With Na⁺ and Cl⁻ that takes one of each. But magnesium sits in group 2 and gives away two electrons, so its <em>typical ion charge</em> (from <em>The periodic table</em>) is 2+. One Cl⁻ cannot cancel one Mg²⁺."),
        P("The scale below tips toward whichever charge is in excess. Add and remove ions until it is level.")
      );
      el.append(widget("Balance the charges",
        builder(
          [{ sym: "Na", l: "Na^+", q: 1, name: "sodium" }, { sym: "Mg", l: "Mg^2+", q: 2, name: "magnesium" }, { sym: "Ca", l: "Ca^2+", q: 2, name: "calcium" }, { sym: "Al", l: "Al^3+", q: 3, name: "aluminium" }],
          [{ sym: "Cl", l: "Cl^-", q: 1, name: "chloride" }, { sym: "O", l: "O^2-", q: 2, name: "oxide" }, { sym: "N", l: "N^3-", q: 3, name: "nitride" }],
          { ci: 1, ai: 0, nc: 1, na: 1 })));
      el.append(
        P("That is the whole rule: <b>total positive charge = total negative charge</b>, using the smallest whole numbers that work. The count of each ion is written as a small number after its symbol (a 1 is left out), cation first:"),
        formula('<span class="hl">Mg</span><span class="bl">Cl₂</span> &nbsp;=&nbsp; 1 × (2+) and 2 × (1−) &nbsp;→&nbsp; +2 − 2 = 0<small>the charges themselves are not written in the formula: they have cancelled</small>'),
        P("The name is the metal's name followed by the non-metal's name ending in <i>-ide</i>: magnesium chloride. Now try Al³⁺ with O²⁻. Three does not divide by two, so you need six of each charge: two Al³⁺ and three O²⁻, giving <b>Al₂O₃</b>, aluminium oxide."),
        takeaway("A salt's formula is the smallest whole-number ratio of cations to anions whose charges add up to zero: NaCl, MgCl₂, Al₂O₃.")
      );
    },
    check: {
      type: "number", q: "Aluminium (group 13) forms Al³⁺. Sulfur (group 16) forms S²⁻. In aluminium sulfide, how many S²⁻ ions are there for every <b>2</b> Al³⁺ ions?",
      answer: 3, tolerance: 0, hint: "Two Al³⁺ carry +6 in total. How many 2− ions make −6?", why: "3. Two Al³⁺ give +6 and three S²⁻ give −6: Al₂S₃, the same pattern as Al₂O₃.",
    },
  });

  // ================================================================ 4
  steps.push({
    title: "Ions made of several atoms",
    short: "Polyatomic ions",
    newConcepts: ["polyatomic"],
    render(el) {
      el.append(
        P("So far every ion was a single atom. Some ions are a small <b>group of atoms</b> bound tightly to each other (they share electrons among themselves; how that works is covered in <em>Silicon and light</em>). The group as a whole holds one or two electrons more than its protons can cancel, so the whole group carries the charge. It moves around as one unit and behaves like a single anion. These are <b>polyatomic ions</b>."),
        P("Three of them appear in nearly every battery in this course: <b>sulfate</b> SO₄²⁻, <b>hydroxide</b> OH⁻ and <b>nitrate</b> NO₃⁻. The extra electrons came, as always, from a metal that gave them away. Pick an anion and check the bookkeeping, then balance it against a cation.")
      );
      const AN = [
        { sym: "SO4", l: "SO4^2-", q: 2, name: "sulfate", poly: true, atoms: [["S", 1], ["O", 4]] },
        { sym: "OH", l: "OH^-", q: 1, name: "hydroxide", poly: true, atoms: [["O", 1], ["H", 1]] },
        { sym: "NO3", l: "NO3^-", q: 1, name: "nitrate", poly: true, atoms: [["N", 1], ["O", 3]] },
      ];
      const sv = svg(190, 150, 210), tb = h("table", { class: "small", style: "flex:1;min-width:220px" });
      function show(c, a) {
        sv.innerHTML = "";
        add(sv, "ellipse", { cx: 95, cy: 78, rx: 82, ry: 66, style: `fill:none;stroke:${BLUE};stroke-dasharray:5 4` });
        txt(sv, 166, 22, a.q === 1 ? "−" : a.q + "−", { fill: BLUE, size: 18, weight: 700 });
        const [cen, sat] = a.atoms, k = sat[1];
        if (a.sym === "OH") { ion(sv, 80, 78, 24, "O", MUT, 15); ion(sv, 122, 78, 14, "H", MUT, 13); }
        else {
          for (let i = 0; i < k; i++) { const an = -Math.PI / 2 + (i * 2 * Math.PI) / k; ion(sv, 95 + 38 * Math.cos(an), 78 + 38 * Math.sin(an), 18, "O", MUT, 14); }
          ion(sv, 95, 78, 20, cen[0], MUT, 15).c.style.fillOpacity = ".5";
        }
        let prot = 0;
        tb.innerHTML = "<tr><th>atom</th><th class='num'>protons each</th><th class='num'>count</th><th class='num'>protons</th></tr>";
        a.atoms.forEach(([sym, cnt]) => { prot += E[sym].Z * cnt; tb.append(h("tr", {}, h("td", {}, E[sym].name), h("td", { class: "num" }, String(E[sym].Z)), h("td", { class: "num" }, String(cnt)), h("td", { class: "num" }, String(E[sym].Z * cnt)))); });
        tb.append(h("tr", {}, h("td", { colspan: 3 }, "protons in the group"), h("td", { class: "num", style: `color:${RED}` }, "+" + prot)));
        tb.append(h("tr", {}, h("td", { colspan: 3 }, "electrons in the group"), h("td", { class: "num", style: `color:${YEL}` }, "−" + (prot + a.q))));
        tb.append(h("tr", {}, h("td", { colspan: 3, html: `<b>charge of ${f(a.l)}</b>` }), h("td", { class: "num", style: `color:${BLUE}` }, "−" + a.q)));
      }
      const b = builder(
        [{ sym: "Na", l: "Na^+", q: 1, name: "sodium" }, { sym: "Ca", l: "Ca^2+", q: 2, name: "calcium" }, { sym: "Cu", l: "Cu^2+", q: 2, name: "copper" }, { sym: "Zn", l: "Zn^2+", q: 2, name: "zinc" }, { sym: "Al", l: "Al^3+", q: 3, name: "aluminium" }],
        AN, { ci: 1, ai: 1, nc: 1, na: 1 }, show);
      el.append(widget("A group of atoms with one shared charge", b,
        h("div", { style: "display:flex;gap:10px 18px;flex-wrap:wrap;align-items:center;margin-top:14px;border-top:1px solid var(--line);padding-top:12px" }, h("div", { style: "flex:0 1 190px;min-width:150px" }, sv), tb)));
      el.append(
        P("In a formula a polyatomic ion is balanced exactly like a single-atom ion. When you need more than one of it, put it in <b>brackets</b> so the count applies to the whole group: Ca(OH)₂ is one Ca²⁺ with two complete OH⁻ units. The name is simply cation, then anion: calcium hydroxide."),
        P("Copper and zinc are metals from the middle of the table, where the group number does not hand you the charge. Take it as given for now that both commonly form 2+ ions. Their sulfates, <b>CuSO₄</b> and <b>ZnSO₄</b>, are the stars of the next few lessons."),
        takeaway("A polyatomic ion is a bound group of atoms with a net charge. In formulas it counts as one ion; brackets mark more than one: Ca(OH)₂, Al₂(SO₄)₃.")
      );
    },
    check: {
      type: "number", q: "Aluminium sulfate is Al₂(SO₄)₃. How many <b>oxygen atoms</b> are in one formula unit?",
      answer: 12, tolerance: 0, hint: "The 3 outside the bracket multiplies everything inside it.", why: "12. Three sulfate ions, four oxygen atoms in each. (Charges: 2 × 3+ = +6 and 3 × 2− = −6.)", backTo: 2,
    },
  });

  // ================================================================ 5
  steps.push({
    title: "Counting ions by weighing: the mole",
    short: "The mole",
    newConcepts: ["mole", "molarmass"],
    render(el) {
      el.append(
        P("Formulas are about <i>counts</i>: one Na⁺ per Cl⁻. But nobody can count 10¹⁸ ions. What you can do is weigh them. The catch: atoms of different elements have different masses. The periodic table lists them, on a relative scale: Na 22.99, Cl 35.45. A chlorine atom is about 1.5 times heavier than a sodium atom, so one gram of each would <i>not</i> contain equal numbers."),
        P("Chemists fix this with a counting unit, like a dozen but far bigger. One <b>mole</b> (mol) is 6.022 × 10²³ particles. The number is chosen so that one mole of an element weighs its table mass <i>in grams</i>: a mole of sodium is 22.99 g, a mole of chlorine 35.45 g. Same count, different weight."),
        P("For a salt, add up the atoms in its formula. That sum is its <b>molar mass</b>, in grams per mole. (An ion weighs practically the same as its atom: electrons are about 1800 times lighter than a proton.)")
      );
      const SUBS = [
        { fm: "NaCl", comp: [["Na", 1], ["Cl", 1]], ions: 2 }, { fm: "MgCl2", comp: [["Mg", 1], ["Cl", 2]], ions: 3 },
        { fm: "CuSO4", comp: [["Cu", 1], ["S", 1], ["O", 4]], ions: 2 }, { fm: "Al2O3", comp: [["Al", 2], ["O", 3]], ions: 5 }, { fm: "NaOH", comp: [["Na", 1], ["O", 1], ["H", 1]], ions: 2 },
      ];
      let si = 0, m = 58.44;
      const tb = h("table", { class: "small" });
      const sv = svg(400, 92);
      const sM = stat("molar mass", "b"), sN = stat("amount", "y"), sU = stat("formula units", "g"), sI = stat("ions in total", "");
      function draw() {
        const S = SUBS[si], M = S.comp.reduce((a, [e, c]) => a + E[e].mass * c, 0), nmol = m / M;
        tb.innerHTML = "<tr><th>atom</th><th class='num'>mass of 1 mol (g)</th><th class='num'>× count</th><th class='num'>g</th></tr>";
        S.comp.forEach(([e, c]) => tb.append(h("tr", {}, h("td", {}, e + " (" + E[e].name + ")"), h("td", { class: "num" }, E[e].mass.toFixed(2)), h("td", { class: "num" }, "× " + c), h("td", { class: "num" }, (E[e].mass * c).toFixed(2)))));
        tb.append(h("tr", {}, h("td", { colspan: 3, html: `<b>molar mass of ${f(S.fm)}</b>` }), h("td", { class: "num", style: `color:${BLUE}` }, M.toFixed(2))));
        sv.innerHTML = "";
        for (let i = 0; i < 5; i++) {
          const x = 14 + i * 76, fill = Math.max(0, Math.min(1, nmol - i));
          add(sv, "rect", { x, y: 8, width: 64, height: 60, rx: 5, style: "fill:var(--panel2);stroke:var(--line)" });
          if (fill > 0) add(sv, "rect", { x: x + 1, y: 8 + 60 * (1 - fill), width: 62, height: 60 * fill, rx: 4, style: `fill:${YEL};fill-opacity:.55` });
          txt(sv, x + 32, 84, "mole " + (i + 1), { size: 11 });
        }
        sM.set(M.toFixed(2) + " g/mol"); sN.set(nmol.toFixed(3) + " mol"); sU.set(sci(nmol * Chem.N_A)); sI.set(sci(nmol * Chem.N_A * S.ions));
      }
      const sl = slider({ name: "mass", min: 1, max: 200, step: 1, value: m, fmtv: (x) => (+x).toFixed(x % 1 ? 2 : 0) + "\u00a0g", oninput: (v) => { m = v; draw(); } });
      el.append(widget("Weigh out a salt, read off how many ions you have",
        toggle("Salt:", SUBS.map((S, i) => [i, f(S.fm)]), 0, (v) => { si = v; draw(); }),
        h("div", { style: "margin-top:10px" }, tb), sl, sv,
        h("div", { class: "readout" }, sM, sN, sU, sI),
        h("div", { class: "btns" },
          h("button", { onclick: () => { const S = SUBS[si]; m = +S.comp.reduce((a, [e, c]) => a + E[e].mass * c, 0).toFixed(2); sl.set(m); draw(); } }, "Weigh out exactly 1 mol"),
          h("button", { onclick: () => { m = 1; sl.set(1); draw(); } }, "Just 1 gram"))));
      draw();
      el.append(
        formula('<span class="hl">moles</span> = mass in grams / <span class="bl">molar mass</span><small>1 mol = 6.022 × 10²³ formula units. “Formula unit” = one NaCl\'s worth of ions, since a salt has no separate pairs.</small>'),
        P("Even one gram of salt holds about 10²² formula units. The mole is what lets a balance do the counting: later, when a battery reaction says “one zinc atom gives two electrons”, moles turn that into grams of zinc and amounts of charge."),
        takeaway("A mole is 6.022 × 10²³ particles. The molar mass (sum of the table masses, in g/mol) converts grams into moles: moles = grams / molar mass.")
      );
    },
    check: {
      type: "number", q: "The molar mass of NaCl is 58.44 g/mol. How many <b>moles</b> of NaCl are in 117 g of salt? (round to one decimal)",
      answer: 2, tolerance: 0.02, hint: "moles = grams / molar mass = 117 / 58.44.", why: "117 / 58.44 ≈ 2.0 mol: about 1.2 × 10²⁴ Na⁺ ions and as many Cl⁻.",
    },
  });

  // ================================================================ 6
  steps.push({
    title: "Water pulls the crystal apart",
    short: "Dissolving",
    newConcepts: ["water", "dissociation"],
    render(el) {
      const T = ticker(), R = rng(7);
      el.append(
        P("Drop salt into water and the crystal vanishes. The ions are not destroyed. They are pulled out of the lattice, one by one, by water."),
        P("Water is made of <b>molecules</b>: small, neutral groups of atoms bound together, here one oxygen and two hydrogens, H₂O. Oxygen has the higher <em>electronegativity</em> (3.44 against 2.20, from <em>The periodic table</em>), so it hogs the electrons it shares with the hydrogens. The molecule stays neutral overall, but its oxygen end is slightly negative and its hydrogen ends slightly positive. It is a <b>polar</b> molecule: a tiny object with a + side and a − side."),
        P("That is all it takes. Water molecules turn their negative oxygen toward a cation and their positive hydrogens toward an anion, crowd around an ion at the crystal's surface and tug it free. Add water and watch.")
      );
      const SUBS = [
        { fm: "NaCl", eq: "NaCl(s) -> Na^+(aq) + Cl^-(aq)", cols: 4, rows: 4, cat: { l: "Na^+", r: 10 }, an: { l: "Cl^-", r: 12.5 }, isCat: (i, j) => (i + j) % 2 === 0 },
        { fm: "MgCl2", eq: "MgCl2(s) -> Mg^2+(aq) + 2Cl^-(aq)", cols: 3, rows: 4, cat: { l: "Mg^2+", r: 10.5 }, an: { l: "Cl^-", r: 12.5 }, isCat: (i) => i === 1 },
        { fm: "CuSO4", eq: "CuSO4(s) -> Cu^2+(aq) + SO4^2-(aq)", cols: 4, rows: 4, cat: { l: "Cu^2+", r: 10.5 }, an: { l: "SO4^2-", r: 14 }, isCat: (i, j) => (i + j) % 2 === 0 },
      ];
      const sv = svg(400, 285);
      const liquid = add(sv, "rect", { x: 61, width: 278, style: "fill:#3b82c4;fill-opacity:.16" });
      add(sv, "path", { d: "M60,30 L60,265 Q60,270 65,270 L335,270 Q340,270 340,265 L340,30", style: "fill:none;stroke:var(--muted);stroke-width:2" });
      const gI = add(sv, "g");
      const eq = h("div", { class: "formula", style: "margin:10px 0 0" });
      const sL = stat("ions still in the crystal", ""), sC = stat("free cations", "r"), sA = stat("free anions", "b");
      let si = 0, ions = [], wet = false, level = 0, cnt = 0;
      function waterGlyphs(g, r, cat) {
        const gw = add(g, "g", { style: "display:none" });
        for (let k = 0; k < 3; k++) {
          const a = Math.PI / 2 + (k * 2 * Math.PI) / 3 + 0.5;
          const at = (rad, da) => [rad * Math.cos(a + da), rad * Math.sin(a + da)];
          const O = at(cat ? r + 5 : r + 8, 0), H1 = cat ? at(r + 10, 0.3) : at(r + 3.2, 0), H2 = cat ? at(r + 10, -0.3) : at(r + 11, 0.35);
          add(gw, "circle", { cx: O[0], cy: O[1], r: 3.4, style: "fill:#8ec5ff" });
          add(gw, "circle", { cx: H1[0], cy: H1[1], r: 1.9, style: "fill:#ffb0b0" }); add(gw, "circle", { cx: H2[0], cy: H2[1], r: 1.9, style: "fill:#ffb0b0" });
        }
        return gw;
      }
      function build() {
        const S = SUBS[si], C = 30; gI.innerHTML = ""; ions = []; wet = false; level = 0; cnt = 0;
        for (let j = 0; j < S.rows; j++) for (let i = 0; i < S.cols; i++) {
          const cat = S.isCat(i, j), sp = cat ? S.cat : S.an;
          const hx = 200 - (S.cols * C) / 2 + C / 2 + i * C, hy = 268 - S.rows * C + C / 2 + j * C;
          const g = ion(gI, hx, hy, sp.r, f(sp.l), cat ? RED : BLUE, sp.l.length > 5 ? 8.5 : 9.5);
          ions.push({ g, gw: waterGlyphs(g, sp.r, cat), cat, hx, hy, x: hx, y: hy, vx: 0, vy: 0, free: false, order: j * 10 - Math.abs(i - (S.cols - 1) / 2) });
        }
        ions.sort((a, b) => a.order - b.order);
        eq.innerHTML = f(S.eq) + "<small>(s) = solid crystal, (aq) = dissolved in water, each ion wrapped in water molecules</small>";
        paint();
      }
      function paint() {
        const hgt = 205 * level; liquid.setAttribute("y", 269 - hgt); liquid.setAttribute("height", hgt);
        let nl = 0, nc = 0, na = 0;
        ions.forEach((o) => { o.g.move(o.x, o.y); o.gw.style.display = o.free ? "" : "none"; if (!o.free) nl++; else if (o.cat) nc++; else na++; });
        sL.set(String(nl)); sC.set(String(nc)); sA.set(String(na));
      }
      T.every(() => {
        if (wet && level < 1) level = Math.min(1, level + 0.06);
        if (wet && level >= 1 && ++cnt % 7 === 0) {
          const o = ions.find((q) => !q.free);
          if (o) { o.free = true; o.vx = (R() - 0.5) * 3; o.vy = -1.5 - R(); gI.append(o.g); }
        }
        let allHome = true;
        ions.forEach((o) => {
          if (!o.free) return;
          if (wet) {
            o.vx = (o.vx + (R() - 0.5) * 0.7) * 0.94; o.vy = (o.vy + (R() - 0.5) * 0.7) * 0.94; o.x += o.vx; o.y += o.vy;
            if (o.x < 84) { o.x = 84; o.vx = Math.abs(o.vx); } if (o.x > 316) { o.x = 316; o.vx = -Math.abs(o.vx); }
            if (o.y < 92) { o.y = 92; o.vy = Math.abs(o.vy); } if (o.y > 246) { o.y = 246; o.vy = -Math.abs(o.vy); }
          } else {
            o.x += (o.hx - o.x) * 0.14; o.y += (o.hy - o.y) * 0.14;
            if (Math.hypot(o.hx - o.x, o.hy - o.y) < 0.8) { o.x = o.hx; o.y = o.hy; o.free = false; } else allHome = false;
          }
        });
        if (!wet && allHome && level > 0) level = Math.max(0, level - 0.05);
        paint();
      }, 40);
      const wsv = svg(400, 62, 420);
      ion(wsv, 60, 30, 15, "O", "#8ec5ff", 13); ion(wsv, 84, 18, 8, "H", "#ffb0b0", 10); ion(wsv, 84, 42, 8, "H", "#ffb0b0", 10);
      txt(wsv, 30, 34, "δ−", { fill: BLUE, size: 14, weight: 600 }); txt(wsv, 106, 34, "δ+", { fill: RED, size: 14, weight: 600 });
      txt(wsv, 130, 26, "one water molecule, H₂O: neutral overall,", { anchor: "start", size: 12 });
      txt(wsv, 130, 43, "δ = “slightly”: O end −, H ends +", { anchor: "start", size: 12 });
      el.append(widget("A salt crystal in a beaker (schematic: a real grain has ~10¹⁸ ions and far more water)",
        toggle("Salt:", SUBS.map((S, i) => [i, f(S.fm)]), 0, (v) => { si = v; build(); }), wsv, sv,
        h("div", { class: "btns" },
          h("button", { class: "primary", onclick: () => { wet = true; } }, "Add water"),
          h("button", { onclick: () => { wet = false; } }, "Evaporate the water"),
          h("button", { onclick: build }, "Reset")),
        h("div", { class: "readout" }, sL, sC, sA), eq));
      build();
      el.append(
        P("The lattice falling apart into separate, freely moving ions is called <b>dissociation</b>. Three things to check in the widget. MgCl₂ releases <i>two</i> Cl⁻ for every Mg²⁺, exactly as its formula says. In CuSO₄ the sulfate ion stays in one piece: water separates ion from ion, not atom from atom inside a polyatomic ion. And evaporating the water brings the crystal back: nothing was used up."),
        P("Not every salt does this. In Al₂O₃ the 3+ and 2− ions hold each other so strongly (step 1: bigger charges, bigger pull) that water cannot pry them loose, and it barely dissolves."),
        takeaway("Polar water molecules pull a salt's ions out of the lattice. Dissociation turns one solid into free cations and anions, in the ratio given by the formula.")
      );
      return () => T.stop();
    },
    check: {
      type: "number", q: "0.5 mol of MgCl₂ dissolves completely: " + f("MgCl2(s) -> Mg^2+(aq) + 2Cl^-(aq)") + ". How many <b>moles of Cl⁻</b> are now in the water?",
      answer: 1, tolerance: 0.01, hint: "Each formula unit of MgCl₂ releases two Cl⁻.", why: "1 mol. Every MgCl₂ gives one Mg²⁺ and two Cl⁻, so 0.5 mol of salt gives 0.5 mol Mg²⁺ and 1 mol Cl⁻.", backTo: 2,
    },
  });

  // ================================================================ 7
  steps.push({
    title: "How crowded: concentration",
    short: "Concentration (mol/L)",
    newConcepts: ["conc"],
    render(el) {
      el.append(
        P("Salt dissolved in water is called a <i>solution</i>. Two solutions made from the same salt can behave very differently: a pinch of salt in a bathtub is not seawater. What matters is not how many ions there are, but <b>how crowded</b> they are: the amount of dissolved salt per volume of solution."),
        P("Amounts are counted in <em>moles</em> (previous step) and volume in litres, so the unit is moles per litre, mol/L. This number is the <b>concentration</b>. Change the mass and the volume below and watch the crowding.")
      );
      const R = rng(11), K = 34, CSAT = 5.4, NDOT = 190;
      const pts = Array.from({ length: NDOT * 2 }, () => [R(), R()]);
      let m = 29.22, V = 1;
      const sv = svg(400, 262);
      const liquid = add(sv, "rect", { x: 111, width: 178, style: "fill:#3b82c4;fill-opacity:.16" });
      const solid = add(sv, "rect", { x: 111, width: 178, style: "fill:#dfe6ee;fill-opacity:.75" });
      add(sv, "path", { d: "M110,20 L110,245 Q110,250 115,250 L285,250 Q290,250 290,245 L290,20", style: "fill:none;stroke:var(--muted);stroke-width:2" });
      const vLab = txt(sv, 300, 0, "", { anchor: "start", size: 12 }), sLab = txt(sv, 100, 246, "", { anchor: "end", size: 11 });
      const dots = pts.map((_, i) => add(sv, "circle", { r: 2.8, style: `fill:${i % 2 ? BLUE : RED}` }));
      const sN = stat("dissolved NaCl", ""), sC = stat("concentration", "y"), sI = stat("[Na⁺] = [Cl⁻]", "b"), sX = stat("undissolved", "r");
      function draw() {
        const n = m / M_NACL, nd = Math.min(n, CSAT * V), c = nd / V, ex = (n - nd) * M_NACL;
        const hgt = 20 + 100 * V, top = 249 - hgt, sh = Math.min(hgt - 6, ex * 0.35);
        liquid.setAttribute("y", top); liquid.setAttribute("height", hgt);
        solid.setAttribute("y", 249 - sh); solid.setAttribute("height", sh);
        vLab.setAttribute("y", top + 4); vLab.textContent = V.toFixed(2) + " L";
        sLab.textContent = ex > 0.5 ? "crystals" : "";
        const show = Math.min(NDOT * 2, Math.round(nd * K) * 2);
        dots.forEach((dt, i) => { dt.style.display = i < show ? "" : "none"; if (i < show) { dt.setAttribute("cx", 115 + pts[i][0] * 170); dt.setAttribute("cy", top + 4 + pts[i][1] * (hgt - sh - 8)); } });
        sN.set(nd.toFixed(3) + " mol"); sC.set(c.toFixed(2) + " mol/L" + (ex > 0.5 ? " (full)" : "")); sI.set(c.toFixed(2) + " mol/L"); sX.set(ex > 0.5 ? ex.toFixed(0) + " g" : "none");
      }
      const slM = slider({ name: "NaCl", min: 0, max: 150, step: 0.5, value: m, fmtv: (x) => (+x).toFixed(1) + "\u00a0g", oninput: (v) => { m = v; draw(); } });
      const slV = slider({ name: "volume", min: 0.25, max: 2, step: 0.05, value: V, fmtv: (x) => (+x).toFixed(2) + " L", oninput: (v) => { V = v; draw(); } });
      const preset = (mm, vv) => { m = mm; V = vv; slM.set(mm); slV.set(vv); draw(); };
      el.append(widget("Sodium chloride solution (one red + one blue dot ≈ 0.03 mol of NaCl)", sv, slM, slV,
        h("div", { class: "btns" },
          h("button", { onclick: () => preset(29.22, 1) }, "About as salty as seawater"),
          h("button", { onclick: () => preset(58.44, 1) }, "1 mol in 1 L"),
          h("button", { onclick: () => preset(m, Math.min(2, V * 2)) }, "Double the volume"),
          h("button", { onclick: () => preset(150, 0.25) }, "Far too much salt")),
        h("div", { class: "readout" }, sN, sC, sI, sX)));
      draw();
      el.append(
        formula('<span class="hl">concentration</span> = moles dissolved / litres of solution &nbsp;&nbsp;(mol/L)<small>square brackets are shorthand for “concentration of”: [Na⁺] = 0.5 mol/L</small>'),
        P("Doubling the volume halves the concentration: same ions, twice the room. And there is a ceiling. Water can hold only so much of a salt; for NaCl at room temperature the solution is full (saturated) at about 5.4 mol/L, and extra salt just sits at the bottom as crystals."),
        P("Each ion has its own concentration, set by the formula. In 0.1 mol/L MgCl₂, [Mg²⁺] = 0.1 mol/L but [Cl⁻] = 0.2 mol/L. Later lessons use 1 mol/L as the standard reference concentration for comparing battery voltages."),
        takeaway("Concentration = moles of dissolved substance per litre of solution, in mol/L. It measures how crowded the ions are.")
      );
    },
    check: {
      type: "number", q: "You dissolve 0.2 mol of NaCl (11.69 g) and top the solution up to <b>0.5 L</b>. What is the concentration in mol/L?",
      answer: 0.4, tolerance: 0.005, hint: "Moles divided by litres: 0.2 / 0.5.", why: "0.2 mol / 0.5 L = 0.4 mol/L. Half a litre holding 0.2 mol is as crowded as a full litre holding 0.4 mol.", backTo: 4,
    },
  });

  // ---------- circuit with two plates in a beaker (steps 8 and 9) ----------
  // cfg: { mode: "solution" | "solid" | "water" | "molten" | "metal", dir: +1 | 0 | -1, rel: 0..1 (relative current),
  //        species: [{ col, q, n, r }] }
  function circuit() {
    const R = rng(5), sv = svg(400, 312, 400); sv.setAttribute("viewBox", "66 6 268 302");
    const gBack = add(sv, "g");
    const content = add(gBack, "rect", { x: 97, y: 165, width: 206, height: 134, style: "fill:none" });
    const bar = add(gBack, "g", { style: "display:none" });
    add(bar, "rect", { x: 128, y: 198, width: 144, height: 34, style: "fill:#c98a5b;fill-opacity:.55;stroke:#c98a5b" });
    for (let i = 0; i < 9; i++) for (let j = 0; j < 2; j++) add(bar, "circle", { cx: 136 + i * 16, cy: 207 + j * 16, r: 4, style: "fill:#c98a5b" });
    add(gBack, "path", { d: "M96,140 L96,295 Q96,300 101,300 L299,300 Q304,300 304,295 L304,140", style: "fill:none;stroke:var(--muted);stroke-width:2" });
    const gIons = add(sv, "g");
    add(sv, "rect", { x: 120, y: 132, width: 8, height: 156, style: "fill:#9aa7b8" }); add(sv, "rect", { x: 272, y: 132, width: 8, height: 156, style: "fill:#9aa7b8" });
    add(sv, "polyline", { points: "124,132 124,40 276,40 276,132", style: "fill:none;stroke:#6f7c90;stroke-width:3" });
    const gEl = add(sv, "g");
    // bulb
    const halo = add(sv, "circle", { cx: 232, cy: 40, r: 26, style: `fill:${YEL};fill-opacity:0` });
    add(sv, "circle", { cx: 232, cy: 40, r: 14, style: "fill:var(--panel);stroke:var(--muted);stroke-width:1.5" });
    const glow = add(sv, "circle", { cx: 232, cy: 40, r: 13, style: `fill:${YEL};fill-opacity:0` });
    add(sv, "path", { d: "M224,44 L228,34 L232,44 L236,34 L240,44", style: "fill:none;stroke:var(--muted);stroke-width:1.2" });
    txt(sv, 232, 76, "bulb", { size: 11 });
    // battery
    const bat = add(sv, "g");
    add(bat, "rect", { x: 162, y: 24, width: 18, height: 32, style: "fill:var(--panel)" });
    const bL = add(bat, "line", { x1: 166, x2: 166, style: "stroke:var(--text);stroke-linecap:round" }), bR = add(bat, "line", { x1: 176, x2: 176, style: "stroke:var(--text);stroke-linecap:round" });
    const tL = txt(bat, 157, 22, "", { size: 14, weight: 700, fill: "var(--text)" }), tR = txt(bat, 185, 22, "", { size: 14, weight: 700, fill: "var(--text)" });
    const batLab = txt(sv, 171, 76, "battery", { size: 11 });
    const pL = txt(sv, 108, 160, "", { size: 17, weight: 700, fill: "var(--text)" }), pR = txt(sv, 292, 160, "", { size: 17, weight: 700, fill: "var(--text)" });
    const NE = 18, els = Array.from({ length: NE }, () => add(gEl, "circle", { r: 3, style: `fill:${YEL}` }));
    const OPEN = [[276, 132], [276, 40], [124, 40], [124, 132]], LOOP = OPEN.concat([[124, 215], [276, 215], [276, 132]]);
    let cfg = { mode: "water", dir: 0, rel: 0, species: [] }, sig = "", ions = [], t0 = 0;
    function along(path, t) {
      for (let i = 0; i + 1 < path.length; i++) {
        const L = Math.hypot(path[i + 1][0] - path[i][0], path[i + 1][1] - path[i][1]);
        if (t <= L) return [path[i][0] + ((path[i + 1][0] - path[i][0]) * t) / L, path[i][1] + ((path[i + 1][1] - path[i][1]) * t) / L];
        t -= L;
      }
      return path[path.length - 1];
    }
    const plen = (path) => path.slice(1).reduce((a, p, i) => a + Math.hypot(p[0] - path[i][0], p[1] - path[i][1]), 0);
    function rebuild() {
      gIons.innerHTML = ""; ions = [];
      const mobile = cfg.mode === "solution" || cfg.mode === "molten";
      if (mobile) cfg.species.forEach((sp) => { for (let k = 0; k < sp.n; k++) ions.push({ sp, x: 138 + R() * 124, y: 178 + R() * 110 }); });
      if (cfg.mode === "solid") for (let j = 0; j < 6; j++) for (let i = 0; i < 9; i++) { const sp = cfg.species[(i + j) % 2]; ions.push({ sp, x: 136 + i * 16, y: 204 + j * 16, hx: 136 + i * 16, hy: 204 + j * 16 }); }
      ions.forEach((o) => { o.el = add(gIons, "circle", { r: o.sp.r, style: `fill:${o.sp.col};fill-opacity:.85` }); });
      content.style.fill = cfg.mode === "solution" || cfg.mode === "water" ? "#3b82c4" : cfg.mode === "molten" ? "#e8843c" : "none";
      content.style.fillOpacity = cfg.mode === "molten" ? ".22" : ".16";
      bar.style.display = cfg.mode === "metal" ? "" : "none";
    }
    function set(c) {
      cfg = Object.assign({}, cfg, c);
      const ns = cfg.mode + "|" + cfg.species.map((sp) => sp.col + sp.q + sp.n + sp.r).join(",");
      if (ns !== sig) { sig = ns; rebuild(); }
      const on = cfg.dir !== 0, lneg = cfg.dir > 0;
      bat.style.opacity = on ? 1 : 0.35; batLab.textContent = on ? "battery" : "battery (off)";
      // short thick line = negative terminal, long thin line = positive terminal
      const term = (ln, neg) => { ln.setAttribute("y1", neg ? 33 : 27); ln.setAttribute("y2", neg ? 47 : 53); ln.style.strokeWidth = neg ? 4 : 2; };
      term(bL, lneg || !on); term(bR, !lneg && on);
      tL.textContent = lneg || !on ? "−" : "+"; tR.textContent = lneg || !on ? "+" : "−";
      pL.textContent = !on ? "" : lneg ? "−" : "+"; pR.textContent = !on ? "" : lneg ? "+" : "−";
      const b = on ? Math.pow(cfg.rel, 1.5) : 0;
      glow.style.fillOpacity = b.toFixed(3); halo.style.fillOpacity = (b * 0.28).toFixed(3);
      frame();
    }
    function frame() {
      const moving = cfg.dir !== 0 && cfg.rel > 1e-3, path = cfg.mode === "metal" ? LOOP : OPEN, L = plen(path);
      if (moving) t0 += cfg.dir * (0.5 + 3 * Math.pow(cfg.rel, 0.4));
      els.forEach((e, i) => { const t = (((t0 + (i * L) / NE) % L) + L) % L, p = along(path, t); e.setAttribute("cx", p[0].toFixed(1)); e.setAttribute("cy", p[1].toFixed(1)); });
      const v = moving ? 0.25 + 1.3 * Math.pow(cfg.rel, 0.4) : 0;
      ions.forEach((o) => {
        if (o.hx != null) { o.x = o.hx + (R() - 0.5) * 1.4; o.y = o.hy + (R() - 0.5) * 1.4; }
        else {
          o.x += (R() - 0.5) * 2 - cfg.dir * Math.sign(o.sp.q) * v; o.y += (R() - 0.5) * 2;
          if (o.y < 176) o.y = 176; if (o.y > 291) o.y = 291;
          if (moving) { if (o.x < 135) o.x = 262 - R() * 30; if (o.x > 265) o.x = 138 + R() * 30; }
          else { if (o.x < 136) o.x = 136; if (o.x > 264) o.x = 264; }
        }
        o.el.setAttribute("cx", o.x.toFixed(1)); o.el.setAttribute("cy", o.y.toFixed(1));
      });
    }
    const id = setInterval(frame, 40);
    return { el: sv, set, stop: () => clearInterval(id) };
  }
  // toy circuit used for the bulb: 9 V battery, bulb = 100 Ω, plates 10 cm² and 5 cm apart → liquid resistance = 50 / κ ohm
  function bulb(kappa) { const I = 9 / (100 + 50 / kappa); return { I, rel: I / 0.09 }; }
  const NA_ION = { col: RED, q: 1, r: 4.5 }, CL_ION = { col: BLUE, q: -1, r: 6 };
  const legend = (items) => items.map(([col, label]) => `<span style="white-space:nowrap"><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${col};margin-right:5px"></span>${label}</span>`).join(" &nbsp; ");

  // ================================================================ 8
  steps.push({
    title: "Who carries the current?",
    short: "Electrons vs ions",
    newConcepts: ["conduction", "electrolyte"],
    render(el) {
      el.append(
        P("An electric current is nothing more than charge that moves. In a <em>metal</em> you already know who moves: the loosely held valence electrons drift from atom to atom while the atoms stay put. A battery pushes electrons out of its − terminal and pulls them back in at its + terminal."),
        P("Now cut the wire and dip the two ends, as metal plates, into a beaker. Electrons cannot swim through water. Whether the bulb lights depends on whether <i>something else that is charged</i> can move between the plates. Try the four fillings.")
      );
      const cir = circuit();
      const MED = {
        salt: { label: "salt water", mode: "solution", kappa: 12.6, species: [Object.assign({ n: 20 }, NA_ION), Object.assign({ n: 20 }, CL_ION)], who: "Na⁺ and Cl⁻ ions",
          txt: "Dissolved ions are free to move. Na⁺ drifts to the − plate, Cl⁻ to the + plate: two streams of charge in opposite directions, and the circuit is closed." },
        solid: { label: "dry salt crystal", mode: "solid", kappa: 0, species: [NA_ION, CL_ION], who: "nothing",
          txt: "The crystal is packed with ions, but each is locked in its lattice site and can only jiggle. No moving charge, no current." },
        water: { label: "pure water", mode: "water", kappa: 5.5e-6, species: [], who: "almost nothing",
          txt: "Water molecules are neutral. Only about two in a billion fall apart into ions, far too few to light a bulb." },
        copper: { label: "copper bar", mode: "metal", kappa: 5.96e7, species: [], who: "electrons",
          txt: "A metal all the way round: electrons simply keep going through the bar. Nothing but electrons moves anywhere." },
      };
      let med = "salt", dir = 1;
      const sW = stat("moving in the wire", "y"), sB = stat("moving between the plates", "b"), sL = stat("bulb", "g");
      const desc = h("div", { class: "note", style: "margin-top:10px;min-height:66px;font-size:15px" });
      function upd() {
        const M = MED[med], b = bulb(M.kappa), lit = dir !== 0 && b.rel > 0.05;
        cir.set({ mode: M.mode, dir, rel: b.rel, species: M.species });
        sW.set(lit ? "electrons" : "nothing"); sB.set(dir === 0 ? "nothing (only jiggling)" : M.who); sL.set(lit ? "lit" : "dark");
        desc.innerHTML = dir === 0 ? "Battery off: the ions just wander at random (or jiggle in place). Nothing pushes them one way." : M.txt;
      }
      el.append(widget("One circuit, four things between the plates",
        toggle("Between the plates:", Object.keys(MED).map((k) => [k, MED[k].label]), med, (v) => { med = v; upd(); }),
        toggle("Battery:", [[1, "on"], [0, "off"], [-1, "reversed"]], dir, (v) => { dir = v; upd(); }),
        cir.el, h("div", { class: "note", style: "text-align:center", html: legend([[YEL, "electron"], [RED, "Na⁺"], [BLUE, "Cl⁻"], ["#c98a5b", "copper atom"]]) }),
        h("div", { class: "readout" }, sW, sB, sL), desc,
        note("Drawing trick: an ion that reaches a plate is redrawn on the far side to keep the picture running. What really happens when an ion meets a plate is an electron hand-over, the subject of <em>Oxidation and reduction</em> and <em>Electrolysis</em>.")));
      upd();
      el.append(
        P("These are two different ways to carry a current. In <b>electronic conduction</b> (metals) only electrons move and the material itself does not change. In <b>ionic conduction</b> whole ions move: matter travels, cations one way and anions the other. Reverse the battery and both streams turn round."),
        P("A substance that conducts because it contains mobile ions is called an <b>electrolyte</b>. Salt water is one. Dry salt is not, although it is made of nothing but ions: they have to be free to move."),
        takeaway("In metals, electrons carry the current. In an electrolyte, mobile ions carry it: cations toward the − plate, anions toward the + plate.")
      );
      return () => cir.stop();
    },
    check: {
      type: "choice", q: "You melt the dry salt crystal (NaCl melts at 801 °C) and keep the plates in the liquid salt. No water anywhere. Does the bulb light?",
      options: ["No: without water there are no ions", "Yes: melting breaks up the lattice, so the Na⁺ and Cl⁻ can move", "Yes: the heat frees electrons from the Cl⁻ ions and they flow through the liquid"],
      answer: 1,
      wrongHints: { 0: "The ions were there all along: the crystal is made of them (step 2). Water only sets them free. What else could set them free?", 2: "The ions keep their electrons. Ask instead which charged things are able to move once the lattice has melted." },
      why: "Yes. The ions exist with or without water; an electrolyte only needs them to be mobile. Molten salt conducts well, and industry uses exactly that.", backTo: 1,
    },
  });

  // ================================================================ 9
  steps.push({
    title: "Capstone: the conductivity tester",
    short: "Capstone: conductivity",
    newConcepts: [],
    render(el) {
      el.append(
        P("Everything at once. The tester below is the circuit from the last step with a choice of substances and, for the solutions, a concentration dial. The readouts tell you who carries the charge and how well."),
        P("The bulb's brightness depends on how well the stuff between the plates conducts. The tester reports that as a conductivity in S/m (bigger = lets more current through). For a dilute solution it is simply the sum over all ions of concentration × how easily that ion moves.")
      );
      const cir = circuit();
      // limiting molar ionic conductivities at 25 °C, S·cm²/mol (CRC Handbook / Atkins)
      const LAM = { "Na^+": 50.1, "K^+": 73.5, "Mg^2+": 106.0, "Cl^-": 76.3, "NO3^-": 71.4, "OH^-": 198 };
      const SUBS = [
        { k: "solid", label: "dry NaCl crystal", mode: "solid", kappa: 0, carriers: "none (ions locked)", species: [NA_ION, CL_ION], leg: [[RED, "Na⁺"], [BLUE, "Cl⁻"]] },
        { k: "water", label: "distilled water", mode: "water", kappa: 5.5e-6, carriers: "almost none", species: [], leg: [] },
        { k: "NaCl", label: f("NaCl") + " solution", ions: [["Na^+", 1, 4.5], ["Cl^-", 1, 6]] },
        { k: "KNO3", label: f("KNO3") + " solution", ions: [["K^+", 1, 5.5], ["NO3^-", 1, 6.5]] },
        { k: "MgCl2", label: f("MgCl2") + " solution", ions: [["Mg^2+", 1, 5], ["Cl^-", 2, 6]] },
        { k: "NaOH", label: f("NaOH") + " solution", ions: [["Na^+", 1, 4.5], ["OH^-", 1, 5]] },
        { k: "molten", label: "molten NaCl (above 801 °C)", mode: "molten", kappa: 360, carriers: "Na⁺ and Cl⁻", species: [Object.assign({ n: 34 }, NA_ION), Object.assign({ n: 34 }, CL_ION)], leg: [[RED, "Na⁺"], [BLUE, "Cl⁻"]] },
        { k: "Cu", label: "copper bar", mode: "metal", kappa: 5.96e7, carriers: "electrons", species: [], leg: [["#c98a5b", "copper atom"]] },
      ];
      let k = "solid", c = 0.1, dir = 1;
      const sWho = stat("charge carriers between the plates", "b"), sIon = stat("ions in solution", ""), sK = stat("conductivity", "y"), sI = stat("current", ""), sB = stat("bulb brightness", "g");
      const leg = h("div", { class: "note", style: "text-align:center;min-height:22px" });
      const fmtK = (x) => (x === 0 ? "≈ 0" : x >= 1000 || x < 0.001 ? sci(x, 1) : String(+x.toPrecision(3))) + " S/m";
      const fmtN = (x) => (x >= 0.001 ? String(+x.toPrecision(2)) : sci(x, 0)), fmtC = (x) => fmtN(x) + " mol/L";
      const sl = slider({ name: "mol/L", min: 0.0001, max: 1, log: true, steps: 200, value: c, fmtv: fmtN, oninput: (v) => { c = v; upd(); } });
      const slNote = h("div", { class: "note", style: "min-height:20px" });
      function upd() {
        const S = SUBS.find((x) => x.k === k);
        let kappa = S.kappa, species = S.species, who = S.carriers, legItems = S.leg, total = null;
        if (S.ions) {
          const nDots = Math.max(2, Math.round(3 + 4.5 * (Math.log10(c) + 4)));
          // κ (S/m) = Σ c (mol/m³) × λ (S·m²/mol) = c[mol/L] × 1000 × λ[S·cm²/mol] × 1e-4
          kappa = S.ions.reduce((a, [l, nu]) => a + c * 1000 * nu * LAM[l] * 1e-4, 0);
          species = S.ions.map(([l, nu, r]) => ({ col: l.includes("+") ? RED : BLUE, q: l.includes("+") ? 1 : -1, r, n: nDots * nu }));
          who = S.ions.map(([l]) => f(l)).join(" and ");
          legItems = S.ions.map(([l]) => [l.includes("+") ? RED : BLUE, f(l)]);
          total = c * S.ions.reduce((a, [, nu]) => a + nu, 0);
        }
        const b = bulb(kappa);
        cir.set({ mode: S.ions ? "solution" : S.mode, dir, rel: b.rel, species });
        sWho.set(who); sIon.set(total == null ? "–" : fmtC(total)); sK.set(fmtK(kappa));
        sI.set(dir === 0 ? "0 mA" : b.I * 1000 >= 0.1 ? (b.I * 1000).toFixed(1) + " mA" : sci(b.I * 1000, 0) + " mA");
        sB.set(dir === 0 ? "0%" : Math.round(Math.pow(b.rel, 1.5) * 100) + "%");
        leg.innerHTML = legend([[YEL, "electron"]].concat(legItems));
        sl.style.opacity = S.ions ? 1 : 0.35;
        slNote.textContent = S.ions ? "" : "The concentration dial only applies to the four solutions.";
      }
      el.append(widget("Conductivity tester",
        toggle("Substance:", SUBS.map((S) => [S.k, S.label]), k, (v) => { k = v; upd(); }),
        sl, slNote,
        toggle("Battery:", [[1, "on"], [0, "off"], [-1, "reversed"]], dir, (v) => { dir = v; upd(); }),
        cir.el, leg,
        h("div", { class: "readout" }, sWho, sIon, sK, sI, sB),
        note("Model, not measurement. Circuit: a 9 V battery, a bulb treated as a fixed 100 Ω load, plates of 10 cm² placed 5 cm apart. Solution conductivity uses the dilute-solution estimate (each ion moves independently, tabulated ion mobilities at 25 °C); crowded ions hinder each other, so near 1 mol/L real values are roughly a third lower. Water, molten NaCl and copper use measured conductivities.")));
      upd();
      el.append(
        P("Experiments to run, each from an earlier step:"),
        h("ul", {},
          h("li", { html: "<b>Dry NaCl crystal</b>: dark. A lattice full of ions that cannot move (steps 2 and 8)." }),
          h("li", { html: "<b>Distilled water</b>: dark, though the current is not exactly zero. Then <b>NaCl solution</b>: water has pulled the lattice apart into mobile ions (step 6)." }),
          h("li", { html: "Sweep the <b>concentration</b> from 0.0001 to 1 mol/L. More ions per litre, more charge on the move (step 7). Ten times the concentration gives ten times the conductivity in this model." }),
          h("li", { html: "At the same concentration, <b>MgCl₂</b> beats NaCl: each formula unit releases three ions instead of two, and Mg²⁺ carries a double charge (steps 3 and 6)." }),
          h("li", { html: "<b>NaOH</b> beats NaCl too, with the same number of ions. The hydroxide ion moves through water unusually easily, one reason alkaline batteries use a hydroxide electrolyte." }),
          h("li", { html: "<b>Molten NaCl</b>: no water at all, yet a strong electrolyte. Heat instead of water has freed the ions." }),
          h("li", { html: "<b>Copper bar</b>: over a hundred thousand times more conductive than even molten salt, and nothing moves but electrons (step 8)." }),
          h("li", { html: "<b>Reverse the battery</b> on a solution: the electrons in the wire and both ion streams all turn round." })),
        P("Hold on to the picture of the salt solution with the battery on: <b>electrons in the wire, ions in the liquid</b>, one closed loop of moving charge. Every battery in this course is that loop. The only missing piece is what happens where the two meet, at the surface of the metal, and that is the next lesson: <em>Oxidation and reduction</em>."),
        takeaway("A circuit can be part metal, part electrolyte. Electrons carry the charge through the metal, mobile ions carry it through the liquid, and more mobile ions means more current.")
      );
      return () => cir.stop();
    },
  });

  Course.run({
    id: "ions-salts",
    section: "0. Atoms that give and take electrons",
    title: "Ions, salts and electrolytes",
    concepts: {
      ionicbond: "ionic bond", lattice: "crystal lattice (salt)", formula: "ionic formula (charge balance)", polyatomic: "polyatomic ion",
      mole: "mole", molarmass: "molar mass", water: "polar water molecule", dissociation: "dissociation",
      conc: "concentration (mol/L)", conduction: "ionic vs electronic conduction", electrolyte: "electrolyte",
    },
    sources: [
      { title: "OpenStax Chemistry 2e, 7.1 Ionic Bonding", url: "https://openstax.org/books/chemistry-2e/pages/7-1-ionic-bonding", note: "ionic bond as electrostatic attraction, lattices, brittleness, why solid salts do not conduct" },
      { title: "OpenStax Chemistry 2e, 2.6 Ionic and Molecular Compounds", url: "https://openstax.org/books/chemistry-2e/pages/2-6-ionic-and-molecular-compounds", note: "charge-balanced formulas, polyatomic ions (sulfate, hydroxide, nitrate), brackets" },
      { title: "OpenStax Chemistry 2e, 3.1 Formula Mass and the Mole Concept", url: "https://openstax.org/books/chemistry-2e/pages/3-1-formula-mass-and-the-mole-concept", note: "mole, Avogadro's number, molar mass, formula units" },
      { title: "OpenStax Chemistry 2e, 3.3 Molarity", url: "https://openstax.org/books/chemistry-2e/pages/3-3-molarity", note: "concentration in mol/L" },
      { title: "OpenStax Chemistry 2e, 11.2 Electrolytes", url: "https://openstax.org/books/chemistry-2e/pages/11-2-electrolytes", note: "dissociation, ion–dipole attraction to polar water, electrolytes" },
      { title: "Wikipedia: Ionic radius", url: "https://en.wikipedia.org/wiki/Ionic_radius", note: "Shannon radii for 6-coordination: Na⁺ 102 pm, Cl⁻ 181 pm, Mg²⁺ 72 pm, O²⁻ 140 pm (sum 283 pm ≈ the 282 pm Na–Cl distance)" },
      { title: "Wikipedia: Sodium chloride", url: "https://en.wikipedia.org/wiki/Sodium_chloride", note: "rock-salt structure with 6 nearest neighbours, melting point 801 °C, solubility about 360 g per litre of water at 25 °C (saturated solution ≈ 5.4 mol/L)" },
      { title: "Wikipedia: Molar conductivity", url: "https://en.wikipedia.org/wiki/Molar_conductivity", note: "limiting ionic conductivities at 25 °C used in the capstone (Na⁺ 50.1, K⁺ 73.5, Mg²⁺ 106.0, Cl⁻ 76.3, NO₃⁻ 71.4, OH⁻ 198 S·cm²/mol) and Kohlrausch's law of independent ion migration" },
    ],
    steps,
  });
})();
